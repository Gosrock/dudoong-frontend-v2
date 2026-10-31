import type { TicketOptionManage } from '../option/schema';
import type {
  EditableTicketPayType,
  PublicTicketItem,
  TicketItemManage,
  TicketOptionType,
  TicketPayType,
} from '../ticket-item/schema';
import { banks } from './fixtures/bank';
import { events } from './fixtures/event';
import { MOCK_ACCOUNT } from './fixtures/order';

/**
 * 티켓·옵션(P12) mock 저장소. T-2~T-6·O-2~O-5가 바꾸고 T-1·O-1·GP-5(`event.handlers.ts`)·GE-7/GE-3 체크리스트 ③
 * (`event-store.ts` `hasValidTicketOf`)이 읽는다 — 판매 중단 → 재개가 관객 GP-5에 바로 반영된다(plan P12).
 * 처음 값은 공연 fixture(`fixtures/event.ts`)의 티켓·옵션을 관리 모양으로 옮긴 것이고, GP-5 투영(`publicTicketsOf`)은
 * fixture 기준 시각에 fixture 값과 같다. vitest·e2e는 `resetTicketStore()`(`resetHostingStore()`가 함께 부른다)로 되돌린다.
 *
 * 저장 모양은 백엔드 `TicketItem`을 따른다: 무제한·제한 없음은 저장값 1,000,000(`UNLIMITED_SUPPLY_COUNT`·`NO_PURCHASE_LIMIT`),
 * 재고(`quantity`)는 승인 때 줄고, 판매됨 = 재고 < 공급량, 잠김 = 판매됨 또는 승인 대기 주문 있음(432cce4 → dev cb8d24e).
 */

export const UNLIMITED_SUPPLY = 1_000_000;
export const NO_PURCHASE_LIMIT = 1_000_000;

/**
 * 관객 공개 조회(GP-5)가 보는 "지금" — fixture 기준 시각(`respond.ts`의 `timeStamp`와 같다). fixture 공연(102 등)은 이 시각 기준
 * 판매 중이라, 실제 시각으로 계산하면 날짜가 지나며 P6·P7 테스트가 깨진다. 변경 검사(판매 기간 `Ticket_Item_400_13`)는 실제 시각
 */
export const PUBLIC_VIEW_NOW = '2026.10.17 20:00';

export type StoredAccount = { bankName: string; accountHolder: string; accountNumber: string };

export type StoredTicket = {
  ticketItemId: number;
  eventId: number;
  payType: TicketPayType;
  name: string;
  description: string | null;
  price: number;
  /** 무제한이면 `UNLIMITED_SUPPLY` 이상 */
  supplyCount: number;
  /** 재고(승인 때 줄어든다) */
  quantity: number;
  /** 제한 없음이면 `NO_PURCHASE_LIMIT` 이상 */
  purchaseLimit: number;
  approvalRequired: boolean;
  isQuantityPublic: boolean;
  saleStartAt: string | null;
  saleEndAt: string | null;
  /** false = 판매 중단(T-5) */
  isSellable: boolean;
  /** 승인 대기 주문 수량 합 */
  pendingApproveCount: number;
  account: StoredAccount | null;
  /** 붙은 옵션 id */
  optionIds: number[];
};

export type StoredOption = {
  optionId: number;
  eventId: number;
  name: string;
  description: string;
  type: TicketOptionType;
  /** YES_NO의 '네' 추가금(주관식은 null) */
  yesAdditionalPrice: number | null;
};

/** T-2·O-2로 만든 것이 받는 id의 시작값(fixture id와 겹치지 않게) */
export const CREATED_TICKET_ID_START = 8101;
export const CREATED_OPTION_ID_START = 8701;

/** fixture 공개 티켓을 관리 모양으로 옮길 때 GP-5에 없는 값(공급량·재고 공개). 없는 티켓은 무제한·비공개로 본다 */
const SEED_STOCK: Record<number, { supplyCount: number; isQuantityPublic: boolean }> = {
  // 고스락 37회(101): 일반 예매 100장 중 58장 판매(잠김 — 옵션 701·702도 잠긴다), 학생 할인 50장 매진, 초대권 무제한
  501: { supplyCount: 100, isQuantityPublic: true },
  502: { supplyCount: 50, isQuantityPublic: true },
  // 어쿠스틱 나이트(102): 무료 선착순 50장 중 37장
  511: { supplyCount: 50, isQuantityPublic: true },
};

