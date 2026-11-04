import { http, type HttpHandler, HttpResponse } from 'msw';

import { ENTRANCE_FILTERS, ISSUED_TICKET_SEARCH_TYPES } from '../issued-ticket/schema';
import {
  BULK_NOT_PROCESSED,
  BULK_ORDER_MAX,
  HOST_CANCEL_REASON_MAX,
  HOST_ORDER_STATUS_FILTERS,
  OPERATION_KEYWORD_MAX,
  OPERATION_PAGE_SIZE,
  OPERATION_PAGE_SIZE_MAX,
  ORDER_SEARCH_TYPES,
  REFUND_STATUS_FILTERS,
  REFUSE_REASON_TEXT_MAX,
  REFUSE_REASON_TYPES,
  type RefuseReasonType,
} from '../order/schema';
import type { HostRole } from '../shared/common-schema';
import {
  approveGuestOrder,
  cancelGuestOrder,
  type ChangeError,
  completeGuestRefund,
  countsOf,
  currentEntrance,
  dashboardOf,
  entranceStatsOf,
  findGuestTicket,
  guestOrdersOf,
  guestTicketsOf,
  matchesOrderSearch,
  matchesTicketSearch,
  REFUSE_REASON_LABELS,
  refuseGuestOrder,
  revertGuestTicketEntrance,
  storedGuestOrder,
  toIssuedTicket,
  toIssuedTicketDetail,
  toOrderDetail,
  toOrderElement,
  toRefundElement,
} from './guest-store';
import { guard, RANK } from './hosting-event.handlers';
import { errors, fail, ok, paginate, readPageParams } from './respond';

/**
 * 예매자 관리·등록 후 대시보드(P13a) — GD-1 · GR-1 · GR-2 · PR-3 · PR-4 · PR-5 · GR-6 · GF-1 · PF-2 · GI-1 · GI-2 · GI-3.
 * 저장소는 `guest-store.ts`. 기준: 백엔드 `V2OrderManageController`·`V2IssuedTicketController`·`V2ReadOrdersUseCase`·
 * `V2ChangeOrderUseCase`·`V2ReadIssuedTicketsUseCase`·`V2ReadDashboardUseCase`·`V2OrderDomainService`·`OrderValidator`
 * (dev cb8d24e — 432cce4 이후 이 API 변경 없음).
 *
 * 검사 순서: 로그인 → 경로 id → 파라미터·본문 검증(400 `BAD_REQUEST`) → `@HostRolesAllowed`(공연 404 · 비멤버 403 `HOST_400_2` ·
 * 매니저 미만 403 `HOST_400_1`) → 유스케이스. 조회는 일반 멤버 이상, 처리·엑셀은 매니저 이상.
 */

export const GUEST_ERROR_REASONS: Record<
  | ChangeError
  | 'Order_400_18'
  | 'Order_400_19'
  | 'IssuedTicket_404_1'
  | 'IssuedTicket_400_7'
  | 'IssuedTicket_400_3'
  | 'IssuedTicket_400_9'
  | 'Event_400_27',
  [number, string]
