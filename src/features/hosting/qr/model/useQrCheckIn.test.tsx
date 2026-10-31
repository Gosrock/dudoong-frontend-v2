import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostCheckInSets } from '@/api/__mocks__/check-in.handlers';
import { setStoredStatus } from '@/api/__mocks__/event-store';
import {
  CHECK_IN_TOKEN,
  markTicketCanceled,
  resetTicketStore as resetMyTicketStore,
  TICKET_UUID,
} from '@/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { server } from '@/api/__mocks__/server';
import { checkInStatsQuery } from '@/api/check-in/queries';
import { eventDashboardQuery } from '@/api/dashboard/queries';
import { eventManageQuery } from '@/api/event/queries';
import { hostIssuedTicketsKey } from '@/api/issued-ticket/queries';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useCheckInStats } from './useCheckInStats';
import { useHostScan } from './useHostScan';
import { useSelfCheckInQr } from './useSelfCheckInQr';

const reset = () => {
  resetHostMockState();
  resetHostingStore();
  resetMyTicketStore();
};
let restore: () => void;
beforeEach(() => {
  reset();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  reset();
});

/** 기기가 바쁠 때(전체 스위트) Suspense·요청이 1초를 넘길 수 있다 */
const SLOW = { timeout: 10_000 };
vi.setConfig({ testTimeout: 30_000 });

/** 시계 — 쿨다운을 테스트가 움직인다 */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function setup<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper }), queryClient };
}

/** 스캔 + 통계를 같은 화면에서. GE-3(Suspense)이 풀린 뒤 돌려준다 */
async function setupScan(eventId: string, c = clock()) {
  const r = setup(() => ({
    scan: useHostScan(eventId, { now: c.now }),
    stats: useCheckInStats(eventId),
  }));
  await waitFor(() => expect(r.result.current).not.toBeNull(), SLOW);
  return { ...r, clock: c };
}
type ScanHook = Awaited<ReturnType<typeof setupScan>>['result'];
const statsLoaded = (result: ScanHook) =>
  waitFor(() => expect(result.current?.stats.status).toBe('success'), SLOW);
const scanDone = (result: ScanHook) =>
  waitFor(() => expect(result.current.scan.state.status).not.toBe('checking'), SLOW);
const scanPosts = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method === 'POST' && r.path.endsWith('/check-ins'));

