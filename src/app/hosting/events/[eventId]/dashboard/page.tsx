import { EventDashboardView } from '@/features/hosting/event/EventDashboardView';

/** 공연 대시보드(P11 체크리스트 · 등록 / P13a 등록 후 통계). `?created=1`은 간편 만들기 직후 토스트 상태. 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다 */
export default async function EventDashboardPage({
  params,
}: PageProps<'/hosting/events/[eventId]/dashboard'>) {
  const { eventId } = await params;
  return <EventDashboardView eventId={eventId} />;
}
