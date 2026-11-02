'use client';

import { Chip } from '@/ui/components/Chip/Chip';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatPrice } from '@/utils/money';

import { canListTickets, ticketConditions, type TicketListStatus } from '../model/ticket-list';
import type { TicketView } from '../model/ticket-state';
import * as s from './TicketOptionList.css';

const STATE_CHIP: Partial<Record<TicketView['state'], string>> = {
  SUSPENDED: '판매 중단',
  SOLD_OUT: '매진',
  NOT_ON_SALE: '판매 종료',
};

/**
 * 목록을 그리기 전 상태(조회 중 · 실패 · 티켓 없음 · 지난 공연). 목록을 그릴 수 있으면 `null`.
 * 표시 목록(`TicketOptionList`)과 선택 목록(`TicketSelector`)이 같이 쓴다.
 */
export function TicketListFallback({ selection }: { selection: TicketListStatus }) {
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
      <InlineError
        message="티켓 정보를 불러오지 못했어요."
        onRetry={() => void selection.refetch()}
      />
    );
  }
  if (!canListTickets(selection)) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textTertiary}>
        {selection.listState === 'EVENT_ENDED' ? '지난 공연이에요' : '판매 중인 티켓이 없어요'}
      </Txt>
    );
  }
  return null;
}

/**
 * 티켓 한 줄의 내용 — 왼쪽 이름·설명·조건, 오른쪽 가격 + 상태 칩(매진·판매 중단·판매 종료) 또는 잔여.
 * 판매 중단은 딤드(Q33): 글자를 DS 비활성 글자색으로, 잔여·매진은 숨기고 "판매 중단" 칩만(P6-V 결정).
 */
export function TicketRowContent({ view }: { view: TicketView }) {
  const t = view.ticket;
  const chip = STATE_CHIP[view.state];
  const dim = view.state === 'SUSPENDED' ? colors.textDisabledLabel : undefined;
  return (
    <Flex justify="space-between" align="flex-start" gap={3} fullWidth>
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
          {formatPrice(t.price)}
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
  );
}

/**
 * 티켓 옵션 목록(모바일 "Ticket Options" 카드 `121:1216`) — **표시만**. 고르기는 [티켓 구매하기] 시트의 `TicketSelector`.
 * GP-5는 브라우저에서 읽는다(응답 HTML에 재고 값이 없어야 한다).
 */
export function TicketOptionList({
  selection,
  headingId,
}: {
  selection: TicketListStatus;
  headingId: string;
}) {
  if (!canListTickets(selection)) return <TicketListFallback selection={selection} />;
  return (
    <ul className={s.list} aria-labelledby={headingId}>
      {selection.tickets.map((view, i) => (
        <li key={view.ticket.ticketItemId}>
          {i > 0 && <Divider />}
          <Flex paddingY={3}>
            <TicketRowContent view={view} />
          </Flex>
        </li>
      ))}
    </ul>
  );
}
