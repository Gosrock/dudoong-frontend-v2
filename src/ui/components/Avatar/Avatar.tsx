import type { CSSProperties } from 'react';

import { assetSrc } from '../../illustrations/assetSrc';
import grey from '../../illustrations/avatar-grey.svg';
import indigo from '../../illustrations/avatar-indigo.svg';
import orange from '../../illustrations/avatar-orange.svg';
import teal from '../../illustrations/avatar-teal.svg';
import { avatar } from './Avatar.css';

export type AvatarColor = 'teal' | 'orange' | 'indigo' | 'grey';

const CHARACTERS = { teal, orange, indigo, grey } as const;

export type AvatarProps = {
  /**
   * 지름(px). Figma 변형은 24(grey만) · 32 · "40"인데 "40" 변형의 실제 크기는 **45**다 — 그 모양이면 45를 준다.
   * 호스트 행은 60. 숫자는 자유.
   */
  size?: number;
  /** 캐릭터 색. 사진(`src`)이 있으면 쓰지 않는다 */
  color?: AvatarColor;
  /** 프로필 사진 주소. 있으면 원형으로 잘라 보여 준다(사진 변형은 Figma에 없다 — 디자인 확인 대기) */
  src?: string | null;
  /** 기본 ""(장식). 옆에 이름이 없을 때만 준다 */
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

/** Figma Avatar. 캐릭터 일러스트 4색 또는 사진. 훅이 없어 서버 컴포넌트에서도 쓴다. */
export function Avatar({
  size = 32,
  color = 'grey',
  src,
  alt = '',
  className,
  style,
}: AvatarProps) {
  return (
    // 정적 SVG·업로드 사진을 그대로 그린다 — next/image는 Storybook에서 돌지 않고, 업로드 이미지 최적화는 P5a에서 정한다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || assetSrc(CHARACTERS[color])}
      width={size}
      height={size}
      alt={alt}
      decoding="async"
      data-kind={src ? 'photo' : 'character'}
      className={className ? `${avatar} ${className}` : avatar}
      style={style}
    />
  );
}
