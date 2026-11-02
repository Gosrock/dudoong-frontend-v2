'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { hostCheckInMutation } from '@/api/check-in/mutations';
import { handleError } from '@/api/handle-error';
import { exportIssuedTicketsMutation } from '@/api/issued-ticket/mutations';
import { hostIssuedTicketQuery, hostIssuedTicketsQuery } from '@/api/issued-ticket/queries';
import type { EntranceFilter, IssuedTicketSearchType } from '@/api/issued-ticket/schema';
import { invalidateEventStatus } from '@/features/hosting/shared/model/event-cache';
import { invalidateAfterScan } from '@/features/hosting/shared/model/qr-cache';
import {
  EVENT_NOT_CHECKABLE_MESSAGE,
  HOST_SCAN_BLOCK_MESSAGE,
  hostScanBlockOf,
} from '@/features/hosting/shared/model/qr-check-in-rules';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import {
  type CheckInResultView,
  checkInResultView,
} from '@/features/shared/checkin-result/model/checkin-result';
import { can } from '@/features/shared/permission/model/can';

import { invalidateGuestLists } from './guest-cache';
import {
  ENTRANCE_FILTER_OPTIONS,
  exactMatchHintOf,
  TICKET_MISSING_MESSAGE,
  TICKET_SEARCH_TYPE_OPTIONS,
} from './guest-rules';
import { useGuestExport } from './useGuestExport';
import { useMissingDetail } from './useMissingDetail';
import { useTableQueryState } from './useTableQueryState';

/**
 * 예매자 관리 발급된 티켓 탭(GI-1 · GI-2 · GI-3, plan P13a). 입장 필터·검색(현재 소유자 기준 — 이름·연락처)·페이지 번호,
 * 티켓 상세(주소에 남기지 않는다 — tech-decisions §3), 엑셀(매니저 이상).
 *
 * - 건수(`counts`)는 검색어 반영·입장 필터 무시. 취소 티켓은 목록에 없다
 * - 상세 404 `IssuedTicket_404_1`(다른 공연·없는 티켓): 닫고 목록 다시 읽기 + `missingNotice`
 * - 일반 멤버의 연락처 검색은 완전 일치 안내, 상세 연락처는 가린 값을 그대로
 */
