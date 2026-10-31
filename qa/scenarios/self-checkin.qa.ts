import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { checkInHandlers } from '../../src/api/__mocks__/check-in.handlers';
import { CHECK_IN_TOKEN, resetTicketStore } from '../../src/api/__mocks__/fixtures/my-ticket';
import type { CheckInResponse, CheckInTicket } from '../../src/api/check-in/schema';
import { envelope, expect, scenario } from '../scenario';

/**
 * 관객 셀프 체크인 `/check-in?token=…`(plan P8c 완료 기준 V — `result` 분기 전부 렌더, 여러 장이면 고르기).
 * 디자인 없음 — GUI Ready·와이어 어디에도 관객 쪽 화면이 없다(입구는 와이어 `424:11976` "QR 코드를 스캔하면 입장이 완료됩니다",
 * Figma 코멘트 `424:12000`). DS로만 그린 배치를 찍는다.
 *
 * 범주 검토
 * - 빈 상태: 해당 없음 — 내 티켓이 없으면 서버가 `OTHER_EVENT`를 준다(CHK-3에서 찍음)
 * - 크롤러: 해당 없음 — 보호 화면(브라우저 조회)
 * - 권한: 비로그인 → 로그인 → 같은 URL 복귀(CHK-6). 화면 안 역할 분기 없음
 * - 반응형: PC 디자인 없음 — 모바일 한 열을 가운데 390폭으로(기본 두 뷰포트)
 */

const SELF = '**/api/v2/check-ins/self';

const ticket = (over: Partial<CheckInTicket> = {}): CheckInTicket => ({
  ticketUuid: 'qa-ticket-1',
  issuedTicketNo: 'T1000001',
  ticketName: '일반 예매',
  buyerName: '두둥이',
  ownerName: '두둥이',
  entrance: 'BEFORE',
  enteredAt: null,
  ...over,
});

/** 브라우저의 PQ-5 응답을 순서대로 바꾼다(마지막 응답이 이어진다) */
async function answerSelf(page: Page, ...answers: Array<{ status: number; body: unknown }>) {
  let i = 0;
  await page.route(SELF, (route) => {
    const a = answers[Math.min(i++, answers.length - 1)]!;
    return route.fulfill({ status: a.status, json: a.body });
  });
}
const okBody = (res: CheckInResponse) => ({ status: 200, body: envelope.ok(res) });

const resultRegion = (page: Page) => page.getByRole('region', { name: '체크인 결과' });
const failRegion = (page: Page) => page.getByRole('region', { name: '체크인 실패' });

