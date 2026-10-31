import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { me } from '../../src/api/__mocks__/fixtures/me';
import type { MeHost } from '../../src/api/me/schema';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 레이아웃 셸(plan P4s 완료 기준 V). 호스팅 PC는 GUI Ready(`712:1646` 1440 · `669:2972` 1280 · `680:672` 1133)와,
 * 나머지(호스팅 모바일·공연 밖, 관객 전체)는 와이어(`128:738` · `128:2875` · `128:2931` · `626:19888` · `640:17991`)와 캡처를 비교한다.
 *
 * 범주 검토
 * - 에러: 404(셸 안, 상태 코드). 셸 메뉴(GM-1) 5xx는 useShellMenu 단위 테스트가 본다(셸은 [다시 시도]만)
 * - 권한: 비로그인 /hosting → 로그인은 e2e/shell.spec.ts(P4s-L)
 * - 크롤러: (public) 404 상태 코드만(셸이 Suspense를 children 위에 두지 않는지)
 * - 실기기(iOS Safari 스크롤 잠금·키보드 회피)는 수동
 */

const hostsOf = (n: number): MeHost[] =>
  Array.from({ length: n }, (_, i) => ({
    hostId: 100 + i,
    name: `호스트${i + 1}`,
    profileImageUrl: null,
    myRole: 'MASTER',
  }));

const meWith = (shown: number, total: number) =>
  http.get('*/api/v2/me', () =>
    HttpResponse.json(envelope.ok({ ...me, hosts: hostsOf(shown), hostCount: total })),
  );

const openDrawer = async (page: Page) => {
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  const drawer = page.getByRole('dialog', { name: '메뉴' });
  await expect(drawer).toBeVisible();
  // 드로어가 다 들어온 뒤(전환 0.5s) 찍는다
  await page.waitForTimeout(600);
  return drawer;
};

const desktopTopBar = (page: Page) => page.getByRole('navigation', { name: '주 메뉴' });

scenario(
  'SHELL-1',
  '호스팅 공연 안(등록 후 대시보드)이 폭마다 상단 바 + 3단으로 그려진다',
  {
    kind: '반응형',
    summary:
      '1024 이상은 Top bar_Host + 사이드바 268 + 가운데 + 우측 일정 패널(286 / 335 / 388), 1023 이하는 모바일 로고 헤더. 사이드바·패널 본문은 P11-V·P13a-V.',
    basis: [
      'plan P4s 완료 기준 V 4·6',
      'gui-screens §3 실제 프레임에서 잰 폭',
      'GUI 712:1646·669:2972·680:672',
    ],
    viewports: ['desktop'],
  },
  async ({ page, step, note }) => {
    await setMockSession(page, 'loggedIn');
    const cases: [number, number, number | null][] = [
      [1440, 1024, 388],
      [1280, 832, 335],
      [1133, 744, 286],
      [1024, 744, 286],
      [1023, 744, null],
    ];
    for (const [width, height, panel] of cases) {
      await step(
        `${width}폭에서 대시보드를 열면 ${panel ? `상단 바와 우측 패널 ${panel}` : '모바일 헤더'}가 보인다`,
        async () => {
          await page.setViewportSize({ width, height });
          await page.goto('/hosting/events/101/dashboard');
          await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
          const aside = page.getByRole('complementary', { name: '공연 일정' });
          if (panel) {
            await expect(desktopTopBar(page)).toBeVisible();
            await expect(page.getByRole('link', { name: '공연 준비하기' })).toHaveAttribute(
              'aria-current',
              'page',
            );
            const box = await aside.boundingBox();
            await note(`패널 x ${box?.x} · 폭 ${box?.width}`);
            expect(box?.width).toBe(panel);
            expect(box?.x).toBe(width - panel);
          } else {
            await expect(desktopTopBar(page)).toBeHidden();
            await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeVisible();
            await expect(aside).toBeHidden();
          }
        },
      );
    }
  },
);

