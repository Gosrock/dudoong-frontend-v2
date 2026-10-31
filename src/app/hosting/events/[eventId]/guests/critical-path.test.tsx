import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTicketStore as resetMyTicketStore } from '@/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { resetOrderStore } from '@/api/__mocks__/order.handlers';
import { meQuery } from '@/api/me/queries';
import { checkoutQuery, myOrderQuery } from '@/api/order/queries';
import { useCheckout } from '@/features/audience/checkout/model/useCheckout';
import { useTicketSelection } from '@/features/audience/event/model/useTicketSelection';
import { useTicketTab } from '@/features/audience/ticket/model/useTicketTab';
import { useOrderDetail } from '@/features/hosting/guest/model/useOrderDetail';
import { useOrderList } from '@/features/hosting/guest/model/useOrderList';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';

/**
 * P13a 크리티컬 패스(plan P13a L) — 공연 상세의 티켓 선택(P6) → 체크아웃·주문(P7) → 호스트 예매자 관리에서 승인(P13a) →
 * 관객 티켓탭에 발급(P8)을 실제 훅과 MSW 저장소로 잇는다. 스테이징 agent-browser 왕복은 스테이징이 생긴 뒤.
 */
const router = { replace: vi.fn(), push: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

let restore: () => void;
const resetAll = () => {
  resetHostMockState();
  resetHostingStore();
  resetOrderStore();
  resetMyTicketStore();
};
beforeEach(() => {
  resetAll();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  router.replace.mockReset();
  resetAll();
});

const EVENT = 101;

function wrapper(queryClient = createTestQueryClient()) {
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback="불러오는 중">{children}</Suspense>
      </QueryClientProvider>
    ),
  };
}

