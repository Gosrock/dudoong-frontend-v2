import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('처음 값은 바로, 바뀐 값은 ms 동안 조용하면 따라간다', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });
    expect(result.current).toBe('');

    rerender({ v: '두' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: '두둥' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(''); // 아직 입력 중

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('두둥'); // 마지막 값만
  });

  it('함수 값도 그대로 담는다', () => {
    const f = () => 1;
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 50), {
      initialProps: { v: f as () => number },
    });
    const g = () => 2;
    rerender({ v: g });
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe(g);
  });

  it('언마운트하면 대기 중인 갱신을 버린다', () => {
    const { result, rerender, unmount } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe('a');
  });
});
