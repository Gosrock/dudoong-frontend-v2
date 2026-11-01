---
name: qa-scenario
description: 피처·페이지를 개발할 때 QA 시나리오를 .claude/docs 근거로 쓰고(정상·빈 상태·에러·권한·모바일/데스크탑), Playwright로 가짜 백엔드 위에서 실행해 단계별 캡처가 담긴 HTML 리포트를 만든다. "QA 시나리오", "QA 돌려줘", "화면 흐름 확인", "pnpm qa", Phase 완료 기준 확인, 새 화면 구현 직후에 쓴다.
---

# QA 시나리오

피처 하나의 QA 시나리오를 쓰고 → 실행하고 → 리포트로 보고한다. 엔진은 `@playwright/test`, 백엔드는 가짜다(MSW 핸들러). 구성과 이유는 `.claude/docs/tech-decisions.md` §10.

**PR 게이트 밖이다.** 로컬과 이 스킬에서만 돈다. 게이트는 typecheck · lint · Vitest(unit) · 스토리 테스트 · build.

## 언제

- Phase의 화면을 구현했을 때(완료 기준 확인), 또는 구현 전에 기대 동작을 먼저 고정하고 싶을 때
- 사용자가 화면 흐름·에러 분기 확인을 요청할 때
- 기존 화면을 크게 바꿨을 때 — 해당 `qa/scenarios/<feature>.qa.ts`를 다시 돌린다

컴포넌트 하나의 분기(렌더·상태 매핑)는 Vitest(`renderWithProviders`, `src/test/render.tsx`)가 더 싸다. 이 스킬은 **빌드한 실제 앱 화면**(서버 조회 + 하이드레이션 + 라우팅 + 상태 코드)을 본다.

## 구성 한눈에

| 파일 | 역할 |
|---|---|
| `qa/scenarios/<feature>.qa.ts` | 시나리오(커밋한다). `<feature>`는 소문자 케밥 — `home`, `event-detail`, `checkout` |
| `qa/scenario.ts` | DSL — `scenario()`, `scenario.manual()`, `step()`, `note()`, `envelope`, `http`·`HttpResponse` |
| `qa/reporter.ts` | HTML 리포트 생성 |
| `qa/run.mjs` | `pnpm qa <feature>` 진입점 |
| `e2e/support/mock-backend.ts` | 가짜 nginx + 백엔드. `/api/*`는 MSW 핸들러, 나머지는 Next standalone으로 |
| `src/api/__mocks__/handlers.ts` | 기본(정상) 응답. Vitest와 같이 쓴다 |
| `qa/reports/<feature>/<시각>/` | 리포트(커밋하지 않는다). `latest`가 마지막 것을 가리킨다 |

브라우저는 `http://127.0.0.1:4100`(가짜 백엔드 앞문)으로 접속하고, Next 서버(3100)의 `API_INTERNAL_URL`도 4100을 향한다. 그래서 **서버 조회와 브라우저 요청이 같은 핸들러를 탄다.** 포트 하나를 테스트가 바꿔 쓰므로 워커는 1개다.

## 순서

### 1. 근거를 모은다

해당 피처에 대해 아래를 읽고, 시나리오마다 `basis`에 위치를 적는다.

| 문서 | 볼 것 |
|---|---|
| `plan.md` 해당 Phase | 목표, **완료 기준**(체크박스 하나 ≥ 시나리오 하나) |
| `storyboard.md` | 화면 흐름과 호출 API |
| `gui-screens.md` | 화면 목록, 라우트, 데스크탑 배치, GUI와 서버가 다른 것 |
| `api-contract.md` | API 색인(§5), 상태·enum(§3), 권한(§2), 입력 제한(§4), 플로우 규칙(§6) |
| `patterns.md` §11, §24 | 공통 에러 규칙(403·404·"이미 처리됨"), 화면별 에러 코드 표의 해당 Phase 행 |
| `src/api/<도메인>/schema.ts` | 가짜 응답의 모양. **zod를 통과해야 한다** — 아니면 `PARSE_ERROR`로 엉뚱한 실패가 난다 |

