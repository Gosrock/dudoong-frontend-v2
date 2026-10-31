import { z } from 'zod';

/**
 * zod 전역 설정 — **JIT 끔**(P14 보안 — CSP).
 *
 * zod 4는 처음 파싱할 때 `new Function('')`으로 eval이 되는지 떠보고, 되면 객체 파싱을 함수로 만들어 쓴다. CSP에 `'unsafe-eval'`이
 * 없으니 브라우저가 그 시도를 위반(`script-src eval`)으로 보고한다 — 강제 모드에서는 zod가 잡고 느린 길로 가지만 보고는 매번 남는다
 * (P14 e2e에서 모든 화면에 나왔다). `jitless`면 떠보지도 않는다(zod `util.allowsEval` 주석). 응답 하나가 작아 속도 차이는 없다.
 *
 * 첫 파싱보다 먼저 읽혀야 한다 — 루트 `providers.tsx`와 `client.ts`가 맨 위에서 불러온다(모듈 최상위에서 파싱하는 곳은 없다).
 */
z.config({ jitless: true });
