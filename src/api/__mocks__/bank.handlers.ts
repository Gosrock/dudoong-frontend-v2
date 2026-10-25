import { http } from 'msw';

import { banks } from './fixtures/bank';
import { ok } from './respond';

/**
 * 은행 목록 G10/T-7 `GET /api/v2/banks`(#804). 공개 GET이라 쿠키를 보지 않는다(만료·위조 토큰이어도 익명 200 — #792·#813).
 * 응답은 페이지가 아니라 배열이다(`List<V2BankResponse>`).
 */
export const bankHandlers = {
  default: [http.get('*/api/v2/banks', () => ok(banks))],
};
