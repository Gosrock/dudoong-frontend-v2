import { http } from 'msw';

import { OPTION_DESCRIPTION_MAX, OPTION_NAME_MAX, OPTION_PRICE_MAX } from '../option/schema';
import { AGREEMENT_VERSION_MAX } from '../shared/agreement';
import { isKstDateTime } from '../shared/date';
import {
  TICKET_ACCOUNT_HOLDER_MAX,
  TICKET_ACCOUNT_NUMBER_MAX,
  TICKET_BANK_NAME_MAX,
  TICKET_CLEARABLE_FIELDS,
  TICKET_COUNT_MAX,
  TICKET_DESCRIPTION_MAX,
  TICKET_NAME_MAX,
  TICKET_OPTIONS_MAX,
  TICKET_PRICE_MAX,
  type TicketClearableField,
  type TicketOptionType,
  type TicketPayType,
} from '../ticket-item/schema';
import { mockNow, type StoredEvent } from './event-store';
import { banks } from './fixtures/bank';
import { guard, isEditable } from './hosting-event.handlers';
import { errors, fail, ok, readId, requireAuth } from './respond';
import {
  createOption,
  createTicket,
  hasNoPurchaseLimit,
  hasPaidOption,
  isLocked,
  isSold,
  isTicketAgreementEnforced,
  isUnlimited,
  NO_PURCHASE_LIMIT,
  optionsOfEvent,
  removeOption,
  removeTicket,
  saveOption,
  saveTicket,
  type StoredAccount,
  type StoredOption,
  storedOption,
  type StoredTicket,
  storedTicket,
  ticketsOfEvent,
  ticketsWithOption,
  toManageOption,
  toManageTicket,
  UNLIMITED_SUPPLY,
} from './ticket-store';

/**
 * 티켓·옵션 관리(P12) — G10/T-1 · P10/T-2 · T-3 · D10/T-4 · T-5 · T-6 · G10/O-1 · P10/O-2 · O-3 · D10/O-4 · P10/O-5.
 * GP-5(관객)는 `event.handlers.ts`가 같은 저장소(`ticket-store.ts`)를 읽는다. 은행 목록은 `bank.handlers.ts`.
 * 기준: 백엔드 `V2TicketItemController`·`V2TicketOptionController`·`V2*UseCase`·`V2TicketItemRequest`·`V2TicketOptionRequest`·
 * `V2TicketItemDomainService`·`V2TicketOptionDomainService`·`TicketItem`·`TicketItemErrorCode`·`AgreementService`(432cce4 → dev cb8d24e).
 *
 * 검사 순서(백엔드와 같게): 로그인 401 → 경로 id → 본문 Bean Validation(`@Valid`, 컨트롤러 단계라 권한보다 먼저) 400 `BAD_REQUEST` →
 * `@HostRolesAllowed`(공연 404 · 비멤버 403 `HOST_400_2` · 매니저 미만 403 `HOST_400_1`) → 유스케이스·도메인 순서(각 핸들러 주석).
 */

/** 티켓·옵션 에러 코드(`TicketItemErrorCode`·`EventErrorCode`·`AgreementErrorCode`). 같은 코드에 사유가 둘인 `400_15`는 상황별로 */
export const TICKET_ERROR_REASONS = {
  Ticket_Item_404_1: '티켓 아이템을 찾을 수 없습니다.',
  Option_Group_404_1: '옵션그룹을 찾을 수 없습니다.',
  Ticket_Item_400_2: '티켓 아이템 재고가 0보다 작을 수 없습니다.',
  Ticket_Item_400_3: '설정할 수 없는 티켓 가격입니다.',
  Ticket_Item_400_7: '티켓상품 삭제가 불가능한 상태입니다.',
  Ticket_Item_400_8: '계좌정보가 필요합니다.',
  Ticket_Item_400_11: 'v2 에서는 두둥티켓·무료티켓만 만들거나 수정할 수 있습니다.',
  Ticket_Item_400_12: '티켓 없음 공연에는 티켓을 만들 수 없습니다.',
  Ticket_Item_400_13: '판매 기간이 올바르지 않습니다.',
  Ticket_Item_400_14:
    '판매된 티켓은 설명·판매기간·재고공개·매수제한·수량 증가만 수정할 수 있습니다.',
  Ticket_Item_400_15: '티켓 입력값이 올바르지 않습니다.',
  Option_Group_400_1: '해당 이벤트 소속 옵션그룹이 아닙니다.',
  Option_Group_400_2: '옵션그룹 삭제가 불가능한 상태입니다.',
  Option_Group_400_3: '설정할 수 없는 추가 가격입니다.',
  Option_Group_400_4: 'v2 에서는 주관식·네/아니오 옵션만 만들 수 있습니다.',
  Option_Group_400_5: '판매된 티켓에 붙은 옵션은 이름·설명만 수정할 수 있습니다.',
  Option_Group_400_6: '옵션 설명은 50자까지 입력할 수 있습니다.',
  Item_Option_Group_400_2: '옵션 변경이 불가능한 상태입니다.',
  Item_Option_Group_400_4: '유료 옵션을 적용할 수 없습니다.',
  Event_400_17: '종료된 공연은 수정할 수 없습니다.',
  Agreement_400_1: '필수 동의 또는 확인이 필요합니다.',
} as const;
export type TicketErrorCode = keyof typeof TICKET_ERROR_REASONS;

