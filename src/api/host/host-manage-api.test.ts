import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { ApiError } from '../errors';
import { myEventsQuery } from '../event/queries';
import {
  addHostMembersMutation,
  removeHostMemberMutation,
  transferMasterMutation,
  updateHostMemberRoleMutation,
  updateHostMutation,
} from './mutations';
import { hostMembersQuery, hostViewerQuery, myHostsQuery } from './queries';
import { HostViewerSchema, UpdateHostRequestSchema } from './schema';

/**
 * P10b — PH-4 · GH-6 · PH-7 · PH-10 · DH-11 · PH-12 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다).
 * mock은 백엔드 `V2HostController`·유스케이스·`Host`·`V2HostDomainService`(432cce4)의 검사 순서·코드를 따른다.
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
/** 실패면 [HTTP 상태, code, reason], 성공이면 null */
const codeOf = (p: Promise<unknown>): Promise<[number, string, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code, e.reason];
      throw e;
    },
  );

describe('PH-4 호스트 설정', () => {
  it('응답은 GH-3 viewer와 같은 모양(요청자 기준 myRole·원문 연락처)이고, 다음 GH-3에 반영된다', async () => {
    const res = await call(updateHostMutation(11), { name: ' 고스락2 ', introduce: '' });
    expect(HostViewerSchema.parse(res)).toMatchObject({
      hostId: 11,
      name: '고스락2',
      introduce: null,
      myRole: 'MASTER',
    });
    const qc = new QueryClient();
    expect(await qc.fetchQuery(hostViewerQuery(11))).toMatchObject({ name: '고스락2' });
  });

  it('요청 스키마 — 키가 없는 필드는 바꾸지 않는다, 모르는 키는 받지 않는다', () => {
    expect(UpdateHostRequestSchema.parse({})).toEqual({});
    expect(() => UpdateHostRequestSchema.parse({ slackUrl: 'x' })).toThrow();
    expect(() => UpdateHostRequestSchema.parse({ contacts: [] })).toThrow();
  });

  it.each([
    [
      '전화 16자 → HOST_400_16',
      { contacts: [{ type: 'PHONE', value: '0'.repeat(16) }] },
      'HOST_400_16',
    ],
    [
      '남의 호스트 key → HOST_400_17',
      { coverImageKey: 'host/12/00000000-0000-4000-8000-000000000001.png' },
      'HOST_400_17',
    ],
    ['공백만 이름 → BAD_REQUEST(Bean Validation)', { name: '   ' }, 'BAD_REQUEST'],
  ])('%s', async (_, body, code) => {
    expect((await codeOf(call(updateHostMutation(11), body as never)))?.[1]).toBe(code);
  });

  it('일반 멤버는 403 HOST_400_1, 비멤버는 403 HOST_400_2', async () => {
    expect((await codeOf(call(updateHostMutation(12), { name: 'x' })))?.slice(0, 2)).toEqual([
      403,
      'HOST_400_2',
    ]);
    actAsRole(11, 'GUEST');
    expect((await codeOf(call(updateHostMutation(11), { name: 'x' })))?.slice(0, 2)).toEqual([
      403,
      'HOST_400_1',
    ]);
  });
});

