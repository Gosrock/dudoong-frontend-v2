'use client';

import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { TicketView } from '../model/ticket-state';
import type { TicketSelection } from '../model/useTicketSelection';
import * as s from './TicketOptionList.css';

export const formatTicketPrice = (price: number) =>
  price === 0 ? '무료' : `${price.toLocaleString('ko-KR')}원`;

/** 티켓 설명 아래 작은 줄 — `인당 3매 제한 / 호스트 승인 후 확정`(와이어 `640:1957`) */
export function ticketConditions(t: TicketView['ticket']) {
  return [
    t.purchaseLimit !== null ? `인당 ${t.purchaseLimit}매 제한` : null,
    t.approvalRequired ? '호스트 승인 후 확정' : '구매 후 자동 확정',
  ]
    .filter(Boolean)
    .join(' / ');
}

const STATE_CHIP: Partial<Record<TicketView['state'], string>> = {
  SUSPENDED: '판매 중단',
  SOLD_OUT: '매진',
  NOT_ON_SALE: '판매 종료',
};

/**
 * 티켓 옵션 목록(모바일 "Ticket Options" 카드 `121:1216` · PC 오른쪽 카드 `640:1957`) — **표시만**. 고르기는 P6-V.
 * GP-5는 브라우저에서 읽는다(응답 HTML에 재고 값이 없어야 한다). 판매 중단은 딤드(Q33).
 */
export function TicketOptionList({
  selection,
  headingId,
}: {
  selection: Pick<TicketSelection, 'status' | 'tickets' | 'listState' | 'refetch'>;
  headingId: string;
}) {
  if (selection.status === 'pending') {
    return (
      <Flex direction="column" gap={3} fullWidth>
        <Skeleton height={64} />
        <Skeleton height={64} />
      </Flex>
    );
  }
  if (selection.status === 'error') {
    return (
      <div role="alert">
        <Flex direction="column" align="center" gap={3} fullWidth>
          <Txt typography="bodyMd" color={colors.textSecondary}>
            티켓 정보를 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={() => void selection.refetch()}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (selection.tickets.length === 0) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textTertiary}>
        {selection.listState === 'EVENT_ENDED' ? '지난 공연이에요' : '판매 중인 티켓이 없어요'}
      </Txt>
    );
  }
  return (
    <ul className={s.list} aria-labelledby={headingId}>
      {selection.tickets.map((view, i) => {
        const t = view.ticket;
        const chip = STATE_CHIP[view.state];
        // 판매 중단은 딤드(Q33) — 글자를 DS 비활성 글자색으로
        const dim = view.state === 'SUSPENDED' ? colors.textDisabledLabel : undefined;
        return (
          <li key={t.ticketItemId}>
            {i > 0 && <Divider />}
            <Flex justify="space-between" align="flex-start" gap={3} paddingY={3}>
              <Flex direction="column" gap={1} className={s.main}>
                <Txt typography="headingSmEmphasized" color={dim}>
                  {t.name ?? '티켓'}
                </Txt>
                {t.description && (
                  <Txt typography="bodyMd" color={dim ?? colors.textSecondary}>
                    {t.description}
                  </Txt>
                )}
                <Txt typography="labelSm" color={dim ?? colors.textTertiary}>
                  {ticketConditions(t)}
                </Txt>
              </Flex>
              <Flex direction="column" align="flex-end" gap={2} className={s.side}>
                <Txt typography="headingSmEmphasized" color={dim}>
                  {formatTicketPrice(t.price)}
                </Txt>
                {chip ? (
                  <Chip>{chip}</Chip>
                ) : view.remaining !== null && view.state === 'PURCHASABLE' ? (
                  <Txt typography="labelSm" color={colors.textSecondary}>
                    잔여 {view.remaining}매
                  </Txt>
                ) : null}
              </Flex>
            </Flex>
          </li>
        );
      })}
    </ul>
  );
}
