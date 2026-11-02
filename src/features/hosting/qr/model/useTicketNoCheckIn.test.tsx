import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostCheckInSets } from '@/api/__mocks__/check-in.handlers';
import { setStoredStatus } from '@/api/__mocks__/event-store';
import { resetTicketStore as resetMyTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { server } from '@/api/__mocks__/server';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useTicketNoCheckIn } from './useTicketNoCheckIn';

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

const SLOW = { timeout: 10_000 };
vi.setConfig({ testTimeout: 30_000 });

async function setup(eventId = '101') {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  const r = renderHook(() => useTicketNoCheckIn(eventId), { wrapper });
  await waitFor(() => expect(r.result.current).not.toBeNull(), SLOW);
  return r;
}
type Hook = Awaited<ReturnType<typeof setup>>['result'];
const done = (result: Hook) =>
  waitFor(() => expect(result.current.state.status).not.toBe('checking'), SLOW);
const posts = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method === 'POST' && r.path.endsWith('/by-ticket-no'));

describe('티켓 번호로 입장(PQ-2b — #926)', () => {
  it('번호 → 입장 완료 + 관객 이름(ownerName), 다시 넣으면 이미 입장, 보낸 본문은 {ticketNo}(앞뒤 공백만 뺌)', async () => {
    const sent = recordRequests();
    const { result } = await setup();
    act(() => void result.current.submit('  t1000001 '));
    await done(result);
    expect(result.current.state).toMatchObject({
      status: 'result',
      view: { result: 'ENTERED', ticket: { ownerName: '두둥이', issuedTicketNo: 'T1000001' } },
    });
    // 숫자만 입력해도 서버가 T를 붙인다
    act(() => void result.current.submit('1000001'));
    await done(result);
    expect(result.current.state).toMatchObject({ view: { result: 'ALREADY_ENTERED' } });
    expect((await posts(sent)).map((r) => r.body)).toEqual([
      { ticketNo: 't1000001' },
      { ticketNo: '1000001' },
    ]);
  });

  it('없는 번호 → OTHER_EVENT(티켓 정보 없음)', async () => {
    const { result } = await setup();
    act(() => void result.current.submit('T9999999'));
    await done(result);
    expect(result.current.state).toMatchObject({
      status: 'result',
      view: { result: 'OTHER_EVENT', ticket: null },
    });
  });

  it('빈 값 · 20자 넘음은 보내지 않고 칸 오류', async () => {
    const sent = recordRequests();
    const { result } = await setup();
    act(() => void result.current.submit('   '));
    expect(result.current.state.status).toBe('invalid');
    act(() => void result.current.submit('T'.repeat(21)));
    expect(result.current.state.status).toBe('invalid');
    expect(await posts(sent)).toHaveLength(0);
  });

  it('네트워크 차단 → failed(다시 시도) · 토스트 없음, retry()가 같은 번호로 입장', async () => {
    server.use(...hostCheckInSets.byTicketNoNetworkError);
    const { result } = await setup();
    act(() => void result.current.submit('T1000001'));
    await done(result);
    expect(result.current.state).toMatchObject({
      status: 'failed',
      failure: { kind: 'network', canRetry: true },
    });
    expect(errorToast).not.toHaveBeenCalled();
    server.resetHandlers();
    act(() => result.current.retry());
    await done(result);
    expect(result.current.state).toMatchObject({ view: { result: 'ENTERED' } });
  });

  it('Event_400_27 → 공연 상태 안내', async () => {
    const { result } = await setup();
    setStoredStatus(101, 'CLOSED');
    act(() => void result.current.submit('T1000001'));
    await done(result);
    expect(result.current.state.status).toBe('eventNotCheckable');
  });

  it('준비중 공연은 막힘(칸을 그리지 않는다) — 요청하지 않는다', async () => {
    setStoredStatus(101, 'PREPARING');
    const sent = recordRequests();
    const { result } = await setup();
    expect(result.current.blocked).toBe(true);
    act(() => void result.current.submit('T1000001'));
    expect(await posts(sent)).toHaveLength(0);
  });
});
