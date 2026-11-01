import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { CHECKOUT_TICKET } from '../../src/api/__mocks__/fixtures/order';
import { orderHandlers } from '../../src/api/__mocks__/order.handlers';
import { checkoutHref } from '../../src/features/audience/checkout/model/checkout-params';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 체크아웃 · 입금 확인 · 주문 완료(plan P7 완료 기준 V). 근거는 GUI Ready — 체크아웃 `564:4156`·`567:9316`·`567:9159`·
 * `567:10452`·`567:8532`, 입금 확인 `567:9468`(DS `다이얼로그 - 결제 요약`으로), 주문 완료 `939:27829`(gui-screens §0).
 * 서버 기준으로 바꾼 것(plan P7 ①~⑤): 예매번호·티켓번호 줄 없음, 결제정보에 은행 줄, CTA 결제하기·신청하기, 무료는 결제 블록 없이,
 * 완료는 두 버튼만.
 *
 * 공연 101의 체크아웃 티켓(fixtures `CHECKOUT_TICKET`): 501 두둥 15,000원 · 옵션 2개(뒤풀이 참석 네/아니오 +10,000원,
 * 응원하는 멤버 주관식) · 인당 4매 / 504 두둥 · 옵션 없음 / 505 무료 승인형 · 주관식 1개 / 503 무료 선착순.
 * 계좌는 신한은행(`bankCode` 088) 110-123-456789 · 고스락.
 *
 * 범주 검토
 * - 빈 상태: 해당 없음 — 체크아웃은 고른 티켓이 있어야 열린다. 고를 수 없는 주소·판매 중이 아닌 티켓은 상세로 돌려보낸다(e2e `checkout.spec`)
 * - 권한: 비로그인 → 로그인(돌아올 주소 유지)은 e2e `checkout.spec`. 남의 주문 주소는 CHK-10
 * - 크롤러: 해당 없음 — 보호 화면(`(protected)`), 서버 조회 없음
 */

const href = (ticketItemId: number, quantity = 1) => checkoutHref(101, { ticketItemId, quantity });

const confirmDialog = (page: Page) => page.getByRole('alertdialog', { name: '주문 완료하기' });

const NOTICE_CHECK = '(필수) 위 내용을 확인했으며 이에 동의합니다';
const HOST_CHECK = '(필수) 호스트에게 개인정보 제공 동의';

/** 입금 확인 다이얼로그 — 입금 전 확인(두둥, #840 ③) 체크 → [결제완료] */
async function confirmDeposit(page: Page) {
  await confirmDialog(page).getByRole('checkbox', { name: NOTICE_CHECK }).click();
  await confirmDialog(page).getByRole('button', { name: '결제완료' }).click();
}

async function fillPaidOptions(page: Page, answer: '예' | '아니오' = '예') {
  await page
    .getByRole('radiogroup', { name: /뒤풀이 참석/ })
    .getByRole('radio', { name: answer })
    .click();
  await page.getByRole('textbox', { name: '응원하는 멤버' }).fill('보컬');
}

async function agree(page: Page) {
  await page.getByRole('checkbox', { name: /주문내용과 환불\/취소 규정/ }).click();
  await page.getByRole('checkbox', { name: HOST_CHECK }).click();
}

