import { http, type HttpHandler } from 'msw';

import {
  HOST_CONTACT_VALUE_MAX,
  HOST_CONTACTS_MAX,
  HOST_CONTACTS_MIN,
  HOST_INTRODUCE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
} from '../host/schema';
import { CONTACT_TYPES } from '../shared/common-schema';
import {
  CREATED_HOST_ID_START,
  defaultMemberships,
  hostEventsOf,
  manyMemberships,
  mixedMemberships,
  type MockMembership,
  toMyEvent,
  toMyHost,
} from './fixtures/hosting';
import { mockUserRoleIn, profileEditOf, resetHostStore } from './host-store';
import { errors, fail, ok, paginate, readPageParams, requireAuth } from './respond';

/**
 * 공연준비 홈(P10a) — GH-1 `GET /me/hosts` · GE-1 `GET /me/events` · PH-2 `POST /hosts`(모두 로그인).
 * 기준: 백엔드 `V2HostController`·`V2EventController`(432cce4)와 api-contract §1 페이지네이션(카드형 기본 10, 상한 50, `keyword` 50자).
 *
 * PH-2로 만든 호스트는 모듈 저장소에 남아 다음 GH-1에 나온다(호스트 생성 → 목록 반영, plan P10a). 새 호스트는 마스터,
 * 공연 0개, 목록 맨 앞(서버도 호스트 id 큰 순). vitest·e2e는 `resetHostingStore()`로 비운다.
 */

/** 만든 호스트(최근 것이 앞) */
let created: MockMembership[] = [];
let nextHostId = CREATED_HOST_ID_START;

/**
 * 만든 호스트를 지운다(vitest `beforeEach`·e2e `test.beforeEach`). GH-1·GE-1이 읽는 호스트 저장소(P10b 설정·멤버·양도 —
 * `host-store.ts`)도 함께 되돌린다
 */
export function resetHostingStore() {
  created = [];
  nextHostId = CREATED_HOST_ID_START;
  resetHostStore();
}

const KEYWORD_MAX = 50;

/** `keyword`(부분일치) 읽기. 50자 넘으면 `null` → 400 */
function readKeyword(url: URL): string | null | undefined {
  const raw = url.searchParams.get('keyword');
  if (raw === null) return undefined;
  if (raw.length > KEYWORD_MAX) return null;
  return raw.trim();
}

/**
 * 호스트 저장소(P10b)를 덮는다 — 마스터를 넘기면 `myRole`이 매니저로, 설정에서 바꾼 이름·이미지도 카드에 나온다.
 * 저장소에 mock 사용자가 없는 호스트(세트가 만든 멤버십)는 세트 값 그대로.
 */
function managed(m: MockMembership): MockMembership {
  const role = mockUserRoleIn(m.hostId);
  const edit = profileEditOf(m.hostId);
  return {
    ...m,
    ...(role && role !== 'UNKNOWN' && { myRole: role }),
    ...(edit?.name !== undefined && { name: edit.name }),
    ...(edit?.profileImageUrl !== undefined && { profileImageUrl: edit.profileImageUrl }),
  };
}

const includes = (value: string | null, keyword: string | undefined) =>
  !keyword || (value ?? '').includes(keyword);

function listHandlers(memberships: () => MockMembership[]): HttpHandler[] {
  return [
    http.get('*/api/v2/me/hosts', ({ request, cookies }) => {
      const denied = requireAuth(request, cookies);
      if (denied) return denied;
      const url = new URL(request.url);
      const paging = readPageParams(url, 10);
      const keyword = readKeyword(url);
      if (!paging || keyword === null) return errors.badRequest(request);
      const list = memberships()
        .map(managed)
        .filter((m) => includes(m.name, keyword))
        .map((m) => toMyHost(m, hostEventsOf(m.hostId).length));
      return ok(paginate(list, paging.page, paging.size));
    }),

    http.get('*/api/v2/me/events', ({ request, cookies }) => {
      const denied = requireAuth(request, cookies);
      if (denied) return denied;
      const url = new URL(request.url);
      const paging = readPageParams(url, 10);
      const keyword = readKeyword(url);
      if (!paging || keyword === null) return errors.badRequest(request);
      const list = memberships()
        .map(managed)
        .flatMap((m) => hostEventsOf(m.hostId).map((e) => toMyEvent(e, m.myRole)))
        .filter((e) => includes(e.name, keyword))
        // 최신 생성 순 — mock 공연에는 생성일이 없어 id 큰 것을 최근으로 본다
        .sort((a, b) => b.eventId - a.eventId);
      return ok(paginate(list, paging.page, paging.size));
    }),
  ];
}

