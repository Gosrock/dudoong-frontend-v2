import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDER_OVERLAY_MARK, useGuestsUrlState } from './useGuestsUrlState';

/** Next 라우터 대신 — `useSearchParams`는 지금 주소를, `router.back`은 실제 history를 쓴다(jsdom) */
const back = vi.fn(() => window.history.back());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const PATH = '/hosting/events/101/guests';
const go = (search: string) => window.history.replaceState(null, '', `${PATH}${search}`);
const url = () => `${window.location.pathname}${window.location.search}`;
/** popstate까지 기다린다(jsdom의 history.back은 비동기) */
const popped = () => new Promise((r) => window.addEventListener('popstate', r, { once: true }));

beforeEach(() => go(''));
afterEach(() => back.mockClear());

describe('?tab= · ?order= 주소 상태(patterns §6)', () => {
  it('탭은 주소에 남는다(기본 주문 탭은 주소에 없음) — 기록을 쌓지 않는다', () => {
    const { result, rerender } = renderHook(() => useGuestsUrlState());
    expect(result.current.tab).toBe('orders');
    const length = window.history.length;
    act(() => result.current.setTab('refunds'));
    rerender();
    expect([url(), result.current.tab]).toEqual([`${PATH}?tab=refunds`, 'refunds']);
    act(() => result.current.setTab('orders'));
    rerender();
    expect(url()).toBe(PATH);
    expect(window.history.length).toBe(length);
  });

  it('새로고침(주소로 들어옴)해도 탭 유지, ?order=로 들어오면 상세가 열린 상태', () => {
    go('?tab=tickets');
    expect(renderHook(() => useGuestsUrlState()).result.current.tab).toBe('tickets');
    go('?order=mock-order-1');
    const { result } = renderHook(() => useGuestsUrlState());
    expect([result.current.tab, result.current.orderUuid]).toEqual(['orders', 'mock-order-1']);
  });

  it('열기 = pushState(ddOverlay) → 뒤로가기는 상세만 닫는다', async () => {
    const { result, rerender } = renderHook(() => useGuestsUrlState());
    act(() => result.current.openOrder('u1'));
    rerender();
    expect(result.current.orderUuid).toBe('u1');
    expect((window.history.state as { ddOverlay?: string }).ddOverlay).toBe(ORDER_OVERLAY_MARK);
    const done = popped();
    window.history.back();
    await done;
    rerender();
    expect([url(), result.current.orderUuid]).toEqual([PATH, null]);
  });

  it('닫기로 닫으면 내 항목을 소비(router.back) — 닫은 뒤 뒤로가기가 헛돌지 않는다', async () => {
    go('?tab=orders');
    const { result, rerender } = renderHook(() => useGuestsUrlState());
    act(() => result.current.openOrder('u1'));
    expect((window.history.state as { ddOverlay?: string }).ddOverlay).toBe(ORDER_OVERLAY_MARK);
    const done = popped();
    act(() => result.current.closeOrder());
    await done;
    rerender();
    expect(back).toHaveBeenCalledTimes(1);
    expect([url(), result.current.orderUuid]).toEqual([`${PATH}?tab=orders`, null]);
  });

  it('알림·주소로 바로 들어와 표시가 없으면 order만 지우는 교체(?tab=은 남긴다)', () => {
    go('?tab=orders&order=u9');
    const { result, rerender } = renderHook(() => useGuestsUrlState());
    const length = window.history.length;
    act(() => result.current.closeOrder());
    rerender();
    expect(back).not.toHaveBeenCalled();
    expect(url()).toBe(`${PATH}?tab=orders`);
    expect(window.history.length).toBe(length);
    expect(result.current.orderUuid).toBeNull();
  });

  it('상세에서 다른 주문을 열면 항목을 더 쌓지 않는다, 탭을 바꾸면 order는 지운다', () => {
    const { result, rerender } = renderHook(() => useGuestsUrlState());
    act(() => result.current.openOrder('u1'));
    const length = window.history.length;
    act(() => result.current.openOrder('u2'));
    rerender();
    expect([window.history.length, result.current.orderUuid]).toEqual([length, 'u2']);
    act(() => result.current.setTab('refunds'));
    rerender();
    expect(url()).toBe(`${PATH}?tab=refunds`);
  });
});
