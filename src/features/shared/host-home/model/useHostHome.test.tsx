import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hostSets, resetHostMockState } from '@/api/__mocks__/host.handlers';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { hasAccessToken } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import type { HostRole } from '@/api/shared/common-schema';
import { errorToast } from '@/test/error-toast';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useHostHome } from './useHostHome';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

let realFetch: typeof fetch;
let loggedIn = false;
beforeEach(() => {
  realFetch = globalThis.fetch;
  loggedIn = false;
  // 브라우저처럼 `credentials: 'include'` 요청에만 액세스 토큰 쿠키를 싣는다(Node fetch는 document.cookie를 싣지 않는다)
  globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    if (!loggedIn || request.credentials !== 'include') return realFetch(request);
    const headers = new Headers(request.headers);
    headers.set('cookie', 'accessToken=mock');
    return realFetch(new Request(request, { headers }));
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = realFetch;
  resetHostMockState();
});

const GOSROCK = '11';

/** 시점: 비로그인 · 관객(비멤버) · 일반 멤버 · 매니저 · 마스터 */
type Viewpoint = 'anonymous' | 'audience' | HostRole;
function given(viewpoint: Viewpoint, opts: { isFollowing?: boolean } = {}) {
  if (viewpoint === 'anonymous') return;
  loggedIn = true;
  const myRole = viewpoint === 'audience' ? null : viewpoint;
  server.use(...hostSets.viewAs(11, { myRole, isFollowing: opts.isFollowing ?? false }));
}

function setup(hostId = GOSROCK) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  const view = renderHook(() => useHostHome(hostId), { wrapper });
  return { ...view, queryClient };
}

type HookResult = { current: ReturnType<typeof useHostHome> };
function toggle(result: HookResult) {
  act(() => {
    if (result.current.follow.status === 'ready') result.current.follow.toggle();
  });
}
const viewerFollowing = (qc: QueryClient) =>
  qc.getQueryData<{ isFollowing: boolean }>(['hosts', '11', 'viewer'])?.isFollowing;

async function settled(hostId?: string) {
  const view = setup(hostId);
  await waitFor(() => expect(view.result.current?.viewerStatus).not.toBe('pending'));
  await waitFor(() => expect(view.result.current.events.status).not.toBe('pending'));
  return view;
}

