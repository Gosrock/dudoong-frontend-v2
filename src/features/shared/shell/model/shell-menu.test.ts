import { describe, expect, it } from 'vitest';

import { me as fixtureMe } from '@/api/__mocks__/fixtures/me';
import type { Me, MeHost } from '@/api/me/schema';

import {
  SHELL_HOST_MAX,
  SHELL_HOSTS_EMPTY_TEXT,
  SHELL_HOSTS_MORE_HREF,
  shellHostRow,
  shellLink,
  shellMenu,
} from './shell-menu';

const host = (hostId: number): MeHost => ({
  hostId,
  name: `호스트${hostId}`,
  profileImageUrl: null,
  myRole: 'MANAGER',
});
const hostsOf = (n: number) => Array.from({ length: n }, (_, i) => host(i + 1));
const meWith = (shown: number, hostCount: number): Me => ({
  ...fixtureMe,
  hosts: hostsOf(shown),
  hostCount,
});

describe('호스트 줄 — GM-1 hosts(최대 10) + hostCount', () => {
  it.each([
    // [보여 준 수, hostCount, 줄에 그릴 수, 빈 문구, 더 보기 수]
    [0, 0, 0, true, null],
    [1, 1, 1, false, null],
    [10, 10, 10, false, null],
    [10, 11, 10, false, 1],
    [10, 37, 10, false, 27],
  ] as const)(
    'hosts %i개 · hostCount %i → %i개, 빈 문구 %s, 더 보기 %s',
    (shown, count, drawn, empty, more) => {
      const row = shellHostRow(meWith(shown, count));
      expect(row.hosts).toHaveLength(drawn);
      expect(row.emptyText).toBe(empty ? SHELL_HOSTS_EMPTY_TEXT : null);
      expect(row.more).toEqual(more === null ? null : { count: more, href: SHELL_HOSTS_MORE_HREF });
    },
  );

  it('빈 문구는 "아직 두둥에서 호스트가 없어요.", 더 보기는 공연준비 홈 호스트 탭', () => {
    expect(SHELL_HOSTS_EMPTY_TEXT).toBe('아직 두둥에서 호스트가 없어요.');
    expect(SHELL_HOSTS_MORE_HREF).toBe('/hosting?tab=hosts');
  });

  it('서버 순서(합류 최신순)를 그대로 두고 호스트 홈으로 간다', () => {
    const row = shellHostRow(meWith(3, 3));
    expect(row.hosts.map((h) => [h.hostId, h.href, h.myRole])).toEqual([
      [1, '/hosts/1', 'MANAGER'],
      [2, '/hosts/2', 'MANAGER'],
      [3, '/hosts/3', 'MANAGER'],
    ]);
  });

  it('서버가 10개보다 많이 줘도 10개까지만 그리고 나머지는 더 보기로 센다', () => {
    const row = shellHostRow(meWith(12, 12));
    expect(row.hosts).toHaveLength(SHELL_HOST_MAX);
    expect(row.more).toEqual({ count: 2, href: SHELL_HOSTS_MORE_HREF });
  });

  it('익명은 빈 줄 + 빈 문구(GUI 미로그인 햄버거)', () => {
    expect(shellHostRow(null)).toEqual({
      hosts: [],
      emptyText: SHELL_HOSTS_EMPTY_TEXT,
      more: null,
    });
  });
});

