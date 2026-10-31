'use client';

import { useEffect, useRef } from 'react';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { Button } from '../Button/Button';
import { Spinner } from '../Loader/Loader';

export type LoadMoreState = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: boolean;
  loadMore: () => void;
  retry: () => void;
};

/**
 * 무한 목록 하단(patterns §12) — 화면에 들어오면 다음 페이지를 읽는다. 읽는 중엔 스피너, 실패하면 기존 행을 둔 채 하단 재시도.
 * 공연준비 홈(P10a)과 공연 리스트(P5a)가 같이 쓴다 — 2026-11-01 P5a-V에서 `features/hosting/home/ui`에서 올렸다.
 */
export function LoadMoreSentinel({ list }: { list: LoadMoreState }) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasNextPage, nextPageError, loadMore } = list;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || nextPageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, nextPageError, loadMore]);

  if (list.nextPageError) {
    return (
      <div role="alert">
        <Flex direction="column" align="center" gap={2} paddingY={4}>
          <Txt typography="bodyMd" color={colors.textSecondary}>
            더 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={list.retry}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (!list.hasNextPage) return null;
  return (
    <div ref={ref}>
      <Flex justify="center" paddingY={4}>
        {list.isFetchingNextPage && <Spinner label="더 불러오는 중" />}
      </Flex>
    </div>
  );
}
