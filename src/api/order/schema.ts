import { z } from 'zod';

import { EventDisplayStatusSchema } from '../event/schema';
import { AGREEMENT_VERSION_MAX } from '../shared/agreement';
import { openEnum } from '../shared/open-enum';
import { pageSchema } from '../shared/page';
import { PublicTicketItemSchema, TicketPayTypeSchema } from '../ticket-item/schema';
import { MAX_ORDER_QUANTITY } from './price';

/**
 * 사용자 주문(11 문서) 스키마. 기준: 백엔드 dev 24aa595(계좌 `bankCode`·동의 필드는 432cce4)
 * - 응답 `v2/order/dto/response/V2CheckoutResponse.kt`(G11/O-0), `V2MyOrderResponses.kt`(`V2MyOrderDetailResponse` — O-1·O-3·O-4 공통)
 * - 요청 `v2/order/dto/request/V2OrderRequests.kt`(`V2CreateOrderRequest`) + 도메인 검증 `V2UserOrderDomainService`
 * - 요청·응답 예시 `e2e-tests/test_45_v2_order.py`
 */

// ─── enum ────────────────────────────────────────────────────

/** 결제 방식(api-contract §3). 두둥티켓 = 계좌이체 둘 중 하나, 무료 = FREE. v1 주문은 응답이 null */
export const PAYMENT_CHANNELS = ['BANK_TRANSFER', 'TOSS_TRANSFER', 'FREE'] as const;
export const PaymentChannelSchema = openEnum('PaymentChannel', PAYMENT_CHANNELS);
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

/** 사용자 주문 상태. 결제 진행 중·실패(FAILED)는 사용자에게 보이지 않아 null로 온다(`V2MyOrderStatus.of`) */
export const MY_ORDER_STATUSES = [
  'PENDING_APPROVE',
  'APPROVED',
  'REFUSED',
  'CANCELED',
  'REFUNDED',
] as const;
export const MyOrderStatusSchema = openEnum('MyOrderStatus', MY_ORDER_STATUSES);
export type MyOrderStatus = z.infer<typeof MyOrderStatusSchema>;

/** G11/O-2 `status` 필터(`V2MyOrderStatusFilter`). 기본 ALL. 화면은 아직 필터를 쓰지 않는다(Q36) */
export const MY_ORDER_STATUS_FILTERS = ['ALL', ...MY_ORDER_STATUSES] as const;
export type MyOrderStatusFilter = (typeof MY_ORDER_STATUS_FILTERS)[number];

export const REFUND_STATUSES = ['NONE', 'REQUESTED', 'COMPLETED'] as const;
export const RefundStatusSchema = openEnum('RefundStatus', REFUND_STATUSES);
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

export const REFUSE_REASON_TYPES = [
  'DEPOSIT_UNCONFIRMED',
  'AMOUNT_MISMATCH',
  'SOLD_OUT',
  'ETC',
] as const;
export const RefuseReasonTypeSchema = openEnum('RefuseReasonType', REFUSE_REASON_TYPES);
export type RefuseReasonType = z.infer<typeof RefuseReasonTypeSchema>;

/** 입장 상태(발급 티켓) */
export const ENTRANCE_STATES = ['BEFORE', 'DONE', 'CANCELED'] as const;
export const EntranceStateSchema = openEnum('EntranceState', ENTRANCE_STATES);

/** 주문상세의 발급 티켓 선물 상태. 주문자만 보므로 RECEIVED는 오지 않는다(#719) — 값은 enum 전체를 받는다 */
export const ORDER_GIFT_STATES = ['NONE', 'PENDING', 'SENT', 'RECEIVED'] as const;
export const OrderGiftStateSchema = openEnum('OrderGiftState', ORDER_GIFT_STATES);

// ─── 응답 ────────────────────────────────────────────────────

/**
 * 은행 코드(금융결제원 3자리, `BankCode` @432cce4 — #804). 응답에서는 서버가 `bankName`으로 추정한 값이고 모르는 은행명이면 `null`.
 * 요청 계좌(티켓 계좌 P10/T-2·T-3, 환불 계좌 P11/O-4·O-5)에서는 선택 — 보내면 `bankName`보다 우선하고(서버가 표시 이름으로
 * 채운다) 모르는 코드는 400. 값은 은행 목록 `GET /api/v2/banks`의 `code`. 요청 스키마는 그 화면(P9·P12)에서 만든다.
 */
