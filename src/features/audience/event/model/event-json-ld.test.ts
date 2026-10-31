import { describe, expect, it } from 'vitest';

import { events, toDetail } from '@/api/__mocks__/fixtures/event';
import type { EventDetail } from '@/api/event/schema';

import { eventJsonLd, kstToIso, serializeJsonLd } from './event-json-ld';

const event101 = toDetail(events.find((e) => e.eventId === 101)!);
const urls = { pageUrl: 'https://dudoong.com/events/101', hostUrl: 'https://dudoong.com/hosts/11' };
const ld = (patch: Partial<EventDetail>) => eventJsonLd({ ...event101, ...patch }, urls);

describe('공연 구조화 데이터(schema.org/Event)', () => {
  it('공개 값으로 Event를 만든다 — 가격·재고(offers)는 넣지 않는다', () => {
    expect(eventJsonLd(event101, urls)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: '고스락 제37회 정기공연',
      description: '2026.11.21 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락',
      startDate: '2026-11-21T19:00:00+09:00',
      endDate: '2026-11-21T21:00:00+09:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: '홍대 롤링홀',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '서울 마포구 어울마당로 35 지하 1층',
          addressCountry: 'KR',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 37.5509, longitude: 126.9219 },
      },
      image: ['https://image.mock.dudoong.test/event/101/poster.jpeg'],
      organizer: { '@type': 'Organization', name: '고스락', url: 'https://dudoong.com/hosts/11' },
      url: 'https://dudoong.com/events/101',
    });
    expect(JSON.stringify(eventJsonLd(event101, urls))).not.toMatch(/offers|price|remaining/);
  });

  it('종료가 없으면 시작 + 러닝타임(분), 둘 다 없거나 0분이면 endDate 없음', () => {
    expect(ld({ endAt: null, runTime: 90 }).endDate).toBe('2026-11-21T20:30:00+09:00');
    expect(ld({ endAt: null, runTime: null })).not.toHaveProperty('endDate');
    expect(ld({ endAt: '2026.11.21 19:00', runTime: 0 })).not.toHaveProperty('endDate');
  });

  it('자정을 넘기면 다음 날 날짜로', () => {
    expect(ld({ startAt: '2026.12.31 22:00', endAt: '2027.01.01 01:30' }).endDate).toBe(
      '2027-01-01T01:30:00+09:00',
    );
  });

  it('없는 값은 키를 빼고, 이름이 없으면 대체 제목', () => {
    const out = ld({
      name: null,
      startAt: null,
      endAt: null,
      place: null,
      posterImageUrl: null,
      host: { hostId: 11, name: null, profileImageUrl: null },
    });
    expect(out.name).toBe('두둥 공연');
    for (const key of ['startDate', 'endDate', 'location', 'image']) {
      expect(out).not.toHaveProperty(key);
    }
    expect(out.organizer).toEqual({ '@type': 'Organization', url: urls.hostUrl });
  });

  it('장소 이름만·주소만 있어도 Place를 만든다', () => {
    const empty = {
      name: null,
      address: null,
      detailAddress: null,
      latitude: null,
      longitude: null,
    };
    expect(ld({ place: { ...empty, name: '롤링홀' } }).location).toEqual({
      '@type': 'Place',
      name: '롤링홀',
    });
    expect(ld({ place: { ...empty, address: '서울 마포구' } }).location).toEqual({
      '@type': 'Place',
      address: { '@type': 'PostalAddress', streetAddress: '서울 마포구', addressCountry: 'KR' },
    });
    expect(ld({ place: { ...empty, name: '  ' } })).not.toHaveProperty('location');
  });

  it('KST → +09:00 ISO', () => {
    expect(kstToIso('2026.01.01 00:05')).toBe('2026-01-01T00:05:00+09:00');
  });
});

describe('JSON-LD 직렬화 — 스크립트를 닫지 못하게', () => {
  it('</script>·<!--·&·줄 구분자를 \\u 이스케이프로 바꾸고, 파싱하면 원래 값', () => {
    const name = '</script><script>alert(1)</script><!-- & \u2028\u2029';
    const out = serializeJsonLd({ name });
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(out)).toEqual({ name });
  });
});
