import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import {
  HIDDEN_NOTICE_ID,
  PINNED_NOTICE_ID,
  SANITIZE_NOTICE_ID,
} from '../../src/api/__mocks__/fixtures/notice';
import { noticeHandlers } from '../../src/api/__mocks__/notice.handlers';
import { ok, paginate } from '../../src/api/__mocks__/respond';
import { expect, http, scenario } from '../scenario';

/**
 * 서비스 공지 — 목록 · 상세 · 셸 상단 배너(plan P9c 완료 기준 V). **디자인 없음**(GUI·와이어 모두 없음, design-requests Q44 기본안)
 * — 캡처는 DS 컴포넌트로만 만든 배치를 기록한다. mock: 관객(USER) 24건 · 호스팅(HOST) 29건, 고정 2건(30 · 29),
 * 배너 = 상시(30, ALL) + 기간 안(28, HOST만).
 *
 * 범주 검토
 * - 권한: 비로그인 `/hosting/notices` → 로그인은 e2e `notices.spec`이 본다. 관객·호스트 역할에 따라 화면이 다르지 않다
 * - 크롤러: 관객 상세의 상태 코드·제목은 NTC-6 한 단계 + e2e `notices.spec`(404 · 500)
 */

const LONG_TITLE =
  '[안내] 아주 긴 공지 제목이 목록에서 한 줄로 말줄임 되는지 보는 제목입니다 — 두둥 서비스 이용약관 개정과 개인정보 처리방침 변경 사항을 함께 안내드립니다';

const rows = (page: Page) => page.getByTestId('notice');
const banner = (page: Page) => page.getByTestId('notice-banner');

scenario(
  'NTC-1',
  '관객 공지 목록 — 고정 먼저, 칩 · 제목 · 날짜, 아래로 내리면 다음 페이지',
  {
    kind: '정상',
    summary:
      '관객 목록은 ALL 공지만(호스팅 칩 없음), 고정 2건이 먼저 [고정] 칩과 굵은 제목으로. 20건 → 아래 끝에서 24건. 모바일은 ← 공지사항 하위 헤더.',
    basis: ['plan P9c 완료 기준 V', 'design-requests Q44 기본안', 'api-contract §5 서비스 공지'],
  },
  async ({ page, step }) => {
    await step('공지 목록을 열면 고정 공지 2건이 [고정] 칩과 함께 맨 위에 보인다', async () => {
      await page.goto('/notices');
      await expect(rows(page)).toHaveCount(20);
      await expect(rows(page).nth(0)).toHaveAttribute('data-pinned', 'true');
      await expect(rows(page).nth(1)).toHaveAttribute('data-pinned', 'true');
      await expect(rows(page).nth(0)).toContainText('고정');
      await expect(rows(page).nth(0)).toContainText('2026.10.30');
      await expect(page.locator('[data-host-only="true"]')).toHaveCount(0);
    });
    await step('맨 아래로 내리면 다음 페이지를 읽어 24건이 된다', async () => {
      await rows(page).last().scrollIntoViewIfNeeded();
      await expect(rows(page)).toHaveCount(24);
      await rows(page).last().scrollIntoViewIfNeeded();
    });
  },
);

scenario(
  'NTC-2',
  '긴 제목은 목록 · 배너에서 한 줄 말줄임, 상세에서는 전체가 줄바꿈된다',
  {
    kind: '정상',
    summary: '목록 행과 배너 제목은 한 줄(넘치면 …), 상세 제목은 전체.',
    basis: ['plan P9c 완료 기준 V "긴 제목 한 줄 말줄임"'],
    mocks: [
      http.get('*/api/v2/notices/banners', () =>
        ok([{ noticeId: PINNED_NOTICE_ID, title: LONG_TITLE, bannerEndAt: null }]),
      ),
      http.get('*/api/v2/notices', () =>
        ok(
          paginate(
            [
              {
                noticeId: PINNED_NOTICE_ID,
                title: LONG_TITLE,
                target: 'ALL',
                pinned: true,
                createdAt: '2026.10.18 10:00',
              },
            ],
            0,
            20,
          ),
        ),
      ),
    ],
  },
  async ({ page, step }) => {
    await step('목록을 열면 긴 제목이 행과 배너에서 한 줄로 잘려 보인다', async () => {
      await page.goto('/notices');
      await expect(rows(page)).toHaveCount(1);
      await expect(banner(page)).toBeVisible();
      for (const el of [rows(page).getByText(LONG_TITLE), banner(page).getByText(LONG_TITLE)]) {
        const box = await el.boundingBox();
        expect(box?.height ?? 0).toBeLessThan(30);
      }
    });
  },
);