> = {
  Order_400_30: [400, '입장했거나 선물한 티켓이 있는 주문은 취소할 수 없습니다.'],
  IssuedTicket_400_3: [400, '티켓이 입장 취소 할 수 있는 상태가 아닙니다.'],
  IssuedTicket_400_9: [400, '입장 처리된 티켓이 아닙니다.'],
  Event_400_27: [400, '입장 처리를 할 수 없는 공연 상태입니다.'],
  Order_404_1: [404, '주문을 찾을 수 없습니다.'],
  Order_400_3: [400, '결제,승인 대기중인 주문이 아닙니다.'],
  Order_400_5: [400, '주문을 취소할 수 없는 상태입니다.'],
  Order_400_9: [400, '환불을 할 수 있는 기한을 지났습니다.'],
  Order_400_14: [400, '유저가 탈퇴를 했습니다.'],
  Order_400_17: [400, '환불 요청된 주문이 아닙니다.'],
  Order_400_18: [400, '거절 사유가 올바르지 않습니다.'],
  Order_400_19: [400, '엑셀로 내려받을 주문이 너무 많습니다. 필터로 줄여 주세요.'],
  Event_400_5: [400, '아직 오픈되지 않은 이벤트에는 접근할 수 없습니다.'],
  Event_400_6: [400, '이벤트 시작시간이 지나 티켓팅을 할 수 없습니다.'],
  Ticket_Item_400_1: [
    400,
    '티켓 상품 재고가 부족합니다. ( 승인 대기 또는 앞선 주문으로 인해, 재고가 있어도 주문이 불가할 수 있습니다.)',
  ],
  Ticket_Item_400_6: [400, '해당 티켓상품 최대 구매 가능 갯수를 넘었습니다.'],
  IssuedTicket_404_1: [404, '티켓을 찾을 수 없습니다.'],
  IssuedTicket_400_7: [400, '엑셀로 내려받을 티켓이 너무 많습니다. 필터로 줄여 주세요.'],
};
export type GuestErrorCode = keyof typeof GUEST_ERROR_REASONS;

