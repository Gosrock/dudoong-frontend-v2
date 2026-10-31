import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveStoredEvent, storedEvent } from '@/api/__mocks__/event-store';
import {
  GUEST_ORDER,
  markBuyerWithdrawn,
  patchGuestOrder,
  storedGuestOrder,
} from '@/api/__mocks__/guest-store';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingGuestHandlers } from '@/api/__mocks__/hosting-guest.handlers';
import { server } from '@/api/__mocks__/server';
import { setTicketSold } from '@/api/__mocks__/ticket-store';
import { shouldToastMutationError } from '@/api/query-client';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import {
  APPROVE_ERROR_MESSAGE,
  DETAIL_MISSING_MESSAGE,
  ORDER_ACTION_BLOCK_MESSAGE,
  REFUSE_CONFIRM,
  REFUSE_ERRORS,
  WITHDRAW_ERROR_MESSAGE,
} from './guest-rules';
import { useOrderDetail } from './useOrderDetail';
import { useOrderList } from './useOrderList';
import { useRefundList } from './useRefundList';

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

const EVENT = '101';

/** 주문 탭 + 상세 + 환불 탭을 한 화면처럼 같이 띄운다(같은 QueryClient) */
function setup(orderUuid: string | null) {
  const queryClient = createTestQueryClient();
  const onMissing = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  const hook = renderHook(
    ({ uuid }) => ({
      list: useOrderList(EVENT),
      detail: useOrderDetail(EVENT, uuid, { onMissing }),
      refunds: useRefundList(EVENT),
    }),
    { wrapper, initialProps: { uuid: orderUuid } },
  );
  return { ...hook, queryClient, onMissing };
}
type Result = ReturnType<typeof setup>['result'];
const loaded = (result: Result) =>
  waitFor(() => {
    expect(result.current?.detail.detail).not.toBeNull();
    expect(result.current.list.status).toBe('success');
  });
const actionKeys = (result: Result) =>
  result.current.detail.actions.map((a) => `${a.key}:${a.enabled ? 'on' : 'off'}`);
const lastMutationToasts = (queryClient: ReturnType<typeof createTestQueryClient>) => {
  const m = queryClient.getMutationCache().getAll().at(-1)!;
  return shouldToastMutationError(m.state.error, m.options.meta);
};
const startEvent = () =>
  saveStoredEvent({ ...storedEvent(Number(EVENT))!, displayStatus: 'ONGOING' });

describe('주문 상세(GR-2) · 승인(PR-3)', () => {
  it('승인 → 상세가 APPROVED + 발급 티켓, 상태 탭 counts가 갱신된다(승인 대기 2 → 1)', async () => {
    const { result } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    expect(actionKeys(result)).toEqual(['approve:on', 'refuse:on']);
    expect(result.current.list.statusTabs.map((t) => [t.key, t.count])).toEqual([
      ['ALL', 9],
      ['PENDING_APPROVE', 2],
      ['APPROVED', 2],
      ['REFUSED', 2],
      ['CANCELED', 2],
    ]);
    const sent = recordRequests();
    let ok = false;
    await act(async () => {
      ok = await result.current.detail.approve();
    });
    expect(ok).toBe(true);
    expect((await sent.lines())[0]).toBe(
      `POST /api/v2/events/101/orders/${GUEST_ORDER.pendingTransfer}/approve`,
    );
    expect(result.current.detail.detail?.order.status).toBe('APPROVED');
    expect(result.current.detail.detail?.issuedTickets).toHaveLength(2);
    await waitFor(() =>
      expect(result.current.list.statusTabs.find((t) => t.key === 'PENDING_APPROVE')?.count).toBe(
        1,
      ),
    );
    expect(result.current.list.statusTabs.find((t) => t.key === 'APPROVED')?.count).toBe(3);
    expect(actionKeys(result)).toEqual(['cancel:on']);
  });

  it.each([
    ['재고 부족', () => setTicketSold(501, 99), GUEST_ORDER.pendingTransfer, 'Ticket_Item_400_1'],
    [
      '탈퇴한 주문자',
      () => markBuyerWithdrawn(GUEST_ORDER.pendingToss),
      GUEST_ORDER.pendingToss,
      'Order_400_14',
    ],
  ] as const)(
    '승인 실패(%s) → 안내 후 주문은 승인 대기로 남고 거절할 수 있다(전역 토스트 없음)',
    async (_, arrange, uuid, code) => {
      arrange();
      const { result, queryClient } = setup(uuid);
      await loaded(result);
      let ok = true;
      await act(async () => {
        ok = await result.current.detail.approve();
      });
      expect(ok).toBe(false);
      expect(result.current.detail.actionError).toBe(APPROVE_ERROR_MESSAGE[code]);
      expect(result.current.detail.detail?.order.status).toBe('PENDING_APPROVE');
      expect(storedGuestOrder(uuid)!.status).toBe('PENDING_APPROVE');
      expect(actionKeys(result)).toEqual(['approve:on', 'refuse:on']);
      expect(lastMutationToasts(queryClient)).toBe(false);
    },
  );

  it('공연 시작 후에는 승인·거절 비활성 + 안내 — 누르면 요청하지 않는다', async () => {
    startEvent();
    const { result } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    expect(actionKeys(result)).toEqual(['approve:off', 'refuse:off']);
    expect(result.current.detail.blockedMessage).toBe(ORDER_ACTION_BLOCK_MESSAGE.started);
    const sent = recordRequests();
    await act(async () => {
      await result.current.detail.approve();
    });
    expect(await sent.lines()).toEqual([]);
  });

  it('화면을 연 뒤 공연이 시작됨 — 승인 Event_400_6 → GR-2·GE-3 다시 읽기 → 버튼 비활성', async () => {
    const { result, queryClient } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    startEvent();
    const sent = recordRequests();
    await act(async () => {
      await result.current.detail.approve();
    });
    expect(result.current.detail.actionError).toBe(APPROVE_ERROR_MESSAGE.Event_400_6);
    await waitFor(() => expect(actionKeys(result)).toEqual(['approve:off', 'refuse:off']));
    const lines = await sent.lines();
    expect(lines).toContain(`GET /api/v2/events/101/orders/${GUEST_ORDER.pendingTransfer}`);
    expect(lines).toContain('GET /api/v2/events/101/manage');
    expect(lastMutationToasts(queryClient)).toBe(false);
  });

  it('운영자가 먼저 승인함(#828) — Order_400_3 → 다시 읽어 승인 완료로', async () => {
    const { result } = setup(GUEST_ORDER.pendingToss);
    await loaded(result);
    patchGuestOrder(GUEST_ORDER.pendingToss, {
      status: 'APPROVED',
      approvedAt: '2026.10.20 10:00',
    });
    await act(async () => {
      await result.current.detail.approve();
    });
    expect(result.current.detail.actionError).toBe(APPROVE_ERROR_MESSAGE.Order_400_3);
    await waitFor(() => expect(result.current.detail.detail?.order.status).toBe('APPROVED'));
  });
});

