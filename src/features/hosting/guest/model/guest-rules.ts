import type { EventDisplayStatus, EventStatus } from '@/api/event/schema';
import type { EntranceFilter, IssuedTicketSearchType } from '@/api/issued-ticket/schema';
import {
  HOST_CANCEL_REASON_MAX,
  type HostCancelOrderRequest,
  type HostOrderElement,
  type HostOrderStatusFilter,
  type OrderCanceledBy,
  type OrderSearchType,
  type RefundStatusFilter,
  REFUSE_REASON_TEXT_MAX,
  type RefuseOrderRequest,
} from '@/api/order/schema';
import { type ActorRole, can } from '@/features/shared/permission/model/can';

/**
 * 예매자 관리(`/hosting/events/[eventId]/guests`, plan P13a) 규칙 — 탭·주소, 상태 탭, 검색 안내, 주문 처리 가능 여부, 거절·취소 본문,
 * 약관 안내(legal-copy C-2~C-4), 에러 문구. 근거: api-contract §2·§6(운영), patterns §6·§22·§24 P13a,
 * 백엔드 `V2OrderManageController`·`V2OrderDomainService`·`OrderValidator`(dev cb8d24e).
 */

// ─── 탭 · 주소(tech-decisions §3 — `?tab=`·`?order=`만 주소에 남긴다) ───

export const GUEST_TABS = [
  { key: 'orders', label: '주문' },
  { key: 'tickets', label: '발급된 티켓' },
  { key: 'refunds', label: '환불' },
] as const;
export type GuestTab = (typeof GUEST_TABS)[number]['key'];

export const GUEST_TAB_PARAM = 'tab';
export const GUEST_ORDER_PARAM = 'order';
const DEFAULT_TAB: GuestTab = 'orders';

/** 주소 → 탭. 모르는 값·없음은 주문 탭(기본 탭은 주소에 쓰지 않는다 — 공연준비 홈 `?tab=`과 같은 규칙) */
export function parseGuestTab(search: URLSearchParams): GuestTab {
  const v = search.get(GUEST_TAB_PARAM);
  return GUEST_TABS.some((t) => t.key === v) ? (v as GuestTab) : DEFAULT_TAB;
}

/** 주소의 주문 uuid(비면 null) */
export const parseOrderParam = (search: URLSearchParams) =>
  search.get(GUEST_ORDER_PARAM)?.trim() || null;

