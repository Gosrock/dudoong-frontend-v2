import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useClampPage } from './useTableQueryState';

describe('useClampPage — 페이지 수가 줄면 마지막 페이지로(리뷰 #147)', () => {
  it('2페이지(1)에서 다시 읽은 페이지 수가 1이면 첫 페이지(0)로', () => {
    const setPage = vi.fn();
    const { rerender } = renderHook(({ total }) => useClampPage(1, total, setPage), {
      initialProps: { total: 2 as number | null },
    });
    expect(setPage).not.toHaveBeenCalled();
    rerender({ total: 1 });
    expect(setPage).toHaveBeenCalledWith(0);
  });

  it('목록이 아예 비면(0) 첫 페이지로, 페이지 수를 모르면(null) 그대로', () => {
    const setPage = vi.fn();
    renderHook(() => useClampPage(3, null, setPage));
    expect(setPage).not.toHaveBeenCalled();
    renderHook(() => useClampPage(3, 0, setPage));
    expect(setPage).toHaveBeenCalledWith(0);
  });

  it('범위 안이면 건드리지 않는다', () => {
    const setPage = vi.fn();
    renderHook(() => useClampPage(2, 3, setPage));
    renderHook(() => useClampPage(0, 0, setPage));
    expect(setPage).not.toHaveBeenCalled();
  });
});
