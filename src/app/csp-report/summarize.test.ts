import { describe, expect, it } from 'vitest';

import { blockedSource, summarizeCspReport } from './summarize';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';

describe('summarizeCspReport — 주소·토큰 없이 요약', () => {
  it('report-uri 모양(application/csp-report)', () => {
    const out = summarizeCspReport({
      'csp-report': {
        'document-uri': `https://dudoong.com/gifts/${TOKEN}?from=kakao`,
        'effective-directive': 'script-src-elem',
        'violated-directive': 'script-src-elem',
        'blocked-uri': `https://evil.example/x.js?t=${TOKEN}`,
        disposition: 'report',
      },
    });
    expect(out).toEqual([
      {
        directive: 'script-src-elem',
        blocked: 'https://evil.example',
        page: '/gifts/:param',
        disposition: 'report',
      },
    ]);
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it('Reporting API 모양(application/reports+json) — csp-violation만', () => {
    const out = summarizeCspReport([
      {
        type: 'csp-violation',
        body: {
          documentURL: 'https://dudoong.com/check-in?token=secret-checkin',
          effectiveDirective: 'connect-src',
          blockedURL: 'https://bucket.s3.example.com/upload?X-Amz-Signature=sig',
          disposition: 'enforce',
        },
      },
      { type: 'deprecation', body: { id: 'x' } },
    ]);
    expect(out).toEqual([
      {
        directive: 'connect-src',
        blocked: 'https://bucket.s3.example.com',
        page: '/check-in',
        disposition: 'enforce',
      },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/secret|Signature/);
  });

  it('id 자리는 모양과 상관없이 가린다(소문자 단어 같은 mock id 포함)', () => {
    const [v] = summarizeCspReport({
      'csp-report': { 'document-uri': 'https://dudoong.com/orders/mock-order-missing?x=1' },
    });
    expect(v?.page).toBe('/orders/:param');
  });

  it('id는 :param으로 가린다', () => {
    const [v] = summarizeCspReport({
      'csp-report': { 'document-uri': 'https://dudoong.com/hosting/events/101/qr' },
    });
    expect(v?.page).toBe('/hosting/events/:param/qr');
  });

  it.each([null, 'x', 1, {}, { 'csp-report': 'x' }, [{ type: 'csp-violation' }]])(
    '모양이 틀리면 빈 배열 (%j)',
    (body) => {
      expect(summarizeCspReport(body)).toEqual([]);
    },
  );

  it('한 번에 10개까지', () => {
    const many = Array.from({ length: 30 }, () => ({ type: 'csp-violation', body: {} }));
    expect(summarizeCspReport(many)).toHaveLength(10);
  });
});

describe('blockedSource', () => {
  it.each([
    ['inline', 'inline'],
    ['eval', 'eval'],
    ['data', 'data'],
    ['https://a.example:8443/p?q=1', 'https://a.example:8443'],
    ['blob:https://dudoong.com/uuid', 'blob'],
    ['', 'unknown'],
    [undefined, 'unknown'],
    ['아무 글자 공백', 'other'],
  ])('%s → %s', (raw, expected) => {
    expect(blockedSource(raw)).toBe(expected);
  });
});
