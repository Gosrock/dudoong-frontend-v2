import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { pageInfinite, type PageParams } from '../shared/page';
import {
  type NoticeAudience,
  NoticeBannersSchema,
  NoticeDetailSchema,
  NoticePageSchema,
} from './schema';

/**
 * 서비스 공지(공개 GET — 쿠키 없이 `public: true`). 키는 모두 `['notices', …]` 아래다.
 * 사용자별 값이 없어 서버 조회와 브라우저가 같은 키를 쓴다(patterns §4-2). 변경 API는 없다(작성은 운영 어드민).
 */

export const NOTICES_KEY = ['notices'] as const;

/**
 * GA-1 공지 목록(고정 먼저 → 최신순, Page). 브라우저 `useInfiniteQuery`로만 읽는다 — 무한 목록은 프리페치하지 않는다(patterns §12).
 * `audience`는 언제나 보낸다(서버 기본값 `USER`에 기대지 않는다). 크기 기본 20, 상한 50
 */
export const noticesQuery = (audience: NoticeAudience, params: PageParams = {}) =>
  infiniteQueryOptions({
    ...pageInfinite,
    queryKey: [...NOTICES_KEY, 'list', audience, { size: params.size }],
    queryFn: ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams({ audience, page: String(pageParam) });
      if (params.size !== undefined) searchParams.set('size', String(params.size));
      return api.get('notices', NoticePageSchema, { public: true, searchParams, signal });
    },
  });

/**
 * GA-2 공지 상세. 관객 `/notices/[noticeId]`는 라우트 파일이 `<Prefetch>`로 서버에서 읽고(404 → `notFound()`),
 * 호스팅 센터 `/hosting/notices/[noticeId]`는 브라우저에서 읽는다. 상세는 `audience`와 상관없이 열려 키에 넣지 않는다
 */
export const noticeQuery = (noticeId: string | number) =>
  queryOptions({
    queryKey: [...NOTICES_KEY, 'detail', String(noticeId)],
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api.get(`notices/${encodeURIComponent(noticeId)}`, NoticeDetailSchema, {
        public: true,
        signal,
      }),
  });

/** 배너는 페이지마다 다시 붙는다 — 이동마다 GA-3을 다시 부르지 않게 1분은 신선한 값으로 본다(implementation-log P9c-L Claude 판단) */
export const NOTICE_BANNERS_STALE_MS = 60_000;

/**
 * GA-3 지금 띄울 상단 배너(최신순, 배열). 브라우저에서만 읽는다. 배너는 화면을 막지 않으므로 실패해도
 * 전역 토스트를 띄우지 않는다(`meta.silent` — 배너 없이 둔다, patterns §4-5)
 */
export const noticeBannersQuery = (audience: NoticeAudience) =>
  queryOptions({
    queryKey: [...NOTICES_KEY, 'banners', audience],
    staleTime: NOTICE_BANNERS_STALE_MS,
    meta: { silent: true },
    queryFn: ({ signal }) =>
      api.get('notices/banners', NoticeBannersSchema, {
        public: true,
        searchParams: new URLSearchParams({ audience }),
        signal,
      }),
  });
