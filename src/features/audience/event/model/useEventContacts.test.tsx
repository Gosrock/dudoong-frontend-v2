import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventDetailHandlers } from '@/api/__mocks__/event-detail.handlers';
import { meHandlers } from '@/api/__mocks__/me.handlers';
import { server } from '@/api/__mocks__/server';
import { eventDetailQuery } from '@/api/event/queries';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests, type SentRequest } from '@/test/requests';

import { useEventContacts } from './useEventContacts';

/**
 * 공연 상세 문의처(A안): 서버 조회(쿠키 없음) 값은 전화·이메일이 가려져 있다(백엔드 #822/#846).
 * 로그인 사용자는 연락처를 열 때만 GP-3을 쿠키와 함께 다시 읽어 원문을 쓴다. fixture 101: 인스타 + 전화 `010-1234-5678`.
 */

let restore: (() => void) | null = null;
beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  restore?.();
  restore = null;
});

const login = () => {
  restore = installLoggedInFetch();
};

const EVENT = '101';

/** 라우트 파일이 서버에서 프리페치한 상태(공개 값)로 연다. `open`은 V의 시트 열림 상태 자리 */
async function setup(initialOpen = false) {
  const queryClient = createTestQueryClient();
  await queryClient.prefetchQuery(eventDetailQuery(EVENT));
  const sent = recordRequests();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
  const view = renderHook(({ open }) => useEventContacts(EVENT, { open }), {
    wrapper,
    initialProps: { open: initialOpen },
  });
  return { ...view, sent, queryClient };
}

/** GP-3을 쿠키와 함께 보낸 요청(viewer) */
const viewerCalls = (list: SentRequest[]) =>
  list.filter((r) => r.path === `/api/v2/events/${EVENT}` && r.credentials === 'include');
/** GP-3 전체(공개 + viewer) */
const detailCalls = (list: SentRequest[]) =>
  list.filter((r) => r.path === `/api/v2/events/${EVENT}`);

const MASKED = [
  ['인스타그램', '@gosrock_official', 'https://www.instagram.com/gosrock_official/', false],
  ['전화', '010-****-5678', null, true],
];
const ORIGINAL = [
  ['인스타그램', '@gosrock_official', 'https://www.instagram.com/gosrock_official/', false],
  ['전화', '010-1234-5678', 'tel:01012345678', false],
];
const rows = (items: { label: string; value: string; href: string | null; masked: boolean }[]) =>
  items.map((c) => [c.label, c.value, c.href, c.masked]);

describe('비로그인 — 공개 값(가린 값)으로 확정, 추가 요청 없음', () => {
  it('연락처를 열어도 GP-3을 다시 부르지 않고, 가린 전화는 링크가 없으며 masked', async () => {
    const { result, rerender, sent } = await setup();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ open: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rows(result.current.items)).toEqual(MASKED);
    expect(result.current.masked).toBe(true);
    const list = await sent.list();
    expect(detailCalls(list)).toEqual([]);
    expect(list.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /api/v2/me']);
  });
});

describe('로그인 — 연락처를 열 때만 쿠키를 실어 원문을 읽는다', () => {
  it('열기 전에는 GP-3 요청 0(idle·가린 값), 열면 쿠키 실린 GP-3 한 번 → 원문·링크', async () => {
    login();
    const { result, rerender, sent, queryClient } = await setup();
    await waitFor(() => expect(queryClient.getQueryData(['me'])).toBeTruthy());
    expect(result.current.status).toBe('idle');
    expect(result.current.masked).toBe(true);
    expect(detailCalls(await sent.list())).toEqual([]);

    rerender({ open: true });
    expect(result.current.status).toBe('pending');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rows(result.current.items)).toEqual(ORIGINAL);
    expect(result.current.masked).toBe(false);

    const list = await sent.list();
    expect(detailCalls(list)).toHaveLength(1);
    expect(viewerCalls(list)).toHaveLength(1);
    // 공개 키(서버 프리페치 값)는 가린 값 그대로 — 키를 나눈다
    expect(
      queryClient.getQueryData<{ contacts: { value: string }[] }>(['events', EVENT])?.contacts[1]
        ?.value,
    ).toBe('010-****-5678');
  });

  it('닫아도 원문을 그대로 두고 추가 요청이 없다', async () => {
    login();
    const { result, rerender, sent } = await setup(true);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ open: false });
    expect(result.current.status).toBe('ready');
    expect(rows(result.current.items)).toEqual(ORIGINAL);
    expect(viewerCalls(await sent.list())).toHaveLength(1);
  });
});

describe('세션 확정 전 · 실패', () => {
  it('세션(GM-1) 확정 전에는 열어도 pending이고 GP-3을 부르지 않는다', async () => {
    login();
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.get('*/api/v2/me', async () => {
        await gate;
        return undefined;
      }),
    );
    const { result, sent } = await setup(true);
    expect(result.current.status).toBe('pending');
    expect(rows(result.current.items)).toEqual(MASKED);
    expect(detailCalls(await sent.list())).toEqual([]);

    release();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rows(result.current.items)).toEqual(ORIGINAL);
    expect(viewerCalls(await sent.list())).toHaveLength(1);
  });

  it('viewer 조회(쿠키 GP-3)가 5xx면 error — 항목은 공개 값(가린 값), 다시 시도하면 원문', async () => {
    login();
    server.use(...eventDetailHandlers.viewerServerError(101));
    const { result } = await setup(true);
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(rows(result.current.items)).toEqual(MASKED);
    expect(result.current.masked).toBe(true);

    server.resetHandlers();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rows(result.current.items)).toEqual(ORIGINAL);
  });

  it('GM-1이 5xx면 열어도 error이고 GP-3을 부르지 않는다. 다시 시도하면 세션부터 확정한다', async () => {
    login();
    server.use(
      http.get('*/api/v2/me', ({ request }) =>
        Response.json(
          {
            success: false,
            status: 500,
            code: 'GLOBAL_500_1',
            reason: '서버 오류',
            path: request.url,
          },
          { status: 500 },
        ),
      ),
    );
    const { result, sent } = await setup(true);
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(detailCalls(await sent.list())).toEqual([]);

    server.resetHandlers();
    server.use(...meHandlers.loggedIn);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(rows(result.current.items)).toEqual(ORIGINAL);
  });

  it('닫혀 있으면 세션 확정 전이어도 idle', async () => {
    login();
    server.use(http.get('*/api/v2/me', () => new Promise<never>(() => {})));
    const { result } = await setup(false);
    expect(result.current.status).toBe('idle');
  });
});