scenario(
  'CHK-1',
  '공연 상세에서 티켓 2매를 고르고 체크아웃에서 옵션·동의 뒤 [결제하기] → 입금 확인 [결제완료] → 주문 완료',
  {
    kind: '정상',
    summary:
      '상세(P6)의 [티켓 구매하기]가 체크아웃으로. 모든 티켓 동일 옵션(기본 켜짐)이라 1번 티켓 아코디언에만 옵션 칸. 결제정보에 입금자명(닉네임)·입금은행·결제계좌(복사)·예금주, 예매번호·티켓번호 없음. 확인 다이얼로그 요약 금액 = 화면 총액. 완료 뒤 뒤로가기는 체크아웃이 아니다.',
    basis: [
      'plan P7 완료 기준 V(흐름 · 예매번호·티켓번호 없음 · 은행명)',
      'GUI 564:4156 · 567:9468 · 939:27829',
      'tech-decisions §18·§19',
    ],
  },
  async ({ page, mockApi, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    await setMockSession(page, 'loggedIn');
    await page.goto('/events/101');
    await step(
      '상세에서 일반 예매 2매를 고르고 [티켓 구매하기]를 누르면 체크아웃이다',
      async () => {
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
        await expect(page.getByRole('button', { name: '결제하기' })).toBeVisible();
      },
    );
    await step(
      '예매정보는 티켓 2장(1/2 펼침 · 2/2 접힘)이고 예매번호·티켓번호 줄이 없다',
      async () => {
        await expect(page.getByRole('button', { name: /일반 예매.*\(1\/2\)/ })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        await expect(page.getByRole('button', { name: /일반 예매.*\(2\/2\)/ })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
        await expect(
          page.getByRole('checkbox', { name: '모든 티켓에 동일 옵션 적용' }),
        ).toBeChecked();
        await expect(page.getByText('예매번호')).toHaveCount(0);
        await expect(page.getByText('티켓번호')).toHaveCount(0);
        await expect(page.getByText('호스트 승인 후 확정', { exact: true })).toBeVisible();
      },
    );
    await step('결제정보에 입금자명·입금은행·결제계좌·예금주가 나온다', async () => {
      const info = page.getByRole('region', { name: '결제정보' });
      await expect(info.getByText('입금자명은 닉네임과 동일하게 해주세요')).toBeVisible();
      await expect(info.getByText('입금은행')).toBeVisible();
      await expect(info.getByText('신한은행')).toBeVisible();
      await expect(info.getByText('110-123-456789')).toBeVisible();
      await expect(info.getByText('고스락')).toBeVisible();
      await expect(page.getByTestId('checkout-amount')).toHaveText('30,000 원');
    });
    await step(
      '옵션 "예"(+10,000원 × 2)와 주관식을 채우면 총 결제금액이 50,000 원이다',
      async () => {
        await fillPaidOptions(page);
        await expect(page.getByTestId('checkout-amount')).toHaveText('50,000 원');
        await agree(page);
      },
    );
    await step(
      '[결제하기]를 누르면 입금 확인 다이얼로그에 결제 요약(은행·계좌·금액)이 나온다',
      async () => {
        await page.getByRole('button', { name: '결제하기' }).click();
        const dialog = confirmDialog(page);
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('입금 하셨나요?')).toBeVisible();
        await expect(dialog.getByText('신한은행')).toBeVisible();
        await expect(dialog.getByText('110-123-456789')).toBeVisible();
        await expect(dialog.getByText('50,000 원')).toBeVisible();
      },
    );
    await step(
      '[결제완료]를 누르면 주문 완료 화면(일러스트 · 주문 완료! · 두 버튼)이다',
      async () => {
        // 입금 전 확인(③ — 2026-11-01 붙임) 전에는 [결제완료]가 막혀 있다
        await expect(confirmDialog(page).getByRole('button', { name: '결제완료' })).toBeDisabled();
        await confirmDeposit(page);
        await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
        await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
        await expect(
          page.getByText('티켓 승인여부는 티켓 페이지에서 확인 가능합니다!'),
        ).toBeVisible();
        await expect(page.getByRole('link', { name: '주문내역' }).last()).toHaveAttribute(
          'href',
          '/orders',
        );
        await expect(page.getByRole('link', { name: '티켓 페이지로' })).toHaveAttribute(
          'href',
          '/tickets',
        );
        // 완료 화면에 예매번호·계좌·금액은 다시 보이지 않는다(plan P7 ⑤ · Q16 기본안). 앞 화면은 Next 16이 숨긴 채 DOM에 남기므로 보이는 것만 센다
        await expect(page.getByText('예매번호').locator('visible=true')).toHaveCount(0);
        await expect(page.getByText('110-123-456789').locator('visible=true')).toHaveCount(0);
        expect(
          mockApi.calls().filter((c) => c.method === 'POST' && c.path === '/api/v2/me/orders'),
        ).toHaveLength(1);
      },
    );
    await step('뒤로가기를 누르면 체크아웃이 아니라 공연 상세다', async () => {
      await page.goBack();
      await expect(page).not.toHaveURL(/\/checkout/);
    });
  },
);

scenario(
  'CHK-2',
  '"모든 티켓에 동일 옵션 적용"을 끄면 티켓마다 옵션 칸이 생기고, 빈 칸으로 [결제하기]를 누르면 첫 오류 티켓이 펼쳐진다',
  {
    kind: '정상',
    summary:
      '개별 옵션(GUI 567:8532). 끄면 지금 공통 답을 티켓마다 복사한다. 검증 실패면 확인 다이얼로그를 열지 않고 첫 오류 티켓 아코디언을 펼쳐 칸 아래 오류를 보인다. 다시 켤 때 답이 다르면 1번 티켓 답으로 맞출지 묻는다(디자인 없음 — Figma 코멘트).',
    basis: [
      'GUI 567:8532',
      'tech-decisions §18 옵션 폼(첫 오류 티켓 열기)',
      'Figma 코멘트 567:1245',
    ],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidWithOptions, 2));
    await step('동일 옵션 적용을 끄면 체크가 풀린다', async () => {
      await page.getByRole('checkbox', { name: '모든 티켓에 동일 옵션 적용' }).click();
      await expect(
        page.getByRole('checkbox', { name: '모든 티켓에 동일 옵션 적용' }),
      ).not.toBeChecked();
    });
    await step(
      '1번 티켓만 채우고 [결제하기]를 누르면 2번 티켓이 펼쳐지고 칸 아래 오류가 나온다',
      async () => {
        await fillPaidOptions(page);
        await agree(page);
        await page.getByRole('button', { name: '결제하기' }).click();
        await expect(confirmDialog(page)).toBeHidden();
        await expect(page.getByRole('button', { name: /\(2\/2\)/ })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        await expect(page.getByText('답변을 선택해 주세요')).toBeVisible();
        await expect(page.getByText('답변을 입력해 주세요')).toBeVisible();
      },
    );
    await step('2번 티켓을 "아니오"로 채우면 총액이 40,000 원이다', async () => {
      await page
        .getByRole('radiogroup', { name: /뒤풀이 참석/ })
        .nth(1)
        .getByRole('radio', { name: '아니오' })
        .click();
      await page.getByRole('textbox', { name: '응원하는 멤버' }).nth(1).fill('드럼');
      await expect(page.getByTestId('checkout-amount')).toHaveText('40,000 원');
    });
    await step(
      '동일 옵션 적용을 다시 켜면 1번 티켓 답으로 맞출지 묻고, [적용]이면 50,000 원이다',
      async () => {
        await page.getByRole('checkbox', { name: '모든 티켓에 동일 옵션 적용' }).click();
        const ask = page.getByRole('alertdialog', { name: '모든 티켓에 같은 옵션을 적용할까요?' });
        await expect(ask).toBeVisible();
        await ask.getByRole('button', { name: '적용' }).click();
        await expect(
          page.getByRole('checkbox', { name: '모든 티켓에 동일 옵션 적용' }),
        ).toBeChecked();
        await expect(page.getByTestId('checkout-amount')).toHaveText('50,000 원');
      },
    );
  },
);

scenario(
  'CHK-3',
  '동의하지 않고 [결제하기]를 누르면 동의 칸 아래 오류가 나오고 다이얼로그가 열리지 않는다',
  {
    kind: '에러',
    summary:
      '옵션 없는 두둥 티켓(GUI 567:9159 — 옵션적용 줄 없음). 환불 규정 동의는 필수(L 스키마).',
    basis: ['GUI 567:9159', 'plan P7 V 범위(환불 규정 동의)'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await step('옵션적용 줄이 없고, 동의 없이 누르면 "환불 규정에 동의해 주세요"', async () => {
      await expect(page.getByRole('button', { name: '결제하기' })).toBeVisible();
      await expect(page.getByText('옵션적용')).toHaveCount(0);
      await page.getByRole('button', { name: '결제하기' }).click();
      await expect(page.getByText('환불 규정에 동의해 주세요')).toBeVisible();
      await expect(confirmDialog(page)).toBeHidden();
    });
  },
);

scenario(
  'CHK-4',
  '입금 확인 다이얼로그는 뒤로가기·[취소]로 닫히고 주문을 보내지 않는다',
  {
    kind: '정상',
    summary: '오버레이는 뒤로가기가 닫는다(patterns §6). 닫아도 체크아웃 주소 그대로.',
    basis: ['patterns §6', 'GUI 567:9468'],
  },
  async ({ page, mockApi, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await agree(page);
    await step('[결제하기] → 뒤로가기면 다이얼로그만 닫힌다', async () => {
      await page.getByRole('button', { name: '결제하기' }).click();
      await expect(confirmDialog(page)).toBeVisible();
      await page.goBack();
      await expect(confirmDialog(page)).toBeHidden();
      await expect(page).toHaveURL(/\/checkout\?/);
    });
    await step('다시 열고 [취소]를 눌러도 닫히고 주문 요청은 없다', async () => {
      await page.getByRole('button', { name: '결제하기' }).click();
      await confirmDialog(page).getByRole('button', { name: '취소' }).click();
      await expect(confirmDialog(page)).toBeHidden();
      expect(mockApi.calls().filter((c) => c.method === 'POST')).toEqual([]);
    });
  },
);

scenario(
  'CHK-5',
  '결제계좌 [복사]를 누르면 "계좌번호를 복사했어요" 토스트',
  {
    kind: '정상',
    summary:
      '복사는 클립보드 유틸(`copyText`, patterns §9). 체크아웃과 입금 확인 다이얼로그 둘 다에 있다.',
    basis: ['plan P7 V 범위(계좌 복사)', 'patterns §9'],
  },
  async ({ page, step }) => {
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'])
      .catch(() => undefined);
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await step('결제정보의 [복사]를 누르면 토스트가 뜬다', async () => {
      await page
        .getByRole('region', { name: '결제정보' })
        .getByRole('button', { name: '계좌번호 복사' })
        .click();
      await expect(page.getByText('계좌번호를 복사했어요')).toBeVisible();
    });
  },
);

scenario(
  'CHK-6',
  '[토스간편송금]을 고르면 토스 앱 송금 링크(금액 = 총액)가 나온다',
  {
    kind: '정상',
    summary:
      '토스 송금 링크(`supertoss://send`)의 금액은 화면 총액. 은행 코드(`bankCode`)가 없는 계좌면 [토스간편송금]을 숨긴다(plan P7 L · B3). 버튼·안내는 디자인 없음(Figma 코멘트 567:8004).',
    basis: ['plan P7 L 범위(토스 송금 링크)', 'tech-decisions §19·§22', 'Figma 코멘트 567:8004'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions, 2));
    await step('[토스간편송금]을 누르면 [토스 앱에서 송금하기] 링크가 생긴다', async () => {
      await page.getByRole('radio', { name: '토스간편송금' }).click();
      const link = page.getByTestId('toss-link');
      await expect(link).toBeVisible();
      const amount = (await page.getByTestId('checkout-amount').textContent())!.replace(/\D/g, '');
      await expect(link).toHaveAttribute(
        'href',
        new RegExp(`^supertoss://send\\?.*amount=${amount}`),
      );
    });
  },
);

scenario.manual('CHK-7', '토스 앱이 깔린 실기기에서 송금 링크가 열리고 은행명이 인식된다', {
  kind: '정상',
  basis: ['plan P7 완료 기준 V(토스 실기기)', 'backend-questions B3'],
  how: 'D2 스테이징 배포 뒤 iPhone·Android 실기기에서 두둥 티켓 체크아웃 → [토스간편송금] → [토스 앱에서 송금하기]. 토스 송금 화면에 은행·계좌·금액(총액)이 채워지는지 본다. 은행이 비면 `bankCode` → 토스 은행 값 매핑을 정한다(payment.ts TODO B3).',
});

scenario(
  'CHK-8',
  '무료 승인형은 결제 블록 없이 [신청하기] → 다이얼로그 없이 주문 완료',
  {
    kind: '정상',
    summary:
      '무료 [신청하기]는 GUI에 없어 같은 레이아웃에서 결제정보·결제금액·결제방식만 뺀다(plan P7 ④).',
    basis: ['plan P7 GUI ③④', 'tech-decisions §19 3분기'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.freeApproval));
    await step('결제정보·결제금액·결제방식이 없고 CTA가 [신청하기]다', async () => {
      await expect(page.getByRole('button', { name: '신청하기' })).toBeVisible();
      await expect(page.getByRole('region', { name: '결제정보' })).toHaveCount(0);
      await expect(page.getByText('결제금액')).toHaveCount(0);
      await expect(page.getByText('결제방식')).toHaveCount(0);
      await expect(page.getByText('호스트 승인 후 확정', { exact: true })).toBeVisible();
    });
    await step('답을 채우고 동의 뒤 [신청하기]를 누르면 바로 주문 완료다', async () => {
      await page.getByRole('textbox', { name: '응원하는 멤버' }).fill('보컬');
      await agree(page);
      await page.getByRole('button', { name: '신청하기' }).click();
      await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
      await expect(
        page.getByText('티켓 승인여부는 티켓 페이지에서 확인 가능합니다!'),
      ).toBeVisible();
    });
  },
);

scenario(
  'CHK-9',
  '무료 선착순은 "신청 즉시 확정"이고, 신청하면 "티켓이 발급됐어요"',
  {
    kind: '정상',
    summary: '즉시 발급 문구는 GUI에 없어 정했다(Figma 코멘트 939:28045).',
    basis: ['tech-decisions §19 3분기', 'Figma 코멘트 939:28045'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.freeFcfs));
    await step('승인방식이 "신청 즉시 확정"이고, 신청하면 발급 안내다', async () => {
      await expect(page.getByText('신청 즉시 확정')).toBeVisible();
      await agree(page);
      await page.getByRole('button', { name: '신청하기' }).click();
      await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
      await expect(
        page.getByText('티켓이 발급됐어요. 티켓 페이지에서 확인해 주세요!'),
      ).toBeVisible();
    });
  },
);

