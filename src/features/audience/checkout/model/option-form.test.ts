import { describe, expect, it } from 'vitest';

import {
  CHECKOUT_EVENT_ID,
  CHECKOUT_TICKET,
  findCheckoutTicket,
} from '@/api/__mocks__/fixtures/order';
import { orderTotalAmount } from '@/api/order/price';
import { CreateOrderRequestSchema } from '@/api/order/schema';
import { AGREEMENT_VERSION } from '@/api/shared/agreement';
import type { PublicTicketItem } from '@/api/ticket-item/schema';

import {
  type AnswerValue,
  checkoutAgreementFields,
  checkoutFormSchema,
  type CheckoutFormValues,
  DUDOONG_NOTICE_FIELD,
  effectiveMode,
  firstInvalidTicket,
  HOST_PROVISION_FIELD,
  initialCheckoutValues,
  OPTION_ERROR,
  resizeTickets,
  sameToTickets,
  ticketsAgree,
  toAmountInput,
  toOrderBody,
  unanswerableOption,
} from './option-form';

const ticket = (id: number) => findCheckoutTicket(CHECKOUT_EVENT_ID, id).ticket!;
/** 501: 네/아니오(701, +10,000) + 주관식(702), 15,000원 */
const withOptions = ticket(CHECKOUT_TICKET.paidWithOptions);
const noOptions = ticket(CHECKOUT_TICKET.paidNoOptions);
const free = ticket(CHECKOUT_TICKET.freeFcfs);

const a = (yesNo: string | undefined, text: string | undefined): AnswerValue[] => [
  { optionId: 701, answer: yesNo },
  { optionId: 702, answer: text },
];

const values = (
  patch: Partial<CheckoutFormValues['options']>,
  t = withOptions,
): CheckoutFormValues => {
  const init = initialCheckoutValues(t);
  return { ...init, options: { ...init.options, ...patch }, agreeRefundPolicy: true };
};

const ctx = (t: PublicTicketItem, quantity: number) => ({
  eventId: CHECKOUT_EVENT_ID,
  ticket: t,
  quantity,
  depositorName: '두둥이',
});

describe('초기값 · 모드', () => {
  it('옵션 순서대로 미응답(undefined) 묶음, 결제 방식은 두둥 = 직접 계좌이체 / 무료 = FREE, 미동의', () => {
    expect(initialCheckoutValues(withOptions)).toEqual({
      options: { mode: 'same', same: a(undefined, undefined), tickets: [] },
      paymentChannel: 'BANK_TRANSFER',
      agreeRefundPolicy: false,
      hostProvisionAgreed: false,
      dudoongTicketNoticeConfirmed: false,
    });
    expect(initialCheckoutValues(free).paymentChannel).toBe('FREE');
  });

  it('수량 1이면 모드와 상관없이 same', () => {
    expect(effectiveMode('individual', 1)).toBe('same');
    expect(effectiveMode('individual', 2)).toBe('individual');
  });

  it('same → individual: 공통 응답을 수량만큼 복사(서로 다른 객체)', () => {
    const tickets = sameToTickets(a('YES', '보컬'), 3);
    expect(tickets).toEqual([a('YES', '보컬'), a('YES', '보컬'), a('YES', '보컬')]);
    tickets[0]![0]!.answer = 'NO';
    expect(tickets[1]![0]!.answer).toBe('YES');
  });

  it('individual → same: 모두 같으면 바로, 다르면 고르게 한다', () => {
    expect(ticketsAgree([a('YES', 'x'), a('YES', 'x')])).toBe(true);
    expect(ticketsAgree([a('YES', 'x'), a('NO', 'x')])).toBe(false);
    expect(ticketsAgree([a(undefined, ''), a(undefined, undefined)])).toBe(true);
  });

  it('수량이 바뀌면 앞 묶음은 두고 모자라면 빈 묶음', () => {
    expect(resizeTickets([a('YES', '1'), a('NO', '2')], 3, withOptions)).toEqual([
      a('YES', '1'),
      a('NO', '2'),
      a(undefined, undefined),
    ]);
    expect(resizeTickets([a('YES', '1'), a('NO', '2')], 1, withOptions)).toEqual([a('YES', '1')]);
  });

  it('v2에서 답할 수 없는 옵션(MULTIPLE_CHOICE·UNKNOWN)이 붙은 티켓은 주문 불가', () => {
    expect(unanswerableOption(withOptions)).toBeNull();
    const v1 = {
      ...withOptions,
      options: [{ ...withOptions.options[0]!, type: 'MULTIPLE_CHOICE' as const }],
    };
    expect(unanswerableOption(v1)?.optionId).toBe(701);
  });
});

