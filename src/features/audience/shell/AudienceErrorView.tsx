'use client';

import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Container } from '@/ui/primitives/Container';

/** 관객 공용 에러 화면(라우트 `error.tsx`) — 화면 디자인이 없어 EmptyState 배치(NotFoundView와 같다) + [다시 시도] */
export function AudienceErrorView({ retry }: { retry: () => void }) {
  return (
    <Container as="main">
      <EmptyState
        title="화면을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" size="md" onClick={retry}>
            다시 시도
          </Button>
        }
      />
    </Container>
  );
}
