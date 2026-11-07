'use client';

import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { OrderDetailState } from '../model/useOrderDetail';
import * as p from './OrderDetail.css';
import { OrderSummaryCard } from './OrderParts';

/** 주문상세 머리 줄 — DS `list` First · text(gui `1175:19363` "주문상세" + 주문 일시) */
export function OrderTopLine({ detail }: { detail: OrderDetailState }) {
  // 값 글자는 이 줄만 `text/secondary-label`(gui override — DS 기본은 브랜드 색)
  return (
    <InfoRow
      hierarchy="first"
      label="주문상세"
      value={
        <Txt typography="labelMd" color={colors.textSecondaryLabel}>
          {detail.order.orderedAt ?? ''}
        </Txt>
      }
    />
  );
}

/**
 * 주문 요약(gui `1175:19364` — 주문내역 카드와 같은 `Card list`): 포스터 · 공연 이름(→ 공연 상세) · 티켓 · 수량 · 총액 + 상태 칩.
 * 와이어 때 있던 "공연 일시" 줄은 GUI에 없어 뺐다.
 */
export function OrderSummary({ detail }: { detail: OrderDetailState }) {
  const { order } = detail;
  return (
    <section aria-label="공연" className={p.summary}>
      <OrderSummaryCard
        event={order.event}
        ticketName={order.ticket.name}
        quantity={order.quantity}
        amount={order.payment?.totalAmount ?? 0}
        statusView={detail.statusView}
        linkEvent
      />
    </section>
  );
}