scenario(
  'SHELL-2',
  '호스팅 공연 밖(공연준비 홈)은 사이드바 없이 본문 최대 1280',
  {
    kind: '반응형',
    summary:
      '좌우 여백 40(1024~1439) · 80(1440~), 본문 최대 1280. 모바일은 로고형 host title + 드로어(벨은 드로어 머리 줄).',
    basis: [
      'plan P4s V 범위 호스팅 셸',
      'design-system §2 그리드',
      'DS host title 619:2116',
      'Q17 로고형(사용자 결정 2026-10-31)',
      'design-requests Q4 → P9c-V "서비스 업데이트 노트" = 공지 목록(호스팅은 /hosting/notices)',
    ],
  },
  async ({ page, step, note, testInfo }) => {
    await setMockSession(page, 'loggedIn');
    await step('공연준비 홈을 열면 셸 안에 화면이 보인다', async () => {
      await page.goto('/hosting');
      const main = page.getByRole('main');
      await expect(main.getByRole('tablist', { name: '공연준비 홈 탭' })).toBeVisible();
      // 제목 "{닉네임}님의 공연 준비 홈"은 PC에만 있다(와이어 424:11664 — 모바일은 셸 로고 헤더가 제목 자리, P10a-V)
      if (testInfo.project.name === 'desktop') {
        await expect(main.getByRole('heading', { name: '공연 준비 홈' })).toBeVisible();
      }
    });
    if (testInfo.project.name === 'desktop') {
      for (const width of [1440, 1280]) {
        await step(`${width}폭에서 본문 좌우 여백이 ${width >= 1440 ? 80 : 40}이다`, async () => {
          await page.setViewportSize({ width, height: 900 });
          const pad = await page
            .getByRole('main')
            .evaluate((el) => getComputedStyle(el.parentElement!).paddingLeft);
          await note(`좌우 여백 ${pad}`);
          expect(pad).toBe(width >= 1440 ? '80px' : '40px');
        });
      }
      await step(
        '아바타 ▾를 누르면 내 메뉴(My)가 열리고 로그아웃 위 "서비스 업데이트 노트"를 누르면 공지 목록으로 간다',
        async () => {
          await page.setViewportSize({ width: 1440, height: 1024 });
          await page.getByRole('button', { name: '내 메뉴' }).click();
          const menu = page.getByRole('menu');
          await expect(menu.getByRole('menuitem', { name: '주문내역' })).toBeVisible();
          await expect(menu.getByRole('menuitem', { name: '로그아웃' })).toBeVisible();
          // DS My 마지막 구획: 서비스 업데이트 노트(update) → 로그아웃(P9c-V — 호스팅 셸은 호스팅 공지 목록)
          const names = await menu.getByRole('menuitem').allTextContents();
          expect(names.slice(-2)).toEqual(['서비스 업데이트 노트', '로그아웃']);
          const notes = menu.getByRole('menuitem', { name: '서비스 업데이트 노트' });
          await expect(notes).toHaveAttribute('href', '/hosting/notices');
          await notes.click();
          await expect(page).toHaveURL('/hosting/notices');
          await expect(page.getByRole('heading', { level: 1, name: '공지사항' })).toBeVisible();
        },
      );
    } else {
      await step('햄버거를 열면 벨이 드로어 머리 줄에 있고 같은 메뉴가 보인다', async () => {
        const drawer = await openDrawer(page);
        await expect(drawer.getByRole('link', { name: /^알림/ })).toBeVisible();
        await expect(drawer.getByRole('link', { name: /공연 준비/ })).toBeVisible();
        // 말풍선은 포털로 그려져 드로어 밖에 있다
        await expect(
          page.getByRole('tooltip', { name: '두둥에서 공연을 시작해보세요!' }),
        ).toBeVisible();
        // 로그아웃 위 "서비스 업데이트 노트" — 호스팅 드로어는 호스팅 공지 목록(P9c-V · Q4)
        await expect(drawer.getByRole('link', { name: '서비스 업데이트 노트' })).toHaveAttribute(
          'href',
          '/hosting/notices',
        );
      });
      await step('드로어의 "서비스 업데이트 노트"를 누르면 호스팅 공지 목록으로 간다', async () => {
        const drawer = page.getByRole('dialog', { name: '메뉴' });
        await drawer.getByRole('link', { name: '서비스 업데이트 노트' }).click();
        await expect(page).toHaveURL('/hosting/notices');
        await expect(page.getByTestId('notice').first()).toBeVisible();
      });
    }
  },
);

scenario(
  'SHELL-3',
  '관객 비로그인 — 모바일 로고 헤더 + 햄버거, PC 상단 바 [로그인]',
  {
    kind: '정상',
    summary:
      '1024 미만 로고 헤더(☰ · 로고 · 검색 · 티켓), 이상은 상단 바(메뉴 둘 다 검정 · 검색 · [로그인]). 화면 문구에 "호스팅 센터"가 없다.',
    basis: ['plan P4s 완료 기준 V 1·2·5', '와이어 128:738 · 128:2931 · 626:19888'],
  },
  async ({ page, step, testInfo }) => {
    await setMockSession(page, 'anonymous');
    await step('공연홈을 열면 셸이 보인다', async () => {
      await page.goto('/');
      if (testInfo.project.name === 'desktop') {
        await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
        await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeHidden();
      } else {
        await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeVisible();
        await expect(desktopTopBar(page)).toBeHidden();
      }
    });
    if (testInfo.project.name === 'desktop') {
      for (const width of [1440, 1024]) {
        await step(`${width}폭에서도 PC 상단 바다`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await expect(desktopTopBar(page)).toBeVisible();
        });
      }
      return;
    }
    await step(
      '햄버거를 열면 [로그인 ›] · 주문내역 · 관심 호스트 · 공연 둘러보기 ↗ · 공연 준비 ↗가 보인다',
      async () => {
        const drawer = await openDrawer(page);
        await expect(drawer.getByRole('link', { name: /로그인/ })).toBeVisible();
        await expect(drawer.getByRole('link', { name: '주문내역' })).toHaveAttribute(
          'href',
          `/login?redirect=${encodeURIComponent('/orders')}`,
        );
        await expect(drawer.getByText('아직 두둥에서 호스트가 없어요.')).toBeVisible();
        await expect(page.getByText('호스팅 센터')).toHaveCount(0);
      },
    );
  },
);

