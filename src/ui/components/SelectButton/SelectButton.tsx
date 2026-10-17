'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import type { ReactNode, Ref } from 'react';

import * as s from './SelectButton.css';

export type SelectButtonOption = { value: string; label: ReactNode; disabled?: boolean };

export type SelectButtonProps = {
  options: SelectButtonOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** 네이티브 폼 제출용 이름 */
  name?: string;
  /** 묶음의 접근성 이름. 화면에 보이는 제목이 있으면 `aria-labelledby` */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
  /** 묶음 div. RHF Controller의 `field.ref`를 넘기면 검증 실패 때 포커스가 간다 */
  ref?: Ref<HTMLDivElement>;
  onBlur?: () => void;
  className?: string;
};

/**
 * 2~N개 중 하나를 고르는 버튼 묶음(예/아니오, 결제 방식). GUI 로컬 `Check Button`.
 * 동작은 Radix RadioGroup — role=radiogroup, 방향키로 이동하며 선택, Tab은 묶음 하나로 들어간다.
 * 버튼은 칸을 똑같이 나눠 가진다.
 */
export function SelectButton({
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  ref,
  onBlur,
  className,
  ...aria
}: SelectButtonProps) {
  return (
    <RadioGroup.Root
      ref={ref}
      className={className ? `${s.group} ${className}` : s.group}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
      name={name}
      orientation="horizontal"
      onBlur={onBlur}
      {...aria}
    >
      {options.map((o) => (
        <RadioGroup.Item key={o.value} value={o.value} disabled={o.disabled} className={s.item}>
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
