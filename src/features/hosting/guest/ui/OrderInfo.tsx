'use client';

import type { HostOrderDetail } from '@/api/order/schema';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { toast } from '@/ui/components/Toast/Toast';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { copyText } from '@/utils/copy-text';
import { formatWon } from '@/utils/money';

import { CANCELED_BY_LABEL, isDudoongOrder, REFUND_NO_ACCOUNT_MESSAGE } from '../model/guest-rules';
import type { OrderDetailState } from '../model/useOrderDetail';
import { GiftIcon } from './GiftIcon';
import { dateText, dateTimeText, entranceChipOf, NOT_ISSUED_CHIP, text } from './guest-labels';
import * as s from './OrderDetailOverlay.css';
import { Line, Section, TicketCard } from './OrderDetailParts';

/** 상세 단계 본문 — 주문 정보 · 주문자 · 티켓 · 환불 정보 */
export function OrderInfo({ state, detail }: { state: OrderDetailState; detail: HostOrderDetail }) {
  const { order } = detail;
  // GUI `1029:8522` "취소한 사람: 예매자/호스트"(GR-2 `canceledBy` — 백엔드 #929 B35). 값이 없으면(운영 2.5.3 · 취소 전) 줄 없음
  const canceledByLabel = detail.canceledBy ? CANCELED_BY_LABEL[detail.canceledBy] : null;
  return (
    <>
      <Section title="주문 정보">
        <dl className={s.lines}>
          <Line label="주문 일시">{dateTimeText(order.orderedAt)}</Line>
          <Line label="결제 금액">{formatWon(order.totalAmount)}</Line>
          {/* 결제 금액 → 취소한 사람 → 사유(GUI `1029:8522` · `1029:8733`, Figma 전수조사 2026-11-07) */}
          {canceledByLabel && (
            <Line label="취소한 사람">
              <span data-testid="detail-canceled-by">{canceledByLabel}</span>
            </Line>
          )}
          {order.refuseReason && <Line label="거절 사유">{order.refuseReason}</Line>}
          {order.cancelReason && <Line label="취소 사유">{order.cancelReason}</Line>}
        </dl>
      </Section>
      <Section title="주문자">
        <dl className={s.lines}>
          <Line label="이름">{text(order.buyerName)}</Line>
          <Line label="연락처">
            <span data-testid="detail-phone">{text(order.buyerPhone)}</span>
          </Line>
          <Line label="이메일">
            <span data-testid="detail-email">{text(detail.buyerEmail)}</span>
          </Line>
          {order.depositorName && <Line label="입금자명">{order.depositorName}</Line>}
        </dl>
      </Section>
      <OrderTickets detail={detail} />
      {state.canSeeRefundAccount && order.refundStatus !== 'NONE' && <RefundInfo detail={detail} />}
    </>
  );
}

/** 발급 티켓(발급됐으면 티켓마다 입장 칩) 또는 주문한 티켓(줄마다 "미발급") */
function OrderTickets({ detail }: { detail: HostOrderDetail }) {
  const dudoong = isDudoongOrder(detail.order);
  if (detail.issuedTickets.length > 0) {
    return (
      <Section title="발급 티켓">
        <ul className={s.cards}>
          {detail.issuedTickets.map((t, i) => {
            const chip = entranceChipOf(t.entrance, 'border');
            return (
              <TicketCard
                key={t.ticketUuid ?? t.issuedTicketNo ?? i}
                name={text(t.ticketName)}
                dudoong={dudoong}
                end={
                  // 선물 아이콘은 발급된 티켓 표 · 티켓 상세(GUI #160)와 같은 것 — 주문 상세 카드에는 GUI 자리가 없어 🤖 같은 아이콘으로 맞춤
                  // (예전 Q110 칩 자리). GR-2 `giftState`(#929)가 없으면 그리지 않는다
                  <Flex as="span" gap={1} align="center">
                    {t.giftState && <GiftIcon giftState={t.giftState} />}
                    <Chip shape="round" color={chip.color} theme={chip.theme}>
                      {chip.label}
                    </Chip>
                  </Flex>
                }
                answers={t.optionAnswers}
              />
            );
          })}
        </ul>
      </Section>
    );
  }
  return (
    <Section title="주문한 티켓">
      <ul className={s.cards}>
        {detail.lines.map((line, i) => (
          <TicketCard
            key={i}
            name={`${text(line.ticketName)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}`}
            dudoong={dudoong}
            end={
              <Chip shape="round" color={NOT_ISSUED_CHIP.color} theme={NOT_ISSUED_CHIP.theme}>
                {NOT_ISSUED_CHIP.label}
              </Chip>
            }
            answers={line.optionAnswers}
          />
        ))}
      </ul>
    </Section>
  );
}

/** 환불 정보(매니저 이상 · 환불 상태가 있을 때) — 계좌가 없으면 안내 문구 */
function RefundInfo({ detail }: { detail: HostOrderDetail }) {
  const account = detail.refundAccount;
  return (
    <Section title="환불 정보" testId="refund-account">
      {account ? (
        <dl className={s.lines}>
          <Line label="은행">{account.bankName}</Line>
          <Line
            label="계좌번호"
            end={
              <Button
                variant="secondary"
                size="sm"
                aria-label="계좌번호 복사"
                onClick={async () => {
                  if (await copyText(account.accountNumber)) toast('계좌번호를 복사했어요');
                }}
              >
                복사
              </Button>
            }
          >
            {account.accountNumber}
          </Line>
          <Line label="예금주">{account.accountHolder}</Line>
          <Line label="수정일">
            <span data-testid="refund-account-updated">{dateText(account.updatedAt)}</span>
          </Line>
          {detail.order.refundStatus === 'COMPLETED' && (
            <Line label="환불 완료일">
              <span data-testid="refund-completed-at">
                {dateText(detail.refundStatusChangedAt)}
              </span>
            </Line>
          )}
        </dl>
      ) : (
        <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.plain}>
          <span data-testid="refund-no-account">{REFUND_NO_ACCOUNT_MESSAGE}</span>
        </Txt>
      )}
    </Section>
  );
}
