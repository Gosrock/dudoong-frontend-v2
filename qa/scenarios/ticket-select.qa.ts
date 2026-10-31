import { setMockSession } from '../../e2e/support/auth';
import { ticketItemHandlers } from '../../src/api/__mocks__/ticket-item.handlers';
import { expect, scenario } from '../scenario';

/**
 * 티켓 선택(plan P6 완료 기준 V). 근거는 와이어 — 모바일 바텀시트 `528:2484`(구매하기 선택) · `121:1406`(선택) ·
 * `121:1517`(다른 티켓 선택 경고), PC 오른쪽 카드 `640:15617`(gui-screens §0 — 티켓 선택 GUI `759:*`는 Ready for dev 아님).
 * 선택 상태는 공연 상세의 `useTicketSelection` 하나를 모바일 시트와 PC 카드가 같이 쓴다.
 *
 * 공연 101의 티켓(fixtures): 일반 예매 501(15,000원 · 인당 4매 · 잔여 42) · 학생 할인(매진) · 초대권(무료).
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 티켓은 브라우저 GP-5만(응답 HTML에 재고 없음은 e2e `event-detail.spec`)
 * - 권한: 선택은 비로그인도 된다. 체크아웃 진입 뒤 로그인 게이트는 e2e `checkout.spec`이 본다
 * - 에러: GP-5 실패 [다시 시도]는 QA EVT-7(같은 컴포넌트). 체크아웃 쪽 재고 에러는 P7
 */

const EVENT = '/events/101';

const sheet = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: '티켓 종류' });

/** 티켓 줄(목록 항목 안의 버튼) — 수량 버튼("일반 예매 수량 늘리기")과 이름이 겹치지 않게 목록 항목으로 좁힌다 */
const row = (
  area: import('@playwright/test').Locator | import('@playwright/test').Page,
  name: RegExp,
) => area.getByRole('listitem').getByRole('button', { name });

async function openSheet(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true').click();
  await expect(sheet(page)).toBeVisible();
}

scenario(
  'TKS-1',
  '모바일: [티켓 구매하기] → 시트에서 티켓을 고르고 수량을 올리면 금액이 바뀌고, 구매하면 체크아웃으로 간다',
  {
    kind: '정상',
    summary:
      '하단 [티켓 구매하기]가 바텀시트(열 때 마운트)를 연다. 줄을 누르면 고른 줄 강조 + "이름 · × / − 1 + · 금액" 줄. 수량 상한은 min(인당 제한, 잔여, 100). 시트의 [티켓 구매하기]는 시트를 닫고 체크아웃으로 — 뒤로가기는 상세(시트 닫힘).',
    basis: ['plan P6 V 범위', '와이어 528:2484 · 121:1406', 'patterns §6 오버레이 · §15 상한'],
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(EVENT);
    await step(
      '[티켓 구매하기]를 누르면 티켓 종류 시트가 열리고 구매 버튼은 비활성이다',
      async () => {
        await openSheet(page);
        await expect(sheet(page).getByRole('button', { name: '티켓 구매하기' })).toBeDisabled();
        await expect(row(sheet(page), /학생 할인/)).toBeDisabled();
      },
    );
    await step(
      '일반 예매(두둥 티켓)를 누르면 고른 줄 강조 · 수량 1 · 15,000원 줄과 두둥 티켓 안내 3줄이 나온다',
      async () => {
        await row(sheet(page), /일반 예매/).click();
        await expect(row(sheet(page), /일반 예매/)).toHaveAttribute('aria-pressed', 'true');
        await expect(sheet(page).getByRole('group', { name: '일반 예매 수량' })).toContainText('1');
        await expect(sheet(page).getByText('15,000원').last()).toBeVisible();
        // legal-copy A-4 원문
        await expect(
          sheet(page).getByText('호스트 계좌로 입금하면, 호스트가 확인한 뒤 티켓이 발급돼요.'),
        ).toBeVisible();
        await expect(
          sheet(page).getByText(
            '예매를 취소해도 자동으로 환불되지 않아요. 호스트에게 연락해 환불받아야 해요.',
          ),
        ).toBeVisible();
        await expect(
          sheet(page).getByText("호스트 연락처는 공연 상세의 '호스트'에서 볼 수 있어요."),
        ).toBeVisible();
      },
    );
    await step('+를 눌러 상한(인당 4매)까지 올리면 60,000원이고 +가 잠긴다', async () => {
      const plus = sheet(page).getByRole('button', { name: '일반 예매 수량 늘리기' });
      for (let i = 0; i < 3; i++) await plus.click();
      await expect(sheet(page).getByRole('group', { name: '일반 예매 수량' })).toContainText('4');
      await expect(sheet(page).getByText('60,000원')).toBeVisible();
      await expect(plus).toBeDisabled();
    });
    await step('뒤로가기를 누르면 시트만 닫히고, 다시 열면 고른 것이 남아 있다', async () => {
      await page.goBack();
      await expect(sheet(page)).toBeHidden();
      await expect(page).toHaveURL(/\/events\/101$/);
      await openSheet(page);
      await expect(sheet(page).getByRole('group', { name: '일반 예매 수량' })).toContainText('4');
    });
    await step('시트의 [티켓 구매하기]를 누르면 체크아웃 주소(티켓·수량)로 간다', async () => {
      await sheet(page).getByRole('button', { name: '티켓 구매하기' }).click();
      await expect(page).toHaveURL(/\/events\/101\/checkout\?ticketItemId=501&quantity=4/);
    });
    await step('체크아웃에서 뒤로가기를 누르면 시트가 닫힌 공연 상세다', async () => {
      await page.goBack();
      await expect(page).toHaveURL(/\/events\/101$/);
      await expect(
        page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연' }),
      ).toBeVisible();
      await expect(sheet(page)).toBeHidden();
    });
  },
);

