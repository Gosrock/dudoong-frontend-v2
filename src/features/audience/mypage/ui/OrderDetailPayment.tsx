'use client';

import type { MyOrderDetail } from '@/api/order/schema';
import { orderTossLink, TossTransferButton } from '@/features/audience/checkout/ui/DepositGuide';
import { AmountRows, DepositAccountRows } from '@/features/audience/checkout/ui/PaymentBlocks';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { formatPrice, formatWon } from '@/utils/money';

import { PAYMENT_CHANNEL_LABEL } from '../model/order-card';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as p from './OrderDetail.css';

/**
 * 결제정보(gui `1175:19408`~ — 입금자명 · 결제계좌[복사] · 예금주 · 결제방식). 입금 계좌는 두둥티켓만 온다.
 * GUI에 없는 "입금은행" 줄은 계좌번호만으로는 송금할 수 없어 남긴다(🤖 디자인 Q179). 머리 줄의 입금자명 안내(와이어)는 GUI
 * (`value type=none`)대로 뺐다.
 */
export function OrderPaymentInfo({ order }: { order: MyOrderDetail }) {
  const account = order.payment?.account ?? null;
  return (
    <section aria-label="결제정보">
      <InfoRow hierarchy="first" label="결제정보" />
      <InfoRow label="입금자명" value={order.depositorName ?? '—'} />
      {account && <DepositAccountRows account={account} toastId="order:copy" />}
      <InfoRow
        label="결제방식"
        value={order.paymentChannel ? (PAYMENT_CHANNEL_LABEL[order.paymentChannel] ?? '—') : '—'}
      />
      {/* B23 — 주문을 입금 전에 만들므로 앱이 꺼진 뒤에도 여기서 송금을 이어 간다(승인 대기 + 토스 송금만) */}
      {order.status === 'PENDING_APPROVE' && orderTossLink(order) && (
        <div className={p.tossTransfer}>
          <TossTransferButton order={order} />
        </div>
      )}
    </section>
  );
}

/** 금액 — 무료는 "무료"(티켓 · 총액), 옵션금액은 0이어도 "0원" */
const ORDER_AMOUNT_FORMAT = { ticket: formatPrice, option: formatWon, total: formatPrice };

export function OrderAmountInfo({ detail }: { detail: OrderDetailState }) {
  if (!detail.amounts) return null;
  return (
    <AmountRows
      ticketAmount={detail.amounts.ticketAmount}
      optionAmount={detail.amounts.optionAmount}
      total={detail.amounts.totalAmount}
      format={ORDER_AMOUNT_FORMAT}
      totalTestId="order-amount"
    />
  );
}