scenario(
  'NTC-3',
  '관객 공지 상세 — 칩 · 제목 · 일시(수정 일시), 본문은 섹션 뷰어 모양 + sanitize, [목록으로]',
  {
    kind: '정상',
    summary:
      '30번은 고친 공지라 "· 수정 2026.10.31 09:30". 본문의 스크립트·onclick·javascript: 링크는 지워지고 외부 링크에는 rel. 29번은 제목(h2)·목록 서식.',
    basis: ['plan P9c 완료 기준 V "본문 HTML 타이포"', 'P5b-V SectionViewer', 'tech-decisions §17'],
  },
  async ({ page, step }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await step('고친 공지를 열면 작성 · 수정 일시와 sanitize된 본문이 보인다', async () => {
      await page.goto(`/notices/${SANITIZE_NOTICE_ID}`);
      await expect(
        page.getByRole('heading', { level: 1, name: '[점검] 11월 2일 새벽 서버 점검 안내' }),
      ).toBeVisible();
      await expect(page.getByText('2026.10.30 18:00 · 수정 2026.10.31 09:30')).toBeVisible();
      const content = page.getByTestId('notice-content');
      expect(await content.innerHTML()).not.toMatch(/<script|onclick|javascript:/);
      await expect(content.getByRole('link', { name: '이용약관' })).toHaveAttribute(
        'rel',
        'noopener noreferrer',
      );
      expect(dialogs).toEqual([]);
    });
    await step('제목 · 목록 서식이 있는 공지는 섹션 뷰어와 같은 글자 모양으로 보인다', async () => {
      await page.goto(`/notices/${PINNED_NOTICE_ID}`);
      const content = page.getByTestId('notice-content');
      await expect(content.getByRole('heading', { name: '개정 내용' })).toBeVisible();
      await expect(content.getByRole('listitem')).toHaveCount(2);
    });
    await step('[목록으로]를 누르면 공지 목록으로 돌아간다', async () => {
      await page.getByRole('link', { name: '목록으로' }).click();
      await expect(page).toHaveURL('/notices');
      await expect(rows(page).first()).toBeVisible();
    });
  },
);

scenario(
  'NTC-4',
  '셸 상단 배너 — 관객: 누르면 상세, 닫으면 새로고침해도 다시 뜨지 않는다',
  {
    kind: '정상',
    summary: '공연홈 헤더 위에 배너 한 줄. 관객에게는 ALL 배너 하나뿐.',
    basis: ['plan P9c 완료 기준 V "관객·호스팅 셸에 배너"', 'implementation-log P9c-L 결정 1 · 2'],
  },
  async ({ page, step }) => {
    await step('공연홈을 열면 헤더 위에 공지 배너 한 줄이 보인다', async () => {
      await page.goto('/');
      await expect(banner(page)).toContainText('[점검] 11월 2일 새벽 서버 점검 안내');
    });
    await step('배너를 누르면 그 공지 상세로 간다', async () => {
      await banner(page).getByRole('link').click();
      await expect(page).toHaveURL(`/notices/${SANITIZE_NOTICE_ID}`);
    });
    await step('[×]로 닫으면 배너가 사라지고 새로고침해도 다시 뜨지 않는다', async () => {
      await page.getByRole('button', { name: '배너 닫기' }).click();
      await expect(banner(page)).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
    });
  },
);

scenario(
  'NTC-5',
  '호스팅 센터 — 배너를 닫으면 다음(HOST) 배너, 목록에 [공연준비] 칩, 상세는 /hosting/notices/{id}',
  {
    kind: '정상',
    summary:
      '공연준비 셸 상단 바 위 배너. 공연준비 공지(HOST)는 [공연준비] 칩. 상세 [목록으로]는 /hosting/notices.',
    basis: ['plan P9c L 범위 · 완료 기준 V', 'api-contract §5 서비스 공지 audience=HOST'],
  },
  async ({ page, step }) => {
    await step(
      '공연준비 공지 목록을 열면 상단 배너와 [공연준비] 칩이 있는 행이 보인다',
      async () => {
        await setMockSession(page, 'loggedIn');
        await page.goto('/hosting/notices');
        await expect(banner(page)).toContainText('[점검] 11월 2일 새벽 서버 점검 안내');
        await expect(page.locator('[data-host-only="true"]').first()).toContainText('공연준비');
      },
    );
    await step('배너를 닫으면 다음 배너(공연준비 공지)가 뜬다', async () => {
      await page.getByRole('button', { name: '배너 닫기' }).click();
      await expect(banner(page)).toContainText('[호스트] 두둥티켓 환불 의무 안내');
    });
    await step(
      '공연준비 공지 행을 누르면 공연준비 상세가 열리고 [목록으로]는 공연준비 목록',
      async () => {
        await page.locator('[data-host-only="true"]').first().getByRole('link').click();
        await expect(page).toHaveURL(/\/hosting\/notices\/\d+$/);
        await expect(page.getByRole('link', { name: '목록으로' })).toHaveAttribute(
          'href',
          '/hosting/notices',
        );
      },
    );
  },
);