const isText = (v: unknown): v is string => typeof v === 'string';
const notBlank = (v: string) => v.trim().length > 0;

/** PH-2 Bean Validation(`GLOBAL_400_1`)을 흉내 낸다 — api-contract §3 "호스트" 규칙만. 통과하면 정리한 본문 */
function readCreateBody(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const { name, introduce, contacts } = body as Record<string, unknown>;
  if (!isText(name) || !notBlank(name) || name.length > HOST_NAME_MAX) return null;
  if (introduce !== null && introduce !== undefined) {
    if (!isText(introduce) || introduce.length > HOST_INTRODUCE_MAX) return null;
  }
  if (!Array.isArray(contacts)) return null;
  if (contacts.length < HOST_CONTACTS_MIN || contacts.length > HOST_CONTACTS_MAX) return null;
  for (const c of contacts as Record<string, unknown>[]) {
    if (!c || !(CONTACT_TYPES as readonly unknown[]).includes(c.type)) return null;
    if (!isText(c.value) || !notBlank(c.value) || c.value.length > HOST_CONTACT_VALUE_MAX)
      return null;
    if (c.type === 'PHONE' && c.value.length > HOST_PHONE_VALUE_MAX) return null;
  }
  return { name: name.trim() };
}

const createHandler = http.post('*/api/v2/hosts', async ({ request, cookies }) => {
  const denied = requireAuth(request, cookies);
  if (denied) return denied;
  const body = readCreateBody(await request.json().catch(() => null));
  if (!body) return errors.badRequest(request);
  const hostId = nextHostId++;
  created = [{ hostId, name: body.name, profileImageUrl: null, myRole: 'MASTER' }, ...created];
  return ok({ hostId });
});

const withCreated = (base: MockMembership[]) => () => [...created, ...base];

/** 기본 목록에 들어가는 핸들러 — 멤버십은 GM-1과 같은 기본값 + 만든 호스트 */
export const hostingHandlers = [...listHandlers(withCreated(defaultMemberships)), createHandler];

/** 호스트 만들기 실패 코드(백엔드 `HostErrorCode`, 432cce4) */
const CREATE_ERROR_REASONS = {
  HOST_400_16: '연락처 형식이 올바르지 않습니다.',
  GLOBAL_400_1: '검증 오류',
} as const;
export type CreateHostErrorCode = keyof typeof CREATE_ERROR_REASONS;

/** 시나리오 세트. 기본 목록 앞에 끼운다(`server.use(...)` / e2e `mockApi.use(...)`) */
export const hostingSets = {
  /** 역할이 섞인 멤버십(고스락 마스터 · 소음공작소 일반 멤버) — 카드의 호스트별 `myRole` */
  mixedRoles: listHandlers(withCreated(mixedMemberships)),
  /** 호스트 24개(GH-1 페이지 3장, size 10) */
  manyHosts: listHandlers(withCreated(manyMemberships)),
  /** 소속 호스트가 없다(GH-1·GE-1 빈 목록). 만든 호스트는 나온다 */
  noMembership: listHandlers(withCreated([])),
  /** 호스트는 있지만 공연이 없다(GE-1 빈 목록) */
  noEvents: [http.get('*/api/v2/me/events', () => ok(paginate([], 0, 10)))],
  /** GH-1·GE-1 두 번째 페이지부터 5xx */
  nextPageError: [
    http.get('*/api/v2/me/hosts', ({ request }) =>
      Number(new URL(request.url).searchParams.get('page') ?? 0) > 0
        ? errors.serverError(request)
        : undefined,
    ),
    http.get('*/api/v2/me/events', ({ request }) =>
      Number(new URL(request.url).searchParams.get('page') ?? 0) > 0
        ? errors.serverError(request)
        : undefined,
    ),
  ],
  /** GH-1·GE-1 첫 페이지부터 5xx */
  listServerError: [
    http.get('*/api/v2/me/hosts', ({ request }) => errors.serverError(request)),
    http.get('*/api/v2/me/events', ({ request }) => errors.serverError(request)),
  ],
  /** PH-2가 이 코드로 실패한다(저장소는 그대로) */
  createFails: (code: CreateHostErrorCode) => [
    http.post('*/api/v2/hosts', ({ request }) =>
      fail(request, 400, code, CREATE_ERROR_REASONS[code]),
    ),
  ],
  /** PH-2 5xx */
  createServerError: [http.post('*/api/v2/hosts', ({ request }) => errors.serverError(request))],
};
