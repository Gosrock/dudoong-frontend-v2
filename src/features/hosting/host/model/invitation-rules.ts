import type { AssignableHostRole } from '@/api/host/schema';
import {
  HOST_INVITATION_PATH_PREFIX,
  type HostInvitation,
  type HostInvitationCreated,
} from '@/api/host-invitation/schema';
import { HOST_ROLE_LABEL } from '@/features/hosting/shared/model/host-role';
import { type ActorRole, can } from '@/features/shared/permission/model/can';

/**
 * 호스트 초대(H-16~H-18, 백엔드 #933 — B33②, 모든 초대 승인 방식 #348 B71) 규칙. 화면 동작은 없다.
 * 초대는 매니저 이상, 매니저는 GUEST만(`inviteRoleOptions`와 같은 `can()`).
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

/**
 * 대기 초대 줄. 초대 이메일로 가입한 계정의 닉네임이 있으면(H-17 `inviteeNickname` — Api 2.5.16, #348 B71) 이름 줄
 * (`name` · `profileImageUrl` — GUI `1476:7882` 아바타 + 이름 + 역할), 없으면 이메일 줄(`1452:57010` 이메일 + "역할 · 만료까지")
 */
export function invitationRowsOf(
  list: readonly HostInvitation[],
  myRole: ActorRole | null | undefined,
) {
  return list.map((i) => ({
    invitationId: i.invitationId,
    email: i.email,
    name: i.inviteeNickname?.trim() || null,
    profileImageUrl: i.inviteeProfileImageUrl ?? null,
    roleLabel: HOST_ROLE_LABEL[i.role],
    expiresAt: i.expiresAt,
    cancelable: canCancelInvitation(myRole, i.role),
  }));
}

/**
 * 이 이메일로 보낸 대기 초대가 있는지 — 있으면 다시 초대할 때 옛 링크가 무효가 된다(H-16 "같은 이메일에 대기 초대가 있으면 새 링크로
 * 바꾼다", GUI `1476:7459` 안내). 서버는 이메일을 소문자로 저장 · 비교한다(`V2HostInvitationDomainService.issue`) — 여기도 대소문자를 가리지 않는다
 */
export function hasPendingInvitation(
  list: readonly Pick<HostInvitation, 'email'>[],
  email: string,
) {
  const target = email.trim().toLowerCase();
  return target !== '' && list.some((i) => i.email.trim().toLowerCase() === target);
}

/** 초대 취소에서 이미 없는 초대(`HOST_404_3` — 수락 · 만료 · 다른 사람이 취소) */
export const INVITATION_GONE_MESSAGE = '이미 없는 초대예요. 목록을 새로 불러왔어요';
