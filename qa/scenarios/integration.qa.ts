import type { Page, TestInfo } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import {
  goEventMenu,
  pickFakeAddress,
  pickOption,
  routeEventSdks,
} from '../../e2e/support/event-scope';
import {
  checkInTokenOf,
  listMyTickets,
  resetTicketStore as resetMyTicketStore,
} from '../../src/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { resetOrderStore } from '../../src/api/__mocks__/order.handlers';
import { MOCK_S3_ORIGIN } from '../../src/api/__mocks__/upload-handlers';
import { expect, scenario } from '../scenario';

/**
 * P14 회귀 — 관객 ↔ 호스팅 공유 지점(plan §3 S1~S9) 통합 시나리오. 피처별 QA는 한쪽 화면만 보므로, 여기서는 **한 쪽에서 바꾼 것이
 * 반대쪽 화면에 그대로 보이는지**를 한 흐름으로 이어 본다. mock 저장소가 서로 이어져 있다(`event-store` ↔ GP-3,
 * `ticket-store` ↔ GP-5, O-1 → `guest-store` → 승인 → `fixtures/my-ticket` → PQ-2·PQ-5).
 *
 * | 시나리오 | 공유 지점 |
 * |---|---|
 * | REG-1 호스트 공연 만들기 → 등록 → 관객 상세 | S3 공연 상세·섹션 |
 * | REG-2 관객 주문 → 호스트 승인 → 티켓탭 → 선물 → 셀프 체크인 · 호스트 QR → 예매자 관리 | S1 · S2 · S4 · S5 |
 * | REG-3 호스트 판매 중단 · 재개 → 관객 상세 티켓 상태 | S1 |
 *
 * 남긴 것(mock 한계): 새로 만든 공연(7001)의 티켓을 관객이 주문하는 흐름은 없다 — mock 체크아웃(O-0·O-1)과 티켓탭 공연 정보가
 * 공연 fixture(`findPublicEvent`)만 읽어서다. 주문 이후는 fixture 공연 101로 잇는다. S7(알림)·S8(호스트 홈)·S9(공지)는
 * 한 화면 안의 분기라 피처 QA(notifications · host-home · host-settings · notices)가 본다.
 *
 * 범주 검토 — 이 파일은 정상 흐름 회귀만. 에러·권한·빈 상태는 피처 QA, 크롤러는 e2e.
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
  resetOrderStore();
  resetMyTicketStore();
};

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};
const PNG = { name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e]) };

/** 상태 코드는 크롤러 UA로 본다(브라우저 UA는 스트리밍이라 200 — e2e `event-detail.spec`과 같은 기준) */
const crawler = { headers: { 'User-Agent': KAKAO_SCRAP_UA } };

const isDesktop = (testInfo: TestInfo) => testInfo.project.name === 'desktop';

async function setUp(page: Page) {
  reset();
  await setMockSession(page, 'loggedIn');
}

