import type { ElementType, ReactNode } from 'react';

import { Badge } from '../Badge/Badge';
import * as s from './SidebarMenu.css';

export { sidebarTint } from './SidebarMenu.css';

export type SidebarMenuItemProps = {
  href: string;
  /** 24 아이콘(`<Icon>`) — 20 칸으로 줄여 그린다 */
  icon: ReactNode;
  children: ReactNode;
  /** 지금 있는 곳(Figma `true`) — `aria-current="page"` */
  selected?: boolean;
  /** Figma `alert` — 오른쪽 빨간 숫자 배지. 0이나 없으면 그리지 않는다 */
  badge?: number;
  /** 배지의 스크린리더 이름(예: "승인 대기 3건") */
  badgeLabel?: string;
  /** 링크 컴포넌트(기본 `<a>`). 앱에서는 next/link를 넘긴다 — src/ui는 next에 묶이지 않는다 */
  linkAs?: ElementType;
  onClick?: () => void;
  /** 오버레이(드로어) 안 이동 — `replace`로 연다(patterns §6). `linkAs`가 next/link일 때만 뜻이 있다 */
  replace?: boolean;
};

/**
 * 디자인 시스템 `사이드바 메뉴`(`91:913` — `true` 선택 / `false` / `alert` 숫자 배지). 공연 사이드바(검정 면, 폭 268)의 메뉴 한 줄.
 * Hover·Focus는 Figma에 없어 선택 배경과 같은 값으로 둔다. 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function SidebarMenuItem({
  href,
  icon,
  children,
  selected = false,
  badge,
  badgeLabel,
  linkAs: LinkTag = 'a',
  onClick,
  replace,
}: SidebarMenuItemProps) {
  return (
    <LinkTag
      href={href}
      className={s.item}
      aria-current={selected ? 'page' : undefined}
      onClick={onClick}
      {...(replace ? { replace: true } : {})}
    >
      <span className={s.icon}>{icon}</span>
      <span className={s.label}>{children}</span>
      {badge ? <Badge count={badge} label={badgeLabel} /> : null}
    </LinkTag>
  );
}
