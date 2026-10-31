import { ZXING_WASM_PATH } from '@/features/hosting/qr/ui/zxing-wasm';

import { expect, test } from './support/fixtures';

/**
 * P14 보안 — CSP(Report-Only) 헤더 · 위반 수집 장치 자체 · 보고 받기 · zxing wasm 자체 호스팅.
 * "위반 0"은 이 파일이 아니라 모든 e2e·QA의 자동 fixture(`cspViolations`)가 본다 — 여기서는 그 장치가 위반을 실제로
 * 잡는지(양성 대조)를 먼저 확인한다.
 */
test.describe('CSP', () => {
  test('모든 화면에 Report-Only 정책 — 외부 스크립트는 카카오 · 다음만, jsdelivr 없음', async ({
    page,
  }) => {
    for (const path of ['/', '/hosting', '/login']) {
      const res = await page.goto(path);
      const headers = res!.headers();
      expect(headers['content-security-policy']).toBeUndefined();
      const policy = headers['content-security-policy-report-only'];
      expect(policy, path).toContain("default-src 'self'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain('report-uri /csp-report');
      expect(policy).not.toContain('jsdelivr');
      expect(policy).not.toContain("'unsafe-eval'");
    }
  });

  test('허용 목록 밖 스크립트를 넣으면 위반이 잡힌다(수집 장치 양성 대조)', async ({
    page,
    cspViolations,
  }) => {
    await page.route('https://blocked.example/**', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '' }),
    );
    await page.goto('/');
    await page.evaluate(() => {
      const s = document.createElement('script');
      s.src = 'https://blocked.example/x.js';
      document.head.append(s);
    });
    await expect
      .poll(() => cspViolations.filter((v) => v.includes('https://blocked.example')).length)
      .toBeGreaterThan(0);
    expect(cspViolations[0]).toMatch(/^script-src(-elem)? https:\/\/blocked\.example/);
    // 이 테스트의 의도한 위반 — fixture가 실패시키지 않게 비운다
    cspViolations.length = 0;
  });

  test('/csp-report는 보고를 받고 204', async ({ request }) => {
    const res = await request.post('/csp-report', {
      headers: { 'content-type': 'application/csp-report' },
      data: JSON.stringify({
        'csp-report': {
          'document-uri': 'http://127.0.0.1/gifts/token',
          'effective-directive': 'img-src',
          'blocked-uri': 'https://x.example/a.png',
        },
      }),
    });
    expect(res.status()).toBe(204);
    const junk = await request.post('/csp-report', { data: 'not json' });
    expect(junk.status()).toBe(204);
  });
});

test('콘솔에 토큰 · 계좌번호가 나오면 잡힌다(수집 장치 양성 대조)', async ({
  page,
  consolePii,
}) => {
  await page.goto('/');
  await page.evaluate(() => console.warn('leak mock-gift-available 110-123-456789'));
  await expect.poll(() => consolePii.length).toBeGreaterThan(1);
  expect(consolePii).toEqual(
    expect.arrayContaining(['선물 토큰(console.warning)', '계좌번호(console.warning)']),
  );
  // 이 테스트의 의도한 출력 — fixture가 실패시키지 않게 비운다
  consolePii.length = 0;
});

test('zxing wasm은 우리 출처에서 받는다', async ({ request }) => {
  const res = await request.get(ZXING_WASM_PATH);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/wasm');
  const body = await res.body();
  // wasm 매직 넘버 `\0asm`
  expect([...body.subarray(0, 4)]).toEqual([0x00, 0x61, 0x73, 0x6d]);
});