export const BankCodeSchema = z.string();

/** 입금 계좌. 어디서나 같은 이름(api-contract §1). 은행명은 호스트 자유 입력 30자 또는 `bankCode`의 표시 이름(B3) */
export const AccountSchema = z.object({
  bankName: z.string().nullable(),
  /** `V2MyOrderAccountResponse.bankCode`(#804) — 추정 실패면 null */
  bankCode: BankCodeSchema.nullable(),
  accountHolder: z.string().nullable(),
  accountNumber: z.string().nullable(),
});
export type Account = z.infer<typeof AccountSchema>;

/**
 * G11/O-0 결제 화면(로그인). 티켓은 GP-5와 같은 모양(잔여·매진·구매 가능은 승인 대기 차감).
 * `account`는 두둥티켓 + 지금 살 수 있을 때만(무료·지난 공연·정산중·종료·매진은 null).
 */
export const CheckoutSchema = z.object({
  ticket: PublicTicketItemSchema,
  account: AccountSchema.nullable(),
});
export type Checkout = z.infer<typeof CheckoutSchema>;

export const OrderEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: z.string().nullable(),
  displayStatus: EventDisplayStatusSchema,
});

export const OrderTicketSchema = z.object({
  ticketItemId: z.number().int().nullable(),
  name: z.string().nullable(),
  payType: TicketPayTypeSchema.nullable(),
  /** 티켓 1장 가격(원, 주문 시점) */
  unitPrice: z.number().int(),
});

export const OrderPaymentSchema = z.object({
  /** Σ 티켓 가격 × 수량 */
  ticketAmount: z.number().int(),
  /** Σ 옵션 추가금 × 줄 수량 */
  optionAmount: z.number().int(),
  /** v1 쿠폰 주문만, v2는 0 */
  discountAmount: z.number().int(),
  /** 티켓 + 옵션 − 할인. 화면 총액·토스 송금 금액과 같아야 한다(P7 계약 테스트) */
  totalAmount: z.number().int(),
  account: AccountSchema.nullable(),
});

/** 옵션 답. 네/아니오 답은 서버가 `예`·`아니요`로 저장해 그 글자로 온다 */
export const OrderOptionAnswerSchema = z.object({
  optionName: z.string().nullable(),
  description: z.string().nullable(),
  answer: z.string().nullable(),
  additionalPrice: z.number().int(),
});

export const OrderLineSchema = z.object({
  quantity: z.number().int(),
  /** (티켓 가격 + 옵션 추가금) × 수량 */
  linePrice: z.number().int(),
  optionAnswers: z.array(OrderOptionAnswerSchema),
});

export const MyRefundAccountSchema = z.object({
  bankName: z.string(),
  /** `V2MyRefundAccountResponse.bankCode`(#804) — 추정 실패면 null */
  bankCode: BankCodeSchema.nullable(),
  accountHolder: z.string(),
  maskedAccountNumber: z.string(),
});

export const OrderIssuedTicketSchema = z.object({
  /** 선물 완료(SENT) 행은 null */
  ticketUuid: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  ticketName: z.string().nullable(),
  entrance: EntranceStateSchema,
  enteredAt: z.string().nullable(),
  optionAnswers: z.array(OrderOptionAnswerSchema),
  giftState: OrderGiftStateSchema,
  isGiftExpired: z.boolean(),
  giftId: z.number().int().nullable(),
});

