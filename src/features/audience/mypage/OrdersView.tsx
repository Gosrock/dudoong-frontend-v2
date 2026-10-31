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

import { orderDateLabel, orderPosterBadge, wonLabel } from './model/order-card';
import { useMyOrders } from './model/useMyOrders';
import * as s from './ui/mypage.css';
import { OrderPoster, OrderStatusChips } from './ui/OrderParts';

/**
 * `/orders` 주문내역(P9-V, 와이어 근거 — 모바일 `128:2772` · PC `668:5085`). GUI `331:11519`은 Ready가 아니라 모양을 가져오지 않는다.
 * 카드: 주문 날짜 + [상세내역 ›] / 포스터(D-n · 공연종료) · 공연 이름 · 티켓 · 수량 · 금액 · 상태 칩. 카드 전체가 주문상세 링크.
 * 와이어의 "전체 상태 ⌄" 필터는 선택지가 없어(Q36) 고정 라벨 "최근주문순"만 둔다. 무한 목록 하단은 공용 `LoadMoreSentinel`.
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
  // 보호 화면이라 서버에서 그리지 않는다(게이트 뒤 브라우저 조회) — 렌더 시각으로 D-n을 계산해도 하이드레이션이 어긋나지 않는다
  const now = new Date();
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
      <div className={s.toolbar}>
        <Txt typography="labelMd" color={colors.textSecondaryLabel}>
          {list.sortLabel}
        </Txt>
      </div>
      <ul className={s.list} aria-label="주문 목록">
        {list.orders.map((o) => (
          <li key={o.orderUuid} className={s.row} data-testid="order-row">
            <Link href={o.href} className={s.cardLink}>
              <Flex justify="space-between" align="center">
                <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                  {orderDateLabel(o.orderedAt) ?? ''}
                </Txt>
                <Flex align="center" gap={1}>
                  <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                    상세내역
                  </Txt>
                  <Icon name="chevron-right" size={16} />
                </Flex>
              </Flex>
              <Flex gap={4} align="stretch">
                <OrderPoster
                  src={o.event?.posterImageUrl ?? null}
                  badge={orderPosterBadge(o.event, now)}
                />
                <Flex direction="column" gap={1} className={s.grow}>
                  <Txt typography="headingSmEmphasized" lines={2}>
                    {o.event ? (o.event.name ?? '이름 없는 공연') : '삭제된 공연'}
                  </Txt>
                  <Txt typography="bodyMd" color={colors.textTertiaryLabel} lines={1}>
                    티켓 : {o.ticketName ?? '—'}
                  </Txt>
                  <Txt typography="bodyMd" color={colors.textTertiaryLabel}>
                    수량 : {o.quantity}매
                  </Txt>
                  <Flex justify="space-between" align="center" wrap gap={2}>
                    <Txt typography="labelLgEmphasized">{wonLabel(o.totalAmount)}</Txt>
                    <OrderStatusChips view={o.statusView} />
                  </Flex>
                </Flex>
              </Flex>
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