scenario(
  'CHK-10',
  '주문 완료 주소를 새로고침해도 같은 화면이고, 없는(남의) 주문 주소는 찾을 수 없음',
  {
    kind: '에러',
    summary: '완료 화면은 G11/O-3을 다시 읽는다(tech-decisions §3). 없는 주문은 공용 404 안내.',
    basis: ['plan P7 완료 기준 L(새로고침)', 'patterns §11 404'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.freeFcfs));
    await agree(page);
    await page.getByRole('button', { name: '신청하기' }).click();
    await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
    await step('새로고침해도 주문 완료!', async () => {
      await page.reload();
      await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
    });
    await step('없는 주문 주소는 "주문을 찾을 수 없어요"', async () => {
      await page.goto('/orders/mock-order-missing?created=1');
      await expect(page.getByText('주문을 찾을 수 없어요')).toBeVisible();
    });
  },
);

// ─── 주문 생성 에러(patterns §24 P7 행) ────────────────────────

const formErrors = [
  [
    'CHK-11',
    'Ticket_Item_400_1',
    '재고 부족',
    '남은 티켓이 부족해요. 수량을 줄여 다시 시도해 주세요.',
  ],
  [
    'CHK-12',
    'Ticket_Item_400_6',
    '1인 제한(발급 기준)',
    '1인 구매 가능 수량을 넘었어요. 수량을 줄여 다시 시도해 주세요.',
  ],
  [
    'CHK-13',
    'Order_400_15',
    '승인형 1인 제한',
    '이미 신청한 주문이 승인될 때까지 기다려 주세요. 수량을 줄이면 지금 주문할 수 있어요.',
  ],
  [
    'CHK-14',
    'Order_400_22',
    '입금자명 오류',
    '입금자명이 올바르지 않아요. 프로필에서 닉네임을 확인해 주세요.',
  ],
  ['CHK-15', 'Order_400_23', '옵션 답변 오류', '옵션 답변을 확인해 주세요.'],
] as const;