scenario(
  'SHELL-4',
  '관객 로그인 — 햄버거의 호스트 줄이 0개 · 10개 · 10개 초과에서 맞게 그려진다',
  {
    kind: '정상',
    summary: 'GM-1 hosts(최대 10) + hostCount. 0개 문구, 10개 그대로, 초과면 "N개 더 보기".',
    basis: ['plan P4s 완료 기준 V 3', 'P4s-L shellHostRow', '와이어 128:2875'],
    viewports: ['mobile'],
  },
  async ({ page, step, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    const cases: [string, number, number][] = [
      ['0개', 0, 0],
      ['10개', 10, 10],
      ['13개', 10, 13],
    ];
    for (const [label, shown, total] of cases) {
      await step(`호스트 ${label}면 햄버거 호스트 줄이 그에 맞다`, async () => {
        mockApi.use(meWith(shown, total));
        await page.goto('/');
        const drawer = await openDrawer(page);
        const row = drawer.getByRole('list', { name: '내 호스트' });
        if (shown === 0) {
          await expect(drawer.getByText('아직 두둥에서 호스트가 없어요.')).toBeVisible();
        } else {
          await expect(row.getByRole('link')).toHaveCount(total > shown ? shown + 1 : shown);
          if (total > shown)
            await expect(row.getByText(`${total - shown}개 더 보기`)).toBeVisible();
        }
        await page.keyboard.press('Escape');
      });
    }
  },
);

scenario(
  'SHELL-5',
  '관객 로그인 PC — 아바타 ▾ 메뉴, 모바일 하위 화면은 뒤로가기 + 제목',
  {
    kind: '정상',
    summary:
      'PC 상단 바 오른쪽 검색 + 아바타 ▾(DS My). 주문내역 같은 하위 화면은 모바일에서 로고 헤더 대신 뒤로가기 + 제목.',
    basis: ['plan P4s V 범위', '와이어 640:17991 · 128:2772', 'DS My 585:752'],
  },
  async ({ page, step, testInfo, mockApi, note }) => {
    await setMockSession(page, 'loggedIn');
    if (testInfo.project.name === 'desktop') {
      await step('1440폭 공연홈에서 아바타 ▾를 누르면 내 메뉴가 열린다', async () => {
        await page.setViewportSize({ width: 1440, height: 1024 });
        await page.goto('/');
        await page.getByRole('button', { name: '내 메뉴' }).click();
        await expect(page.getByRole('menu').getByRole('menuitem', { name: '티켓' })).toBeVisible();
      });
      return;
    }
    await step('주문내역을 열면 뒤로가기 + "주문내역" 헤더이고 로고 헤더는 숨는다', async () => {
      await page.goto('/orders');
      await expect(page.getByRole('button', { name: '뒤로 가기' }))
        .toBeVisible({ timeout: 15_000 })
        .catch(async (e) => {
          await note(
            mockApi
              .calls()
              .map((c) => `${c.from} ${c.method} ${c.path} → ${c.status}`)
              .join('\n'),
          );
          throw e;
        });
      await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeHidden();
    });
  },
);

scenario(
  'SHELL-6',
  '없는 주소·없는 공연은 셸 안의 404이고 상태 코드는 404',
  {
    kind: '에러',
    summary:
      '루트 not-found(관객 셸을 직접 두름)와 (audience)/not-found(셸 레이아웃 안). 셸이 children 위에 Suspense를 두지 않아 상태 코드가 404로 남는다.',
    basis: ['plan P4s 완료 기준 V 1·7', 'tech-decisions §2'],
  },
  async ({ page, request, step, note }) => {
    await setMockSession(page, 'anonymous');
    await step(
      '카카오 UA로 없는 주소·없는 공연을 요청하면 404',
      async () => {
        for (const path of ['/no-such-page', '/events/99999']) {
          const res = await request.get(path, { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
          await note(`${path} → ${res.status()}`);
          expect(res.status()).toBe(404);
        }
      },
      { capture: false },
    );
    await step('없는 공연을 브라우저로 열면 셸 안에 "찾을 수 없어요"가 보인다', async () => {
      await page.goto('/events/99999');
      await expect(page.getByText('찾을 수 없어요')).toBeVisible();
      await expect(page.getByRole('img', { name: '두둥' }).first()).toBeVisible();
    });
  },
);

scenario.manual('SHELL-7', '바텀시트·모달·드로어 iOS Safari 스크롤 잠금·키보드 회피', {
  kind: '반응형',
  basis: ['plan P4s 완료 기준 V 8(P2에서 넘어옴)', 'design-system §4-2'],
  how: 'iPhone Safari로 `pnpm storybook --host 0.0.0.0`(같은 와이파이)을 열어 BottomSheet `LongContent`·`WithInput`, Modal, Drawer `LongContent`에서 ① 뒤 화면이 스크롤되지 않는지 ② 입력칸을 누르면 키보드 위로 시트가 올라오는지 ③ 닫은 뒤 스크롤 위치가 그대로인지 본다. 스테이징이 있으면 실제 화면의 햄버거 드로어도.',
});
