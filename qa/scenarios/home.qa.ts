import type { Page } from '@playwright/test';

import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 공연홈 `/` — P5a-V(2026-11-01): GUI `759:22391`(모바일 390) · PC 와이어 `626:19888`(1440). 히어로 → "더 많은 공연 둘러보기 →" 캐러셀 → ↑.
 * 근거: plan P0 산출물 A·B·P5a(완료 기준 V), tech-decisions §2·§31(상태 코드 표), api-contract GP-1.
 * 권한: 공개 화면이라 로그인 여부로 본문이 다르지 않다(헤더는 shell 시나리오).
 */

/** 하이드레이션 경고를 모은다(완료 기준 V "하이드레이션 경고 0") */
function watchHydration(page: Page) {
  const messages: string[] = [];
  page.on('console', (m) => {
    if (/hydrat/i.test(m.text())) messages.push(m.text());
  });
  return messages;
}

scenario(
  'HOME-1',
  '다가오는 공연이 보인다',
  {
    kind: '정상',
    summary:
      '서버가 <Prefetch>로 GP-1을 조회해 HTML에 넣고, 브라우저는 같은 쿼리를 캐시에서 읽어 다시 부르지 않는다.',
    basis: ['plan P5a', 'tech-decisions §31', 'api-contract GP-1'],
  },
  async ({ page, mockApi, step, note, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    const hydration = watchHydration(page);
    await step('공연홈에 들어가면 200으로 열리고 히어로 · 캐러셀이 보인다', async () => {
      const res = await page.goto('/');
      expect(res?.status()).toBe(200);
      await expect(page.locator('main img').first()).toBeVisible(); // 히어로(장식 — alt 없음)
      await expect(page.getByRole('heading', { name: '더 많은 공연 둘러보기' })).toBeVisible();
    });
    await step('공연 카드 링크와 공연 둘러보기 링크가 보인다', async () => {
      // 본문(main) 안 — PC 상단 바 주 메뉴에도 같은 이름의 링크가 있다(P4s-V 셸)
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
      await expect(main.getByRole('link', { name: '공연 둘러보기' })).toBeVisible();
    });
    await step(
      'GP-1은 서버에서 한 번만 불리고 브라우저는 다시 부르지 않는다',
      async () => {
        const calls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/home'));
        await note(`받은 GP-1 호출: ${calls.map((c) => `${c.from} ${c.status}`).join(', ')}`);
        expect(calls.map((c) => c.from)).toEqual(['server']);
      },
      { capture: false },
    );
    await step(
      '하이드레이션 경고가 없다',
      async () => {
        await note(`하이드레이션 메시지 ${hydration.length}건`);
        expect(hydration).toEqual([]);
      },
      { capture: false },
    );
  },
);

scenario(
  'HOME-5',
  '"더 많은 공연 둘러보기 →"를 누르면 공연 리스트로 간다',
  {
    kind: '정상',
    summary: '글자와 원형 화살표가 한 링크다(GUI 759:22411). 캐러셀은 가로로 넘긴다.',
    basis: ['plan P5a', 'GUI 759:22411·759:22414'],
  },
  async ({ page, step }) => {
    await step(
      '캐러셀이 가로로 넘친다',
      async () => {
        await page.goto('/');
        const list = page.getByRole('region', { name: '다가오는 공연' }).getByRole('list');
        const overflow = await list.evaluate((el) => el.scrollWidth > el.clientWidth);
        expect(overflow).toBe(true);
      },
      { fullPage: false },
    );
    await step(
      '링크를 누르면 /events',
      async () => {
        await page.getByRole('link', { name: '더 많은 공연 둘러보기' }).click();
        await expect(page).toHaveURL(/\/events$/);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'HOME-2',
  '공연이 하나도 없으면 빈 문구가 보인다',
  {
    kind: '빈 상태',
    summary: '빈 배열 응답에서도 200으로 열리고 깨지지 않는다. 빈 상태 모양은 P5a-V에서 정한다.',
    basis: ['api-contract GP-1', 'plan P5a'],
    mocks: [http.get('*/api/v2/home', () => HttpResponse.json(envelope.ok({ events: [] })))],
  },
  async ({ page, step }) => {
    await step('공연홈에 들어가면 200으로 열린다', async () => {
      const res = await page.goto('/');
      expect(res?.status()).toBe(200);
    });
    await step('빈 문구가 보인다', async () => {
      await expect(page.getByText('예정된 공연이 없어요.')).toBeVisible();
    });
  },
);

scenario(
  'HOME-3',
  '백엔드가 500이면 크롤러는 500, 브라우저는 200 + 에러 화면',
  {
    kind: '에러',
    summary:
      '(public)에는 Suspense가 없어 카카오 크롤러가 상태 코드를 그대로 받는다(잘못된 미리보기를 캐시하지 않게). 브라우저는 스트리밍이라 200이고 에러 화면이 그려진다. 에러 화면은 셸 안의 공용 화면(P4s-V `(audience)/error.tsx`)이다.',
    basis: ['tech-decisions §31 상태 코드 표', 'plan P0 산출물 B-3', 'patterns §11'],
    mocks: [
      http.get('*/api/v2/home', () =>
        HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 }),
      ),
    ],
  },
  async ({ page, request, step, note }) => {
    await step(
      '카카오 스크랩 UA로 요청하면 500을 받는다',
      async () => {
        const res = await request.get('/', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
        await note(`카카오 UA 응답: ${res.status()}`);
        expect(res.status()).toBe(500);
      },
      { capture: false },
    );
    await step('브라우저로 들어가면 200이다', async () => {
      const res = await page.goto('/');
      await note(`브라우저 응답: ${res?.status()}`);
      expect(res?.status()).toBe(200);
    });
    await step('공연 목록 대신 에러 화면이 보인다', async () => {
      // 셸은 남고 본문만 공용 에러 화면으로 바뀐다(P4s-V `(audience)/error.tsx`)
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: '공연 둘러보기' })).toHaveCount(0);
      await expect(main.getByText('화면을 불러오지 못했어요')).toBeVisible();
      await expect(main.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
  },
);

scenario.manual('HOME-4', '카카오톡 인앱 브라우저에서 공연홈이 열린다', {
  kind: '반응형',
  basis: ['README 실제 환경에서 확인할 것', 'plan P4b'],
  how: '스테이징 배포 뒤(P4b) 실기기 카카오톡에서 링크를 연다. 가짜 백엔드로는 인앱 WebView를 재현할 수 없다.',
});
