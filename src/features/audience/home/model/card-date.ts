import { formatKstDotDateWeekday, formatKstTime } from '@/api/shared/date';

/**
 * ConcertCard 날짜 줄(GUI 공연홈·공연 리스트 `759:22415` — `2026.01.01 수요일 (18:00)`). 시작 일시가 없으면 null.
 */
export function concertCardDate(startAt: string | null): string | null {
  if (startAt === null) return null;
  return `${formatKstDotDateWeekday(startAt)} (${formatKstTime(startAt)})`;
}

/** 이름 없는 공연(준비 중에 공개된 일이 없지만 스키마가 nullable) */
export const UNNAMED_EVENT = '이름 없는 공연';
