import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import {
  type CreateEventRequest,
  CreateEventResponseSchema,
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
