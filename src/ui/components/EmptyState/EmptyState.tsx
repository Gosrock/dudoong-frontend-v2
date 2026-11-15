import Link from 'next/link';
import type { ReactNode } from 'react';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import * as s from './EmptyState.css';

export type EmptyStateProps = {
  /** 일러스트(`src/ui/illustrations/`의 이미지 등). 170×170 기준 */
  illustration?: ReactNode;
  /** 굵은 제목(Heading/md emphasized) — 예: "주문 완료 !" */
  title?: ReactNode;
  /** 안내 문구(Body/lg, 보조색) — 예: "두둥! 등록한 호스트가 없어요." */
  description?: ReactNode;
  /** 버튼 자리. 보통 `<EmptyStateAction>` */
  action?: ReactNode;
  /**
   * 문구 → 버튼 간격. `md` 24(기본) · `sm` 18(GUI 티켓 없음 `793:20840` — 간격 8 + 버튼 틀 10, 2026-11-08 O22)
   */
  actionGap?: 'md' | 'sm';
  /**
   * 크기 — `lg`(기본, 그림 170 · 제목 20 · 설명 16) · `md`(DS `Empty state size=medium` — 제목 18 · 설명 14 · 묶음 사이 12 ·
   * 문구 → 버튼 22, `actionGap`은 무시). 그림 크기는 넘기는 쪽이 정한다(medium은 150)
   */
  size?: 'lg' | 'md';
  className?: string;
};

/**
 * 빈 화면 배치(GUI `37:758`·`579:2210`·`567:9821`): 일러스트 + 문구 + 버튼.
 * 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  actionGap = 'md',
  size = 'lg',
  className,
}: EmptyStateProps) {
  const md = size === 'md';
  const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
  return (
    <div className={cx(s.root, md && s.medium, className)}>
      {illustration && (
        <div className={cx(s.illustration, md && s.mediumIllustration)}>{illustration}</div>
      )}
      <div className={cx(s.texts, md && s.mediumTexts)}>
        {title && (
          <Txt
            as="p"
            typography={md ? 'headingMd2Emphasized' : 'headingMdEmphasized'}
            color={colors.textPrimary}
          >
            {title}
          </Txt>
        )}
        {description && (
          <Txt as="p" typography={md ? 'bodyMd' : 'bodyLg'} color={colors.textSecondary}>
            {description}
          </Txt>
        )}
      </div>
      {action && (
        <div className={cx(s.actions, md ? s.mediumAction : s.actionGap[actionGap])}>{action}</div>
      )}
    </div>
  );
}

export type EmptyStateActionProps = {
  children: ReactNode;
  /** 앞쪽 아이콘(GUI는 + 아이콘) */
  icon?: ReactNode;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

/** 빈 화면의 검정 버튼. `href`면 링크(next/link), 아니면 버튼 */
export function EmptyStateAction({ children, icon, href, onClick }: EmptyStateActionProps) {
  if (href !== undefined) {
    return (
      <Link href={href} className={s.blackButton}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={s.blackButton} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
