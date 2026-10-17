import { describe, expect, it } from 'vitest';

import { paginationRange } from './paginationRange';

describe('paginationRange', () => {
  it('페이지가 없으면 빈 줄', () => {
    expect(paginationRange(0, 0)).toEqual([]);
  });

  it('7쪽 이하면 모두', () => {
    expect(paginationRange(0, 1)).toEqual([0]);
    expect(paginationRange(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('앞쪽이면 끝에만 말줄임', () => {
    expect(paginationRange(0, 20)).toEqual([0, 1, 2, 3, 4, 'ellipsis-end', 19]);
    expect(paginationRange(3, 20)).toEqual([0, 1, 2, 3, 4, 'ellipsis-end', 19]);
  });

  it('가운데면 양쪽 말줄임', () => {
    expect(paginationRange(5, 20)).toEqual([0, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 19]);
  });

  it('뒤쪽이면 앞에만 말줄임', () => {
    expect(paginationRange(19, 20)).toEqual([0, 'ellipsis-start', 15, 16, 17, 18, 19]);
    expect(paginationRange(16, 20)).toEqual([0, 'ellipsis-start', 15, 16, 17, 18, 19]);
  });

  it('항목 수가 위치와 상관없이 같다', () => {
    for (let i = 0; i < 30; i++) expect(paginationRange(i, 30)).toHaveLength(7);
  });

  it('범위를 벗어난 pageIndex는 잘라 쓴다', () => {
    expect(paginationRange(99, 20)).toEqual(paginationRange(19, 20));
    expect(paginationRange(-1, 20)).toEqual(paginationRange(0, 20));
  });
});
