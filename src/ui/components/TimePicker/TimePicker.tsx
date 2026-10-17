'use client';

import { DateTimeField, type DateTimeFieldProps } from '../DatePicker/DateTimeField';

/** `min`·`max`도 'HH:mm'. `step`은 초 단위, 기본 60(분 단위라 값이 'HH:mm') */
export type TimePickerProps = DateTimeFieldProps;

/**
 * 시간 입력. DatePicker와 같은 결정 — 네이티브 `<input type="time">` + 시계 아이콘. 값은 'HH:mm'.
 */
export function TimePicker({ step = 60, ...props }: TimePickerProps) {
  return <DateTimeField kind="time" step={step} {...props} />;
}
