import type { SVGProps } from 'react';

import {
  HOST_BUBBLE_PATH,
  HOST_BUBBLE_WITH_TEXT_PATH,
  HOST_VIEWBOX,
  HOST_WORDMARK_PATH,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from './logoPaths';

type SvgAttrs = Omit<
  SVGProps<SVGSVGElement>,
  'children' | 'viewBox' | 'width' | 'height' | 'ref' | 'dangerouslySetInnerHTML'
>;

export type LogoProps = SvgAttrs & {
  /** 관객 "dudoong" / 호스팅 "dudoong host" */
  variant?: 'audience' | 'host';
  /** 높이(px). 폭은 비율대로. 기본은 Figma 원본 크기(관객 75×41, 호스팅 75×48 — 두 로고의 폭이 같다) */
  height?: number;
  /** 접근성 이름. 기본 "두둥"(호스팅은 "두둥 호스트"). 옆에 같은 글이 있으면 ""로 장식 처리 */
  title?: string;
};

const RATIO = { audience: 75 / 41, host: 75 / 48 };

/**
 * 두둥 로고(Figma GUI 화면 `logo` 페이지). 인라인 SVG라 색은 `currentColor`(글자색)를 따른다.
 * 호스팅 로고의 "host" 말풍선 글자는 원본이 흰색인데, 배경색이 무엇이든 맞도록 말풍선에서 뚫어 한 색으로 그린다.
 * 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function Logo({ variant = 'audience', height: h, title, ...rest }: LogoProps) {
  const height = h ?? (variant === 'host' ? 48 : 41);
  const label = title ?? (variant === 'host' ? '두둥 호스트' : '두둥');
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={variant === 'host' ? HOST_VIEWBOX : WORDMARK_VIEWBOX}
      height={height}
      width={Math.round(height * RATIO[variant] * 100) / 100}
      fill="currentColor"
      focusable="false"
      {...a11y}
      {...rest}
    >
      {variant === 'host' ? (
        <>
          <path d={HOST_WORDMARK_PATH} />
          <path d={HOST_BUBBLE_PATH} fill="none" stroke="currentColor" />
          <path d={HOST_BUBBLE_WITH_TEXT_PATH} fillRule="evenodd" />
        </>
      ) : (
        <path d={WORDMARK_PATH} />
      )}
    </svg>
  );
}
