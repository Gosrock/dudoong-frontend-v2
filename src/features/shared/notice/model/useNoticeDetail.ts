'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { noticeQuery } from '@/api/notice/queries';
import type { NoticeAudience } from '@/api/notice/schema';

import { renderNoticeHtml } from './notice-html';
import { isNoticeEdited, noticeListHref } from './notice-rules';

/**
 * 공지 상세(GA-2, plan P9c). 관객 상세는 라우트가 서버에서 미리 읽어 두고(없으면 `notFound()`), 호스팅 센터 상세는
 * 여기서 처음 읽는다 — 없는 공지(`Notice_404_1`)는 `<AsyncBoundary>`의 `rejected`가 공용 404로 그린다.
 *
 * - 제목은 텍스트로만, 본문은 `html`(섹션 뷰어와 같은 sanitize를 거친 값)만 `dangerouslySetInnerHTML`로 넣는다. 비면 null
 * - `listHref` — 보는 화면의 목록(관객 `/notices`, 호스팅 `/hosting/notices`)
 */
export function useNoticeDetail(noticeId: string, audience: NoticeAudience) {
  const { data: notice } = useSuspenseQuery(noticeQuery(noticeId));
  const html = useMemo(() => renderNoticeHtml(notice.content), [notice.content]);
  return {
    notice,
    html,
    hostOnly: notice.target === 'HOST',
    edited: isNoticeEdited(notice),
    listHref: noticeListHref(audience),
  };
}
