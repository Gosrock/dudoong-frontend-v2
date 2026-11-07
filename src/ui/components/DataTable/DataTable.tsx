'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  type ColumnDef,
  createColumnHelper,
  type RowData,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { type CSSProperties, type KeyboardEvent, type ReactNode, useMemo } from 'react';

import * as s from './DataTable.css';
import { Pagination } from './Pagination';

export type DataTableColumn<T extends RowData> = {
  id: string;
  header: ReactNode;
  /** 셀 내용 */
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** CSS 폭(예: 120, '20%') — PC(1024~)에서만. 칸 사이 간격(양쪽 안쪽 여백)을 포함한 폭 */
  width?: number | string;
  /**
   * 모바일(~1023) CSS 폭 — 칸 사이 간격 포함(모바일 안쪽 여백 4씩, 양 끝 칸은 12 · 8). 없으면 내용 폭.
   * 폭을 준 칸 밖의 칸이 남은 폭을 나눈다(GUI 모바일 표 — 주문자 칸 FILL, 나머지 FIXED, I-h5)
   */
  mobileWidth?: number | string;
  /** 이 폭에서만 보인다(모바일 표에서 칸을 줄일 때). 기본 둘 다 */
  display?: 'all' | 'desktop' | 'mobile';
};

export type DataTableProps<T extends RowData> = {
  columns: ReadonlyArray<DataTableColumn<T>>;
  data: ReadonlyArray<T>;
  /** 행 key. 없으면 순번 */
  getRowId?: (row: T, index: number) => string;
  /** 표 이름(스크린리더 caption). 화면에 보이는 제목이 있으면 그 글을 준다 */
  caption: string;
  /** 서버사이드 페이지네이션 — 0부터. `pageCount`가 1 이하면 페이지 줄을 그리지 않는다 */
  pageIndex?: number;
  pageCount?: number;
  onPageChange?: (pageIndex: number) => void;
  /** 행을 누르면(Enter·Space 포함) — 상세 열기 등 */
  onRowClick?: (row: T) => void;
  /** 행 접근성 이름(행 클릭이 있을 때). 기본은 행 글자 전체 */
  getRowLabel?: (row: T) => string;
  /** 데이터가 0건일 때 표 안에 보일 내용 */
  empty?: ReactNode;
  /** 행마다 붙일 `data-testid`(테스트·QA가 행을 찾을 때) */
  rowTestId?: string;
  /** 주면 행 대신 이 내용을 보인다(Skeleton 등). 페이지 줄은 유지 */
  loading?: ReactNode;
  /** 고른 행(배경 `surface/container`) */
  isRowSelected?: (row: T) => boolean;
  /** 페이지가 하나여도 페이지 줄을 보인다(GUI 예매자 관리 `< 1 >`) */
  alwaysShowPagination?: boolean;
  /** 페이지 줄 오른쪽 끝(GUI 예매자 관리 [엑셀로 다운로드]) — 페이지 줄은 가운데에 그대로 */
  footerEnd?: ReactNode;
};

// 정렬·필터 없이 핵심 기능만(tech-decisions §16 — antd Table 대체 근거). 모듈에 한 번만 만든다
const features = tableFeatures({});

/**
 * 표(예매자 관리 등). 동작은 `@tanstack/react-table` 9(headless), 모양은 자체 스타일.
 * 정렬·필터·클라이언트 페이지네이션은 없다 — 페이지는 서버가 나누고 `pageIndex`·`pageCount`·`onPageChange`로 받는다.
 */
export function DataTable<T extends RowData>({
  columns,
  data,
  getRowId,
  caption,
  pageIndex = 0,
  pageCount = 1,
  onPageChange,
  onRowClick,
  getRowLabel,
  empty,
  loading,
  rowTestId,
  isRowSelected,
  alwaysShowPagination = false,
  footerEnd,
}: DataTableProps<T>) {
  const defs = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return columns.map((col) =>
      helper.display({
        id: col.id,
        header: () => col.header,
        cell: (ctx) => col.cell(ctx.row.original, ctx.row.index),
      }),
    ) as Array<ColumnDef<typeof features, T>>;
  }, [columns]);

  const table = useTable({
    features,
    columns: defs,
    data: data as T[],
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
  });

  const colSpan = columns.length;
  const showPages = (pageCount > 1 || alwaysShowPagination) && onPageChange !== undefined;
  const rows = table.getRowModel().rows;
  const meta = (id: string) => columns.find((c) => c.id === id);
  // 폭마다 보이는 첫 칸 · 끝 칸(양 끝 여백) — `display`로 숨는 칸을 건너뛴다
  const onMobile = columns.filter((c) => c.display !== 'desktop').map((c) => c.id);
  const onDesktop = columns.filter((c) => c.display !== 'mobile').map((c) => c.id);
  const edges = (id: string) =>
    [
      onMobile[0] === id && s.edge.startMobile,
      onMobile.at(-1) === id && s.edge.endMobile,
      onDesktop[0] === id && s.edge.startDesktop,
      onDesktop.at(-1) === id && s.edge.endDesktop,
    ]
      .filter(Boolean)
      .join(' ');
  const cellClass = (base: string, id: string) => {
    const m = meta(id);
    return [
      base,
      s.align[m?.align ?? 'left'],
      s.display[m?.display ?? 'all'],
      edges(id),
      m?.width !== undefined && s.desktopWidth,
      m?.mobileWidth !== undefined && s.mobileWidth,
    ]
      .filter(Boolean)
      .join(' ');
  };
  const widthStyle = (id: string) => {
    const m = meta(id);
    if (m?.width === undefined && m?.mobileWidth === undefined) return undefined;
    const css = (w: number | string | undefined) => (typeof w === 'number' ? `${w}px` : w);
    return {
      ...(m.width !== undefined && { '--dt-col-width': css(m.width) }),
      ...(m.mobileWidth !== undefined && { '--dt-col-width-m': css(m.mobileWidth) }),
    } as CSSProperties;
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  let body: ReactNode;
  if (loading) {
    body = (
      <tr>
        <td className={s.slotCell} colSpan={colSpan} aria-busy="true">
          {loading}
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td className={s.slotCell} colSpan={colSpan}>
          {empty}
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr
        key={row.id}
        className={s.row}
        data-testid={rowTestId}
        data-clickable={onRowClick ? 'true' : undefined}
        data-selected={isRowSelected?.(row.original) ? 'true' : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        aria-label={onRowClick && getRowLabel ? getRowLabel(row.original) : undefined}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        onKeyDown={onRowClick ? (e) => onRowKeyDown(e, row.original) : undefined}
      >
        {row.getAllCells().map((cell) => {
          return (
            <td key={cell.id} className={cellClass(s.td, cell.column.id)}>
              <table.FlexRender cell={cell} />
            </td>
          );
        })}
      </tr>
    ));
  }

  return (
    <div>
      <div className={s.scroller}>
        <table className={s.table}>
          <VisuallyHidden asChild>
            <caption>{caption}</caption>
          </VisuallyHidden>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={cellClass(s.th, header.column.id)}
                      style={widthStyle(header.column.id)}
                    >
                      <table.FlexRender header={header} />
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {showPages || footerEnd ? (
        <div className={s.footer}>
          <div className={s.footerPages}>
            {showPages ? (
              <Pagination
                pageIndex={pageIndex}
                pageCount={Math.max(pageCount, 1)}
                onPageChange={onPageChange!}
              />
            ) : null}
          </div>
          {footerEnd ? <div className={s.footerEnd}>{footerEnd}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
