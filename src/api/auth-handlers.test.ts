import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { authHandlers } from './__mocks__/auth.handlers';
import { errors, ok } from './__mocks__/respond';
import { server } from './__mocks__/server';
import { LOCK_WAIT_MS, recoverSession, REFRESH_LOCK_NAME, setAuthHandlers } from './auth-handlers';
import { REQUEST_TIMEOUT_MS } from './client';
import { ApiError, SessionLostError } from './errors';
import { api, authApi } from './http';
import {
  readRefreshedAt,
  readSessionFlag,
  REFRESHED_AT_KEY,
  resetSessionFlagStateForTest,
  SESSION_KEY,
  startSession,
} from './session-flag';

/**
 * 401 처리(plan P4a, tech-decisions §4 인증 표). `api`(v2) → 401 → 재발급 → 원 요청 재시도.
 * 보호 API는 `/api/v2/probe`로 흉내 낸다: `valid`가 false면 401 `AUTH_401_2`(쿠키 만료 = 토큰 없음, #808).
 */
const Probe = z.object({ ok: z.boolean() });
let valid = false;
let probeCalls = 0;
const probeHandler = http.get('*/api/v2/probe', ({ request }) => {
  probeCalls += 1;
  return valid ? ok({ ok: true }) : errors.noToken(request);
});

const onSessionLost = vi.fn();
/** 재발급 흉내 — 성공하면 이후 probe가 통과한다 */
const refreshOk = vi.fn(async () => {
  await new Promise((r) => setTimeout(r, 20));
  valid = true;
});

function register(refresh: () => Promise<unknown> = refreshOk) {
  setAuthHandlers({ refresh, onSessionLost });
}

