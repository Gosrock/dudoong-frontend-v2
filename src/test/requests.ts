import { vi } from 'vitest';

/** 테스트가 실제로 보낸 요청 하나 */
export type SentRequest = {
  method: string;
  /** `/api/v1/auth/oauth/kakao` 형태(쿼리 없음) */
  path: string;
  query: Record<string, string>;
  /** JSON 본문. 본문이 없으면 `undefined` */
  body: unknown;
  /** 쿠키를 싣는지(`include`) — 공개 GET은 `omit` */
  credentials: RequestCredentials;
};

async function readRequest(request: Request): Promise<SentRequest> {
  const url = new URL(request.url);
  const text = await request.text();
  let body: unknown;
  if (text !== '') {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body,
    credentials: request.credentials,
  };
}

/**
 * 훅 테스트의 Then — "실제로 보낸 요청"(plan §0 테스트 3). `fetch`를 감싸 보낸 요청을 기록하고 그대로 MSW로 보낸다
 * (MSW 핸들러 안에서는 `credentials`가 보이지 않아 fetch 단계에서 읽는다). 응답은 MSW 핸들러가 정한다.
 * `vi.restoreAllMocks()`(테스트의 afterEach)가 감싼 것을 푼다.
 *
 * ```ts
 * const sent = recordRequests();
 * // When …
 * expect(await sent.list()).toMatchObject([{ method: 'POST', path: '/api/v1/auth/oauth/kakao/login', body: { idToken } }]);
 * ```
 */
export function recordRequests() {
  const pending: Promise<SentRequest>[] = [];
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const request = new Request(input, init);
    pending.push(readRequest(request.clone()));
    return realFetch(request);
  });
  return {
    list: () => Promise.all(pending),
    /** `METHOD /path` 순서 */
    lines: async () => (await Promise.all(pending)).map((r) => `${r.method} ${r.path}`),
  };
}
