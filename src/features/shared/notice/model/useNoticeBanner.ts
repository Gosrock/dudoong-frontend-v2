'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { noticeBannersQuery } from '@/api/notice/queries';
import type { NoticeAudience } from '@/api/notice/schema';
import { formatKstDateTime, parseKstDateTime } from '@/api/shared/date';

import {
  dismissBanner,
  readDismissedBanners,
  SERVER_DISMISSED,
  subscribeDismissedBanners,
} from './banner-dismissal';
import { noticeHref, visibleBanners } from './notice-rules';

export type NoticeBannerView = {
  id: number;
  /** 텍스트로만 그린다(한 줄) */
  title: string;
  /** 누르면 갈 공지 상세(보는 화면 기준 경로) */
  href: string;
};

/**
 * 상단 배너 한 줄(GA-3, plan P9c · design-requests Q44 기본안). 관객 셸(`USER`)과 호스팅 셸(`HOST`)이 쓴다 — 셸에 붙이는 것은 V.
 *
 * - 서버가 지금 띄울 배너를 최신순으로 준다. 닫지 않았고 끝나지 않은 것 중 첫 번째만 `banner`로 돌려준다(한 줄)
 * - `dismiss()` — 지금 배너를 닫는다. 닫은 id는 이 브라우저에 남아 새로고침해도 다시 뜨지 않는다(`banner-dismissal.ts`).
 *   닫으면 다음 배너가 있으면 그것이 `banner`가 된다
 * - 조회 중·실패는 배너 없음(`meta.silent` — 배너는 화면을 막지 않는다). 닫기 기록은 하이드레이션 뒤에 읽는다
 */
export function useNoticeBanner(
  audience: NoticeAudience,
  { now = () => new Date() }: { now?: () => Date } = {},
) {
  const { data } = useQuery(noticeBannersQuery(audience));
  const dismissed = useSyncExternalStore(
    subscribeDismissedBanners,
    readDismissedBanners,
    () => SERVER_DISMISSED,
  );

  // 분 단위(서버 시각 형식)로 끊어 렌더마다 다시 거르지 않는다
  const nowText = formatKstDateTime(now());
  const live = useMemo(
    () => visibleBanners(data ?? [], new Set(dismissed), parseKstDateTime(nowText)),
    [data, dismissed, nowText],
  );

  const first = live[0];
  const banner: NoticeBannerView | null = first
    ? { id: first.noticeId, title: first.title, href: noticeHref(audience, first.noticeId) }
    : null;

  const firstId = first?.noticeId;
  const dismiss = useCallback(() => {
    if (firstId !== undefined) dismissBanner(firstId);
  }, [firstId]);

  return {
    banner,
    /** 닫지 않은 배너 수(지금 것 포함) */
    remaining: live.length,
    dismiss,
  };
}
