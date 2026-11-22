import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { hostSets, MOCK_INVITE_LIMIT_EMAIL, resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole, MOCK_INVITE_TOKEN } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { server } from '../__mocks__/server';
import { ApiError } from '../errors';
import { deleteHostMutation } from '../host/mutations';
import { hostMembersQuery } from '../host/queries';
import { hostViewerQuery, myHostsQuery } from '../host/queries';
import { followingHostsQuery } from '../me/queries';
import {
  acceptHostInvitationMutation,
  cancelHostInvitationMutation,
  createHostInvitationMutation,
  rejectHostInvitationMutation,
} from './mutations';
import { hostInvitationLandingQuery, hostInvitationsQuery } from './queries';

/**
 * H-16~H-20(백엔드 #933, Api 2.5.7) — 정의 + mock + 스키마가 맞물리는지(실제 `api` · zod 파싱을 탄다).
 * mock은 `V2HostInvitationController` · 응답 DTO(dev 2026-11-04)를 따른다.
 */

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
});

const call = <V>(m: { mutationFn?: (v: V, c: never) => Promise<unknown> }, v: V) =>
  m.mutationFn!(v, {} as never);
const codeOf = (p: Promise<unknown>): Promise<[number, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code];
      throw e;
    },
  );

describe('H-16 초대 링크 발급', () => {
  it('미가입 이메일도 된다 — 경로만 오고(origin 없음) 대기 목록(H-17)에 생긴다', async () => {
    const created = (await call(createHostInvitationMutation(11), {
      email: 'Newcomer@Example.com',
      role: 'GUEST',
    })) as { token: string; inviteUrlPath: string; mailSent?: boolean };
    expect(created.inviteUrlPath).toBe(`/host-invitations/${created.token}`);
    expect(created.mailSent).toBe(true);
    const list = await new QueryClient().fetchQuery(hostInvitationsQuery(11));
    expect(list.map((i) => i.email)).toContain('newcomer@example.com');
    // H-17은 토큰을 주지 않는다
    expect(JSON.stringify(list)).not.toContain(created.token);
  });

  it.each<
    [
      string,
      Parameters<ReturnType<typeof createHostInvitationMutation>['mutationFn'] & {}>[0],
      [number, string],
    ]
  >([
    [
      '이미 멤버인 계정의 이메일',
      { email: 'drum@example.com', role: 'GUEST' },
      [400, 'HOST_400_15'],
    ],
    ['발급 한도', { email: MOCK_INVITE_LIMIT_EMAIL, role: 'GUEST' }, [400, 'HOST_400_21']],
  ])('%s → %j', async (_, body, expected) => {
    expect(await codeOf(call(createHostInvitationMutation(11), body))).toEqual(expected);
  });

  it('매니저는 GUEST만 — MANAGER면 403 HOST_400_11, 일반 멤버는 403 HOST_400_1', async () => {
    actAsRole(11, 'MANAGER');
    expect(
      await codeOf(call(createHostInvitationMutation(11), { email: 'a@b.com', role: 'MANAGER' })),
    ).toEqual([403, 'HOST_400_11']);
    actAsRole(11, 'GUEST');
    expect(
      await codeOf(call(createHostInvitationMutation(11), { email: 'a@b.com', role: 'GUEST' })),
    ).toEqual([403, 'HOST_400_1']);
  });
});

describe('H-18 초대 취소', () => {
  it('응답은 남은 대기 초대 — 다시 취소하면 404 HOST_404_3', async () => {
    const left = (await call(cancelHostInvitationMutation(11), 405)) as { invitationId: number }[];
    expect(left.map((i) => i.invitationId)).toEqual([402, 406]);
    expect(await codeOf(call(cancelHostInvitationMutation(11), 405))).toEqual([404, 'HOST_404_3']);
  });

  it('매니저는 매니저 초대를 취소할 수 없다(403 HOST_400_11)', async () => {
    actAsRole(11, 'MANAGER');
    expect(await codeOf(call(cancelHostInvitationMutation(11), 406))).toEqual([403, 'HOST_400_11']);
  });
});

describe('H-19 · H-20 초대 수락', () => {
  it('수락 화면은 가린 이메일 · 역할 · 만료, 수락하면 멤버가 되고 링크는 다시 쓸 수 없다(HOST_400_20)', async () => {
    const qc = new QueryClient();
    const landing = await qc.fetchQuery(hostInvitationLandingQuery(MOCK_INVITE_TOKEN.valid));
    expect(landing).toMatchObject({
      hostId: 12,
      hostName: '소음공작소',
      role: 'GUEST',
      maskedEmail: 'ne***@example.com',
      alreadyMember: false,
    });
    expect(await call(acceptHostInvitationMutation(MOCK_INVITE_TOKEN.valid), undefined)).toEqual({
      hostId: 12,
      role: 'GUEST',
      alreadyMember: false,
    });
    expect((await qc.fetchQuery(hostMembersQuery(12))).map((m) => m.role)).toEqual([
      'MASTER',
      'GUEST',
    ]);
    expect(
      await codeOf(call(acceptHostInvitationMutation(MOCK_INVITE_TOKEN.valid), undefined)),
    ).toEqual([400, 'HOST_400_20']);
  });

  it('이미 멤버면 200 + alreadyMember, 역할은 초대한 역할(매니저)이 아니라 기존 역할(마스터)', async () => {
    expect(await call(acceptHostInvitationMutation(MOCK_INVITE_TOKEN.member), undefined)).toEqual({
      hostId: 11,
      role: 'MASTER',
      alreadyMember: true,
    });
  });

  it.each([
    [MOCK_INVITE_TOKEN.expired, [400, 'HOST_400_19']],
    [MOCK_INVITE_TOKEN.used, [400, 'HOST_400_20']],
    [MOCK_INVITE_TOKEN.missing, [404, 'HOST_404_3']],
  ])('%s → %j', async (token, expected) => {
    expect(await codeOf(new QueryClient().fetchQuery(hostInvitationLandingQuery(token)))).toEqual(
      expected,
    );
  });
});