export const guestError = (request: Request, code: GuestErrorCode) => {
  const [status, reason] = GUEST_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

/** 연락처·이메일·입금자명 원본과 환불 계좌를 볼 수 있는지(`HostPrivacyPolicy.isManagerOrAbove`) */
const managerOrAbove = (role: HostRole) => RANK[role] >= RANK.MANAGER;

const oneOf = <T extends string>(values: readonly T[], v: string | null, fallback: T) =>
  v === null ? fallback : (values as readonly string[]).includes(v) ? (v as T) : null;

/** 목록 공통 파라미터(enum 바인딩·페이지·검색어 50자). 틀리면 null → 400 */
function readKeyword(url: URL) {
  const keyword = url.searchParams.get('keyword');
  if (keyword !== null && keyword.length > OPERATION_KEYWORD_MAX) return undefined;
  return keyword?.trim() || null;
}

// ─── 조회 ────────────────────────────────────────────────────

const dashboard = http.get('*/api/v2/events/:eventId/dashboard', ({ request, params, cookies }) => {
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  return ok(dashboardOf(g.event.eventId));
});

/** GR-1 · GR-6 필터. `counts`는 검색어만 반영(상태 필터 무시) */
function readOrderFilter(url: URL) {
  const status = oneOf(HOST_ORDER_STATUS_FILTERS, url.searchParams.get('status'), 'ALL');
  const searchType = oneOf(ORDER_SEARCH_TYPES, url.searchParams.get('searchType'), 'NAME');
  const keyword = readKeyword(url);
  if (status === null || searchType === null || keyword === undefined) return null;
  return { status, searchType, keyword };
}

function filterOrders(
  eventId: number,
  f: NonNullable<ReturnType<typeof readOrderFilter>>,
  exact: boolean,
) {
  const searched = guestOrdersOf(eventId).filter(
    (o) => f.keyword === null || matchesOrderSearch(o, f.searchType, f.keyword, exact),
  );
  return {
    searched,
    rows: searched.filter((o) => f.status === 'ALL' || o.status === f.status),
  };
}

const orders = http.get('*/api/v2/events/:eventId/orders', ({ request, params, cookies }) => {
  const url = new URL(request.url);
  const f = readOrderFilter(url);
  const paging = readPageParams(url, OPERATION_PAGE_SIZE, OPERATION_PAGE_SIZE_MAX);
  if (!f || !paging) return errors.badRequest(request);
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  const show = managerOrAbove(g.myRole);
  const { searched, rows } = filterOrders(g.event.eventId, f, !show);
  return ok({
    counts: countsOf(searched),
    orders: paginate(
      rows.map((o) => toOrderElement(o, show)),
      paging.page,
      paging.size,
    ),
  });
});

/** 다른 공연 주문은 404 */
const orderOf = (eventId: number, orderUuid: unknown) => {
  const o = storedGuestOrder(String(orderUuid));
  return o && o.eventId === eventId ? o : undefined;
};

const orderDetail = http.get(
  '*/api/v2/events/:eventId/orders/:orderUuid',
  ({ request, params, cookies }) => {
    // `export`는 위 고정 경로가 먼저 받는다
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    const o = orderOf(g.event.eventId, params.orderUuid);
    if (!o) return guestError(request, 'Order_404_1');
    const show = managerOrAbove(g.myRole);
    return ok(toOrderDetail(o, show, show));
  },
);

/** GF-1 · GF-1b · GF-3 필터(#929 — 검색은 주문 목록과 같은 기준) */
function readRefundFilter(url: URL) {
  const status = oneOf(REFUND_STATUS_FILTERS, url.searchParams.get('status'), 'ALL');
  const searchType = oneOf(ORDER_SEARCH_TYPES, url.searchParams.get('searchType'), 'NAME');
  const keyword = readKeyword(url);
  if (status === null || searchType === null || keyword === undefined) return null;
  return { status, searchType, keyword };
}

/** 환불 상태가 있는 주문 중 검색에 맞는 것(`searched` — 건수용)과 상태까지 맞는 것(`rows`) */
function filterRefunds(
  eventId: number,
  f: NonNullable<ReturnType<typeof readRefundFilter>>,
  exact: boolean,
) {
  const searched = guestOrdersOf(eventId)
    .filter((o) => o.refundStatus !== 'NONE')
    .filter((o) => f.keyword === null || matchesOrderSearch(o, f.searchType, f.keyword, exact));
  return {
    searched,
    rows: searched.filter((o) => f.status === 'ALL' || o.refundStatus === f.status),
  };
}

const refunds = http.get('*/api/v2/events/:eventId/refunds', ({ request, params, cookies }) => {
  const url = new URL(request.url);
  const f = readRefundFilter(url);
  const paging = readPageParams(url, OPERATION_PAGE_SIZE, OPERATION_PAGE_SIZE_MAX);
  if (!f || !paging) return errors.badRequest(request);
  const g = guard(request, cookies, params.eventId, 'GUEST');
  if ('response' in g) return g.response;
  const show = managerOrAbove(g.myRole);
  const { rows } = filterRefunds(g.event.eventId, f, !show);
  return ok(
    paginate(
      rows.map((o) => toRefundElement(o, show)),
      paging.page,
      paging.size,
    ),
  );
});

/** GF-1b 환불 상태별 건수(#929) — 검색 반영, 상태 필터 무시 */
const refundCounts = http.get(
  '*/api/v2/events/:eventId/refunds/counts',
  ({ request, params, cookies }) => {
    const f = readRefundFilter(new URL(request.url));
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    const { searched } = filterRefunds(g.event.eventId, f, !managerOrAbove(g.myRole));
    return ok({
      all: searched.length,
      requested: searched.filter((o) => o.refundStatus === 'REQUESTED').length,
      completed: searched.filter((o) => o.refundStatus === 'COMPLETED').length,
    });
  },
);

/** GI-1 · GI-3 필터 */
function readTicketFilter(url: URL) {
  const entrance = oneOf(ENTRANCE_FILTERS, url.searchParams.get('entrance'), 'ALL');
  const searchType = oneOf(ISSUED_TICKET_SEARCH_TYPES, url.searchParams.get('searchType'), 'NAME');
  const keyword = readKeyword(url);
  if (entrance === null || searchType === null || keyword === undefined) return null;
  return { entrance, searchType, keyword };
}

function filterTickets(
  eventId: number,
  f: NonNullable<ReturnType<typeof readTicketFilter>>,
  exact: boolean,
) {
  const searched = guestTicketsOf(eventId).filter(
    (r) => f.keyword === null || matchesTicketSearch(r, f.searchType, f.keyword, exact),
  );
  return {
    searched,
    rows: searched.filter(
      (r) => f.entrance === 'ALL' || currentEntrance(r).entrance === f.entrance,
    ),
  };
}

const issuedTickets = http.get(
  '*/api/v2/events/:eventId/issued-tickets',
  ({ request, params, cookies }) => {
    const url = new URL(request.url);
    const f = readTicketFilter(url);
    const paging = readPageParams(url, OPERATION_PAGE_SIZE, OPERATION_PAGE_SIZE_MAX);
    if (!f || !paging) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    const { searched, rows } = filterTickets(g.event.eventId, f, !managerOrAbove(g.myRole));
    return ok({
      counts: entranceStatsOf(searched),
      tickets: paginate(rows.map(toIssuedTicket), paging.page, paging.size),
    });
  },
);

const issuedTicketDetail = http.get(
  '*/api/v2/events/:eventId/issued-tickets/:ticketUuid',
  ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    const r = findGuestTicket(g.event.eventId, String(params.ticketUuid));
    if (!r) return guestError(request, 'IssuedTicket_404_1');
    return ok(toIssuedTicketDetail(r, managerOrAbove(g.myRole)));
  },
);

