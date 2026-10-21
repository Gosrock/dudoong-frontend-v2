import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hostMembers } from '../__mocks__/fixtures/host';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { ApiError } from '../errors';
import { followHostMutation, unfollowHostMutation } from './mutations';
import { hostMembersQuery, hostViewerQuery } from './queries';
import { HostFollowSchema, HostMembersSchema } from './schema';

/** GH-6·PH-13 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다) */

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** 로그인 흉내 — `credentials: 'include'` 요청에만 액세스 토큰 쿠키 */
function login() {
  const fetchWithMsw = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const request = new Request(input, init);
    if (request.credentials !== 'include') return fetchWithMsw(request);
    const headers = new Headers(request.headers);
    headers.set('cookie', 'accessToken=mock');
    return fetchWithMsw(new Request(request, { headers }));
  });
}

const run = <T>(m: { mutationFn?: (v: undefined, c: never) => Promise<T> }) =>
  m.mutationFn!(undefined, {} as never);

afterEach(() => {
  vi.restoreAllMocks();
  resetHostMockState();
});

describe('GH-6 멤버 목록', () => {
  it('fixture가 스키마를 통과한다(UNKNOWN 역할 포함)', () => {
    expect(HostMembersSchema.parse(hostMembers[11])).toHaveLength(4);
    expect(
      HostMembersSchema.parse([{ userId: 9, name: null, profileImageUrl: null, role: 'OWNER' }])[0]
        ?.role,
    ).toBe('UNKNOWN');
  });

  it('멤버는 목록을 받는다', async () => {
    login();
    const members = await client().fetchQuery(hostMembersQuery(11));
    expect(members.map((m) => m.role)).toEqual(['MASTER', 'MANAGER', 'GUEST', 'GUEST']);
  });

  it('비멤버는 403 HOST_400_2', async () => {
    login();
    await expect(client().fetchQuery(hostMembersQuery(12))).rejects.toMatchObject({
      status: 403,
      code: 'HOST_400_2',
    });
  });
});

describe('PH-13 팔로우', () => {
  it('PUT은 두 번 보내도 200이고 viewer가 따라간다. DELETE도 멱등', async () => {
    login();
    expect(await run(followHostMutation(11))).toEqual({
      hostId: 11,
      isFollowing: true,
      followerCount: 129,
    });
    expect(await run(followHostMutation(11))).toMatchObject({
      isFollowing: true,
      followerCount: 129,
    });
    expect((await client().fetchQuery(hostViewerQuery(11))).isFollowing).toBe(true);
    expect(await run(unfollowHostMutation(11))).toMatchObject({ isFollowing: false });
    expect(await run(unfollowHostMutation(11))).toMatchObject({
      isFollowing: false,
      followerCount: 128,
    });
  });

  it('비로그인은 401, 없는 호스트는 404', async () => {
    await expect(run(followHostMutation(11))).rejects.toBeInstanceOf(ApiError);
    await expect(run(followHostMutation(11))).rejects.toMatchObject({ status: 401 });
    login();
    await expect(run(followHostMutation(999999))).rejects.toMatchObject({
      status: 404,
      code: 'Host_404_1',
    });
  });

  it('응답 스키마', () => {
    expect(HostFollowSchema.parse({ hostId: 1, isFollowing: true, followerCount: 3 })).toBeTruthy();
  });
});
