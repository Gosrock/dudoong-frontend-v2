import { mutationOptions } from '@tanstack/react-query';

import { api } from '../http';
import { CheckInResponseSchema, type SelfCheckInRequest } from './schema';

/**
 * PQ-5 관객 셀프 체크인(로그인). 토큰의 공연이 OPEN이어야 한다(아니면 `Event_400_5`), 잘못된 토큰은 `Event_400_26`,
 * 이 공연의 남의 티켓을 고르면 `IssuedTicket_400_1`. 그 밖의 판정은 200 + `result`.
 */
export const selfCheckInMutation = () =>
  mutationOptions({
    mutationFn: (body: SelfCheckInRequest) =>
      api.post('check-ins/self', CheckInResponseSchema, body),
  });
