import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setEventCancelScenario } from '@/api/__mocks__/event-store';
import { guestOrdersOf } from '@/api/__mocks__/guest-store';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingEventSets } from '@/api/__mocks__/hosting-event.handlers';
import { server } from '@/api/__mocks__/server';
import { eventManageQuery, MY_EVENTS_KEY } from '@/api/event/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { CANCEL_EVENT_ERROR_MESSAGE, CANCEL_EVENT_UNSUPPORTED_MESSAGE } from './event-cancel';
import { useEventCancel } from './useEventCancel';

/** 고스락(11, mock 사용자 마스터)의 등록된 시작 전 공연 — 예매자 주문이 있다 */
const EVENT = '101';

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
  resetHostingStore();
});

function setup(queryClient = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useEventCancel(EVENT), { wrapper }), queryClient };
}
type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current).not.toBeNull());
const targets = () =>
  guestOrdersOf(Number(EVENT)).filter(
    (o) => o.status === 'PENDING_APPROVE' || o.status === 'APPROVED',
  );

describe('공연 취소 E-11 — useEventCancel', () => {
  it('마스터: 사유를 넣고 취소 → POST {reason}(앞뒤 공백 제거) · GE-3에 canceledAt · 결과 · 목록 무효화', async () => {
    const left = targets().length;
    const { result, queryClient } = setup();
    await loaded(result);
    expect(result.current.canCancel).toBe(true);
    expect(result.current.canceled).toBe(false);
    expect(result.current.canRetry).toBe(false);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    act(() => result.current.setReason('  공연장 사정  '));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.cancel();
    });
    expect(outcome).toBe('canceled');
    expect((await sent.list()).filter((r) => r.method === 'POST')).toMatchObject([
      { path: `/api/v2/events/${EVENT}/cancel`, body: { reason: '공연장 사정' } },
    ]);
    await waitFor(() => expect(result.current.canceled).toBe(true));
    expect(result.current.cancelReason).toBe('공연장 사정');
    expect(result.current.canCancel).toBe(false);
    expect(result.current.reason).toBe('');
    expect(result.current.result).toMatchObject({ remaining: 0, failed: 0 });
    expect(result.current.result!.refused + result.current.result!.canceled).toBe(left);
    // 남은 주문이 없으면 [다시 처리]를 숨긴다
    expect(result.current.canRetry).toBe(false);
    const keys = invalidate.mock.calls.map(([f]) => f?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([['events', EVENT], ['events', 'infinite'], ['home'], MY_EVENTS_KEY]),
    );
    expect(queryClient.getQueryData(eventManageQuery(EVENT).queryKey)).toMatchObject({
      status: 'OPEN',
      cancelReason: '공연장 사정',
    });
  });

  it('사유가 비면 요청하지 않고 칸 오류, 입력하면 지운다', async () => {
    const { result } = setup();
    await loaded(result);
    const sent = recordRequests();
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.cancel();
    });
    expect(outcome).toBe(false);
    expect(result.current.reasonError).toBe('취소 사유를 입력해 주세요.');
    expect(await sent.list()).toEqual([]);
    act(() => result.current.setReason('사'));
    expect(result.current.reasonError).toBeNull();
  });

  it('남은 주문(상한 · 실패)이 있으면 [다시 처리] — 같은 API, 처음 사유로, 다 끝나면 숨김', async () => {
    const first = targets()
      .sort((a, b) => a.seq - b.seq)
      .map((o) => o.orderUuid)[0]!;
    setEventCancelScenario({ limit: 1, failOnce: [first] });
    const { result } = setup();
    await loaded(result);
    act(() => result.current.setReason('사유'));
    await act(async () => void (await result.current.cancel()));
    expect(result.current.summary?.needsRetry).toBe(true);
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    setEventCancelScenario({ limit: 100 });
    const sent = recordRequests();
    let ok: unknown;
    await act(async () => {
      ok = await result.current.retry();
    });
    expect(ok).toBe(true);
    expect((await sent.list()).filter((r) => r.method === 'POST')).toMatchObject([
      { body: { reason: '사유' } },
    ]);
    expect(result.current.summary?.needsRetry).toBe(false);
    expect(result.current.canRetry).toBe(false);
  });

  it('취소된 공연을 새로 열면(결과 모름) 마스터는 [다시 처리]를 본다 — 일반 멤버는 안내만', async () => {
    const { result: first } = setup();
    await loaded(first);
    act(() => first.current.setReason('사유'));
    await act(async () => void (await first.current.cancel()));

    const fresh = setup();
    await waitFor(() => expect(fresh.result.current.canceled).toBe(true));
    expect(fresh.result.current.canRetry).toBe(true);

    actAsRole(11, 'GUEST');
    const guest = setup();
    await waitFor(() => expect(guest.result.current.canceled).toBe(true));
    expect(guest.result.current.canRetry).toBe(false);
    expect(guest.result.current.canCancel).toBe(false);
  });

  it.each([
    ['Event_400_28', CANCEL_EVENT_ERROR_MESSAGE.Event_400_28],
    ['Event_400_29', CANCEL_EVENT_ERROR_MESSAGE.Event_400_29],
  ] as const)('%s → 안내 + GE-3 다시 읽기, 열린 채(false)', async (code, message) => {
    server.use(...hostingEventSets.cancelFails(Number(EVENT), code));
    const { result, queryClient } = setup();
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => result.current.setReason('사유'));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.cancel();
    });
    expect(outcome).toBe(false);
    expect(result.current.error).toBe(message);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: eventManageQuery(EVENT).queryKey,
      exact: true,
    });
  });

  it('Event_400_31 → 사유 칸 오류', async () => {
    server.use(...hostingEventSets.cancelFails(Number(EVENT), 'Event_400_31'));
    const { result } = setup();
    await loaded(result);
    act(() => result.current.setReason('사유'));
    await act(async () => void (await result.current.cancel()));
    expect(result.current.reasonError).toBe(CANCEL_EVENT_ERROR_MESSAGE.Event_400_31);
    expect(result.current.error).toBeNull();
  });

  it('운영 2.5.3(E-11 없음 — 404) → 안내, 화면은 그대로', async () => {
    server.use(...hostingEventSets.cancelUnsupported(Number(EVENT)));
    const { result } = setup();
    await loaded(result);
    act(() => result.current.setReason('사유'));
    await act(async () => void (await result.current.cancel()));
    expect(result.current.error).toBe(CANCEL_EVENT_UNSUPPORTED_MESSAGE);
    expect(result.current.canceled).toBe(false);
  });

  it('매니저는 [공연 취소]를 보지 않고 요청하지 않는다', async () => {
    actAsRole(11, 'MANAGER');
    const { result } = setup();
    await loaded(result);
    expect(result.current.canCancel).toBe(false);
    const sent = recordRequests();
    act(() => result.current.setReason('사유'));
    await act(async () => void (await result.current.cancel()));
    expect(await sent.list()).toEqual([]);
  });
});
