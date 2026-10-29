import { http } from 'msw';

import { storedEvent, storedPublicEvent } from './event-store';
import {
  events,
  homeEvents,
  knownTagIds,
  tagGroups,
  toDetail,
  toListItem,
  upcomingOrder,
} from './fixtures/event';
import { mockRoleIn } from './hosting-event.handlers';
import { maskContacts } from './privacy-mask';
import {
  errors,
  fail,
  hasAccessToken,
  ok,
  paginate,
  publicIdMismatch,
  readId,
  readPageParams,
} from './respond';
import { publicTicketsOf } from './ticket-store';

const eventNotFound = (request: Request) =>
  fail(request, 404, 'Event_404_1', '이벤트를 찾을 수 없습니다.');

/** `tagIds=1,2` 또는 `tagIds=1&tagIds=2`(Spring List<Long>). 숫자가 아니면 null */
function readTagIds(url: URL) {
  const raw = url.searchParams.getAll('tagIds').flatMap((v) => v.split(','));
  const ids = raw.filter((v) => v !== '').map(Number);
  return ids.every((n) => Number.isInteger(n)) ? ids : null;
}

/** 공연 탐색(공개) — GE-11, GP-1, GP-2, GP-3, GP-5, GE-5 */
export const eventHandlers = [
  http.get('*/api/v2/tags', () => ok(tagGroups)),

  http.get('*/api/v2/home', () => ok({ events: homeEvents() })),

  http.get('*/api/v2/events', ({ request }) => {
    const url = new URL(request.url);
    const paging = readPageParams(url, 10);
    const keyword = url.searchParams.get('keyword')?.trim() ?? '';
    const tagIds = readTagIds(url);
    const sort = url.searchParams.get('sort') ?? 'UPCOMING';
    if (!paging || keyword.length > 50 || !tagIds || tagIds.length > 50 || sort !== 'UPCOMING') {
      return errors.badRequest(request);
    }
    if (tagIds.some((id) => !knownTagIds.has(id))) {
      return fail(request, 400, 'Event_400_23', '태그가 올바르지 않습니다.');
    }
    const includePast = url.searchParams.get('includePast') === 'true';
    // 태그: 같은 분류 OR, 분류끼리 AND(api-contract §6)
    const wanted = new Map<string, Set<number>>();
    for (const g of tagGroups) {
      const inGroup = g.tags.filter((t) => tagIds.includes(t.tagId)).map((t) => t.tagId);
      if (inGroup.length) wanted.set(g.category, new Set(inGroup));
    }
    const matched = events
      .filter((e) => e.status !== 'PREPARING' && e.status !== 'DELETED')
      .filter((e) => includePast || e.displayStatus !== 'PAST')
      .filter(
        (e) =>
          !keyword || (e.name ?? '').includes(keyword) || (e.host.name ?? '').includes(keyword),
      )
      .filter((e) => [...wanted.values()].every((ids) => e.tags.some((t) => ids.has(t.tagId))))
      .sort(upcomingOrder)
      .map(toListItem);
    return ok(paginate(matched, paging.page, paging.size));
  }),

  // 비로그인(쿠키 없음·만료·위조 — #792로 익명 처리) 요청이면 연락처의 전화·이메일을 가린다(백엔드 #822/#846). 공개 쿼리는 `credentials: 'omit'`라 언제나 가린 값
  http.get('*/api/v2/events/:eventId', ({ request, params, cookies }) => {
    const id = readId(params.eventId);
    if (id === null) return publicIdMismatch(request, cookies);
    // 공연 저장소(P11)를 읽는다 — 기본 정보 저장·등록이 바로 반영된다
    const event = storedPublicEvent(id);
    if (!event) return eventNotFound(request);
    const detail = toDetail(event);
    return ok(
      hasAccessToken(cookies) ? detail : { ...detail, contacts: maskContacts(detail.contacts) },
    );
  }),

  http.get('*/api/v2/events/:eventId/ticket-items', ({ request, params, cookies }) => {
    const id = readId(params.eventId);
    if (id === null) return publicIdMismatch(request, cookies);
    // 티켓 저장소(P12)를 읽는다 — 판매 중단·재개·만들기·수정·삭제가 바로 반영된다
    const event = storedPublicEvent(id);
    return event ? ok(publicTicketsOf(id, event)) : eventNotFound(request);
  }),

  http.get('*/api/v2/events/:eventId/sections', ({ request, params, cookies }) => {
    const id = readId(params.eventId);
    if (id === null) return publicIdMismatch(request, cookies);
    // 준비중 공연은 활성 멤버(일반 포함)만 본다 — 그 밖은 존재를 숨기는 404(`V2ReadEventSectionsUseCase`, 432cce4)
    const event = storedEvent(id);
    if (!event) return eventNotFound(request);
    if (
      event.status === 'PREPARING' &&
      !(hasAccessToken(cookies) && mockRoleIn(event.host.hostId) !== null)
    ) {
      return eventNotFound(request);
    }
    return ok(event.sections);
  }),
];

/** 공연홈·공연 리스트(P5a) 시나리오 세트. 기본 목록 앞에 끼운다(`server.use(...)` / e2e `mockApi.use(...)`) */
export const eventBrowseSets = {
  /** GP-1 공연 없음 */
  homeEmpty: [http.get('*/api/v2/home', () => ok({ events: [] }))],
  /** GP-1 5xx(서버 조회 → 크롤러 500) */
  homeServerError: [http.get('*/api/v2/home', ({ request }) => errors.serverError(request))],
  /** GP-2 결과 없음(필터와 무관) */
  listEmpty: [http.get('*/api/v2/events', () => ok(paginate([], 0, 10)))],
  /** GP-2 두 번째 페이지부터 5xx */
  listNextPageError: [
    http.get('*/api/v2/events', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0);
      return page > 0 ? errors.serverError(request) : undefined;
    }),
  ],
  /** GP-2 첫 페이지 5xx */
  listServerError: [http.get('*/api/v2/events', ({ request }) => errors.serverError(request))],
  /** GE-11 5xx */
  tagsServerError: [http.get('*/api/v2/tags', ({ request }) => errors.serverError(request))],
};
