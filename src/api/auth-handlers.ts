import { log } from '@/utils/log';

import { ApiError, SessionLostError } from './errors';
import { markRefreshed, readRefreshedAt, readSessionFlag } from './session-flag';

/**
 * 401 처리의 주입 지점과 재발급 판정(tech-decisions §4 인증, patterns §5-1).
 * `src/api`는 이동·캐시 비우기를 하지 않는다 — `features/shared/auth`가 `setAuthHandlers`로 넣는다(루트 providers.tsx).
 * 등록 전(서버 렌더, 테스트)에는 401을 그대로 던진다.
 */

export type AuthHandlers = {
  /**
   * 재발급 호출 한 번(`authApi.post('token/refresh')`, 타임아웃 10초). 결과 판정은 여기서 한다 —
   * 실패는 `ApiError`(HTTP 상태 그대로)로 던지면 된다. 2xx면 resolve.
   */
  refresh: () => Promise<unknown>;
  /** 세션 상실. 캐시 비우기 → `dd:session` 제거 → 이동. 여러 요청이 동시에 잃어도 한 번만 불린다 */
  onSessionLost: () => void;
};

/** 탭 사이 재발급 직렬화 잠금 이름 */
export const REFRESH_LOCK_NAME = 'dudoong-auth-refresh';
/** 잠금 대기 상한. 넘기면 일시 오류(잠금을 쥔 탭이 멈춰도 무한히 기다리지 않게) */
export const LOCK_WAIT_MS = 15_000;

let handlers: AuthHandlers | null = null;
let sessionLostFired = false;
let inflight: Promise<void> | null = null;

/** 등록하면 세션 상실 1회 플래그와 탭 안 재발급 상태도 새로 시작한다. `null`이면 해제 */
export function setAuthHandlers(next: AuthHandlers | null) {
  handlers = next;
  sessionLostFired = false;
  inflight = null;
}

/** 이 탭에서 세션 상실 처리가 이미 시작됐는지. 게이트가 그 뒤의 `null`로 이동하지 않게 본다 */
export const hasSessionLostFired = () => sessionLostFired;

/** 401을 가로챌지 — 핸들러가 있고(브라우저) `dd:session`이 있을 때만. 없으면 401을 그대로 던진다 */
export function canRecoverSession() {
  return handlers !== null && readSessionFlag() !== null;
}

function fireSessionLost() {
  if (sessionLostFired) return;
  sessionLostFired = true;
  log('info', 'auth.session_lost');
  try {
    handlers?.onSessionLost();
  } catch (e) {
    log('error', 'auth.session_lost_handler_failed', {
      name: e instanceof Error ? e.name : typeof e,
    });
  }
}

/** 세션 상실을 뜻하는 재발급 실패. 판정 함수 안에서만 쓰고 밖으로는 `SessionLostError`로 나간다 */
class RefreshRejected extends Error {
  constructor(readonly cause: ApiError) {
    super('refresh rejected');
  }
}

/** 재발급이 이 상태면 4xx여도 세션 상실이 아니라 일시 오류(요청 타임아웃·과도한 요청) */
const TRANSIENT_4XX: ReadonlySet<number> = new Set([408, 429]);

/**
 * 재발급 한 번과 결과 판정.
 * - 2xx(본문이 이상해도 상태가 2xx면) 성공
 * - 4xx(403 `AUTH_403_1`, `USER_403_1`, 404 `USER_404_1`, 400, 401 포함) → 상실(`RefreshRejected`)
 * - 단 429·408은 일시 오류 — 토큰을 보기 전에 끊긴 응답이라 세션에 대해 아무것도 말하지 않는다.
 *   429 `GLOBAL_429_1`: 백엔드 `ThrottlingInterceptor`가 재발급에도 걸리고, 재발급은 늘 유효한 액세스 토큰 없이 나가
 *   IP 버킷(기본 분당 60)을 쓴다 — 공연장 Wi-Fi 같은 공유 NAT에서 리프레시 토큰이 살아 있는데 로그아웃되지 않게.
 *   408: 백엔드는 내지 않지만 앞단 프록시(ALB·nginx)가 낼 수 있는 요청 타임아웃
 * - 5xx·네트워크·타임아웃 → 일시 오류. 재발급 응답의 에러를 그대로 던진다(5xx 재시도 규칙이 적용되게)
 *
 * 재발급은 `permitAll`이라 만료·위조 액세스 쿠키가 실려도 401이 나지 않는다(백엔드 #792, backend-questions B6 해결).
 * 그 전(24aa595)에 두던 "401 `AUTH_401_1`·`GLOBAL_401_1`이면 1초 뒤 한 번 더"는 지웠다 — 지금 401은 다른 4xx와 같이 상실이다.
 */
