import type { Page, TestInfo } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { resetTicketStore as resetMyTicketStore } from '../../src/api/__mocks__/fixtures/my-ticket';
import { CHECKOUT_TICKET } from '../../src/api/__mocks__/fixtures/order';
import { GUEST_ORDER } from '../../src/api/__mocks__/guest-store';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { actAsRole } from '../../src/api/__mocks__/host-store';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { resetOrderStore } from '../../src/api/__mocks__/order.handlers';
import { checkoutHref } from '../../src/features/audience/checkout/model/checkout-params';
import { envelope, expect, scenario } from '../scenario';

/**
 * P13a-V 등록 후 대시보드 · 예매자 관리(plan P13a 완료 기준 V).
 * - 대시보드 등록 후 — **GUI** Ready `669:2787`(모바일) · `680:672`(1133) · `669:2972`(1280) · `712:1646`(1440) · `669:2350`(1920) ·
 *   `745:32726`(1440 판매 0). PC 캡처는 Figma 프레임 폭으로 찍는다(HG-3).
 * - 예매자 관리 — **와이어** `424:11710`(주문) · `424:12014`(발급된 티켓) · `503:27255`(주문 상세) · `503:27502`(티켓 상세) ·
 *   `108:4850`·`108:5023`(거절 사유). 환불 탭 · 승인 후 취소 · 환불 계좌는 디자인 없음(DS로만).
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 호스팅 센터(로그인 게이트 안, 서버 조회 없음)
 * - 에러: 코드별 분기(patterns §24 P13a)는 L 훅 테스트 · e2e `hosting-guests.spec`이 본다. 여기서는 목록 조회 실패 · 없는 주문(?order=)
 * - 반응형: 모든 시나리오 mobile · desktop(1440). 대시보드 PC 폭 4개는 HG-3
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
  resetOrderStore();
  resetMyTicketStore();
};

const isDesktop = (testInfo: TestInfo) => testInfo.project.name === 'desktop';

async function setUp(page: Page, testInfo: TestInfo) {
  reset();
  if (isDesktop(testInfo)) await page.setViewportSize({ width: 1440, height: 1024 });
  await setMockSession(page, 'loggedIn');
}

const GUESTS = '/hosting/events/101/guests';
const detail = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByTestId('order-detail') });

scenario(
  'HG-1',
  '등록 후 대시보드 — 통계 카드 4개 · 티켓 판매 정보(도넛) · 입장 현황 · 일정 패널',
  {
    kind: '정상',
    summary:
      '주문 건수(승인 대기 2 · 승인 완료 2 · 승인 거절 2 · 환불 요청 3), 판매 장수 · 총액, 입장 1/3(분모 = 발급 수). PC는 우측 일정 패널(주간 줄 + 단계).',
    basis: [
      'plan P13a 완료 기준 V(주문·티켓·판매금액)',
      'GUI 669:2787 · 712:1646',
      'gui-screens §2 · §3 대시보드 PC 본문',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('등록된 공연의 대시보드를 열면 통계 카드 4개가 보인다', async () => {
      await page.goto('/hosting/events/101/dashboard');
      await expect(page.getByTestId('stat-pendingApprove')).toContainText('2건');
      await expect(page.getByTestId('stat-approved')).toContainText('2건');
      await expect(page.getByTestId('stat-refused')).toContainText('2건');
      await expect(page.getByTestId('stat-refundRequested')).toContainText('3건');
    });
    await step(
      '티켓 판매 정보에 티켓별 범례 · 판매 장수 · 총액, 입장 현황에 1/3이 보인다',
      async () => {
        const sales = page.getByTestId('sales');
        await expect(sales.getByRole('list', { name: '티켓별 판매' })).toBeVisible();
        await expect(sales).toContainText('판매 장수');
        await expect(sales).toContainText('총액');
        await expect(page.getByTestId('entrance')).toContainText('1/3');
        await expect(page.getByRole('link', { name: 'QR 체크인 열기' })).toHaveAttribute(
          'href',
          '/hosting/events/101/qr',
        );
      },
    );
    if (isDesktop(testInfo)) {
      await step(
        'PC 우측 일정 패널에 주간 줄과 단계가 있다(등록일 없음 → 등록 칸 없음, Q43)',
        async () => {
          const panel = page.getByRole('complementary', { name: '공연 일정' });
          await expect(panel.getByRole('list', { name: '이번 주' }).locator('li')).toHaveCount(7);
          await expect(page.getByTestId('timeline-registered')).toHaveCount(0);
          await expect(page.getByTestId('timeline-promotion')).toHaveAttribute(
            'data-state',
            'current',
          );
          await expect(page.getByTestId('timeline-done')).toHaveAttribute('data-state', 'upcoming');
        },
      );
    }
    await step('환불 요청 카드를 누르면 예매자 관리 환불 탭으로 간다', async () => {
      await page.getByTestId('stat-refundRequested').click();
      await expect(page).toHaveURL(`${GUESTS}?tab=refunds`);
      await expect(page.getByTestId('refund-row')).toHaveCount(4);
    });
  },
);

scenario(
  'HG-2',
  '판매된 티켓이 없는 공연 — "아직 판매된 티켓이 없어요!" · 입장 0/0',
  {
    kind: '빈 상태',
    summary: '티켓 판매 정보 `판매 전` 변형, 입장 현황 분모(발급 수) 0이면 0/0과 빈 막대.',
    basis: ['plan P13a GUI(판매 0 `745:32726`)', 'plan P13a L 범위(발급 0이면 0/0)'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('판매 0인 공연의 대시보드에 판매 전 문구와 0/0이 보인다', async () => {
      await page.goto('/hosting/events/103/dashboard');
      await expect(page.getByText('아직 판매된 티켓이 없어요!')).toBeVisible();
      await expect(page.getByTestId('entrance')).toContainText('0/0');
      await expect(page.getByTestId('stat-pendingApprove')).toContainText('0건');
    });
  },
);

scenario(
  'HG-3',
  '대시보드 PC 폭 — 1133 · 1280 · 1920에서 3단 그대로, 우측 패널 286 · 335 · 388',
  {
    kind: '반응형',
    summary:
      'Figma 프레임 폭마다 캡처. 1024~1279도 3단(우측 패널을 내리지 않는다), 패널 폭만 바뀐다.',
    basis: ['gui-screens §3 실제 프레임에서 잰 폭', 'GUI 680:672 · 669:2972 · 669:2350'],
    viewports: ['desktop'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/dashboard');
    await expect(page.getByTestId('stat-pendingApprove')).toBeVisible();
    for (const [width, height, panel] of [
      [1133, 744, 286],
      [1280, 832, 335],
      [1920, 1024, 388],
    ] as const) {
      await step(`${width} 폭에서 우측 일정 패널이 ${panel}px로 보인다`, async () => {
        await page.setViewportSize({ width, height });
        const box = await page.getByRole('complementary', { name: '공연 일정' }).boundingBox();
        expect(Math.round(box?.width ?? 0)).toBe(panel);
      });
    }
  },
);

scenario(
  'HG-4',
  '주문 탭 — 상태 칩 · 검색 · 표 → 행을 누르면 주문 상세(?order=), 환불 계좌와 수정일(updatedAt)',
  {
    kind: '정상',
    summary:
      '와이어 표(주문 번호 · 주문자 · 티켓 수 · 금액 · 일시 · 상태 · 환불 여부 · 상세보기). 매니저는 환불 계좌 은행 · 번호 · 예금주 · 계좌 수정일을 본다.',
    basis: [
      'plan P13a 완료 기준 V(환불 계좌 updatedAt)',
      '와이어 424:11710 · 503:27255',
      'patterns §6 ?order=',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('예매자 관리를 열면 주문 9건과 상태 칩 건수가 보인다', async () => {
      await page.goto(GUESTS);
      await expect(page.getByTestId('order-row')).toHaveCount(9);
      await expect(page.getByTestId('status-ALL')).toHaveText('전체 9');
      await expect(page.getByTestId('status-PENDING_APPROVE')).toHaveText('승인 대기 2');
    });
    await step('승인 대기 칩을 누르면 승인 대기 주문만 남는다', async () => {
      await page.getByTestId('status-PENDING_APPROVE').click();
      await expect(page.getByTestId('order-row')).toHaveCount(2);
      await page.getByTestId('status-ALL').click();
      await expect(page.getByTestId('order-row')).toHaveCount(9);
    });
    await step(
      '환불 요청 주문 행을 누르면 상세가 열리고 환불 계좌 · 계좌 수정일이 보인다',
      async () => {
        await page.getByTestId('order-row').filter({ hasText: '윤나리' }).click();
        await expect(page).toHaveURL(new RegExp(`${GUESTS}\\?order=`));
        await expect(detail(page).getByTestId('detail-status')).toHaveText('주문 취소');
        await expect(detail(page).getByTestId('detail-refund-status')).toHaveText('환불 요청');
        await expect(detail(page).getByTestId('refund-account')).toBeVisible();
        await expect(detail(page).getByTestId('refund-account-updated')).not.toHaveText('—');
        await expect(detail(page).getByRole('button', { name: '환불 완료' })).toBeVisible();
      },
    );
    await step('뒤로가기를 누르면 상세만 닫힌다', async () => {
      await page.goBack();
      await expect(page).toHaveURL(GUESTS);
      await expect(detail(page)).toHaveCount(0);
    });
  },
);

scenario(
  'HG-5',
  '승인 대기 주문 거절 — 거절 사유(기타 - 직접 입력) · 두둥 주문 직접 환불 안내',
  {
    kind: '정상',
    summary:
      '[거절] → 사유 4종 라디오(와이어 108:4850), 기타는 100자 입력(#921), 두둥 주문이면 legal-copy C-3 줄. [거절하기] → 승인 거절.',
    basis: [
      'plan P13a L(거절 PR-4 사유 4종)',
      '와이어 108:4850 · 108:5023',
      'legal-copy C-2 · C-3',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('토스 송금 승인 대기 주문을 열고 [거절]을 누르면 사유 단계가 보인다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingToss}`);
      await detail(page).getByRole('button', { name: '거절', exact: true }).click();
      await expect(detail(page).getByRole('radiogroup', { name: '거절 사유' })).toBeVisible();
      await expect(detail(page).getByTestId('refuse-dudoong-notice')).toBeVisible();
      await expect(detail(page).getByRole('button', { name: '거절하기' })).toBeDisabled();
    });
    await step('기타 - 직접 입력에 문구를 쓰고 [거절하기]를 누르면 승인 거절이 된다', async () => {
      await detail(page).getByRole('radio', { name: '기타 - 직접 입력' }).click();
      await detail(page).getByLabel('기타 사유').fill('중복 주문');
      await detail(page).getByRole('button', { name: '거절하기' }).click();
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 거절');
      await expect(detail(page)).toContainText('중복 주문');
    });
  },
);

scenario(
  'HG-6',
  '승인 → 승인 후 취소(사유) → 환불 탭에 환불 요청',
  {
    kind: '정상',
    summary:
      '승인 대기 주문 [승인] → 발급 티켓이 보인다. 승인 완료 주문 [주문 취소] → 사유 입력 → 주문 취소, 유료면 환불 탭에 환불 요청.',
    basis: ['plan P13a 완료 기준 L(승인 후 취소 → 환불 탭 REQUESTED)', 'legal-copy C-4'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('승인 대기 주문을 [승인]하면 승인 완료와 발급 티켓이 보인다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
      await detail(page).getByRole('button', { name: '승인' }).click();
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');
      await expect(detail(page).getByRole('region', { name: '발급 티켓' })).toBeVisible();
    });
    await step('[주문 취소]를 누르면 사유 칸과 직접 환불 안내가 보인다', async () => {
      await detail(page).getByRole('button', { name: '주문 취소' }).click();
      await expect(detail(page).getByLabel('취소 사유(선택)')).toBeVisible();
      await expect(detail(page).getByTestId('cancel-dudoong-notice')).toBeVisible();
    });
    await step('사유를 쓰고 [주문 취소]를 누르면 주문 취소 · 환불 요청이 된다', async () => {
      await detail(page).getByLabel('취소 사유(선택)').fill('공연 일정 변경');
      await detail(page).getByRole('button', { name: '주문 취소' }).click();
      await expect(detail(page).getByTestId('detail-status')).toHaveText('주문 취소');
      await expect(detail(page).getByTestId('detail-refund-status')).toHaveText('환불 요청');
    });
    await step('환불 탭에 그 주문이 환불 요청으로 나타난다', async () => {
      await detail(page).getByRole('button', { name: '닫기' }).click();
      await page.getByRole('tab', { name: '환불' }).click();
      await expect(page.getByTestId('refund-row')).toHaveCount(5);
    });
  },
);

scenario(
  'HG-7',
  '발급된 티켓 탭 — 소유자(ownerName) · 선물 상태(giftState) · 체크인, 티켓 상세',
  {
    kind: '정상',
    summary:
      '와이어 표(티켓 번호 · 종류 칩 · 이름 · 주문자 · 주문 번호 · 발급 일시 · 체크인) + 소유자 칸(선물 받은 티켓은 받은 사람 + "선물 받음"). 행 → 티켓 상세(연락처 · 옵션 응답).',
    basis: ['plan P13a 완료 기준 V(ownerName · giftState)', '와이어 424:12014 · 503:27502'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('발급된 티켓 탭에 티켓 3장과 입장 칩이 보인다', async () => {
      await page.goto(`${GUESTS}?tab=tickets`);
      await expect(page.getByTestId('ticket-row')).toHaveCount(3);
      await expect(page.getByTestId('entrance-ALL')).toHaveText('전체 3');
    });
    await step('선물 받은 티켓은 소유자가 받은 사람이고 "선물 받음"이 붙는다', async () => {
      const gifted = page
        .getByTestId('ticket-row')
        .filter({ has: page.getByTestId('ticket-gift') });
      await expect(gifted.getByTestId('ticket-gift')).toHaveText('선물 받음');
      await expect(gifted.getByTestId('ticket-owner')).not.toHaveText('박지훈');
    });
    await step('티켓 행을 누르면 티켓 상세가 열린다', async () => {
      await page.getByTestId('ticket-row').first().click();
      await expect(page.getByTestId('ticket-detail')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText('티켓 번호 -');
    });
    await step(
      '입장 전 티켓은 [수동 입장 처리] → 확인하면 입장 완료(QR이 안 읽힐 때 — #106 §5)',
      async () => {
        const detail = page.getByRole('dialog');
        await expect(detail).toContainText('입장 전');
        await detail.getByRole('button', { name: '수동 입장 처리' }).click();
        const confirm = page.getByRole('alertdialog', { name: /입장 처리할까요/ });
        await expect(confirm).toContainText('되돌릴 수 없어요');
        await confirm.getByRole('button', { name: '입장 처리' }).click();
        await expect(detail).not.toContainText('입장 전');
        await expect(detail.getByRole('button', { name: '수동 입장 처리' })).toHaveCount(0);
        await expect(page.getByTestId('entrance-DONE')).toHaveText('입장 완료 2');
      },
    );
  },
);

scenario(
  'HG-8',
  '환불 탭 — 환불 계좌 · 계좌 수정일, [환불 완료]',
  {
    kind: '정상',
    summary:
      '디자인 없음(Q32 — 별도 탭). 매니저는 계좌와 수정일(updatedAt)을 보고, 환불 요청 행의 [환불 완료]로 완료한다.',
    basis: ['plan P13a L(환불 탭 GF-1 · PF-2)', 'plan P13a 완료 기준 V(환불 계좌 updatedAt)'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('환불 탭에 환불 4건과 계좌 수정일이 보인다', async () => {
      await page.goto(`${GUESTS}?tab=refunds`);
      await expect(page.getByTestId('refund-row')).toHaveCount(4);
      await expect(page.getByTestId('refund-account-updated').first()).toContainText('구매자 입력');
    });
    await step(
      '[환불 완료]를 누르면 확인 팝업이 뜨고, 확인하면 그 행이 환불 완료가 된다',
      async () => {
        const row = page.getByTestId('refund-row').filter({ hasText: '윤나리' });
        await row.getByRole('button', { name: '환불 완료' }).click();
        // 되돌릴 수 없는 처리 — 확인 팝업(#106 §5)
        const dialog = page.getByRole('alertdialog', { name: /환불 완료로 바꿀까요/ });
        await expect(dialog).toContainText('되돌릴 수 없어요');
        await dialog.getByRole('button', { name: '환불 완료' }).click();
        await expect(page.getByText('환불 완료로 바꿨어요')).toBeVisible();
        await expect(row.getByTestId('refund-status')).toHaveText('환불 완료');
        await expect(row.getByRole('button', { name: '환불 완료' })).toHaveCount(0);
      },
    );
  },
);

scenario(
  'HG-9',
  '일반 멤버 — 엑셀 버튼 · 처리 버튼 · 환불 계좌 없음, 가린 연락처, 검색 칸 완전 일치 안내',
  {
    kind: '권한',
    summary:
      '`can(role, …)`로만 판정. 일반 멤버는 연락처·입금자명 검색이 완전 일치(#846) — 안내 줄.',
    basis: ['plan P13a L(일반 멤버 개인정보 · 엑셀 매니저 이상)', 'patterns §22'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    actAsRole(11, 'GUEST');
    await step('일반 멤버로 열면 엑셀 버튼이 없고 연락처가 가려져 있다', async () => {
      await page.goto(GUESTS);
      await expect(page.getByTestId('order-row')).toHaveCount(9);
      await expect(page.getByRole('button', { name: '주문 엑셀로 다운로드' })).toHaveCount(0);
      await expect(
        page
          .getByTestId('order-row')
          .filter({ hasText: '이서연' })
          .first()
          .getByTestId('order-phone'),
      ).toHaveText('010-****-7890');
    });
    await step('검색 기준을 연락처로 바꾸면 완전 일치 안내가 보인다', async () => {
      await page.getByRole('combobox', { name: '검색 기준' }).click();
      await page.getByRole('option', { name: '연락처' }).click();
      await expect(page.getByTestId('exact-hint')).toBeVisible();
    });
    await step('승인 대기 주문 상세에 처리 버튼이 없다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
      await expect(detail(page).getByRole('button', { name: '승인' })).toHaveCount(0);
    });
  },
);

scenario(
  'HG-10',
  '매니저 — [엑셀로 다운로드]가 지금 필터의 xlsx를 내려받는다',
  {
    kind: '권한',
    summary: '와이어 "엑셀로 다운로드"(검정). 래퍼 없는 xlsx, 파일 이름 orders-101.xlsx.',
    basis: ['plan P13a 완료 기준 L(엑셀)', '와이어 424:11710'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('[엑셀로 다운로드]를 누르면 orders-101.xlsx를 받는다', async () => {
      await page.goto(GUESTS);
      await expect(page.getByTestId('order-row')).toHaveCount(9);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: '주문 엑셀로 다운로드' }).click();
      expect((await download).suggestedFilename()).toBe('orders-101.xlsx');
    });
  },
);

scenario(
  'HG-11',
  '검색 결과 없음 · 목록 조회 실패 · 없는 주문',
  {
    kind: '에러',
    summary:
      '검색 결과가 없으면 표 안에 "검색 결과가 없어요". 목록 실패는 [다시 시도], 없는 ?order=는 닫고 안내(공용 404 아님).',
    basis: ['patterns §24 P13a(Order_404_1)', 'plan P13a L'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('없는 이름으로 검색하면 "검색 결과가 없어요"가 보인다', async () => {
      await page.goto(GUESTS);
      await page.getByRole('searchbox', { name: '주문 검색어' }).fill('없는사람');
      await page.getByRole('searchbox', { name: '주문 검색어' }).press('Enter');
      await expect(page.getByTestId('list-empty')).toHaveText('검색 결과가 없어요');
    });
    await step('없는 주문 주소로 들어오면 상세가 닫히고 안내가 보인다', async () => {
      await page.goto(`${GUESTS}?order=no-such-order`);
      await expect(page.getByText('주문을 찾을 수 없어요. 목록을 다시 불러왔어요')).toBeVisible();
      await expect(page).toHaveURL(GUESTS);
    });
    await step('주문 목록 조회가 실패하면 [다시 시도]가 보인다', async () => {
      await page.route(/\/api\/v2\/events\/101\/orders(\?|$)/, (r) =>
        r.fulfill({ status: 500, json: envelope.error(500, 'GLOBAL_500_1') }),
      );
      await page.goto(`${GUESTS}?tab=orders`);
      await expect(page.getByText('주문을 불러오지 못했어요.')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
  },
);

scenario(
  'HG-12',
  '크리티컬 패스 — 체크아웃 → 주문 → 호스트 승인 → 관객 티켓탭에 발급',
  {
    kind: '정상',
    summary:
      '관객이 두둥 티켓을 주문하면 예매자 관리에 승인 대기로 오고, 호스트가 승인하면 관객 티켓탭에 티켓이 생긴다.',
    basis: ['plan P13a 완료 기준 V(크리티컬 패스 화면 흐름)', 'storyboard 크리티컬 패스'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    let orderUuid = '';
    await step('관객이 체크아웃에서 결제(송금 완료)하면 주문 완료 화면으로 간다', async () => {
      await page.goto(
        checkoutHref(101, { ticketItemId: CHECKOUT_TICKET.paidNoOptions, quantity: 1 }),
      );
      await page.getByRole('checkbox', { name: /환불\/취소 규정/ }).click();
      await page.getByRole('checkbox', { name: '(필수) 호스트에게 개인정보 제공 동의' }).click();
      await page.getByRole('button', { name: '결제하기' }).click();
      await page
        .getByRole('alertdialog', { name: '주문 완료하기' })
        .getByRole('checkbox', { name: '(필수) 위 내용을 확인했으며 이에 동의합니다' })
        .click();
      await page
        .getByRole('alertdialog', { name: '주문 완료하기' })
        .getByRole('button', { name: '주문 완료하기' })
        .click();
      await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
      orderUuid = new URL(page.url()).pathname.split('/').at(-1)!;
    });
    await step('호스트 예매자 관리에서 그 주문이 승인 대기로 열린다', async () => {
      await page.goto(`${GUESTS}?order=${orderUuid}`);
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
    });
    await step('[승인]하면 승인 완료가 된다', async () => {
      await detail(page).getByRole('button', { name: '승인' }).click();
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');
    });
    await step('관객 티켓탭에 발급된 티켓이 보인다', async () => {
      await page.goto('/tickets');
      await expect(page.locator(`#group-${orderUuid}`)).toBeVisible();
    });
  },
);

scenario.manual('HG-13', '스테이징에서 크리티컬 패스 실제 왕복 1회', {
  kind: '정상',
  basis: ['plan P13a 완료 기준 L(크리티컬 패스 — 스테이징 agent-browser 왕복, D2 뒤)'],
  how: 'D2 스테이징 첫 배포 뒤: 관객 계정으로 두둥 티켓 주문 → 호스트 계정으로 예매자 관리에서 승인 → 관객 티켓탭에 발급 확인(agent-browser).',
});
