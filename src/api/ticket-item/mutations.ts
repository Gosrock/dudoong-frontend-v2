import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type CreateTicketItemRequest,
  type ReplaceTicketOptionsRequest,
  TicketItemManageSchema,
  TicketItemsManageSchema,
  type UpdateTicketItemRequest,
} from './schema';

/*
 * 티켓 관리 변경(호스팅 센터 P12). 기준: `V2TicketItemController`·`V2*TicketItemUseCase`·`V2TicketItemDomainService`·
 * `TicketItemErrorCode`(432cce4 → dev cb8d24e). 권한은 모두 매니저 이상(비멤버 403 `HOST_400_2`, 일반 멤버 403 `HOST_400_1`).
 * 정산중·지난 공연은 `Event_400_17`, 다른 공연의 티켓 id는 404 `Ticket_Item_404_1`. 형식·길이 검증 실패는 400 `BAD_REQUEST`
 * (모르는 `bankCode` 포함). 캐시 반영은 화면(`features/hosting/ticket/model/ticket-cache`)이 한다(patterns §4-1).
 */

const itemsPath = (eventId: string | number) =>
  `events/${encodeURIComponent(eventId)}/ticket-items`;

/**
 * P10/T-2 티켓 생성 → 만든 티켓(T-1 모양). 검사 순서: 동의(`Agreement_400_1`, 두둥 + 강제 켜짐) → `Event_400_17` →
 * 티켓 없음 공연 `Ticket_Item_400_12` → 가격 `400_3` · 계좌 없음 `400_8` · 이름·설명 길이·무제한 + 재고 공개 `400_15` ·
 * 수량 범위 `400_2` · 판매 기간 `400_13`
 */
export const createTicketItemMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: CreateTicketItemRequest) =>
      api.post(itemsPath(eventId), TicketItemManageSchema, body),
  });

/**
 * P10/T-3 티켓 부분 수정 → 수정된 티켓. 바뀐 필드만 + 비울 때 `clear[]`(patterns §23).
 * - `Ticket_Item_400_15` clear 대상에 명시적 null · 값과 clear 동시 · 길이 · 무제한 + 재고 공개
 * - `Ticket_Item_400_14` 잠긴 티켓의 종류·이름·가격·계좌·승인 여부 변경 또는 수량 감소
 * - `Ticket_Item_400_11` 기존 PG 티켓 · `Item_Option_Group_400_4` 유료 옵션이 붙은 티켓을 무료로 · `Agreement_400_1` 무료 → 두둥(#873)
 * - 그 밖은 T-2와 같다(`400_3`·`400_8`·`400_2`·`400_13`)
 */
export const updateTicketItemMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: ({ ticketItemId, body }: { ticketItemId: number; body: UpdateTicketItemRequest }) =>
      api.patch(`${itemsPath(eventId)}/${ticketItemId}`, TicketItemManageSchema, body),
  });

/** D10/T-4 티켓 삭제 → 남은 티켓 목록. - `Ticket_Item_400_7` 잠긴 티켓(재고 감소 또는 승인 대기) — 판매 중단만 된다 */
export const deleteTicketItemMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (ticketItemId: number) =>
      api.delete(`${itemsPath(eventId)}/${ticketItemId}`, TicketItemsManageSchema),
  });

/** P10/T-5 판매 중단 → 그 티켓. 이미 중단이면 그대로 200(멱등). 잠긴 티켓도 된다 */
export const suspendTicketItemMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (ticketItemId: number) =>
      api.post(`${itemsPath(eventId)}/${ticketItemId}/suspend`, TicketItemManageSchema),
  });

/** P10/T-6 판매 재개 → 그 티켓. 이미 판매 중이면 그대로 200 */
export const resumeTicketItemMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (ticketItemId: number) =>
      api.post(`${itemsPath(eventId)}/${ticketItemId}/resume`, TicketItemManageSchema),
  });

/**
 * P10/O-5 티켓에 붙은 옵션 전체 지정(PUT — 붙이기·떼기 모두 이것) → 그 티켓.
 * - `Item_Option_Group_400_2` 잠긴 티켓(같은 목록이면 통과) · `Item_Option_Group_400_4` 무료 티켓에 유료 옵션 ·
 *   `Option_Group_400_1` 다른 공연의 옵션(#758 L-3에서 404로 바뀔 수 있다) · 404 `Option_Group_404_1` 없는·지운 옵션
 */
export const replaceTicketOptionsMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: ({
      ticketItemId,
      body,
    }: {
      ticketItemId: number;
      body: ReplaceTicketOptionsRequest;
    }) => api.put(`${itemsPath(eventId)}/${ticketItemId}/options`, TicketItemManageSchema, body),
  });
