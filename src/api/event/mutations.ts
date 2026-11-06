import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type CancelEventRequest,
  type CreateEventRequest,
  CreateEventResponseSchema,
  EventCancelResultSchema,
  EventManageSchema,
  EventSectionsSchema,
  EventStatusResultSchema,
  type UpdateEventBasicRequest,
  type UpdateEventSectionsRequest,
} from './schema';

/*
 * 공연 관리(호스팅 센터 P11) 변경. 기준: 백엔드 `V2EventController`·유스케이스(dev 432cce4, cb8d24e까지 변경 없음).
 * 권한은 모두 그 공연 호스트의 매니저 이상 — 비멤버 403 `HOST_400_2`, 일반 멤버 403 `HOST_400_1`(HTTP 상태로 분기, patterns §11).
 * 캐시 반영·이동은 화면(`features/hosting/event/model`)이 한다(patterns §4-1).
 */

const eventPath = (eventId: string | number) => `events/${encodeURIComponent(eventId)}`;

/**
 * PE-2 간편 공연 만들기. 응답은 `{eventId}`뿐이다. 상태는 준비중.
 * - `Event_400_2` 종료 ≤ 시작, 400 `BAD_REQUEST` 검증(이름 1~25자, 시작이 지금 이후 `@Future` 등 — 폼이 먼저 막는다)
 */
export const createEventMutation = () =>
  mutationOptions({
    mutationFn: (body: CreateEventRequest) => api.post('events', CreateEventResponseSchema, body),
  });

/**
 * PE-4 기본 정보 부분 수정. 응답은 GE-3과 같은 모양이라 화면이 GE-3 키에 넣는다.
 * - `Event_400_2` 종료 ≤ 시작 · `Event_400_17` 정산중·지난 공연 · `Event_400_18` 등록 후 티켓 여부 변경 ·
 *   `Event_400_20` 문의처 · `Event_400_22` 이 공연 포스터 key 아님 · `Event_400_23` 태그 · `Event_400_24` 등록된 공연의 시작을 과거로 ·
 *   `Event_400_25` 유효 티켓이 있는데 티켓 없음으로
 */
export const updateEventBasicMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: UpdateEventBasicRequest) =>
      api.patch(`${eventPath(eventId)}/basic`, EventManageSchema, body),
  });

/**
 * PE-6 섹션 전체 교체(`{sections}` — 빠진 섹션은 지워진다). 응답은 저장된 섹션 목록(GE-5 모양, sortOrder 0부터 다시).
 * - `Event_400_21` 형식(1~10개, 제목 1~20자, 본문 20,000자) · `Event_400_17` 정산중·지난 공연
 */
export const updateEventSectionsMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: UpdateEventSectionsRequest) =>
      api.put(`${eventPath(eventId)}/sections`, EventSectionsSchema, body),
  });

/**
 * PE-8 공연 등록. 응답 `{eventId, status, displayStatus}`.
 * - `Event_400_7` 체크리스트 미충족 · `Event_400_8` 이미 오픈 · `Event_400_15` 시작 시각이 지남(체크리스트는 찼는데 시작이 지난 경우 —
 *   `Event.validateStartAt`, patterns §24에 없던 코드)
 */
export const openEventMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: () => api.post(`${eventPath(eventId)}/open`, EventStatusResultSchema),
  });

/**
 * DE-9 공연 삭제(준비중만, 소프트 삭제). 공연준비 홈 카드 ⋮에서 여러 공연을 다루므로 변수로 id를 받는다.
 * - `Event_400_19` 준비중이 아님 · `Event_400_13` 발급 티켓이 있음(v1 규칙 — 준비중에는 정상 흐름에서 나지 않는다)
 */
export const deleteEventMutation = () =>
  mutationOptions({
    mutationFn: (eventId: number) => api.delete(eventPath(eventId), EventStatusResultSchema),
  });

/**
 * E-11 공연 취소의 시간 제한. 서버가 한 번에 100건까지 주문마다 락 · 트랜잭션을 따로 잡고, 비동기 큐가 차면 주문 앞에서 최대 3초
 * 기다린다(`V2CancelEventUseCase`) — 다른 변경보다 길게 둔다. 넘으면 TIMEOUT이고 서버는 처리했을 수 있다(같은 API로 다시 — 멱등)
 */
export const CANCEL_EVENT_TIMEOUT_MS = 60_000;

/**
 * E-11 공연 취소(호스트 **마스터만**, Api 2.5.8 — 백엔드 #932 · 이슈 #136 §7). 등록(OPEN) · 시작 전 공연만.
 * 공연에 취소 표시(새 주문 · 장바구니 `Event_400_30`, 홈 · 목록 · 검색에서 빠짐) → 남은 주문을 오래된 순으로 처리(승인 대기는 거절,
 * 승인은 호스트 취소 — 입장 · 선물 티켓이 있어도, 결제 금액이 있으면 환불 요청). 응답 `remaining`·`failed`가 있으면 다시 부른다(멱등,
 * 이미 취소된 공연이면 표시 · 사유 검사를 건너뛰고 시작 시각이 지나도 된다).
 * - `Event_400_28` 준비중(→ DE-9 삭제) · `Event_400_29` 시작했거나 정산중 · 지난 공연 · `Event_400_31` 사유 1~100자 아님
 * - 마스터가 아니면 403(`HOST_400_4`) — 운영 2.5.3에는 API가 없다(404)
 */
export const cancelEventMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: CancelEventRequest) =>
      api.post(`${eventPath(eventId)}/cancel`, EventCancelResultSchema, body, {
        timeout: CANCEL_EVENT_TIMEOUT_MS,
      }),
  });
