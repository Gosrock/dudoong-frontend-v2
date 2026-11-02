import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { saveStoredEvent, setStoredStatus, storedEvent } from '../__mocks__/event-store';
import {
  addPendingOrders,
  GUEST_BUYERS,
  GUEST_ORDER,
  markBuyerWithdrawn,
  storedGuestOrder,
} from '../__mocks__/guest-store';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { hostingGuestHandlers } from '../__mocks__/hosting-guest.handlers';
import { server } from '../__mocks__/server';
import { setTicketSold, storedTicket } from '../__mocks__/ticket-store';
import { eventDashboardQuery } from '../dashboard/queries';
import { DashboardSchema } from '../dashboard/schema';
import { ApiError } from '../errors';
import { exportIssuedTicketsMutation } from '../issued-ticket/mutations';
import { hostIssuedTicketQuery, hostIssuedTicketsQuery } from '../issued-ticket/queries';
import type { HostIssuedTicketDetail, HostIssuedTicketList } from '../issued-ticket/schema';
import {
  approveOrderMutation,
  cancelHostOrderMutation,
  completeRefundMutation,
  exportOrdersMutation,
  refuseOrderMutation,
} from './mutations';
import {
  hostOrderQuery,
  type HostOrdersParams,
  hostOrdersQuery,
  normalizeHostOrdersParams,
  refundsQuery,
} from './queries';
import {
  type HostOrderDetail,
  type HostOrderList,
  type RefundElement,
  RefuseOrderRequestSchema,
} from './schema';

/**
 * P13a — GD-1 · GR-1~GR-6 · GF-1 · PF-2 · GI-1~GI-3 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다).
 * mock은 백엔드 `V2OrderManageController`·`V2IssuedTicketController`·`V2ReadOrdersUseCase`·`V2ChangeOrderUseCase`·
 * `V2OrderDomainService`·`OrderValidator`·`V2OperationMapper`(dev cb8d24e)의 검사 순서·코드를 따른다.
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
const orders = (params: HostOrdersParams = {}) =>
  get<HostOrderList>(hostOrdersQuery(EVENT, params));
const detail = (uuid: string, eventId = EVENT) =>
  get<HostOrderDetail>(hostOrderQuery(eventId, uuid));
const approve = (uuid: string) =>
  call(approveOrderMutation(EVENT), uuid) as Promise<HostOrderDetail>;
const refuse = (uuid: string, body: object) =>
  call(refuseOrderMutation(EVENT), {
    orderUuid: uuid,
    body: body as never,
  }) as Promise<HostOrderDetail>;
const cancel = (uuid: string, body?: object) =>
  call(cancelHostOrderMutation(EVENT), {
    orderUuid: uuid,
    body: body as never,
  }) as Promise<HostOrderDetail>;
const complete = (uuid: string) =>
  call(completeRefundMutation(EVENT), uuid) as Promise<HostOrderDetail>;
/** 공연 101을 시작 후(진행중, 아직 OPEN)로 */
const startEvent = () => saveStoredEvent({ ...storedEvent(EVENT)!, displayStatus: 'ONGOING' });

