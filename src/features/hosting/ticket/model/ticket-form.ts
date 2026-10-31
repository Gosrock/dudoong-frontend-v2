import { agreementFields } from '@/api/shared/agreement';
import { isKstDateTime } from '@/api/shared/date';
import {
  type CreateTicketItemRequest,
  type EditableTicketPayType,
  TICKET_ACCOUNT_HOLDER_MAX,
  TICKET_ACCOUNT_NUMBER_MAX,
  TICKET_COUNT_MAX,
  TICKET_DESCRIPTION_MAX,
  TICKET_NAME_MAX,
  TICKET_PRICE_MAX,
  type TicketAccountRequest,
  type TicketClearableField,
  type TicketItemManage,
  type UpdateTicketItemRequest,
} from '@/api/ticket-item/schema';

import { isEditablePayType, isTicketLocked } from './ticket-rules';

/**
 * 티켓 폼(P10/T-2 만들기 · P10/T-3 수정, plan P12). 값·칸 규칙·본문 만들기만 — 화면 동작은 없다(plan §0).
 *
 * 서버 규칙(`V2TicketItemDomainService` 432cce4 → dev cb8d24e, api-contract §4 티켓):
 * - 두둥 티켓 = 가격 1원~1,000만 원 + 입금 계좌 필수 + 관리자 승인 항상 켬(토글 잠금). 무료 티켓 = 0원, 계좌 없음, 승인은 고른다
 * - **무제한이면 재고 공개를 끄고 비활성**(무제한 + 재고 공개는 `Ticket_Item_400_15`) — 기본값 그대로 저장해도 서버가 받는 조합이다
 * - 판매 기간: 시작 < 종료, 시작 < 공연 시작, 종료 ≤ 공연 시작, 새로 정한 종료는 지금 이후(`Ticket_Item_400_13`)
 * - 잠긴 티켓(`isSold || hasPendingOrders`)은 결제 방식·이름·가격·계좌·승인 여부를 바꿀 수 없고 수량은 늘리기만(`Ticket_Item_400_14`)
 * - 수정 본문은 **바뀐 필드만 + 비울 때 `clear[]`**(명시적 null 금지, patterns §23). 결제 방식을 바꾸면 가격도 같이
 * - 은행은 목록(`GET /api/v2/banks`)의 `code`만 보낸다(`bankName` 없음, #804)
 *
 * 칸 값 모양: 날짜 `YYYY-MM-DD`, 시각 `HH:mm`(브라우저 기본 입력 — P11 일정 칸과 같다), 숫자는 글자 그대로.
 */

export type TicketFormValues = {
  payType: EditableTicketPayType;
  name: string;
  description: string;
  /** 원 단위 숫자 글자(두둥 티켓만) */
  price: string;
  /** 판매 수량 무제한 */
  unlimited: boolean;
  supplyCount: string;
  /** 재고(잔여 매수) 공개 — 무제한이면 언제나 false */
  isQuantityPublic: boolean;
  /** 1인 매수 제한을 둔다 */
  limitPurchase: boolean;
  purchaseLimit: string;
  /** 관리자 승인 — 두둥 티켓은 언제나 true */
  approvalRequired: boolean;
  /** 은행 목록의 코드. 옛 자유 입력 은행명(응답 `bankCode` null)이면 빈 값 — 계좌를 고칠 때 목록에서 다시 고른다 */
  bankCode: string;
  accountHolder: string;
  accountNumber: string;
  /** 판매 기간 설정(GUI 토글). 끄면 등록 즉시 ~ 공연 시작까지 */
  salePeriod: boolean;
  /** "공연 등록 즉시 판매 시작"(GUI 체크) */
  saleStartNow: boolean;
  saleStartDate: string;
  saleStartTime: string;
  saleEndDate: string;
  saleEndTime: string;
};

/**
 * 새 티켓 기본값. GUI(`767:46560`)는 두둥 티켓 · 판매 수량 무제한 + 재고 공개 On · 판매 기간 off인데, 무제한 + 재고 공개는
 * 서버가 거부하므로 재고 공개를 끈 채로 시작한다(design-requests §3 — "기본값을 수량 지정으로" 권함, 답 대기)
 */
