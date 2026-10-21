import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/api/__mocks__/server';
import { ticketItemHandlers, ticketItemSets } from '@/api/__mocks__/ticket-item.handlers';
import type { EventDisplayStatus } from '@/api/event/schema';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { ONE_TICKET_KIND_WARNING, useTicketSelection } from './useTicketSelection';

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(status: EventDisplayStatus = 'UPCOMING', eventId: number | string = 101) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useTicketSelection(eventId, status), { wrapper });
  return { ...view, queryClient };
}

async function loaded(status?: EventDisplayStatus, eventId?: number | string) {
  const view = setup(status, eventId);
  await waitFor(() => expect(view.result.current.status).toBe('success'));
  return view;
}

describe('티켓 선택 — 조회', () => {
  it('GP-5를 브라우저에서 쿠키 없이(공개 GET) 한 번 읽는다', async () => {
    const sent = recordRequests();
    const { result } = await loaded();
    expect(await sent.list()).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/api/v2/events/101/ticket-items',
        credentials: 'omit',
      }),
    ]);
    expect(result.current.tickets.map((t) => [t.ticket.ticketItemId, t.state])).toEqual([
      [501, 'PURCHASABLE'],
      [502, 'SOLD_OUT'],
      [503, 'PURCHASABLE'],
    ]);
    expect(result.current.listState).toBe('AVAILABLE');
  });

  it.each([
    ['매진', 'ALL_SOLD_OUT', ticketItemHandlers.soldOut, 'UPCOMING'],
    ['판매 불가', 'NOT_ON_SALE', ticketItemHandlers.notPurchasable, 'UPCOMING'],
    ['지난 공연', 'EVENT_ENDED', ticketItemHandlers.pastEvent, 'PAST'],
    ['판매 중 티켓 없음', 'NO_TICKETS', ticketItemHandlers.empty, 'UPCOMING'],
  ] as const)(
    '%s이면 목록 상태 %s이고 아무것도 고를 수 없다',
    async (_, listState, set, status) => {
      server.use(...set);
      const { result } = await loaded(status);
      expect(result.current.listState).toBe(listState);
      for (const t of result.current.tickets) {
        act(() => result.current.select(t.ticket.ticketItemId));
      }
      expect(result.current.selected).toBeNull();
      expect(result.current.checkoutHref).toBeNull();
    },
  );
});

describe('티켓 선택 — 고르기 · 수량 · 금액', () => {
  it('고르면 수량 1, 금액 = 가격 × 수량, 체크아웃 주소에 티켓·수량', async () => {
    const { result } = await loaded();
    act(() => result.current.select(501));
    expect(result.current.selected?.ticket.ticketItemId).toBe(501);
    expect(result.current.quantity).toBe(1);
    expect(result.current.amount).toBe(15000);
    act(() => result.current.increment());
    expect(result.current.quantity).toBe(2);
    expect(result.current.amount).toBe(30000);
    expect(result.current.checkoutHref).toBe('/events/101/checkout?ticketItemId=501&quantity=2');
  });

  it('수량 경계: 0 → 1, 1, 상한(1인 4매), 상한+1 → 상한', async () => {
    const { result } = await loaded();
    act(() => result.current.select(501));
    expect(result.current.maxQuantity).toBe(4);
    expect(result.current.canDecrement).toBe(false);

    act(() => result.current.setQuantity(0));
    expect(result.current.quantity).toBe(1);
    act(() => result.current.decrement());
    expect(result.current.quantity).toBe(1);

    act(() => result.current.setQuantity(4));
    expect(result.current.quantity).toBe(4);
    expect(result.current.canIncrement).toBe(false);

    act(() => result.current.setQuantity(5));
    expect(result.current.quantity).toBe(4);
    act(() => result.current.increment());
    expect(result.current.quantity).toBe(4);
  });

  it('잔여가 적으면 상한 = 잔여(2)', async () => {
    server.use(...ticketItemHandlers.lowStock);
    const { result } = await loaded();
    act(() => result.current.select(601));
    act(() => result.current.setQuantity(100));
    expect(result.current.quantity).toBe(2);
    expect(result.current.maxQuantity).toBe(2);
  });

  it('제한·잔여가 없으면 상한 100(서버 MAX_QUANTITY), 101은 100으로', async () => {
    const { result } = await loaded();
    act(() => result.current.select(503));
    act(() => result.current.setQuantity(101));
    expect(result.current.quantity).toBe(100);
    expect(result.current.amount).toBe(0);
  });

  it('무료 티켓 금액은 0원', async () => {
    const { result } = await loaded();
    act(() => result.current.select(503));
    act(() => result.current.setQuantity(3));
    expect(result.current.amount).toBe(0);
  });
});

