'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { isNotFound, isSessionLost } from '@/api/errors';
import { myOrderQuery } from '@/api/order/queries';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { button } from '@/ui/components/Button/Button.css';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { ORDER_RESULT_MESSAGE, ORDER_RESULT_TITLE, orderResultKind } from './model/order-result';
import * as s from './OrderCompleteView.css';

/**
 * `/orders/[orderUuid]?created=1` 주문 완료 — GUI `939:27829`(일러스트 + "주문 접수 완료!"(승인 대기) · "주문 완료!"(즉시 발급) + [주문내역] [티켓 페이지로], #354).
 * 셸 로고 헤더 아래에 그린다(GUI도 로고 헤더). 입금 안내(계좌 · 금액 · [토스 앱에서 송금하기])는 두지 않는다 — GUI대로
 * (사용자 결정 2026-11-22 Q252 "무조건 디자인대로", B23의 완료 화면 부분을 대체). 계좌 · 금액 · 토스 송금은 주문상세(`OrderPaymentInfo`)에서 본다.
 * 생성 직후에는 `useCheckout`이 넣어 둔 G11/O-3 캐시로 그리고, 새로고침·하드 리로드에서는 G11/O-3을 다시 읽는다.
 */
export function OrderCompleteView({ orderUuid }: { orderUuid: string; created?: boolean }) {
  return (
    <main className={s.page}>
      <AsyncBoundary holdOn={isSessionLost} rejected={Rejected}>
        <OrderComplete orderUuid={orderUuid} />
      </AsyncBoundary>
    </main>
  );
}

function OrderComplete({ orderUuid }: { orderUuid: string }) {
  const { data: order } = useSuspenseQuery(myOrderQuery(orderUuid));
  const kind = orderResultKind(order);
  return (
    <Flex direction="column" align="center" gap={5} fullWidth className={s.content}>
      <Illustration name="booking-complete" />
      <Flex direction="column" align="center" gap={2}>
        <Txt as="h1" typography="headingLgEmphasized" color={colors.textPrimaryLabel}>
          {ORDER_RESULT_TITLE[kind]}
        </Txt>
        <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel} align="center">
          <span data-testid="order-result" data-kind={kind}>
            {ORDER_RESULT_MESSAGE[kind]}
          </span>
        </Txt>
      </Flex>
      <div className={s.actions}>
        <Link
          href="/orders"
          className={button({ variant: 'secondary', size: 'lg', fullWidth: true })}
        >
          주문내역
        </Link>
        <Link
          href="/tickets"
          className={button({ variant: 'primary', size: 'lg', fullWidth: true })}
        >
          티켓 페이지로
        </Link>
      </div>
    </Flex>
  );
}

function Rejected({ error, reset }: ErrorFallbackProps) {
  if (isNotFound(error)) {
    return <NotFoundView title="주문을 찾을 수 없어요" href="/orders" actionLabel="주문내역" />;
  }
  return (
    <Flex paddingX={5} paddingY={2} justify="center">
      <InlineError message="불러오지 못했어요. 잠시 후 다시 시도해 주세요." onRetry={reset} />
    </Flex>
  );
}
