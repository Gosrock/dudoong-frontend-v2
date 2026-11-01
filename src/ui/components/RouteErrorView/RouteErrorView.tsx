'use client';

import type { ReactNode } from 'react';

import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';

export type RouteErrorViewProps = {
  /** Next `error.tsx`·`global-error.tsx`의 `retry`(다시 조회 + 다시 그리기) */
  retry: () => void;
  title?: ReactNode;
  description?: ReactNode;
};

/**
 * 라우트 에러 경계의 공용 화면(`error.tsx`·`global-error.tsx` — tech-decisions §13, 코드 패턴 점검 A5). 셸·`<main>`은 부르는 쪽이 정한다.
 * 화면 디자인이 없어 EmptyState 배치 + [다시 시도](`NotFoundView`·관객 `AudienceErrorView`와 같은 문구).
 */
export function RouteErrorView({
  retry,
  title = '화면을 불러오지 못했어요',
  description = '잠시 후 다시 시도해 주세요.',
}: RouteErrorViewProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button variant="secondary" size="md" onClick={retry}>
          다시 시도
        </Button>
      }
    />
  );
}
