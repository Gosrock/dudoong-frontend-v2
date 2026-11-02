'use client';

import Link from 'next/link';

import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { eventHref } from '@/features/shared/routes';
import { Button } from '@/ui/components/Button/Button';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatPrice } from '@/utils/money';

import { orderPosterBadge } from '../model/order-card';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './mypage.css';
import { openCancelOrder } from './OrderOverlays';
import { OrderPoster, OrderStatusChips } from './OrderParts';

/** 주문 일시 + [주문취소](와이어 `128:2263` 맨 위 줄). 선물 때문에 막힌 주문은 버튼 대신 아래 안내 상자 */
export function OrderTopLine({
  detail,
  orderUuid,
}: {
  detail: OrderDetailState;
  orderUuid: string;
}) {
  const { order, cancel, contactsEventId } = detail;
  return (
    <Flex justify="space-between" align="center" paddingX={5} paddingY={4} className={s.row}>
      <Txt typography="labelMd" color={colors.textTertiaryLabel}>
        {order.orderedAt ?? ''}
      </Txt>
      {cancel.kind === 'cancel' && contactsEventId !== null && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openCancelOrder(orderUuid, contactsEventId, cancel.refundAccount)}
        >
          주문취소
        </Button>
      )}
    </Flex>
  );
}

/** 주문 요약 — 포스터 · 공연 이름(링크) · 일시 · 티켓 · 수량 · 총액 + 상태 칩 */
export function OrderSummary({ detail }: { detail: OrderDetailState }) {
  const { order } = detail;
  return (
    <section aria-label="공연">
      <Flex gap={4} paddingX={5} paddingY={4}>
        <OrderPoster
          src={order.event?.posterImageUrl ?? null}
          badge={orderPosterBadge(order.event, new Date())}
        />
        <Flex direction="column" gap={1} className={s.grow}>
          {order.event ? (
            <Link href={eventHref(order.event.eventId)} className={s.plainLink}>
              <Txt typography="headingSmEmphasized" lines={2}>
                {order.event.name ?? UNNAMED_EVENT}
              </Txt>
            </Link>
          ) : (
            <span data-testid="event-removed">
              <Txt typography="headingSmEmphasized" color={colors.textTertiaryLabel}>
                삭제된 공연이에요
              </Txt>
            </span>
          )}
          {order.event?.startAt && (
            <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
              공연 일시 : {order.event.startAt}
            </Txt>
          )}
          <Txt typography="bodyMd" color={colors.textTertiaryLabel} lines={1}>
            티켓 : {order.ticket.name ?? '—'}
          </Txt>
          <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
            수량 : {order.quantity}매
          </Txt>
          <Flex justify="space-between" align="center" wrap gap={2}>
            <Txt typography="labelLgEmphasized">{formatPrice(order.payment?.totalAmount ?? 0)}</Txt>
            <OrderStatusChips view={detail.statusView} />
          </Flex>
        </Flex>
      </Flex>
    </section>
  );
}
