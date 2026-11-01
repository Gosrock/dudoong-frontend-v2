import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { resetTicketStore } from '../../src/api/__mocks__/fixtures/my-ticket';
import { resetNotificationStore } from '../../src/api/__mocks__/fixtures/notification';
import { notificationHandlers } from '../../src/api/__mocks__/notification.handlers';
import { envelope, expect, scenario } from '../scenario';

/**
 * 알림함 · 벨 빨간 점(plan P9b 완료 기준 V — "17종 타입 렌더(모르는 타입 포함), 벨 빨간 점").
 * 근거는 와이어(모바일 `128:2827` · PC `668:4772`) — GUI `331:11574`·`336:13684`는 Ready 아님(gui-screens §0).
 * mock 알림 25건(두 페이지)에 17종이 다 있고, 모르는 타입(`FUTURE_TYPE`)·모르는 대상(`FUTURE_TARGET`)이 한 건씩 있다.
 * 브라우저 시계를 mock 알림 시각 근처(2026.10.25 21:30 KST)로 고정해 상대 시간이 "N분 전"·"N시간 전"·"N일 전"으로 갈리게 한다.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 보호 화면(브라우저 조회)
 * - 권한: 비로그인 → 로그인(redirect 알림함)은 e2e `notifications.spec`이 본다. 관객·호스트 역할에 따라 화면이 다르지 않다
 *   (호스트가 받은 주문 알림의 이동 경로는 e2e가 링크 주소로 본다)
 * - 에러: GN-1 5xx(첫 페이지 · 다음 페이지). PN-3 실패 되돌림은 훅 테스트(`useNotification.test`)가 본다
 */

const PATH = '/mypage/notifications';
const NOW = new Date('2026-10-25T12:30:00Z'); // 2026.10.25 21:30 KST — 가장 새 알림(21:00)의 30분 뒤

const rows = (page: Page) => page.getByTestId('notification');
const row = (page: Page, title: string) => rows(page).filter({ hasText: title }).first();