export const initialTicketFormValues = (): TicketFormValues => ({
  payType: 'DUDOONG',
  name: '',
  description: '',
  price: '',
  unlimited: true,
  supplyCount: '',
  isQuantityPublic: false,
  limitPurchase: false,
  purchaseLimit: '',
  approvalRequired: true,
  bankCode: '',
  accountHolder: '',
  accountNumber: '',
  salePeriod: false,
  saleStartNow: true,
  saleStartDate: '',
  saleStartTime: '',
  saleEndDate: '',
  saleEndTime: '',
});

/** 서버 일시 → `[YYYY-MM-DD, HH:mm]` */
const splitDateTime = (v: string | null): [string, string] => {
  if (!v) return ['', ''];
  const [d = '', t = ''] = v.split(' ');
  return [d.replaceAll('.', '-'), t];
};

/** 칸 → 서버 일시(`yyyy.MM.dd HH:mm`). 칸이 비었거나 틀리면 null */
export function toServerDateTime(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const v = `${date.replaceAll('-', '.')} ${time}`;
  return isKstDateTime(v) ? v : null;
}

/** 수정 폼 처음 값(T-1 응답). PG 티켓은 고칠 수 없다(호출 쪽이 `isEditablePayType`으로 막는다) */
export function ticketFormValuesOf(t: TicketItemManage): TicketFormValues {
  const [startDate, startTime] = splitDateTime(t.saleStartAt);
  const [endDate, endTime] = splitDateTime(t.saleEndAt);
  const payType = isEditablePayType(t.payType) ? t.payType : 'DUDOONG';
  return {
    payType,
    name: t.name ?? '',
    description: t.description ?? '',
    price: payType === 'DUDOONG' ? String(t.price) : '',
    unlimited: t.supplyCount === null,
    supplyCount: t.supplyCount === null ? '' : String(t.supplyCount),
    isQuantityPublic: t.supplyCount !== null && t.isQuantityPublic,
    limitPurchase: t.purchaseLimit !== null,
    purchaseLimit: t.purchaseLimit === null ? '' : String(t.purchaseLimit),
    approvalRequired: payType === 'DUDOONG' || t.approvalRequired,
    bankCode: t.account?.bankCode ?? '',
    accountHolder: t.account?.accountHolder ?? '',
    accountNumber: t.account?.accountNumber ?? '',
    salePeriod: t.saleStartAt !== null || t.saleEndAt !== null,
    saleStartNow: t.saleStartAt === null,
    saleStartDate: startDate,
    saleStartTime: startTime,
    saleEndDate: endDate,
    saleEndTime: endTime,
  };
}

// ─── 칸 사이 규칙 ────────────────────────────────────────────

/**
 * 값을 바꾼 뒤 칸 사이 규칙을 맞춘다 — 무제한이면 재고 공개 끔, 두둥 티켓이면 승인 켬. 모든 setter가 이 함수를 거친다
 */
export function normalizeTicketForm(v: TicketFormValues): TicketFormValues {
  return {
    ...v,
    isQuantityPublic: v.unlimited ? false : v.isQuantityPublic,
    approvalRequired: v.payType === 'DUDOONG' ? true : v.approvalRequired,
  };
}

/** 칸 잠금 — 화면은 이 값으로 칸을 비활성으로 그린다 */
export type TicketFieldLocks = {
  /** 결제 방식 · 이름 · 가격 · 계좌 · 승인 여부(잠긴 티켓) */
  locked: boolean;
  /** 재고 공개 — 무제한이면 끄고 비활성 */
  quantityPublic: boolean;
  /** 관리자 승인 — 두둥 티켓이면 켠 채 비활성(무료일 때만 연다), 잠긴 티켓도 비활성 */
  approval: boolean;
  /** 무제한으로 바꾸기 — 잠긴 티켓은 수량 증가만이라 무제한 → 수량 지정은 막는다(무제한 저장값 1,000,000 > 999,999) */
  limitedSupply: boolean;
};

export function ticketFieldLocksOf(
  values: TicketFormValues,
  ticket: Pick<TicketItemManage, 'isSold' | 'hasPendingOrders' | 'supplyCount'> | null,
): TicketFieldLocks {
  const locked = ticket !== null && isTicketLocked(ticket);
  return {
    locked,
    quantityPublic: values.unlimited,
    approval: locked || values.payType === 'DUDOONG',
    limitedSupply: locked && ticket?.supplyCount === null,
  };
}

