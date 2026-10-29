import { http } from 'msw';

import {
  EVENT_CONTACT_VALUE_MAX,
  EVENT_CONTACTS_MAX,
  EVENT_NAME_MAX,
  EVENT_PLACE_TEXT_MAX,
  EVENT_POSTER_KEY_MAX,
  EVENT_SECTION_CONTENT_MAX,
  EVENT_SECTION_TITLE_MAX,
  EVENT_SECTIONS_MAX,
  EVENT_TAGS_MAX,
  type EventManage,
  type EventSection,
} from '../event/schema';
import { type Contact, CONTACT_TYPES, type HostRole } from '../shared/common-schema';
import { isKstDateTime } from '../shared/date';
import {
  checklistOf,
  createStoredEvent,
  hasValidTicketOf,
  isChecklistFilled,
  mockNow,
  runTimeOf,
  saveStoredEvent,
  type StoredEvent,
  storedEvent,
} from './event-store';
import { knownTagIds, tagGroups } from './fixtures/event';
import { hosts } from './fixtures/host';
import { mockUserRoleIn } from './host-store';
import { createdHostOf } from './hosting.handlers';
import { errors, fail, MOCK_IMAGE_ORIGIN, ok, readId, requireAuth } from './respond';

/**
 * 공연 관리(P11) — PE-2 · GE-3 · PE-4 · PE-6 · GE-7 · PE-8 · DE-9. GE-5(멤버의 준비중 섹션)·GP-3·GP-5는 `event.handlers.ts`가
 * 같은 저장소(`event-store.ts`)를 읽는다. PE-10 발급은 `upload-handlers.ts`.
 * 기준: 백엔드 `V2EventController`·유스케이스·`V2EventDomainService`·`EventErrorCode`(dev 432cce4, cb8d24e까지 변경 없음).
 * 권한 앞단은 `@HostRolesAllowed`(호스트 P10b mock과 같은 코드): 비멤버 403 `HOST_400_2`, 매니저 미만 403 `HOST_400_1`.
 */

export const RANK: Record<HostRole, number> = { GUEST: 1, MANAGER: 2, MASTER: 3, UNKNOWN: 0 };

const eventNotFound = (request: Request) =>
  fail(request, 404, 'Event_404_1', '이벤트를 찾을 수 없습니다.');
const hostNotFound = (request: Request) =>
  fail(request, 404, 'Host_404_1', '해당 호스트를 찾을 수 없습니다.');
const notMember = (request: Request) =>
  fail(request, 403, 'HOST_400_2', '해당 호스트에 대한 접근 권한이 없습니다.');
const notManager = (request: Request) =>
  fail(request, 403, 'HOST_400_1', '매니저 권한이 없는 유저입니다.');

/** 공연 에러 코드(`EventErrorCode`, 432cce4) */
export const EVENT_ERROR_REASONS = {
  Event_400_2: '시작 시각은 종료 시각보다 빨라야 합니다.',
  Event_400_7: '이벤트 오픈 조건을 충족하지 않았습니다.',
  Event_400_8: '이미 오픈 중인 이벤트입니다.',
  Event_400_13: '발급 티켓이 있는 이벤트는 삭제할 수 없습니다.',
  Event_400_15: '오픈 예정 시간이 현재 시간보다 빠릅니다.',
  Event_400_17: '종료된 공연은 수정할 수 없습니다.',
  Event_400_18: '등록된 공연은 티켓 여부를 바꿀 수 없습니다.',
  Event_400_19: '준비중인 공연만 삭제할 수 있습니다.',
  Event_400_20: '문의처 형식이 올바르지 않습니다.',
  Event_400_21: '섹션 형식이 올바르지 않습니다.',
  Event_400_22: '이 공연에 업로드한 이미지가 아닙니다.',
  Event_400_23: '태그가 올바르지 않습니다.',
  Event_400_24: '등록된 공연의 시작 시각은 현재 이후여야 합니다.',
  Event_400_25: '티켓이 있는 공연은 티켓 없음으로 바꿀 수 없습니다.',
} as const;
export type EventErrorCode = keyof typeof EVENT_ERROR_REASONS;
const eventError = (request: Request, code: EventErrorCode) =>
  fail(request, 400, code, EVENT_ERROR_REASONS[code]);

