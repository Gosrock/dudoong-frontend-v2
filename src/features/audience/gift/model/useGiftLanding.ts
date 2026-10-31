'use client';

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { isNotFound } from '@/api/errors';
import { acceptGiftMutation, rejectGiftMutation } from '@/api/gift/mutations';
import { giftLandingQuery, giftLandingViewerQuery } from '@/api/gift/queries';
import type { GiftLanding } from '@/api/gift/schema';
import { handleError } from '@/api/handle-error';
import { useSession } from '@/features/shared/auth/useSession';

import { refreshAfterGiftChange } from './gift-cache';
import { GIFT_ERROR_TABLE, type GiftErrorOutcome } from './gift-errors';
import { type GiftLandingScreen, giftLandingScreen } from './gift-landing-state';
import { refetchForGift } from './gift-refetch';
import { useCancelGift } from './useGiftActions';

/**
 * 사용자별 버튼의 상태(patterns §4-2).
 * - `disabled` — 세션·viewer 확정 전, 요청 중, 또는 그 상태에서 누를 수 없음
 * - `login` — 익명이 확정됨. 요청을 보내지 않는 로그인 링크(`LoginRequiredLink` → `/login?redirect=<랜딩>`)
 * - `enabled` — 누르면 요청
 */
export type GiftButtonMode = 'disabled' | 'login' | 'enabled';

export type GiftLandingState =
  /** 세션 또는 viewer 확인 중 — 상태 영역 전체를 스켈레톤으로(공개 값으로는 요약만) */
  | { status: 'pending' }
  | { status: 'error'; retry: () => void }
  /** viewer 조회가 404(그 사이 링크가 없어짐) */
  | { status: 'notFound' }
  | { status: 'ready'; screen: GiftLandingScreen; giftId: number | null };

const TICKETS_HREF = '/tickets';

/**
 * 선물 랜딩(`/gifts/[giftToken]`, plan P8b). 공개 값(GG-3, 서버 프리페치)과 사용자별 값(같은 API를 쿠키와 함께 — viewer)을 나눈다.
 *
 * - **상태 화면은 사용자별 값이 확정된 뒤에만** 정한다: 로그인이면 viewer 응답, 익명이 확정되면 공개 응답. 그 전에는 `pending`
 *   — 보낸 본인(`OWN_LINK`)에게 익명 값(`AVAILABLE`)의 수락 버튼이 잠깐이라도 활성으로 보이지 않는다
 * - 익명이면 [선물받기]·[거절하기]는 로그인 링크다(`login`). 로그인 → 같은 주소로 복귀 → 사용자가 **다시 눌러** 수락(자동 수락 없음)
 * - 수락 성공 → 티켓·선물·알림 쿼리 무효화 후 티켓탭으로. 거절 성공 → 랜딩을 다시 읽어 상태 화면(REJECTED)
 * - `Gift_400_3`·`4`·`5`·`6` → 랜딩을 다시 읽어 상태 화면으로. `Gift_400_6`은 다시 읽어도 받을 수 있는 상태면 CANCELED 화면
 * - 보낸 사람(`giftId` 있음)의 `OWN_LINK`·`EXPIRED`에서는 [선물 취소/회수](DG-2)
 */
export function useGiftLanding(giftToken: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: pub } = useSuspenseQuery(giftLandingQuery(giftToken));
  const session = useSession();
  const viewer = useQuery({
    ...giftLandingViewerQuery(giftToken),
    enabled: session.status === 'session',
  });
  const [forcedCanceled, setForcedCanceled] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // ─── 사용자별 값 확정 ───
  const source = useMemo(() => {
    if (session.status === 'anonymous') return { ...pub, isReceiver: false, giftId: null };
    if (session.status === 'session' && viewer.isSuccess) return viewer.data;
    return null;
  }, [session.status, pub, viewer.isSuccess, viewer.data]);

  const state: GiftLandingState = useMemo(() => {
    if (session.status === 'error') return { status: 'error', retry: session.retry };
    if (session.status === 'session' && viewer.isError && !viewer.data) {
      return isNotFound(viewer.error)
        ? { status: 'notFound' }
        : { status: 'error', retry: () => void viewer.refetch() };
    }
    if (!source) return { status: 'pending' };
    const viewState = forcedCanceled ? 'CANCELED' : source.viewState;
    return {
      status: 'ready',
      screen: giftLandingScreen(viewState, source),
      giftId: source.giftId,
    };
  }, [session, viewer, source, forcedCanceled]);

  // ─── 수락·거절 ───
  const onOutcome = useCallback(
    async (outcome: GiftErrorOutcome) => {
      await refetchForGift(queryClient, outcome.refetch, { giftToken });
      if (outcome.treatAsCanceled) {
        const fresh = queryClient.getQueryData(giftLandingViewerQuery(giftToken).queryKey);
        if (!fresh || fresh.viewState === 'AVAILABLE') setForcedCanceled(true);
      }
      setActionError(outcome.message);
    },
    [queryClient, giftToken],
  );
  const codes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(GIFT_ERROR_TABLE.accept).map(([code, outcome]) => [
          code,
          () => void onOutcome(outcome),
        ]),
      ),
    [onOutcome],
  );

  // 캐시 무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const accept = useMutation({
    ...acceptGiftMutation(giftToken),
    onSuccess: () => refreshAfterGiftChange(queryClient),
  });
  const reject = useMutation({
    ...rejectGiftMutation(giftToken),
    onSuccess: () => refreshAfterGiftChange(queryClient),
  });
  const cancel = useCancelGift(state.status === 'ready' ? state.giftId : null, { giftToken });

  const busy = accept.isPending || reject.isPending || cancel.pending || accepted;
  const available =
    state.status === 'ready' && state.screen.actions.includes('ACCEPT') && !forcedCanceled;
  const receiveMode: GiftButtonMode = !available
    ? 'disabled'
    : session.status === 'anonymous'
      ? 'login'
      : session.status === 'session' && viewer.isSuccess && !busy
        ? 'enabled'
        : 'disabled';

  const run = useCallback(
    async (m: typeof accept | typeof reject, onSuccess?: () => void) => {
      if (receiveMode !== 'enabled') return;
      setActionError(null);
      try {
        await m.mutateAsync();
        onSuccess?.();
      } catch (e) {
        handleError(e, codes);
      }
    },
    [receiveMode, codes],
  );

  return {
    state,
    /** 공개 값 — OG·공연 요약(상태와 상관없이 바로 그린다). 대기 중이 아니면 `event`·`ticket`이 null */
    summary: { senderName: pub.senderName, event: pub.event, ticket: pub.ticket } satisfies Pick<
      GiftLanding,
      'senderName' | 'event' | 'ticket'
    >,
    /** [선물받기]·[거절하기]의 상태 */
    receiveMode,
    accept: () =>
      run(accept, () => {
        setAccepted(true);
        router.push(TICKETS_HREF);
      }),
    /** 거절 확인 팝업(`128:1831`)은 V가 열고 확인에서 부른다 */
    reject: () => run(reject),
    /** [선물 취소/회수] — 보낸 사람(`giftId`)의 OWN_LINK·EXPIRED */
    cancelGift: cancel.cancel,
    cancelMode: (state.status === 'ready' && state.screen.actions.includes('CANCEL_GIFT') && !busy
      ? 'enabled'
      : 'disabled') as GiftButtonMode,
    pending: busy,
    /** 처리된 에러 안내(이미 처리됨 등). 상태 화면은 다시 읽은 값으로 바뀐다 */
    actionError: actionError ?? cancel.error?.message ?? null,
    ticketsHref: TICKETS_HREF,
  };
}
