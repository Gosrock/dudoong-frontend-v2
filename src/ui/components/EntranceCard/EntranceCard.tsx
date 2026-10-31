import type { ElementType } from 'react';

import { Icon } from '../../icons/Icon';
import { Txt } from '../../primitives/Txt';
import * as s from './EntranceCard.css';

export type EntranceCardProps = {
  /** 입장 수 */
  entered: number;
  /** 분모 — 발급 수(판매 장수가 아니다, plan P13a). 0이면 0/0 */
  total: number;
  /** 아래 링크("QR 체크인 열기") */
  action?: { href: string; label: string };
  linkAs?: ElementType;
  title?: string;
  'data-testid'?: string;
};

/**
 * 대시보드 입장 현황 카드 — 디자인 시스템 `입장 현황`(`652:1902`). 숫자 "입장/발급" + 진행 막대 + "QR 체크인 열기 →".
 */
export function EntranceCard({
  entered,
  total,
  action,
  linkAs: LinkTag = 'a',
  title = '입장 현황',
  'data-testid': testId,
}: EntranceCardProps) {
  const ratio = total === 0 ? 0 : Math.min(entered / total, 1);
  return (
    <section className={s.card} aria-label={title} data-testid={testId}>
      <Txt as="h2" typography="headingMd2Emphasized">
        {title}
      </Txt>
      <div className={s.figure}>
        <Txt typography="headingLgEmphasized">
          {entered.toLocaleString('ko-KR')}/{total.toLocaleString('ko-KR')}
        </Txt>
        <div
          className={s.track}
          role="progressbar"
          aria-label={`${title} — 발급 ${total}장 중 ${entered}장 입장`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={entered}
        >
          <div className={s.fill} style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
      {action && (
        <LinkTag href={action.href} className={s.action}>
          <Txt typography="labelLgEmphasized">{action.label}</Txt>
          <span className={s.actionIcon} aria-hidden>
            <Icon name="forward" />
          </span>
        </LinkTag>
      )}
    </section>
  );
}