/** G11/O-3 내 주문 상세. P11/O-1(생성)·P11/O-4(취소) 응답도 같다 */
export const MyOrderDetailSchema = z.object({
  orderUuid: z.string(),
  /** 예매 번호(R…) */
  orderNo: z.string().nullable(),
  status: MyOrderStatusSchema.nullable(),
  refundStatus: RefundStatusSchema,
  orderedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  refundStatusChangedAt: z.string().nullable(),
  /** 삭제된 공연이면 null */
  event: OrderEventSchema.nullable(),
  ticket: OrderTicketSchema,
  /** 주문 시점의 승인형 여부. true = 호스트 승인 후 발급(두둥·무료 승인형), false = 바로 확정(무료 선착순) */
  approvalRequired: z.boolean(),
  quantity: z.number().int(),
  paymentChannel: PaymentChannelSchema.nullable(),
  depositorName: z.string().nullable(),
  /** 유료 주문만. 무료는 null */
  payment: OrderPaymentSchema.nullable(),
  /** 티켓별 옵션이면 수량 1 라인 N개, 모든 티켓 동일이면 1개 */
  lines: z.array(OrderLineSchema),
  refuseReasonType: RefuseReasonTypeSchema.nullable(),
  refuseReason: z.string().nullable(),
  cancelReason: z.string().nullable(),
  refundAccount: MyRefundAccountSchema.nullable(),
  canEditRefundAccount: z.boolean(),
  refundAccountRequired: z.boolean(),
  issuedTickets: z.array(OrderIssuedTicketSchema),
  canCancel: z.boolean(),
});
export type MyOrderDetail = z.infer<typeof MyOrderDetailSchema>;

/** G11/O-2 내 주문 목록 항목(`V2MyOrderElement` @432cce4). 최신 순. 삭제된 공연이면 `event`가 null */
export const MyOrderElementSchema = z.object({
  orderUuid: z.string(),
  orderNo: z.string().nullable(),
  event: OrderEventSchema.nullable(),
  /** 티켓 이름(주문 이름) */
  ticketName: z.string().nullable(),
  quantity: z.number().int(),
  /** 총 결제금액(원). 무료는 0 */
  totalAmount: z.number().int(),
  status: MyOrderStatusSchema.nullable(),
  refundStatus: RefundStatusSchema,
  orderedAt: z.string().nullable(),
});
export type MyOrderElement = z.infer<typeof MyOrderElementSchema>;
export const MyOrderPageSchema = pageSchema(MyOrderElementSchema);

// ─── 요청 ────────────────────────────────────────────────────

/** 주관식 답 길이(trim 후). 백엔드 `SUBJECTIVE_ANSWER_MAX_LENGTH` */
export const SUBJECTIVE_ANSWER_MAX = 255;
/** 입금자명 길이(trim 후). 백엔드 `DEPOSITOR_NAME_MAX_LENGTH` */
export const DEPOSITOR_NAME_MAX = 20;
/** 옵션 답 묶음 하나의 최대 개수(`V2OrderOptionsRequest.answers @Size(max = 50)`) */
const MAX_ANSWERS = 50;

export const OrderAnswerSchema = z.strictObject({
  optionId: z.number().int(),
  /** 네/아니오는 `YES`/`NO`, 주관식은 trim 후 1~255자 */
  answer: z.string().max(300),
});
export type OrderAnswer = z.infer<typeof OrderAnswerSchema>;

/**
 * P11/O-1 본문(엄격 — tech-decisions §4 "요청 스키마는 엄격하게"). 화면이 보내기 전에 이 스키마를 통과해야 한다(테스트).
 * - 모든 티켓 동일: `options{applyToAll: true, answers}`(옵션 없는 티켓은 `answers: []`)
 * - 티켓별: `options{applyToAll: false, answers: []}` + `perTicketOptions`(길이 = 수량). **`options`를 빼면 서버가
 *   `applyToAll = true`로 보고 `perTicketOptions`를 무시한다**(`V2CreateOrderRequest.applyToAll()`)
 * - 두둥티켓은 `BANK_TRANSFER`·`TOSS_TRANSFER` + 입금자명, 무료는 `FREE`(입금자명 무시)
 * - 동의 기록(#840, 모두 선택): `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`(두둥만)·`agreementVersion`.
 *   사용자가 체크했을 때만 `true`로 싣고(`src/api/shared/agreement.ts`), `agreementVersion`은 동의 필드가 하나라도 있을 때만.
 *   TODO(Q42): 두 동의를 만들 화면 칸이 v2 체크아웃 계획에 없어 지금 화면은 보내지 않는다
 */
