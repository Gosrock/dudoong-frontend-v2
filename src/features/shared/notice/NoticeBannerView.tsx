'use client';

import Link from 'next/link';

import type { NoticeAudience } from '@/api/notice/schema';

import { useNoticeBanner } from './model/useNoticeBanner';

/**
 * 상단 배너 한 줄 — 스타일 없는 최소 마크업(P9c-L). 셸(관객 · 호스팅)에 붙이는 것과 모양은 V(P4s-V · P9c-V, 디자인 없음 — Q44).
 * 배너가 없으면 아무것도 그리지 않는다.
 */
export function NoticeBannerView({ audience }: { audience: NoticeAudience }) {
  const { banner, dismiss } = useNoticeBanner(audience);
  if (!banner) return null;
  return (
    <aside aria-label="공지 배너" data-testid="notice-banner">
      <Link href={banner.href}>{banner.title}</Link>
      <button type="button" onClick={dismiss} aria-label="배너 닫기">
        닫기
      </button>
    </aside>
  );
}