/** mock 사용자의 이 호스트 역할 — 호스트 저장소(P10b, `actAsRole`) → PH-2로 만든 호스트(마스터) 순 */
export function mockRoleIn(hostId: number): HostRole | null {
  return mockUserRoleIn(hostId) ?? createdHostOf(hostId)?.myRole ?? null;
}

/** 호스트 요약(공연의 `host`) — fixture 호스트 또는 PH-2로 만든 호스트 */
function hostSummaryOf(hostId: number): StoredEvent['host'] | null {
  const fixture = hosts.find((h) => h.hostId === hostId);
  if (fixture)
    return { hostId, name: fixture.name, profileImageUrl: fixture.profileImageUrl ?? null };
  const created = createdHostOf(hostId);
  return created ? { hostId, name: created.name, profileImageUrl: created.profileImageUrl } : null;
}

/** GE-3 · PE-4 응답 */
export function toManage(e: StoredEvent, myRole: HostRole | null): EventManage {
  return {
    eventId: e.eventId,
    hostId: e.host.hostId,
    hostName: e.host.name,
    myRole,
    posterImageKey: e.posterImageKey,
    posterImageUrl: e.posterImageUrl,
    name: e.name,
    startAt: e.startAt,
    endAt: e.endAt,
    runTime: e.runTime,
    place: e.place && (e.place.name !== null || e.place.address !== null) ? e.place : null,
    contacts: e.contacts,
    hasTicket: e.hasTicket,
    tags: e.tags,
    status: e.status,
    displayStatus: e.displayStatus,
    dDay: e.dDay,
    openedAt: e.openedAt,
    checklist: checklistOf(e),
  };
}

/**
 * 공연 하나를 다루는 공통 앞단 — 로그인, 경로 id, 공연 존재(지운 공연은 없음), 요청자 역할. 통과하면 `{ event, myRole }`
 */
export function guard(
  request: Request,
  cookies: Record<string, string>,
  raw: unknown,
  need: 'GUEST' | 'MANAGER',
): { response: Response } | { event: StoredEvent; myRole: HostRole } {
  const denied = requireAuth(request, cookies);
  if (denied) return { response: denied };
  const id = readId(raw);
  if (id === null) return { response: errors.typeMismatch(request) };
  const event = storedEvent(id);
  if (!event) return { response: eventNotFound(request) };
  const myRole = mockRoleIn(event.host.hostId);
  if (myRole === null || RANK[myRole] === 0) return { response: notMember(request) };
  if (RANK[myRole] < RANK[need]) return { response: notManager(request) };
  return { event, myRole };
}

const isText = (v: unknown): v is string => typeof v === 'string';
const notBlank = (v: string) => v.trim().length > 0;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** 준비중 / 등록된(OPEN) 공연만 수정할 수 있다(`validateEditable`) — 티켓·옵션(P12)도 같은 규칙 */
export const isEditable = (e: StoredEvent) => e.status === 'PREPARING' || e.status === 'OPEN';

// ─── PE-4 본문 읽기(Bean Validation → 400 BAD_REQUEST) ───

type BasicBody = {
  posterImageKey?: string;
  name?: string;
  startAt?: string;
  endAt?: string;
  place?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    detailAddress: string | null;
  };
  contacts?: (Contact | null)[];
  hasTicket?: boolean;
  tagIds?: (number | null)[];
};

