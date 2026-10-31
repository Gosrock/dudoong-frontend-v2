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
