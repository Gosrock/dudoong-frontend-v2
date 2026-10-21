/**
 * 카카오톡 공유 피드 템플릿(Kakao JS SDK `Share.sendDefault({ objectType: 'feed' })`) — 값만 만든다.
 * 공연 상세(P5b)와 선물 링크(P8b)가 같이 쓴다. SDK 준비·호출은 `kakao-sdk.ts`.
 *
 * - 링크는 모바일·PC 모두 같은 공개 주소다. 카카오 앱이 주소의 도메인이 앱 설정(플랫폼 > Web 사이트 도메인)에 있는지 본다.
 * - `imageUrl`은 SDK에서 선택값이다. 포스터가 없으면 넣지 않는다(기본 공유 이미지는 디자인 대기 — P5b-L 보고).
 */

export type KakaoLink = { mobileWebUrl: string; webUrl: string };

export type KakaoFeedTemplate = {
  objectType: 'feed';
  content: {
    title: string;
    description?: string;
    imageUrl?: string;
    link: KakaoLink;
  };
  buttons: { title: string; link: KakaoLink }[];
};

export type FeedInput = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  /** 공유할 공개 주소(절대 주소) */
  url: string;
  /** 버튼 문구. 카카오 버튼 제목은 짧게(8자 안팎) */
  buttonTitle: string;
};

export function kakaoFeedTemplate({
  title,
  description,
  imageUrl,
  url,
  buttonTitle,
}: FeedInput): KakaoFeedTemplate {
  const link = { mobileWebUrl: url, webUrl: url };
  return {
    objectType: 'feed',
    content: {
      title,
      ...(description ? { description } : {}),
      // https만 넣는다 — 카카오 미리보기는 http 이미지를 막을 수 있다
      ...(imageUrl && imageUrl.startsWith('https://') ? { imageUrl } : {}),
      link,
    },
    buttons: [{ title: buttonTitle, link }],
  };
}
