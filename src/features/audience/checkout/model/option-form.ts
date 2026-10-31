import { z } from 'zod';

import type { OrderAmountInput } from '@/api/order/price';
import { optionAdditionalPrice } from '@/api/order/price';
import {
  type CreateOrderRequest,
  type PaymentChannel,
  SUBJECTIVE_ANSWER_MAX,
} from '@/api/order/schema';
import type { PublicTicketItem, PublicTicketOption } from '@/api/ticket-item/schema';

/**
 * 체크아웃 폼 모델(tech-decisions §18). RHF + zod. 화면의 옵션 두 모드(모든 티켓 동일 / 티켓별)를 두고 제출 때 서버 본문으로 바꾼다.
 *
 * 폼 값은 두 모드의 칸을 **둘 다** 둔다(`same`, `tickets`) — 모드를 오가도 RHF 필드가 사라지지 않고, 검증은 `mode`가 고른 쪽만 한다.
 * (§18 초안의 판별 union과 같은 뜻이다. RHF 필드 배열이 union 경로를 바꾸며 다시 등록되는 것을 피했다.)
 *
 * 규칙(백엔드 `V2UserOrderDomainService.cartAnswers`):
 * - 티켓에 붙은 옵션은 **전부 필수**, 각 한 번씩. 네/아니오는 `YES`/`NO`, 주관식은 trim 후 1~255자
 * - 미응답 네/아니오는 `undefined`로 둔다(`NO`와 구분)
 * - 수량 1이면 모드 선택 없이 same
 * - v2에서 답할 수 없는 형식(v1 `MULTIPLE_CHOICE`·`UNKNOWN`)이 붙은 티켓은 주문할 수 없다(`unanswerableOption`)
 */

export type AnswerValue = { optionId: number; answer: string | undefined };
export type OptionMode = 'same' | 'individual';

export type CheckoutFormValues = {
  options: { mode: OptionMode; same: AnswerValue[]; tickets: AnswerValue[][] };
  paymentChannel: PaymentChannel;
  agreeRefundPolicy: boolean;
};

export const OPTION_ERROR = {
  choose: '답변을 선택해 주세요',
  required: '답변을 입력해 주세요',
  tooLong: `${SUBJECTIVE_ANSWER_MAX}자 이하로 입력해 주세요`,
  agree: '환불 규정에 동의해 주세요',
} as const;

/** v2 주문에서 답할 수 있는 옵션인지 */
const answerable = (o: PublicTicketOption) => o.type === 'YES_NO' || o.type === 'SUBJECTIVE';

/** 답할 수 없는 옵션이 붙어 있으면 그 옵션(주문 불가 — 서버도 `Order_400_23`) */
export const unanswerableOption = (ticket: PublicTicketItem) =>
  ticket.options.find((o) => !answerable(o)) ?? null;

export const hasOptions = (ticket: PublicTicketItem) => ticket.options.length > 0;

/** 빈 답 묶음(티켓 옵션 순서) */
export const blankAnswers = (ticket: PublicTicketItem): AnswerValue[] =>
  ticket.options.map((o) => ({ optionId: o.optionId, answer: undefined }));

/** 결제 방식 기본값. 두둥은 직접 계좌이체, 무료는 FREE(고를 수 없다) */
export const defaultPaymentChannel = (ticket: PublicTicketItem): PaymentChannel =>
  ticket.payType === 'FREE' ? 'FREE' : 'BANK_TRANSFER';

export function initialCheckoutValues(ticket: PublicTicketItem): CheckoutFormValues {
  return {
    options: { mode: 'same', same: blankAnswers(ticket), tickets: [] },
    paymentChannel: defaultPaymentChannel(ticket),
    agreeRefundPolicy: false,
  };
}

// ─── 모드 전환 ───────────────────────────────────────────────

const copy = (answers: readonly AnswerValue[]) => answers.map((a) => ({ ...a }));

/** same → individual: 지금 공통 응답을 수량만큼 복사 */
export const sameToTickets = (same: readonly AnswerValue[], quantity: number) =>
  Array.from({ length: quantity }, () => copy(same));

