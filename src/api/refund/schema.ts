import { z } from 'zod';

/**
 * 은행 목록 G10/T-7 `GET /api/v2/banks`(공개, #804·#813) — `V2BankResponse{code, name}` 배열, 금융결제원 3자리 코드 순 25개
 * (`BankCode` @432cce4). 환불 계좌(P9)가 쓴다 — 티켓 입금 계좌(P12)도 같은 목록이다. P12가 쓰게 되면 `src/api/bank`로
 * 옮길지 그때 정한다(지금 쓰는 곳은 환불 계좌 하나).
 */
export const BankSchema = z.object({
  /** 요청 계좌의 `bankCode`로 그대로 보낸다 */
  code: z.string(),
  /** 표시 이름(서버가 계좌 `bankName`을 이 값으로 채운다) */
  name: z.string(),
});
export type Bank = z.infer<typeof BankSchema>;
export const BanksSchema = z.array(BankSchema);
