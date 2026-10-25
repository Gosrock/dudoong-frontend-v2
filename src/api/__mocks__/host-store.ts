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

/** 처음 값으로 되돌린다(vitest `beforeEach`·e2e `test.beforeEach`) */
export const resetHostStore = seed;

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
