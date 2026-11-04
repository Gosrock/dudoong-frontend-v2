import type { HostMember, HostViewer } from '../host/schema';
import type { HostRole } from '../shared/common-schema';
import { hostMembers } from './fixtures/host';
import { me } from './fixtures/me';

/**
 * 호스트 설정·멤버(P10b) mock 저장소. PH-4·PH-7·PH-10·DH-11·PH-12가 바꾸고, GH-3(viewer `myRole`·`memberCount`·프로필)·GH-6·
 * GH-1·GE-1(`myRole`)이 읽는다 — 마스터를 넘기면 다음 조회부터 mock 사용자가 매니저로 보인다.
 * 처음 값은 `fixtures/host.ts`(`hostMembers`, 고스락 11의 마스터 = mock 사용자). vitest·e2e는 `resetHostStore()`로 되돌린다.
 */

type Stored = HostMember & { joined: number };
type ProfileEdit = Partial<
  Pick<HostViewer, 'name' | 'introduce' | 'contacts' | 'profileImageUrl' | 'coverImageUrl'>
>;

const ROLE_ORDER: Record<HostRole, number> = { MASTER: 0, MANAGER: 1, GUEST: 2, UNKNOWN: 3 };

let members = new Map<number, Stored[]>();
let edits = new Map<number, ProfileEdit>();
let joinSeq = 0;

function seed() {
  joinSeq = 0;
  members = new Map(
    Object.entries(hostMembers).map(([id, list]) => [
      Number(id),
      list.map((m) => ({ ...m, joined: joinSeq++ })),
    ]),
  );
  edits = new Map();
}
seed();

/** 처음 값으로 되돌린다(vitest `beforeEach`·e2e `test.beforeEach`). 초대 저장소도 함께 */
export function resetHostStore() {
  seed();
  seedInvitations();
}

/** GH-6 순서: 마스터 → 매니저 → 일반, 같은 역할은 먼저 들어온 순(`V2ReadHostMembersUseCase`, 432cce4) */
export function membersOf(hostId: number): HostMember[] {
  return [...(members.get(hostId) ?? [])]
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.joined - b.joined)
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      profileImageUrl: m.profileImageUrl,
      role: m.role,
    }));
}

/** mock 사용자(GM-1 `userId`)의 이 호스트 역할. 저장소에 없으면 `undefined`(fixture 값을 쓴다) */
export function mockUserRoleIn(hostId: number): HostRole | undefined {
  return members.get(hostId)?.find((m) => m.userId === me.userId)?.role;
}

/** GH-3에 저장소 값(PH-4로 바꾼 프로필, 활성 멤버 수)을 덮는다 */
export function withHostEdits(host: HostViewer): HostViewer {
  const list = members.get(host.hostId);
  return {
    ...host,
    ...edits.get(host.hostId),
    ...(list && { memberCount: list.length }),
  };
}

/** PH-4로 바꾼 프로필(없으면 undefined) — GH-1 카드 이름·이미지 */
export const profileEditOf = (hostId: number): ProfileEdit | undefined => edits.get(hostId);

export function editHostProfile(hostId: number, edit: ProfileEdit) {
  edits.set(hostId, { ...edits.get(hostId), ...edit });
}

export function addStoredMembers(hostId: number, added: HostMember[]) {
  const list = members.get(hostId) ?? [];
  members.set(hostId, [...list, ...added.map((m) => ({ ...m, joined: joinSeq++ }))]);
}

export function setStoredRole(hostId: number, userId: number, role: HostRole) {
  const list = members.get(hostId) ?? [];
  members.set(
    hostId,
    list.map((m) => (m.userId === userId ? { ...m, role } : m)),
  );
}

export function removeStoredMember(hostId: number, userId: number) {
  members.set(
    hostId,
    (members.get(hostId) ?? []).filter((m) => m.userId !== userId),
  );
}

/**
 * mock 사용자를 이 호스트의 `role`로 본다(3시점 테스트용). 마스터가 아니게 되면 다른 멤버(먼저 들어온 순)가 마스터가 된다.
 * GH-3 viewer·GH-6·멤버 변경의 권한 판정이 모두 이 값을 따른다.
 */
export function actAsRole(hostId: number, role: Exclude<HostRole, 'UNKNOWN'>) {
  const list = members.get(hostId) ?? [];
  const others = list.filter((m) => m.userId !== me.userId).sort((a, b) => a.joined - b.joined);
  if (role === 'MASTER') {
    for (const m of others) if (m.role === 'MASTER') setStoredRole(hostId, m.userId, 'MANAGER');
  } else if (!others.some((m) => m.role === 'MASTER') && others[0]) {
    setStoredRole(hostId, others[0].userId, 'MASTER');
  }
  setStoredRole(hostId, me.userId, role);
}

// ─── 초대 링크(H-16~H-20, 백엔드 #933 · Api 2.5.7) ───

/** 대기 중인 초대(H-17). 토큰은 mock이라 원문으로 둔다(서버는 SHA-256 해시만) */
export type StoredInvitation = {
  invitationId: number;
  hostId: number;
  email: string;
  role: 'MANAGER' | 'GUEST';
  inviterUserId: number;
  expiresAt: string;
  token: string;
  state: 'PENDING' | 'ACCEPTED' | 'CANCELED' | 'EXPIRED';
};

