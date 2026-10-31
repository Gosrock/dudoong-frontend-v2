import type { Metadata } from 'next';

import type { EventDetail } from '@/api/event/schema';
import { DEFAULT_OG_IMAGE } from '@/utils/site';

import { eventSummary, eventTitle } from './event-summary';

/**
 * 공연 상세 `generateMetadata`의 값(OG). 카카오 미리보기·검색에 쓰인다 — 크롤러는 JS를 실행하지 않는다(tech-decisions §2).
 *
 * - 제목: 공연 이름(루트 템플릿 `%s | 두둥`). OG 제목은 템플릿 없이 이름만.
 * - 설명: 일시(러닝타임) · 장소 · 호스트. 없으면 사이트 기본 설명.
 * - 이미지: 포스터. 없으면 사이트 기본 OG 이미지(`DEFAULT_OG_IMAGE` — 디자인 대기라 지금은 `null`이고 그러면 넣지 않는다, 이슈 #8).
 * - URL: 요청 `Host`로 만든 공개 주소(canonical과 같다).
 * - 재고·가격·사용자별 값은 넣지 않는다(응답 HTML에 재고 없음 — plan P5b).
 */

export const DEFAULT_DESCRIPTION = '공연 예매와 호스팅을 한 곳에서';

export function eventMetadata(event: EventDetail, pageUrl: string): Metadata {
  const title = eventTitle(event);
  const description = eventSummary(event) ?? DEFAULT_DESCRIPTION;
  // 상대 경로 기본 이미지는 `(public)` 레이아웃의 metadataBase(요청 origin)로 절대 주소가 된다
  const image = event.posterImageUrl ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      siteName: '두둥',
      locale: 'ko_KR',
      title,
      description,
      url: pageUrl,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary' },
  };
}
