import { z } from 'zod';

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
