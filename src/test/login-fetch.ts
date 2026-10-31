import { MOCK_ACCESS_TOKEN } from '@/api/__mocks__/respond';

/**
 * Node 테스트에서 "로그인한 브라우저"를 흉내 낸다 — `credentials: 'include'` 요청에만 액세스 토큰 쿠키를 싣는다
 * (Node fetch는 `document.cookie`를 싣지 않는다). 공개 GET(`credentials: 'omit'`)에는 싣지 않는다.
 * MSW가 fetch를 바꾼 뒤(setup의 beforeAll) `beforeEach`에서 부르고, 돌려준 함수로 `afterEach`에서 되돌린다.
 * `recordRequests()`는 이 위에 감싼다.
 */
export function installLoggedInFetch() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    if (request.credentials !== 'include') return realFetch(request);
    const headers = new Headers(request.headers);
    headers.set('cookie', `accessToken=${MOCK_ACCESS_TOKEN}`);
    return realFetch(new Request(request, { headers }));
  };
  return () => {
    globalThis.fetch = realFetch;
  };
}
