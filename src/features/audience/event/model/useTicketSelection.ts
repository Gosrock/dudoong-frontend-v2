'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { EventDisplayStatus } from '@/api/event/schema';
import { orderTotalAmount } from '@/api/order/price';
import { eventTicketItemsQuery } from '@/api/ticket-item/queries';
import { checkoutHref } from '@/features/audience/checkout/model/checkout-params';

import { ticketListState, type TicketView, toTicketView } from './ticket-state';

/** 다른 티켓을 고를 때의 경고(GUI `331:7397`, patterns §15). 두 줄 */
export const ONE_TICKET_KIND_WARNING = [
  '티켓은 한 주문당 한 종류만 구매할 수 있습니다.',
  '다른 티켓의 구매를 원하실 경우 티켓 선택을 취소해주세요.',
] as const;

type Picked = { ticketItemId: number; quantity: number };

/**
 * 공연 상세의 티켓 선택(plan P6). 모바일 바텀시트와 PC 오른쪽 카드가 이 훅 하나를 같이 쓴다 — 시트를 여는 동작은 없다(V).
 *
 * - GP-5를 브라우저에서 `staleTime: 0`으로 읽는다(서버 프리페치 없음 — 잔여가 자주 바뀐다). 포커스 때 다시 읽는다.
 * - 1주문 1종류: 이미 고른 티켓이 있을 때 다른 티켓을 고르면 선택을 바꾸지 않고 `warning`을 켠다. 지우기(`clear`) 뒤에 고른다.
 * - 수량은 1..상한(min(purchaseLimit, remaining, 100)). 다시 읽은 GP-5로 상한이 줄면 수량도 따라 줄고,
 *   고른 티켓이 사라지거나 살 수 없게 되면 선택이 풀린다(렌더 중 파생 — effect 없음).
 * - 금액은 티켓 값만(`price × 수량`). 옵션 추가금은 체크아웃에서 더한다.
 *
 * @param eventDisplayStatus GP-3의 `displayStatus`(지난 공연 판정). 공연 상세 라우트가 프리페치한 값을 넘긴다
 */
export function useTicketSelection(
  eventId: string | number,
  eventDisplayStatus: EventDisplayStatus | null | undefined,
) {
  const query = useQuery({
    ...eventTicketItemsQuery(eventId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const [picked, setPicked] = useState<Picked | null>(null);
  const [warning, setWarning] = useState(false);

  const tickets: TicketView[] = (query.data ?? []).map((t) => toTicketView(t, eventDisplayStatus));
  const listState = query.data ? ticketListState(query.data, eventDisplayStatus) : null;

  // 최신 GP-5 기준으로 선택을 맞춘다. 살 수 없게 됐으면 선택 없음으로 본다
  const pickedView = picked
    ? tickets.find((t) => t.ticket.ticketItemId === picked.ticketItemId)
    : undefined;
  const selected =
    picked && pickedView && pickedView.state === 'PURCHASABLE'
      ? {
          ...pickedView,
          quantity: Math.min(picked.quantity, pickedView.maxQuantity),
        }
      : null;
  const quantity = selected?.quantity ?? 0;
  const maxQuantity = selected?.maxQuantity ?? 0;

  const select = (ticketItemId: number) => {
    const view = tickets.find((t) => t.ticket.ticketItemId === ticketItemId);
    if (!view || view.state !== 'PURCHASABLE') return;
    if (selected && selected.ticket.ticketItemId !== ticketItemId) {
      setWarning(true);
      return;
    }
    if (selected) return;
    setWarning(false);
    setPicked({ ticketItemId, quantity: 1 });
  };

  const setQuantity = (next: number) => {
    if (!selected || !Number.isFinite(next)) return;
    const clamped = Math.max(1, Math.min(Math.trunc(next), selected.maxQuantity));
    setPicked({ ticketItemId: selected.ticket.ticketItemId, quantity: clamped });
  };

  const clear = () => {
    setPicked(null);
    setWarning(false);
  };
  const dismissWarning = () => setWarning(false);

  const amount = selected
    ? orderTotalAmount({
        price: selected.ticket.price,
        quantity: selected.quantity,
        options: { applyToAll: true, answers: [] },
      })
    : 0;

  return {
    /** GP-5 조회 상태. 실패 화면·스켈레톤은 V가 정한다 */
    status: query.status,
    refetch: query.refetch,
    tickets,
    /** 목록 전체 상태(매진·판매 불가·지난 공연·없음). 조회 전에는 `null` */
    listState,
    /** 고른 티켓(최신 GP-5 기준으로 맞춘 수량). 없으면 `null` */
    selected,
    quantity,
    maxQuantity,
    canIncrement: selected !== null && quantity < maxQuantity,
    canDecrement: selected !== null && quantity > 1,
    /** 티켓 금액(원). 옵션 추가금은 체크아웃에서 */
    amount,
    /** 1주문 1종류 경고가 켜져 있는지. 문구는 `ONE_TICKET_KIND_WARNING` */
    warning,
    select,
    setQuantity,
    increment: () => setQuantity(quantity + 1),
    decrement: () => setQuantity(quantity - 1),
    /** 선택 취소(GUI ×). 경고도 끈다 */
    clear,
    dismissWarning,
    /** 체크아웃 주소(`?ticketItemId=&quantity=`). 고른 티켓이 없으면 `null` */
    checkoutHref: selected
      ? checkoutHref(eventId, { ticketItemId: selected.ticket.ticketItemId, quantity })
      : null,
  };
}

export type TicketSelection = ReturnType<typeof useTicketSelection>;