describe('GR-1 주문 목록', () => {
  it('최신 순 + 상태별 건수(전체에 주문 실패 포함), 상태 필터는 건수에 영향 없음', async () => {
    const all = await orders();
    expect(all.counts).toEqual({
      all: 9,
      pendingApprove: 2,
      approved: 2,
      refused: 2,
      canceled: 2,
      failed: 1,
    });
    expect(all.orders.content[0]!.orderUuid).toBe(GUEST_ORDER.failed);
    const pending = await orders({ status: 'PENDING_APPROVE' });
    expect(pending.counts).toEqual(all.counts);
    expect(pending.orders.content.map((o) => o.orderUuid)).toEqual([
      GUEST_ORDER.pendingToss,
      GUEST_ORDER.pendingTransfer,
    ]);
  });

  it('검색어는 건수에 반영된다 — 매니저는 연락처·입금자명 부분 일치', async () => {
    const byName = await orders({ keyword: '이서연' });
    expect(byName.counts.all).toBe(2);
    const byPhone = await orders({ searchType: 'PHONE', keyword: '2345' });
    expect(byPhone.orders.content.map((o) => o.buyerName)).toContain('김민수');
    const byDepositor = await orders({ searchType: 'DEPOSITOR_NAME', keyword: '엄마' });
    expect(byDepositor.orders.content.map((o) => o.orderUuid)).toEqual([GUEST_ORDER.pendingToss]);
  });

  it('일반 멤버: 연락처·입금자명은 가린 값, 그 검색은 완전 일치만(#846)', async () => {
    actAsRole(11, 'GUEST');
    const list = await orders({ status: 'PENDING_APPROVE' });
    expect(list.orders.content.map((o) => [o.buyerPhone, o.depositorName])).toEqual([
      ['010-****-7890', '이***마'],
      ['010-****-6789', '김*수'],
    ]);
    expect((await orders({ searchType: 'DEPOSITOR_NAME', keyword: '엄마' })).counts.all).toBe(0);
    expect((await orders({ searchType: 'DEPOSITOR_NAME', keyword: '이서연엄마' })).counts.all).toBe(
      1,
    );
    expect((await orders({ searchType: 'PHONE', keyword: '2345' })).counts.all).toBe(0);
    expect((await orders({ searchType: 'PHONE', keyword: '01023456789' })).counts.all).toBe(2);
    // 이름은 부분 일치 그대로
    expect((await orders({ keyword: '민수' })).counts.all).toBe(2);
  });

  it('파라미터 정규형: 기본값(ALL·NAME·0)과 빈 검색어는 보내지 않는다', () => {
    expect(
      normalizeHostOrdersParams({ status: 'ALL', searchType: 'PHONE', keyword: '  ' }),
    ).toEqual({});
    expect(
      normalizeHostOrdersParams({
        status: 'REFUSED',
        searchType: 'PHONE',
        keyword: ' 010 ',
        page: 2,
      }),
    ).toEqual({ status: 'REFUSED', keyword: '010', searchType: 'PHONE', page: 2 });
  });

  it('검색어 51자·크기 101은 400 BAD_REQUEST, 비멤버는 403 HOST_400_2', async () => {
    expect(await codeOf(orders({ keyword: 'a'.repeat(51) }))).toEqual([400, 'BAD_REQUEST']);
    expect(await codeOf(orders({ size: 101 }))).toEqual([400, 'BAD_REQUEST']);
    expect(await codeOf(get(hostOrdersQuery(102)))).toEqual([403, 'HOST_400_2']);
  });
});

describe('GR-2 주문 상세', () => {
  it('매니저: 원본 연락처·이메일·환불 계좌 / 일반 멤버: 가린 값 + 계좌 null', async () => {
    const d = await detail(GUEST_ORDER.hostCanceled);
    expect(d.order.buyerPhone).toBe(GUEST_BUYERS.sehun.phone);
    expect(d.buyerEmail).toBe('sehun@example.com');
    expect(d.refundAccount?.accountNumber).toBe('123456-78-901234');
    actAsRole(11, 'GUEST');
    const g = await detail(GUEST_ORDER.hostCanceled);
    expect([g.order.buyerPhone, g.buyerEmail, g.refundAccount]).toEqual([
      '010-****-2345',
      'se***@example.com',
      null,
    ]);
  });

  it('orderMethod(#888): 두둥 주문 APPROVAL, 선착순 무료 PAYMENT', async () => {
    expect((await detail(GUEST_ORDER.approved)).order.orderMethod).toBe('APPROVAL');
    expect((await detail(GUEST_ORDER.approvedFree)).order.orderMethod).toBe('PAYMENT');
  });

  it('승인 전에는 발급 티켓이 빈 배열, 다른 공연 주문 uuid는 404 Order_404_1', async () => {
    expect((await detail(GUEST_ORDER.pendingTransfer)).issuedTickets).toEqual([]);
    expect(await codeOf(detail('no-such-order'))).toEqual([404, 'Order_404_1']);
    expect(await codeOf(detail(GUEST_ORDER.pendingTransfer, 103))).toEqual([404, 'Order_404_1']);
  });
});

