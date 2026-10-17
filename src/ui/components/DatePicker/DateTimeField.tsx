'use client';

import { type ComponentPropsWithRef, type ReactNode, useRef } from 'react';

import { Icon } from '../../icons/Icon';
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
import * as s from './DatePicker.css';

export type DateTimeFieldProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'size' | 'children' | 'value' | 'defaultValue'
> & {
  /** 'yyyy-MM-dd'(date) 또는 'HH:mm'(time). 비어 있으면 '' */
  value?: string;
  defaultValue?: string;
  label?: ReactNode;
  helper?: ReactNode;
  error?: string;
  className?: string;
};

/** DatePicker · TimePicker 공용 본체 */
export function DateTimeField({
  kind,
  label,
  helper,
  error,
  className,
  id,
  ref,
  disabled,
  required,
  readOnly,
  value,
  defaultValue,
  placeholder,
  onChange,
  onClick,
  ...rest
}: DateTimeFieldProps & { kind: 'date' | 'time' }) {
  const controlId = useControlId(id);
  const { helperId, errorId } = fieldIds(controlId);
  const innerRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(innerRef, ref);
  const [current, setCurrent] = useTrackedValue(innerRef, initialText(value, defaultValue));
  const empty = current === '';

  return (
    <Field
      controlId={controlId}
      label={label}
      helper={helper}
      error={error}
      required={required}
      className={className}
    >
      <div
        className={f.box}
        data-invalid={error ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        <span className={f.adornment}>
          {kind === 'date' ? <Icon name="calendar" /> : <Icon name="clock" />}
        </span>
        <input
          ref={mergedRef}
          id={controlId}
          type={kind}
          className={`${f.control} ${s.control}`}
          data-empty={empty ? 'true' : undefined}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helper ? helperId : null, error ? errorId : null)}
          onChange={(e) => {
            setCurrent(e.currentTarget.value);
            onChange?.(e);
          }}
          onClick={(e) => {
            onClick?.(e);
            if (disabled || readOnly || e.defaultPrevented) return;
            try {
              // 칸 어디를 눌러도 피커를 연다. 지원하지 않거나(구형) 사용자 동작이 아니면 던진다 — 무시
              e.currentTarget.showPicker();
            } catch {}
          }}
          {...rest}
        />
        {empty && placeholder && (
          <span className={s.placeholder} aria-hidden>
            {placeholder}
          </span>
        )}
      </div>
    </Field>
  );
}
