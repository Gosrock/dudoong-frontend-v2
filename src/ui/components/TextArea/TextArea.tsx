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
} from '../Input/Field';
import * as f from '../Input/Input.css';
import * as s from './TextArea.css';

export type TextAreaProps = Omit<ComponentPropsWithRef<'textarea'>, 'children'> & {
  label?: ReactNode;
  helper?: ReactNode;
  error?: string;
  /** `maxLength`가 있을 때 글자 수 카운터를 보일지. 기본 true */
  showCount?: boolean;
  className?: string;
};

/**
 * 여러 줄 입력. Figma에 없어서 Input 규칙(테두리·포커스·에러·카운터)을 그대로 쓴다.
 * 높이는 `rows`(기본 4)로 정하고 자동으로 늘리지 않는다. 사용자가 세로로 늘릴 수는 있다.
 */
export function TextArea({
  label,
  helper,
  error,
  showCount = true,
  className,
  id,
  ref,
  rows = 4,
  disabled,
  required,
  maxLength,
  value,
  defaultValue,
  onChange,
  ...rest
}: TextAreaProps) {
  const controlId = useControlId(id);
  const { helperId, errorId } = fieldIds(controlId);
  const innerRef = useRef<HTMLTextAreaElement>(null);
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
        className={`${f.box} ${f.boxMultiline}`}
        data-invalid={error ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        <textarea
          ref={mergedRef}
          id={controlId}
          rows={rows}
          className={`${f.control} ${f.controlMultiline} ${s.textarea}`}
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
      </div>
    </Field>
  );
}