/** 명시적 null(`TICKET_ITEM_NULL_FIELD`)은 같은 `Ticket_Item_400_15`지만 사유가 다르다 */
const NULL_FIELD_REASON =
  '값을 비우려면 null 대신 clear 에 필드 이름을 넣어 주세요 (무제한·제한 없음·등록 즉시·공연 시작까지·설명 없음).';

const ticketError = (request: Request, code: TicketErrorCode) =>
  fail(request, code.includes('404') ? 404 : 400, code, TICKET_ERROR_REASONS[code]);

const MAX_PRICE = TICKET_PRICE_MAX;
/** DTO 원문 상한(컬럼 varchar(255)) — 이름·설명 길이 규칙은 도메인에서 값이 바뀔 때만 */
const RAW_TEXT_MAX = 255;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const has = (o: Record<string, unknown>, k: string) => o[k] !== undefined && o[k] !== null;
const inRange = (v: number, min: number, max: number) => v >= min && v <= max;

const PAY_TYPES: readonly TicketPayType[] = ['DUDOONG', 'FREE', 'PRICE'];
const OPTION_TYPES: readonly TicketOptionType[] = ['SUBJECTIVE', 'YES_NO', 'MULTIPLE_CHOICE'];

// ─── 본문 읽기(Bean Validation → 400 BAD_REQUEST) ───────────

type AccountInput = {
  bankName: string | null;
  bankCode: string | null;
  accountHolder: string;
  accountNumber: string;
};

/** `V2TicketAccountRequest` — 은행명 30자, 예금주·계좌번호 `@NotBlank` 30·50자, 모르는 코드·은행 없음 `@AssertTrue` */
function readAccount(v: unknown): AccountInput | 'invalid' {
  if (!isObject(v)) return 'invalid';
  const { bankName, bankCode, accountHolder, accountNumber } = v;
  if (bankName != null && (!isText(bankName) || bankName.length > TICKET_BANK_NAME_MAX))
    return 'invalid';
  if (bankCode != null && !isText(bankCode)) return 'invalid';
  if (
    !isText(accountHolder) ||
    !accountHolder.trim() ||
    accountHolder.length > TICKET_ACCOUNT_HOLDER_MAX
  )
    return 'invalid';
  if (
    !isText(accountNumber) ||
    !accountNumber.trim() ||
    accountNumber.length > TICKET_ACCOUNT_NUMBER_MAX
  )
    return 'invalid';
  // 알 수 없는 은행 코드(`BankCode.fromCode` — 앞뒤 공백은 지우고 본다)
  if (isText(bankCode) && !banks.some((b) => b.code === bankCode.trim())) return 'invalid';
  // 은행명 또는 은행 코드
  if (bankCode == null && !(isText(bankName) && bankName.trim())) return 'invalid';
  return {
    bankName: isText(bankName) ? bankName : null,
    bankCode: isText(bankCode) ? bankCode.trim() : null,
    accountHolder,
    accountNumber,
  };
}

/** 요청 계좌 → 저장 계좌. `bankCode`가 있으면 그 표시 이름(`bankName`은 무시) */
const toStoredAccount = (a: AccountInput): StoredAccount => ({
  bankName: banks.find((b) => b.code === a.bankCode)?.name ?? a.bankName ?? '',
  accountHolder: a.accountHolder,
  accountNumber: a.accountNumber,
});

/** T-2·T-3 공통 필드 모양 검사. `required`면 `@NotNull`·`@NotBlank` 필드가 있어야 한다(T-2) */
type TicketFields = {
  payType?: TicketPayType;
  name?: string;
  description?: string;
  price?: number;
  supplyCount?: number;
  account?: AccountInput;
  approvalRequired?: boolean;
  isQuantityPublic?: boolean;
  purchaseLimit?: number;
  saleStartAt?: string;
  saleEndAt?: string;
  clear?: TicketClearableField[];
  refundObligationAgreed?: boolean;
  agreementVersion?: string;
};