async function open(page: Page) {
  resetTicketStore();
  resetNotificationStore();
  await page.clock.setFixedTime(NOW);
  await setMockSession(page, 'loggedIn');
  await page.goto(PATH);
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
  '알림 17종과 모르는 타입이 카테고리 아이콘 · 이름 · 서버 문구로 모두 그려진다',
  {
    kind: '정상',
    summary:
      '첫 페이지 20건 → 아래로 내리면 다음 페이지 5건. 카테고리 7종(관객 — 티켓선물 안내 · 티켓승인 안내 · 주문취소·환불 안내 · 공연 알림, 호스트 — 호스트 · 새 주문 · 호스트 · 취소·환불 요청 · 호스트 · 멤버) + 모르는 타입은 벨 아이콘과 "알림".',
    basis: [
      'plan P9b 완료 기준 V',
      'gui-screens §1 331:11574 카테고리 3종',
      '이슈 #106 운영자 type 표(2026-11-01) — 환불 완료 · 주문자 취소가 티켓승인 안내로 보이던 것',
      '와이어 128:2827 · 668:4772',
    ],
  },
  async ({ page, step, note }) => {
    await step('알림함을 열면 첫 20건이 카테고리 이름 · 제목 · 본문으로 보인다', async () => {
      await open(page);
      await expect(rows(page)).toHaveCount(20);
      await expect(page.getByRole('heading', { name: '알림함' })).toBeAttached();
      await expect(row(page, '티켓 주문이 승인되었습니다!')).toContainText('티켓승인 안내');
      await expect(row(page, '1시간 뒤에 시작됩니다!')).toContainText('공연 알림');
      await expect(row(page, '선물받은 티켓이 도착했어요')).toContainText('티켓선물 안내');
      await expect(row(page, '새 주문이 승인을 기다리고 있어요')).toContainText('호스트 · 새 주문');
      await expect(row(page, '호스트 멤버로 추가되었어요')).toContainText('호스트 · 멤버');
    });
    await step('모르는 타입은 깨지지 않고 "알림" + 서버 문구로 보인다', async () => {
      const unknown = row(page, '새로운 종류의 알림');
      await unknown.scrollIntoViewIfNeeded();
      await expect(unknown).toHaveAttribute('data-category', 'OTHER');
      await expect(unknown).toContainText('알림');
    });
    await step('맨 아래로 내리면 다음 페이지를 읽어 25건이 된다', async () => {
      await page.getByTestId('notification').last().scrollIntoViewIfNeeded();
      await expect(rows(page)).toHaveCount(25);
      await rows(page).last().scrollIntoViewIfNeeded();
    });
    await step(
      '17종이 모두 카테고리 7종 중 하나로, 모르는 타입 1건만 기타로 나뉜다',
      async () => {
        const counts = await rows(page).evaluateAll((els) =>
          els.reduce<Record<string, number>>((acc, el) => {
            const c = el.getAttribute('data-category') ?? '?';
            acc[c] = (acc[c] ?? 0) + 1;
            return acc;
          }, {}),
        );
        await note(`카테고리별 ${JSON.stringify(counts)}`);
        expect(Object.keys(counts).sort()).toEqual([
          'EVENT',
          'GIFT',
          'HOST_MEMBER',
          'HOST_ORDER',
          'HOST_REFUND',
          'ORDER',
          'OTHER',
          'TICKET',
        ]);
        expect(counts.OTHER).toBe(1);
      },
      { capture: false },
    );
    await step('환불 완료 · 주문자 취소는 더는 "티켓승인 안내"가 아니다(#106)', async () => {
      const refunded = row(page, '환불이 완료되었습니다');
      await refunded.scrollIntoViewIfNeeded();
      await expect(refunded).toContainText('주문취소·환불 안내');
      const canceled = row(page, '주문자가 주문을 취소했어요');
      await canceled.scrollIntoViewIfNeeded();
      await expect(canceled).toContainText('호스트 · 취소·환불 요청');
    });
  },
);

scenario(
  'NOTI-2',
  '안 읽은 알림은 빨간 점 + 진한 글자, 시간은 상대 시간',
  {
    kind: '정상',
    summary:
      '안 읽음은 아이콘 왼쪽 위 빨간 점(6px)과 굵은 제목, 읽은 행은 흐린 글자. 시간은 "30분 전" · "N시간 전" · "N일 전".',
    basis: ['plan P9b V 범위', '와이어 128:2827', 'implementation-log P9b-V 결정(상대 시간 경계)'],
  },
  async ({ page, step, note }) => {
    await step('맨 위 안 읽은 알림은 빨간 점과 굵은 제목, "30분 전"으로 보인다', async () => {
      await open(page);
      const first = rows(page).first();
      await expect(first).toHaveAttribute('data-read', 'false');
      await expect(first).toContainText('30분 전');
      await expect(first).toContainText('안 읽음');
      const weight = await first
        .getByText('티켓 주문이 승인되었습니다!')
        .evaluate((el) => getComputedStyle(el).fontWeight);
      await note(`안 읽은 제목 굵기 ${weight}`);
      expect(Number(weight)).toBeGreaterThanOrEqual(600);
    });
    await step('읽은 알림은 빨간 점 없이 흐린 글자, 오래된 것은 "N시간 전"', async () => {
      const read = row(page, '호스트 멤버로 추가되었어요');
      await expect(read).toHaveAttribute('data-read', 'true');
      await expect(read).not.toContainText('안 읽음');
      await expect(read).toContainText('4시간 전');
    });
  },
);

