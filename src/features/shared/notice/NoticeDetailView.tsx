'use client';

import Link from 'next/link';

import { isNotFound } from '@/api/errors';
import type { NoticeAudience } from '@/api/notice/schema';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { button } from '@/ui/components/Button/Button.css';
import { Chip } from '@/ui/components/Chip/Chip';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Container } from '@/ui/primitives/Container';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { noticeDateText } from './model/notice-format';
import { noticeListHref, parseNoticeIdParam } from './model/notice-rules';
import { useNoticeDetail } from './model/useNoticeDetail';
import * as s from './NoticeDetailView.css';

/**
 * 공지 상세(`/notices/[noticeId]` · `/hosting/notices/[noticeId]`, P9c-V) — **디자인 없음**(design-requests Q44 기본안).
 * 고정 칩 · 제목(전체, 줄바꿈) · 날짜(+ 수정 날짜) / 선 / 본문 — 섹션 뷰어(`SectionViewer`, P5b-V)와 같은 타이포 / [목록으로].
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
  const rejected = (props: ErrorFallbackProps) =>
    isNotFound(props.error) ? notFound : <Retry {...props} />;
  return (
    <main>
      <Container className={s.page}>
        <AsyncBoundary rejected={rejected} resetKeys={[id]}>
          <NoticeDetailContent noticeId={id} audience={audience} />
        </AsyncBoundary>
      </Container>
    </main>
  );
}

function Retry({ reset }: ErrorFallbackProps) {
  return <InlineError className={s.retry} message="불러오지 못했어요" onRetry={reset} />;
}

function NoticeDetailContent({
  noticeId,
  audience,
}: {
  noticeId: string;
  audience: NoticeAudience;
}) {
  const detail = useNoticeDetail(noticeId, audience);
  const created = noticeDateText(detail.notice.createdAt, 'dateTime');
  const updated = detail.edited ? noticeDateText(detail.notice.updatedAt, 'dateTime') : null;
  return (
    <article className={s.article}>
      <header className={s.head}>
        {(detail.notice.pinned || detail.hostOnly) && (
          <Flex gap={1}>
            {detail.notice.pinned && (
              <Chip color="violet" theme="weak">
                고정
              </Chip>
            )}
            {detail.hostOnly && <Chip>공연준비</Chip>}
          </Flex>
        )}
        <Txt as="h1" typography="headingLgEmphasized" className={s.title}>
          {detail.notice.title}
        </Txt>
        {(created || updated) && (
          <Txt typography="labelMd" color={colors.textTertiaryLabel}>
            {created && <time data-testid="notice-created-at">{created}</time>}
            {created && updated && ' · '}
            {updated && <span>수정 {updated}</span>}
          </Txt>
        )}
      </header>
      <Divider />
      <div className={s.body}>
        {detail.html ? (
          <div data-testid="notice-content">
            <SectionViewer html={detail.html} />
          </div>
        ) : (
          <Txt as="p" typography="bodyLg" color={colors.textTertiary}>
            내용이 없어요
          </Txt>
        )}
      </div>
      <Divider />
      <div className={s.footer}>
        <Link href={detail.listHref} className={button({ variant: 'secondary', size: 'md' })}>
          목록으로
        </Link>
      </div>
    </article>
  );
}
