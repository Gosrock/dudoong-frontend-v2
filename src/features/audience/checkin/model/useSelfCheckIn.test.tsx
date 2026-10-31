import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkInHandlers } from '@/api/__mocks__/check-in.handlers';
import { CHECK_IN_TOKEN, resetTicketStore, TICKET_UUID } from '@/api/__mocks__/fixtures/my-ticket';
import { server } from '@/api/__mocks__/server';
import { SelfCheckInRequestSchema } from '@/api/check-in/schema';
import { errorToast } from '@/test/error-toast';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useSelfCheckIn } from './useSelfCheckIn';

let restore: () => void;
beforeEach(() => {
  resetTicketStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
});

function open(token: string | null) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );
  return { ...renderHook(() => useSelfCheckIn(token), { wrapper }), queryClient };
}

const posts = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method === 'POST' && r.path === '/api/v2/check-ins/self');

describe('셀프 체크인 — useSelfCheckIn(PQ-5)', () => {
  it('1장이면 열자마자 {token}을 한 번만 보내 입장 완료(StrictMode에서도 한 번)', async () => {
    const sent = recordRequests();
    const { result } = open(CHECK_IN_TOKEN.single);
    expect(result.current.state.status).toBe('checking');
    await waitFor(() => expect(result.current.state.status).toBe('result'));
    expect(result.current.state).toMatchObject({
      view: { result: 'ENTERED', title: '입장이 완료됐어요', ticket: { ownerName: '두둥이' } },
    });
    const sentPosts = await posts(sent);
    expect(sentPosts.map((r) => r.body)).toEqual([{ token: CHECK_IN_TOKEN.single }]);
    expect(SelfCheckInRequestSchema.safeParse(sentPosts[0]!.body).success).toBe(true);
  });

  it('여러 장이면 후보를 고르고, 고른 티켓으로 {token, ticketUuid}를 다시 보낸다', async () => {
    const sent = recordRequests();
    const { result } = open(CHECK_IN_TOKEN.multi);
    await waitFor(() => expect(result.current.state.status).toBe('select'));
    if (result.current.state.status !== 'select') throw new Error();
    expect(result.current.state.candidates.map((c) => c.ticketUuid)).toEqual([
      TICKET_UUID.approved,
      TICKET_UUID.received,
    ]);
    act(() => result.current.select(TICKET_UUID.received));
    await waitFor(() => expect(result.current.state.status).toBe('result'));
    expect(result.current.state).toMatchObject({ view: { result: 'ENTERED' } });
    expect((await posts(sent)).map((r) => r.body)).toEqual([
      { token: CHECK_IN_TOKEN.multi },
      { token: CHECK_IN_TOKEN.multi, ticketUuid: TICKET_UUID.received },
    ]);
  });

  it('후보에 없는 uuid는 보내지 않는다', async () => {
    const sent = recordRequests();
    const { result } = open(CHECK_IN_TOKEN.multi);
    await waitFor(() => expect(result.current.state.status).toBe('select'));
    act(() => result.current.select(TICKET_UUID.othersInSameEvent));
    expect(result.current.state.status).toBe('select');
    expect(await posts(sent)).toHaveLength(1);
  });

  it('고른 티켓이 남의 것(IssuedTicket_400_1)이면 고르는 화면에 남아 "내 티켓이 아니에요"', async () => {
    const { result } = open(CHECK_IN_TOKEN.multi);
    await waitFor(() => expect(result.current.state.status).toBe('select'));
    server.use(...checkInHandlers.fails('IssuedTicket_400_1'));
    act(() => result.current.select(TICKET_UUID.approved));
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'select',
        error: { kind: 'NOT_MY_TICKET', title: '내 티켓이 아니에요' },
      }),
    );
  });

  it('토큰이 없거나 틀린 모양이면 요청 없이 "잘못된 체크인 QR"', async () => {
    const sent = recordRequests();
    const { result } = open(null);
    expect(result.current.state).toMatchObject({ status: 'error', error: { kind: 'INVALID_QR' } });
    expect(await posts(sent)).toEqual([]);
  });

  it.each([
    ['invalid-token', 'INVALID_QR', '잘못된 체크인 QR이에요'],
    [CHECK_IN_TOKEN.ended, 'EVENT_NOT_OPEN', '지금은 셀프 체크인을 할 수 없는 공연이에요'],
  ])('%s → %s "%s"(공용 토스트 없음)', async (token, kind, title) => {
    const { result } = open(token);
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: 'error', error: { kind, title } }),
    );
    expect(errorToast).not.toHaveBeenCalled();
  });

  it.each([[CHECK_IN_TOKEN.none, 'OTHER_EVENT', '이 공연에 입장할 수 있는 내 티켓이 없어요']])(
    '%s → %s',
    async (token, resultCode, title) => {
      const { result } = open(token);
      await waitFor(() =>
        expect(result.current.state).toMatchObject({ view: { result: resultCode, title } }),
      );
    },
  );

  it('입장한 뒤 다시 찍으면 ALREADY_ENTERED(입장 시각)', async () => {
    const first = open(CHECK_IN_TOKEN.single);
    await waitFor(() => expect(first.result.current.state.status).toBe('result'));
    first.unmount();
    const { result } = open(CHECK_IN_TOKEN.single);
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        view: { result: 'ALREADY_ENTERED', description: '2026.10.22 18:40 입장' },
      }),
    );
  });

  it('5xx면 FAILED, [다시 시도]로 토큰만 다시 보낸다', async () => {
    server.use(...checkInHandlers.serverError);
    const sent = recordRequests();
    const { result } = open(CHECK_IN_TOKEN.single);
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'error',
        error: { kind: 'FAILED', canRetry: true },
      }),
    );
    server.resetHandlers();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('result'));
    expect((await posts(sent)).map((r) => r.body)).toEqual([
      { token: CHECK_IN_TOKEN.single },
      { token: CHECK_IN_TOKEN.single },
    ]);
  });
});
