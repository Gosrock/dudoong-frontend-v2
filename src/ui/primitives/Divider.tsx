import type { SpaceKey } from '../theme/types';
import { divider, dividerInset } from './layout.css';

export type DividerProps = {
  direction?: 'horizontal' | 'vertical';
  /**
   * `line`(기본) — 1px 선(`surface.defaultBorder`).
   * `section` — 섹션 사이 회색 띠(높이 space 4, `surface.container`). 흰 섹션을 회색 바탕 위에 띄운 GUI 섹션 간격(체크아웃 `564:4156`).
   * DS 파일에는 Divider 컴포넌트가 없다(2026-11-03 확인) — 두 모양 모두 GUI 화면에서 쓰는 값.
   */
  variant?: 'line' | 'section';
  /** 선 양 끝을 안쪽으로 들이는 여백(가로 선이면 좌우). GUI `567:7924` 총액 위 선 = 좌우 24 → `inset={5}` */
  inset?: SpaceKey;
  className?: string;
};

/**
 * 구분선(patterns §3 — 1px 선 · 섹션 띠를 `.css.ts`로 직접 짜지 않는다). `section`은 꾸밈이라 보조 기술에 알리지 않는다.
 */
export function Divider({
  direction = 'horizontal',
  variant = 'line',
  inset,
  className,
}: DividerProps) {
  const cls = [divider, inset !== undefined && dividerInset[inset], className]
    .filter(Boolean)
    .join(' ');
  return (
    <hr
      className={cls}
      data-direction={direction}
      data-variant={variant}
      data-inset={inset !== undefined ? '' : undefined}
      aria-orientation={variant === 'section' ? undefined : direction}
      aria-hidden={variant === 'section' ? true : undefined}
    />
  );
}
