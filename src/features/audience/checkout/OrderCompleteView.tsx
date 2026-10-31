'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { isNotFound, isSessionLost } from '@/api/errors';
import { myOrderQuery } from '@/api/order/queries';
import {
  AsyncBoundary,
  type AsyncBoundaryRejectedProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';

import { ORDER_RESULT_MESSAGE, orderResultKind } from './model/order-result';

/**
 * `/orders/[orderUuid]` — 주문 완료(`?created=1`) 최소 마크업(P7-L). 주문상세 화면 자체는 P9.
 * 생성 직후에는 `useCheckout`이 넣어 둔 G11/O-3 캐시로 그리고, 새로고침·하드 리로드에서는 G11/O-3을 다시 읽는다.
 * 계좌·금액은 Q16 기본안대로 완료 안내에 다시 보이지 않는다(주문 요약 줄은 새로고침 확인용 최소 표시).
 */
export function OrderCompleteView({ orderUuid, created }: { orderUuid: string; created: boolean }) {
  return (
    <main>
      <AsyncBoundary ignoreError={isSessionLost} rejected={Rejected}>
        <OrderSummary orderUuid={orderUuid} created={created} />
      </AsyncBoundary>
    </main>
  );
}

function OrderSummary({ orderUuid, created }: { orderUuid: string; created: boolean }) {
  const { data: order } = useSuspenseQuery(myOrderQuery(orderUuid));
  const kind = orderResultKind(order);
  return (
    <>
      <h1>{created ? '주문이 완료되었어요' : '주문 상세'}</h1>
      {created && <p>{ORDER_RESULT_MESSAGE[kind]}</p>}
      <dl>
        <dt>예매번호</dt>
        <dd data-testid="order-no">{order.orderNo}</dd>
        <dt>티켓</dt>
        <dd>
          {order.ticket.name} × {order.quantity}
        </dd>
        <dt>상태</dt>
        <dd data-testid="order-status">{order.status ?? '—'}</dd>
        {order.payment && (
          <>
            <dt>결제금액</dt>
            <dd data-testid="order-amount">
              {order.payment.totalAmount.toLocaleString('ko-KR')}원
            </dd>
          </>
        )}
      </dl>
      {created && (
        <p>
          <Link href="/orders">주문내역</Link> <Link href="/tickets">티켓 페이지</Link>
        </p>
      )}
    </>
  );
}

function Rejected({ error, reset }: AsyncBoundaryRejectedProps) {
  if (isNotFound(error)) {
    return <NotFoundView title="주문을 찾을 수 없어요" href="/orders" actionLabel="주문내역" />;
  }
  return (
    <div role="alert">
      <p>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