scenario(
  'CHK-1',
  '내 티켓이 한 장이면 열자마자 입장 완료',
  {
    kind: '정상',
    summary: 'QR로 열린 주소에서 PQ-5를 한 번 보내고, 1장이면 서버가 바로 입장 처리한다.',
    basis: ['plan P8c 완료 기준 V', 'api-contract PQ-5', 'checkin-result ENTERED(self)'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    await step('셀프 체크인 주소를 열면 입장 완료와 내 티켓 정보가 보인다', async () => {
      await page.goto(`/check-in?token=${CHECK_IN_TOKEN.single}`);
      await expect(resultRegion(page)).toHaveAttribute('data-result', 'ENTERED');
      await expect(page.getByRole('heading', { name: '입장이 완료됐어요' })).toBeVisible();
      await expect(page.getByTestId('check-in-ticket')).toContainText('티켓 번호');
      await expect(page.getByRole('link', { name: '티켓탭으로' })).toHaveAttribute(
        'href',
        '/tickets',
      );
      const calls = mockApi.calls().filter((c) => c.path === '/api/v2/check-ins/self');
      expect(calls).toHaveLength(1);
    });
  },
);

scenario(
  'CHK-2',
  '여러 장이면 고르고 [이 티켓으로 입장]을 눌러야 입장',
  {
    kind: '정상',
    summary:
      '`SELECT_TICKET` → 후보 라디오 목록. 고르기만으로는 보내지 않고, 버튼을 눌러야 `{token, ticketUuid}`로 다시 보낸다.',
    basis: [
      'plan P8c V 범위 "후보 선택 화면"',
      'api-contract PQ-5 SELECT_TICKET',
      'useSelfCheckIn select',
    ],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    const selfCalls = () => mockApi.calls().filter((c) => c.path === '/api/v2/check-ins/self');
    await step('열면 입장할 티켓을 고르는 화면이 보이고 버튼은 비활성', async () => {
      await page.goto(`/check-in?token=${CHECK_IN_TOKEN.multi}`);
      const picker = page.getByRole('region', { name: '티켓 고르기' });
      await expect(picker.getByRole('radio')).toHaveCount(2);
      await expect(picker.getByRole('button', { name: '이 티켓으로 입장' })).toBeDisabled();
    });
    await step('하나를 고르면 버튼이 켜지고 아직 요청은 한 번', async () => {
      await page.getByRole('radio').first().click();
      await expect(page.getByRole('button', { name: '이 티켓으로 입장' })).toBeEnabled();
      expect(selfCalls()).toHaveLength(1);
    });
    await step('[이 티켓으로 입장]을 누르면 입장 완료', async () => {
      await page.getByRole('button', { name: '이 티켓으로 입장' }).click();
      await expect(resultRegion(page)).toHaveAttribute('data-result', 'ENTERED');
      expect(selfCalls()).toHaveLength(2);
    });
  },
);

scenario(
  'CHK-3',
  '`result` 분기 — 이미 입장 · 이 공연 티켓 없음 · 취소 · 선물 대기 · 모르는 값',
  {
    kind: '정상',
    summary:
      'PQ-5는 실패도 200 + `result`다. 결과마다 아이콘 톤 · 제목 · 설명, 티켓 정보는 OTHER_EVENT·UNKNOWN에서 숨긴다.',
    basis: ['plan P8c 완료 기준 V', 'patterns §19', 'checkin-result COPY(self)'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    const cases = [
      {
        result: 'ALREADY_ENTERED',
        res: {
          result: 'ALREADY_ENTERED',
          ticket: ticket({ entrance: 'DONE', enteredAt: '2026.05.16 17:42' }),
          candidates: [],
        },
        title: '이미 입장한 티켓이에요',
        text: '2026.05.16 17:42 입장',
        showsTicket: true,
      },
      {
        result: 'OTHER_EVENT',
        res: { result: 'OTHER_EVENT', ticket: null, candidates: [] },
        title: '이 공연에 입장할 수 있는 내 티켓이 없어요',
        text: '선물받은 티켓이라면',
        showsTicket: false,
      },
      {
        result: 'CANCELED',
        res: { result: 'CANCELED', ticket: ticket({ entrance: 'CANCELED' }), candidates: [] },
        title: '취소된 티켓이에요',
        text: '두둥이',
        showsTicket: true,
      },
      {
        result: 'GIFT_PENDING',
        res: { result: 'GIFT_PENDING', ticket: ticket(), candidates: [] },
        title: '선물 대기 중인 티켓이에요',
        text: '티켓탭에서 선물을 취소하면',
        showsTicket: true,
      },
      {
        result: 'UNKNOWN',
        res: { result: 'SOMETHING_NEW', ticket: ticket(), candidates: [] },
        title: '체크인 결과를 확인할 수 없어요',
        text: '호스트에게 티켓 QR을 보여 주세요',
        showsTicket: false,
      },
    ] as const;
    for (const c of cases) {
      await step(`${c.result} → "${c.title}"`, async () => {
        await page.unroute(SELF);
        await answerSelf(page, okBody(c.res as unknown as CheckInResponse));
        await page.goto(`/check-in?token=qa-${c.result.toLowerCase()}`);
        await expect(resultRegion(page)).toHaveAttribute('data-result', c.result);
        await expect(page.getByRole('heading', { name: c.title })).toBeVisible();
        await expect(resultRegion(page)).toContainText(c.text);
        await expect(page.getByTestId('check-in-ticket')).toHaveCount(c.showsTicket ? 1 : 0);
      });
    }
  },
);

scenario(
  'CHK-4',
  '에러 — 잘못된 QR · 셀프 체크인이 안 되는 공연',
  {
    kind: '에러',
    summary:
      '`Event_400_26`·토큰 없음/모양 틀림은 같은 "잘못된 QR" 화면(토큰이 틀리면 요청도 없다), `Event_400_5`는 호스트에게 QR을 보이라는 안내.',
    basis: ['patterns §24 P8c 행', 'self-check-in-errors', 'plan P8c L 범위'],
  },
  async ({ page, mockApi, step }) => {
    resetTicketStore();
    await setMockSession(page, 'loggedIn');
    const selfCalls = () => mockApi.calls().filter((c) => c.path === '/api/v2/check-ins/self');
    await step('없는 토큰이면 잘못된 체크인 QR 안내', async () => {
      await page.goto('/check-in?token=invalid-token');
      await expect(failRegion(page)).toHaveAttribute('data-error', 'INVALID_QR');
      await expect(page.getByRole('heading', { name: '잘못된 체크인 QR이에요' })).toBeVisible();
      expect(selfCalls()).toHaveLength(1);
    });
    await step('토큰이 없으면 요청 없이 같은 안내', async () => {
      await page.goto('/check-in');
      await expect(failRegion(page)).toHaveAttribute('data-error', 'INVALID_QR');
      expect(selfCalls()).toHaveLength(1);
    });
    await step('끝난 공연이면 셀프 체크인 불가 + 호스트에게 QR 안내, [티켓탭으로]', async () => {
      await page.goto(`/check-in?token=${CHECK_IN_TOKEN.ended}`);
      await expect(failRegion(page)).toHaveAttribute('data-error', 'EVENT_NOT_OPEN');
      await expect(failRegion(page)).toContainText('호스트에게 티켓 QR을 보여 주세요');
      await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: '티켓탭으로' })).toBeVisible();
    });
  },
);

