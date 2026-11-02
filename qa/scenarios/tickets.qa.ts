import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import {
  listMyTickets,
  NEW_APPROVED_ORDER_UUID,
  readMyTicket,
  resetTicketStore,
  SENT_GIFT_ID,
  setUnreadRefused,
  TICKET_UUID,
} from '../../src/api/__mocks__/fixtures/my-ticket';
import { P9_ORDER } from '../../src/api/__mocks__/fixtures/order';
import { myTicketHandlers } from '../../src/api/__mocks__/my-ticket.handlers';
import type { MyTicketDetail, MyTicketGroup, MyTicketState } from '../../src/api/my-ticket/schema';
import { MY_TICKET_STATES } from '../../src/api/my-ticket/schema';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 티켓탭 · 입장 QR(plan P8 완료 기준 V). 근거는 GUI 섹션 `908:3276` 티켓페이지 GUI 적용(2026-11-01 Ready, 모바일 390) —
 * 사용가능 3종 이상 `908:10027` · 한 주문 2장 이상 `908:11275` · 입장 QR `908:11335` · 선물중 `908:16571` · 선물 취소 `908:21252` ·
 * 입장완료 `908:16734` · 선물 수신자 `908:23011` · 반송 `908:23087` · 승인거절 `939:25571` · 승인대기 `939:25698`(#30) · 공연중 `939:25755` ·
 * 티켓 없음 `908:3137`. #29(정렬 라벨 · 유료옵션 표시 제거) 반영.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 보호 화면(`/tickets`, 브라우저 조회)
 * - 권한: 비로그인 → 로그인 이동은 e2e `tickets.spec`. 화면 안 권한 분기 없음([선물하기]는 T-2 `canGift`만 본다)
 * - 반응형: PC GUI 없음 — 모바일 배치를 가운데에(TIX-9에서 1280 확인)
 */

const TAB = '/tickets';

/** 묶음 카드를 가운데로 넘기고(가운데가 아니면 첫 탭은 넘기기만) 눌러 입장 QR 층을 연다 */
async function openQr(page: Page, groupKey: string) {
  const group = page.locator(`[id="group-${groupKey}"]`);
  if ((await group.getAttribute('data-active')) !== 'true') await group.getByRole('button').click();
  await expect(group).toHaveAttribute('data-active', 'true');
  await group.getByRole('button', { name: '입장 QR 보기' }).click();
  const layer = page.getByRole('dialog', { name: '입장 QR' });
  await expect(layer).toBeVisible();
  return layer;
}

/** 묶음 카드를 가운데로만 */
async function center(page: Page, groupKey: string) {
  const group = page.locator(`[id="group-${groupKey}"]`);
  if ((await group.getAttribute('data-active')) !== 'true') await group.getByRole('button').click();
  await expect(group).toHaveAttribute('data-active', 'true');
  return group;
}

// ─── 11값 전부 — 상태마다 묶음 하나 ─────────────────────────────

const ORDER_ONLY: readonly MyTicketState[] = ['PENDING_APPROVE', 'REFUSED'];
/** 실제 mock 저장소에 있는 상태는 그 티켓의 T-2를, 없는 것(취소·환불 완료)은 승인 티켓을 고쳐서 */
const REAL_UUID: Partial<Record<MyTicketState, string>> = {
  APPROVED: TICKET_UUID.approved,
  GIFT_PENDING: TICKET_UUID.giftPending,
  GIFT_EXPIRED: TICKET_UUID.giftExpired,
  RECEIVED: TICKET_UUID.received,
  ENTERED: TICKET_UUID.entered,
  REFUND_REQUESTED: TICKET_UUID.refundRequested,
};
const qaUuid = (state: MyTicketState) => `qa-${state.toLowerCase()}`;

function allStateGroups(): MyTicketGroup[] {
  const template = listMyTickets().groups.find((g) => g.groupKey === NEW_APPROVED_ORDER_UUID)!;
  const base = template.tickets[0]!;
  return MY_TICKET_STATES.map((state, i) => ({
    ...template,
    groupKey: `qa-${state}`,
    orderStatus: template.orderStatus,
    ticketName: `${i + 1}. ${state}`,
    counts: { [state]: ORDER_ONLY.includes(state) ? 2 : 1 },
    tickets: ORDER_ONLY.includes(state)
      ? []
      : [
          state === 'GIFT_SENT'
            ? {
                ...base,
                ticketUuid: null,
                issuedTicketNo: `QA${i + 1}`,
                state,
                giftState: 'SENT' as const,
                giftId: SENT_GIFT_ID,
              }
            : { ...base, ticketUuid: qaUuid(state), issuedTicketNo: `QA${i + 1}`, state },
        ],
  }));
}

function detailOf(uuid: string): MyTicketDetail | null {
  const state = MY_TICKET_STATES.find((s) => qaUuid(s) === uuid);
  if (!state) return null;
  const real = readMyTicket(REAL_UUID[state] ?? TICKET_UUID.approved)!;
  const synth = !REAL_UUID[state];
  return {
    ...real,
    ticketUuid: uuid,
    issuedTicketNo: `QA${MY_TICKET_STATES.indexOf(state) + 1}`,
    state,
    qrValue: synth ? null : real.qrValue && uuid,
    canGift: synth ? false : real.canGift,
  };
}

const allStateMocks = [
  http.get('*/api/v2/me/tickets/new-approved', () =>
    HttpResponse.json(envelope.ok({ hasNew: false, orderUuids: [] })),
  ),
  http.get('*/api/v2/me/tickets/:ticketUuid', ({ params }) => {
    const value = detailOf(String(params.ticketUuid));
    return value
      ? HttpResponse.json(envelope.ok(value))
      : HttpResponse.json(envelope.error(404, 'IssuedTicket_404_1'), { status: 404 });
  }),
  http.get('*/api/v2/me/tickets', () =>
    HttpResponse.json(envelope.ok({ groups: allStateGroups() })),
  ),
];

const CHIP: Record<MyTicketState, string> = {
  PENDING_APPROVE: '승인 대기 2',
  REFUSED: '승인 거절 2',
  APPROVED: '승인완료',
  GIFT_PENDING: '선물 대기중',
  GIFT_EXPIRED: '선물 만료',
  GIFT_SENT: '선물완료',
  RECEIVED: '받은 선물',
  ENTERED: '입장 완료',
  CANCELED: '취소됨',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
  UNKNOWN: '상태 확인 필요',
};

/** 뒷면에 보이는 것 — QR · 선물중 · 입장 완료 · 안내 문구(P8-L) */
const BACK: Partial<Record<MyTicketState, RegExp>> = {
  APPROVED: /입장 QR을 찍어주세요/,
  RECEIVED: /입장 QR을 찍어주세요/,
  GIFT_PENDING: /선물중인 티켓/,
  ENTERED: /입장 완료 티켓/,
  GIFT_EXPIRED: /공연이 끝나 선물을 받을 수 없어요/,
  GIFT_SENT: /선물한 티켓이에요/,
  CANCELED: /취소된 티켓이라 입장할 수 없어요/,
  REFUND_REQUESTED: /취소된 티켓이라 입장할 수 없어요/,
  REFUNDED: /취소된 티켓이라 입장할 수 없어요/,
};

scenario(
  'TIX-1',
  '티켓 state 11값이 카드 칩과 입장 QR 뒷면으로 모두 그려진다',
  {
    kind: '정상',
    summary:
      '상태마다 묶음 하나(T-1 mock). 승인 대기·거절은 티켓 없는 주문이라 칩만(탭해도 QR 없음 · "탭하여 입장 QR 보기" 없음). 나머지 9값은 카드를 눌러 뒷면 — QR(승인완료·받은 선물) · 선물중 · 입장 완료 · 안내 문구.',
    basis: ['plan P8 완료 기준 V "state 11값 렌더"', 'patterns §17', 'GUI 908:3276'],
    viewports: ['mobile'],
    mocks: allStateMocks,
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await expect(page.getByTestId('ticket-group')).toHaveCount(MY_TICKET_STATES.length);
    for (const state of MY_TICKET_STATES) {
      const back = BACK[state];
      await step(
        back
          ? `${state} — 칩 "${CHIP[state]}", 누르면 뒷면에 ${back.source}`
          : `${state} — 칩 "${CHIP[state]}", 티켓 없는 주문이라 QR 안내가 없다`,
        async () => {
          const group = await center(page, `qa-${state}`);
          await expect(group.getByRole('listitem')).toHaveText([CHIP[state]]);
          if (!back) {
            await expect(page.getByText('탭하여 입장 QR 보기')).toHaveCount(0);
            return;
          }
          const layer = await openQr(page, `qa-${state}`);
          await expect(layer.getByTestId('ticket-back')).toContainText(back);
          if (state === 'APPROVED' || state === 'RECEIVED')
            await expect(layer.getByTestId('qr-value')).toBeVisible();
          else await expect(layer.getByTestId('qr-value')).toHaveCount(0);
        },
      );
      if (back) {
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: '입장 QR' })).toHaveCount(0);
      }
    }
  },
);

