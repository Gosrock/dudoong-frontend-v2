import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';
import { recordRequests } from '@/test/requests';

import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { myEventsQuery } from '../event/queries';
import { MyEventSchema } from '../event/schema';
import { createHostMutation } from './mutations';
import { MY_HOSTS_KEY, myHostsQuery } from './queries';
import { CreateHostRequestSchema, MyHostSchema } from './schema';

/** GH-1 · GE-1 · PH-2 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다) */

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const firstPage = <T>(q: { queryKey: unknown; queryFn?: unknown }, qc = client()) =>
  qc.fetchInfiniteQuery(q as never).then((d) => (d as { pages: T[] }).pages[0]!);

let restore: (() => void) | null = null;
const login = () => {
  restore = installLoggedInFetch();
};
beforeEach(() => resetHostingStore());
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
});

const create = (body: unknown) =>
  createHostMutation().mutationFn!(body as never, {} as never) as Promise<{ hostId: number }>;

describe('GH-1 내 호스트', () => {
  it('스키마 — 모르는 역할은 UNKNOWN으로 받는다', () => {
    const row = { hostId: 1, name: null, profileImageUrl: null, myRole: 'OWNER', eventCount: 0 };
    expect(MyHostSchema.parse(row).myRole).toBe('UNKNOWN');
  });

  it('쿠키와 함께 page=0으로 읽고, 카드에 myRole과 eventCount(준비중 포함)가 온다', async () => {
    login();
    const sent = recordRequests();
    const page = await firstPage<{ content: unknown[] }>(myHostsQuery());
    expect(page.content).toEqual([
      expect.objectContaining({ hostId: 11, name: '고스락', myRole: 'MASTER', eventCount: 4 }),
    ]);
    expect(await sent.list()).toMatchObject([
      { method: 'GET', path: '/api/v2/me/hosts', query: { page: '0' }, credentials: 'include' },
    ]);
  });

  it('검색어는 앞뒤 공백을 지워 보내고, 빈 검색어는 보내지 않는다(키도 같다)', async () => {
    login();
    const sent = recordRequests();
    await firstPage(myHostsQuery({ keyword: ' 고스 ' }));
    await firstPage(myHostsQuery({ keyword: '  ' }));
    expect((await sent.list()).map((r) => r.query)).toEqual([
      { keyword: '고스', page: '0' },
      { page: '0' },
    ]);
    expect(myHostsQuery({ keyword: ' ' }).queryKey).toEqual(myHostsQuery().queryKey);
    expect(myHostsQuery().queryKey.slice(0, 2)).toEqual([...MY_HOSTS_KEY]);
  });

  it('비로그인은 401 AUTH_401_2', async () => {
    await expect(firstPage(myHostsQuery())).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_401_2',
    });
  });

  it('검색어 51자는 400 BAD_REQUEST(50자는 통과)', async () => {
    login();
    await expect(firstPage(myHostsQuery({ keyword: '가'.repeat(50) }))).resolves.toBeDefined();
    await expect(firstPage(myHostsQuery({ keyword: '가'.repeat(51) }))).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    });
  });
});

describe('GE-1 내 공연', () => {
  it('내 호스트의 공연을 준비중까지, 최신 생성 순으로 — 장소는 평평한 세 필드', async () => {
    login();
    const page = await firstPage<{ content: { eventId: number }[] }>(myEventsQuery());
    expect(page.content.map((e) => e.eventId)).toEqual([140, 103, 101, 90]);
    const parsed = MyEventSchema.parse(page.content[2]);
    expect(parsed).toMatchObject({
      hostId: 11,
      hostName: '고스락',
      myRole: 'MASTER',
      placeName: '홍대 롤링홀',
      placeDetailAddress: '지하 1층',
      status: 'OPEN',
    });
    expect(MyEventSchema.parse(page.content[0])).toMatchObject({
      status: 'PREPARING',
      displayStatus: 'PREPARING',
    });
  });

  it('검색어는 공연명 부분일치', async () => {
    login();
    const page = await firstPage<{ content: { name: string }[] }>(
      myEventsQuery({ keyword: '정기공연' }),
    );
    expect(page.content.map((e) => e.name)).toEqual([
      '고스락 제37회 정기공연',
      '고스락 제36회 정기공연',
    ]);
  });
});

describe('PH-2 호스트 만들기', () => {
  const body = {
    name: '새 밴드',
    introduce: null,
    contacts: [{ type: 'INSTAGRAM', value: '@newband' }],
  };

  it('본문이 요청 스키마를 통과하고, 응답 {hostId}의 호스트가 다음 GH-1에 마스터로 나온다', async () => {
    login();
    expect(CreateHostRequestSchema.safeParse(body).success).toBe(true);
    const { hostId } = await create(body);
    const page = await firstPage<{ content: unknown[] }>(myHostsQuery());
    expect(page.content[0]).toEqual({
      hostId,
      name: '새 밴드',
      profileImageUrl: null,
      myRole: 'MASTER',
      eventCount: 0,
    });
  });

  it.each([
    ['이름 16자', { ...body, name: '가'.repeat(16) }],
    ['이름 공백만', { ...body, name: '   ' }],
    ['연락처 0개', { ...body, contacts: [] }],
    ['연락처 11개', { ...body, contacts: Array(11).fill(body.contacts[0]) }],
    ['전화 16자', { ...body, contacts: [{ type: 'PHONE', value: '0'.repeat(16) }] }],
    ['소개 256자', { ...body, introduce: '가'.repeat(256) }],
  ])('%s → 요청 스키마도 mock도 400 BAD_REQUEST', async (_, bad) => {
    login();
    expect(CreateHostRequestSchema.safeParse(bad).success).toBe(false);
    await expect(create(bad)).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' });
  });

  it('비로그인은 401', async () => {
    await expect(create(body)).rejects.toMatchObject({ status: 401 });
  });
});
