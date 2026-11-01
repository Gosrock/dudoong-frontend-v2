import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { goEventMenu } from '../../e2e/support/event-scope';
import { me } from '../../src/api/__mocks__/fixtures/me';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
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
 * - fix-qa-1101(#86) — 클라이언트 이동 뒤 셸 판정(SHELL-8), 상단 바 고정(SHELL-9), 배너가 있을 때 짧은 화면 넘침 0(SHELL-10).
 *   같은 내용의 e2e는 `e2e/shell-activity.spec.ts`(SHELL-8 쪽만)
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

const resetStores = () => {
  resetHostMockState();
  resetHostingStore();
};

/** 문서 세로 넘침(px) — 화면보다 문서가 얼마나 긴지 */
const verticalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

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
        // 말풍선(포털로 드로어 밖)은 소속 호스트가 0개일 때만 — 이 계정은 호스트가 있다(이슈 #93 §3)
        await expect(
          page.getByRole('tooltip', { name: '두둥에서 공연을 시작해보세요!' }),
        ).toHaveCount(0);
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
        // 호스트가 없으면 "공연 준비 ↗" 옆 말풍선(GUI 331:11622)이 보인다(이슈 #93 §3)
        await expect(
          page.getByRole('tooltip', { name: '두둥에서 공연을 시작해보세요!' }),
        ).toBeVisible();
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

scenario(
  'SHELL-8',
  '공연 대시보드에서 "내 공연"으로 클라이언트 이동하면 레이아웃이 새로고침으로 연 것과 같다',
  {
    kind: '반응형',
    summary:
      'Next 16은 이동할 때 이전 화면을 React Activity로 숨겨 DOM에 남긴다. 셸 판정(`:has([data-event-scope])`)이 숨은 화면에 맞지 않아야 본문 폭 제한·여백과 모바일 로고 헤더가 돌아온다(fix-qa-1101 #86).',
    basis: [
      'implementation-log fix-qa-1101 §1',
      'patterns §6 useActivityMarker',
      'e2e shell-activity.spec',
    ],
  },
  async ({ page, step, note, testInfo }) => {
    resetStores();
    await setMockSession(page, 'loggedIn');
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    const main = page.getByRole('main');
    const logoMenu = page.getByRole('button', { name: '메뉴 열기', exact: true });
    const pad = () => main.evaluate((el) => getComputedStyle(el.parentElement!).paddingLeft);
    let fresh = { x: 0, width: 0, pad: '' };

    await step('공연준비 홈을 새로고침으로 열면 본문 폭·여백을 잰다(기준)', async () => {
      await page.goto('/hosting');
      await expect(main.getByRole('tablist', { name: '공연준비 홈 탭' })).toBeVisible();
      const box = (await main.boundingBox())!;
      fresh = { x: box.x, width: box.width, pad: await pad() };
      await note(`새로고침: x ${fresh.x} · 폭 ${fresh.width} · 여백 ${fresh.pad}`);
      if (!desktop) await expect(logoMenu).toBeVisible();
    });
    await step('공연 대시보드를 열면 공연 화면(3단 / 공연 헤더)이 보인다', async () => {
      await page.goto('/hosting/events/140/dashboard');
      await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
      if (!desktop) await expect(logoMenu).toBeHidden();
    });
    await step(
      `${desktop ? '사이드바' : '☰ 드로어'}의 "내 공연"을 누르면 본문 폭·여백이 새로고침과 같고${desktop ? '' : ' 로고 헤더가 다시 보인다'}`,
      async () => {
        await goEventMenu(page, '내 공연');
        await expect(page).toHaveURL('/hosting');
        await expect(main.getByRole('tablist', { name: '공연준비 홈 탭' })).toBeVisible();
        // 숨은 공연 화면이 DOM에 남아 있다(이 단계의 전제 — 없으면 판정 버그를 재현하지 못한다)
        await expect(page.locator('[data-event-scope]')).toHaveCount(1);
        const box = (await main.boundingBox())!;
        const now = { x: box.x, width: box.width, pad: await pad() };
        await note(`이동 뒤: x ${now.x} · 폭 ${now.width} · 여백 ${now.pad}`);
        expect(now).toEqual(fresh);
        if (!desktop) await expect(logoMenu).toBeVisible();
      },
    );
  },
);

scenario(
  'SHELL-9',
  '스크롤해도 상단 바가 화면 위에 붙어 있다',
  {
    kind: '반응형',
    summary:
      'PC 상단 바(관객·호스팅)와 모바일 로고 헤더 · 하위 화면 헤더 · 공연 헤더가 fixed top 0(이슈 #95 — sticky는 고무줄 오버스크롤 때 콘텐츠와 같이 밀렸다). 스크롤 끝에서도 맨 위. PC 공연 사이드바는 상단 바 바로 아래(58)에 붙는다. 서비스 배너는 바 아래 흐름 안이라 위로 사라진다(Claude 판단).',
    basis: [
      'implementation-log fix-qa-1101 §3 · layout-fixed-95',
      'src/features/shared/shell/shell.css.ts fixedBar · barSpace',
      'src/ui/theme/bars.ts',
    ],
  },
  async ({ page, step, note, testInfo }) => {
    resetStores();
    await setMockSession(page, 'loggedIn');
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
    const scrollDown = async () => {
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      await note(`scrollY ${await page.evaluate(() => window.scrollY)}`);
    };
    const expectAtTop = async (bar: ReturnType<Page['getByRole']>, label: string) => {
      const box = (await bar.boundingBox())!;
      await note(`${label} y ${box.y}`);
      expect(box.y).toBe(0);
    };
    /** 보이는 셸 바(헤더·상단 바)를 감싼 고정 요소들 — 맨 위 0, `position: fixed`(이슈 #95) */
    const fixedTopBars = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              getComputedStyle(e).position === 'fixed' && r.height > 0 && r.width >= innerWidth - 20
            );
          })
          .map((e) => Math.round(e.getBoundingClientRect().top)),
      );

    await step(
      `관객 공연홈을 아래로 스크롤해도 ${desktop ? 'PC 상단 바' : '로고 헤더'}가 맨 위에 보인다`,
      async () => {
        await page.goto('/');
        await expect(page.getByRole('main')).toBeVisible();
        await scrollDown();
        if (desktop) {
          await expectAtTop(desktopTopBar(page), '상단 바');
        } else {
          const menu = page.getByRole('button', { name: '메뉴 열기', exact: true });
          await expect(menu).toBeInViewport();
          const btn = (await menu.boundingBox())!;
          await note(`메뉴 버튼 y ${btn.y}`);
          expect(btn.y).toBeLessThan(64);
        }
      },
    );
    await step(
      `호스팅 공연 대시보드를 아래로 스크롤해도 ${desktop ? '상단 바가 맨 위, 사이드바가 그 아래(58)에' : '공연 헤더가 맨 위에'} 붙어 있다`,
      async () => {
        await page.goto('/hosting/events/101/dashboard');
        await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
        await scrollDown();
        if (desktop) {
          await expectAtTop(desktopTopBar(page), '상단 바');
          const side = (await page.getByTestId('event-sidebar').boundingBox())!;
          await note(`사이드바 y ${side.y}`);
          expect(side.y).toBe(58);
        } else {
          await expect(page.getByRole('button', { name: '공연 메뉴 열기' })).toBeInViewport();
          const btn = (await page.getByRole('button', { name: '공연 메뉴 열기' }).boundingBox())!;
          await note(`공연 메뉴 버튼 y ${btn.y}`);
          expect(btn.y).toBeLessThan(64);
        }
      },
    );
    await step(
      '스크롤 끝까지 내려도 상단 바는 fixed로 맨 위(0)에 있고, 맨 위에서는 첫 내용이 바에 가려지지 않는다',
      async () => {
        await page.goto('/orders');
        await expect(page.getByRole('main')).toBeVisible();
        const barH = desktop ? 58 : 64;
        // 맨 위: 고정 바 바로 아래가 흐름의 시작(배너 또는 본문) — 바 자리(barSpace)가 잡혀 있다
        const firstTop = await page.evaluate(() => {
          const el =
            document.querySelector('[data-testid="notice-banner"]') ??
            document.querySelector('main');
          return Math.round(el!.getBoundingClientRect().top);
        });
        await note(`맨 위 — 첫 내용 y ${firstTop}`);
        expect(firstTop).toBeGreaterThanOrEqual(barH);
        // 목록은 main 뒤에 채워진다 — 끝까지 스크롤이 닿을 때까지 다시 스크롤한다
        await expect
          .poll(() =>
            page.evaluate(() => {
              window.scrollTo(0, document.documentElement.scrollHeight);
              return (
                window.scrollY > 0 &&
                Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight - 1
              );
            }),
          )
          .toBe(true);
        const tops = await fixedTopBars();
        await note(`스크롤 끝 — 고정 바 top ${tops.join(', ')}`);
        expect(tops).toContain(0);
      },
    );
  },
);

