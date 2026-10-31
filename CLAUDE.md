# DuDoong Frontend v2

@AGENTS.md

설계 문서는 `.claude/docs/`에 있다. 작업 전에 `README.md`(문서 지도)를 먼저 읽는다.
Next.js 동작은 설치된 버전의 문서(`node_modules/next/dist/docs/`)로 확인한다(위 `AGENTS.md`).

## 규칙 요약

- 단일 Next 16 앱, App Router, Cache Components 켬, 서버 캐시 없음.
- 계층: `app → features → ui → api → utils`. `features/audience` ↔ `features/hosting` 상호 import 금지. eslint가 막는다.
- 서버 컴포넌트는 라우트 파일(`page`/`layout`)과 `src/api/server`만. 화면 컴포넌트는 `'use client'`.
- 서버 조회 라우트는 `(audience)/(public)`. 페이지마다 `export const instant = false`, Suspense·`loading.tsx`를 두지 않는다(404 상태 코드).
- 조회는 `src/api/<도메인>/queries.ts`의 `queryOptions` 하나를 서버(`<Prefetch>`)와 브라우저가 같이 쓴다. 화면은 `ky`를 직접 쓰지 않고 `api` 객체를 쓴다.
- 스타일은 vanilla-extract. 순서: 프리미티브(`Flex`·`Spacing`·`Txt`·`Divider`·`Container`) → `sprinkles()` → `Foo.css.ts`. 색은 `colors`(의미 색 우선), 간격·모서리는 토큰만. 글자는 `<Txt typography="bodyMd" color={colors.textSecondary}>`.
- 컴포넌트 동작은 Radix 프리미티브, 모양은 vanilla-extract(`.claude/docs/design-system.md`).
- 디자인 전에는 L(로직)만 — 훅·도메인 규칙은 `features/<track>/<feature>/model/`, UI 동작을 넣지 않는다(plan §0).
- 화면(V)은 스킬 `gui-implement`로 — 근거는 GUI 화면 Figma의 Dev Mode **Ready for dev** 노드만, 없으면 와이어프레임으로 단순 와이어 수준(`.claude/docs/design-workflow.md`). 상태는 `gui-screens.md` §0.
- 커스텀 구현은 지양하고 DS·`src/ui` 컴포넌트를 쓴다. Figma가 커스텀으로 그렸지만 DS로 되는 것은 DS로 + `FIGMA-CUSTOM:` 주석 + Figma 코멘트. 작업 시작·PR 직전에 열린 `Design Sync` 이슈를 보고, 반영 PR의 `Closes #n`으로만 닫는다.
- `main`에 넣는 PR은 **스쿼시 머지**(`gh pr merge <n> --squash`) — `main`에 PR 하나가 커밋 하나로 남는다. 머지는 매번 사용자 확인을 받는다. PR 브랜치에 최신 `main`을 합칠 때는 merge(리베이스 아님).

## 명령

- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm storybook`
- 게이트 안에 `pnpm test:stories`(스토리 테스트, 실제 Chromium)도 있다. 게이트 밖: `pnpm test:e2e`(Playwright, 빌드 포함) / `pnpm qa <feature>`(QA 시나리오 → `qa/reports/<feature>/latest/index.html`). 처음이면 `pnpm exec playwright install chromium`. 방금 빌드했으면 `E2E_SKIP_BUILD=1`
- 피처 화면을 만들면 `qa-scenario` 스킬(`.claude/skills/qa-scenario/SKILL.md`)로 시나리오를 쓰고 돌린다. 컴포넌트 테스트는 `renderWithProviders`(`src/test/render.tsx`)
- 로컬 실행에는 `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY`가 필요하다(`.env.example`).
- 백엔드 없이: `pnpm dev:mock`(MSW 가짜 백엔드 + next dev). 운영 공개 GET으로 스키마 확인: `pnpm check:contract`.
