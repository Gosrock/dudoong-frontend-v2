/**
 * 주소의 `[eventId]` → 백엔드에 보낼 id. 숫자가 아니면 null(라우트가 `notFound()`).
 * 백엔드는 숫자가 아닌 id에 비로그인이면 401 `AUTH_401_2`(공개 경로는 숫자 id만), 로그인이면 400 `BAD_REQUEST`를 주는데
 * 서버 조회에서 둘 다 throw → 500이 된다. 크롤러가 500을 캐시하지 않게
 * 조회 전에 404로 끊는다. 앞의 0은 떼어 queryKey·canonical 주소를 하나로 맞춘다(`/events/0101` → `101`).
 */
export function parseEventIdParam(raw: string): string | null {
  if (!/^\d{1,16}$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return String(id);
}
