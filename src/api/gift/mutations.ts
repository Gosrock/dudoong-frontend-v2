import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { GiftCreatedSchema, type GiftMemoRequest, GiftResultSchema } from './schema';

/**
 * 선물 변경(로그인). 캐시 반영·이동은 화면 훅이 한다 — 수락·반환·회수·거절 뒤에는 티켓·선물·알림 쿼리를 무효화한다(tech-decisions §20).
 * 경로의 uuid·토큰은 `encodeURIComponent`. 토큰은 로그에 남지 않는다(`routePattern`).
 */

/** PG-1 선물 링크 만들기. 메모가 없으면 `{}` */
export const createGiftMutation = (ticketUuid: string) =>
  mutationOptions({
    mutationFn: (body: GiftMemoRequest) =>
      api.post(`me/tickets/${encodeURIComponent(ticketUuid)}/gift`, GiftCreatedSchema, body),
  });

/** DG-2 선물 취소(회수) — 보낸 사람, 대기 중이면 공연이 끝난 뒤에도 */
export const cancelGiftMutation = (giftId: number) =>
  mutationOptions({
    mutationFn: () => api.delete(`me/gifts/${giftId}`, GiftResultSchema),
  });

/** PG-8 메모 수정 — 보낸 사람, 대기 중일 때만. 빈 문자열이면 메모 삭제 */
export const changeGiftMemoMutation = (giftId: number) =>
  mutationOptions({
    mutationFn: (body: Required<GiftMemoRequest>) =>
      api.patch(`me/gifts/${giftId}`, GiftResultSchema, body),
  });

/** PG-4 선물 받기. 응답 `ticketUuid`가 받은 사람의 새 uuid */
export const acceptGiftMutation = (giftToken: string) =>
  mutationOptions({
    mutationFn: () => api.post(`gifts/${encodeURIComponent(giftToken)}/accept`, GiftResultSchema),
  });

/** PG-5 선물 거절(수락 전). 티켓은 보낸 사람에게 그대로 */
export const rejectGiftMutation = (giftToken: string) =>
  mutationOptions({
    mutationFn: () => api.post(`gifts/${encodeURIComponent(giftToken)}/reject`, GiftResultSchema),
  });

/** PG-6 받은 티켓 반환(수락 후, 입장 전·공연 시작 전). 보낸 사람에게 돌아가고 uuid가 바뀐다 */
export const returnGiftMutation = (ticketUuid: string) =>
  mutationOptions({
    mutationFn: () =>
      api.post(`me/tickets/${encodeURIComponent(ticketUuid)}/return`, GiftResultSchema),
  });
