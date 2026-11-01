import type { Page } from '@playwright/test';

import {
  GIFT_TOKEN,
  MISSING_GIFT_TOKEN,
  resetTicketStore,
} from '@/api/__mocks__/fixtures/my-ticket';
import { giftHandlers } from '@/api/__mocks__/gift.handlers';

import { setMockSession } from './support/auth';
import { KAKAO_SCRAP_UA } from './support/env';
import { expect, test } from './support/fixtures';

/**
 * P8b-L 라우트 로직 — 선물 랜딩 `/gifts/[giftToken]`(서버 조회 · OG · 404 · 사용자별 판정은 브라우저). 화면 모양은 보지 않는다(V).
 * 카카오 로그인은 가짜 인증 화면(`/api/__mock/kakao/authorize`)이 대신한다.
 */
const headOf = (html: string) => html.split('</head>')[0] ?? '';
const meta = (head: string, property: string) =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(head)?.[1] ?? null;

test.beforeEach(() => resetTicketStore());

const statusArea = (page: Page) => page.getByRole('region', { name: '선물 상태' });

test.describe('선물 랜딩 — 서버 조회와 OG', () => {
  test('카카오 UA: 200, OG는 공연·티켓 요약만(보낸 사람 닉네임 없음), noindex', async ({
    request,
  }) => {
    const res = await request.get(`/gifts/${GIFT_TOKEN.mine}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(200);
    const head = headOf(await res.text());
    expect(meta(head, 'og:title')).toBe('고스락 제37회 정기공연 티켓 선물');
    expect(meta(head, 'og:description')).toBe('2026.11.21 19:00 · 홍대 롤링홀 · 일반 예매');
    expect(meta(head, 'og:image')).toBe('https://image.mock.dudoong.test/event/101/poster.jpeg');
    expect(meta(head, 'robots')).toBe('noindex, nofollow');
    expect(head).not.toContain('김*수');
    expect(head).not.toContain('og:url');
  });

  test('서버 조회는 쿠키 없이 한 번(서버발), 사용자별 값은 브라우저 viewer가 따로', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/gifts/${GIFT_TOKEN.mine}`);
    await expect(statusArea(page)).toHaveAttribute('data-view-state', 'OWN_LINK');
    const calls = mockApi.calls().filter((c) => c.path === `/api/v2/gifts/${GIFT_TOKEN.mine}`);
    expect(calls.map((c) => c.from)).toEqual(['server', 'browser']);
  });

  test('없는 토큰은 404(Gift_404_1 → notFound, 크롤러)', async ({ request }) => {
    const res = await request.get(`/gifts/${MISSING_GIFT_TOKEN}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(404);
  });

  test('토큰 모양이 틀리면 백엔드를 부르지 않고 404(크롤러)', async ({ request, mockApi }) => {
    const res = await request.get(`/gifts/${'a'.repeat(65)}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(404);
    expect(mockApi.calls().filter((c) => c.path.startsWith('/api/v2/gifts/'))).toEqual([]);
  });

  test('GG-3 5xx면 500', async ({ request, mockApi }) => {
    mockApi.use(...giftHandlers.landingServerError);
    const res = await request.get(`/gifts/${GIFT_TOKEN.mine}`, {
      headers: { 'User-Agent': KAKAO_SCRAP_UA },
    });
    expect(res.status()).toBe(500);
  });
});

test.describe('선물 랜딩 — 사용자별 판정', () => {
  test('보낸 본인이 열면 수락 버튼이 없고 [선물 취소]가 있다', async ({ page }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/gifts/${GIFT_TOKEN.mine}`);
    await expect(statusArea(page)).toHaveAttribute('data-view-state', 'OWN_LINK');
    await expect(page.getByRole('button', { name: '선물받기' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '선물받기' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '선물 취소' })).toBeEnabled();
  });

  test('미가입 수신자: 링크 → [카카오 로그인하기](로그인 링크) → 카카오 가입 → 같은 랜딩으로 복귀 → 다시 눌러 수락 → 티켓탭', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'anonymous');
    const landing = `/gifts/${GIFT_TOKEN.forMe}`;
    await page.goto(landing);
    await expect(statusArea(page)).toHaveAttribute('data-view-state', 'AVAILABLE');
    await expect(page.getByRole('button', { name: '선물받기' })).toHaveCount(0);
    await page.getByRole('link', { name: '카카오 로그인하기' }).click();
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(landing)}`);

    await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
    await page.getByRole('link', { name: '신규 사용자(가입)', exact: true }).click();
    await page.getByRole('checkbox', { name: '(필수) 만 14세 이상입니다' }).check();
    await page.getByRole('checkbox', { name: '(필수) 서비스 이용약관 동의' }).check();
    await page.getByRole('checkbox', { name: '(필수) 개인정보 처리방침 동의' }).check();
    await page.getByRole('button', { name: '동의하고 시작하기' }).click();

    await expect(page).toHaveURL(landing);
    const accept = page.getByRole('button', { name: '선물받기' });
    await expect(accept).toBeEnabled();
    // 로그인만으로는 수락하지 않는다
    expect(mockApi.calls().filter((c) => c.path.endsWith('/accept'))).toEqual([]);

    await accept.click();
    await expect(page).toHaveURL(/\/tickets$/);
    expect(
      mockApi
        .calls()
        .filter((c) => c.method === 'POST' && c.path === `${'/api/v2'}${landing}/accept`),
    ).toHaveLength(1);
  });

  test('수락이 Gift_400_3(이미 처리됨)이면 랜딩을 다시 읽어 상태 화면으로', async ({
    page,
    mockApi,
  }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(`/gifts/${GIFT_TOKEN.forMe}`);
    const accept = page.getByRole('button', { name: '선물받기' });
    await expect(accept).toBeEnabled();
    // 다른 사람이 먼저 받음
    const { rejectGift } = await import('@/api/__mocks__/fixtures/my-ticket');
    rejectGift(GIFT_TOKEN.forMe);
    await accept.click();
    await expect(statusArea(page)).toHaveAttribute('data-view-state', 'REJECTED');
    await expect(statusArea(page).getByRole('alert')).toHaveText('이미 처리된 선물이에요');
    await expect(page).toHaveURL(`/gifts/${GIFT_TOKEN.forMe}`);
    expect(
      mockApi
        .calls()
        .filter((c) => c.path.endsWith('/accept'))
        .map((c) => c.status),
    ).toEqual([400]);
  });
});