// ─── 엑셀(매니저 이상, 상한 1만 행) ─────────────────────────────

/** mock xlsx 바이트(zip 머리 `PK\x03\x04`) — 내용은 보지 않는다 */
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const EXPORT_MAX_ROWS = 10_000;
const xlsx = (filename: string, rows: number) =>
  new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04, rows % 256]), {
    headers: {
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

const exportOrders = http.get(
  '*/api/v2/events/:eventId/orders/export',
  ({ request, params, cookies }) => {
    const f = readOrderFilter(new URL(request.url));
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const { rows } = filterOrders(g.event.eventId, f, false);
    if (rows.length > EXPORT_MAX_ROWS) return guestError(request, 'Order_400_19');
    return xlsx(`orders-${g.event.eventId}.xlsx`, rows.length);
  },
);

/** GF-3 환불 엑셀(#929, 매니저 이상) */
const exportRefunds = http.get(
  '*/api/v2/events/:eventId/refunds/export',
  ({ request, params, cookies }) => {
    const f = readRefundFilter(new URL(request.url));
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const { rows } = filterRefunds(g.event.eventId, f, false);
    if (rows.length > EXPORT_MAX_ROWS) return guestError(request, 'Order_400_19');
    return xlsx(`refunds-${g.event.eventId}.xlsx`, rows.length);
  },
);

const exportTickets = http.get(
  '*/api/v2/events/:eventId/issued-tickets/export',
  ({ request, params, cookies }) => {
    const f = readTicketFilter(new URL(request.url));
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const { rows } = filterTickets(g.event.eventId, f, false);
    if (rows.length > EXPORT_MAX_ROWS) return guestError(request, 'IssuedTicket_400_7');
    return xlsx(`issued-tickets-${g.event.eventId}.xlsx`, rows.length);
  },
);

// ─── 처리(매니저 이상) — 응답은 처리 뒤 주문 상세(변경 응답은 원본 연락처·계좌) ───

type Outcome = ReturnType<typeof approveGuestOrder>;
const detailOrError = (request: Request, r: Outcome) =>
  'error' in r ? guestError(request, r.error) : ok(toOrderDetail(r.ok, true, true));

async function readBody(request: Request): Promise<Record<string, unknown> | null | 'invalid'> {
  const text = await request.text();
  if (!text) return null;
  try {
    const body = JSON.parse(text) as unknown;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : 'invalid';
  } catch {
    return 'invalid';
  }
}

const approve = http.post(
  '*/api/v2/events/:eventId/orders/:orderUuid/approve',
  ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    return detailOrError(request, approveGuestOrder(g.event.eventId, String(params.orderUuid)));
  },
);

/** R-7 · R-8 본문의 `orderUuids`(1~50개, 각 1~64자). 틀리면 null → 400 */
function readOrderUuids(body: Record<string, unknown>): string[] | null {
  const list = body.orderUuids;
  if (!Array.isArray(list) || list.length < 1 || list.length > BULK_ORDER_MAX) return null;
  if (!list.every((v) => typeof v === 'string' && v.trim() !== '' && v.length <= 64)) return null;
  return list as string[];
}

/**
 * 일괄 처리(`V2ChangeOrderUseCase.runEach`) — 중복은 처음 나온 순서로 한 번, 주문마다 단건과 같은 판정, 실패는 단건 코드·문구.
 * `notProcessedAfter`가 있으면 그 건수만 처리하고 남은 주문은 `ORDER_BULK_NOT_PROCESSED`(20초 상한 흉내 — 시나리오용)
 */
function runBulk(
  orderUuids: string[],
  each: (uuid: string) => ReturnType<typeof approveGuestOrder>,
  notProcessedAfter: number | null = null,
) {
  const targets = [...new Set(orderUuids)];
  const results = targets.map((orderUuid, i) => {
    if (notProcessedAfter !== null && i >= notProcessedAfter) {
      return {
        orderUuid,
        success: false,
        errorCode: BULK_NOT_PROCESSED,
        reason: '시간이 오래 걸려 처리하지 못했어요. 다시 시도해 주세요.',
      };
    }
    const r = each(orderUuid);
    if ('ok' in r) return { orderUuid, success: true, errorCode: null, reason: null };
    return {
      orderUuid,
      success: false,
      errorCode: r.error,
      reason: GUEST_ERROR_REASONS[r.error][1],
    };
  });
  const succeeded = results.filter((r) => r.success).length;
  const notProcessed = results.filter((r) => r.errorCode === BULK_NOT_PROCESSED).length;
  return { succeeded, failed: targets.length - succeeded - notProcessed, notProcessed, results };
}

/** 일괄 상한 흉내(`bulkNotProcessedOnce`) — 다음 일괄 요청 한 번만 앞의 n건만 처리한다 */
let bulkLimitOnce: number | null = null;
const takeBulkLimit = () => {
  const n = bulkLimitOnce;
  bulkLimitOnce = null;
  return n;
};

/** R-7 일괄 승인(#929): `@Valid`(1~50개) → 권한(매니저 이상) → 주문마다 PR-3 */
const bulkApprove = http.post(
  '*/api/v2/events/:eventId/orders/approve',
  async ({ request, params, cookies }) => {
    const body = await readBody(request);
    const uuids = body && body !== 'invalid' ? readOrderUuids(body) : null;
    if (!uuids) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const eventId = g.event.eventId;
    return ok(runBulk(uuids, (uuid) => approveGuestOrder(eventId, uuid), takeBulkLimit()));
  },
);

/** 거절 사유 검사(`refuseReasonText`) — 기타면 trim 1~100자, 아니면 `Order_400_18`. 그 밖 종류는 종류 문구 */
function refuseReasonOf(
  reasonType: Exclude<RefuseReasonType, 'UNKNOWN'>,
  text: unknown,
): string | null {
  if (reasonType !== 'ETC') return REFUSE_REASON_LABELS[reasonType];
  const trimmed = typeof text === 'string' ? text.trim() : '';
  return trimmed && trimmed.length <= REFUSE_REASON_TEXT_MAX ? trimmed : null;
}

const isRefuseBody = (body: Record<string, unknown>) =>
  (REFUSE_REASON_TYPES as readonly unknown[]).includes(body.reasonType) &&
  (body.reasonText === undefined ||
    body.reasonText === null ||
    (typeof body.reasonText === 'string' && body.reasonText.length <= 200));

/** R-8 일괄 거절(#929): `@Valid` → 권한 → 사유 한 번(틀리면 전체 `Order_400_18`) → 주문마다 PR-4 */
const bulkRefuse = http.post(
  '*/api/v2/events/:eventId/orders/refuse',
  async ({ request, params, cookies }) => {
    const body = await readBody(request);
    const uuids = body && body !== 'invalid' ? readOrderUuids(body) : null;
    if (!uuids || !body || body === 'invalid' || !isRefuseBody(body)) {
      return errors.badRequest(request);
    }
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const reasonType = body.reasonType as Exclude<RefuseReasonType, 'UNKNOWN'>;
    const reason = refuseReasonOf(reasonType, body.reasonText);
    if (reason === null) return guestError(request, 'Order_400_18');
    const eventId = g.event.eventId;
    return ok(
      runBulk(
        uuids,
        (uuid) => refuseGuestOrder(eventId, uuid, reasonType, reason),
        takeBulkLimit(),
      ),
    );
  },
);

/** PR-4: `@Valid`(종류 필수, 문구 200자) → 권한 → 사유(`Order_400_18`) → 주문 404 → 시작 후 → 상태 → OPEN */
const refuse = http.post(
  '*/api/v2/events/:eventId/orders/:orderUuid/refuse',
  async ({ request, params, cookies }) => {
    const body = await readBody(request);
    const type = body && body !== 'invalid' ? body.reasonType : undefined;
    const text = body && body !== 'invalid' ? body.reasonText : undefined;
    if (
      body === null ||
      body === 'invalid' ||
      !(REFUSE_REASON_TYPES as readonly unknown[]).includes(type) ||
      (text !== undefined && text !== null && (typeof text !== 'string' || text.length > 200))
    ) {
      return errors.badRequest(request);
    }
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const reasonType = type as (typeof REFUSE_REASON_TYPES)[number];
    let reason: string = REFUSE_REASON_LABELS[reasonType];
    if (reasonType === 'ETC') {
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed || trimmed.length > REFUSE_REASON_TEXT_MAX) {
        return guestError(request, 'Order_400_18');
      }
      reason = trimmed;
    }
    return detailOrError(
      request,
      refuseGuestOrder(g.event.eventId, String(params.orderUuid), reasonType, reason),
    );
  },
);

