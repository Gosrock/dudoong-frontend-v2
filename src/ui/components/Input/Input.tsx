'use client';

import { type ComponentPropsWithRef, type ReactNode, useRef } from 'react';

import {
  describedBy,
  Field,
  fieldIds,
  initialText,
  useControlId,
  useMergedRefs,
  useTrackedValue,
} from './Field';
import * as s from './Input.css';

export type InputProps = Omit<ComponentPropsWithRef<'input'>, 'size' | 'children'> & {
  label?: ReactNode;
  helper?: ReactNode;
  /** 있으면 테두리 `status/error` + 칸 아래 문구 */
  error?: string;
  /** 앞쪽 아이콘(Figma icon input). `<Icon name="calendar" />`처럼 넘기면 20 자리에 16으로 그린다(Figma 2026-10-31) */
  leading?: ReactNode;
  /** 뒤쪽 단위 글자(Figma text input "원") */
  trailing?: ReactNode;
  /** `maxLength`가 있을 때 글자 수 카운터를 보일지. 기본 true */
  showCount?: boolean;
  /** 바깥 틀(라벨·칸·에러 묶음)의 class */
  className?: string;
  /** 네이티브 input의 class */
  inputClassName?: string;
};

/**
 * Figma Input 3종(input field · text input · icon input)을 하나로 둔다.
 * 네이티브 `<input>`에 ref를 넘기므로 react-hook-form `register`를 그대로 펼칠 수 있다.
 *
 * ```tsx
 * <Input label="티켓 이름" required maxLength={12} error={errors.name?.message} {...register('name')} />
 * <Input inputMode="numeric" trailing="원" {...register('price')} />
 * ```
 */
export function Input({
  label,
  helper,
  error,
  leading,
  trailing,
  showCount = true,
  className,
  inputClassName,
  id,
  ref,
  disabled,
  required,
  maxLength,
  value,
  defaultValue,
  onChange,
  ...rest
}: InputProps) {
  const controlId = useControlId(id);
  const { helperId, errorId } = fieldIds(controlId);
  const innerRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(innerRef, ref);
  const [current, setCurrent] = useTrackedValue(innerRef, initialText(value, defaultValue));
  const count =
    maxLength != null && showCount ? { length: current.length, max: maxLength } : undefined;

  return (
    <Field
      controlId={controlId}
      label={label}
      helper={helper}
      error={error}
      required={required}
      count={count}
      className={className}
    >
      <div
        className={s.box}
        data-invalid={error ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        {leading && <span className={s.adornment}>{leading}</span>}
        <input
          ref={mergedRef}
          id={controlId}
          className={inputClassName ? `${s.control} ${inputClassName}` : s.control}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helper ? helperId : null, error ? errorId : null)}
          onChange={(e) => {
            setCurrent(e.currentTarget.value);
            onChange?.(e);
          }}
          {...rest}
        />
        {trailing && <span className={s.adornment}>{trailing}</span>}
      </div>
    </Field>
  );
}
