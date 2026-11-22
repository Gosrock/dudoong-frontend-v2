import { describe, expect, it } from 'vitest';

import { events, toDetail } from '@/api/__mocks__/fixtures/event';
import type { EventDetail, Tag } from '@/api/event/schema';

import { parseEventIdParam } from './event-id';
import { eventMetadata } from './event-metadata';
import { eventSchedule } from './event-schedule';
import { eventShareTemplate } from './event-share';
import { eventPageUrl, eventSummary } from './event-summary';
import { toHashtags } from './hashtags';

const detail = (id: number): EventDetail => toDetail(events.find((e) => e.eventId === id)!);
const event101 = detail(101);

describe('일시 표시값 — "(180분)"은 시작·종료로 계산한다(KST)', () => {
  it.each([
    // [설명, startAt, endAt, runTime, label, endDate]
    [
      '같은 날 2시간',
      '2026.10.17 19:00',
      '2026.10.17 21:00',
      120,
      '2026.10.17 (토) 19:00 (120분)',
      null,
    ],
    ['3시간', '2026.11.07 17:00', '2026.11.07 20:00', 999, '2026.11.07 (토) 17:00 (180분)', null],
    [
      '자정을 넘김',
      '2026.12.31 22:00',
      '2027.01.01 01:30',
      210,
      '2026.12.31 (목) 22:00 (210분)',
      '2027.01.01 (금)',
    ],
    ['종료가 없으면 runTime', '2026.10.18 18:00', null, 90, '2026.10.18 (일) 18:00 (90분)', null],
    [
      '시작=종료(0분)면 러닝타임 없음',
      '2026.11.15 19:00',
      '2026.11.15 19:00',
      null,
      '2026.11.15 (일) 19:00',
      null,
    ],
    ['종료·runTime 모두 없음', '2026.11.15 19:00', null, null, '2026.11.15 (일) 19:00', null],
    [
      '종료가 시작보다 이르면 러닝타임 없음',
      '2026.11.15 19:00',
      '2026.11.15 18:00',
      60,
      '2026.11.15 (일) 19:00',
      null,
    ],
    [
      '윤년 2월 29일',
      '2028.02.29 00:00',
      '2028.02.29 01:00',
      60,
      '2028.02.29 (화) 00:00 (60분)',
      null,
    ],
  ] as const)('%s', (_, startAt, endAt, runTime, label, endDate) => {
    const s = eventSchedule({ startAt, endAt, runTime });
    expect(s?.label).toBe(label);
    expect(s?.endDate).toBe(endDate);
  });

  it('실행 환경 시간대(TZ)와 무관하다 — 값을 그대로 KST 벽시계로 읽는다', () => {
    const s = eventSchedule({
      startAt: '2026.10.17 00:30',
      endAt: '2026.10.17 02:00',
      runTime: 90,
    });
    expect(s).toMatchObject({
      date: '2026.10.17 (토)',
      startTime: '00:30',
      endTime: '02:00',
      runTimeMinutes: 90,
      runTimeLabel: '(90분)',
    });
  });

  it('시작이 없으면 표시하지 않는다(null)', () => {
    expect(eventSchedule({ startAt: null, endAt: null, runTime: 120 })).toBeNull();
  });
});

describe('해시태그', () => {
  const tag = (tagId: number, name: string): Tag => ({ tagId, name, category: 'GENRE' });

  it.each([
    [
      '서버 순서 그대로 #을 붙인다',
      [tag(1, '정기공연'), tag(2, '락밴드')],
      ['#정기공연', '#락밴드'],
    ],
    ['공백은 지운다', [tag(9, '대학 동아리')], ['#대학동아리']],
    [
      '공백을 지운 뒤 같은 이름은 하나만',
      [tag(1, '직장인 밴드'), tag(2, '직장인밴드')],
      ['#직장인밴드'],
    ],
    ['빈 이름은 뺀다', [tag(1, '  ')], []],
    ['태그 없음', [], []],
  ] as const)('%s', (_, tags, labels) => {
    expect(toHashtags(tags).map((h) => h.label)).toEqual(labels);
  });

  it('모르는 분류(UNKNOWN) 태그도 해시태그가 된다', () => {
    expect(toHashtags([{ tagId: 1, name: '새분류', category: 'UNKNOWN' }])).toEqual([
      { tagId: 1, label: '#새분류' },
    ]);
  });
});