let tickets = new Map<number, StoredTicket>();
let options = new Map<number, StoredOption>();
let nextTicketId = CREATED_TICKET_ID_START;
let nextOptionId = CREATED_OPTION_ID_START;
let agreementEnforced = false;

function seed() {
  tickets = new Map();
  options = new Map();
  for (const e of events) {
    for (const t of e.ticketItems) {
      const stock = SEED_STOCK[t.ticketItemId];
      const unlimited = !stock;
      for (const o of t.options) {
        options.set(o.optionId, {
          optionId: o.optionId,
          eventId: e.eventId,
          name: o.name ?? '',
          description: o.description ?? '',
          type: o.type ?? 'SUBJECTIVE',
          yesAdditionalPrice: o.yesAdditionalPrice,
        });
      }
      tickets.set(t.ticketItemId, {
        ticketItemId: t.ticketItemId,
        eventId: e.eventId,
        payType: t.payType ?? 'DUDOONG',
        name: t.name ?? '',
        description: t.description,
        price: t.price,
        supplyCount: unlimited ? UNLIMITED_SUPPLY : stock.supplyCount,
        quantity: unlimited ? UNLIMITED_SUPPLY : (t.remaining ?? stock.supplyCount),
        purchaseLimit: t.purchaseLimit ?? NO_PURCHASE_LIMIT,
        approvalRequired: t.approvalRequired,
        isQuantityPublic: stock?.isQuantityPublic ?? false,
        saleStartAt: null,
        saleEndAt: null,
        isSellable: true,
        pendingApproveCount: 0,
        account:
          t.payType === 'DUDOONG'
            ? {
                bankName: MOCK_ACCOUNT.bankName!,
                accountHolder: MOCK_ACCOUNT.accountHolder!,
                accountNumber: MOCK_ACCOUNT.accountNumber!,
              }
            : null,
        optionIds: t.options.map((o) => o.optionId),
      });
    }
  }
  nextTicketId = CREATED_TICKET_ID_START;
  nextOptionId = CREATED_OPTION_ID_START;
  agreementEnforced = false;
}
seed();

/** 처음 값으로 되돌린다(동의 강제도 끈다) */
export const resetTicketStore = seed;

// ─── 읽기·쓰기 ───────────────────────────────────────────────

/** 이 공연의 유효 티켓, 생성 순(`findAllByEventId().sortedBy { id }`) */
export const ticketsOfEvent = (eventId: number): StoredTicket[] =>
  [...tickets.values()]
    .filter((t) => t.eventId === eventId)
    .sort((a, b) => a.ticketItemId - b.ticketItemId);

/** 유효 티켓이 있는지 — 체크리스트 ③·`Event_400_25`(`ticketItemAdaptor.existsValidByEventId`) */
export const hasStoredTickets = (eventId: number) => ticketsOfEvent(eventId).length > 0;

/** 유효(지우지 않은) 티켓. 공연은 따지지 않는다 — 호출 쪽이 `eventId`를 대조한다 */
export const storedTicket = (ticketItemId: number) => tickets.get(ticketItemId);

export const saveTicket = (t: StoredTicket) => void tickets.set(t.ticketItemId, t);

/** 소프트 삭제 — 유효 목록에서 빠진다 */
export const removeTicket = (ticketItemId: number) => void tickets.delete(ticketItemId);

export function createTicket(input: Omit<StoredTicket, 'ticketItemId'>): StoredTicket {
  const t = { ...input, ticketItemId: nextTicketId++ };
  tickets.set(t.ticketItemId, t);
  return t;
}

/** 이 공연의 유효 옵션, 생성 순 */
export const optionsOfEvent = (eventId: number): StoredOption[] =>
  [...options.values()]
    .filter((o) => o.eventId === eventId)
    .sort((a, b) => a.optionId - b.optionId);

