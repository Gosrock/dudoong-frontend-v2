import { describe, expect, it } from 'vitest';

import { expiredHref, loginHref } from './login-href';

describe('로그인 주소', () => {
  it('돌아올 경로를 인코딩해 붙인다', () => {
    expect(loginHref('/events/3?x=1')).toBe('/login?redirect=%2Fevents%2F3%3Fx%3D1');
    expect(expiredHref('/tickets')).toBe('/login/expired?redirect=%2Ftickets');
  });

  it('검증을 통과하지 못하거나 / 이면 붙이지 않는다', () => {
    expect(loginHref('//evil.com')).toBe('/login');
    expect(loginHref('/login?redirect=/x')).toBe('/login');
    expect(loginHref('/')).toBe('/login');
    expect(expiredHref(null)).toBe('/login/expired');
  });
});
