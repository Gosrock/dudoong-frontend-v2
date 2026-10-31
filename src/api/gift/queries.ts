import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { MyTicketDetailSchema } from '../my-ticket/schema';
import { GiftLandingSchema, GiftLandingViewerSchema } from './schema';

/**
 * GG-3 선물 랜딩. `viewState`·`isReceiver`가 보는 사람에 따라 달라 공개·viewer 키를 나눈다(tech-decisions §4).
 * 토큰은 로그에 남지 않는다 — `routePattern`이 `gifts/` 다음 세그먼트를 가리고, `serverQuery`는 queryKey 첫 원소만 남긴다.
 */

/** 공개 — 라우트 파일이 `<Prefetch>`로 서버에서 읽는다(OG·공연 요약). */
export const giftLandingQuery = (giftToken: string) =>
  queryOptions({
    queryKey: ['gifts', giftToken],
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      api.get(`gifts/${encodeURIComponent(giftToken)}`, GiftLandingSchema, {
        public: true,
        signal,
      }),
  });

/** viewer — 브라우저에서만, 세션이 있을 때 `enabled`. 확정 전에는 상태 영역 전체를 스켈레톤으로 둔다. */
export const giftLandingViewerQuery = (giftToken: string) =>
  queryOptions({
    queryKey: ['gifts', giftToken, 'viewer'],
    queryFn: ({ signal }) =>
      api.get(`gifts/${encodeURIComponent(giftToken)}`, GiftLandingViewerSchema, { signal }),
  });

/**
 * GG-7a 보낸 사람의 "선물 완료" 티켓 상세(T-1의 SENT 행 `giftId`로 연다). T-2와 같은 모양이고 uuid·QR이 없다.
 * 선물 완료가 아니거나 내 선물이 아니면 404 `Gift_404_1` → 티켓탭을 다시 읽는다.
 * 키는 티켓 접두(`['me', 'tickets']`) 아래 — 반환·회수 뒤 티켓 쿼리와 함께 무효화된다.
 */
export const sentGiftTicketQuery = (giftId: number) =>
  queryOptions({
    queryKey: ['me', 'tickets', 'sent-gifts', giftId],
    queryFn: ({ signal }) => api.get(`me/gifts/${giftId}/ticket`, MyTicketDetailSchema, { signal }),
  });