beforeEach(() => {
  valid = false;
  probeCalls = 0;
  localStorage.clear();
  resetSessionFlagStateForTest();
  server.use(probeHandler);
});
afterEach(() => {
  setAuthHandlers(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('세션 표시가 없으면', () => {
  it('어떤 401도 재발급·onSessionLost 없이 ApiError(401)로 던진다', async () => {
    register();
    const e = await api.get('probe', Probe).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).not.toBeInstanceOf(SessionLostError);
    expect(e).toMatchObject({ status: 401, code: 'AUTH_401_2' });
    expect(refreshOk).not.toHaveBeenCalled();
    expect(onSessionLost).not.toHaveBeenCalled();
    expect(probeCalls).toBe(1);
  });

  it('저장소 접근이 실패하면 표시 없음으로 본다', async () => {
    startSession();
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    register();
    expect(readSessionFlag()).toBeNull();
    await expect(api.get('probe', Probe)).rejects.toMatchObject({ status: 401 });
    expect(refreshOk).not.toHaveBeenCalled();
  });

  it('핸들러가 등록되지 않았으면(서버 렌더·등록 전) 그대로 던진다', async () => {
    startSession();
    await expect(api.get('probe', Probe)).rejects.toMatchObject({ status: 401 });
  });
});

describe('세션 표시가 있으면', () => {
  beforeEach(() => {
    startSession();
  });

  it('401(코드 무관) → 재발급 → 원 요청을 다시 보낸다', async () => {
    register();
    await expect(api.get('probe', Probe)).resolves.toEqual({ ok: true });
    expect(refreshOk).toHaveBeenCalledTimes(1);
    expect(probeCalls).toBe(2);
    expect(readRefreshedAt()).toBeGreaterThan(0);
  });

  it('동시 401 N건 → 재발급 1회, 모두 재시도로 성공', async () => {
    register();
    const results = await Promise.all(Array.from({ length: 5 }, () => api.get('probe', Probe)));
    expect(results).toEqual(Array(5).fill({ ok: true }));
    expect(refreshOk).toHaveBeenCalledTimes(1);
    expect(probeCalls).toBe(10);
  });

  it('공개 GET은 401이어도 가로채지 않는다', async () => {
    register();
    await expect(api.get('probe', Probe, { public: true })).rejects.toMatchObject({ status: 401 });
    expect(refreshOk).not.toHaveBeenCalled();
  });

  it('재발급 뒤 다시 보낸 요청이 또 401이면 그 에러를 던진다(반복하지 않는다)', async () => {
    register(async () => {});
    await expect(api.get('probe', Probe)).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_401_2',
    });
    expect(probeCalls).toBe(2);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  describe('재발급이 일시 오류(5xx·네트워크·타임아웃)면 세션을 유지하고 재발급의 에러를 던진다', () => {
    it('5xx — 실제 authApi로', async () => {
      server.use(...authHandlers.refreshServerError);
      register(() => authApi.post('token/refresh', z.unknown()));
      const e = await api.get('probe', Probe).catch((x: unknown) => x);
      expect(e).not.toBeInstanceOf(SessionLostError);
      expect(e).toMatchObject({ status: 500, code: 'GLOBAL_500_1' });
      expect(onSessionLost).not.toHaveBeenCalled();
      expect(readSessionFlag()).not.toBeNull();
    });

    it.each([
      ['타임아웃', new ApiError(0, 'TIMEOUT', '', 'POST token/refresh')],
      ['네트워크', new ApiError(0, 'NETWORK', '', 'POST token/refresh')],
      ['HTML 502', new ApiError(502, 'NON_JSON', '', 'POST token/refresh')],
    ])('%s', async (_, error) => {
      register(() => Promise.reject(error));
      await expect(api.get('probe', Probe)).rejects.toBe(error);
      expect(onSessionLost).not.toHaveBeenCalled();
      expect(readSessionFlag()).not.toBeNull();
    });

    it('재발급 HTTP 타임아웃은 요청 기본값 10초', () => {
      expect(REQUEST_TIMEOUT_MS).toBe(10_000);
    });
  });

  describe('재발급이 401·403·그 밖의 4xx면 세션 상실', () => {
    it.each([
      ['403 AUTH_403_1', authHandlers.refreshRejected],
      [
        '403 USER_403_1(정지 계정)',
        [
          http.post('*/api/v1/auth/token/refresh', () =>
            Response.json(
              { success: false, status: 403, code: 'USER_403_1', reason: '' },
              { status: 403 },
            ),
          ),
        ],
      ],
      [
        '404 USER_404_1',
        [
          http.post('*/api/v1/auth/token/refresh', () =>
            Response.json(
              { success: false, status: 404, code: 'USER_404_1', reason: '' },
              { status: 404 },
            ),
          ),
        ],
      ],
    ])('%s → SessionLostError + onSessionLost 한 번', async (_, handlers) => {
      server.use(...handlers);
      register(() => authApi.post('token/refresh', z.unknown()));
      const all = await Promise.all(
        Array.from({ length: 3 }, () => api.get('probe', Probe).catch((x: unknown) => x)),
      );
      for (const e of all) expect(e).toBeInstanceOf(SessionLostError);
      expect(onSessionLost).toHaveBeenCalledTimes(1);
    });

    it('상실 뒤의 401은 재발급 없이 곧바로 SessionLostError(곧 이동한다)', async () => {
      const refresh = vi.fn(() => Promise.reject(new ApiError(403, 'AUTH_403_1', '')));
      register(refresh);
      await expect(api.get('probe', Probe)).rejects.toBeInstanceOf(SessionLostError);
      await expect(api.get('probe', Probe)).rejects.toBeInstanceOf(SessionLostError);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(onSessionLost).toHaveBeenCalledTimes(1);
    });
  });
});

describe('재발급의 401은 다시 시도하지 않고 상실(#792 — 재발급은 permitAll이라 낡은 액세스 쿠키 401이 없다)', () => {
  beforeEach(() => {
    startSession();
  });

  it.each(['AUTH_401_1', 'GLOBAL_401_1', 'AUTH_401_2'])(
    '재발급이 401 %s → 한 번만 부르고 세션 상실',
    async (code) => {
      const refresh = vi.fn().mockRejectedValue(new ApiError(401, code, ''));
      register(refresh);
      await expect(recoverSession(Date.now() - 1)).rejects.toBeInstanceOf(SessionLostError);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(onSessionLost).toHaveBeenCalledTimes(1);
    },
  );
});

describe('Web Locks가 없을 때(대체 경로)', () => {
  beforeEach(() => {
    startSession();
  });

  it('재발급이 403이어도 그 사이 dd:refreshedAt이 바뀌었으면(다른 탭이 먼저 교체) 원 요청을 한 번 재시도', async () => {
    const refresh = vi.fn(async () => {
      // 다른 탭이 먼저 재발급해 리프레시 토큰을 교체했다 → 우리 재발급은 403
      localStorage.setItem(REFRESHED_AT_KEY, String(Date.now() + 1));
      valid = true;
      throw new ApiError(403, 'AUTH_403_1', '');
    });
    register(refresh);
    await expect(api.get('probe', Probe)).resolves.toEqual({ ok: true });
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it('잠금 안이든 밖이든, 원 요청 뒤에 이미 재발급됐으면 재발급 없이 재시도만', async () => {
    register();
    const sentAt = Date.now() - 1000;
    localStorage.setItem(REFRESHED_AT_KEY, String(sentAt + 500));
    await recoverSession(sentAt);
    expect(refreshOk).not.toHaveBeenCalled();
  });
});

/**
 * 탭 사이 직렬화. navigator.locks를 배타 잠금 큐로 흉내 내고, 탭 둘은 모듈을 따로 읽어(vi.resetModules) 만든다.
 * localStorage(dd:refreshedAt)와 잠금은 두 탭이 같이 쓴다.
 */
describe('Web Locks — 탭 사이 직렬화(mock navigator.locks)', () => {
  type Granted = () => Promise<unknown>;
  let queue: Promise<unknown>;
  let requests: { name: string; signal?: AbortSignal }[];

  function installLocks(grant = true) {
    queue = Promise.resolve();
    requests = [];
    const locks = {
      request: (name: string, options: { signal?: AbortSignal }, cb: Granted) => {
        requests.push({ name, signal: options.signal });
        if (!grant) {
          return new Promise((_, reject) => {
            options.signal?.addEventListener('abort', () => reject(options.signal?.reason));
          });
        }
        const run = queue.then(() => cb());
        queue = run.catch(() => {});
        return run;
      },
    };
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
  });

  async function openTab() {
    vi.resetModules();
    const http_ = await import('./http');
    const handlers = await import('./auth-handlers');
    return { api: http_.api, setAuthHandlers: handlers.setAuthHandlers };
  }

  it('두 탭이 동시에 401 → 잠금으로 줄 서고, 뒤 탭은 dd:refreshedAt을 보고 재발급 없이 재시도', async () => {
    installLocks();
    startSession();
    const refresh = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      valid = true;
    });
    const tabA = await openTab();
    const tabB = await openTab();
    tabA.setAuthHandlers({ refresh, onSessionLost });
    tabB.setAuthHandlers({ refresh, onSessionLost });

    const [a, b] = await Promise.all([tabA.api.get('probe', Probe), tabB.api.get('probe', Probe)]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests.map((r) => r.name)).toEqual([REFRESH_LOCK_NAME, REFRESH_LOCK_NAME]);
    expect(requests.every((r) => r.signal instanceof AbortSignal)).toBe(true);
    tabA.setAuthHandlers(null);
    tabB.setAuthHandlers(null);
  });

  it(`잠금 대기가 ${LOCK_WAIT_MS / 1000}초를 넘겨 끊기면 일시 오류(세션 유지)`, async () => {
    installLocks(false);
    startSession();
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    register();
    const pending = api.get('probe', Probe).catch((x: unknown) => x);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(timeout).toHaveBeenCalledWith(LOCK_WAIT_MS);
    controller.abort(new DOMException('timeout', 'TimeoutError'));
    const e = await pending;
    expect(e).not.toBeInstanceOf(SessionLostError);
    expect(e).toMatchObject({ status: 0, code: 'TIMEOUT' });
    expect(refreshOk).not.toHaveBeenCalled();
    expect(onSessionLost).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });
});

describe('공개 GET은 쿠키 없이 나간다', () => {
  // jsdom의 Request는 credentials를 보존하지 않아(MSW가 받는 값은 늘 same-origin) fetch에 넘긴 Request를 직접 본다
  it.each([
    ['공개 GET', { public: true }, 'omit'],
    ['보호 요청', undefined, 'include'],
  ] as const)('%s — credentials %s', async (_, opts, mode) => {
    const original = globalThis.fetch;
    const seen: (string | undefined)[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      seen.push(init?.credentials ?? (input instanceof Request ? input.credentials : undefined));
      return original(input, init);
    });
    server.use(http.get('*/api/v2/echo-cookie', () => ok({ ok: true })));
    await api.get('echo-cookie', Probe, opts);
    expect(seen).toEqual([mode]);
  });
});
