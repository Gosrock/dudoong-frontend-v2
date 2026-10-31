import { z } from 'zod';

import { EventDisplayStatusSchema } from '../event/schema';
import { HostRoleSchema } from '../shared/common-schema';
import { kstDateTime } from '../shared/date';
import { pageSchema } from '../shared/page';

/** 내 프로필. 기준: 백엔드 `v2/mypage/dto/response/V2MyPageResponses.kt`(`V2MeResponse`, dev 24aa595 — 432cce4 대조). PM-2 응답도 같다 */

export const MeHostSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  myRole: HostRoleSchema,
});

export const MeSchema = z.object({
  userId: z.number().int(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  /** 기본 이미지면 null */
  profileImageUrl: z.string().nullable(),
  /** 소속(활성) 호스트, 합류 최신순 최대 10개 */
  hosts: z.array(MeHostSchema),
  /** 소속 호스트 전체 수. hosts보다 많으면 GH-1로 전체 목록 */
  hostCount: z.number().int(),
});
export type Me = z.infer<typeof MeSchema>;
export type MeHost = z.infer<typeof MeHostSchema>;

// ─── 마이페이지(P9) — 기준: 백엔드 dev 432cce4 `V2MyPageController`·`V2MyPageRequests.kt`·`V2MyPageResponses.kt` ───

/** 닉네임 길이(`V2UpdateMeRequest.name` `@Size(min = 2, max = 7)` — v1 `ChangeNameRequest`와 같다) */
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 7;
/**
 * 서버 `NOT_BLANK_REGEX`(`(?s).*[^\p{javaWhitespace}].*` — `@NotBlank`와 같은 판정, #884)와 같다: Java `Character.isWhitespace`가
 * 아닌 문자가 하나 이상. Java 공백 = 유니코드 공백 문자(Zs·Zl·Zp) 중 줄바꿈 금지 공백(U+00A0·U+2007·U+202F)을 뺀 것 +
 * U+0009~U+000D + U+001C~U+001F(fe423ed4 `V2MyPageRequests.kt`)
 */
export const NOT_BLANK =
  /[^\t\n\u000B\f\r\u001C-\u001F \u1680\u2000-\u2006\u2008-\u200A\u2028\u2029\u205F\u3000]/;

/**
 * PM-2 프로필 부분 수정 본문(엄격). 보낸 필드만 바뀐다(`null`/생략 = 변경 안 함).
 * `profileImageKey`는 PM-3이 준 `key`, 빈 문자열이면 기본 이미지(255자). 응답은 GM-1과 같은 `Me`.
 */
export const UpdateMeRequestSchema = z
  .strictObject({
    name: z.string().min(NICKNAME_MIN).max(NICKNAME_MAX).regex(NOT_BLANK).optional(),
    profileImageKey: z.string().max(255).optional(),
  })
  .refine((b) => b.name !== undefined || b.profileImageKey !== undefined, {
    message: '바꿀 필드가 하나는 있어야 한다',
  });
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

/** GM-4 `status` 필터(`V2FollowingHostFilter`). ACTIVE = 진행 중·예정 공개 공연이 있음, ENDED = 끝난 공개 공연만 */
export const FOLLOWING_HOST_FILTERS = ['ALL', 'ACTIVE', 'ENDED'] as const;
export type FollowingHostFilter = (typeof FOLLOWING_HOST_FILTERS)[number];

/** 관심 호스트의 대표 공연: 진행 중·예정 공개 공연 중 가장 가까운 것, 없으면 가장 최근에 끝난 것 */
export const RepresentativeEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  endAt: kstDateTime.nullable(),
  /** UPCOMING · ONGOING · PAST(공개 공연만이라 PREPARING은 오지 않는다 — 값은 enum 전체를 받는다) */
  displayStatus: EventDisplayStatusSchema,
  /** D-n의 n(당일 0). UPCOMING일 때만 */
  dDay: z.number().int().nullable(),
});
export type RepresentativeEvent = z.infer<typeof RepresentativeEventSchema>;

/** GM-4 관심 호스트 항목(최근 팔로우 순) */
export const FollowingHostSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  /** 공개 공연이 하나도 없으면 null */
  representativeEvent: RepresentativeEventSchema.nullable(),
});
export type FollowingHost = z.infer<typeof FollowingHostSchema>;
export const FollowingHostPageSchema = pageSchema(FollowingHostSchema);

/** GM-5 `year` 범위(`@Min(2000) @Max(9998)`) */
export const ARCHIVE_YEAR_MIN = 2000;
export const ARCHIVE_YEAR_MAX = 9998;

/** GM-5 관람 공연(내가 현재 소유자로 입장한 지난 공연, 공연 단위 중복 없음, 최근 공연 순) */
export const ArchiveEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  host: z.object({ hostId: z.number().int(), name: z.string().nullable() }),
  /** 주문상세(G11/O-3) 이동용 — 이 공연에서 내가 주문하고 입장한 티켓의 주문. 선물받은 티켓으로만 입장했으면 null */
  orderUuid: z.string().nullable(),
});
export type ArchiveEvent = z.infer<typeof ArchiveEventSchema>;

/** GM-5 응답. `years`는 `year`와 상관없이 전체 기준의 연도 탭(최근 순) */
export const ArchiveSchema = z.object({
  years: z.array(z.number().int()),
  events: pageSchema(ArchiveEventSchema),
});
export type Archive = z.infer<typeof ArchiveSchema>;