describe('호스트 홈 — 시점별 노출(can + viewer)', () => {
  it.each<[Viewpoint, string, string[], boolean, boolean]>([
    ['anonymous', 'login', [], false, false],
    ['audience', 'ready', [], false, false],
    ['GUEST', 'ready', ['members'], true, true],
    ['MANAGER', 'ready', ['settings', 'members', 'newEvent'], true, true],
    ['MASTER', 'ready', ['settings', 'members', 'newEvent'], true, true],
  ])(
    '%s 시점: ♡ %s, 관리 버튼 %j, 멤버 아바타 %s, 준비중 공연 %s',
    async (viewpoint, followStatus, manageKeys, hasMembers, seesPreparing) => {
      given(viewpoint);
      const { result } = await settled();
      const s = result.current;
      expect(s.follow.status).toBe(followStatus);
      expect(s.manage).toEqual({
        status: 'ready',
        actions: expect.any(Array),
      });
      if (s.manage.status === 'ready')
        expect(s.manage.actions.map((a) => a.key)).toEqual(manageKeys);
      if (hasMembers) await waitFor(() => expect(result.current.members).not.toBeNull());
      expect(result.current.members !== null).toBe(hasMembers);
      expect(s.events.items.some((e) => e.isPreparing)).toBe(seesPreparing);
    },
  );

  it('비로그인: 사용자별 요청(GH-3 viewer·GH-6·PH-13)을 하나도 보내지 않고 공개 GET은 쿠키 없이 보낸다', async () => {
    const sent = recordRequests();
    const { result } = await settled();
    expect(result.current.follow.status).toBe('login');
    const list = await sent.list();
    expect(list.map((r) => `${r.method} ${r.path} ${r.credentials}`).sort()).toEqual([
      'GET /api/v2/hosts/11 omit',
      'GET /api/v2/hosts/11/events omit',
      'GET /api/v2/me include',
    ]);
  });

  it('세션이 확정되기 전에는 ♡·관리 버튼이 비활성이고 공연 목록도 읽지 않는다', async () => {
    given('MASTER', { isFollowing: true });
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.get('*/api/v2/me', async () => {
        await gate;
        return undefined;
      }),
    );
    const sent = recordRequests();
    const { result } = setup();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.viewerStatus).toBe('pending');
    expect(result.current.follow).toEqual({ status: 'disabled', isFollowing: false });
    expect(result.current.manage).toEqual({ status: 'pending' });
    expect(result.current.events.mode).toBe('waiting');
    expect((await sent.lines()).filter((l) => l.includes('/events'))).toEqual([]);
    release();
    await waitFor(() => expect(result.current.follow.status).toBe('ready'));
    // 이미 팔로우한 사용자 — 빈 ♡가 활성인 순간 없이 채워진 ♡로 바로 간다
    expect(result.current.follow.isFollowing).toBe(true);
  });

  it('viewer 응답 전에는 ♡가 비활성이다(이미 팔로우한 사용자에게 빈 ♡가 눌리지 않는다)', async () => {
    given('audience', { isFollowing: true });
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.get('*/api/v2/hosts/11', async ({ request }) => {
        if (request.headers.get('cookie')) await gate;
        return undefined;
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current?.viewerStatus).toBe('pending'));
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.follow.status).toBe('disabled');
    release();
    await waitFor(() =>
      expect(result.current.follow).toMatchObject({ status: 'ready', isFollowing: true }),
    );
  });

  it('viewer 조회가 실패하면 ♡·관리 버튼은 비활성으로 남고 공연은 공개 목록으로 읽는다', async () => {
    given('MASTER');
    server.use(...hostSets.viewerServerError(11));
    const { result } = await settled();
    expect(result.current.viewerStatus).toBe('error');
    expect(result.current.follow.status).toBe('disabled');
    expect(result.current.manage).toEqual({ status: 'pending' });
    expect(result.current.events.mode).toBe('public');
  });

  it('GM-1이 5xx면 viewer를 부르지 않고 ♡는 비활성, 다시 시도하면 확정된다', async () => {
    given('audience');
    let fail = true;
    server.use(
      http.get('*/api/v2/me', ({ request }) =>
        fail
          ? Response.json(
              {
                success: false,
                status: 500,
                code: 'GLOBAL_500_1',
                reason: '',
                timeStamp: '',
                path: request.url,
              },
              { status: 500 },
            )
          : undefined,
      ),
    );
    const { result } = await settled();
    expect(result.current.viewerStatus).toBe('error');
    expect(result.current.follow.status).toBe('disabled');
    fail = false;
    act(() => result.current.retryViewer());
    await waitFor(() => expect(result.current.follow.status).toBe('ready'));
  });
});

describe('호스트 홈 — 공개 값', () => {
  it('공개 필드(멤버 수, 개설일)를 돌려준다', async () => {
    const { result } = await settled();
    const s = result.current;
    expect(s.memberCount).toBe(4);
    expect(s.createdOn).toBe('2022.03.02');
  });

  it('연락처·개설일이 없는 호스트도 깨지지 않는다', async () => {
    const { result } = await settled('12');
    expect(result.current.contacts).toEqual({ status: 'ready', items: [], masked: false });
    expect(result.current.createdOn).toBeNull();
  });
});

