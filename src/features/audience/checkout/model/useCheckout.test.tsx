import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { me } from '@/api/__mocks__/fixtures/me';
import { CHECKOUT_TICKET } from '@/api/__mocks__/fixtures/order';
import {
  mockOrderCount,
  orderHandlers,
  readMockOrder,
  resetOrderStore,
} from '@/api/__mocks__/order.handlers';
import { errors, ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { ApiError } from '@/api/errors';
import { meQuery } from '@/api/me/queries';
import { IDEMPOTENCY_KEY_PATTERN } from '@/api/order/mutations';
import { checkoutQuery, myOrderQuery } from '@/api/order/queries';
import { CreateOrderRequestSchema, type MyOrderDetail } from '@/api/order/schema';
import { errorToast } from '@/test/error-toast';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';
import { toast } from '@/ui/components/Toast/Toast';

import { orderTossLink } from '../ui/DepositGuide';
import type { AnswerValue } from './option-form';
import {
  keepsAttemptKey,
  useCheckout,
  useCheckoutData,
  type UseCheckoutInput,
} from './useCheckout';

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/ui/components/Toast/Toast', () => ({ toast: vi.fn() }));

const EVENT_ID = 101;

let realFetch: typeof fetch;
beforeEach(() => {
  // MSW가 fetch를 바꾼 뒤(setup의 beforeAll)에 잡는다
  realFetch = globalThis.fetch;
  // Given: 로그인. 브라우저처럼 `credentials: 'include'` 요청에만 액세스 토큰 쿠키를 싣는다(Node fetch는 document.cookie를 싣지 않는다).
  // 보호 API mock은 이 쿠키로 세션을 본다. recordRequests()는 이 위에 감싼다
  globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    if (request.credentials !== 'include') return realFetch(request);
    const headers = new Headers(request.headers);
    headers.set('cookie', 'accessToken=mock');
    return realFetch(new Request(request, { headers }));
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = realFetch;
  router.replace.mockReset();
  vi.mocked(toast).mockReset();
});

function wrapperFor(queryClient = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** 체크아웃 화면을 연 상태(O-0·GM-1을 실제로 받아 둔다) */
async function openCheckout(
  ticketItemId: number,
  quantity: number,
  depositorName: string | null = me.name,
) {
  const { queryClient, wrapper } = wrapperFor();
  const checkout = await queryClient.fetchQuery(checkoutQuery(EVENT_ID, ticketItemId));
  const input: UseCheckoutInput = { eventId: EVENT_ID, checkout, depositorName, quantity };
  const view = renderHook(() => useCheckout(input), { wrapper });
  return { ...view, queryClient };
}

type Hook = Awaited<ReturnType<typeof openCheckout>>['result'];

const answers = (yesNo: 'YES' | 'NO', text: string): AnswerValue[] => [
  { optionId: 701, answer: yesNo },
  { optionId: 702, answer: text },
];

function fill(
  result: Hook,
  patch: {
    same?: AnswerValue[];
    agree?: boolean;
    hostProvision?: boolean;
    dudoongNotice?: boolean;
  } = {},
) {
  act(() => {
    const { form } = result.current;
    if (patch.same) form.setValue('options.same', patch.same);
    form.setValue('agreeRefundPolicy', patch.agree ?? true);
    // 동의 칸이 붙어(2026-11-01) 기본은 필수 동의를 모두 체크한 사용자 — 빼 보는 테스트만 false로
    form.setValue('hostProvisionAgreed', patch.hostProvision ?? true);
    form.setValue('dudoongTicketNoticeConfirmed', patch.dudoongNotice ?? true);
  });
}

async function submitAndWait(result: Hook) {
  await act(() => result.current.submit());
}

const posted = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method === 'POST' && r.path === '/api/v2/me/orders');

const created = () => {
  const call = router.replace.mock.calls.at(-1)?.[0] as string | undefined;
  const uuid = call?.match(/^\/orders\/([^?]+)\?created=1$/)?.[1];
  return uuid ? decodeURIComponent(uuid) : null;
};

// ─────────────────────────────────────────────────────────────

describe('체크아웃 열기 — useCheckoutData', () => {
  const data = (ticketItemId: number | null, quantity = 1) => {
    const { wrapper } = wrapperFor();
    return renderHook(
      () => useCheckoutData(EVENT_ID, ticketItemId === null ? null : { ticketItemId, quantity }),
      { wrapper },
    );
  };

  it('O-0(계좌 포함)과 GM-1 닉네임을 받으면 ready', async () => {
    const sent = recordRequests();
    const { result } = data(CHECKOUT_TICKET.paidWithOptions, 2);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status !== 'ready') throw new Error();
    expect(result.current.checkout.account?.bankName).toBe('신한은행');
    expect(result.current.depositorName).toBe('두둥이');
    expect(await sent.lines()).toEqual(
      expect.arrayContaining([
        'GET /api/v2/events/101/ticket-items/501/checkout',
        'GET /api/v2/me',
      ]),
    );
    const checkoutCall = (await sent.list()).find((r) => r.path.endsWith('/checkout'));
    expect(checkoutCall?.credentials).toBe('include');
  });

  it('주소가 틀리면 요청 없이 공연 상세로', async () => {
    const sent = recordRequests();
    const { result } = data(null);
    expect(result.current).toEqual({
      status: 'unavailable',
      reason: 'INVALID_PARAMS',
      backHref: '/events/101',
    });
    expect((await sent.lines()).filter((l) => l.includes('checkout'))).toEqual([]);
  });

  it.each([
    ['O-0 404(판매 중 아님·다른 공연 티켓)', 'NOT_FOUND', 999, []],
    ['매진', 'NOT_PURCHASABLE', CHECKOUT_TICKET.soldOut, []],
    [
      'PG 티켓',
      'UNSUPPORTED',
      CHECKOUT_TICKET.paidNoOptions,
      orderHandlers.checkoutWith({ payType: 'PRICE' }),
    ],
    [
      'v1 객관식 옵션',
      'UNSUPPORTED',
      CHECKOUT_TICKET.paidNoOptions,
      orderHandlers.checkoutWith({
        options: [
          {
            optionId: 1,
            name: '색',
            description: null,
            type: 'MULTIPLE_CHOICE',
            yesAdditionalPrice: null,
          },
        ],
      }),
    ],
  ] as const)('%s → %s(공연 상세로)', async (_, reason, ticketItemId, set) => {
    server.use(...set);
    const { result } = data(ticketItemId);
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'unavailable',
        reason,
        backHref: '/events/101',
      }),
    );
  });
});

