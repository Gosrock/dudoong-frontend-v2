import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MISSING_ORDER_UUID, P9_ORDER, seededOrders } from '@/api/__mocks__/fixtures/order';
import { orderHandlers, resetOrderStore } from '@/api/__mocks__/order.handlers';
import { server } from '@/api/__mocks__/server';
import { MY_TICKETS_KEY, myTicketsQuery } from '@/api/my-ticket/queries';
import { myOrderQuery, myOrdersQuery } from '@/api/order/queries';
import { RefundAccountRequestSchema } from '@/api/order/schema';
import { shouldToastMutationError, shouldToastQueryError } from '@/api/query-client';
import { banksQuery } from '@/api/refund/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { OrderDetailView } from '../OrderDetailView';
import { GIFT_BLOCKS_CANCEL_MESSAGE } from './order-detail';
import { orderStatusView } from './order-status';
import { useMyOrders } from './useMyOrders';
import { useCancelOrder, useOrderDetail, useRefundAccount } from './useOrderDetail';
import { useOrderHostContacts } from './useOrderHostContacts';

let restore: () => void;
beforeEach(() => {
  resetOrderStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
});

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

async function renderReady<T>(hook: () => T, ctx = setup()) {
  const r = renderHook(hook, { wrapper: ctx.wrapper });
  await waitFor(() => expect(r.result.current).not.toBeNull());
  return { ...r, ...ctx };
}

const lastMutation = (qc: ReturnType<typeof createTestQueryClient>) =>
  qc.getMutationCache().getAll().at(-1)!;
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
const detailPath = (uuid: string) => `/api/v2/me/orders/${uuid}`;
/** O-3 GET 횟수 — 화면 진입 때 1번, 에러 뒤 다시 읽으면 2번 */
const detailReads = async (sent: ReturnType<typeof recordRequests>, uuid: string) =>
  (await sent.lines()).filter((l) => l === `GET ${detailPath(uuid)}`).length;
const validAccount = { bankCode: '004', accountHolder: ' 두둥이 ', accountNumber: '123-456-7890' };

describe('주문내역 — useMyOrders(G11/O-2)', () => {
  it('첫 페이지를 쿠키와 함께 읽고, 행마다 상태 라벨이 주문상세(O-3)와 같은 매핑에서 나온다', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() => useMyOrders());
    const reqs = (await sent.list()).filter((r) => r.path === '/api/v2/me/orders');
    expect(reqs).toMatchObject([{ method: 'GET', query: { page: '0' }, credentials: 'include' }]);
    expect(result.current.orders.length).toBeGreaterThan(10);
    expect(result.current.sortLabel).toBe('최근주문순');
    for (const row of result.current.orders) {
      const detail = await queryClient.fetchQuery(myOrderQuery(row.orderUuid));
      expect(row.statusView).toEqual(orderStatusView(detail.status, detail.refundStatus));
      expect(row.href).toBe(`/orders/${row.orderUuid}`);
    }
  });

  it('삭제된 공연의 주문도 행으로 나오고 eventRemoved', async () => {
    const { result } = await renderReady(() => useMyOrders());
    const row = result.current.orders.find((o) => o.orderUuid === P9_ORDER.deletedEvent)!;
    expect(row).toMatchObject({ event: null, eventRemoved: true });
  });

  it('무한 스크롤: 다음 페이지를 page=1로 읽어 이어 붙인다', async () => {
    server.use(...orderHandlers.listWithPageSize(5));
    const sent = recordRequests();
    const { result } = await renderReady(() => useMyOrders());
    expect(result.current.orders).toHaveLength(5);
    expect(result.current.hasNextPage).toBe(true);
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.orders).toHaveLength(10));
    const pages = (await sent.list())
      .filter((r) => r.path === '/api/v2/me/orders')
      .map((r) => r.query.page);
    expect(pages).toEqual(['0', '1']);
  });

  it('다음 페이지 실패는 기존 행을 두고 하단 재시도 — 전역 토스트 없음', async () => {
    server.use(...orderHandlers.listNextPageError, ...orderHandlers.listWithPageSize(5));
    const { result, queryClient } = await renderReady(() => useMyOrders());
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.nextPageError).toBe(true));
    expect(result.current.orders).toHaveLength(5);
    const q = queryClient.getQueryCache().find({ queryKey: myOrdersQuery().queryKey })!;
    expect(shouldToastQueryError(q.state.error, q.state)).toBe(false);
  });
});

