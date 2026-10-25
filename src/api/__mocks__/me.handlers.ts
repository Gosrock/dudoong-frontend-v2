import { http, type HttpHandler } from 'msw';

import { ARCHIVE_YEAR_MAX, ARCHIVE_YEAR_MIN, FOLLOWING_HOST_FILTERS, type Me } from '../me/schema';
import { findPublicEvent } from './fixtures/event';
import { hosts } from './fixtures/host';
import { me } from './fixtures/me';
import {
  archiveEvents,
  archiveYears,
  followingHosts,
  matchesFollowingFilter,
} from './fixtures/mypage';
import {
  errors,
  fail,
  MOCK_IMAGE_ORIGIN,
  ok,
  paginate,
  readId,
  readPageParams,
  requireAuth,
} from './respond';

// ─── 저장소(P9 — 프로필 수정·팔로우 해제가 다음 조회에 보이게) ──────────

let profile: Me = structuredClone(me);
/** 팔로우를 바꾼 호스트(호스트 id → 팔로우 여부). 없으면 fixture 값 */
const followOverrides = new Map<number, boolean>();

/** 프로필·관심 호스트를 fixture 값으로 되돌린다(vitest `beforeEach`) */
export function resetMeStore() {
  profile = structuredClone(me);
  followOverrides.clear();
}

/** 지금 mock 사용자 프로필(테스트에서 응답과 비교) */
export const readMockProfile = () => profile;

const USER_ERROR_REASONS = {
  USER_400_4: [400, '이름은 공백만으로 지을 수 없습니다.'],
  USER_400_5: [400, '본인에게 업로드한 이미지가 아닙니다.'],
  USER_400_6: [400, '마스터인 호스트가 있어 탈퇴할 수 없습니다. 마스터를 양도한 뒤 탈퇴해 주세요.'],
} as const satisfies Record<string, readonly [number, string]>;
export type UserErrorCode = keyof typeof USER_ERROR_REASONS;

export const userError = (request: Request, code: UserErrorCode) => {
  const [status, reason] = USER_ERROR_REASONS[code];
  return fail(request, status, code, reason);
};

/** `@NotBlank`와 같은 판정(백엔드 `NOT_BLANK_REGEX`) */
const NOT_BLANK = /[^\u0000- ]/;
/** 업로드 mock(`upload-handlers.ts`)이 mock 사용자(1)에게 발급하는 key 접두 */
const OWN_IMAGE_KEY_PREFIX = 'user/1/';

/** PM-2 — Bean Validation(`GLOBAL_400_1`) → 이미지 key 소유(`USER_400_5`) → 저장 */
async function updateProfile(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return errors.badRequest(request);
  const { name, profileImageKey } = body;
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !NOT_BLANK.test(name) || name.length < 2 || name.length > 7) {
      return errors.badRequest(request);
    }
  }
  if (profileImageKey !== undefined && profileImageKey !== null) {
    if (typeof profileImageKey !== 'string' || profileImageKey.length > 255) {
      return errors.badRequest(request);
    }
    if (profileImageKey !== '' && !profileImageKey.startsWith(OWN_IMAGE_KEY_PREFIX)) {
      return userError(request, 'USER_400_5');
    }
  }
  profile = {
    ...profile,
    ...(typeof name === 'string' && { name }),
    ...(typeof profileImageKey === 'string' && {
      profileImageUrl: profileImageKey === '' ? null : `${MOCK_IMAGE_ORIGIN}/${profileImageKey}`,
    }),
  };
  return ok(profile);
}

/** GM-4 — 팔로우를 바꾼 것을 반영. fixture 밖의 호스트(고스락 11)를 팔로우하면 맨 앞(최근 팔로우)에 온다 */
function listFollowingHosts(request: Request) {
  const url = new URL(request.url);
  const paging = readPageParams(url, 20);
  const status = url.searchParams.get('status') ?? 'ALL';
  if (!paging || !(FOLLOWING_HOST_FILTERS as readonly string[]).includes(status)) {
    return errors.badRequest(request);
  }
  const extra = [...followOverrides]
    .filter(([id, on]) => on && !followingHosts.some((h) => h.hostId === id))
    .map(([id]) => hosts.find((h) => h.hostId === id))
    .filter((h) => h !== undefined)
    .map((h) => {
      const e = h.hostId === 11 ? findPublicEvent(103) : undefined;
      return {
        hostId: h.hostId,
        name: h.name,
        profileImageUrl: h.profileImageUrl,
        representativeEvent: e
          ? {
              eventId: e.eventId,
              name: e.name,
              posterImageUrl: e.posterImageUrl,
              startAt: e.startAt,
              endAt: e.endAt,
              displayStatus: e.displayStatus,
              dDay: e.dDay,
            }
          : null,
      };
    });
  const list = [...extra, ...followingHosts]
    .filter((h) => followOverrides.get(h.hostId) !== false)
    .filter((h) => matchesFollowingFilter(h, status));
  return ok(paginate(list, paging.page, paging.size));
}

