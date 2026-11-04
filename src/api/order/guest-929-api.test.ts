import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { setStoredStatus } from '../__mocks__/event-store';
import { GUEST_ORDER, storedGuestOrder } from '../__mocks__/guest-store';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { setBulkNotProcessedOnce } from '../__mocks__/hosting-guest.handlers';
import { ApiError } from '../errors';
import { cancelEntranceMutation } from '../issued-ticket/mutations';
import { hostIssuedTicketsQuery } from '../issued-ticket/queries';
import type { HostIssuedTicketDetail, HostIssuedTicketList } from '../issued-ticket/schema';
import {
  bulkApproveOrdersMutation,
  bulkRefuseOrdersMutation,
  exportRefundsMutation,
  refuseOrderMutation,
} from './mutations';
import { hostOrderQuery, hostOrdersQuery, refundCountsQuery, refundsQuery } from './queries';
import type {
  BulkOrderResultResponse,
  HostOrderDetail,
  HostOrderList,
  RefundCounts,
  RefundElement,
  RefuseOrderRequest,
} from './schema';

/**
 * 백엔드 #929(2.5.7 — B34~B37) 반영: 일괄 승인·거절(R-7 · R-8) · GR-2 `giftState` · `canceledBy` · 입금 미확인 거절 · 검색 기준
 * (`ORDER_NO` · `TICKET_NO` · `DEPOSITOR_NAME`) · 환불 검색 · 건수(GF-1b) · 엑셀(GF-3) · 입장 취소(Q-3). 정의 + mock + 스키마.
 */

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
  setBulkNotProcessedOnce(null);
});

const call = <V>(m: { mutationFn?: (v: V, c: never) => Promise<unknown> }, v: V) =>
  m.mutationFn!(v, {} as never);
const get = <T>(q: { queryFn?: unknown }) =>
  (q.queryFn as (c: { signal: AbortSignal }) => Promise<T>)({
    signal: new AbortController().signal,
  });
const codeOf = (p: Promise<unknown>): Promise<[number, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code];
      throw e;
    },
  );

const EVENT = 101;
const bulkApprove = (orderUuids: string[]) =>
  call(bulkApproveOrdersMutation(EVENT), { orderUuids }) as Promise<BulkOrderResultResponse>;
const bulkRefuse = (orderUuids: string[], body: object) =>
  call(bulkRefuseOrdersMutation(EVENT), {
    orderUuids,
    ...(body as RefuseOrderRequest),
  }) as Promise<BulkOrderResultResponse>;

