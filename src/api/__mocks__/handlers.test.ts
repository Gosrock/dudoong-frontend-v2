import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../errors';
import {
  eventDetailQuery,
  eventListQuery,
  eventSectionsQuery,
  eventTagsQuery,
  homeQuery,
  normalizeEventListParams,
} from '../event/queries';
import { giftLandingQuery, giftLandingViewerQuery } from '../gift/queries';
import {
  hostDetailQuery,
  hostEventsQuery,
  hostEventsViewerQuery,
  hostViewerQuery,
} from '../host/queries';
import { meQuery, SESSION_STALE_MS } from '../me/queries';
import { flattenPages } from '../shared/page';
import { eventTicketItemsQuery } from '../ticket-item/queries';
import { MISSING_EVENT_ID } from './fixtures/event';
import { MISSING_GIFT_TOKEN } from './fixtures/gift';
import { MISSING_HOST_ID } from './fixtures/host';
import { meHandlers } from './me.handlers';
import { server } from './server';

/** 조회 정의(queryOptions) + 기본 mock 핸들러 + 스키마가 맞물리는지. 응답은 실제 `api`·zod 파싱을 탄다 */

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/**
 * 로그인 상태 흉내. 브라우저처럼 `credentials: 'include'` 요청에만 액세스 토큰 쿠키를 싣는다
 * (Node의 fetch는 `document.cookie`를 싣지 않는다). 공개 쿼리(`omit`)에는 실리지 않는 것까지 확인된다.
 */
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

afterEach(() => {
  vi.restoreAllMocks();
});

async function rejection(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('거절되지 않았다');
}

describe('공연 탐색', () => {
  it('GE-11 태그·GP-1 홈', async () => {
    const qc = client();
    const tags = await qc.fetchQuery(eventTagsQuery());
    expect(tags.map((g) => g.category)).toEqual(['EVENT_TYPE', 'GENRE', 'AREA', 'TEAM']);
    const home = await qc.fetchQuery(homeQuery());
    expect(home.events.length).toBeGreaterThan(0);
    expect(home.events.length).toBeLessThanOrEqual(10);
    // 진행 중이 앞
    expect(home.events[0]!.displayStatus).toBe('ONGOING');
  });

  it('GP-2 무한 목록: 페이지를 끝까지 넘기고 지난 공연은 includePast일 때만', async () => {
    const qc = client();
    const options = eventListQuery({ size: 5 });
    await qc.fetchInfiniteQuery({ ...options, pages: 10 });
    const data = qc.getQueryData(options.queryKey);
    const pages = data!.pages;
    expect(pages.at(-1)!.hasNext).toBe(false);
    const items = flattenPages(data, (e) => e.eventId);
    expect(items.length).toBe(pages[0]!.totalElements);
    expect(items.every((e) => e.displayStatus !== 'PAST')).toBe(true);

    const withPast = await qc.fetchInfiniteQuery(eventListQuery({ includePast: true, size: 50 }));
    expect(withPast.pages[0]!.content.some((e) => e.displayStatus === 'PAST')).toBe(true);
  });

  it('GP-2 검색·태그 필터(같은 분류 OR, 분류끼리 AND), 결과 없음은 빈 페이지', async () => {
    const qc = client();
    const byHost = await qc.fetchInfiniteQuery(eventListQuery({ keyword: '고스락' }));
    expect(byHost.pages[0]!.content.length).toBeGreaterThan(0);

    // 부산(8) AND 어쿠스틱(5) → 102만
    const both = await qc.fetchInfiniteQuery(eventListQuery({ tagIds: [8, 5] }));
    expect(both.pages[0]!.content.map((e) => e.eventId)).toEqual([102]);

    const none = await qc.fetchInfiniteQuery(eventListQuery({ keyword: '없는공연이름' }));
    expect(none.pages[0]).toMatchObject({ content: [], totalElements: 0, hasNext: false });
  });

  it('GP-2 없는 태그는 400 Event_400_23', async () => {
    const e = await rejection(client().fetchInfiniteQuery(eventListQuery({ tagIds: [9999] })));
    expect(e).toMatchObject({ status: 400, code: 'Event_400_23' });
  });

  it('GP-2 queryKey는 태그 순서·중복·빈 값에 흔들리지 않는다', () => {
    expect(eventListQuery({ tagIds: [3, 1, 3], keyword: ' ' }).queryKey).toEqual(
      eventListQuery({ tagIds: [1, 3] }).queryKey,
    );
    expect(normalizeEventListParams({ includePast: false, sort: 'UPCOMING' })).toEqual({});
  });

  it('GP-3 상세·GE-5 섹션·GP-5 티켓(null 필드 포함)', async () => {
    const qc = client();
    const detail = await qc.fetchQuery(eventDetailQuery('101'));
    expect(detail.place?.detailAddress).toBe('지하 1층');
    const sections = await qc.fetchQuery(eventSectionsQuery(101));
    expect(sections.map((s) => s.contentFormat)).toContain('HTML');
    const tickets = await qc.fetchQuery(eventTicketItemsQuery(101));
    expect(tickets.find((t) => t.payType === 'FREE')?.remaining).toBeNull();

    const noPlace = await qc.fetchQuery(eventDetailQuery(103));
    expect(noPlace.place).toBeNull();
    const v1 = await qc.fetchQuery(eventSectionsQuery(102));
    expect(v1[0]).toMatchObject({ sectionId: null, contentFormat: 'MARKDOWN' });
  });

  it('숫자 id와 문자열 id는 같은 키다', () => {
    expect(eventDetailQuery(101).queryKey).toEqual(eventDetailQuery('101').queryKey);
  });

  it.each([
    ['상세', eventDetailQuery(MISSING_EVENT_ID)],
    ['섹션', eventSectionsQuery(MISSING_EVENT_ID)],
    ['티켓', eventTicketItemsQuery(MISSING_EVENT_ID)],
    ['준비중 공연', eventDetailQuery(140)],
  ])('없는 공연(%s)은 404 Event_404_1', async (_, query) => {
    const e = await rejection(client().fetchQuery(query as ReturnType<typeof eventDetailQuery>));
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 404, code: 'Event_404_1' });
  });

  it('응답이 스키마와 다르면 PARSE_ERROR', async () => {
    server.use(
      http.get('*/api/v2/events/:eventId', () =>
        HttpResponse.json({
          success: true,
          status: 200,
          data: { eventId: 1, startAt: '2026-10-17T19:00' },
          timeStamp: '',
        }),
      ),
    );
    const e = await rejection(client().fetchQuery(eventDetailQuery(1)));
    expect(e).toMatchObject({ code: 'PARSE_ERROR' });
  });
});

