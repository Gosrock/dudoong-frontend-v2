import type { ReactNode } from 'react';

import { EmptyState, EmptyStateAction } from '../EmptyState/EmptyState';

export type ForbiddenViewProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** 버튼이 가는 곳. 호스팅 센터에서는 `/hosting` */
  href?: string;
  actionLabel?: string;
  /** 일러스트(디자인 없음 — 넘기지 않으면 글자만) */
  illustration?: ReactNode;
};

/**
 * 클라이언트 조회 화면의 공용 403 — 호스팅 센터의 다른 호스트 공연 등(patterns §11). 403은 HTTP 상태로 먼저 분기한다.
 * 화면 디자인이 없어 EmptyState 배치를 따른다.
 */
export function ForbiddenView({
  title = '권한이 없어요',
  description = '권한이 있는 계정으로 로그인했는지 확인해 주세요.',
  href = '/',
  actionLabel = '홈으로',
  illustration,
}: ForbiddenViewProps) {
  return (
    <EmptyState
      illustration={illustration}
      title={title}
      description={description}
      action={<EmptyStateAction href={href}>{actionLabel}</EmptyStateAction>}
    />
  );
}