describe('R-7 · R-8 일괄 승인 · 거절', () => {
  it('주문마다 결과(요청 순서, 중복은 한 번) — 실패는 단건 코드 · 문구', async () => {
    const r = await bulkApprove([
      GUEST_ORDER.pendingTransfer,
      GUEST_ORDER.approved,
      GUEST_ORDER.pendingTransfer,
    ]);
    expect(r.succeeded).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.results.map((x) => [x.orderUuid, x.success, x.errorCode])).toEqual([
      [GUEST_ORDER.pendingTransfer, true, null],
      [GUEST_ORDER.approved, false, 'Order_400_3'],
    ]);
    expect(r.results[1]!.reason).toBeTruthy();
    expect(storedGuestOrder(GUEST_ORDER.pendingTransfer)!.status).toBe('APPROVED');
  });

  it('본문 검증: 0건 · 51건은 400, 일반 멤버 403, 거절 사유가 틀리면 전체 Order_400_18(아무것도 바꾸지 않음)', async () => {
    expect(await codeOf(bulkApprove([]))).toEqual([400, 'BAD_REQUEST']);
    const many = Array.from({ length: 51 }, (_, i) => `x-${i}`);
    expect(await codeOf(bulkApprove(many))).toEqual([400, 'BAD_REQUEST']);
    expect(
      await codeOf(
        bulkRefuse([GUEST_ORDER.pendingTransfer], { reasonType: 'ETC', reasonText: ' ' }),
      ),
    ).toEqual([400, 'Order_400_18']);
    expect(storedGuestOrder(GUEST_ORDER.pendingTransfer)!.status).toBe('PENDING_APPROVE');
    actAsRole(11, 'GUEST');
    expect(await codeOf(bulkApprove([GUEST_ORDER.pendingTransfer]))).toEqual([403, 'HOST_400_1']);
  });

  it('시간 상한을 넘은 주문은 ORDER_BULK_NOT_PROCESSED(처리하지 않음)', async () => {
    setBulkNotProcessedOnce(1);
    const r = await bulkApprove([GUEST_ORDER.pendingTransfer, GUEST_ORDER.pendingToss]);
    expect([r.succeeded, r.failed, r.notProcessed]).toEqual([1, 0, 1]);
    expect(r.results[1]!.errorCode).toBe('ORDER_BULK_NOT_PROCESSED');
    expect(storedGuestOrder(GUEST_ORDER.pendingToss)!.status).toBe('PENDING_APPROVE');
  });

  it('입금 미확인 거절은 결제 금액이 있어도 환불 요청이 없다(B35), 다른 사유는 환불 요청', async () => {
    const r = await bulkRefuse([GUEST_ORDER.pendingTransfer], {
      reasonType: 'DEPOSIT_UNCONFIRMED',
    });
    expect(r.succeeded).toBe(1);
    expect(storedGuestOrder(GUEST_ORDER.pendingTransfer)!.refundStatus).toBe('NONE');
    const d = (await call(refuseOrderMutation(EVENT), {
      orderUuid: GUEST_ORDER.pendingToss,
      body: { reasonType: 'SOLD_OUT' },
    })) as HostOrderDetail;
    expect(d.order.refundStatus).toBe('REQUESTED');
    expect(d.canceledBy).toBe('HOST');
  });
});

describe('GR-2 선물 상태 · 취소한 사람', () => {
  it('발급 티켓마다 giftState, 취소 주체(예매자 BUYER · 호스트 HOST · 그 밖 null)', async () => {
    const approved = await get<HostOrderDetail>(hostOrderQuery(EVENT, GUEST_ORDER.approved));
    expect(approved.issuedTickets.map((t) => [t.entrance, t.giftState])).toEqual([
      ['DONE', 'NONE'],
      ['BEFORE', 'ACCEPTED'],
    ]);
    expect(approved.canceledBy).toBeNull();
    const user = await get<HostOrderDetail>(hostOrderQuery(EVENT, GUEST_ORDER.userRefunded));
    expect(user.canceledBy).toBe('BUYER');
    const host = await get<HostOrderDetail>(hostOrderQuery(EVENT, GUEST_ORDER.hostCanceled));
    expect(host.canceledBy).toBe('HOST');
  });
});

describe('검색 기준(B36)', () => {
  it('주문: ORDER_NO 대소문자 무시 부분 일치 — 일반 멤버도 부분 일치', async () => {
    const no = storedGuestOrder(GUEST_ORDER.approved)!.orderNo;
    const r = await get<HostOrderList>(
      hostOrdersQuery(EVENT, { searchType: 'ORDER_NO', keyword: no.toLowerCase() }),
    );
    expect(r.orders.content.map((o) => o.orderUuid)).toEqual([GUEST_ORDER.approved]);
    actAsRole(11, 'GUEST');
    const g = await get<HostOrderList>(
      hostOrdersQuery(EVENT, { searchType: 'ORDER_NO', keyword: no.slice(1) }),
    );
    expect(g.orders.content).toHaveLength(1);
  });

  it('발급 티켓: TICKET_NO(숫자만) · ORDER_NO · DEPOSITOR_NAME(일반 멤버는 완전 일치)', async () => {
    const tickets = (p: object) => get<HostIssuedTicketList>(hostIssuedTicketsQuery(EVENT, p));
    const t = storedGuestOrder(GUEST_ORDER.approved)!.issuedTickets[0]!;
    const byNo = await tickets({ searchType: 'TICKET_NO', keyword: t.issuedTicketNo.slice(1) });
    expect(byNo.tickets.content.map((x) => x.ticketUuid)).toEqual([t.ticketUuid]);
    const order = storedGuestOrder(GUEST_ORDER.approved)!;
    const byOrder = await tickets({ searchType: 'ORDER_NO', keyword: order.orderNo });
    expect(byOrder.tickets.content).toHaveLength(2);
    const byDepositor = await tickets({ searchType: 'DEPOSITOR_NAME', keyword: '박지' });
    expect(byDepositor.tickets.content).toHaveLength(2);
    actAsRole(11, 'GUEST');
    expect(
      (await tickets({ searchType: 'DEPOSITOR_NAME', keyword: '박지' })).tickets.content,
    ).toHaveLength(0);
    expect(
      (await tickets({ searchType: 'DEPOSITOR_NAME', keyword: '박지훈' })).tickets.content,
    ).toHaveLength(2);
  });
});

