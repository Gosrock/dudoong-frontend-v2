import { describe, expect, it } from 'vitest';

import {
  clampHostingKeyword,
  emptyKindOf,
  HOSTING_HOME_HOSTS_HREF,
  HOSTING_HOME_TABS,
  HOSTING_KEYWORD_MAX,
  hostingHomeSearch,
  myEventHref,
  myHostHref,
  parseHostingHomeTab,
} from './hosting-home';

describe('공연준비 홈 탭(주소 ?tab=)', () => {
  it('탭은 [공연] [호스트] 순서, 기본은 공연', () => {
    expect(HOSTING_HOME_TABS.map((t) => t.label)).toEqual(['공연', '호스트']);
    expect(parseHostingHomeTab(new URLSearchParams(''))).toBe('events');
  });

  it.each([
    ['?tab=hosts', 'hosts'],
    ['?tab=events', 'events'],
    ['?tab=unknown', 'events'],
    ['?tab=', 'events'],
  ] as const)('%s → %s', (search, tab) => {
    expect(parseHostingHomeTab(new URLSearchParams(search))).toBe(tab);
  });

  it('기본 탭은 주소에 쓰지 않고, 다른 쿼리는 남긴다', () => {
    expect(hostingHomeSearch('hosts', '')).toBe('?tab=hosts');
    expect(hostingHomeSearch('events', '?tab=hosts')).toBe('');
    expect(hostingHomeSearch('hosts', '?x=1')).toBe('?x=1&tab=hosts');
  });

  it('호스트를 만든 뒤 돌아올 곳은 호스트 탭(Q19 기본안)', () => {
    expect(parseHostingHomeTab(new URL(HOSTING_HOME_HOSTS_HREF, 'http://x').searchParams)).toBe(
      'hosts',
    );
  });
});

describe('검색어 · 빈 상태', () => {
  it('검색어는 50자에서 막는다(51자는 서버 400)', () => {
    expect(clampHostingKeyword('가'.repeat(60))).toHaveLength(HOSTING_KEYWORD_MAX);
    expect(clampHostingKeyword('고스락')).toBe('고스락');
  });

  it.each([
    ['', 'none'],
    ['   ', 'none'],
    ['고스락', 'search'],
  ] as const)('검색어 %j로 비면 %s 빈 상태', (keyword, kind) => {
    expect(emptyKindOf(keyword)).toBe(kind);
  });
});

describe('카드 이동 주소', () => {
  it('호스트 카드 → 호스트 홈, 공연 카드 → 공연 관리(대시보드는 redirects)', () => {
    expect(myHostHref({ hostId: 11 })).toBe('/hosts/11');
    expect(myEventHref({ eventId: 140 })).toBe('/hosting/events/140');
  });
});
