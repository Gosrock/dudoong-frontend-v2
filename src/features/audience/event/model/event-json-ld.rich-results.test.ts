import { describe, expect, it } from 'vitest';

import { events, toDetail } from '@/api/__mocks__/fixtures/event';

import { eventJsonLd, serializeJsonLd } from './event-json-ld';

/**
 * P14 검색 노출 — 리치 결과 테스트(Google "Event" 구조화 데이터)를 로컬에서 구조만 흉내 낸다. 실제 리치 결과 테스트·서치 콘솔은
 * 운영 도메인 뒤(P15). 규칙은 developers.google.com/search/docs/appearance/structured-data/event(2026-11 확인)의 표:
 * - 필수(없으면 오류 — 리치 결과 자격 없음): `name`, `startDate`, `location`(`Place`면 `location.address`)
 * - 권장(없으면 경고): `description`, `endDate`, `eventStatus`, `image`, `offers`, `organizer`(`name`·`url`), `performer`
 * - 날짜는 ISO 8601(시간이 있으면 오프셋까지), `image`·`url`은 절대 주소
 *
 * `offers`는 일부러 넣지 않는다(응답 HTML에 가격·재고 없음 — plan P5b), `performer`는 공개 응답에 출연자 필드가 없다.
 * 그래서 완전한 공연의 경고는 이 둘뿐이어야 한다.
 */

type Ld = ReturnType<typeof eventJsonLd>;

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const ABSOLUTE_URL = /^https?:\/\/[^/]+\//;

function richResultIssues(ld: Ld) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const any = ld as Record<string, unknown> & Ld;

  if (any['@context'] !== 'https://schema.org' || any['@type'] !== 'Event') errors.push('@type');
  if (!any.name) errors.push('name');
  if (!('startDate' in any)) errors.push('startDate');
  else if (!ISO_WITH_OFFSET.test(String(any.startDate))) errors.push('startDate 형식');
  if (!('location' in any)) errors.push('location');
  else if (!('address' in (any.location as object))) errors.push('location.address');

  if ('endDate' in any && !ISO_WITH_OFFSET.test(String(any.endDate))) errors.push('endDate 형식');
  if ('image' in any && !(any.image as string[]).every((u) => ABSOLUTE_URL.test(u)))
    errors.push('image 절대 주소');
  if (!ABSOLUTE_URL.test(String(any.url))) errors.push('url 절대 주소');

  for (const key of ['description', 'endDate', 'eventStatus', 'image', 'offers', 'performer']) {
    if (!(key in any)) warnings.push(key);
  }
  const organizer = any.organizer as { name?: string; url?: string } | undefined;
  if (!organizer?.name) warnings.push('organizer.name');
  if (!organizer?.url) warnings.push('organizer.url');
  return { errors, warnings };
}

const urlsOf = (eventId: number, hostId: number | null) => ({
  pageUrl: `https://dudoong.com/events/${eventId}`,
  hostUrl: `https://dudoong.com/hosts/${hostId ?? 0}`,
});

describe('리치 결과(Event) 구조 — 로컬 검사', () => {
  it('정보가 다 있는 공연은 오류 0, 경고는 offers·performer뿐', () => {
    const e = toDetail(events.find((x) => x.eventId === 101)!);
    expect(richResultIssues(eventJsonLd(e, urlsOf(101, 11)))).toEqual({
      errors: [],
      warnings: ['offers', 'performer'],
    });
  });

  it('mock 공개 공연 전부 — 시작 시각·주소가 있으면 오류 0', () => {
    for (const raw of events) {
      const e = toDetail(raw);
      const { errors } = richResultIssues(eventJsonLd(e, urlsOf(e.eventId, e.host.hostId)));
      const expected = [
        ...(e.startAt === null ? ['startDate'] : []),
        ...(e.place === null || (!e.place.name?.trim() && !e.place.address?.trim())
          ? ['location']
          : !e.place.address?.trim()
            ? ['location.address']
            : []),
      ];
      expect(errors, `공연 ${e.eventId}`).toEqual(expected);
    }
  });

  it('장소 이름만 있고 주소가 없으면 location.address 오류(리치 결과 자격 없음 — 호스트 입력 문제로 남긴다)', () => {
    const e = toDetail(events.find((x) => x.eventId === 101)!);
    const ld = eventJsonLd(
      {
        ...e,
        place: {
          name: '롤링홀',
          address: null,
          detailAddress: null,
          latitude: null,
          longitude: null,
        },
      },
      urlsOf(101, 11),
    );
    expect(richResultIssues(ld).errors).toEqual(['location.address']);
  });

  it('직렬화한 본문을 다시 읽으면 같은 값(파서가 읽는 그대로)', () => {
    const e = toDetail(events.find((x) => x.eventId === 101)!);
    const ld = eventJsonLd({ ...e, name: '</script><b>"공연"</b>' }, urlsOf(101, 11));
    expect(JSON.parse(serializeJsonLd(ld))).toEqual(ld);
  });
});