describe('거절(PR-4) · 승인 후 취소(PR-5) · 환불 완료(PF-2)', () => {
  it('거절: 사유를 고르지 않으면 요청하지 않고 칸 오류, 기타는 문구 필수 → 보낸 본문', async () => {
    const { result, queryClient } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    const sent = recordRequests();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.detail.refuse();
    });
    expect(result.current.detail.refuseForm.errors.reasonType).toBe(REFUSE_ERRORS.reasonType);
    act(() => result.current.detail.refuseForm.setReasonType('ETC'));
    await act(async () => {
      await result.current.detail.refuse();
    });
    expect(result.current.detail.refuseForm.errors.reasonText).toBe(REFUSE_ERRORS.reasonText);
    expect(await sent.list()).toEqual([]);
    act(() => result.current.detail.refuseForm.setReasonText(' 중복 주문 '));
    let ok = false;
    await act(async () => {
      ok = await result.current.detail.refuse();
    });
    expect(ok).toBe(true);
    expect((await sent.list()).find((r) => r.method === 'POST')?.body).toEqual({
      reasonType: 'ETC',
      reasonText: '중복 주문',
    });
    expect(result.current.detail.detail?.order).toMatchObject({
      status: 'REFUSED',
      refundStatus: 'REQUESTED',
    });
    // 거절도 승인 대기 수량이 빠져 잔여가 바뀐다 — T-1·GP-5 무효화(계약 대조 2026-10-31)
    expect(spy).toHaveBeenCalledWith({
      queryKey: ticketItemsManageQuery(EVENT).queryKey,
      exact: true,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: eventTicketItemsQuery(EVENT).queryKey,
      exact: true,
    });
  });

  it('두둥 주문이면 거절 확인에 직접 환불 안내(legal-copy C-3), 무료 주문은 없다', async () => {
    const { result, rerender } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    expect(result.current.detail.refuseConfirm.dudoongNotice).toBe(REFUSE_CONFIRM.dudoongNotice);
    rerender({ uuid: GUEST_ORDER.approvedFree });
    await waitFor(() => expect(result.current.detail.detail?.order.paymentChannel).toBe('FREE'));
    expect(result.current.detail.cancelConfirm.dudoongNotice).toBeNull();
  });

  it('시작 후 거절·취소에 Order_400_9가 오면 GR-2 다시 읽기(경합)', async () => {
    const { result, queryClient } = setup(GUEST_ORDER.approved);
    await loaded(result);
    startEvent();
    const sent = recordRequests();
    await act(async () => {
      await result.current.detail.cancel();
    });
    expect(result.current.detail.actionError).toBe(WITHDRAW_ERROR_MESSAGE.Order_400_9);
    await waitFor(() => expect(actionKeys(result)).toEqual(['cancel:off']));
    expect(await sent.lines()).toContain(`GET /api/v2/events/101/orders/${GUEST_ORDER.approved}`);
    expect(lastMutationToasts(queryClient)).toBe(false);
  });

  it('승인 후 취소(사유 선택) → 발급 티켓 취소, 유료면 환불 탭에 REQUESTED로 나타난다', async () => {
    const { result } = setup(GUEST_ORDER.approved);
    await loaded(result);
    await waitFor(() => expect(result.current.refunds.status).toBe('success'));
    expect(result.current.refunds.rows.map((r) => r.refund.orderUuid)).not.toContain(
      GUEST_ORDER.approved,
    );
    act(() => result.current.detail.setCancelReason(' 공연 일정 변경 '));
    const sent = recordRequests();
    await act(async () => {
      await result.current.detail.cancel();
    });
    expect((await sent.list()).find((r) => r.method === 'POST')?.body).toEqual({
      reason: '공연 일정 변경',
    });
    expect(result.current.detail.detail?.issuedTickets.map((t) => t.entrance)).toEqual([
      'CANCELED',
      'CANCELED',
    ]);
    await waitFor(() =>
      expect(
        result.current.refunds.rows.find((r) => r.refund.orderUuid === GUEST_ORDER.approved)?.refund
          .refundStatus,
      ).toBe('REQUESTED'),
    );
  });

  it('취소 사유를 비우면 본문 없이, 100자를 넘으면 요청하지 않는다', async () => {
    const { result } = setup(GUEST_ORDER.approvedFree);
    await loaded(result);
    act(() => result.current.detail.setCancelReason('a'.repeat(101)));
    expect(result.current.detail.cancelReasonError).not.toBeNull();
    const sent = recordRequests();
    await act(async () => {
      await result.current.detail.cancel();
    });
    expect(await sent.list()).toEqual([]);
    act(() => result.current.detail.setCancelReason('  '));
    await act(async () => {
      await result.current.detail.cancel();
    });
    expect((await sent.list())[0]).toMatchObject({ method: 'POST', body: undefined });
  });

  it('환불 완료 — REQUESTED일 때만 버튼, 누르면 COMPLETED', async () => {
    const { result } = setup(GUEST_ORDER.hostCanceled);
    await loaded(result);
    expect(actionKeys(result)).toEqual(['completeRefund:on']);
    await act(async () => {
      await result.current.detail.completeRefund();
    });
    expect(result.current.detail.detail?.order.refundStatus).toBe('COMPLETED');
    expect(actionKeys(result)).toEqual([]);
  });
});

