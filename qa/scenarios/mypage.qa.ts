import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { MISSING_ORDER_UUID, P9_ORDER } from '../../src/api/__mocks__/fixtures/order';
import { resetMeStore } from '../../src/api/__mocks__/me.handlers';
import { orderHandlers, resetOrderStore } from '../../src/api/__mocks__/order.handlers';
import { MOCK_S3_ORIGIN } from '../../src/api/__mocks__/upload-handlers';
import { userHandlers } from '../../src/api/__mocks__/user.handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 마이페이지 · 주문내역 · 주문상세 · 환불 계좌 · 취소 · 호스트 문의 · 관심 호스트 · 아카이빙 · 탈퇴(plan P9 완료 기준 V).
 * 근거는 모두 와이어(GUI `331:*` Ready 아님) — 와이어 수준(DS 토큰·컴포넌트만). 프로필 편집 · 탈퇴 · 취소 시트 · 환불 계좌는 디자인 없음.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 모두 보호 화면(브라우저 조회). 비로그인 → 로그인 이동은 e2e `mypage.spec`가 본다
 * - 권한: 화면 안 역할 분기 없음. 남의 주문은 공용 404(MY-16)
 * - 반응형: 기본 두 뷰포트. PC는 가운데 열 + 보이는 제목(와이어 PC `668:5085`·`668:5805`), 시트는 PC에서 가운데 창
 */

const reset = () => {
  resetOrderStore();
  resetMeStore();
};

const detail = (uuid: string) => `/orders/${uuid}`;

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};
const PNG = {
  name: 'me.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
};

/** 가짜 S3 PUT과 올린 이미지 GET을 브라우저에서 받는다 */
async function routeImages(page: Page) {
  await page.route(
    (url) =>
      url.href.startsWith(MOCK_S3_ORIGIN) || url.href.startsWith('https://image.mock.dudoong.test'),
    (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'image/png', body: PNG.buffer })
        : route.fulfill({ status: 200, headers: S3_CORS, body: '' }),
  );
}

const dialog = (page: Page) => page.getByRole('dialog').or(page.getByRole('alertdialog'));

/** 열린 시트의 은행 · 예금주 · 계좌번호를 채운다 */
async function fillAccount(page: Page) {
  const d = dialog(page);
  await d.getByRole('combobox', { name: /은행/ }).click();
  await page.getByRole('option', { name: 'KB국민은행' }).click();
  await d.getByRole('textbox', { name: /예금주/ }).fill('두둥이');
  await d.getByRole('textbox', { name: /계좌번호/ }).fill('123-456-7890');
}

// ─── 마이페이지 ───

scenario(
  'MY-1',
  '프로필 사진을 바꾸면 상단 바 아바타도 바뀐다',
  {
    kind: '정상',
    summary: 'PM-3 발급 → S3 PUT → PM-2 → 세션 키 갱신. 상단 바(PC) · 햄버거가 같은 키를 읽는다.',
    basis: ['plan P9 완료 기준 V "프로필 이미지 변경이 헤더·햄버거에 반영"', 'P9-L useProfileEdit'],
    viewports: ['desktop'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await routeImages(page);
    await setMockSession(page, 'loggedIn');
    await step(
      '마이페이지를 열면 프로필 · 닉네임 칸 · 메뉴 · 로그아웃 · 회원 탈퇴가 보인다',
      async () => {
        await page.goto('/mypage');
        await expect(page.getByTestId('profile-name')).toHaveText('두둥이');
        await expect(page.getByRole('link', { name: '주문내역' }).last()).toBeVisible();
        await expect(page.getByRole('button', { name: '회원 탈퇴' })).toBeVisible();
      },
    );
    await step('연필(사진 고르기)로 PNG를 고르면 프로필과 상단 바 아바타가 새 사진', async () => {
      await page.locator('input[type=file]').setInputFiles(PNG);
      await expect(page.getByRole('img', { name: '프로필 이미지' })).toHaveAttribute(
        'src',
        /image\.mock\.dudoong\.test/,
      );
      const menu = page.getByRole('button', { name: '내 메뉴' });
      await expect(menu.locator('img')).toHaveAttribute('src', /image\.mock\.dudoong\.test/);
      expect(mockApi.calls().some((c) => c.method === 'PATCH' && c.path === '/api/v2/me')).toBe(
        true,
      );
    });
    await step('[기본 이미지로]를 누르면 다시 기본 캐릭터', async () => {
      await page.getByRole('button', { name: '기본 이미지로' }).click();
      await expect(page.getByRole('img', { name: '프로필 이미지' })).not.toHaveAttribute(
        'src',
        /image\.mock/,
      );
    });
  },
);

scenario(
  'MY-2',
  '닉네임을 2~7자로 바꾸고, 짧으면 칸 오류',
  {
    kind: '정상',
    summary: '1자는 요청 없이 칸 오류, 2~7자는 PM-2 후 프로필 이름이 바뀐다.',
    basis: ['plan P9 L 범위 PM-2 닉네임 2~7자', 'P9-L profile.nicknameError'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage');
    const input = page.getByRole('textbox', { name: '닉네임' });
    await step('한 글자로 저장하면 칸 아래 오류', async () => {
      await input.fill('두');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByText('닉네임은 2~7자로 입력해 주세요')).toBeVisible();
    });
    await step('"새두둥"으로 저장하면 프로필 이름이 바뀐다', async () => {
      await input.fill('새두둥');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByTestId('profile-name')).toHaveText('새두둥');
    });
  },
);

