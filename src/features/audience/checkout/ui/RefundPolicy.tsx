'use client';

import { formatKstDotDateTimeWeekday } from '@/api/shared/date';
import { eventHref } from '@/features/shared/routes';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { REFUND_DEADLINE, refundPolicyItems } from '../model/refund-policy';
import type { CheckoutState } from '../model/useCheckout';
import { agreementDetailBody, agreementList, collapseTopLine, textLink } from './checkout.css';
import * as s from './RefundPolicy.css';

// ─── 취소·환불 규정(이슈 #105) ─────────────────────────────

/**
 * 동의 줄("…환불/취소 규정을 확인하였으며…") 바로 위의 규정 보기 — legal-copy A-7 원문(`refundPolicyItems`) + 취소 기한 + 이용약관 ·
 * 공연 상세(호스트가 쓴 환불 기준) 링크. 보지 못한 규정에 동의하지 않게(이슈 #105 ⭐).
 * FIGMA-CUSTOM: 체크아웃 GUI(564:4156)에는 규정 자리가 없다(동의 줄만) → DS Accordion(접힘)으로 최소안. 요약 박스·크기는 디자인 Q79.
 * 🤖 Claude 판단(2026-11-02): 되돌리려면 이 컴포넌트 한 줄을 빼면 된다. 링크는 새 탭 — 고른 옵션을 잃지 않게
 */
export function RefundPolicy({
  c,
  eventId,
  startAt,
}: {
  c: CheckoutState;
  eventId: number;
  startAt: string | null;
}) {
  const items = refundPolicyItems(c.ticket.payType);
  if (!items) return null;
  return (
    <Flex as="section" direction="column" aria-label="취소·환불 규정">
      <Divider variant="section" />
      <Accordion label="취소·환불 규정 보기" className={collapseTopLine}>
        <InfoRow label={REFUND_DEADLINE.label} value={REFUND_DEADLINE.value} />
        {startAt && <InfoRow label="공연 시작" value={formatKstDotDateTimeWeekday(startAt)} />}
        <ol className={`${agreementList} ${agreementDetailBody}`}>
          {items.map((item) => (
            <li key={item}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {item}
              </Txt>
            </li>
          ))}
        </ol>
        <Flex gap={4} wrap className={s.refundPolicyLinks}>
          <a
            href={eventHref(eventId)}
            target="_blank"
            rel="noopener noreferrer"
            className={textLink}
          >
            호스트 환불 기준(공연 상세)
          </a>
          <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={textLink}>
            이용약관
          </a>
        </Flex>
      </Accordion>
    </Flex>
  );
}
