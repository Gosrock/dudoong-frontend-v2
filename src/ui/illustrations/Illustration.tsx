import type { CSSProperties } from 'react';

import { assetSrc, type ImportedAsset } from './assetSrc';
import bookingComplete from './booking-complete.png';
import dashboardApproved from './dashboard-approved.svg';
import dashboardPending from './dashboard-pending.svg';
import dashboardRefund from './dashboard-refund.svg';
import dashboardRejected from './dashboard-rejected.svg';
import gift from './gift.png';
import login from './login.png';
import noSearchResult from './no-search-result.png';
import noTicket from './no-ticket.png';
import posterPlaceholder from './poster-placeholder.png';

/**
 * 이름 → 파일과 Figma 크기(1x). 빈 화면 일러스트 6종은 Figma 벡터가 0.3~6.5MB라 PNG(3x)로 래스터화했고,
 * 작은 `illust_dashboard`(GUI `14:1529`) 4종은 SVG 그대로다.
 * 다시 뽑기: 디자인 시스템 `image` 페이지 노드(포스터 `486:267`, 티켓 없음 `499:1490`, 예매완료 `506:1634`,
 * 선물 `503:1221`, 검색 결과 없음 `506:1721`, login `506:1510`)를 3x PNG로 내보내 같은 이름으로 바꾼다.
 */
const ILLUSTRATIONS = {
  'poster-placeholder': { asset: posterPlaceholder, width: 180, height: 254 },
  'no-ticket': { asset: noTicket, width: 170, height: 170 },
  'booking-complete': { asset: bookingComplete, width: 170, height: 170 },
  gift: { asset: gift, width: 170, height: 170 },
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
