'use client';

import { Icon } from '../../icons/Icon';
import * as s from './DataTable.css';
import { paginationRange } from './paginationRange';

export type PaginationProps = {
  /** 0부터 */
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  /** nav 이름. 기본 "페이지" */
  'aria-label'?: string;
};

/**
 * 이전 · 번호 · 다음(antd Table 페이지네이션 대체 — tech-decisions §16). 화면에는 1부터 보인다.
 * 현재 페이지는 `aria-current="page"`. 버튼이라 Tab으로 이동하고 Enter·Space로 누른다.
 */
export function Pagination({
  pageIndex,
  pageCount,
  onPageChange,
  'aria-label': label = '페이지',
}: PaginationProps) {
  const items = paginationRange(pageIndex, pageCount);
  const go = (index: number) => {
    if (index !== pageIndex && index >= 0 && index < pageCount) onPageChange(index);
  };
  return (
    <nav aria-label={label}>
      <ul className={s.pagination}>
        <li>
          <button
            type="button"
            className={s.pageButton}
            aria-label="이전 페이지"
            disabled={pageIndex <= 0}
            onClick={() => go(pageIndex - 1)}
          >
            <Icon name="chevron-left" size={24} />
          </button>
        </li>
        {items.map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                className={s.pageButton}
                aria-label={`${item + 1}페이지`}
                aria-current={item === pageIndex ? 'page' : undefined}
                onClick={() => go(item)}
              >
                {item + 1}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden className={s.ellipsis}>
              …
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={s.pageButton}
            aria-label="다음 페이지"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => go(pageIndex + 1)}
          >
            <Icon name="chevron-right" size={24} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
