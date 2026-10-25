import { NewEventView } from '@/features/hosting/event/NewEventView';

/**
 * 간편 공연 만들기(P11). `?step=1|2` + 지역 상태(tech-decisions §3). GH-1 · PH-2 · PE-2는 브라우저에서만 —
 * 레이아웃의 게이트가 세션을 확정한 뒤 그린다(서버 조회 없음). 만든 뒤 대시보드로(design-requests Q7 기본안)
 */
export default function NewEventPage() {
  return <NewEventView />;
}