describe('검증 — 옵션 전부 필수', () => {
  const issues = (v: CheckoutFormValues, quantity: number, t = withOptions) =>
    checkoutFormSchema(t, quantity)
      .safeParse(v)
      .error?.issues.map((i) => [i.path.join('.'), i.message]) ?? [];

  it.each<[string, AnswerValue[], [string, string][]]>([
    ['모두 답함', a('YES', '보컬'), []],
    ['NO도 답이다', a('NO', '보컬'), []],
    [
      '네/아니오 미응답(undefined)',
      a(undefined, '보컬'),
      [['options.same.0.answer', OPTION_ERROR.choose]],
    ],
    ['주관식 공백만', a('YES', '   '), [['options.same.1.answer', OPTION_ERROR.required]]],
    ['주관식 255자', a('YES', '가'.repeat(255)), []],
    ['주관식 256자', a('YES', '가'.repeat(256)), [['options.same.1.answer', OPTION_ERROR.tooLong]]],
  ])('same: %s', (_, same, expected) => {
    expect(issues(values({ same }), 2)).toEqual(expected);
  });

  it('individual: 티켓마다 검사하고 첫 오류 티켓을 알려 준다', () => {
    const v = values({
      mode: 'individual',
      tickets: [a('YES', '1'), a(undefined, '2'), a('NO', '')],
    });
    expect(issues(v, 3)).toEqual([
      ['options.tickets.1.0.answer', OPTION_ERROR.choose],
      ['options.tickets.2.1.answer', OPTION_ERROR.required],
    ]);
    expect(firstInvalidTicket({ options: { tickets: [undefined, {}, {}] } })).toBe(1);
    expect(firstInvalidTicket({ options: {} })).toBeNull();
  });

  it('individual이지만 수량 1이면 same 칸을 본다', () => {
    const v = values({
      mode: 'individual',
      same: a('YES', '1'),
      tickets: [a(undefined, undefined)],
    });
    expect(issues(v, 1)).toEqual([]);
  });

  it('옵션 없는 티켓은 옵션 칸을 보지 않는다', () => {
    expect(issues(values({}, noOptions), 2, noOptions)).toEqual([]);
  });

  it('환불 규정 미동의, 무료에 계좌이체', () => {
    const v = { ...values({ same: a('YES', '1') }), agreeRefundPolicy: false };
    expect(issues(v, 1)).toEqual([['agreeRefundPolicy', OPTION_ERROR.agree]]);
    const freeV = {
      ...initialCheckoutValues(free),
      agreeRefundPolicy: true,
      paymentChannel: 'BANK_TRANSFER' as const,
    };
    expect(issues(freeV, 1, free).map(([p]) => p)).toEqual(['paymentChannel']);
  });
});

describe('주문 동의 칸(#840 — Q42 대기, #384 강제 임박)', () => {
  const ON = { hostProvision: true, dudoongNotice: true };
  const issues = (v: CheckoutFormValues, t: PublicTicketItem, fields = ON) =>
    checkoutFormSchema(t, 1, fields)
      .safeParse(v)
      .error?.issues.map((i) => [i.path.join('.'), i.message]) ?? [];

  it('지금은 칸이 없다 — 미체크여도 통과', () => {
    expect([HOST_PROVISION_FIELD, DUDOONG_NOTICE_FIELD]).toEqual([false, false]);
    expect(checkoutAgreementFields(noOptions)).toEqual({
      hostProvision: false,
      dudoongNotice: false,
    });
    expect(checkoutFormSchema(noOptions, 1).safeParse(values({}, noOptions)).success).toBe(true);
  });

  it('칸을 켜면 두둥은 둘 다, 무료는 호스트 제공 동의만 필수', () => {
    expect(checkoutAgreementFields(noOptions, ON)).toEqual(ON);
    expect(checkoutAgreementFields(free, ON)).toEqual({
      hostProvision: true,
      dudoongNotice: false,
    });
    expect(issues(values({}, noOptions), noOptions)).toEqual([
      ['hostProvisionAgreed', OPTION_ERROR.hostProvision],
      ['dudoongTicketNoticeConfirmed', OPTION_ERROR.dudoongNotice],
    ]);
    const freeV = { ...initialCheckoutValues(free), agreeRefundPolicy: true };
    expect(issues(freeV, free)).toEqual([['hostProvisionAgreed', OPTION_ERROR.hostProvision]]);
    expect(issues({ ...freeV, hostProvisionAgreed: true }, free)).toEqual([]);
    expect(
      issues(
        { ...values({}, noOptions), hostProvisionAgreed: true, dudoongTicketNoticeConfirmed: true },
        noOptions,
      ),
    ).toEqual([]);
  });

  it.each<[string, PublicTicketItem, boolean, boolean, Record<string, unknown>]>([
    ['미체크 → 동의 키가 하나도 없다', noOptions, false, false, {}],
    [
      '두둥 + 둘 다 체크 → 둘 다 + agreementVersion',
      noOptions,
      true,
      true,
      {
        hostProvisionAgreed: true,
        dudoongTicketNoticeConfirmed: true,
        agreementVersion: AGREEMENT_VERSION,
      },
    ],
    [
      '두둥 + 호스트 제공만 → hostProvisionAgreed + agreementVersion',
      noOptions,
      true,
      false,
      { hostProvisionAgreed: true, agreementVersion: AGREEMENT_VERSION },
    ],
    [
      '무료 + 둘 다 체크 → 두둥 확인은 싣지 않는다',
      free,
      true,
      true,
      { hostProvisionAgreed: true, agreementVersion: AGREEMENT_VERSION },
    ],
  ])('본문: %s', (_, t, host, notice, expected) => {
    const v = {
      ...(t === free ? { ...initialCheckoutValues(free), agreeRefundPolicy: true } : values({}, t)),
      hostProvisionAgreed: host,
      dudoongTicketNoticeConfirmed: notice,
    };
    const body = toOrderBody(v, ctx(t, 1));
    const keys = [
      'hostProvisionAgreed',
      'dudoongTicketNoticeConfirmed',
      'agreementVersion',
    ] as const;
    expect(Object.fromEntries(keys.filter((k) => k in body).map((k) => [k, body[k]]))).toEqual(
      expected,
    );
    expect(CreateOrderRequestSchema.safeParse(body).success).toBe(true);
  });
});

