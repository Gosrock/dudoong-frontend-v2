import { z } from 'zod';

import { EntranceStateSchema } from '../order/schema';
import { openEnum } from '../shared/open-enum';

/**
 * 체크인 스키마 — 관객 셀프 체크인(PQ-5)과 호스트 스캔(PQ-2, P13b)이 같은 응답을 쓴다.
 * 기준: 백엔드 dev 24aa595 `v2/operation/dto/response/V2CheckInResponses.kt`, 요청 `V2OperationRequests.kt`(`V2SelfCheckInRequest`),
 * 판정 `V2CheckInDomainService`, 예시 `e2e-tests/test_42_v2_operations.py`(test_08_self_check_in).
 */

/** 체크인 결과(api-contract §3). `SELECT_TICKET`은 셀프 전용. PQ-2·PQ-5는 실패도 200 + 이 값이다 */
export const CHECK_IN_RESULTS = [
  'ENTERED',
  'ALREADY_ENTERED',
  'OTHER_EVENT',
  'CANCELED',
  'SELECT_TICKET',
  'GIFT_PENDING',
] as const;
export const CheckInResultSchema = openEnum('CheckInResult', CHECK_IN_RESULTS);
export type CheckInResult = z.infer<typeof CheckInResultSchema>;

export const CheckInTicketSchema = z.object({
  ticketUuid: z.string().nullable(),
  issuedTicketNo: z.string().nullable(),
  ticketName: z.string().nullable(),
  /** 주문자. 현장 확인에는 쓰지 않는다 */
  buyerName: z.string().nullable(),
  /** 현재 소유자(선물 수락이면 받은 사람). 현장 확인은 이 이름으로 */
  ownerName: z.string().nullable(),
  entrance: EntranceStateSchema,
  enteredAt: z.string().nullable(),
});
export type CheckInTicket = z.infer<typeof CheckInTicketSchema>;

/** PQ-2 · PQ-5 결과. `ticket`은 OTHER_EVENT·SELECT_TICKET이면 null, `candidates`는 SELECT_TICKET일 때만 채워진다 */
export const CheckInResponseSchema = z.object({
  result: CheckInResultSchema,
  ticket: CheckInTicketSchema.nullable(),
  candidates: z.array(CheckInTicketSchema),
});
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;

/** 셀프 체크인 토큰 최대 길이(`V2CheckInDomainService.TOKEN_MAX_LENGTH`). 실제 값은 base64url 43자 */
export const CHECK_IN_TOKEN_MAX = 64;

/** PQ-5 본문(엄격). 여러 장이면 `SELECT_TICKET`의 후보 중 하나를 `ticketUuid`로 다시 보낸다 */
export const SelfCheckInRequestSchema = z.strictObject({
  token: z.string().trim().min(1).max(CHECK_IN_TOKEN_MAX),
  ticketUuid: z.string().min(1).max(64).optional(),
});
export type SelfCheckInRequest = z.infer<typeof SelfCheckInRequestSchema>;