/** PR-5: `@Valid`(사유 100자) → 권한 → 404 → 시작 후 `Order_400_9` → 승인 완료 아님 `Order_400_5` → OPEN. 빈 사유는 null */
const cancel = http.post(
  '*/api/v2/events/:eventId/orders/:orderUuid/cancel',
  async ({ request, params, cookies }) => {
    const body = await readBody(request);
    if (body === 'invalid') return errors.badRequest(request);
    const reason = body?.reason;
    if (
      reason !== undefined &&
      reason !== null &&
      (typeof reason !== 'string' || reason.length > HOST_CANCEL_REASON_MAX)
    ) {
      return errors.badRequest(request);
    }
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const text = typeof reason === 'string' ? reason.trim() || null : null;
    return detailOrError(
      request,
      cancelGuestOrder(g.event.eventId, String(params.orderUuid), text),
    );
  },
);

/**
 * Q-3 입장 취소(#929 B37): 권한(매니저 이상) → 공연 OPEN·정산중(아니면 `Event_400_27`) → 티켓 404 → 취소 티켓 `IssuedTicket_400_3` →
 * 입장 전 `IssuedTicket_400_9`. 응답은 GI-2 상세(연락처 원본)
 */
const cancelEntrance = http.post(
  '*/api/v2/events/:eventId/issued-tickets/:ticketUuid/entrance/cancel',
  ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (g.event.status !== 'OPEN' && g.event.status !== 'CALCULATING') {
      return guestError(request, 'Event_400_27');
    }
    const r = revertGuestTicketEntrance(g.event.eventId, String(params.ticketUuid));
    return 'error' in r ? guestError(request, r.error) : ok(toIssuedTicketDetail(r.ok, true));
  },
);

