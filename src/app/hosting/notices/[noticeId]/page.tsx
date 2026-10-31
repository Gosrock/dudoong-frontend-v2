import { NoticeDetailView } from '@/features/shared/notice/NoticeDetailView';

/**
 * 호스팅 센터 공지 상세(P9c, GA-2). 브라우저에서만 읽는다(서버 조회 없음). 숨김·없는 공지와 숫자가 아닌 id는
 * 공용 404(클라이언트 판정이라 상태 코드는 200 — 호스팅 센터의 다른 화면과 같다).
 */
export default async function HostingNoticeDetailPage({
  params,
}: PageProps<'/hosting/notices/[noticeId]'>) {
  const { noticeId } = await params;
  return <NoticeDetailView noticeId={noticeId} audience="HOST" />;
}