function readBasicBody(body: unknown): BasicBody | null {
  if (!isObject(body)) return null;
  const out: BasicBody = {};
  const { posterImageKey, name, startAt, endAt, place, contacts, hasTicket, tagIds } = body;
  if (posterImageKey != null) {
    if (!isText(posterImageKey) || posterImageKey.length > EVENT_POSTER_KEY_MAX) return null;
    out.posterImageKey = posterImageKey;
  }
  if (name != null) {
    if (!isText(name) || !notBlank(name) || name.length > EVENT_NAME_MAX) return null;
    out.name = name.trim();
  }
  for (const [k, v] of [
    ['startAt', startAt],
    ['endAt', endAt],
  ] as const) {
    if (v == null) continue;
    if (!isText(v) || !isKstDateTime(v)) return null;
    out[k] = v;
  }
  if (place != null) {
    if (!isObject(place)) return null;
    const { name: pn, address, latitude, longitude, detailAddress } = place;
    if (!isText(pn) || !notBlank(pn) || pn.length > EVENT_PLACE_TEXT_MAX) return null;
    if (!isText(address) || !notBlank(address) || address.length > EVENT_PLACE_TEXT_MAX)
      return null;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    if (detailAddress != null && (!isText(detailAddress) || detailAddress.length > 255))
      return null;
    // 상세주소: 제어 문자 제거 → 앞뒤 공백 제거 → 비면 null(`sanitizeDetailAddress`)
    const detail = isText(detailAddress)
      ? detailAddress.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim() || null
      : null;
    out.place = {
      name: pn.trim(),
      address: address.trim(),
      latitude,
      longitude,
      detailAddress: detail,
    };
  }
  if (contacts != null) {
    if (!Array.isArray(contacts) || contacts.length > EVENT_CONTACTS_MAX) return null;
    const list: (Contact | null)[] = [];
    for (const c of contacts as unknown[]) {
      if (c === null) {
        list.push(null);
        continue;
      }
      if (!isObject(c) || !(CONTACT_TYPES as readonly unknown[]).includes(c.type)) return null;
      if (!isText(c.value) || !notBlank(c.value) || c.value.length > EVENT_CONTACT_VALUE_MAX)
        return null;
      list.push({ type: c.type as Contact['type'], value: c.value.trim() });
    }
    out.contacts = list;
  }
  if (hasTicket != null) {
    if (typeof hasTicket !== 'boolean') return null;
    out.hasTicket = hasTicket;
  }
  if (tagIds != null) {
    if (!Array.isArray(tagIds) || tagIds.length > 100) return null;
    if (!(tagIds as unknown[]).every((t) => t === null || Number.isInteger(t))) return null;
    out.tagIds = tagIds as (number | null)[];
  }
  return out;
}

const tagById = new Map(
  tagGroups.flatMap((g) => g.tags.map((t) => [t.tagId, { ...t, category: g.category }] as const)),
);

/** PE-4를 저장소에 반영한다 — 백엔드 순서(포스터 key → 수정 가능 → 티켓 여부 → 일정 → 포스터·장소 → 문의처 → 태그) */
function applyBasic(
  request: Request,
  event: StoredEvent,
  body: BasicBody,
): { response: Response } | { event: StoredEvent } {
  const next: StoredEvent = structuredClone(event);
  if (body.posterImageKey && !body.posterImageKey.startsWith(`event/${event.eventId}/`)) {
    return { response: eventError(request, 'Event_400_22') };
  }
  if (!isEditable(event)) return { response: eventError(request, 'Event_400_17') };
  if (body.hasTicket !== undefined && body.hasTicket !== event.hasTicket) {
    if (event.status !== 'PREPARING') return { response: eventError(request, 'Event_400_18') };
    if (!body.hasTicket && hasValidTicketOf(event)) {
      return { response: eventError(request, 'Event_400_25') };
    }
    next.hasTicket = body.hasTicket;
  }
  if (body.name !== undefined || body.startAt !== undefined || body.endAt !== undefined) {
    const startAt = body.startAt ?? event.startAt;
    const endAt = body.endAt ?? event.endAt;
    if (
      event.status === 'OPEN' &&
      body.startAt !== undefined &&
      body.startAt !== event.startAt &&
      !(body.startAt > mockNow())
    ) {
      return { response: eventError(request, 'Event_400_24') };
    }
    if (startAt && endAt && !(endAt > startAt)) {
      return { response: eventError(request, 'Event_400_2') };
    }
    next.name = body.name ?? event.name;
    next.startAt = startAt;
    next.endAt = endAt;
    next.runTime = runTimeOf(startAt, endAt);
  }
  if (body.posterImageKey !== undefined) {
    next.posterImageKey = body.posterImageKey || null;
    next.posterImageUrl = body.posterImageKey
      ? `${MOCK_IMAGE_ORIGIN}/${body.posterImageKey}`
      : null;
  }
  if (body.place) next.place = body.place;
  if (body.contacts) {
    if (body.contacts.some((c) => c === null)) {
      return { response: eventError(request, 'Event_400_20') };
    }
    next.contacts = body.contacts as Contact[];
  }
  if (body.tagIds) {
    if (body.tagIds.some((t) => t === null)) {
      return { response: eventError(request, 'Event_400_23') };
    }
    const distinct = [...new Set(body.tagIds as number[])];
    if (distinct.some((id) => !knownTagIds.has(id)) || distinct.length > EVENT_TAGS_MAX) {
      return { response: eventError(request, 'Event_400_23') };
    }
    // 분류 순 → 분류 안 순서(GE-3 `tags`)
    const order = [...tagById.keys()];
    next.tags = distinct
      .sort((a, b) => {
        const ta = tagById.get(a)!;
        const tb = tagById.get(b)!;
        const ca = tagGroups.findIndex((g) => g.category === ta.category);
        const cb = tagGroups.findIndex((g) => g.category === tb.category);
        return ca - cb || order.indexOf(a) - order.indexOf(b);
      })
      .map((id) => tagById.get(id)!);
  }
  return { event: next };
}

