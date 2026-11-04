import { P9_ORDER } from '@/api/__mocks__/fixtures/order';
import { resetOrderStore } from '@/api/__mocks__/order.handlers';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * 약관 경로(tech-decisions §22 — v1과 같은 `/meta/term`·`/meta/privacy`, `next.config.ts` rewrite → `public/*.html`).
 * 파일은 v1 운영본을 그대로 옮긴 것이다 — v1-additions L-1.
 * - 이용약관: 2026-10-25 시행 개정본(v1 Front #355 + #379) + 일부 개정(Front #385 — 제19조②·제27조③·제29조③1호, 2026-11-07 시행).
 *   #385는 **머지 전 PR**(head `706b561`)의 파일이다. 부칙 제1조가 ①②로 나뉘었다.
 * - 처리방침: 2026-10-25 시행 개정본(#355 + #382, `release/ticket` `9d09938`).
 */
test.describe('약관 경로', () => {
  for (const [path, title, heading, effective] of [
    [
      '/meta/term',
      '이용약관',
      '두둥 서비스 이용약관',
      [
        '이 약관은 2026년 10월 25일부터 시행합니다.',
        '2026년 10월 31일 개정한 제19조제2항, 제27조제3항, 제29조제3항제1호는 2026년 11월 7일부터 시행합니다.',
      ],
    ],
    [
      '/meta/privacy',
      '개인정보 처리방침',
      '두둥 개인정보 처리방침',
      ['이 처리방침은 2026년 10월 25일부터 적용됩니다.'],
    ],
  ] as const) {
    test(`${path} → 200, 시행일 문장`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      for (const sentence of effective) {
        await expect(page.getByText(sentence, { exact: false })).toBeVisible();
      }
    });
  }
});

/**
 * 화면의 약관 근거 문구 — 운영 확정본(B28 · 백엔드 #928, 2026-11-04). legal-copy A-1 · A-8 ④ · A-9 · A-11.
 * 문구를 바꿀 때는 이 테스트와 legal-copy를 같이 고친다.
 */
test.describe('약관 근거 문구(B28 확정본)', () => {
  const REFUND_SENTENCE =
    '취소할 때 입력한 환불 계좌로 호스트가 환불합니다. 환불이 늦어지면 호스트에게 연락해 주세요.';

  test('공연 상세 중개자 고지(A-1) — "판매정보" 대신 호스트가 안내한 환불 기준', async ({
    page,
  }) => {
    await page.goto('/events/101');
    const notice = page.getByText(/두둥은 통신판매중개자로서/);
    await expect(notice).toContainText(
      '취소·환불 규정은 호스트가 공연 상세에 안내한 환불 기준과 이용약관에서 확인할 수 있습니다.',
    );
    await expect(notice).not.toContainText('판매정보');
  });

  test('주문 상세(A-8 ④) · 취소 시트(A-9) · 취소 토스트(A-11) — 입력한 환불 계좌로 호스트가 환불', async ({
    page,
  }) => {
    resetOrderStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(`/orders/${P9_ORDER.approvedPaid}`);
    await expect(page.getByText(`환불 방법 : ${REFUND_SENTENCE}`, { exact: false })).toBeVisible();
    await expect(page.getByText('환불받을 계좌를 알려주세요', { exact: false })).toHaveCount(0);

    await page.getByRole('button', { name: '주문취소' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(REFUND_SENTENCE, { exact: false })).toBeVisible();
    // 계좌 칸 위 임시 안내 줄(#105)은 확정본과 겹쳐 뺐다
    await expect(dialog.getByText('여기에 입력한 계좌는', { exact: false })).toHaveCount(0);

    await dialog.getByRole('combobox', { name: /은행/ }).click();
    await page.getByRole('option', { name: 'KB국민은행' }).click();
    await dialog.getByRole('textbox', { name: /예금주/ }).fill('두둥이');
    await dialog.getByRole('textbox', { name: /계좌번호/ }).fill('123-456-7890');
    await page.getByRole('button', { name: '확인했어요, 취소할게요' }).click();
    await expect(page.getByText(`예매가 취소되었어요. ${REFUND_SENTENCE}`)).toBeVisible();
  });
});