describe('주문상세 — useOrderDetail(G11/O-3)', () => {
  it('남의(없는) 주문 주소면 공용 404 안내', async () => {
    renderWithProviders(<OrderDetailView orderUuid={MISSING_ORDER_UUID} />);
    expect(await screen.findByText('주문을 찾을 수 없어요')).toBeInTheDocument();
  });

  it('삭제된 공연(event: null)이어도 깨지지 않고, 취소 입구·호스트 문의가 없다', async () => {
    const { result } = await renderReady(() => useOrderDetail(P9_ORDER.deletedEvent));
    expect(result.current).toMatchObject({
      eventRemoved: true,
      contactsEventId: null,
      cancel: { kind: 'none' },
      refundAccount: { kind: 'none' },
    });
  });

  it.each([
    ['취소 가능 → [주문취소]', P9_ORDER.approvedPaid, { kind: 'cancel', refundAccount: true }],
    ['선물 대기 → 선물 안내', P9_ORDER.giftPending, { kind: 'giftNotice' }],
    ['입장 티켓 포함 → 안내 없음', P9_ORDER.enteredWithGift, { kind: 'none' }],
    ['공연 시작 뒤 → 안내 없음', P9_ORDER.pastWithGift, { kind: 'none' }],
    [
      '무료 선착순 → [주문취소](계좌 없이)',
      seededOrders.freeFcfs.orderUuid,
      { kind: 'cancel', refundAccount: false },
    ],
  ])('버튼 노출은 서버 canCancel로만: %s', async (_, uuid, cancel) => {
    const { result } = await renderReady(() => useOrderDetail(uuid));
    expect(result.current.cancel).toMatchObject(cancel);
  });
});