function readTicketFields(body: unknown, mode: 'create' | 'update'): TicketFields | null {
  if (!isObject(body)) return null;
  const out: TicketFields = {};
  const b = body;
  if (has(b, 'payType')) {
    if (!PAY_TYPES.includes(b.payType as TicketPayType)) return null;
    out.payType = b.payType as TicketPayType;
  } else if (mode === 'create') return null;
  if (has(b, 'name')) {
    if (!isText(b.name) || b.name.length > RAW_TEXT_MAX) return null;
    if (mode === 'create' && !b.name.trim()) return null;
    out.name = b.name;
  } else if (mode === 'create') return null;
  if (has(b, 'description')) {
    if (!isText(b.description) || b.description.length > RAW_TEXT_MAX) return null;
    out.description = b.description;
  }
  if (has(b, 'price')) {
    if (!isInt(b.price) || !inRange(b.price, 0, MAX_PRICE)) return null;
    out.price = b.price;
  } else if (mode === 'create') return null;
  for (const k of ['supplyCount', 'purchaseLimit'] as const) {
    if (!has(b, k)) continue;
    const v = b[k];
    if (!isInt(v) || !inRange(v, 1, TICKET_COUNT_MAX)) return null;
    out[k] = v;
  }
  if (has(b, 'account')) {
    const account = readAccount(b.account);
    if (account === 'invalid') return null;
    out.account = account;
  }
  for (const k of ['approvalRequired', 'isQuantityPublic'] as const) {
    if (has(b, k)) {
      if (typeof b[k] !== 'boolean') return null;
      out[k] = b[k] as boolean;
    } else if (mode === 'create') return null;
  }
  for (const k of ['saleStartAt', 'saleEndAt'] as const) {
    if (!has(b, k)) continue;
    const v = b[k];
    if (!isText(v) || !isKstDateTime(v)) return null;
    out[k] = v;
  }
  // T-2 DTO에는 `clear`가 없다 — 모르는 키는 무시(Jackson 기본)
  if (mode === 'update' && has(b, 'clear')) {
    if (!Array.isArray(b.clear) || b.clear.length > 5) return null;
    if (!b.clear.every((c) => (TICKET_CLEARABLE_FIELDS as readonly unknown[]).includes(c)))
      return null;
    out.clear = [...new Set(b.clear as TicketClearableField[])];
  }
  if (has(b, 'refundObligationAgreed')) {
    if (typeof b.refundObligationAgreed !== 'boolean') return null;
    out.refundObligationAgreed = b.refundObligationAgreed;
  }
  if (has(b, 'agreementVersion')) {
    if (!isText(b.agreementVersion) || b.agreementVersion.length > AGREEMENT_VERSION_MAX)
      return null;
    out.agreementVersion = b.agreementVersion;
  }
  return out;
}

/** T-3에서 명시적 null을 받지 않는 키(`CLEARABLE_KEYS`) */
const CLEARABLE_KEYS = ['supplyCount', 'purchaseLimit', 'saleStartAt', 'saleEndAt', 'description'];

// ─── 도메인 검사(`V2TicketItemDomainService.validateForm`) ───

/** 생성 폼 / 수정 때 현재 값에 patch를 덮은 폼(`V2TicketItemForm`). null = 값 없음 */
type TicketForm = {
  payType: TicketPayType;
  name: string;
  description: string | null;
  price: number;
  supplyCount: number | null;
  account: StoredAccount | null;
  approvalRequired: boolean;
  isQuantityPublic: boolean;
  purchaseLimit: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
};

/** 이름·설명 trim, 빈 설명 → null, 두둥은 승인 필수 + 계좌 유지, 그 밖은 계좌 없음(`normalize`) */
const normalize = (f: TicketForm): TicketForm => ({
  ...f,
  name: f.name.trim(),
  description: f.description?.trim() || null,
  account:
    f.payType === 'DUDOONG' && f.account
      ? {
          bankName: f.account.bankName.trim(),
          accountHolder: f.account.accountHolder.trim(),
          accountNumber: f.account.accountNumber.trim(),
        }
      : null,
  approvalRequired: f.payType === 'DUDOONG' || f.approvalRequired,
});

