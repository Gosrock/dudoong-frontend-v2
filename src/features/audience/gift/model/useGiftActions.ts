'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
  cancelGiftMutation,
  changeGiftMemoMutation,
  createGiftMutation,
  returnGiftMutation,
} from '@/api/gift/mutations';
import { type ErrorCodeHandlers, handleError } from '@/api/handle-error';
import { myTicketQuery, myTicketsQuery } from '@/api/my-ticket/queries';

import { refreshAfterGiftChange } from './gift-cache';
import { GIFT_ERROR_TABLE, type GiftAction, type GiftErrorOutcome } from './gift-errors';
import { changeMemoBody, createGiftBody, giftMemoError } from './gift-memo';
import { type GiftRefetchContext, refetchForGift } from './gift-refetch';
import { giftShare } from './gift-share';

/**
 * 티켓 상세에서 하는 선물 동작(plan P8b). 버튼 노출은 T-2의 `canGift`·`canReturn`(`useTicketDetail`)이 정한다.
 * 확인 팝업(EasyOverlay)은 V가 열고, 확인에서 이 훅의 동작을 부른다 — 요청 중에는 `pending`으로 버튼을 잠근다.
 */

export type GiftActionError = { message: string; field?: 'memo' };

/** 표(`gift-errors.ts`)로 `handleError` 표를 만든다. 처리 뒤 다시 읽기는 표의 `refetch`대로 */
function useGiftCodes(
  action: GiftAction,
  ctx: GiftRefetchContext,
  onOutcome: (outcome: GiftErrorOutcome, code: string) => void | Promise<void>,
): ErrorCodeHandlers {
  const queryClient = useQueryClient();
  const { ticketUuid, giftToken } = ctx;
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(GIFT_ERROR_TABLE[action]).map(([code, outcome]) => [
          code,
          () => {
            void (async () => {
              await refetchForGift(queryClient, outcome.refetch, { ticketUuid, giftToken });
              await onOutcome(outcome, code);
            })();
          },
        ]),
      ),
    [action, queryClient, ticketUuid, giftToken, onOutcome],
  );
}

// ─── 보내기(PG-1) ─────────────────────────────────────────────

/** 만든(또는 이미 있던) 선물 링크 */
export type GiftLink = {
  giftId: number;
  linkPath: string;
  memo: string | null;
  /** `Gift_400_2`로 기존 링크를 보여 주는 중 */
  existing: boolean;
};

/**
 * [선물하기] → PG-1. 성공하면 링크(`link`)를 돌려주고 이 티켓의 T-2와 목록을 무효화한다(선물 대기로 바뀐다).
 * - `Gift_400_2`(이미 선물 중) → T-2를 다시 읽어 `gift.linkPath`로 기존 링크(`link.existing`)
 * - `Gift_400_1` → T-2 다시 읽기 + 안내(버튼은 `canGift`로 이미 숨는다)
 * - `IssuedTicket_404_1` → 목록 다시 읽기 + `gone`
 * - `Gift_400_9` · 로컬 검증 → 메모 칸 오류
 */
export function useSendGift(ticketUuid: string) {
  const queryClient = useQueryClient();
  const [link, setLink] = useState<GiftLink | null>(null);
  const [error, setError] = useState<GiftActionError | null>(null);
  const [gone, setGone] = useState(false);

  const onOutcome = useCallback(
    (outcome: GiftErrorOutcome) => {
      if (outcome.refetch.includes('tickets')) setGone(true);
      if (outcome.showExistingLink) {
        const fresh = queryClient.getQueryData(myTicketQuery(ticketUuid).queryKey);
        const gift = fresh?.gift;
        if (gift?.linkPath && fresh?.giftState === 'PENDING') {
          setLink({
            giftId: gift.giftId,
            linkPath: gift.linkPath,
            memo: gift.memo,
            existing: true,
          });
          return;
        }
      }
      setError({ message: outcome.message, field: outcome.field });
    },
    [queryClient, ticketUuid],
  );
  const codes = useGiftCodes('send', { ticketUuid }, onOutcome);

  // 티켓 무효화는 화면이 사라져도 해야 하므로 옵션의 onSuccess에 둔다
  const mutation = useMutation({
    ...createGiftMutation(ticketUuid),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: myTicketQuery(ticketUuid).queryKey,
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: myTicketsQuery().queryKey, exact: true }),
      ]);
    },
  });

  const send = useCallback(
    async (memo?: string | null) => {
      if (mutation.isPending || link) return;
      setError(null);
      const memoError = giftMemoError(memo);
      if (memoError) {
        setError({ message: memoError, field: 'memo' });
        return;
      }
      try {
        const created = await mutation.mutateAsync(createGiftBody(memo));
        setLink({
          giftId: created.giftId,
          linkPath: created.linkPath,
          memo: created.memo,
          existing: false,
        });
      } catch (e) {
        handleError(e, codes);
      }
    },
    [mutation, link, codes],
  );

  return { send, pending: mutation.isPending, link, error, gone };
}

// ─── 링크 공유 · 메모(PG-8) ───────────────────────────────────

export type UseGiftLinkInput = {
  giftId: number;
  linkPath: string;
  memo: string | null;
  /** 공유 미리보기용 공개 값(T-2의 공연·티켓) */
  eventName: string | null;
  posterImageUrl: string | null;
  ticketName: string | null;
  /** 이 선물의 티켓(메모 저장 뒤 T-2 갱신, `Gift_400_3` 뒤 다시 읽기) */
  ticketUuid?: string | null;
};

const browserOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin);

/**
 * 링크 생성 완료 화면(`455:8935`) — 공유 내용(메시지·카카오톡·링크 복사)과 메모 수정(PG-8, 대기 중일 때만, 빈 값 = 삭제).
 * 공유를 실제로 여는 것(`shareKakaoFeed`, 클립보드)은 V가 한다.
 */
export function useGiftLink(input: UseGiftLinkInput) {
  const queryClient = useQueryClient();
  const { giftId, linkPath, ticketUuid } = input;
  const [memo, setMemo] = useState(input.memo);
  const [error, setError] = useState<GiftActionError | null>(null);
  /** 이미 처리된 선물(수락·회수됨) — 메모를 더 바꿀 수 없다 */
  const [closed, setClosed] = useState(false);

  const share = useMemo(
    () =>
      giftShare({
        origin: browserOrigin(),
        linkPath,
        eventName: input.eventName,
        posterImageUrl: input.posterImageUrl,
        ticketName: input.ticketName,
      }),
    [linkPath, input.eventName, input.posterImageUrl, input.ticketName],
  );

  const onOutcome = useCallback((outcome: GiftErrorOutcome, code: string) => {
    if (code !== 'Gift_400_9') setClosed(true);
    setError({ message: outcome.message, field: outcome.field });
  }, []);
  const codes = useGiftCodes('memo', { ticketUuid }, onOutcome);

  const mutation = useMutation({
    ...changeGiftMemoMutation(giftId),
    onSuccess: async () => {
      if (ticketUuid) {
        await queryClient.invalidateQueries({
          queryKey: myTicketQuery(ticketUuid).queryKey,
          exact: true,
        });
      }
    },
  });

  const saveMemo = useCallback(
    async (next: string) => {
      if (mutation.isPending || closed) return false;
      setError(null);
      const memoError = giftMemoError(next);
      if (memoError) {
        setError({ message: memoError, field: 'memo' });
        return false;
      }
      try {
        const saved = await mutation.mutateAsync(changeMemoBody(next));
        setMemo(saved.memo);
        return true;
      } catch (e) {
        handleError(e, codes);
        return false;
      }
    },
    [mutation, closed, codes],
  );

  return { share, memo, saveMemo, savingMemo: mutation.isPending, error, closed };
}

// ─── 선물 취소·회수(DG-2) ─────────────────────────────────────

/**
 * [선물 취소]·[선물 회수] → DG-2(보낸 사람). 티켓탭(선물 대기·만료 티켓)과 랜딩(`OWN_LINK`·`EXPIRED` + `giftId`)이 같이 쓴다.
 * 성공하면 티켓·선물·알림 쿼리를 무효화한다. `Gift_400_3`(이미 수락됨 등) → 연 곳(T-2 또는 GG-3)을 다시 읽는다.
 */
export function useCancelGift(giftId: number | null, ctx: GiftRefetchContext = {}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<GiftActionError | null>(null);
  const [done, setDone] = useState(false);
  const onOutcome = useCallback((outcome: GiftErrorOutcome) => {
    setError({ message: outcome.message });
  }, []);
  const codes = useGiftCodes('cancel', ctx, onOutcome);

  const mutation = useMutation({
    ...cancelGiftMutation(giftId ?? 0),
    onSuccess: () => refreshAfterGiftChange(queryClient),
  });

  const cancel = useCallback(async () => {
    if (giftId === null || mutation.isPending || done) return;
    setError(null);
    try {
      await mutation.mutateAsync();
      setDone(true);
    } catch (e) {
      handleError(e, codes);
    }
  }, [giftId, mutation, done, codes]);

  return { cancel, pending: mutation.isPending, error, done };
}

// ─── 반환(PG-6) ──────────────────────────────────────────────

/**
 * [선물 반환] → PG-6(받은 사람, `canReturn`일 때만 보인다). 성공하면 이 티켓은 보낸 사람에게 가고 uuid가 바뀐다 —
 * 옛 uuid의 T-2를 지우고 티켓 쿼리 전체를 무효화한다. V는 `done`이면 상세를 닫는다.
 * `Gift_400_8`(받은 티켓 아님, 서버가 먼저 본다) → 목록 다시 읽기 + `gone`, `Gift_400_7` → T-2 다시 읽기 + 안내,
 * `IssuedTicket_404_1` → 목록 다시 읽기 + `gone`.
 */
export function useReturnGift(ticketUuid: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<GiftActionError | null>(null);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const onOutcome = useCallback((outcome: GiftErrorOutcome) => {
    if (outcome.refetch.includes('tickets')) setGone(true);
    setError({ message: outcome.message });
  }, []);
  const codes = useGiftCodes('return', { ticketUuid }, onOutcome);

  const mutation = useMutation({
    ...returnGiftMutation(ticketUuid),
    // done(상세 닫기)을 옛 uuid T-2 제거보다 먼저 알려야 상세가 지운 쿼리를 다시 읽지 않는다 — 그래서 옵션에 둔다
    onSuccess: async () => {
      setDone(true);
      await refreshAfterGiftChange(queryClient, { staleTicketUuid: ticketUuid });
    },
  });

  const giveBack = useCallback(async () => {
    if (mutation.isPending || done) return;
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (e) {
      handleError(e, codes);
    }
  }, [mutation, done, codes]);

  return { giveBack, pending: mutation.isPending, error, done, gone };
}
