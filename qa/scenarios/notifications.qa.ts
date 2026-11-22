import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { resetTicketStore } from '../../src/api/__mocks__/fixtures/my-ticket';
import { resetNotificationStore } from '../../src/api/__mocks__/fixtures/notification';
import { notificationHandlers } from '../../src/api/__mocks__/notification.handlers';
import { envelope, expect, scenario } from '../scenario';

/**
 * 알림함 · 벨 빨간 점(plan P9b 완료 기준 V) — GUI 관객 창 `1047:4070` · 호스트 창 `2025:1471`(2026-11-22 Ready, #375 · #376).
 * mock 알림 25건(두 페이지)에 17종이 다 있다 — 호스트 창 5건(새 주문 · 멤버 추가 · 환불 요청 · 주문자 취소 · 환불 계좌 변경)은 모두 첫 페이지.
 * 안 읽음은 관객 창 4건(승인 · 곧 시작 · 선물 도착 · 모르는 타입) + 호스트 창 1건(새 주문).
 * 브라우저 시계를 mock 알림 시각 근처(2026.10.25 21:30 KST)로 고정해 상대 시간이 "N분 전"·"N시간 전"으로 갈리게 한다.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 보호 화면(브라우저 조회)
 * - 권한: 비로그인 → 로그인(redirect 알림함)은 e2e `notifications.spec`이 본다. 창은 역할이 아니라 알림 `type`으로 나뉜다
 *   (호스트가 받은 주문 알림의 이동 경로는 e2e가 링크 주소로 본다)
 * - 에러: GN-1 5xx(첫 페이지 · 다음 페이지). PN-3 실패 되돌림 · 창 읽음 실패(토스트 없음)는 훅 테스트(`useNotification.test`)가 본다
 */

const PATH = '/mypage/notifications';
const NOW = new Date('2026-10-25T12:30:00Z'); // 2026.10.25 21:30 KST — 가장 새 알림(21:00)의 30분 뒤

const rows = (page: Page) => page.getByTestId('notification');
const row = (page: Page, text: string) => rows(page).filter({ hasText: text }).first();
const tab = (page: Page, name: string) => page.getByRole('tab', { name: new RegExp(`^${name}`) });
const readBody = (page: Page) =>
  page
    .waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/me/notifications/read'))
    .then((r) => r.postDataJSON() as unknown);

async function open(page: Page, path = PATH) {
  resetTicketStore();
  resetNotificationStore();
  await page.clock.setFixedTime(NOW);
  await setMockSession(page, 'loggedIn');
  await page.goto(path);
  await expect(rows(page).first()).toBeVisible();
}

/** 벨(관객 모바일은 드로어 안, PC는 호스팅 상단 바)의 접근성 이름 */
async function bellName(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.goto('/');
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    const drawer = page.getByRole('dialog', { name: '메뉴' });
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(600);
    return drawer.getByRole('link', { name: /^알림/ });
  }
  await page.goto('/hosting');
  return page.getByRole('link', { name: /^알림/ }).first();
}

scenario(
  'NOTI-1',
  '관객 창 — 알림 이름 · 아이콘 · 서버 본문, 정렬 "최신순" 고정, 호스트 탭에 빨간 점',
  {
    kind: '정상',
    summary:
      '첫 페이지 20건 중 관객 창 15건 → 아래로 내리면 다음 페이지 5건(20). 행 머리는 알림 이름(주문 승인 · 공연 알림 · 선물 도착 알림 …) + 상대 시간, 아래 서버 본문. 모르는 타입은 벨 아이콘과 "알림". 호스트 창에 안 읽은 새 주문이 있어 호스트 탭에 빨간 점.',
    basis: [
      'GUI 1047:4070 알림함 - 관객(#375)',
      'plan P9b 완료 기준 V',
      'backend-questions B75(정렬 없음)',
    ],
  },
  async ({ page, step }) => {
    await step('알림함을 열면 관객 창 15건이 이름 · 본문으로, 오른쪽 위 "최신순"', async () => {
      await open(page);
      await expect(rows(page)).toHaveCount(15);
      await expect(tab(page, '관객')).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('최신순', { exact: true })).toBeVisible();
      await expect(row(page, '주문이 승인되어 티켓이 발급되었어요')).toContainText('주문 승인');
      await expect(row(page, '공연이 1시간 뒤에 시작됩니다!')).toContainText('공연 알림');
      await expect(row(page, '님에게 받은')).toContainText('선물 도착 알림');
      await expect(rows(page).first()).toContainText('30분 전');
      await expect(page.locator('[data-testid=notification][data-tab=host]')).toHaveCount(0);
    });
    await step('호스트 탭에는 새 알림 빨간 점이 있다', async () => {
      await expect(tab(page, '호스트')).toHaveAccessibleName('호스트 · 새 알림');
      await expect(tab(page, '관객')).toHaveAccessibleName('관객');
    });
    await step('모르는 타입은 깨지지 않고 "알림" + 서버 본문으로 보인다', async () => {
      const unknown = row(page, '프론트가 아직 모르는 알림이에요.');
      await unknown.scrollIntoViewIfNeeded();
      await expect(unknown).toHaveAttribute('data-type', 'UNKNOWN');
      await expect(unknown).toContainText('알림');
    });
    await step('맨 아래로 내리면 다음 페이지를 읽어 20건이 된다', async () => {
      await rows(page).last().scrollIntoViewIfNeeded();
      await expect(rows(page)).toHaveCount(20);
      await rows(page).last().scrollIntoViewIfNeeded();
    });
  },
);