/** 탭·주문을 바꾼 쿼리(`?…` 또는 ''). 다른 쿼리는 둔다. `order: null`이면 지운다 */
export function guestsSearch(
  current: string,
  change: { tab?: GuestTab; order?: string | null },
): string {
  const params = new URLSearchParams(current);
  if (change.tab !== undefined) {
    if (change.tab === DEFAULT_TAB) params.delete(GUEST_TAB_PARAM);
    else params.set(GUEST_TAB_PARAM, change.tab);
  }
  if (change.order !== undefined) {
    if (change.order === null) params.delete(GUEST_ORDER_PARAM);
    else params.set(GUEST_ORDER_PARAM, change.order);
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}

/** 예매자 관리 주소 — 대시보드 카드·호스트 알림(P9b `/hosting/events/{eventId}/guests?order={uuid}`)이 쓴다 */
export const guestsHref = (
  eventId: string | number,
  { tab, order }: { tab?: GuestTab; order?: string } = {},
) => `/hosting/events/${eventId}/guests${guestsSearch('', { tab, order })}`;

// ─── 목록 필터 ───────────────────────────────────────────────

/**
 * 주문 상태 탭 — 서버는 6개(+ 주문 실패)지만 5개만 둔다(plan P13a, 사용자 결정 2026-10-31 — Q32).
 * "전체"(`counts.all`)에는 서버가 주문 실패를 넣는다 — 그대로 보인다(같은 결정)
 */
export const ORDER_STATUS_TABS = [
  { key: 'ALL', label: '전체', count: 'all' },
  { key: 'PENDING_APPROVE', label: '승인 대기', count: 'pendingApprove' },
  { key: 'APPROVED', label: '승인 완료', count: 'approved' },
  { key: 'REFUSED', label: '승인 거절', count: 'refused' },
  { key: 'CANCELED', label: '주문 취소', count: 'canceled' },
] as const satisfies readonly {
  key: HostOrderStatusFilter;
  label: string;
  count: 'all' | 'pendingApprove' | 'approved' | 'refused' | 'canceled';
}[];

/** 주문 · 환불 탭 검색 기준(GUI `1029:6014` 순서 — 이름 · 주문 번호 · 연락처 · 입금자명). 주문 번호는 백엔드 #929(B36) */
export const ORDER_SEARCH_TYPE_OPTIONS = [
  { key: 'NAME', label: '이름' },
  { key: 'ORDER_NO', label: '주문 번호' },
  { key: 'PHONE', label: '연락처' },
  { key: 'DEPOSITOR_NAME', label: '입금자명' },
] as const satisfies readonly { key: OrderSearchType; label: string }[];

/** 발급된 티켓 탭 검색 기준(GUI `1030:8703` 순서 — 이름 · 주문 번호 · 연락처 · 입금자명 · 티켓 번호). 백엔드 #929(B36) */
export const TICKET_SEARCH_TYPE_OPTIONS = [
  { key: 'NAME', label: '이름' },
  { key: 'ORDER_NO', label: '주문 번호' },
  { key: 'PHONE', label: '연락처' },
  { key: 'DEPOSITOR_NAME', label: '입금자명' },
  { key: 'TICKET_NO', label: '티켓 번호' },
] as const satisfies readonly { key: IssuedTicketSearchType; label: string }[];

export const ENTRANCE_FILTER_OPTIONS = [
  { key: 'ALL', label: '전체' },
  { key: 'BEFORE', label: '입장 전' },
  { key: 'DONE', label: '입장 완료' },
] as const satisfies readonly { key: EntranceFilter; label: string }[];

export const REFUND_FILTER_OPTIONS = [
  { key: 'ALL', label: '전체' },
  { key: 'REQUESTED', label: '환불 요청' },
  { key: 'COMPLETED', label: '환불 완료' },
] as const satisfies readonly { key: RefundStatusFilter; label: string }[];

/**
 * 일반 멤버의 연락처·입금자명 검색은 완전 일치만 된다(#846 — 가린 값을 부분 일치로 복원하지 못하게). 그 검색 칸의 안내 문구(GUI `1029:4569`).
 * 이름 · 주문 번호 · 티켓 번호(개인정보가 아니라 부분 일치 — 백엔드 #929) 검색과 매니저 이상은 안내 없음
 */
export const EXACT_MATCH_HINT = '연락처, 입금자명은 전체를 정확히 입력해야 찾을 수 있어요.';
const isExactMatchSearch = (
  role: ActorRole | null | undefined,
  searchType: OrderSearchType | IssuedTicketSearchType,
) => !can(role, 'viewRefundAccount') && (searchType === 'PHONE' || searchType === 'DEPOSITOR_NAME');
export function exactMatchHintOf(
  role: ActorRole | null | undefined,
  searchType: OrderSearchType | IssuedTicketSearchType,
): string | null {
  return isExactMatchSearch(role, searchType) ? EXACT_MATCH_HINT : null;
}

/**
 * 검색 결과가 없을 때 표 안 문구. 일반 멤버가 연락처·입금자명으로 찾았으면 완전 일치 안내를 붙인다(백엔드 #929 B36 "결과가 없을 때
 * '전체 값을 입력해 주세요' 안내"). 🤖 문구는 Claude 판단(GUI 빈 상태 `1031:9948`은 검색 없는 빈 목록뿐)
 */
export const SEARCH_EMPTY_MESSAGE = '검색 결과가 없어요';
export const SEARCH_EMPTY_EXACT_MESSAGE =
  '검색 결과가 없어요. 연락처, 입금자명은 전체 값을 입력해 주세요.';
export function searchEmptyMessageOf(
  role: ActorRole | null | undefined,
  appliedSearchType: OrderSearchType | IssuedTicketSearchType,
): string {
  return isExactMatchSearch(role, appliedSearchType)
    ? SEARCH_EMPTY_EXACT_MESSAGE
    : SEARCH_EMPTY_MESSAGE;
}

// ─── 주문 처리 ───────────────────────────────────────────────

type EventForActions = { status: EventStatus; displayStatus: EventDisplayStatus };

/**
 * 공연 시작 후인지. 서버는 실제 시각과 `startAt`을 비교한다 — 화면은 GE-3 `displayStatus`로 본다(진행중·지난 공연 = 시작 후).
 * 모르는 상태(`UNKNOWN`)는 시작 후로 본다(버튼이 잘못 열리지 않게)
 */
export const isEventStarted = (e: EventForActions) =>
  e.displayStatus !== 'UPCOMING' && e.displayStatus !== 'PREPARING';

export type OrderActionKey = 'approve' | 'refuse' | 'cancel' | 'completeRefund';
export type OrderActionBlock = 'started' | 'notOpen' | 'ticketUsed' | 'noAccount';
export type OrderAction = {
  key: OrderActionKey;
  label: string;
  enabled: boolean;
  blockedBy: OrderActionBlock | null;
};

export const ORDER_ACTION_LABEL: Record<OrderActionKey, string> = {
  approve: '승인',
  refuse: '거절',
  cancel: '주문 취소',
  completeRefund: '환불 완료',
};

export const ORDER_ACTION_BLOCK_MESSAGE: Record<OrderActionBlock, string> = {
  started: '공연이 시작되어 처리할 수 없어요',
  notOpen: '판매 중인 공연이 아니어서 처리할 수 없어요',
  ticketUsed: '입장했거나 선물한 티켓이 있어 주문을 취소할 수 없어요.',
  noAccount: '예매자가 아직 환불 계좌를 입력하지 않았어요.',
};

/**
 * 주문 상세의 처리 버튼(매니저 이상만 — 일반 멤버는 빈 목록). 승인·거절은 승인 대기, 승인 후 취소는 승인 완료, 환불 완료는 `refundStatus=REQUESTED`.
 * 승인·거절·취소는 공연 OPEN + 시작 전에만 누를 수 있다(시작 후 비활성 — 서버 승인 `Event_400_6`, 거절·취소 `Order_400_9`).
 * 환불 완료는 시작 후에도 된다(서버 검사 없음)
 */
export function orderActionsOf(
  order: Pick<HostOrderElement, 'status' | 'refundStatus'>,
  event: EventForActions & { myRole: ActorRole | null },
): OrderAction[] {
  if (!can(event.myRole, 'manageOrders')) return [];
  const blockedBy: OrderActionBlock | null = isEventStarted(event)
    ? 'started'
    : event.status !== 'OPEN'
      ? 'notOpen'
      : null;
  const keys: OrderActionKey[] = [];
  if (order.status === 'PENDING_APPROVE') keys.push('approve', 'refuse');
  if (order.status === 'APPROVED') keys.push('cancel');
  const actions = keys.map((key) => ({
    key,
    label: ORDER_ACTION_LABEL[key],
    enabled: blockedBy === null,
    blockedBy,
  }));
  if (order.refundStatus === 'REQUESTED') {
    actions.push({
      key: 'completeRefund',
      label: ORDER_ACTION_LABEL.completeRefund,
      enabled: true,
      blockedBy: null,
    });
  }
  return actions;
}

// ─── 거절 사유(PR-4) · 승인 후 취소 사유(PR-5) ──────────────────

/** 거절 사유 4종 — 백엔드 `OrderRefuseReasonType.label`과 같은 글자 */
export const REFUSE_REASON_OPTIONS = [
  { key: 'DEPOSIT_UNCONFIRMED', label: '입금 미확인' },
  { key: 'AMOUNT_MISMATCH', label: '결제 금액 오류' },
  { key: 'SOLD_OUT', label: '티켓 매진' },
  { key: 'ETC', label: '기타' },
] as const;
export type RefuseReasonKey = (typeof REFUSE_REASON_OPTIONS)[number]['key'];

export type RefuseForm = { reasonType: RefuseReasonKey | null; reasonText: string };
export const REFUSE_ERRORS = {
  reasonType: '거절 사유를 골라 주세요',
  reasonText: `기타 사유를 1~${REFUSE_REASON_TEXT_MAX}자로 적어 주세요`,
} as const;

/** 칸 오류. 기타면 문구 필수(trim 후 1~100자 — 서버 `Order_400_18`, #921) */
export function validateRefuse(form: RefuseForm): { reasonType?: string; reasonText?: string } {
  if (form.reasonType === null) return { reasonType: REFUSE_ERRORS.reasonType };
  if (form.reasonType !== 'ETC') return {};
  const text = form.reasonText.trim();
  return text.length < 1 || text.length > REFUSE_REASON_TEXT_MAX
    ? { reasonText: REFUSE_ERRORS.reasonText }
    : {};
}

/** PR-4 본문 — 기타가 아니면 문구를 보내지 않는다(서버가 무시한다) */
export function toRefuseBody(
  form: RefuseForm & { reasonType: RefuseReasonKey },
): RefuseOrderRequest {
  return form.reasonType === 'ETC'
    ? { reasonType: 'ETC', reasonText: form.reasonText.trim() }
    : { reasonType: form.reasonType };
}

export const CANCEL_REASON_MAX = HOST_CANCEL_REASON_MAX;

/**
 * 승인 후 취소 사유 고르기(GUI `1029:7509` "주문 취소 사유를 선택해 주세요." — 라디오 4개, 2026-11-01). 서버(PR-5)는 사유 문구 하나만
 * 받으므로 고른 항목의 글자를 그대로 보내고, 기타면 입력한 문구를 보낸다(API 그대로 — 🤖 Claude 판단 p13a-gui-guests)
 */
export const CANCEL_REASON_OPTIONS = [
  { key: 'BUYER_REQUEST', label: '예매자 요청' },
  { key: 'SCHEDULE_CHANGED', label: '공연 일정 변경' },
  { key: 'DUPLICATE', label: '중복 주문' },
  { key: 'ETC', label: '기타' },
] as const;
export type CancelReasonKey = (typeof CANCEL_REASON_OPTIONS)[number]['key'];

/** 고른 취소 사유 → 보낼 문구(기타면 입력값, 고르지 않았으면 입력값 — 예전 자유 입력과 같다) */
export function cancelReasonTextOf(type: CancelReasonKey | null, text: string): string {
  if (type === null || type === 'ETC') return text;
  return CANCEL_REASON_OPTIONS.find((o) => o.key === type)!.label;
}

/**
 * 승인 후 취소를 막는 발급 티켓(GUI `1029:7706` "취소 불가" — #112, 2026-11-01): 입장했거나 선물한(선물 대기 · 선물 받음) 티켓이 있으면
 * 취소할 수 없다. 서버도 같은 경우 `Order_400_30`으로 막는다(백엔드 #929 — B35, 2.5.7). 판정은 `entrance == DONE` 또는
 * `giftState != NONE`(GR-2 `issuedTickets[].giftState`). 운영 2.5.3 응답에는 `giftState`가 없다 — 그때는 입장만 본다(서버도 막지 않는다).
 * 모르는 선물 상태(`UNKNOWN`)는 막는 쪽으로 본다(버튼이 잘못 열리지 않게)
 */
export const CANCEL_BLOCKED_MESSAGE = ORDER_ACTION_BLOCK_MESSAGE.ticketUsed;
export const hasCancelBlockingTicket = (
  issuedTickets: readonly { entrance: string; giftState?: string }[],
) =>
  issuedTickets.some(
    (t) =>
      t.entrance !== 'CANCELED' &&
      (t.entrance === 'DONE' || (t.giftState !== undefined && t.giftState !== 'NONE')),
  );

/**
 * 선물 대기(수락 전, `giftState: PENDING`) 티켓은 서버가 입장시키지 않는다 — PQ-2가 200 + `GIFT_PENDING`(입장 안 함). QR 스캔 ·
 * 셀프 체크인과 같은 규칙(백엔드 `V2CheckInDomainService.classify` dev f45882e, #719). 그래서 [입장 처리] 대신 이 문구를 보인다
 * (QR 스캔 결과 문구 `checkin-result` host GIFT_PENDING과 같은 말). 선물 받음(`ACCEPTED`)은 받은 사람 티켓으로 입장할 수 있다
 */
export const GIFT_PENDING_CHECK_IN_MESSAGE =
  '선물 대기 중인 티켓이에요. 보낸 분이 선물을 취소해야 입장할 수 있어요';
export const isGiftPending = (t: { giftState: string }) => t.giftState === 'PENDING';

/**
 * 환불 탭·상세의 환불 상태 칩(GUI `1031:9189` — 환불 요청 보라 · 계좌 입력 전 회색 테두리 · 환불 완료 초록).
 * 계좌 입력 전 = 환불 요청인데 구매자가 계좌를 아직 넣지 않음(매니저만 계좌를 보므로 일반 멤버에게는 '환불 요청')
 */
export type RefundRowState = 'REQUESTED' | 'NO_ACCOUNT' | 'COMPLETED' | null;
export function refundRowStateOf(
  r: { refundStatus: string; refundAccount: unknown },
  canSeeAccount: boolean,
): RefundRowState {
  if (r.refundStatus === 'COMPLETED') return 'COMPLETED';
  if (r.refundStatus !== 'REQUESTED') return null;
  return canSeeAccount && r.refundAccount === null ? 'NO_ACCOUNT' : 'REQUESTED';
}

/** [환불 완료]를 막는 안내 — 계좌가 없으면 누를 수 없다(GUI `1029:8117` "계좌 입력 전", Q96 답) */
export const REFUND_NO_ACCOUNT_MESSAGE = ORDER_ACTION_BLOCK_MESSAGE.noAccount;

/**
 * 거절 사유 "입금 미확인" 안내(GUI `1029:7114`). 백엔드 #929(B35 — 2.5.7)부터 입금 미확인 거절은 결제 금액이 있어도 환불 요청을 만들지
 * 않고 **되돌릴 수 없다**(관객도 환불 계좌를 넣을 수 없다 — `Order_400_27`). 거절 사유 단계(주문 상세 · 표에서 거절)에서 그 사유를 고르면 꼭 보인다
 */
export const REFUSE_DEPOSIT_UNCONFIRMED_NOTE =
  '입금 미확인으로 거절하면 환불 요청이 생기지 않아요.';
export const showsDepositUnconfirmedNote = (reasonType: RefuseReasonKey | null) =>
  reasonType === 'DEPOSIT_UNCONFIRMED';

/** 주문 상세 "취소한 사람"(GUI `1029:8522`, GR-2 `canceledBy` — 백엔드 #929 B35). 값이 없으면(운영 2.5.3 · 취소 전) 줄을 그리지 않는다 */
export const CANCELED_BY_LABEL: Record<OrderCanceledBy, string | null> = {
  BUYER: '예매자',
  HOST: '호스트',
  UNKNOWN: null,
};
export const CANCEL_REASON_ERROR = `취소 사유는 ${HOST_CANCEL_REASON_MAX}자까지 적을 수 있어요`;

/** PR-5 본문 — 사유는 선택(trim 후 비면 본문 없이) */
export function toCancelBody(reason: string): HostCancelOrderRequest | undefined {
  const text = reason.trim();
  return text ? { reason: text } : undefined;
}

// ─── 약관 근거 안내(legal-copy C-2~C-4, 약관 제29조③) ───────────

/**
 * 두둥티켓 주문인지(직접 환불 안내 대상) — `orderMethod === 'APPROVAL'`(승인형)이고 결제 금액이 있으면 두둥(백엔드 #888 — v1 주문도 값이 있다).
 * PAYMENT(v1 PG·선착순 무료)와 승인형 무료(0원)는 아니다. `orderMethod`가 null·모르는 값이면(서버 타입이 nullable) 예전 판정으로 —
 * `paymentChannel`이 계좌이체거나 null(v1)이고 금액이 있으면 두둥(빠뜨리는 쪽보다 더 붙는 쪽)
 */
export function isDudoongOrder(
  order: Pick<HostOrderElement, 'orderMethod' | 'paymentChannel' | 'totalAmount'>,
) {
  if (order.totalAmount <= 0) return false;
  if (order.orderMethod === 'APPROVAL') return true;
  if (order.orderMethod === 'PAYMENT') return false;
  return (
    order.paymentChannel === 'BANK_TRANSFER' ||
    order.paymentChannel === 'TOSS_TRANSFER' ||
    order.paymentChannel === null
  );
}

/** C-2 거절 확인(v1 운영 문구 — 참고) · C-3 두둥이면 붙는 줄 */
export const REFUSE_CONFIRM = {
  title: '주문을 거절하시겠어요?',
  body: '주문을 거절한 이후에는 되돌릴 수 없어요',
  dudoongNotice: '이미 입금을 받았다면 구매자에게 직접 환불해야 해요',
} as const;

/** 승인 후 취소 확인 · C-4 두둥이면 붙는 줄 */
export const CANCEL_CONFIRM = {
  body: '주문을 취소한 이후에는 되돌릴 수 없어요',
  dudoongNotice:
    '두둥티켓은 호스트 계좌로 받은 금액이라 자동으로 환불되지 않아요. 구매자에게 지체 없이 직접 환불해 주세요',
} as const;

// ─── 에러 문구(patterns §24 P13a — 잠정) ─────────────────────────

/** 승인 실패 — 주문은 승인 대기로 남고 거절로 정리하는 길을 안내한다(patterns §23) */
export const APPROVE_ERROR_MESSAGE = {
  Ticket_Item_400_1:
    '재고가 부족해 승인할 수 없어요. 주문은 승인 대기로 남아 있어요. 거절로 정리해 주세요',
  Ticket_Item_400_6:
    '1인 구매 제한을 넘어 승인할 수 없어요. 주문은 승인 대기로 남아 있어요. 거절로 정리해 주세요',
  Order_400_14: '탈퇴한 주문자라 승인할 수 없어요. 거절로 정리해 주세요',
  Order_400_3: '이미 처리된 주문이에요. 최신 상태를 불러왔어요',
  Event_400_5: ORDER_ACTION_BLOCK_MESSAGE.notOpen,
  Event_400_6: ORDER_ACTION_BLOCK_MESSAGE.started,
} as const;

/**
 * 거절·승인 후 취소 실패. 서버 검사 순서(`OrderValidator.validCanRefuse`·`validCanCancel`, fe423ed4): 시작 전(`Order_400_9`) → 상태
 * (`Order_400_5` — 거절도 이 코드) → 공연 OPEN(`Event_400_5`). `Order_400_3`(승인 전용)·`Event_400_6`(시작 시각은 `Order_400_9`가 먼저
 * 막는다)은 오지 않아 두지 않는다(계약 대조 2026-10-31)
 */
export const WITHDRAW_ERROR_MESSAGE = {
  Order_400_5: '이미 처리된 주문이에요. 최신 상태를 불러왔어요',
  /** 승인 후 취소 — 입장했거나 선물한 티켓이 있다(백엔드 #929 B35). 그 사이 입장·선물됐을 수 있어 최신 상태를 다시 읽는다 */
  Order_400_30: `${ORDER_ACTION_BLOCK_MESSAGE.ticketUsed} 최신 상태를 불러왔어요`,
  Order_400_9: ORDER_ACTION_BLOCK_MESSAGE.started,
  Order_400_18: REFUSE_ERRORS.reasonText,
  Event_400_5: ORDER_ACTION_BLOCK_MESSAGE.notOpen,
} as const;

/**
 * [환불 완료] 확인 팝업 문구(스테이징 QA #106 §5 — 되돌릴 수 없는데 확인 없이 바로 처리됐다). 환불 탭·주문 상세 공용.
 * 디자인 없음(Q32 — 환불 탭은 DS로만) → DS `openConfirm`. 🤖 Claude 판단(문구 · 계좌 없음 경고 — design-requests Q96).
 * `hasAccount` — 매니저가 보는 환불 계좌가 있는지. 없으면(구매자가 아직 안 넣음) 경고 한 줄을 더한다 — 막지는 않는다
 * (계좌를 따로 받아 송금했을 수 있다)
 */
export function refundConfirmCopy({
  buyerName,
  hasAccount,
}: {
  buyerName: string | null;
  hasAccount: boolean;
}) {
  const who = buyerName ? `${buyerName}님 주문을` : '이 주문을';
  return {
    title: `${who} 환불 완료로 바꿀까요?`,
    description: hasAccount
      ? '송금을 마친 뒤에 눌러 주세요. 환불 완료는 되돌릴 수 없어요.'
      : '환불 계좌가 아직 입력되지 않았어요. 구매자에게 계좌를 따로 받아 송금했을 때만 눌러 주세요. 환불 완료는 되돌릴 수 없어요.',
    confirmLabel: '환불 완료',
  };
}

export const REFUND_ERROR_MESSAGE = {
  Order_400_17: '환불 요청 상태가 아니에요. 최신 상태를 불러왔어요',
} as const;

/** 주문·티켓 상세 404 — 공용 404가 아니라 닫고 목록을 다시 읽는다 */
export const DETAIL_MISSING_MESSAGE = '주문을 찾을 수 없어요. 목록을 다시 불러왔어요';
export const TICKET_MISSING_MESSAGE = '티켓을 찾을 수 없어요. 목록을 다시 불러왔어요';

/** 엑셀 1만 행 초과(`Order_400_19`·`IssuedTicket_400_7`) */
export const EXPORT_TOO_MANY_MESSAGE =
  '1만 건이 넘어 내려받을 수 없어요. 상태·검색으로 좁혀 주세요';

// ─── 입장 취소(Q-3, 백엔드 #929 — B37) ─────────────────────────

/** 입장 취소 확인(GUI `1030:9318` 문구 그대로) */
export const CANCEL_ENTRANCE_CONFIRM = {
  title: '입장 처리를 취소할까요?',
  description: '입장 인원에서 빠지고, 다시 입장할 수 있는 상태가 돼요.',
  confirmLabel: '입장 취소',
} as const;

/** 입장 취소 실패 — 상태가 이미 바뀐 것은 최신 상태를 다시 읽는다 */
export const CANCEL_ENTRANCE_ERROR_MESSAGE = {
  IssuedTicket_400_9: '입장 전 티켓이에요. 최신 상태를 불러왔어요',
  IssuedTicket_400_3: '취소된 티켓이라 입장을 취소할 수 없어요. 최신 상태를 불러왔어요',
} as const;
