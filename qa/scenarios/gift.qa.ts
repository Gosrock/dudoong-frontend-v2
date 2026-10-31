import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import {
  GIFT_TOKEN,
  MISSING_GIFT_TOKEN,
  NEW_APPROVED_ORDER_UUID,
  resetTicketStore,
  TICKET_UUID,
} from '../../src/api/__mocks__/fixtures/my-ticket';
import { giftHandlers } from '../../src/api/__mocks__/gift.handlers';
import { expect, scenario } from '../scenario';

/**
 * 선물하기 · 선물 랜딩(plan P8b 완료 기준 V). 근거:
 * - 보내기 GUI(Ready 섹션 `908:3276`): 선물하기 시트 `908:12032`(#19 문구 + 유의사항 확인 체크) · 링크 생성 완료 `908:13105` ·
 *   복사 토스트 `908:21508` · 취소 완료 `908:21359` · 반송 완료 `908:23165`(이 둘은 `tickets.qa` TIX-5 · TIX-6)
 * - 랜딩 GUI(Ready `939:27148`): 로그인 `939:26721` · 비로그인 `939:26412` · 거절 확인 `939:26858` · 거절 완료 `939:26992` · 취소된 선물 `939:27058`
 * - 나머지 `viewState`(이미 받음 · 거절됨 · 반환됨 · 내 링크 · 만료 · 모름)는 디자인 없음 — 같은 틀에 L 문구(Figma 코멘트)
 *
 * 범주 검토
 * - 권한: 보낸 본인(OWN_LINK)에게 수락 버튼이 없다(GIFT-6), 익명은 로그인 안내(GIFT-4)
 * - 크롤러: GIFT-8(404) — OG 내용은 e2e `gift-landing.spec`
 * - 반응형: PC GUI 없음 — 모바일 묶음을 가운데에(GIFT-9 1280)
 */

const TAB = '/tickets';
const landing = (token: string) => `/gifts/${token}`;
const statusArea = (page: Page) => page.getByRole('region', { name: '선물 상태' });

/** 묶음 카드를 가운데로 넘기고 눌러 입장 QR 층을 연다 */
async function openQr(page: Page, groupKey: string) {
  const group = page.locator(`[id="group-${groupKey}"]`);
  if ((await group.getAttribute('data-active')) !== 'true') await group.getByRole('button').click();
  await expect(group).toHaveAttribute('data-active', 'true');
  await group.getByRole('button', { name: '입장 QR 보기' }).click();
  const layer = page.getByRole('dialog', { name: '입장 QR' });
  await expect(layer).toBeVisible();
  return layer;
}

