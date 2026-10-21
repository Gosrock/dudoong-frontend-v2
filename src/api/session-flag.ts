/**
 * 세션 표시(tech-decisions §4 인증, patterns §5-1).
 * - `dd:session` — 로그인할 때마다 새로 만든 무작위 값. 있으면 "이 브라우저에 세션이 있었다", 바뀌면 "다른 세션"이다.
 * - `dd:refreshedAt` — 마지막으로 재발급에 성공한 시각(ms). 탭 사이에서 "이미 다른 탭이 재발급했다"를 판정한다.
 *
 * `src/api`의 401 처리가 읽어야 해서 여기 둔다. 세우고 지우는 시점(로그인 콜백·GM-1·세션 상실·로그아웃)은
 * `features/shared/auth`가 정한다. 저장소 접근이 실패하면(사파리 비공개 모드, 막힌 저장소) "없음"으로 본다.
 */

export const SESSION_KEY = 'dd:session';
export const REFRESHED_AT_KEY = 'dd:refreshedAt';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    const s = storage();
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // 저장소가 막혀 있으면 세션 표시 없이 동작한다(익명처럼 보인다)
  }
}

/** 지금 저장소의 `dd:session` 값. 없거나 읽을 수 없으면 null */
export const readSessionFlag = () => read(SESSION_KEY);

/**
 * 이 탭이 알고 있는 `dd:session` 값 — 처음 읽은 값(페이지 로드)이고, 이 탭이 직접 바꾸면 따라 바뀐다.
 * `storage` 이벤트와 `pageshow`(bfcache 복원)가 "다른 탭이 바꿨는지"를 이 값과 비교한다.
 */
let known: string | null | undefined;
export function knownSessionFlag(): string | null {
  if (known === undefined) known = readSessionFlag();
  return known;
}
/** 다른 탭이 세운 값을 이 탭도 받아들일 때(같은 사용자) */
export function adoptSessionFlag(value: string | null) {
  known = value;
}

function randomId() {
  // randomUUID는 보안 컨텍스트에서만 있다(LAN IP로 띄운 개발 서버 등). getRandomValues는 어디서나 된다
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 새 세션 표시를 세운다. 로그인 성공(P4b 콜백)마다 부른다. 세운 값을 돌려준다 */
export function startSession(): string {
  const value = randomId();
  write(SESSION_KEY, value);
  known = value;
  return value;
}

/**
 * GM-1이 성공했는데 표시가 없을 때(ITP가 지웠거나 v1에서 넘어온 사용자) 세운다(tech-decisions §4 인증 표).
 * 이미 있으면 그대로 둔다 — 값을 바꾸면 다른 탭이 "다른 세션"으로 본다.
 */
export function ensureSessionFlag() {
  const current = readSessionFlag();
  if (current !== null) {
    known = current;
    return;
  }
  startSession();
}

/** 세션 상실·로그아웃 */
export function clearSessionFlag() {
  write(SESSION_KEY, null);
  known = null;
}

/** 마지막 재발급 성공 시각(ms). 없으면 0 */
export function readRefreshedAt(): number {
  const n = Number(read(REFRESHED_AT_KEY));
  return Number.isFinite(n) ? n : 0;
}

export function markRefreshed(at = Date.now()) {
  write(REFRESHED_AT_KEY, String(at));
}

/** 테스트 전용 — 모듈 상태(이 탭이 아는 값)를 지운다 */
export function resetSessionFlagStateForTest() {
  known = undefined;
}
