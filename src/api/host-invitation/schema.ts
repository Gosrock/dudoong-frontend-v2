import { z } from 'zod';

import { AssignableHostRoleSchema } from '../host/schema';
import { HostRoleSchema } from '../shared/common-schema';
import { kstDateTime } from '../shared/date';

/**
 * 미가입자 호스트 초대 링크 H-16~H-20(백엔드 #933, Api 2.5.7 — 스테이징 DDL V024 뒤에만 동작, 그 전 500. 운영 2.5.3에는 없다 — 404).
 * 기준: `V2HostInvitationResponses.kt`·`V2CreateHostInvitationRequest.kt`(dev, 2026-11-04). 프론트는 PH-7이 `HOST_400_13`(미가입)일 때만 H-16을 부른다.
 *
 * **토큰**: base64url 43자 · 1회용 · 7일. H-16 응답에서만 받는다(H-17은 주지 않는다). 로그·주소창·분석 스크립트에 남기지 않는다
 * (화면 `/host-invitations/{token}` — 진입 직후 주소에서 지운다, implementation-log "backend-928-misc").
 */

/** H-16 본문 — 가입하지 않은 이메일도 된다. 매니저 요청자는 `GUEST`만(아니면 403 `HOST_400_11`) */
export const CreateHostInvitationRequestSchema = z.object({
  email: z.email(),
  role: AssignableHostRoleSchema,
});
export type CreateHostInvitationRequest = z.infer<typeof CreateHostInvitationRequestSchema>;

/** H-16 응답. `inviteUrlPath`는 경로만(`/host-invitations/{token}`) — origin은 프론트가 붙인다 */
export const HostInvitationCreatedSchema = z.object({
  invitationId: z.number().int(),
  token: z.string().min(1),
  inviteUrlPath: z.string(),
  expiresAt: kstDateTime,
  /** 이번에 링크 메일을 보내는지. 같은 이메일을 10분 안에 다시 초대하면 false(토큰만 새로). 발송 성공 여부는 아니다 */
  mailSent: z.boolean().optional(),
});
export type HostInvitationCreated = z.infer<typeof HostInvitationCreatedSchema>;

/** H-17 대기 중인 초대 하나. 링크(토큰)는 다시 주지 않는다 — 다시 보내려면 H-16 재초대(옛 링크 무효) */
export const HostInvitationSchema = z.object({
  invitationId: z.number().int(),
  /** 초대한 이메일(소문자) */
  email: z.string(),
  /** MANAGER / GUEST */
  role: HostRoleSchema,
  inviterUserId: z.number().int().optional(),
  expiresAt: kstDateTime,
});
export type HostInvitation = z.infer<typeof HostInvitationSchema>;

/** H-17 · H-18(취소 뒤 남은 대기 초대) 응답 */
export const HostInvitationsSchema = z.array(HostInvitationSchema);

/** H-19 초대 수락 화면(로그인). 초대 이메일은 가린 값만 */
export const HostInvitationLandingSchema = z.object({
  hostId: z.number().int(),
  hostName: z.string().nullable(),
  hostProfileImageUrl: z.string().nullable().optional(),
  /** 초대 역할(MANAGER / GUEST) */
  role: HostRoleSchema,
  /** 예: `ne***@gosrock.band` */
  maskedEmail: z.string(),
  expiresAt: kstDateTime,
  /** 로그인한 사람이 이미 이 호스트의 활성 멤버인지(수락해도 그대로 200) */
  alreadyMember: z.boolean(),
});
export type HostInvitationLanding = z.infer<typeof HostInvitationLandingSchema>;

/**
 * H-20 수락 결과. `role`은 **내 역할** — 이미 멤버였거나 v1에서 대기 멤버였으면 기존 역할이라 초대한 역할과 다를 수 있다
 * (백엔드 #928 답) — 화면은 이 값으로 보여 준다
 */
export const HostInvitationAcceptSchema = z.object({
  hostId: z.number().int(),
  role: HostRoleSchema,
  alreadyMember: z.boolean(),
});
export type HostInvitationAccept = z.infer<typeof HostInvitationAcceptSchema>;

/** `inviteUrlPath`의 모양. 다르면 토큰으로 경로를 만든다(서버 값을 그대로 링크로 쓰지 않는다) */
export const HOST_INVITATION_PATH_PREFIX = '/host-invitations/';
