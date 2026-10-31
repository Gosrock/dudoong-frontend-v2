import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { CheckInResponseSchema, type HostCheckInRequest, type SelfCheckInRequest } from './schema';

/**
 * PQ-5 관객 셀프 체크인(로그인). 토큰의 공연이 OPEN이어야 한다(아니면 `Event_400_5`), 잘못된 토큰은 `Event_400_26`,
 * 이 공연의 남의 티켓을 고르면 `IssuedTicket_400_1`. 그 밖의 판정은 200 + `result`.
 */
export const selfCheckInMutation = () =>
  mutationOptions({
    mutationFn: (body: SelfCheckInRequest) =>
      api.post('check-ins/self', CheckInResponseSchema, body),
  });

/**
 * PQ-2 호스트 QR 스캔 입장(일반 멤버 이상). **실패도 200 + `result`**(ENTERED · ALREADY_ENTERED · OTHER_EVENT · CANCELED · GIFT_PENDING).
 * 공연이 OPEN·CALCULATING이 아니면 400 `Event_400_27`. 검사 순서(백엔드 cb8d24e): 본문 검증(400 `BAD_REQUEST`) → 권한
 * (`@HostRolesAllowed` — 없는 공연 404 `Event_404_1`, 비멤버 403 `HOST_400_2`) → 공연 상태(`Event_400_27`) → 판정
 */
export const hostCheckInMutation = (eventId: string | number) =>
  mutationOptions({
    mutationFn: (body: HostCheckInRequest) =>
      api.post(`events/${encodeURIComponent(eventId)}/check-ins`, CheckInResponseSchema, body),
  });
