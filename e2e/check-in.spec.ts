import { CHECK_IN_TOKEN, resetTicketStore } from '@/api/__mocks__/fixtures/my-ticket';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P8c-L 라우트 로직 — 셀프 체크인 `/check-in?token=…`(보호). 화면 모양은 보지 않는다(V).
 */
test.beforeEach(() => resetTicketStore());

const selfCalls = (calls: { method: string; path: string }[]) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/api/v2/check-ins/self');

test.describe('셀프 체크인', () => {
  test('비로그인 → 로그인 → 같은 URL(토큰 포함)로 돌아와 PQ-5', async ({ page, mockApi }) => {
    await setMockSession(page, 'anonymous');
    const href = `/check-in?token=${CHECK_IN_TOKEN.single}`;
    await page.goto(href);
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(href)}`);
    expect(selfCalls(mockApi.calls())).toEqual([]);

    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await page.getByRole('link', { name: '기존 사용자로 로그인', exact: true }).click();
    await expect(page).toHaveURL(href);
    await expect(page.getByRole('region', { name: '체크인 결과' })).toHaveAttribute(
      'data-result',
      'ENTERED',
    );
    expect(selfCalls(mockApi.calls())).toHaveLength(1);
  });

  test('여러 장이면 고르고 다시 요청해 입장', async ({ page, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/check-in?token=${CHECK_IN_TOKEN.multi}`);
    const picker = page.getByRole('region', { name: '티켓 고르기' });
    await expect(picker.getByRole('button')).toHaveCount(2);
    await picker.getByRole('button').first().click();
    await expect(page.getByRole('region', { name: '체크인 결과' })).toHaveAttribute(
      'data-result',
      'ENTERED',
    );
    expect(selfCalls(mockApi.calls())).toHaveLength(2);
  });

  for (const [query, kind, requests] of [
    ['?token=invalid-token', 'INVALID_QR', 1],
    ['', 'INVALID_QR', 0],
    [`?token=${CHECK_IN_TOKEN.ended}`, 'EVENT_NOT_OPEN', 1],
  ] as const) {
    test(`/check-in${query} → ${kind}`, async ({ page, mockApi }) => {
      await setMockSession(page, 'loggedIn');
      await page.goto(`/check-in${query}`);
      await expect(page.getByRole('region', { name: '체크인 실패' })).toHaveAttribute(
        'data-error',
        kind,
      );
      expect(selfCalls(mockApi.calls())).toHaveLength(requests);
    });
  }
});
