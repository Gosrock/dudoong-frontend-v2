import type { ReactNode } from 'react';

/**
 * 서버 조회 그룹. 캐시하지 않는 데이터를 기다리므로 빈 정적 셸·즉시 이동 검증에서 뺀다(tech-decisions §2).
 * 레이아웃의 false는 밖에서 이 그룹으로 들어오는 이동만 허용한다. 그룹 안 페이지끼리의 이동은
 * 각 page.tsx의 `instant = false`가 맡는다(P0 스파이크에서 확인).
 * 이 그룹에는 Suspense·loading.tsx를 두지 않는다(404 상태 코드 유지).
 */
export const instant = false;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
