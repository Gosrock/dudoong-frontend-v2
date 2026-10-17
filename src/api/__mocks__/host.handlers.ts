import { http } from 'msw';

import type { HostEvent } from '../host/schema';
import type { MockEvent } from './fixtures/event';
import { events, preparingEvents, upcomingOrder } from './fixtures/event';
import { hosts, viewerOf } from './fixtures/host';
import { errors, fail, hasAccessToken, ok, paginate, readId, readPageParams } from './respond';

const hostNotFound = (request: Request) =>
  fail(request, 404, 'Host_404_1', '해당 호스트를 찾을 수 없습니다.');

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

/**
 * 호스트(공개) — GH-3, GH-14. 액세스 토큰 쿠키가 실린 요청은 로그인 사용자로 본다(viewer 쿼리).
 * 공개 쿼리는 `credentials: 'omit'`라 쿠키가 없어 언제나 익명 값을 받는다.
 */
export const hostHandlers = [
  http.get('*/api/v2/hosts/:hostId', ({ request, params, cookies }) => {
    const id = readId(params.hostId);
    if (id === null) return errors.badRequest(request);
    const host = hosts.find((h) => h.hostId === id);
    if (!host) return hostNotFound(request);
    return ok(hasAccessToken(cookies) ? viewerOf(host) : host);
  }),

  http.get('*/api/v2/hosts/:hostId/events', ({ request, params, cookies }) => {
    const id = readId(params.hostId);
    const paging = readPageParams(new URL(request.url), 10);
    if (id === null || !paging) return errors.badRequest(request);
    const host = hosts.find((h) => h.hostId === id);
    if (!host) return hostNotFound(request);
    // 멤버(로그인 mock 사용자는 고스락 마스터)는 준비중 공연까지 본다
    const isMember = hasAccessToken(cookies) && viewerOf(host).myRole !== null;
    const list = [...events, ...(isMember ? preparingEvents : [])]
      .filter((e) => e.host.hostId === id && e.status !== 'DELETED')
      .sort(upcomingOrder)
      .map(toHostEvent);
    return ok(paginate(list, paging.page, paging.size));
  }),
];