describe('PR-3 승인', () => {
  it('승인하면 APPROVED + 발급 티켓, 재고가 줄고 건수가 바뀐다', async () => {
    const before = storedTicket(501)!.quantity;
    const d = await approve(GUEST_ORDER.pendingTransfer);
    expect(d.order.status).toBe('APPROVED');
    expect(d.issuedTickets).toHaveLength(2);
    expect(storedTicket(501)!.quantity).toBe(before - 2);
    expect((await orders()).counts).toMatchObject({ pendingApprove: 1, approved: 3 });
  });

  it.each([
    ['승인 대기가 아님', () => {}, GUEST_ORDER.approved, 'Order_400_3'],
    [
      '공연 OPEN 아님(정산중)',
      () => setStoredStatus(EVENT, 'CALCULATING'),
      GUEST_ORDER.pendingTransfer,
      'Event_400_5',
    ],
    ['공연 시작 후', startEvent, GUEST_ORDER.pendingTransfer, 'Event_400_6'],
    ['재고 부족', () => setTicketSold(501, 99), GUEST_ORDER.pendingTransfer, 'Ticket_Item_400_1'],
    [
      '탈퇴한 주문자',
      () => markBuyerWithdrawn(GUEST_ORDER.pendingToss),
      GUEST_ORDER.pendingToss,
      'Order_400_14',
    ],
  ])('%s → %s, 주문은 그대로', async (_, arrange, uuid, code) => {
    arrange();
    const status = storedGuestOrder(uuid)!.status;
    expect(await codeOf(approve(uuid))).toEqual([400, code]);
    expect(storedGuestOrder(uuid)!.status).toBe(status);
  });

  it('1인 제한(4매) — 이 주문자의 유효 발급 수량 + 이번 수량이 넘으면 Ticket_Item_400_6, 주문은 승인 대기로 남는다', async () => {
    // 김민수: 2매 승인 → 1매씩 두 번 승인(4매) → 세 번째 1매는 5매라 막힌다
    await approve(GUEST_ORDER.pendingTransfer);
    addPendingOrders(EVENT, 3);
    expect(await codeOf(approve('guest-order-101-extra-1'))).toBeNull();
    expect(await codeOf(approve('guest-order-101-extra-2'))).toBeNull();
    expect(await codeOf(approve('guest-order-101-extra-3'))).toEqual([400, 'Ticket_Item_400_6']);
    expect(storedGuestOrder('guest-order-101-extra-3')!.status).toBe('PENDING_APPROVE');
  });

  it('검사 순서: 상태(Order_400_3)가 공연 시작(Event_400_6)보다 먼저', async () => {
    startEvent();
    expect(await codeOf(approve(GUEST_ORDER.approved))).toEqual([400, 'Order_400_3']);
  });

  it('일반 멤버는 403 HOST_400_1', async () => {
    actAsRole(11, 'GUEST');
    expect(await codeOf(approve(GUEST_ORDER.pendingTransfer))).toEqual([403, 'HOST_400_1']);
  });
});