describe('호스트 — 공개와 viewer', () => {
  it('공개 쿼리에는 사용자별 필드가 없고 쿠키도 싣지 않는다', async () => {
    login();
    const host = await client().fetchQuery(hostDetailQuery(11));
    expect(host.name).toBe('고스락');
    expect(host).not.toHaveProperty('myRole');
    expect(host).not.toHaveProperty('isFollowing');
  });

  it('viewer 쿼리는 쿠키를 싣고 사용자별 필드를 받는다', async () => {
    const anon = await client().fetchQuery(hostViewerQuery(11));
    expect(anon).toMatchObject({ myRole: null, isFollowing: false });
    login();
    const viewer = await client().fetchQuery(hostViewerQuery(11));
    expect(viewer).toMatchObject({ myRole: 'MASTER' });
  });

  it('GH-14: 준비중 공연은 멤버 viewer 목록에만', async () => {
    login();
    const qc = client();
    const pub = await qc.fetchInfiniteQuery(hostEventsQuery(11, { size: 50 }));
    const viewer = await qc.fetchInfiniteQuery(hostEventsViewerQuery(11, { size: 50 }));
    expect(pub.pages[0]!.content.some((e) => e.status === 'PREPARING')).toBe(false);
    expect(viewer.pages[0]!.content.some((e) => e.status === 'PREPARING')).toBe(true);
    expect(hostEventsViewerQuery(11).queryKey).toEqual([
      'hosts',
      '11',
      'events',
      'viewer',
      'infinite',
      {},
    ]);
  });

  it('없는 호스트는 404 Host_404_1', async () => {
    const e = await rejection(client().fetchQuery(hostDetailQuery(MISSING_HOST_ID)));
    expect(e).toMatchObject({ status: 404, code: 'Host_404_1' });
  });
});

describe('선물 랜딩', () => {
  it('공개는 익명 값, viewer는 보는 사람에 따라 viewState가 바뀐다', async () => {
    login();
    const pub = await client().fetchQuery(giftLandingQuery('mock-gift-available'));
    expect(pub).toMatchObject({ status: 'PENDING', viewState: 'AVAILABLE', senderName: '김*수' });
    expect(pub).not.toHaveProperty('giftId');
    const viewer = await client().fetchQuery(giftLandingViewerQuery('mock-gift-available'));
    expect(viewer).toMatchObject({ viewState: 'OWN_LINK', giftId: 301, isLoggedIn: true });
  });

  it('대기 중이 아니면 요약이 null', async () => {
    const accepted = await client().fetchQuery(giftLandingQuery('mock-gift-accepted'));
    expect(accepted).toMatchObject({ event: null, ticket: null, senderName: null });
  });

  it('없는 토큰은 404 Gift_404_1', async () => {
    const e = await rejection(client().fetchQuery(giftLandingQuery(MISSING_GIFT_TOKEN)));
    expect(e).toMatchObject({ status: 404, code: 'Gift_404_1' });
  });
});

describe('GM-1 세션', () => {
  it('staleTime 5분', () => {
    expect(meQuery().staleTime).toBe(SESSION_STALE_MS);
    expect(SESSION_STALE_MS).toBe(300_000);
  });

  it('쿠키가 없으면 HTTP 401 AUTH_403_2', async () => {
    const e = await rejection(client().fetchQuery(meQuery()));
    expect(e).toMatchObject({ status: 401, code: 'AUTH_403_2' });
  });

  it('로그인 상태', async () => {
    server.use(...meHandlers.loggedIn);
    const me = await client().fetchQuery(meQuery());
    expect(me.hosts[0]).toMatchObject({ hostId: 11, myRole: 'MASTER' });
  });
});
