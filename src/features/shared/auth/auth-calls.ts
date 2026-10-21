import { z } from 'zod';

import { authApi } from '@/api/http';

/**
 * v1 인증 호출(api-contract §9). `authApi`에는 401 가로채기가 없다(재발급이 재발급을 부르지 않게).
 * 본문의 토큰은 쓰지 않는다 — 쿠키로 온다. 그래서 응답 모양을 검사하지 않는다.
 */

/** `POST /api/v1/auth/token/refresh` — 본문 없이 리프레시 쿠키로. 타임아웃은 요청 기본값 10초 */
export const refreshTokens = () => authApi.post('token/refresh', z.unknown());

/** `POST /api/v1/auth/logout` — 쿠키 삭제. 결과와 상관없이 호출한 쪽이 로컬을 정리한다 */
export const requestLogout = () => authApi.post('logout', z.unknown());
