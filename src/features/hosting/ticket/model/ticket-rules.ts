import type { TicketOptionManage } from '@/api/option/schema';
import {
  type EditableTicketPayType,
  TICKET_OPTIONS_MAX,
  type TicketItemManage,
  type TicketPayType,
} from '@/api/ticket-item/schema';

/**
 * 티켓 관리 목록(`/hosting/events/[eventId]/tickets`, plan P12) 규칙 — 잠금, ⋮ 메뉴, 판매 상태 칩, 추가 가능, 옵션 붙이기 선택지.
 * 근거: api-contract §6 티켓·옵션, patterns §23·§24 P12, 백엔드 `V2TicketItemDomainService`(잠김 = 재고 감소 또는 승인 대기,
 * 삭제는 잠기지 않은 티켓만 `Ticket_Item_400_7`, 판매 중단·재개는 잠겨도 된다, PG 티켓은 v2 수정 불가 `Ticket_Item_400_11`)·
 * `TicketItem.addItemOptionGroup`(무료 티켓에 유료 옵션 `Item_Option_Group_400_4`) — 432cce4 → dev cb8d24e.
 */

/** 결제 방식 라벨(design-requests Q6 해결 — GUI 라디오 "두둥 티켓 / 무료 티켓") */
export const PAY_TYPE_LABEL: Record<EditableTicketPayType, string> = {
  DUDOONG: '두둥 티켓',
  FREE: '무료 티켓',
};

/** v2에서 만들고 고칠 수 있는 결제 방식인지(기존 PG 티켓·모르는 값은 아니다) */
export const isEditablePayType = (p: TicketPayType | null): p is EditableTicketPayType =>
  p === 'DUDOONG' || p === 'FREE';

/** 잠긴 티켓: 판매(재고 감소)됐거나 승인 대기 주문이 있다 — 설명·판매 기간·재고 공개·매수 제한·수량 증가만 고칠 수 있고 지울 수 없다 */
export const isTicketLocked = (t: Pick<TicketItemManage, 'isSold' | 'hasPendingOrders'>) =>
  t.isSold || t.hasPendingOrders;

export type TicketMenuAction = 'edit' | 'delete' | 'suspend' | 'resume';

export const TICKET_MENU_LABEL: Record<TicketMenuAction, string> = {
  edit: '수정하기',
  delete: '삭제하기',
  suspend: '판매 중단',
  resume: '판매 재개',
};

/**
 * ⋮ 메뉴(plan P12 "`isSold || hasPendingOrders`로 구성"). 읽기 전용(일반 멤버·끝난 공연)이면 비어 있다.
 * - 수정: v2 결제 방식(두둥·무료)만 — PG 티켓은 서버가 막는다
 * - 삭제: 잠기지 않은 티켓만. 잠긴 티켓은 삭제 대신 판매 중단만 보인다(patterns §24 `Ticket_Item_400_7`)
 * - 판매 중단: 잠긴 티켓만(GUI `958:20392` 판매 전 = [수정하기 · 삭제하기], `958:20819` 판매됨 = [수정하기 · 판매 중단] — #55·#56, P12-V)
 * - 판매 재개: 판매 중단된 티켓이면 잠김과 상관없이
 */
export function ticketMenuOf(
  t: Pick<TicketItemManage, 'payType' | 'isSold' | 'hasPendingOrders' | 'saleState'>,
  canEdit: boolean,
): TicketMenuAction[] {
  if (!canEdit) return [];
  const menu: TicketMenuAction[] = [];
  if (isEditablePayType(t.payType)) menu.push('edit');
  const locked = isTicketLocked(t);
  if (!locked) menu.push('delete');
  if (t.saleState === 'SUSPENDED') menu.push('resume');
  else if (locked) menu.push('suspend');
  return menu;
}

/** 목록 카드의 상태 칩(GUI `767:50048` — 판매 중 · 판매 종료(#46 띄어쓰기) · 판매 예정). 판매 중단은 GUI에 없어 따로 둔다(Claude 판단) */
export type TicketSaleChip = 'onSale' | 'upcoming' | 'ended' | 'suspended';

export const TICKET_SALE_CHIP_LABEL: Record<TicketSaleChip, string> = {
  onSale: '판매 중',
  upcoming: '판매 예정',
  ended: '판매 종료',
  suspended: '판매 중단',
};

