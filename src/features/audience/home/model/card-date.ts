import type { HomeEvent } from '@/api/event/schema';
import { formatKstDotDateWeekday, formatKstTime } from '@/api/shared/date';
import { formatPrice } from '@/utils/money';

/**
 * ConcertCard 날짜 줄(GUI 공연홈·공연 리스트 `759:22415` — `2026.01.01 수요일 (18:00)`). 시작 일시가 없으면 null.
 */
export function concertCardDate(startAt: string | null): string | null {
  if (startAt === null) return null;
  return `${formatKstDotDateWeekday(startAt)} (${formatKstTime(startAt)})`;
}

/** 이름 없는 공연(준비 중에 공개된 일이 없지만 스키마가 nullable) */
export const UNNAMED_EVENT = '이름 없는 공연';

/**
 * ConcertCard 가격 줄(design-requests Q63 기본안 — 날짜 줄 아래 한 줄, 백엔드 #925). 순서: 매진 → 무료 → 최저가 `15,000원~`(최저가 0이면 `무료~`) →
 * 티켓 없음. 그 밖(판매 전 · 마감 · 지난 공연)과 값이 없는 응답(운영 2.5.3)은 null — 줄을 그리지 않는다
 */
export function concertCardPrice(
  e: Pick<HomeEvent, 'hasTicket' | 'minPrice' | 'isFree' | 'isSoldOut'>,
): string | null {
  if (e.isSoldOut) return '매진';
  if (e.isFree) return '무료';
  // 무료 티켓과 유료 티켓이 섞이면 최저가 0 → '무료~'(🤖 — '0원~' 대신, ego-browser 확인 2026-11-02)
  if (typeof e.minPrice === 'number') return `${formatPrice(e.minPrice)}~`;
  if (e.hasTicket === false) return '티켓 없음';
  return null;
}
