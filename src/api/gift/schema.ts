import { z } from 'zod';

import { OrderEventSchema } from '../order/schema';
import { kstDateTime } from '../shared/date';
import { openEnum } from '../shared/open-enum';

/**
 * 선물 응답. 기준: 백엔드 `v2/gift/dto/response/V2GiftResponses.kt`(`V2GiftLandingResponse`),
 * 도메인 `TicketGiftStatus`·`V2GiftViewState`(dev 24aa595).
 */

export const GIFT_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'RETURNED', 'CANCELED'] as const;
export const GiftStatusSchema = openEnum('GiftStatus', GIFT_STATUSES);
export type GiftStatus = z.infer<typeof GiftStatusSchema>;

/** 랜딩 화면 상태. 판정 순서: 선물 상태 → 만료 → 본인 링크 → 받기 가능(tech-decisions §20) */
export const GIFT_VIEW_STATES = [
  'AVAILABLE',
  'ALREADY_ACCEPTED',
  'REJECTED',
  'RETURNED',
  'CANCELED',
  'OWN_LINK',
  'EXPIRED',
] as const;
export const GiftViewStateSchema = openEnum('GiftViewState', GIFT_VIEW_STATES);
export type GiftViewState = z.infer<typeof GiftViewStateSchema>;

export const GiftEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  placeName: z.string().nullable(),
});

export const GiftTicketSchema = z.object({
  ticketName: z.string().nullable(),
  /** 티켓 1장 가격(원, 발급 시점) */
  unitPrice: z.number().int(),
});

/**
 * GG-3 선물 랜딩 — 공개 필드(서버 프리페치, 토큰 없음). OG와 공연 요약을 그린다.
 * `viewState`는 익명 기준 값이다(익명이 확정됐을 때만 화면 상태로 쓴다). 로그인 사용자는 viewer 값을 쓴다.
 * 사용자별 필드(`isLoggedIn`·`isReceiver`·`giftId`)는 뺐다(tech-decisions §4).
 */
export const GiftLandingSchema = z.object({
  status: GiftStatusSchema,
  viewState: GiftViewStateSchema,
  /** 보낸 사람 닉네임, 가운데를 가린다(예: 김*수). 대기 중일 때만 */
  senderName: z.string().nullable(),
  /** 대기 중일 때만 */
  event: GiftEventSchema.nullable(),
  /** 대기 중일 때만. 옵션 답변은 오지 않는다 */
  ticket: GiftTicketSchema.nullable(),
});
export type GiftLanding = z.infer<typeof GiftLandingSchema>;

/** 같은 엔드포인트를 쿠키와 함께 부른 결과. `['gifts', token, 'viewer']` */
export const GiftLandingViewerSchema = GiftLandingSchema.extend({
  /** AVAILABLE인데 false면 로그인 유도 */
  isLoggedIn: z.boolean(),
  /** ALREADY_ACCEPTED일 때 보는 사람이 받은 본인인지 */
  isReceiver: z.boolean(),
  /** 보는 사람이 보낸 사람이면 선물 id(회수 버튼용) */
  giftId: z.number().int().nullable(),
});
export type GiftLandingViewer = z.infer<typeof GiftLandingViewerSchema>;

// ─── 선물 변경(PG-1 · DG-2 · PG-8 · PG-4 · PG-5 · PG-6)과 내역(GG-7) ───

/** 메모 최대 길이(앞뒤 공백 제외). 넘으면 `Gift_400_9` */
export const GIFT_MEMO_MAX = 50;

/** 대기 중 선물이 취소된 이유(`TicketGiftCancelReason`) */
export const GIFT_CANCEL_REASONS = [
  'SENDER',
  'ORDER_CANCELED',
  'SENDER_WITHDRAWN',
  'EVENT_REMOVED',
] as const;
export const GiftCancelReasonSchema = openEnum('GiftCancelReason', GIFT_CANCEL_REASONS);
export type GiftCancelReason = z.infer<typeof GiftCancelReasonSchema>;

/**
 * PG-1 · PG-8 본문(`V2GiftMemoRequest`, 엄격). 메모는 보낸 사람에게만 보인다.
 * PG-1은 메모가 없으면 `{}`, PG-8의 빈 문자열은 메모 삭제다.
 */
export const GiftMemoRequestSchema = z.strictObject({
  memo: z
    .string()
    .refine((v) => v.trim().length <= GIFT_MEMO_MAX, { message: `메모는 ${GIFT_MEMO_MAX}자까지` })
    .optional(),
});
export type GiftMemoRequest = z.infer<typeof GiftMemoRequestSchema>;

/** PG-1 결과. `linkPath` = `/gifts/{giftToken}`(origin은 프론트가 붙인다) */
export const GiftCreatedSchema = z.object({
  giftId: z.number().int(),
  giftToken: z.string(),
  linkPath: z.string(),
  memo: z.string().nullable(),
});
export type GiftCreated = z.infer<typeof GiftCreatedSchema>;

/** DG-2 · PG-4 · PG-5 · PG-6 · PG-8 결과. `ticketUuid`는 수락·반환 뒤 새 소유자의 새 uuid(그 밖 null) */
export const GiftResultSchema = z.object({
  giftId: z.number().int(),
  status: GiftStatusSchema,
  cancelReason: GiftCancelReasonSchema.nullable(),
  memo: z.string().nullable(),
  ticketUuid: z.string().nullable(),
});
export type GiftResult = z.infer<typeof GiftResultSchema>;

/** GG-7 방향(기본값 없는 필수 파라미터) */
export const GIFT_DIRECTIONS = ['SENT', 'RECEIVED'] as const;
export type GiftDirection = (typeof GIFT_DIRECTIONS)[number];

/**
 * GG-7 보낸·받은 선물 내역 항목(`V2GiftElement`). 화면(`/mypage/gifts`)이 Figma에 없어 **스키마만 둔다**(plan P8b).
 * 화면이 생기면 `pageSchema(GiftElementSchema)` + 무한 쿼리(patterns §12)로 읽는다.
 */
export const GiftElementSchema = z.object({
  giftId: z.number().int(),
  status: GiftStatusSchema,
  cancelReason: GiftCancelReasonSchema.nullable(),
  isGiftExpired: z.boolean(),
  /** SENT면 받은 사람(대기·취소면 null), RECEIVED면 보낸 사람 */
  counterpartName: z.string().nullable(),
  memo: z.string().nullable(),
  giftToken: z.string().nullable(),
  linkPath: z.string().nullable(),
  event: OrderEventSchema.nullable(),
  ticketName: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  createdAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  returnedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
});
export type GiftElement = z.infer<typeof GiftElementSchema>;
