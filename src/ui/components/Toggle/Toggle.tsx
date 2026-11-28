'use client';

import * as Switch from '@radix-ui/react-switch';
import type { ComponentPropsWithRef } from 'react';

import type { Responsive } from '../../theme/types';
import * as s from './Toggle.css';

export type ToggleSize = 18 | 24;

export type ToggleProps = Omit<
  ComponentPropsWithRef<typeof Switch.Root>,
  'asChild' | 'children'
> & {
  /** Figma `Size` 축(2026-11-28) — 높이 18(트랙 34×18) · 24(45×24, 기본). 객체면 화면별(데스크탑 ≥ 1024px) */
  size?: Responsive<ToggleSize>;
};

function sizeClass(size: Responsive<ToggleSize>) {
  if (typeof size === 'number') return s.size[size];
  const mobile = size.mobile ?? 24;
  return size.desktop && size.desktop !== mobile
    ? `${s.size[mobile]} ${s.sizeDesktop[size.desktop]}`
    : s.size[mobile];
}

/**
 * Figma Toggle(plan의 ToggleButton). 동작은 Radix Switch — role=switch, Space·Enter로 토글.
 * 이름은 화면의 제목과 `aria-labelledby`로 묶거나 `aria-label`로 준다. `register`로 묶을 수 없다 — RHF는 Controller.
 */
export function Toggle({ className, size = 24, ...rest }: ToggleProps) {
  const root = `${s.root} ${sizeClass(size)}`;
  return (
    <Switch.Root className={className ? `${root} ${className}` : root} {...rest}>
      <Switch.Thumb className={s.thumb} />
    </Switch.Root>
  );
}
