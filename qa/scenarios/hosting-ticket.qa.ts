import type { Page, TestInfo } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { pickOption } from '../../e2e/support/event-scope';
import { createStoredEvent } from '../../src/api/__mocks__/event-store';
import { HOST_GOSROCK } from '../../src/api/__mocks__/fixtures/event';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { actAsRole } from '../../src/api/__mocks__/host-store';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * P12-V 티켓 관리 · 새 티켓 · 티켓 수정 · 옵션(plan P12 완료 기준 V, Design Sync #46~#51).
 * GUI 근거(Ready for dev): 목록 빈 `767:46535`·`821:26240`, 있음 `767:50048`·`767:46943`, 옵션 있음 `913:949`·`955:2980`, 옵션 가이드
 * `924:1281`·`956:3157`, 옵션 추가 시트 `931:1291`·`931:1356`·`940:13011`·`956:3281`~`956:3647`, 새 옵션 `932:1544`·`932:1621`·`940:8060`·
 * `956:3753`~`956:4063`, 옵션 상세·수정 `943:2200`·`943:2398`·`933:1822`·`933:2015`·`944:2455`·`956:5804`~`956:6587`, 새 티켓
 * `767:46560`·`767:46664`·`821:23712`·`821:25116`·`821:25649`, 관리자 승인이란 `971:21949`. PC 캡처는 Figma 프레임과 같은 1440.
 * 티켓 수정·⋮ 메뉴·확인 창·판매 중단 칩은 디자인 없음(DS · Figma 코멘트).
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 호스팅 센터(로그인 게이트 안, 서버 조회 없음)
 * - 에러: 화면 코드(patterns §24 P12)는 L 훅 테스트·e2e `hosting-ticket.spec`이 본다. 여기서는 목록 조회 실패(다시 시도)만
 * - 반응형: 모든 시나리오 mobile · desktop(1440). 모바일 폼은 공연 헤더 대신 ← 제목 헤더, PC 폼은 두 열
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
};

async function setUp(page: Page, testInfo: TestInfo) {
  reset();
  if (testInfo.project.name === 'desktop')
    await page.setViewportSize({ width: 1440, height: 1024 });
  await setMockSession(page, 'loggedIn');
}

const card = (page: Page, name: string) =>
  page.getByTestId('ticket-card').filter({ hasText: name });

scenario(
  'HT-1',
  '빈 목록 — 안내 두 줄 · "티켓 옵션이란?" · 일러스트 + [+ 새 티켓 만들기]',
  {
    kind: '빈 상태',
    summary: '티켓이 없는 준비중 공연(140). FAB 대신 빈 상태 버튼이 새 티켓 만들기로 간다.',
    basis: ['GUI 767:46535 · 821:26240', 'plan P12 V 범위(빈 상태)'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('티켓 관리를 열면 빈 상태와 [새 티켓 만들기]가 보인다', async () => {
      await page.goto('/hosting/events/140/tickets');
      await expect(page.getByTestId('tickets-empty')).toHaveText('만든 티켓이 없어요');
      await expect(
        page.getByText('*예매가 발생한 티켓은 삭제할 수 없어요.', { exact: false }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '티켓 옵션이란?' })).toBeVisible();
    });
    await step('버튼을 누르면 새 티켓 만들기로 간다', async () => {
      await page.getByRole('link', { name: '새 티켓 만들기' }).click();
      await expect(page).toHaveURL('/hosting/events/140/tickets/new');
    });
  },
);

