import { describe, expect, it } from 'vitest';

import { ticketItemSets } from '@/api/__mocks__/ticket-item.handlers';
import type { EventDisplayStatus } from '@/api/event/schema';
import { type PublicTicketItem, PublicTicketItemsSchema } from '@/api/ticket-item/schema';

import { ticketListState, ticketState, toTicketView } from './ticket-state';

const ticket = (patch: Partial<PublicTicketItem> = {}): PublicTicketItem => ({
  ticketItemId: 1,
  name: '일반',
  description: null,
  price: 6000,
  payType: 'DUDOONG',
  approvalRequired: true,
  remaining: 30,
  isSoldOut: false,
  isPurchasable: true,
  purchaseLimit: 4,
  options: [],
  ...patch,
});

describe('ticketState — 티켓 하나의 표시 판정', () => {
  it.each<[string, Partial<PublicTicketItem>, EventDisplayStatus | null, string]>([
    ['구매 가능', {}, 'UPCOMING', 'PURCHASABLE'],
    ['진행 중 공연도 서버가 살 수 있다면 구매 가능', {}, 'ONGOING', 'PURCHASABLE'],
    ['매진', { isSoldOut: true, isPurchasable: false, remaining: 0 }, 'UPCOMING', 'SOLD_OUT'],
    [
      '매진 + 잔여 비공개',
      { isSoldOut: true, isPurchasable: false, remaining: null },
      'UPCOMING',
      'SOLD_OUT',
    ],
    ['판매 불가(판매 기간 밖 등)', { isPurchasable: false }, 'UPCOMING', 'NOT_ON_SALE'],
    ['기존 PG 티켓', { payType: 'PRICE', isPurchasable: false }, 'UPCOMING', 'NOT_ON_SALE'],
    [
      '서버가 구매 가능이라 해도 PG 티켓은 주문 불가',
      { payType: 'PRICE' },
      'UPCOMING',
      'NOT_ON_SALE',
    ],
    ['모르는 결제 방식(UNKNOWN)', { payType: 'UNKNOWN' }, 'UPCOMING', 'NOT_ON_SALE'],
    ['결제 방식 null', { payType: null }, 'UPCOMING', 'NOT_ON_SALE'],
    ['지난 공연은 티켓 값과 상관없이', {}, 'PAST', 'EVENT_ENDED'],
    ['지난 공연 + 매진도 지난 공연', { isSoldOut: true }, 'PAST', 'EVENT_ENDED'],
    ['공연 상태를 모르면(UNKNOWN) 티켓 값으로', {}, 'UNKNOWN', 'PURCHASABLE'],
    ['공연 상태 없음(null)도 티켓 값으로', { isPurchasable: false }, null, 'NOT_ON_SALE'],
    ['서버 값이 어긋나 잔여 0인데 구매 가능 → 매진', { remaining: 0 }, 'UPCOMING', 'SOLD_OUT'],
    [
      '무료 선착순',
      { payType: 'FREE', price: 0, approvalRequired: false },
      'UPCOMING',
      'PURCHASABLE',
    ],
  ])('%s', (_, patch, status, expected) => {
    expect(ticketState(ticket(patch), status)).toBe(expected);
  });
});

describe('toTicketView — 수량 상한 = min(purchaseLimit, remaining, 100)', () => {
  it.each<[string, Partial<PublicTicketItem>, number, number | null]>([
    ['1인 제한이 가장 작다', { purchaseLimit: 4, remaining: 30 }, 4, 30],
    ['잔여가 가장 작다', { purchaseLimit: 4, remaining: 2 }, 2, 2],
    ['둘 다 없으면 100(서버 MAX_QUANTITY)', { purchaseLimit: null, remaining: null }, 100, null],
    ['둘 다 100보다 크면 100', { purchaseLimit: 500, remaining: 300 }, 100, 300],
    ['잔여 1', { purchaseLimit: null, remaining: 1 }, 1, 1],
    ['잔여 비공개(null)는 0으로 보지 않는다', { purchaseLimit: 2, remaining: null }, 2, null],
  ])('%s', (_, patch, max, remaining) => {
    const view = toTicketView(ticket(patch), 'UPCOMING');
    expect(view.maxQuantity).toBe(max);
    expect(view.remaining).toBe(remaining);
  });

  it('살 수 없으면 상한 0', () => {
    expect(toTicketView(ticket({ isSoldOut: true }), 'UPCOMING').maxQuantity).toBe(0);
    expect(toTicketView(ticket(), 'PAST').maxQuantity).toBe(0);
  });
});

describe('ticketListState — 목록 전체', () => {
  it.each<[string, PublicTicketItem[], EventDisplayStatus, string]>([
    ['정상', ticketItemSets.normal, 'UPCOMING', 'AVAILABLE'],
    ['모두 매진', ticketItemSets.soldOut, 'UPCOMING', 'ALL_SOLD_OUT'],
    ['판매 불가', ticketItemSets.notPurchasable, 'UPCOMING', 'NOT_ON_SALE'],
    ['지난 공연', ticketItemSets.pastEvent, 'PAST', 'EVENT_ENDED'],
    ['지난 공연은 티켓이 없어도 지난 공연', [], 'PAST', 'EVENT_ENDED'],
    ['잔여 적음', ticketItemSets.lowStock, 'UPCOMING', 'AVAILABLE'],
    ['판매 중 티켓 없음', ticketItemSets.empty, 'UPCOMING', 'NO_TICKETS'],
    [
      '매진 + 판매 불가 섞임',
      [...ticketItemSets.soldOut, ...ticketItemSets.notPurchasable],
      'UPCOMING',
      'NOT_ON_SALE',
    ],
    [
      '하나라도 살 수 있으면',
      [...ticketItemSets.soldOut, ...ticketItemSets.lowStock],
      'UPCOMING',
      'AVAILABLE',
    ],
  ])('%s', (_, tickets, status, expected) => {
    expect(ticketListState(tickets, status)).toBe(expected);
  });

  it('이름 붙인 GP-5 세트는 스키마를 통과한다', () => {
    for (const set of Object.values(ticketItemSets)) {
      expect(PublicTicketItemsSchema.parse(set)).toEqual(set);
    }
  });
});
