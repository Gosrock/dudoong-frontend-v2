'use client';

import { assignInlineVars } from '@vanilla-extract/dynamic';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import * as s from './TagButton.css';

export type TagButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'aria-pressed' | 'onChange'
> & {
  selected: boolean;
  onSelectedChange?: (selected: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

/** 태그 칩 하나 — 눌러서 켜고 끄는 토글 버튼(aria-pressed) */
export function TagButton({
  selected,
  onSelectedChange,
  onClick,
  className,
  children,
  ...rest
}: TagButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={className ? `${s.chip} ${className}` : s.chip}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          rest['aria-disabled'] === true ||
          rest['aria-disabled'] === 'true'
        )
          return;
        onSelectedChange?.(!selected);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export type TagOption = { value: string; label: ReactNode; disabled?: boolean };

export type TagButtonGroupProps = {
  options: TagOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** 최대 선택 수. 닿으면 나머지 칩은 aria-disabled(포커스는 남는다) */
  max?: number;
  /** 열 수. 없으면 글자 길이대로 줄바꿈 */
  columns?: number;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** 첫 칩. RHF Controller의 `field.ref`를 넘기면 검증 실패 때 포커스가 간다 */
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
  className?: string;
};

/**
 * 태그 다중 선택(GUI `329:7170` 호스팅 기본 정보 4열). 값은 고른 순서가 아니라 `options` 순서로 돌려준다.
 */
export function TagButtonGroup({
  options,
  value,
  onChange,
  max,
  columns,
  disabled,
  ref,
  onBlur,
  className,
  ...aria
}: TagButtonGroupProps) {
  const full = max != null && value.length >= max;
  const toggle = (v: string, on: boolean) => {
    const next = new Set(value);
    if (on) next.add(v);
    else next.delete(v);
    onChange(options.map((o) => o.value).filter((x) => next.has(x)));
  };
  const layout = columns ? s.grid : s.wrap;
  return (
    <div
      role="group"
      className={className ? `${layout} ${className}` : layout}
      style={columns ? assignInlineVars({ [s.columns]: String(columns) }) : undefined}
      onBlur={onBlur}
      {...aria}
    >
      {options.map((o, i) => {
        const selected = value.includes(o.value);
        const blocked = full && !selected;
        return (
          <TagButton
            key={o.value}
            ref={i === 0 ? ref : undefined}
            selected={selected}
            disabled={disabled || o.disabled}
            aria-disabled={blocked || undefined}
            onSelectedChange={(on) => toggle(o.value, on)}
          >
            {o.label}
          </TagButton>
        );
      })}
    </div>
  );
}