export const CreateOrderRequestSchema = z
  .strictObject({
    eventId: z.number().int().positive(),
    ticketItemId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY),
    options: z.strictObject({
      applyToAll: z.boolean(),
      answers: z.array(OrderAnswerSchema).max(MAX_ANSWERS),
    }),
    perTicketOptions: z
      .array(z.array(OrderAnswerSchema).max(MAX_ANSWERS))
      .max(MAX_ORDER_QUANTITY)
      .optional(),
    paymentChannel: z.enum(PAYMENT_CHANNELS),
    depositorName: z.string().trim().min(1).max(DEPOSITOR_NAME_MAX).optional(),
    agreeRefundPolicy: z.literal(true),
    hostProvisionAgreed: z.literal(true).optional(),
    dudoongTicketNoticeConfirmed: z.literal(true).optional(),
    agreementVersion: z.string().min(1).max(AGREEMENT_VERSION_MAX).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.options.applyToAll) {
      if (body.perTicketOptions !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['perTicketOptions'],
          message: '일괄이면 보내지 않는다',
        });
      }
    } else if (body.perTicketOptions?.length !== body.quantity) {
      ctx.addIssue({ code: 'custom', path: ['perTicketOptions'], message: '길이 = 수량' });
    }
    const transfer = body.paymentChannel !== 'FREE';
    if (transfer && body.depositorName === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['depositorName'],
        message: '계좌이체는 입금자명 필수',
      });
    }
    const agreed =
      body.hostProvisionAgreed !== undefined || body.dudoongTicketNoticeConfirmed !== undefined;
    if (agreed !== (body.agreementVersion !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['agreementVersion'],
        message: '동의 필드를 보낼 때만 같이 보낸다',
      });
    }
  });
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

// ─── 환불 계좌 · 취소 요청(P9) — `V2RefundAccountRequest`·`V2CancelMyOrderRequest` @432cce4 ───

/**
 * 환불 계좌 길이(`OrderRefundAccount.*_MAX_LENGTH` — 은행명 20 · 예금주 20 · 계좌번호 30). 티켓 입금 계좌(30/30/50)와 다르다
 * (api-contract §4). 은행명은 프론트가 보내지 않는다(아래 — 코드만).
 */
export const REFUND_ACCOUNT_HOLDER_MAX = 20;
export const REFUND_ACCOUNT_NUMBER_MAX = 30;
/** 계좌번호: 숫자·하이픈·공백(`@Pattern`). 서버는 저장 때 공백을 지운다 */
export const REFUND_ACCOUNT_NUMBER_PATTERN = /^[0-9][0-9 -]*[0-9]$/;
/** 은행 코드(금융결제원 3자리 — `GET /api/v2/banks`의 `code`) */
const BANK_CODE_PATTERN = /^[0-9]{3}$/;

/**
 * 환불 계좌 본문(엄격 — P11/O-4의 `refundAccount`, P11/O-5 본문). 서버는 `bankCode`와 `bankName` 중 하나를 받지만
 * **프론트는 은행 목록(`GET /banks`)에서 고른 `bankCode`만 보낸다**(plan P9, #804·#813). `bankName`은 서버가 코드의 표시 이름으로 채운다.
 * 예금주는 `@NotBlank` + 20자, 계좌번호는 `@NotBlank` + 30자 + 형식. 앞뒤 공백은 화면이 지우고 보낸다.
 */
export const RefundAccountRequestSchema = z.strictObject({
  bankCode: z.string().regex(BANK_CODE_PATTERN),
  accountHolder: z
    .string()
    .min(1)
    .max(REFUND_ACCOUNT_HOLDER_MAX)
    .regex(/[^\u0000-\u0020]/),
  accountNumber: z.string().max(REFUND_ACCOUNT_NUMBER_MAX).regex(REFUND_ACCOUNT_NUMBER_PATTERN),
});
export type RefundAccountRequest = z.infer<typeof RefundAccountRequestSchema>;

/**
 * P11/O-4 본문. 유료(총액 > 0) 주문은 `refundAccount` 필수(없으면 `Order_400_25`), 무료는 무시되므로 본문 없이 보낸다
 * (`@RequestBody(required = false)`).
 */
export const CancelMyOrderRequestSchema = z.strictObject({
  refundAccount: RefundAccountRequestSchema,
});
export type CancelMyOrderRequest = z.infer<typeof CancelMyOrderRequestSchema>;
