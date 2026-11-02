import type { ComponentPropsWithRef } from 'react';

import { Icon } from '../../icons/Icon';
import { Badge } from '../Badge/Badge';
import * as s from './FilterChip.css';

export type FilterChipProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  /** 칩 글자 — Figma는 "태그"로 고정이지만 텍스트 속성으로 받는다 */
  label: string;
  /** 고른 개수. 1 이상이면 선택 상태(숫자 Badge) */
  count?: number;
  /**
   * 열림. Radix `Popover.Trigger asChild` 안에 두면 Radix가 `aria-expanded`를 넣어 주므로 주지 않아도 된다.
   * 단독으로 쓸 때만 준다.
   */
  open?: boolean;
};

/**
 * Figma Filter Chip(selected/open 4상태). 열림 표시는 `aria-expanded`가 정한다(chevron 회전).
 * 모든 props와 `ref`를 `<button>`에 넘기므로 Radix `asChild`로 감쌀 수 있다:
 *
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild><FilterChip label="태그" count={2} /></Popover.Trigger>
 *   <Popover.Content>…</Popover.Content>
 * </Popover.Root>
 * ```
 */
export function FilterChip({
  label,
  count = 0,
  open,
  className,
  type = 'button',
  ...rest
}: FilterChipProps) {
  const selected = count > 0;
  return (
    <button
      type={type}
      aria-expanded={open}
      data-selected={selected ? 'true' : undefined}
      className={className ? `${s.root} ${className}` : s.root}
      {...rest}
    >
      {label}
      {selected ? <span className={s.srOnly}>, {count}개 선택됨</span> : null}
      <span className={s.chevron} aria-hidden>
        <Icon name="chevron-down" size={12} />
      </span>
      {selected ? <Badge count={count} className={s.badge} /> : null}
    </button>
  );
}

export type CountFilterChipProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  label: string;
  /** 개수. `null`(아직 모름)·0이면 숫자를 그리지 않는다(GUI 예매자 관리 — "승인 대기"만 남은 칩) */
  count?: number | null;
  /** 고른 칩(테두리 검정). `aria-pressed`로 나간다 */
  selected: boolean;
};

/**
 * Figma Filter Chip 개수형(`state` `selected/number` `776:2019` · `deselected/number` `776:2030` — #61, 2026-11-01).
 * 32h · 패딩 6·12 · 간격 4 · 모서리 8 · 흰 배경, 글자 + 개수(`Label/sm`). chevron·Badge 없음 — 펼치지 않고 누르면 그 값으로 거르는
 * 단일 선택 필터(예매자 관리 상태 칩). 고른 칩은 테두리 `text/primary-label`
 */
export function CountFilterChip({
  label,
  count,
  selected,
  className,
  type = 'button',
  ...rest
}: CountFilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      data-selected={selected ? 'true' : undefined}
      className={[s.root, s.count, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {label}
      {count ? <span>{count.toLocaleString('ko-KR')}</span> : null}
    </button>
  );
}
