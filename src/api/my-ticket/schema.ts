import { z } from 'zod';

import { GiftStatusSchema } from '../gift/schema';
import {
  EntranceStateSchema,
  MyOrderStatusSchema,
  OrderEventSchema,
  OrderOptionAnswerSchema,
  RefuseReasonTypeSchema,
} from '../order/schema';
import { openEnum } from '../shared/open-enum';

/**
 * 티켓탭(G11/T-1 · T-2 · T-3) 스키마. 기준: 백엔드 dev 24aa595
 * `v2/gift/dto/response/V2GiftResponses.kt`(`V2MyTicketsResponse`·`V2MyTicketDetailResponse`·`V2NewApprovedResponse`),
 * `v2/gift/dto/V2GiftTypes.kt`(`V2MyTicketState`), 판정 `v2/gift/usecase/V2MyTicketUseCase.kt`.
 * 공연 요약은 주문과 같은 `V2MyOrderEventResponse`, 옵션 답은 `V2OptionAnswerResponse`(주문 스키마를 재사용한다).
 */

/**
 * 티켓 화면 상태(api-contract §3). 판정 순서(서버): 취소·환불 → 입장 완료 → 선물 완료 → 선물 대기(만료) → 받은 티켓 → 승인 완료.
 * `PENDING_APPROVE`·`REFUSED`는 티켓 없는 주문 묶음의 `counts`에만 온다.
 */
export const MY_TICKET_STATES = [
  'PENDING_APPROVE',
  'REFUSED',
  'APPROVED',
  'GIFT_PENDING',
  'GIFT_EXPIRED',
  'GIFT_SENT',
  'RECEIVED',
  'ENTERED',
  'CANCELED',
  'REFUND_REQUESTED',
  'REFUNDED',
] as const;
export const MyTicketStateSchema = openEnum('MyTicketState', MY_TICKET_STATES);
export type MyTicketState = z.infer<typeof MyTicketStateSchema>;

/** 내 티켓의 선물 상태(`V2GiftState`). NONE · PENDING(선물 대기) · SENT(선물 완료) · RECEIVED(받은 티켓) */
export const MY_TICKET_GIFT_STATES = ['NONE', 'PENDING', 'SENT', 'RECEIVED'] as const;
export const MyTicketGiftStateSchema = openEnum('MyTicketGiftState', MY_TICKET_GIFT_STATES);
export type MyTicketGiftState = z.infer<typeof MyTicketGiftStateSchema>;

/** T-1 묶음 안의 티켓 한 장 */
export const MyTicketElementSchema = z.object({
  /** T-2·PG-1·PG-6 경로 값. 선물 완료(SENT) 행은 null — 받은 사람의 QR이다 */
  ticketUuid: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  ticketName: z.string().nullable(),
  /** 유료 옵션 추가금 합(원) */
  optionAmount: z.number().int(),
  state: MyTicketStateSchema,
  entrance: EntranceStateSchema,
  enteredAt: z.string().nullable(),
  giftState: MyTicketGiftStateSchema,
  /** 선물 대기 중인데 공연이 끝남(회수만 가능) */
  isGiftExpired: z.boolean(),
  isReceived: z.boolean(),
  /** PENDING·SENT·RECEIVED의 선물 id(DG-2 회수·PG-8 메모·GG-7a 선물 완료 상세) */
  giftId: z.number().int().nullable(),
});
export type MyTicketElement = z.infer<typeof MyTicketElementSchema>;

/** T-1 묶음(주문 단위). 받은 티켓 묶음은 `orderUuid`·`orderNo`가 null이고 [주문상세]가 없다 */
export const MyTicketGroupSchema = z.object({
  /** 목록 key. 내 주문 = 주문 uuid, 받은 티켓 묶음 = `ticket:{첫 티켓 번호}` */
  groupKey: z.string(),
  orderUuid: z.string().nullable(),
  orderNo: z.string().nullable(),
  isMyOrder: z.boolean(),
  orderStatus: MyOrderStatusSchema.nullable(),
  refuseReasonType: RefuseReasonTypeSchema.nullable(),
  refuseReason: z.string().nullable(),
  /** 삭제된 공연이면 null */
  event: OrderEventSchema.nullable(),
  ticketName: z.string().nullable(),
  /**
   * 승인형 주문인지(O-3 `approvalRequired`와 같은 값 — 백엔드 #924, 2.5.6 스테이징만). false = 무료 선착순(즉시 발급) →
   * 배지 '발급 완료'(Q74). 받은 티켓 묶음은 원 주문 기준. 운영 2.5.3 응답에는 없어 optional — 없으면 '승인완료' 그대로
   */
  approvalRequired: z.boolean().optional(),
  /**
   * 화면 상태별 개수(예: `{APPROVED: 2, GIFT_PENDING: 1}`). 티켓 없는 승인 대기·거절 주문은 주문 수량.
   * 키는 열어 둔다(모르는 상태는 화면 매핑에서 UNKNOWN으로 모은다 — `ticket-groups.ts`)
   */
  counts: z.record(z.string(), z.number().int()),
  /** 발급 순. 승인 대기·거절 주문은 빈 목록 */
  tickets: z.array(MyTicketElementSchema),
});
export type MyTicketGroup = z.infer<typeof MyTicketGroupSchema>;