scenario(
  'NTC-6',
  '메뉴의 "서비스 업데이트 노트"가 공지 목록으로 간다(모바일 햄버거 · PC 아바타 메뉴)',
  {
    kind: '반응형',
    summary:
      '모바일은 햄버거 드로어 로그아웃 위, PC는 아바타 ▾ 메뉴 로그아웃 위(DS My). 관객은 /notices, 공연준비는 /hosting/notices.',
    basis: ['design-requests Q4 기본안(Q44 → 공지 목록)', 'design-system §3 My'],
  },
  async ({ page, step, testInfo }) => {
    const isMobile = testInfo.project.name === 'mobile';
    await setMockSession(page, 'loggedIn');
    await step('관객 메뉴에서 "서비스 업데이트 노트"를 누르면 공지 목록으로 간다', async () => {
      await page.goto('/');
      if (isMobile) {
        await page.getByRole('button', { name: '메뉴 열기' }).click();
        await page.waitForTimeout(600);
      } else {
        await page.getByRole('button', { name: '내 메뉴' }).click();
      }
      const entry = page.getByRole(isMobile ? 'link' : 'menuitem', {
        name: '서비스 업데이트 노트',
      });
      await expect(entry).toBeVisible();
      await entry.click();
      await expect(page).toHaveURL('/notices');
    });
    await step('공연준비 메뉴에서는 공연준비 공지 목록으로 간다', async () => {
      await page.goto('/hosting');
      if (isMobile) {
        await page.getByRole('button', { name: '메뉴 열기' }).click();
        await page.waitForTimeout(600);
      } else {
        await page.getByRole('button', { name: '내 메뉴' }).click();
      }
      await expect(
        page.getByRole(isMobile ? 'link' : 'menuitem', { name: '서비스 업데이트 노트' }),
      ).toHaveAttribute('href', '/hosting/notices');
    });
  },
);

scenario(
  'NTC-7',
  '공지가 없으면 빈 상태, 배너도 없다',
  {
    kind: '빈 상태',
    summary: '"아직 공지사항이 없어요"(P9c-L 잠정 문구, 디자인 없음).',
    basis: ['implementation-log P9c-L 결정 7', 'design-requests Q44'],
    mocks: [...noticeHandlers.empty],
  },
  async ({ page, step }) => {
    await step('공지 목록을 열면 빈 상태 문구만 보이고 배너는 없다', async () => {
      await page.goto('/notices');
      await expect(page.getByText('아직 공지사항이 없어요')).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
    });
  },
);

scenario(
  'NTC-8',
  '없는 · 숨긴 공지와 조회 실패',
  {
    kind: '에러',
    summary:
      '관객 상세는 서버가 404(크롤러 상태 코드). 공연준비 상세는 공용 404 + [공지 목록]. 목록 GA-1 5xx는 다시 시도, 배너 GA-3 5xx는 배너만 없다.',
    basis: ['plan P9c 완료 기준 L', 'patterns §11 · §24 P9c'],
  },
  async ({ page, request, mockApi, step, note }) => {
    await step(
      '숨긴 공지를 관객 주소로 요청하면 404',
      async () => {
        const res = await request.get(`/notices/${HIDDEN_NOTICE_ID}`, {
          headers: { 'User-Agent': KAKAO_SCRAP_UA },
        });
        await note(`상태 ${res.status()}`);
        expect(res.status()).toBe(404);
      },
      { capture: false },
    );
    await step('숨긴 공지를 공연준비 주소로 열면 공용 404와 [공지 목록]이 보인다', async () => {
      await setMockSession(page, 'loggedIn');
      await page.goto(`/hosting/notices/${HIDDEN_NOTICE_ID}`);
      await expect(page.getByText('공지를 찾을 수 없어요')).toBeVisible();
      await expect(page.getByRole('link', { name: '공지 목록' })).toHaveAttribute(
        'href',
        '/hosting/notices',
      );
    });
    await step(
      '목록 조회가 실패하면 다시 시도 화면, 배너 조회가 실패하면 배너만 없다',
      async () => {
        mockApi.use(...noticeHandlers.listServerError, ...noticeHandlers.bannersServerError);
        await page.goto('/notices');
        await expect(page.getByRole('button', { name: /다시 시도/ })).toBeVisible();
        await expect(banner(page)).toHaveCount(0);
      },
    );
  },
);
