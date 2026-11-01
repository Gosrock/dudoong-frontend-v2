'use client';

import { type CSSProperties, useCallback, useState } from 'react';

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
  /**
   * 프로필 사진 주소. 있으면 원형으로 잘라 보여 준다(사진 변형은 Figma에 없다 — 디자인 확인 대기).
   * 불러오지 못하면(403 · 404 · 네트워크) 캐릭터로 바꾼다 — 깨진 이미지 아이콘을 보이지 않는다(#92-5)
   */
  src?: string | null;
  /** 기본 ""(장식). 옆에 이름이 없을 때만 준다 */
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

/** Figma Avatar. 캐릭터 일러스트 4색 또는 사진. 사진 실패를 기억하려고 클라이언트 컴포넌트다(서버 컴포넌트에서도 그릴 수 있다). */
export function Avatar({
  size = 32,
  color = 'grey',
  src,
  alt = '',
  className,
  style,
}: AvatarProps) {
  // 실패한 주소를 기억한다 — 주소가 바뀌면 다시 시도한다
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = src && failedSrc !== src ? src : null;
  // 서버 HTML의 이미지는 하이드레이션 전에 실패할 수 있어 onError를 놓친다 — 붙을 때 한 번 더 본다
  const checkLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (photo && img && img.complete && img.naturalWidth === 0) setFailedSrc(photo);
    },
    [photo],
  );
  return (
    // 정적 SVG·업로드 사진을 그대로 그린다 — next/image는 Storybook에서 돌지 않고, 업로드 이미지 최적화는 P5a에서 정한다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={checkLoaded}
      src={photo ?? assetSrc(CHARACTERS[color])}
      width={size}
      height={size}
      alt={alt}
      decoding="async"
      data-kind={photo ? 'photo' : 'character'}
      onError={photo ? () => setFailedSrc(photo) : undefined}
      className={className ? `${avatar} ${className}` : avatar}
      style={style}
    />
  );
}