scenario(
  'CHK-5',
  '에러 — 서버 실패면 [다시 시도]로 처음부터',
  {
    kind: '에러',
    summary: '5xx·모르는 400은 `FAILED` — [다시 시도]가 토큰만으로 다시 보낸다.',
    basis: ['patterns §24 P8c 행', 'useSelfCheckIn retry'],
    mocks: checkInHandlers.serverError,
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('서버가 실패하면 체크인하지 못했다는 안내와 [다시 시도]', async () => {
      await page.goto(`/check-in?token=${CHECK_IN_TOKEN.single}`);
      await expect(failRegion(page)).toHaveAttribute('data-error', 'FAILED');
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
    await step('[다시 시도]를 눌러 성공하면 입장 완료', async () => {
      await answerSelf(page, okBody({ result: 'ENTERED', ticket: ticket(), candidates: [] }));
      await page.getByRole('button', { name: '다시 시도' }).click();
      await expect(resultRegion(page)).toHaveAttribute('data-result', 'ENTERED');
    });
  },
);

scenario(
  'CHK-6',
  '에러 — 고른 티켓이 내 것이 아니면 고르는 화면에 남아 안내',
  {
    kind: '에러',
    summary:
      '`IssuedTicket_400_1` — 후보 화면을 유지하고 위에 빨간 안내. 다른 티켓을 골라 다시 보낼 수 있다.',
    basis: ['patterns §24 P8c 행', 'useSelfCheckIn(고르다 실패하면 select 유지)'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await answerSelf(
      page,
      okBody({
        result: 'SELECT_TICKET',
        ticket: null,
        candidates: [
          ticket(),
          ticket({ ticketUuid: 'qa-ticket-2', issuedTicketNo: 'T1000002', ticketName: '얼리버드' }),
        ],
      }),
      { status: 400, body: envelope.error(400, 'IssuedTicket_400_1') },
    );
    await step('고르고 입장을 누르면 실패 안내가 뜨고 목록은 그대로', async () => {
      await page.goto('/check-in?token=qa-not-mine');
      await page.getByRole('radio', { name: /얼리버드/ }).click();
      await page.getByRole('button', { name: '이 티켓으로 입장' }).click();
      const picker = page.getByRole('region', { name: '티켓 고르기' });
      await expect(picker.getByRole('alert')).toContainText('내 티켓이 아니에요');
      await expect(picker.getByRole('radio')).toHaveCount(2);
      await expect(picker.getByRole('button', { name: '이 티켓으로 입장' })).toBeEnabled();
    });
  },
);

scenario(
  'CHK-7',
  '비로그인으로 QR을 열면 로그인 뒤 같은 주소로 돌아와 체크인',
  {
    kind: '권한',
    summary:
      '보호 화면 — 게이트가 `/login?redirect=…`로 보내고(토큰 유지), 로그인 뒤 돌아와 PQ-5를 보낸다.',
    basis: ['plan P8c 완료 기준 L "비로그인 → 로그인 → 같은 URL 복귀"', 'P4a/P4b 게이트'],
  },
  async ({ page, step }) => {
    resetTicketStore();
    await setMockSession(page, 'anonymous');
    const href = `/check-in?token=${CHECK_IN_TOKEN.single}`;
    await step('비로그인으로 열면 로그인 화면(돌아올 주소에 토큰 포함)', async () => {
      await page.goto(href);
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(href)}`);
    });
    await step('로그인하면 같은 주소로 돌아와 입장 완료', async () => {
      await page.getByRole('button', { name: '카카오 로그인/회원가입' }).click();
      await page.getByRole('link', { name: '기존 사용자로 로그인', exact: true }).click();
      await expect(page).toHaveURL(href);
      await expect(resultRegion(page)).toHaveAttribute('data-result', 'ENTERED');
    });
  },
);

scenario.manual('CHK-8', '실제 폰으로 호스트의 [관객이 스캔] QR을 찍어 입장', {
  kind: '정상',
  basis: ['plan P8c 범위 밖(D2 스테이징)', 'P13b-V 셀프 체크인 QR'],
  how: '스테이징에서 호스트 QR 체크인 화면을 [관객이 QR 스캔]으로 두고, 관객 폰 카메라로 찍어 /check-in이 열리고 입장 완료가 뜨는지, 호스트 통계가 늘어나는지 본다.',
});