describe('[호스트가 스캔](PQ-2)', () => {
  it('스캔 → 입장 완료(ownerName) → 체크인 통계(GQ-1)가 다시 읽혀 바뀐다, 보낸 본문은 {ticketUuid}', async () => {
    const sent = recordRequests();
    const { result } = await setupScan('101');
    await statsLoaded(result);
    expect(result.current.stats.stats).toMatchObject({ issuedCount: 7, enteredCount: 0 });

    let outcome: string | undefined;
    act(() => {
      outcome = result.current.scan.submitScan(`  ${TICKET_UUID.approved} `);
    });
    expect(outcome).toBe('sent');
    expect(result.current.scan.state).toEqual({ status: 'checking', value: TICKET_UUID.approved });
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({
      status: 'result',
      view: {
        result: 'ENTERED',
        tone: 'success',
        title: '입장 완료',
        ticket: { ownerName: '두둥이' },
      },
    });
    await waitFor(() =>
      expect(result.current.stats.stats).toMatchObject({ enteredCount: 1, entranceRate: 14.3 }),
    );
    expect((await scanPosts(sent)).map((r) => [r.path, r.body])).toEqual([
      ['/api/v2/events/101/check-ins', { ticketUuid: TICKET_UUID.approved }],
    ]);
  });

  it('ENTERED면 발급 티켓(GI-1)·대시보드(GD-1)도 무효화, 다시 스캔(ALREADY_ENTERED)은 GQ-1만', async () => {
    const { result, queryClient, clock: c } = await setupScan('101');
    await statsLoaded(result);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(spy).toHaveBeenCalledWith({ queryKey: hostIssuedTicketsKey('101') });
    expect(spy).toHaveBeenCalledWith({
      queryKey: eventDashboardQuery('101').queryKey,
      exact: true,
    });

    spy.mockClear();
    c.advance(60_000);
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({ view: { result: 'ALREADY_ENTERED' } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      queryKey: checkInStatsQuery('101').queryKey,
      exact: true,
    });
  });

  it.each([
    ['ALREADY_ENTERED', 'warning', '이미 입장한 티켓이에요', true],
    ['OTHER_EVENT', 'error', '이 공연 티켓이 아니에요', false],
    ['CANCELED', 'error', '취소된 티켓이에요', true],
    ['GIFT_PENDING', 'warning', '선물 대기 중인 티켓이에요', true],
  ] as const)('result %s → %s "%s"', async (expected, tone, title, hasTicket) => {
    markTicketCanceled('mock-ticket-g3');
    const value = {
      ALREADY_ENTERED: TICKET_UUID.approved,
      OTHER_EVENT: TICKET_UUID.single,
      CANCELED: 'mock-ticket-g3',
      GIFT_PENDING: TICKET_UUID.giftPending,
    }[expected];
    const { result, clock: c } = await setupScan('101');
    if (expected === 'ALREADY_ENTERED') {
      act(() => void result.current.scan.submitScan(value));
      await scanDone(result);
      c.advance(10_000);
    }
    act(() => void result.current.scan.submitScan(value));
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({
      status: 'result',
      view: { result: expected, tone, title },
    });
    const state = result.current.scan.state;
    if (state.status !== 'result') throw new Error();
    expect(state.view.ticket !== null).toBe(hasTicket);
  });

  it('같은 값은 끝난 뒤 쿨다운 동안 무시하고, 지나면 다시 보낸다', async () => {
    const sent = recordRequests();
    const { result, clock: c } = await setupScan('101');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    let outcome: string | undefined;
    c.advance(2_999);
    act(() => {
      outcome = result.current.scan.submitScan(TICKET_UUID.approved);
    });
    expect(outcome).toBe('ignored');
    c.advance(1);
    act(() => {
      outcome = result.current.scan.submitScan(TICKET_UUID.approved);
    });
    expect(outcome).toBe('sent');
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({ view: { result: 'ALREADY_ENTERED' } });
    expect(await scanPosts(sent)).toHaveLength(2);
  });

  it('요청 중 같은 값은 무시, 다른 값은 하나만(가장 최근) 대기시켰다가 이어서 보낸다', async () => {
    const sent = recordRequests();
    const { result } = await setupScan('101');
    const outcomes: string[] = [];
    act(() => {
      outcomes.push(result.current.scan.submitScan(TICKET_UUID.approved));
      outcomes.push(result.current.scan.submitScan(TICKET_UUID.approved));
      outcomes.push(result.current.scan.submitScan(TICKET_UUID.giftPending));
      outcomes.push(result.current.scan.submitScan(TICKET_UUID.received));
    });
    expect(outcomes).toEqual(['sent', 'ignored', 'queued', 'queued']);
    await waitFor(async () => expect(await scanPosts(sent)).toHaveLength(2));
    await scanDone(result);
    expect((await scanPosts(sent)).map((r) => r.body)).toEqual([
      { ticketUuid: TICKET_UUID.approved },
      { ticketUuid: TICKET_UUID.received },
    ]);
    expect(result.current.scan.state).toMatchObject({
      value: TICKET_UUID.received,
      view: { result: 'ENTERED' },
    });
  });

  it('빈 값은 무시, 64자 넘는 값은 요청 없이 invalidQr', async () => {
    const sent = recordRequests();
    const { result } = await setupScan('101');
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.scan.submitScan('   ');
    });
    expect(outcome).toBe('ignored');
    expect(result.current.scan.state).toEqual({ status: 'idle' });
    act(() => {
      outcome = result.current.scan.submitScan(
        `https://dudoong.com/check-in?token=${'x'.repeat(43)}`,
      );
    });
    expect(outcome).toBe('invalid');
    expect(result.current.scan.state).toEqual({ status: 'invalidQr' });
    expect(await scanPosts(sent)).toEqual([]);
  });

  it('네트워크 차단 → failed(network) + 토스트 없음, retry()가 같은 값을 다시 보내 입장', async () => {
    server.use(...hostCheckInSets.scanNetworkError);
    const sent = recordRequests();
    const { result, queryClient } = await setupScan('101');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({
      status: 'failed',
      value: TICKET_UUID.approved,
      failure: { kind: 'network', canRetry: true },
    });
    const m = queryClient.getMutationCache().getAll()[0]!;
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(false);

    server.resetHandlers();
    act(() => result.current.scan.retry());
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({ view: { result: 'ENTERED' } });
    expect(await scanPosts(sent)).toHaveLength(2);
  });

  it('5xx → failed(server), 다시 시도할 수 있다', async () => {
    server.use(...hostCheckInSets.scanServerError);
    const { result } = await setupScan('101');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({
      status: 'failed',
      failure: { kind: 'server', canRetry: true },
    });
  });

  it('Event_400_27(스캔 사이에 공연이 끝남) → 안내 + GE-3 다시 읽어 막힌 상태로', async () => {
    const { result, queryClient } = await setupScan('101');
    await statsLoaded(result);
    setStoredStatus(101, 'CLOSED');
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(result.current.scan.state).toEqual({
      status: 'eventNotCheckable',
      message: '준비중이거나 지난 공연은 입장 처리를 할 수 없어요',
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: eventManageQuery('101').queryKey,
      exact: true,
    });
    await waitFor(() => expect(result.current.scan.block).toBe('ended'));
    expect(result.current.scan.blockMessage).toBe('지난 공연은 입장 처리를 할 수 없어요');
  });

  it.each([
    ['CALCULATING', null],
    ['CLOSED', 'ended'],
    ['PREPARING', 'notRegistered'],
  ] as const)('공연 %s → block %s(막히면 요청하지 않는다)', async (status, block) => {
    setStoredStatus(101, status);
    const sent = recordRequests();
    const { result } = await setupScan('101');
    await statsLoaded(result);
    expect(result.current.scan.block).toBe(block);
    let outcome: string | undefined;
    act(() => {
      outcome = result.current.scan.submitScan(TICKET_UUID.approved);
    });
    expect(outcome).toBe(block === null ? 'sent' : 'blocked');
    if (block === null) await scanDone(result);
    expect(await scanPosts(sent)).toHaveLength(block === null ? 1 : 0);
  });

  it('reset()은 결과를 지운다(요청 중이면 무시)', async () => {
    const { result } = await setupScan('101');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    act(() => result.current.scan.reset());
    expect(result.current.scan.state.status).toBe('checking');
    await scanDone(result);
    act(() => result.current.scan.reset());
    expect(result.current.scan.state).toEqual({ status: 'idle' });
  });

  it('일반 멤버도 스캔한다', async () => {
    actAsRole(11, 'GUEST');
    const { result } = await setupScan('101');
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    expect(result.current.scan.state).toMatchObject({ view: { result: 'ENTERED' } });
  });
});

