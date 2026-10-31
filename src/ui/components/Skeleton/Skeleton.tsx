import { assignInlineVars } from '@vanilla-extract/dynamic';

import * as s from './Skeleton.css';

type Size = number | string;
const toCss = (v: Size) => (typeof v === 'number' ? `${v}px` : v);

export type SkeletonProps = {
  /** block(카드·이미지, 모서리 8) · text(글자 줄, 모서리 4) · circle(아바타) */
  shape?: 'block' | 'text' | 'circle';
  /** 숫자는 px. 기본 100% (circle은 height와 같게) */
  width?: Size;
  /** 숫자는 px. 기본 block 100% · text 1em · circle 40 */
  height?: Size;
  className?: string;
};

/**
 * 로딩 자리표시. 장식이라 스크린리더에는 숨긴다 — 로딩 알림은 감싼 영역(`aria-busy`)이나 ScreenLoader가 한다.
 * 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function Skeleton({ shape = 'block', width, height, className }: SkeletonProps) {
  const h = height ?? (shape === 'text' ? '1em' : shape === 'circle' ? 40 : '100%');
  const w = width ?? (shape === 'circle' ? h : '100%');
  return (
    <span
      aria-hidden
      className={[s.base, s.shape[shape], className].filter(Boolean).join(' ')}
      style={assignInlineVars({ [s.widthVar]: toCss(w), [s.heightVar]: toCss(h) })}
    />
  );
}

/** 글자 여러 줄. 마지막 줄은 60% 폭 */
export function SkeletonText({
  lines = 3,
  width = '100%',
  lineHeight = 14,
}: {
  lines?: number;
  width?: Size;
  /** 줄 높이(px) — 해당 typography 글자 크기에 맞춘다 */
  lineHeight?: number;
}) {
  return (
    <span aria-hidden className={s.lines} style={assignInlineVars({ [s.widthVar]: toCss(width) })}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          shape="text"
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
        />
      ))}
    </span>
  );
}