// ─── 칸 검사 ─────────────────────────────────────────────────

export type TicketFormField =
  | 'payType'
  | 'name'
  | 'description'
  | 'price'
  | 'supplyCount'
  | 'purchaseLimit'
  | 'bankCode'
  | 'accountHolder'
  | 'accountNumber'
  | 'saleStart'
  | 'saleEnd';
export type TicketFormErrors = Partial<Record<TicketFormField, string>>;

const DIGITS = /^\d+$/;
const readInt = (raw: string) => (DIGITS.test(raw.trim()) ? Number(raw.trim()) : null);

/** 판매 기간 → `{saleStartAt, saleEndAt}`(null = 등록 즉시 / 공연 시작까지). 칸이 틀리면 `'invalid'` */
export function salePeriodOf(v: TicketFormValues): {
  saleStartAt: string | null | 'invalid';
  saleEndAt: string | null | 'invalid';
} {
  if (!v.salePeriod) return { saleStartAt: null, saleEndAt: null };
  return {
    saleStartAt: v.saleStartNow
      ? null
      : (toServerDateTime(v.saleStartDate, v.saleStartTime) ?? 'invalid'),
    saleEndAt: toServerDateTime(v.saleEndDate, v.saleEndTime) ?? 'invalid',
  };
}

/** 계좌 칸을 고쳤는지(수정 폼). 만들 때와 무료 → 두둥 전환은 언제나 보낸다 */
export function isAccountChanged(base: TicketFormValues | null, v: TicketFormValues) {
  if (!base || base.payType !== 'DUDOONG') return true;
  return (
    base.bankCode !== v.bankCode ||
    base.accountHolder.trim() !== v.accountHolder.trim() ||
    base.accountNumber.trim() !== v.accountNumber.trim()
  );
}

export type TicketFormContext = {
  /** 수정이면 처음 값(이름·설명 길이는 바뀐 때만 — v1의 긴 이름을 그대로 둘 수 있다), 만들기면 null */
  base: TicketFormValues | null;
  /** 수정이면 그 티켓(잠김·수량 감소 판정) */
  ticket: Pick<TicketItemManage, 'isSold' | 'hasPendingOrders' | 'supplyCount'> | null;
  /** 공연 시작(GE-3) */
  eventStartAt: string | null;
  /** 지금(`yyyy.MM.dd HH:mm`) — 새로 정한 판매 종료는 지금 이후 */
  now: string;
  /** 은행 목록 코드(받았으면 목록에 없는 코드도 막는다) */
  bankCodes?: readonly string[];
  /** 수정하는 티켓에 유료 옵션이 붙어 있는지(무료로 바꿀 수 없다 — `Item_Option_Group_400_4`) */
  hasPaidOption?: boolean;
};

export const TICKET_FORM_MESSAGE = {
  paidOptionOnFree: '추가금이 있는 옵션이 붙어 있어 무료 티켓으로 바꿀 수 없어요',
  nameRequired: '티켓 이름을 입력해 주세요',
  nameTooLong: `티켓 이름은 ${TICKET_NAME_MAX}자까지 쓸 수 있어요`,
  descriptionTooLong: `설명은 ${TICKET_DESCRIPTION_MAX}자까지 쓸 수 있어요`,
  price: `가격은 1원부터 ${TICKET_PRICE_MAX.toLocaleString('ko-KR')}원까지 입력할 수 있어요`,
  count: `1부터 ${TICKET_COUNT_MAX.toLocaleString('ko-KR')}까지 입력해 주세요`,
  supplyDecrease: '판매된 티켓은 수량을 늘리기만 할 수 있어요',
  bank: '은행을 골라 주세요',
  accountHolder: `예금주를 입력해 주세요(${TICKET_ACCOUNT_HOLDER_MAX}자까지)`,
  accountNumber: `계좌번호를 입력해 주세요(${TICKET_ACCOUNT_NUMBER_MAX}자까지)`,
  dateTime: '날짜와 시각을 입력해 주세요',
  startAfterEnd: '판매 시작은 판매 종료보다 빨라야 해요',
  startAfterEvent: '판매 시작은 공연 시작보다 빨라야 해요',
  endAfterEvent: '판매 종료는 공연 시작 전이어야 해요',
  endPassed: '판매 종료는 지금 이후여야 해요',
} as const;

