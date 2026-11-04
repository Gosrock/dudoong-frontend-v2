import type { AssignableHostRole } from '@/api/host/schema';
import {
  HOST_INVITATION_PATH_PREFIX,
  type HostInvitation,
  type HostInvitationCreated,
} from '@/api/host-invitation/schema';
import { HOST_ROLE_LABEL } from '@/features/hosting/shared/model/host-role';
import { type ActorRole, can } from '@/features/shared/permission/model/can';

/**
 * 미가입자 초대 링크(H-16~H-18, 백엔드 #933 — B33②) 규칙. 화면 동작은 없다.
 * PH-7이 `HOST_400_13`(미가입)이면 같은 이메일 · 역할로 링크를 만든다(매니저는 GUEST만 — `inviteRoleOptions`와 같은 `can()`).
 */

/**
 * 공유할 링크 = 지금 출처 + 서버 경로. 경로 모양이 `/host-invitations/{토큰}` 하나가 아니면(다른 출처 · 경로 끼워 넣기) 토큰으로 경로를 만든다
 * — 서버 값을 그대로 링크로 쓰지 않는다
 */
export function inviteUrlOf(
  created: Pick<HostInvitationCreated, 'inviteUrlPath' | 'token'>,
  origin: string,
) {
  const path = created.inviteUrlPath;
  const rest = path.startsWith(HOST_INVITATION_PATH_PREFIX)
    ? path.slice(HOST_INVITATION_PATH_PREFIX.length)
    : '';
  const safe = rest !== '' && /^[A-Za-z0-9_-]+$/.test(rest);
  return `${origin}${safe ? path : `${HOST_INVITATION_PATH_PREFIX}${encodeURIComponent(created.token)}`}`;
}

/** 이 초대를 취소할 수 있는지 — 매니저는 GUEST 초대만(서버 H-18 · `HOST_400_11`과 같은 기준, `can()`) */
export function canCancelInvitation(
  myRole: ActorRole | null | undefined,
  role: HostInvitation['role'],
) {
  return role === 'GUEST' ? can(myRole, 'manageMembers') : can(myRole, 'manageManagers');
}

/** 이 역할로 링크를 만들 수 있는지(H-16 — 매니저는 GUEST만) */
export function canCreateInvitation(
  myRole: ActorRole | null | undefined,
  role: AssignableHostRole,
) {
  return role === 'GUEST' ? can(myRole, 'manageMembers') : can(myRole, 'manageManagers');
}

/** 대기 초대 줄 */
export function invitationRowsOf(
  list: readonly HostInvitation[],
  myRole: ActorRole | null | undefined,
) {
  return list.map((i) => ({
    invitationId: i.invitationId,
    email: i.email,
    roleLabel: HOST_ROLE_LABEL[i.role],
    expiresAt: i.expiresAt,
    cancelable: canCancelInvitation(myRole, i.role),
  }));
}

/** 링크 발급 실패 중 화면이 문구를 정하는 것(patterns §24 P10b). 그 밖(403 · 400 · 5xx · 운영 2.5.3의 404)은 공용 토스트 */
export const CREATE_INVITATION_ERROR_MESSAGE = {
  HOST_400_15: '이미 이 호스트의 멤버예요',
  HOST_400_21: '초대 링크를 너무 많이 만들었어요. 잠시 후 다시 시도해 주세요',
} as const;

/** 초대 취소에서 이미 없는 초대(`HOST_404_3` — 수락 · 만료 · 다른 사람이 취소) */
export const INVITATION_GONE_MESSAGE = '이미 없는 초대예요. 목록을 새로 불러왔어요';