/**
 * 칩 판정(`yyyy.MM.dd HH:mm` 문자열 비교 — 같은 형식이라 사전순 = 시간순). 판매 중단이 먼저, 판매 시작 전이면 판매 예정,
 * 판매 종료(없으면 공연 시작)가 지났으면 판매 종료, 그 밖은 판매중. 매진 여부는 칩에 넣지 않는다(재고 칩이 보여 준다 — Claude 판단).
 *
 * 공연 등록 전(준비중)이면 관객이 살 수 없다(`isPurchasable` false) — 기간 안이어도 **판매 예정**(#92-3, 스테이징 QA).
 * `saleState: BEFORE_SALE`은 "재고 감소 없음"이라 판매 기간과 무관하다(api-contract — 판단에 쓰지 않는다).
 * 등록 전 전용 칩은 GUI에 없어 있는 '판매 예정'을 쓴다(🤖 Claude 판단 — 와이어 `424:10935` "판매전"은 칩이 없다)
 */
export function ticketSaleChipOf(
  t: Pick<TicketItemManage, 'saleState' | 'saleStartAt' | 'saleEndAt'>,
  eventStartAt: string | null,
  now: string,
  eventRegistered = true,
): TicketSaleChip {
  if (t.saleState === 'SUSPENDED') return 'suspended';
  if (t.saleStartAt !== null && now < t.saleStartAt) return 'upcoming';
  const end = t.saleEndAt ?? eventStartAt;
  if (end !== null && now >= end) return 'ended';
  if (!eventRegistered) return 'upcoming';
  return 'onSale';
}

/** 티켓을 더할 수 있는지 — 티켓 있음 공연 + 쓰기 가능(티켓 없음 공연은 서버도 `Ticket_Item_400_12`로 막는다) */
export const canAddTicket = (event: { hasTicket: boolean }, canEdit: boolean) =>
  canEdit && event.hasTicket;

/** 유료 옵션('네' 추가금 > 0) */
export const isPaidOption = (o: Pick<TicketOptionManage, 'yesAdditionalPrice'>) =>
  (o.yesAdditionalPrice ?? 0) > 0;

/** 이 티켓의 옵션을 바꿀(붙이기·떼기) 수 있는지 — 쓰기 가능 + 잠기지 않은 티켓(`Item_Option_Group_400_2`) */
export const canChangeTicketOptions = (
  t: Pick<TicketItemManage, 'isSold' | 'hasPendingOrders'>,
  canEdit: boolean,
) => canEdit && !isTicketLocked(t);

/** 티켓당 옵션 10개까지(P10/O-5 `@Size`) */
export const canAttachMoreOptions = (t: Pick<TicketItemManage, 'options'>) =>
  t.options.length < TICKET_OPTIONS_MAX;

/**
 * 이 티켓에 붙일 수 있는 풀 옵션 — 이미 붙은 것과, 무료 티켓이면 유료 옵션을 뺀다(patterns §24 `Item_Option_Group_400_4` "선택지에서 미리 뺀다").
 * 객관식(v1) 옵션도 그대로 붙일 수 있다(서버가 막지 않는다)
 */
export function attachableOptionsOf(
  t: Pick<TicketItemManage, 'payType' | 'options'>,
  pool: readonly TicketOptionManage[],
): TicketOptionManage[] {
  const attached = new Set(t.options.map((o) => o.optionId));
  return pool.filter(
    (o) => !attached.has(o.optionId) && !(t.payType === 'FREE' && isPaidOption(o)),
  );
}

/** 티켓 목록 주소(공연 메뉴 "티켓 관리") · 새 티켓 · 수정 */
export const ticketsHref = (eventId: string | number) => `/hosting/events/${eventId}/tickets`;
export const newTicketHref = (eventId: string | number) => `${ticketsHref(eventId)}/new`;
export const editTicketHref = (eventId: string | number, ticketItemId: number) =>
  `${ticketsHref(eventId)}/${ticketItemId}`;

/** 주소의 티켓 id — 숫자만(아니면 요청 없이 공용 404) */
export function parseTicketItemIdParam(value: string): number | null {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}
