import { EventInfoView } from '@/features/hosting/event/EventInfoView';

/** 공연 기본 정보(P11 — PE-4 · PE-10 포스터 · GE-11 태그). 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다 */
export default async function EventInfoPage({
  params,
}: PageProps<'/hosting/events/[eventId]/info'>) {
  const { eventId } = await params;
  return <EventInfoView eventId={eventId} />;
}