async function refreshOnce(refresh: AuthHandlers['refresh']) {
  try {
    await refresh();
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    if (e.status >= 200 && e.status < 300) return;
    if (TRANSIENT_4XX.has(e.status)) throw e;
    if (e.status >= 400 && e.status < 500) throw new RefreshRejected(e);
    throw e;
  }
}

/** 잠금 안에서 할 일. 다른 탭이 원 요청 뒤에 이미 재발급했으면 재발급 없이 끝낸다 */
async function refreshUnlessDone(refresh: AuthHandlers['refresh'], sentAt: number) {
  if (readRefreshedAt() > sentAt) return;
  await refreshOnce(refresh);
  markRefreshed();
}

function lockManager(): LockManager | null {
  if (typeof navigator === 'undefined') return null;
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks && typeof locks.request === 'function' ? locks : null;
}

async function recoverInTab(refresh: AuthHandlers['refresh'], sentAt: number) {
  const locks = lockManager();
  if (locks) {
    const signal = AbortSignal.timeout(LOCK_WAIT_MS);
    let granted = false;
    try {
      await locks.request(REFRESH_LOCK_NAME, { signal }, async () => {
        granted = true;
        await refreshUnlessDone(refresh, sentAt);
      });
    } catch (e) {
      // 잠금을 얻기 전에 대기가 끊김 = 일시 오류. 세션은 유지한다
      if (!granted) {
        log('warn', 'auth.lock_wait_aborted');
        throw new ApiError(0, 'TIMEOUT', '', `LOCK ${REFRESH_LOCK_NAME}`);
      }
      throw e;
    }
    return;
  }
  // Web Locks가 없다(일부 인앱 WebView). 탭 안 단일 비행만 하고, 상실 판정 사이에
  // 다른 탭이 먼저 재발급했으면(dd:refreshedAt이 바뀜 — 리프레시 토큰이 교체돼 우리 것이 무효) 상실로 보지 않는다
  const before = readRefreshedAt();
  try {
    await refreshUnlessDone(refresh, sentAt);
  } catch (e) {
    if (e instanceof RefreshRejected && readRefreshedAt() !== before) return;
    throw e;
  }
}

/**
 * 세션 복구. `dd:session`이 있을 때 보호 요청의 401(코드 무관)에서 부른다. 끝나면 원 요청을 다시 보내면 된다.
 * 탭 안에서는 진행 중인 복구 하나에 합류한다(동시 401 N건 → 재발급 1회).
 * 실패: 세션 상실이면 `onSessionLost`(한 번) 후 `SessionLostError`, 일시 오류면 그 에러.
 *
 * @param sentAt 원 요청을 보낸 시각(ms, `Date.now()`)
 */
export async function recoverSession(sentAt: number): Promise<void> {
  if (sessionLostFired) throw new SessionLostError();
  const h = handlers;
  if (!h) throw new SessionLostError();
  if (!inflight) {
    inflight = recoverInTab(h.refresh, sentAt).finally(() => {
      inflight = null;
    });
  }
  try {
    await inflight;
  } catch (e) {
    if (e instanceof RefreshRejected) {
      log('info', 'auth.refresh_rejected', { status: e.cause.status, code: e.cause.code });
      fireSessionLost();
      throw new SessionLostError();
    }
    throw e;
  }
}
