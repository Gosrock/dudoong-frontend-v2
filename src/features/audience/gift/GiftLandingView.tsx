'use client';

import Link from 'next/link';

import { LoginRequiredLink } from '@/features/shared/auth/LoginRequiredLink';

import { type GiftButtonMode, useGiftLanding } from './model/useGiftLanding';

/**
 * 선물 랜딩(`/gifts/[giftToken]`) — 스타일 없는 최소 마크업(P8b-L). `viewState` 7종 화면·거절 확인 팝업은 P8b-V.
 * 공연 요약은 공개 값으로 바로 그리고, 상태 영역은 사용자별 값이 확정된 뒤에만 그린다.
 */
export function GiftLandingView({ giftToken }: { giftToken: string }) {
  const landing = useGiftLanding(giftToken);
  const { state, summary } = landing;
  return (
    <main>
      {summary.event && (
        <section aria-label="공연 요약">
          <p>{summary.event.name}</p>
          <p>
            {summary.event.startAt} · {summary.event.placeName}
          </p>
          {summary.ticket && <p>{summary.ticket.ticketName}</p>}
          {summary.senderName && <p>{summary.senderName}님이 보낸 선물</p>}
        </section>
      )}
      {state.status === 'pending' && <p aria-busy="true">확인 중</p>}
      {state.status === 'notFound' && <h1>선물을 찾을 수 없어요</h1>}
      {state.status === 'error' && (
        <p role="alert">
          불러오지 못했어요.
          <button type="button" onClick={state.retry}>
            다시 시도
          </button>
        </p>
      )}
      {state.status === 'ready' && (
        <section aria-label="선물 상태" data-view-state={state.screen.viewState}>
          <h1>{state.screen.title}</h1>
          {state.screen.description && <p>{state.screen.description}</p>}
          {state.screen.actions.includes('ACCEPT') && (
            <ActionButton mode={landing.receiveMode} onClick={landing.accept}>
              선물받기
            </ActionButton>
          )}
          {state.screen.actions.includes('REJECT') && (
            <ActionButton mode={landing.receiveMode} onClick={landing.reject}>
              거절하기
            </ActionButton>
          )}
          {state.screen.actions.includes('CANCEL_GIFT') && (
            <ActionButton mode={landing.cancelMode} onClick={landing.cancelGift}>
              선물 취소
            </ActionButton>
          )}
          {state.screen.actions.includes('GO_TICKETS') && (
            <Link href={landing.ticketsHref}>티켓탭으로</Link>
          )}
          {landing.actionError && <p role="alert">{landing.actionError}</p>}
        </section>
      )}
    </main>
  );
}

function ActionButton({
  mode,
  onClick,
  children,
}: {
  mode: GiftButtonMode;
  onClick: () => unknown;
  children: string;
}) {
  if (mode === 'login') return <LoginRequiredLink>{children}</LoginRequiredLink>;
  return (
    <button type="button" disabled={mode !== 'enabled'} onClick={() => void onClick()}>
      {children}
    </button>
  );
}