describe('3분기 — 주문 생성 응답의 상태, 실제 보낸 본문, 완료 이동', () => {
  it('입금형(두둥): 결제하기 + 주문 확인(B23 — 입금 전에 주문), 일괄 옵션 본문 → 승인 대기, 응답을 O-3 키에 넣고 완료 주소로 replace', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 2);
    expect(r.result.current).toMatchObject({
      kind: 'TRANSFER',
      ctaLabel: '결제하기',
      needsOrderConfirm: true,
    });
    fill(r.result, { same: answers('YES', '  보컬 ') });
    const sent = recordRequests();
    await submitAndWait(r.result);

    const [post] = await posted(sent);
    expect(post?.body).toEqual({
      eventId: 101,
      ticketItemId: 501,
      quantity: 2,
      options: {
        applyToAll: true,
        answers: [
          { optionId: 701, answer: 'YES' },
          { optionId: 702, answer: '보컬' },
        ],
      },
      paymentChannel: 'BANK_TRANSFER',
      depositorName: '두둥이',
      agreeRefundPolicy: true,
      hostProvisionAgreed: true,
      dudoongTicketNoticeConfirmed: true,
      agreementVersion: '2026-11',
    });
    expect(CreateOrderRequestSchema.safeParse(post?.body).success).toBe(true);

    const uuid = created();
    expect(uuid).not.toBeNull();
    const order = r.queryClient.getQueryData<MyOrderDetail>(myOrderQuery(uuid!).queryKey)!;
    expect(order).toMatchObject({
      status: 'PENDING_APPROVE',
      paymentChannel: 'BANK_TRANSFER',
      depositorName: '두둥이',
    });
    // 계약: 화면 총액 == 응답 totalAmount
    expect(r.result.current.amount).toBe(50_000);
    expect(order.payment?.totalAmount).toBe(r.result.current.amount);
    expect(r.result.current.submitting).toBe(true);
  });

  it('무료 승인형: 신청하기, FREE + 입금자명 없음 → 승인 대기, 결제 정보 없음', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.freeApproval, 1);
    expect(r.result.current).toMatchObject({
      kind: 'FREE_APPROVAL',
      ctaLabel: '신청하기',
      needsOrderConfirm: false,
      account: null,
      amount: 0,
    });
    fill(r.result, { same: [{ optionId: 702, answer: '드럼' }] });
    const sent = recordRequests();
    await submitAndWait(r.result);
    const [post] = await posted(sent);
    expect(post?.body).toEqual({
      eventId: 101,
      ticketItemId: 505,
      quantity: 1,
      options: { applyToAll: true, answers: [{ optionId: 702, answer: '드럼' }] },
      paymentChannel: 'FREE',
      agreeRefundPolicy: true,
      hostProvisionAgreed: true,
      agreementVersion: '2026-11',
    });
    const order = r.queryClient.getQueryData<MyOrderDetail>(myOrderQuery(created()!).queryKey)!;
    expect(order).toMatchObject({ status: 'PENDING_APPROVE', payment: null, issuedTickets: [] });
  });

  it('무료 선착순: 신청하기 → 즉시 발급(APPROVED, 발급 티켓 = 수량)', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.freeFcfs, 2);
    expect(r.result.current.kind).toBe('FREE_FCFS');
    expect(r.result.current.hasOptions).toBe(false);
    fill(r.result);
    await submitAndWait(r.result);
    const order = r.queryClient.getQueryData<MyOrderDetail>(myOrderQuery(created()!).queryKey)!;
    expect(order.status).toBe('APPROVED');
    expect(order.issuedTickets).toHaveLength(2);
  });

  it('완료 주소에서 새로고침(새 캐시)해도 G11/O-3이 같은 내용을 준다', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 1);
    fill(r.result, { same: answers('NO', '기타') });
    await submitAndWait(r.result);
    const uuid = created()!;
    const fromCreate = r.queryClient.getQueryData(myOrderQuery(uuid).queryKey);
    const reloaded = await createTestQueryClient().fetchQuery(myOrderQuery(uuid));
    expect(reloaded).toEqual(fromCreate);
  });
});