describe('PR-4 거절 · PR-5 승인 후 취소 · PF-2 환불 완료', () => {
  it('거절: 종류 문구가 사유로, 유료면 환불 요청', async () => {
    const d = await refuse(GUEST_ORDER.pendingTransfer, { reasonType: 'AMOUNT_MISMATCH' });
    expect([
      d.order.status,
      d.order.refuseReasonType,
      d.order.refuseReason,
      d.order.refundStatus,
    ]).toEqual(['REFUSED', 'AMOUNT_MISMATCH', '결제 금액 오류', 'REQUESTED']);
  });

  it('거절 기타: 문구 trim, 비거나 100자 초과면(#921) Order_400_18 — 주문 조회(404)보다 먼저', async () => {
    const d = await refuse(GUEST_ORDER.pendingToss, {
      reasonType: 'ETC',
      reasonText: ' 중복 주문 ',
    });
    expect(d.order.refuseReason).toBe('중복 주문');
    expect(await codeOf(refuse('no-such', { reasonType: 'ETC', reasonText: ' ' }))).toEqual([
      400,
      'Order_400_18',
    ]);
    expect(
      await codeOf(
        refuse(GUEST_ORDER.pendingTransfer, { reasonType: 'ETC', reasonText: 'a'.repeat(101) }),
      ),
    ).toEqual([400, 'Order_400_18']);
    expect(await codeOf(refuse(GUEST_ORDER.pendingTransfer, {}))).toEqual([400, 'BAD_REQUEST']);
  });

  it('거절 본문 스키마: 기타일 때만 문구를 싣는다', () => {
    expect(RefuseOrderRequestSchema.safeParse({ reasonType: 'SOLD_OUT' }).success).toBe(true);
    expect(RefuseOrderRequestSchema.safeParse({ reasonType: 'ETC' }).success).toBe(false);
    expect(
      RefuseOrderRequestSchema.safeParse({ reasonType: 'SOLD_OUT', reasonText: 'x' }).success,
    ).toBe(false);
  });

  it('시작 후 거절·취소는 Order_400_9(상태 검사보다 먼저), 승인 완료가 아니면 취소는 Order_400_5', async () => {
    expect(await codeOf(cancel(GUEST_ORDER.pendingTransfer))).toEqual([400, 'Order_400_5']);
    expect(await codeOf(refuse(GUEST_ORDER.approved, { reasonType: 'SOLD_OUT' }))).toEqual([
      400,
      'Order_400_5',
    ]);
    startEvent();
    expect(await codeOf(cancel(GUEST_ORDER.pendingTransfer))).toEqual([400, 'Order_400_9']);
    expect(await codeOf(refuse(GUEST_ORDER.pendingTransfer, { reasonType: 'SOLD_OUT' }))).toEqual([
      400,
      'Order_400_9',
    ]);
  });

  it('승인 후 취소: 발급 티켓 취소 + 재고 복구 + 유료면 환불 요청 → 환불 탭에 REQUESTED, 사유 101자는 400', async () => {
    expect(await codeOf(cancel(GUEST_ORDER.approved, { reason: 'a'.repeat(101) }))).toEqual([
      400,
      'BAD_REQUEST',
    ]);
    const before = storedTicket(501)!.quantity;
    const d = await cancel(GUEST_ORDER.approved, { reason: '공연 일정 변경' });
    expect(d.order.status).toBe('CANCELED');
    expect(d.order.cancelReason).toBe('공연 일정 변경');
    expect(d.issuedTickets.every((t) => t.entrance === 'CANCELED')).toBe(true);
    expect(storedTicket(501)!.quantity).toBe(before + 2);
    const refunds = await get<{ content: RefundElement[] }>(
      refundsQuery(EVENT, { status: 'REQUESTED' }),
    );
    expect(refunds.content.map((r) => r.orderUuid)).toContain(GUEST_ORDER.approved);
  });

  it('무료 주문 취소는 환불 요청이 없다(0원 — 환불 탭에 나오지 않는다)', async () => {
    const d = await cancel(GUEST_ORDER.approvedFree);
    expect(d.order.refundStatus).toBe('NONE');
  });

  it('환불 완료: REQUESTED만, 이미 완료면 그대로 200, NONE은 Order_400_17', async () => {
    const d = await complete(GUEST_ORDER.hostCanceled);
    expect(d.order.refundStatus).toBe('COMPLETED');
    expect((await complete(GUEST_ORDER.hostCanceled)).order.refundStatus).toBe('COMPLETED');
    expect(await codeOf(complete(GUEST_ORDER.pendingTransfer))).toEqual([400, 'Order_400_17']);
  });
});

describe('GF-1 환불 목록', () => {
  it('환불 상태가 NONE이 아닌 주문만, 상태 필터, 계좌는 매니저 이상에게만', async () => {
    const all = await get<{ content: RefundElement[] }>(refundsQuery(EVENT));
    expect(all.content.map((r) => [r.orderUuid, r.refundStatus])).toEqual([
      [GUEST_ORDER.userRefunded, 'REQUESTED'],
      [GUEST_ORDER.hostCanceled, 'REQUESTED'],
      [GUEST_ORDER.refusedEtc, 'COMPLETED'],
      [GUEST_ORDER.refusedDeposit, 'REQUESTED'],
    ]);
    expect(all.content[0]!.refundAccount?.accountNumber).toBe('110-987-654321');
    actAsRole(11, 'GUEST');
    const g = await get<{ content: RefundElement[] }>(refundsQuery(EVENT, { status: 'COMPLETED' }));
    expect(g.content.map((r) => r.refundAccount)).toEqual([null]);
  });
});

