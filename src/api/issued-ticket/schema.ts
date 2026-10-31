import { z } from 'zod';

import { EntranceStateSchema, OrderOptionAnswerSchema } from '../order/schema';
import { openEnum } from '../shared/open-enum';
import { pageSchema } from '../shared/page';
import { TicketPayTypeSchema } from '../ticket-item/schema';

/**
 * 호스트 발급 티켓(GI-1~GI-3, P13a) 스키마. 기준: 백엔드 `v2/operation/dto/response/V2IssuedTicketResponses.kt`,
 * `V2IssuedTicketController`·`V2ReadIssuedTicketsUseCase`·`V2IssuedTicketQuery`(dev cb8d24e — 432cce4 이후 변경 없음).
 */

/** GI-1·GI-3 `entrance` 필터(`V2EntranceFilter`, 기본 ALL = 취소 제외 유효 티켓 전체) */
export const ENTRANCE_FILTERS = ['ALL', 'BEFORE', 'DONE'] as const;
export type EntranceFilter = (typeof ENTRANCE_FILTERS)[number];

/** GI-1·GI-3 `searchType`(`AdminTableSearchType`, 기본 NAME) — **현재 소유자** 기준(#740). 일반 멤버의 PHONE은 완전 일치만(#822) */
export const ISSUED_TICKET_SEARCH_TYPES = ['NAME', 'PHONE'] as const;
export type IssuedTicketSearchType = (typeof ISSUED_TICKET_SEARCH_TYPES)[number];

/** 호스트 화면 선물 상태(`V2HostGiftState`) — 보는 사람 기준이 아니라 티켓 기준 */
export const HOST_GIFT_STATES = ['NONE', 'PENDING', 'ACCEPTED'] as const;
export const HostGiftStateSchema = openEnum('HostGiftState', HOST_GIFT_STATES);
export type HostGiftState = z.infer<typeof HostGiftStateSchema>;

/**
 * 유효(취소 제외) 티켓 입장 통계(`V2EntranceStatsResponse`) — GD-1 `entranceStats`·GI-1 `counts`·GQ-1이 같은 모양.
 * `entranceRate`는 입장 / 발급 × 100(소수 첫째 자리, 발급 0이면 0)
 */
export const EntranceStatsSchema = z.object({
  issuedCount: z.number().int(),
  enteredCount: z.number().int(),
  notEnteredCount: z.number().int(),
  entranceRate: z.number(),
});
export type EntranceStats = z.infer<typeof EntranceStatsSchema>;

/** GI-1 행·GI-2 `ticket`(`V2IssuedTicketElement`). `buyerName` = 주문자, `ownerName` = 현재 소유자(선물 수락 시 받은 사람) */
export const HostIssuedTicketSchema = z.object({
  ticketUuid: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  ticketItemId: z.number().int().nullable(),
  payType: TicketPayTypeSchema.nullable(),
  ticketName: z.string().nullable(),
  buyerName: z.string().nullable(),
  ownerName: z.string().nullable(),
  giftState: HostGiftStateSchema,
  orderUuid: z.string().nullable(),
  orderNo: z.string().nullable(),
  /** 발급 일시 */
  issuedAt: z.string().nullable(),
  /** 목록은 BEFORE · DONE, 상세는 CANCELED도 */
  entrance: EntranceStateSchema,
  enteredAt: z.string().nullable(),
});
export type HostIssuedTicket = z.infer<typeof HostIssuedTicketSchema>;

/** GI-1 `{counts, tickets: V2PageResponse}` — `counts`는 검색어 반영, 입장 필터 무시 */
export const HostIssuedTicketListSchema = z.object({
  counts: EntranceStatsSchema,
  tickets: pageSchema(HostIssuedTicketSchema),
});
export type HostIssuedTicketList = z.infer<typeof HostIssuedTicketListSchema>;

/** GI-2 발급 티켓 상세. 연락처는 일반 멤버에게 가린 값 */
export const HostIssuedTicketDetailSchema = z.object({
  ticket: HostIssuedTicketSchema,
  buyerPhone: z.string().nullable(),
  ownerPhone: z.string().nullable(),
  optionAnswers: z.array(OrderOptionAnswerSchema),
});
export type HostIssuedTicketDetail = z.infer<typeof HostIssuedTicketDetailSchema>;
