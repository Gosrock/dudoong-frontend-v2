import { HostingHomeView } from '@/features/hosting/home/HostingHomeView';

/** 공연준비 홈(P10a). GH-1 · GE-1은 브라우저에서만 — 레이아웃의 게이트가 세션을 확정한 뒤 그린다(서버 조회 없음) */
export default function HostingHomePage() {
  return <HostingHomeView />;
}