/** GM-5 — `year`(2000~9998, 없으면 전체). `years`는 필터와 상관없이 전체 기준 */
function readArchive(request: Request) {
  const url = new URL(request.url);
  const paging = readPageParams(url, 20);
  const rawYear = url.searchParams.get('year');
  const year = rawYear === null ? null : Number(rawYear);
  if (
    !paging ||
    (year !== null &&
      (!Number.isInteger(year) || year < ARCHIVE_YEAR_MIN || year > ARCHIVE_YEAR_MAX))
  ) {
    return errors.badRequest(request);
  }
  const list =
    year === null ? archiveEvents : archiveEvents.filter((e) => e.startAt?.startsWith(`${year}.`));
  return ok({ years: archiveYears, events: paginate(list, paging.page, paging.size) });
}

/**
 * PH-13 PUT·DELETE를 지켜본다(GM-4가 해제를 반영하게). 호스트 fixture(11·12)는 기록만 하고 `host.handlers.ts`로 넘긴다
 * (그쪽의 팔로우 상태와 응답을 그대로 쓴다). 관심 호스트 fixture에만 있는 호스트는 여기서 응답한다.
 * `handlers.ts`에서 호스트 핸들러보다 **앞에** 둔다.
 */
function observeFollow(on: boolean) {
  return ({
    request,
    params,
    cookies,
  }: {
    request: Request;
    params: Record<string, unknown>;
    cookies: Record<string, string>;
  }) => {
    if (requireAuth(request, cookies)) return undefined;
    const id = readId(params.hostId);
    if (id === null) return undefined;
    const known = hosts.some((h) => h.hostId === id);
    const listed = followingHosts.some((h) => h.hostId === id);
    if (!known && !listed) return undefined;
    followOverrides.set(id, on);
    if (known) return undefined;
    return ok({ hostId: id, isFollowing: on, followerCount: on ? 1 : 0 });
  };
}

/**
 * 내 프로필·마이페이지 — GM-1(세션), PM-2, GM-4, GM-5. 기본(`byCookie`)은 백엔드처럼 액세스 토큰 쿠키로 정한다 — 로그인 ·
 * 비로그인(401 `AUTH_401_2`) · 만료(`accessToken=expired` → 401 `AUTH_401_1`, 재발급은 `auth.handlers.ts`) · 위조
 * (`accessToken=forged` → 401 `GLOBAL_401_1` + 액세스 쿠키 삭제). 쿠키 값은 `respond.ts`의 mock 세션 상태.
 * 테스트는 `server.use(...meHandlers.loggedIn)`처럼 상태를 고정한다. PM-3(이미지 발급)은 `upload-handlers.ts`.
 */
export const meHandlers = {
  byCookie: [
    http.get('*/api/v2/me', ({ request, cookies }) => requireAuth(request, cookies) ?? ok(profile)),
  ],
  loggedIn: [http.get('*/api/v2/me', () => ok(profile))],
  anonymous: [http.get('*/api/v2/me', ({ request }) => errors.noToken(request))],
  expired: [http.get('*/api/v2/me', ({ request }) => errors.expiredToken(request))],
  /** P9 — PM-2 · GM-4 · GM-5(기본 목록에 들어 있다) */
  mypage: [
    http.patch(
      '*/api/v2/me',
      ({ request, cookies }) => requireAuth(request, cookies) ?? updateProfile(request),
    ),
    http.get(
      '*/api/v2/me/following-hosts',
      ({ request, cookies }) => requireAuth(request, cookies) ?? listFollowingHosts(request),
    ),
    http.get(
      '*/api/v2/me/archive',
      ({ request, cookies }) => requireAuth(request, cookies) ?? readArchive(request),
    ),
  ] as HttpHandler[],
  /** PH-13 관찰(기본 목록에서 호스트 핸들러보다 앞) */
  followObserver: [
    http.put('*/api/v2/hosts/:hostId/follow', observeFollow(true)),
    http.delete('*/api/v2/hosts/:hostId/follow', observeFollow(false)),
  ] as HttpHandler[],
  /** PM-2가 언제나 이 코드로 실패한다 */
  updateFails: (code: UserErrorCode): HttpHandler[] => [
    http.patch('*/api/v2/me', ({ request }) => userError(request, code)),
  ],
  /** GM-4 두 번째 페이지부터 5xx */
  followingNextPageError: [
    http.get('*/api/v2/me/following-hosts', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0);
      return page > 0 ? errors.serverError(request) : undefined;
    }),
  ] as HttpHandler[],
  /** GM-5 빈 상태(입장한 지난 공연 없음) */
  archiveEmpty: [
    http.get('*/api/v2/me/archive', () => ok({ years: [], events: paginate([], 0, 20) })),
  ] as HttpHandler[],
};
