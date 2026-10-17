'use client';

import * as Select from '@radix-ui/react-select';
import type { ReactNode, Ref } from 'react';

import { Icon } from '../../icons/Icon';
import { describedBy, Field, fieldIds, useControlId } from '../Input/Field';
import * as f from '../Input/Input.css';
import * as s from './Dropdown.css';

export type DropdownOption = {
  /** 빈 문자열은 쓸 수 없다(Radix Select가 placeholder 되돌리기에 쓴다) */
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type DropdownProps = {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** 선택 전 글자. 제어형에서 value를 ''로 두면 다시 보인다 */
  placeholder?: ReactNode;
  disabled?: boolean;
  error?: string;
  label?: ReactNode;
  helper?: ReactNode;
  required?: boolean;
  /** 네이티브 폼 제출용 숨은 select 이름 */
  name?: string;
  id?: string;
  /** 트리거 버튼. RHF Controller의 `field.ref`를 넘기면 검증 실패 때 포커스가 간다 */
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  'aria-label'?: string;
  className?: string;
};

/**
 * Figma Dropdown(트리거 + dropdown item). 동작은 Radix Select — 키보드(↑↓ · Enter · Space · Esc · 글자 검색),
 * 스크린리더 listbox 속성을 Radix가 맡는다. `register`로 묶을 수 없다 — RHF는 Controller로 쓴다.
 */
export function Dropdown({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  error,
  label,
  helper,
  required,
  name,
  id,
  ref,
  onBlur,
  open,
  defaultOpen,
  onOpenChange,
  'aria-label': ariaLabel,
  className,
}: DropdownProps) {
  const controlId = useControlId(id);
  const { helperId, errorId } = fieldIds(controlId);
  return (
    <Field
      controlId={controlId}
      label={label}
      helper={helper}
      error={error}
      required={required}
      className={className}
    >
      <Select.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <Select.Trigger
          ref={ref}
          id={controlId}
          className={`${f.box} ${s.trigger}`}
          data-invalid={error ? 'true' : undefined}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helper ? helperId : null, error ? errorId : null)}
          onBlur={onBlur}
        >
          <span className={s.value}>
            <Select.Value placeholder={placeholder} />
          </span>
          <Select.Icon className={s.icon}>
            <Icon name="up-down" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className={s.content} position="popper" sideOffset={4}>
            <Select.Viewport>
              {options.map((o) => (
                <Select.Item key={o.value} value={o.value} disabled={o.disabled} className={s.item}>
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className={s.itemIndicator}>
                    <Icon name="check" size={12} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Field>
  );
}