const completeRefund = http.post(
  '*/api/v2/events/:eventId/refunds/:orderUuid/complete',
  ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    return detailOrError(request, completeGuestRefund(g.event.eventId, String(params.orderUuid)));
  },
);

/** 경로가 없는 서버(운영 2.5.3)의 404 — 코드는 알 수 없으니 상태만 맞춘다 */
const noRoute = (request: Request) => fail(request, 404, 'NOT_FOUND', 'Not Found');

/** 이 경로의 처리가 언제나 이 코드로 실패한다(주문은 그대로) */
const changeFails =
  (action: 'approve' | 'refuse' | 'cancel') =>
  (code: GuestErrorCode): HttpHandler[] => [
    http.post(`*/api/v2/events/:eventId/orders/:orderUuid/${action}`, ({ request }) =>
      guestError(request, code),
    ),
  ];

/**
 * 이름 붙인 세트(plan §0). `default`는 기본 목록(`handlers.ts`)에 들어 있다. 고정 경로(`export`)가 `:orderUuid`·`:ticketUuid`보다 앞
 * - `approveFails(code)`·`refuseFails(code)`·`cancelFails(code)` — 처리가 언제나 그 코드로 실패
 * - `exportTooMany` — 두 엑셀 모두 1만 행 초과
 * - `listServerError` — GR-1·GI-1·GF-1 5xx
 * - `bulkUnsupported` · `refundCountsUnsupported` — 운영 2.5.3처럼 새 API가 없다(404)
 * - 일괄 상한 흉내는 `setBulkNotProcessedOnce(n)`(다음 일괄 요청 한 번만 앞 n건만 처리)
 */
