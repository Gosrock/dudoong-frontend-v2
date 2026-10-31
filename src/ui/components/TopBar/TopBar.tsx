import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import { Logo } from '../../brand/Logo';
import * as s from './TopBar.css';

export type TopBarNavItem = {
  key: string;
  label: ReactNode;
  href: string;
  /** 지금 있는 곳(굵은 검정). 아니면 `text/tertiary-label` */
  active?: boolean;
};

export type TopBarProps = {
  /** 로고가 가는 곳 */
  logoHref: string;
  /** 글자 메뉴 — "공연 둘러보기" · "공연 준비하기" */
  nav: TopBarNavItem[];
  /** 오른쪽 — 검색 · 벨 · 아바타 ▾ / [로그인] */
  trailing?: ReactNode;
  /** 로고·메뉴를 그릴 링크 컴포넌트(기본 `<a>`). 앱에서는 next/link를 넘긴다 */
  linkAs?: ElementType;
  /** 메뉴 `nav`의 접근성 이름 */
  navLabel?: string;
  /**
   * 지금 있는 곳 표시 없이 모든 메뉴를 검정(`text/primary-label`)으로 — 관객 PC(와이어 `626:19888`, 사용자 결정 2026-10-31).
   * 기본(false)은 `Top bar_Host`대로 지금 있는 곳만 검정, 나머지 `text/tertiary-label`
   */
  plainNav?: boolean;
  className?: string;
};

/**
 * PC 상단 바 — 디자인 시스템 `Top bar_Host`(`538:4262`, GUI `712:1648`). 높이 58, 흰 배경, 아래 선, 좌우 24.
 * 왼쪽 로고 + 글자 메뉴(Heading/sm-emphasized 16), 오른쪽 슬롯(간격 20). 호스팅·관객 PC가 같이 쓴다
 * (관객은 와이어 `626:19888`·`640:17991` — 같은 구성에 검색·[로그인]이 더해진다).
 * 훅이 없어 서버 컴포넌트에서도 쓴다. 폭에 따라 숨기는 것은 부르는 쪽(레이아웃)이 정한다.
 */
export function TopBar({
  logoHref,
  nav,
  trailing,
  linkAs: LinkTag = 'a',
  navLabel = '주 메뉴',
  plainNav = false,
  className,
}: TopBarProps) {
  return (
    <header className={className ? `${s.root} ${className}` : s.root}>
      <div className={s.start}>
        <LinkTag href={logoHref} className={s.logo}>
          <Logo variant="audience" height={40} />
        </LinkTag>
        <nav aria-label={navLabel} className={s.nav} data-plain={plainNav || undefined}>
          {nav.map((item) => (
            <LinkTag
              key={item.key}
              href={item.href}
              className={s.navLink}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </LinkTag>
          ))}
        </nav>
      </div>
      <div className={s.end}>{trailing}</div>
    </header>
  );
}

/** 상단 바 24 아이콘 버튼(벨·검색) — 누르는 영역 40×40(디자인 시스템 2026-10-31). `aria-label` 필수 */
export function TopBarIconButton({
  icon,
  type = 'button',
  className,
  ...rest
}: Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  icon: ReactNode;
  'aria-label': string;
}) {
  return (
    <button
      type={type}
      className={className ? `${s.iconButton} ${className}` : s.iconButton}
      {...rest}
    >
      {icon}
    </button>
  );
}

/** 링크인 아이콘 칸(검색 → 공연 둘러보기 등). 모양은 `TopBarIconButton`과 같다 */
export function TopBarIconLink({
  icon,
  href,
  linkAs: LinkTag = 'a',
  'aria-label': label,
}: {
  icon: ReactNode;
  href: string;
  linkAs?: ElementType;
  'aria-label': string;
}) {
  return (
    <LinkTag href={href} className={s.iconButton} aria-label={label}>
      {icon}
    </LinkTag>
  );
}
