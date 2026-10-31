import { z } from 'zod';

/**
 * 은행 목록 G10/T-7 `GET /api/v2/banks`(공개, #804·#813) — `V2BankResponse{code, name}` 배열, 금융결제원 3자리 코드 순 25개
 * (`BankCode` @432cce4, dev cb8d24e 그대로). 환불 계좌(P9)와 티켓 입금 계좌(P12)가 같은 목록을 쓴다(P12-L에서 `src/api/refund` → `src/api/bank`).
 * 계좌 요청에 `bankCode`를 보내면 서버가 `bankName`을 표시 이름으로 채우고, 모르는 코드는 400 `BAD_REQUEST`(`V2TicketAccountRequest.isBankCodeKnown`).
 */
export const BankSchema = z.object({
  /** 요청 계좌의 `bankCode`로 그대로 보낸다 */
  code: z.string(),
  /** 표시 이름(서버가 계좌 `bankName`을 이 값으로 채운다) */
  name: z.string(),
});
export type Bank = z.infer<typeof BankSchema>;
export const BanksSchema = z.array(BankSchema);