describe('계약 — 클라이언트 총액 == 주문 응답 totalAmount(mock은 백엔드 식)', () => {
  it.each<[string, number, number, 'same' | 'individual', AnswerValue[][]]>([
    ['옵션 YES × 1', CHECKOUT_TICKET.paidWithOptions, 1, 'same', [answers('YES', 'a')]],
    ['옵션 NO × 4(1인 상한)', CHECKOUT_TICKET.paidWithOptions, 4, 'same', [answers('NO', 'a')]],
    [
      '옵션 YES × 3 일괄 — 추가금도 수량만큼',
      CHECKOUT_TICKET.paidWithOptions,
      3,
      'same',
      [answers('YES', 'a')],
    ],
    [
      '티켓별 YES·NO·YES',
      CHECKOUT_TICKET.paidWithOptions,
      3,
      'individual',
      [answers('YES', 'a'), answers('NO', 'b'), answers('YES', 'c')],
    ],
    ['옵션 없음 × 3(잔여 상한)', CHECKOUT_TICKET.paidNoOptions, 3, 'same', [[]]],
  ])('%s', async (_, ticketItemId, quantity, mode, sets) => {
    const r = await openCheckout(ticketItemId, quantity);
    act(() => {
      const { form } = r.result.current;
      if (mode === 'same') form.setValue('options.same', sets[0]!);
      else {
        form.setValue('options.mode', 'individual');
        form.setValue('options.tickets', sets);
      }
      form.setValue('agreeRefundPolicy', true);
      form.setValue('hostProvisionAgreed', true);
      form.setValue('dudoongTicketNoticeConfirmed', true);
    });
    const shown = r.result.current.amount;
    await submitAndWait(r.result);
    const order = readMockOrder(created()!)!;
    expect(order.payment?.totalAmount).toBe(shown);
    if (mode === 'individual')
      expect(order.lines.map((l) => l.quantity)).toEqual(sets.map(() => 1));
  });

  it('토스 송금: 주문 뒤 링크(B23) 금액 = 화면 총액 = 응답 totalAmount, 본문은 TOSS_TRANSFER', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 2);
    fill(r.result, { same: answers('YES', 'a') });
    act(() => r.result.current.form.setValue('paymentChannel', 'TOSS_TRANSFER'));
    const shown = r.result.current.amount;
    const sent = recordRequests();
    await submitAndWait(r.result);
    const [post] = await posted(sent);
    expect((post?.body as { paymentChannel: string }).paymentChannel).toBe('TOSS_TRANSFER');
    const order = r.queryClient.getQueryData<MyOrderDetail>(myOrderQuery(created()!).queryKey)!;
    const link = orderTossLink(order)!;
    const amount = new URL(link.replace('supertoss://', 'https://x.test/')).searchParams.get(
      'amount',
    );
    expect(Number(amount)).toBe(shown);
    expect(Number(amount)).toBe(order.payment?.totalAmount);
    expect(order.paymentChannel).toBe('TOSS_TRANSFER');
  });
});