scenario(
  'REG-1',
  '호스트가 공연을 만들고(간편 만들기) 기본·상세 정보를 채워 등록하면, 관객 공연 상세에 그 값이 그대로 보인다',
  {
    kind: '정상',
    summary:
      'S3 — 호스팅의 기본 정보(PE-4)·섹션(PE-6)·등록(PE-8)이 관객 GP-3 · 섹션 뷰어에 바로 반영된다. 등록 전 관객 주소는 404.',
    basis: ['plan §3 S3', 'plan P11 완료 기준', 'plan P5b 완료 기준', 'plan P14 회귀'],
  },
  async ({ page, request, step }) => {
    await setUp(page);
    await page.route(`${MOCK_S3_ORIGIN}/**`, (r) =>
      r.fulfill({ status: 200, headers: S3_CORS, body: '' }),
    );
    await routeEventSdks(page);

    await step(
      '[호스팅] 간편 만들기 — 호스트 고르고 이름·일시·티켓 없음으로 만들면 대시보드',
      async () => {
        await page.goto('/hosting/new/events?hostId=11');
        await page.getByRole('button', { name: '다음' }).click();
        await page.getByLabel('공연 이름').fill('여름 버스킹');
        await page.getByLabel('날짜').fill('2030-05-01');
        await page.getByLabel('시작 시각').fill('19:00');
        await page.getByLabel('종료 시각').fill('21:00');
        await page.getByRole('radio', { name: '티켓 없음' }).click();
        await page.getByRole('button', { name: '완료' }).click();
        await expect(page).toHaveURL(/\/hosting\/events\/7001\/dashboard/);
        await expect(page.getByTestId('checklist-progress')).toHaveText('1/3');
      },
    );
    await step(
      '[크롤러] 등록 전 공연 주소는 404(브라우저 UA는 스트리밍 200 + 찾을 수 없음 화면 — tech-decisions §2)',
      async () => {
        const res = await request.get('/events/7001', crawler);
        expect(res.status()).toBe(404);
      },
      { capture: false },
    );
    await step('[호스팅] 기본 정보 — 포스터 · 장소(주소 검색) · 문의처를 저장', async () => {
      await goEventMenu(page, '기본 정보');
      await page.getByLabel('포스터 올리기').setInputFiles(PNG);
      await pickFakeAddress(page);
      await page.getByLabel('공연장 이름').fill('롤링홀');
      await pickOption(page, '문의처 유형 1', '인스타그램');
      await page.getByLabel('문의처 1', { exact: true }).fill('@busking');
      await page.getByRole('button', { name: '저장하기' }).click();
      await expect(page.getByText('저장했어요')).toBeVisible();
    });
    await step('[호스팅] 상세 정보 — 공연소개 본문을 저장', async () => {
      await goEventMenu(page, '상세 정보');
      await page.getByRole('textbox', { name: '공연소개 본문' }).fill('여름밤 버스킹에 초대합니다');
      await page.getByRole('button', { name: '저장하기' }).click();
      await expect(page.getByText('저장했어요')).toBeVisible();
    });
    await step('[호스팅] 대시보드 3/3 → [공연 등록하기] → [등록]', async () => {
      await goEventMenu(page, '대시보드');
      const ready = page.getByRole('alertdialog', { name: '공연 등록 준비가 완료되었어요!' });
      await ready.getByRole('button', { name: '확인' }).click();
      await expect(page.getByTestId('checklist-progress')).toHaveText('3/3');
      await page.getByRole('button', { name: '공연 등록하기' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '등록' }).click();
      await expect(page.getByText('공연이 등록되었습니다.')).toBeVisible();
      await expect(page.getByTestId('dashboard-registered')).toBeVisible();
    });
    await step(
      '[관객] 공연 상세 — 이름 · 장소 · 섹션 본문이 호스팅에서 넣은 그대로(200)',
      async () => {
        const res = await request.get('/events/7001', crawler);
        expect(res.status()).toBe(200);
        await page.goto('/events/7001');
        await expect(page.getByRole('heading', { level: 1, name: '여름 버스킹' })).toBeVisible();
        await expect(page.getByText('롤링홀').locator('visible=true').first()).toBeVisible();
        await expect(
          page.getByText('여름밤 버스킹에 초대합니다').locator('visible=true').first(),
        ).toBeVisible();
      },
    );
  },
);

