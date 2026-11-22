'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { isSessionLost } from '@/api/errors';
import { eventDetailQuery } from '@/api/event/queries';
import { AudienceSubHeader } from '@/features/audience/shell/AudienceSubHeader';
import { eventHref } from '@/features/shared/routes';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { button } from '@/ui/components/Button/Button.css';
import { ScreenLoader } from '@/ui/components/Loader/Loader';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './CheckoutView.css';
import type { CheckoutParams } from './model/checkout-params';
import { useCheckoutData } from './model/useCheckout';
import { CheckoutEventSummary } from './ui/CheckoutEventSummary';
import { CheckoutForm } from './ui/CheckoutForm';

/** 화면 소제목(GUI `567:9159` 등 Top app bar — Design Sync #349) */
const PAGE_TITLE = '주문/결제';

/**
 * 체크아웃(`/events/[eventId]/checkout?ticketItemId=&quantity=`) — GUI 근거(plan P7 V, gui-screens §0):
 * 모든 옵션 동일 `564:4156` · 유료옵션 `567:9316` · 무옵션 `567:9159` · 긴제목 `567:10452` · 개별 옵션 `567:8532` ·
 * 입금 확인 `567:9468`(2026-11-22 Design Sync #353 — 설명 · [입금완료] · 입금은행). 2026-11-22 #349~#352: 소제목 "주문/결제" + 공연 요약 · 판매정보. 서버 기준으로 바꾼 것(plan P7 ①~④): 예매번호·티켓번호 줄 없음, 결제정보에 은행 줄, CTA "결제하기"·"신청하기",
 * 무료는 결제 블록(결제정보·결제금액·결제방식) 없이.
 */
export function CheckoutView({
  eventId,
  params,
}: {
  eventId: number;
  params: CheckoutParams | null;
}) {
  // 공연 이름(헤더 제목). 공개 GP-3 — 상세에서 왔으면 캐시가 있다. 실패해도 체크아웃은 그린다
  const event = useQuery(eventDetailQuery(eventId));
  const eventName = event.data?.name ?? '';
  const eventStartAt = event.data?.startAt ?? null;
  return (
    <>
      {/* 페이지 소제목 "주문/결제"(GUI `1952:49926` Top app bar — Design Sync #349). 공연 이름은 아래 요약이 보인다 */}
      <AudienceSubHeader title={PAGE_TITLE} fallbackHref={eventHref(eventId)} />
      <main className={s.page}>
        <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
          {PAGE_TITLE}
        </Txt>
        <AsyncBoundary holdOn={isSessionLost}>
          <CheckoutContent
            summary={
              event.data && (
                <>
                  <CheckoutEventSummary event={event.data} />
                  <Divider variant="section" />
                </>
              )
            }
            eventId={eventId}
            params={params}
            eventName={eventName}
            eventStartAt={eventStartAt}
          />
        </AsyncBoundary>
      </main>
    </>
  );
}

function CheckoutContent({
  summary,
  eventId,
  params,
  eventName,
  eventStartAt,
}: {
  summary: ReactNode;
  eventId: number;
  params: CheckoutParams | null;
  eventName: string;
  eventStartAt: string | null;
}) {
  const state = useCheckoutData(eventId, params);
  const router = useRouter();
  const backHref = state.status === 'unavailable' ? state.backHref : null;
  useEffect(() => {
    // 티켓 선택으로 돌려보낸다(patterns §16). 뒤로가기로 다시 오지 않게 replace
    if (backHref) router.replace(backHref);
  }, [backHref, router]);

  if (state.status === 'pending') {
    return <ScreenLoader />;
  }
  if (state.status === 'unavailable') {
    return (
      <Flex direction="column" align="center" gap={3} paddingY={8} paddingX={5}>
        <Txt typography="bodyMd" color={colors.textSecondary} align="center">
          <span role="alert">지금은 이 티켓을 구매할 수 없어요.</span>
        </Txt>
        <Link href={state.backHref} className={button({ variant: 'secondary', size: 'md' })}>
          티켓 다시 고르기
        </Link>
      </Flex>
    );
  }
  return (
    <CheckoutForm
      summary={summary}
      eventId={eventId}
      checkout={state.checkout}
      depositorName={state.depositorName}
      quantity={params?.quantity ?? 1}
      eventName={eventName}
      eventStartAt={eventStartAt}
    />
  );
}
