import { http } from 'msw';

import {
  events,
  findPublicEvent,
  homeEvents,
  knownTagIds,
  tagGroups,
  toDetail,
  toListItem,
  upcomingOrder,
} from './fixtures/event';
import { errors, fail, ok, paginate, readId, readPageParams } from './respond';

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

  http.get('*/api/v2/events/:eventId', ({ request, params }) => {
    const id = readId(params.eventId);
    if (id === null) return errors.badRequest(request);
    const event = findPublicEvent(id);
    return event ? ok(toDetail(event)) : eventNotFound(request);
  }),

  http.get('*/api/v2/events/:eventId/ticket-items', ({ request, params }) => {
    const id = readId(params.eventId);
    if (id === null) return errors.badRequest(request);
    const event = findPublicEvent(id);
    return event ? ok(event.ticketItems) : eventNotFound(request);
  }),

  http.get('*/api/v2/events/:eventId/sections', ({ request, params }) => {
    const id = readId(params.eventId);
    if (id === null) return errors.badRequest(request);
    // 준비중 공연은 멤버만 본다 — mock은 공개 공연만 돌려준다
    const event = findPublicEvent(id);
    return event ? ok(event.sections) : eventNotFound(request);
  }),
];