for (const [id, code, what, message] of formErrors) {
  scenario(
    id,
    `[결제완료] 뒤 ${code}(${what})면 다이얼로그가 닫히고 화면 맨 위에 안내가 나온다`,
    {
      kind: '에러',
      summary:
        '폼 위 안내(옅은 붉은 판 — 디자인 없음, Figma 코멘트 567:8010). 재고 계열은 GP-5·O-0을 다시 읽는다.',
      basis: ['patterns §24 P7', 'checkout-errors.ts', 'Figma 코멘트 567:8010'],
      mocks: orderHandlers.createFails(code),
      viewports: ['mobile'],
    },
    async ({ page, step }) => {
      await setMockSession(page, 'loggedIn');
      await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
      await agree(page);
      await step(`[결제하기] → [결제완료]를 누르면 "${message}"`, async () => {
        await page.getByRole('button', { name: '결제하기' }).click();
        await confirmDeposit(page);
        await expect(confirmDialog(page)).toBeHidden();
        await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
        await expect(page).toHaveURL(/\/checkout\?/);
      });
    },
  );
}

scenario(
  'CHK-16',
  '같은 무료 선착순 주문 처리 중(Order_400_26)이면 토스트와 함께 주문내역으로 간다',
  {
    kind: '에러',
    summary:
      '"같은 주문을 처리하고 있어요. 잠시 후 주문내역을 확인해 주세요." + `/orders` replace.',
    basis: ['patterns §24 P7 Order_400_26'],
    mocks: orderHandlers.createFails('Order_400_26'),
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.freeFcfs));
    await agree(page);
    await step('[신청하기]를 누르면 주문내역으로 가고 토스트가 남는다', async () => {
      await page.getByRole('button', { name: '신청하기' }).click();
      await expect(page).toHaveURL(/\/orders$/);
      await expect(
        page.getByText('같은 주문을 처리하고 있어요. 잠시 후 주문내역을 확인해 주세요.'),
      ).toBeVisible();
    });
  },
);

