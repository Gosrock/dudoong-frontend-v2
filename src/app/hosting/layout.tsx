import { type ReactNode, Suspense } from 'react';

/** 호스팅 센터. 로그인 게이트(P10a), 데스크탑 사이드바 · 모바일 헤더(gui-screens §3)가 붙는다. */
export default function HostingLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
