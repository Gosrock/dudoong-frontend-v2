import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearLoginRedirect,
  LOGIN_REDIRECT_KEY,
  readLoginRedirect,
  saveLoginRedirect,
} from './login-redirect';

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('카카오 왕복 동안 돌아올 곳 보관(sessionStorage)', () => {
  it.each<[string, string | null | undefined, string]>([
    ['같은 출처 경로는 그대로', '/gate-check', '/gate-check'],
    ['쿼리·해시도 유지', '/events/3?tab=info#ticket', '/events/3?tab=info#ticket'],
    ['없으면 /', null, '/'],
    ['절대 URL(오픈 리다이렉트)은 /', 'https://evil.example/steal', '/'],
    ['프로토콜 상대 //evil 은 /', '//evil.example', '/'],
    ['역슬래시 /\\evil 은 /', '/\\evil.example', '/'],
    ['javascript: 는 /', 'javascript:alert(1)', '/'],
    ['로그인 화면 자체(되돌이)는 /', '/login?redirect=/x', '/'],
    ['콜백 자체(되돌이)는 /', '/kakao/callback?code=x', '/'],
  ])('%s', (_, raw, expected) => {
    saveLoginRedirect(raw);
    expect(readLoginRedirect()).toBe(expected);
  });

  it('저장소 값이 바뀌어 있어도 꺼낼 때 다시 거른다', () => {
    sessionStorage.setItem(LOGIN_REDIRECT_KEY, 'https://evil.example');
    expect(readLoginRedirect()).toBe('/');
  });

  it('지우면 / 로 돌아간다', () => {
    saveLoginRedirect('/tickets');
    clearLoginRedirect();
    expect(readLoginRedirect()).toBe('/');
  });

  it('저장소를 못 쓰면 던지지 않고 / 로 돌아간다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => saveLoginRedirect('/tickets')).not.toThrow();
    expect(readLoginRedirect()).toBe('/');
  });
});
