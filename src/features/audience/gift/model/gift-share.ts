import {
  type KakaoFeedTemplate,
  kakaoFeedTemplate,
} from '@/features/shared/kakao-share/model/feed-template';

/**
 * 선물 링크 공유 내용(patterns §18, `455:8935`) — [메시지] `sms:` · [카카오톡] · [링크 복사] 세 가지.
 * 링크는 `origin + linkPath`(서버는 경로만 준다). 공유 내용에는 공연·티켓 요약만 넣는다 — 메모·보낸 사람 이름은 넣지 않는다.
 * 토큰은 이 주소 밖(로그·외부 SDK 메타데이터)에 넣지 않는다(tech-decisions §20).
 */

export type GiftShareInput = {
  /** 보통 `location.origin` */
  origin: string;
  /** `/gifts/{giftToken}` */
  linkPath: string;
  eventName: string | null;
  posterImageUrl: string | null;
  ticketName: string | null;
};

export type GiftShare = {
  /** 받는 사람이 열 주소(링크 복사 값) */
  url: string;
  /** [메시지] — 문자 앱을 연다. 본문은 카카오 공유와 같은 제목 · 공연·티켓 요약 · 링크(이슈 #106 §1 — 링크만 가면 무엇인지 모른다) */
  smsHref: string;
  /** [카카오톡] — `shareKakaoFeed`에 넘긴다(실패하면 부르는 쪽이 링크 복사) */
  kakao: KakaoFeedTemplate;
};

/** 공유 제목 — 카카오 공유 제목과 문자 첫 줄이 같다. 보낸 사람 이름은 넣지 않는다(위 주석) */
export const GIFT_SHARE_TITLE = '두둥 티켓 선물이 도착했어요';

export function giftLinkUrl(origin: string, linkPath: string): string {
  const path = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
  return `${origin.replace(/\/+$/, '')}${path}`;
}

export function giftShare({
  origin,
  linkPath,
  eventName,
  posterImageUrl,
  ticketName,
}: GiftShareInput): GiftShare {
  const url = giftLinkUrl(origin, linkPath);
  const description = [eventName?.trim(), ticketName?.trim()].filter(Boolean).join(' · ');
  const smsBody = [GIFT_SHARE_TITLE, description, url].filter(Boolean).join('\n');
  return {
    url,
    smsHref: `sms:?body=${encodeURIComponent(smsBody)}`,
    kakao: kakaoFeedTemplate({
      title: GIFT_SHARE_TITLE,
      description: description || null,
      imageUrl: posterImageUrl,
      url,
      buttonTitle: '선물 받기',
    }),
  };
}