describe('404 · 권한', () => {
  it('없는·다른 공연 주문(?order=)은 공용 404가 아니라 닫고 목록을 다시 읽는다', async () => {
    const { result, onMissing } = setup('no-such-order');
    await waitFor(() => expect(onMissing).toHaveBeenCalledTimes(1));
    expect(result.current.detail.missingNotice).toBe(DETAIL_MISSING_MESSAGE);
    expect(result.current.detail.status).toBe('missing');
  });

  it('일반 멤버: 처리 버튼 없음, 가린 연락처 그대로, 환불 계좌 없음', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup(GUEST_ORDER.userRefunded);
    await loaded(result);
    expect(result.current.detail.actions).toEqual([]);
    expect(result.current.detail.canSeeRefundAccount).toBe(false);
    expect(result.current.detail.detail?.refundAccount).toBeNull();
    expect(result.current.detail.detail?.order.buyerPhone).toBe('010-****-3456');
  });

  it('매니저는 환불 계좌(updatedAt 포함)를 본다', async () => {
    const { result } = setup(GUEST_ORDER.userRefunded);
    await loaded(result);
    expect(result.current.detail.canSeeRefundAccount).toBe(true);
    expect(result.current.detail.detail?.refundAccount).toMatchObject({
      accountNumber: '110-987-654321',
      updatedAt: '2026.10.21 09:30',
    });
  });

  it('처리(승인)가 404 Order_404_1이면 조회 404와 같이 닫고 목록 다시 읽기', async () => {
    const { result, onMissing } = setup(GUEST_ORDER.pendingTransfer);
    await loaded(result);
    server.use(...hostingGuestHandlers.approveFails('Order_404_1'));
    await act(async () => {
      await result.current.detail.approve();
    });
    expect(onMissing).toHaveBeenCalledTimes(1);
    expect(result.current.detail.missingNotice).toBe(DETAIL_MISSING_MESSAGE);
  });
});
