'use client';

import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { orderDateLabel } from './model/order-card';
import { useMyOrders } from './model/useMyOrders';
import * as p from './OrdersView.css';
import * as s from './ui/mypage.css';
import { OrderSummaryCard } from './ui/OrderParts';

/**
 * `/orders` 주문내역 — GUI `1047:32381` 주문내역(2026-11-07 Ready, 모바일 390). PC 프레임은 없어 PC는 와이어 때 가운데 열 그대로.
 * 정렬 라벨 "최신순"(SortButton) / 카드: 주문 날짜 + [상세내역 ›] / 포스터 · 공연 이름 · 티켓 · 수량 · 금액 · 상태 칩. 카드 전체가 주문상세 링크.
 * 무한 목록 하단은 공용 `LoadMoreSentinel`.
 */
export function OrdersView() {
  return (
    <main className={s.page}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        주문내역
      </Txt>
      <AsyncBoundary holdOn={isSessionLost} pending={<OrdersSkeleton />}>
        <OrderList />
      </AsyncBoundary>
    </main>
  );
}

function OrderList() {
  const list = useMyOrders();
  if (list.empty) {
    // FIGMA-CUSTOM 아님 — 빈 상태는 와이어에 없다(Tomato 10-24 "빈 상태 만들기" 미해결). DS EmptyState로(Figma 코멘트 — 디자인 없음)
    return (
      <div className={s.stateBox}>
        <EmptyState
          title="아직 주문한 공연이 없어요"
          description="마음에 드는 공연을 찾아 예매해 보세요."
          action={<EmptyStateAction href="/events">공연 둘러보기</EmptyStateAction>}
        />
      </div>
    );
  }
  return (
    <>
      <div className={p.toolbar}>
        {/* DS SortButton(gui `1047:32385`) — 서버 정렬이 최신순 하나라 고정 라벨, 누를 수 없다(Q36 · design-system §3 · patterns §13).
            Figma의 ▾(chevron-down 12)는 누를 수 있어 보이지 않게 그리지 않는다(공연 리스트 "공연임박순"과 같게) */}
        <Txt typography="labelMd" color={colors.textPrimaryLabel}>
          {list.sortLabel}
        </Txt>
      </div>
      <ul className={s.list} aria-label="주문 목록">
        {list.orders.map((o) => (
          <li key={o.orderUuid} className={s.row} data-testid="order-row">
            <Link href={o.href} className={p.cardLink}>
              <Flex justify="space-between" align="center">
                <Txt typography="bodyMd">{orderDateLabel(o.orderedAt) ?? ''}</Txt>
                <Flex align="center" gap={1}>
                  <Txt typography="labelMd">상세내역</Txt>
                  <Icon name="chevron-right" size={12} />
                </Flex>
              </Flex>
              <OrderSummaryCard
                event={o.event}
                ticketName={o.ticketName}
                quantity={o.quantity}
                amount={o.totalAmount}
                statusView={o.statusView}
                linkEvent={false}
              />
            </Link>
          </li>
        ))}
      </ul>
      <LoadMoreSentinel list={list} />
    </>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-busy="true">
      <Flex direction="column" gap={4} padding={5}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={140} />
        ))}
      </Flex>
    </div>
  );
}
