import { http } from 'msw';

import type { HostEvent, HostViewer } from '../host/schema';
import type { HostRole } from '../shared/common-schema';
import type { MockEvent } from './fixtures/event';
import { events, preparingEvents, upcomingOrder } from './fixtures/event';
import { hostMembers, hosts, viewerOf } from './fixtures/host';
import { maskContacts } from './privacy-mask';
import {
  errors,
  fail,
  hasAccessToken,
  ok,
  paginate,
  readId,
  readPageParams,
  requireAuth,
} from './respond';

const hostNotFound = (request: Request) =>
  fail(request, 404, 'Host_404_1', '해당 호스트를 찾을 수 없습니다.');

/** 비멤버의 멤버 전용 API(GH-6). v2는 HTTP 403, 코드 문자열은 `HOST_400_2` 그대로(error-codes) */
const forbiddenHost = (request: Request) =>
  fail(request, 403, 'HOST_400_2', '해당 호스트에 대한 접근 권한이 없습니다.');

const toHostEvent = (e: MockEvent): HostEvent => ({
  eventId: e.eventId,
  name: e.name,
  posterImageUrl: e.posterImageUrl,
  startAt: e.startAt,
  place: e.place,
  status: e.status,
  displayStatus: e.displayStatus,
  dDay: e.dDay,
});

/** 로그인 사용자가 이 호스트에서 보는 역할·팔로우 기본값(관점을 바꾸는 세트가 덮는다) */
type ViewerOverride = { myRole?: HostRole | null; isFollowing?: boolean };

/**
 * 호스트 핸들러 묶음을 만든다. 팔로우 상태는 묶음마다 따로 갖는다 — 기본 목록은 모듈에 하나,
 * 시나리오 세트(`hostSets.viewAs`)는 부를 때마다 새로 만들어 테스트끼리 섞이지 않는다.
 */
function buildHostHandlers(override?: { hostId: number } & ViewerOverride) {
  /** 로그인 mock 사용자의 팔로우 상태(호스트 id → 팔로우 여부). 없으면 fixture 값 */
  const follows = new Map<number, boolean>();

  function viewer(host: HostViewer): HostViewer {
    const base = viewerOf(host);
    const forced = override?.hostId === host.hostId ? override : undefined;
    const myRole = forced && 'myRole' in forced ? (forced.myRole ?? null) : base.myRole;
    const isFollowing =
      follows.get(host.hostId) ??
      (forced?.isFollowing !== undefined ? forced.isFollowing : base.isFollowing);
    // 공개 값의 followerCount는 mock 사용자를 빼고 센 수다
    return {
      ...base,
      myRole,
      isFollowing,
      followerCount: host.followerCount + (isFollowing ? 1 : 0),
    };
  }

  const findHost = (raw: unknown) => {
    const id = readId(raw);
    return { id, host: id === null ? undefined : hosts.find((h) => h.hostId === id) };
  };

  function setFollow(request: Request, cookies: Record<string, string>, raw: unknown, on: boolean) {
    const denied = requireAuth(request, cookies);
    if (denied) return denied;
    const { id, host } = findHost(raw);
    if (id === null) return errors.badRequest(request);
    if (!host) return hostNotFound(request);
    follows.set(id, on);
    const v = viewer(host);
    return ok({ hostId: id, isFollowing: v.isFollowing, followerCount: v.followerCount });
  }

  const handlers = [
    http.get('*/api/v2/hosts/:hostId', ({ request, params, cookies }) => {
      const { id, host } = findHost(params.hostId);
      if (id === null) return errors.badRequest(request);
      if (!host) return hostNotFound(request);
      // 비로그인(쿠키 없음·만료)이면 연락처의 전화·이메일을 가린다(백엔드 #822/#846)
      return ok(
        hasAccessToken(cookies) ? viewer(host) : { ...host, contacts: maskContacts(host.contacts) },
      );
    }),

    http.get('*/api/v2/hosts/:hostId/events', ({ request, params, cookies }) => {
      const { id, host } = findHost(params.hostId);
      const paging = readPageParams(new URL(request.url), 10);
      if (id === null || !paging) return errors.badRequest(request);
      if (!host) return hostNotFound(request);
      // 멤버는 준비중 공연까지 본다(백엔드 [H-14])
      const isMember = hasAccessToken(cookies) && viewer(host).myRole !== null;
      const list = [...events, ...(isMember ? preparingEvents : [])]
        .filter((e) => e.host.hostId === id && e.status !== 'DELETED')
        .sort(upcomingOrder)
        .map(toHostEvent);
      return ok(paginate(list, paging.page, paging.size));
    }),

    http.get('*/api/v2/hosts/:hostId/members', ({ request, params, cookies }) => {
      const denied = requireAuth(request, cookies);
      if (denied) return denied;
      const { id, host } = findHost(params.hostId);
      if (id === null) return errors.badRequest(request);
      if (!host) return hostNotFound(request);
      if (viewer(host).myRole === null) return forbiddenHost(request);
      return ok(hostMembers[id] ?? []);
    }),

    http.put('*/api/v2/hosts/:hostId/follow', ({ request, params, cookies }) =>
      setFollow(request, cookies, params.hostId, true),
    ),
    http.delete('*/api/v2/hosts/:hostId/follow', ({ request, params, cookies }) =>
      setFollow(request, cookies, params.hostId, false),
    ),
  ];
  return { handlers, reset: () => follows.clear() };
}

