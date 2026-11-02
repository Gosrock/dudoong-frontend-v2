'use client';

import type { HostIssuedTicket } from '@/api/issued-ticket/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { IssuedTicketListState } from '../model/useIssuedTicketList';
import { dateTimeText, entranceChipOf, PAY_TYPE_CHIP_LABEL, text } from './guest-labels';
import { ListLoading } from './GuestParts';
import * as o from './OrderDetailOverlay.css';
import { Line, OptionAnswers, Section } from './OrderDetailParts';

/**
 * 발급 티켓 상세(GI-3) — GUI 입장 전 `1030:8955` · 입장 완료 `1030:9136`. 제목(티켓 번호 + 입장 · 결제 칩) · 티켓 정보 · 옵션 응답,
 * 하단 [입장 처리](입장 전 + 일반 멤버 이상, 공연이 OPEN·정산중이 아니면 안내 문구)
 */
export function IssuedTicketDetailOverlay({
  list,
  onCheckIn,
}: {
  list: IssuedTicketListState;
  onCheckIn: (ticket: Pick<HostIssuedTicket, 'ticketUuid' | 'ownerName'>) => Promise<void>;
}) {
  const t = list.detail;
  const entranceChip = t ? entranceChipOf(t.ticket.entrance, 'border') : null;
  const payType = t ? PAY_TYPE_CHIP_LABEL[t.ticket.payType ?? 'UNKNOWN'] : null;
  return (
    <ResponsiveOverlay
      open={list.selectedTicketUuid !== null}
      onOpenChange={(open) => !open && list.closeTicket()}
      title={
        t && entranceChip ? (
          <span className={o.titleRow}>
            <span>{text(t.ticket.issuedTicketNo)}</span>
            <Chip shape="round" color={entranceChip.color} theme={entranceChip.theme}>
              <span data-testid="ticket-detail-entrance">{entranceChip.label}</span>
            </Chip>
            {payType && (
              <Chip shape="round" color="violet" theme="weak">
                {payType}
              </Chip>
            )}
          </span>
        ) : (
          '티켓 상세'
        )
      }
      description={t ? text(t.ticket.ticketName) : undefined}
      footer={
        t && t.ticket.entrance === 'BEFORE' && t.ticket.ticketUuid && list.checkIn.can ? (
          list.checkIn.blockMessage ? (
            <Txt
              as="p"
              typography="bodyMd"
              color={colors.textPrimaryLabel}
              className={o.centerNote}
            >
              {list.checkIn.blockMessage}
            </Txt>
          ) : (
            <Button
              size="lg"
              fullWidth
              loading={list.checkIn.pending}
              onClick={() => void onCheckIn(t.ticket)}
            >
              입장 처리
            </Button>
          )
        ) : undefined
      }
    >
      <Flex direction="column" gap={5} data-testid="ticket-detail">
        {list.detailStatus === 'pending' && <ListLoading />}
        {t && (
          <>
            <Section title="티켓 정보">
              <dl className={o.lines}>
                <Line label="주문자">{text(t.ticket.buyerName)}</Line>
                <Line label="주문 번호">{text(t.ticket.orderNo)}</Line>
                <Line label="발급 일시">{dateTimeText(t.ticket.issuedAt)}</Line>
                {t.ticket.entrance === 'DONE' && (
                  <Line label="입장 일시">{dateTimeText(t.ticket.enteredAt)}</Line>
                )}
              </dl>
            </Section>
            {t.optionAnswers.length > 0 && (
              <Section title="옵션 응답">
                <div className={o.card}>
                  <OptionAnswers answers={t.optionAnswers} />
                </div>
              </Section>
            )}
          </>
        )}
      </Flex>
    </ResponsiveOverlay>
  );
}
