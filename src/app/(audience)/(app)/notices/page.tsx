import type { Metadata } from 'next';

import { NoticeListView } from '@/features/shared/notice/NoticeListView';

export const metadata: Metadata = { title: '공지사항' };

/**
 * 서비스 공지 목록(P9c, GA-1 `audience=USER` — `ALL` 공지만). 게이트 없는 `(app)` 화면 — 무한 목록이라 서버에서 조회하지 않고
 * 브라우저 `useInfiniteQuery`로만 읽는다(patterns §12, 공연 리스트와 같다). 상세는 `(public)/notices/[noticeId]`
 */
export default function NoticesPage() {
  return <NoticeListView audience="USER" />;
}
