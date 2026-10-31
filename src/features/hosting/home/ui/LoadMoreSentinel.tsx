'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

export type LoadMoreState = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: boolean;
  loadMore: () => void;
  retry: () => void;
};

/**
 * 무한 목록 하단(patterns §12) — 화면에 들어오면 다음 페이지를 읽는다. 읽는 중엔 스피너, 실패하면 기존 행을 둔 채 하단 재시도.
 * 공연준비 홈 전용(관객 목록 화면과 나눠 쓰지 않는다 — 병렬 트랙 파일 소유). 두 화면 이상에서 같은 것이 생기면 `src/ui`로 올린다.
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