export const storedOption = (optionId: number) => options.get(optionId);

export const saveOption = (o: StoredOption) => void options.set(o.optionId, o);

export const removeOption = (optionId: number) => void options.delete(optionId);

export function createOption(input: Omit<StoredOption, 'optionId'>): StoredOption {
  const o = { ...input, optionId: nextOptionId++ };
  options.set(o.optionId, o);
  return o;
}

// ─── 시나리오 도우미 ─────────────────────────────────────────

/** 이 티켓에 승인 대기 주문이 있는 것으로 본다(잠김 — `hasPendingOrders`) */
export function setTicketPendingOrders(ticketItemId: number, pendingApproveCount: number) {
  const t = tickets.get(ticketItemId);
  if (t) tickets.set(ticketItemId, { ...t, pendingApproveCount });
}

/** 이 티켓이 `soldCount`장 팔린 것으로 본다(재고 감소 — 잠김) */
export function setTicketSold(ticketItemId: number, soldCount: number) {
  const t = tickets.get(ticketItemId);
  if (t) tickets.set(ticketItemId, { ...t, quantity: t.supplyCount - soldCount });
}

/** 백엔드 `agreement.enforce=true`(지금 운영은 false) — 두둥티켓 생성·무료 → 두둥 전환에 `refundObligationAgreed: true`가 필요 */
export const setTicketAgreementEnforced = (on: boolean) => void (agreementEnforced = on);
export const isTicketAgreementEnforced = () => agreementEnforced;

// ─── 규칙(`TicketItem`·`V2TicketItemDomainService`) ──────────

export const isUnlimited = (t: StoredTicket) => t.supplyCount >= UNLIMITED_SUPPLY;
export const hasNoPurchaseLimit = (t: StoredTicket) => t.purchaseLimit >= NO_PURCHASE_LIMIT;
/** 재고 감소(판매됨) */
export const isSold = (t: StoredTicket) => t.quantity < t.supplyCount;
/** 잠김: 판매됨 또는 승인 대기 주문 있음 */
export const isLocked = (t: StoredTicket) => isSold(t) || t.pendingApproveCount > 0;

/** 판매 기간 안(설정 안 된 쪽은 열림 — `TicketItem.isInSalePeriod`). 판매 중단은 보지 않는다 */
const isInSalePeriod = (t: StoredTicket, now: string) =>
  (t.saleStartAt === null || now >= t.saleStartAt) && (t.saleEndAt === null || now < t.saleEndAt);

/** 판매 중: 중단 아님 + 판매 기간 안(`TicketItem.isOnSale`) */
const isOnSale = (t: StoredTicket, now: string) => t.isSellable && isInSalePeriod(t, now);

type EventView = { status: string; startAt: string | null };

/** 관리 화면 구매 가능(결제 방식 무관): 판매 중 + 공연 OPEN + 시작 전 + 재고 > 0 */
const isPurchasable = (t: StoredTicket, event: EventView, now: string) =>
  isOnSale(t, now) &&
  event.status === 'OPEN' &&
  event.startAt !== null &&
  now < event.startAt &&
  t.quantity > 0;

/** 응답 `bankCode` — 서버는 은행명으로 추정한다(`BankCode.fromName` — 별칭 정규화). mock은 표시 이름이 같을 때만 */
export const bankCodeOfName = (bankName: string | null) =>
  banks.find((b) => b.name === bankName?.trim())?.code ?? null;

/** '네' 추가금(주관식은 null) */
const yesPriceOf = (o: StoredOption) => (o.type === 'YES_NO' ? (o.yesAdditionalPrice ?? 0) : null);

const appliedOptions = (t: StoredTicket) =>
  t.optionIds
    .map((id) => options.get(id))
    .filter((o): o is StoredOption => o !== undefined)
    .sort((a, b) => a.optionId - b.optionId);

/** 유료 옵션이 붙었는지(무료 티켓 금지 — `Item_Option_Group_400_4`) */
export const hasPaidOption = (t: StoredTicket) =>
  appliedOptions(t).some((o) => (yesPriceOf(o) ?? 0) > 0);

