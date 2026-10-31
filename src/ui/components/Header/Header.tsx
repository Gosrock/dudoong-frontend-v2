import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import { Logo } from '../../brand/Logo';
import { Icon } from '../../icons/Icon';
import * as s from './Header.css';

export type HeaderProps = {
  /** 제목. 없으면 Figma `no title` */
  title?: ReactNode;
  /** 제목 태그. 기본 h1 */
  titleAs?: ElementType;
  /** 제목 정렬. Figma Default는 start, only title·Title+Backward는 center. 로고형은 항상 center */
  align?: 'start' | 'center';
  /** 로고형 헤더(GUI `basic title` = audience, `host title` = host). 주면 제목 대신 로고를 가운데에 그린다 */
  logo?: 'audience' | 'host';
  /**
   * 공연 전환형(Figma `Default, leading icon=true, profile=false`): 제목 옆 ▾ + 아랫줄 공연 이름.
   * 전환 메뉴는 디자인이 없어 클릭 슬롯만 둔다.
   */
  switcher?: {
    /** 아랫줄(공연 이름) */
    subtitle: ReactNode;
    onClick?: () => void;
    /** 버튼 접근성 이름. 기본은 제목 글자 */
    'aria-label'?: string;
  };
  /** 뒤로가기 버튼. `leading`보다 먼저 그린다 */
  onBack?: () => void;
  /** 뒤로가기를 링크로. `linkAs`로 next/link를 넘기면 클라이언트 이동 */
  backHref?: string;
  /** `backHref`를 그릴 링크 컴포넌트(기본 `<a>`). src/ui는 next/link에 묶이지 않는다 — Storybook에서 돌지 않아서 */
  linkAs?: ElementType;
  /** 뒤로가기 접근성 이름. 기본 "뒤로 가기" */
  backLabel?: string;
  /** 왼쪽 슬롯(Figma Slot) — 햄버거 메뉴 등 */
  leading?: ReactNode;
  /** 오른쪽 슬롯(Figma Slot2 + profile) — 벨, 아바타 등 */
  trailing?: ReactNode;
  className?: string;
};

/**
 * 관객·호스팅 공용 모바일 헤더(Figma Top app bar + GUI 로컬 로고 헤더). 레이아웃 파일이 감싸 sticky 등을 정한다.
 * 훅이 없어 서버 컴포넌트에서도 쓴다(`onBack`·`switcher.onClick`을 주려면 부르는 쪽이 클라이언트여야 한다).
 */
export function Header({
  title,
  titleAs: TitleTag = 'h1',
  align = 'start',
  logo,
  switcher,
  onBack,
  backHref,
  linkAs: LinkTag = 'a',
  backLabel = '뒤로 가기',
  leading,
  trailing,
  className,
}: HeaderProps) {
  const effectiveAlign = logo ? 'center' : align;

  const back = onBack ? (
    <button type="button" className={s.iconButton} aria-label={backLabel} onClick={onBack}>
      <Icon name="backward" />
    </button>
  ) : backHref ? (
    <LinkTag href={backHref} className={s.iconButton} aria-label={backLabel}>
      <Icon name="backward" />
    </LinkTag>
  ) : null;

  let center: ReactNode = null;
  if (logo) {
    center = (
      <TitleTag className={s.title}>
        <Logo variant={logo} />
      </TitleTag>
    );
  } else if (title !== undefined && switcher) {
    center = (
      <>
        <TitleTag className={s.title}>
          <button
            type="button"
            className={s.titleButton}
            onClick={switcher.onClick}
            aria-label={switcher['aria-label']}
          >
            <span className={s.ellipsis}>{title}</span>
            <span className={s.switchMark} aria-hidden>
              <Icon name="chevron-down" size={12} />
            </span>
          </button>
        </TitleTag>
        <span className={s.subtitle}>{switcher.subtitle}</span>
      </>
    );
  } else if (title !== undefined) {
    center = <TitleTag className={s.title}>{title}</TitleTag>;
  }

  const hasLeading = Boolean(back || leading);
  const grid = effectiveAlign === 'start' && !hasLeading ? 'startNoLeading' : effectiveAlign;
  return (
    <header className={[s.root, s.align[grid], className].filter(Boolean).join(' ')}>
      {grid === 'startNoLeading' ? null : (
        <div className={`${s.slot} ${s.leadingSlot}`}>
          {back}
          {leading}
        </div>
      )}
      <div className={`${s.center} ${s.centerAlign[effectiveAlign]}`}>{center}</div>
      <div className={`${s.slotEnd} ${s.trailingSlot}`}>{trailing}</div>
    </header>
  );
}

/** 헤더 슬롯용 24 아이콘 버튼(햄버거·벨 등). `aria-label` 필수 */
export function HeaderIconButton({
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