const sameAnswers = (a: readonly AnswerValue[], b: readonly AnswerValue[]) =>
  a.length === b.length &&
  a.every((x, i) => x.optionId === b[i]?.optionId && (x.answer ?? '') === (b[i]?.answer ?? ''));

/** individual → same: 티켓별 응답이 모두 같으면 바로 합칠 수 있다. 다르면 어느 세트를 쓸지 사용자가 골라야 한다 */
export const ticketsAgree = (tickets: readonly AnswerValue[][]) =>
  tickets.every((t) => sameAnswers(t, tickets[0] ?? []));

/** 수량이 바뀌면 티켓별 묶음 수를 맞춘다. 앞 묶음은 유지하고 모자라면 빈 묶음을 더한다 */
export function resizeTickets(
  tickets: readonly AnswerValue[][],
  quantity: number,
  ticket: PublicTicketItem,
): AnswerValue[][] {
  const kept = tickets.slice(0, quantity).map(copy);
  while (kept.length < quantity) kept.push(blankAnswers(ticket));
  return kept;
}

/** 수량 1이면 모드와 상관없이 same으로 다룬다 */
export const effectiveMode = (mode: OptionMode, quantity: number): OptionMode =>
  quantity <= 1 ? 'same' : mode;

// ─── 검증 ────────────────────────────────────────────────────

function answerSetSchema(ticket: PublicTicketItem) {
  return z
    .array(z.object({ optionId: z.number(), answer: z.string().optional() }))
    .superRefine((answers, ctx) => {
      ticket.options.forEach((option, i) => {
        const value = answers[i]?.answer;
        const path = [i, 'answer'];
        if (option.type === 'YES_NO') {
          if (value !== 'YES' && value !== 'NO') {
            ctx.addIssue({ code: 'custom', path, message: OPTION_ERROR.choose });
          }
          return;
        }
        const trimmed = value?.trim() ?? '';
        if (trimmed.length === 0)
          ctx.addIssue({ code: 'custom', path, message: OPTION_ERROR.required });
        else if (trimmed.length > SUBJECTIVE_ANSWER_MAX) {
          ctx.addIssue({ code: 'custom', path, message: OPTION_ERROR.tooLong });
        }
      });
    });
}

/**
 * 폼 스키마. 티켓 옵션과 수량에 따라 만든다(수량이 바뀌면 resolver도 바뀐다).
 * 옵션이 없는 티켓은 옵션 칸을 보지 않는다.
 */
export function checkoutFormSchema(ticket: PublicTicketItem, quantity: number) {
  const set = answerSetSchema(ticket);
  const transfer = ticket.payType !== 'FREE';
  return z.object({
    options: z
      .object({
        mode: z.enum(['same', 'individual']),
        same: z.array(z.object({ optionId: z.number(), answer: z.string().optional() })),
        tickets: z.array(
          z.array(z.object({ optionId: z.number(), answer: z.string().optional() })),
        ),
      })
      .superRefine((options, ctx) => {
        if (!hasOptions(ticket)) return;
        const mode = effectiveMode(options.mode, quantity);
        if (mode === 'same') {
          const r = set.safeParse(options.same);
          r.error?.issues.forEach((issue) =>
            ctx.addIssue({ code: 'custom', path: ['same', ...issue.path], message: issue.message }),
          );
          return;
        }
        if (options.tickets.length < quantity) {
          ctx.addIssue({ code: 'custom', path: ['tickets'], message: OPTION_ERROR.required });
        }
        options.tickets.slice(0, quantity).forEach((answers, t) => {
          set.safeParse(answers).error?.issues.forEach((issue) =>
            ctx.addIssue({
              code: 'custom',
              path: ['tickets', t, ...issue.path],
              message: issue.message,
            }),
          );
        });
      }),
    paymentChannel: transfer ? z.enum(['BANK_TRANSFER', 'TOSS_TRANSFER']) : z.literal('FREE'),
    agreeRefundPolicy: z.literal(true, { error: OPTION_ERROR.agree }),
  });
}

