'use client';

import * as RadixRadio from '@radix-ui/react-radio-group';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import * as s from './Radio.css';

export type RadioGroupProps = Omit<
  ComponentPropsWithRef<typeof RadixRadio.Root>,
  'asChild' | 'dir' | 'loop'
>;

/**
 * Figma Radio의 묶음. 동작은 Radix RadioGroup — 방향키로 이동하며 선택, Tab은 묶음 하나로 들어간다.
 * 접근성 이름은 `aria-label` 또는 `aria-labelledby`. `register`로 묶을 수 없다 — RHF는 Controller.
 *
 * ```tsx
 * <RadioGroup aria-label="티켓 종류" value={v} onValueChange={setV}>
 *   <Radio value="paid" label="티켓 있음" />
 *   <Radio value="free" label="티켓 없음" />
 * </RadioGroup>
 * ```
 */
export function RadioGroup({ className, ...rest }: RadioGroupProps) {
  return <RadixRadio.Root className={className ? `${s.group} ${className}` : s.group} {...rest} />;
}

export type RadioProps = Omit<
  ComponentPropsWithRef<typeof RadixRadio.Item>,
  'asChild' | 'children'
> & {
  /** 옆 글자. 없으면 `aria-label`을 준다 */
  label?: ReactNode;
};

export function Radio({ label, className, disabled, ...rest }: RadioProps) {
  const item = (
    <RadixRadio.Item
      className={className ? `${s.item} ${className}` : s.item}
      disabled={disabled}
      {...rest}
    >
      <RadixRadio.Indicator className={s.dot} />
    </RadixRadio.Item>
  );
  if (!label) return item;
  return (
    <label className={s.label} data-disabled={disabled ? 'true' : undefined}>
      {item}
      {label}
    </label>
  );
}
