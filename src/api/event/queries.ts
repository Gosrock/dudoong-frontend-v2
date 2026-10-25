import { infiniteQueryOptions, type QueryKey, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  EventChecklistSchema,
  EventDetailSchema,
  EventListPageSchema,
  EventManageSchema,
  EventSectionsSchema,
  type EventSort,
  HomeSchema,
  MyEventPageSchema,
  TagGroupsSchema,
} from './schema';

/** 서버 프리페치 쿼리 — 넘겨받은 직후 다시 조회하지 않게(tech-decisions §4) */
const PREFETCHED_STALE_MS = 30_000;

/** GE-11 공연 태그 목록(공개). 시드로만 바뀐다. */
export const eventTagsQuery = () =>
  queryOptions({
    queryKey: ['tags'],
    staleTime: PREFETCHED_STALE_MS,
    queryFn: ({ signal }) => api.get('tags', TagGroupsSchema, { public: true, signal }),
  });

/** GP-1 공연홈(공개). */
export const homeQuery = () =>
  queryOptions({
    queryKey: ['home'],
    staleTime: PREFETCHED_STALE_MS,
    queryFn: ({ signal }) => api.get('home', HomeSchema, { public: true, signal }),
  });

export type EventListParams = PageParams & {
  /** 공연명 OR 호스트명 부분일치, 50자까지 */
  keyword?: string;
  /** 같은 분류 OR / 분류끼리 AND. 50개까지 */
  tagIds?: readonly number[];
  includePast?: boolean;
  sort?: EventSort;
};

/**
 * queryKey와 요청에 쓰는 정규형. 빈 값은 빼고 `tagIds`는 정렬·중복 제거한다 —
 * 순서만 다른 필터가 캐시를 따로 만들지 않게(patterns §13).
 */
export function normalizeEventListParams(params: EventListParams = {}) {
  const out: {
    keyword?: string;
    tagIds?: number[];
    includePast?: true;
    sort?: EventSort;
    size?: number;
  } = {};
  const keyword = params.keyword?.trim();
  if (keyword) out.keyword = keyword;
  if (params.tagIds?.length) out.tagIds = [...new Set(params.tagIds)].sort((a, b) => a - b);
  if (params.includePast) out.includePast = true;
  if (params.sort && params.sort !== 'UPCOMING') out.sort = params.sort;
  if (params.size !== undefined) out.size = params.size;
  return out;
}

/** GP-2 공연 리스트(공개, 무한 목록). 브라우저 `useInfiniteQuery`로 읽는다 — `<Prefetch>`는 무한 쿼리를 받지 않는다. */
export const eventListQuery = (params?: EventListParams) => {
  const p = normalizeEventListParams(params);
  return infiniteQueryOptions({
    ...pageInfinite,
    queryKey: ['events', 'infinite', p],
    queryFn: ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams();
      if (p.keyword) searchParams.set('keyword', p.keyword);
      // Spring List<Long> 파라미터는 쉼표로 나눈다
      if (p.tagIds) searchParams.set('tagIds', p.tagIds.join(','));
      if (p.includePast) searchParams.set('includePast', 'true');
      if (p.sort) searchParams.set('sort', p.sort);
      searchParams.set('page', String(pageParam));
      if (p.size !== undefined) searchParams.set('size', String(p.size));
      return api.get('events', EventListPageSchema, { public: true, searchParams, signal });
    },
  });
};

/** GP-3 공연 상세(공개). 준비중·삭제·없음은 404 → 서버 조회에서 `notFound()`. */
export const eventDetailQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId)],
    staleTime: PREFETCHED_STALE_MS,
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}`, EventDetailSchema, { public: true, signal }),
  });

/**
 * GP-3 공연 상세 — 사용자별 값. 같은 엔드포인트를 쿠키와 함께 부른다. 비로그인이면 백엔드가 연락처(전화·이메일)를 가려 주므로
 * (#822/#846) 로그인 사용자의 원문 연락처는 여기서만 읽는다. 프리페치하지 않고, 브라우저에서 세션이 있고 연락처를 열 때만
 * `enabled`로 부른다(`useEventContacts`). 화면은 이 응답에서 `contacts`만 읽는다(tech-decisions §4 viewer 쿼리).
 */
export const eventDetailViewerQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'viewer'],
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}`, EventDetailSchema, { signal }),
  });

/**
 * GE-5 섹션 목록(공개). 관객 공연 상세가 서버에서 GP-3과 같이 프리페치한다.
 * 준비중 공연의 섹션은 멤버만 보인다 — 호스팅 센터 미리보기는 쿠키를 싣는 쿼리를 그 Phase에서 따로 둔다.
 */
export const eventSectionsQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'sections'],
    staleTime: PREFETCHED_STALE_MS,
    queryFn: ({ signal }) =>
      api.get(`events/${encodeURIComponent(eventId)}/sections`, EventSectionsSchema, {
        public: true,
        signal,
      }),
  });

