import type { ElementType, ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import * as s from './StatCard.css';

export type StatCardProps = {
  href: string;
  /** 36 그림(`<Illustration name="dashboard-*" />` — 디자인 시스템 `ic_대시보드`) */
  icon: ReactNode;
  label: string;
  /** "n건"으로 그린다 */
  count: number;
  /** 링크 컴포넌트(기본 `<a>`). 앱에서는 next/link — src/ui는 next에 묶이지 않는다 */
  linkAs?: ElementType;
  'data-testid'?: string;
};

/**
 * 대시보드 통계 카드 — 디자인 시스템 `승인 메뉴_mobile`(`605:1665`, 모바일 2×2) · `승인 메뉴_desktop`(`538:2562`, PC 한 줄 4개 + ↗).
 * 카드 전체가 링크다(PC의 ↗가 링크 표시). 모바일 카드에는 ↗가 없지만 같은 곳으로 간다.
 */
export function StatCard({
  href,
  icon,
  label,
  count,
  linkAs: LinkTag = 'a',
  'data-testid': testId,
}: StatCardProps) {
  return (
    <LinkTag href={href} className={s.card} data-testid={testId}>
      <span className={s.icon} aria-hidden>
        {icon}
      </span>
      <span className={s.text}>
        <span className={s.label}>{label}</span>
        <span className={s.count}>{count.toLocaleString('ko-KR')}건</span>
      </span>
      <span className={s.arrow} aria-hidden>
        <Icon name="diagonal" />
      </span>
    </LinkTag>
  );
}
