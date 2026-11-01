'use client';

import Image from 'next/image';
import { type ComponentProps, type ReactNode, useCallback, useState } from 'react';

import { isOptimizableImage } from '@/utils/image';

type Props = Omit<ComponentProps<typeof Image>, 'src' | 'unoptimized' | 'fill' | 'alt'> & {
  src: string;
  alt: string;
  /** 원본 비율을 알려 주는 값 — 실제 크기는 `className`(CSS)이 정한다 */
  width: number;
  height: number;
  /**
   * 이미지를 불러오지 못했을 때(403 · 404 · 네트워크) 대신 그릴 것 — 보통 이미지가 없을 때와 같은 자리표시
   * (`<Illustration name="poster-placeholder">`). 없으면 아무것도 그리지 않는다 — 깨진 이미지 아이콘을 보이지 않는다(#92-5)
   */
  fallback?: ReactNode;
};

/**
 * 서버 이미지(포스터 · 커버). 업로드 출처(`src/utils/image.ts`)면 `next/image` 최적화(`/_next/image` — 화면 폭에 맞는 크기 ·
 * webp), 아니면 원본 그대로(`unoptimized`). 폭이 화면에 따라 바뀌면 `sizes`를 준다 — 없으면 `width` 기준 1x · 2x.
 * 운영 nginx의 `/_next/image` 차단은 컷오버 때 지운다(deploy-plan §6 9번, cutover-runbook).
 * 불러오지 못하면 `fallback`으로 바꾼다(`ConcertCard`의 회색 빈 상자와 같은 처리 — 스테이징 QA #92-5).
 */
export function UploadedImage({ src, alt, fallback = null, onError, ...rest }: Props) {
  // 실패한 주소를 기억한다 — 주소가 바뀌면 다시 시도한다
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // 서버 HTML의 이미지는 하이드레이션 전에 실패할 수 있어 onError를 놓친다 — 붙을 때 한 번 더 본다
  const checkLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
    },
    [src],
  );
  if (failedSrc === src) return <>{fallback}</>;
  return (
    <Image
      ref={checkLoaded}
      src={src}
      alt={alt}
      unoptimized={!isOptimizableImage(src)}
      onError={(e) => {
        setFailedSrc(src);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
