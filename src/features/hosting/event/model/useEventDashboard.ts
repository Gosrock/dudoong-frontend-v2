'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { eventDashboardQuery } from '@/api/dashboard/queries';
import { openEventMutation } from '@/api/event/mutations';
import { eventChecklistQuery, eventManageQuery } from '@/api/event/queries';
import { handleCodes } from '@/api/handle-codes';

import {
  checklistItemsOf,
  checklistProgress,
  REGISTER_ERROR_MESSAGE,
  registerErrorMessageOf,
} from './checklist';
import {
  entranceProgressOf,
  newBadgeCountOf,
  scheduleTimelineOf,
  statCardsOf,
  ticketSalesOf,
} from './dashboard-stats';
import { invalidateAfterRegister } from './event-cache';
import { eventHref } from './event-scope';
import { useEventScope } from './useEventScope';

type RegisterErrorCode = keyof typeof REGISTER_ERROR_MESSAGE;

/**
 * 공연 대시보드(`/hosting/events/[eventId]/dashboard`, plan P11). 준비중이면 **체크리스트 모드**(GE-7 + 등록 PE-8),
 * 등록 뒤에는 **등록 후 모드**(통계 GD-1, P13a — `stats`). 값·상태·동작만 돌려준다 — 모달·팝업·토스트·도넛·막대는 V.
 *
 * - 등록 후 통계(P13a): GD-1은 등록 후 모드에서만 부른다. 카드 4개(↗ 예매자 관리)·NEW 배지 수(= 승인 대기)·티켓 판매 정보·
 *   입장 현황(분모 = 발급 수, 발급 0이면 0/0)·일정 타임라인(`openedAt`, null이면 Q43 기본안)
 *
 * - 체크리스트: GE-7은 체크리스트 모드에서만 부른다. 화면에 들어올 때마다 다시 읽는다(전역 `staleTime` 0) — 기본 정보·상세 정보를
 *   저장하고 돌아오면 새 값이 온다
 * - **다 채운 순간**(`justCompleted`): 이 화면이 본 `canOpen`이 `false`에서 `true`로 바뀐 직후 한 번(→ "등록 준비 완료" 모달, V).
 *   처음부터 `true`로 들어오면(새로고침 등) 알리지 않는다. `acknowledgeCompleted()`로 끈다(Claude 판단 — 기준을 바꾸려면 이 훅만)
 * - 등록(PE-8): 매니저 이상 + `canOpen`일 때만. 성공하면 GE-3·GE-1만 무효화하고(`invalidateAfterRegister`) GE-3이 다시 오면
 *   등록 후 모드로 바뀐다. `justRegistered` — "공연이 등록되었습니다." 토스트(`424:11427`, V)를 띄울 상태
 * - 에러(patterns §24 P11): `Event_400_7` 조건 미충족 → GE-7 다시 읽기, `Event_400_8` 이미 오픈 → GE-3 다시 읽기,
 *   `Event_400_15` 시작이 지남 → 둘 다 다시 읽기. 문구는 `registerError`. 그 밖은 전역 토스트.
 *   서버는 시작 시각을 "이미 오픈" 검사보다 먼저 보므로(`Event.open()`) 이미 등록된 공연도 시작이 지났으면 `Event_400_15`다 —
 *   다시 읽은 GE-3이 준비중이 아니면 "이미 등록된 공연" 문구로 바꾼다(`registerErrorMessageOf`, 계약 대조 2026-10-31)
 * - `?created=1`(간편 만들기 직후, design-requests Q7) → `createdNotice` — "새로운 공연이 추가되었습니다!" 토스트(V).
 *   `dismissCreatedNotice()`는 주소에서 지운다(새로고침해도 다시 뜨지 않게)
 */