scenario(
  'CHK-17',
  '공연이 시작돼 예매할 수 없으면(Event_400_6) 공연 상세로 돌아가고 토스트가 남는다',
  {
    kind: '에러',
    summary: '오픈 전·시작 후는 상세로 돌려보낸다(patterns §24 P7 Event_400_5·6).',
    basis: ['patterns §24 P7 Event_400_5 · Event_400_6'],
    mocks: orderHandlers.createFails('Event_400_6'),
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await agree(page);
    await step('[결제완료]를 누르면 상세로 가고 "공연이 시작되어 예매할 수 없어요."', async () => {
      await page.getByRole('button', { name: '결제하기' }).click();
      await confirmDeposit(page);
      await expect(page).toHaveURL(/\/events\/101$/);
      await expect(page.getByText('공연이 시작되어 예매할 수 없어요.')).toBeVisible();
    });
  },
);

scenario(
  'CHK-18',
  '무료 선착순 확정 실패면 "신청을 완료하지 못했어요" 안내가 나오고 다시 신청할 수 있다',
  {
    kind: '에러',
    summary:
      '확정 실패는 주문이 아니라 에러로 온다(FAILED 주문은 사용자에게 보이지 않음). 재고 코드라 재고 안내가 먼저 나온다.',
    basis: ['plan P7 L(무료 선착순 확정 실패)', 'checkout-errors FREE_FCFS_FAILED'],
    mocks: orderHandlers.freeFcfsConfirmFails,
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.freeFcfs));
    await agree(page);
    await step('[신청하기]를 누르면 화면 위 안내가 나오고 버튼은 다시 눌린다', async () => {
      await page.getByRole('button', { name: '신청하기' }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await expect(page.getByRole('button', { name: '신청하기' })).toBeEnabled();
    });
  },
);

