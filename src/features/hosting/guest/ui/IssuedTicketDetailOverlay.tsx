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
import { GiftIcon } from './GiftIcon';
import { dateTimeText, entranceChipOf, PAY_TYPE_CHIP_LABEL, text } from './guest-labels';
import { ListLoading } from './GuestParts';
import * as o from './OrderDetailOverlay.css';
import { Line, OptionAnswers, Section } from './OrderDetailParts';

/**
 * 발급 티켓 상세(GI-3) — GUI 입장 전 `1030:8955` · 입장 완료 `1030:9136`. 제목(티켓 번호 + 입장 · 결제 칩) · 티켓 정보 · 옵션 응답,
 * 하단 [입장 처리](입장 전 + 일반 멤버 이상, 공연이 OPEN·정산중이 아니거나 선물 대기 티켓이면 안내 문구) ·
 * [입장 취소](입장 완료 + 매니저 이상 + 공연 OPEN·정산중 — Q-3, 백엔드 #929 B37).
 * 선물 티켓(#160 — 선물 대기 `1182:10514` · `1182:10057`, 선물 받음 `1182:10899` · `1182:10284`): 제목 칩 뒤 선물 아이콘,
 * 티켓 정보 "주문자" 대신 "선물한 사람"(= 주문자, 선물은 주문자만 보낸다), 선물 받음이면 "받는 분" · "받는 분 연락처"(현재 소유자).
 * 선물 대기는 하단에 안내 + 비활성 [입장 처리]. 그리지 않은 것: 선물 대기의 받는 분 · 연락처(링크 방식이라 수락 전엔 받는 사람이
 * 없다 — Q173), 수락 일시(GI-2에 값이 없다 — B66)
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
  // 머리 "입장 완료"는 green weak(GUI `1030:9296` · `1023:4639`, Figma 전수조사 2026-11-07). 입장 전 · 취소는 함수 안에서 border
  const entranceChip = t ? entranceChipOf(t.ticket.entrance, 'weak') : null;
  const payType = t ? PAY_TYPE_CHIP_LABEL[t.ticket.payType ?? 'UNKNOWN'] : null;
  const giftPending = t ? isGiftPending(t.ticket) : false;
  const gifted = t ? t.ticket.giftState === 'PENDING' || t.ticket.giftState === 'ACCEPTED' : false;
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
            <GiftIcon giftState={t.ticket.giftState} />
          </span>
        ) : (
          '티켓 상세'
        )
      }
      description={t ? text(t.ticket.ticketName) : undefined}
      // GUI `1030:9114` · `1023:4560` — 티켓 번호 18 · 티켓 이름 `Body/md` 진한색, 시트 flat(위 모서리 16 · 막대 · ✕)
      titleSize="md2"
      descriptionStyle="body"
      sheetVariant="flat"
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
          list.checkIn.blockMessage ? (
            <Txt
              as="p"
              typography="bodyMd"
              color={colors.textPrimaryLabel}
              className={o.centerNote}
            >
              {list.checkIn.blockMessage}
            </Txt>
          ) : giftPending ? (
            // GUI `1182:10514` · `1182:10057` — 안내 문구 + 비활성 [입장 처리](받는 분이 수락해야 입장, 서버 PQ-2 GIFT_PENDING)
            <Flex direction="column" gap={6}>
              <Txt
                as="p"
                typography="bodyMd"
                color={colors.textPrimaryLabel}
                className={o.centerNote}
              >
                {GIFT_PENDING_CHECK_IN_MESSAGE}
              </Txt>
              <Button size="lg" fullWidth disabled>
                입장 처리
              </Button>
            </Flex>
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
                <Line label={gifted ? '선물한 사람' : '주문자'}>{text(t.ticket.buyerName)}</Line>
                <Line label="주문 번호">{text(t.ticket.orderNo)}</Line>
                <Line label="발급 일시">{dateTimeText(t.ticket.issuedAt)}</Line>
                {t.ticket.giftState === 'ACCEPTED' && (
                  <>
                    <Line label="받는 분">{text(t.ticket.ownerName)}</Line>
                    <Line label="받는 분 연락처">{text(t.ownerPhone)}</Line>
                  </>
                )}
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
