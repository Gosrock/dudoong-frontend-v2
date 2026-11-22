import type { ElementType, ReactNode } from 'react';

import { Icon } from '../../icons/Icon';
import { Skeleton } from '../Skeleton/Skeleton';
import * as s from './StatCard.css';

export type StatCardProps = {
  href: string;
  /** 36 그림(`<Illustration name="dashboard-*" />` — 디자인 시스템 `ic_대시보드`) */
  icon: ReactNode;
  label: string;
  /** "n건"으로 그린다. `loading`이면 쓰지 않는다 */
  count: number;
  /** 수치를 불러오는 중 — 숫자 자리에 스켈레톤 48×22(GUI `1887:2127` · `1901:34559` — Design Sync #323 · #329) */
  loading?: boolean;
  /** 링크 컴포넌트(기본 `<a>`). 앱에서는 next/link — src/ui는 next에 묶이지 않는다 */
  linkAs?: ElementType;
  'data-testid'?: string;
};

/**
 * FIGMA-CUSTOM: 모바일 통계 카드(gui 1845:21576 "대시보드 모바일 버튼") 화면 로컬 컴포넌트가 DS `승인 메뉴_mobile`을 대신함(11-21 DS 판에서 삭제) → 화면대로(R1)
 * 대시보드 통계 카드 — 모바일 GUI `대시보드 모바일 버튼`(`1845:21576`, Design Sync #335 — 2×2, 오른쪽 위 ↗ 18) · PC 디자인 시스템
 * `승인 메뉴_desktop`(`538:2562`, 한 줄 4개 + ↗ 24). 카드 전체가 링크다. 호버는 #000000 5% 겹침(`1887:1876` · `1880:33697`).
 */
export function StatCard({
  href,
  icon,
  label,
  count,
  loading = false,
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
        {loading ? (
          <span className={s.countSkeleton} data-testid={testId && `${testId}-loading`}>
            <Skeleton width={48} height={22} />
          </span>
        ) : (
          <span className={s.count}>{count.toLocaleString('ko-KR')}건</span>
        )}
      </span>
      <span className={s.arrow} aria-hidden>
        <Icon name="diagonal" />
      </span>
    </LinkTag>
  );
}