scenario(
  'HT-2',
  '목록 — 카드(칩 "판매 중" · 가격 · 재고 칩) · 옵션 행 · 판매된 티켓은 [티켓 옵션 추가] 없음',
  {
    kind: '정상',
    summary:
      '공연 101: 판매된 "일반 예매"는 옵션이 › (상세)로만, 판매 전 "초대권"은 [티켓 옵션 추가]. 칩 문구는 띄어 쓴 "판매 중"(#46).',
    basis: ['GUI 913:949 · 955:2980 · 767:50048 · 767:46943', '#46 · #48'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('카드 3장과 칩·재고·옵션 행이 보인다', async () => {
      await page.goto('/hosting/events/101/tickets');
      await expect(page.getByTestId('ticket-card')).toHaveCount(3);
      const sold = card(page, '일반 예매');
      await expect(sold.getByTestId('ticket-chip')).toHaveText('판매 중');
      await expect(sold.getByTestId('ticket-stock')).toHaveText('42/100매 (공개)');
      await expect(sold.getByRole('button', { name: '뒤풀이 참석 옵션 상세' })).toBeVisible();
      await expect(sold.getByRole('button', { name: '티켓 옵션 추가' })).toHaveCount(0);
      await expect(sold.getByRole('button', { name: /옵션 빼기/ })).toHaveCount(0);
      await expect(
        card(page, '초대권').getByRole('button', { name: '티켓 옵션 추가' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '새 티켓 만들기' })).toBeVisible();
    });
  },
);

scenario(
  'HT-3',
  '"티켓 옵션이란?" — 가이드 시트(모바일) · 모달(PC), 예시 두 줄 · 수정 정책 안내',
  {
    kind: '정상',
    summary:
      '본문의 "입금자명" 예시는 뺐다(약관 제19조⑥ 금지 규칙 — implementation-log P12-V 결정).',
    basis: ['GUI 924:1281 · 956:3157', '#49', 'plan P12 L 금지 규칙'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    await step('누르면 가이드가 열린다', async () => {
      await page.getByRole('button', { name: '티켓 옵션이란?' }).click();
      const guide = page.getByTestId('option-guide');
      await expect(guide).toContainText('예시1) 학번을 입력해 주세요');
      await expect(guide).toContainText('판매가 시작되면 옵션 이름과 설명만 바꿀 수 있어요.');
      await expect(guide).not.toContainText('입금자명');
    });
    await step('[확인]으로 닫힌다', async () => {
      await page.getByRole('button', { name: '확인' }).click();
      await expect(page.getByTestId('option-guide')).toHaveCount(0);
    });
  },
);

scenario(
  'HT-4',
  '옵션 추가 시트 — 고르면 "1개 추가하기" → 토스트 · 카드에 ✕ 옵션 행',
  {
    kind: '정상',
    summary:
      '무료 티켓(초대권)에는 유료 옵션이 목록에 없다. 고른 개수를 버튼에 보이고(#50), 붙이면 "옵션을 추가했어요." 토스트(`940:12677`). 판매 전 티켓의 옵션 행은 ✕(빼기, #48).',
    basis: ['GUI 931:1291 · 931:1356 · 940:12677 · 956:3281 · 956:3403', '#48 · #50'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    const sheet = page.getByRole('dialog', { name: '티켓 옵션 추가하기' });
    await step('[티켓 옵션 추가]를 누르면 시트가 열리고 [추가하기]는 비활성', async () => {
      await card(page, '초대권').getByRole('button', { name: '티켓 옵션 추가' }).click();
      await expect(sheet.getByRole('checkbox', { name: '응원하는 멤버' })).toBeVisible();
      await expect(sheet.getByRole('checkbox', { name: '뒤풀이 참석' })).toHaveCount(0);
      await expect(sheet.getByRole('button', { name: '추가하기' })).toBeDisabled();
    });
    await step('옵션을 고르면 "1개 추가하기"', async () => {
      await sheet.getByRole('checkbox', { name: '응원하는 멤버' }).click();
      await expect(sheet.getByRole('button', { name: '1개 추가하기' })).toBeEnabled();
    });
    await step('누르면 토스트와 함께 카드에 ✕ 옵션 행이 생긴다', async () => {
      await sheet.getByRole('button', { name: '1개 추가하기' }).click();
      await expect(page.getByText('옵션을 추가했어요.')).toBeVisible();
      await expect(
        card(page, '초대권').getByRole('button', { name: '응원하는 멤버 옵션 빼기' }),
      ).toBeVisible();
    });
  },
);

scenario(
  'HT-5',
  '새 옵션 직접 만들기 — 네/아니오 고르면 가격 토글, 입력한 채 닫으면 확인 창',
  {
    kind: '정상',
    summary:
      '무료 티켓이라 가격 토글은 잠긴다(무료 티켓에는 유료 옵션 불가 — L). 입력이 있으면 "옵션 만들기를 그만둘까요?"(`940:8060`).',
    basis: ['GUI 932:1544 · 932:1621 · 940:8060 · 956:3753~956:4063', '#51'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    await card(page, '초대권').getByRole('button', { name: '티켓 옵션 추가' }).click();
    const create = page.getByRole('dialog', { name: '새 옵션 직접 만들기' });
    await step('[새 옵션 직접 만들기]를 누르면 만들기 화면', async () => {
      await page.getByRole('button', { name: '새 옵션 직접 만들기' }).click();
      await expect(create.getByLabel('옵션 이름')).toBeVisible();
    });
    await step(
      '이름을 쓰고 네/아니오를 고르면 가격 토글이 보인다(무료 티켓이라 잠김)',
      async () => {
        await create.getByLabel('옵션 이름').fill('좋은 자리 선점');
        await create.getByRole('radio', { name: '네/아니오' }).click();
        await expect(
          create.getByRole('switch', { name: "'네' 선택 시 가격 추가하기" }),
        ).toBeDisabled();
      },
    );
    await step('Esc로 닫으면 그만둘지 묻는다 → [계속 수정하기]면 그대로', async () => {
      await page.keyboard.press('Escape');
      const confirm = page.getByRole('alertdialog', { name: '옵션 만들기를 그만둘까요?' });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: '계속 수정하기' }).click();
      await expect(create.getByLabel('옵션 이름')).toHaveValue('좋은 자리 선점');
    });
  },
);

scenario(
  'HT-6',
  '옵션 상세 → [수정] — 판매된 티켓의 옵션은 이름·설명만, 안내 줄',
  {
    kind: '정상',
    summary:
      '상세는 칸이 모두 비활성 + [✎ 수정](`943:2200`). 잠긴 옵션의 수정 화면은 노란 안내 + 형식·가격 잠금(`933:2015`). 저장 버튼은 바꾼 게 없으면 비활성.',
    basis: ['GUI 943:2200 · 933:2015 · 956:5804 · 956:6264', 'plan P12 L(잠긴 옵션은 이름·설명만)'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    await step('옵션 행을 누르면 상세(칸 비활성)', async () => {
      await card(page, '일반 예매').getByRole('button', { name: '뒤풀이 참석 옵션 상세' }).click();
      const detail = page.getByTestId('option-detail');
      await expect(detail.getByLabel('옵션 이름')).toBeDisabled();
      await expect(detail.getByRole('button', { name: '수정' })).toBeVisible();
    });
    await step('[수정]을 누르면 이름·설명만 고칠 수 있다', async () => {
      await page.getByRole('button', { name: '수정' }).click();
      await expect(
        page.getByText('판매가 시작돼서 옵션 이름과 설명만 바꿀 수 있어요.'),
      ).toBeVisible();
      await expect(page.getByLabel('옵션 이름')).toBeEnabled();
      await expect(page.getByRole('radio', { name: '주관식' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
    });
    await step('설명을 고쳐 저장하면 "옵션을 수정했어요."', async () => {
      await page.getByLabel('옵션 설명').fill('공연 끝나고 근처에서 함께해요');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByText('옵션을 수정했어요.')).toBeVisible();
    });
  },
);

scenario(
  'HT-7',
  '새 티켓 만들기(두둥) — 기본값 무제한 · 재고 공개 꺼짐·비활성 · 승인 켜짐·잠김, 토글을 켜면 매수·판매 기간 칸',
  {
    kind: '정상',
    summary:
      'GUI 기본값 "재고 공개 On"은 무제한과 함께 서버가 거부해(Ticket_Item_400_15) 꺼짐·비활성(plan P12 V). 은행명은 서버 목록에서 고른다(사용자 결정 2026-10-31).',
    basis: [
      'plan P12 완료 기준 V(라벨 · 무제한이면 재고 공개 비활성)',
      'GUI 767:46560 · 767:46664 · 821:25116 · 821:25649',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('폼을 열면 두둥 티켓 · 무제한이 골라져 있고 재고 공개가 비활성', async () => {
      await page.goto('/hosting/events/140/tickets/new');
      await expect(page.getByRole('radio', { name: '두둥 티켓' })).toBeChecked();
      await expect(page.getByRole('radio', { name: '무료 티켓' })).toBeVisible();
      await expect(page.getByRole('radio', { name: '무제한' })).toBeChecked();
      await expect(page.getByRole('switch', { name: '재고 정보 공개' })).toBeDisabled();
      await expect(page.getByRole('switch', { name: '관리자 승인 여부' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '티켓 만들기' })).toBeDisabled();
    });
    await step('매수 제한·판매 기간을 켜면 칸이 열린다, 은행은 목록에서 고른다', async () => {
      await page.getByLabel('티켓 이름').fill('얼리버드');
      await page.getByLabel('가격').fill('6000');
      await pickOption(page, '은행', '신한은행');
      await page.getByRole('switch', { name: '구매 가능 매수 제한' }).click();
      await page.getByRole('switch', { name: '판매 기간 설정' }).click();
      await expect(page.getByLabel('1인 최대 매수')).toBeVisible();
      await expect(page.getByTestId('sale-period')).toBeVisible();
      await expect(page.getByRole('button', { name: '티켓 만들기' })).toBeEnabled();
    });
  },
);

scenario(
  'HT-8',
  '무료 티켓 — 가격·계좌 없음, 승인 토글이 열린다 · ⓘ "관리자 승인이란?" 팝업',
  {
    kind: '정상',
    summary: '관리자 승인 안내는 DS 다이얼로그(버튼 하나) — GUI `971:21949`(#47) 문구 그대로.',
    basis: ['GUI 821:23712 · 971:21949', '#47'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/140/tickets/new');
    await step('무료 티켓을 고르면 가격·계좌 칸이 사라지고 승인 토글이 열린다', async () => {
      await page.getByRole('radio', { name: '무료 티켓' }).click();
      await expect(page.getByLabel('가격')).toHaveCount(0);
      await expect(page.getByLabel('예금주')).toHaveCount(0);
      await expect(page.getByRole('switch', { name: '관리자 승인 여부' })).toBeEnabled();
    });
    await step('ⓘ를 누르면 "관리자 승인이란?"', async () => {
      await page.getByRole('button', { name: '관리자 승인이란?' }).click();
      const dialog = page.getByRole('alertdialog', { name: '관리자 승인이란?' });
      await expect(dialog).toContainText('예매자 관리 페이지에서 가능해요');
      await dialog.getByRole('button', { name: '확인' }).click();
      await expect(dialog).toHaveCount(0);
    });
  },
);

scenario(
  'HT-9',
  '⋮ 메뉴 — 판매된 티켓은 [수정하기 · 판매 중단], 판매 중단 → 확인 → 토스트 · 칩 "판매 중단" → 재개',
  {
    kind: '정상',
    summary:
      'GUI #55~#57(더보기 · 판매 중단 · 판매 재개 — 확인 창 · 토스트 문구). 판매 전 티켓 메뉴는 [수정하기 · 삭제하기].',
    basis: [
      'plan P12 L(⋮ 메뉴 isSold || hasPendingOrders)',
      '와이어 503:25427(판매 중단 확인 문구)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    const sold = card(page, '일반 예매');
    await step('⋮을 누르면 [수정하기 · 판매 중단]', async () => {
      await sold.getByRole('button', { name: '일반 예매 메뉴' }).click();
      await expect(page.getByRole('menuitem')).toHaveText(['수정하기', '판매 중단']);
    });
    await step('[판매 중단] → 확인하면 칩이 "판매 중단"', async () => {
      await page.getByRole('menuitem', { name: '판매 중단' }).click();
      const dialog = page.getByRole('alertdialog', {
        name: '[일반 예매] 티켓의 판매를 중단할까요?',
      });
      await dialog.getByRole('button', { name: '중단' }).click();
      await expect(page.getByText('티켓의 판매를 중단했어요.')).toBeVisible();
      await expect(sold.getByTestId('ticket-chip')).toHaveText('판매 중단');
    });
    await step('[판매 재개] → 확인하면 다시 "판매 중"', async () => {
      await sold.getByRole('button', { name: '일반 예매 메뉴' }).click();
      await page.getByRole('menuitem', { name: '판매 재개' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '확인' }).click();
      await expect(page.getByText('티켓을 다시 판매하기 시작했어요.')).toBeVisible();
      await expect(sold.getByTestId('ticket-chip')).toHaveText('판매 중');
    });
  },
);

scenario(
  'HT-10',
  '티켓 수정(와이어) — 판매된 티켓은 노란 안내 · 이름·가격 잠금, [저장하기]',
  {
    kind: '정상',
    summary: 'GUI에 수정 화면이 없어 새 티켓 폼을 그대로 쓰고 잠긴 칸은 서버 기준(L locks).',
    basis: ['plan P12 V(티켓 수정 — 와이어)', 'gui-screens §0 티켓 수정'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('판매된 티켓의 수정 화면', async () => {
      await page.goto('/hosting/events/101/tickets/501');
      await expect(page.getByTestId('ticket-locked')).toBeVisible();
      await expect(page.getByLabel('티켓 이름')).toHaveAttribute('readonly', '');
      await expect(page.getByLabel('가격')).toHaveAttribute('readonly', '');
      await expect(page.getByRole('button', { name: '저장하기' })).toBeDisabled();
    });
  },
);

scenario(
  'HT-11',
  '티켓 없음 공연 — 안내만, 추가 버튼 없음',
  {
    kind: '빈 상태',
    summary: '서버도 Ticket_Item_400_12로 막는다. 새 티켓 주소는 읽기 전용 안내.',
    basis: ['plan P12 완료 기준 V(티켓 없음 공연에서 추가 버튼이 없음)'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    const event = createStoredEvent({
      host: HOST_GOSROCK,
      name: '버스킹',
      startAt: '2030.05.01 19:00',
      endAt: '2030.05.01 21:00',
      hasTicket: false,
    });
    await step('목록에 안내가 있고 [새 티켓 만들기]가 없다', async () => {
      await page.goto(`/hosting/events/${event.eventId}/tickets`);
      await expect(page.getByTestId('no-ticket-event')).toBeVisible();
      await expect(page.getByRole('link', { name: '새 티켓 만들기' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '새 티켓 만들기' })).toHaveCount(0);
    });
  },
);

scenario(
  'HT-12',
  '일반 멤버 — ⋮ 메뉴 · 새 티켓 · 옵션 추가가 없다',
  {
    kind: '권한',
    summary: '권한은 L(can) 판정 — 화면은 보기만.',
    basis: ['patterns §22', 'api-contract §2'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    actAsRole(11, 'GUEST');
    await step('카드는 보이지만 메뉴·추가 버튼이 없다', async () => {
      await page.goto('/hosting/events/101/tickets');
      await expect(page.getByTestId('ticket-card')).toHaveCount(3);
      await expect(
        page.getByTestId('ticket-card').getByRole('button', { name: /메뉴$/ }),
      ).toHaveCount(0);
      await expect(page.getByRole('button', { name: '새 티켓 만들기' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '티켓 옵션 추가' })).toHaveCount(0);
    });
  },
);

scenario(
  'HT-13',
  '목록 조회 실패 — 안내 + [다시 시도]',
  {
    kind: '에러',
    summary: '디자인 없음 — 회색 한 줄 + DS 버튼.',
    basis: ['patterns §11'],
    mocks: [
      http.get('*/api/v2/events/101/ticket-items/manage', () =>
        HttpResponse.json(envelope.error(500, 'INTERNAL_SERVER_ERROR'), { status: 500 }),
      ),
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('목록을 못 불러오면 [다시 시도]가 보인다', async () => {
      await page.goto('/hosting/events/101/tickets');
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible({
        timeout: 15_000,
      });
    });
  },
);

scenario.manual('HT-14', '판매 중단한 티켓이 공연 상세 티켓 선택에 "판매 중단"으로 흐리게 보인다', {
  kind: '정상',
  basis: ['plan P12 완료 기준 V(판매 중단 → 재개가 공연 상세 화면에 반영, P6-V 뒤)'],
  how: '`pnpm dev:mock` → /hosting/events/101/tickets 에서 "일반 예매" 판매 중단 → /events/101 PC 오른쪽 카드 · 모바일 [티켓 구매하기] 시트에서 "판매 중단" 흐림 확인 → 재개하면 다시 고를 수 있다. 2026-11-01 ego-browser로 확인함(PC 1200).',
});

scenario(
  'HT-15',
  '판매 전 티켓 — ⋮ [수정하기 · 삭제하기] → 삭제 확인 → "티켓을 삭제했어요."',
  {
    kind: '정상',
    summary:
      '판매 전 티켓은 판매 중단 없이 삭제만(GUI #55). 확인 창 "[이름] 티켓을 삭제할까요? / 삭제한 티켓은 복구할 수 없어요."',
    basis: ['GUI 958:20392 · 958:20537 · 958:20680 · 975:8299', '#55'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    await step('⋮을 누르면 [수정하기 · 삭제하기]', async () => {
      await card(page, '초대권').getByRole('button', { name: '초대권 메뉴' }).click();
      await expect(page.getByRole('menuitem')).toHaveText(['수정하기', '삭제하기']);
    });
    await step('[삭제하기] → 확인 창', async () => {
      await page.getByRole('menuitem', { name: '삭제하기' }).click();
      await expect(
        page.getByRole('alertdialog', { name: '[초대권] 티켓을 삭제할까요?' }),
      ).toContainText('삭제한 티켓은 복구할 수 없어요.');
    });
    await step('[삭제]를 누르면 토스트와 함께 카드가 사라진다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click();
      await expect(page.getByText('티켓을 삭제했어요.')).toBeVisible();
      await expect(page.getByTestId('ticket-card')).toHaveCount(2);
    });
  },
);

scenario(
  'HT-16',
  '옵션 ✕ — "티켓 옵션을 삭제할까요?" 확인 → "옵션을 삭제했어요." (이 티켓에서만 뺀다)',
  {
    kind: '정상',
    summary:
      'GUI #54 문구 그대로. 동작은 L 계획대로 이 티켓에서 빼기(옵션 목록에는 남는다) — 옵션 자체 삭제는 상세의 [옵션 삭제](PR 사용자 대기).',
    basis: [
      'GUI 934:2034 · 934:2127 · 956:6693 · 956:6809',
      '#48 · #54',
      'plan P12 L(삭제와 떼기 구분)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/tickets');
    const free = card(page, '초대권');
    await step('옵션을 하나 붙이면 ✕가 보인다', async () => {
      await free.getByRole('button', { name: '티켓 옵션 추가' }).click();
      const sheet = page.getByRole('dialog', { name: '티켓 옵션 추가하기' });
      await sheet.getByRole('checkbox', { name: '응원하는 멤버' }).click();
      await sheet.getByRole('button', { name: '1개 추가하기' }).click();
      await expect(free.getByRole('button', { name: '응원하는 멤버 옵션 빼기' })).toBeVisible();
    });
    await step('✕ → 확인 창', async () => {
      await free.getByRole('button', { name: '응원하는 멤버 옵션 빼기' }).click();
      await expect(
        page.getByRole('alertdialog', { name: '티켓 옵션을 삭제할까요?' }),
      ).toContainText('삭제한 옵션은 되돌릴 수 없어요.');
    });
    await step('[삭제]를 누르면 토스트와 함께 행이 사라진다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click();
      await expect(page.getByText('옵션을 삭제했어요.')).toBeVisible();
      await expect(free.getByRole('list', { name: '초대권 옵션' })).toHaveCount(0);
    });
  },
);
