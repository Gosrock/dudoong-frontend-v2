import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GIFT_TOKEN, PENDING_GIFT_ID, resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { giftHandlers } from '@/api/__mocks__/gift.handlers';
import { server } from '@/api/__mocks__/server';
import { giftLandingQuery } from '@/api/gift/queries';
import { myTicketsQuery } from '@/api/my-ticket/queries';
import { shouldToastMutationError } from '@/api/query-client';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { type GiftButtonMode, useGiftLanding } from './useGiftLanding';

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

let restore: (() => void) | null = null;
beforeEach(() => {
  resetTicketStore();
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
  router.push.mockReset();
});

const login = () => {
  restore = installLoggedInFetch();
};

/** 라우트 파일이 서버에서 프리페치한 상태(공개 값)로 연다 */
async function open(token: string, queryClient = createTestQueryClient()) {
  await queryClient.prefetchQuery(giftLandingQuery(token));
  const modes: GiftButtonMode[] = [];
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  const view = renderHook(
    () => {
      const landing = useGiftLanding(token);
      modes.push(landing.receiveMode);
      return landing;
    },
    { wrapper },
  );
  return { ...view, queryClient, modes };
}

const viewerCalls = (lines: { path: string; credentials: RequestCredentials }[], token: string) =>
  lines.filter((r) => r.path === `/api/v2/gifts/${token}` && r.credentials === 'include');

describe('익명 — 공개 값으로 상태 확정, 버튼은 로그인 링크', () => {
  it('viewer를 부르지 않고 AVAILABLE, [선물받기]·[거절하기]는 login(요청 없음)', async () => {
    const sent = recordRequests();
    const { result } = await open(GIFT_TOKEN.mine);
    await waitFor(() => expect(result.current?.state.status).toBe('ready'));
    expect(result.current.state).toMatchObject({ screen: { viewState: 'AVAILABLE' } });
    expect(result.current.receiveMode).toBe('login');
    await act(() => result.current.accept());
    const list = await sent.list();
    expect(viewerCalls(list, GIFT_TOKEN.mine)).toEqual([]);
    expect(list.filter((r) => r.method === 'POST')).toEqual([]);
  });

  it('요약(공연·티켓·가린 닉네임)은 공개 값으로 바로 있다', async () => {
    const { result } = await open(GIFT_TOKEN.mine);
    expect(result.current?.summary).toMatchObject({
      senderName: '김*수',
      event: { name: '고스락 제37회 정기공연' },
      ticket: { ticketName: '일반 예매' },
    });
  });
});

describe('보낸 본인 — 수락 버튼이 눌리는 순간이 없다', () => {
  it('viewer 확정 전은 pending, 확정 뒤 OWN_LINK — 렌더 전체에서 receiveMode가 enabled인 적이 없다', async () => {
    login();
    const { result, modes } = await open(GIFT_TOKEN.mine);
    await waitFor(() => expect(result.current?.state.status).toBe('ready'));
    expect(result.current.state).toMatchObject({
      screen: { viewState: 'OWN_LINK', actions: ['CANCEL_GIFT', 'GO_TICKETS'] },
      giftId: PENDING_GIFT_ID,
    });
    expect(modes.length).toBeGreaterThan(1);
    expect(modes).not.toContain('enabled');
    expect(modes).not.toContain('login');
  });

  it('[선물 취소] → DG-2 → 랜딩을 다시 읽어 CANCELED', async () => {
    login();
    const sent = recordRequests();
    const { result } = await open(GIFT_TOKEN.mine);
    await waitFor(() => expect(result.current?.cancelMode).toBe('enabled'));
    await act(() => result.current.cancelGift());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ screen: { viewState: 'CANCELED' } }),
    );
    expect((await sent.list()).filter((r) => r.method === 'DELETE').map((r) => r.path)).toEqual([
      `/api/v2/me/gifts/${PENDING_GIFT_ID}`,
    ]);
  });

  it('공연이 끝난 내 선물(EXPIRED + giftId)은 [선물 회수]', async () => {
    login();
    const { result } = await open(GIFT_TOKEN.expiredMine);
    await waitFor(() => expect(result.current?.state.status).toBe('ready'));
    expect(result.current.state).toMatchObject({
      screen: { viewState: 'EXPIRED', actions: ['CANCEL_GIFT', 'GO_TICKETS'] },
    });
    expect(result.current.receiveMode).toBe('disabled');
  });
});

