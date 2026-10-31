import { z } from 'zod';

import { EventDisplayStatusSchema, EventStatusSchema } from '../event/schema';
import { CONTACT_TYPES, ContactSchema, HostRoleSchema, PlaceSchema } from '../shared/common-schema';
import { kstDateTime } from '../shared/date';
import { pageSchema } from '../shared/page';

/**
 * 호스트 응답·요청. 공개 응답 기준: 백엔드 `v2/host/dto/response/V2HostHomeResponse.kt`·`V2HostEventResponse.kt`(dev 24aa595).
 */

// ─── 호스트 홈 (GH-3) ────────────────────────────────────────

/**
 * 익명으로 받은 GH-3. 서버 프리페치(토큰 없음)로 받아 `['hosts', id]`에 둔다.
 * 사용자별 필드(`isFollowing`·`myRole`)는 일부러 뺐다 — 익명 값이 화면에 섞이지 않게 타입에서부터 막는다(tech-decisions §4).
 * `contacts`는 공개 필드가 아니다: 비로그인에게는 전화·이메일이 가려져 온다(백엔드 #846). 로그인 사용자의 원문은
 * `HostViewerSchema`(`['hosts', id, 'viewer']`)의 `contacts`에서 읽는다(`resolveContacts`, implementation-log A안).
 */
export const HostDetailSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  introduce: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  /** 대표 연락처. v2 연락처가 없으면 v1 연락처(전화·이메일). 익명 응답이면 전화·이메일은 가린 값(#846) */
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

// ─── 멤버 목록 (GH-6) ────────────────────────────────────────

/**
 * 활성 멤버(일반 이상만 조회). 마스터 → 매니저 → 일반 순, 같은 역할은 먼저 들어온 순으로 온다.
 * 이메일은 없다(api-contract §6 운영). 기준: `V2HostMemberResponse.kt`.
 */
export const HostMemberSchema = z.object({
  userId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  role: HostRoleSchema,
});
export const HostMembersSchema = z.array(HostMemberSchema);
export type HostMember = z.infer<typeof HostMemberSchema>;

// ─── 팔로우 (PH-13) ──────────────────────────────────────────

/** PUT·DELETE 공통 응답(멱등 — 같은 요청을 다시 보내도 200). 기준: `V2HostFollowResponse.kt` */
export const HostFollowSchema = z.object({
  hostId: z.number().int(),
  isFollowing: z.boolean(),
  followerCount: z.number().int(),
});
export type HostFollow = z.infer<typeof HostFollowSchema>;

// ─── 내 호스트 (GH-1) ────────────────────────────────────────

/**
 * 내가 활성 멤버인 호스트(공연준비 홈 호스트 탭). 기준: 백엔드 `v2/host/dto/response/V2MyHostResponse.kt`(dev 432cce4).
 * 호스트 id 큰 순(최근 만든 호스트가 앞, `HostCustomRepositoryImpl.queryPageHostsByActiveUserId`).
 */
export const MyHostSchema = z.object({
  hostId: z.number().int(),
  name: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  /** 이 호스트에서 내 역할. 카드 배지·버튼 숨김용이지 권한의 근거가 아니다(patterns §11) */
  myRole: HostRoleSchema,
  /** 등록된 공연 수(준비중 포함, 삭제 제외) */
  eventCount: z.number().int(),
});
export const MyHostPageSchema = pageSchema(MyHostSchema);
export type MyHost = z.infer<typeof MyHostSchema>;

// ─── 호스트 만들기 (PH-2) ────────────────────────────────────

/** 호스트 입력 규칙(api-contract §3 "호스트"). 서버 검증과 같은 값이다 — `V2CreateHostRequest`·`HostContact`·`Host.MAX_CONTACT_COUNT`(432cce4) */
export const HOST_NAME_MAX = 15;
export const HOST_INTRODUCE_MAX = 255;
export const HOST_CONTACTS_MIN = 1;
export const HOST_CONTACTS_MAX = 10;
export const HOST_CONTACT_VALUE_MAX = 200;
/** `PHONE` 값은 v1 컬럼 때문에 15자 이하 */
export const HOST_PHONE_VALUE_MAX = 15;

/** 보내는 연락처 유형 — 서버 enum 그대로(UNKNOWN은 보내지 않는다) */
export const HostContactTypeSchema = z.enum(CONTACT_TYPES);
export type HostContactType = z.infer<typeof HostContactTypeSchema>;

/**
 * PH-2 본문 `V2CreateHostRequest`(432cce4). 서버는 이름·연락처 값의 앞뒤 공백을 지우고, 공백뿐인 소개는 `null`로 저장한다. 생성자는 마스터가 된다. 이미지는 만든 뒤 설정(PH-15 → PH-4)에서 넣는다.
 * 테스트가 "실제로 보낸 본문"을 이 스키마로 확인한다.
 */
export const CreateHostRequestSchema = z.object({
  name: z.string().trim().min(1).max(HOST_NAME_MAX),
  introduce: z.string().max(HOST_INTRODUCE_MAX).nullable(),
  contacts: z
    .array(
      z
        .object({
          type: HostContactTypeSchema,
          value: z.string().trim().min(1).max(HOST_CONTACT_VALUE_MAX),
        })
        .refine((c) => c.type !== 'PHONE' || c.value.length <= HOST_PHONE_VALUE_MAX),
    )
    .min(HOST_CONTACTS_MIN)
    .max(HOST_CONTACTS_MAX),
});
export type CreateHostRequest = z.infer<typeof CreateHostRequestSchema>;

