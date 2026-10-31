'use client';

import {
  type ColumnDef,
  createColumnHelper,
  type RowData,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { type KeyboardEvent, type ReactNode, useMemo } from 'react';

import * as s from './DataTable.css';
import { Pagination } from './Pagination';

export type DataTableColumn<T extends RowData> = {
  id: string;
  header: ReactNode;
  /** 셀 내용 */
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** CSS 폭(예: 120, '20%') */
  width?: number | string;
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
  const rows = table.getRowModel().rows;
  const meta = (id: string) => columns.find((c) => c.id === id);

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
        tabIndex={onRowClick ? 0 : undefined}
        aria-label={onRowClick && getRowLabel ? getRowLabel(row.original) : undefined}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        onKeyDown={onRowClick ? (e) => onRowKeyDown(e, row.original) : undefined}
      >
        {row.getAllCells().map((cell) => {
          const m = meta(cell.column.id);
          return (
            <td key={cell.id} className={`${s.td} ${s.align[m?.align ?? 'left']}`}>
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
          <caption className={s.caption}>{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const m = meta(header.column.id);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`${s.th} ${s.align[m?.align ?? 'left']}`}
                      style={m?.width !== undefined ? { width: m.width } : undefined}
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
      {pageCount > 1 && onPageChange ? (
        <Pagination pageIndex={pageIndex} pageCount={pageCount} onPageChange={onPageChange} />
      ) : null}
    </div>
  );
}