/**
 * 칸 오류. 서버 검사와 같은 규칙을 먼저 막는다. 잠긴 칸(결제 방식·이름·가격·계좌·승인)은 바꿀 수 없으니 검사하지 않는다.
 * 계좌는 고쳤을 때만(옛 자유 입력 은행명은 고치지 않으면 그대로 둔다)
 */
export function validateTicketForm(v: TicketFormValues, ctx: TicketFormContext): TicketFormErrors {
  const errors: TicketFormErrors = {};
  const { base, ticket } = ctx;
  const locked = ticket !== null && isTicketLocked(ticket);

  if (v.payType === 'FREE' && base?.payType !== 'FREE' && ctx.hasPaidOption) {
    errors.payType = TICKET_FORM_MESSAGE.paidOptionOnFree;
  }
  const name = v.name.trim();
  if (!name) errors.name = TICKET_FORM_MESSAGE.nameRequired;
  else if ((!base || base.name.trim() !== name) && name.length > TICKET_NAME_MAX) {
    errors.name = TICKET_FORM_MESSAGE.nameTooLong;
  }
  const description = v.description.trim();
  if (
    description &&
    (!base || base.description.trim() !== description) &&
    description.length > TICKET_DESCRIPTION_MAX
  ) {
    errors.description = TICKET_FORM_MESSAGE.descriptionTooLong;
  }

  if (v.payType === 'DUDOONG') {
    const price = readInt(v.price);
    if (price === null || price < 1 || price > TICKET_PRICE_MAX) {
      errors.price = TICKET_FORM_MESSAGE.price;
    }
    if (isAccountChanged(base, v)) {
      if (!v.bankCode || (ctx.bankCodes && !ctx.bankCodes.includes(v.bankCode))) {
        errors.bankCode = TICKET_FORM_MESSAGE.bank;
      }
      const holder = v.accountHolder.trim();
      if (!holder || holder.length > TICKET_ACCOUNT_HOLDER_MAX) {
        errors.accountHolder = TICKET_FORM_MESSAGE.accountHolder;
      }
      const number = v.accountNumber.trim();
      if (!number || number.length > TICKET_ACCOUNT_NUMBER_MAX) {
        errors.accountNumber = TICKET_FORM_MESSAGE.accountNumber;
      }
    }
  }

  if (!v.unlimited) {
    const supply = readInt(v.supplyCount);
    if (supply === null || supply < 1 || supply > TICKET_COUNT_MAX) {
      errors.supplyCount = TICKET_FORM_MESSAGE.count;
    } else if (locked && (ticket.supplyCount === null || supply < ticket.supplyCount)) {
      errors.supplyCount = TICKET_FORM_MESSAGE.supplyDecrease;
    }
  }
  if (v.limitPurchase) {
    const limit = readInt(v.purchaseLimit);
    if (limit === null || limit < 1 || limit > TICKET_COUNT_MAX) {
      errors.purchaseLimit = TICKET_FORM_MESSAGE.count;
    }
  }

  const { saleStartAt: start, saleEndAt: end } = salePeriodOf(v);
  if (start === 'invalid') errors.saleStart = TICKET_FORM_MESSAGE.dateTime;
  if (end === 'invalid') errors.saleEnd = TICKET_FORM_MESSAGE.dateTime;
  if (start !== 'invalid' && end !== 'invalid') {
    const eventStart = ctx.eventStartAt;
    const baseEnd = base ? salePeriodOf(base).saleEndAt : null;
    if (start && end && !(start < end)) errors.saleStart = TICKET_FORM_MESSAGE.startAfterEnd;
    else if (start && eventStart && !(start < eventStart)) {
      errors.saleStart = TICKET_FORM_MESSAGE.startAfterEvent;
    }
    if (end && eventStart && end > eventStart) errors.saleEnd = TICKET_FORM_MESSAGE.endAfterEvent;
    else if (end && end !== baseEnd && !(end > ctx.now)) {
      errors.saleEnd = TICKET_FORM_MESSAGE.endPassed;
    }
  }
  return errors;
}

