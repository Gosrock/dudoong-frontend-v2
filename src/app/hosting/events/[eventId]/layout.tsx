import { EventScopeView } from '@/features/hosting/event/EventScopeView';

/**
 * 공연 스코프(P11). GE-3으로 메뉴(등록 전 4 / 등록 후 6)·읽기 전용을 정한다 — 브라우저에서만(서버 조회 없음).
 * 비멤버는 공용 403, 없는·지운 공연과 숫자가 아닌 id는 공용 404(클라이언트 판정이라 상태 코드는 200).
 * `/hosting/events/[eventId]`는 페이지 없이 `next.config.ts` `redirects()`로 대시보드에 간다.
 */
export default async function EventScopeLayout({
  children,
  params,
}: LayoutProps<'/hosting/events/[eventId]'>) {
  const { eventId } = await params;
  return <EventScopeView eventId={eventId}>{children}</EventScopeView>;
}
