import { NoticeListView } from '@/features/shared/notice/NoticeListView';

/**
 * 호스팅 센터 공지 목록(P9c, GA-1 `audience=HOST` — `ALL` + `HOST` 공지). 브라우저에서만 읽는다 — 레이아웃의 게이트가
 * 세션을 확정한 뒤 그린다(호스팅 센터는 서버 조회 없음). 공지 자체는 공개 GET이라 쿠키를 싣지 않는다.
 */
export default function HostingNoticesPage() {
  return <NoticeListView audience="HOST" />;
}
