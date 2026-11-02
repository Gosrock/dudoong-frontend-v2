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
 * - 예매자 관리 — **GUI** Ready(2026-11-01, #110~#125): 주문 `980:24267`(1440) · `980:24474`(모바일) · 상태 `1029:4569`·`1029:4849`·
 *   `1029:5135` · 여러 개 선택 `1029:5422`·`989:693` · 주문 상세 `1029:6719`·`1029:7309`·`1029:7706`·`1029:6920`·`1029:7509`·`1029:7907`·
 *   `1029:8117`·`1029:8733` · 발급된 티켓 `1030:8054`·`1030:8955` · 환불 `1031:9189`·`1031:9567`·`1031:9948`. PC 캡처는 1440.
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
      'GUI 표(PC 주문 번호 · 주문자 · 티켓 수 · 결제 금액 · 주문 일시 · 상태 ›, 모바일 주문자 · 티켓 수 · 상태 ›). 승인 대기 행은 체크박스 + [거절][승인]. 매니저는 환불 정보(은행 · 계좌번호 · 예금주 · 수정일)를 본다.',
    basis: [
      'plan P13a 완료 기준 V(환불 계좌 updatedAt)',
      'GUI 980:24267 · 980:24474 · 1029:8522',
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
      '[거절] → ‹ 거절 사유를 선택해 주세요. — 사유 4종 라디오(GUI 1029:6920), 기타는 100자 입력(#921), 두둥 주문이면 legal-copy C-3 노란 안내. [거절] → 승인 거절.',
    basis: ['plan P13a L(거절 PR-4 사유 4종)', 'GUI 1029:6920 · 1029:7114', 'legal-copy C-3'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('토스 송금 승인 대기 주문을 열고 [거절]을 누르면 사유 단계가 보인다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingToss}`);
      await detail(page).getByRole('button', { name: '거절', exact: true }).click();
      await expect(detail(page).getByRole('radiogroup', { name: '거절 사유' })).toBeVisible();
      await expect(detail(page).getByTestId('refuse-dudoong-notice')).toBeVisible();
      await expect(detail(page).getByRole('button', { name: '거절', exact: true })).toBeDisabled();
    });
    await step('기타 - 직접 입력에 문구를 쓰고 [거절]을 누르면 승인 거절이 된다', async () => {
      await detail(page).getByRole('radio', { name: '기타 - 직접 입력' }).click();
      await detail(page).getByLabel('기타 사유').fill('중복 주문');
      await detail(page).getByRole('button', { name: '거절', exact: true }).click();
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
      '승인 대기 주문 [승인] → 발급 티켓이 보인다. 승인 완료 주문 [주문 취소] → ‹ 주문 취소 사유(라디오 4개, GUI 1029:7509) → 주문 취소, 유료면 환불 탭에 환불 요청.',
    basis: [
      'plan P13a 완료 기준 L(승인 후 취소 → 환불 탭 REQUESTED)',
      'GUI 1029:7309 · 1029:7509 · 1029:8522',
      'legal-copy C-4',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('승인 대기 주문을 [승인]하면 승인 완료와 발급 티켓이 보인다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
      await detail(page).getByRole('button', { name: '승인' }).click();
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');
      await expect(detail(page).getByRole('region', { name: '발급 티켓' })).toBeVisible();
    });
    await step('[주문 취소]를 누르면 사유 라디오와 직접 환불 안내가 보인다', async () => {
      await detail(page).getByRole('button', { name: '주문 취소' }).click();
      await expect(detail(page).getByRole('radiogroup', { name: '취소 사유' })).toBeVisible();
      await expect(detail(page).getByTestId('cancel-dudoong-notice')).toBeVisible();
      await expect(detail(page).getByRole('button', { name: '주문 취소' })).toBeDisabled();
    });
    await step('사유를 고르고 [주문 취소]를 누르면 주문 취소 · 환불 요청이 된다', async () => {
      await detail(page).getByRole('radio', { name: '공연 일정 변경' }).click();
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
  '발급된 티켓 탭 — 입장 칩 · 행 [입장 처리], 티켓 상세(티켓 정보 · 옵션 응답 · [입장 처리])',
  {
    kind: '정상',
    summary:
      'GUI 표(PC 티켓 번호 · 티켓 · 주문자 · 주문 번호 · 발급 일시 · 체크인 ›, 모바일 주문자 · 티켓 · 체크인 ›). 입장 전은 [입장 처리](확인 → "입장 처리했어요."), 입장 완료는 초록 칩. 행 → 티켓 상세.',
    basis: [
      'GUI 1030:8054 · 1030:8448 · 1030:8955 · 1030:9136',
      '#106 §5 수동 입장(B37 입장 취소 API 없음)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('발급된 티켓 탭에 티켓 3장과 입장 칩이 보인다', async () => {
      await page.goto(`${GUESTS}?tab=tickets`);
      await expect(page.getByTestId('ticket-row')).toHaveCount(3);
      await expect(page.getByTestId('entrance-ALL')).toHaveText('전체 3');
      await expect(page.getByTestId('ticket-entrance')).toHaveText('입장 완료');
    });
    await step(
      '입장 전 행의 [입장 처리] → 확인하면 "입장 처리했어요."와 입장 완료 칩',
      async () => {
        const row = page.getByTestId('ticket-row').filter({ hasText: 'T2000002' });
        await row.getByRole('button', { name: '입장 처리' }).click();
        const confirm = page.getByRole('alertdialog', { name: /입장 처리할까요/ });
        await expect(confirm).toContainText('되돌릴 수 없어요');
        await confirm.getByRole('button', { name: '입장 처리' }).click();
        await expect(page.getByText('입장 처리했어요.')).toBeVisible();
        await expect(row.getByTestId('ticket-entrance')).toHaveText('입장 완료');
        await expect(page.getByTestId('entrance-DONE')).toHaveText('입장 완료 2');
      },
    );
    await step(
      '입장 전 티켓 행을 누르면 티켓 상세(티켓 정보 · 옵션 응답 · [입장 처리])',
      async () => {
        await page.getByTestId('ticket-row').filter({ hasText: 'T2000003' }).click();
        const detail = page.getByRole('dialog');
        await expect(page.getByTestId('ticket-detail')).toBeVisible();
        await expect(detail).toContainText('T2000003');
        await expect(detail.getByTestId('ticket-detail-entrance')).toHaveText('입장 전');
        await expect(detail.getByRole('region', { name: '티켓 정보' })).toBeVisible();
        await expect(detail.getByRole('button', { name: '입장 처리' })).toBeVisible();
      },
    );
    await step('상세의 [입장 처리] → 확인하면 입장 완료로 바뀌고 버튼이 사라진다', async () => {
      const detail = page.getByRole('dialog');
      await detail.getByRole('button', { name: '입장 처리' }).click();
      await page
        .getByRole('alertdialog', { name: /입장 처리할까요/ })
        .getByRole('button', { name: '입장 처리' })
        .click();
      await expect(detail.getByTestId('ticket-detail-entrance')).toHaveText('입장 완료');
      await expect(detail.getByRole('button', { name: '입장 처리' })).toHaveCount(0);
      await expect(page.getByTestId('entrance-DONE')).toHaveText('입장 완료 3');
    });
  },
);

scenario(
  'HG-8',
  '환불 탭 — 노란 안내 · 상태 칩(환불 요청 · 계좌 입력 전 · 환불 완료) → 상세에서 [환불 완료]',
  {
    kind: '정상',
    summary:
      'GUI 1031:9189 — 안내 "예매자 계좌로 직접 보낸 뒤 [환불 완료]를 눌러주세요", 행을 누르면 주문 상세(환불 정보 · 계좌 없으면 버튼 비활성), [환불 완료] → 확인 → "환불 완료로 표시했어요.". 검색 · 칩 숫자 · 엑셀은 API가 없어 없다(B36).',
    basis: [
      'GUI 1031:9189 · 1031:9567 · 1029:8117 · 1029:8733',
      'plan P13a L(환불 탭 GF-1 · PF-2)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('환불 탭에 안내와 환불 4건, 상태 칩이 보인다', async () => {
      await page.goto(`${GUESTS}?tab=refunds`);
      await expect(
        page.getByText('예매자 계좌로 직접 보낸 뒤 [환불 완료]를 눌러주세요'),
      ).toBeVisible();
      await expect(page.getByTestId('refund-row')).toHaveCount(4);
      await expect(
        page.getByTestId('refund-row').filter({ hasText: '한도윤' }).getByTestId('refund-status'),
      ).toHaveText('계좌 입력 전');
    });
    await step('계좌 입력 전 주문 상세는 안내 문구와 비활성 [환불 완료]', async () => {
      await page.getByTestId('refund-row').filter({ hasText: '한도윤' }).click();
      await expect(detail(page).getByTestId('refund-no-account')).toHaveText(
        '예매자가 아직 환불 계좌를 입력하지 않았어요.',
      );
      await expect(detail(page).getByRole('button', { name: '환불 완료' })).toBeDisabled();
      await page.goBack();
      await expect(detail(page)).toHaveCount(0);
    });
    await step(
      '환불 요청 주문 상세의 [환불 완료] → 확인하면 환불 완료 · 환불 완료일, 행도 환불 완료',
      async () => {
        await page.getByTestId('refund-row').filter({ hasText: '윤나리' }).click();
        await detail(page).getByRole('button', { name: '환불 완료' }).click();
        const dialog = page.getByRole('alertdialog', { name: /환불 완료로 바꿀까요/ });
        await expect(dialog).toContainText('되돌릴 수 없어요');
        await dialog.getByRole('button', { name: '환불 완료' }).click();
        await expect(page.getByText('환불 완료로 표시했어요.')).toBeVisible();
        await expect(detail(page).getByTestId('detail-refund-status')).toHaveText('환불 완료');
        await expect(detail(page).getByTestId('refund-completed-at')).not.toHaveText('—');
        await page.goBack();
        await expect(
          page.getByTestId('refund-row').filter({ hasText: '윤나리' }).getByTestId('refund-status'),
        ).toHaveText('환불 완료');
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
    await step('일반 멤버로 열면 엑셀 버튼 · 체크박스 · 행 [승인]이 없다', async () => {
      await page.goto(GUESTS);
      await expect(page.getByTestId('order-row')).toHaveCount(9);
      await expect(page.getByRole('button', { name: '주문 엑셀로 다운로드' })).toHaveCount(0);
      await expect(page.getByRole('checkbox', { name: /주문 선택/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '승인', exact: true })).toHaveCount(0);
    });
    await step('검색 기준을 연락처로 바꾸면 완전 일치 안내가 보인다', async () => {
      await page.getByRole('combobox', { name: '검색 기준' }).click();
      await page.getByRole('option', { name: '연락처' }).click();
      await expect(page.getByTestId('exact-hint')).toBeVisible();
    });
    await step('승인 대기 주문 상세에 가린 연락처 · 처리 버튼 없음', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.pendingTransfer}`);
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 대기');
      await expect(detail(page).getByTestId('detail-phone')).toHaveText('010-****-6789');
      await expect(detail(page).getByRole('button', { name: '승인' })).toHaveCount(0);
    });
  },
);

scenario(
  'HG-10',
  '매니저 — [엑셀로 다운로드]가 지금 필터의 xlsx를 내려받는다',
  {
    kind: '권한',
    summary:
      'GUI "엑셀로 다운로드"(DS Button Secondary small, 페이지 줄 오른쪽). 래퍼 없는 xlsx, 파일 이름 orders-101.xlsx.',
    basis: ['plan P13a 완료 기준 L(엑셀)', 'GUI 980:24267'],
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
      '검색 결과가 없으면 표 안에 "검색 결과가 없어요"(GUI 1029:4849), 목록 실패는 표 안 "주문을 불러오지 못했어요." + [다시 시도](1029:5135) — 엑셀 비활성. 없는 ?order=는 닫고 안내(공용 404 아님).',
    basis: ['patterns §24 P13a(Order_404_1)', 'plan P13a L', 'GUI 1029:4849 · 1029:5135'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('없는 이름으로 검색하면 "검색 결과가 없어요"가 보인다', async () => {
      await page.goto(GUESTS);
      await page.getByRole('searchbox', { name: '주문 검색어' }).fill('없는사람');
      await page.getByRole('searchbox', { name: '주문 검색어' }).press('Enter');
      await expect(page.getByTestId('list-empty')).toHaveText('검색 결과가 없어요');
      await expect(page.getByRole('button', { name: '주문 엑셀로 다운로드' })).toBeDisabled();
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
  'HG-14',
  '여러 개 선택 — 승인 대기 주문을 골라 한 번에 승인',
  {
    kind: '정상',
    summary:
      '승인 대기 행만 체크박스(머리 칸 = 모두 선택). 고르면 선택 바 "n개 선택 됨" [거절][승인](PC 가운데 떠 있음 · 모바일 하단). 일괄 API가 없어 차례로 부른다(B34) → "n건을 승인했어요.". 행 [거절] → 사유 고르기 → 거절.',
    basis: [
      'GUI 1029:5422 · 1029:5720 · 989:693 · 989:916',
      '#113 · #120',
      'backend-questions B34',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('승인 대기 2건만 체크박스가 있고, 모두 선택하면 선택 바가 보인다', async () => {
      await page.goto(GUESTS);
      await expect(page.getByRole('checkbox', { name: /주문 선택/ })).toHaveCount(2);
      await page.getByRole('checkbox', { name: '승인 대기 주문 모두 선택' }).click();
      await expect(page.getByTestId('selection-bar')).toContainText('2개 선택 됨');
    });
    await step('선택 바 [승인] → "2건을 승인했어요."와 승인 대기 칩 숫자가 사라진다', async () => {
      await page.getByTestId('selection-bar').getByRole('button', { name: '승인' }).click();
      await expect(page.getByText('2건을 승인했어요.')).toBeVisible();
      await expect(page.getByTestId('status-PENDING_APPROVE')).toHaveText('승인 대기');
      await expect(page.getByTestId('status-APPROVED')).toHaveText('승인 완료 4');
      await expect(page.getByTestId('selection-bar')).toHaveCount(0);
    });
  },
);

scenario(
  'HG-15',
  '행 [거절] — 사유를 골라 표에서 바로 거절',
  {
    kind: '정상',
    summary:
      '승인 대기 행의 [거절] → "거절 사유를 선택해 주세요." 오버레이(상세와 같은 라디오) → [거절] → "1건을 거절했어요.", 행이 승인 거절 칩.',
    basis: ['GUI 980:24267(행 [거절][승인]) · 1029:6920', '#113'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('행 [거절]을 누르면 거절 사유 오버레이가 열린다', async () => {
      await page.goto(GUESTS);
      const row = page.getByTestId('order-row').filter({ hasText: 'R2001001' });
      await row.getByRole('button', { name: '거절' }).click();
      await expect(page.getByTestId('refuse-overlay')).toBeVisible();
    });
    await step('입금 미확인을 고르고 [거절]하면 그 행이 승인 거절이 된다', async () => {
      const overlay = page.getByRole('dialog').filter({ has: page.getByTestId('refuse-overlay') });
      await overlay.getByRole('radio', { name: '입금 미확인' }).click();
      await overlay.getByRole('button', { name: '거절', exact: true }).click();
      await expect(page.getByText('1건을 거절했어요.')).toBeVisible();
      await expect(
        page.getByTestId('order-row').filter({ hasText: 'R2001001' }).getByTestId('order-status'),
      ).toHaveText('승인 거절');
    });
  },
);

scenario(
  'HG-16',
  '취소 불가 — 입장한 티켓이 있는 승인 완료 주문은 [주문 취소] 비활성 + 안내',
  {
    kind: '정상',
    summary:
      '발급 티켓 카드(입장 완료 칩) 아래 "입장했거나 선물한 티켓이 있어 주문을 취소할 수 없어요." + 비활성 [주문 취소]. 서버는 막지 않는다 — 화면 규칙(입장만 판정, 선물은 B35).',
    basis: ['GUI 1029:7706 · 1000:1793', '#112', 'backend-questions B35'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('입장 티켓이 있는 승인 완료 주문 상세를 열면 취소가 막혀 있다', async () => {
      await page.goto(`${GUESTS}?order=${GUEST_ORDER.approved}`);
      await expect(detail(page).getByTestId('detail-status')).toHaveText('승인 완료');
      await expect(detail(page).getByRole('region', { name: '발급 티켓' })).toContainText(
        '입장 완료',
      );
      await expect(detail(page).getByTestId('blocked')).toHaveText(
        '입장했거나 선물한 티켓이 있어 주문을 취소할 수 없어요.',
      );
      await expect(detail(page).getByRole('button', { name: '주문 취소' })).toBeDisabled();
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
