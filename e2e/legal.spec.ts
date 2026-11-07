import { http } from 'msw';

import { P9_ORDER } from '@/api/__mocks__/fixtures/order';
import { resetMeStore } from '@/api/__mocks__/me.handlers';
import { resetOrderStore } from '@/api/__mocks__/order.handlers';
import { errors } from '@/api/__mocks__/respond';

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
 * 화면의 약관 근거 문구 — 운영 확정본(B28 · 백엔드 #928, 2026-11-04 / B42 · 백엔드 #938, 2026-11-06).
 * legal-copy A-1 · A-8 ④ · A-9 · A-11.
 * 문구를 바꿀 때는 이 테스트와 legal-copy를 같이 고친다.
 */
test.describe('약관 근거 문구(B28 · B42 확정본)', () => {
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
    // A-8 ④ 뒤 문장(B42) — "호스트는 지체 없이 환불해야 하며"를 뺐다. [공연 상세 페이지] 링크는 그대로
    const refundItem = page.getByText(`환불 방법 : ${REFUND_SENTENCE}`, { exact: false });
    await expect(refundItem).toHaveText(
      `환불 방법 : ${REFUND_SENTENCE} 호스트 연락처는 공연 상세 페이지에서 확인할 수 있습니다.`,
    );
    await expect(refundItem.getByRole('link', { name: '공연 상세 페이지' })).toBeVisible();
    await expect(page.getByText('지체 없이 환불해야', { exact: false })).toHaveCount(0);

    await page.getByRole('button', { name: '주문취소' }).click();
    const dialog = page.getByRole('dialog');
    // A-9 제목(B42)
    await expect(
      dialog.getByRole('heading', { name: '취소하면 입력한 계좌로 호스트가 환불해요' }),
    ).toBeVisible();
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

/**
 * 약관 표시 의무(2026-11-07 — 계획 누락 정리, 디자인 없음 Q150~Q153). legal-copy A-2 · A-3 · A-5 · B-6 · B-7 원문,
 * 사업자 정보는 v1 운영 푸터 원문. 문구를 바꿀 때는 이 테스트와 legal-copy를 같이 고친다.
 */
test.describe('약관 표시 의무(제3조③ · 제4조① · 제19조③ · 제24조① · 처리방침 10장)', () => {
  test('공연홈 푸터 — 사업자 정보 · 중개자 한 줄(A-3) · 처리방침 · 이용약관 링크', async ({
    page,
  }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    for (const line of [
      '두둥스튜디오 | 서울시 강서구 강서로 266 129동 503호',
      '대표 : 이찬진 | TEL : 0507-0177-0711 | Email : support@dudoong.com',
      '사업자 번호 : 469-21-01595 | 통신판매업 신고번호 : 2022-서울강서-3669',
      '두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연의 개최·내용 등에 관한 의무와 책임은 각 공연의 호스트에게 있습니다.',
    ]) {
      await expect(footer).toContainText(line);
    }
    await expect(footer.getByRole('link', { name: '개인정보 처리방침' })).toHaveAttribute(
      'href',
      '/meta/privacy',
    );
    await expect(footer.getByRole('link', { name: '서비스 이용약관' })).toHaveAttribute(
      'href',
      '/meta/term',
    );
  });

  test('공연 상세 판매정보(A-2) — 굵은 문단 · 청약철회 제한 · ⑤ B18 · B60 확정본, 유료(PG)·v1 ⑤ 없음', async ({
    page,
  }) => {
    await page.goto('/events/101');
    const region = page.getByRole('region', { name: '판매정보' });
    await region.getByRole('button', { name: '판매정보' }).click();
    await expect(
      region.locator('strong', {
        hasText:
          '두둥티켓은 호스트가 공연 상세에 별도의 취소·환불 기준(예: 공연 당일 환불 불가)을 안내한 경우, 구매자가 예매를 취소할 때의 환불은 그 기준이 아래 내용보다 우선합니다.',
      }),
    ).toBeVisible();
    await expect(region).toContainText(
      '공연은 시작과 함께 상품 가치가 소멸하므로, 공연 시작 이후에는 취소와 환불이 어렵습니다.',
    );
    await expect(region).toContainText(
      '두둥티켓은 입금한 뒤 호스트가 승인하기 전에도 공연 시작 전까지 예매를 취소할 수 있습니다. 두둥은 입금 여부를 확인하지 않으므로, 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.',
    );
    await expect(region).not.toContainText('승인 전에는 앱에서 취소할 수 없습니다');
    await expect(region).not.toContainText('두둥이 제공하는 결제 서비스로 결제');
    // B60 확정 문구(백엔드 #942, 2026-11-07)
    await expect(region).toContainText('무료티켓과 두둥티켓은 아래 기준대로 취소·환불됩니다.');
    await expect(region).toContainText(
      '취소할 때 입력한 환불 계좌로 호스트가 환불합니다. 환불이 늦어지면 호스트에게 연락해 주세요.',
    );
    await expect(region).toContainText('티켓 QR코드는 티켓탭에서 조회할 수 있습니다.');
    await expect(region.getByRole('link', { name: '티켓탭' })).toHaveAttribute('href', '/tickets');
    await expect(region).not.toContainText('유료티켓');
    await expect(region).not.toContainText('환불받을 계좌를 알려주세요');
    await expect(region).not.toContainText('내 예매내역');
  });

  test('체크아웃 하단 바 — 중개자 문장(A-5)이 동의 줄 위에', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto('/events/101/checkout?ticketItemId=501&quantity=1');
    await expect(
      page.getByText(
        '두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연에 관한 의무와 책임은 호스트에게 있습니다.',
      ),
    ).toBeVisible();
  });

  test('마이페이지 알림 설정(B-6) — 켜면 처리 결과 통지(B-7), 끄면 거부 통지', async ({ page }) => {
    resetMeStore();
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage');
    const toggle = page.getByRole('switch', { name: '이벤트·혜택 정보 받기' });
    await expect(toggle).not.toBeChecked();
    await expect(page.getByText('예매·취소·환불 안내는 설정과 관계없이 보내드려요.')).toBeVisible();
    await toggle.click();
    await expect(
      page.getByText(/^마케팅 정보 수신에 동의했어요 \(\d{4}\.\d{2}\.\d{2}, 두둥\)$/),
    ).toBeVisible();
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(
      page.getByText(/^마케팅 정보 수신을 거부했어요 \(\d{4}\.\d{2}\.\d{2}, 두둥\)$/),
    ).toBeVisible();
    await expect(toggle).not.toBeChecked();
  });

  test('마이페이지 알림 설정 — 실패하면 B-7 실패 문구, 토글은 원래 값', async ({
    page,
    mockApi,
  }) => {
    resetMeStore();
    await setMockSession(page, 'loggedIn');
    mockApi.use(http.patch('*/api/v2/me', ({ request }) => errors.serverError(request)));
    await page.goto('/mypage');
    const toggle = page.getByRole('switch', { name: '이벤트·혜택 정보 받기' });
    await toggle.click();
    await expect(
      page.getByText('설정을 바꾸지 못했어요. 잠시 후 다시 시도해주세요.'),
    ).toBeVisible();
    await expect(toggle).not.toBeChecked();
  });
});
