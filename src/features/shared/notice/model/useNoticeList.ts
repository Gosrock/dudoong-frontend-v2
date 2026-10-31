'use client';

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { noticesQuery } from '@/api/notice/queries';
import type { NoticeAudience } from '@/api/notice/schema';
import { flattenPages, type PageParams } from '@/api/shared/page';

import { type NoticeRow, toNoticeRow } from './notice-rules';

/**
 * 공지 목록(plan P9c). 관객 `/notices`(`USER` — `ALL` 공지만)와 호스팅 센터 `/hosting/notices`(`HOST` — `ALL` + `HOST`)가 같이 쓴다.
 * `<AsyncBoundary>` 안에서 GA-1을 무한 쿼리로 읽는다(브라우저에서만 — 무한 목록은 프리페치하지 않는다, patterns §12).
 *
 * - 순서는 서버 그대로(고정 먼저 → 최신순). 페이지 사이 중복은 id로 지운다
 * - 다음 페이지 실패는 기존 행을 지우지 않고 `nextPageFailed` + `fetchNext()`로 다시(전역 토스트 없음 — patterns §4-5)
 */
export function useNoticeList(audience: NoticeAudience, params: PageParams = {}) {
  const q = useSuspenseInfiniteQuery(noticesQuery(audience, params));

  const items: NoticeRow[] = useMemo(
    () => flattenPages(q.data, (n) => n.noticeId).map((n) => toNoticeRow(audience, n)),
    [q.data, audience],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  const fetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    empty: items.length === 0,
    hasNext: hasNextPage,
    isFetchingNext: isFetchingNextPage,
    nextPageFailed: q.isFetchNextPageError,
    fetchNext,
  };
}