describe('멤버 변경 — 응답은 변경 뒤 멤버 전체 목록(마스터 → 매니저 → 일반, 먼저 들어온 순)', () => {
  it('PH-7 추가: 새 멤버가 역할 순서대로 들어간다', async () => {
    const list = await call(addHostMembersMutation(11), {
      members: [
        { email: 'vocal@example.com', role: 'GUEST' },
        { email: 'GUITAR@example.com', role: 'MANAGER' },
      ],
    });
    expect((list as { userId: number; role: string }[]).map((m) => [m.userId, m.role])).toEqual([
      [1, 'MASTER'],
      [2, 'MANAGER'],
      [31, 'MANAGER'],
      [3, 'GUEST'],
      [4, 'GUEST'],
      [32, 'GUEST'],
    ]);
    const qc = new QueryClient();
    expect((await qc.fetchQuery(hostViewerQuery(11))).memberCount).toBe(6);
  });

  it.each([
    // 검사 순서: 중복(소문자) → 같은 이메일 계정 여럿 → 미가입 → 이미 멤버
    [
      ['A@x.com', 'a@x.com', 'nobody@example.com'],
      [400, 'HOST_400_14', '중복된 이메일이 있습니다. (a@x.com)'],
    ],
    [
      ['twin@example.com', 'nobody@example.com'],
      [400, 'HOST_400_18', '같은 이메일로 가입된 계정이 여러 개입니다. (twin@example.com)'],
    ],
    [
      ['nobody@example.com', 'drum@example.com', 'none@example.com'],
      [400, 'HOST_400_13', '가입되지 않은 이메일입니다. (nobody@example.com, none@example.com)'],
    ],
    [
      ['guitar@example.com', 'drum@example.com'],
      [400, 'HOST_400_15', '이미 호스트 멤버인 이메일입니다. (drum@example.com)'],
    ],
  ])('PH-7 실패 %o → %o, 아무도 추가되지 않는다', async (emails, expected) => {
    const body = { members: emails.map((email) => ({ email, role: 'GUEST' as const })) };
    expect(await codeOf(call(addHostMembersMutation(11), body))).toEqual(expected);
    expect(await new QueryClient().fetchQuery(hostMembersQuery(11))).toHaveLength(4);
  });

  it('PH-10 역할 변경: 마스터 대상 HOST_400_5, 없는 멤버 404 HOST_404_2, 마스터 아님 403 HOST_400_4', async () => {
    const change = updateHostMemberRoleMutation(11);
    expect((await codeOf(call(change, { userId: 1, role: 'GUEST' })))?.[1]).toBe('HOST_400_5');
    expect((await codeOf(call(change, { userId: 99, role: 'GUEST' })))?.slice(0, 2)).toEqual([
      404,
      'HOST_404_2',
    ]);
    actAsRole(11, 'MANAGER');
    expect((await codeOf(call(change, { userId: 3, role: 'MANAGER' })))?.slice(0, 2)).toEqual([
      403,
      'HOST_400_4',
    ]);
  });

  it('DH-11 삭제: 마스터 HOST_400_12, 매니저가 매니저(나 자신 포함)를 지우면 403 HOST_400_11, 일반 멤버는 지운다', async () => {
    expect((await codeOf(call(removeHostMemberMutation(11), 1)))?.[1]).toBe('HOST_400_12');
    actAsRole(11, 'MANAGER');
    // 매니저 시점: 김매니저(2)가 마스터, 나(1)는 매니저 — 본인 삭제(나가기)도 이 규칙으로 막힌다
    expect((await codeOf(call(removeHostMemberMutation(11), 1)))?.slice(0, 2)).toEqual([
      403,
      'HOST_400_11',
    ]);
    const list = (await call(removeHostMemberMutation(11), 3)) as { userId: number }[];
    expect(list.map((m) => m.userId)).toEqual([2, 1, 4]);
  });

  it('PH-12 양도: 나는 매니저, 대상은 마스터 — 다음 GH-1·GE-1·GH-3의 myRole이 MANAGER', async () => {
    const list = (await call(transferMasterMutation(11), { userId: 3 })) as {
      userId: number;
      role: string;
    }[];
    expect(list.map((m) => [m.userId, m.role])).toEqual([
      [3, 'MASTER'],
      [1, 'MANAGER'],
      [2, 'MANAGER'],
      [4, 'GUEST'],
    ]);
    const qc = new QueryClient();
    expect((await qc.fetchQuery(hostViewerQuery(11))).myRole).toBe('MANAGER');
    const hosts = await qc.fetchInfiniteQuery(myHostsQuery() as never);
    expect(
      (hosts as { pages: { content: { myRole: string }[] }[] }).pages[0]!.content[0]!.myRole,
    ).toBe('MANAGER');
    const events = await qc.fetchInfiniteQuery(myEventsQuery() as never);
    expect(
      (
        events as { pages: { content: { hostId: number; myRole: string }[] }[] }
      ).pages[0]!.content.filter((e) => e.hostId === 11).every((e) => e.myRole === 'MANAGER'),
    ).toBe(true);
  });

  it('PH-12 활성 멤버가 아니면 404 HOST_404_2', async () => {
    expect((await codeOf(call(transferMasterMutation(11), { userId: 99 })))?.slice(0, 2)).toEqual([
      404,
      'HOST_404_2',
    ]);
  });
});
