'use client';

import type { ReactNode } from 'react';

import { Button } from '@/ui/components/Button/Button';
import type { DataTableColumn } from '@/ui/components/DataTable/DataTable';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { SearchField } from '@/ui/components/SearchField/SearchField';
import { TagButton } from '@/ui/components/TagButton/TagButton';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as v from '../GuestsView.css';
import * as s from './GuestParts.css';

/**
 * 예매자 관리 탭들이 같이 쓰는 줄(와이어 `424:11710`·`424:12014` 구조) — 상태 칩 줄 · 검색 줄 · 표 아래 줄(엑셀) · 안내 줄.
 * 와이어 근거라 DS 컴포넌트·토큰만 쓴다(design-workflow §3).
 */

export type FilterOption<K extends string> = {
  key: K;
  label: string;
  count: number | null;
  selected: boolean;
};

/** 상태 칩 줄 — 와이어 "전체 5 · 승인대기 5 · …"(DS `TagButton`, 하나만 고른다). 좁으면 가로 스크롤 */
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
        <TagButton
          key={o.key}
          selected={o.selected}
          onSelectedChange={() => onSelect(o.key)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.key}` : undefined}
        >
          {o.count === null ? o.label : `${o.label} ${o.count.toLocaleString('ko-KR')}`}
        </TagButton>
      ))}
    </div>
  );
}

/** 검색 줄 — 와이어 [이름 ▾] [검색어를 입력하세요] [검색]. 검색은 [검색]·Enter로 적용(입력 중 자동 검색 없음 — L 결정 3) */
export function SearchBar<K extends string>({
  label,
  types,
  type,
  onTypeChange,
  keyword,
  onKeywordChange,
  keywordMax,
  onSubmit,
  hint,
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
  /** 일반 멤버의 완전 일치 안내 */
  hint: string | null;
}) {
  return (
    <form
      role="search"
      className={s.search}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className={s.searchRow}>
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
          placeholder="검색어를 입력하세요"
          value={keyword}
          maxLength={keywordMax}
          onChange={(e) => onKeywordChange(e.target.value)}
          onClear={onSubmit}
        />
        <Button type="submit" variant="secondary" size="md">
          검색
        </Button>
      </div>
      {hint && (
        <Txt as="p" typography="bodySm" color={colors.textSecondaryLabel}>
          <span data-testid="exact-hint">{hint}</span>
        </Txt>
      )}
    </form>
  );
}

/** 표 아래 엑셀 버튼 — 와이어 "엑셀로 다운로드"(검정). 매니저 이상만(버튼을 그릴지는 훅 `canExport`) */
export function ExportButton({
  label,
  exporting,
  onExport,
}: {
  /** 접근성 이름(예: "주문 엑셀로 다운로드") */
  label: string;
  exporting: boolean;
  onExport: () => void;
}) {
  return (
    <Button variant="dark" size="md" aria-label={label} loading={exporting} onClick={onExport}>
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
    <div role="alert" className={s.notice}>
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
    </div>
  );
}

/** 목록을 불러오지 못했을 때 */
export function ListError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className={s.notice}>
      <Flex align="center" gap={2} wrap>
        <Txt typography="bodyMd">{what}을 불러오지 못했어요.</Txt>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      </Flex>
    </div>
  );
}

/** 표 아래 줄 — 엑셀 버튼(오른쪽). 페이지 번호는 DataTable 안 */
export function TableFooter({ children }: { children: ReactNode }) {
  return <div className={s.footer}>{children}</div>;
}

export function ListLoading() {
  return (
    <Txt typography="bodyMd" color={colors.textSecondary}>
      불러오는 중
    </Txt>
  );
}

export function Empty({ children }: { children: string }) {
  return (
    <span data-testid="list-empty">
      <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
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
