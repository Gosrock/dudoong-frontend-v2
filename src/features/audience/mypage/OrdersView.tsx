'use client';

import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { useMyOrders } from './model/useMyOrders';

/** `/orders` 주문내역 — 스타일 없는 최소 마크업(P9-L). 무한 스크롤 sentinel·카드 모양은 P9-V */
export function OrdersView() {
  return (
    <main>
      <h1>주문내역</h1>
      <AsyncBoundary holdOn={isSessionLost}>
        <OrderList />
      </AsyncBoundary>
    </main>
  );
}

function OrderList() {
  const list = useMyOrders();
  return (
    <>
      <p>{list.sortLabel}</p>
      {list.empty && <p>아직 주문이 없어요</p>}
      <ul>
        {list.orders.map((o) => (
          <li key={o.orderUuid} data-testid="order-row">
            <Link href={o.href}>
              {o.event?.name ?? '삭제된 공연'} · {o.ticketName} × {o.quantity}
            </Link>{' '}
            <span data-testid="order-status">
              {o.statusView.label}
              {o.statusView.refund && ` · ${o.statusView.refund}`}
            </span>
          </li>
        ))}
      </ul>
      {list.nextPageError ? (
        <p role="alert">
          더 불러오지 못했어요.{' '}
          <button type="button" onClick={list.retry}>
            다시 시도
          </button>
        </p>
      ) : (
        list.hasNextPage && (
          <button type="button" onClick={list.loadMore} disabled={list.isFetchingNextPage}>
            더 보기
          </button>
        )
      )}
    </>
  );
}