// ─── 호스팅 센터 ─────────────────────────────────────────────

/**
 * 내 공연 목록 전체(검색어마다 키가 다르다)의 접두 키 — 공연 등록(PE-8)·삭제(DE-9)·만들기(PE-2)·마스터 양도 뒤 무효화
 * (patterns §22·§23). 호스팅 센터 쿼리 기본값은 `myHostsQuery` 주석과 같다(전역 기본값, 브라우저에서만).
 */
export const MY_EVENTS_KEY = ['me', 'events'] as const;

export type MyEventsParams = PageParams & {
  /** 공연명 부분일치, 50자까지(51자는 400) */
  keyword?: string;
};

/** GE-1 내 공연(로그인, 무한 목록 — patterns §12). 준비중 포함, 최신 생성 순. 카드형 기본 크기 10 */
export const myEventsQuery = (params: MyEventsParams = {}) => {
  const keyword = params.keyword?.trim();
  const p = {
    ...(keyword && { keyword }),
    ...(params.size !== undefined && { size: params.size }),
  };
  return infiniteQueryOptions({
    ...pageInfinite,
    queryKey: [...MY_EVENTS_KEY, 'infinite', p],
    queryFn: ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams();
      if (p.keyword) searchParams.set('keyword', p.keyword);
      searchParams.set('page', String(pageParam));
      if (p.size !== undefined) searchParams.set('size', String(p.size));
      return api.get('me/events', MyEventPageSchema, { searchParams, signal });
    },
  });
};

const managePath = (eventId: string | number) => `events/${encodeURIComponent(eventId)}`;

/**
 * GE-3 공연 관리 상세(일반 멤버 이상, `myRole`·`checklist` 포함). 공연 스코프 레이아웃(`events/[eventId]/layout.tsx`)이
 * 메뉴·읽기 전용 판정에 쓰고, 기본 정보 폼이 처음 값으로 쓴다. 비멤버는 403(`HOST_400_2`), 없는·지운 공연은 404.
 * 키 `['events', id, 'manage']` — 마스터 양도(P10b)가 이 모양(`isEventManageQueryKey`)으로 무효화한다. 호스팅 센터 기본값(브라우저에서만).
 */
export const eventManageQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage'],
    queryFn: ({ signal }) =>
      api.get(`${managePath(eventId)}/manage`, EventManageSchema, { signal }),
  });

/** GE-7 등록 체크리스트(일반 멤버 이상). 대시보드가 준비중일 때만 부른다(등록 뒤에는 쓰지 않는다 — patterns §23) */
export const eventChecklistQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage', 'checklist'],
    queryFn: ({ signal }) =>
      api.get(`${managePath(eventId)}/checklist`, EventChecklistSchema, { signal }),
  });

/**
 * GE-5 섹션 — 호스팅 센터 상세 정보 편집용. 공개 키(`eventSectionsQuery`)와 같은 엔드포인트를 **쿠키와 함께** 부른다:
 * 준비중 공연의 섹션은 활성 멤버만 보인다(그 밖은 404 — `V2ReadEventSectionsUseCase`, 432cce4). 공개 키는 서버 프리페치(쿠키 없음)라 나눈다.
 */
export const eventSectionsManageQuery = (eventId: string | number) =>
  queryOptions({
    queryKey: ['events', String(eventId), 'manage', 'sections'],
    queryFn: ({ signal }) =>
      api.get(`${managePath(eventId)}/sections`, EventSectionsSchema, { signal }),
  });

/**
 * GE-3 키 모양 `['events', id, 'manage', …]`(patterns §4-1 — 경로를 쪼갠 모양). 체크리스트·편집용 섹션도 이 아래에 둔다.
 * 마스터 양도(P10b) 뒤 어느 공연이 그 호스트 것인지 몰라 이 모양 전체를 무효화한다(`queryClient.invalidateQueries({ predicate })`).
 */
export const isEventManageQueryKey = (key: QueryKey) => key[0] === 'events' && key[2] === 'manage';

/**
 * 관객 화면이 읽는 이 공연의 공개 키 — 기본 정보(PE-4)·섹션(PE-6) 저장 뒤 정확히(`exact`) 무효화해 공연 상세를 열면 바로 반영되게 한다
 * (plan P11 "저장·등록 뒤 공연 상세를 열면 바로 반영"). 공연 상세는 서버 조회라 새로 열면 늘 새 값이다 — 브라우저 캐시에 남은 값만 지운다.
 */
export const eventPublicKeys = (eventId: string | number) => [
  eventDetailQuery(eventId).queryKey,
  eventDetailViewerQuery(eventId).queryKey,
  eventSectionsQuery(eventId).queryKey,
];
