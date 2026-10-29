import { z } from 'zod';

import { AGREEMENT_VERSION } from '../shared/agreement';
import { kstDateTime } from '../shared/date';
import { openEnum } from '../shared/open-enum';

/**
 * 티켓 응답. 기준: 백엔드 `v2/event/dto/response/V2EventBrowseResponses.kt`(`V2PublicTicketItemResponse`),
 * `v2/ticket/dto/V2TicketTypes.kt`(dev 24aa595).
 */

/** 결제 방식(api-contract §3). PRICE는 기존 PG 티켓 — 조회만 된다 */
export const TICKET_PAY_TYPES = ['DUDOONG', 'FREE', 'PRICE'] as const;
export const TicketPayTypeSchema = openEnum('TicketPayType', TICKET_PAY_TYPES);
export type TicketPayType = z.infer<typeof TicketPayTypeSchema>;

/** 옵션 응답 형식. MULTIPLE_CHOICE는 v1 옵션 — v2에서 만들 수 없고 표시만 한다 */
export const TICKET_OPTION_TYPES = ['SUBJECTIVE', 'YES_NO', 'MULTIPLE_CHOICE'] as const;
export const TicketOptionTypeSchema = openEnum('TicketOptionType', TICKET_OPTION_TYPES);
export type TicketOptionType = z.infer<typeof TicketOptionTypeSchema>;