/** PE-6 본문 → 저장할 섹션. 형식이 틀리면 null(`Event_400_21` — 본문 자체가 객체가 아니면 400 `BAD_REQUEST`) */
let sectionSeq = 8000;
function readSections(body: unknown): EventSection[] | 'badRequest' | null {
  if (!isObject(body)) return 'badRequest';
  const { sections } = body;
  if (!Array.isArray(sections) || sections.length === 0 || sections.length > EVENT_SECTIONS_MAX) {
    return null;
  }
  const list: { title: string; content: string | null; sortOrder: number; index: number }[] = [];
  for (const [index, s] of (sections as unknown[]).entries()) {
    if (!isObject(s)) return null;
    const title = isText(s.title) ? s.title.trim() : '';
    const content = isText(s.content) ? s.content : null;
    if (!title || title.length > EVENT_SECTION_TITLE_MAX) return null;
    if ((content?.length ?? 0) > EVENT_SECTION_CONTENT_MAX) return null;
    const sortOrder = Number.isInteger(s.sortOrder) ? (s.sortOrder as number) : Number.MAX_VALUE;
    list.push({ title, content, sortOrder, index });
  }
  return list
    .sort((a, b) => a.sortOrder - b.sortOrder || a.index - b.index)
    .map((s, i) => ({
      sectionId: ++sectionSeq,
      title: s.title,
      content: s.content,
      contentFormat: 'HTML',
      sortOrder: i,
    }));
}