/** 검사 순서: 결제 방식별 가격·계좌 → 이름 → 설명 → 수량 → 매수 제한 → 무제한 + 재고 공개 → 판매 기간 */
function validateForm(
  f: TicketForm,
  event: StoredEvent,
  current: StoredTicket | null,
  now: string,
): TicketErrorCode | null {
  if (f.payType === 'DUDOONG') {
    if (f.price <= 0 || f.price > MAX_PRICE) return 'Ticket_Item_400_3';
    const a = f.account;
    if (!a || !a.bankName || !a.accountNumber || !a.accountHolder) return 'Ticket_Item_400_8';
  } else if (f.payType === 'FREE') {
    if (f.price !== 0) return 'Ticket_Item_400_3';
  } else return 'Ticket_Item_400_11';
  if (!f.name) return 'Ticket_Item_400_15';
  if ((!current || current.name.trim() !== f.name) && f.name.length > TICKET_NAME_MAX)
    return 'Ticket_Item_400_15';
  if (
    f.description !== null &&
    (!current || current.description?.trim() !== f.description) &&
    f.description.length > TICKET_DESCRIPTION_MAX
  ) {
    return 'Ticket_Item_400_15';
  }
  if (f.supplyCount !== null && !inRange(f.supplyCount, 1, TICKET_COUNT_MAX))
    return 'Ticket_Item_400_2';
  if (f.purchaseLimit !== null && !inRange(f.purchaseLimit, 1, TICKET_COUNT_MAX))
    return 'Ticket_Item_400_2';
  // 무제한 티켓은 재고 공개 불가
  if (f.supplyCount === null && f.isQuantityPublic) return 'Ticket_Item_400_15';
  // 판매 기간(`validateSalePeriod`): 시작 < 종료, 시작 < 공연 시작, 종료 ≤ 공연 시작, 새로 정한 종료는 지금 이후
  const start = event.startAt;
  if (!start) return 'Ticket_Item_400_13';
  const { saleStartAt: s, saleEndAt: e } = f;
  if (s && e && !(s < e)) return 'Ticket_Item_400_13';
  if (s && !(s < start)) return 'Ticket_Item_400_13';
  if (e && e > start) return 'Ticket_Item_400_13';
  if (e && e !== (current?.saleEndAt ?? null) && !(e > now)) return 'Ticket_Item_400_13';
  return null;
}

const sameAccount = (a: StoredAccount | null, b: StoredAccount | null) =>
  (a?.bankName ?? '').trim() === (b?.bankName ?? '').trim() &&
  (a?.accountNumber ?? '').trim() === (b?.accountNumber ?? '').trim() &&
  (a?.accountHolder ?? '').trim() === (b?.accountHolder ?? '').trim();

/** 동의 강제(`AgreementService.requireRefundObligation`) — 강제가 켜져 있고 `true`가 아니면 거부 */
const agreementMissing = (agreed: boolean | undefined) =>
  isTicketAgreementEnforced() && agreed !== true;

// ─── 옵션 본문 ───────────────────────────────────────────────

type OptionFields = {
  name?: string;
  description?: string;
  type?: TicketOptionType;
  yesAdditionalPrice?: number;
};

/** O-2(`V2CreateTicketOptionRequest`) / O-3(`V2UpdateTicketOptionRequest` — `type` 없음, 키 없음 = 변경 안 함) */
function readOptionFields(body: unknown, mode: 'create' | 'update'): OptionFields | null {
  if (!isObject(body)) return null;
  const out: OptionFields = {};
  const { name, description, type, yesAdditionalPrice } = body;
  if (name != null) {
    if (!isText(name) || !name.trim() || name.length > OPTION_NAME_MAX) return null;
    out.name = name;
  } else if (mode === 'create') return null;
  if (description != null) {
    // 컬럼 길이 255(`DESCRIPTION_COLUMN_LENGTH`) — 50자 규칙은 도메인(`Option_Group_400_6`)
    if (!isText(description) || !description.trim() || description.length > 255) return null;
    out.description = description;
  } else if (mode === 'create') return null;
  if (mode === 'create') {
    if (!OPTION_TYPES.includes(type as TicketOptionType)) return null;
    out.type = type as TicketOptionType;
  }
  if (yesAdditionalPrice != null) {
    if (!isInt(yesAdditionalPrice) || !inRange(yesAdditionalPrice, 0, OPTION_PRICE_MAX))
      return null;
    out.yesAdditionalPrice = yesAdditionalPrice;
  }
  return out;
}