describe('체크인 통계(GQ-1)', () => {
  it('발급 0이면 0/0', async () => {
    const { result } = setup(() => useCheckInStats('140'));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.stats).toEqual({
      issuedCount: 0,
      enteredCount: 0,
      notEnteredCount: 0,
      entranceRate: 0,
    });
  });

  it('첫 조회 실패 → error + retry', async () => {
    server.use(...hostCheckInSets.statsServerError);
    const { result } = setup(() => useCheckInStats('101'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    server.resetHandlers();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('스캔 뒤 다시 읽기가 네트워크로 실패하면 지난 값을 두고 refreshFailed(토스트 없음 — meta.silent)', async () => {
    const { result, queryClient } = await setupScan('101');
    await statsLoaded(result);
    server.use(...hostCheckInSets.statsNetworkError);
    act(() => void result.current.scan.submitScan(TICKET_UUID.approved));
    await scanDone(result);
    await waitFor(() => expect(result.current.stats.refreshFailed).toBe(true));
    expect(result.current.stats.stats).toMatchObject({ enteredCount: 0 });
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ['events', '101', 'manage', 'check-ins', 'stats'] })?.meta,
    ).toEqual({ silent: true });
  });
});

describe('[관객이 스캔](GQ-4)', () => {
  const origin = () => 'https://dudoong.com';

  it('OPEN 공연 → QR 주소 = origin + qrPath', async () => {
    const { result } = setup(() => useSelfCheckInQr('101', { origin }));
    await waitFor(() => expect(result.current?.status).toBe('ready'));
    expect(result.current.qrUrl).toBe(`https://dudoong.com/check-in?token=${CHECK_IN_TOKEN.multi}`);
    expect(result.current.guidance).toBeNull();
  });

  it.each([
    ['CALCULATING', 'ended', '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요'],
    ['CLOSED', 'ended', '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요'],
    ['PREPARING', 'notRegistered', '공연을 등록해야 셀프 체크인을 할 수 있어요'],
  ] as const)('%s → 안내만, GQ-4를 부르지 않는다', async (status, block, guidance) => {
    setStoredStatus(101, status);
    const sent = recordRequests();
    const { result } = setup(() => useSelfCheckInQr('101', { origin }));
    await waitFor(() => expect(result.current?.status).toBe('blocked'));
    expect(result.current).toMatchObject({ block, guidance, qrUrl: null });
    expect(result.current.hint !== null).toBe(block === 'ended');
    expect((await sent.list()).filter((r) => r.path.endsWith('/check-in-qr'))).toEqual([]);
  });

  it('실패 → error + retry', async () => {
    server.use(...hostCheckInSets.qrServerError);
    const { result } = setup(() => useSelfCheckInQr('101', { origin }));
    await waitFor(() => expect(result.current?.status).toBe('error'));
    server.resetHandlers();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
