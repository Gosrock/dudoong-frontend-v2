import { http, type HttpHandler } from 'msw';

import type { PublicTicketItem } from '../ticket-item/schema';
import { findPublicEvent } from './fixtures/event';
import { CHECKOUT_EVENT_ID, extraCheckoutTickets } from './fixtures/order';
import { ok } from './respond';

/**
 * GP-5 판매 중 티켓 — 이름 붙인 세트(plan §0). 기본 응답은 `event.handlers.ts`(공연 fixture의 티켓)다.
 * 세트는 공연 id와 상관없이 같은 목록을 돌려준다. `server.use(...ticketItemHandlers.soldOut)`.
 * 값의 모양은 백엔드 `V2PublicTicketItemMapper`(dev 24aa595): `remaining`은 재고 공개 + 수량 지정일 때만,
 * `isSoldOut` = 승인 대기 차감 재고 ≤ 0, `isPurchasable`은 서버 판정(PG 티켓·판매 기간·공연 상태).
 */

const base: PublicTicketItem = {
  ticketItemId: 601,
  name: '얼리버드',
  description: '선착순 할인',
  price: 6000,
  payType: 'DUDOONG',
  approvalRequired: true,
  remaining: 30,
  isSoldOut: false,
  isPurchasable: true,
  purchaseLimit: 4,
  options: [],
};

export const ticketItemSets = {
  /** 구매 가능 둘(유료 · 무료 선착순) */
  normal: [
    base,
    {
      ...base,
      ticketItemId: 602,
      name: '무료 입장',
      description: null,
      price: 0,
      payType: 'FREE',
      approvalRequired: false,
      remaining: null,
      purchaseLimit: null,
    },
  ],
  /** 모두 매진 */
  soldOut: [
    { ...base, remaining: 0, isSoldOut: true, isPurchasable: false },
    {
      ...base,
      ticketItemId: 602,
      name: '일반',
      remaining: null,
      isSoldOut: true,
      isPurchasable: false,
    },
  ],
  /** 판매 불가 — 기존 PG 티켓(목록에는 남고 살 수 없다) */
  notPurchasable: [
    { ...base, ticketItemId: 603, name: '카드 결제', payType: 'PRICE', isPurchasable: false },
  ],
  /** 지난 공연의 티켓(서버가 구매 불가로 준다). 지난 공연 판정 자체는 GP-3 `displayStatus` */
  pastEvent: [{ ...base, isPurchasable: false }],
  /** 잔여 적음 — 상한이 잔여(2)로 정해진다 */
  lowStock: [{ ...base, remaining: 2, purchaseLimit: 4 }],
  /** 판매 중인 티켓 없음 */
  empty: [],
} satisfies Record<string, PublicTicketItem[]>;

const gp5 = (items: PublicTicketItem[]): HttpHandler[] => [
  http.get('*/api/v2/events/:eventId/ticket-items', () => ok(items)),
];

export const ticketItemHandlers = {
  normal: gp5(ticketItemSets.normal),
  soldOut: gp5(ticketItemSets.soldOut),
  notPurchasable: gp5(ticketItemSets.notPurchasable),
  pastEvent: gp5(ticketItemSets.pastEvent),
  lowStock: gp5(ticketItemSets.lowStock),
  empty: gp5(ticketItemSets.empty),
  /** 목록을 직접 준다 */
  with: gp5,
  /** 공연 101의 티켓 + 체크아웃 시나리오 티켓(504·505) — O-0·O-1 mock과 같은 목록 */
  checkoutCatalog: gp5([
    ...(findPublicEvent(CHECKOUT_EVENT_ID)?.ticketItems ?? []),
    ...extraCheckoutTickets,
  ]),
};
