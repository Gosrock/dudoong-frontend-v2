'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useActivityMarker } from '../../hooks/useActivityMarker';
import { fab } from './Fab.css';
import { FAB_ATTR } from './fab-attrs';

export type FabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  /** 아이콘(보통 `<Icon name="add" />`). 글자는 넣지 않는다 */
  icon: ReactNode;
  /** 아이콘만 있으므로 접근성 이름이 필수다 */
  'aria-label': string;
};

/**
 * 원형 아이콘 버튼(FAB, Figma Button `round`). 위치(화면 오른쪽 아래 고정 등)는 쓰는 화면이 정한다.
 * `data-fab`를 달아 모바일 토스트가 이 버튼 위로 올라가게 한다(I-h2). 그려 두고 숨기는 화면은 `data-fab-hidden`을 준다.
 */
export function Fab({ icon, className, type = 'button', ...rest }: FabProps) {
  const ref = useActivityMarker<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type={type}
      className={className ? `${fab} ${className}` : fab}
      {...{ [FAB_ATTR]: '' }}
      {...rest}
    >
      {icon}
    </button>
  );
}