describe('GI-1 · GI-2 발급 티켓', () => {
  const tickets = (p = {}) => get<HostIssuedTicketList>(hostIssuedTicketsQuery(EVENT, p));

  it('취소 티켓 제외 + 입장 건수(검색어 반영, 입장 필터 무시), 검색은 현재 소유자 기준', async () => {
    const all = await tickets();
    expect(all.counts).toEqual({
      issuedCount: 3,
      enteredCount: 1,
      notEnteredCount: 2,
      entranceRate: 33.3,
    });
    const done = await tickets({ entrance: 'DONE' });
    expect(done.counts).toEqual(all.counts);
    expect(done.tickets.content).toHaveLength(1);
    // 선물 받은 최유진으로 찾히고, 주문자(박지훈)는 그 티켓의 buyerName
    const owner = await tickets({ keyword: '최유진' });
    expect(owner.tickets.content.map((t) => [t.buyerName, t.ownerName, t.giftState])).toEqual([
      ['박지훈', '최유진', 'ACCEPTED'],
    ]);
  });

  it('상세: 매니저는 원본, 일반 멤버는 가린 연락처 / 다른 공연 티켓은 404 IssuedTicket_404_1', async () => {
    const uuid = `${GUEST_ORDER.approved}-t2`;
    const d = await get<HostIssuedTicketDetail>(hostIssuedTicketQuery(EVENT, uuid));
    expect([d.buyerPhone, d.ownerPhone]).toEqual(['010-4567-8901', '010-5678-9012']);
    actAsRole(11, 'GUEST');
    const g = await get<HostIssuedTicketDetail>(hostIssuedTicketQuery(EVENT, uuid));
    expect([g.buyerPhone, g.ownerPhone]).toEqual(['010-****-8901', '010-****-9012']);
    expect(await codeOf(get(hostIssuedTicketQuery(103, uuid)))).toEqual([
      404,
      'IssuedTicket_404_1',
    ]);
  });
});

describe('GR-6 · GI-3 엑셀', () => {
  it('매니저: 래퍼 없는 xlsx + 파일 이름 / 일반 멤버 403 HOST_400_1 / 1만 행 초과', async () => {
    const file = (await call(exportOrdersMutation(EVENT), { status: 'APPROVED' })) as {
      blob: Blob;
      filename: string;
    };
    expect(file.filename).toBe('orders-101.xlsx');
    expect(file.blob.size).toBeGreaterThan(0);
    const t = (await call(exportIssuedTicketsMutation(EVENT), {})) as { filename: string };
    expect(t.filename).toBe('issued-tickets-101.xlsx');
    server.use(...hostingGuestHandlers.exportTooMany);
    expect(await codeOf(call(exportOrdersMutation(EVENT), {}))).toEqual([400, 'Order_400_19']);
    expect(await codeOf(call(exportIssuedTicketsMutation(EVENT), {}))).toEqual([
      400,
      'IssuedTicket_400_7',
    ]);
  });

  it('일반 멤버는 엑셀 403 HOST_400_1', async () => {
    actAsRole(11, 'GUEST');
    expect(await codeOf(call(exportOrdersMutation(EVENT), {}))).toEqual([403, 'HOST_400_1']);
  });
});

describe('GD-1 대시보드', () => {
  it('건수·판매금액·입장 현황(분모 = 발급 수) + openedAt', async () => {
    const d = DashboardSchema.parse(await get(eventDashboardQuery(EVENT)));
    expect(d.orders).toEqual({ pendingApprove: 2, approved: 2, refused: 2, refundRequested: 3 });
    expect(d.salesAmount).toBe(30000);
    expect(d.entranceStats).toMatchObject({ issuedCount: 3, enteredCount: 1 });
    expect(d.tickets.items.map((i) => [i.ticketItemId, i.soldCount, i.supplyCount])).toEqual([
      [501, 58, 100],
      [502, 50, 50],
      [503, 0, null],
    ]);
    expect(d.tickets.totalSupplyCount).toBeNull();
    expect(d.openedAt).toBeNull();
  });

  it('발급 0인 공연은 입장 현황 0/0(입장률 0)', async () => {
    const d = await get<{ entranceStats: object; orders: object }>(eventDashboardQuery(103));
    expect(d.entranceStats).toEqual({
      issuedCount: 0,
      enteredCount: 0,
      notEnteredCount: 0,
      entranceRate: 0,
    });
  });
});