scenario(
  'NOTI-2',
  '창을 열면 그 창의 새 알림을 읽음 처리 — 이번에는 진하게, 다시 오면 흐리게',
  {
    kind: '정상',
    summary:
      '관객 창을 열면 PN-3 notificationIds = 관객 창 안 읽은 4건(호스트 창 새 주문은 빼고). 읽음이 됐어도 이번 방문 동안은 진한 글자, 다시 들어오면 흐린 글자(비활성 회색).',
    basis: ['GUI 1047:4070 "창 열면 모든 신규 알림이 읽음처리"(#375)', 'patterns §21'],
  },
  async ({ page, step, note }) => {
    await step('열자마자 관객 창의 안 읽은 4건만 PN-3로 읽는다', async () => {
      resetTicketStore();
      resetNotificationStore();
      await page.clock.setFixedTime(NOW);
      await setMockSession(page, 'loggedIn');
      const body = readBody(page);
      await page.goto(PATH);
      expect(await body).toEqual({ notificationIds: [125, 124, 123, 120] });
      await expect(rows(page).first()).toHaveAttribute('data-read', 'true');
      await expect(rows(page).first()).toHaveAttribute('data-new', 'true');
    });
    await step('새 알림은 진한 글자, 원래 읽은 알림은 비활성 회색', async () => {
      const color = async (text: string) =>
        row(page, text)
          .getByText(text)
          .evaluate((el) => getComputedStyle(el).color);
      const fresh = await color('공연이 1시간 뒤에 시작됩니다!');
      const old = await color('모르는 대상으로 온 알림이에요.');
      await note(`새 알림 ${fresh} · 읽은 알림 ${old}`);
      expect(fresh).toBe('rgb(20, 20, 19)');
      expect(old).toBe('rgb(184, 183, 179)');
    });
    await step('다시 들어오면 관객 창은 모두 흐리게, 호스트 탭 빨간 점은 그대로', async () => {
      await page.reload();
      await expect(rows(page).first()).toBeVisible();
      await expect(page.locator('[data-testid=notification][data-new=true]')).toHaveCount(0);
      await expect(tab(page, '호스트')).toHaveAccessibleName('호스트 · 새 알림');
    });
  },
);

scenario(
  'NOTI-3',
  '호스트 창 — 주문 알림 · 멤버 추가, 열면 읽음 처리하고 벨 빨간 점이 꺼진다',
  {
    kind: '정상',
    summary:
      '[호스트] 탭 → 주소 ?tab=host, 신규 주문 알림 · 호스트 멤버 추가 · 주문 취소 요청 · 주문 취소 알림 · 환불 계좌 변경(아이콘 outline). 새 주문 1건을 PN-3로 읽어 벨의 빨간 점이 사라진다.',
    basis: [
      'GUI 2025:1471 알림함 - 호스트(#376)',
      'plan P9b 완료 기준 V 벨 빨간 점',
      'gui-screens §2 Top bar_Host 벨',
    ],
  },
  async ({ page, step, testInfo }) => {
    const isMobile = testInfo.project.name === 'mobile';
    await step('관객 창을 본 뒤에도 호스트 창 새 알림이 남아 벨에 빨간 점이 있다', async () => {
      const done = page.waitForResponse((r) => r.url().endsWith('/me/notifications/read'));
      await open(page);
      await done;
      const bell = await bellName(page, isMobile);
      await expect(bell).toHaveAccessibleName('알림(새 알림 있음)');
    });
    await step('[호스트] 탭을 누르면 호스트 창 5건, 새 주문 1건을 읽는다', async () => {
      await page.goto(PATH);
      await expect(rows(page).first()).toBeVisible();
      const body = readBody(page);
      await tab(page, '호스트').click();
      await expect(page).toHaveURL(`${PATH}?tab=host`);
      await expect(rows(page)).toHaveCount(5);
      expect(await body).toEqual({ notificationIds: [122] });
      await expect(row(page, '주문(R3000101)이 접수되었습니다')).toContainText('신규 주문 알림');
      await expect(row(page, '매니저(으)로 추가되었습니다')).toContainText('호스트 멤버 추가');
      await expect(row(page, '환불 요청이 들어왔습니다')).toContainText('주문 취소 요청');
      await expect(row(page, '주문자에 의해 취소되었습니다')).toContainText('주문 취소 알림');
      await expect(row(page, '환불 계좌가 변경되었습니다')).toContainText('환불 계좌 변경');
    });
    await step('벨의 빨간 점이 사라진다', async () => {
      const bell = await bellName(page, isMobile);
      await expect(bell).toHaveAccessibleName('알림');
    });
  },
);