describe('받는 사람', () => {
  it('비로그인 → 로그인 → 같은 주소로 복귀: 자동 수락하지 않고, 다시 눌러야 PG-4 → 티켓 쿼리 무효화 → 티켓탭', async () => {
    // 1) 익명으로 열어 [선물받기]는 로그인 링크
    const anon = await open(GIFT_TOKEN.forMe);
    await waitFor(() => expect(anon.result.current?.receiveMode).toBe('login'));
    anon.unmount();

    // 2) 로그인하고 같은 주소로 돌아옴(하드 이동 — 새 캐시)
    login();
    const sent = recordRequests();
    const { result, modes, queryClient } = await open(GIFT_TOKEN.forMe);
    await queryClient.prefetchQuery(myTicketsQuery());
    await waitFor(() => expect(result.current?.receiveMode).toBe('enabled'));
    expect(modes[0]).toBe('disabled');
    expect((await sent.list()).filter((r) => r.method === 'POST')).toEqual([]);

    // 3) 명시적으로 수락
    await act(() => result.current.accept());
    expect((await sent.list()).filter((r) => r.method === 'POST').map((r) => r.path)).toEqual([
      `/api/v2/gifts/${GIFT_TOKEN.forMe}/accept`,
    ]);
    expect(router.push).toHaveBeenCalledWith('/tickets');
    expect(queryClient.getQueryState(myTicketsQuery().queryKey)?.isInvalidated).toBe(true);
    const { groups } = await queryClient.fetchQuery(myTicketsQuery());
    const received = groups.find((g) => !g.isMyOrder)!;
    expect(received.counts).toEqual({ RECEIVED: 2 });
  });

  it('[거절하기] → PG-5 → 랜딩을 다시 읽어 REJECTED', async () => {
    login();
    const { result } = await open(GIFT_TOKEN.forMe);
    await waitFor(() => expect(result.current?.receiveMode).toBe('enabled'));
    await act(() => result.current.reject());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ screen: { viewState: 'REJECTED' } }),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('내가 받은 선물을 다시 열면 "이미 받은 선물"(isReceiver)', async () => {
    login();
    const { result } = await open(GIFT_TOKEN.accepted);
    await waitFor(() => expect(result.current?.state.status).toBe('ready'));
    expect(result.current.state).toMatchObject({ screen: { title: '이미 받은 선물이에요' } });
  });

  it.each([
    ['Gift_400_3', '이미 처리된 선물이에요', 'AVAILABLE'],
    ['Gift_400_4', '내가 보낸 선물은 받을 수 없어요', 'AVAILABLE'],
    ['Gift_400_5', '공연이 끝나 받을 수 없는 선물이에요', 'AVAILABLE'],
    ['Gift_400_6', '받을 수 없는 선물이에요', 'CANCELED'],
  ] as const)(
    '수락이 %s → 랜딩을 다시 읽고 "%s"(다시 읽어도 받을 수 있으면 → %s)',
    async (code, message, screen) => {
      login();
      server.use(...giftHandlers.fails('accept', code));
      const { result, queryClient } = await open(GIFT_TOKEN.forMe);
      await waitFor(() => expect(result.current?.receiveMode).toBe('enabled'));
      const sent = recordRequests();
      await act(() => result.current.accept());
      await waitFor(() => expect(result.current.actionError).toBe(message));
      expect(viewerCalls(await sent.list(), GIFT_TOKEN.forMe).length).toBeGreaterThan(0);
      expect(result.current.state).toMatchObject({ screen: { viewState: screen } });
      expect(router.push).not.toHaveBeenCalled();
      const m = queryClient.getMutationCache().getAll().at(-1)!;
      expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
    },
  );

  it('동시 수락으로 이미 처리됨(Gift_400_3) — 다시 읽은 값으로 상태 화면이 바뀐다', async () => {
    login();
    const { result } = await open(GIFT_TOKEN.forMe);
    await waitFor(() => expect(result.current?.receiveMode).toBe('enabled'));
    // 다른 탭(같은 사용자)이 먼저 수락
    const { acceptGift } = await import('@/api/__mocks__/fixtures/my-ticket');
    acceptGift(GIFT_TOKEN.forMe);
    await act(() => result.current.accept());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        screen: { viewState: 'ALREADY_ACCEPTED', title: '이미 받은 선물이에요' },
      }),
    );
    expect(result.current.receiveMode).toBe('disabled');
  });
});

describe('viewer 실패', () => {
  it('viewer가 5xx면 error(다시 시도) — 버튼은 비활성', async () => {
    login();
    const queryClient = createTestQueryClient();
    await queryClient.prefetchQuery(giftLandingQuery(GIFT_TOKEN.forMe));
    server.use(...giftHandlers.landingServerError);
    const { result } = await open(GIFT_TOKEN.forMe, queryClient);
    await waitFor(() => expect(result.current?.state.status).toBe('error'));
    expect(result.current.receiveMode).toBe('disabled');
  });
});