export function useEventDashboard(eventId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = useEventScope(eventId);
  const mode = scope.registered ? ('registered' as const) : ('checklist' as const);

  const checklistQuery = useQuery({
    ...eventChecklistQuery(eventId),
    enabled: mode === 'checklist',
  });
  // 등록 뒤에는 남은 캐시 값을 쓰지 않는다(체크리스트를 그리지 않는다)
  const checklist = mode === 'checklist' ? (checklistQuery.data ?? null) : null;

  // ─── 다 채운 순간 ───
  // 렌더 중에 이전 값과 비교한다(React "이전 렌더의 값으로 상태 조정" 패턴 — 이펙트를 쓰지 않는다)
  const canOpen = checklist?.canOpen;
  const [seenCanOpen, setSeenCanOpen] = useState<boolean | undefined>(undefined);
  const [justCompleted, setJustCompleted] = useState(false);
  if (canOpen !== undefined && canOpen !== seenCanOpen) {
    setSeenCanOpen(canOpen);
    setJustCompleted(seenCanOpen === false && canOpen);
  }

  // ─── 등록 ───
  const [registerErrorCode, setRegisterErrorCode] = useState<RegisterErrorCode | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const refetchAfter = useCallback(
    (code: RegisterErrorCode) => {
      setRegisterErrorCode(code);
      const checklistKey = eventChecklistQuery(eventId).queryKey;
      const manageKey = eventManageQuery(eventId).queryKey;
      const keys =
        code === 'Event_400_7'
          ? [checklistKey]
          : code === 'Event_400_8'
            ? [manageKey]
            : [checklistKey, manageKey];
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey, exact: true });
    },
    [eventId, queryClient],
  );
  const codes = useMemo(
    () =>
      handleCodes({
        Event_400_7: () => refetchAfter('Event_400_7'),
        Event_400_8: () => refetchAfter('Event_400_8'),
        Event_400_15: () => refetchAfter('Event_400_15'),
      }),
    [refetchAfter],
  );
  const registerMutation = useMutation({
    ...openEventMutation(eventId),
    ...codes,
    onSuccess: async () => {
      setJustRegistered(true);
      setJustCompleted(false);
      await invalidateAfterRegister(queryClient, eventId);
    },
  });

  const canRegister =
    mode === 'checklist' &&
    scope.isManager &&
    checklist?.canOpen === true &&
    !registerMutation.isPending;

  /** 등록했으면 `true`. 등록할 수 없는 상태·요청 중이면 요청하지 않고 `false` */
  const register = useCallback(async () => {
    if (!canRegister) return false;
    setRegisterErrorCode(null);
    try {
      await registerMutation.mutateAsync();
      return true;
    } catch {
      // 표의 코드는 handleCodes가, 그 밖은 전역 토스트가 맡는다
      return false;
    }
  }, [canRegister, registerMutation]);

  // ─── 등록 후 통계(GD-1, P13a) ───
  const statsQuery = useQuery({ ...eventDashboardQuery(eventId), enabled: mode === 'registered' });
  const stats = useMemo(() => {
    const d = mode === 'registered' ? statsQuery.data : undefined;
    if (!d) return null;
    return {
      dashboard: d,
      cards: statCardsOf(d, eventId),
      newBadgeCount: newBadgeCountOf(d),
      sales: ticketSalesOf(d),
      entrance: entranceProgressOf(d),
      timeline: scheduleTimelineOf({
        openedAt: d.openedAt,
        startAt: scope.event.startAt,
        displayStatus: d.displayStatus,
      }),
      /** "QR 체크인 열기 →" */
      qrHref: eventHref(eventId, 'qr'),
    };
  }, [eventId, mode, scope.event.startAt, statsQuery.data]);

  // ─── 만든 직후 ───
  const createdNotice = searchParams.get('created') === '1';
  const dismissCreatedNotice = useCallback(() => {
    router.replace(eventHref(eventId, 'dashboard'), { scroll: false });
  }, [eventId, router]);

  const items = checklist ? checklistItemsOf(eventId, checklist) : null;

  return {
    event: scope.event,
    mode,
    /** 체크리스트 모드에서 GE-7 상태 */
    checklistStatus:
      mode === 'registered'
        ? ('idle' as const)
        : checklistQuery.isPending
          ? ('pending' as const)
          : checklistQuery.isError && !checklist
            ? ('error' as const)
            : ('success' as const),
    retryChecklist: () => void checklistQuery.refetch(),
    /** 행 3개(① 기본 정보 ② 상세 정보 ③ 티켓 — 티켓 없음 공연은 `exempt`) */
    checklistItems: items,
    progress: items ? checklistProgress(items) : null,
    /** 서버 `canOpen`(모든 항목 + 준비중 + 시작 전) */
    canOpen: checklist?.canOpen ?? false,
    /** 다 채운 순간(→ "등록 준비 완료" 모달, V) */
    justCompleted,
    acknowledgeCompleted: () => setJustCompleted(false),
    /** [등록하기]를 보일지(매니저 이상만) / 누를 수 있는지 */
    showRegister: mode === 'checklist' && scope.isManager,
    canRegister,
    registering: registerMutation.isPending,
    register,
    registerError: registerErrorMessageOf(registerErrorCode, scope.registered),
    /** 방금 등록했다(→ "공연이 등록되었습니다." 토스트, V) */
    justRegistered,
    acknowledgeRegistered: () => setJustRegistered(false),
    /** 등록 후 모드에서 GD-1 상태 */
    statsStatus:
      mode === 'checklist'
        ? ('idle' as const)
        : statsQuery.isPending
          ? ('pending' as const)
          : statsQuery.isError && !stats
            ? ('error' as const)
            : ('success' as const),
    retryStats: () => void statsQuery.refetch(),
    /** 등록 후 통계(GD-1 파생값) — 체크리스트 모드·불러오기 전이면 null */
    stats,
    /** 간편 만들기 직후(`?created=1`) */
    createdNotice,
    dismissCreatedNotice,
  };
}
