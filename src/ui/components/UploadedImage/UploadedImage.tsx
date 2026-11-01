import Image from 'next/image';
import type { ComponentProps } from 'react';

import { isOptimizableImage } from '@/utils/image';

type Props = Omit<ComponentProps<typeof Image>, 'src' | 'unoptimized' | 'fill' | 'alt'> & {
  src: string;
  alt: string;
  /** 원본 비율을 알려 주는 값 — 실제 크기는 `className`(CSS)이 정한다 */
  width: number;
  height: number;
};

/**
 * 서버 이미지(포스터 · 커버). 업로드 출처(`src/utils/image.ts`)면 `next/image` 최적화(`/_next/image` — 화면 폭에 맞는 크기 ·
 * webp), 아니면 원본 그대로(`unoptimized`). 폭이 화면에 따라 바뀌면 `sizes`를 준다 — 없으면 `width` 기준 1x · 2x.
 * 운영 nginx의 `/_next/image` 차단은 컷오버 때 지운다(deploy-plan §6 9번, cutover-runbook).
 */
export function UploadedImage({ src, alt, ...rest }: Props) {
  return <Image src={src} alt={alt} unoptimized={!isOptimizableImage(src)} {...rest} />;
}
