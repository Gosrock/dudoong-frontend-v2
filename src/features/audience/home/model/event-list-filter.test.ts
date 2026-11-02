import { describe, expect, it } from 'vitest';

import type { TagGroup } from '@/api/event/schema';

import { concertCardPrice } from './card-date';
import {
  clampKeyword,
  EMPTY_FILTER,
  type EventListFilter,
  eventListSearch,
  parseEventListFilter,
  sameFilter,
  toggleTagId,
} from './event-list-filter';
import { toTagPanel } from './tag-panel';

const parse = (qs: string) => parseEventListFilter(new URLSearchParams(qs));

describe('주소 쿼리 → 필터', () => {
  it.each<[string, EventListFilter]>([
    ['', EMPTY_FILTER],
    ['keyword=고스락', { keyword: '고스락', tagIds: [], includePast: false }],
    ['keyword=%20%20고스락%20', { keyword: '고스락', tagIds: [], includePast: false }],
    ['keyword=%20%20', EMPTY_FILTER],
    ['tagIds=2,1,2', { keyword: '', tagIds: [1, 2], includePast: false }],
    ['tagIds=2%2C1', { keyword: '', tagIds: [1, 2], includePast: false }],
    ['tagIds=a,0,-1,3,1.5,', { keyword: '', tagIds: [3], includePast: false }],
    ['tagIds=12345678901234567', EMPTY_FILTER],
    ['includePast=true', { keyword: '', tagIds: [], includePast: true }],
    ['includePast=1', EMPTY_FILTER],
    ['includePast=TRUE', EMPTY_FILTER],
  ])('%s', (qs, expected) => {
    expect(parse(qs)).toEqual(expected);
  });

  it('검색어는 50자에서 자른다(51자는 서버 400)', () => {
    expect(parse(`keyword=${'가'.repeat(51)}`).keyword).toHaveLength(50);
    expect(parse(`keyword=${'가'.repeat(50)}`).keyword).toHaveLength(50);
  });

  it('태그는 50개까지만 보낸다(서버 상한)', () => {
    const ids = Array.from({ length: 51 }, (_, i) => i + 1);
    expect(parse(`tagIds=${ids.join(',')}`).tagIds).toEqual(ids.slice(0, 50));
  });
});

describe('필터 → 주소 쿼리', () => {
  it.each<[EventListFilter, string | undefined, string]>([
    [EMPTY_FILTER, undefined, ''],
    [{ keyword: ' 락 ', tagIds: [], includePast: false }, undefined, '?keyword=%EB%9D%BD'],
    [
      { keyword: '', tagIds: [3, 1, 3], includePast: true },
      undefined,
      '?tagIds=1,3&includePast=true',
    ],
    [EMPTY_FILTER, '?keyword=x&tagIds=1&includePast=true', ''],
    [
      { keyword: '', tagIds: [2], includePast: false },
      '?utm_source=kakao',
      '?utm_source=kakao&tagIds=2',
    ],
  ])('%j (기존 %s) → %s', (filter, base, expected) => {
    expect(eventListSearch(filter, base)).toBe(expected);
  });

  it('주소로 썼다가 다시 읽으면 같은 필터다', () => {
    const filter = { keyword: '고스락 정기', tagIds: [1, 2, 7], includePast: true };
    expect(parse(eventListSearch(filter).slice(1))).toEqual(filter);
  });
});

describe('필터 조작', () => {
  it.each<[number[], number, number[]]>([
    [[], 2, [2]],
    [[3], 1, [1, 3]],
    [[1, 3], 3, [1]],
    [[1], 1, []],
  ])('%j 에서 %i 토글 → %j', (ids, id, expected) => {
    expect(toggleTagId(ids, id)).toEqual(expected);
  });

  it('입력 검색어는 50자에서 막는다', () => {
    expect(clampKeyword('a'.repeat(60))).toHaveLength(50);
    expect(clampKeyword('abc')).toBe('abc');
  });

  it('같은 필터 비교', () => {
    expect(sameFilter(EMPTY_FILTER, { keyword: '', tagIds: [], includePast: false })).toBe(true);
    expect(sameFilter(EMPTY_FILTER, { ...EMPTY_FILTER, tagIds: [1] })).toBe(false);
  });
});

describe('태그 패널', () => {
  const groups: TagGroup[] = [
    {
      category: 'EVENT_TYPE',
      tags: [
        { tagId: 1, name: '정기공연' },
        { tagId: 3, name: '단독공연' },
      ],
    },
    { category: 'GENRE', tags: [{ tagId: 2, name: '락밴드' }] },
    { category: 'UNKNOWN', tags: [{ tagId: 9, name: '새 분류 태그' }] },
  ];

  it('분류 이름·칩 선택·분류별/전체 선택 수를 만든다(모르는 분류는 기타)', () => {
    const panel = toTagPanel(groups, [1, 2, 999]);
    expect(panel.groups.map((g) => [g.label, g.selectedCount])).toEqual([
      ['공연구분', 1],
      ['장르', 1],
      ['기타', 0],
    ]);
    expect(panel.groups[0]?.tags.map((t) => t.selected)).toEqual([true, false]);
    // 응답에 없는 id(999)는 세지 않는다
    expect(panel.selectedCount).toBe(2);
  });

  it('태그가 없으면 빈 패널', () => {
    expect(toTagPanel([], [1])).toEqual({ groups: [], selectedCount: 0 });
  });
});

describe('카드 가격 줄(Q63 기본안 · 백엔드 #925)', () => {
  it.each([
    [{ isSoldOut: true, isFree: true, minPrice: 0, hasTicket: true }, '매진'],
    [{ isSoldOut: false, isFree: true, minPrice: 0, hasTicket: true }, '무료'],
    [{ isSoldOut: false, isFree: false, minPrice: 15000, hasTicket: true }, '15,000원~'],
    [{ isSoldOut: false, isFree: false, minPrice: 0, hasTicket: true }, '무료~'],
    [{ isSoldOut: false, isFree: false, minPrice: null, hasTicket: false }, '티켓 없음'],
    [{ isSoldOut: false, isFree: false, minPrice: null, hasTicket: true }, null],
    [{}, null],
  ] as const)('%o → %s', (e, line) => {
    expect(concertCardPrice(e)).toBe(line);
  });
});