scenario(
  'SHELL-10',
  '서비스 배너가 있어도 내용이 짧은 화면은 세로로 넘치지 않는다',
  {
    kind: '반응형',
    summary:
      '셸은 세로 flex로 남은 높이를 채운다 — `calc(100dvh - 58px)`로 빼면 배너(48)만큼 넘쳤다(fix-qa-1101 #86). PC 준비중 공연 대시보드, 모바일 준비중 공연 티켓 관리(빈 목록).',
    basis: ['implementation-log fix-qa-1101 §2', 'design-requests Q44 상단 배너 기본안'],
  },
  async ({ page, step, note, testInfo }) => {
    resetStores();
    await setMockSession(page, 'loggedIn');
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
    const path = desktop ? '/hosting/events/140/dashboard' : '/hosting/events/140/tickets';
    await step(
      `배너가 뜬 ${desktop ? '1440 공연 대시보드' : '390 티켓 관리'}는 세로 넘침이 0이다`,
      async () => {
        await page.goto(path);
        if (desktop) await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
        else await expect(page.getByTestId('tickets-empty')).toHaveText('만든 티켓이 없어요');
        await expect(page.getByTestId('notice-banner')).toBeVisible();
        const over = await verticalOverflow(page);
        await note(
          `배너 높이 ${(await page.getByTestId('notice-banner').boundingBox())?.height} · 넘침 ${over}`,
        );
        expect(over).toBeLessThanOrEqual(0);
      },
    );
    await step('배너를 모두 닫아도 넘침이 0이다', async () => {
      // 배너가 여럿이면 닫을 때마다 다음 것이 뜬다(useNoticeBanner) — 정한 횟수만 닫는다
      const banner = page.getByTestId('notice-banner');
      for (let i = 0; i < 5 && (await banner.count()) > 0; i += 1) {
        const title = await banner.innerText();
        await page.getByRole('button', { name: '배너 닫기' }).click();
        await expect(banner.filter({ hasText: title })).toHaveCount(0);
      }
      await expect(banner).toHaveCount(0);
      const over = await verticalOverflow(page);
      await note(`넘침 ${over}`);
      expect(over).toBeLessThanOrEqual(0);
    });
  },
);

