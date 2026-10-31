import { describe, expect, it } from 'vitest';

import type { EventStatus } from '@/api/event/schema';
import type { HostRole } from '@/api/shared/common-schema';

import { hostEventHref, hostManageActions, parseHostIdParam } from './host-home-rules';

describe('호스트 id 주소 값', () => {
  it.each([
    ['11', '11'],
    ['011', '11'],
    ['1', '1'],
    ['0', null],
    ['-1', null],
    ['abc', null],
    ['1.5', null],
    ['', null],
    ['12345678901234567', null],
    ['9007199254740993', null],
  ])('%s → %s', (raw, expected) => {
    expect(parseHostIdParam(raw)).toBe(expected);
  });
});

describe('호스트 공연 카드 이동 대상', () => {
  it.each<[EventStatus, string]>([
    ['PREPARING', '/hosting/events/140'],
    ['OPEN', '/events/140'],
    ['CALCULATING', '/events/140'],
    ['CLOSED', '/events/140'],
    ['UNKNOWN', '/events/140'],
  ])('%s → %s', (status, href) => {
    expect(hostEventHref({ eventId: 140, status })).toBe(href);
  });
});

describe('호스트 홈 관리 버튼', () => {
  it.each<[string, HostRole | null, string[]]>([
    ['비멤버', null, []],
    ['모르는 역할', 'UNKNOWN', []],
    ['일반 멤버', 'GUEST', ['members']],
    ['매니저', 'MANAGER', ['settings', 'members', 'newEvent']],
    ['마스터', 'MASTER', ['settings', 'members', 'newEvent']],
  ])('%s → %j', (_, role, keys) => {
    expect(hostManageActions(11, role).map((a) => a.key)).toEqual(keys);
  });

  it('버튼 주소는 호스팅 센터의 설정·멤버·간편 공연 만들기다', () => {
    expect(hostManageActions('11', 'MASTER')).toEqual([
      { key: 'settings', href: '/hosting/hosts/11/settings' },
      { key: 'members', href: '/hosting/hosts/11/members' },
      { key: 'newEvent', href: '/hosting/new/events?hostId=11' },
    ]);
  });
});