scenario(
  'TKS-2',
  '다른 티켓을 누르면 1주문 1종류 경고가 뜨고, × 로 선택을 취소하면 다른 티켓을 고를 수 있다',
  {
    kind: '정상',
    summary:
      '이미 고른 티켓이 있을 때 다른 티켓을 누르면 선택은 그대로, 경고 두 줄(role=alert). 고른 줄의 ×(선택 취소)가 경고도 끈다. 무료 티켓에는 두둥 티켓 안내가 없다.',
    basis: ['plan P6 L 범위 1주문 1종류', '와이어 121:1517', 'patterns §15'],
  },
  async ({ page, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    await page.goto(EVENT);
    const area = desktop ? page.getByRole('complementary', { name: '예매' }) : sheet(page);
    if (!desktop) await openSheet(page);
    await step(
      '일반 예매를 고른 뒤 초대권을 누르면 경고가 뜨고 선택은 일반 예매 그대로다',
      async () => {
        await row(area, /일반 예매/).click();
        await row(area, /초대권/).click();
        const alert = area.getByRole('alert');
        await expect(alert).toContainText('티켓은 한 주문당 한 종류만 구매할 수 있습니다.');
        await expect(alert).toContainText(
          '다른 티켓의 구매를 원하실 경우 티켓 선택을 취소해주세요.',
        );
        await expect(area.getByRole('group', { name: '일반 예매 수량' })).toBeVisible();
      },
    );
    await step(
      '×(티켓 선택 취소)를 누르면 경고와 수량 줄이 사라지고 초대권을 고를 수 있다',
      async () => {
        await area.getByRole('button', { name: '티켓 선택 취소' }).click();
        await expect(area.getByRole('alert')).toHaveCount(0);
        await row(area, /초대권/).click();
        await expect(area.getByRole('group', { name: '초대권 수량' })).toBeVisible();
        await expect(area.getByText('무료').last()).toBeVisible();
        // 무료 티켓에는 두둥 티켓 안내(legal-copy A-4)가 없다
        await expect(area.getByText(/호스트 계좌로 입금하면/)).toHaveCount(0);
      },
    );
  },
);

scenario(
  'TKS-3',
  'PC(1440): 오른쪽 카드에서 바로 고르고, 고르기 전 [티켓 구매하기]는 비활성, 고른 뒤 누르면 체크아웃',
  {
    kind: '반응형',
    summary:
      '바텀시트 없이 카드 안에서 선택 — 고른 줄 강조 → "이름 · × / − 1 + · 금액" 줄 → [공유][티켓 구매하기].',
    basis: ['plan P6 PC', '와이어 640:15617'],
    viewports: ['desktop'],
  },
  async ({ page, step }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await setMockSession(page, 'loggedIn');
    await page.goto(EVENT);
    const aside = page.getByRole('complementary', { name: '예매' });
    await step('고르기 전에는 [티켓 구매하기]가 비활성이다', async () => {
      await expect(row(aside, /일반 예매/)).toBeVisible();
      await expect(aside.getByRole('button', { name: '티켓 구매하기' })).toBeDisabled();
    });
    await step('일반 예매를 고르고 +를 한 번 누르면 2매 · 30,000원이다', async () => {
      await row(aside, /일반 예매/).click();
      await aside.getByRole('button', { name: '일반 예매 수량 늘리기' }).click();
      await expect(aside.getByRole('group', { name: '일반 예매 수량' })).toContainText('2');
      await expect(aside.getByText('30,000원')).toBeVisible();
    });
    await step('[티켓 구매하기]를 누르면 체크아웃으로 간다', async () => {
      await aside.getByRole('button', { name: '티켓 구매하기' }).click();
      await expect(page).toHaveURL(/\/events\/101\/checkout\?ticketItemId=501&quantity=2/);
    });
  },
);

scenario(
  'TKS-4',
  '1024 경계를 넘나들어도 선택이 유지되고, 시트를 연 채 PC 폭이 되면 시트가 닫힌다',
  {
    kind: '반응형',
    summary:
      'PC 카드에서 고른 뒤 모바일 폭으로 줄여 시트를 열면 같은 선택. 시트를 연 채 다시 넓히면 시트는 닫히고 카드에 같은 선택.',
    basis: ['plan P6 완료 기준 V(1024 경계)', 'patterns §1'],
    viewports: ['desktop'],
  },
  async ({ page, step }) => {
    await page.goto(EVENT);
    const aside = page.getByRole('complementary', { name: '예매' });
    await step('PC(1280)에서 일반 예매 3매를 고른다', async () => {
      await row(aside, /일반 예매/).click();
      const plus = aside.getByRole('button', { name: '일반 예매 수량 늘리기' });
      await plus.click();
      await plus.click();
      await expect(aside.getByRole('group', { name: '일반 예매 수량' })).toContainText('3');
    });
    await step('390으로 줄여 [티켓 구매하기]로 시트를 열면 3매가 그대로다', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openSheet(page);
      await expect(sheet(page).getByRole('group', { name: '일반 예매 수량' })).toContainText('3');
    });
    await step('시트를 연 채 1280으로 넓히면 시트가 닫히고 카드에 3매가 남는다', async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(sheet(page)).toBeHidden();
      await expect(aside.getByRole('group', { name: '일반 예매 수량' })).toContainText('3');
    });
  },
);

