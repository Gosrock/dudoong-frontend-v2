'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createEventMutation } from '@/api/event/mutations';
import { handleError } from '@/api/handle-error';
import { myHostsQuery } from '@/api/host/queries';
import { flattenPages } from '@/api/shared/page';
import { useCreateHost } from '@/features/hosting/host/model/useCreateHost';

import {
  createdEventHref,
  type CreateEventValues,
  hasCreateEventErrors,
  initialCreateEventValues,
  parsePreselectedHostId,
  parseWizardStep,
  selectableHostsOf,
  toCreateEventBody,
  validateCreateEvent,
  wizardStepHref,
} from './create-event-form';
import { invalidateAfterCreate } from './event-cache';
import { SCHEDULE_ERROR, type ScheduleInput, toScheduleRange } from './schedule';

/**
 * 간편 공연 만들기(`/hosting/new/events?step=1|2`, GH-1 · PH-2 · PE-2, plan P11). 단계는 주소(`?step=`), 고른 호스트와
 * Step2 입력은 이 훅의 지역 상태다(tech-decisions §3 — 다단계 라이브러리 없이). UI 동작은 없다.
 *
 * - Step1: 내 호스트(GH-1 무한 목록, 지금 받은 것까지). **일반 멤버인 호스트는 고를 수 없다**(`selectable: false` — patterns §22).
 *   호스트 홈의 `?hostId=`(P5c)가 고를 수 있는 호스트면 미리 고른다. [다음]은 `?step=2&hostId=`로 `push`(뒤로가기 = Step1,
 *   새로고침하면 같은 호스트로 Step2 — 이슈 #93 §4)
 * - Step1 안의 호스트 만들기(GUI `41:2343`): P10a 호스트 만들기 로직(`useCreateHost`) 그대로 — 만들면 GH-1·GM-1을 다시 읽고,
 *   **만든 호스트가 골라진 채 `?step=2`로** 간다
 * - Step2: 이름(25자) · 날짜 1칸 + 시작·종료 시각(종료 ≤ 시작이면 다음 날) · 티켓 여부. 시작은 지금 이후(PE-2 `@Future`)
 * - 만들기(PE-2): 성공하면 GE-1·GH-1을 무효화하고 대시보드로 `replace`(`?created=1` — 토스트 상태, design-requests Q7 기본안)
 * - `?step=2`인데 고른 호스트가 없으면(새로고침 등 — 지역 상태가 사라진다) Step1로 `replace`
 * - 에러: `Event_400_2` → 일정 칸 오류(FE가 다음 날로 계산하므로 정상 흐름에서는 나지 않는다). 검증 실패(400 `BAD_REQUEST` —
 *   시작이 그사이 지남 등)·권한(403)은 공용 토스트(handleError)
 */
export function useNewEventWizard({ now = () => new Date() }: { now?: () => Date } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const step = parseWizardStep(searchParams);
  const preselected = parsePreselectedHostId(searchParams);

  // ─── Step1 호스트 ───
  const hostsQuery = useInfiniteQuery(myHostsQuery());
  const hosts = useMemo(
    () => selectableHostsOf(flattenPages(hostsQuery.data, (h) => h.hostId)),
    [hostsQuery.data],
  );
  const [pickedHostId, setPickedHostId] = useState<number | null>(preselected);
  const selectedHost = hosts.find((h) => h.hostId === pickedHostId && h.selectable) ?? null;

  const selectHost = useCallback(
    (hostId: number) => {
      if (hosts.some((h) => h.hostId === hostId && h.selectable)) setPickedHostId(hostId);
    },
    [hosts],
  );

  const goToStep2 = useCallback(() => {
    if (selectedHost) router.push(wizardStepHref(2, selectedHost.hostId));
  }, [router, selectedHost]);

  // Step2인데 고른 호스트가 없다 — 목록을 받은 뒤에도 없으면 Step1로
  useEffect(() => {
    if (step !== 2 || hostsQuery.isPending) return;
    if (!selectedHost) router.replace(wizardStepHref(1));
  }, [hostsQuery.isPending, router, selectedHost, step]);

  // ─── Step1 안의 호스트 만들기 ───
  const [creatingHost, setCreatingHost] = useState(false);
  const createHost = useCreateHost({
    onCreated: (hostId) => {
      setPickedHostId(hostId);
      setCreatingHost(false);
      router.push(wizardStepHref(2, hostId));
    },
  });

  // ─── Step2 ───
  const [values, setValues] = useState<CreateEventValues>(initialCreateEventValues);
  const [attempted, setAttempted] = useState(false);
  const [scheduleServerError, setScheduleServerError] = useState<string | null>(null);
  const inflight = useRef(false);
  const errors = useMemo(
    () => validateCreateEvent(values, now()),
    // `now`는 렌더마다 새 시각이면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values],
  );

  const mutation = useMutation({
    ...createEventMutation(),
    onSuccess: () => invalidateAfterCreate(queryClient),
  });

  const submit = useCallback(async () => {
    setAttempted(true);
    if (!selectedHost || hasCreateEventErrors(errors) || inflight.current) return;
    inflight.current = true;
    setScheduleServerError(null);
    try {
      const created = await mutation.mutateAsync(toCreateEventBody(selectedHost.hostId, values));
      // 성공하면 이동하는 동안 inflight를 유지해 다시 낼 수 없게 둔다
      router.replace(createdEventHref(created.eventId));
    } catch (e) {
      inflight.current = false;
      // 표에 없는 실패는 공용 토스트
      handleError(e, {
        Event_400_2: () => setScheduleServerError(SCHEDULE_ERROR.Event_400_2),
      });
    }
  }, [errors, mutation, router, selectedHost, values]);

  return {
    step,
    // Step1
    hosts: {
      status: hostsQuery.isPending
        ? ('pending' as const)
        : hostsQuery.isError && !hostsQuery.data
          ? ('error' as const)
          : hosts.length === 0
            ? ('empty' as const)
            : ('success' as const),
      /** 호스트 줄(`selectable` — 일반 멤버면 false) */
      items: hosts,
      hasNextPage: hostsQuery.hasNextPage,
      loadMore: () => {
        if (hostsQuery.hasNextPage && !hostsQuery.isFetching) void hostsQuery.fetchNextPage();
      },
      retry: () => void hostsQuery.refetch(),
    },
    selectedHost,
    selectHost,
    canGoToStep2: selectedHost !== null,
    goToStep2,
    /** Step1 안에서 호스트를 만드는 중인지(진행 막대는 그대로 — GUI `41:2343`) */
    creatingHost,
    startCreateHost: () => setCreatingHost(true),
    cancelCreateHost: () => setCreatingHost(false),
    /** P10a 호스트 만들기 폼(`useCreateHost`) — 만들면 그 호스트를 고른 채 Step2로 */
    createHost,
    // Step2
    values,
    setName: (name: string) => setValues((v) => ({ ...v, name })),
    setSchedule: (patch: Partial<ScheduleInput>) => {
      setScheduleServerError(null);
      setValues((v) => ({ ...v, schedule: { ...v.schedule, ...patch } }));
    },
    setHasTicket: (hasTicket: boolean) => setValues((v) => ({ ...v, hasTicket })),
    /** 서버로 갈 시작·종료(칸이 비면 null)와 다음 날 종료 여부 */
    scheduleRange: toScheduleRange(values.schedule),
    errors,
    scheduleServerError,
    attempted,
    submitting: mutation.isPending || mutation.isSuccess,
    submit,
  };
}