scenario(
  'NOTI-3',
  '알림을 누르면 읽음 처리하고 대상 화면으로 간다',
  {
    kind: '정상',
    summary: '공연 알림(EVENT) → 공연 상세. 돌아오면 그 행은 읽음(흐린 글자).',
    basis: ['plan P9b L 범위 target.type 이동', 'patterns §21'],
  },
  async ({ page, step }) => {
    await step('공연 알림을 누르면 공연 상세로 간다', async () => {
      await open(page);
      await row(page, '1시간 뒤에 시작됩니다!').getByRole('link').click();
      await expect(page).toHaveURL('/events/101');
    });
    await step('뒤로 돌아오면 그 알림은 읽음이다', async () => {
      await page.goBack();
      await expect(row(page, '1시간 뒤에 시작됩니다!')).toHaveAttribute('data-read', 'true');
    });
  },
);

scenario(
  'NOTI-4',
  '[모두 읽음]을 누르면 모든 행이 읽음, 벨의 빨간 점이 사라진다',
  {
    kind: '정상',
    summary:
      '모바일은 관객 드로어 안 벨, PC는 호스팅 상단 바 벨. 빨간 점은 DS `notification-on` 아이콘.',
    basis: [
      'plan P9b 완료 기준 V 벨 빨간 점',
      'gui-screens §2 Top bar_Host 벨',
      '와이어 128:2875 드로어',
    ],
  },
  async ({ page, step, testInfo }) => {
    const isMobile = testInfo.project.name === 'mobile';
    await step('안 읽은 알림이 있으면 벨에 빨간 점(새 알림 있음)이 있다', async () => {
      resetTicketStore();
      resetNotificationStore();
      await setMockSession(page, 'loggedIn');
      const bell = await bellName(page, isMobile);
      await expect(bell).toHaveAccessibleName('알림(새 알림 있음)');
    });
    await step('알림함에서 [모두 읽음]을 누르면 모든 행이 읽음이 되고 버튼이 꺼진다', async () => {
      await page.clock.setFixedTime(NOW);
      await page.goto(PATH);
      await expect(rows(page).first()).toBeVisible();
      await page.getByRole('button', { name: '모두 읽음' }).click();
      await expect(page.locator('[data-testid=notification][data-read=false]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
    });
    await step('벨의 빨간 점이 사라진다', async () => {
      const bell = await bellName(page, isMobile);
      await expect(bell).toHaveAccessibleName('알림');
    });
  },
);

scenario(
  'NOTI-5',
  '알림이 없으면 빈 상태 문구, [모두 읽음]이 없다',
  {
    kind: '빈 상태',
    summary:
      '와이어에 빈 상태가 없다(디자이너 코멘트 "빈상태 만들기") — 지금은 "아직 받은 알림이 없어요" 한 줄.',
    basis: ['와이어 128:2827 코멘트 1980093387', 'implementation-log P9b-V 결정'],
    mocks: notificationHandlers.empty,
  },
  async ({ page, step }) => {
    await step('알림함을 열면 "아직 받은 알림이 없어요"가 보인다', async () => {
      await page.clock.setFixedTime(NOW);
      await setMockSession(page, 'loggedIn');
      await page.goto(PATH);
      await expect(page.getByText('아직 받은 알림이 없어요')).toBeVisible();
      await expect(page.getByRole('button', { name: '모두 읽음' })).toHaveCount(0);
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
      '두 번째 페이지(page=1) 5xx → 20건은 그대로, 아래 "더 불러오지 못했어요" + [다시 시도]. 다시 누르면 25건.',
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
    await step('아래로 내리면 20건 아래에 "더 불러오지 못했어요"가 보인다', async () => {
      await open(page);
      await rows(page).last().scrollIntoViewIfNeeded();
      await expect(page.getByText('더 불러오지 못했어요.')).toBeVisible();
      await expect(rows(page)).toHaveCount(20);
    });
    await step('[다시 시도]를 누르면 나머지 5건이 붙는다', async () => {
      fail = false;
      await page.getByRole('button', { name: '다시 시도' }).click();
      await expect(rows(page)).toHaveCount(25);
    });
  },
);