export const hasTicketFormErrors = (e: TicketFormErrors) =>
  Object.values(e).some((m) => m !== undefined);

// ─── 본문 ────────────────────────────────────────────────────

/**
 * 동의 칸(#840 · #873). **값을 만들 칸(호스트 환불 의무 동의 체크)이 v2 계획에 없다 — design-requests Q42.**
 * 칸이 정해질 때까지 `false`로 두고 사용자가 체크한 값(`refundObligationAgreed`)만 싣는다(지금은 체크할 칸이 없어 보내지 않는다).
 * 칸이 생기면 이 값을 `true`로 바꾼다 — 그때부터 동의 전 저장을 막는다(`needsRefundObligation`)
 */
export const REFUND_OBLIGATION_FIELD = false;

export type TicketAgreements = { refundObligationAgreed: boolean };

/**
 * 환불 의무 동의가 필요한 저장인지 — 두둥 티켓 만들기(P10/T-2), 무료 → 두둥으로 바꾸는 수정(P10/T-3, #873 dev cb8d24e).
 * 이미 두둥인 티켓의 수정·무료 티켓에는 없다(서버가 검사·기록하지 않는다)
 */
export const needsRefundObligation = (base: TicketFormValues | null, v: TicketFormValues) =>
  v.payType === 'DUDOONG' && (base === null || base.payType !== 'DUDOONG');

const refundFields = (
  base: TicketFormValues | null,
  v: TicketFormValues,
  agreements: TicketAgreements,
) =>
  needsRefundObligation(base, v)
    ? agreementFields({ refundObligationAgreed: agreements.refundObligationAgreed })
    : {};

const accountBody = (v: TicketFormValues): TicketAccountRequest => ({
  bankCode: v.bankCode,
  accountHolder: v.accountHolder.trim(),
  accountNumber: v.accountNumber.trim(),
});

/** P10/T-2 본문. '값 없음'은 키를 넣지 않는다. 칸 오류가 없는 값으로만 부른다 */
export function toCreateTicketBody(
  values: TicketFormValues,
  agreements: TicketAgreements,
): CreateTicketItemRequest {
  const v = normalizeTicketForm(values);
  const { saleStartAt, saleEndAt } = salePeriodOf(v);
  const description = v.description.trim();
  const dudoong = v.payType === 'DUDOONG';
  return {
    payType: v.payType,
    name: v.name.trim(),
    ...(description && { description }),
    price: dudoong ? Number(v.price.trim()) : 0,
    ...(!v.unlimited && { supplyCount: Number(v.supplyCount.trim()) }),
    ...(dudoong && { account: accountBody(v) }),
    approvalRequired: v.approvalRequired,
    isQuantityPublic: v.isQuantityPublic,
    ...(v.limitPurchase && { purchaseLimit: Number(v.purchaseLimit.trim()) }),
    ...(saleStartAt && saleStartAt !== 'invalid' && { saleStartAt }),
    ...(saleEndAt && saleEndAt !== 'invalid' && { saleEndAt }),
    ...refundFields(null, v, agreements),
  };
}

/**
 * P10/T-3 본문 — 처음 값과 다른 필드만, 비우는 필드는 `clear[]`(같은 필드에 값과 clear를 같이 넣지 않는다). 결제 방식을 바꾸면
 * 가격을 같이(무료 = 0). 계좌는 고쳤을 때만 세 값을 통째로(두둥일 때). 바뀐 것이 없으면 null
 */