/** G11/T-1. 페이지 없이 전부, 정렬은 공연 임박순 하나 */
export const MyTicketsSchema = z.object({ groups: z.array(MyTicketGroupSchema) });
export type MyTickets = z.infer<typeof MyTicketsSchema>;

/**
 * G11/T-3 공지 바. `hasNew`·`orderUuids`는 새로 승인된 주문(최근 승인 알림 순) — `orderUuids[0]`이 [티켓보기]의 대상 묶음.
 * `refusedOrderUuids`는 안 읽은 거절 알림 중 지금도 거절 상태인 내 주문(최근 거절 알림 순, 없으면 빈 배열) — `hasNew`와 따로 본다.
 * 그 거절 알림을 읽거나(N-3) 그 주문 상세(O-3)를 열면 빠진다. **백엔드 2.5.4(스테이징)부터** — 운영 2.5.3에는 키가 없어
 * 빈 배열로 읽는다(백엔드 #905 §2-2 · `V2NewApprovedResponse` #908).
 */
export const NewApprovedSchema = z.object({
  hasNew: z.boolean(),
  orderUuids: z.array(z.string()),
  refusedOrderUuids: z.array(z.string()).optional().default([]),
});
export type NewApproved = z.infer<typeof NewApprovedSchema>;

/** T-2의 선물 정보 — 선물 대기(링크·메모, 보낸 사람) · 받은 티켓(보낸 사람 닉네임) · 선물 완료(받은 사람 닉네임) */
export const TicketGiftInfoSchema = z.object({
  giftId: z.number().int(),
  status: GiftStatusSchema,
  giftToken: z.string().nullable(),
  /** `/gifts/{giftToken}` — origin은 프론트가 붙인다 */
  linkPath: z.string().nullable(),
  memo: z.string().nullable(),
  receiverName: z.string().nullable(),
  senderName: z.string().nullable(),
  createdAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
});
export type TicketGiftInfo = z.infer<typeof TicketGiftInfoSchema>;

/**
 * G11/T-2 티켓 상세 + 입장 QR. GG-7a(보낸 사람의 선물 완료 상세)도 같은 모양 — `ticketUuid`·`qrValue` 없음.
 * `qrValue` = 티켓 uuid. 선물 대기·취소 티켓, 삭제된 공연의 티켓, 선물 완료 상세는 null.
 */
export const MyTicketDetailSchema = z.object({
  ticketUuid: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  ticketName: z.string().nullable(),
  unitPrice: z.number().int(),
  optionAnswers: z.array(OrderOptionAnswerSchema),
  optionAmount: z.number().int(),
  state: MyTicketStateSchema,
  entrance: EntranceStateSchema,
  enteredAt: z.string().nullable(),
  giftState: MyTicketGiftStateSchema,
  isGiftExpired: z.boolean(),
  isReceived: z.boolean(),
  qrValue: z.string().nullable(),
  event: OrderEventSchema.nullable(),
  /** 내 주문일 때만(받은 티켓은 null) */
  orderUuid: z.string().nullable(),
  orderNo: z.string().nullable(),
  gift: TicketGiftInfoSchema.nullable(),
  /** 지금 선물(PG-1)할 수 있는지 — [선물하기]는 이 값으로만 보인다 */
  canGift: z.boolean(),
  /** 지금 반환(PG-6)할 수 있는지 — [선물 반환]은 이 값으로만 보인다 */
  canReturn: z.boolean(),
});
export type MyTicketDetail = z.infer<typeof MyTicketDetailSchema>;
