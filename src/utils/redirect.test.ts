import { describe, expect, it } from 'vitest';

import { safeRedirect } from './redirect';

describe('safeRedirect — 같은 origin의 상대 경로만', () => {
  it.each([
    ['/tickets', '/tickets'],
    ['/events/3?ticketItemId=2&quantity=1', '/events/3?ticketItemId=2&quantity=1'],
    ['/hosting/events/1/guests?tab=orders#top', '/hosting/events/1/guests?tab=orders#top'],
    ['/a/../tickets', '/tickets'],
    ['/%E3%85%8E', '/%E3%85%8E'],
    ['/', '/'],
  ])('%s → %s', (raw, expected) => {
    expect(safeRedirect(raw)).toBe(expected);
  });

  it.each([
    ['절대 URL', 'https://evil.com/x'],
    ['http 절대 URL', 'http://localhost:3000/tickets'],
    ['프로토콜 상대', '//evil.com'],
    ['역슬래시', '/\\evil.com'],
    ['역슬래시 둘', '\\\\evil.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,hi'],
    ['상대 경로(슬래시 없음)', 'tickets'],
    ['탭 끼운 프로토콜 상대', '/\t/evil.com'],
    ['줄바꿈', '/\n/evil.com'],
    ['공백', '/ /evil.com'],
    ['빈 값', ''],
    ['null', null],
    ['undefined', undefined],
    ['로그인 화면으로 되돌이', '/login?redirect=/tickets'],
    ['만료 화면으로 되돌이', '/login/expired'],
    ['카카오 콜백', '/kakao/callback?code=x'],
    ['너무 긴 값', `/${'a'.repeat(3000)}`],
  ])('%s 은 거부한다', (_, raw) => {
    expect(safeRedirect(raw)).toBe('/');
    expect(safeRedirect(raw, '/home')).toBe('/home');
  });

  it('/loginx 같은 다른 경로는 통과한다', () => {
    expect(safeRedirect('/loginx')).toBe('/loginx');
  });
});
