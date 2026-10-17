'use client';

import type { ButtonHTMLAttributes, Ref } from 'react';

import { Icon } from '../../icons/Icon';
import * as s from './Counter.css';
import { clampCount, counterBounds } from './stepCount';

export type NumberingButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'type'
> & {
  icon: 'minus' | 'plus';
  ref?: Ref<HTMLButtonElement>;
};

/** Figma numbering — 20×20 −/+ 버튼. 아이콘만 있으니 `aria-label`을 준다. pressed는 CSS :active */
export function NumberingButton({ icon, className, ...rest }: NumberingButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${s.numbering} ${className}` : s.numbering}
      {...rest}
    >
      {icon === 'minus' ? <Icon name="minus" size={12} /> : <Icon name="add" size={12} />}
    </button>
  );
}

export type CounterProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** 무엇의 수량인지(예: "얼리버드 수량"). 묶음 이름과 버튼 이름("… 줄이기")에 쓴다 */
  label?: string;
  /** 줄이기 버튼. RHF Controller의 `field.ref`를 넘기면 검증 실패 때 포커스가 간다 */
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
  className?: string;
};

/**
 * 수량 스테퍼(− 숫자 +). GUI 티켓 선택 시트(`324:4503`)의 수량 줄.
 * min/max에 닿으면 그쪽 버튼이 비활성된다. 숫자가 바뀌면 스크린리더가 읽는다(aria-live).
 */
export function Counter({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  disabled,
  label = '수량',
  ref,
  onBlur,
  className,
}: CounterProps) {
  const { canDecrease, canIncrease } = counterBounds(value, min, max, step);
  return (
    <div
      role="group"
      aria-label={label}
      className={className ? `${s.stepper} ${className}` : s.stepper}
      onBlur={onBlur}
    >
      <NumberingButton
        ref={ref}
        icon="minus"
        aria-label={`${label} 줄이기`}
        disabled={disabled || !canDecrease}
        onClick={() => onChange(clampCount(value - step, min, max))}
      />
      <output aria-live="polite" className={disabled ? `${s.count} ${s.countDisabled}` : s.count}>
        {value}
      </output>
      <NumberingButton
        icon="plus"
        aria-label={`${label} 늘리기`}
        disabled={disabled || !canIncrease}
        onClick={() => onChange(clampCount(value + step, min, max))}
      />
    </div>
  );
}
