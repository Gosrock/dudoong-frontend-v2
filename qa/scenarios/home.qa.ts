import type { Page } from '@playwright/test';

import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { eventBrowseSets } from '../../src/api/__mocks__/event.handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 공연홈 `/` — P5a-V(2026-11-01): GUI `759:22391`(모바일 390) · PC `1974:63985` · `1960:2475`(1440, Design Sync #356 · #357).
 * 히어로 → "더 많은 공연 둘러보기 →" 근래 공연 6개(모바일 캐러셀 · PC 6칸 고정, 끝난 공연은 흐리게) → ↑.
 * 근거: plan P0 산출물 A·B·P5a(완료 기준 V), tech-decisions §2·§31(상태 코드 표), api-contract GP-2(지난 공연 포함 · 공연임박순).
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
      '서버가 <Prefetch>로 GP-2(지난 공연 포함 · 6개 — 근래 공연, #356)를 조회해 HTML에 넣고, 브라우저는 같은 쿼리를 캐시에서 읽어 다시 부르지 않는다.',
    basis: ['plan P5a', 'tech-decisions §31', 'api-contract GP-2', 'Design Sync #356 · #357'],
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
      '"두둥 소개"는 제목 + ↗ + 빈 카드이고 누를 곳이 없다(사용자 결정 2026-11-09)',
      async () => {
        const intro = page.getByRole('region', { name: '두둥 소개' });
        await intro.scrollIntoViewIfNeeded();
        await expect(intro.getByRole('heading', { name: '두둥 소개' })).toBeVisible();
        await expect(intro.getByRole('link')).toHaveCount(0);
        await expect(intro.getByRole('button')).toHaveCount(0);
      },
      { fullPage: false },
    );
    await step(
      'GP-2(근래 공연)는 서버에서 한 번만 불리고 브라우저는 다시 부르지 않는다',
      async () => {
        const calls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/events'));
        await note(`받은 GP-2 호출: ${calls.map((c) => `${c.from} ${c.status}`).join(', ')}`);
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
    summary:
      '글자와 화살표가 한 링크다(GUI 759:22411). 카드는 6장 — 모바일은 가로로 넘기고, PC는 6칸 고정이라 넘치지 않는다(GUI 1974:63993, #356).',
    basis: ['plan P5a', 'GUI 759:22411·759:22414 · 1974:63993'],
  },
  async ({ page, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    await step(
      desktop
        ? 'PC는 카드 6장이 한 줄 6칸에 다 보인다(가로 스크롤 없음)'
        : '캐러셀이 가로로 넘친다(6장)',
      async () => {
        await page.goto('/');
        const list = page.getByRole('region', { name: '다가오는 공연' }).getByRole('list');
        await expect(list.getByRole('listitem')).toHaveCount(6);
        const overflow = await list.evaluate((el) => el.scrollWidth > el.clientWidth);
        expect(overflow).toBe(!desktop);
        if (desktop) {
          const tops = await list
            .getByRole('listitem')
            .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
          expect(new Set(tops).size).toBe(1);
        }
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
    basis: ['api-contract GP-2', 'plan P5a'],
    mocks: [...eventBrowseSets.homeEmpty],
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
      http.get('*/api/v2/events', ({ request }) =>
        new URL(request.url).searchParams.get('includePast') === 'true'
          ? HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 })
          : undefined,
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

scenario(
  'HOME-6',
  '맨 아래 푸터 — 저작권 · 회사 사업자 정보 · 중개자 한 줄 · 약관 링크 · SNS',
  {
    kind: '정상',
    summary:
      '약관 제3조③(서비스 첫 화면 중개자 지위) · 제4조①(회사 사업자 정보). GUI 푸터 `1383:3429`(Design Sync #205) — 회색 판 · 저작권 줄 · 밑줄 링크 · SNS 아이콘 3(목적지는 v1 푸터 주소, Figma 코멘트 `1383:3434`).',
    basis: ['legal-copy A-3', 'v1-additions C-1', 'GUI 1383:3429', 'design-requests Q150'],
  },
  async ({ page, step }) => {
    await page.goto('/');
    await step(
      '맨 아래로 내리면 저작권 · 사업자 정보 세 줄 · 중개자 한 줄 · [개인정보 처리방침] | [서비스 이용약관] · SNS 3',
      async () => {
        const footer = page.getByRole('contentinfo');
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toContainText('두둥스튜디오 | 서울시 강서구 강서로 266 129동 503호');
        await expect(footer).toContainText(
          '사업자 번호 : 469-21-01595 | 통신판매업 신고번호 : 2022-서울강서-3669',
        );
        await expect(footer).toContainText('두둥은 통신판매중개자로서 공연의 당사자가 아니며');
        await expect(footer.getByRole('link', { name: '개인정보 처리방침' })).toHaveAttribute(
          'target',
          '_blank',
        );
        await expect(footer.getByRole('link', { name: '서비스 이용약관' })).toHaveAttribute(
          'href',
          '/meta/term',
        );
        await expect(footer).toContainText('© Dudoong All Rights Reserved');
        await expect(footer.getByRole('link', { name: '두둥 인스타그램' })).toHaveAttribute(
          'href',
          'https://www.instagram.com/dudoong_official/',
        );
        await expect(footer.getByRole('link', { name: '두둥 카카오톡 채널' })).toHaveAttribute(
          'target',
          '_blank',
        );
      },
    );
  },
);

scenario(
  'HOME-7',
  '근래 공연에 끝난 공연이 섞이면 그 카드는 흐리다',
  {
    kind: '정상',
    summary:
      'Design Sync #356 · #357 — 근래 6개 중 진행 중 · 시작 전이 아닌(끝난) 공연은 불투명도를 낮춘다(값 0.4는 Figma에 없어 정함 🤖). 눌러서 상세로 갈 수는 있다.',
    basis: ['GUI 1974:63985 · 1960:2475', 'api-contract GP-2 includePast'],
    mocks: [...eventBrowseSets.homeWithPast],
  },
  async ({ page, step, testInfo }) => {
    if (testInfo.project.name === 'desktop')
      await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto('/');
    await step('시작 전 공연은 그대로, 지난 공연 두 장은 흐리다', async () => {
      const list = page.getByRole('region', { name: '다가오는 공연' }).getByRole('list');
      const items = list.getByRole('listitem');
      await expect(items).toHaveCount(3);
      const opacity = await items.evaluateAll((els) =>
        els.map((el) => Number(getComputedStyle(el).opacity)),
      );
      expect(opacity[0]).toBe(1);
      expect(opacity[1]).toBeLessThan(1);
      expect(opacity[2]).toBeLessThan(1);
      await expect(list.getByRole('link', { name: '고스락 제36회 정기공연' })).toHaveAttribute(
        'href',
        '/events/90',
      );
    });
  },
);