describe('제출 본문 — 2모드가 요청 스키마를 통과', () => {
  it('same → options{applyToAll: true, answers}(주관식 trim)', () => {
    const body = toOrderBody(values({ same: a('YES', '  보컬 ') }), ctx(withOptions, 2));
    expect(body).toEqual({
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
    });
    expect(CreateOrderRequestSchema.safeParse(body).success).toBe(true);
  });

  it('individual → options{applyToAll: false, answers: []} + perTicketOptions(길이 = 수량)', () => {
    const v = values({
      mode: 'individual',
      tickets: [a('YES', '1'), a('NO', '2'), a('NO', '버림')],
    });
    const body = toOrderBody(v, ctx(withOptions, 2));
    expect(body.options).toEqual({ applyToAll: false, answers: [] });
    expect(body.perTicketOptions).toEqual([
      [
        { optionId: 701, answer: 'YES' },
        { optionId: 702, answer: '1' },
      ],
      [
        { optionId: 701, answer: 'NO' },
        { optionId: 702, answer: '2' },
      ],
    ]);
    expect(CreateOrderRequestSchema.safeParse(body).success).toBe(true);
  });

  it('옵션 없음 → answers: [], 무료 → FREE + 입금자명 없음', () => {
    const paid = toOrderBody(values({}, noOptions), ctx(noOptions, 3));
    expect(paid.options).toEqual({ applyToAll: true, answers: [] });
    expect(CreateOrderRequestSchema.safeParse(paid).success).toBe(true);

    const freeBody = toOrderBody(
      { ...initialCheckoutValues(free), agreeRefundPolicy: true },
      ctx(free, 2),
    );
    expect(freeBody).not.toHaveProperty('depositorName');
    expect(freeBody.paymentChannel).toBe('FREE');
    expect(CreateOrderRequestSchema.safeParse(freeBody).success).toBe(true);
  });

  it('토스 송금을 고르면 TOSS_TRANSFER', () => {
    const v = { ...values({ same: a('NO', 'x') }), paymentChannel: 'TOSS_TRANSFER' as const };
    expect(toOrderBody(v, ctx(withOptions, 1)).paymentChannel).toBe('TOSS_TRANSFER');
  });
});

describe('금액 입력 — 옵션 가산 2모드', () => {
  const total = (v: CheckoutFormValues, quantity: number, t = withOptions) =>
    orderTotalAmount(toAmountInput(v, t, quantity));

  it.each<[string, CheckoutFormValues, number, number]>([
    ['same YES × 2 → (15,000 + 10,000) × 2', values({ same: a('YES', 'x') }), 2, 50_000],
    ['same NO × 2', values({ same: a('NO', 'x') }), 2, 30_000],
    ['same 미응답은 0원', values({}), 1, 15_000],
    [
      'individual YES·NO',
      values({ mode: 'individual', tickets: [a('YES', 'x'), a('NO', 'x')] }),
      2,
      40_000,
    ],
    [
      'individual 수량 1이면 same 칸',
      values({ mode: 'individual', same: a('YES', 'x'), tickets: [a('NO', 'x')] }),
      1,
      25_000,
    ],
    ['수량 100 상한', values({ same: a('YES', 'x') }), 100, 2_500_000],
  ])('%s', (_, v, quantity, expected) => {
    expect(total(v, quantity)).toBe(expected);
  });

  it('무료는 0원', () => {
    expect(total({ ...initialCheckoutValues(free), agreeRefundPolicy: true }, 5, free)).toBe(0);
  });
});