let orderRejected = false;
scenario(
  'CHK-19',
  '백엔드가 주문 동의를 거절(Agreement_400_1)하면 동의가 풀리고 다시 체크해 주문한다',
  {
    kind: '에러',
    summary:
      '동의 강제 켠 백엔드에서 첫 주문이 400 Agreement_400_1(옛 문구 화면 등) → 다이얼로그가 닫히고 맨 위 안내 + 동의 칸이 풀린다. 다시 체크하면 강제 백엔드를 통과한다. 공용 토스트 없음.',
    basis: ['백엔드 #905 1-1', 'design-requests Q42 ②·③', 'patterns §24 Agreement_400_1'],
    mocks: [
      http.post('*/api/v2/me/orders', () => {
        if (orderRejected) return undefined;
        orderRejected = true;
        return HttpResponse.json(envelope.error(400, 'Agreement_400_1'), { status: 400 });
      }),
      ...orderHandlers.agreementEnforced,
    ],
  },
  async ({ page, step }) => {
    orderRejected = false;
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await agree(page);
    await step('[결제완료] → 거절되면 맨 위 안내가 나오고 동의 칸이 풀린다', async () => {
      await page.getByRole('button', { name: '결제하기' }).click();
      await confirmDeposit(page);
      await expect(confirmDialog(page)).toBeHidden();
      await expect(
        page.getByRole('alert').filter({ hasText: '필수 동의를 다시 확인하고 체크해 주세요.' }),
      ).toBeVisible();
      await expect(page.getByRole('checkbox', { name: HOST_CHECK })).not.toBeChecked();
      await expect(page).toHaveURL(/\/checkout\?/);
    });
    await step('다시 체크하고 내면 주문 완료', async () => {
      await page.getByRole('checkbox', { name: HOST_CHECK }).click();
      await page.getByRole('button', { name: '결제하기' }).click();
      await expect(
        confirmDialog(page).getByRole('checkbox', { name: NOTICE_CHECK }),
      ).not.toBeChecked();
      await confirmDeposit(page);
      await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
    });
  },
);