/** 추가금 검사(`validatePrice`): 네/아니오 0~상한(없으면 0), 주관식은 0만, 객관식은 만들 수 없다 */
function optionPrice(type: TicketOptionType, price: number | undefined): number | TicketErrorCode {
  if (type === 'YES_NO') {
    const p = price ?? 0;
    return inRange(p, 0, OPTION_PRICE_MAX) ? p : 'Option_Group_400_3';
  }
  if (type === 'SUBJECTIVE') return price !== undefined && price !== 0 ? 'Option_Group_400_3' : 0;
  return 'Option_Group_400_4';
}

// ─── 핸들러 ──────────────────────────────────────────────────

const view = (t: StoredTicket, event: StoredEvent) => toManageTicket(t, event, mockNow());

/** 이 공연의 유효 티켓(다른 공연 티켓 id는 존재를 숨기는 404) */
const ticketIn = (eventId: number, raw: unknown) => {
  const id = readId(raw);
  const t = id === null ? undefined : storedTicket(id);
  return t && t.eventId === eventId ? t : undefined;
};
/** 이 공연의 유효 옵션(다른 공연 옵션 id는 404 — `queryOptionGroup(eventId, id)`) */
const optionIn = (eventId: number, raw: unknown) => {
  const id = readId(raw);
  const o = id === null ? undefined : storedOption(id);
  return o && o.eventId === eventId ? o : undefined;
};

/** 경로 id 타입 오류는 권한보다 먼저(Spring 인자 변환) */
const badPath = (request: Request, ...ids: unknown[]) =>
  ids.some((v) => readId(v) === null) ? errors.typeMismatch(request) : null;

const body = (request: Request) => request.json().catch(() => undefined) as Promise<unknown>;

