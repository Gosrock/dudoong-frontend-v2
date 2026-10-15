import { type ReactNode, Suspense } from 'react';

/** 클라이언트 조회 그룹. 게이트 없는 화면(/events, /login)은 useQuery만 쓴다(tech-decisions §3). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