export function toUpdateTicketBody(
  base: TicketFormValues,
  values: TicketFormValues,
  agreements: TicketAgreements,
): UpdateTicketItemRequest | null {
  const b = normalizeTicketForm(base);
  const v = normalizeTicketForm(values);
  const body: UpdateTicketItemRequest = {};
  const clear: TicketClearableField[] = [];

  const payTypeChanged = b.payType !== v.payType;
  if (payTypeChanged) body.payType = v.payType;
  if (b.name.trim() !== v.name.trim()) body.name = v.name.trim();
  const description = v.description.trim();
  if (b.description.trim() !== description) {
    if (description) body.description = description;
    else clear.push('DESCRIPTION');
  }
  const price = v.payType === 'DUDOONG' ? Number(v.price.trim()) : 0;
  const basePrice = b.payType === 'DUDOONG' ? Number(b.price.trim()) : 0;
  if (payTypeChanged || price !== basePrice) body.price = price;

  if (
    b.unlimited !== v.unlimited ||
    (!v.unlimited && b.supplyCount.trim() !== v.supplyCount.trim())
  ) {
    if (v.unlimited) clear.push('SUPPLY_COUNT');
    else body.supplyCount = Number(v.supplyCount.trim());
  }
  if (b.isQuantityPublic !== v.isQuantityPublic) body.isQuantityPublic = v.isQuantityPublic;
  if (
    b.limitPurchase !== v.limitPurchase ||
    (v.limitPurchase && b.purchaseLimit.trim() !== v.purchaseLimit.trim())
  ) {
    if (v.limitPurchase) body.purchaseLimit = Number(v.purchaseLimit.trim());
    else clear.push('PURCHASE_LIMIT');
  }
  if (v.payType === 'FREE' && b.approvalRequired !== v.approvalRequired) {
    body.approvalRequired = v.approvalRequired;
  }
  if (v.payType === 'DUDOONG' && isAccountChanged(b, v)) body.account = accountBody(v);

  const bp = salePeriodOf(b);
  const vp = salePeriodOf(v);
  for (const [field, key, before, after] of [
    ['SALE_START_AT', 'saleStartAt', bp.saleStartAt, vp.saleStartAt],
    ['SALE_END_AT', 'saleEndAt', bp.saleEndAt, vp.saleEndAt],
  ] as const) {
    if (before === after || after === 'invalid') continue;
    if (after === null) clear.push(field);
    else body[key] = after;
  }
  if (clear.length > 0) body.clear = clear;
  if (Object.keys(body).length === 0) return null;
  return { ...body, ...refundFields(b, v, agreements) };
}

/** 바뀐 것이 있는지(수정 폼). 만들기 폼은 늘 true */
export const isTicketFormDirty = (base: TicketFormValues | null, v: TicketFormValues) =>
  base === null || toUpdateTicketBody(base, v, { refundObligationAgreed: false }) !== null;

// ─── 서버 오류 → 칸 ─────────────────────────────────────────

/** 칸에 붙이는 서버 코드(patterns §24 P12). 그 칸을 고치면 지운다 */
export const TICKET_FIELD_ERRORS = {
  Ticket_Item_400_3: { field: 'price', message: '가격을 확인해 주세요(두둥 티켓은 1원 이상)' },
  Ticket_Item_400_8: { field: 'bankCode', message: '입금 계좌를 입력해 주세요' },
  Ticket_Item_400_13: { field: 'saleEnd', message: '판매 기간을 확인해 주세요' },
  Ticket_Item_400_2: { field: 'supplyCount', message: TICKET_FORM_MESSAGE.count },
} as const satisfies Record<string, { field: TicketFormField; message: string }>;

/** 폼 전체에 띄우는 서버 코드 문구(잠정 — V에서 디자인 문구로) */
export const TICKET_FORM_ERRORS = {
  Ticket_Item_400_12: '티켓 없는 공연에는 티켓을 만들 수 없어요',
  Ticket_Item_400_14:
    '판매되었거나 승인 대기 주문이 있는 티켓은 설명·판매 기간·재고 공개·매수 제한·수량 늘리기만 할 수 있어요',
  Ticket_Item_400_15: '입력한 값의 조합을 확인해 주세요',
  Ticket_Item_400_11: '이 티켓은 두둥 티켓·무료 티켓이 아니라 고칠 수 없어요',
  Item_Option_Group_400_4: '추가금이 있는 옵션이 붙은 티켓은 무료 티켓으로 바꿀 수 없어요',
  Agreement_400_1: '필수 동의를 확인해 주세요',
  Event_400_17: '끝난 공연은 수정할 수 없어요',
  Ticket_Item_404_1: '티켓을 찾을 수 없어요. 목록을 다시 불러왔어요',
} as const;