scenario(
  'MY-3',
  '탈퇴 확인 팝업 — 마스터 양도가 필요하면 안내가 팝업에 남는다',
  {
    kind: '에러',
    summary:
      '탈퇴 문구에 "보낸 선물 중 아직 받지 않은 선물은 취소돼요". USER_400_6이면 이동 없이 팝업 안 안내.',
    basis: ['plan P9 V 범위 탈퇴 확인', 'plan P9 완료 기준 L 탈퇴 USER_400_6', 'patterns §24 P9'],
    mocks: userHandlers.masterBlocked,
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage');
    await step('[회원 탈퇴]를 누르면 확인 팝업 — 보낸 선물 취소 안내', async () => {
      await page.getByRole('button', { name: '회원 탈퇴' }).click();
      await expect(page.getByRole('alertdialog', { name: '두둥을 탈퇴할까요?' })).toContainText(
        '보낸 선물 중 아직 받지 않은 선물은 취소돼요',
      );
    });
    await step('[탈퇴하기]가 USER_400_6이면 "마스터를 양도한 뒤 탈퇴해 주세요"', async () => {
      await page.getByRole('button', { name: '탈퇴하기' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('마스터를 양도한 뒤 탈퇴해 주세요');
      await expect(page).toHaveURL(/\/mypage$/);
    });
  },
);

// ─── 주문내역 ───

scenario(
  'MY-4',
  '주문내역 카드 — 날짜 · 포스터 배지 · 금액 · 상태 칩, 누르면 주문상세',
  {
    kind: '정상',
    summary:
      '와이어 `128:2772` 구성. 상태 칩은 상세와 같은 매핑(승인대기 · 승인완료 · 승인거절 + 환불 대기 · 주문취소완료 …).',
    basis: ['plan P9 V 범위 주문내역', '와이어 128:2772 · 668:5085', 'P9-L order-status'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('주문내역을 열면 "최근주문순"과 주문 카드가 보인다', async () => {
      await page.goto('/orders');
      await expect(page.getByText('최근주문순')).toBeVisible();
      await expect(page.getByTestId('order-row').first()).toBeVisible();
    });
    await step('거절된 유료 주문 카드는 "승인거절" 옆에 "환불 대기"', async () => {
      const row = page
        .getByTestId('order-row')
        .filter({ has: page.locator(`a[href="/orders/${P9_ORDER.refusedAmount}"]`) });
      await row.scrollIntoViewIfNeeded();
      await expect(row.getByTestId('order-status')).toHaveText(/승인거절.*환불 대기/);
    });
    await step('승인완료 카드를 누르면 그 주문상세', async () => {
      await page.locator(`a[href="/orders/${P9_ORDER.approvedPaid}"]`).click();
      await expect(page).toHaveURL(detail(P9_ORDER.approvedPaid));
      await expect(page.getByTestId('order-no')).toHaveText('R9000001');
    });
  },
);

scenario(
  'MY-5',
  '주문이 없으면 빈 화면 + [공연 둘러보기]',
  {
    kind: '빈 상태',
    summary: '빈 상태는 와이어에 없다(Tomato 10-24 미해결) — DS EmptyState(Figma 코멘트).',
    basis: ['figma-structure 128:2772 빈 상태 요청', 'design-workflow §7 디자인 없음'],
    mocks: [
      http.get('*/api/v2/me/orders', () =>
        HttpResponse.json(
          envelope.ok({
            content: [],
            page: 0,
            size: 20,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
          }),
        ),
      ),
    ],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('주문내역을 열면 "아직 주문한 공연이 없어요"', async () => {
      await page.goto('/orders');
      await expect(page.getByText('아직 주문한 공연이 없어요')).toBeVisible();
      await expect(page.getByRole('link', { name: '공연 둘러보기' }).last()).toBeVisible();
    });
  },
);

// ─── 주문상세 ───

scenario(
  'MY-6',
  '승인 대기 주문상세 — 티켓 줄 없음, 결제정보 · 금액 · 취소 안내(B18 잠정안)',
  {
    kind: '정상',
    summary:
      '발급 티켓이 없어 옵션 답(lines)만 그리고 티켓번호·티켓상태 줄이 없다(Q15). 금액은 티켓 · 옵션 · 총액(Q12). 결제방식 한 줄.',
    basis: [
      'plan P9 GUI "승인대기에 티켓 줄 없음"',
      'legal-copy A-8 · B18 잠정안',
      '와이어 128:2263',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/orders');
    const href = await page
      .getByTestId('order-row')
      .filter({ hasText: '50,000원' })
      .filter({ hasText: '승인대기' })
      .first()
      .getByRole('link')
      .getAttribute('href');
    await step(
      '승인 대기 주문을 열면 [주문취소] · 옵션 답 · 결제정보가 보이고 티켓번호 줄은 없다',
      async () => {
        await page.goto(href!);
        await expect(page.getByRole('button', { name: '주문취소' })).toBeVisible();
        await expect(page.getByRole('region', { name: '예매정보' })).not.toContainText('티켓번호');
        await expect(page.getByRole('region', { name: '결제정보' })).toContainText('직접계좌이체');
        await expect(page.getByTestId('order-amount')).toHaveText('50,000원');
      },
    );
    await step('아래 예매취소 안내에 승인 전 취소 잠정 문구가 있다', async () => {
      const notice = page.getByRole('region', { name: '예매취소 안내' });
      await notice.scrollIntoViewIfNeeded();
      await expect(notice).toContainText('아직 승인 전이라도 지금 취소할 수 있어요');
    });
  },
);

scenario(
  'MY-7',
  '유료 취소 — 계좌 칸이 비면 오류, 채우면 환불 요청 + 토스트',
  {
    kind: '정상',
    summary:
      '[주문취소] → A-9 안내 + 환불 계좌 칸 시트. 성공하면 환불요청 상태, 환불 계좌(마스킹)가 생기고 A-11 토스트.',
    basis: ['plan P9 완료 기준 L 유료 취소', 'legal-copy A-9 · A-11', 'patterns §20'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto(detail(P9_ORDER.approvedPaid));
    await step('[주문취소]를 누르면 "취소 후 직접 환불을 요청해야 해요" 시트', async () => {
      await page.getByRole('button', { name: '주문취소' }).click();
      await expect(
        dialog(page).getByRole('heading', { name: '취소 후 직접 환불을 요청해야 해요' }),
      ).toBeVisible();
    });
    await step('칸을 비운 채 [확인했어요, 취소할게요]를 누르면 칸마다 오류', async () => {
      await page.getByRole('button', { name: '확인했어요, 취소할게요' }).click();
      await expect(dialog(page).getByText('은행을 골라 주세요')).toBeVisible();
    });
    await step('[호스트 연락처 확인하기]를 누르면 시트 안에 연락처', async () => {
      await page.getByRole('button', { name: '호스트 연락처 확인하기' }).click();
      await expect(dialog(page).getByRole('link', { name: /010-1234-5678/ })).toBeVisible();
    });
    await step('계좌를 채우고 취소하면 환불요청 · 마스킹 계좌 · 토스트', async () => {
      await fillAccount(page);
      await page.getByRole('button', { name: '확인했어요, 취소할게요' }).click();
      await expect(
        page.getByText('예매가 취소되었어요. 호스트에게 연락해 환불을 요청해주세요.'),
      ).toBeVisible();
      await expect(page.getByTestId('order-status').first()).toHaveText('환불요청');
      await expect(page.getByTestId('refund-account')).toContainText('7890');
      await expect(page.getByRole('button', { name: '주문취소' })).toHaveCount(0);
    });
  },
);

scenario(
  'MY-8',
  '무료 취소 — 확인 팝업 후 바로 취소',
  {
    kind: '정상',
    summary:
      '무료 주문은 A-10 팝업("예매를 취소할까요?")으로 확인하고 본문 없이 O-4 → 주문취소완료.',
    basis: ['plan P9 완료 기준 L 무료 즉시 취소', 'legal-copy A-10 · A-11'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/orders');
    const href = await page
      .getByTestId('order-row')
      .filter({ hasText: '무료 승인' })
      .filter({ hasText: '승인대기' })
      .first()
      .getByRole('link')
      .getAttribute('href');
    await page.goto(href!);
    await step('[주문취소]를 누르면 "예매를 취소할까요?" 팝업', async () => {
      await page.getByRole('button', { name: '주문취소' }).click();
      await expect(page.getByRole('alertdialog', { name: '예매를 취소할까요?' })).toBeVisible();
    });
    await step('[취소할래요]를 누르면 주문취소완료 + 토스트', async () => {
      await page.getByRole('button', { name: '취소할래요' }).click();
      await expect(page.getByText('티켓이 정상적으로 취소되었습니다.')).toBeVisible();
      await expect(page.getByTestId('order-status').first()).toHaveText('주문취소완료');
    });
  },
);

scenario(
  'MY-9',
  '거절된 유료 주문 — 계좌 입력 유도 → 입력하면 마스킹 계좌, 유도가 꺼진다',
  {
    kind: '정상',
    summary:
      '`refundAccountRequired`면 유도 문구, [계좌 입력] 시트 → O-5(bankCode) → maskedAccountNumber.',
    basis: [
      'plan P9 완료 기준 L 환불 계좌 유도 · maskedAccountNumber 갱신',
      'P9-L useRefundAccount',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto(detail(P9_ORDER.refusedAmount));
    await step(
      '거절 사유 박스("결제 금액 오류")와 "환불받을 계좌를 입력해 주세요"가 보인다',
      async () => {
        await expect(page.getByTestId('refuse-reason')).toHaveText('결제 금액 오류');
        await expect(page.getByText('환불받을 계좌를 입력해 주세요')).toBeVisible();
      },
    );
    await step('[계좌 입력] 시트에서 저장하면 마스킹 계좌가 보이고 유도가 사라진다', async () => {
      await page.getByRole('button', { name: '계좌 입력' }).click();
      await fillAccount(page);
      await dialog(page).getByRole('button', { name: '저장' }).click();
      await expect(page.getByText('환불 계좌를 저장했어요')).toBeVisible();
      await expect(page.getByTestId('refund-account')).toContainText('7890');
      await expect(page.getByText('환불받을 계좌를 입력해 주세요')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '계좌 수정' })).toBeVisible();
    });
  },
);

scenario(
  'MY-10',
  '거절 사유 박스 — 입금 미확인은 유도 없음, 기타는 호스트 사유',
  {
    kind: '정상',
    summary:
      '와이어 거절 3종의 사유 + 설명. 입금 미확인은 입구만 있고 유도가 없다. ETC는 호스트가 쓴 사유만.',
    basis: [
      '와이어 128:2583 · 128:2646 · 128:2709',
      'plan P9 완료 기준 L "입금 미확인 거절은 유도 없음"',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step(
      '입금 미확인 거절 — 사유 설명이 있고, [계좌 입력]은 있지만 유도 문구는 없다',
      async () => {
        await page.goto(detail(P9_ORDER.refusedDeposit));
        await expect(page.getByTestId('refuse-reason')).toHaveText('입금 미확인');
        await expect(page.getByText('입금 내역을 찾을 수 없습니다.')).toBeVisible();
        await expect(page.getByRole('button', { name: '계좌 입력' })).toBeVisible();
        await expect(page.getByText('환불받을 계좌를 입력해 주세요')).toHaveCount(0);
      },
    );
    await step('기타 거절 — 호스트가 쓴 사유("공연 일정 변경")가 보인다', async () => {
      await page.goto(detail(P9_ORDER.refusedEtc));
      await expect(page.getByTestId('refuse-reason')).toHaveText('공연 일정 변경');
    });
  },
);

scenario(
  'MY-11',
  '선물 대기 티켓이 있는 주문 — [주문취소] 대신 선물 안내, 티켓상태 "선물중"',
  {
    kind: '정상',
    summary:
      'patterns §20 조건에 맞는 주문만 [주문취소] 자리에 "선물을 먼저 취소하거나 돌려받아 주세요".',
    basis: ['plan P9 완료 기준 L 선물 안내 조건', '와이어 498:703'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('선물 안내가 보이고 [주문취소]는 없다. 티켓상태에 "선물중"', async () => {
      await page.goto(detail(P9_ORDER.giftPending));
      await expect(page.getByTestId('gift-blocks-cancel')).toHaveText(
        '선물을 먼저 취소하거나 돌려받아 주세요',
      );
      await expect(page.getByRole('button', { name: '주문취소' })).toHaveCount(0);
      await expect(page.getByRole('region', { name: '예매정보' })).toContainText('선물중');
    });
  },
);

scenario(
  'MY-12',
  '[호스트 문의]를 누르면 연락처 시트 — GP-3을 쿠키와 함께 한 번',
  {
    kind: '정상',
    summary: '시트를 열 때 브라우저가 GP-3(viewer)을 한 번 읽어 원문 연락처를 보인다.',
    basis: ['plan P9 완료 기준 V "호스트 문의 시트에 연락처가 표시됨"', 'patterns §20'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto(detail(P9_ORDER.approvedPaid));
    await expect(page.getByTestId('order-no')).toBeVisible();
    await step('[호스트 문의]를 누르면 "호스트 문의" 시트에 연락처(전화 원문)', async () => {
      await page.getByRole('button', { name: '호스트 문의', exact: true }).click();
      await expect(dialog(page).getByRole('link', { name: /010-1234-5678/ })).toBeVisible();
      const reads = mockApi
        .calls()
        .filter((c) => c.path.split('?')[0] === '/api/v2/events/101' && c.from === 'browser');
      expect(reads).toHaveLength(1);
    });
  },
);

scenario(
  'MY-13',
  '취소 에러 — 공연이 이미 시작됐으면 시트 안 안내 + 다시 읽기',
  {
    kind: '에러',
    summary: 'patterns §24 P9 — Order_400_5 등은 O-3을 다시 읽고 시트에 안내(토스트 없음).',
    basis: ['patterns §24 P9', 'P9-L CANCEL_ERROR_TABLE'],
    mocks: orderHandlers.cancelFails('Event_400_5'),
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto(detail(P9_ORDER.approvedPaid));
    await step('계좌를 채우고 취소하면 시트 안에 실패 안내가 남는다', async () => {
      await page.getByRole('button', { name: '주문취소' }).click();
      await fillAccount(page);
      await page.getByRole('button', { name: '확인했어요, 취소할게요' }).click();
      await expect(dialog(page).getByRole('alert').last()).toBeVisible();
    });
  },
);

scenario(
  'MY-16',
  '남의(없는) 주문 주소면 공용 404',
  {
    kind: '에러',
    summary: 'G11/O-3 404 → "주문을 찾을 수 없어요" + [주문내역].',
    basis: ['plan P9 완료 기준 L 남의 주문 404', 'patterns §11'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('없는 주문 주소를 열면 "주문을 찾을 수 없어요"', async () => {
      await page.goto(detail(MISSING_ORDER_UUID));
      await expect(page.getByText('주문을 찾을 수 없어요')).toBeVisible();
    });
  },
);

scenario(
  'MY-17',
  '삭제된 공연의 주문 — 공연 정보 없이, 취소 · 문의 입구 없음',
  {
    kind: '빈 상태',
    summary: '`event: null`이면 "삭제된 공연이에요", [주문취소] · [호스트 문의] 없음.',
    basis: ['plan P9 완료 기준 L 삭제된 공연', 'api-contract §6 #789'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('삭제된 공연 주문을 열면 공연 정보 대신 "삭제된 공연이에요"', async () => {
      await page.goto(detail(P9_ORDER.deletedEvent));
      await expect(page.getByTestId('event-removed')).toBeVisible();
      await expect(page.getByRole('button', { name: '주문취소' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '호스트 문의', exact: true })).toHaveCount(0);
    });
  },
);

// ─── 관심 호스트 · 아카이빙 ───

scenario(
  'MY-14',
  '관심 호스트 — 필터 3값이 보이고, ♡를 누르면 목록에서 빠진다',
  {
    kind: '정상',
    summary:
      '와이어 "전체 상태 ⌄" → DS Dropdown(전체 / 공연 예정 / 지난 공연만 — 서버 status 3값). 해제는 PH-13 DELETE.',
    basis: [
      'plan P9 완료 기준 V "관심 호스트 status 3값이 표시됨"',
      '와이어 249:554',
      'P9-L FOLLOWING_TABS',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage/following');
    await step('필터를 열면 전체 · 공연 예정 · 지난 공연만 세 가지', async () => {
      await page.getByRole('combobox', { name: '관심 호스트 필터' }).click();
      for (const label of ['전체', '공연 예정', '지난 공연만']) {
        await expect(page.getByRole('option', { name: label })).toBeVisible();
      }
    });
    await step('"지난 공연만"을 고르면 공연 종료 배지인 호스트만', async () => {
      const options = page.getByRole('option', { name: '지난 공연만' });
      if (!(await options.isVisible())) {
        await page.getByRole('combobox', { name: '관심 호스트 필터' }).click();
      }
      await options.click();
      const rows = page.getByTestId('following-host');
      await expect(rows.first()).toContainText('공연 종료');
      await expect(rows.filter({ hasText: /D-\d+/ })).toHaveCount(0);
    });
    await step('첫 호스트의 ♡를 누르면 목록에서 빠진다', async () => {
      const first = page.getByTestId('following-host').first();
      const name = (await first.getByRole('link').nth(1).innerText()).trim();
      await first.getByRole('button', { name: /관심 해제/ }).click();
      await expect(page.getByTestId('following-host').filter({ hasText: name })).toHaveCount(0);
    });
  },
);

scenario(
  'MY-15',
  '아카이빙 — 연도 탭과 포스터, 선물로만 입장한 공연은 누를 수 없다',
  {
    kind: '정상',
    summary: '전체 + 서버 years 탭. orderUuid가 있으면 주문상세 링크, null이면 링크 없음.',
    basis: ['plan P9 완료 기준 L 아카이빙 orderUuid=null', '와이어 503:16328 · 671:6692'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.goto('/mypage/archive');
    await step(
      '전체 탭에 관람한 공연 포스터가 보이고, 선물로만 본 "여름밤 재즈"는 링크가 없다',
      async () => {
        await expect(page.getByRole('tab', { name: '전체' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        const jazz = page.getByTestId('archive-event').filter({ hasText: '여름밤 재즈' });
        await expect(jazz.getByRole('link')).toHaveCount(0);
      },
    );
    await step('2025년 탭을 누르면 그해 공연만', async () => {
      await page.getByRole('tab', { name: '2025년' }).click();
      await expect(
        page.getByTestId('archive-event').filter({ hasText: '여름밤 재즈' }),
      ).toHaveCount(0);
      await expect(page.getByTestId('archive-event').first()).toContainText('2025.');
    });
  },
);
