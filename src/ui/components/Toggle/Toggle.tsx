'use client';

import * as Switch from '@radix-ui/react-switch';
import type { ComponentPropsWithRef } from 'react';

import * as s from './Toggle.css';

export type ToggleProps = Omit<ComponentPropsWithRef<typeof Switch.Root>, 'asChild' | 'children'>;

/**
 * Figma Toggle(plan의 ToggleButton). 동작은 Radix Switch — role=switch, Space·Enter로 토글.
 * 이름은 화면의 제목과 `aria-labelledby`로 묶거나 `aria-label`로 준다. `register`로 묶을 수 없다 — RHF는 Controller.
 */
export function Toggle({ className, ...rest }: ToggleProps) {
  return (
    <Switch.Root className={className ? `${s.root} ${className}` : s.root} {...rest}>
      <Switch.Thumb className={s.thumb} />
    </Switch.Root>
  );
}
