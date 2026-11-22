'use client';

import type { MyOrderDetail } from '@/api/order/schema';
import { button } from '@/ui/components/Button/Button.css';

import { tossTransferLink } from '../model/payment';

/**
 * 주문 하나의 토스 송금 링크(B23 — 주문을 만든 뒤 송금). 토스로 송금을 고른 주문이고, 링크를 만들 수 있고 은행 코드가 있을 때만
 * (`bankCode`가 null이면 토스 버튼을 숨긴다 — plan P7 L, B3). 금액은 서버 `totalAmount` 그대로
 */
export function orderTossLink(order: Pick<MyOrderDetail, 'paymentChannel' | 'payment'>) {
  if (order.paymentChannel !== 'TOSS_TRANSFER' || !order.payment?.account?.bankCode) return null;
  return tossTransferLink(order.payment.account, order.payment.totalAmount);
}

/** [토스 앱에서 송금하기] — 디자인 없음(Figma 코멘트 2026-11-01). 주문상세(승인 대기)에서 쓴다 — 주문 완료 화면의 입금 안내는 GUI대로 뺐다(사용자 결정 2026-11-22 Q252) */
export function TossTransferButton({ order }: { order: MyOrderDetail }) {
  const link = orderTossLink(order);
  if (!link) return null;
  return (
    <a
      href={link}
      data-testid="toss-link"
      className={button({ variant: 'primary', size: 'md', fullWidth: true })}
    >
      토스 앱에서 송금하기
    </a>
  );
}