scenario(
  'TIX-1b',
  '무료 선착순(즉시 발급) 묶음은 칩이 "승인완료" 대신 "발급 완료"',
  {
    kind: '정상',
    summary:
      'T-1 `groups[].approvalRequired`(백엔드 #924 — 2.5.6)가 false면 design-requests Q74 기본안 "발급 완료". 값이 없으면(운영 2.5.3) 지금처럼 "승인완료"(TIX-1).',
    basis: ['Backend #914 답 5(B26)', 'design-requests Q74'],
    viewports: ['mobile'],
    mocks: [
      http.get('*/api/v2/me/tickets/new-approved', () =>
        HttpResponse.json(envelope.ok({ hasNew: false, orderUuids: [] })),
      ),
      http.get('*/api/v2/me/tickets', () =>
        HttpResponse.json(
          envelope.ok({
            groups: allStateGroups()
              .filter((g) => g.groupKey === 'qa-APPROVED')
              .map((g) => ({ ...g, approvalRequired: false })),
          }),
        ),
      ),
    ],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('칩이 "발급 완료"다', async () => {
      const group = page.getByTestId('ticket-group').first();
      await expect(group.getByRole('listitem')).toHaveText(['발급 완료']);
    });
  },
);

scenario(
  'TIX-2',
  '들어가면 NEW 공지 바 · 첫 카드 · 공연명/일시/티켓 이름 · [주문상세], 정렬 라벨·유료옵션 금액은 없다',
  {
    kind: '정상',
    summary:
      'GUI 908:10027 · 939:25698(#30 승인대기 칩). 첫 묶음은 승인 대기 주문(티켓 없음)이라 칩 "승인 대기 2"만. #29 — "공연임박순" 라벨과 유료옵션 금액 표시가 없다.',
    basis: ['GUI 908:10027 · 939:25698', 'issue #29 · #30', 'plan P8 V 범위 "공지 바"'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('NEW 공지 바와 첫 카드(승인 대기 2)가 보인다', async () => {
      await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
      const first = page.getByTestId('ticket-group').first();
      await expect(first).toHaveAttribute('data-active', 'true');
      await expect(first.getByRole('listitem')).toHaveText(['승인 대기 2']);
      await expect(
        page.getByTestId('ticket-info').getByRole('link', { name: '주문상세' }),
      ).toBeVisible();
    });
    await step('정렬 라벨 "공연임박순"과 유료옵션 금액(+ 원)이 없다(#29)', async () => {
      await expect(page.getByText('공연임박순')).toHaveCount(0);
      await expect(page.getByText(/\+ [\d,]+원/)).toHaveCount(0);
    });
  },
);

scenario(
  'TIX-3',
  '[티켓보기 →]를 누르면 새로 승인된 주문 카드로 넘어가고, 한 주문 2장 이상은 겹친 카드 + 상태별 개수',
  {
    kind: '정상',
    summary:
      'T-3 orderUuids[0] 묶음으로 캐러셀이 넘어간다. 그 주문은 3장(승인완료 1 · 선물 대기중 1 · 선물완료 1)이라 뒤에 기운 카드가 겹치고 칩에 개수가 붙는다(GUI 908:11275).',
    basis: ['plan P8 V 범위 "카드 스와이프 · 상태별 개수 배지"', 'GUI 908:11275'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('[티켓보기 →]를 누르면 그 주문 카드가 가운데로 온다', async () => {
      await page.getByRole('status').getByRole('link', { name: '티켓보기 →' }).click();
      const group = page.locator(`#group-${NEW_APPROVED_ORDER_UUID}`);
      await expect(group).toHaveAttribute('data-active', 'true');
      await expect(group.getByRole('listitem')).toHaveText([
        '승인완료 1',
        '선물 대기중 1',
        '선물완료 1',
      ]);
      await expect(page.getByText('탭하여 입장 QR 보기')).toBeVisible();
    });
  },
);

scenario(
  'TIX-4',
  '카드를 누르면 입장 QR 층(1/3) — 넘기면 (2/3) 선물중 · (3/3) 선물완료, 바깥을 누르면 닫힌다',
  {
    kind: '정상',
    summary:
      'GUI 908:11335 · 908:16571. 층을 열 때만 T-2(지금 칸 티켓만), 열면 공지 바가 Notice로 바뀐다(서버가 승인 알림을 읽음 처리). 바깥을 탭하면 닫힌다.',
    basis: [
      'plan P8 V 범위 "카드 스와이프(N/M 페이저) · QR 전체화면"',
      'GUI 908:11335 · 908:16571',
    ],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    await step('(1/3) QR · 티켓 번호 · "입장 QR을 찍어주세요", 선물 버튼', async () => {
      await expect(layer.getByText('(1/3)')).toBeVisible();
      await expect(layer.getByTestId('qr-value')).toHaveAttribute(
        'data-value',
        TICKET_UUID.approved,
      );
      await expect(layer.getByRole('button', { name: '선물하기' })).toBeEnabled();
      await expect(page.getByTestId('notice-default')).toBeVisible();
    });
    await step('다음 티켓으로 넘기면 (2/3) 선물중인 티켓 · [선물 취소]', async () => {
      await layer.getByRole('button', { name: '2번째 티켓으로' }).click();
      await expect(layer.getByText('(2/3)')).toBeVisible();
      await expect(layer.getByTestId('qr-notice')).toHaveText('선물중인 티켓');
      await expect(layer.getByRole('button', { name: '선물 취소' })).toBeVisible();
    });
    await step('(3/3) 선물완료 — 받은 분의 QR로 입장한다는 안내, 선물 버튼 꺼짐', async () => {
      await layer.getByRole('button', { name: '3번째 티켓으로' }).click();
      await expect(layer.getByText('(3/3)')).toBeVisible();
      await expect(layer.getByTestId('qr-notice')).toContainText('선물한 티켓이에요');
      await expect(layer.getByRole('button', { name: '선물하기' })).toBeDisabled();
    });
    await step('바깥(공연명 아래 빈 곳)을 누르면 층이 닫힌다', async () => {
      await page.mouse.click(10, 10);
      await expect(page.getByRole('dialog', { name: '입장 QR' })).toHaveCount(0);
      const details = mockApi
        .calls()
        .filter((c) => /^\/api\/v2\/me\/tickets\/(?!new-approved)/.test(c.path))
        .map((c) => c.path);
      expect(details).toContain(`/api/v2/me/tickets/${TICKET_UUID.approved}`);
    });
  },
);

scenario(
  'TIX-5',
  '선물중 티켓의 [선물 취소] → 확인 시트 → 취소 완료 화면 → 티켓탭에서 QR이 돌아온다',
  {
    kind: '정상',
    summary:
      'GUI 908:21252 확인 시트(DS BottomSheet로 구현 — Figma 코멘트) → 908:21359 선물 취소 완료(P8b-V). DG-2 성공 → T-2 다시 읽어 QR.',
    basis: ['GUI 908:16571 · 908:21252 · 908:21359', 'plan P8b L 범위 회수(DG-2)'],
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    await layer.getByRole('button', { name: '2번째 티켓으로' }).click();
    await expect(layer.getByText('(2/3)')).toBeVisible();
    await step('[선물 취소]를 누르면 "선물을 취소하시겠습니까?" 시트', async () => {
      await layer.getByRole('button', { name: '선물 취소' }).click();
      const sheet = page.getByRole('dialog', { name: '선물을 취소하시겠습니까?' });
      await expect(sheet).toBeVisible();
      // 이슈 #106 §1 — [아니요] · [선물 링크 다시 보기]
      await expect(sheet.getByRole('button', { name: '아니요' })).toBeVisible();
      await expect(sheet.getByRole('button', { name: '선물 링크 다시 보기' })).toBeVisible();
    });
    await step(
      '[선물 취소하기]를 누르면 층이 닫히고 "선물 취소 완료" 화면(알림을 약속하지 않는다)',
      async () => {
        await page.getByRole('button', { name: '선물 취소하기' }).click();
        await expect(page.getByRole('heading', { name: '선물 취소 완료' })).toBeVisible();
        await expect(page.getByText('선물 링크는 더 이상 쓸 수 없어요')).toBeVisible();
        await expect(page.getByRole('dialog', { name: '입장 QR' })).toHaveCount(0);
      },
    );
    await step('[티켓 페이지로] → 다시 열면 그 티켓에 QR이 보인다', async () => {
      await page.getByRole('button', { name: '티켓 페이지로' }).click();
      const again = await openQr(page, NEW_APPROVED_ORDER_UUID);
      // 층은 마지막으로 본 칸(2/3)으로 다시 열린다
      await expect(again.getByText('(2/3)')).toBeVisible();
      await expect(page.getByTestId('qr-value')).toHaveAttribute(
        'data-value',
        TICKET_UUID.giftPending,
      );
    });
  },
);

scenario(
  'TIX-5b',
  '선물중 티켓 — 취소 시트의 [선물 링크 다시 보기]로 링크 화면을 다시 연다 · [아니요]는 닫기만',
  {
    kind: '정상',
    summary:
      '이슈 #106 §1 ⭐ — 링크 생성 화면을 벗어나면 링크를 되찾을 수 없었다. T-2 `gift.linkPath`로 링크 생성 완료(908:13105)를 다시 띄운다(요청 없음).',
    basis: ['이슈 #106 §1', 'GUI 908:13105', 'design-requests Q80 · Q81'],
    viewports: ['mobile'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
    await layer.getByRole('button', { name: '2번째 티켓으로' }).click();
    const sheet = page.getByRole('dialog', { name: '선물을 취소하시겠습니까?' });
    await step('[아니요]는 시트만 닫는다(취소 요청 없음)', async () => {
      await layer.getByRole('button', { name: '선물 취소' }).click();
      await sheet.getByRole('button', { name: '아니요' }).click();
      await expect(sheet).toHaveCount(0);
      expect(mockApi.calls().filter((c) => c.method === 'DELETE')).toEqual([]);
    });
    await step('[선물 링크 다시 보기] → 링크 생성 완료 화면에 같은 링크', async () => {
      await layer.getByRole('button', { name: '선물 취소' }).click();
      await sheet.getByRole('button', { name: '선물 링크 다시 보기' }).click();
      await expect(page.getByRole('heading', { name: '선물 링크 생성 완료!' })).toBeVisible();
      await expect(page.getByTestId('gift-link')).toHaveAttribute('data-value', /\/gifts\/.+$/);
      expect(mockApi.calls().filter((c) => c.method !== 'GET' && c.path.includes('gift'))).toEqual(
        [],
      );
    });
  },
);

scenario(
  'TIX-6',
  '받은 티켓의 [선물 반환] → 확인 시트 → 반송 완료 화면 → 티켓탭에서 카드가 사라진다',
  {
    kind: '정상',
    summary:
      'GUI 908:23011 · 908:23087 → 908:23165 선물 반송 완료(P8b-V). PG-6 성공 → 층을 닫고 목록 다시 읽기(받은 티켓 묶음이 없어진다).',
    basis: ['GUI 908:23011 · 908:23087 · 908:23165', 'plan P8b L 범위 반환(PG-6)'],
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const received = listMyTickets().groups.find((g) => g.orderUuid === null)!;
    const layer = await openQr(page, received.groupKey);
    await step('(1/1) QR과 [선물 반환] 버튼', async () => {
      await expect(layer.getByText('(1/1)')).toBeVisible();
      await expect(layer.getByTestId('qr-value')).toBeVisible();
      await layer.getByRole('button', { name: '선물 반환' }).click();
      await expect(page.getByRole('dialog', { name: '선물을 돌려주시겠습니까?' })).toBeVisible();
    });
    await step('[선물 돌려주기]를 누르면 층이 닫히고 "선물 반송 완료" 화면', async () => {
      await page.getByRole('button', { name: '선물 돌려주기' }).click();
      await expect(page.getByRole('dialog', { name: '입장 QR' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: '선물 반송 완료' })).toBeVisible();
      await expect(page.getByRole('link', { name: '다른 공연 둘러보기' })).toHaveAttribute(
        'href',
        '/',
      );
    });
    await step('[티켓 페이지로]를 누르면 받은 티켓 카드가 없다', async () => {
      await page.getByRole('button', { name: '티켓 페이지로' }).click();
      await expect(page.locator(`[id="group-${received.groupKey}"]`)).toHaveCount(0);
    });
  },
);

scenario(
  'TIX-7',
  '티켓이 없으면 Notice 공지 바 · "이용 가능한 티켓이 없어요" · [공연 둘러보기]',
  {
    kind: '빈 상태',
    summary: 'GUI 908:3137. [공연 둘러보기]는 공연홈(/)으로.',
    basis: ['GUI 908:3137', 'plan P8 와이어 696:15456'],
    mocks: myTicketHandlers.empty,
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('빈 화면과 [공연 둘러보기]가 보인다', async () => {
      await expect(page.getByTestId('notice-default')).toContainText(
        '두둥에서 다양한 공연을 예매해보세요',
      );
      await expect(page.getByText('이용 가능한 티켓이 없어요')).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('link', { name: '공연 둘러보기' }),
      ).toHaveAttribute('href', '/');
    });
  },
);

scenario(
  'TIX-8',
  '목록을 못 읽으면 에러 화면과 [다시 시도]',
  {
    kind: '에러',
    summary: 'T-1 5xx → 화면 경계(AsyncBoundary)의 다시 시도.',
    basis: ['patterns §24 P8', 'patterns §11'],
    viewports: ['mobile'],
    mocks: myTicketHandlers.listServerError,
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('에러 안내와 [다시 시도]가 보인다', async () => {
      await expect(page.getByRole('button', { name: /다시 시도/ })).toBeVisible();
    });
  },
);

scenario(
  'TIX-9',
  'PC(1280)에서도 모바일 배치가 가운데에 — 카드를 누르면 입장 QR 층',
  {
    kind: '반응형',
    summary: 'PC GUI 없음(Figma 코멘트) — 공지 바 390 가운데, 캐러셀은 화면 폭 전체.',
    basis: ['gui-screens §3 1024부터 PC', 'implementation-log P8-V 결정'],
    viewports: ['desktop'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('공지 바와 첫 카드가 가운데에 보인다', async () => {
      await expect(page.getByRole('status')).toBeVisible();
      await expect(page.getByTestId('ticket-group').first()).toHaveAttribute('data-active', 'true');
    });
    await step('승인 주문 카드를 누르면 입장 QR 층', async () => {
      const layer = await openQr(page, NEW_APPROVED_ORDER_UUID);
      await expect(layer.getByTestId('qr-value')).toBeVisible();
    });
  },
);

scenario.manual('TIX-10', '실제 폰에서 카드 스와이프 · QR 판독 · 화면 밝기', {
  kind: '반응형',
  basis: ['plan P8 V 범위', 'P13b QR-8(실기기 판독)'],
  how: 'D2 스테이징 뒤 iPhone Safari · Android Chrome에서 티켓탭 카드를 손가락으로 넘기고, 입장 QR을 호스트 스캐너(/hosting/events/:id/qr)로 찍어 입장 처리되는지 본다.',
});

// ─── 공지 바 변형(Q55 — 백엔드 #905 §2-2) ─────────────────────────

scenario(
  'TIX-11',
  '거절 공지 바 — "티켓 주문 승인이 거절되었습니다." + [티켓보기]는 주문 상세(O-3)로, 열면 풀린다',
  {
    kind: '정상',
    summary:
      'T-3 `refusedOrderUuids`(2.5.4)가 있으면 승인 공지보다 먼저 거절 바. [티켓보기] → /orders/{uuid}. 그 상세를 열면 서버가 풀어 다음 T-3에서 빠지고, 남은 승인 공지가 보인다.',
    basis: [
      'GUI 939:25571 승인거절',
      'backend #905 §2-2 · V2NewApprovedResponse(#908)',
      'design-requests Q55 — 우선순위 🤖 거절 > 승인 > 공연 중 > 기본',
    ],
  },
  async ({ page, step }) => {
    resetTicketStore();
    setUnreadRefused([P9_ORDER.refusedDeposit]);
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    const bar = page.getByRole('status');
    await step('승인 공지가 있어도 거절 바가 먼저 보인다', async () => {
      await expect(bar).toContainText('NEW 티켓 주문 승인이 거절되었습니다.');
      await expect(bar.getByRole('link', { name: '티켓보기 →' })).toHaveAttribute(
        'href',
        `/orders/${P9_ORDER.refusedDeposit}`,
      );
    });
    await step('[티켓보기]를 누르면 그 주문 상세(거절)가 열린다', async () => {
      await bar.getByRole('link', { name: '티켓보기 →' }).click();
      await expect(page).toHaveURL(new RegExp(`/orders/${P9_ORDER.refusedDeposit}$`));
      await expect(page.getByRole('main')).toContainText('거절');
    });
    await step('티켓탭으로 돌아오면 거절 바가 풀리고 승인 바가 보인다', async () => {
      await page.goto(TAB);
      await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
    });
  },
);

/** 첫 묶음(승인 주문 a)의 공연을 진행 중으로 — 서버 `displayStatus`가 요청 시점에 시작 ≤ 지금 < 종료로 정한다 */
const ongoingList = http.get('*/api/v2/me/tickets', () => {
  const { groups } = listMyTickets();
  return HttpResponse.json(
    envelope.ok({
      groups: groups.map((g) =>
        g.groupKey === NEW_APPROVED_ORDER_UUID && g.event
          ? { ...g, event: { ...g.event, displayStatus: 'ONGOING' } }
          : g,
      ),
    }),
  );
});

scenario(
  'TIX-12',
  '공연 중 공지 바 — 새 소식이 없고 내 티켓의 공연이 진행 중이면 "공연이 시작되었습니다!"',
  {
    kind: '정상',
    summary:
      '서버 값이 없다(#905 §2-2) — T-1 `event.displayStatus === ONGOING`인 묶음(티켓 있음)이 있으면. 승인 공지가 있으면 승인이 먼저.',
    basis: ['GUI 939:25755 공연중', 'backend #905 §2-2', 'design-requests Q55'],
    mocks: [ongoingList],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('승인 공지가 남아 있으면 승인 바가 먼저', async () => {
      await expect(page.getByRole('status')).toContainText('NEW 티켓 주문이 승인되었습니다!');
    });
    await step('승인 공지가 풀리면(T-2를 열면) 공연 중 바', async () => {
      readMyTicket(TICKET_UUID.approved);
      await page.reload();
      const bar = page.getByRole('status');
      await expect(bar).toContainText('NEW 공연이 시작되었습니다!');
      await expect(bar.getByRole('link')).toHaveCount(0);
    });
  },
);

scenario(
  'TIX-13',
  '운영 2.5.3 — T-3에 refusedOrderUuids 키가 없어도 승인 공지 바가 그대로',
  {
    kind: '에러',
    summary: '2.5.4 전용 필드는 운영에 없다 — 빈 배열로 읽고 기존 동작(승인 바).',
    basis: ['backend #905 머리(2.5.4는 스테이징에만)', 'api-contract G11/T-3'],
    viewports: ['mobile'],
    mocks: myTicketHandlers.noticeWithoutRefused,
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await page.goto(TAB);
    await step('승인 바와 [티켓보기 →]', async () => {
      const bar = page.getByRole('status');
      await expect(bar).toContainText('NEW 티켓 주문이 승인되었습니다!');
      await expect(bar.getByRole('link', { name: '티켓보기 →' })).toBeVisible();
    });
  },
);
