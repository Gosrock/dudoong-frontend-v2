import { z } from 'zod';

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
