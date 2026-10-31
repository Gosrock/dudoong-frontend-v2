import type { Metadata } from 'next';

import type { GiftLanding } from '@/api/gift/schema';

/**
 * 선물 랜딩 `generateMetadata`(OG). 공개 값(GG-3 익명 응답)의 **공연·티켓 요약만** 쓴다 — 보낸 사람 닉네임(가린 값 포함)·메모·
 * 사용자별 값은 넣지 않는다(plan P8b 완료 기준). 대기 중이 아니면 요약이 없어 기본 문구.
 * 토큰이 든 주소라 검색에 올리지 않는다(`noindex`). `og:url`·canonical도 넣지 않는다(토큰을 메타에 다시 쓰지 않는다).
 */
export const GIFT_DEFAULT_TITLE = '두둥 티켓 선물';
export const GIFT_DEFAULT_DESCRIPTION = '티켓 선물이 도착했어요. 두둥에서 받아 보세요';

export function giftMetadata(gift: Pick<GiftLanding, 'event' | 'ticket'>): Metadata {
  const eventName = gift.event?.name?.trim();
  const title = eventName ? `${eventName} 티켓 선물` : GIFT_DEFAULT_TITLE;
  const parts = [
    gift.event?.startAt,
    gift.event?.placeName?.trim(),
    gift.ticket?.ticketName?.trim(),
  ].filter((v): v is string => Boolean(v));
  const description = parts.length ? parts.join(' · ') : GIFT_DEFAULT_DESCRIPTION;
  const poster = gift.event?.posterImageUrl;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: '두둥',
      locale: 'ko_KR',
      title,
      description,
      ...(poster ? { images: [{ url: poster, alt: title }] } : {}),
    },
    twitter: { card: poster ? 'summary_large_image' : 'summary' },
  };
}

/** 주소의 선물 토큰 모양(base64url, 백엔드 43자). 틀리면 백엔드를 부르지 않고 404 */
const TOKEN = /^[A-Za-z0-9_-]{1,64}$/;
export const parseGiftToken = (raw: string) => (TOKEN.test(raw) ? raw : null);