describe('#348 — H-16 가입한 이메일 · H-17 닉네임 · H-21 거절 · H-22 호스트 삭제(Api 2.5.16)', () => {
  it('가입한 이메일도 H-16으로 대기 초대가 되고, H-17에 그 계정 닉네임이 온다(미가입 · 계정 여럿은 null)', async () => {
    await call(createHostInvitationMutation(11), { email: 'guitar@example.com', role: 'GUEST' });
    await call(createHostInvitationMutation(11), { email: 'twin@example.com', role: 'GUEST' });
    await call(createHostInvitationMutation(11), { email: 'nobody@example.com', role: 'GUEST' });
    const list = await new QueryClient().fetchQuery(hostInvitationsQuery(11));
    const byEmail = Object.fromEntries(list.map((i) => [i.email, i.inviteeNickname]));
    expect(byEmail).toMatchObject({
      'guitar@example.com': '박기타',
      'twin@example.com': null,
      'nobody@example.com': null,
    });
    // 수락 전이라 멤버가 아니다
    const members = await new QueryClient().fetchQuery(hostMembersQuery(11));
    expect(members.some((m) => m.name === '박기타')).toBe(false);
  });

  it('H-21 거절 → {hostId, hostName}, 대기에서 빠지고 같은 링크는 HOST_400_20', async () => {
    expect(await call(rejectHostInvitationMutation(MOCK_INVITE_TOKEN.valid), undefined)).toEqual({
      hostId: 12,
      hostName: '소음공작소',
    });
    expect(await codeOf(call(rejectHostInvitationMutation(MOCK_INVITE_TOKEN.valid), undefined))).toEqual([
      400,
      'HOST_400_20',
    ]);
    expect(await codeOf(call(acceptHostInvitationMutation(MOCK_INVITE_TOKEN.valid), undefined))).toEqual([
      400,
      'HOST_400_20',
    ]);
    expect(await codeOf(new QueryClient().fetchQuery(hostInvitationLandingQuery(MOCK_INVITE_TOKEN.valid)))).toEqual([
      400,
      'HOST_400_20',
    ]);
  });

  it.each([
    [MOCK_INVITE_TOKEN.expired, [400, 'HOST_400_19']],
    [MOCK_INVITE_TOKEN.used, [400, 'HOST_400_20']],
    [MOCK_INVITE_TOKEN.missing, [404, 'HOST_404_3']],
  ] as const)('H-21 오류는 수락과 같다 — %s → %o', async (token, expected) => {
    expect(await codeOf(call(rejectHostInvitationMutation(token), undefined))).toEqual(expected);
  });

  it('H-3 삭제 값은 활성 마스터에게만 — 등록한 공연이 있는 고스락(11)은 막힘(HOST_400_22), H-22도 400', async () => {
    const host = await new QueryClient().fetchQuery(hostViewerQuery(11));
    expect(host).toMatchObject({ deletable: false, deleteBlockedReason: 'HOST_400_22' });
    expect(typeof host.preparingEventCount).toBe('number');
    expect(await codeOf(call(deleteHostMutation(11), undefined))).toEqual([400, 'HOST_400_22']);
    actAsRole(11, 'MANAGER');
    expect(await new QueryClient().fetchQuery(hostViewerQuery(11))).toMatchObject({
      preparingEventCount: null,
      deletable: null,
      deleteBlockedReason: null,
    });
    expect(await codeOf(call(deleteHostMutation(11), undefined))).toEqual([403, 'HOST_400_4']);
  });

  it('H-22 성공 → {hostId, deletedEventCount}, 그 뒤 GH-3 404 · 내 호스트 · 관심 호스트에서 빠진다', async () => {
    server.use(...hostSets.deletable(12, 2));
    expect(await new QueryClient().fetchQuery(hostViewerQuery(12))).toMatchObject({
      preparingEventCount: 2,
      deletable: true,
      deleteBlockedReason: null,
    });
    const following = async () =>
      (await new QueryClient().fetchInfiniteQuery(followingHostsQuery())).pages[0]!.content.map(
        (h) => h.hostId,
      );
    expect(await following()).toContain(12);
    expect(await call(deleteHostMutation(12), undefined)).toEqual({
      hostId: 12,
      deletedEventCount: 2,
    });
    expect(await codeOf(new QueryClient().fetchQuery(hostViewerQuery(12)))).toEqual([404, 'Host_404_1']);
    expect(await following()).not.toContain(12);
    const mine = await new QueryClient().fetchInfiniteQuery(myHostsQuery());
    expect(mine.pages[0]!.content.some((h) => h.hostId === 12)).toBe(false);
  });
});
