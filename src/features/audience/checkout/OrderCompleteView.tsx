'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { isNotFound, isSessionLost } from '@/api/errors';
import { myOrderQuery } from '@/api/order/queries';
import {
  AsyncBoundary,
  type ErrorFallbackProps,
} from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { NotFoundView } from '@/ui/components/NotFoundView/NotFoundView';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { ORDER_RESULT_MESSAGE, orderResultKind } from './model/order-result';
import * as s from './OrderCompleteView.css';

/**
 * `/orders/[orderUuid]?created=1` 주문 완료 — GUI `939:27829`(일러스트 + "주문 완료!" + [주문내역] [티켓 페이지로]).
 * 셸 로고 헤더 아래에 그린다(GUI도 로고 헤더). 예매번호·계좌·금액은 다시 보이지 않는다(plan P7 ⑤, Q16 기본안 — 주문상세에서 본다).
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
          주문 완료!
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
    <Flex direction="column" align="center" gap={3} paddingY={8} paddingX={5}>
      <Txt typography="bodyMd" color={colors.textSecondary} align="center">
        <span role="alert">불러오지 못했어요. 잠시 후 다시 시도해 주세요.</span>
      </Txt>
      <Button variant="secondary" size="md" onClick={reset}>
        다시 시도
      </Button>
    </Flex>
  );
}
