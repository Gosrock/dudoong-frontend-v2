'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import * as s from './Checkbox.css';

export type CheckboxProps = Omit<
  ComponentPropsWithRef<typeof RadixCheckbox.Root>,
  'asChild' | 'children' | 'checked' | 'defaultChecked' | 'onCheckedChange'
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** 옆 글자. 없으면 `aria-label`이나 바깥 `<label htmlFor>`로 이름을 준다 */
  label?: ReactNode;
  /** Figma `type` round(원형, 기본) · square(모서리 4). `type`은 버튼 속성과 겹쳐 `shape`로 부른다(2026-11-01) */
  shape?: 'round' | 'square';
};

/**
 * Figma Checkbox(`Box`, `type` round/square). 동작은 Radix Checkbox — Space로 토글, role=checkbox.
 * indeterminate는 쓰는 곳이 없어 받지 않는다(design-system §3). `register`로 묶을 수 없다 — RHF는 Controller.
 */
export function Checkbox({
  label,
  shape = 'round',
  className,
  onCheckedChange,
  disabled,
  ...rest
}: CheckboxProps) {
  const box = (
    <RadixCheckbox.Root
      className={[s.root({ shape }), className].filter(Boolean).join(' ')}
      disabled={disabled}
      onCheckedChange={(c) => onCheckedChange?.(c === true)}
      {...rest}
    >
      <RadixCheckbox.Indicator className={s.indicator}>
        <Icon name="check" size={12} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
  if (!label) return box;
  return (
    <label className={s.label} data-disabled={disabled ? 'true' : undefined}>
      {box}
      {label}
    </label>
  );
}