/** 기본 목록에 들어가는 핸들러(`handlers.ts`) */
export const hostingTicketHandlers = [
  // G10/T-1 — 일반 멤버 이상
  http.get('*/api/v2/events/:eventId/ticket-items/manage', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    return ok(ticketsOfEvent(g.event.eventId).map((t) => view(t, g.event)));
  }),

  // P10/T-2 — 본문 → 권한 → 동의 → 수정 가능 → 티켓 없음 공연 → 폼 검사
  http.post('*/api/v2/events/:eventId/ticket-items', async ({ request, params, cookies }) => {
    const denied = requireAuth(request, cookies) ?? badPath(request, params.eventId);
    if (denied) return denied;
    const f = readTicketFields(await body(request), 'create');
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (f.payType === 'DUDOONG' && agreementMissing(f.refundObligationAgreed)) {
      return ticketError(request, 'Agreement_400_1');
    }
    if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
    if (!g.event.hasTicket) return ticketError(request, 'Ticket_Item_400_12');
    const form = normalize({
      payType: f.payType!,
      name: f.name!,
      description: f.description ?? null,
      price: f.price!,
      supplyCount: f.supplyCount ?? null,
      account: f.account ? toStoredAccount(f.account) : null,
      approvalRequired: f.approvalRequired!,
      isQuantityPublic: f.isQuantityPublic!,
      purchaseLimit: f.purchaseLimit ?? null,
      saleStartAt: f.saleStartAt ?? null,
      saleEndAt: f.saleEndAt ?? null,
    });
    const code = validateForm(form, g.event, null, mockNow());
    if (code) return ticketError(request, code);
    const supply = form.supplyCount ?? UNLIMITED_SUPPLY;
    const created = createTicket({
      eventId: g.event.eventId,
      payType: form.payType,
      name: form.name,
      description: form.description,
      price: form.price,
      supplyCount: supply,
      quantity: supply,
      purchaseLimit: form.purchaseLimit ?? NO_PURCHASE_LIMIT,
      approvalRequired: form.approvalRequired,
      isQuantityPublic: form.isQuantityPublic,
      saleStartAt: form.saleStartAt,
      saleEndAt: form.saleEndAt,
      isSellable: true,
      pendingApproveCount: 0,
      account: form.account,
      optionIds: [],
    });
    return ok(view(created, g.event));
  }),

  // P10/T-3 — 본문 → 권한 → 명시적 null → 티켓 404 → 수정 가능 → (무료 → 두둥) 동의 → clear 충돌 → PG 티켓 → 폼 검사 → 잠금 → 유료 옵션
  http.patch(
    '*/api/v2/events/:eventId/ticket-items/:ticketItemId',
    async ({ request, params, cookies }) => {
      const denied =
        requireAuth(request, cookies) ?? badPath(request, params.eventId, params.ticketItemId);
      if (denied) return denied;
      const raw = await body(request);
      const p = readTicketFields(raw, 'update');
      if (!p) return errors.badRequest(request);
      const g = guard(request, cookies, params.eventId, 'MANAGER');
      if ('response' in g) return g.response;
      const explicitNull = CLEARABLE_KEYS.some((k) => isObject(raw) && k in raw && raw[k] === null);
      if (explicitNull) return fail(request, 400, 'Ticket_Item_400_15', NULL_FIELD_REASON);
      const item = ticketIn(g.event.eventId, params.ticketItemId);
      if (!item) return ticketError(request, 'Ticket_Item_404_1');
      if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
      const toDudoong = p.payType === 'DUDOONG' && item.payType !== 'DUDOONG';
      if (toDudoong && agreementMissing(p.refundObligationAgreed)) {
        return ticketError(request, 'Agreement_400_1');
      }
      // mergedForm — clear 대상에 값도 보내면 400
      const clear = new Set(p.clear ?? []);
      const pick = <T>(field: TicketClearableField, value: T | undefined, current: T | null) => {
        if (clear.has(field)) return value !== undefined ? 'conflict' : null;
        return value ?? current;
      };
      const description = pick('DESCRIPTION', p.description, item.description);
      const supplyCount = pick(
        'SUPPLY_COUNT',
        p.supplyCount,
        isUnlimited(item) ? null : item.supplyCount,
      );
      const purchaseLimit = pick(
        'PURCHASE_LIMIT',
        p.purchaseLimit,
        hasNoPurchaseLimit(item) ? null : item.purchaseLimit,
      );
      const saleStartAt = pick('SALE_START_AT', p.saleStartAt, item.saleStartAt);
      const saleEndAt = pick('SALE_END_AT', p.saleEndAt, item.saleEndAt);
      if ([description, supplyCount, purchaseLimit, saleStartAt, saleEndAt].includes('conflict')) {
        return ticketError(request, 'Ticket_Item_400_15');
      }
      if (item.payType === 'PRICE') return ticketError(request, 'Ticket_Item_400_11');
      const form = normalize({
        payType: p.payType ?? item.payType,
        name: p.name ?? item.name,
        description: description as string | null,
        price: p.price ?? item.price,
        supplyCount: supplyCount as number | null,
        account: p.account ? toStoredAccount(p.account) : item.account,
        approvalRequired: p.approvalRequired ?? item.approvalRequired,
        isQuantityPublic: p.isQuantityPublic ?? item.isQuantityPublic,
        purchaseLimit: purchaseLimit as number | null,
        saleStartAt: saleStartAt as string | null,
        saleEndAt: saleEndAt as string | null,
      });
      const code = validateForm(form, g.event, item, mockNow());
      if (code) return ticketError(request, code);
      const newSupply =
        form.supplyCount ?? (isUnlimited(item) ? item.supplyCount : UNLIMITED_SUPPLY);
      const nameChanged = item.name.trim() !== form.name;
      if (isLocked(item)) {
        const lockedChanged =
          item.payType !== form.payType ||
          nameChanged ||
          item.price !== form.price ||
          item.approvalRequired !== form.approvalRequired ||
          !sameAccount(item.account, form.account);
        if (lockedChanged || newSupply < item.supplyCount) {
          return ticketError(request, 'Ticket_Item_400_14');
        }
      }
      if (form.payType === 'FREE' && hasPaidOption(item)) {
        return ticketError(request, 'Item_Option_Group_400_4');
      }
      const updated: StoredTicket = {
        ...item,
        payType: form.payType,
        name: nameChanged ? form.name : item.name,
        description: form.description,
        price: form.price,
        approvalRequired: form.approvalRequired,
        account: form.account,
        isQuantityPublic: form.isQuantityPublic,
        purchaseLimit:
          form.purchaseLimit ?? (hasNoPurchaseLimit(item) ? item.purchaseLimit : NO_PURCHASE_LIMIT),
        saleStartAt: form.saleStartAt,
        saleEndAt: form.saleEndAt,
        supplyCount: newSupply,
        quantity: item.quantity + (newSupply - item.supplyCount),
      };
      saveTicket(updated);
      return ok(view(updated, g.event));
    },
  ),

  // D10/T-4 — 권한 → 수정 가능 → 티켓 404 → 승인 대기 → 재고 감소 → 남은 목록
  http.delete(
    '*/api/v2/events/:eventId/ticket-items/:ticketItemId',
    ({ request, params, cookies }) => {
      const denied =
        requireAuth(request, cookies) ?? badPath(request, params.eventId, params.ticketItemId);
      if (denied) return denied;
      const g = guard(request, cookies, params.eventId, 'MANAGER');
      if ('response' in g) return g.response;
      if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
      const item = ticketIn(g.event.eventId, params.ticketItemId);
      if (!item) return ticketError(request, 'Ticket_Item_404_1');
      if (item.pendingApproveCount > 0 || isSold(item)) {
        return ticketError(request, 'Ticket_Item_400_7');
      }
      removeTicket(item.ticketItemId);
      return ok(ticketsOfEvent(g.event.eventId).map((t) => view(t, g.event)));
    },
  ),

  // P10/T-5 · T-6 — 권한 → 수정 가능 → 티켓 404 → 멱등
  ...(['suspend', 'resume'] as const).map((action) =>
    http.post(
      `*/api/v2/events/:eventId/ticket-items/:ticketItemId/${action}`,
      ({ request, params, cookies }) => {
        const denied =
          requireAuth(request, cookies) ?? badPath(request, params.eventId, params.ticketItemId);
        if (denied) return denied;
        const g = guard(request, cookies, params.eventId, 'MANAGER');
        if ('response' in g) return g.response;
        if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
        const item = ticketIn(g.event.eventId, params.ticketItemId);
        if (!item) return ticketError(request, 'Ticket_Item_404_1');
        const next = { ...item, isSellable: action === 'resume' };
        saveTicket(next);
        return ok(view(next, g.event));
      },
    ),
  ),

  // P10/O-5 — 본문(`@NotNull` · 10개) → 권한 → 수정 가능 → 티켓 404 → 옵션 404 → 다른 공연 옵션 → 같은 목록이면 그대로 → 잠금 → 무료 티켓 유료 옵션
  http.put(
    '*/api/v2/events/:eventId/ticket-items/:ticketItemId/options',
    async ({ request, params, cookies }) => {
      const denied =
        requireAuth(request, cookies) ?? badPath(request, params.eventId, params.ticketItemId);
      if (denied) return denied;
      const b = await body(request);
      if (
        !isObject(b) ||
        !Array.isArray(b.optionIds) ||
        b.optionIds.length > TICKET_OPTIONS_MAX ||
        !b.optionIds.every(isInt)
      ) {
        return errors.badRequest(request);
      }
      const g = guard(request, cookies, params.eventId, 'MANAGER');
      if ('response' in g) return g.response;
      if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
      const item = ticketIn(g.event.eventId, params.ticketItemId);
      if (!item) return ticketError(request, 'Ticket_Item_404_1');
      const ids = [...new Set(b.optionIds as number[])];
      const opts: StoredOption[] = [];
      for (const id of ids) {
        const o = storedOption(id);
        if (!o) return ticketError(request, 'Option_Group_404_1');
        opts.push(o);
      }
      if (opts.some((o) => o.eventId !== g.event.eventId)) {
        return ticketError(request, 'Option_Group_400_1');
      }
      const same =
        ids.length === item.optionIds.length && ids.every((id) => item.optionIds.includes(id));
      if (same) return ok(view(item, g.event));
      if (isLocked(item)) return ticketError(request, 'Item_Option_Group_400_2');
      const added = opts.filter((o) => !item.optionIds.includes(o.optionId));
      if (item.payType === 'FREE' && added.some((o) => (o.yesAdditionalPrice ?? 0) > 0)) {
        return ticketError(request, 'Item_Option_Group_400_4');
      }
      const next = { ...item, optionIds: ids };
      saveTicket(next);
      return ok(view(next, g.event));
    },
  ),

  // G10/O-1 — 일반 멤버 이상
  http.get('*/api/v2/events/:eventId/options', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    return ok(optionsOfEvent(g.event.eventId).map(toManageOption));
  }),

  // P10/O-2 — 본문 → 권한 → 수정 가능 → 설명 50자 → 추가금
  http.post('*/api/v2/events/:eventId/options', async ({ request, params, cookies }) => {
    const denied = requireAuth(request, cookies) ?? badPath(request, params.eventId);
    if (denied) return denied;
    const f = readOptionFields(await body(request), 'create');
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
    if (f.description!.trim().length > OPTION_DESCRIPTION_MAX) {
      return ticketError(request, 'Option_Group_400_6');
    }
    const price = optionPrice(f.type!, f.yesAdditionalPrice);
    if (typeof price === 'string') return ticketError(request, price);
    const created = createOption({
      eventId: g.event.eventId,
      name: f.name!.trim(),
      description: f.description!.trim(),
      type: f.type!,
      yesAdditionalPrice: f.type === 'YES_NO' ? price : null,
    });
    return ok(toManageOption(created));
  }),

  // P10/O-3 — 본문 → 권한 → 수정 가능 → 옵션 404 → 추가금(잠금 · 무료 티켓) → 이름 → 설명 50자(바뀔 때만)
  http.patch('*/api/v2/events/:eventId/options/:optionId', async ({ request, params, cookies }) => {
    const denied =
      requireAuth(request, cookies) ?? badPath(request, params.eventId, params.optionId);
    if (denied) return denied;
    const f = readOptionFields(await body(request), 'update');
    if (!f) return errors.badRequest(request);
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
    const o = optionIn(g.event.eventId, params.optionId);
    if (!o) return ticketError(request, 'Option_Group_404_1');
    const next: StoredOption = { ...o };
    if (f.yesAdditionalPrice !== undefined) {
      const price = optionPrice(o.type, f.yesAdditionalPrice);
      if (typeof price === 'string') return ticketError(request, price);
      if (o.type === 'YES_NO' && price !== (o.yesAdditionalPrice ?? 0)) {
        const applied = ticketsWithOption(o);
        if (applied.some(isLocked)) return ticketError(request, 'Option_Group_400_5');
        if (price > 0 && applied.some((t) => t.payType === 'FREE')) {
          return ticketError(request, 'Item_Option_Group_400_4');
        }
        next.yesAdditionalPrice = price;
      }
    }
    if (f.name !== undefined) next.name = f.name.trim();
    if (f.description !== undefined) {
      const trimmed = f.description.trim();
      if (trimmed !== o.description.trim() && trimmed.length > OPTION_DESCRIPTION_MAX) {
        return ticketError(request, 'Option_Group_400_6');
      }
      next.description = trimmed;
    }
    saveOption(next);
    return ok(toManageOption(next));
  }),

  // D10/O-4 — 권한 → 수정 가능 → 옵션 404 → 잠금 → 붙은 티켓에서 떼고 삭제 → 남은 목록
  http.delete('*/api/v2/events/:eventId/options/:optionId', ({ request, params, cookies }) => {
    const denied =
      requireAuth(request, cookies) ?? badPath(request, params.eventId, params.optionId);
    if (denied) return denied;
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (!isEditable(g.event)) return ticketError(request, 'Event_400_17');
    const o = optionIn(g.event.eventId, params.optionId);
    if (!o) return ticketError(request, 'Option_Group_404_1');
    const applied = ticketsWithOption(o);
    if (applied.some(isLocked)) return ticketError(request, 'Option_Group_400_2');
    for (const t of applied) {
      saveTicket({ ...t, optionIds: t.optionIds.filter((id) => id !== o.optionId) });
    }
    removeOption(o.optionId);
    return ok(optionsOfEvent(g.event.eventId).map(toManageOption));
  }),
];

