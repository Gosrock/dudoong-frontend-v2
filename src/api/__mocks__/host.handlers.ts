import { http } from 'msw';

import {
  HOST_CONTACT_VALUE_MAX,
  HOST_CONTACTS_MAX,
  HOST_CONTACTS_MIN,
  HOST_IMAGE_KEY_MAX,
  HOST_INTRODUCE_MAX,
  HOST_MEMBERS_INVITE_MAX,
  HOST_NAME_MAX,
  HOST_PHONE_VALUE_MAX,
  type HostEvent,
  type HostMember,
  type HostViewer,
} from '../host/schema';
import { CONTACT_TYPES, type HostRole } from '../shared/common-schema';
import type { MockEvent } from './fixtures/event';
import { events, preparingEvents, upcomingOrder } from './fixtures/event';
import { hosts, mockUsers, viewerOf } from './fixtures/host';
import { me } from './fixtures/me';
import {
  addStoredMembers,
  editHostProfile,
  membersOf,
  mockUserRoleIn,
  removeStoredMember,
  resetHostStore,
  setStoredRole,
  withHostEdits,
} from './host-store';
import { maskContacts } from './privacy-mask';
import {
  errors,
  fail,
  hasAccessToken,
  MOCK_IMAGE_ORIGIN,
  ok,
  paginate,
  publicIdMismatch,
  readId,
  readPageParams,
  requireAuth,
} from './respond';

const hostNotFound = (request: Request) =>
  fail(request, 404, 'Host_404_1', '해당 호스트를 찾을 수 없습니다.');

/** 비멤버의 멤버 전용 API(GH-6). v2는 HTTP 403, 코드 문자열은 `HOST_400_2` 그대로(error-codes) */
const forbiddenHost = (request: Request) =>
  fail(request, 403, 'HOST_400_2', '해당 호스트에 대한 접근 권한이 없습니다.');

/** 요청자 권한 실패(v2는 HTTP 403, 코드 문자열은 `HOST_400_*` 그대로 — `V2ErrorPolicy`, 432cce4) */
const HOST_FORBIDDEN = {
  HOST_400_1: '매니저 권한이 없는 유저입니다.',
  HOST_400_4: '마스터 호스트 권한이 없는 유저입니다.',
  HOST_400_11: '매니저는 일반 멤버만 추가·삭제할 수 있습니다.',
} as const;
const forbidden = (request: Request, code: keyof typeof HOST_FORBIDDEN) =>
  fail(request, 403, code, HOST_FORBIDDEN[code]);

/** 멤버·설정 400(`HostErrorCode`, 432cce4). 초대 실패 4종은 문제 이메일을 `reason` 끝 괄호에 붙인다(`toDetailException`) */
const HOST_BAD_REQUEST = {
  HOST_400_5: '마스터 호스트의 권한은 변경할 수 없습니다.',
  HOST_400_10: '마스터 역할은 지정할 수 없습니다. 마스터 양도를 이용해주세요.',
  HOST_400_12: '마스터는 삭제할 수 없습니다.',
  HOST_400_13: '가입되지 않은 이메일입니다.',
  HOST_400_14: '중복된 이메일이 있습니다.',
  HOST_400_15: '이미 호스트 멤버인 이메일입니다.',
  HOST_400_16: '연락처 형식이 올바르지 않습니다.',
  HOST_400_17: '이 호스트에 업로드한 이미지가 아닙니다.',
  HOST_400_18: '같은 이메일로 가입된 계정이 여러 개입니다.',
} as const;
type HostBadRequestCode = keyof typeof HOST_BAD_REQUEST;
const badRequest = (request: Request, code: HostBadRequestCode, emails?: string[]) =>
  fail(
    request,
    400,
    code,
    emails ? `${HOST_BAD_REQUEST[code]} (${emails.join(', ')})` : HOST_BAD_REQUEST[code],
  );

const memberGone = (request: Request) =>
  fail(request, 404, 'HOST_404_2', '가입된 호스트 유저가 아닙니다.');

const RANK: Record<HostRole, number> = { GUEST: 1, MANAGER: 2, MASTER: 3, UNKNOWN: 0 };

const isText = (v: unknown): v is string => typeof v === 'string';
const ASSIGNABLE = ['MASTER', 'MANAGER', 'GUEST'] as const;
const isRole = (v: unknown): v is (typeof ASSIGNABLE)[number] =>
  (ASSIGNABLE as readonly unknown[]).includes(v);

/**
 * PH-4 본문 검사 — 백엔드 순서: Bean Validation(HTTP 400 `BAD_REQUEST` — `GlobalExceptionHandler` @432cce4) → 이미지 key(`HOST_400_17`) → 연락처 도메인 검증(`HOST_400_16`).
 * 통과하면 반영할 값(`V2UpdateHostUseCase`·`V2HostDomainService.updateProfile`, 432cce4)
 */