describe('티켓 선택 — 1주문 1종류', () => {
  it('다른 티켓을 고르면 선택은 그대로 두고 경고를 켠다, 취소(×)하면 경고도 꺼지고 새로 고를 수 있다', async () => {
    const { result } = await loaded();
    act(() => result.current.select(501));
    act(() => result.current.setQuantity(3));
    act(() => result.current.select(503));
    expect(result.current.warning).toBe(true);
    expect(ONE_TICKET_KIND_WARNING[0]).toBe('티켓은 한 주문당 한 종류만 구매할 수 있습니다.');
    expect(result.current.selected?.ticket.ticketItemId).toBe(501);
    expect(result.current.quantity).toBe(3);

    act(() => result.current.clear());
    expect(result.current.warning).toBe(false);
    expect(result.current.selected).toBeNull();
    act(() => result.current.select(503));
    expect(result.current.selected?.ticket.ticketItemId).toBe(503);
    expect(result.current.quantity).toBe(1);
  });

  it('같은 티켓을 다시 고르면 아무 일도 없다(수량 유지, 경고 없음)', async () => {
    const { result } = await loaded();
    act(() => result.current.select(501));
    act(() => result.current.setQuantity(2));
    act(() => result.current.select(501));
    expect(result.current.quantity).toBe(2);
    expect(result.current.warning).toBe(false);
  });

  it('매진 티켓을 눌러도 경고가 켜지지 않는다', async () => {
    const { result } = await loaded();
    act(() => result.current.select(501));
    act(() => result.current.select(502));
    expect(result.current.warning).toBe(false);
  });
});

describe('티켓 선택 — 다시 읽은 GP-5에 맞춘다', () => {
  it('잔여가 줄면 수량이 새 상한으로 줄고, 매진되면 선택이 풀린다', async () => {
    const { result, queryClient } = await loaded();
    act(() => result.current.select(501));
    act(() => result.current.setQuantity(4));

    server.use(
      ...ticketItemHandlers.with([
        { ...ticketItemSets.normal[0]!, ticketItemId: 501, remaining: 2 },
      ]),
    );
    await act(() => queryClient.refetchQueries({ queryKey: ['events', '101', 'ticket-items'] }));
    await waitFor(() => expect(result.current.quantity).toBe(2));
    expect(result.current.checkoutHref).toContain('quantity=2');

    server.use(
      ...ticketItemHandlers.with([
        {
          ...ticketItemSets.normal[0]!,
          ticketItemId: 501,
          remaining: 0,
          isSoldOut: true,
          isPurchasable: false,
        },
      ]),
    );
    await act(() => queryClient.refetchQueries({ queryKey: ['events', '101', 'ticket-items'] }));
    await waitFor(() => expect(result.current.selected).toBeNull());
    expect(result.current.amount).toBe(0);
  });

  it('staleTime 0 — 마운트할 때마다 다시 읽는다(서버 프리페치 없음)', async () => {
    const { queryClient } = await loaded();
    const query = queryClient.getQueryCache().find({ queryKey: ['events', '101', 'ticket-items'] });
    expect(query?.isStale()).toBe(true);
  });
});