/** 기본 목록에 들어가는 핸들러(`handlers.ts`) */
export const hostingEventHandlers = [
  // PE-2
  http.post('*/api/v2/events', async ({ request, cookies }) => {
    const denied = requireAuth(request, cookies);
    if (denied) return denied;
    const body = (await request.json().catch(() => null)) as unknown;
    if (!isObject(body)) return errors.badRequest(request);
    const { hostId, name, startAt, endAt, hasTicket } = body;
    if (typeof hostId !== 'number' || !Number.isInteger(hostId) || hostId <= 0) {
      return errors.badRequest(request, { hostId: '0보다 커야 합니다' });
    }
    if (!isText(name) || !notBlank(name) || name.length > EVENT_NAME_MAX) {
      return errors.badRequest(request, { name: '크기가 1에서 25 사이여야 합니다' });
    }
    if (!isText(startAt) || !isKstDateTime(startAt) || !isText(endAt) || !isKstDateTime(endAt)) {
      return errors.badRequest(request, { startAt: '날짜 형식이 올바르지 않습니다' });
    }
    if (!(startAt > mockNow())) {
      return errors.badRequest(request, { startAt: '미래 날짜여야 합니다' });
    }
    if (typeof hasTicket !== 'boolean') {
      return errors.badRequest(request, { hasTicket: '널이어서는 안됩니다' });
    }
    const host = hostSummaryOf(hostId);
    if (!host) return hostNotFound(request);
    const role = mockRoleIn(hostId);
    if (role === null) return notMember(request);
    if (RANK[role] < RANK.MANAGER) return notManager(request);
    if (!(endAt > startAt)) return eventError(request, 'Event_400_2');
    const event = createStoredEvent({ host, name: name.trim(), startAt, endAt, hasTicket });
    saveStoredEvent({ ...event, runTime: runTimeOf(startAt, endAt) });
    return ok({ eventId: event.eventId });
  }),

  // GE-3
  http.get('*/api/v2/events/:eventId/manage', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    return ok(toManage(g.event, g.myRole));
  }),

  // GE-7
  http.get('*/api/v2/events/:eventId/checklist', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'GUEST');
    if ('response' in g) return g.response;
    return ok(checklistOf(g.event));
  }),

  // PE-4
  http.patch('*/api/v2/events/:eventId/basic', async ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const body = readBasicBody(await request.json().catch(() => null));
    if (!body) return errors.badRequest(request);
    const applied = applyBasic(request, g.event, body);
    if ('response' in applied) return applied.response;
    saveStoredEvent(applied.event);
    return ok(toManage(applied.event, g.myRole));
  }),

  // PE-6
  http.put('*/api/v2/events/:eventId/sections', async ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const sections = readSections(await request.json().catch(() => null));
    if (sections === 'badRequest') return errors.badRequest(request);
    if (!isEditable(g.event)) return eventError(request, 'Event_400_17');
    if (!sections) return eventError(request, 'Event_400_21');
    saveStoredEvent({ ...g.event, sections });
    return ok(sections);
  }),

  // PE-8
  http.post('*/api/v2/events/:eventId/open', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    const e = g.event;
    if (e.status === 'PREPARING' && !isChecklistFilled(e)) {
      return eventError(request, 'Event_400_7');
    }
    if (!e.startAt || e.startAt < mockNow()) return eventError(request, 'Event_400_15');
    if (e.status === 'OPEN') return eventError(request, 'Event_400_8');
    const opened: StoredEvent = {
      ...e,
      status: 'OPEN',
      displayStatus: 'UPCOMING',
      openedAt: e.openedAt ?? mockNow(),
    };
    saveStoredEvent(opened);
    return ok({ eventId: e.eventId, status: 'OPEN', displayStatus: 'UPCOMING' });
  }),

  // DE-9
  http.delete('*/api/v2/events/:eventId', ({ request, params, cookies }) => {
    const g = guard(request, cookies, params.eventId, 'MANAGER');
    if ('response' in g) return g.response;
    if (g.event.status !== 'PREPARING') return eventError(request, 'Event_400_19');
    saveStoredEvent({ ...g.event, status: 'DELETED' });
    return ok({ eventId: g.event.eventId, status: 'DELETED', displayStatus: 'PREPARING' });
  }),
];

const eventPath = (eventId: number, sub = '') => `*/api/v2/events/${eventId}${sub}`;

/** 시나리오 세트. 기본 목록 앞에 끼운다(`server.use(...)` / e2e `mockApi.use(...)`) */
export const hostingEventSets = {
  /** PE-2가 이 코드로 실패한다 */
  createFails: (code: EventErrorCode | 'BAD_REQUEST') => [
    http.post('*/api/v2/events', ({ request }) =>
      code === 'BAD_REQUEST'
        ? errors.badRequest(request, { startAt: '미래 날짜여야 합니다' })
        : eventError(request, code),
    ),
  ],
  /** PE-4가 이 코드로 실패한다(저장소는 그대로) */
  basicFails: (eventId: number, code: EventErrorCode) => [
    http.patch(eventPath(eventId, '/basic'), ({ request }) => eventError(request, code)),
  ],
  /** PE-6이 이 코드로 실패한다 */
  sectionsFails: (eventId: number, code: EventErrorCode) => [
    http.put(eventPath(eventId, '/sections'), ({ request }) => eventError(request, code)),
  ],
  /** PE-8이 이 코드로 실패한다 */
  openFails: (eventId: number, code: EventErrorCode) => [
    http.post(eventPath(eventId, '/open'), ({ request }) => eventError(request, code)),
  ],
  /** DE-9가 이 코드로 실패한다 */
  deleteFails: (eventId: number, code: EventErrorCode) => [
    http.delete(eventPath(eventId), ({ request }) => eventError(request, code)),
  ],
  /** GE-3 5xx */
  manageServerError: (eventId: number) => [
    http.get(eventPath(eventId, '/manage'), ({ request }) => errors.serverError(request)),
  ],
};
