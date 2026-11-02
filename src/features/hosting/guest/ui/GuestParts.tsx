'use client';

import type { ReactNode } from 'react';

import { Button } from '@/ui/components/Button/Button';
import type { DataTableColumn } from '@/ui/components/DataTable/DataTable';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { CountFilterChip } from '@/ui/components/FilterChip/FilterChip';
import { SearchField } from '@/ui/components/SearchField/SearchField';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as v from '../GuestsView.css';
import * as s from './GuestParts.css';

/**
 * 예매자 관리 탭들이 같이 쓰는 줄 — GUI(2026-11-01 Ready): 데스크탑 `980:24267` "도구 줄"(상태 필터 왼쪽 · 검색 오른쪽 440),
 * 모바일 `980:24474`(상태 필터 → 검색 세로). 상태 필터는 DS Filter Chip 개수형(#61), 검색은 DS dropdown + Search Field.
 */

export type FilterOption<K extends string> = {
  key: K;
  label: string;
  count: number | null;
  selected: boolean;
};

/** 상태 칩 줄(DS Filter Chip `selected/number` · `deselected/number`, 하나만 고른다). 모바일은 넘치면 가로 스크롤 */
export function FilterRow<K extends string>({
  label,
  options,
  onSelect,
  testIdPrefix,
}: {
  label: string;
  options: readonly FilterOption<K>[];
  onSelect: (key: K) => void;
  testIdPrefix?: string;
}) {
  return (
    <div role="group" aria-label={label} className={s.filters}>
      {options.map((o) => (
        <CountFilterChip
          key={o.key}
          label={o.label}
          count={o.count}
          selected={o.selected}
          onClick={() => onSelect(o.key)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.key}` : undefined}
        />
      ))}
    </div>
  );
}

/**
 * 검색 — [기준 ⇕] [검색어를 입력해 주세요 🔍]. GUI에 [검색] 버튼이 없다 — Enter로 적용(입력 중 자동 검색 없음 — L 결정 3),
 * 지우기 버튼은 검색을 푼다. 일반 멤버의 완전 일치 안내는 검색 줄 아래(GUI `1029:4569` — PC 오른쪽 정렬)
 */
export function SearchBar<K extends string>({
  label,
  types,
  type,
  onTypeChange,
  keyword,
  onKeywordChange,
  keywordMax,
  onSubmit,
}: {
  /** 검색 칸 이름(예: "주문 검색어") */
  label: string;
  types: readonly { key: K; label: string }[];
  type: K;
  onTypeChange: (type: K) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  keywordMax: number;
  onSubmit: () => void;
}) {
  return (
    <form
      role="search"
      aria-label={label}
      className={s.search}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className={s.searchType}>
        <Dropdown
          aria-label="검색 기준"
          options={types.map((t) => ({ value: t.key, label: t.label }))}
          value={type}
          onValueChange={(v) => onTypeChange(v as K)}
        />
      </div>
      <SearchField
        aria-label={label}
        className={s.searchInput}
        value={keyword}
        maxLength={keywordMax}
        enterKeyHint="search"
        onChange={(e) => onKeywordChange(e.target.value)}
        onClear={onSubmit}
      />
    </form>
  );
}

/** 상태 필터 + 검색 한 줄(PC) · 두 줄(모바일). 완전 일치 안내는 그 아래 */
export function Toolbar({
  filters,
  search,
  hint,
}: {
  filters: ReactNode;
  search?: ReactNode;
  hint?: string | null;
}) {
  return (
    <Flex direction="column" gap={3}>
      <div className={s.toolbar}>
        {filters}
        {search}
      </div>
      {hint && (
        <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.hint}>
          <span data-testid="exact-hint">{hint}</span>
        </Txt>
      )}
    </Flex>
  );
}

/** 표 아래 엑셀 버튼 — GUI DS Button Secondary small "엑셀로 다운로드". 표가 비었거나 실패면 비활성(`1029:4849`) */
export function ExportButton({
  label,
  exporting,
  disabled,
  onExport,
}: {
  /** 접근성 이름(예: "주문 엑셀로 다운로드") */
  label: string;
  exporting: boolean;
  disabled?: boolean;
  onExport: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={label}
      loading={exporting}
      disabled={disabled}
      onClick={onExport}
    >
      엑셀로 다운로드
    </Button>
  );
}

/** 안내·에러 한 줄(닫기 있음) — 엑셀 실패, 404로 닫힌 상세, 처리 실패 */
export function NoticeLine({
  children,
  onDismiss,
  tone = 'danger',
}: {
  children: ReactNode;
  onDismiss?: () => void;
  tone?: 'danger' | 'info';
}) {
  return (
    <Flex align="center" gap={2} role="alert">
      <Txt
        typography="bodyMd"
        color={tone === 'danger' ? colors.textDangerLabel : colors.textSecondaryLabel}
      >
        {children}
      </Txt>
      {onDismiss && (
        <button type="button" className={s.noticeClose} aria-label="안내 닫기" onClick={onDismiss}>
          <Icon name="close" size={12} />
        </button>
      )}
    </Flex>
  );
}

/** 목록을 불러오지 못했을 때 — 표 안 가운데(GUI `1029:5135` "주문을 불러오지 못했어요." + [다시 시도]) */
export function ListError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <Flex direction="column" align="center" gap={3} role="alert">
      <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
        {what}을 불러오지 못했어요.
      </Txt>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </Flex>
  );
}

export function ListLoading() {
  return (
    <Txt typography="bodyMd" color={colors.textSecondary}>
      불러오는 중
    </Txt>
  );
}

/** 빈 표 — GUI `1029:4849` "검색 결과가 없어요" · `1031:9948` "환불할 주문이 없어요." */
export function Empty({ children }: { children: string }) {
  return (
    <span data-testid="list-empty">
      <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
        {children}
      </Txt>
    </span>
  );
}

/** 표 칸을 줄바꿈 없이 그린다(좁으면 표가 가로 스크롤) */
export function nowrapColumns<T extends object>(
  columns: DataTableColumn<T>[],
): DataTableColumn<T>[] {
  return columns.map((c) => ({
    ...c,
    cell: (row: T, i: number) => <span className={v.nowrap}>{c.cell(row, i)}</span>,
  }));
}

/** 칸 클릭이 행 클릭(상세 열기)으로 번지지 않게 */
export function StopRowClick({ children }: { children: ReactNode }) {
  return (
    <span
      className={s.rowActions}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
}
