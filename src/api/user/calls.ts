import { z } from 'zod';

import { prefixV1Auth, request, withSessionRecovery } from '../client';

/**
 * 회원 탈퇴 v1 `DELETE /api/v1/auth/me`(api-contract §9, `AuthController.withDrawUser` @432cce4). 성공하면 응답이 두둥 토큰 쿠키
 * 2개를 지운다(본문 `data`는 null). 마스터인 호스트에 다른 활성 멤버나 OPEN·정산중 공연이 있으면 400 `USER_400_6`.
 * 탈퇴하면 내가 보낸 대기 중 선물이 취소된다(api-contract §6 — 확인 문구는 V).
 *
 * `authApi`와 같은 v1 인증 경로지만 **보호 API**라 만료 액세스 쿠키면 401이다 — `api` 객체처럼 `dd:session`이 있을 때 재발급 후
 * 한 번 다시 보낸다(`withSessionRecovery`). 재발급은 `authApi`(가로채기 없음)로 하므로 Web Lock 재진입은 없다.
 */
export const withdrawAccount = () =>
  withSessionRecovery(false, () => request('delete', prefixV1Auth, 'me', z.unknown()));