/** PH-2 응답 `V2CreateHostResponse` — `{hostId}`뿐이라 목록 캐시를 채울 수 없다(GH-1을 다시 읽는다) */
export const CreateHostResponseSchema = z.object({ hostId: z.number().int() });
export type CreateHostResponse = z.infer<typeof CreateHostResponseSchema>;

// ─── 호스트 설정 (PH-4) ──────────────────────────────────────

/** PH-2와 같은 연락처 한 줄(`V2HostContactRequest`, 432cce4) */
const HostContactRequestSchema = z
  .object({
    type: HostContactTypeSchema,
    value: z.string().trim().min(1).max(HOST_CONTACT_VALUE_MAX),
  })
  .refine((c) => c.type !== 'PHONE' || c.value.length <= HOST_PHONE_VALUE_MAX);

/** 이미지 key 길이(`V2UpdateHostRequest` `@Size(max = 255)`) */
export const HOST_IMAGE_KEY_MAX = 255;

/**
 * PH-4 본문 `V2UpdateHostRequest`(432cce4). **키가 없으면 그 필드는 바꾸지 않는다**(PATCH — patterns §23 "바뀐 필드만").
 * - `name` 1~15자, 공백만이면 400(`@Pattern`). 서버가 앞뒤 공백을 지운다
 * - `introduce` 255자. **빈 문자열이면 비운다**(서버 `ifBlank { null }` — PH-2의 `null`과 다르다. PATCH의 `null`은 "변경 안 함")
 * - `contacts` 1~10개 **전체 교체**(값 200자, 전화 15자 — 도메인 검증은 `HOST_400_16`)
 * - `profileImageKey`·`coverImageKey` PH-15가 이 호스트에 발급한 key 그대로, `""`이면 기본 이미지. 아니면 `HOST_400_17`
 */
export const UpdateHostRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(HOST_NAME_MAX),
    introduce: z.string().max(HOST_INTRODUCE_MAX),
    contacts: z.array(HostContactRequestSchema).min(HOST_CONTACTS_MIN).max(HOST_CONTACTS_MAX),
    profileImageKey: z.string().max(HOST_IMAGE_KEY_MAX),
    coverImageKey: z.string().max(HOST_IMAGE_KEY_MAX),
  })
  .partial()
  .strict();
export type UpdateHostRequest = z.infer<typeof UpdateHostRequestSchema>;

/**
 * PH-4 응답은 GH-3과 같은 `V2HostHomeResponse`다(`V2UpdateHostUseCase`, 432cce4) — 요청자 기준이라 `myRole`·`isFollowing`·
 * 원문 연락처가 들어 있어 viewer 키(`['hosts', id, 'viewer']`)에 그대로 넣는다. (`members` 요약은 GH-3처럼 읽지 않는다)
 */
export const UpdateHostResponseSchema = HostViewerSchema;

// ─── 멤버 (PH-7 · PH-10 · DH-11 · PH-12) ─────────────────────

/** 한 번에 추가할 수 있는 멤버 수(`V2AddHostMembersRequest.MAX_MEMBERS`, 432cce4) */
export const HOST_MEMBERS_INVITE_MAX = 20;

/**
 * 멤버 추가·역할 변경에서 보내는 역할(`V2HostMemberRole`, 432cce4). 서버는 `MASTER`도 받지만 지정할 수 없어 400 `HOST_400_10`
 * (마스터는 양도 PH-12로만 바뀐다) — 보내는 쪽 타입에서 뺀다.
 */
export const AssignableHostRoleSchema = z.enum(['MANAGER', 'GUEST']);
export type AssignableHostRole = z.infer<typeof AssignableHostRoleSchema>;

/**
 * PH-7 본문 `V2AddHostMembersRequest`(432cce4) — 가입된 이메일, 1~20명, 수락 없이 바로 활성 멤버.
 * 매니저 요청자는 `GUEST`만(아니면 403 `HOST_400_11`). 한 명이라도 문제가 있으면 아무도 추가하지 않는다.
 */
export const AddHostMembersRequestSchema = z.object({
  members: z
    .array(z.object({ email: z.email(), role: AssignableHostRoleSchema }))
    .min(1)
    .max(HOST_MEMBERS_INVITE_MAX),
});
export type AddHostMembersRequest = z.infer<typeof AddHostMembersRequestSchema>;

/** PH-10 본문 `V2UpdateHostMemberRoleRequest`(432cce4) — 일반 ↔ 매니저(마스터만 부른다) */
export const UpdateHostMemberRoleRequestSchema = z.object({ role: AssignableHostRoleSchema });
export type UpdateHostMemberRoleRequest = z.infer<typeof UpdateHostMemberRoleRequestSchema>;

/** PH-12 본문 `V2TransferMasterRequest`(432cce4) — 새 마스터가 될 활성 멤버 */
export const TransferMasterRequestSchema = z.object({ userId: z.number().int() });
export type TransferMasterRequest = z.infer<typeof TransferMasterRequestSchema>;
