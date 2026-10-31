/**
 * Content-Security-Policy 초안(P14 보안). `next.config.ts` `headers()`가 모든 경로에 붙인다.
 *
 * **지금은 `Content-Security-Policy-Report-Only`** — 막지 않고 위반만 알린다. 위반은 브라우저 콘솔과 `report-uri`
 * (`/csp-report`, `src/app/csp-report/route.ts` — 구조화 로그 `csp.violation`)로 나온다. e2e·QA는 모든 테스트에서
 * 위반을 모아 하나라도 있으면 실패한다(`e2e/support/fixtures.ts` `cspViolations`). 강제(`CSP_ENFORCE`)로 바꾸는 것은
 * 스테이징에서 실제 SDK(카카오 공유·지도·우편번호)·S3 업로드를 한 바퀴 돈 뒤다(implementation-log P14 — 보안).
 *
 * 왜 nonce가 아닌가: nonce는 요청마다 렌더해야 하는데 호스팅 센터 등은 정적으로 프리렌더된다(tech-decisions §2·§3).
 * 그래서 `script-src`에 `'unsafe-inline'`이 남는다(Next 인라인 부트스트랩·JSON-LD). 이 정책이 막는 것은 **외부 출처 스크립트**·
 * `object`·`<base>` 바꾸기·다른 곳으로의 폼 전송·iframe 삽입(`frame-ancestors`)이다. 인라인 XSS의 1차 방어는 sanitize다(§17).
 *
 * 허용 출처(코드에서 부르는 곳):
 * - 카카오 JS SDK(공유) `t1.kakaocdn.net` — `kakao-sdk.ts` / 공유창·API `*.kakao.com`
 * - 카카오맵 SDK `dapi.kakao.com`(지오코더는 JSONP라 script) → 본체·타일 `*.daumcdn.net` — `kakao-geocoder.ts`
 * - 우편번호 `t1.daumcdn.net` 스크립트 + `*.daum.net`·`*.kakao.com` iframe — `daum-postcode.ts`
 * - 이미지: 섹션 본문·공지 본문이 임의 https 이미지를 가질 수 있어(sanitize가 http·https 허용) `https:` 전체
 * - S3 업로드(presigned PUT) `*.amazonaws.com`, 자산 도메인 `*.dudoong.com` — `src/api/upload.ts`
 * - zxing wasm은 자체 호스팅(`'self'`) + 인스턴스화에 `'wasm-unsafe-eval'` — `zxing-wasm.ts`
 * - GA·카카오 애드핏은 아직 없다 — 넣을 때 여기에 출처를 더한다(backend-questions #871 행, plan P14)
 */

export const CSP_REPORT_PATH = '/csp-report';

type Options = {
  /** `next dev` — React가 개발 중 `eval`을 쓴다 */
  dev: boolean;
};

export function contentSecurityPolicy({ dev }: Options): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      ...(dev ? ["'unsafe-eval'"] : []),
      'https://t1.kakaocdn.net',
      'https://dapi.kakao.com',
      'https://*.daumcdn.net',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://*.amazonaws.com',
      'https://*.dudoong.com',
      'https://*.kakao.com',
      ...(dev ? ['ws:', 'wss:'] : []),
    ],
    'frame-src': ['https://*.kakao.com', 'https://*.daum.net'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'report-uri': [CSP_REPORT_PATH],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

/**
 * 붙일 헤더 이름. 기본은 Report-Only. `CSP_ENFORCE=1`로 빌드하면 강제 — 빌드 때 정해진다(`headers()`는 빌드 산출물에 들어간다).
 * 강제로 바꿀 때 `frame-ancestors`가 처음 효력을 갖는다(Report-Only에서는 무시된다. 지금은 nginx `X-Frame-Options: DENY`가 막는다).
 */
export const cspHeaderName = (enforce: boolean) =>
  enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
