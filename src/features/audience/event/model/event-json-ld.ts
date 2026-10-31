import type { EventDetail } from '@/api/event/schema';
import { parseKstDateTime } from '@/api/shared/date';

import { eventSchedule } from './event-schedule';
import { eventSummary, eventTitle } from './event-summary';

/**
 * 공연 상세의 구조화 데이터(`schema.org/Event`, JSON-LD — 이슈 #8). 검색엔진·AI 크롤러가 JS 없이 읽는 응답 HTML에 넣는다.
 * 공개 값(GP-3)만 쓴다. `offers`(가격)·재고는 넣지 않는다 — 응답 HTML에 재고 없음(plan P5b).
 *
 * - `startDate`/`endDate`: KST 벽시계 값을 `+09:00` 오프셋 ISO 8601로. 종료는 서버 `endAt`(= 시작 + 러닝타임, 백엔드
 *   `Event.getEndAt`), 없으면 시작 + `runTime`분. 러닝타임을 모르거나 0분이면 넣지 않는다(`eventSchedule`과 같은 규칙).
 * - `location`: 장소 이름·주소(`PostalAddress`)·좌표. 장소가 없으면 넣지 않는다(리치 결과는 `location`이 필수라 그 공연은 오류로 남는다).
 * - `organizer`: 호스트 이름과 호스트 홈 주소. `eventStatus`는 언제나 예정(취소·연기 상태가 공개 응답에 없다 — 삭제 공연은 404).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** `'2026.10.17 19:30'`(KST) → `'2026-10-17T19:30:00+09:00'` */
export function kstToIso(value: string): string {
  return toIso(parseKstDateTime(value));
}

function toIso(at: Date): string {
  // KST 벽시계 값을 UTC 메서드로 읽는다(실행 환경 시간대를 쓰지 않는다 — api/shared/date.ts)
  return `${new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

const trimmed = (value: string | null | undefined) => value?.trim() || null;

function place(event: Pick<EventDetail, 'place'>) {
  const p = event.place;
  const name = trimmed(p?.name);
  const street = [trimmed(p?.address), trimmed(p?.detailAddress)].filter(Boolean).join(' ');
  if (!p || (!name && !street)) return null;
  return {
    '@type': 'Place',
    ...(name && { name }),
    ...(street && {
      address: { '@type': 'PostalAddress', streetAddress: street, addressCountry: 'KR' },
    }),
    ...(p.latitude !== null &&
      p.longitude !== null && {
        geo: { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude },
      }),
  };
}

export function eventJsonLd(
  event: EventDetail,
  { pageUrl, hostUrl }: { pageUrl: string; hostUrl: string },
) {
  const schedule = eventSchedule(event);
  const start = event.startAt === null ? null : parseKstDateTime(event.startAt);
  const end =
    start === null || schedule?.runTimeMinutes == null
      ? null
      : new Date(start.getTime() + schedule.runTimeMinutes * 60_000);
  const location = place(event);
  const description = eventSummary(event);
  const hostName = trimmed(event.host.name);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: eventTitle(event),
    ...(description && { description }),
    ...(start && { startDate: toIso(start) }),
    ...(end && { endDate: toIso(end) }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(location && { location }),
    ...(event.posterImageUrl && { image: [event.posterImageUrl] }),
    organizer: { '@type': 'Organization', ...(hostName && { name: hostName }), url: hostUrl },
    url: pageUrl,
  };
}

/**
 * `<script type="application/ld+json">` 본문. `JSON.stringify`만으로는 `</script>`·`<!--`가 그대로 남아 공연 이름 같은
 * 사용자 입력이 스크립트를 닫을 수 있다 — `<`·`>`·`&`와 줄 구분자(U+2028·U+2029)를 `\uXXXX`로 바꾼다(JSON 값은 같다).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
