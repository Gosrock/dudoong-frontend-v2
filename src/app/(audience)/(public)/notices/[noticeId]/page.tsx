import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { noticeQuery } from '@/api/notice/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { serverQuery } from '@/api/server/serverQuery';
import { AudienceSubHeader } from '@/features/audience/shell/AudienceSubHeader';
import { parseNoticeIdParam } from '@/features/shared/notice/model/notice-rules';
import { NoticeDetailView } from '@/features/shared/notice/NoticeDetailView';

/** 서버 조회 페이지는 페이지마다 instant=false를 둔다(tech-decisions §2). 이 위에 Suspense·loading.tsx를 두지 않는다(404 상태 코드). */
export const instant = false;

type Props = { params: Promise<{ noticeId: string }> };

async function readNoticeId(params: Props['params']) {
  const noticeId = parseNoticeIdParam((await params).noticeId);
  if (noticeId === null) notFound();
  return noticeId;
}

/** 탭 제목만 둔다(공지 제목). 같은 요청 QueryClient라 GA-2 조회는 한 번이다. 숨김·없는 공지는 `notFound()` */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const notice = await serverQuery(noticeQuery(await readNoticeId(params)));
  return { title: notice.title };
}

/**
 * 서비스 공지 상세(P9c, GA-2 공개 — 토큰 없이 서버에서). 공지 링크를 공유할 수 있게 상세는 `audience`와 상관없이 열린다
 * (백엔드 `V2ReadNoticesUseCase.detail`). 본문 HTML은 화면에서 한 번 더 sanitize한다.
 */
export default async function NoticeDetailPage({ params }: Props) {
  const noticeId = await readNoticeId(params);
  return (
    <Prefetch queries={[noticeQuery(noticeId)]}>
      <AudienceSubHeader title="공지사항" fallbackHref="/notices" />
      <NoticeDetailView noticeId={noticeId} audience="USER" />
    </Prefetch>
  );
}
