import { formatKstDotDate, isKstDateTime } from '@/api/shared/date';

/**
 * 공지 날짜 표시(P9c-V — 디자인 없음, 형식은 Claude 판단). 목록은 날짜만 `yyyy.MM.dd`, 상세는 서버 값 `yyyy.MM.dd HH:mm` 그대로.
 * 공지 스키마는 날짜 형식을 검사하지 않으므로(`z.string()`) 읽을 수 없는 값은 받은 그대로 둔다 — 화면이 깨지지 않게.
 */
export function noticeDateText(value: string | null, kind: 'date' | 'dateTime'): string | null {
  if (!value) return null;
  if (!isKstDateTime(value)) return value;
  return kind === 'date' ? formatKstDotDate(value) : value;
}
