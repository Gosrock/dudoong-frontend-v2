import { startSession } from '@/api/session-flag';

import { browserLocation } from '../browser-location';
import { clearLoginRedirect, readLoginRedirect } from './login-redirect';

/**
 * 로그인·가입 성공(두둥 토큰 쿠키가 세팅됨). `dd:session`을 새 값으로 세우고 돌아올 곳으로 **하드 이동**한다 —
 * 익명으로 캐시된 GM-1(`null`)·viewer 쿼리가 남지 않게(tech-decisions §4 인증 표 "로그인 콜백").
 * 새 값이라 다른 탭은 `storage` 이벤트로 "다른 세션"을 알고 다시 그린다.
 *
 * `assign`이 아니라 `replace`다: 콜백 주소(이미 쓴 인가 코드)가 기록에 남으면 뒤로가기가 코드를 다시 교환하다 실패한다.
 */
export function finishLogin() {
  const to = readLoginRedirect();
  startSession();
  clearLoginRedirect();
  browserLocation.replace(to);
}