const defaults = buildHostHandlers();

/**
 * 호스트 — GH-3, GH-14(공개), GH-6, PH-13(로그인). 액세스 토큰 쿠키가 실린 요청은 로그인 mock 사용자로 본다
 * (고스락 11의 마스터, 소음공작소 12를 팔로우 — `fixtures/host.ts`). 공개 쿼리는 `credentials: 'omit'`라 언제나 익명 값이다
 * (GH-3 연락처의 전화·이메일은 가린 값).
 */
export const hostHandlers = defaults.handlers;

/** 기본 목록의 팔로우 상태를 fixture 값으로 되돌린다(vitest `afterEach`) */
export const resetHostMockState = defaults.reset;

/** 호스트 홈(P5c) 시나리오 세트. 기본 목록 앞에 끼운다(`server.use(...)` / e2e `mockApi.use(...)`) */
export const hostSets = {
  /**
   * 로그인 사용자를 이 호스트의 `myRole`·팔로우 상태로 본다(비로그인은 쿠키가 없어 영향 없음).
   * 팔로우 상태는 이 세트 안에서만 바뀐다 — 부를 때마다 새로.
   */
  viewAs: (hostId: number, viewerState: ViewerOverride) =>
    buildHostHandlers({ hostId, ...viewerState }).handlers,
  /** 호스트 공연이 하나도 없음(GH-14 빈 페이지) */
  noEvents: (hostId: number) => [
    http.get(`*/api/v2/hosts/${hostId}/events`, () => ok(paginate([], 0, 10))),
  ],
  /** GH-14 두 번째 페이지부터 5xx(첫 페이지 크기 `size`) */
  eventsNextPageError: (hostId: number) => [
    http.get(`*/api/v2/hosts/${hostId}/events`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0);
      return page > 0 ? errors.serverError(request) : undefined;
    }),
  ],
  /** PH-13 5xx(PUT·DELETE 모두) */
  followServerError: (hostId: number) => [
    http.put(`*/api/v2/hosts/${hostId}/follow`, ({ request }) => errors.serverError(request)),
    http.delete(`*/api/v2/hosts/${hostId}/follow`, ({ request }) => errors.serverError(request)),
  ],
  /** GH-3 5xx(서버 조회 → 크롤러 500) */
  detailServerError: (hostId: number) => [
    http.get(`*/api/v2/hosts/${hostId}`, ({ request }) => errors.serverError(request)),
  ],
  /** GH-3 viewer(쿠키 요청)만 5xx — 공개 조회는 정상 */
  viewerServerError: (hostId: number) => [
    http.get(`*/api/v2/hosts/${hostId}`, ({ request, cookies }) =>
      hasAccessToken(cookies) ? errors.serverError(request) : undefined,
    ),
  ],
};
