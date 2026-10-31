import type { CSSProperties } from 'react';

import { assetSrc, type ImportedAsset } from './assetSrc';
import bookingComplete from './booking-complete.svg';
import dashboardApproved from './dashboard-approved.svg';
import dashboardPending from './dashboard-pending.svg';
import dashboardRefund from './dashboard-refund.svg';
import dashboardRejected from './dashboard-rejected.svg';
import gift from './gift.svg';
import giftCanceled from './gift-canceled.svg';
import giftReturn from './gift-return.svg';
import login from './login.svg';
import noSearchResult from './no-search-result.svg';
import noTicket from './no-ticket.svg';
import posterPlaceholder from './poster-placeholder.svg';

/**
 * 이름 → 파일과 Figma 크기(1x). 모두 Figma에서 내보낸 SVG 원본 그대로다.
 * - 빈 화면 일러스트 6종: 2026-10-25 판에서 벡터가 가벼워져(8~75KB) PNG에서 SVG로 바꿨다(design-system §4-1).
 *   다시 뽑기: 디자인 시스템 `image` 페이지 노드(포스터 `486:267`, 티켓 없음 `499:1490`, 예매완료 `506:1634`,
 *   선물 `503:1221`, 검색 결과 없음 `506:1721`, login `506:1510`)를 SVG로 내보내 같은 이름으로 바꾼다
 *   (REST `GET /v1/images/0QD9tGSt8ZciDqe7ol2gYH?ids=…&format=svg`). 넣기 전에 `<script>`·`<foreignObject>`·
 *   외부 참조(`href`·`url(` 중 `#`로 시작하지 않는 것)가 없는지 본다.
 * - `dashboard-*` 4종: GUI `illust_dashboard`(`14:1529`, 지금은 디자인 시스템 `ic_대시보드` `538:2072`).
 * - `gift-return`·`gift-canceled`(2026-11-01, P8b-V): GUI 화면 파일(`1Cn4WOu6TDaSajbFIuH6fO`)에만 있는 그림 —
 *   반송·취소 완료의 화살표 선물(`939:25480`, 직접 그린 벡터)과 취소된 선물 랜딩의 회색 선물(`939:27124`, DS `img_선물`의 색 덮어쓰기).
 *   다시 뽑기: `GET /v1/images/1Cn4WOu6TDaSajbFIuH6fO?ids=…&format=svg`.
 * 색은 고정이다(`<img>`라 CSS 토큰을 따르지 않는다).
 */
const ILLUSTRATIONS = {
  'poster-placeholder': { asset: posterPlaceholder, width: 180, height: 254 },
  'no-ticket': { asset: noTicket, width: 170, height: 170 },
  'booking-complete': { asset: bookingComplete, width: 170, height: 170 },
  gift: { asset: gift, width: 170, height: 170 },
  'gift-return': { asset: giftReturn, width: 170, height: 170 },
  'gift-canceled': { asset: giftCanceled, width: 170, height: 170 },
  'no-search-result': { asset: noSearchResult, width: 170, height: 170 },
  login: { asset: login, width: 285, height: 273 },
  'dashboard-pending': { asset: dashboardPending, width: 36, height: 36 },
  'dashboard-approved': { asset: dashboardApproved, width: 36, height: 36 },
  'dashboard-rejected': { asset: dashboardRejected, width: 36, height: 36 },
  'dashboard-refund': { asset: dashboardRefund, width: 36, height: 36 },
} satisfies Record<string, { asset: ImportedAsset; width: number; height: number }>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
export const illustrationNames = Object.keys(ILLUSTRATIONS) as IllustrationName[];

export type IllustrationProps = {
  name: IllustrationName;
  /** 표시 폭(px). 없으면 Figma 크기. 높이는 비율대로 */
  width?: number;
  /** 기본 ""(장식). 문구 없이 그림만으로 뜻을 전할 때만 준다 */
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * 빈 화면·로그인·포스터 준비중 일러스트(design-system §4-1). 정적 파일을 `<img>`로 그린다 —
 * 빌드 해시가 붙어 장기 캐시되고, 인라인 SVG처럼 JS 번들을 키우지 않는다. 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function Illustration({ name, width, alt = '', className, style }: IllustrationProps) {
  const spec = ILLUSTRATIONS[name];
  const w = width ?? spec.width;
  const h = Math.round((w * spec.height) / spec.width);
  return (
    // next/image를 쓰지 않는다: 이미 최적화한 정적 파일이라 변환할 것이 없고(unoptimized와 같다),
    // Storybook(react-vite)에서 Next 런타임 없이 그려야 한다(보고서 참고)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetSrc(spec.asset)}
      width={w}
      height={h}
      alt={alt}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
