import { NotificationInboxView } from '@/features/shared/notification/NotificationInboxView';

/** 알림함(P9b, 보호). 관객과 호스팅 센터의 벨이 모두 여기로 온다(알림함은 하나다). 조회(GN-1)는 브라우저에서 — 게이트가 세션을 확정한 뒤 */
export default function NotificationsPage() {
  return <NotificationInboxView />;
}