const itemsPath = (eventId: number, sub = '') => `*/api/v2/events/${eventId}/ticket-items${sub}`;

/** 시나리오 세트. 기본 목록 앞에 끼운다(`server.use(...)` / e2e `mockApi.use(...)`) */
export const hostingTicketSets = {
  /** T-2가 이 코드로 실패한다(저장소는 그대로) */
  createFails: (eventId: number, code: TicketErrorCode | 'BAD_REQUEST') => [
    http.post(itemsPath(eventId), ({ request }) =>
      code === 'BAD_REQUEST' ? errors.badRequest(request) : ticketError(request, code),
    ),
  ],
  /** T-3이 이 코드로 실패한다 */
  updateFails: (eventId: number, code: TicketErrorCode) => [
    http.patch(itemsPath(eventId, '/:ticketItemId'), ({ request }) => ticketError(request, code)),
  ],
  /** T-4가 이 코드로 실패한다 */
  deleteFails: (eventId: number, code: TicketErrorCode) => [
    http.delete(itemsPath(eventId, '/:ticketItemId'), ({ request }) => ticketError(request, code)),
  ],
  /** O-5(옵션 붙이기·떼기)가 이 코드로 실패한다 — 새 옵션 만들기(O-2) 뒤 지정 실패 시나리오 */
  replaceOptionsFails: (eventId: number, code: TicketErrorCode | 'serverError') => [
    http.put(itemsPath(eventId, '/:ticketItemId/options'), ({ request }) =>
      code === 'serverError' ? errors.serverError(request) : ticketError(request, code),
    ),
  ],
  /** O-3이 이 코드로 실패한다 */
  updateOptionFails: (eventId: number, code: TicketErrorCode) => [
    http.patch(`*/api/v2/events/${eventId}/options/:optionId`, ({ request }) =>
      ticketError(request, code),
    ),
  ],
  /** T-1 5xx */
  listServerError: (eventId: number) => [
    http.get(itemsPath(eventId, '/manage'), ({ request }) => errors.serverError(request)),
  ],
};
