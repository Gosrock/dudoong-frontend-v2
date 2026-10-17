import { z } from 'zod';

import { EventDisplayStatusSchema, EventStatusSchema } from '../event/schema';
import { ContactSchema, HostRoleSchema, PlaceSchema } from '../shared/common-schema';
import { kstDateTime } from '../shared/date';
import { pageSchema } from '../shared/page';

/**
 * 호스트(공개) 응답. 기준: 백엔드 `v2/host/dto/response/V2HostHomeResponse.kt`·`V2HostEventResponse.kt`(dev 24aa595).
 */

// ─── 호스트 홈 (GH-3) ────────────────────────────────────────

/**
 * 공개 필드. 서버 프리페치(토큰 없음)로 받아 `['hosts', id]`에 둔다.
 * 사용자별 필드(`isFollowing`·`myRole`)는 일부러 뺐다 — 익명 값이 화면에 섞이지 않게 타입에서부터 막는다(tech-decisions §4).
 */
export const HostDetailSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  introduce: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  /** 대표 연락처. v2 연락처가 없으면 v1 연락처(전화·이메일) */
  contacts: z.array(ContactSchema),
  /** 개설일 */
  createdAt: kstDateTime.nullable(),
  /** 활성 멤버 수 */
  memberCount: z.number().int(),
  /** 화면에 그리지 않는다(기획서 F4) — 팔로우 뒤 공개 키를 무효화하지 않는 이유 */
  followerCount: z.number().int(),
});
export type HostDetail = z.infer<typeof HostDetailSchema>;

/** 같은 엔드포인트를 쿠키와 함께 부른 결과. `['hosts', id, 'viewer']` */
export const HostViewerSchema = HostDetailSchema.extend({
  /** 비로그인이면 false */
  isFollowing: z.boolean(),
  /** 활성 멤버가 아니면 null. 버튼 숨김용이지 권한의 근거가 아니다 */
  myRole: HostRoleSchema.nullable(),
});
export type HostViewer = z.infer<typeof HostViewerSchema>;

// ─── 호스트 공연 목록 (GH-14) ────────────────────────────────

export const HostEventSchema = z.object({
  eventId: z.number().int(),
  name: z.string().nullable(),
  posterImageUrl: z.string().nullable(),
  startAt: kstDateTime.nullable(),
  /** 미입력이면 null */
  place: PlaceSchema.nullable(),
  /** 저장 상태. 비멤버에게는 PREPARING이 오지 않는다 */
  status: EventStatusSchema,
  displayStatus: EventDisplayStatusSchema,
  /** D-n의 n(당일 0). UPCOMING일 때만, 아니면 null */
  dDay: z.number().int().nullable(),
});
export const HostEventPageSchema = pageSchema(HostEventSchema);
export type HostEvent = z.infer<typeof HostEventSchema>;