### 2. 시나리오를 쓴다

`qa/scenarios/<feature>.qa.ts`. ID는 `<FEATURE 대문자>-<번호>`(`EVT-3`). 아래 범주를 빠짐없이 검토하고, 해당 없는 범주는 파일 머리 주석에 이유를 한 줄 적는다.

| 범주(`kind`) | 무엇 |
|---|---|
| 정상 | 완료 기준의 주 흐름. 클릭·입력·이동 |
| 빈 상태 | 빈 목록·값 없음. 문구가 디자인에 없으면 "지금 기대 동작"을 적고 `design-requests.md`를 확인 |
| 에러 | patterns §24의 그 Phase 코드 전부 + 공통(404, 403, 5xx, 네트워크). 서버 조회 화면(`(public)`)의 404는 `notFound()`, 클라이언트 조회 화면은 공용 404·403 화면 |
| 권한 | 비로그인 · 관객 · 멤버 · 매니저 · 마스터(`myRole`)별로 버튼·화면이 다른 곳. 숨긴 버튼을 직접 호출했을 때 403 처리 |
| 반응형 | 모든 자동 시나리오는 기본으로 `mobile`(390×844)과 `desktop`(1280×800, ≥1024)에서 돈다. 배치가 바뀌는 화면(사이드바/드로어, 3단 배치)은 전용 단계로 확인 |
| 크롤러 | `(public)` 라우트만. 카카오 UA로 상태 코드·OG `<head>` 위치 |

자동으로 확인할 수 없는 것(실기기 카카오톡 인앱, 토스 앱 열기, 스테이징의 카카오 로그인 왕복)은 `scenario.manual()`로 남긴다. 리포트에 "수동 확인"과 방법이 나온다.

```ts
import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

scenario(
  'EVT-2',
  '없는 공연이면 404',
  {
    kind: '에러',
    summary: '서버 조회 화면이라 크롤러와 브라우저 모두 404 상태 코드를 받는다.',
    basis: ['plan P5b 완료 기준', 'patterns §14', 'api-contract §1 404'],
    // 이 시나리오의 백엔드 응답. 서버 조회·브라우저 요청 모두에 적용, 기본 핸들러보다 먼저 맞는다
    mocks: [
      http.get('*/api/v2/events/:eventId', () =>
        HttpResponse.json(envelope.error(404, 'Event_404_1'), { status: 404 }),
      ),
    ],
    // viewports: ['desktop'],  // 한쪽만 볼 때
  },
  async ({ page, request, mockApi, step, note }) => {
    await step('카카오 UA로 요청하면 404', async () => {
      const res = await request.get('/events/999', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
      await note(`상태 ${res.status()}`);
      expect(res.status()).toBe(404);
    }, { capture: false }); // 화면 없는 단계는 캡처하지 않는다
    await step('브라우저로 열면 찾을 수 없다는 화면이 보인다', async () => {
      await page.goto('/events/999');
      await expect(page.getByRole('heading', { name: /찾을 수 없어요/ })).toBeVisible();
    });
  },
);

scenario.manual('EVT-9', '카카오 공유 미리보기가 맞게 나온다', {
  kind: '크롤러',
  basis: ['README 실제 환경에서 확인할 것', 'plan P5b'],
  how: '스테이징 공개 URL을 카카오 공유 디버거에 넣어 제목·이미지를 본다.',
});
```

작성 규칙:

- **단계 제목은 "무엇을 하면 무엇이 보인다"** 꼴의 한국어. 리포트에 그대로 나오고, 단계가 끝날 때마다 화면을 찍는다(실패하면 그 시점을 찍는다).
- 셀렉터는 역할·이름(`getByRole`, `getByLabel`, `getByText`)을 먼저 쓴다. 접근성 이름이 없어 못 잡으면 컴포넌트에 이름을 붙이는 쪽을 먼저 검토하고, 그래도 안 되면 `data-testid`.
- 기본(정상) 응답이 없는 API는 `src/api/__mocks__/handlers.ts`에 추가한다(Vitest도 같이 쓴다). 시나리오 고유 응답만 `mocks`에 둔다.
- 핸들러가 없는 `/api` 요청이 생기면 테스트가 실패한다. 의도한 호출만 일어나는지도 이것으로 드러난다.
- 서버/브라우저 어느 쪽이 불렀는지는 `mockApi.calls()`의 `from`(`'server' | 'browser'`)으로 본다(프리페치 뒤 브라우저가 다시 부르지 않는지 등).
- 브라우저 요청만 바꾸려면(배경 재조회 실패 → 토스트 등) `page.route('**/api/v2/...', (r) => r.fulfill({...}))`.
- 시간 의존 값(오픈 전·후, D-day)은 가짜 응답의 날짜로 만든다. 브라우저 시계는 `page.clock`으로 고정할 수 있다.
- **로케이터 함정**(세션 회고 2026-11-01): `getByRole('alert')`는 Next route announcer와 겹치니 `main` 안으로 좁히거나 `filter({ hasText })`. Activity(Cache Components가 숨겨 둔 이전 화면)·반응형 같은 DOM·PC 헤더/GNB 때문에 같은 문구가 둘 잡히면 `getByRole('main')` 안이나 `locator('visible=true')`로. 이름이 다른 이름의 앞부분이면(`문의처 1`/`문의처 10`, `검색`/`검색어 지우기`) `exact: true`, 목록 줄은 `listitem`으로 먼저 좁힌다.
- CSP·PII 자동 검사: e2e·QA 공용 fixture `cspViolations`·`consolePii`(`e2e/support/fixtures.ts`, P14 #79)는 위반이 하나라도 있으면 실패한다. 외부 SDK·출처를 더하면 같은 PR에서 `src/utils/csp.ts` 허용 목록을 넓힌다.
- 로그인 상태: `e2e/support/auth.ts`의 `setMockSession(page, 'loggedIn' | 'anonymous' | 'expired' | 'expiredRefreshFails')`로 쿠키와 `dd:session`을 함께 세운다. `readSessionFlag(page)`로 확인한다. mock 쿠키 규칙: `accessToken=expired`는 만료(401 `AUTH_401_1`), `refreshToken=mock-refresh`는 재발급 성공, `revoked`는 실패. 예시는 `qa/scenarios/auth-gate.qa.ts`. `pnpm dev:mock`에서는 `/api/__mock/login`·`/api/__mock/expire[?refresh=fail]`·`/api/__mock/logout`(`?redirect=`)으로 같은 상태를 만든다.

### 3. (선택) agent-browser로 먼저 눌러 본다

시나리오를 쓰기 전에 새 화면의 셀렉터·흐름을 직접 확인하고 싶을 때, 그리고 가짜 백엔드로 대신할 수 없는 실제 환경을 볼 때만 쓴다. 회귀 확인과 리포트는 언제나 Playwright다.

- 로컬 화면 + 스테이징 백엔드: `.env.local`에 `DEV_API_ORIGIN`·`API_INTERNAL_URL`(`.env.example`)을 두고 `pnpm dev` → `agent-browser open http://localhost:3000/...` → `agent-browser snapshot`으로 접근성 트리(역할·이름)를 보고 셀렉터를 정한다.
- 스테이징 실제 흐름(카카오 로그인 왕복, 쿠키): `agent-browser open https://<스테이징>/...`. 결과는 `scenario.manual()`의 `how`와 사용자 보고에 적는다.
- 가짜 응답 상태 그대로 눌러 보려면 agent-browser 대신 Playwright UI 모드: `pnpm qa <feature> --ui`(또는 단계 안에 `await page.pause()` + `--headed`).
- 설치: `npm i -g agent-browser && agent-browser install`(Chromium 내려받기). 사용법은 `agent-browser skills get core`. 없으면 이 단계는 건너뛴다.

### 4. 실행한다

```bash
pnpm qa <feature>                       # next build → standalone 기동 → 시나리오 실행 → 리포트
E2E_SKIP_BUILD=1 pnpm qa <feature>      # 방금 빌드했으면 빌드를 건너뛴다(코드를 바꿨으면 쓰지 않는다)
pnpm qa <feature> --grep EVT-2          # 시나리오 하나
pnpm qa <feature> --project=mobile      # 뷰포트 하나
pnpm qa <feature> --open                # 끝나고 리포트를 연다
pnpm qa                                 # 전체(qa/reports/all/)
```

처음이면 `pnpm exec playwright install chromium`. 3100·4100 포트가 비어 있어야 한다(`E2E_APP_PORT`·`E2E_MOCK_PORT`로 바꿀 수 있다).

**병렬 세션이 있으면**(회고 6개): 기본 포트를 쓰지 않는다 — `E2E_APP_PORT=31xx E2E_MOCK_PORT=41xx`, dev:mock은 `PORT=… MOCK_API_PORT=…`. `pnpm qa` 전에는 dev 서버를 내린다(`.next`를 같이 쓴다). 남은 서버는 `lsof -i :<포트>`로 PID를 찾아 끈다(`pkill -f`는 못 끌 때가 있다). `E2E_SKIP_BUILD=1`은 `.next/standalone`이 있을 때만 쓴다.

### 5. 결과를 읽고 고친다

실패하면 먼저 `git log origin/main -- qa/scenarios/<feature>.qa.ts`로 main에서 그 시나리오를 고친 커밋이 있는지 본다(있으면 main을 merge).

- `qa/reports/<feature>/latest/results.json` — 시나리오·뷰포트별 상태, 단계별 상태와 에러, 노트. 에이전트는 이것을 읽는다.
- `qa/reports/<feature>/latest/index.html` — 사람이 보는 리포트(단계 설명 + 캡처 + 실패 원인). `images/`의 캡처를 Read로 직접 볼 수 있다.
- `qa/reports/<feature>/latest/playwright/index.html` — Playwright 리포트(trace 포함). trace는 `pnpm exec playwright show-trace <zip>`.

실패하면 **코드 버그인지 시나리오 오류(셀렉터, 잘못된 가짜 응답)인지** 먼저 가른다. 캡처를 직접 열어 본다. 코드 버그면 고치고 다시 돌린다. 문서와 다르게 동작하는데 어느 쪽이 맞는지 모르겠으면 사용자에게 묻는다.

### 6. 보고한다

- 리포트 경로(`qa/reports/<feature>/<시각>/index.html`)
- 시나리오 표: ID · 제목 · 범주 · mobile/desktop 결과
- 실패와 원인, 고친 것
- 수동 확인 항목과 방법
- 문서와 다르게 정한 것(빈 상태 문구 등)이 있으면 해당 문서 위치

## 요령(세션 회고 2026-11-01 — 한 번씩 걸린 것)

- 시나리오 콜백 인자는 `{ page, step, note, testInfo }` — 프로젝트 이름은 `testInfo.project.name`. 권한은 `context.grantPermissions`.
- `page.route` glob의 `?`는 한 글자 와일드카드다 — 쿼리가 있는 주소는 `**` 또는 정규식으로.
- Radix Select는 단계 캡처 때 닫힌다 — 연 상태를 찍으려면 같은 단계 안에서 열고 단언한다.
- `handlers.ts`의 액션 이름은 정의에서 확인한다. 배지가 붙는 접근성 이름은 정규식으로. `alt=""` 이미지는 role img가 아니다.
- 애니메이션 중 크기는 `getComputedStyle`로, transition 중 캡처는 `toBeEnabled` 같은 상태 단언으로 증명한다.
- 업로드는 `page.route`로 가짜 S3 PUT을 받는다. `viewAs`는 여러 GET을 함께 덮는다. 권한 기대값은 `can()`을 읽고 정한다. 카메라는 `stubCamera`.

## 하지 않는 것

- 실제 백엔드(스테이징·운영)를 시나리오에서 부르지 않는다. 실제 환경은 `scenario.manual()` + agent-browser.
- 리포트·캡처를 커밋하지 않는다.
- CI 워크플로에 넣지 않는다(사용자 결정, tech-decisions §10).
