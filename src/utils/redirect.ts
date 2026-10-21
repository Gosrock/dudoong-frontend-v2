/**
 * `redirect` 파라미터 검증(tech-decisions §4 인증 — 같은 origin의 상대 경로일 때만 따른다).
 * 통과하면 정규화한 `경로?쿼리#해시`, 아니면 `fallback`.
 *
 * 거부: 비었거나 `/`로 시작하지 않음(절대 URL, `javascript:`), `//evil`(프로토콜 상대), 역슬래시(`/\evil` —
 * 브라우저가 `/`로 바꿔 `//evil`이 된다), 제어 문자·공백(탭·줄바꿈은 URL 파싱에서 지워져 `/\t/evil`이 `//evil`이 된다),
 * 파싱 뒤 origin이 바뀌는 것. 로그인 화면 자체(`/login`, `/kakao/callback`)로 돌아가는 것도 막는다(되돌이 방지).
 */
const BASE = 'https://redirect.invalid';
const LOOP_PATHS = ['/login', '/kakao/callback'];

export function safeRedirect(raw: string | null | undefined, fallback = '/'): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  // 제어 문자(U+0000–U+001F, U+007F)와 공백
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (LOOP_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