describe('제출 — 중복 방지 · 검증', () => {
  it('연타해도 주문 요청은 한 번, 성공 뒤에는 다시 보내지 않는다', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    const sent = recordRequests();
    await act(async () => {
      await Promise.all([
        r.result.current.submit(),
        r.result.current.submit(),
        r.result.current.submit(),
      ]);
    });
    await act(() => r.result.current.submit());
    expect(await posted(sent)).toHaveLength(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('검증 실패(옵션 미응답·미동의)면 요청을 보내지 않고 칸 오류', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 1);
    const sent = recordRequests();
    expect(await act(() => r.result.current.validate())).toBe(false);
    await submitAndWait(r.result);
    expect(await posted(sent)).toEqual([]);
    const { getFieldState } = r.result.current.form;
    expect(getFieldState('options.same.0.answer').error?.message).toBe('답변을 선택해 주세요');
    expect(getFieldState('options.same.1.answer').error?.message).toBe('답변을 입력해 주세요');
    expect(getFieldState('agreeRefundPolicy').error?.message).toBe('환불 규정에 동의해 주세요');
  });

  it('닉네임이 없으면(입금자명 불가) 보내지 않고 폼 상단에 프로필 확인 안내', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1, null);
    fill(r.result);
    const sent = recordRequests();
    await submitAndWait(r.result);
    expect(await posted(sent)).toEqual([]);
    expect(r.result.current.submitError?.kind).toBe('DEPOSITOR_NAME');
  });

  it('주소 수량이 상한보다 크면 상한으로(잔여 3)', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 10);
    expect(r.result.current).toMatchObject({ quantity: 3, maxQuantity: 3, quantityAdjusted: true });
  });

  it('티켓별 모드: 같은 답이면 공통으로 합치고, 다르면 고르게 한다', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 2);
    fill(r.result, { same: answers('YES', 'x') });
    act(() => void r.result.current.setMode('individual'));
    expect(r.result.current.form.getValues('options.tickets')).toEqual([
      answers('YES', 'x'),
      answers('YES', 'x'),
    ]);
    act(() => r.result.current.form.setValue('options.tickets.1.0.answer', 'NO'));
    let outcome = '';
    act(() => {
      outcome = r.result.current.setMode('same');
    });
    expect(outcome).toBe('needsChoice');
    expect(r.result.current.mode).toBe('individual');
    act(() => void r.result.current.setMode('same', 1));
    expect(r.result.current.mode).toBe('same');
    expect(r.result.current.form.getValues('options.same')).toEqual(answers('NO', 'x'));
  });
});