describe('크리티컬 패스: 상세 → 선택 → 체크아웃 → 주문 → 호스트 승인 → 티켓탭 발급', () => {
  it('관객이 두둥 티켓 2매를 주문하면 호스트 주문 목록에 승인 대기로 나오고, 승인하면 관객 티켓탭에 2장이 발급된다', async () => {
    // 1) 공연 상세 — 티켓 선택(GP-5)
    const audience = wrapper();
    const selection = renderHook(() => useTicketSelection(EVENT, 'UPCOMING'), {
      wrapper: audience.wrapper,
    });
    await waitFor(() => expect(selection.result.current.status).toBe('success'));
    act(() => selection.result.current.select(501));
    act(() => selection.result.current.setQuantity(2));
    expect(selection.result.current.checkoutHref).toBe(
      '/events/101/checkout?ticketItemId=501&quantity=2',
    );

    // 2) 체크아웃 — O-0 · GM-1 → 주문(O-1)
    const checkout = await audience.queryClient.fetchQuery(checkoutQuery(EVENT, 501));
    const me = (await audience.queryClient.fetchQuery(meQuery()))!;
    const co = renderHook(
      () => useCheckout({ eventId: EVENT, checkout, depositorName: me.name, quantity: 2 }),
      { wrapper: audience.wrapper },
    );
    act(() => {
      co.result.current.form.setValue('options.same', [
        { optionId: 701, answer: 'NO' },
        { optionId: 702, answer: '보컬' },
      ]);
      co.result.current.form.setValue('agreeRefundPolicy', true);
    });
    await act(() => co.result.current.submit());
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const href = String(router.replace.mock.calls[0]![0]);
    const orderUuid = /\/orders\/([^?]+)\?created=1$/.exec(href)![1]!;
    expect(audience.queryClient.getQueryData(myOrderQuery(orderUuid).queryKey)).toMatchObject({
      status: 'PENDING_APPROVE',
    });

    // 3) 호스트 — 예매자 관리 주문 목록(승인 대기) → 상세 → 승인
    const host = wrapper();
    const onMissing = vi.fn();
    const h = renderHook(
      () => ({
        list: useOrderList(String(EVENT)),
        detail: useOrderDetail(String(EVENT), orderUuid, { onMissing }),
      }),
      { wrapper: host.wrapper },
    );
    await waitFor(() => expect(h.result.current?.detail.detail).toBeTruthy());
    expect(h.result.current.list.rows[0]).toMatchObject({
      orderUuid,
      status: 'PENDING_APPROVE',
      buyerName: me.name,
      depositorName: me.name,
      totalAmount: 30000,
    });
    let approved = false;
    await act(async () => {
      approved = await h.result.current.detail.approve();
    });
    expect(approved).toBe(true);
    expect(h.result.current.detail.detail?.issuedTickets).toHaveLength(2);
    const numbers = h.result.current.detail.detail!.issuedTickets.map((t) => t.issuedTicketNo);

    // 4) 관객 — 주문상세 APPROVED + 티켓탭에 그 주문 2장(+ 승인 공지 바)
    const order = await audience.queryClient.fetchQuery({
      ...myOrderQuery(orderUuid),
      staleTime: 0,
    });
    expect(order.status).toBe('APPROVED');
    expect(order.issuedTickets.map((t) => t.issuedTicketNo)).toEqual(numbers);
    const tab = renderHook(() => useTicketTab(), { wrapper: wrapper().wrapper });
    await waitFor(() => expect(tab.result.current?.groups).toBeTruthy());
    const group = tab.result.current.groups.find((g) => g.key === orderUuid);
    expect(group?.group.tickets.map((t) => [t.issuedTicketNo, t.state])).toEqual(
      numbers.map((n) => [n, 'APPROVED']),
    );
    await waitFor(() => expect(tab.result.current.notice).not.toBeNull());
    expect(onMissing).not.toHaveBeenCalled();
  });

  it('환불 요청 → 호스트 환불 완료 → 관객 주문상세의 환불 완료까지(승인 → 관객 취소 → PF-2)', async () => {
    const audience = wrapper();
    const checkout = await audience.queryClient.fetchQuery(checkoutQuery(EVENT, 504));
    const co = renderHook(
      () => useCheckout({ eventId: EVENT, checkout, depositorName: '두둥이', quantity: 1 }),
      { wrapper: audience.wrapper },
    );
    act(() => co.result.current.form.setValue('agreeRefundPolicy', true));
    await act(() => co.result.current.submit());
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const orderUuid = /\/orders\/([^?]+)\?/.exec(String(router.replace.mock.calls[0]![0]))![1]!;

    const host = wrapper();
    const h = renderHook(() => useOrderDetail(String(EVENT), orderUuid, { onMissing: vi.fn() }), {
      wrapper: host.wrapper,
    });
    await waitFor(() => expect(h.result.current?.detail).toBeTruthy());
    await act(async () => {
      await h.result.current.approve();
    });

    // 관객 취소(O-4) + 환불 계좌
    const { cancelMyOrderMutation } = await import('@/api/order/mutations');
    await cancelMyOrderMutation(orderUuid).mutationFn!(
      {
        refundAccount: {
          bankCode: '088',
          accountHolder: '두둥이',
          accountNumber: '110 222 333444',
        },
      },
      {} as never,
    );
    await act(async () => {
      await host.queryClient.invalidateQueries();
    });
    await waitFor(() => expect(h.result.current.detail?.order.refundStatus).toBe('REQUESTED'));
    expect(h.result.current.detail?.order.status).toBe('CANCELED');
    expect(h.result.current.detail?.refundAccount?.accountNumber).toBe('110222333444');
    await act(async () => {
      await h.result.current.completeRefund();
    });
    expect(h.result.current.detail?.order.refundStatus).toBe('COMPLETED');
    const order = await audience.queryClient.fetchQuery({
      ...myOrderQuery(orderUuid),
      staleTime: 0,
    });
    expect([order.status, order.refundStatus]).toEqual(['REFUNDED', 'COMPLETED']);
    expect(order.canEditRefundAccount).toBe(false);
  });
});
