import { describe, expect, it } from 'vitest';

import { contentSecurityPolicy, CSP_REPORT_PATH, cspHeaderName } from './csp';

const directive = (policy: string, name: string) =>
  policy
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.split(' ')
    .slice(1);

describe('contentSecurityPolicy', () => {
  const prod = contentSecurityPolicy({ dev: false });

  it('외부 스크립트는 카카오 · 다음 출처만 — jsdelivr 없음(zxing 자체 호스팅)', () => {
    expect(directive(prod, 'script-src')).toEqual([
      "'self'",
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      'https://t1.kakaocdn.net',
      'https://dapi.kakao.com',
      'https://*.daumcdn.net',
    ]);
    expect(prod).not.toContain('jsdelivr');
  });

  it('운영에는 eval이 없고 개발에만 있다', () => {
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy({ dev: true }), 'script-src')).toContain(
      "'unsafe-eval'",
    );
  });

  it('object · base · 폼 전송 · iframe 삽입을 막고 보고 주소를 둔다', () => {
    expect(directive(prod, 'object-src')).toEqual(["'none'"]);
    expect(directive(prod, 'base-uri')).toEqual(["'self'"]);
    expect(directive(prod, 'form-action')).toEqual(["'self'"]);
    expect(directive(prod, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(prod, 'report-uri')).toEqual([CSP_REPORT_PATH]);
  });

  it('헤더 이름 — 기본 Report-Only, 강제는 플래그로', () => {
    expect(cspHeaderName(false)).toBe('Content-Security-Policy-Report-Only');
    expect(cspHeaderName(true)).toBe('Content-Security-Policy');
  });
});