describe('환불 탭 — GF-1 검색 · orderedAt · GF-1b 건수 · GF-3 엑셀', () => {
  it('검색은 목록과 건수에 같이, 건수는 상태 필터 무시', async () => {
    const all = await get<RefundCounts>(refundCountsQuery(EVENT));
    expect(all).toEqual({ all: 4, requested: 3, completed: 1 });
    const page = await get<{ content: RefundElement[] }>(
      refundsQuery(EVENT, { searchType: 'NAME', keyword: '오세훈' }),
    );
    expect(page.content.map((r) => r.orderUuid)).toEqual([GUEST_ORDER.hostCanceled]);
    expect(page.content[0]!.orderedAt).toBeTruthy();
    expect(
      await get<RefundCounts>(refundCountsQuery(EVENT, { searchType: 'NAME', keyword: '오세훈' })),
    ).toEqual({ all: 1, requested: 1, completed: 0 });
  });

  it('엑셀: 매니저 xlsx, 일반 멤버 403', async () => {
    const file = (await call(exportRefundsMutation(EVENT), { status: 'REQUESTED' })) as {
      filename: string | null;
    };
    expect(file.filename).toBe('refunds-101.xlsx');
    actAsRole(11, 'GUEST');
    expect(await codeOf(call(exportRefundsMutation(EVENT), {}))).toEqual([403, 'HOST_400_1']);
  });
});

describe('Q-3 입장 취소', () => {
  const entered = `${GUEST_ORDER.approved}-t1`;
  const cancelEntrance = (uuid: string) =>
    call(cancelEntranceMutation(EVENT), uuid) as Promise<HostIssuedTicketDetail>;

  it('입장 완료 → 입장 전 + 입장 시각 비움, 다시 부르면 IssuedTicket_400_9', async () => {
    const d = await cancelEntrance(entered);
    expect([d.ticket.entrance, d.ticket.enteredAt]).toEqual(['BEFORE', null]);
    expect(await codeOf(cancelEntrance(entered))).toEqual([400, 'IssuedTicket_400_9']);
    const list = await get<HostIssuedTicketList>(hostIssuedTicketsQuery(EVENT));
    expect(list.counts.enteredCount).toBe(0);
  });

  it('취소 티켓 IssuedTicket_400_3 · 없는 티켓 404 · 일반 멤버 403 · 준비중·지난 공연 Event_400_27', async () => {
    expect(await codeOf(cancelEntrance(`${GUEST_ORDER.hostCanceled}-t1`))).toEqual([
      400,
      'IssuedTicket_400_3',
    ]);
    expect(await codeOf(cancelEntrance('nope'))).toEqual([404, 'IssuedTicket_404_1']);
    actAsRole(11, 'GUEST');
    expect(await codeOf(cancelEntrance(entered))).toEqual([403, 'HOST_400_1']);
    actAsRole(11, 'MANAGER');
    setStoredStatus(EVENT, 'CLOSED');
    expect(await codeOf(cancelEntrance(entered))).toEqual([400, 'Event_400_27']);
  });
});