export const PublicTicketOptionSchema = z.object({
  optionId: z.number().int(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  /** 백엔드 타입이 nullable이다(도메인 값과 매핑이 안 되면 null) */
  type: TicketOptionTypeSchema.nullable(),
  /** '네' 선택 시 추가 금액. YES_NO가 아니면 null */
  yesAdditionalPrice: z.number().int().nullable(),
});

/** GP-5 판매 중인 티켓(비로그인). 입금 계좌는 G11/O-0에서만 온다 */
export const PublicTicketItemSchema = z.object({
  ticketItemId: z.number().int(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  /** 원 단위 */
  price: z.number().int(),
  payType: TicketPayTypeSchema.nullable(),
  /** true = 호스트 승인 후 확정 */
  approvalRequired: z.boolean(),
  /** 재고 − 승인 대기. 재고 공개 + 수량 지정 티켓만, 아니면 null */
  remaining: z.number().int().nullable(),
  isSoldOut: z.boolean(),
  /** 지금 살 수 있는지 — 구매 가능 판단은 이 값으로(patterns §14) */
  isPurchasable: z.boolean(),
  /** 1인 구매 매수 제한. null이면 제한 없음 */
  purchaseLimit: z.number().int().nullable(),
  options: z.array(PublicTicketOptionSchema),
});
export const PublicTicketItemsSchema = z.array(PublicTicketItemSchema);
export type PublicTicketItem = z.infer<typeof PublicTicketItemSchema>;
export type PublicTicketOption = z.infer<typeof PublicTicketOptionSchema>;

// ─── 호스팅 센터 — 티켓 관리 (P12) ───────────────────────────
/*
 * 기준: 백엔드 `v2/ticket/dto/response/V2TicketItemManageResponse.kt`·`dto/request/V2TicketItemRequest.kt`,
 * 도메인 `V2TicketItemDomainService`·`V2TicketItemForm`(`V2TicketClearableField`)·`TicketItemErrorCode`
 * (432cce4 → dev cb8d24e: #873으로 T-3에 동의 필드가 생겼다 — P12-L 소스 확인).
 */

/** 이름 1~12자(앞뒤 공백 제외, 바뀔 때만 검증 — v1의 긴 이름은 그대로 다시 보낼 수 있다) */
export const TICKET_NAME_MAX = 12;
/** 설명 30자(바뀔 때만 검증) */
export const TICKET_DESCRIPTION_MAX = 30;
/** 두둥 티켓 가격 1원 ~ 1,000만 원(무료 티켓은 0원). 옵션 추가금 상한도 같다(`MAX_PRICE`) */
export const TICKET_PRICE_MAX = 10_000_000;
/** 판매 수량·1인 매수 제한 1 ~ 999,999(`MAX_SUPPLY_COUNT`). 무제한·제한 없음은 값 없음 */
export const TICKET_COUNT_MAX = 999_999;
/** 티켓당 옵션 10개(`MAX_OPTION_COUNT`, P10/O-5 `@Size`) */
export const TICKET_OPTIONS_MAX = 10;
/** 계좌 은행명·예금주 30자, 계좌번호 50자(형식 검사 없음, `V2TicketAccountRequest`) */
export const TICKET_BANK_NAME_MAX = 30;
export const TICKET_ACCOUNT_HOLDER_MAX = 30;
export const TICKET_ACCOUNT_NUMBER_MAX = 50;

/** 관리 화면 판매 상태: BEFORE_SALE(재고 감소 없음) / SOLD(재고 감소) / SUSPENDED(판매 중단 — 먼저 본다) */
export const TICKET_SALE_STATES = ['BEFORE_SALE', 'SOLD', 'SUSPENDED'] as const;
export const TicketSaleStateSchema = openEnum('TicketSaleState', TICKET_SALE_STATES);
export type TicketSaleState = z.infer<typeof TicketSaleStateSchema>;

/** 입금 계좌(두둥 티켓만). `bankCode`는 서버가 `bankName`으로 추정한 값 — 모르는 은행명(옛 자유 입력)이면 null */
export const TicketAccountSchema = z.object({
  bankName: z.string().nullable(),
  bankCode: z.string().nullable(),
  accountHolder: z.string().nullable(),
  accountNumber: z.string().nullable(),
});
export type TicketAccount = z.infer<typeof TicketAccountSchema>;

/** 티켓에 붙은 옵션(id 순) */
export const AppliedTicketOptionSchema = z.object({
  optionId: z.number().int(),
  name: z.string().nullable(),
  type: TicketOptionTypeSchema.nullable(),
  /** '네' 선택 시 추가 금액. YES_NO가 아니면 null */
  yesAdditionalPrice: z.number().int().nullable(),
});
export type AppliedTicketOption = z.infer<typeof AppliedTicketOptionSchema>;

/** G10/T-1 관리용 티켓(재고 항상 공개). T-2·T-3·T-5·T-6·O-5 응답도 이 모양 하나, T-4 응답은 남은 목록 */
export const TicketItemManageSchema = z.object({
  ticketItemId: z.number().int(),
  /** DUDOONG / FREE / PRICE(기존 PG 티켓 — v2에서 수정 불가 `Ticket_Item_400_11`) */
  payType: TicketPayTypeSchema.nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().int(),
  /** 판매 수량. null이면 무제한 */
  supplyCount: z.number().int().nullable(),
  /** 잔여(재고 공개와 무관, 승인 대기를 빼지 않은 값). 무제한이면 null */
  remaining: z.number().int().nullable(),
  /** 판매(재고 감소)된 수량 */
  soldCount: z.number().int(),
  approvalRequired: z.boolean(),
  isQuantityPublic: z.boolean(),
  /** 1인 매수 제한. null이면 제한 없음 */
  purchaseLimit: z.number().int().nullable(),
  /** 판매 시작. null이면 등록 즉시 */
  saleStartAt: kstDateTime.nullable(),
  /** 판매 종료. null이면 공연 시작까지 */
  saleEndAt: kstDateTime.nullable(),
  saleState: TicketSaleStateSchema,
  /** 재고 감소 여부. true면 삭제 불가(중단 상태여도 유지) */
  isSold: z.boolean(),
  /** 승인 대기 주문이 있는지. `isSold || hasPendingOrders`면 잠긴 티켓(patterns §23) */
  hasPendingOrders: z.boolean(),
  /** 승인 대기 수량 합(#726). 관객 화면 잔여 = `remaining` − 이 값 */
  pendingApproveCount: z.number().int(),
  /** 지금 관객이 살 수 있는지(판매 중 + 판매 기간 + 공연 등록 + 시작 전 + 재고 > 0) */
  isPurchasable: z.boolean(),
  /** 두둥 티켓만 */
  account: TicketAccountSchema.nullable(),
  options: z.array(AppliedTicketOptionSchema),
});
export const TicketItemsManageSchema = z.array(TicketItemManageSchema);
export type TicketItemManage = z.infer<typeof TicketItemManageSchema>;

/** v2에서 만들고 고칠 수 있는 결제 방식(PRICE는 400 `Ticket_Item_400_11`) */
export const EDITABLE_TICKET_PAY_TYPES = ['DUDOONG', 'FREE'] as const;
export type EditableTicketPayType = (typeof EDITABLE_TICKET_PAY_TYPES)[number];

/**
 * 요청 계좌. **은행은 목록 `GET /api/v2/banks`의 `code`만 보낸다** — `bankName`은 보내지 않는다(서버가 표시 이름으로 채운다,
 * 모르는 코드는 400 `BAD_REQUEST`, #804). 예금주·계좌번호는 공백만이면 400(`@NotBlank`)
 */
export const TicketAccountRequestSchema = z
  .object({
    bankCode: z.string().min(1),
    accountHolder: z.string().trim().min(1).max(TICKET_ACCOUNT_HOLDER_MAX),
    accountNumber: z.string().trim().min(1).max(TICKET_ACCOUNT_NUMBER_MAX),
  })
  .strict();
export type TicketAccountRequest = z.infer<typeof TicketAccountRequestSchema>;

/**
 * P10/T-2 티켓 생성. 선택 필드는 키가 없으면 '값 없음'(무제한·제한 없음·등록 즉시·공연 시작까지). 이름·설명 길이·가격·조합 규칙은
 * 도메인 검사(400 `Ticket_Item_*`)라 여기서는 모양만 본다. 동의 필드(#840)는 `payType=DUDOONG`이고 사용자가 체크했을 때만(`agreementFields`)
 */
export const CreateTicketItemRequestSchema = z
  .object({
    payType: z.enum(EDITABLE_TICKET_PAY_TYPES),
    name: z.string().trim().min(1),
    description: z.string().optional(),
    price: z.number().int().min(0).max(TICKET_PRICE_MAX),
    supplyCount: z.number().int().min(1).max(TICKET_COUNT_MAX).optional(),
    account: TicketAccountRequestSchema.optional(),
    approvalRequired: z.boolean(),
    isQuantityPublic: z.boolean(),
    purchaseLimit: z.number().int().min(1).max(TICKET_COUNT_MAX).optional(),
    saleStartAt: kstDateTime.optional(),
    saleEndAt: kstDateTime.optional(),
    refundObligationAgreed: z.literal(true).optional(),
    agreementVersion: z.literal(AGREEMENT_VERSION).optional(),
  })
  .strict();
export type CreateTicketItemRequest = z.infer<typeof CreateTicketItemRequestSchema>;

/** P10/T-3에서 '값 없음'으로 바꿀 수 있는 필드(`V2TicketClearableField`). 이 5개에 명시적 null을 보내면 400 `Ticket_Item_400_15` */
export const TICKET_CLEARABLE_FIELDS = [
  'SUPPLY_COUNT',
  'PURCHASE_LIMIT',
  'SALE_START_AT',
  'SALE_END_AT',
  'DESCRIPTION',
] as const;
export type TicketClearableField = (typeof TICKET_CLEARABLE_FIELDS)[number];

/**
 * P10/T-3 부분 수정. **키 없음 = 변경 안 함, '값 없음'은 `clear[]`**(명시적 null 금지 — `.strict()`라 null은 스키마가 거른다).
 * 같은 필드에 값과 clear를 같이 보내면 400 `Ticket_Item_400_15`. `payType`을 바꾸면 `price`도 같이(patterns §23).
 * 동의 필드(#873, dev cb8d24e): 무료 → 두둥으로 바꾸는 수정에서만 서버가 검사·기록한다(이미 두둥이면 쓰지 않는다)
 */
export const UpdateTicketItemRequestSchema = z
  .object({
    payType: z.enum(EDITABLE_TICKET_PAY_TYPES).optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    price: z.number().int().min(0).max(TICKET_PRICE_MAX).optional(),
    supplyCount: z.number().int().min(1).max(TICKET_COUNT_MAX).optional(),
    account: TicketAccountRequestSchema.optional(),
    approvalRequired: z.boolean().optional(),
    isQuantityPublic: z.boolean().optional(),
    purchaseLimit: z.number().int().min(1).max(TICKET_COUNT_MAX).optional(),
    saleStartAt: kstDateTime.optional(),
    saleEndAt: kstDateTime.optional(),
    clear: z.array(z.enum(TICKET_CLEARABLE_FIELDS)).min(1).max(5).optional(),
    refundObligationAgreed: z.literal(true).optional(),
    agreementVersion: z.literal(AGREEMENT_VERSION).optional(),
  })
  .strict();
export type UpdateTicketItemRequest = z.infer<typeof UpdateTicketItemRequestSchema>;

/** P10/O-5 티켓에 붙은 옵션 전체 지정(PUT — 빠진 옵션은 떼어진다, 빈 배열 = 모두 떼기, 10개까지) */
export const ReplaceTicketOptionsRequestSchema = z
  .object({ optionIds: z.array(z.number().int()).max(TICKET_OPTIONS_MAX) })
  .strict();
export type ReplaceTicketOptionsRequest = z.infer<typeof ReplaceTicketOptionsRequestSchema>;
