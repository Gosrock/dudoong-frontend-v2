'use client';

import { RouteErrorView } from '@/ui/components/RouteErrorView/RouteErrorView';
import { Container } from '@/ui/primitives/Container';

/**
 * 호스팅 센터의 렌더 오류(tech-decisions §13, 코드 패턴 점검 A5) — `hosting/layout.tsx`(로그인 게이트 + 호스팅 셸)는 남기고 본문만
 * 공용 에러 화면으로 바꾼다. 화면 안 데이터 실패는 먼저 `AsyncBoundary`가 받는다 — 여기는 그 밖에서 난 에러다.
 */
export default function HostingError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Container as="main">
      <RouteErrorView retry={retry} />
    </Container>
  );
}
