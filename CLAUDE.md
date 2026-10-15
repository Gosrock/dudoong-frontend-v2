# DuDoong Frontend v2

설계 문서는 `.claude/docs/`에 있다. 작업 전에 `README.md`(문서 지도)를 먼저 읽는다.
Next.js 동작은 설치된 버전의 문서(`node_modules/next/dist/docs/`)로 확인한다 — `AGENTS.md` 참고.

## 규칙 요약

- 단일 Next 16 앱, App Router, Cache Components 켬, 서버 캐시 없음.
- 계층: `app → features → ui → api → utils`. `features/audience` ↔ `features/hosting` 상호 import 금지. eslint가 막는다.
- 서버 컴포넌트는 라우트 파일(`page`/`layout`)과 `src/api/server`만. 화면 컴포넌트는 `'use client'`.
- 서버 조회 라우트는 `(audience)/(public)`. 페이지마다 `export const instant = false`, Suspense·`loading.tsx`를 두지 않는다(404 상태 코드).
- 조회는 `src/api/<도메인>/queries.ts`의 `queryOptions` 하나를 서버(`<Prefetch>`)와 브라우저가 같이 쓴다. 화면은 `ky`를 직접 쓰지 않고 `api` 객체를 쓴다.
- 스타일은 vanilla-extract. 순서: 프리미티브 → `sprinkles()` → `Foo.css.ts`. 색·간격·모서리는 토큰만.
- 컴포넌트 동작은 Radix 프리미티브, 모양은 vanilla-extract(`.claude/docs/design-system.md`).

## 명령

- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm storybook`
- 로컬 실행에는 `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY`가 필요하다(`.env.example`).