type UpdateRead =
  | { error: 'BAD_REQUEST' | 'HOST_400_16' | 'HOST_400_17' }
  | {
      edit: Partial<
        Pick<HostViewer, 'name' | 'introduce' | 'contacts' | 'profileImageUrl' | 'coverImageUrl'>
      >;
    };

function readUpdateBody(hostId: number, body: unknown): UpdateRead {
  if (!body || typeof body !== 'object') return { error: 'BAD_REQUEST' as const };
  const b = body as Record<string, unknown>;
  const optText = (v: unknown, max: number) =>
    v === undefined || v === null || (isText(v) && v.length <= max);
  if (b.name !== undefined && b.name !== null) {
    if (!isText(b.name) || b.name.length < 1 || b.name.length > HOST_NAME_MAX || !b.name.trim())
      return { error: 'BAD_REQUEST' as const };
  }
  if (!optText(b.introduce, HOST_INTRODUCE_MAX)) return { error: 'BAD_REQUEST' as const };
  if (!optText(b.profileImageKey, HOST_IMAGE_KEY_MAX)) return { error: 'BAD_REQUEST' as const };
  if (!optText(b.coverImageKey, HOST_IMAGE_KEY_MAX)) return { error: 'BAD_REQUEST' as const };
  let contacts: { type: (typeof CONTACT_TYPES)[number]; value: string }[] | undefined;
  if (b.contacts !== undefined && b.contacts !== null) {
    if (!Array.isArray(b.contacts)) return { error: 'BAD_REQUEST' as const };
    if (b.contacts.length < HOST_CONTACTS_MIN || b.contacts.length > HOST_CONTACTS_MAX)
      return { error: 'BAD_REQUEST' as const };
    contacts = [];
    for (const c of b.contacts as Record<string, unknown>[]) {
      if (!c || !(CONTACT_TYPES as readonly unknown[]).includes(c.type))
        return { error: 'BAD_REQUEST' as const };
      if (!isText(c.value) || !c.value.trim() || c.value.length > HOST_CONTACT_VALUE_MAX)
        return { error: 'BAD_REQUEST' as const };
      contacts.push({ type: c.type as (typeof CONTACT_TYPES)[number], value: c.value.trim() });
    }
  }
  // 이 호스트에 PH-15가 발급한 모양 그대로(`{prefix}{UUID}.{jpeg|jpg|png}`)이거나 빈 문자열(기본 이미지)
  const issued = new RegExp(`^host/${hostId}/[0-9a-f-]{36}\\.(jpeg|jpg|png)$`);
  for (const key of [b.profileImageKey, b.coverImageKey]) {
    if (isText(key) && key !== '' && !issued.test(key)) return { error: 'HOST_400_17' as const };
  }
  if (contacts?.some((c) => c.type === 'PHONE' && c.value.length > HOST_PHONE_VALUE_MAX))
    return { error: 'HOST_400_16' as const };
  const imageUrl = (key: string) => (key === '' ? null : `${MOCK_IMAGE_ORIGIN}/${key}`);
  return {
    edit: {
      ...(isText(b.name) && { name: b.name.trim() }),
      ...(isText(b.introduce) && { introduce: b.introduce.trim() ? b.introduce : null }),
      ...(contacts && { contacts }),
      ...(isText(b.profileImageKey) && { profileImageUrl: imageUrl(b.profileImageKey) }),
      ...(isText(b.coverImageKey) && { coverImageUrl: imageUrl(b.coverImageKey) }),
    },
  };
}

/** PH-7 검사 — 백엔드 순서(`V2AddHostMembersUseCase`, 432cce4): 역할 → 중복(소문자) → 같은 이메일 계정 여럿 → 미가입 → 이미 멤버 */
type AddRead =
  | { error: 'BAD_REQUEST' | 'HOST_400_10' }
  | { error: 'HOST_400_13' | 'HOST_400_14' | 'HOST_400_15' | 'HOST_400_18'; emails: string[] }
  | { forbidden: 'HOST_400_11' }
  | { added: HostMember[] };