scenario(
  'SHELL-11',
  '로그인 말풍선과 캐릭터가 한 묶음으로 스크롤된다',
  {
    kind: '반응형',
    summary:
      '말풍선이 포털 fixed(Radix Tooltip)라 스크롤 · 오버스크롤 때 캐릭터와 따로 놀았다(이슈 #95). 이제 흐름 안 `TooltipBubble` — 스크롤해도 둘의 간격이 같다. 가로 모드(667×375)처럼 낮은 화면에서도 겹치지 않는다.',
    basis: ['이슈 #95 §2', 'src/features/shared/auth/LoginView.tsx'],
  },
  async ({ page, step, note, testInfo }) => {
    resetStores();
    await setMockSession(page, 'anonymous');
    const desktop = testInfo.project.name === 'desktop';
    await page.setViewportSize(
      desktop ? { width: 1440, height: 600 } : { width: 667, height: 375 },
    );
    await step(
      '스크롤 전후로 말풍선 ↔ 캐릭터 간격이 같고, 말풍선이 캐릭터 위에 겹치지 않는다',
      async () => {
        await page.goto('/login');
        const bubble = page.getByText('두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!');
        await expect(bubble).toBeVisible();
        const gap = () =>
          page.evaluate(() => {
            // 묶음(hero)도 같은 글자라 가장 안쪽(마지막) div가 말풍선
            const b = [...document.querySelectorAll('div')].findLast(
              (d) => d.textContent === '두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!',
            )!;
            const img = document.querySelector('main img')!;
            return {
              pos: getComputedStyle(b).position,
              gap: Math.round(img.getBoundingClientRect().top - b.getBoundingClientRect().bottom),
            };
          });
        const before = await gap();
        await page.evaluate(() => window.scrollTo(0, 200));
        const after = await gap();
        await note(`말풍선 position ${before.pos} · 간격 ${before.gap} → ${after.gap}`);
        expect(before.pos).not.toBe('fixed');
        expect(after.gap).toBe(before.gap);
        expect(before.gap).toBeGreaterThanOrEqual(0);
      },
    );
  },
);

scenario.manual('SHELL-12', '실기기 고무줄 오버스크롤 — 상단 바 고정', {
  kind: '반응형',
  basis: ['이슈 #95 §1', 'tech-decisions §33'],
  how: 'iPhone Safari · macOS Safari/Chrome(트랙패드) · Android Chrome에서 공연홈 · 주문내역 · 호스팅 공연 대시보드를 맨 위에서 아래로 당기고, 맨 아래에서 위로 밀어 본다 — ① 상단 바는 제자리, 콘텐츠만 늘어난다 ② Android 당겨서 새로고침이 된다 ③ 주소창이 스크롤에 따라 숨고 나온다 ④ 뒤로 가기 뒤 스크롤 위치가 돌아온다 ⑤ 입력칸(체크아웃 입금자명 · 호스팅 기본 정보)을 눌러 키보드가 올라와도 상단 바가 화면 밖으로 밀리지 않는다.',
});

scenario.manual('SHELL-7', '바텀시트·모달·드로어 iOS Safari 스크롤 잠금·키보드 회피', {
  kind: '반응형',
  basis: ['plan P4s 완료 기준 V 8(P2에서 넘어옴)', 'design-system §4-2'],
  how: 'iPhone Safari로 `pnpm storybook --host 0.0.0.0`(같은 와이파이)을 열어 BottomSheet `LongContent`·`WithInput`, Modal, Drawer `LongContent`에서 ① 뒤 화면이 스크롤되지 않는지 ② 입력칸을 누르면 키보드 위로 시트가 올라오는지 ③ 닫은 뒤 스크롤 위치가 그대로인지 본다. 스테이징이 있으면 실제 화면의 햄버거 드로어도.',
});
