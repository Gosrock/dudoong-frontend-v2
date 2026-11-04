'use client';

import type { HostIssuedTicket } from '@/api/issued-ticket/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { GIFT_PENDING_CHECK_IN_MESSAGE, isGiftPending } from '../model/guest-rules';
import type { IssuedTicketListState } from '../model/useIssuedTicketList';
import { NameWithGift } from './GiftChip';
import { dateTimeText, entranceChipOf, PAY_TYPE_CHIP_LABEL, text } from './guest-labels';
import { ListLoading } from './GuestParts';
import * as o from './OrderDetailOverlay.css';
import { Line, OptionAnswers, Section } from './OrderDetailParts';

/**
 * 발급 티켓 상세(GI-3) — GUI 입장 전 `1030:8955` · 입장 완료 `1030:9136`. 제목(티켓 번호 + 입장 · 결제 칩) · 티켓 정보 · 옵션 응답,
 * 하단 [입장 처리](입장 전 + 일반 멤버 이상, 공연이 OPEN·정산중이 아니거나 선물 대기 티켓이면 안내 문구) ·
 * [입장 취소](입장 완료 + 매니저 이상 + 공연 OPEN·정산중 — Q-3, 백엔드 #929 B37).
 * 소유자 줄(선물이 있을 때만)은 GUI에 없다 — 🤖 Q110
 */
export function IssuedTicketDetailOverlay({
  list,
  onCheckIn,
  onCancelEntrance,
}: {
  list: IssuedTicketListState;
  onCheckIn: (ticket: Pick<HostIssuedTicket, 'ticketUuid' | 'ownerName'>) => Promise<void>;
  onCancelEntrance: (ticketUuid: string) => Promise<void>;
}) {
  const t = list.detail;
  const entranceChip = t ? entranceChipOf(t.ticket.entrance, 'border') : null;
  const payType = t ? PAY_TYPE_CHIP_LABEL[t.ticket.payType ?? 'UNKNOWN'] : null;
  const blockMessage =
    list.checkIn.blockMessage ??
    (t && isGiftPending(t.ticket) ? GIFT_PENDING_CHECK_IN_MESSAGE : null);
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
        t && t.ticket.entrance === 'DONE' && t.ticket.ticketUuid && list.entranceCancel.can ? (
          // GUI `1030:9136` — 입장 완료 상세 하단 [입장 취소](secondary 큰 버튼) → 확인 `1030:9318`
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            loading={list.entranceCancel.pending}
            onClick={() => void onCancelEntrance(t.ticket.ticketUuid!)}
          >
            입장 취소
          </Button>
        ) : t && t.ticket.entrance === 'BEFORE' && t.ticket.ticketUuid && list.checkIn.can ? (
          blockMessage ? (
            <Txt
              as="p"
              typography="bodyMd"
              color={colors.textPrimaryLabel}
              className={o.centerNote}
            >
              {blockMessage}
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
                {t.ticket.giftState !== 'NONE' && t.ticket.giftState !== 'UNKNOWN' && (
                  <Line label="소유자">
                    <NameWithGift name={text(t.ticket.ownerName)} giftState={t.ticket.giftState} />
                  </Line>
                )}
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
