'use client';

import { DateTimeField, type DateTimeFieldProps } from './DateTimeField';

/** `min`·`max`도 'yyyy-MM-dd' */
export type DatePickerProps = DateTimeFieldProps;

/**
 * 날짜 입력. 피커 디자인이 없어 네이티브 `<input type="date">`를 icon input 모양(달력 아이콘)으로 감쌌다 —
 * 모바일은 OS 피커가 가장 쓰기 좋고 의존성이 없다. 값은 'yyyy-MM-dd' 문자열이라 `register`를 그대로 펼친다.
 * KST 변환은 `src/api`의 날짜 유틸이 맡는다.
 */
export function DatePicker(props: DatePickerProps) {
  return <DateTimeField kind="date" {...props} />;
}
