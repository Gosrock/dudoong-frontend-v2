import type { ElementType, ReactNode } from 'react';

import { container } from './layout.css';

/** 페이지 폭과 좌우 여백(Figma 그리드). 화면 최상단 래퍼로 쓴다. */
export function Container({
  as: Tag = 'div',
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  return <Tag className={className ? `${container} ${className}` : container}>{children}</Tag>;
}