describe('에러 분기 — patterns §24 P7 행(handleError)', () => {
  it.each([
    ['Order_400_22', 'DEPOSITOR_NAME'],
    ['Order_400_23', 'OPTION_ANSWERS'],
  ] as const)('%s → 폼 상단 오류(%s), 공용 토스트 없음', async (code, kind) => {
    server.use(...orderHandlers.createFails(code));
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(r.result.current.submitError?.kind).toBe(kind);
    expect(r.result.current.submitting).toBe(false);
    expect(errorToast).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ['Ticket_Item_400_1', 'STOCK'],
    ['Ticket_Item_400_6', 'PURCHASE_LIMIT'],
    ['Order_400_15', 'PENDING_LIMIT'],
  ] as const)('%s → %s 안내 + GP-5·O-0을 다시 읽어 상한 갱신', async (code, kind) => {
    server.use(...orderHandlers.createFails(code));
    const r = await openCheckout(CHECKOUT_TICKET.paidWithOptions, 4);
    fill(r.result, { same: answers('NO', 'x') });
    expect(r.result.current.maxQuantity).toBe(4);
    // 다시 읽으면 잔여가 1로 줄어 있다
    server.use(...orderHandlers.checkoutWith({ remaining: 1 }));
    const sent = recordRequests();
    await submitAndWait(r.result);

    expect(r.result.current.submitError?.kind).toBe(kind);
    await waitFor(() => expect(r.result.current.maxQuantity).toBe(1));
    expect(r.result.current.quantity).toBe(1);
    expect(await sent.lines()).toEqual(
      expect.arrayContaining([
        'POST /api/v2/me/orders',
        'GET /api/v2/events/101/ticket-items',
        'GET /api/v2/events/101/ticket-items/501/checkout',
      ]),
    );
    expect(errorToast).not.toHaveBeenCalled();
  });

  it.each([
    ['Event_400_5', '/events/101'],
    ['Event_400_6', '/events/101'],
    ['Ticket_Item_400_10', '/events/101'],
    ['Ticket_Item_404_1', '/events/101'],
    ['Event_404_1', '/events/101'],
  ] as const)('%s → 안내 토스트 + %s로 replace', async (code, to) => {
    server.use(...orderHandlers.createFails(code));
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(router.replace).toHaveBeenCalledWith(to);
    expect(toast).toHaveBeenCalledWith(expect.any(String), { id: `checkout:${code}` });
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('표에 없는 코드(Order_400_21)는 화면이 맡지 않는다 — 공용 토스트', async () => {
    server.use(...orderHandlers.createFails('Order_400_21'));
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(r.result.current.submitError).toBeNull();
    expect(errorToast).toHaveBeenCalledWith(expect.any(String), 'mutation:Order_400_21');
    // 실패 뒤에는 다시 낼 수 있다
    server.resetHandlers();
    await submitAndWait(r.result);
    expect(created()).not.toBeNull();
  });
});

describe('동의 칸(#840 — 2026-11-01 붙임) — 체크 전 제출 불가, 체크한 것만 보낸다', () => {
  it('칸 플래그: 호스트 제공 동의는 모든 주문, 입금 전 확인은 두둥만', async () => {
    const dudoong = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    expect(dudoong.result.current.agreementFields).toEqual({
      hostProvision: true,
      dudoongNotice: true,
    });
    const free = await openCheckout(CHECKOUT_TICKET.freeApproval, 1);
    expect(free.result.current.agreementFields).toEqual({
      hostProvision: true,
      dudoongNotice: false,
    });
  });

  it.each([
    ['호스트 제공 동의 미체크', { hostProvision: false }, 'hostProvisionAgreed'],
    ['두둥 입금 전 확인 미체크', { dudoongNotice: false }, 'dudoongTicketNoticeConfirmed'],
  ] as const)('두둥: %s → 요청하지 않고 그 칸 오류', async (_, patch, field) => {
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result, patch);
    const sent = recordRequests();
    await submitAndWait(r.result);
    expect(await posted(sent)).toEqual([]);
    let valid = true;
    await act(async () => {
      valid = await r.result.current.form.trigger(field);
    });
    expect(valid).toBe(false);
  });

  it('두둥: 모달을 열기 전 검증(validate)은 입금 전 확인을 보지 않는다 — 그 칸은 모달 안에 있다', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result, { dudoongNotice: false });
    let valid = false;
    await act(async () => {
      valid = await r.result.current.validate();
    });
    expect(valid).toBe(true);
    fill(r.result, { hostProvision: false, dudoongNotice: false });
    await act(async () => {
      valid = await r.result.current.validate();
    });
    expect(valid).toBe(false);
  });

  it('무료: 입금 전 확인 없이 호스트 제공 동의만으로 주문된다', async () => {
    const r = await openCheckout(CHECKOUT_TICKET.freeApproval, 1);
    fill(r.result, { same: [{ optionId: 702, answer: '드럼' }], dudoongNotice: false });
    await submitAndWait(r.result);
    expect(created()).not.toBeNull();
  });

  it('두둥: 둘 다 체크하면 둘 다 실려 동의 강제 백엔드도 통과한다(#384)', async () => {
    server.use(...orderHandlers.agreementEnforced);
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result, { hostProvision: true, dudoongNotice: true });
    const sent = recordRequests();
    await submitAndWait(r.result);
    const [post] = await posted(sent);
    expect(post?.body).toMatchObject({
      hostProvisionAgreed: true,
      dudoongTicketNoticeConfirmed: true,
      agreementVersion: '2026-11',
    });
    expect(created()).not.toBeNull();
  });

  it('무료: 호스트 제공 동의만 싣는다(두둥 확인은 체크돼 있어도 없다) — 동의 강제 백엔드 통과', async () => {
    server.use(...orderHandlers.agreementEnforced);
    const r = await openCheckout(CHECKOUT_TICKET.freeApproval, 1);
    fill(r.result, {
      same: [{ optionId: 702, answer: '드럼' }],
      hostProvision: true,
      dudoongNotice: true,
    });
    const sent = recordRequests();
    await submitAndWait(r.result);
    const [post] = await posted(sent);
    expect(post?.body).toMatchObject({ hostProvisionAgreed: true, agreementVersion: '2026-11' });
    expect(post?.body).not.toHaveProperty('dudoongTicketNoticeConfirmed');
    expect(created()).not.toBeNull();
  });

  it('서버가 동의를 거절(Agreement_400_1)하면 동의 칸을 풀고 폼 상단 안내 — 공용 토스트 없음, 다시 체크하면 낼 수 있다', async () => {
    server.use(http.post('*/api/v2/me/orders', ({ request }) => errors.agreementRequired(request)));
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(created()).toBeNull();
    expect(r.result.current.submitError?.kind).toBe('AGREEMENT');
    expect(r.result.current.form.getValues()).toMatchObject({
      hostProvisionAgreed: false,
      dudoongTicketNoticeConfirmed: false,
    });
    expect(errorToast).not.toHaveBeenCalled();
    server.resetHandlers();
    fill(r.result);
    await submitAndWait(r.result);
    expect(created()).not.toBeNull();
  });
});