export function useIssuedTicketList(eventId: string) {
  const queryClient = useQueryClient();
  const scope = useEventScope(eventId);
  const table = useTableQueryState<EntranceFilter, IssuedTicketSearchType>('ALL', 'NAME');
  const { filter: entrance, page, searchType, applied } = table;
  const query = useQuery({
    ...hostIssuedTicketsQuery(eventId, { entrance, ...applied, page }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  // ─── 상세(GI-2) ───
  const [selected, setSelected] = useState<string | null>(null);
  const detailQuery = useQuery({
    ...hostIssuedTicketQuery(eventId, selected ?? ''),
    enabled: selected !== null,
  });
  const [missingNotice, setMissingNotice] = useState<string | null>(null);
  // 닫고 목록을 다시 읽는다 — 상태는 렌더 중에, 무효화는 이펙트에서(`useMissingDetail`)
  useMissingDetail({
    id: selected,
    error: detailQuery.error,
    code: 'IssuedTicket_404_1',
    onNotFound: () => {
      setSelected(null);
      setMissingNotice(TICKET_MISSING_MESSAGE);
    },
    afterNotFound: () => void invalidateGuestLists(queryClient, eventId),
  });

  // ─── 수동 입장 처리(PQ-2 — QR 값 = 티켓 uuid, 스테이징 QA #106 §5) ───
  // 카메라 고장·QR이 안 읽힐 때 상세에서 바로 입장. 스캔과 같은 API·권한(일반 멤버 이상)·공연 상태(OPEN·정산중)
  const checkInM = useMutation(hostCheckInMutation(eventId));
  const [checkInResult, setCheckInResult] = useState<CheckInResultView | null>(null);
  const checkInBlock = hostScanBlockOf(scope.event.status);
  const canManualCheckIn = can(scope.role, 'checkIn');
  const manualCheckIn = useCallback(
    async (ticketUuid: string) => {
      if (!canManualCheckIn || checkInBlock !== null || checkInM.isPending) return null;
      setCheckInResult(null);
      try {
        const res = await checkInM.mutateAsync({ ticketUuid });
        const view = checkInResultView(res, 'host');
        setCheckInResult(view);
        void invalidateAfterScan(queryClient, eventId, res.result);
        return view;
      } catch (e) {
        handleError(e, {
          Event_400_27: () => {
            setMissingNotice(EVENT_NOT_CHECKABLE_MESSAGE);
            void invalidateEventStatus(queryClient, eventId);
          },
        });
        return null;
      }
    },
    [canManualCheckIn, checkInBlock, checkInM, eventId, queryClient],
  );

  const exporter = useGuestExport(
    eventId,
    scope.role,
    exportIssuedTicketsMutation(eventId),
    `issued-tickets-${eventId}.xlsx`,
  );

  return {
    status: query.status,
    retry: () => void query.refetch(),
    fetching: query.isFetching,
    /** 입장 상태별 건수(검색어 반영) */
    counts: data?.counts ?? null,
    entranceFilters: ENTRANCE_FILTER_OPTIONS.map((f) => ({
      ...f,
      count: data
        ? f.key === 'ALL'
          ? data.counts.issuedCount
          : f.key === 'DONE'
            ? data.counts.enteredCount
            : data.counts.notEnteredCount
        : null,
      selected: f.key === entrance,
    })),
    entrance,
    setEntrance: table.setFilter,
    /** 검색 — 기준 · 입력(50자) · 적용 */
    search: {
      types: TICKET_SEARCH_TYPE_OPTIONS,
      type: searchType,
      setType: table.setSearchType,
      input: table.keywordInput,
      setInput: table.setKeywordInput,
      max: table.keywordMax,
      submit: table.submitSearch,
      applied: applied.keyword,
      exactMatchHint: exactMatchHintOf(scope.role, searchType),
    },
    rows: data?.tickets.content ?? [],
    empty: query.status === 'success' && data?.tickets.content.length === 0,
    pagination: {
      page,
      totalPages: data?.tickets.totalPages ?? null,
      hasNext: data?.tickets.hasNext ?? false,
      setPage: table.setPage,
    },
    /** 티켓 상세 */
    selectedTicketUuid: selected,
    openTicket: (ticketUuid: string) => {
      setMissingNotice(null);
      setCheckInResult(null);
      setSelected(ticketUuid);
    },
    closeTicket: () => {
      setSelected(null);
      setCheckInResult(null);
    },
    /**
     * [수동 입장 처리] — 일반 멤버 이상, 입장 전(`BEFORE`) 티켓만 보인다. 공연이 OPEN·정산중이 아니면 버튼 대신 `checkInBlockMessage`
     */
    checkIn: {
      can: canManualCheckIn,
      blockMessage: checkInBlock ? HOST_SCAN_BLOCK_MESSAGE[checkInBlock] : null,
      run: manualCheckIn,
      pending: checkInM.isPending,
      /** 마지막 수동 입장 결과(상세를 닫으면 지운다) */
      result: checkInResult,
    },
    detailStatus: selected === null ? ('idle' as const) : detailQuery.status,
    detail: selected !== null ? (detailQuery.data ?? null) : null,
    missingNotice,
    dismissMissingNotice: () => setMissingNotice(null),
    /** 엑셀 — 매니저 이상만 */
    excel: {
      can: exporter.canExport,
      pending: exporter.exporting,
      error: exporter.error,
      dismissError: exporter.dismissError,
      download: () => exporter.download({ entrance, ...applied }),
    },
  };
}

export type IssuedTicketListState = ReturnType<typeof useIssuedTicketList>;