describe('호스트 홈 — 연락처(사용자별 값, 백엔드 #822/#846)', () => {
  const rows = (items: { label: string; value: string; href: string | null }[]) =>
    items.map((c) => [c.label, c.value, c.href]);

  it('비로그인: 공개 값(가린 이메일)으로 확정 — 이메일은 링크 없음, masked', async () => {
    const { result } = await settled();
    expect(result.current.contacts.status).toBe('ready');
    expect(rows(result.current.contacts.items)).toEqual([
      ['인스타그램', '@gosrock_official', 'https://www.instagram.com/gosrock_official/'],
      ['유튜브', 'https://www.youtube.com/@gosrock', 'https://www.youtube.com/@gosrock'],
      ['이메일', 'go***@example.com', null],
    ]);
    expect(result.current.contacts.masked).toBe(true);
  });

  it('로그인: ♡ 때문에 이미 읽는 viewer(GH-3 쿠키) 응답의 원문을 쓴다 — 연락처 때문에 GH-3을 더 부르지 않는다', async () => {
    given('audience');
    const sent = recordRequests();
    const { result } = await settled();
    await waitFor(() => expect(result.current.contacts.status).toBe('ready'));
    expect(rows(result.current.contacts.items)[2]).toEqual([
      '이메일',
      'gosrock@example.com',
      'mailto:gosrock@example.com',
    ]);
    expect(result.current.contacts.masked).toBe(false);
    const gh3 = (await sent.list()).filter((r) => r.path === '/api/v2/hosts/11');
    expect(gh3.map((r) => r.credentials).sort()).toEqual(['include', 'omit']);
  });

  it('로그인: viewer 확정 전에는 pending(항목은 공개 값), viewer가 실패하면 error', async () => {
    given('audience');
    server.use(...hostSets.viewerServerError(11));
    // viewer(GH-3 쿠키) 응답을 테스트가 풀 때까지 붙잡는다. 붙잡지 않으면 5xx가 첫 렌더 몇 ms 뒤에 와서, `waitFor`가
    // 끝난 뒤 RTL이 한 틱(setTimeout 0)을 더 돌리는 사이에 이미 error가 되어 pending을 못 볼 때가 있다
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let viewerSent = false;
    server.use(
      http.get('*/api/v2/hosts/11', async ({ cookies }) => {
        if (!hasAccessToken(cookies)) return undefined;
        viewerSent = true;
        await held;
        return undefined; // 다음 핸들러(viewerServerError)가 5xx로 답한다
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(viewerSent).toBe(true));
    expect(result.current.contacts.status).toBe('pending');
    expect(result.current.contacts.items.at(-1)).toMatchObject({
      value: 'go***@example.com',
      href: null,
    });
    release();
    await waitFor(() => expect(result.current.contacts.status).toBe('error'));
    expect(result.current.contacts.items.at(-1)).toMatchObject({
      value: 'go***@example.com',
      href: null,
    });
  });
});

describe('호스트 홈 — 공연 목록(GH-14)', () => {
  it('비멤버는 공개 키로 쿠키 없이 읽고 카드는 공개 상세로 간다', async () => {
    given('audience');
    const sent = recordRequests();
    const { result, queryClient } = await settled();
    expect(result.current.events.mode).toBe('public');
    const events = (await sent.list()).filter((r) => r.path === '/api/v2/hosts/11/events');
    expect(events.map((r) => r.credentials)).toEqual(['omit']);
    expect(result.current.events.items.every((e) => e.href === `/events/${e.event.eventId}`)).toBe(
      true,
    );
    expect(
      queryClient.getQueryData([
        'hosts',
        '11',
        'events',
        'viewer',
        'infinite',
        { size: undefined },
      ]),
    ).toBeUndefined();
  });

  it('멤버는 viewer 키로 쿠키와 함께 한 번만 읽고, 준비중 공연 카드는 /hosting/events/{id}로 간다', async () => {
    given('GUEST');
    const sent = recordRequests();
    const { result } = await settled();
    expect(result.current.events.mode).toBe('member');
    const events = (await sent.list()).filter((r) => r.path === '/api/v2/hosts/11/events');
    expect(events.map((r) => r.credentials)).toEqual(['include']);
    const preparing = result.current.events.items.find((e) => e.isPreparing);
    expect(preparing?.href).toBe('/hosting/events/140');
    const open = result.current.events.items.find((e) => !e.isPreparing);
    expect(open?.href).toBe(`/events/${open?.event.eventId}`);
  });

  it('공연이 없으면 empty', async () => {
    server.use(...hostSets.noEvents(11));
    const { result } = await settled();
    expect(result.current.events.status).toBe('empty');
  });

  it('다음 페이지가 실패해도 기존 카드는 남고 재시도로 이어 읽는다', async () => {
    const { result } = await settled('12');
    // 소음공작소는 공개 공연이 10개를 넘는다
    expect(result.current.events.hasNextPage).toBe(true);
    server.use(...hostSets.eventsNextPageError(12));
    const before = result.current.events.items.length;
    act(() => result.current.events.loadMore());
    await waitFor(() => expect(result.current.events.nextPageError).toBe(true));
    expect(result.current.events.items).toHaveLength(before);
    server.resetHandlers();
    act(() => result.current.events.retry());
    await waitFor(() => expect(result.current.events.items.length).toBeGreaterThan(before));
  });
});

describe('호스트 홈 — 관심(♡, PH-13)', () => {
  it('누르면 바로 채워지고 PUT을 쿠키와 함께 보낸다. 다시 누르면 DELETE', async () => {
    given('audience');
    const { result, queryClient } = await settled();
    const sent = recordRequests();
    toggle(result);
    expect(viewerFollowing(queryClient)).toBe(true); // 응답 전에 바로
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(result.current.follow.isFollowing).toBe(true);
    toggle(result);
    expect(viewerFollowing(queryClient)).toBe(false);
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(result.current.follow.isFollowing).toBe(false);
    const follow = (await sent.list()).filter((r) => r.path === '/api/v2/hosts/11/follow');
    expect(follow.map((r) => `${r.method} ${r.credentials}`)).toEqual([
      'PUT include',
      'DELETE include',
    ]);
  });

  it.each([
    [1, true, ['PUT']],
    [2, false, ['PUT', 'DELETE']],
    [3, true, ['PUT', 'DELETE', 'PUT']],
    [4, false, ['PUT', 'DELETE', 'PUT', 'DELETE']],
  ])(
    '연타 %i번: 요청은 순서대로 하나씩 가고 마지막 상태(%s)가 화면·서버에 남는다',
    async (times, expected, methods) => {
      given('audience');
      const { result, queryClient } = await settled();
      const sent = recordRequests();
      act(() => {
        for (let i = 0; i < times; i++) {
          if (result.current.follow.status === 'ready') result.current.follow.toggle();
        }
      });
      expect(viewerFollowing(queryClient)).toBe(expected);
      await waitFor(() => expect(queryClient.isMutating()).toBe(0));
      await waitFor(() => expect(result.current.follow.isFollowing).toBe(expected));
      const follow = (await sent.list()).filter((r) => r.path === '/api/v2/hosts/11/follow');
      expect(follow.map((r) => r.method)).toEqual(methods);
      // 서버 상태 확인 — viewer를 다시 읽어도 같다
      await act(() => queryClient.refetchQueries({ queryKey: ['hosts', '11', 'viewer'] }));
      expect(result.current.follow.isFollowing).toBe(expected);
    },
  );

  it('PH-13이 실패하면 공용 토스트, viewer를 다시 읽어 실제 상태(안 팔로우)로 돌아간다', async () => {
    given('audience');
    server.use(...hostSets.followServerError(11));
    const { result, queryClient } = await settled();
    const sent = recordRequests();
    toggle(result);
    expect(viewerFollowing(queryClient)).toBe(true);
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    await waitFor(() => expect(result.current.follow.isFollowing).toBe(false));
    expect(await sent.lines()).toEqual(['PUT /api/v2/hosts/11/follow', 'GET /api/v2/hosts/11']);
    expect(errorToast).toHaveBeenCalledWith(
      '서버 오류. 관리자에게 문의 부탁드립니다.',
      'mutation:GLOBAL_500_1',
    );
  });

  it('팔로우는 공개 키(followerCount)를 바꾸거나 무효화하지 않는다', async () => {
    given('audience');
    const { result, queryClient } = await settled();
    const before = queryClient.getQueryState(['hosts', '11']);
    toggle(result);
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    const after = queryClient.getQueryState(['hosts', '11']);
    expect(after?.dataUpdatedAt).toBe(before?.dataUpdatedAt);
    expect(after?.isInvalidated).toBe(false);
  });
});

describe('세션 핸들러 고정', () => {
  it('비로그인 GM-1(401)은 익명으로 확정된다', async () => {
    server.use(...meHandlers.anonymous);
    const { result } = await settled();
    expect(result.current.viewerStatus).toBe('anonymous');
  });
});
