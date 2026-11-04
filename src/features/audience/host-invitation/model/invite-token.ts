/**
 * 호스트 초대 링크 토큰 보호(백엔드 #928 B33② — "토큰 보호"). 토큰은 1회용 · 7일이고 링크를 가진 사람이면 누구나 수락할 수 있어
 * 주소창 · 기록 · Referer · 로그 · 분석 스크립트에 남기지 않는다.
 *
 * - 진입 직후 `history.replaceState`로 주소를 `/host-invitations`(토큰 없음)로 바꾼다 — 뒤로가기 · 새로고침 · 주소 복사에 토큰이 없다
 * - 토큰은 화면 메모리에만 둔다. **로그인으로 보낼 때만** `sessionStorage`에 잠깐 두고, 로그인에서 돌아오면 꺼내면서 바로 지운다
 *   (탭 단위 — 다른 탭 · 닫은 뒤에는 남지 않는다). 로그인 `redirect`에는 토큰 없는 경로만 넣는다
 * - 페이지 메타 `referrer: no-referrer` — 토큰이 주소에 있던 첫 요청들(스크립트 · 이미지)에도 Referer가 붙지 않는다(라우트 파일)
 * - 콘솔 · 로그에 쓰지 않는다. API 경로 로그는 `routePattern`이 `host-invitations/:param`으로 가린다
 */

/** 토큰 없는 화면 경로 — 주소창에 남기는 값이자 로그인에서 돌아올 곳 */
export const HOST_INVITATIONS_PATH = '/host-invitations';

const STORAGE_KEY = 'dd:hostInvitation';

/** 서버가 주는 토큰 모양(base64url). 다르면 요청하지 않고 "없는 초대"로 본다 */
export const isInviteTokenShape = (token: string) => /^[A-Za-z0-9_-]{8,128}$/.test(token);

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** 로그인으로 보내기 직전에만 */
export function keepInviteTokenForLogin(token: string) {
  try {
    storage()?.setItem(STORAGE_KEY, token);
  } catch {
    // 막힌 저장소 — 돌아와서 "링크를 다시 열어 주세요"
  }
}

/** 로그인에서 돌아왔을 때 — 꺼내면서 지운다 */
export function takeInviteToken(): string | null {
  try {
    const s = storage();
    const token = s?.getItem(STORAGE_KEY) ?? null;
    s?.removeItem(STORAGE_KEY);
    return token && isInviteTokenShape(token) ? token : null;
  } catch {
    return null;
  }
}

/** 주소에서 토큰을 지운다. Next 라우터와 같이 움직인다(`usePathname`이 새 경로를 본다) */
export function stripInviteTokenFromUrl() {
  if (window.location.pathname !== HOST_INVITATIONS_PATH) {
    window.history.replaceState(null, '', HOST_INVITATIONS_PATH);
  }
}

/** 초대한 역할 이름 — 호스팅 `HOST_ROLE_LABEL`과 같은 말(관객 피처는 호스팅을 import하지 않는다) */
export const INVITED_ROLE_LABEL: Record<string, string> = {
  MASTER: '마스터',
  MANAGER: '매니저',
  GUEST: '일반 멤버',
};
export const invitedRoleLabel = (role: string) => INVITED_ROLE_LABEL[role] ?? '멤버';
