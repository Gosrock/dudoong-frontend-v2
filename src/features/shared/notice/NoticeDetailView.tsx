'use client';

import Link from 'next/link';

import { isNotFound } from '@/api/errors';
import type { NoticeAudience } from '@/api/notice/schema';
import {
  AsyncBoundary,
  type AsyncBoundaryRejectedProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';

import { noticeListHref, parseNoticeIdParam } from './model/notice-rules';
import { useNoticeDetail } from './model/useNoticeDetail';

/**
 * 공지 상세(`/notices/[noticeId]` · `/hosting/notices/[noticeId]`) — 스타일 없는 최소 마크업(P9c-L). 본문 타이포·날짜 형식은 P9c-V.
 * 없는 공지·숨김 공지(404 `Notice_404_1`)는 공용 404 + 목록으로(관객 상세는 서버가 먼저 `notFound()`).
 */
export function NoticeDetailView({
  noticeId,
  audience,
}: {
  noticeId: string;
  audience: NoticeAudience;
}) {
  const id = parseNoticeIdParam(noticeId);
  const notFound = (
    <NotFoundView
      title="공지를 찾을 수 없어요"
      href={noticeListHref(audience)}
      actionLabel="공지 목록"
    />
  );
  // 숫자가 아닌 id는 부르지 않는다(호스팅 센터 — 관객 라우트는 서버가 먼저 notFound())
  if (id === null) return <main>{notFound}</main>;
  // AsyncBoundary는 rejected를 함수로 부른다(컴포넌트로 그리지 않는다)
  const rejected = (props: AsyncBoundaryRejectedProps) =>
    isNotFound(props.error) ? notFound : <Retry {...props} />;
  return (
    <main>
      <AsyncBoundary rejected={rejected} resetKeys={[id]}>
        <NoticeDetailContent noticeId={id} audience={audience} />
      </AsyncBoundary>
    </main>
  );
}

function Retry({ reset }: AsyncBoundaryRejectedProps) {
  return (
    <div role="alert">
      <p>불러오지 못했어요</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}

function NoticeDetailContent({
  noticeId,
  audience,
}: {
  noticeId: string;
  audience: NoticeAudience;
}) {
  const d = useNoticeDetail(noticeId, audience);
  return (
    <article>
      <h1>{d.notice.title}</h1>
      {d.notice.createdAt && <time data-testid="notice-created-at">{d.notice.createdAt}</time>}
      {d.edited && d.notice.updatedAt && <p>수정 {d.notice.updatedAt}</p>}
      {d.html ? (
        <div data-testid="notice-content" dangerouslySetInnerHTML={{ __html: d.html }} />
      ) : (
        <p>내용이 없어요</p>
      )}
      <Link href={d.listHref}>목록</Link>
    </article>
  );
}