scenario(
  'TKS-5',
  '매진 · 판매 중단(딤드) · 판매 종료 티켓은 고를 수 없고, 판매 중단은 잔여를 숨긴다',
  {
    kind: '빈 상태',
    summary:
      '판매 중단(isSuspended)은 글자를 흐리게 + "판매 중단" 칩, 남은 수량·매진은 숨긴다(P6-V 결정). 매진은 "매진", 판매 불가(PG 결제 티켓 등)는 "판매 종료". 셋 다 비활성 버튼.',
    basis: ['plan P6 판매 중단 딤드 · 완료 기준 V', 'ticket-state.ts', 'design-requests Q33'],
  },
  async ({ page, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    // 일반 예매 → 판매 중단(잔여 42는 서버가 그대로 준다), 초대권 → PG 결제(판매 불가)
    await page.route('**/api/v2/events/101/ticket-items', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      json.data[0] = { ...json.data[0], isSuspended: true, isPurchasable: false };
      json.data[2] = { ...json.data[2], payType: 'PRICE', isPurchasable: false };
      await route.fulfill({ response: res, json });
    });
    await page.goto(EVENT);
    const area = desktop ? page.getByRole('complementary', { name: '예매' }) : page;
    await step('세 티켓 모두 고를 수 없고 상태 칩이 보인다', async () => {
      if (!desktop) {
        // 살 수 있는 티켓이 없으면 모바일 [티켓 구매하기]가 잠긴다 — 시트를 열 수 없어 상세의 표시 카드로 본다
        await expect(
          page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true'),
        ).toBeDisabled();
        const list = page.getByRole('list', { name: '티켓 옵션' }).locator('visible=true');
        await expect(list.getByText('판매 중단')).toBeVisible();
        await expect(list.getByText('매진')).toBeVisible();
        await expect(list.getByText('판매 종료')).toBeVisible();
        await expect(list.getByText(/잔여/)).toHaveCount(0);
        return;
      }
      for (const name of [/일반 예매/, /학생 할인/, /초대권/]) {
        await expect(row(area, name)).toBeDisabled();
      }
      await expect(row(area, /일반 예매/)).toContainText('판매 중단');
      await expect(row(area, /일반 예매/)).not.toContainText('잔여');
      await expect(row(area, /학생 할인/)).toContainText('매진');
      await expect(row(area, /초대권/)).toContainText('판매 종료');
      await expect(area.getByRole('button', { name: '티켓 구매하기' })).toBeDisabled();
    });
  },
);

