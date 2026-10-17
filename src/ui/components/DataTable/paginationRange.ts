export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * 페이지 번호 줄(0부터). 페이지가 `2 * siblings + 5`개 이하면 모두, 넘으면 처음 · 현재 ± siblings · 끝과 말줄임.
 * 항목 수가 현재 위치와 상관없이 같아서 번호를 넘겨도 버튼 자리가 흔들리지 않는다.
 *
 * 예) pageIndex 5, pageCount 20, siblings 1 → [0, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 19]
 */
export function paginationRange(pageIndex: number, pageCount: number, siblings = 1): PageItem[] {
  if (pageCount <= 0) return [];
  const total = 2 * siblings + 5;
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (pageCount <= total) return range(0, pageCount - 1);

  const last = pageCount - 1;
  const current = Math.min(Math.max(pageIndex, 0), last);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, last - 1);
  const showStart = left > 2;
  const showEnd = right < last - 2;

  if (!showStart) return [...range(0, total - 3), 'ellipsis-end', last];
  if (!showEnd) return [0, 'ellipsis-start', ...range(last - (total - 3), last)];
  return [0, 'ellipsis-start', ...range(left, right), 'ellipsis-end', last];
}