describe('주문 취소 — useCancelOrder(P11/O-4)', () => {
  it('유료: 계좌 값 없이 부르면 요청하지 않고 refundAccountMissing(계좌 시트)', async () => {
    const sent = recordRequests();
    const { result } = await renderReady(() => useCancelOrder(P9_ORDER.approvedPaid));
    expect(result.current.requiresRefundAccount).toBe(true);
    await act(() => result.current.cancel());
    expect(await writes(sent)).toEqual([]);
    expect(result.current.refundAccountMissing).toBe(true);
  });

  it('유료: 칸 오류면 요청하지 않는다', async () => {
    const sent = recordRequests();
    const { result } = await renderReady(() => useCancelOrder(P9_ORDER.approvedPaid));
    await act(() => result.current.cancel({ ...validAccount, accountNumber: '12-ab' }));
    expect(await writes(sent)).toEqual([]);
    expect(result.current.fieldErrors).toEqual({
      accountNumber: '계좌번호는 숫자와 하이픈만 입력해 주세요',
    });
  });

  it('유료: 계좌를 넣으면 목록에서 고른 bankCode로 O-4 → 환불 요청 상태, 상세 캐시·주문내역·티켓탭 갱신', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() => {
      const c = useCancelOrder(P9_ORDER.approvedPaid);
      const d = useOrderDetail(P9_ORDER.approvedPaid);
      return { c, d };
    });
    await queryClient.fetchInfiniteQuery(myOrdersQuery());
    await queryClient.fetchQuery(myTicketsQuery());
    await act(() => result.current.c.cancel(validAccount));

    const posts = await writes(sent);
    expect(posts).toMatchObject([
      {
        method: 'POST',
        path: `/api/v2/me/orders/${P9_ORDER.approvedPaid}/cancel`,
        body: {
          refundAccount: {
            bankCode: '004',
            accountHolder: '두둥이',
            accountNumber: '123-456-7890',
          },
        },
      },
    ]);
    const body = posts[0]!.body as { refundAccount: Record<string, unknown> };
    expect(body.refundAccount).not.toHaveProperty('bankName');
    expect(RefundAccountRequestSchema.safeParse(body.refundAccount).success).toBe(true);

    expect(result.current.c.result).toBe('refundRequested');
    expect(result.current.d.order).toMatchObject({
      status: 'REFUNDED',
      refundStatus: 'REQUESTED',
      canCancel: false,
      refundAccount: { bankCode: '004', maskedAccountNumber: expect.stringMatching(/^\*+7890$/) },
    });
    expect(result.current.d.statusView.label).toBe('환불요청');
    expect(queryClient.getQueryState(myOrdersQuery().queryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState([...MY_TICKETS_KEY])?.isInvalidated).toBe(true);
  });

  it('무료: 본문 없이 O-4 → 바로 취소', async () => {
    const uuid = seededOrders.freeFcfs.orderUuid;
    const sent = recordRequests();
    const { result } = await renderReady(() => ({
      c: useCancelOrder(uuid),
      d: useOrderDetail(uuid),
    }));
    expect(result.current.c.requiresRefundAccount).toBe(false);
    await act(() => result.current.c.cancel());
    expect(await writes(sent)).toMatchObject([
      { method: 'POST', path: `/api/v2/me/orders/${uuid}/cancel`, body: undefined },
    ]);
    expect(result.current.c.result).toBe('canceled');
    expect(result.current.d.order).toMatchObject({ status: 'CANCELED', refundStatus: 'NONE' });
    expect(result.current.d.cancel.kind).toBe('none');
  });

  it('경합 Order_400_24: O-3을 다시 읽고, 다시 읽은 주문이 선물 조건이면 선물 안내 — [주문취소] 자리도 안내로 바뀐다', async () => {
    server.use(...orderHandlers.cancelRaceWithGift);
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() => ({
      c: useCancelOrder(P9_ORDER.approvedPaid),
      d: useOrderDetail(P9_ORDER.approvedPaid),
    }));
    await act(() => result.current.c.cancel(validAccount));
    await waitFor(() => expect(result.current.c.error).toBe(GIFT_BLOCKS_CANCEL_MESSAGE));
    expect(result.current.d.cancel).toEqual({
      kind: 'giftNotice',
      message: GIFT_BLOCKS_CANCEL_MESSAGE,
    });
    await waitFor(async () => expect(await detailReads(sent, P9_ORDER.approvedPaid)).toBe(2));
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it.each([
    ['Order_400_5', '이미 취소되었거나 취소할 수 없는 주문이에요'],
    ['Event_400_5', '지금은 취소할 수 없는 공연이에요'],
    ['Order_400_9', '공연이 시작되어 취소할 수 없어요'],
  ] as const)('에러 분기 %s → O-3 다시 읽기 + "%s"(토스트 없음)', async (code, message) => {
    server.use(...orderHandlers.cancelFails(code));
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() => useCancelOrder(P9_ORDER.approvedPaid));
    await act(() => result.current.cancel(validAccount));
    await waitFor(() => expect(result.current.error).toBe(message));
    await waitFor(async () => expect(await detailReads(sent, P9_ORDER.approvedPaid)).toBe(2));
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it('에러 분기 Order_400_25(계좌 없음) → 다시 읽지 않고 refundAccountMissing(계좌 시트)', async () => {
    server.use(...orderHandlers.cancelFails('Order_400_25'));
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() => useCancelOrder(P9_ORDER.approvedPaid));
    await act(() => result.current.cancel(validAccount));
    await waitFor(() => expect(result.current.refundAccountMissing).toBe(true));
    expect(result.current.error).toBe('환불받을 계좌를 입력해 주세요');
    expect(await detailReads(sent, P9_ORDER.approvedPaid)).toBe(1);
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it('표에 없는 코드(Order_404_1)는 전역 토스트로 간다', async () => {
    server.use(...orderHandlers.cancelFails('Order_404_1'));
    const { result, queryClient } = await renderReady(() => useCancelOrder(P9_ORDER.approvedPaid));
    await act(() => result.current.cancel(validAccount));
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe('환불 계좌 입력·수정 — useRefundAccount(P11/O-5)', () => {
  it('유료 거절: 입력 유도 → PUT(bankCode만) → maskedAccountNumber가 생기고 유도가 꺼진다', async () => {
    const uuid = P9_ORDER.refusedAmount;
    const sent = recordRequests();
    const { result } = await renderReady(() => ({
      r: useRefundAccount(uuid),
      d: useOrderDetail(uuid),
    }));
    expect(result.current.r.entry).toEqual({ kind: 'open', mode: 'input', prompt: true });
    await act(() => result.current.r.submit(validAccount));
    expect(await writes(sent)).toMatchObject([
      {
        method: 'PUT',
        path: `/api/v2/me/orders/${uuid}/refund-account`,
        body: { bankCode: '004', accountHolder: '두둥이', accountNumber: '123-456-7890' },
      },
    ]);
    expect(result.current.r.saved).toBe(true);
    expect(result.current.d.order.refundAccount).toMatchObject({
      bankName: 'KB국민은행',
      bankCode: '004',
      maskedAccountNumber: expect.stringMatching(/^\*+7890$/),
    });
    expect(result.current.d.refundAccount).toEqual({ kind: 'open', mode: 'edit', prompt: false });
  });

  it('입금 미확인 거절은 입구만 있고 유도가 없다', async () => {
    const { result } = await renderReady(() => useRefundAccount(P9_ORDER.refusedDeposit));
    expect(result.current.entry).toEqual({ kind: 'open', mode: 'input', prompt: false });
  });

  it('수정: 처음 값은 은행·예금주만(계좌번호는 다시 입력), 저장하면 마스킹 값이 바뀐다', async () => {
    const uuid = P9_ORDER.refundRequested;
    const { result } = await renderReady(() => ({
      r: useRefundAccount(uuid),
      d: useOrderDetail(uuid),
    }));
    expect(result.current.r.defaults).toEqual({
      bankCode: '088',
      accountHolder: '두둥이',
      accountNumber: '',
    });
    expect(result.current.d.order.refundAccount?.maskedAccountNumber).toBe('******6789');
    await act(() =>
      result.current.r.submit({
        bankCode: '088',
        accountHolder: '두둥이',
        accountNumber: '333-4321',
      }),
    );
    expect(result.current.d.order.refundAccount?.maskedAccountNumber).toMatch(/^\*+4321$/);
  });

  it('옛 자유 입력 계좌(bankCode null)는 은행을 비워 목록에서 다시 고르게 한다', async () => {
    const { result } = await renderReady(() =>
      useRefundAccount(P9_ORDER.refundRequestedLegacyBank),
    );
    expect(result.current.defaults.bankCode).toBe('');
  });

  it('은행 목록을 받았으면 목록에 없는 코드는 요청 없이 칸 오류', async () => {
    const sent = recordRequests();
    const ctx = setup();
    await ctx.queryClient.fetchQuery(banksQuery());
    const { result } = await renderReady(() => useRefundAccount(P9_ORDER.refusedAmount), ctx);
    await act(() => result.current.submit({ ...validAccount, bankCode: '999' }));
    expect(await writes(sent)).toEqual([]);
    expect(result.current.fieldErrors).toEqual({ bankCode: '은행을 골라 주세요' });
    const banks = (await sent.list()).find((r) => r.path === '/api/v2/banks');
    expect(banks?.credentials).toBe('omit');
  });

  it('환불 완료된 주문에 보내면(서버 Order_400_28) O-3 다시 읽기 + 안내', async () => {
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() =>
      useRefundAccount(P9_ORDER.refundCompleted),
    );
    await act(() => result.current.submit(validAccount));
    await waitFor(() => expect(result.current.error).toBe('이미 환불이 완료된 주문이에요'));
    await waitFor(async () => expect(await detailReads(sent, P9_ORDER.refundCompleted)).toBe(2));
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });

  it.each([
    ['Order_400_27', '환불 계좌를 입력할 수 없는 주문이에요', true],
    ['Order_400_28', '이미 환불이 완료된 주문이에요', true],
    ['Order_400_25', '환불받을 계좌를 다시 확인해 주세요', false],
  ] as const)('에러 분기 %s → "%s"(다시 읽기 %s)', async (code, message, refetch) => {
    server.use(...orderHandlers.refundAccountFails(code));
    const sent = recordRequests();
    const { result, queryClient } = await renderReady(() =>
      useRefundAccount(P9_ORDER.refusedAmount),
    );
    await act(() => result.current.submit(validAccount));
    await waitFor(() => expect(result.current.error).toBe(message));
    await waitFor(async () =>
      expect(await detailReads(sent, P9_ORDER.refusedAmount)).toBe(refetch ? 2 : 1),
    );
    const m = lastMutation(queryClient);
    expect(shouldToastMutationError(m.state.error, m.meta)).toBe(false);
  });
});

describe('주문상세 호스트 문의 — useOrderHostContacts(GP-3 viewer)', () => {
  it('시트를 열기 전에는 요청이 없고, 열면 GP-3을 쿠키와 함께 한 번 읽어 원문 연락처를 준다(공개 GP-3은 부르지 않는다)', async () => {
    const sent = recordRequests();
    const ctx = setup();
    const { result, rerender } = renderHook(({ open }) => useOrderHostContacts(101, { open }), {
      wrapper: ctx.wrapper,
      initialProps: { open: false },
    });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect((await sent.list()).filter((r) => r.path === '/api/v2/events/101')).toEqual([]);

    rerender({ open: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const gp3 = (await sent.list()).filter((r) => r.path === '/api/v2/events/101');
    expect(gp3).toMatchObject([{ method: 'GET', credentials: 'include' }]);
    expect(result.current.masked).toBe(false);
    expect(result.current.items.find((c) => c.type === 'PHONE')).toMatchObject({
      value: '010-1234-5678',
      href: 'tel:01012345678',
    });
    expect(result.current.available).toBe(true);
  });

  it('삭제된 공연(eventId null)이면 요청하지 않고 문의 입구가 없다', async () => {
    const sent = recordRequests();
    const ctx = setup();
    const { result } = renderHook(() => useOrderHostContacts(null, { open: true }), {
      wrapper: ctx.wrapper,
    });
    await waitFor(() => expect(result.current.available).toBe(false));
    expect((await sent.list()).filter((r) => r.path.startsWith('/api/v2/events'))).toEqual([]);
  });
});
