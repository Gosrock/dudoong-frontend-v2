'use client';

import { type ComponentPropsWithRef, useRef } from 'react';

import { Icon } from '../../icons/Icon';
import { initialText, useMergedRefs, useTrackedValue } from '../Input/Field';
import * as f from '../Input/Input.css';
import * as s from './SearchField.css';

export type SearchFieldProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'children'
> & {
  /** 지우기 버튼을 눌렀을 때. 값은 이미 ''로 바뀌고 onChange도 불린 뒤다 */
  onClear?: () => void;
  /** 지우기 버튼 접근성 이름 */
  clearLabel?: string;
  className?: string;
};

/** 네이티브 setter로 값을 바꾸고 input 이벤트를 보내 React onChange·RHF가 같이 받게 한다 */
function clearNativeInput(el: HTMLInputElement) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Figma Search Field(`73:19`). `type="search"`, 오른쪽 검색 아이콘, 값이 있으면 지우기 버튼.
 * 제어형(value/onChange)·비제어(register) 모두 된다. 접근성 이름은 `aria-label`로 준다.
 */
export function SearchField({
  ref,
  className,
  disabled,
  value,
  defaultValue,
  onChange,
  onClear,
  clearLabel = '검색어 지우기',
  ...rest
}: SearchFieldProps) {
  const innerRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(innerRef, ref);
  const [current, setCurrent] = useTrackedValue(innerRef, initialText(value, defaultValue));

  return (
    <div
      className={className ? `${f.box} ${className}` : f.box}
      data-disabled={disabled ? 'true' : undefined}
    >
      <input
        ref={mergedRef}
        type="search"
        className={`${f.control} ${s.control}`}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          setCurrent(e.currentTarget.value);
          onChange?.(e);
        }}
        {...rest}
      />
      {current && !disabled && (
        <button
          type="button"
          className={s.clear}
          aria-label={clearLabel}
          onClick={() => {
            const el = innerRef.current;
            if (!el) return;
            clearNativeInput(el);
            setCurrent('');
            el.focus();
            onClear?.();
          }}
        >
          <Icon name="close" />
        </button>
      )}
      {/* Figma Search Field의 검색 아이콘은 칸 오른쪽 끝 20 */}
      <span className={f.adornment}>
        <Icon name="search" />
      </span>
    </div>
  );
}
