import type { EventDetail } from '@/api/event/schema';

import { eventSchedule } from './event-schedule';

/**
 * 공연 상세의 공유·OG용 문구와 주소. 공개 값(GP-3)만 쓴다 — 재고(GP-5)·사용자별 값은 넣지 않는다.
 */

/** 이름이 없는 오래된 공연(GP-3 `name: null`)의 대체 제목 */
export const UNTITLED_EVENT = '두둥 공연';

export const eventTitle = (event: Pick<EventDetail, 'name'>) =>
  event.name?.trim() || UNTITLED_EVENT;

/** `2026.10.17 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락`. 값이 하나도 없으면 null */
export function eventSummary(
  event: Pick<EventDetail, 'startAt' | 'endAt' | 'runTime' | 'place' | 'host'>,
): string | null {
  const parts = [
    eventSchedule(event)?.label,
    event.place?.name?.trim(),
    event.host.name?.trim(),
  ].filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(' · ') : null;
}

/** 공개 상세 주소. `origin`은 브라우저는 `location.origin`, 서버는 요청 `Host`(tech-decisions §12) */
export const eventPageUrl = (origin: string, eventId: string | number) =>
  `${origin.replace(/\/+$/, '')}/events/${eventId}`;
