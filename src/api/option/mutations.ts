import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type CreateOptionRequest,
  TicketOptionManageSchema,
  TicketOptionsManageSchema,
  type UpdateOptionRequest,
} from './schema';

/*
 * 옵션 풀 변경(P12). 기준: `V2TicketOptionController`·`V2*TicketOptionUseCase`·`V2TicketOptionDomainService`(432cce4, dev cb8d24e).
 * 권한은 매니저 이상(비멤버 403 `HOST_400_2`, 일반 멤버 403 `HOST_400_1`). 정산중·지난 공연은 `Event_400_17`.
 * 다른 공연의 옵션 id는 404 `Option_Group_404_1`(존재를 숨긴다). 캐시 반영은 화면(`features/hosting/ticket/model/ticket-cache`)이 한다.
 */

const optionsPath = (eventId: string | number) => `events/${encodeURIComponent(eventId)}/options`;

/**
 * P10/O-2 옵션 생성 → 만든 옵션(O-1 모양). 티켓에 붙이는 것은 따로 P10/O-5(patterns §23 — 두 번 호출).
 * - `Option_Group_400_6` 설명 50자 초과 · `Option_Group_400_3` 추가금(주관식에 0이 아닌 값) · `Option_Group_400_4` 객관식
 */
export const createOptionMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: CreateOptionRequest) =>
      api.post(optionsPath(eventId), TicketOptionManageSchema, body),
  });

/**
 * P10/O-3 옵션 부분 수정 → 수정된 옵션. 응답 형식은 바꿀 수 없다(본문에 `type`이 없다).
 * - `Option_Group_400_5` 잠긴 옵션의 추가금 변경 · `Item_Option_Group_400_4` 무료 티켓에 붙은 옵션을 유료로 ·
 *   `Option_Group_400_6` 바꾼 설명이 50자 초과 · `Option_Group_400_3` 주관식 추가금
 */
export const updateOptionMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: ({ optionId, body }: { optionId: number; body: UpdateOptionRequest }) =>
      api.patch(`${optionsPath(eventId)}/${optionId}`, TicketOptionManageSchema, body),
  });

/**
 * D10/O-4 옵션 삭제(옵션 자체를 지운다 — 판매 전 티켓에 붙어 있으면 떼어 내고 지운다) → 남은 옵션 목록.
 * 이 티켓에서만 빼는 것은 P10/O-5(떼기)다. - `Option_Group_400_2` 잠긴 티켓에 붙어 있음
 */
export const deleteOptionMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (optionId: number) =>
      api.delete(`${optionsPath(eventId)}/${optionId}`, TicketOptionsManageSchema),
  });