scenario(
  'NOTI-4',
  '알림을 누르면 대상 화면으로 가고, 돌아오면 그 창 그대로',
  {
    kind: '정상',
    summary:
      '공연 알림(EVENT) → 공연 상세. 호스트 창에서 멤버 추가 → 호스트 홈, 뒤로 오면 호스트 창(?tab=host).',
    basis: ['plan P9b L 범위 target.type 이동', 'patterns §21'],
  },
  async ({ page, step }) => {
    await step('공연 알림을 누르면 공연 상세로 간다', async () => {
      await open(page);
      await row(page, '공연이 1시간 뒤에 시작됩니다!').getByRole('link').click();
      await expect(page).toHaveURL('/events/101');
    });
    await step('호스트 창의 멤버 추가를 누르고 돌아오면 호스트 창이다', async () => {
      await page.goto(`${PATH}?tab=host`);
      await expect(rows(page).first()).toBeVisible();
      await row(page, '매니저(으)로 추가되었습니다').getByRole('link').click();
      await expect(page).toHaveURL('/hosts/11');
      await page.goBack();
      await expect(tab(page, '호스트')).toHaveAttribute('aria-selected', 'true');
      await expect(rows(page)).toHaveCount(5);
    });
  },
);

scenario(
  'NOTI-5',
  '알림이 없으면 빈 상태 문구',
  {
    kind: '빈 상태',
    summary:
      'GUI에 빈 창이 없다(Figma 코멘트 2026-11-22) — 지금은 "아직 받은 알림이 없어요" 한 줄. 두 창 모두.',
    basis: ['GUI 1047:4341 코멘트(빈 창 · PC)', 'implementation-log DS-375 결정'],
    mocks: notificationHandlers.empty,
  },
  async ({ page, step }) => {
    await step('알림함을 열면 "아직 받은 알림이 없어요"가 보인다', async () => {
      await page.clock.setFixedTime(NOW);
      await setMockSession(page, 'loggedIn');
      await page.goto(PATH);
      await expect(page.getByText('아직 받은 알림이 없어요')).toBeVisible();
      await expect(tab(page, '호스트')).toHaveAccessibleName('호스트');
    });
    await step('호스트 창도 빈 상태', async () => {
      await tab(page, '호스트').click();
      await expect(page.getByText('아직 받은 알림이 없어요')).toBeVisible();
    });
  },
);

scenario(
  'NOTI-6',
  '목록을 못 읽으면 다시 시도 화면',
  {
    kind: '에러',
    summary: 'GN-1 5xx — 공용 에러 화면("불러오지 못했어요" + [다시 시도]).',
    basis: ['patterns §4-3 AsyncBoundary', 'notification.handlers listServerError'],
    mocks: notificationHandlers.listServerError,
  },
  async ({ page, step }) => {
    await step('알림함을 열면 "불러오지 못했어요"와 [다시 시도]가 보인다', async () => {
      await setMockSession(page, 'loggedIn');
      await page.goto(PATH);
      await expect(page.getByRole('alert').filter({ hasText: '불러오지 못했어요' })).toBeVisible();
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
  },
);

scenario(
  'NOTI-7',
  '다음 페이지를 못 읽으면 기존 행을 두고 아래에 다시 시도',
  {
    kind: '에러',
    summary:
      '두 번째 페이지(page=1) 5xx → 관객 창 15건은 그대로, 아래 "더 불러오지 못했어요" + [다시 시도]. 다시 누르면 20건.',
    basis: ['patterns §12 무한 목록', 'useNotificationInbox nextPageFailed'],
  },
  async ({ page, step }) => {
    let fail = true;
    await page.route(
      (url) => url.pathname.endsWith('/me/notifications') && url.searchParams.get('page') === '1',
      (r) =>
        fail
          ? r.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify(envelope.error(500, 'GLOBAL_500_1')),
            })
          : r.fallback(),
    );
    await step('아래로 내리면 15건 아래에 "더 불러오지 못했어요"가 보인다', async () => {
      await open(page);
      await rows(page).last().scrollIntoViewIfNeeded();
      await expect(page.getByText('더 불러오지 못했어요.')).toBeVisible();
      await expect(rows(page)).toHaveCount(15);
    });
    await step('[다시 시도]를 누르면 나머지 5건이 붙는다', async () => {
      fail = false;
      await page.getByRole('button', { name: '다시 시도' }).click();
      await expect(rows(page)).toHaveCount(20);
    });
  },
);