/**
 * 고정 토큰(e2e · QA). 모두 `mock-invite-`로 시작한다 — e2e fixture `consolePii`가 이 모양을 콘솔에서 잡는다.
 * - `valid` 소음공작소(12) 일반 멤버 초대 — mock 사용자는 아직 멤버가 아니다
 * - `member` 고스락(11) 매니저 초대 — mock 사용자는 이미 마스터라 `alreadyMember`, 수락 결과 역할은 기존 마스터
 * - `expired` `HOST_400_19` · `used` `HOST_400_20` · 그 밖 `HOST_404_3`
 */
export const MOCK_INVITE_TOKEN = {
  valid: 'mock-invite-valid-Q2hvb3NlIHRoZSBzb3VuZA',
  member: 'mock-invite-member-R29zcm9jayBtYXN0ZXI',
  expired: 'mock-invite-expired-T2xkIGxpbmsgZXhwaXJlZA',
  used: 'mock-invite-used-QWxyZWFkeSB1c2VkIGxpbms',
  missing: 'mock-invite-missing-Tm8gc3VjaCBpbnZpdGF0aW9u',
} as const;

let invitations: StoredInvitation[] = [];
let invitationSeq = 0;

function seedInvitations() {
  invitationSeq = 500;
  const base = { inviterUserId: 1, state: 'PENDING' as const };
  invitations = [
    {
      ...base,
      invitationId: 401,
      hostId: 12,
      email: 'newbie@example.com',
      role: 'GUEST',
      inviterUserId: 21,
      expiresAt: '2099.01.01 12:00',
      token: MOCK_INVITE_TOKEN.valid,
    },
    {
      ...base,
      invitationId: 402,
      hostId: 11,
      email: 'dudoong@example.com',
      role: 'MANAGER',
      expiresAt: '2099.01.01 12:00',
      token: MOCK_INVITE_TOKEN.member,
    },
    {
      ...base,
      invitationId: 403,
      hostId: 11,
      email: 'late@example.com',
      role: 'GUEST',
      expiresAt: '2020.01.01 12:00',
      token: MOCK_INVITE_TOKEN.expired,
      state: 'EXPIRED',
    },
    {
      ...base,
      invitationId: 404,
      hostId: 11,
      email: 'used@example.com',
      role: 'GUEST',
      expiresAt: '2099.01.01 12:00',
      token: MOCK_INVITE_TOKEN.used,
      state: 'ACCEPTED',
    },
    // 고스락(11) 대기 초대 — 멤버 화면 "초대 대기" 목록(매니저 초대는 마스터만 취소)
    {
      ...base,
      invitationId: 405,
      hostId: 11,
      email: 'pending-guest@example.com',
      role: 'GUEST',
      expiresAt: '2099.01.08 12:00',
      token: 'mock-invite-405-UGVuZGluZyBndWVzdA',
    },
    {
      ...base,
      invitationId: 406,
      hostId: 11,
      email: 'pending-manager@example.com',
      role: 'MANAGER',
      expiresAt: '2099.01.09 12:00',
      token: 'mock-invite-406-UGVuZGluZyBtYW5hZ2Vy',
    },
  ];
}
seedInvitations();

/** 초대 저장소만 처음 값으로(`resetHostStore`가 같이 부른다) */
export const resetInvitationStore = seedInvitations;

/** H-17 — 이 호스트의 대기 초대(만료 시각이 지난 것 빼고), 발급 순 */
export function pendingInvitationsOf(hostId: number, now: string) {
  return invitations.filter(
    (i) => i.hostId === hostId && i.state === 'PENDING' && i.expiresAt > now,
  );
}

export const invitationByToken = (token: string) => invitations.find((i) => i.token === token);

export const invitationById = (hostId: number, invitationId: number) =>
  invitations.find(
    (i) => i.hostId === hostId && i.invitationId === invitationId && i.state === 'PENDING',
  );

/** H-16 — 같은 이메일의 대기 초대는 무효로 하고 새로 발급한다 */
export function issueInvitation(
  hostId: number,
  email: string,
  role: 'MANAGER' | 'GUEST',
  inviterUserId: number,
  expiresAt: string,
): StoredInvitation {
  const lower = email.toLowerCase();
  invitations = invitations.map((i) =>
    i.hostId === hostId && i.email === lower && i.state === 'PENDING'
      ? { ...i, state: 'CANCELED' }
      : i,
  );
  invitationSeq += 1;
  const issued: StoredInvitation = {
    invitationId: invitationSeq,
    hostId,
    email: lower,
    role,
    inviterUserId,
    expiresAt,
    token: `mock-invite-${invitationSeq}-${Math.random().toString(36).slice(2, 12)}`,
    state: 'PENDING',
  };
  invitations = [...invitations, issued];
  return issued;
}

export function setInvitationState(invitationId: number, state: StoredInvitation['state']) {
  invitations = invitations.map((i) => (i.invitationId === invitationId ? { ...i, state } : i));
}