describe('메뉴 항목 — 로그인/비로그인', () => {
  it.each([
    ['bell', '/mypage/notifications', '/login?redirect=%2Fmypage%2Fnotifications'],
    ['hosting', '/hosting', '/login?redirect=%2Fhosting'],
    ['orders', '/orders', '/login?redirect=%2Forders'],
    ['following', '/mypage/following', '/login?redirect=%2Fmypage%2Ffollowing'],
    ['newHost', '/hosting/new/hosts', '/login?redirect=%2Fhosting%2Fnew%2Fhosts'],
    ['newEvent', '/hosting/new/events', '/login?redirect=%2Fhosting%2Fnew%2Fevents'],
    ['tickets', '/tickets', '/login?redirect=%2Ftickets'],
    ['archive', '/mypage/archive', '/login?redirect=%2Fmypage%2Farchive'],
    ['profile', '/mypage', '/login?redirect=%2Fmypage'],
  ] as const)('%s: 로그인이면 %s, 익명이면 %s', (key, to, anonymous) => {
    expect(shellLink(key, true)).toMatchObject({ href: to, to, viaLogin: false });
    expect(shellLink(key, false)).toMatchObject({ href: anonymous, to, viaLogin: true });
  });

  it('공연 둘러보기는 누구나 바로 간다', () => {
    expect(shellLink('browse', false)).toMatchObject({ href: '/events', viaLogin: false });
  });

  it('로그인: 프로필 · 벨 · 바로가기 2 · 티켓/주문내역/관심 호스트/아카이빙 · 호스트 줄 · 새로 만들기 2 — 로그인으로 가는 항목 없음', () => {
    const menu = shellMenu(fixtureMe);
    expect(menu.kind).toBe('session');
    if (menu.kind !== 'session') return;
    expect(menu.profile).toMatchObject({
      name: '두둥이',
      email: 'dudoong@example.com',
      edit: { href: '/mypage' },
    });
    expect(menu.bell.href).toBe('/mypage/notifications');
    expect(menu.shortcuts.map((l) => [l.label, l.href])).toEqual([
      ['공연 둘러보기', '/events'],
      ['공연 준비', '/hosting'],
    ]);
    expect(menu.items.map((l) => l.label)).toEqual([
      '티켓',
      '주문내역',
      '관심 호스트',
      '지난 공연 아카이빙',
    ]);
    expect(menu.create.map((l) => [l.label, l.href])).toEqual([
      ['새 호스트 만들기', '/hosting/new/hosts'],
      ['새 공연 만들기', '/hosting/new/events'],
    ]);
    expect(menu.hostRow.hosts.map((h) => h.name)).toEqual(['고스락']);
    expect(menu.startHint).toBe(false);
    const all = [menu.bell, menu.profile.edit, ...menu.shortcuts, ...menu.items, ...menu.create];
    expect(all.filter((l) => l.viaLogin)).toEqual([]);
  });

  it('비로그인: [로그인] · 벨 · 바로가기 2 · 주문내역/관심 호스트 · 빈 호스트 줄 · 새로 만들기 2 — 공연 둘러보기 말고는 모두 로그인으로', () => {
    const menu = shellMenu(null);
    expect(menu.kind).toBe('anonymous');
    if (menu.kind !== 'anonymous') return;
    expect(menu.login).toMatchObject({ label: '로그인', href: '/login', viaLogin: false });
    expect(menu.bell.href).toBe('/login?redirect=%2Fmypage%2Fnotifications');
    expect(menu.items.map((l) => l.label)).toEqual(['주문내역', '관심 호스트']);
    expect(menu.hostRow.emptyText).toBe(SHELL_HOSTS_EMPTY_TEXT);
    expect(menu.startHint).toBe(true);
    const links = [menu.bell, ...menu.shortcuts, ...menu.items, ...menu.create];
    expect(links.filter((l) => !l.viaLogin).map((l) => l.key)).toEqual(['browse']);
    for (const l of links.filter((x) => x.viaLogin)) {
      expect(l.href).toBe(`/login?redirect=${encodeURIComponent(l.to)}`);
    }
  });

  it('말풍선 "두둥에서 공연을 시작해보세요!"는 소속 호스트가 0개일 때만(이슈 #93 §3)', () => {
    expect(shellMenu({ ...fixtureMe, hosts: [], hostCount: 0 }).startHint).toBe(true);
    expect(shellMenu(fixtureMe).startHint).toBe(false);
    // 목록은 비었지만 hostCount가 남은 경우(10개 상한 밖) — 호스트가 있는 사용자
    expect(shellMenu({ ...fixtureMe, hosts: [], hostCount: 3 }).startHint).toBe(false);
  });

  it('화면 문구에 "호스팅 센터"가 없고 업데이트 노트·AD 항목이 없다(Q4)', () => {
    for (const menu of [shellMenu(fixtureMe), shellMenu(null)]) {
      const text = JSON.stringify(menu);
      expect(text).not.toContain('호스팅 센터');
      expect(text).not.toMatch(/업데이트 노트|AD|광고/);
    }
  });
});