/** T-1(·T-2·T-3·T-5·T-6·O-5) 응답 */
export function toManageTicket(t: StoredTicket, event: EventView, now: string): TicketItemManage {
  const unlimited = isUnlimited(t);
  return {
    ticketItemId: t.ticketItemId,
    payType: t.payType,
    name: t.name,
    description: t.description,
    price: t.price,
    supplyCount: unlimited ? null : t.supplyCount,
    remaining: unlimited ? null : t.quantity,
    soldCount: t.supplyCount - t.quantity,
    approvalRequired: t.approvalRequired,
    isQuantityPublic: t.isQuantityPublic,
    purchaseLimit: hasNoPurchaseLimit(t) ? null : t.purchaseLimit,
    saleStartAt: t.saleStartAt,
    saleEndAt: t.saleEndAt,
    saleState: !t.isSellable ? 'SUSPENDED' : isSold(t) ? 'SOLD' : 'BEFORE_SALE',
    isSold: isSold(t),
    hasPendingOrders: t.pendingApproveCount > 0,
    pendingApproveCount: t.pendingApproveCount,
    isPurchasable: isPurchasable(t, event, now),
    account:
      t.payType === 'DUDOONG' && t.account
        ? { ...t.account, bankCode: bankCodeOfName(t.account.bankName) }
        : null,
    options: appliedOptions(t).map((o) => ({
      optionId: o.optionId,
      name: o.name,
      type: o.type,
      yesAdditionalPrice: yesPriceOf(o),
    })),
  };
}

/** O-1(·O-2·O-3) 응답 — 붙은 유효 티켓 id와 잠김 */
export function toManageOption(o: StoredOption): TicketOptionManage {
  const applied = ticketsOfEvent(o.eventId).filter((t) => t.optionIds.includes(o.optionId));
  return {
    optionId: o.optionId,
    name: o.name,
    description: o.description,
    type: o.type,
    yesAdditionalPrice: yesPriceOf(o),
    appliedTicketItemIds: applied.map((t) => t.ticketItemId),
    isLocked: applied.some(isLocked),
  };
}

/** 옵션이 붙은 유효 티켓 */
export const ticketsWithOption = (o: StoredOption) =>
  ticketsOfEvent(o.eventId).filter((t) => t.optionIds.includes(o.optionId));

const V2_ORDER_PAY_TYPES: readonly TicketPayType[] = [
  'DUDOONG',
  'FREE',
] satisfies EditableTicketPayType[];

/**
 * GP-5 판매 기간 안의 티켓(`V2PublicTicketItemMapper.publicItems`, 백엔드 #894 / 2.5.2): 판매 기간 밖은 빼고, 판매 중단은
 * `isSuspended: true` + `isPurchasable: false`로 넣는다(딤드 — Q33). 잔여·매진·구매 가능은 승인 대기를 뺀 값이고
 * 판매 중단 티켓도 잔여·매진을 계산한다. `now`는 fixture 기준 시각(`PUBLIC_VIEW_NOW`)
 */
export function publicTicketsOf(
  eventId: number,
  event: EventView,
  now = PUBLIC_VIEW_NOW,
): PublicTicketItem[] {
  return ticketsOfEvent(eventId)
    .filter((t) => isInSalePeriod(t, now))
    .map((t) => {
      const available = Math.max(0, t.quantity - t.pendingApproveCount);
      return {
        ticketItemId: t.ticketItemId,
        name: t.name,
        description: t.description,
        price: t.price,
        payType: t.payType,
        approvalRequired: t.approvalRequired,
        remaining: t.isQuantityPublic && !isUnlimited(t) ? available : null,
        isSoldOut: available <= 0,
        isPurchasable:
          V2_ORDER_PAY_TYPES.includes(t.payType) && isPurchasable(t, event, now) && available > 0,
        isSuspended: !t.isSellable,
        purchaseLimit: hasNoPurchaseLimit(t) ? null : t.purchaseLimit,
        options: appliedOptions(t).map((o) => ({
          optionId: o.optionId,
          name: o.name,
          description: o.description,
          type: o.type,
          yesAdditionalPrice: yesPriceOf(o),
        })),
      };
    });
}
