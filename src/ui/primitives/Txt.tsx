import type { CSSProperties, ElementType, ReactNode } from 'react';

import { type Typography, typography as typographyClass } from '../theme/typography.css';
import * as s from './Txt.css';

export type { Typography };

export type TxtProps = {
  /** 시맨틱 태그만 바꾼다. 글자 모양은 typography로 정한다(patterns §2) */
  as?: ElementType;
  /** Figma 텍스트 스타일 이름(design-system §1) — bodyMd, labelSm, headingSmEmphasized … */
  typography: Typography;
  /** `colors`의 값(예: `colors.textSecondary`). 없으면 부모 색을 따른다 */
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** 넘치면 말줄임(1줄) 또는 2줄 클램프 */
  lines?: 1 | 2;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * 글자는 이 컴포넌트로만 쓴다. `<p>`·`<h1>`에 글자 스타일을 직접 주지 않는다.
 *
 * ```tsx
 * <Txt typography="bodyMd" color={colors.textSecondary}>설명</Txt>
 * <Txt as="h2" typography="headingSmEmphasized">공연 정보</Txt>
 * ```
 */
export function Txt({
  as: Tag = 'span',
  typography,
  color,
  align,
  lines,
  className,
  style,
  children,
}: TxtProps) {
  const cls = [s.base, typographyClass[typography], lines ? s.lines[lines] : undefined, className]
    .filter(Boolean)
    .join(' ');
  const inline = color || align ? { color, textAlign: align, ...style } : style;
  return (
    <Tag className={cls} style={inline}>
      {children}
    </Tag>
  );
}
