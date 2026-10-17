import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { fab } from './Fab.css';

export type FabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  /** 아이콘(보통 `<Icon name="add" />`). 글자는 넣지 않는다 */
  icon: ReactNode;
  /** 아이콘만 있으므로 접근성 이름이 필수다 */
  'aria-label': string;
};

/**
 * 원형 아이콘 버튼(FAB, Figma Button `round`). 위치(화면 오른쪽 아래 고정 등)는 쓰는 화면이 정한다.
 * 훅이 없어 서버 컴포넌트에서도 쓰지만, onClick을 주려면 부르는 쪽이 클라이언트 컴포넌트여야 한다.
 */
export function Fab({ icon, className, type = 'button', ...rest }: FabProps) {
  return (
    <button type={type} className={className ? `${fab} ${className}` : fab} {...rest}>
      {icon}
    </button>
  );
}
