import { MAX_ORDER_QUANTITY } from '@/api/order/price';

/**
 * 공연 상세에서 고른 티켓을 체크아웃으로 넘기는 주소(tech-decisions §3 "화면 안 상태 중 주소에 남기는 것" —
 * 체크아웃 `?ticketItemId=&quantity=`). 새로고침·로그인 왕복(`/login?redirect=…`) 뒤에도 선택이 남는다.
 * 옵션 답·결제 방식은 주소에 넣지 않는다(체크아웃 화면 안 상태).
 */
export type CheckoutParams = { ticketItemId: number; quantity: number };

export function checkoutHref(eventId: string | number, { ticketItemId, quantity }: CheckoutParams) {
  const query = new URLSearchParams({
    ticketItemId: String(ticketItemId),
    quantity: String(quantity),
  });
  return `/events/${encodeURIComponent(eventId)}/checkout?${query.toString()}`;
}

/** 공연 상세(티켓 선택으로 돌려보낼 곳) */
export const eventHref = (eventId: string | number) => `/events/${encodeURIComponent(eventId)}`;

const POSITIVE_INT = /^[1-9]\d*$/;

type SearchParamsLike =
  URLSearchParams | Record<string, string | string[] | undefined> | null | undefined;

function read(params: SearchParamsLike, key: string): string | undefined {
  if (!params) return undefined;
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * 주소의 선택을 읽는다. 양의 정수가 아니거나 수량이 1..100 밖이면 `null` — 체크아웃은 공연 상세로 돌려보낸다.
 * 티켓별 상한(1인 제한·잔여)은 여기서 보지 않는다(O-0 응답으로 체크아웃이 맞춘다).
 */
export function parseCheckoutParams(params: SearchParamsLike): CheckoutParams | null {
  const id = read(params, 'ticketItemId');
  const qty = read(params, 'quantity');
  if (!id || !qty || !POSITIVE_INT.test(id) || !POSITIVE_INT.test(qty)) return null;
  const ticketItemId = Number(id);
  const quantity = Number(qty);
  if (!Number.isSafeInteger(ticketItemId) || quantity > MAX_ORDER_QUANTITY) return null;
  return { ticketItemId, quantity };
}
