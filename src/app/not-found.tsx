import type { Metadata } from 'next';

import { AudienceShell } from '@/features/audience/shell/AudienceShell';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Container } from '@/ui/primitives/Container';

export const metadata: Metadata = { title: '찾을 수 없어요' };

/**
 * 어느 라우트에도 맞지 않는 주소(루트 not-found는 루트 레이아웃 안이라 관객 셸이 없다) — 관객 셸을 직접 둘러 그린다(P4s-V).
 * 호스팅 주소(`/hosting/없는-경로`)도 여기로 온다.
 */
export default function RootNotFound() {
  return (
    <AudienceShell>
      <Container as="main">
        <NotFoundView />
      </Container>
    </AudienceShell>
  );
}