scenario(
  'REG-2',
  '관객 주문 → 호스트 승인 → 티켓탭 → 한 장 선물 → 다른 한 장 셀프 체크인 → 호스트 QR · 예매자 관리에 같은 상태',
  {
    kind: '정상',
    summary:
      'S1·S2 체크아웃 총액 = 주문 금액, S5 같은 주문이 호스트 예매자 관리에 승인 대기로, 승인하면 관객 티켓탭(NEW). S4 셀프 체크인(PQ-5)으로 들어간 티켓을 호스트가 찍으면 "이미 입장", 선물 대기 티켓은 선물 상태로 — 발급된 티켓 탭에도 같은 값.',
    basis: [
      'plan §3 S1 · S2 · S4 · S5',
      'plan P13a HG-12 크리티컬 패스',
      'plan P8b · P8c · P13b 완료 기준',
      'storyboard 크리티컬 패스',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    let orderUuid = '';
    const desktop = isDesktop(testInfo);

    await step(
      '[관객] 공연 상세에서 일반 예매 2매 → 체크아웃 총액 50,000 원(옵션 +10,000 × 2)',
      async () => {
        await page.goto('/events/101');
        if (!desktop) {
          await page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true').click();
        }
        const area = desktop
          ? page.getByRole('complementary', { name: '예매' })
          : page.getByRole('dialog', { name: '티켓 종류' });
        await area
          .getByRole('listitem')
          .getByRole('button', { name: /일반 예매/ })
          .click();
        await area.getByRole('button', { name: '일반 예매 수량 늘리기' }).click();
        await area.getByRole('button', { name: '티켓 구매하기' }).click();
        await expect(page).toHaveURL(/\/events\/101\/checkout\?ticketItemId=501&quantity=2/);
        await page
          .getByRole('radiogroup', { name: /뒤풀이 참석/ })
          .getByRole('radio', { name: '예' })
          .click();
        await page.getByRole('textbox', { name: '응원하는 멤버' }).fill('보컬');
        await expect(page.getByTestId('checkout-amount')).toHaveText('50,000 원');
      },
    );
    await step(
      '[관객] 동의 → [결제하기] → 입금 확인 금액도 50,000 원 → [결제완료] → 주문 완료',
      async () => {
        await page.getByRole('checkbox', { name: /주문내용과 환불\/취소 규정/ }).click();
        await page.getByRole('button', { name: '결제하기' }).click();
        const dialog = page.getByRole('alertdialog', { name: '주문 완료하기' });
        await expect(dialog.getByText('50,000 원')).toBeVisible();
        await dialog.getByRole('button', { name: '결제완료' }).click();
        await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
        orderUuid = new URL(page.url()).pathname.split('/').at(-1)!;
      },
    );
    await step('[관객] 주문내역 상세 — 승인 대기', async () => {
      await page.goto(`/orders/${orderUuid}`);
      await expect(page.getByRole('region', { name: '공연' })).toContainText('승인대기');
    });

    const detail = page.getByRole('dialog').filter({ has: page.getByTestId('order-detail') });
    await step('[호스팅] 예매자 관리 — 같은 주문이 승인 대기, 금액 50,000원', async () => {
      if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
      await page.goto(`/hosting/events/101/guests?order=${orderUuid}`);
      await expect(detail.getByTestId('detail-status')).toHaveText('승인 대기');
      await expect(detail).toContainText('50,000');
    });
    await step('[호스팅] [승인] → 승인 완료', async () => {
      await detail.getByRole('button', { name: '승인' }).click();
      await expect(detail.getByTestId('detail-status')).toHaveText('승인 완료');
    });

    const group = page.locator(`[id="group-${orderUuid}"]`);
    const layer = page.getByRole('dialog', { name: '입장 QR' });
    let gifted = '';
    await step('[관객] 티켓탭 — NEW 공지 바, 이 주문 카드에 2장', async () => {
      await page.goto('/tickets');
      await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
      await expect(group).toBeVisible();
      const mine = listMyTickets().groups.find((g) => g.orderUuid === orderUuid);
      expect(mine?.tickets).toHaveLength(2);
    });
    await step('[관객] 카드 → 입장 QR → [선물하기] → 유의사항 체크 → 링크 생성 완료', async () => {
      if ((await group.getAttribute('data-active')) !== 'true') {
        await group.getByRole('button').first().click();
      }
      await expect(group).toHaveAttribute('data-active', 'true');
      await group.getByRole('button', { name: '입장 QR 보기' }).click();
      await expect(layer).toBeVisible();
      gifted = (await layer.getByTestId('qr-value').getAttribute('data-value')) ?? '';
      expect(gifted).not.toBe('');
      await layer.getByRole('button', { name: '선물하기' }).click();
      const sheet = page.getByRole('dialog', { name: '티켓을 선물할까요?' });
      await sheet
        .getByRole('checkbox', { name: '티켓 선물하기 관련 유의사항을 확인했습니다.' })
        .check();
      await sheet.getByRole('button', { name: '티켓 선물하기' }).click();
      await expect(page.getByRole('heading', { name: '선물 링크 생성 완료!' })).toBeVisible();
    });

    const tickets = () => listMyTickets().groups.find((g) => g.orderUuid === orderUuid)!.tickets;
    const kept = () => tickets().find((t) => t.ticketUuid !== gifted)!;
    await step(
      '[관객] 셀프 체크인 QR 주소 — 고르는 목록에서 남은 한 장을 골라 입장 완료',
      async () => {
        const no = kept().issuedTicketNo!;
        await page.goto(`/check-in?token=${checkInTokenOf(101)}`);
        const picker = page.getByRole('region', { name: '티켓 고르기' });
        await picker.getByRole('radio', { name: new RegExp(no) }).click();
        await picker.getByRole('button', { name: '이 티켓으로 입장' }).click();
        await expect(page.getByRole('region', { name: '체크인 결과' })).toHaveAttribute(
          'data-result',
          'ENTERED',
        );
        await expect(page.getByTestId('check-in-ticket')).toContainText(no);
      },
    );

    const result = page.getByRole('region', { name: '스캔 결과' });
    const scan = async (value: string) => {
      await expect(page.getByTestId('host-scan')).toBeVisible();
      await page.evaluate(
        (v) => window.dispatchEvent(new CustomEvent('dd:qr-scan', { detail: v })),
        value,
      );
    };
    await step('[호스팅] QR 체크인 — 셀프로 들어간 티켓을 찍으면 "이미 입장"', async () => {
      await page.addInitScript(() => {
        if (!navigator.mediaDevices) return;
        navigator.mediaDevices.getUserMedia = async () => {
          const c = document.createElement('canvas');
          c.width = 640;
          c.height = 480;
          return c.captureStream(10);
        };
      });
      await page.goto('/hosting/events/101/qr');
      await scan(kept().ticketUuid!);
      await expect(result).toHaveAttribute('data-result', 'ALREADY_ENTERED');
    });
    await step('[호스팅] 선물 링크를 보낸(수락 전) 티켓을 찍으면 선물 대기 결과', async () => {
      await result.getByRole('button', { name: '다음 스캔' }).click();
      await scan(gifted);
      await expect(result).toHaveAttribute('data-result', 'GIFT_PENDING');
    });
    await step('[호스팅] 예매자 관리 발급된 티켓 탭 — 같은 두 장(입장 · 선물 대기)', async () => {
      const giftedNo = tickets().find((t) => t.ticketUuid === gifted)!.issuedTicketNo!;
      await page.goto('/hosting/events/101/guests?tab=tickets');
      const row = (no: string) => page.getByTestId('ticket-row').filter({ hasText: no });
      await expect(row(kept().issuedTicketNo!)).toBeVisible();
      await expect(row(giftedNo).getByTestId('ticket-gift')).toHaveText('선물 대기');
    });
  },
);

scenario(
  'REG-3',
  '호스트가 티켓 판매를 중단하면 관객 공연 상세에서 고를 수 없고, 재개하면 다시 고를 수 있다',
  {
    kind: '정상',
    summary:
      'S1 — 티켓 저장소(P12)의 판매 중단(T-5)이 관객 GP-5 `isSuspended`로 바로 반영된다(P6 딤드 · "판매 중단" 칩).',
    basis: [
      'plan §3 S1',
      'plan P12 완료 기준(판매 중단 → 재개가 관객 GP-5에 반영)',
      'plan P6 판매 중단 딤드',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page);
    const desktop = isDesktop(testInfo);
    const card = page.getByTestId('ticket-card').filter({ hasText: '일반 예매' });
    const audienceRow = () =>
      desktop
        ? page
            .getByRole('complementary', { name: '예매' })
            .getByRole('listitem')
            .filter({ hasText: '일반 예매' })
        : page
            .getByRole('list', { name: '티켓 옵션' })
            .locator('visible=true')
            .getByRole('listitem')
            .filter({ hasText: '일반 예매' });

    await step('[호스팅] 티켓 관리 ⋮ → [판매 중단] → [중단] → 칩 "판매 중단"', async () => {
      await page.goto('/hosting/events/101/tickets');
      await card.getByRole('button', { name: '일반 예매 메뉴' }).click();
      await page.getByRole('menuitem', { name: '판매 중단' }).click();
      await page
        .getByRole('alertdialog', { name: '[일반 예매] 티켓의 판매를 중단할까요?' })
        .getByRole('button', { name: '중단' })
        .click();
      await expect(card.getByTestId('ticket-chip')).toHaveText('판매 중단');
    });
    await step('[관객] 공연 상세 — 일반 예매에 "판매 중단", 잔여 숨김', async () => {
      await page.goto('/events/101');
      await expect(audienceRow()).toContainText('판매 중단');
      await expect(audienceRow()).not.toContainText('잔여');
    });
    await step('[호스팅] ⋮ → [판매 재개] → [확인] → 칩 "판매 중"', async () => {
      await page.goto('/hosting/events/101/tickets');
      await card.getByRole('button', { name: '일반 예매 메뉴' }).click();
      await page.getByRole('menuitem', { name: '판매 재개' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '확인' }).click();
      await expect(card.getByTestId('ticket-chip')).toHaveText('판매 중');
    });
    await step('[관객] 공연 상세 — 일반 예매에 다시 "판매 중단"이 없다', async () => {
      await page.goto('/events/101');
      await expect(audienceRow()).toBeVisible();
      await expect(audienceRow()).not.toContainText('판매 중단');
    });
  },
);