scenario(
  'GIFT-1',
  '[선물하기] → 유의사항 체크 → 링크 생성 완료 → 메모 · 링크 복사 → 티켓탭에서 선물중',
  {
    kind: '정상',
    summary:
      '#19 — 체크해야 [티켓 선물하기]가 눌린다(PG-1 본문은 그대로). 링크 생성 완료 화면에서 메모(PG-8)를 칸을 떠날 때 저장하고, [링크복사]는 토스트, [메세지]는 sms: 링크.',
    basis: ['plan P8b V 범위 · #19', 'GUI 908:12032 · 908:13105 · 908:21508', 'patterns §18 공유'],
    viewports: ['mobile'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(TAB);
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    const sheet = page.getByRole('dialog', { name: '티켓을 선물할까요?' });
    const send = sheet.getByRole('button', { name: '티켓 선물하기' });
    await step(
      '[선물하기]를 누르면 "티켓을 선물할까요?" 시트 — 체크 전에는 보낼 수 없다',
      async () => {
        await layer.getByRole('button', { name: '선물하기' }).click();
        await expect(sheet).toBeVisible();
        await expect(sheet.getByText('링크 공유를 통해 티켓을 선물할 수 있어요.')).toBeVisible();
        await expect(send).toBeDisabled();
      },
    );
    await step('유의사항 확인을 체크하면 [티켓 선물하기]가 눌린다', async () => {
      await sheet
        .getByRole('checkbox', { name: '티켓 선물하기 관련 유의사항을 확인했습니다.' })
        .check();
      await expect(send).toBeEnabled();
    });
    await step(
      '[티켓 선물하기] → "선물 링크 생성 완료!" 화면(메모 칸 · 공유 버튼 3개)',
      async () => {
        await send.click();
        await expect(page.getByRole('heading', { name: '선물 링크 생성 완료!' })).toBeVisible();
        await expect(page.getByTestId('gift-link')).toHaveAttribute(
          'data-value',
          /\/gifts\/mock-gift-new-\d+$/,
        );
        await expect(page.getByRole('link', { name: '메세지' })).toHaveAttribute(
          'href',
          /^sms:\?body=/,
        );
        const posts = mockApi.calls().filter((c) => c.method === 'POST');
        expect(posts.map((c) => c.path)).toEqual([
          `/api/v2/me/tickets/${TICKET_UUID.approved}/gift`,
        ]);
      },
    );
    await step('메모를 쓰고 칸을 떠나면 저장된다(PG-8)', async () => {
      const memo = page.getByRole('textbox', { name: '선물 대상 메모' });
      await memo.fill('대학 동기 민수');
      await memo.blur();
      await expect(page.getByText('메모를 저장했어요')).toBeVisible();
      expect(
        mockApi
          .calls()
          .filter((c) => c.method === 'PATCH' && c.path.startsWith('/api/v2/me/gifts/')),
      ).toHaveLength(1);
    });
    await step('[링크복사]를 누르면 "링크가 클립보드에 복사되었습니다!" 토스트', async () => {
      await page.getByRole('button', { name: '링크복사' }).click();
      await expect(page.getByText('링크가 클립보드에 복사되었습니다!')).toBeVisible();
    });
    await step('[티켓 페이지로] → 티켓탭, 같은 티켓은 선물중', async () => {
      await page.getByRole('button', { name: '티켓 페이지로' }).click();
      await openQr(page, NEW_APPROVED_ORDER_UUID);
      await expect(page.getByTestId('qr-notice')).toHaveText('선물중인 티켓');
    });
  },
);

scenario(
  'GIFT-2',
  '보내기가 Gift_400_1이면 시트 안에 안내',
  {
    kind: '에러',
    summary: 'patterns §24 P8b — 지금은 선물할 수 없는 티켓. T-2를 다시 읽고 시트에 안내한다.',
    basis: ['patterns §24 P8b', 'gift-errors.ts send'],
    viewports: ['mobile'],
    mocks: giftHandlers.fails('create', 'Gift_400_1'),
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    await layer.getByRole('button', { name: '선물하기' }).click();
    const sheet = page.getByRole('dialog', { name: '티켓을 선물할까요?' });
    await sheet
      .getByRole('checkbox', { name: '티켓 선물하기 관련 유의사항을 확인했습니다.' })
      .check();
    await step('[티켓 선물하기] → "지금은 선물할 수 없는 티켓이에요"', async () => {
      await sheet.getByRole('button', { name: '티켓 선물하기' }).click();
      await expect(sheet.getByRole('alert')).toHaveText('지금은 선물할 수 없는 티켓이에요');
    });
  },
);

scenario(
  'GIFT-3',
  '받는 사람(로그인): 포스터 · 공연 · [거절하기] [선물받기] → 받으면 티켓탭',
  {
    kind: '정상',
    summary: 'GUI 939:26721. PG-4 성공 → 티켓 쿼리 무효화 후 /tickets.',
    basis: ['GUI 939:26721', 'plan P8b L 범위 수락(PG-4)'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await step('랜딩을 열면 공연 요약과 버튼 둘', async () => {
      await page.goto(landing(GIFT_TOKEN.forMe));
      await expect(statusArea(page)).toHaveAttribute('data-view-state', 'AVAILABLE');
      await expect(page.getByRole('heading', { name: '고스락 제37회 정기공연' })).toBeVisible();
      await expect(page.getByRole('button', { name: '거절하기' })).toBeEnabled();
      await expect(page.getByRole('button', { name: '선물받기' })).toBeEnabled();
    });
    await step('[선물받기] → 티켓탭', async () => {
      await page.getByRole('button', { name: '선물받기' }).click();
      await expect(page).toHaveURL(/\/tickets$/);
      expect(mockApi.calls().filter((c) => c.path.endsWith('/accept'))).toHaveLength(1);
    });
  },
);

scenario(
  'GIFT-4',
  '미가입 수신자: 링크 → 로그인 안내 → [카카오 로그인하기] → 가입 → 같은 랜딩 → 다시 눌러 수락',
  {
    kind: '정상',
    summary:
      'plan P8b 완료 기준 V "미가입 수신자 링크 → 가입 → 수락의 화면 흐름". GUI 939:26412(비로그인) → 가짜 카카오 가입 → 복귀(자동 수락 없음) → 939:26721 [선물받기].',
    basis: ['plan P8b 완료 기준 V', 'GUI 939:26412 · 939:26721', 'patterns §4-2'],
    viewports: ['mobile'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'anonymous');
    const url = landing(GIFT_TOKEN.forMe);
    await step(
      '링크를 열면 "두둥에 로그인하고…" + [카카오 로그인하기], 수락 버튼은 없다',
      async () => {
        await page.goto(url);
        await expect(statusArea(page)).toHaveAttribute('data-view-state', 'AVAILABLE');
        await expect(page.getByText('두둥에 로그인하고 다양한 공연을 즐겨보세요!')).toBeVisible();
        await expect(page.getByRole('button', { name: '선물받기' })).toHaveCount(0);
      },
    );
    await step('[카카오 로그인하기] → 로그인 화면(돌아올 주소 = 랜딩)', async () => {
      await page.getByRole('link', { name: '카카오 로그인하기' }).click();
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(url)}`);
    });
    await step('카카오 가입 → 같은 랜딩으로 돌아오고, 아직 수락하지 않았다', async () => {
      await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
      await page.getByRole('link', { name: '신규 사용자(가입)', exact: true }).click();
      await page.getByRole('checkbox', { name: '(필수) 서비스 이용약관 동의' }).check();
      await page.getByRole('checkbox', { name: '(필수) 개인정보 처리방침 동의' }).check();
      await page.getByRole('button', { name: '동의하고 시작하기' }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('button', { name: '선물받기' })).toBeEnabled();
      expect(mockApi.calls().filter((c) => c.path.endsWith('/accept'))).toEqual([]);
    });
    await step('[선물받기]를 누르면 수락되고 티켓탭', async () => {
      await page.getByRole('button', { name: '선물받기' }).click();
      await expect(page).toHaveURL(/\/tickets$/);
    });
  },
);

scenario(
  'GIFT-5',
  '[거절하기] → "선물을 거절하시겠습니까?" [아니오] [예] → 선물 거절 완료',
  {
    kind: '정상',
    summary:
      'GUI 939:26858(DS BottomSheet — Figma 코멘트) → 939:26992. PG-5 성공 → 랜딩을 다시 읽어 REJECTED.',
    basis: ['GUI 939:26858 · 939:26992', 'plan P8b L 범위 거절(PG-5)'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(landing(GIFT_TOKEN.forMe));
    const sheet = page.getByRole('dialog', { name: '선물을 거절하시겠습니까?' });
    await step('[거절하기]를 누르면 확인 시트', async () => {
      await page.getByRole('button', { name: '거절하기' }).click();
      await expect(sheet).toBeVisible();
      await expect(sheet.getByText('확인을 누르시면 해당 티켓 선물이 반환됩니다.')).toBeVisible();
    });
    await step('[아니오]는 닫기만 한다', async () => {
      await sheet.getByRole('button', { name: '아니오' }).click();
      await expect(sheet).toHaveCount(0);
      await expect(statusArea(page)).toHaveAttribute('data-view-state', 'AVAILABLE');
    });
    await step('[예] → "선물 거절 완료" + [티켓 페이지로] [다른 공연 둘러보기]', async () => {
      await page.getByRole('button', { name: '거절하기' }).click();
      await sheet.getByRole('button', { name: '예' }).click();
      await expect(statusArea(page)).toHaveAttribute('data-view-state', 'REJECTED');
      await expect(page.getByRole('heading', { name: '선물 거절 완료' })).toBeVisible();
      await expect(page.getByRole('link', { name: '다른 공연 둘러보기' })).toHaveAttribute(
        'href',
        '/',
      );
    });
  },
);

const STATES: { token: string; viewState: string; heading: string; buttons: string[] }[] = [
  {
    token: GIFT_TOKEN.accepted,
    viewState: 'ALREADY_ACCEPTED',
    heading: '이미 받은 선물이에요',
    buttons: ['티켓 페이지로'],
  },
  {
    token: GIFT_TOKEN.rejected,
    viewState: 'REJECTED',
    heading: '거절한 선물이에요',
    buttons: ['티켓 페이지로'],
  },
  {
    token: GIFT_TOKEN.canceled,
    viewState: 'CANCELED',
    heading: '취소된 선물',
    buttons: ['티켓 페이지로', '다른 공연 둘러보기'],
  },
  {
    token: GIFT_TOKEN.mine,
    viewState: 'OWN_LINK',
    heading: '내가 보낸 선물 링크예요',
    buttons: ['선물 취소', '티켓 페이지로'],
  },
  {
    token: GIFT_TOKEN.expired,
    viewState: 'EXPIRED',
    heading: '공연이 끝나 받을 수 없는 선물이에요',
    buttons: ['티켓 페이지로'],
  },
  {
    token: GIFT_TOKEN.expiredMine,
    viewState: 'EXPIRED',
    heading: '공연이 끝나 받을 수 없는 선물이에요',
    buttons: ['선물 회수', '티켓 페이지로'],
  },
];

scenario(
  'GIFT-6',
  '랜딩 viewState 7종 — 받기 밖의 상태 화면(이미 받음 · 거절됨 · 취소됨 · 내 링크 · 만료 · 만료(보낸 사람)) · 반환됨',
  {
    kind: '정상',
    summary:
      'plan P8b 완료 기준 V "viewState 7종 화면". AVAILABLE은 GIFT-3 · GIFT-4. CANCELED는 GUI 939:27058, 나머지는 디자인 없음(Figma 코멘트 939:26818). 어떤 상태에도 수락 버튼이 없다.',
    basis: ['plan P8b 완료 기준 V', 'gift-landing-state.ts', 'GUI 939:27058'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    for (const s of STATES) {
      await step(
        `${s.viewState}${s.buttons.includes('선물 회수') ? '(보낸 사람)' : ''} — "${s.heading}"`,
        async () => {
          await page.goto(landing(s.token));
          await expect(statusArea(page)).toHaveAttribute('data-view-state', s.viewState);
          await expect(page.getByRole('heading', { name: s.heading, exact: true })).toBeVisible();
          for (const name of s.buttons) {
            await expect(
              statusArea(page)
                .getByRole('button', { name })
                .or(statusArea(page).getByRole('link', { name })),
            ).toBeVisible();
          }
          await expect(page.getByRole('button', { name: '선물받기' })).toHaveCount(0);
        },
      );
    }
    await step('RETURNED — "보낸 분에게 돌려준 선물이에요"(viewer 응답을 바꿔서)', async () => {
      await page.route(`**/api/v2/gifts/${GIFT_TOKEN.rejected}`, async (route) => {
        const res = await route.fetch();
        const json = (await res.json()) as { data: Record<string, unknown> };
        await route.fulfill({
          response: res,
          json: { ...json, data: { ...json.data, status: 'RETURNED', viewState: 'RETURNED' } },
        });
      });
      await page.goto(landing(GIFT_TOKEN.rejected));
      await expect(statusArea(page)).toHaveAttribute('data-view-state', 'RETURNED');
      await expect(
        page.getByRole('heading', { name: '보낸 분에게 돌려준 선물이에요' }),
      ).toBeVisible();
    });
  },
);

scenario(
  'GIFT-7',
  '보낸 사람이 자기 링크에서 [선물 취소] → 확인 → 선물 취소 완료',
  {
    kind: '정상',
    summary:
      'OWN_LINK + giftId → DG-2. 확인 시트는 디자인 없음(티켓탭 취소 시트와 같은 문구), 끝나면 GUI 908:21359 선물 취소 완료.',
    basis: ['plan P8b L 범위 "OWN_LINK·EXPIRED에서 giftId가 있으면 회수"', 'GUI 908:21359'],
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(landing(GIFT_TOKEN.mine));
    await step('[선물 취소] → "선물을 취소하시겠습니까?"', async () => {
      await page.getByRole('button', { name: '선물 취소' }).click();
      await expect(page.getByRole('dialog', { name: '선물을 취소하시겠습니까?' })).toBeVisible();
    });
    await step('[선물 취소하기] → "선물 취소 완료"', async () => {
      await page.getByRole('button', { name: '선물 취소하기' }).click();
      await expect(statusArea(page)).toHaveAttribute('data-view-state', 'CANCELED');
      await expect(page.getByRole('heading', { name: '선물 취소 완료' })).toBeVisible();
    });
  },
);

scenario(
  'GIFT-8',
  '없는 링크는 404 — 크롤러는 상태 코드, 브라우저는 찾을 수 없다는 화면',
  {
    kind: '에러',
    summary: 'GG-3 Gift_404_1 → notFound(). 서버 조회 화면이라 상태 코드가 404.',
    basis: ['patterns §24 P8b', 'tech-decisions §20'],
  },
  async ({ page, request, step }) => {
    await step(
      '카카오 UA로 요청하면 404',
      async () => {
        const res = await request.get(landing(MISSING_GIFT_TOKEN), {
          headers: { 'User-Agent': KAKAO_SCRAP_UA },
        });
        expect(res.status()).toBe(404);
      },
      { capture: false },
    );
    await step('브라우저로 열면 찾을 수 없다는 화면', async () => {
      await page.goto(landing(MISSING_GIFT_TOKEN));
      await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    });
  },
);

scenario(
  'GIFT-9',
  '수락이 Gift_400_3(이미 처리됨)이면 상태 화면 + 안내',
  {
    kind: '에러',
    summary: 'patterns §24 P8b — 랜딩을 다시 읽어 상태 화면으로, "이미 처리된 선물이에요".',
    basis: ['patterns §24 P8b', 'plan P8b 완료 기준 L Gift_400_3'],
    mocks: giftHandlers.fails('accept', 'Gift_400_3'),
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(landing(GIFT_TOKEN.forMe));
    await step('[선물받기] → 안내가 상태 영역에 보인다', async () => {
      await page.getByRole('button', { name: '선물받기' }).click();
      await expect(statusArea(page).getByRole('alert')).toHaveText('이미 처리된 선물이에요');
    });
  },
);

scenario.manual('GIFT-10', '[카카오톡] 공유 · [메세지] 문자 앱이 실기기에서 열린다', {
  kind: '정상',
  basis: ['plan P8b L 범위 공유', 'progress D2 스테이징 첫 배포'],
  how: 'D2 스테이징 뒤 iOS·Android 실기기에서 링크 생성 완료 화면의 [카카오톡](카카오 공유창, 미리보기에 메모·보낸 사람 없음)과 [메세지](문자 앱 본문에 링크)를 누른다.',
});

scenario.manual('GIFT-11', '실제 카카오 가입 왕복 뒤 랜딩으로 돌아와 수락', {
  kind: '정상',
  basis: ['plan P8b 완료 기준 L "카카오 가입 왕복은 스테이징에서"'],
  how: 'D2 스테이징에서 미가입 카카오 계정으로 선물 링크를 열고 [카카오 로그인하기] → 가입 → 같은 랜딩 → [선물받기].',
});
