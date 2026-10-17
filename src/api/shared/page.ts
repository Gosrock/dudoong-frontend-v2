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