/**
 * 검증 실패 중 첫 오류 티켓(티켓별 모드의 아코디언을 열 위치 — tech-decisions §18 "첫 오류 티켓의 아코디언을 열고 focus").
 * 공통 모드 오류면 `null`.
 */
export function firstInvalidTicket(errors: { options?: { tickets?: unknown } } | undefined) {
  const tickets = errors?.options?.tickets;
  if (!Array.isArray(tickets)) return null;
  const i = tickets.findIndex((t) => t !== undefined && t !== null);
  return i === -1 ? null : i;
}

// ─── 서버 본문 · 금액 ─────────────────────────────────────────

const toAnswers = (answers: readonly AnswerValue[]) =>
  answers.map((a) => ({ optionId: a.optionId, answer: (a.answer ?? '').trim() }));

/**
 * 폼 값 → P11/O-1 본문(검증을 통과한 값을 넣는다).
 * - 옵션 없음 · same: `options{applyToAll: true, answers}`
 * - individual: `options{applyToAll: false, answers: []}` + `perTicketOptions`(길이 = 수량).
 *   `options`를 빼면 서버가 일괄로 본다(`V2CreateOrderRequest.applyToAll()`) — 반드시 함께 보낸다
 * - 입금자명은 계좌이체일 때만(무료는 서버가 무시하므로 보내지 않는다)
 * - 동의 기록(#840) `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`·`agreementVersion`은 보내지 않는다.
 *   TODO(Q42): 값을 만들 칸(호스트 제공 동의 체크, 두둥티켓 고지 확인)이 v2 체크아웃 계획에 없다 — 칸 없이 `true`를 만들지 않는다.
 *   칸이 생기면 폼 값으로 `agreementFields({...})`(`src/api/shared/agreement.ts`)를 펼친다. 백엔드가 동의 강제를 켜면 이 본문은
 *   400 `Agreement_400_1`이다(mock `orderHandlers.agreementEnforced`)
 */
export function toOrderBody(
  values: CheckoutFormValues,
  ctx: {
    eventId: number;
    ticket: PublicTicketItem;
    quantity: number;
    depositorName: string | null;
  },
): CreateOrderRequest {
  const { ticket, quantity } = ctx;
  const mode = hasOptions(ticket) ? effectiveMode(values.options.mode, quantity) : 'same';
  const optionsPart: Pick<CreateOrderRequest, 'options' | 'perTicketOptions'> =
    mode === 'same'
      ? {
          options: {
            applyToAll: true,
            answers: hasOptions(ticket) ? toAnswers(values.options.same) : [],
          },
        }
      : {
          options: { applyToAll: false, answers: [] },
          perTicketOptions: values.options.tickets.slice(0, quantity).map(toAnswers),
        };
  const transfer = values.paymentChannel !== 'FREE';
  return {
    eventId: ctx.eventId,
    ticketItemId: ticket.ticketItemId,
    quantity,
    ...optionsPart,
    paymentChannel: values.paymentChannel,
    ...(transfer ? { depositorName: ctx.depositorName ?? '' } : {}),
    agreeRefundPolicy: true,
  };
}

/** 폼 값 → `orderTotalAmount` 입력. 답하지 않은 옵션은 0원으로 본다(입력 중에도 금액이 보인다) */
export function toAmountInput(
  values: Pick<CheckoutFormValues, 'options'>,
  ticket: PublicTicketItem,
  quantity: number,
): OrderAmountInput {
  const yesPrice = new Map(ticket.options.map((o) => [o.optionId, o.yesAdditionalPrice]));
  const priced = (answers: readonly AnswerValue[]) =>
    answers.map((a) => ({
      additionalPrice: optionAdditionalPrice(yesPrice.get(a.optionId) ?? null, a.answer),
    }));
  const mode = hasOptions(ticket) ? effectiveMode(values.options.mode, quantity) : 'same';
  if (mode === 'same') {
    return {
      price: ticket.price,
      quantity,
      options: { applyToAll: true, answers: hasOptions(ticket) ? priced(values.options.same) : [] },
    };
  }
  return {
    price: ticket.price,
    quantity,
    options: { applyToAll: false, perTicket: values.options.tickets.map(priced) },
  };
}