scenario(
  'TKS-6',
  '판매 중단 티켓이 섞여 있어도 나머지는 고를 수 있다',
  {
    kind: '정상',
    summary:
      '판매 중단 하나 + 구매 가능 하나(mock 세트 suspended). 중단 줄은 비활성, 일반은 고를 수 있다.',
    basis: ['plan P6 판매 중단 딤드', 'ticket-item.handlers suspended'],
    mocks: [...ticketItemHandlers.suspended],
  },
  async ({ page, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    await page.goto(EVENT);
    if (!desktop) await openSheet(page);
    const area = desktop ? page.getByRole('complementary', { name: '예매' }) : sheet(page);
    await step('현장 판매분(판매 중단)은 잠겨 있고 일반을 고르면 수량 줄이 나온다', async () => {
      await expect(row(area, /현장 판매분/)).toBeDisabled();
      await row(area, /^일반/).click();
      await expect(area.getByRole('group', { name: '일반 수량' })).toBeVisible();
      await expect(area.getByRole('button', { name: '티켓 구매하기' })).toBeEnabled();
    });
  },
);

scenario(
  'TKS-7',
  '지난 공연이면 티켓이 남아 있어도 목록 대신 "지난 공연이에요"이고 [티켓 구매하기]가 잠긴다',
  {
    kind: '빈 상태',
    summary: '지난 공연(GP-3 displayStatus PAST)은 서버가 티켓을 남겨 줘도 목록 대신 문구.',
    basis: ['plan P6 완료 기준 V(PAST)', 'ticket-state ticketListState'],
    mocks: [...ticketItemHandlers.pastEvent],
  },
  async ({ page, step }) => {
    await step('지난 공연(90)을 열면 "지난 공연이에요"와 잠긴 [티켓 구매하기]', async () => {
      await page.goto('/events/90');
      await expect(page.getByText('지난 공연이에요').locator('visible=true')).toBeVisible();
      await expect(
        page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true'),
      ).toBeDisabled();
    });
  },
);

scenario(
  'TKS-8',
  '모든 티켓이 매진이면 목록은 보이고 [티켓 구매하기]가 잠긴다',
  {
    kind: '빈 상태',
    summary: 'mock 세트 soldOut — 두 티켓 모두 "매진" 칩, 고를 수 없다.',
    basis: ['plan P6 완료 기준 V(매진)', 'ticket-item.handlers soldOut'],
    mocks: [...ticketItemHandlers.soldOut],
  },
  async ({ page, step }) => {
    await page.goto(EVENT);
    await step('"매진" 칩 둘과 잠긴 [티켓 구매하기]', async () => {
      const list = page.getByRole('list', { name: '티켓 옵션' }).locator('visible=true');
      await expect(list.getByText('매진')).toHaveCount(2);
      await expect(
        page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true'),
      ).toBeDisabled();
    });
  },
);
