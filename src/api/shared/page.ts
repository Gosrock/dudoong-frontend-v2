import type { InfiniteData } from '@tanstack/react-query';
import { z } from 'zod';

/**
 * 백엔드 `V2PageResponse<T>`(api-contract §1 페이지네이션). 커서가 아니라 `page`(0부터)·`size`다.
 * Slice(GN-1 알림함)는 count 쿼리를 하지 않아 `totalElements`·`totalPages`가 `null`이다 —
 * 건수를 쓰는 UI는 이 둘이 `null`일 수 있음을 다룬다. 다음 페이지 판단은 언제나 `hasNext`로 한다.
 */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    content: z.array(item),
    page: z.number().int(),
    size: z.number().int(),
    totalElements: z.number().int().nullable(),
    totalPages: z.number().int().nullable(),
    hasNext: z.boolean(),
  });
}

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number | null;
  totalPages: number | null;
  hasNext: boolean;
};

/** 페이지 파라미터(요청). 생략하면 서버 기본값(카드형 10, 그 밖 20)을 쓴다. */
export type PageParams = { size?: number };

/**
 * 페이지 기반 무한 쿼리의 공통 옵션. `infiniteQueryOptions({ ...pageInfinite, queryKey, queryFn })`로 쓴다(patterns §12).
 * `queryFn`은 `pageParam`(0부터)을 `page` 쿼리로 보낸다.
 */
export const pageInfinite = {
  initialPageParam: 0,
  getNextPageParam: (last: Pick<Page<unknown>, 'page' | 'hasNext'>) =>
    last.hasNext ? last.page + 1 : undefined,
};

/**
 * 무한 목록의 페이지들을 한 배열로 편다. 페이지 방식이라 스크롤 중 새 항목이 끼면 앞 페이지 항목이 다음 페이지에
 * 다시 나온다 — `idOf`로 먼저 나온 것만 남긴다(patterns §12). `useInfiniteQuery`의 `select`나 렌더 직전에 쓴다.
 */
export function flattenPages<T>(
  data: InfiniteData<Pick<Page<T>, 'content'>> | undefined,
  idOf: (item: T) => string | number,
): T[] {
  if (!data) return [];
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const page of data.pages) {
    for (const item of page.content) {
      const id = idOf(item);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

/** 무한 목록 하단이 받는 값 — `src/ui` `LoadMoreSentinel`의 `LoadMoreState`와 같은 모양 */
export type InfiniteListControls = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** 다음 페이지 실패 — 기존 행은 두고 하단 재시도(patterns §12) */
  nextPageError: boolean;
  loadMore: () => void;
  retry: () => void;
};

/** `infiniteListControls`가 읽는 `useInfiniteQuery`·`useSuspenseInfiniteQuery` 결과의 일부 */
export type InfiniteListQuery = {
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown>;
  refetch: () => Promise<unknown>;
};

/**
 * 무한 목록 훅 끝의 하단 제어 묶음(코드 패턴 점검 A11, 2026-11-02). `return { items, ...infiniteListControls(list) }`.
 * - `loadMore`: 다음 페이지가 있고 읽는 중이 아닐 때만, 진행 중인 요청을 취소·재요청하지 않는다(`cancelRefetch: false`)
 * - `retry`: 다음 페이지 실패면 그 페이지만 다시, 아니면 목록 전체를 다시 읽는다
 */
export function infiniteListControls(list: InfiniteListQuery): InfiniteListControls {
  return {
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    nextPageError: list.isFetchNextPageError,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetching) void list.fetchNextPage({ cancelRefetch: false });
    },
    retry: () => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch()),
  };
}
