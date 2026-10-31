import Link from 'next/link';

import { formatKstDotDateWeekdayTime } from '@/api/shared/date';
import { button } from '@/ui/components/Button/Button.css';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketGroupView } from '../model/ticket-groups';

/**
 * 카드 아래 공연명 · 일시 · 티켓 이름(`908:11290`) + [주문상세](DS Button Secondary small `908:11293`).
 * 입장 QR 층 위(`908:11569`)에서는 밝은 글자(`inverse`)로, [주문상세] 없이 — 층 밑에 남는다.
 * 유료 옵션 금액은 보이지 않는다(#29 — "유료옵션 표시 제거").
 */
export function EventInfo({
  group,
  inverse = false,
}: {
  group: TicketGroupView;
  inverse?: boolean;
}) {
  const { event, ticketName } = group.group;
  const date = event?.startAt ? safeDate(event.startAt) : null;
  return (
    <>
      <Txt as="h2" typography="title" color={inverse ? colors.textInverse : colors.textPrimary}>
        {event?.name ?? '삭제된 공연'}
      </Txt>
      {(date || ticketName) && (
        <Txt as="p" typography="bodyLg" color={inverse ? colors.textInverse : colors.textSecondary}>
          {date}
          {date && ticketName && <br />}
          {ticketName}
        </Txt>
      )}
      {!inverse && group.orderHref && (
        <Link href={group.orderHref} className={button({ variant: 'secondary', size: 'sm' })}>
          주문상세
        </Link>
      )}
    </>
  );
}

function safeDate(value: string) {
  try {
    return formatKstDotDateWeekdayTime(value);
  } catch {
    return null;
  }
}