describe('공연 주소 id', () => {
  it.each([
    ['101', '101'],
    ['0101', '101'],
    ['1', '1'],
    ['0', null],
    ['abc', null],
    ['10a', null],
    ['-1', null],
    ['1.5', null],
    ['', null],
    ['99999999999999999', null],
    ['%31', null],
  ])('%s → %s', (raw, expected) => {
    expect(parseEventIdParam(raw)).toBe(expected);
  });
});

describe('OG 메타데이터', () => {
  const url = eventPageUrl('https://dudoong.com/', 101);

  it('공개 주소는 origin + /events/{id}', () => {
    expect(url).toBe('https://dudoong.com/events/101');
  });

  it('제목·설명(일시·장소·호스트)·포스터·URL을 넣는다', () => {
    expect(eventMetadata(event101, url)).toEqual({
      title: '고스락 제37회 정기공연',
      description: '2026.11.21 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락',
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        siteName: '두둥',
        locale: 'ko_KR',
        title: '고스락 제37회 정기공연',
        description: '2026.11.21 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락',
        url,
        images: [{ url: event101.posterImageUrl, alt: '고스락 제37회 정기공연' }],
      },
      twitter: { card: 'summary_large_image' },
    });
  });

  it('포스터가 없으면 이미지를 넣지 않는다', () => {
    const m = eventMetadata(detail(103), url);
    expect(m.openGraph).not.toHaveProperty('images');
    expect(m.twitter).toEqual({ card: 'summary' });
  });

  it('이름·호스트 이름이 없는 오래된 공연도 비지 않은 제목·설명이 나간다', () => {
    const m = eventMetadata(detail(104), url);
    expect(m.title).toBe('두둥 공연');
    expect(m.description).toBe('2026.10.17 (토) 19:00 · 공연장 미정');
  });

  it('설명에 쓸 값이 하나도 없으면 사이트 기본 설명', () => {
    const bare: EventDetail = {
      ...event101,
      startAt: null,
      endAt: null,
      place: null,
      host: { ...event101.host, name: null },
    };
    expect(eventSummary(bare)).toBeNull();
    expect(eventMetadata(bare, url).description).toBe('공연 예매와 호스팅을 한 곳에서');
  });

  it('재고·가격 값이 들어가지 않는다(GP-3 공개 값만)', () => {
    const json = JSON.stringify(eventMetadata(event101, url));
    expect(json).not.toMatch(/remaining|잔여|매진|원\b|price/i);
  });
});

describe('카카오 공유 내용', () => {
  const url = 'https://dudoong.com/events/101';

  it('OG와 같은 제목·설명·포스터와 공개 주소로 피드 템플릿을 만든다', () => {
    expect(eventShareTemplate(event101, url)).toEqual({
      objectType: 'feed',
      content: {
        title: '고스락 제37회 정기공연',
        description: '2026.11.21 (토) 19:00 (120분) · 홍대 롤링홀 · 고스락',
        imageUrl: event101.posterImageUrl,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '공연 보기', link: { mobileWebUrl: url, webUrl: url } }],
    });
  });

  it('포스터가 없으면 이미지 없이 보낸다(SDK에서 선택값)', () => {
    expect(eventShareTemplate(detail(103), url).content).not.toHaveProperty('imageUrl');
  });

  it('http 포스터는 넣지 않는다', () => {
    const t = eventShareTemplate({ ...event101, posterImageUrl: 'http://old.example/p.png' }, url);
    expect(t.content).not.toHaveProperty('imageUrl');
  });
});
