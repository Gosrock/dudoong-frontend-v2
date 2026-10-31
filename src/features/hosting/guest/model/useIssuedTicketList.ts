'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { getErrorCode } from '@/api/errors';
import { exportIssuedTicketsMutation } from '@/api/issued-ticket/mutations';
import { hostIssuedTicketQuery, hostIssuedTicketsQuery } from '@/api/issued-ticket/queries';
import type { EntranceFilter, IssuedTicketSearchType } from '@/api/issued-ticket/schema';
import { OPERATION_KEYWORD_MAX } from '@/api/order/schema';
import { useEventScope } from '@/features/hosting/event/model/useEventScope';

import { invalidateGuestLists } from './guest-cache';
import {
  ENTRANCE_FILTER_OPTIONS,
  exactMatchHintOf,
  TICKET_MISSING_MESSAGE,
  TICKET_SEARCH_TYPE_OPTIONS,
} from './guest-rules';
import { useGuestExport } from './useGuestExport';

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
  const [entrance, setEntranceState] = useState<EntranceFilter>('ALL');
  const [searchType, setSearchType] = useState<IssuedTicketSearchType>('NAME');
  const [keywordInput, setKeywordInputState] = useState('');
  const [applied, setApplied] = useState<{ searchType: IssuedTicketSearchType; keyword: string }>({
    searchType: 'NAME',
    keyword: '',
  });
  const [page, setPage] = useState(0);
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
  // 닫힌 뒤 목록을 다시 읽는다 — 상태는 렌더 중에(이전 값 비교), 무효화는 이펙트에서
  const [missingCount, setMissingCount] = useState(0);
  if (selected !== null && getErrorCode(detailQuery.error) === 'IssuedTicket_404_1') {
    setSelected(null);
    setMissingNotice(TICKET_MISSING_MESSAGE);
    setMissingCount((n) => n + 1);
  }
  useEffect(() => {
    if (missingCount > 0) void invalidateGuestLists(queryClient, eventId);
  }, [eventId, queryClient, missingCount]);

  const setEntrance = useCallback((next: EntranceFilter) => {
    setEntranceState(next);
    setPage(0);
  }, []);
  const submitSearch = useCallback(() => {
    setApplied({ searchType, keyword: keywordInput.trim() });
    setPage(0);
  }, [keywordInput, searchType]);

  const exporter = useGuestExport(
    eventId,
    scope.event.myRole,
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
    setEntrance,
    searchTypes: TICKET_SEARCH_TYPE_OPTIONS,
    searchType,
    setSearchType,
    keywordInput,
    setKeywordInput: (v: string) => setKeywordInputState(v.slice(0, OPERATION_KEYWORD_MAX)),
    keywordMax: OPERATION_KEYWORD_MAX,
    submitSearch,
    appliedKeyword: applied.keyword,
    exactMatchHint: exactMatchHintOf(scope.event.myRole, searchType),
    rows: data?.tickets.content ?? [],
    empty: query.status === 'success' && data?.tickets.content.length === 0,
    page,
    totalPages: data?.tickets.totalPages ?? null,
    hasNext: data?.tickets.hasNext ?? false,
    setPage,
    /** 티켓 상세 */
    selectedTicketUuid: selected,
    openTicket: (ticketUuid: string) => {
      setMissingNotice(null);
      setSelected(ticketUuid);
    },
    closeTicket: () => setSelected(null),
    detailStatus: selected === null ? ('idle' as const) : detailQuery.status,
    detail: selected !== null ? (detailQuery.data ?? null) : null,
    missingNotice,
    dismissMissingNotice: () => setMissingNotice(null),
    canExport: exporter.canExport,
    exporting: exporter.exporting,
    exportError: exporter.error,
    dismissExportError: exporter.dismissError,
    exportExcel: () => exporter.download({ entrance, ...applied }),
  };
}