describe('무료 선착순 확정 실패 — 주문이 아니라 에러', () => {
  it('확정 실패(재고)면 재고 분기, 완료로 가지 않는다', async () => {
    server.use(...orderHandlers.freeFcfsConfirmFails);
    const r = await openCheckout(CHECKOUT_TICKET.freeFcfs, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(r.result.current.submitError?.kind).toBe('STOCK');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('표에 없는 실패(5xx)도 화면이 "다시 시도" 안내로 맡고(공용 토스트 없음), 다시 내면 새 주문', async () => {
    server.use(http.post('*/api/v2/me/orders', ({ request }) => errors.serverError(request)));
    const r = await openCheckout(CHECKOUT_TICKET.freeFcfs, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(r.result.current.submitError?.kind).toBe('FREE_FCFS_FAILED');
    expect(errorToast).not.toHaveBeenCalled();

    server.resetHandlers();
    await submitAndWait(r.result);
    expect(
      r.queryClient.getQueryData<MyOrderDetail>(myOrderQuery(created()!).queryKey)?.status,
    ).toBe('APPROVED');
  });

  it('입금형의 5xx는 공용 토스트(화면 안내 없음)', async () => {
    server.use(http.post('*/api/v2/me/orders', ({ request }) => errors.serverError(request)));
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(r.result.current.submitError).toBeNull();
    expect(errorToast).toHaveBeenCalled();
  });
});

describe('응답을 받지 못한 주문(이슈 #92-4)', () => {
  it.each([
    ['입금형', CHECKOUT_TICKET.paidNoOptions],
    ['무료 선착순', CHECKOUT_TICKET.freeFcfs],
  ])(
    '%s — 네트워크 실패면 [다시 시도] · 주문내역 안내(공용 토스트 없음), 주문 목록을 무효화',
    async (_, ticket) => {
      server.use(http.post('*/api/v2/me/orders', () => HttpResponse.error()));
      const r = await openCheckout(ticket, 1);
      const invalidate = vi.spyOn(r.queryClient, 'invalidateQueries');
      fill(r.result);
      await submitAndWait(r.result);
      expect(r.result.current.submitError).toMatchObject({
        kind: 'ORDER_UNCERTAIN',
        retrySameKey: true,
      });
      expect(errorToast).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'orders', 'infinite'] });
    },
  );
});

describe('Idempotency-Key(#923) — 시도마다 새 키, 재시도에만 같은 키', () => {
  /** O-1에 실린 키(기본 처리로 넘긴다) */
  function recordKeys() {
    const keys: (string | null)[] = [];
    server.use(
      http.post('*/api/v2/me/orders', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return undefined;
      }),
    );
    return keys;
  }

  it('키는 서버 형식(영문·숫자·_·- 8~64자)이고 값은 요청마다 실린다', async () => {
    const keys = recordKeys();
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(IDEMPOTENCY_KEY_PATTERN);
    expect(created()).not.toBeNull();
  });

  it('응답이 끊긴 뒤 다시 보내면 같은 키 — 서버가 앞 주문을 돌려줘 주문이 하나만 생긴다', async () => {
    // 앞 테스트의 같은 본문 주문이 10초 중복 판정에 걸리지 않게
    resetOrderStore();
    server.use(...orderHandlers.createLosesResponseOnce());
    const keys = recordKeys();
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    const before = mockOrderCount();
    await submitAndWait(r.result);
    expect(r.result.current.submitError?.kind).toBe('ORDER_UNCERTAIN');
    expect(mockOrderCount()).toBe(before + 1);

    await submitAndWait(r.result);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect(mockOrderCount()).toBe(before + 1);
    expect(readMockOrder(created()!)).toBeDefined();
  });

  it.each(['Order_400_26', 'Redisson_500_1'] as const)(
    '%s(처리 중)는 이동하지 않고 [다시 시도] 안내 — 다시 보내면 같은 키',
    async (code) => {
      server.use(...orderHandlers.createFails(code));
      const keys = recordKeys();
      const r = await openCheckout(CHECKOUT_TICKET.freeFcfs, 1);
      fill(r.result);
      await submitAndWait(r.result);
      expect(r.result.current.submitError).toMatchObject({
        kind: 'DUPLICATE_IN_PROGRESS',
        retrySameKey: true,
      });
      expect(router.replace).not.toHaveBeenCalled();
      expect(errorToast).not.toHaveBeenCalled();

      server.resetHandlers();
      const again = recordKeys();
      await submitAndWait(r.result);
      expect(again[0]).toBe(keys[0]);
      expect(created()).not.toBeNull();
    },
  );

  it('주문이 생기지 않은 게 확실한 실패(4xx) 뒤의 제출은 새 시도 — 새 키', async () => {
    server.use(...orderHandlers.createFails('Ticket_Item_400_6'));
    const keys = recordKeys();
    const r = await openCheckout(CHECKOUT_TICKET.paidNoOptions, 1);
    fill(r.result);
    await submitAndWait(r.result);
    server.resetHandlers();
    const again = recordKeys();
    await submitAndWait(r.result);
    expect(again[0]).toMatch(IDEMPOTENCY_KEY_PATTERN);
    expect(again[0]).not.toBe(keys[0]);
  });

  it('키를 남길지: 응답 없음 · 5xx · 처리 중만', () => {
    expect(keepsAttemptKey(new ApiError(0, 'TIMEOUT', ''))).toBe(true);
    expect(keepsAttemptKey(new ApiError(502, 'BAD_GATEWAY', ''))).toBe(true);
    expect(keepsAttemptKey(new ApiError(400, 'Order_400_26', ''))).toBe(true);
    expect(keepsAttemptKey(new ApiError(400, 'Ticket_Item_400_1', ''))).toBe(false);
    expect(keepsAttemptKey(new ApiError(400, 'BAD_REQUEST', ''))).toBe(false);
    expect(keepsAttemptKey(new Error('x'))).toBe(false);
  });
});

describe('mock 세션', () => {
  it('세션 쿼리는 로그인 mock 사용자', async () => {
    server.use(http.get('*/api/v2/me', () => ok(me)));
    expect((await createTestQueryClient().fetchQuery(meQuery()))?.name).toBe('두둥이');
  });
});