export function setBulkNotProcessedOnce(n: number | null) {
  bulkLimitOnce = n;
}
export const hostingGuestHandlers = {
  default: [
    dashboard,
    exportOrders,
    bulkApprove,
    bulkRefuse,
    orders,
    orderDetail,
    approve,
    refuse,
    cancel,
    exportRefunds,
    refundCounts,
    refunds,
    completeRefund,
    exportTickets,
    cancelEntrance,
    issuedTickets,
    issuedTicketDetail,
  ] as HttpHandler[],
  /** 일괄 API가 없는 서버(운영 2.5.3 — 404). 화면은 단건 차례 호출로 돌아간다 */
  bulkUnsupported: [
    http.post('*/api/v2/events/:eventId/orders/approve', ({ request }) => noRoute(request)),
    http.post('*/api/v2/events/:eventId/orders/refuse', ({ request }) => noRoute(request)),
  ] as HttpHandler[],
  /** GF-1b 건수가 없는 서버(운영 2.5.3) */
  refundCountsUnsupported: [
    http.get('*/api/v2/events/:eventId/refunds/counts', ({ request }) => noRoute(request)),
  ] as HttpHandler[],
  approveFails: changeFails('approve'),
  refuseFails: changeFails('refuse'),
  cancelFails: changeFails('cancel'),
  exportTooMany: [
    http.get('*/api/v2/events/:eventId/orders/export', ({ request }) =>
      guestError(request, 'Order_400_19'),
    ),
    http.get('*/api/v2/events/:eventId/issued-tickets/export', ({ request }) =>
      guestError(request, 'IssuedTicket_400_7'),
    ),
  ] as HttpHandler[],
  listServerError: [
    http.get('*/api/v2/events/:eventId/orders', ({ request }) => errors.serverError(request)),
    http.get('*/api/v2/events/:eventId/issued-tickets', ({ request }) =>
      errors.serverError(request),
    ),
    http.get('*/api/v2/events/:eventId/refunds', ({ request }) => errors.serverError(request)),
  ] as HttpHandler[],
};
