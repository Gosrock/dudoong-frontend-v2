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
  className,
}: EmptyStateProps) {
  return (
    <div className={[s.root, className].filter(Boolean).join(' ')}>
      {illustration && <div className={s.illustration}>{illustration}</div>}
      <div className={s.texts}>
        {title && (
          <Txt as="p" typography="headingMdEmphasized" color={colors.textPrimary}>
            {title}
          </Txt>
        )}
        {description && (
          <Txt as="p" typography="bodyLg" color={colors.textSecondary}>
            {description}
          </Txt>
        )}
      </div>
      {action && <div className={s.actions}>{action}</div>}
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