scenario(
  'CHK-20',
  '주문 동의 칸 — 호스트 제공 동의는 하단 바 위(체크 전 막힘 · [자세히] 펼침), 두둥 입금 전 확인은 입금 확인 다이얼로그 안',
  {
    kind: '정상',
    summary:
      '디자인 없음(Q42) — DS Checkbox · Accordion으로만. ② 호스트 제공 동의(legal-copy B-1 원문, 두둥은 ", 입금자명·환불 계좌") — 미체크로 누르면 칸 아래 오류. ③ 입금 전 확인(A-6 ①~③) — 체크 전 [결제완료] 비활성. 무료는 ③이 없다(무료 승인형 시나리오 — 다이얼로그 없이 완료).',
    basis: ['백엔드 #905 1-1', 'design-requests Q42 ②·③', 'legal-copy B-1 · A-6'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(href(CHECKOUT_TICKET.paidNoOptions));
    await step('환불 규정만 체크하고 누르면 호스트 제공 동의 오류', async () => {
      await page.getByRole('checkbox', { name: /주문내용과 환불\/취소 규정/ }).click();
      await page.getByRole('button', { name: '결제하기' }).click();
      await expect(page.getByText('개인정보 제공에 동의해 주세요')).toBeVisible();
      await expect(page.getByRole('checkbox', { name: HOST_CHECK })).toHaveAccessibleDescription(
        '개인정보 제공에 동의해 주세요',
      );
      await expect(confirmDialog(page)).toBeHidden();
    });
    await step(
      '[자세히]를 펼치면 제공받는 자 · 항목(두둥은 입금자명·환불 계좌) · 보유기간',
      async () => {
        await page.getByRole('button', { name: '자세히' }).click();
        await expect(page.getByText(/^항목: .*입금자명·환불 계좌$/)).toBeVisible();
        await expect(
          page.getByText('보유기간: 공연 종료 후 6개월 (두둥티켓 입금·환불 내역은 3년)'),
        ).toBeVisible();
      },
    );
    await step(
      '체크하면 입금 확인 다이얼로그 — 입금 전 확인 전에는 [결제완료]가 막힌다',
      async () => {
        await page.getByRole('checkbox', { name: HOST_CHECK }).click();
        await page.getByRole('button', { name: '결제하기' }).click();
        await expect(
          confirmDialog(page).getByText(
            '두둥티켓 대금은 호스트에게 직접 지급되며, 두둥은 대금을 받지 않습니다.',
          ),
        ).toBeVisible();
        await expect(confirmDialog(page).getByRole('button', { name: '결제완료' })).toBeDisabled();
        await confirmDialog(page).getByRole('checkbox', { name: NOTICE_CHECK }).click();
        await expect(confirmDialog(page).getByRole('button', { name: '결제완료' })).toBeEnabled();
      },
    );
  },
);
