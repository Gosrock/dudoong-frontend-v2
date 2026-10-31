'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { guestsSearch, type GuestTab, parseGuestTab, parseOrderParam } from './guest-rules';

/** `?order=`로 연 주문 상세가 넣는 history 표시(patterns §6 — `useCloseOnBack`의 `ddOverlay`와 같은 자리) */
export const ORDER_OVERLAY_MARK = 'guests-order';

const hasOrderMark = () =>
  (window.history.state as { ddOverlay?: unknown } | null)?.ddOverlay === ORDER_OVERLAY_MARK;

/** 얕은 교체 — 서버를 다시 부르지 않는다. 첫 인자는 `null`(patterns §13 — Next 내부 state를 넘기면 `useSearchParams`가 갱신되지 않는다) */
function replaceSearch(change: Parameters<typeof guestsSearch>[1]) {
  const { pathname, search, hash } = window.location;
  const next = guestsSearch(search, change);
  if (next === search) return;
  window.history.replaceState(null, '', `${pathname}${next}${hash}`);
}

/**
 * 예매자 관리의 주소 상태(plan P13a, patterns §6, tech-decisions §3) — `?tab=orders|tickets|refunds`(기본 주문 탭은 주소에 없음)와
 * `?order={orderUuid}`(주문 상세). UI 동작은 없다 — 페이지가 이 값을 보고 상세를 선언적으로 그린다.
 *
 * - 탭: 얕은 `replaceState` — 새로고침해도 남고 기록은 쌓지 않는다. 탭을 바꾸면 `order`는 지운다
 * - 열기: `pushState({ ddOverlay }, '', ?order=…)` — 뒤로가기는 상세만 닫는다(Next가 `pushState`를 따라 `useSearchParams`를 바꾼다)
 * - 닫기: 내 표시가 맨 위면 `router.back()`(그 항목을 소비 — 닫은 뒤 뒤로가기가 헛돌지 않는다), 없으면(알림·주소로 바로 들어옴)
 *   `order`만 지우는 얕은 교체(`?tab=`은 남긴다). plan은 `router.replace`라고 적었지만 같은 결과에 서버 왕복이 없는 얕은 교체를 쓴다
 */
export function useGuestsUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseGuestTab(searchParams);
  const orderUuid = parseOrderParam(searchParams);

  const setTab = useCallback((next: GuestTab) => replaceSearch({ tab: next, order: null }), []);

  const openOrder = useCallback((uuid: string) => {
    const { pathname, search, hash } = window.location;
    const next = guestsSearch(search, { order: uuid });
    if (next === search) return;
    if (parseOrderParam(new URLSearchParams(search)) !== null && hasOrderMark()) {
      // 상세에서 다른 주문으로 — 항목을 더 쌓지 않는다
      window.history.replaceState(
        { ddOverlay: ORDER_OVERLAY_MARK },
        '',
        `${pathname}${next}${hash}`,
      );
      return;
    }
    window.history.pushState({ ddOverlay: ORDER_OVERLAY_MARK }, '', `${pathname}${next}${hash}`);
  }, []);

  const closeOrder = useCallback(() => {
    if (parseOrderParam(new URLSearchParams(window.location.search)) === null) return;
    if (hasOrderMark()) router.back();
    else replaceSearch({ order: null });
  }, [router]);

  return { tab, setTab, orderUuid, openOrder, closeOrder };
}