function readAddMembers(hostId: number, myRole: HostRole, body: unknown): AddRead {
  const raw = (body as { members?: unknown } | null)?.members;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > HOST_MEMBERS_INVITE_MAX)
    return { error: 'BAD_REQUEST' as const };
  const rows: { email: string; role: (typeof ASSIGNABLE)[number] }[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || !isText(r.email) || !/^[^\s@]+@[^\s@]+$/.test(r.email.trim()) || !isRole(r.role))
      return { error: 'BAD_REQUEST' as const };
    rows.push({ email: r.email.trim(), role: r.role });
  }
  for (const r of rows) {
    if (r.role === 'MASTER') return { error: 'HOST_400_10' as const };
    if (r.role !== 'GUEST' && myRole !== 'MASTER') return { forbidden: 'HOST_400_11' as const };
  }
  const lower = rows.map((r) => r.email.toLowerCase());
  const duplicated = [...new Set(lower.filter((e, i) => lower.indexOf(e) !== i))];
  if (duplicated.length > 0) return { error: 'HOST_400_14' as const, emails: duplicated };
  const usersOf = (email: string) =>
    mockUsers.filter((u) => u.email.toLowerCase() === email.toLowerCase());
  const ambiguous = rows.filter((r) => usersOf(r.email).length > 1).map((r) => r.email);
  if (ambiguous.length > 0) return { error: 'HOST_400_18' as const, emails: ambiguous };
  const notFound = rows.filter((r) => usersOf(r.email).length === 0).map((r) => r.email);
  if (notFound.length > 0) return { error: 'HOST_400_13' as const, emails: notFound };
  const current = new Set(membersOf(hostId).map((m) => m.userId));
  const already = rows.filter((r) => current.has(usersOf(r.email)[0]!.userId)).map((r) => r.email);
  if (already.length > 0) return { error: 'HOST_400_15' as const, emails: already };
  return {
    added: rows.map((r) => {
      const u = usersOf(r.email)[0]!;
      return { userId: u.userId, name: u.name, profileImageUrl: u.profileImageUrl, role: r.role };
    }),
  };
}

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
    // 세트가 정한 역할 > 저장소(P10b 멤버 변경·양도) > fixture
    const myRole =
      forced && 'myRole' in forced
        ? (forced.myRole ?? null)
        : (mockUserRoleIn(host.hostId) ?? base.myRole);
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
    const found = id === null ? undefined : hosts.find((h) => h.hostId === id);
    return { id, host: found && withHostEdits(found) };
  };

  /**
   * 멤버 변경·설정의 공통 앞단 — 로그인, 호스트 존재, 요청자 역할(`@HostRolesAllowed`: 비멤버 403 `HOST_400_2`,
   * 매니저 미만 `HOST_400_1`, 마스터 아님 `HOST_400_4`). 통과하면 `{ id, host, myRole }`
   */
  function guard(
    request: Request,
    cookies: Record<string, string>,
    raw: unknown,
    need: 'GUEST' | 'MANAGER' | 'MASTER',
  ) {
    const denied = requireAuth(request, cookies);
    if (denied) return { response: denied };
    const { id, host } = findHost(raw);
    if (id === null) return { response: errors.typeMismatch(request) };
    if (!host) return { response: hostNotFound(request) };
    const myRole = viewer(host).myRole;
    if (myRole === null) return { response: forbiddenHost(request) };
    if (RANK[myRole] < RANK[need]) {
      return { response: forbidden(request, need === 'MASTER' ? 'HOST_400_4' : 'HOST_400_1') };
    }
    return { id, host, myRole };
  }

  function setFollow(request: Request, cookies: Record<string, string>, raw: unknown, on: boolean) {
    const denied = requireAuth(request, cookies);
    if (denied) return denied;
    const { id, host } = findHost(raw);
    if (id === null) return errors.typeMismatch(request);
    if (!host) return hostNotFound(request);
    follows.set(id, on);
    const v = viewer(host);
    return ok({ hostId: id, isFollowing: v.isFollowing, followerCount: v.followerCount });
  }

  const handlers = [
    http.get('*/api/v2/hosts/:hostId', ({ request, params, cookies }) => {
      const { id, host } = findHost(params.hostId);
      if (id === null) return publicIdMismatch(request, cookies);
      if (!host) return hostNotFound(request);
      // 비로그인(쿠키 없음·만료·위조 — #792로 익명 처리)이면 연락처의 전화·이메일을 가린다(백엔드 #822/#846)
      return ok(
        hasAccessToken(cookies) ? viewer(host) : { ...host, contacts: maskContacts(host.contacts) },
      );
    }),

    http.get('*/api/v2/hosts/:hostId/events', ({ request, params, cookies }) => {
      const { id, host } = findHost(params.hostId);
      const paging = readPageParams(new URL(request.url), 10);
      if (id === null) return publicIdMismatch(request, cookies);
      if (!paging) return errors.badRequest(request);
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
      if (id === null) return errors.typeMismatch(request);
      if (!host) return hostNotFound(request);
      if (viewer(host).myRole === null) return forbiddenHost(request);
      return ok(membersOf(id));
    }),

    // PH-4 호스트 설정(매니저 이상) — 응답은 GH-3과 같은 모양(요청자 기준, 원문 연락처)
    http.patch('*/api/v2/hosts/:hostId', async ({ request, params, cookies }) => {
      const g = guard(request, cookies, params.hostId, 'MANAGER');
      if (g.response) return g.response;
      const read = readUpdateBody(g.id, await request.json().catch(() => null));
      if ('error' in read) {
        return read.error === 'BAD_REQUEST'
          ? errors.badRequest(request)
          : badRequest(request, read.error);
      }
      editHostProfile(g.id, read.edit);
      return ok(viewer(findHost(String(g.id)).host!));
    }),

    // PH-7 멤버 추가(매니저 이상, 즉시 활성) — 하나라도 문제가 있으면 아무도 추가하지 않는다
    http.post('*/api/v2/hosts/:hostId/members', async ({ request, params, cookies }) => {
      const g = guard(request, cookies, params.hostId, 'MANAGER');
      if (g.response) return g.response;
      const read = readAddMembers(g.id, g.myRole, await request.json().catch(() => null));
      if ('forbidden' in read) return forbidden(request, read.forbidden);
      if ('error' in read) {
        return read.error === 'BAD_REQUEST'
          ? errors.badRequest(request)
          : badRequest(request, read.error, 'emails' in read ? read.emails : undefined);
      }
      addStoredMembers(g.id, read.added);
      return ok(membersOf(g.id));
    }),

    // PH-10 역할 변경 일반 ↔ 매니저(마스터만)
    http.patch(
      '*/api/v2/hosts/:hostId/members/:userId/role',
      async ({ request, params, cookies }) => {
        const g = guard(request, cookies, params.hostId, 'MASTER');
        if (g.response) return g.response;
        const userId = readId(params.userId);
        const role = ((await request.json().catch(() => null)) as { role?: unknown } | null)?.role;
        if (userId === null) return errors.typeMismatch(request);
        if (!isRole(role)) return errors.badRequest(request, { role: '널이어서는 안됩니다' });
        if (role === 'MASTER') return badRequest(request, 'HOST_400_10');
        const target = membersOf(g.id).find((m) => m.userId === userId);
        if (!target) return memberGone(request);
        if (target.role === 'MASTER') return badRequest(request, 'HOST_400_5');
        setStoredRole(g.id, userId, role);
        return ok(membersOf(g.id));
      },
    ),

    // DH-11 멤버 삭제(매니저 이상, 매니저는 일반 멤버만, 마스터 불가)
    http.delete('*/api/v2/hosts/:hostId/members/:userId', ({ request, params, cookies }) => {
      const g = guard(request, cookies, params.hostId, 'MANAGER');
      if (g.response) return g.response;
      const userId = readId(params.userId);
      if (userId === null) return errors.typeMismatch(request);
      const target = membersOf(g.id).find((m) => m.userId === userId);
      if (!target) return memberGone(request);
      if (target.role === 'MASTER') return badRequest(request, 'HOST_400_12');
      if (target.role !== 'GUEST' && g.myRole !== 'MASTER') {
        return forbidden(request, 'HOST_400_11');
      }
      removeStoredMember(g.id, userId);
      return ok(membersOf(g.id));
    }),

    // PH-12 마스터 양도(마스터만) — 나는 매니저가 된다
    http.post('*/api/v2/hosts/:hostId/transfer-master', async ({ request, params, cookies }) => {
      const g = guard(request, cookies, params.hostId, 'MASTER');
      if (g.response) return g.response;
      const raw = ((await request.json().catch(() => null)) as { userId?: unknown } | null)?.userId;
      const userId = typeof raw === 'number' && Number.isSafeInteger(raw) ? raw : null;
      if (userId === null) return errors.badRequest(request, { userId: '널이어서는 안됩니다' });
      if (!membersOf(g.id).some((m) => m.userId === userId)) return memberGone(request);
      setStoredRole(g.id, me.userId, 'MANAGER');
      setStoredRole(g.id, userId, 'MASTER');
      return ok(membersOf(g.id));
    }),

    http.put('*/api/v2/hosts/:hostId/follow', ({ request, params, cookies }) =>
      setFollow(request, cookies, params.hostId, true),
    ),
    http.delete('*/api/v2/hosts/:hostId/follow', ({ request, params, cookies }) =>
      setFollow(request, cookies, params.hostId, false),
    ),
  ];
  return {
    handlers,
    reset: () => {
      follows.clear();
      resetHostStore();
    },
  };
}

const defaults = buildHostHandlers();

/**
 * 호스트 — GH-3, GH-14(공개), GH-6, PH-13(로그인). 액세스 토큰 쿠키가 실린 요청은 로그인 mock 사용자로 본다
 * (고스락 11의 마스터, 소음공작소 12를 팔로우 — `fixtures/host.ts`). 공개 쿼리는 `credentials: 'omit'`라 언제나 익명 값이다
 * (GH-3 연락처의 전화·이메일은 가린 값).
 */
export const hostHandlers = defaults.handlers;

/** 기본 목록의 팔로우 상태와 호스트 저장소(P10b 설정·멤버)를 fixture 값으로 되돌린다(vitest `afterEach`) */
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
