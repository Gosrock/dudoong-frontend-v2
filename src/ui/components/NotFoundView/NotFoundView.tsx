import type { ReactNode } from 'react';

import { EmptyState, EmptyStateAction } from '../EmptyState/EmptyState';

export type NotFoundViewProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** 버튼이 가는 곳. 호스팅 센터에서는 `/hosting` */
  href?: string;
  actionLabel?: string;
  /** 일러스트(디자인 없음 — 넘기지 않으면 글자만) */
  illustration?: ReactNode;
};

/**
 * 클라이언트 조회 화면의 공용 404 — 남의 주문, 지워진 리소스 등(patterns §11).
 * 서버 조회 화면은 `notFound()`를 쓴다. 화면 디자인이 없어 EmptyState 배치를 따른다.
 */
export function NotFoundView({
  title = '찾을 수 없어요',
  description = '주소가 바뀌었거나 삭제된 페이지예요.',
  href = '/',
  actionLabel = '홈으로',
  illustration,
}: NotFoundViewProps) {
  return (
    <EmptyState
      illustration={illustration}
      title={title}
      description={description}
      action={<EmptyStateAction href={href}>{actionLabel}</EmptyStateAction>}
    />
  );
}
