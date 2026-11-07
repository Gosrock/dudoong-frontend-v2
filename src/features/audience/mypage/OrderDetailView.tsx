'use client';

import Link from 'next/link';

import { isNotFound, isSessionLost } from '@/api/errors';
import { ScrollTopButton } from '@/features/audience/home/ui/ScrollTopButton';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Icon } from '@/ui/icons/Icon';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';

import { useOrderDetail } from './model/useOrderDetail';
import * as s from './ui/mypage.css';
import { OrderCancelNotice } from './ui/OrderCancelNotice';
import { OrderSummary, OrderTopLine } from './ui/OrderDetailHeader';
import { CancelReason, RefundAccount, RefuseReason } from './ui/OrderDetailNotices';
import { OrderAmountInfo, OrderPaymentInfo } from './ui/OrderDetailPayment';
import { OrderOptionMode, OrderTickets } from './ui/OrderDetailTickets';
import { openCancelOrder, openHostInquiry } from './ui/OrderOverlays';

/**
 * `/orders/[orderUuid]` 주문상세 — GUI(2026-11-07 Ready, 모바일 390) `1175:19046` 상세내역(승인대기) · `1175:19358` 상세내역(선물) ·
 * `1175:19628` 승인거절. PC 프레임은 없어 PC는 와이어 때 가운데 좁은 열 그대로.
 * 순서(GUI): 주문상세 + 주문 일시 / 주문 요약 / 승인거절사유 / 옵션 적용 / 예매정보(첫 아코디언만 펼침) / 결제정보 / 결제금액 / ↑.
 * GUI에 없는 지금 동작은 그대로 둔다(디자인 Q176): 선물 안내 · 취소 사유 · 환불 계좌 · 예매취소 안내(약관 A-8 — legal-copy 원문) ·
 * [주문취소](`canCancel` — 머리 줄 대신 아래 버튼 묶음 맨 위, 🤖) · [호스트 문의] · [목록].
 * - 승인 대기 주문은 발급 티켓이 없어 옵션 답(`lines`)만 그리고 티켓번호 · 티켓상태 줄이 없다(서버와 일치, Q15)
 * - 금액은 티켓금액 · 옵션금액 · 총액(v2에 할인 없음 — Q12). 결제방식은 `paymentChannel` 하나
 * 남의 주문·없는 주문(404)은 공용 404 안내.
 */
export function OrderDetailView({ orderUuid }: { orderUuid: string }) {
  return (
    <main className={s.narrowPage}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        주문상세
      </Txt>
      <AsyncBoundary holdOn={isSessionLost} rejected={Rejected}>
        <OrderDetail orderUuid={orderUuid} />
      </AsyncBoundary>
    </main>
  );
}

function OrderDetail({ orderUuid }: { orderUuid: string }) {
  const detail = useOrderDetail(orderUuid);
  const { order, cancel, contactsEventId } = detail;
  return (
    <>
      <OrderTopLine detail={detail} />
      <OrderSummary detail={detail} />
      {cancel.kind === 'giftNotice' && (
        <div className={s.warningNotice} role="status" data-testid="gift-blocks-cancel">
          <Txt typography="labelMd">{cancel.message}</Txt>
        </div>
      )}
      {detail.refuseReason && <RefuseReason detail={detail} />}
      {order.cancelReason && <CancelReason reason={order.cancelReason} />}
      <RefundAccount detail={detail} orderUuid={orderUuid} />
      <Divider variant="section" />
      <OrderOptionMode detail={detail} />
      <OrderTickets detail={detail} />
      {order.payment && (
        <>
          <Divider variant="section" />
          <OrderPaymentInfo order={order} />
          <Divider variant="section" />
          <OrderAmountInfo detail={detail} />
        </>
      )}
      {cancel.kind !== 'none' && <OrderCancelNotice detail={detail} />}
      <Spacing size={5} />
      <Flex direction="column" gap={2} paddingX={5}>
        {cancel.kind === 'cancel' && contactsEventId !== null && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => openCancelOrder(orderUuid, contactsEventId, cancel.refundAccount)}
          >
            주문취소
          </Button>
        )}
        {contactsEventId !== null && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Icon name="chat" />}
            onClick={() => openHostInquiry(contactsEventId)}
          >
            호스트 문의
          </Button>
        )}
        <Link href="/orders" className={button({ variant: 'dark', size: 'lg', fullWidth: true })}>
          목록
        </Link>
      </Flex>
      {/* 맨 위로(gui `1175:19825` DS Button primary · round · 아이콘) — 공연 리스트와 같은 버튼 */}
      <ScrollTopButton />
    </>
  );
}

function Rejected({ error, reset }: ErrorFallbackProps) {
  if (isNotFound(error)) {
    return <NotFoundView title="주문을 찾을 수 없어요" href="/orders" actionLabel="주문내역" />;
  }
  return (
    <InlineError
      className={s.stateBox}
      message="불러오지 못했어요. 잠시 후 다시 시도해 주세요."
      onRetry={reset}
    />
  );
}
