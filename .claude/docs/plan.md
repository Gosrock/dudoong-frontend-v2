# DuDoong-Front v2 — 구현 계획

> 기술 결정: [`tech-decisions.md`](./tech-decisions.md) · 백엔드 계약: [`api-contract.md`](./api-contract.md) · 구조: [`directory-structure.md`](./directory-structure.md)
> 2026-10-12 개정. 단일 Next 앱(App Router, vanilla-extract)으로 구조를 바꿨다. v1(`DuDoong-Front`)은 참고용이며 그대로 이어가지 않는다.
> 2026-10-21 개정. 디자인 전에는 로직(L)만 진행하고 뷰(V)는 디자인 순서대로 붙인다(§0).
> 2026-10-25 반영. 백엔드 `dev` `432cce4`(PR 32개), 백엔드 Develop 기획서(2026-10-25), v1 프론트 운영 문구(Front #345·#350·#357·#358·#364·#365·#370). **v1 운영과 v2 계획이 다르면 v2 계획이 정본이다**(사용자 결정) — v1 운영은 "(참고)"로만 적었다. 백엔드 계약상 보내야 하는 동의 필드는 계획과 별개로 L에 넣었다 — 보내는 값은 사용자가 체크한 필드만이다(UI 없는 것은 design-requests Q42 대기, `src/api/shared/agreement.ts`). 약관이 표시를 약속했는데 v2 계획에 자리가 없는 문구는 **"약관 표시 의무 — v2 계획에 위치 없음(위험)"**으로 표시했다(원문 [`legal-copy.md`](./legal-copy.md)). 연락처 마스킹은 A안으로 구현됐다(P5b·P5c·P9).

## 개요

공연 티켓팅 서비스 FE 전면 재작성. **Next 16 앱 하나**(App Router)에 관객 화면(`(public)`·`(app)`)과 호스팅 센터(`/hosting`)가 같이 있다. 공개·공유 화면은 요청마다 서버에서 조회해 렌더하고(서버 캐시 없음), 로그인 뒤 조작 화면은 클라이언트에서 조회한다.

**Phase는 도메인 단위다.** 실제 구현 티켓은 각 Phase 착수 시점에 `phase-N-spec.md`로 쪼갠다(1~5파일 / ~300줄 / 독립 typecheck 통과 단위).

**총 25개 Phase.** P0~P4b 공통 기반, P5a~P9b 관객(Track A), P10a~P13b 호스팅 센터(Track B), P14~P15 수렴. 두 트랙은 `features/audience`와 `features/hosting` 폴더 단위로 병렬 진행한다. P0~P4a(5개)는 끝났다. **남은 18개(P4s, P4b, P5a~P13b)는 로직(L)과 뷰(V)로 나누고, 디자인이 끝나기 전에는 L만 진행한다**(2026-10-21, §0). V는 P4s-V(레이아웃 셸)부터 디자인이 나오는 순서대로 붙인다.

## 0. 진행 방식: 로직 먼저

2026-10-21 사용자 결정. 화면 디자인이 아직 끝나지 않았다. 남은 Phase(P4s, P4b, P5a~P13b — 18개)를 **로직(L)**과 **뷰(V)**로 나누고, **지금은 L만 진행한다.** V는 디자인이 나오는 순서대로 붙인다. Phase 번호는 그대로 두고 `P6-L` · `P6-V`처럼 부른다. P0~P4a는 끝났고 그대로 둔다. P14·P15는 나누지 않는다(전 Phase의 L·V 뒤).

**L(로직)**
- **API** — 남은 엔드포인트의 `schema`·`queries`·`mutations`, `handleCodes`로 처리할 코드, MSW fixture·핸들러. 핸들러는 정상·빈 상태·에러 코드별로 이름 붙인 세트로 둔다
- **도메인 규칙** — 순수 함수
- **화면 상태 훅** — UI와 무관하다. "시트를 연다" 같은 UI 동작을 넣지 않고 상태·동작·파생값만 돌려준다
- **라우트 로직** — 서버 조회, `notFound`, `generateMetadata`/OG, 크롤러 상태 코드, `redirects()`, 인증 콜백. 페이지는 스타일 없는 최소 시맨틱 마크업으로 두고 V에서 바꾼다

**V(뷰)**: 훅을 컴포넌트에 연결, 스타일·반응형(관객 1024 기준 — P4s의 결정 유지, 관객도 1133인지는 design-requests Q38 대기. 호스팅은 GUI 스펙 1133 / 1280 / 1440 — P4s), 스토리, QA 시나리오 캡처, 하이드레이션·접근성 확인.

**디자인 근거의 우선순위(2026-10-25)**: GUI 화면 파일이 확정한 것(호스팅 PC 셸·반응형 스펙)은 계획에 들인다. 와이어프레임만 근거인 동작 변경(기능·API 흐름이 달라지는 것)은 계획을 바꾸지 않고 design-requests에 질문으로 올린 뒤, 해당 Phase에 "(Qxx 대기)"로 표시한다. UI만 바뀌고 API·흐름이 같은 것은 V 범위에 반영한다.

**코드 위치**
- 화면 상태 훅·도메인 규칙은 `src/features/<track>/<feature>/model/`(예: `features/audience/event/model/useTicketSelection.ts`, `ticket-state.ts`). 뷰는 같은 feature 폴더의 컴포넌트다.
- 여러 화면·양쪽 트랙이 쓰는 규칙은 `features/shared/<x>/model/`. 순수 계산이 API 응답에만 의존하면 `src/api/<domain>/`(예: 이미 있는 `order/price.ts`).
- eslint boundaries에 `model/` 하위 폴더를 따로 등록해야 하는지는 P4b-L 착수 때 확인한다.

**테스트**(층과 도구는 [`tech-decisions.md`](./tech-decisions.md) §10)
1. **도메인 규칙** — 표 기반 단위 테스트(`it.each`). 경계값과 `openEnum`의 `UNKNOWN` 분기를 넣는다.
2. **스키마** — fixture 파싱 테스트. fixture는 백엔드 DTO(`Gosrock/DuDoong-Backend` `dev`)와 백엔드 e2e 테스트(`e2e-tests/test_*.py`)의 요청·응답 예시를 근거로 만든다. 공개 GET은 `pnpm check:contract`.
3. **훅** — `renderHook` + `renderWithProviders` + MSW. Given(핸들러 세트) / When(동작) / Then(상태 + **실제로 보낸 요청 본문**). 테스트 이름은 한국어 시나리오 문장.
4. **에러 분기** — [`error-codes.md`](./error-codes.md)의 코드마다 한 행. `handleCodes`가 처리하는 코드와 전역 토스트로 가는 코드를 모두 적는다([`patterns.md`](./patterns.md) §24).
5. **라우트 로직** — Playwright e2e(빌드 + 가짜 백엔드)로 상태 코드·메타 태그·리다이렉트만 본다. 캡처는 없다.
6. 각 Phase L의 **완료 기준 ↔ 테스트 이름 대응표**를 [`implementation-log.md`](./implementation-log.md)에 남긴다(P4a 기록 형식).

PR 게이트는 그대로다(unit · stories · build). e2e는 게이트 밖이다.

**주의**
- 훅 모양은 디자인 때문에 바뀔 수 있다 — UI와 무관하게 만든다.
- storyboard·plan에 근거가 있는 것만 만든다(과잉 구현 금지).
- 디자인 답이 필요한 곳은 [`design-requests.md`](./design-requests.md)의 기본안을 따른다. 답이 바뀌면 훅 하나만 고친다.
- 사용성·접근성은 V에서만 확인된다.

**Phase 절 읽는 법**(§4): 나눈 Phase는 "L 범위 / V 범위"와 "완료 기준 — L / V"로 적는다. 동작 판정(분기, 상한, URL 반영, 요청 본문, 금액 일치, 권한, 에러 코드, 상태 코드, 쿼리가 나가지 않음 등)은 L, 그려짐·캡처·하이드레이션 경고 0·반응형·스토리·실기기는 V다. **모든 L의 첫 기준은 "MSW 위에서 시나리오가 훅/라우트 테스트로 통과"다.** GUI 노드·PC 와이어 근거 문단은 V에 붙는다(L에 필요한 문구·규칙은 L 범위에도 남긴다). 선행은 L·V를 따로 적는다 — L은 L끼리, V는 같은 Phase의 L + P4s-V + 그 화면이 들어가는 화면의 V + 디자인.

## 1. 이전 계획에서 바뀐 것

| 항목 | 이전 | 지금 |
|---|---|---|
| 계약 | FE가 zod로 C1~C6을 동결하고 백엔드가 수용 | 백엔드 계약이 이미 확정. P3는 Swagger를 zod로 옮기는 작업 |
| 결제 | 토스페이먼츠 SDK v2, `/pay/confirm` 콜백, 멱등 confirm (P7b·P7c) | PG 없음. 계좌송금 체크아웃 한 화면(P7)으로 합침 |
| 쿠폰 | P7a 쿠폰 선택, P9 쿠폰함 | v2 API 없음 — 범위에서 제외 |
| 공연 본문 | HTML 단일 필드 | 섹션 1~10개 + `contentFormat`(HTML/MARKDOWN) |
| Q&A · 슬랙 · 제휴 | P5b · P10b에 포함 | API도 화면도 없음 — 범위에서 제외 |
| 지도 | P5b · P11에 포함 | 관객 공연 상세의 지도 위젯은 제외. 호스팅 기본 정보의 주소 검색 → 좌표 변환은 P11에 남는다(서버가 좌표를 필수로 받는다) |
| 관심 호스트 · 아카이빙 | 미배정 | API·화면 확인됨 — P5c · P9에 배정 |
| 셀프 체크인 | 딥링크 필요 여부 미정 | `/check-in?token=…` 확정 — P8c 신설 |
| 호스트 삭제 · 초대 대기 | 포함 | 백엔드에 없음 — 제외 |
| 앱 구조 | pnpm 모노레포, Next 앱 2개(`ticket`/`admin`), `packages/{ui,api,utils}` | 단일 Next 앱, 폴더 계층 |
| 라우터 | Pages Router | App Router(Cache Components 켬, 서버 캐시 없음) |
| 스타일 | emotion | vanilla-extract |
| `/` | v1 마케팅 랜딩 | 공연홈 |
| 호스트 홈 | 호스팅 센터 화면 | 관객 쪽 공개 화면 하나(`myRole`별 뷰) |
| 드래그 정렬 | `@dnd-kit` | 없음(옵션은 id 순 고정) |

## 2. 트랙 구조

```
완료      P0 ─┬─ P1 ── P2 ──┐
              └─ P3 ────────┴── P4a

L 레인 (지금 진행 — §0)
          P4a ── P4b-L (+ P4s-L 메뉴 데이터)
                  │
                  ├─ 관객 돈 경로   P5b-L ── P6-L ── P7-L
                  ├─ 관객 조회      P5a-L · P5c-L
                  ├─ 관객 보유      P8-L ─┬─ P8b-L · P8c-L
                  │                       └─ P9-L(P7-L 뒤) ── P9b-L(P5c-L · P8-L · P9-L 뒤)
                  └─ 호스팅         P10a-L ── P10b-L(P5c-L 뒤)
                                    P11-L(P10a-L · P5b-L 뒤) ── P12-L ─┬─ P13a-L
                                                                       └─ P13b-L

V 레인 (디자인이 나오는 순서)
          P4s-V(셸) ── 그 뒤는 디자인 준비 순서
                       각 Px-V의 선행 = Px-L + P4s-V + 그 화면이 들어가는 화면의 V
                       (P4b-V는 P4s-V 뒤, P6-V는 P5b-V 안, P7-V는 P6-V 뒤, P8b-V는 P8-V 뒤,
                        P10b-V는 P10a-V · P5c-V 뒤, P11-V는 P10a-V · P5b-V 뒤, P12-V · P13a-V · P13b-V는 P11-V 뒤)

수렴      전 Phase의 L·V ── P14 ── P15
```

L 레인의 순서는 관객 돈 경로(상세 → 선택 → 체크아웃)를 먼저 닫고, 관객 조회·보유, 호스팅 순이다. 같은 줄의 `·`는 순서 없이 같이 할 수 있다는 뜻이다. 이 그림은 배치도다. 실제 선행은 각 Phase의 "선행" 줄과 §5 요약표를 따른다.

## 3. 관객과 호스팅 센터가 공유하는 지점

같은 데이터를 반대편에서 다루는 지점이다. `src/api`의 같은 스키마·같은 함수, `features/shared`의 같은 컴포넌트를 쓰는 것으로 관리한다.

| ID | 공유 지점 | 관계 Phase | 관리 수단 |
|---|---|---|---|
| S1 | 티켓·옵션 | P6·P7 ↔ P12 | `ticket-item`·`option` 스키마 공유. `remaining`의 뜻이 화면마다 다르다는 점을 타입 주석에 남긴다 |
| S2 | 금액 계산 | P7 ↔ P12 | `order/price.ts` 순수함수 1개. 체크아웃 총액과 토스 송금 링크 금액이 여기서 나온다 |
| S3 | 공연 상세·섹션 | P5b ↔ P11 | `features/shared/section-viewer`를 미리보기가 재사용 |
| S4 | QR · 체크인 | P8·P8c ↔ P13b | QR 값 = 티켓 uuid. `check-in` 스키마의 `result` enum과 결과 화면 공유 |
| S5 | 주문 · 환불 | P9 ↔ P13a | `order` 스키마 공유. 사용자 상태와 호스트 상태 분류가 다르다 |
| S7 | 알림 벨 · 알림함 | P9b ↔ P10a | `features/shared/notification`. 벨(GN-2)은 먼저 착수한 Phase가 만들고(P9b-L이 먼저 만들었다) 알림함 화면(`/mypage/notifications`)은 P9b |
| S8 | 호스트 홈 | P5c ↔ P10b | `features/shared/host-home`. 한 화면이 `myRole`로 분기 |

**계약 변경 절차**: 계약의 출처는 Swagger다. 백엔드 변경이 오면 `src/api`만 고치는 별도 PR로 받고, 기능 PR에 스키마 변경을 섞지 않는다.

## 4. Phase 상세

### P0 — 스캐폴딩 · 스파이크 · 의존성 확정

**목표**: 이후 Phase가 밟을 지반이 실제로 작동함을 수직 슬라이스 하나로 증명한다.

**산출물 A — 골격**
- 단일 Next 16 앱(App Router, `output: 'standalone'`, Cache Components는 기본값대로 켬), `src/{app,features,ui,api,utils,env}`, 라우트 그룹 `(audience)/(public)` · `(audience)/(app)/(protected)` · `hosting`
- TS `strict` + `noUncheckedIndexedAccess`, alias `@/*`
- vanilla-extract 연결(`@vanilla-extract/next-plugin`, `unstable_turbopack: { mode: 'auto' }`)
- Dockerfile(멀티 스테이지, `HOSTNAME=127.0.0.1` `PORT=3000`), `/healthz`, `deploymentId`, 이미지 빌드 워크플로(P0에는 GHCR로 썼다 — 2026-10-29 ECR로 결정, Deploy 권한(backend-questions B15) 뒤 다시 쓴다) — [`deploy-plan.md`](./deploy-plan.md) D1. 스테이징 첫 배포(D2)는 P4b
- 개발용 `rewrites`(`/api` → dev API), PR 게이트(`next typegen` → typecheck · lint · vitest)
- 공개 env zod 검증(`env/client.ts`, 빌드 때). ky 인스턴스는 기준 주소 없이 만들고, `http.ts`가 요청마다 `prefix`를 넘긴다 — 서버(`typeof window === 'undefined'`)면 `process.env.API_INTERNAL_URL || 'http://localhost:8080/api/v2'`(`/api/v2`로 끝나야 한다), 브라우저면 `${location.origin}/api/v2`(`instrumentation.ts`·`env/server.ts`는 두지 않는다). 구조화 stdout 로그
- ESLint(flat config) + Prettier + husky + lint-staged. 프로젝트 고유 규칙(계층, `ky` 직접 import 금지 등)은 [`tech-decisions.md`](./tech-decisions.md) §24
- Vitest + Testing Library + MSW, Storybook
- (2026-10-17 추가) 컴포넌트 통합 헬퍼 `renderWithProviders`, 스토리 테스트(`@storybook/addon-vitest`), Playwright e2e·QA 시나리오(빌드한 앱 + 가짜 nginx/백엔드, `pnpm test:e2e`·`pnpm qa <feature>`, PR 게이트 밖)와 `qa-scenario` 스킬 — [`tech-decisions.md`](./tech-decisions.md) §10·§32
- `CLAUDE.md`, `.env.example`, PR 템플릿, `public/term.html`·`privacy.html`(v1에서 이전) — **2026-10-25: 이 사본은 개정 전 약관이다**(v1 #355 직전 파일과 바이트 동일). 2026-10-25 시행 개정본(Front #355, `release/ticket` `fc3278d`)으로 교체해야 한다 — implementation-log 코드 수정 거리

**산출물 B — 스파이크**: 설계의 전제는 2026-10-11~12에 돌려 확인했다([`tech-decisions.md`](./tech-decisions.md) §21·§22·§26). 다만 전체 구성(ky + vanilla-extract + `<Prefetch>`)은 Cache Components를 끈 상태로, 켠 상태는 축소 구성으로만 확인했다. P0에서 채운다.
1. **Cache Components를 켠 전체 구성**에서 빌드·개발 서버·`<Prefetch>`·토큰 미전송·실제 카카오 UA의 OG 위치·404가 §26과 같게 나오는지
2. (`SameSite=Strict` 확인은 P4b로 옮겼다)
3. 상태 코드 표 — {Suspense 있음 / 없음} × {카카오 UA / 브라우저 UA} × {없는 공연 / 백엔드 5xx}. 켠 구성에서 크롤러 404가 Suspense와 무관하면 `(public)`/`(app)`을 나눈 이유가 사라지므로 그룹 구조를 다시 본다. 5xx에서 크롤러에 200 + 에러 화면이 나가는지도 본다(카카오가 잘못된 미리보기를 캐시한다)
4. 프리페치 없는 `useSuspenseQuery` 페이지(`/tickets` 형태, `/hosting/events/[id]/…` 형태)를 열었을 때 Next 서버발 백엔드 호출이 0건인지(백엔드 접근 로그). 게이트 없는 `(app)` 화면(`/events`)은 결과와 무관하게 `useQuery`만 쓰기로 이미 정했다 — 여기서는 확인만 한다
5. `instant = false` 라우트로 가는 `<Link>`의 프리페치가 백엔드 조회를 일으키는지(공연홈 카드 수만큼 호출이 늘어나는지)
6. `isomorphic-dompurify`(jsdom)를 포함한 standalone 기동과 섹션 10개짜리 공연 상세를 연속으로 열 때의 메모리

**산출물 C — 의존성 확정**

| 항목 | 판정 | 귀속 |
|---|---|---|
| 스타일 | vanilla-extract(`css`, `recipes`, `sprinkles`, `dynamic`) | P1 |
| 에디터 | Tiptap(HTML 저장) | P11(에디터), P5b(뷰어) |
| 마크다운 렌더러 | `marked` → HTML → `isomorphic-dompurify` | P5b |
| 테이블 | `@tanstack/react-table` + 자체 디자인 | P2(`DataTable`), P13a |
| QR 스캐너 | `@yudiel/react-qr-scanner` | P13b |
| QR 생성 | `qr-code-styling` | P8 |
| 바텀시트 | `vaul` | P2 |
| 오버레이 | `overlay-kit` | P2 |
| 드래그 | **없음** — 옵션은 서버가 id 순으로 고정 | — |
| 결제 SDK | **없음** — PG 없음 | — |
| 주소 검색 · 좌표 | Daum 우편번호 서비스(주소 검색) + 카카오맵 JS SDK `services.Geocoder`(주소 → 위도·경도). v1도 Geocoder를 썼다. 지도 위젯은 그리지 않는다 | P11 |
| `@use-funnel/browser`, `react-simplikit` | **쓰지 않는다** — 쓰는 곳이 적고 0.x다 | — |
| 날짜·파일 선택·토스트·캐러셀 | v1이 쓰던 것(`react-datepicker`, `react-drag-drop-files`, `react-toastify`, `swiper`)은 React 19에서 문제없다. 라이브러리로 갈지 자체 구현할지만 정한다 | P2, P5a |

**산출물 D — 외부 확인(첫날 착수)**
2. 리다이렉트 표는 tech-decisions §22에 있다. 실제로 유통된 URL이 무엇인지(접근 로그)만 확인한다
3. 백엔드 V001~V011 실행 일정, v1 FE와 병행 운영 가능 여부 (→ 2026-10-25 마이그레이션 부분은 backend-questions B5에서 닫음)
4. 리프레시 토큰이 사용자당 하나인 것이 의도인지(→ 2026-10-25 해결: 백엔드 #807로 기기별 세션, B1), 운영의 리프레시 토큰 수명
5. 카카오 개발자 콘솔 — 카카오맵·로컬 API 사용 설정, JS 키에 운영·스테이징·`localhost:3000` 도메인 등록

**선행**: 없음

**완료 기준**
- [~] `src/ui` 컴포넌트 1개 + `<Prefetch>`로 조회한 쿼리 1개(GE-11)를 `useSuspenseQuery`로 읽는 페이지를 Docker 이미지로 빌드해 서빙 — standalone 빌드·서빙은 확인, Docker 이미지는 CI 첫 실행에서(tech-decisions §31)
- [~] 개발 서버에서 `.css.ts` 수정이 브라우저에 새로고침 없이 반영됨 — 재시작 없이 새 CSS가 나오는 것까지 확인, 브라우저 HMR은 P1
- [x] 계층 규칙 위반 import가 lint에서 실패
- [x] 커밋 시 스테이징된 파일에 lint·format이 적용됨
- [x] 공개 env 누락 시 빌드 실패
- [~] typecheck · lint · test CI 게이트 동작 — 로컬 통과, 워크플로 `pr-gate.yml`은 PR에서 첫 실행
- [x] 빌드한 앱을 가짜 백엔드로 띄워 서버 조회·브라우저 요청을 모두 가짜 응답으로 바꾸는 e2e·QA 실행(`pnpm qa home` — tech-decisions §32)

### P1 — `src/ui` 기반: 토큰 · 프리미티브 · 반응형

**근거**: [`design-system.md`](./design-system.md) §1·§2 — Figma 디자인 시스템 파일의 토큰·텍스트 스타일·그리드. 시작할 때 Figma를 다시 읽어 그 문서를 갱신한다.

**포함**: 토큰(`tokens.css.ts` — color(Atomic 원시 값 + 의미 색, 라이트 한 벌 — 다크 모드 미지원(사용자 결정 2026-10-25))/typography(텍스트 스타일 21개)/space(`Space/7~10`은 데스크탑에서 커짐)/radius/zIndex), 폰트(Pretendard, Saira Condensed, Kartrider — 라이선스 확인 뒤), 전역 스타일·reset·폰트, sprinkles(조건 `mobile`/`desktop` + 토큰 유틸리티). 프리미티브 `Flex`(`Flex.Center` 등) · `Spacing` · `Txt`(typography·color prop, `as`로 시맨틱 태그만 분리) · `Divider` · `Container` · `Button`(recipes). `useMediaQueries`. 아이콘 파이프라인. Storybook. 루트 `Providers`(QueryClient, `OverlayProvider`).

**선행**: P0 · **병렬**: P3

**완료 기준**
- [x] 브레이크포인트 확정(design-system §2 — 후보 desktop ≥ 1024px), 간격 토큰의 Mobile/Desktop 전환이 같은 기준을 씀
- [x] 아이콘 44종(`ic`, 변형 58개 — 2026-10-25 53종 69개)이 `<Icon name size variant />`로 렌더. Figma SVG 추출 결과를 PNG와 비교(`home`·`Ticket-alert` 보정, design-system §4), lucide 라이선스 고지
- [x] 토큰·프리미티브 스토리
- [x] 화면 코드에서 스타일을 쓰는 세 방법(프리미티브 / `sprinkles()` / `.css.ts`)의 예제 스토리
- [x] `src/ui` 공개 API에 vanilla-extract 타입 미노출
- [x] 호스팅 센터 데스크탑 배치(Desktop - 27: 좌측 사이드바 255 + 본문 + 우측 패널 392)가 1440에서 3단으로 들어가고, 1024~1279에서는 우측 패널을 본문 아래로 내리는 중간 배치를 정함(GUI에 1440 프레임 하나뿐 — [`gui-screens.md`](./gui-screens.md) §3) — **2026-10-25 GUI 반응형 스펙으로 대체**(1133 미만 모바일, 1133~1279도 3단). 다시 정하는 것은 P4s

### P2 — `src/ui` 컴포넌트: 폼 · 오버레이 · 피드백

**근거**: [`design-system.md`](./design-system.md) §3·§4 — 컴포넌트 목록, 참고할 shadcn, 동작 라이브러리, props 제안, plan 이름과 Figma 이름의 대응(ToggleButton → Toggle, Profile → Avatar, Header → Top app bar, Accordion → list 펼침형). **동작은 Radix 프리미티브(헤드리스), 모양은 vanilla-extract**(Select·Checkbox·RadioGroup·Switch·Tabs·Collapsible·Popover·Dialog·DropdownMenu·Tooltip). `Header`(Figma Top app bar)는 관객·호스팅 공용이라 여기서 만든다. 토스트는 `sonner` unstyled.

**포함**: 폼(Input/TextArea/Dropdown/SelectButton/Counter/DropZone/ToggleButton/TagButton/DatePicker/TimePicker). 클라이언트 조회 화면용 공용 404 · 403 안내 컴포넌트(서버 조회 화면은 `notFound()`) — P5a·P9·P10a가 같이 쓴다. `<AsyncBoundary>`(Suspense + 에러 경계 + `QueryErrorResetBoundary` 재시도 UI — 게이트의 오류 화면도 이것을 쓴다). `app/OverlayRouteReset.tsx`(경로가 바뀌면 `overlay.unmountAll()`, 자체 `<Suspense fallback={null}>` 안의 말단 컴포넌트). 링크 이동 표시 `LinkProgress` — 카드 `<Link>` 안의 고정 크기 인라인 표시(100ms 지연 페이드). `useLinkStatus`는 `Link` 아래에서만 동작하고 프리페치된 경로는 건너뛰므로 전역 상단 막대로 만들지 않는다. 오버레이(BottomSheet/Modal/Popup, PC=Modal · Mobile=Sheet 분기, 상태는 `overlay-kit`). `EasyOverlay`(async 확인 + 자동 close). 피드백(Toast/Loader/Skeleton/EmptyState). 표시(Accordion/Header/Footer/NavBar/Profile/Tag/ListHeader). `DataTable`.

**선행**: P1 · **병렬**: P3

**완료 기준**
- [x] 컴포넌트 스토리 — Figma 변형 전부(design-system §4)
- [x] Radix 기반 컴포넌트의 키보드 조작(방향키·스페이스·Esc)과 스크린리더 이름 확인
- [ ] 바텀시트·모달 iOS Safari 스크롤 락·키보드 회피 스모크 — 실기기 필요, P4s-V로 옮김
- [x] RHF `register` 직결 / `Controller` 필요 컴포넌트 표 확정(design-system §4-2)
- [x] 일러스트·아바타·로고를 design-system §4-1 위치·방식으로 추가(일러스트는 PNG → 2026-10-25 SVG로 전환)
- [x] 결정: `pnpm test:stories`를 PR 게이트에 넣었다(tech-decisions §24)
- [x] 결정: 오버레이가 열린 채 뒤로가기 → 오버레이를 닫는다(사용자 결정). `useCloseOnBack` + `pushState`, `?order=` 오버레이도 같은 방식(patterns §6)

### P3 — `src/api` 코어 + v2 계약 이식 + mock

**목표**: 백엔드 계약을 FE 타입으로 옮기고, 백엔드 없이도 개발할 수 있게 한다.

**산출물 A — 코어**
- ky 클라이언트(내부): `{success, status, data, timeStamp}`를 벗겨 `data`만 반환, 실패는 `ApiError{status, code, reason}`. `status`는 언제나 HTTP 상태다. 본문이 JSON이 아니면(nginx의 HTML 502 등) `ApiError(res.status, 'NON_JSON', '')`
- 에러 분기 유틸: HTTP 상태(401/403/404)와 `code`. `getErrorCode(e)`는 절대 throw하지 않는다
- `V2PageResponse` 스키마 팩토리와 페이지 기반 무한 쿼리 헬퍼(`hasNext`)
- 날짜 변환(`yyyy.MM.dd HH:mm` ↔ `Date`, KST 고정)
- queryKey 컨벤션, QueryClient 기본값(`retry`·`staleTime`). 의존값이 없으면 `skipToken`/`enabled`, 파생 값은 호출부의 `select` 옵션 — 별도 헬퍼를 두지 않는다
- 엑셀 응답(래퍼 없는 blob) 호출 경로
- `api` 객체(`get` / `post` / `patch` / `put` / `delete` / `download`): 호출 + 응답 래퍼 해제 + zod 파싱
- `src/api/server/`: `serverQuery`(요청별 QueryClient, 404 → `notFound()`), `<Prefetch queries>`(일반 쿼리만. 무한 목록은 브라우저에서 읽는다)
- v1 인증 호출(`/api/v1/auth/…`)은 v2 `api`와 기준 경로가 달라 따로 둔다
- **이미지 업로드 모듈**: 업로드 URL 발급(PH-15 · PE-10 · PM-3) → S3 PUT → `key` 반환. presigned URL 3분 유효, 분당 30회 제한 안내. P9 · P10b · P11이 쓰기만 한다

**산출물 B — 도메인 슬라이스**: [`api-contract.md`](./api-contract.md) §5의 API(당시 82개, 2026-10-25 기준 86개)를 도메인별 `schema.ts` · `queries.ts`로 옮긴다. P3는 코어와 **공개 GET 9개(SYS-1 제외) + 세션**까지, 나머지는 각 기능 Phase가 채운다.

**산출물 C — mock**: MSW 핸들러. 에러 응답도 실제 형식(`code` 포함).

**산출물 D — 금액 계산**: `order/price.ts` 순수함수 — 백엔드와 같은 식 `(단가 + 옵션 추가금) × 수량`(티켓별 옵션이면 티켓마다 합산, tech-decisions §18).

**선행**: P0 · **병렬**: P1/P2 · **API 의존**: Swagger 접근(로그인 필요)

**완료 기준**
- [x] 응답 래퍼·에러·페이지·날짜 유틸 단위 테스트(HTML 502 → `ApiError{status: 502, code: 'NON_JSON'}` 포함)
- [x] 공개 GET 9개 스키마가 dev 서버 실제 응답을 파싱 — 운영 `dudoong.com`으로 8개 통과(`pnpm check:contract`), GG-3은 실제 선물 토큰이 없어 미확인
- [x] MSW로 백엔드 없이 기동(`pnpm dev:mock`)
- [x] 금액 계산 경계값(0원, 옵션 가산, 수량 상한)
- [x] 서버에서 도는 조회에 토큰이 붙지 않음
- [x] 업로드 모듈이 MSW에서 발급 → PUT → `key` 반환까지 동작

### P4a — 세션 · 401 처리 (게이트)

**포함**: 세션 쿼리(GM-1, `staleTime` 5분 — 창 포커스 재조회는 5분이 지난 뒤에만 일어난다. 로그인·로그아웃·프로필 수정 때 명시적으로 갱신). 401 처리 규칙은 [`tech-decisions.md`](./tech-decisions.md) §4 인증의 표를 따른다.
- **세션 플래그 `dd:session`** — `localStorage`에 로그인할 때마다 새로 만든 무작위 값을 둔다. 값이 있으면 "세션이 있었다", 값이 달라지면 "다른 세션"이다. 저장소 접근이 실패하면 플래그 없음으로 본다. Safari ITP가 7일 뒤 지우면 조용한 재로그인을 잃는다(리프레시 토큰 수명이 3600초인 동안은 영향 없음, [`backend-questions.md`](./backend-questions.md) B2와 함께 다시 본다).
- **플래그가 없으면 어떤 401도 재발급·`onSessionLost` 없이 `ApiError(401)`로 던진다**(익명 방문자의 요청 수를 늘리지 않는다).
- 플래그가 있을 때 보호 요청의 401(코드 무관)은 재발급을 한 번 시도한 뒤 원 요청을 재시도한다. 탭 안에서는 재발급 1회로 묶고, 탭 사이는 `navigator.locks.request(name, { signal: AbortSignal.timeout(15000) }, …)`로 직렬화한다(잠금 대기가 끊기면 일시 오류). 잠금을 얻었을 때 `dd:refreshedAt`이 그 요청을 보낸 시각보다 늦으면(다른 탭이 이미 재발급) 재발급 없이 재시도만 한다. 재발급 HTTP 타임아웃 10초. Web Locks가 없으면 재발급이 403이어도 그 사이 `dd:refreshedAt`이 바뀌었으면 원 요청을 한 번 재시도한다.
- **재발급 결과 판정**: 2xx 성공. 401·403과 그 밖의 4xx면 **세션 상실**(다시 시도하지 않는다 — 낡은 액세스 쿠키 401에 대한 재시도는 백엔드 #792로 재발급이 `permitAll` 익명이 돼 2026-10-25 지웠다). 5xx·네트워크 오류·타임아웃은 **일시 오류** — 세션을 유지하고 재발급 응답의 에러를 던진다(그래야 5xx 재시도 규칙이 그대로 적용된다).
- 세션 상실이면 `SessionLostError`(`ApiError` 하위)를 던진다. 전역 `onError`, `AsyncBoundary`, 게이트는 이 에러를 무시한다(토스트·에러 화면을 띄우지 않는다). `onSessionLost`는 모듈 플래그로 한 번만 실행된다.
- `authApi`(v1 인증 호출)에는 401 가로채기가 없다. 재발급 호출이 다시 잠금을 요청해 멈추는 일을 막는다.
- **GM-1의 결과는 셋**: 세션 / `null`(플래그 없는 401, 또는 재발급이 세션 상실로 끝남) / throw(GM-1 자체의 5xx·네트워크 오류, 재발급 일시 오류). `api`는 이동하지 않는다.
- `onSessionLost`: `queryClient.clear()` → `dd:session` 제거 → `(protected)`·`/hosting`이면 `location.assign('/login/expired?redirect=…')`, 그 밖(공개 화면·`/events`·`/login`)이면 `location.reload()`로 같은 주소를 익명으로 다시 그린다.
- 공개 GET(`{ public: true }`)은 항상 `credentials: 'omit'`으로 보낸다.
- 보호 화면의 로그인 게이트 골격 `(audience)/(app)/(protected)/layout.tsx` — pending이면 스켈레톤, `null`이면 **항상** `/login?redirect=…`(게이트는 `/login/expired`로 보내지 않는다 — 그건 `onSessionLost`만 한다), error면 children 대신 전체 화면 재시도(`AsyncBoundary`의 재시도 UI)를 그리고 이동하지 않는다. 세션이 있다가 `null`이 되면 이동 전에 `clear()`. 서버에서 쿠키로 막지 않는다(tech-decisions §25).
- 탭 사이: `storage` 이벤트로 `dd:session`이 사라지거나 값이 바뀌면 `clear()` 후 보호 영역이면 `location.assign('/login?redirect=…')`, 아니면 `reload()`. `pageshow`의 `persisted` 복원에서 `dd:session` 값이 로드 때와 다르면 새로고침.
- 익명이 확정된 사용자별 버튼(♡ 관심, 선물 수락 등)은 요청을 보내지 않고 `/login?redirect=<현재 주소>`로 가는 링크다.
- 로그아웃은 응답과 상관없이(5xx·네트워크 포함) 로컬을 정리하고 이동한다. 진행 중인 mutation이 있으면 버튼 비활성. (백엔드는 #793부터 언제나 200 + 쿠키 삭제.)
- `redirect` 파라미터 검증(같은 origin 상대 경로만). mock 세션 3상태(로그인 · 비로그인 · 만료).

**선행**: P1, P3

**완료 기준**
- [x] mock 3상태에서 더미 보호 라우트와 공개 화면 진입이 설계대로 분기(비로그인 → `/login?redirect=…`, `redirect` 검증 통과)
- [x] 비로그인 방문자(플래그 없음)는 어떤 401에도 재발급을 시도하지 않고 이동하지 않음
- [x] 게이트가 세션 확정 전에 보호 화면의 쿼리를 내보내지 않음
- [x] 동시 401 N건에서 재발급 1회. 두 탭 동시 만료는 mock으로 잠금 직렬화만 확인하고, 실제 재발급으로는 P4b에서 확인
- [x] 재발급이 5xx·타임아웃이면 세션이 유지되고, 401·403이면 위치에 따라 `/login/expired` 또는 같은 주소 새로고침. 세션 상실에 토스트·에러 화면이 뜨지 않음
- [x] 보호 화면 첫 진입에서 GM-1이 502면 재시도 화면이 뜨고 이동하지 않음
- [x] 한 탭에서 로그아웃하면 다른 탭이 `storage` 이벤트로 캐시를 비우고 이동
- [x] 익명 확정 상태의 ♡·선물 수락은 요청 없이 로그인으로 이동
- [x] 공개 GET은 쿠키 없이 나감
- [x] 로그아웃 뒤 이전 사용자의 쿼리 캐시가 보이지 않음(bfcache 복원은 P4b)

### P4s — 레이아웃 셸: 관객 · 호스팅 센터

**왜 따로 두나**: 셸은 P5a(관객)와 P10a(호스팅)에 나뉘어 있었는데, 화면 작업 전에 레이아웃을 먼저 잡기로 했다(2026-10-21 사용자 결정). 셸이 세션 상태(햄버거 로그인/비로그인, 상단 바 아바타, 게이트)에 따라 갈리므로 P4a 뒤에 둔다. **같은 날 로직 먼저(§0)로 바꾸면서 레이아웃은 디자인 뒤로 갔다** — P4s는 거의 전부 V이고, 디자인이 준비되면 V 레인의 첫 번째(P4s-V)로 한다. 로그인 화면(P4b-V)도 관객 셸 위에 그려지므로 P4s-V 뒤다. 햄버거·아바타 드롭다운이 같이 쓰는 메뉴 데이터만 P4s-L로 먼저 만든다.

**관객 PC 방식(2026-10-21 결정, V 근거)**: 와이어프레임 V0.9 `FUQb8ldGBp3uYUuXPV5FDC`의 WEB 섹션(`640:19274`, 1440폭)과 모바일 v1.0 섹션(`461:10730`)을 근거로 한다. **주소·페이지는 하나, 1024px 기준 반응형**(별도 PC 라우트·UA 분기 없음). 폭만 다른 화면은 같은 마크업에 CSS만 바꾸고, 구조가 다른 부분(상단 바, 공연 상세의 티켓 선택)은 두 벌을 두고 CSS로 하나만 보인다(서버 HTML과 하이드레이션이 어긋나지 않게 — patterns §1). PC 본문 폭 1200(1440에서 좌우 120). 1024 미만(태블릿 포함)은 모바일 레이아웃, 본문 최대 폭을 둔다. PC 실제 디자인(GUI)은 아직 없다 — 와이어 구조에 GUI 토큰을 입히고, PC GUI가 나오면 맞춘다. 호스팅 GUI가 1133 기준으로 나와 관객도 맞출지는 design-requests Q38 — 답이 오기 전까지 관객은 1024 그대로다.

**호스팅 PC 방식(2026-10-25 GUI "Ready for dev", V 근거)**: GUI 반응형 스펙([`gui-screens.md`](./gui-screens.md) §3)대로 **1133 미만 모바일**, 1133~1279 / 1280~1439 / 1440~ 데스크탑. 1133~1279도 3단이다(우측 패널을 본문 아래로 내리지 않는다). 셸 구조는 tech-decisions §3 "호스팅 센터 셸". 관객(1024)과 호스팅(1133) 경계를 브레이크포인트 토큰에서 어떻게 나눌지는 **P4s 착수 전에 정한다**.

**L 범위**
- **메뉴 항목 목록 하나** — 모바일 햄버거와 PC 아바타 드롭다운이 같이 쓰는 데이터(프로필·이메일, 티켓, 주문내역, 관심 호스트, 지난 공연 아카이빙, 내 호스트 + 새 호스트 만들기, 로그아웃 — 업데이트 노트·AD는 Q4대로 넣지 않는다), 바로가기 "새 공연 만들기"(`/hosting/new/events`) · "새 호스트 만들기"(`/hosting/new/hosts`). 위치는 `features/audience/shell/model/`(호스팅 드로어도 같은 목록을 쓰게 되면 `features/shared/`로 올린다)
- **로그인/비로그인 분기** — 미로그인의 벨 · 호스팅 센터(화면 문구는 "공연준비" — 아래 V) · 주문내역 · 관심 호스트 · 새 호스트/공연 만들기는 `/login?redirect=<그 경로>`(벨은 `/login?redirect=/mypage/notifications`, design-requests Q16)
- **호스트 줄 파생값** — GM-1 `hosts` 최대 10 + `hostCount`. 없으면 "아직 두둥에서 호스트가 없어요.", 더 있으면 공연준비 홈으로
- **약관 표시 의무 — v2 계획에 위치 없음(위험, 2026-10-25)**: 약관 제3조③은 "서비스 첫 화면"에 중개자 지위를 표시한다고 한다. v2는 푸터를 보류했고 첫 화면에 그 자리가 없다(계획은 바꾸지 않았다). v1 운영(참고)은 전역 푸터 사업자 정보 아래 한 줄(Front #345, legal-copy A-3). 서비스 공지 상단 배너(백엔드 #832)를 셸에 넣을지는 §7 "범위 밖·미정".

**V 범위**
- 관객 PC 상단 바(와이어 `626:19888` 로그인 전 · `640:17991` 로그인 후): 왼쪽 로고 + 글자 메뉴 "공연 둘러보기"(`/events`)·"공연 준비하기"(`/hosting`), 오른쪽 검색 + [로그인] 또는 아바타·닉네임 ▾. 아바타 드롭다운과 모바일 햄버거는 L의 같은 목록을 각각 그린다. 모바일 헤더와 PC 상단 바는 CSS로 하나만 보인다.
- 관객 셸(`(audience)/layout.tsx` 계열): 모바일 헤더 변형(로고형 `basic title` search/no search, 제목형, 뒤로가기형 — P2 `Header`), 화면 폭·좌우 여백(`Container`), `not-found`·`error`(공용 404·에러 화면). **햄버거**(와이어 454:556 → 지금 `128:2875` 로그인 · `128:2931` 미로그인, GUI `331:11622` 로그인 · `331:11679` 미로그인) — 로그인/비로그인, 소속 호스트 아바타 줄, 바로가기 — GUI 문구. 와이어 `128:2875`(2026-10-24)를 따라 바로가기 줄을 **"공연 둘러보기 ↗"(`/events`) · "공연 준비 ↗"(`/hosting`)** 두 줄로 두고, **햄버거 안에서 들어가는 하위 화면(주문내역 등)의 모바일 헤더는 뒤로가기 + 제목**이다(Tomato 09-27, 10-24 해결). **"호스팅 센터" → "공연준비"는 화면 문구만 바꾼다 — 라우트 `/hosting`과 코드 이름은 그대로**(Nemin 09-27, 미로그인 햄버거는 와이어에서도 아직 옛 문구 — design-requests 문구 정정).
- 호스팅 셸(tech-decisions §3, GUI `Top bar_Host` · 공연 사이드바 · 반응형 스펙): `hosting/layout.tsx` — **데스크탑(1133 이상)은 전역 상단 바**(높이 58: 로고 · "공연 둘러보기" · "공연 준비하기" · **알림 벨** · 아바타 ▾), 모바일은 헤더(GUI `host title` — 원격 `727:23982`, 햄버거 + "dudoong host" 로고. 제목형("호스팅 센터", 햄버거 없음 + 벨 + 아바타) 대안이 있어 확인 대기 — design-requests Q17). 모바일 알림 벨은 로고형 헤더에 자리가 없어 **햄버거 드로어 안**에 둔다(관객 햄버거와 같다). 벨은 누르면 `/mypage/notifications`, S7. **로그인 게이트** — P4a의 게이트를 그대로 쓴다. **공연 밖 화면(공연준비 홈 등)은 사이드바 없이 본문 최대 1280**(좌우 여백 40 · 40 · 80). 공연 사이드바(268)는 `events/[eventId]/layout.tsx`가 그린다(P11-V) — P4s는 그 자리(3단 슬롯)만 둔다.
- 데스크탑 배치: 공연 안은 사이드바 268 + 가운데 fill(최소 572 ~ 최대 1261) + 우측 일정 패널 286 / 335 / 388(1133 / 1280 / 1440 구간, **등록 후 대시보드만**). 1133~1279도 3단이다. 우측 패널은 페이지가 슬롯으로 채운다. 스펙의 빈 곳(1133 미만 최대 폭, 1920 이상 남는 폭 등)은 design-requests Q39 — 답 전까지 gui-screens §3의 프레임 값으로.
- 확인용 빈 페이지(관객 공개·보호, 호스팅 홈 자리)와 QA 시나리오(`pnpm qa shell` — 모바일·데스크탑 캡처, mock 로그인/비로그인).

**선행**: L — P4a · V — P4s-L, P2 + 디자인(셸)

**완료 기준 — L**
- [ ] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [ ] 햄버거와 아바타 드롭다운이 같은 메뉴 목록을 쓴다(목록 하나가 로그인/비로그인에 따라 항목을 돌려줌)
- [ ] 호스트 줄 파생값이 0개 · 10개 이하 · 10개 초과(`hostCount`)에서 맞음
- [ ] 미로그인 햄버거의 보호 항목이 로그인으로 보내고(`/login?redirect=<그 경로>`), 로그인 뒤 그 항목으로 돌아옴(복귀는 P4b-L의 콜백 처리)
- [ ] 비로그인으로 `/hosting/**`에 들어가면 `/login?redirect=…`, 세션이 확정되기 전에는 호스팅 쿼리가 나가지 않음(P4a 게이트)

**완료 기준 — V**
- [ ] 관객 셸이 1024 미만은 모바일 헤더 + 햄버거, 이상은 PC 상단 바 + 아바타 드롭다운으로 그려지고(하이드레이션 경고 0), 404·에러 화면이 셸 안에 나옴
- [ ] 로그인 전 PC 상단 바에 [로그인]이 나옴
- [ ] 햄버거의 호스트 줄이 0개 · 10개 이하 · 10개 초과에서 맞게 그려짐
- [ ] 호스팅 센터가 1133 이상에서 상단 바(벨 포함) 셸로, 1133 미만에서 헤더 + 햄버거 드로어로 그려지고, 공연 밖 화면은 사이드바 없이 본문 최대 1280(활성 메뉴는 경로를 읽는 말단 컴포넌트라 자체 Suspense — tech-decisions §3)
- [ ] 햄버거에 "공연 둘러보기 ↗" · "공연 준비 ↗" 줄이 있고, 화면 문구에 "호스팅 센터"가 남지 않음(라우트는 `/hosting`)
- [ ] 캡처가 QA 리포트에 있음 — 호스팅 1440 · 1280 · 1133 · 1132 · 390, 관객 1440 · 1024 · 390
- [ ] 셸이 서버에서 데이터를 조회하지 않음(`(public)` 페이지의 404 상태 코드 유지 — 셸에 Suspense를 children 위에 두지 않음). 상태 코드 판정이지만 셸 마크업이 V에서 생기므로 여기서 본다
- [ ] 바텀시트·모달 iOS Safari 스크롤 잠금·키보드 회피 실기기 스모크(P2에서 넘어옴 — BottomSheet 스토리 `WithInput`·`LongContent`, design-system §4-2)

### P4b — 인증 실구현: OAuth · 재발급 · 로그인 화면

**L 범위**: v1 카카오 OAuth 연동(흐름과 요청·응답은 [`api-contract.md`](./api-contract.md) §9 — 링크 발급 → 콜백 → 신규/기존 판정 → 로그인 또는 회원가입), 재발급(`POST /api/v1/auth/token/refresh`, `authApi`)과 로그아웃을 P4a의 `setAuthHandlers`·`useLogout`에 실제로 연결. 토큰은 JS로 읽지 않고 쿠키 자동 전송에 맡긴다. refresh는 본문·쿠키로, 카카오 토큰은 본문으로, `state` 전달(1·3번 호출은 `credentials: 'include'`). 콜백 성공 — `startSession()`으로 `dd:session`을 새 값으로 세우고 `location.assign(safeRedirect(redirect))`(하드 이동. 익명으로 캐시된 GM-1·viewer가 남지 않게). 콜백 실패 — `USER_403_1`(정지 계정. 탈퇴한 사람은 기존 사용자로 잡히지 않아 재가입 흐름으로 간다)은 "이용이 제한된 계정이에요" 안내, `AUTH_400_1`(OAuth `state` 불일치)은 로그인을 처음부터 다시 시작. `state` 값 누락·쿠키 만료(10분)는 #776 전까지 통과한다. 로그인 화면·콜백의 401은 따로 나누지 않고 일반 실패다(예전 "잠시 후 다시" 분기는 원인인 낡은 액세스 쿠키 401이 #792로 없어져 2026-10-25 지웠다 — [`backend-questions.md`](./backend-questions.md) B6). 회원가입 흐름(`register/valid` → `info`로 카카오 프로필 → `register`) 상태 훅 — 가입 폼 값·동의 상태·제출만, 오버레이 모양은 V. **가입 동의(2026-10-25 추가, 백엔드 #840·#850)**: 동의 항목은 계획 그대로(이용약관·개인정보 필수 + 마케팅 선택, design-requests Q25). 본문에는 사용자가 체크한 필드만 싣는다(UI 없는 것은 Q42 대기) — 이용약관을 체크했으면 `termsAgreed: true` + `agreementVersion: '2026-10'`(상수 한 곳 `src/api/shared/agreement.ts`), 체크하지 않았으면 두 키 모두 없다. 만 14세 확인(`ageOver14Confirmed`)은 값을 만들 칸이 v2 계획에 없어 보내지 않는다(design-requests Q42, 2026-10-25 구현). 동의 강제가 켜지면 지금 본문은 400 `Agreement_400_1` → 일반 실패(patterns §24). **약관 표시 의무(제7조① 만 14세 확인) — v2 계획에 위치 없음(위험).** v1 운영 가입 화면(참고): [필수] 만 14세 · [필수] 이용약관 · [선택] 마케팅 + 처리방침은 안내 문장, 버튼 [동의하고 시작하기](Front #358·#364, legal-copy B-2~B-5). 로그인·콜백 페이지는 최소 마크업. **스테이징 첫 배포(deploy-plan D2)** — 배포는 디자인과 무관하고 화면 없이도 API 왕복을 확인할 수 있어 L에 둔다. 공개 URL이 필요한 확인(카카오 공유 디버거, 실기기 QR)의 전제.

**V 범위**: 로그인 화면(1벌), 콜백 대기·실패 안내 화면, 회원가입 오버레이를 훅에 연결.

**GUI**(V, [`gui-screens.md`](./gui-screens.md)): 로그인 화면 `331:11720` — 말풍선 "두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!" + 캐릭터 + [카카오 로그인/회원가입].

**선행**: L — P4a · V — P4b-L, P4s-V

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 카카오 OAuth 신규/기존 분기
- [x] 보호 화면에 비로그인으로 들어와 로그인하면 원래 화면으로 돌아옴
- [x] 만료 상태에서 보호 화면 진입 시 재발급 후 화면이 정상 렌더
- [x] 정지·탈퇴 계정 토큰(익명 처리) 시 로그인 화면으로 수렴, 정지 계정으로 로그인하면 `USER_403_1` 안내
- [x] ~~로그인 화면·콜백의 401에 "잠시 후 다시 시도해 주세요"~~ → 2026-10-25 제거: #792로 그 401이 없어져 401도 일반 실패(`auth-outcome.test`·`useKakaoLogin.test`·`useKakaoCallback.test`, e2e `auth.spec`)
- [x] 로그아웃 뒤 뒤로가기(bfcache 복원)에서 이전 사용자 화면이 보이지 않음(`pageshow`)
- [ ] 스테이징 첫 배포(D2) 완료 — 이후 Phase의 공개 URL 확인이 여기에 기댄다. (2026-10-25 사실: 스테이징은 평소 꺼져 있다. Swagger는 staging·prod에서 꺼져 있다 — 백엔드 Develop 기획서. 이미지 레지스트리는 사용자 결정 대기 — deploy-plan §1)
- [x] `AUTH_400_1`이면 로그인을 다시 시작
- [ ] 두 탭이 동시에 만료돼도 실제 재발급 뒤 로그인이 유지됨(백엔드 #807로 기기별 세션 + 직전 토큰 30초 유예라 동시 재발급이 안전해졌다 — [`backend-questions.md`](./backend-questions.md) B1 해결. 실제 확인은 그대로 남긴다)
- [ ] 가입 본문에 사용자가 체크한 동의 필드만 실림(UI 없는 것은 Q42 대기), 동의 강제 400 `Agreement_400_1` 분기(2026-10-25 추가). 2026-10-25: 이용약관 체크 → `termsAgreed` + `agreementVersion`, 미체크 → 키 없음(`register-form.test`), 강제 400 → 일반 실패(`useKakaoCallback.test`) 완료. `ageOver14Confirmed`는 Q42 칸이 정해진 뒤
- [x] 오픈 리다이렉트 차단
- [ ] 카카오톡 인앱 브라우저(iOS WKWebView · Android WebView) 실기기에서 Web Locks 동작과 `localStorage`(`dd:session`) 유지 확인. Web Locks가 없으면 대체 경로로 동작 — 인증 로직 확인이라 L에 둔다(D2 뒤, 화면 디자인과 무관)
- [x] **`SameSite=Strict` 재현**: 로컬에서 응답 쿠키를 `SameSite=Strict`로 바꿔(개발 프록시 또는 브라우저 확장) 외부 링크로 보호 화면 진입, 카카오 로그인 복귀 직후 로그인 상태 유지를 확인. 스테이징 쿠키는 `Lax`라 이 확인을 대신하지 못한다. 운영 확인은 P15 리허설 체크리스트

**완료 기준 — V**
- [ ] 로그인 화면이 GUI `331:11720`대로 그려지고, 회원가입 오버레이·실패 안내가 훅 상태대로 나옴

### P5a — 공연홈 + 공연 리스트

**L 범위**: (셸 — 관객 레이아웃·헤더·햄버거·`not-found`·`error` — 은 P4s.) **공연홈 `/`** 라우트(GP-1: 배너 · 캐러셀 · 두둥 소개, `<Prefetch>`). **공연 리스트 `/events`**(게이트 없는 클라이언트 화면이라 `useQuery`만 쓴다. GP-2 + GE-11: 검색, 태그 필터 1개·4분류, 지난공연 토글, 무한 스크롤) — 검색어·태그·토글을 URL과 맞추는 상태 훅, 태그 목록은 GE-11 응답으로 만든다. 없는 태그 `Event_400_23`은 GE-11을 다시 받아 필터 초기화(patterns §13·§24). 정렬은 "공연임박순" 고정 — 서버 정렬이 `UPCOMING` 하나라 정렬 상태를 두지 않는다.

**V 범위**: 링크 이동 진행 표시(`(public)`에는 `loading.tsx`가 없어 누른 뒤 응답까지 화면이 그대로다). 공연홈·공연 리스트·태그 패널 화면, PC 배치.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §1): 공연홈 `91:4925`(헤더 햄버거·로고·검색·티켓 아이콘, 히어로 일러스트, ConcertCard 가로 캐러셀, "두둥을 알아보기"), 공연 리스트 `20:334`(검색 · Filter Chip "태그" · 지난공연 토글 · 고정 정렬 · ConcertCard 2열), 태그 패널 `324:3237`(공연구분·장르·장소·팀 4분류 + "초기화", 선택 수 Badge — 태그 목록은 화면 값이 아니라 GE-11 응답으로 그린다). 햄버거 GUI는 벨(빨간 점)이 햄버거 안에 있고, 프로필 아바타의 연필로 프로필 편집(P9)에 들어간다. **미로그인 햄버거의 벨 · 호스팅 센터 · 주문내역 · 관심 호스트 · 새 호스트/공연 만들기는 누르면 `/login?redirect=<그 경로>`로 보낸다(벨은 `/login?redirect=/mypage/notifications`)** — 데이터는 P4s-L. "호스팅 센터 ↖"(와이어 `128:2875`에서는 "공연 둘러보기 ↗" · "공연 준비 ↗" 두 줄 — 문구는 "공연준비", P4s) 옆 말풍선("두둥에서 공연을 시작해보세요!")은 툴팁이라 그린다 — 그리지 않는 것은 AD 칸과 업데이트 노트뿐이다. AD 칸과 서비스 업데이트 노트는 목적지가 없어 그리지 않는다([`design-requests.md`](./design-requests.md) Q4).

**PC**(V, 와이어 `626:19888`·`640:1032`·`640:1425`): 공연홈은 같은 순서에 폭만 넓고(캐러셀은 본문 밖까지 흐른다), 공연 둘러보기는 위에 일러스트(`login` 계열 캐릭터) + 가운데 검색창 + 카드 **4열**(모바일 2열, 600 이상 3열).

**선행**: L — P4b-L · V — P5a-L, P4s-V · **API**: GP-1 GP-2 GE-11

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 공연홈이 서버에서 렌더되고 토큰 없이 조회됨
- [x] 태그 필터·검색어가 URL에 반영되고 새로고침·뒤로가기에서 복구

**완료 기준 — V**
- [ ] 하이드레이션 경고 0

### P5b — 공연 상세 + 섹션 뷰어 + 공유

**L 범위**: `/events/[eventId]` — 라우트 파일이 `<Prefetch>`로 GP-3 + GE-5를 조회(페이지에 `instant = false`, 서버 캐시 없음), `generateMetadata`로 OG, 없는·준비중 공연은 `notFound()`, 5xx는 throw. 크롤러 계약(Playwright e2e, 실제 카카오 UA — tech-decisions §10). **섹션 탭 규칙**(서버 섹션이 없으면 기본 4탭을 프론트가 만든다 — 공연소개 · 예매안내 · 세트리스트 · 유의사항). **섹션 뷰어 변환**(`contentFormat`으로 HTML/마크다운 렌더러 선택 + sanitize, `features/shared/section-viewer/model/`). 일시 "(180분)" 표시값(시작·종료로 FE가 계산). 해시태그, 호스트 연락처(GP-3 `contacts` — 공연 문의처가 없으면 백엔드가 호스트 연락처를 준다. 문의 버튼은 연락처 — Q20 해결), 카카오 공유 내용(`features/shared/kakao-share`, PC □ 버튼은 Q22 기본안대로 공유). 화면은 클라이언트 컴포넌트이고 L에서는 최소 마크업으로 둔다.

**연락처 — 사용자별 값(2026-10-25, 백엔드 #846, A안 구현됨)**: GP-3 `contacts`는 비로그인에게 전화·이메일이 가려져 온다. 서버 조회(`<Prefetch>`)는 그대로 토큰 없이 하고, 연락처 시트는 `useEventContacts(eventId, {open})`로 읽는다 — 로그인 사용자는 시트를 열 때 `eventDetailViewerQuery`(`['events', id, 'viewer']`, 쿠키, 프리페치 안 함, `staleTime` 0)로 원문, 익명은 요청 없이 가린 값. 가린 값은 링크로 만들지 않는다(`contact-link.ts`). tech-decisions §4, patterns §4-2. v1 운영(참고)은 SSR에서 쿠키 토큰을 그 요청에만 Bearer로 붙여 첫 HTML부터 원문을 그린다(Front #365) — v2는 서버에서 토큰을 다루지 않는다.

**약관 표시 의무 — v2 계획에 위치 없음(위험)**: 공연 상세의 중개자 고지(약관 제3조③)와 두둥티켓 호스트 환불 기준 우선 안내(제19조③, 판매정보의 굵은 문단). 계획은 바꾸지 않았다. v1 운영(참고): 중개자 고지는 PC 요약 칸·모바일 일시·장소 블록 아래, 판매정보는 별도 탭(Front #345·#370, legal-copy A-1·A-2). 열린 PR #839(머지 전, 예정)가 들어오면 사업자 호스트의 판매자 정보(`host.businessInfo`)도 여기에 나온다.

**V 범위**: 상세 화면, 섹션 탭 UI, 섹션 뷰어 렌더, 호스트 연락처 시트(가린 값 표시 방식은 design-requests Q41), 공유 버튼, PC 두 열. 포스터 로드 실패 폴백(v1 운영 `/no-poster.png`, Front #348 — 참고. v2 `public/`에 자산 없음, design-requests Q26).

**GUI**(V, [`gui-screens.md`](./gui-screens.md)): 공연상세 `29:1017` — 포스터, 제목, 해시태그, 일시 "(180분)" 표시(시작·종료로 FE가 계산), 장소 행, 호스트 행, 티켓 카드, 섹션 탭 4개(공연소개 · 예매안내 · 세트리스트 · 유의사항), 하단 [문의 아이콘 버튼](호스트 연락처 시트 — Q20 해결: "문의하기" 제목의 팝업 + 연락처 아이콘 나열, 와이어 `500:9569` 시트가 같은 모양) + [티켓 구매하기]. 카카오 공유 버튼은 GUI에 없지만 계획대로 둔다. 매진·판매 불가·지난 공연 상태 화면은 없다.

**PC**(V, 와이어 `640:1957`): 두 열 — 왼쪽은 포스터 + 제목·일자·시간·장소(주소)·호스트·태그 표 + 예매 안내 문구, 그 아래 섹션 탭과 본문. 오른쪽은 고정 카드(주간 달력 + 티켓 목록 + [□][티켓 구매하기]). 모바일의 하단 고정 바는 PC에서 숨긴다. 주간 달력과 □ 버튼의 역할은 design-requests Q21·Q22. "문의하기"(`666:14989`)는 공연 Q&A로 만들지 않는다 — 문의는 호스트 연락처다(Q20 해결). 주소 옆 지도(와이어 코멘트 Tomato 10-18 "맵 연결")는 관객 지도 위젯이 범위 밖이라 그리지 않는다(**Q35 대기**).

**선행**: L — P4b-L(공유 디버거 확인은 D2 뒤) · V — P5b-L, P4s-V · **API**: GP-3 GE-5

**핵심 리스크**(L)
1. 이 라우트 위에 `<Suspense>`나 `loading.tsx`가 있으면 `notFound()`가 200으로 나간다 — `(public)` 그룹에 둔다. 켠 구성에서 크롤러 기준으로도 그런지는 P0 산출물 B-3에서 확인한다
2. 5xx는 throw해서 `error.tsx`로 보낸다
3. 요청마다 백엔드를 부른다. 티켓 오픈 때 부하가 문제 되면 이 조회에만 캐시를 붙인다(tech-decisions §2)

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] **실제 카카오 UA**(`facebookexternalhit/1.1; kakaotalk-scrap/1.0; …`)로 요청 → OG가 `<head>`에 있음(스크립트)
- [ ] 카카오 공유 디버거에서 미리보기 확인(공개 URL이 필요하므로 D2 스테이징 배포 뒤). OG는 L 산출물이라 디자인을 기다리지 않는다
- [x] 없는·준비중 공연이 크롤러 UA에 404, 브라우저에는 not-found 화면
- [x] v1 실데이터 본문 샘플(MARKDOWN·HTML)이 변환 함수를 통과 + XSS 페이로드 차단
- [x] 응답 HTML에 재고 값 없음
- [x] 연락처: 익명은 요청 없이 가린 값, 로그인은 시트를 열 때 viewer로 원문, 가린 값은 링크 없음(2026-10-25 A안 — implementation-log)

**완료 기준 — V**
- [ ] v1 실데이터 본문 샘플(MARKDOWN·HTML)이 뷰어에서 정상 렌더

### P5c — 호스트 홈(공개) · 관심 호스트

**L 범위**: 호스트 홈 `/hosts/[hostId]`(GH-3 + GH-14) 라우트 — 호스트 정보(GH-3)는 `<Prefetch>`로 조회하고 화면은 여기서 공개 필드(멤버 수 `memberCount`, 개설일 `createdAt`)만 읽는다. **연락처는 공개 필드가 아니다**(2026-10-25, 백엔드 #846 — 비로그인에게 전화·이메일이 가려져 온다): 로그인 사용자는 이미 부르는 `hostViewerQuery` 응답의 `contacts`(원문)를 쓰고(추가 요청 없음, viewer 확정 뒤), 확정 전·실패 동안은 공개(가린) 값 + 상태, 익명은 가린 값. `useHostHome().contacts`는 `ContactsState`(A안 구현됨). 공연 리스트(GH-14)는 무한 목록이라 브라우저에서 `useInfiniteQuery`로 읽는다(Suspense 없음). **사용자별 값은 키를 나눈다** — `hostViewerQuery`(같은 엔드포인트, 프리페치 안 함, 세션이 있을 때만)에서 `myRole`·`isFollowing`을 읽어 관심(♡) PH-13과 관리 버튼(설정·멤버·새 공연)의 상태를 만든다. 확정 전에는 ♡·관리 버튼을 비활성으로 둔다. 익명이 확정되면 ♡는 `/login?redirect=<현재 주소>` 링크다(요청을 보내지 않는다). 관리 버튼 노출은 `features/shared/permission`의 `can(role, action)`로 판정한다(이 Phase에서 만든다). 멤버(`myRole` 있음)는 GH-14를 viewer 키로 조회해 준비중 공연까지 보고, 준비중 카드는 `/hosting/events/[eventId]`로 보낸다(`/events/[id]`는 404). 멤버 아바타 줄은 `myRole`이 있을 때만 GH-6으로 읽는다. (2026-10-25: GH-3에 공개 멤버 요약 `members[{name, profileImageUrl, role}]`(최대 10명, 비로그인은 이름 가림)이 생겼다 — 백엔드 #811. 이걸 쓰면 비멤버에게도 아바타 줄을 그릴 수 있지만 계획은 GH-6 그대로이고 프론트 스키마도 `members`를 받지 않는다. 바꿀지는 V 착수 때 디자인과 함께 본다.) `features/shared/host-home`(S8)의 `model/`.

**V 범위**: 호스트 홈 화면(하이드레이션 뒤 스켈레톤 → 목록), ♡·관리 버튼, 멤버 아바타 줄. GUI는 P10b 절의 호스트 홈(P5c) `741:30896` · `741:30970`(옛 `467:3338` · `519:1738`).

**선행**: L — P4b-L · V — P5c-L, P4s-V · **API**: GH-3 GH-14 PH-13 GH-6

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 비로그인·관객·일반 멤버·매니저·마스터 시점의 노출 판정(`can` + viewer)
- [x] 서버 조회에 토큰이 붙지 않음
- [x] ♡ 연타에도 상태 일치(같은 요청 재전송 200)
- [x] 이미 팔로우한 사용자에게 빈 ♡가 눌리는 순간이 없음(viewer 쿼리 확정 전 비활성)
- [x] 비로그인 사용자가 ♡를 누르면 로그인으로 가고 돌아옴
- [x] 멤버 시점에 준비중 공연이 목록에 있고 링크 대상이 `/hosting/events/{id}`(도착 화면 검증은 P11)

**완료 기준 — V**
- [ ] 비로그인·관객·일반 멤버·매니저·마스터 시점 렌더

### P6 — 티켓 선택

**L 범위**: 공연 상세 안의 티켓 선택(GP-5). 서버에서 조회하지 않고 브라우저에서 `staleTime:0`. 표시 판정 `ticket-state.ts` — 잔여·매진·구매 가능(`remaining`·`isSoldOut`·`isPurchasable`), 매진·판매 불가·PAST 공연 분기. **선택 상태(티켓·수량·금액)는 훅 하나** `useTicketSelection`(`features/audience/event/model/`) — 티켓 종류 선택 → 수량, 수량 상한, 1주문 1종류(다른 티켓을 고르면 경고 상태: "티켓은 한 주문당 한 종류만 구매할 수 있습니다. / 다른 티켓의 구매를 원하실 경우 티켓 선택을 취소해주세요."). 시트를 여는 동작은 훅에 넣지 않는다.

**약관 근거 안내(참고)**: v1 운영은 두둥 티켓을 고르면 시트 안에 회색 안내 3줄(호스트 확인 후 발급 / 자동 환불 안 됨 / 호스트 연락처 위치)을 둔다(Front #345, legal-copy A-4, 약관 제29조②). v2 계획에는 자리가 없다. 판정에 쓸 필드는 GP-5 `payType === 'DUDOONG'`.

**V 범위**: `TicketSelector` 컴포넌트 하나 — 인라인 수량 스테퍼, 잔여·매진 표시, 경고 배너. 모바일은 [티켓 구매하기]를 누르면 바텀시트 안에, PC는 오른쪽 카드에 처음부터 그린다. 어느 쪽이 보일지는 CSS가 정한다(시트는 열 때 마운트).

**GUI**(V, [`gui-screens.md`](./gui-screens.md)): 티켓 선택 바텀시트 `331:5853`(선택 전) · `324:4503`(선택 후 "얼리버드 − 1 + / 6,000 ₩ / ×" 수량 줄), 다른 티켓을 누르면 빨간 경고 배너 `331:7397`.

**PC**(V, 와이어 `640:15617`): 바텀시트 없이 공연 상세 오른쪽 카드에서 바로 고른다(선택한 티켓 강조 → 아래 "이름 / − 1 + / 금액 / ×" 줄 → [티켓 구매하기]).

**판매 중단 티켓**: 와이어 코멘트(Nemin 10-03, `503:25595`)는 관객에게 딤드로 보이자고 했지만 GP-5가 판매 중단 티켓을 빼고 준다 — 계획대로 보이지 않는다(**Q33 대기**, backend-questions B11 후보). 티켓 선택 후 시트 `324:4503`은 "디자인 수정 필요" 코멘트가 열려 있어 V 전에 다시 읽는다.

**선행**: L — P5b-L · V — P6-L, P5b-V · **API**: GP-5

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 매진·판매 불가·PAST 공연 분기 판정
- [x] 수량 상한 = `purchaseLimit`, `remaining`, 100 중 가장 작은 값(서버 `MAX_QUANTITY = 100`)
- [x] 선택 로직이 훅 하나에 있어 모바일(시트)과 PC(오른쪽 카드)가 같은 것을 쓴다

**완료 기준 — V**
- [ ] 매진·판매 불가·PAST 공연 분기 렌더
- [ ] 1024 경계에서 창 크기를 바꿔도 선택이 유지됨

### P7 — 체크아웃 · 주문 생성

**목표**: 금전 경로. 한 화면에서 옵션 입력 → 결제 정보 확인 → 결제 방식 → 환불 규정 동의 → 주문 생성까지 닫는다.

**L 범위**: G11/O-0(티켓 + 계좌). 옵션 응답 폼 모델과 제출 본문(모든 티켓 동일 / 티켓별, 옵션 없으면 폼 생략 — tech-decisions §18). 금액(`order/price.ts`). 결제 방식(직접 계좌이체 · 토스 송금) — **토스 송금 링크 생성**(금액 = `totalAmount`, 은행명 — GUI는 계좌·예금주만이지만 토스 송금에 은행이 필요. 2026-10-25: 계좌에 `bankCode`(백엔드 #804, 서버 추정, 실패 `null`)가 생겼다 — 토스 은행 값은 `bankCode` 매핑으로 만들고 `null`이면 토스 버튼을 숨긴다. 매핑은 서버에 없어 프론트 몫, 실기기 확인. **2026-10-25 현재 `bankCode`는 스키마로 받기만 하고 매핑·숨김은 미구현** — `tossTransferLink` TODO(B3), implementation-log 코드 수정 거리 #14). 입금자명(닉네임 고정 — 사용자가 고칠 수 없다. `Order_400_22`면 폼 상단 오류 + "프로필에서 닉네임을 확인해 주세요"). 주문 생성 P11/O-1과 중복 제출 방지(확인 모달은 V, 훅은 제출 동작만). 3분기(입금형 · 무료 승인형 · 무료 선착순)와 CTA 종류("결제하기"(유료)·"신청하기"(무료) — v1 운영(참고)은 두둥 `{금액} 예매하기`·무료 `예매하기`, Front #370). **주문 동의 필드(2026-10-25 추가, 백엔드 #840)**: P11/O-1 본문에 `hostProvisionAgreed`, 두둥이면 `dudoongTicketNoticeConfirmed`, `agreementVersion: '2026-10'` — 사용자가 체크한 필드만 싣는다(UI 없는 것은 Q42 대기). 요청 스키마(`CreateOrderRequestSchema`, `strictObject`)에 세 필드를 선택으로 더했다(2026-10-25 — `agreementVersion`은 동의 필드가 있을 때만, 짝이 안 맞으면 스키마 실패). 값을 만들 칸 — 호스트 개인정보 제공 동의 체크, 입금 확인 모달의 두둥 고지 확인 — 은 v2 계획에 없어 design-requests Q42라 지금 주문 본문에는 동의 필드가 없다(칸 없이 `true`를 만들지 않는다). 칸이 생기면 폼 값으로 `agreementFields`를 펼치고 동의 전 제출을 막는다. 동의 강제 400 `Agreement_400_1`(patterns §24). **주문 완료는 `/orders/[orderUuid]?created=1`** — 생성 응답을 `setQueryData`로 넣고 `replace`로 이동하며, 새로고침이나 배포 뒤 하드 리로드(`deploymentId`)에서도 G11/O-3로 다시 읽는다. 무료 선착순 확정 실패는 주문이 아니라 에러로 온다(FAILED 주문은 사용자에게 보이지 않는다) — 재시도만 안내한다. 에러 분기 patterns §24 P7 행(재고 계열 뒤 GP-5 다시 읽기 포함).

**약관 표시 의무 — v2 계획에 위치 없음(위험)**: ① 호스트에게 개인정보 제공 동의(약관 제36조② 별도 동의, [자세히]에 제공받는 자·목적·항목·보유기간) ② 결제(예매) 확인 화면의 중개자 문장(제3조③·제24조①) ③ 두둥 입금 확인 모달의 고지(대금은 호스트에게 직접 / 자동 환불 안 됨 / 호스트 환불 기준 우선 — 제29조②·제19조③). 계획은 바꾸지 않았다. v1 운영(참고) 문구·위치: legal-copy B-1·A-5·A-6·A-7(Front #345·#357·#370).

**V 범위**: 체크아웃 화면(옵션 입력 폼, 결제 정보, 계좌 복사, 결제 방식, 환불 규정 동의), "입금하셨나요?" 확인 모달, 주문 완료 화면.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §1·§4): 체크아웃 4종(모든 옵션 동일 `564:4156`, 유료 옵션 `567:9316`, 무옵션 `567:9159`, 개별 옵션 `567:8532`), 입금 확인 모달 `567:9468`("주문 완료하기 / 입금 하셨나요?…" + [결제완료]), 주문 완료 `567:9821`([주문내역] → `/orders`, [티켓 페이지] → `/tickets`). **프론트가 서버 기준으로 바꾸는 것**: ① 주문 전 화면의 예매번호·티켓번호 줄은 뺀다(주문 번호는 생성 뒤, 티켓 번호는 승인 뒤에 생긴다) ② 결제정보에 은행명 줄을 더한다(GUI는 계좌·예금주만, 토스 송금에 은행이 필요) ③ CTA "저장"은 동작에 맞게 "결제하기"(유료)·"신청하기"(무료)로 ④ 무료 [신청하기] 분기와 무료 선착순 화면은 GUI에 없어 같은 레이아웃에서 결제 블록만 뺀다 ⑤ 주문 완료 화면에 계좌·금액을 다시 보여 줄지는 디자인 확인(Q16) — 그 전까지는 GUI대로 두 버튼만 두고 계좌는 주문상세에서 본다. 체크아웃 하단 "판매정보"(와이어 코멘트 Tomato 09-24 `446:505`)는 무엇인지 몰라 넣지 않는다(**Q34 대기**). 동의 약관 문구 후보(GUI `89:2789` 답글)의 "별도연락하여" 계좌를 알리는 문장은 앱 안 환불 계좌 입력(P9)과 달라 정정을 요청했다(design-requests 문구 정정).

**선행**: L — P6-L, P4b-L(통합 검증 시) · V — P7-L, P6-V · **API**: G11/O-0 P11/O-1 (+ G11/O-3)

**핵심 리스크**(L): 화면 총액과 토스 송금 금액이 서버 `totalAmount`와 어긋나면 입금 금액 오류로 거절된다. 모달 중복 제출(10초 내 같은 요청은 서버가 앞 주문을 돌려준다).

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 옵션 2모드 제출 본문이 스키마 검증 통과(`applyToAll` / `perTicketOptions`)
- [x] 클라이언트 계산 총액 == 주문 응답 `totalAmount`(계약 테스트)
- [x] 3분기 각각 주문 생성 응답의 상태가 맞음(승인은 dev 서버의 v1 어드민이나 API 직접 호출로 대신한다)
- [x] 주문 완료 주소에서 새로고침해도 같은 내용(G11/O-3 재조회)
- [x] 토스 송금 링크의 금액 = `totalAmount`, 은행명 값은 [`backend-questions.md`](./backend-questions.md) B3 결과에 따라 P12 은행 목록 값 (B3 해결 2026-10-25: `bankCode` 기반 매핑으로 바꾸는 일이 남았다 — implementation-log 코드 수정 거리)
- [ ] 주문 본문의 동의 필드(`hostProvisionAgreed`, 두둥은 `dudoongTicketNoticeConfirmed`, 그때만 `agreementVersion`)는 사용자가 체크한 필드만 실리고 동의 전 제출이 막힘(MSW 본문 검사), 동의 강제 400 `Agreement_400_1` 분기(2026-10-25 추가). 2026-10-25: 스키마(`order/schema.test`)·칸이 없어 안 보냄·강제 400 → 전역 토스트, 완료로 안 감(`useCheckout.test`) 완료. 실리는 것·동의 전 막힘은 Q42 칸이 생긴 뒤
- [x] `Order_400_15`·`Ticket_Item_400_1`(재고)·`Ticket_Item_400_6`(1인 제한) 뒤 GP-5를 다시 읽어 수량 상한이 갱신됨
- [x] 에러 분기: patterns §화면별 에러 처리의 P7 행
- [ ] 스테이징에서 agent-browser로 실제 주문 생성 1회(D2 뒤). 승인 → 티켓 발급까지의 전 구간은 P13a

**완료 기준 — V**
- [ ] QA 시나리오(`pnpm qa checkout`)로 상세 → 선택 → 체크아웃 → 주문 생성까지 화면 흐름과 P7 에러 분기 검증
- [ ] 토스 앱이 깔린 실기기에서 송금 링크가 열리고 은행명이 인식됨
- [ ] 체크아웃·주문 완료에 예매번호·티켓번호가 나오지 않고, 결제정보에 은행명이 나옴

### P8 — 티켓탭 · 입장 QR

**L 범위**: 티켓탭(G11/T-1 묶음 목록 + G11/T-3 공지 바 상태), 티켓 상세(G11/T-2 — **카드를 눌러 상세·QR을 열 때만 조회한다**. 서버가 T-2를 열면 그 주문의 승인 알림을 읽음 처리하므로 목록에서 미리 읽으면 티켓탭 진입만으로 공지 바가 풀린다), 입장 QR 값(`qrValue`). 티켓 `state` 11값 → 표시 매핑(`openEnum` `UNKNOWN` 포함). 묶음마다 상태별 개수(`counts`). 승인 대기·거절 주문(티켓 없이 주문만)도 목록에 나온다. 받은 티켓 묶음(`orderUuid=null`)은 주문상세 링크가 없고, 선물 대기·취소 티켓은 QR 대신 안내 상태. 옛 uuid로 `IssuedTicket_404_1`이면 목록 다시 읽기(patterns §17·§24). 정렬은 "공연임박순" 고정(서버 정렬이 하나).

**V 범위**: 티켓탭 화면, 카드 스와이프(N/M 페이저), 공지 바, 상태별 개수 배지, 티켓 상세, `qrValue`를 `qr-code-styling`으로 렌더, QR 전체화면.

**와이어**(V, 2026-10-25 — [`figma-structure.md`](./figma-structure.md) 2026-10-25 절 "티켓탭·선물"): 기본 `455:8958`(배지 "승인완료 ③" — `counts`), **빈 상태** `696:15456`("아직 이용 가능한 티켓이 없습니다" + [티켓 구매하러 가기]), 새 승인 주문이 없을 때 **공지 바 기본 문구** "NEW 두둥에서 다양한 공연을 예매해보세요"(링크 없음, `455:8992`·`696:15456`), 공연 진행 중 배지 **"공연중"** `696:17261`(티켓 `state`가 아니라 공연 표시 상태), 승인거절 배지 `696:17479`, 입장완료 뒷면 `696:17405`, 받은 티켓 카드에는 [주문상세] 없음(`455:8992`). **선물중 티켓은 캐러셀 맨 뒤로** 둔다(Tomato 09-25 — 정렬은 프론트가 한다). 공연이 끝나면 티켓이 사라지고 "티켓 정리" 알림이 온다는 코멘트(Tomato 10-24)는 서버 동작이라 계획을 바꾸지 않는다(**Q40 · backend-questions B10 — 2026-10-26 소스로 답: T-1은 끝난 공연 티켓을 빼지 않고 아래로 보낸다, "티켓 정리" 알림 없음**). PC 티켓은 와이어 `671:7048`(공지 바 + 카드 3장 가로 캐러셀).

**선행**: L — P4b-L · V — P8-L, P4s-V · **API**: G11/T-1 G11/T-2 G11/T-3

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] `state` 11값 매핑(모르는 값 포함)
- [x] 받은 티켓 묶음(`orderUuid=null`)에 [주문상세]가 없음
- [x] 선물 대기·취소 티켓은 QR 대신 안내
- [x] 옛 uuid로 404가 오면 티켓탭을 다시 읽음
- [x] 티켓탭에 들어가기만 해서는 공지 바가 풀리지 않음(T-2를 목록에서 미리 읽지 않음)

**완료 기준 — V**
- [ ] `state` 11값 렌더

### P8b — 선물하기

**L 범위**: 보내기(PG-1 → 링크 생성 · 공유 내용 — [메세지](`sms:` 링크) · [카카오톡] · [링크 복사] · 메모 PG-8), 회수(DG-2), **공개 랜딩 `/gifts/[giftToken]`** 라우트(GG-3 `<Prefetch>`, OG, 404 `Gift_404_1`, `viewState` 7종 → 화면 상태), 수락(PG-4) · 거절(PG-5), 반환(PG-6), 보낸 사람의 "선물 완료" 상세(GG-7a). 보낸/받은 내역(GG-7, `/mypage/gifts`)은 Figma에 화면이 있을 때만 만들고, 없으면 스키마만 둔다. [선물하기]는 G11/T-2의 `canGift`, [선물 반환]은 `canReturn`으로만 노출한다. 선물 취소 사유 `cancelReason`에 `ADMIN`(운영자 강제 회수, 알림 없음 — 백엔드 #826)이 생겼다: 스키마 enum에 더한다(지금은 `UNKNOWN`으로 받는다, 코드 수정 거리). 표시 문구는 design-requests Q45. 목록 G11/T-1에는 이 값이 없으므로 두 동작은 카드를 눌러 연 상세에 둔다(T-2는 상세를 열 때만 조회 — P8). `Gift_400_2`(이미 선물 중)면 T-2의 `gift.linkPath`로 기존 링크 상태. 랜딩의 `OWN_LINK`·`EXPIRED`에서 `giftId`가 있으면(보낸 사람) 회수 가능. 랜딩도 호스트 홈처럼 공개 값(서버 프리페치)과 사용자별 값(브라우저 조회)을 나누고, 사용자별 값이 확정된 뒤에만 수락·거절을 활성화하고, 익명이 확정되면 수락은 `/login?redirect=<랜딩 주소>` 링크다. 수락·반환 뒤 티켓 쿼리 전부 무효화. 에러 분기 patterns §24 P8b 행.

**V 범위**: 보내기 바텀시트(티켓탭 위), 링크 생성 완료 · 공유 버튼, 메모, 랜딩 `viewState` 7종 화면, 수락·거절 버튼, 선물 완료 상세 화면.

**와이어**(V, 2026-10-25): 보내기 `455:9101` → `528:14520` → 링크 생성 완료 `455:8935`(+ 복사 토스트 `696:4283`) → 선물중 `457:9302` → 회수 확인 `528:12291` → 회수 완료 `528:14940`. **거절 확인은 바텀시트 + [선물 돌려주기] 한 버튼**(`128:1831`, 옛 [취소][확인] 팝업). **거절·반환 완료 화면** `461:9929`·`696:17608`("선물 티켓 반송 완료" + [티켓 페이지로 돌아가기] [다른공연 둘러보기]) — 반환에도 "거절되어" 문구가 쓰여 정정을 요청했다(design-requests 문구 정정, PG-5·PG-6은 그대로 별개 동작). **회수된 선물 랜딩** `696:17551`("두둥! 취소된 선물이에요." + 버튼 2개, `CANCELED`). 비로그인 랜딩 `128:1854`. 카드 아이콘(선물중이면 선물 취소 아이콘, 선물완료면 선물 아이콘 비활성, 받은 티켓은 반송 아이콘 — Tomato 09-25)은 `canGift`·`canReturn`과 맞게 그린다. 나머지 `viewState`(이미 받음·반환됨·내 링크·만료)는 그림이 없다(design-requests §1).

**선행**: L — P8-L, P4b-L · V — P8b-L, P8-V · **API**: PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7a (+ GG-7은 화면이 있을 때)

**핵심 리스크**(L): 비로그인 → 로그인 → 복귀 후 **명시적 수락**. 수락·반환 뒤 uuid가 바뀌므로 캐시된 티켓 쿼리를 전부 무효화한다.

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] `viewState` 7종 → 화면 상태 판정
- [ ] 미가입 수신자가 링크 → 가입 → 수락까지 완주 — 훅/라우트 테스트로 복귀 후 명시적 수락, 카카오 가입 왕복은 스테이징에서 agent-browser(D2 뒤) — 훅/라우트 부분 완료(2026-10-22), 스테이징 왕복 남음
- [x] `Gift_400_3`(이미 처리됨) 시 랜딩을 다시 읽어 상태 화면으로
- [x] [선물하기]·[선물 반환] 노출이 `canGift`·`canReturn`과 일치
- [x] 선물을 보낸 본인이 랜딩을 열어도 수락 버튼이 눌리는 순간이 없음
- [x] 에러 분기: patterns §화면별 에러 처리의 P8b 행
- [x] 랜딩 OG에 개인정보 없음(보낸 사람 닉네임은 서버가 가려서 준다)

**완료 기준 — V**
- [ ] `viewState` 7종 화면
- [ ] 미가입 수신자 링크 → 가입 → 수락의 화면 흐름을 QA 시나리오로

### P8c — 관객 셀프 체크인

**L 범위**: `/check-in?token=…` — 로그인 게이트 후 PQ-5. 1장이면 바로 입장, 여러 장이면 `SELECT_TICKET` → 후보 선택 → 재요청(상태 훅). `result` → 화면 상태 매핑(`features/shared/checkin-result/model/`, P13b와 공유). 셀프 체크인은 OPEN 공연만 된다 — 공연이 끝나 정산중이면 `Event_400_5`가 오므로 "호스트에게 티켓 QR을 직접 보여 주세요"로 안내한다. 에러 분기 patterns §24 P8c 행.

**V 범위**: 후보 선택 화면, `result`별 화면.

**선행**: L — P8-L, P4b-L · V — P8c-L, P4s-V · **API**: PQ-5

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 비로그인 → 로그인 → 같은 URL 복귀
- [x] `result` 분기 판정 전부, `Event_400_26`(잘못된 토큰) 안내
- [x] 에러 분기: patterns §화면별 에러 처리의 P8c 행(OPEN 아님, `IssuedTicket_400_1`)

**완료 기준 — V**
- [ ] `result` 분기 전부 렌더

### P9 — 마이페이지

**L 범위**: 프로필(GM-1, PM-2 닉네임 2~7자, PM-3 이미지 — P3 업로드 모듈), 주문내역(G11/O-2, 무한 스크롤), 주문상세(G11/O-3), 주문 상태 5종 + `refundStatus` → 표시 매핑 하나(목록·상세 공용), 주문 취소(P11/O-4 — 유료는 환불 계좌를 채워야 요청되고 환불 요청 상태가 된다, 무료는 바로 취소. 선물 때문에 취소가 막힌 경우에만 [주문취소] 자리에 "선물을 먼저 취소하거나 돌려받아 주세요" — 조건 `canCancel=false && status==='APPROVED' && event.displayStatus==='UPCOMING' && !issuedTickets.some(t=>t.entrance==='DONE') && issuedTickets.some(t=>(t.giftState==='PENDING'||t.giftState==='SENT') && t.entrance!=='CANCELED')`. 공연 시작 뒤·입장한 티켓이 있는 주문·호스트가 취소한 주문에는 뜨지 않는다. 경합으로 `Order_400_24`가 오면 같은 문구 + G11/O-3 다시 읽기), 주문상세의 호스트 문의(GP-3을 다시 읽어 연락처 — **쿠키를 싣는 `eventDetailViewerQuery`로**. 공개 키로 읽으면 가린 값이다 — 백엔드 #846, A안. 공연 상세의 `useEventContacts`는 프리페치 전제라 공개 GP-3을 `useSuspenseQuery`로 늘 읽는다 — viewer만 읽기로 정함(`useOrderHostContacts` — 보호 화면이라 세션 확정 뒤, 열 때 쿠키 GP-3 한 번), patterns §20), 환불 계좌 입력·수정(P11/O-5, 은행명 20자 · 예금주 20자 · 계좌번호 30자 숫자·하이픈. 은행은 `GET /api/v2/banks`(공개) 목록에서 고르고 `bankCode`를 보낸다 — 백엔드 #804·#813), 관심 호스트(GM-4, `status` 필터, 화면 안에서 해제 PH-13 DELETE, 무한 스크롤), 관람 공연 아카이빙(GM-5, 연도 탭), 로그아웃 · 회원 탈퇴(v1). 거절 주문의 금액 구성은 티켓금액·옵션금액·총액(v2에 할인 없음 — Q12). 남의 주문은 공용 404. **삭제된 공연의 주문**(2026-10-25 문서 반영, 백엔드 #789): G11/O-3이 404가 아니라 200 + `event: null`, `canCancel: false`로 온다 — 공연 정보 없이 그리고, 위 선물 안내 조건처럼 `event`를 읽는 판정은 `null`을 먼저 거른다(스키마는 이미 nullable, api-contract §6). 에러 분기 patterns §24 P9 행. 햄버거 자체는 P4s.

**마케팅 수신 설정(2026-10-25, 범위 미정)**: 백엔드 Develop 기획서는 마이페이지 마케팅 수신 토글(v1 `PATCH /api/v1/users/me/marketing` — 본문 없는 반전, 응답 `UserInfoVo`)을 F10에 넣었고 v1 운영에 있다(Front #364, legal-copy B-6·B-7 참고). v2 계획에는 없다 — 넣을지 사용자 결정 대기. 넣는다면 `PATCH /api/v1/users/me/mail`(`receiveMail`, 거래 메일까지 끔)과 혼동하지 않는다. 초기값을 읽을 v2 API가 없다(backend-questions B17). 가입에서 마케팅 동의(선택)를 받으므로 철회 수단이 없으면 처리방침 10장(언제든 철회)과 어긋난다(위험).

**약관 근거 안내(참고)**: v1 운영은 주문상세 예매취소 영역을 두둥/무료로 나눠 안내하고, 두둥 취소 확인 모달을 "취소 후 직접 환불을 요청해야 해요" + [호스트 연락처 확인하기]로 둔다(Front #345·#370, legal-copy A-8~A-11, 약관 제27조③·제29조). v2 계획(셀프 취소 + 환불 계좌, Q31)이 정본이다. 두둥 승인 전 앱 취소 불가(제27조③)와 달리 v2 `canCancel`은 두둥 승인 대기 주문에서 true다(@432cce4 소스) — backend-questions B18로 묻는다. 답 전까지 서버 값대로.

**위험 — 서버 동작과 안내가 다름(B18)**: 두둥 승인 대기 주문의 셀프 취소를 서버가 허용해 약관 제27조③·v1 안내(legal-copy A-2·A-7·A-8)와 다르다.

**V 범위**: 프로필 편집, 주문내역·주문상세 화면, 환불 계좌 시트, 호스트 문의 시트, 관심 호스트·아카이빙 화면, 탈퇴 확인(문구에 "보낸 선물 중 대기 중인 것은 취소된다").

**와이어 근거 대기**: 와이어 `500:9569`는 [주문취소]를 누르면 셀프 취소가 아니라 **호스트 연락처 시트**를 띄운다 — 계획(셀프 취소 P11/O-4 + 환불 계좌)은 그대로 두고 **Q31 대기**. 주문내역 `128:2772`의 "전체 상태 ⌄" 필터는 선택지가 없어 고정 라벨을 유지한다(**Q36 대기**). 하위 화면 헤더(뒤로가기 + 제목)는 P4s. 주문내역 상태 칩 "주문취소완료"(`128:2772`)·주문상세 아코디언 기본 펼침(`128:2262`)은 V에서 따른다. PC는 와이어 `668:5085`(주문내역)·`668:5805`(주문상세)·`667:4078`(관심 호스트)·`671:6692`(아카이빙).

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §1): 주문내역 `331:11519`(주문 카드 — 포스터 위 D-n/공연종료, 상태 칩. "최근주문순"은 서버 정렬이 하나라 고정 라벨), 주문상세 승인대기 `331:11010`(티켓 줄 없음 — 서버와 일치. 보라 버전 `336:13120`의 티켓번호·상태 줄은 따르지 않는다), 승인완료·선물 상태 `331:11066`, 옵션 펼침 `331:11192`, 승인거절 3종 `331:11330`·`331:11393`·`331:11456`(사유 `DEPOSIT_UNCONFIRMED`·`AMOUNT_MISMATCH`·`SOLD_OUT`, `ETC` 화면 없음). **프론트가 바꾸는 것**: 거절 화면의 "할인금액"은 v2에 할인이 없어 티켓금액·옵션금액·총액으로 그린다. **[주문취소]·환불 계좌 입력 입구는 GUI 어디에도 없지만** 계획대로 `canCancel`·`canEditRefundAccount`로 만든다(디자인 요청). 결제방식은 `paymentChannel` 하나만 표시. 프로필 편집·아카이빙·관심 호스트·탈퇴·취소/환불 상태 화면은 GUI에 없다.

**선행**: L — P7-L(주문 도메인), P4b-L · V — P9-L, P4s-V · **API**: GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 PH-13(DELETE) GM-5

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 주문 상태 5종 + `refundStatus` 조합이 목록·상세에서 일관(매핑 하나)
- [x] 취소는 `canCancel`, 환불 계좌 입구는 `canEditRefundAccount`로만 노출
- [x] 탈퇴 `USER_400_6` 안내
- [x] 아카이빙에서 `orderUuid=null`이면 주문상세로 이동하지 않음
- [x] 유료 취소는 계좌 입력 → 환불 요청, 무료 취소는 즉시 취소로 끝남
- [x] 남의 주문 주소로 들어오면 공용 404 안내
- [x] 위 조건에 맞는 주문에서만 [주문취소] 대신 선물 안내(공연 시작 뒤·입장 티켓 포함 주문에는 안 뜸)
- [x] 거절·호스트 취소된 주문에서 환불 계좌 입력 유도가 `refundAccountRequired`와 일치(유료 거절은 유도, 입금 미확인 거절은 유도 없음), 입력·수정(P11/O-5) 뒤 `maskedAccountNumber`가 갱신
- [x] 프로필 이미지 발급(PM-3) → S3 → PM-2 → GM-1 갱신
- [x] 관심 호스트를 해제하면 목록에서 빠짐
- [x] 주문상세의 호스트 문의가 GP-3을 쿠키와 함께 다시 읽어 원문 연락처를 돌려줌(`useOrderHostContacts`, 2026-10-25)
- [x] 환불 계좌 본문에 `bankCode`(목록에서 고른 값)가 실림(2026-10-25)
- [x] 삭제된 공연의 주문상세(`event: null`)가 깨지지 않고 취소 입구가 없음(2026-10-25)
- [x] 에러 분기: patterns §화면별 에러 처리의 P9 행

**완료 기준 — V**
- [ ] 프로필 이미지 변경이 헤더·햄버거에 반영
- [ ] 관심 호스트 `status` 3값이 표시됨
- [ ] 주문상세의 호스트 문의 시트에 연락처가 표시됨

### P9b — 알림센터

**L 범위**: 벨 상태(GN-2 — `count > 0`, `features/shared/notification` — P10a-L이 먼저 착수하면 그쪽이 만든다. **P9b-L이 먼저 만들었다**, 2026-10-25), 알림함(GN-1 무한 스크롤), 읽음(PN-3 단건·전체, 한 번에 최대 100건)과 벨·티켓탭 공지 바 갱신, 알림 탭 시 `target.type`(HOST · ORDER · GIFT · **EVENT** — 2026-10-25 백엔드 #810, `/events/{eventId}`)별 이동 경로(Q1 기본안). 17종 타입(#810으로 `EVENT_REMINDER_D1`·`EVENT_STARTING_SOON` 추가) → 카테고리 3종(티켓선물 안내 · 티켓승인 안내 · 공연 알림)·아이콘 매핑(모르는 타입 포함) — 문구는 서버 `title`·`body`를 그대로 쓴다. 호스트·환불·취소 알림은 가까운 카테고리(멤버 추가 → 공연 알림, 환불·취소 → 티켓승인 안내). GUI의 "공연 1시간 전", "D-1" 알림은 ~~v2 서버에 없어 만들지 않는다~~ → 2026-10-25 서버가 보낸다(앱 내 알림만, 백엔드 #810) — 공연 알림 카테고리로 그린다(Q13).

**V 범위**: 벨 빨간 점, 알림함 화면(안 읽음은 빨간 점 + 진한 글자, 상대 시간).

**GUI**(V, [`gui-screens.md`](./gui-screens.md)): 알림함 `331:11574` — 카테고리 3종(각각 선물·티켓·시계 아이콘), 안 읽음은 빨간 점 + 진한 글자, 상대 시간.

**선행**: L — P5c-L, P8-L, P9-L · V — P9b-L, P4s-V · **API**: GN-1 GN-2 PN-3

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 17종 타입 매핑(모르는 타입이 와도 깨지지 않음)
- [x] 벨: `count > 0` 판정, PN-3 뒤 갱신(벨을 이 Phase가 먼저 만든 경우. P10a-L이 먼저 만들었으면 거기서 검증) — **P9b-L이 먼저 만들었다**(2026-10-25)
- [x] 읽음 후 `unreadCount`로 벨 갱신
- [x] 승인 알림을 읽으면 티켓탭 공지 바 해제
- [x] `target.type` 4종별 이동(`EVENT` → 공연 상세). 호스트가 받은 주문 알림의 `?order=` 진입은 P9b-L과 P13a-L 중 늦게 끝나는 쪽이 검증한다 — P9b-L은 링크(`/hosting/events/{eventId}/guests?order={uuid}`)까지, 진입 검증은 P13a-L

**완료 기준 — V**
- [ ] 17종 타입 렌더(모르는 타입 포함), 벨 빨간 점

### P10a — 공연준비 홈 + 호스트 생성

**L 범위**: (셸 — `hosting/layout.tsx`, 헤더·드로어·사이드바·벨 자리·로그인 게이트 — 은 P4s.) **공연준비 홈**(호스트 탭 GH-1 / 공연 탭 GE-1, 검색, 빈 상태, 무한 스크롤. 준비중 공연 카드의 ⋮ 삭제는 P11), **호스트 만들기**(PH-2 `{name, introduce, contacts}` — 이미지는 만든 뒤 설정에서. 이름 15자, 소개는 서버 255자. 연락처 유형 6종 — 서버의 `YOUTUBE` 포함(Q8) — 과 유형별 placeholder: 전화 "-없이 입력해 주세요", 인스타 "@dudoong", 오픈채팅 "URL", 기타 "URL 혹은 텍스트 입력", 유튜브 "URL". 만든 뒤 이동은 Q19 기본안), 비멤버가 호스트·공연 경로에 들어올 때의 403 판정(P2 공용 컴포넌트). `/admin/*` → `/hosting/*` 리다이렉트, `/hosting/events/[eventId]` → `…/dashboard`(둘 다 `next.config` `redirects()`). 호스팅 센터용 쿼리 기본값. 카드의 호스트별 `myRole`.

**V 범위**: 공연준비 홈 화면(탭·검색·빈 상태·카드·`myRole` 배지), 호스트 만들기 화면.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §2): 공연준비 홈 — 호스트 탭 빈 상태 `37:758`("두둥! 등록한 호스트가 없어요." + [새 호스트 만들기]) · 목록 `39:1503`, 공연 탭 목록 `741:30251`(옛 `329:11129`, Card list — 카드 문구는 접두어 없이 공연명 / 호스트명 / 날짜 / 시작~종료 시각 / 장소. 지난 공연 카드에도 ⋮가 그려져 있지만 계획대로 준비중 + 매니저 이상만). **PC**(사이드바 없이 상단 바 + 본문): `741:30197`(1133) · `741:30179`(1280) · `741:30215`(1440) · `741:30233`(1920 예시) — 제목 "{닉네임}님의 공연 준비 홈", 알약형 탭 [공연][호스트] + 오른쪽 [+ 새 공연 만들기](모바일 FAB 대신), 흰 카드 안 공연 행 목록(`공연 리스트_Desktop`). 호스트 탭·빈 상태·검색의 PC는 없다, 공연 생성 직후 `298:2617`(토스트 "새로운 공연이 추가되었습니다!"). **공연을 만든 뒤 어디로 가는지가 GUI(홈 + 토스트)와 계획(대시보드)에서 다르다** — 디자인 확인 전까지 계획대로 대시보드로 보내고 토스트를 띄운다(Q7). 공연 탭 빈 상태·검색은 GUI에 없다. 호스트 만들기 `61:3484`(CTA가 "다음"이라 "만들기"로 할지 확인 — design-requests Q19, 이름 15자, 소개 — GUI placeholder는 100자지만 서버는 255자, 대표 연락처 드롭다운 + 유형별 placeholder). 연락처 유형에 서버의 `YOUTUBE`가 없다 — 목록에 "유튜브"를 더하고 placeholder는 "URL"로 한다(디자인 확인).

**선행**: L — P4b-L · V — P10a-L, P4s-V · **API**: GH-1 GE-1 PH-2 (+ GN-2 벨 — 먼저 착수 시)

**완료 기준 — L**(2026-10-26 P10a-L, implementation-log)
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 호스트 생성 → 목록 반영
- [x] 비멤버 403 판정이 더미 하위 라우트에서 동작(실제 `/hosting/hosts/[id]/…`는 P10b, `/hosting/events/[id]/…`는 P11에서 확인) — 라우트를 만들지 않고 테스트 안의 더미 하위 화면(`HostingAccessRejected.test`)으로
- [x] 벨을 이 Phase가 먼저 만들었다면: `count > 0` 판정, PN-3 뒤 갱신 — 해당 없음(P9b-L이 먼저 만들었고 거기서 검증했다)
- [x] 호스팅 센터 화면이 서버에서 데이터를 조회하지 않음(셸만 렌더) — `/hosting`·`/hosting/new/hosts`는 빌드에서 정적(○), e2e에서 서버발 `/api` 0건
- [x] 호스팅 센터용 쿼리 기본값(`staleTime` 등) 확정 — 전역 기본값 그대로(`staleTime` 0, 5xx·네트워크 1회 재시도, 포커스 재조회), 브라우저에서만(patterns §4-4)
- [x] 연락처 유형 6종(`YOUTUBE` 포함)과 유형별 placeholder 데이터 — 이메일 placeholder는 문서·GUI에 없어 비워 둠(design-requests Q49)

**완료 기준 — V**
- [ ] 카드에 호스트별 `myRole` 배지
- [ ] 연락처 유형 6종이 선택되고 유형별 placeholder가 나옴
- [ ] 비멤버 403 안내 화면

### P10b — 호스트 설정 · 멤버

**L 범위**: 호스트 설정(PH-4: 이름·소개·연락처, 이미지는 PH-15 + P3 업로드 모듈), 멤버 목록(GH-6 — 응답에 이메일이 없다), 멤버 초대(PH-7, 복수·즉시 추가, 줄별 실패 사유), 역할 변경(PH-10), 삭제(DH-11), 마스터 양도(PH-12)와 `myRole` 쿼리 무효화, 시점별 버튼 노출(`can(role, action)`), 권한 가이드 표 데이터(api-contract §2 기준 — "호스트 삭제" 행은 백엔드에 없어 뺀다). 매니저의 초대 역할은 "일반" 고정. 에러 분기 patterns §24 P10b 행. 호스트 홈 화면 자체는 P5c.

**V 범위**: 호스트 설정 화면, 이미지 업로드 칸(위치는 디자인 대기), 멤버 관리 화면, 초대 모달, 역할 메뉴, 양도 확인, 권한 가이드 표. **Figma 문구와 백엔드가 다른 곳**: 권한 가이드 표(503:30950)의 "호스트 삭제" 행은 뺀다. 초대 모달(503:31067)의 "상대방 승인 후 멤버 목록에 표시됩니다"는 즉시 추가에 맞게 "바로 멤버로 추가됩니다"로 바꾼다. **초대는 한 명씩**(와이어 `503:32779`, Nemin 10-03 → 10-04 수정 완료 — 이메일 1칸 + 역할(기본 "일반") + [초대하기]). UI만 바뀐다 — PH-7은 복수를 받으므로 L(본문·줄별 실패 매핑)은 그대로 두고 한 명짜리 본문을 보낸다.

**GUI**(V, [`gui-screens.md`](./gui-screens.md)): 호스트 설정 `741:31172`(옛 `519:2983`, 이름 · 소개 · 대표 연락처 · [문의처 추가] · [저장]). GUI의 "호스트 삭제하기"는 서버에 없어 그리지 않는다. 호스트 이미지 업로드 칸이 GUI에 없다 — PH-15는 계획대로 만들되 위치는 디자인을 기다린다. 멤버 관리 화면은 GUI에 없다. 호스트 홈(P5c) GUI는 `741:30896`(옛 `467:3338`, 멤버 시점, 배너 + 로고 + 연락처 아이콘 + 멤버 수·개설일 + 아바타 + ConcertCard 가로 스크롤 + 설정 · 관심 · FAB), 공연 없음 `741:30970`(옛 `519:1738`).

**선행**: L — P10a-L, P5c-L · V — P10b-L, P10a-V, P5c-V · **API**: PH-4 PH-15 GH-6 PH-7 PH-10 DH-11 PH-12

**완료 기준 — L**(2026-10-26 P10b-L, implementation-log)
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 마스터·매니저·일반 3시점에서 버튼 노출 판정이 권한표와 일치 — `memberActionsOf`·`PERMISSION_GUIDE`가 `can()`에서 나온다(`manageManagers` 추가, `downloadExcel`을 계약대로 매니저 이상으로 고침)
- [x] 매니저 화면의 초대 역할 선택지는 "일반" 고정
- [x] 초대 실패 시 사유의 이메일을 해당 줄에 매핑(`HOST_400_13`·`14`·`15` + `18`) — 백엔드가 `reason` 끝 괄호에 이메일을 붙인다(`toDetailException`, 432cce4)
- [x] 변경 응답(멤버 전체 목록)으로 캐시를 갱신
- [x] 마스터를 양도하면 `myRole`을 주는 쿼리(GH-1 · GH-3 viewer · GE-1 · GE-3)를 무효화해 버튼이 매니저 기준으로 바뀜(다른 멤버의 역할 변경은 내 `myRole`을 바꾸지 않으므로 무효화하지 않는다) — GE-3은 P11 전이라 키 모양(`['events', id, 'manage']`) 전체를 무효화, GM-1(`hosts[].myRole`)도 함께
- [x] 호스트 이미지 업로드가 발급 → S3 → PH-4까지 동작 — 프로필·커버 두 자리, 폼 값에 key를 두고 [저장] 때 PH-4(patterns §23)
- [x] 에러 분기: patterns §화면별 에러 처리의 P10b 행
- [x] 비멤버가 실제 `/hosting/hosts/[id]/settings`·`/members`에 들어오면 403 판정(P10a 공용 화면) — 없는 호스트·숫자가 아닌 id는 공용 404

**완료 기준 — V**
- [ ] 3시점 화면, 초대 실패 줄 표시
- [ ] 호스트 이미지가 업로드 뒤 표시됨

### P11 — 공연 생성 · 체크리스트 · 기본 정보 · 섹션 편집 · 등록

**L 범위**: 간편 공연 만들기 2단계(호스트 선택 → 공연 만들기, PE-2, `?step=` + 지역 상태. 일반 멤버인 호스트는 선택 불가. Step1 안에서 만든 호스트가 선택된 채 Step2로). 만든 뒤 대시보드로(Q7 기본안). 공연 스코프(GE-3) — 등록 상태에 따른 메뉴 항목 목록(대시보드 · 기본 정보 · 상세 정보 · 티켓 관리 · 예매자 관리 · QR 체크인). 대시보드 — 준비중은 체크리스트(GE-7) + 등록(PE-8). 체크리스트를 다 채운 순간을 상태로 알린다(모달은 V). PE-8 응답은 `{eventId, status, displayStatus}`뿐이라 성공하면 GE-3 · GE-1만 무효화하고(GE-7은 등록 뒤 쓰지 않는다) 대시보드가 체크리스트 모드에서 벗어난다. 등록 후 통계(GD-1)는 P13a. 기본 정보(PE-4: 포스터(PE-10 + P3 업로드 모듈)·이름·일정·장소·문의처·태그·티켓 여부). **장소** — 주소 검색(Daum 우편번호) 결과 → 카카오 Geocoder로 `latitude`·`longitude` → 공연장 이름 · 상세주소. 4필드(`name`·`address`·`latitude`·`longitude`)가 다 있어야 체크리스트 ①이 찬다. 수정 시 `detailAddress`를 함께 보낸다. **일정** — Figma는 날짜 하나 + 시작·종료 시각이고 서버는 시작·종료 일시를 따로 받는다. 디자인이 오기 전까지 종료 시각이 시작 시각 이하면 다음 날로 계산한다(자정을 넘는 공연). 상세 정보(GE-5/PE-6) — 섹션 전체 교체 본문(빠진 섹션 삭제), 섹션 형식(1~10개, 제목 20자, 본문 20,000자), 본문 이미지 PE-10 `SECTION`. **등록된 공연의 정보를 저장하면 안내가 필요하다는 상태**(서버는 예매자에게 알림을 보내지 않는다 — 팝업은 V). **티켓 없음(`hasTicket=false`) 공연** — 체크리스트 ③ 면제(`ticketRequired=false`), 유효 티켓이 있는데 티켓 없음으로 바꾸면 `Event_400_25`. 등록 후 `hasTicket` 잠금, 정산중·지난 공연과 일반 멤버는 읽기 전용. 삭제(DE-9) — 준비중 공연 + 매니저 이상만(등록 후에는 없다). 미저장 판정. 에러 분기 patterns §24 P11 행.

**V 범위**: 간편 만들기 화면(진행 막대), 공연 레이아웃(`events/[eventId]/layout.tsx` — 데스크탑 **공연 사이드바** 268: "‹ 내 공연" · 공연 카드(포스터 + 공연명 + "호스트명 · D-n") · 메뉴(등록 전 4 / 등록 후 6, 예매자 관리 숫자 배지 — 뜻은 Q39) · "공연 페이지 보기"(등록 후만). 모바일은 "대시보드 ▾ / 공연명" 헤더 — 메뉴를 드로어로 열지 바텀시트로 열지 **Q37 대기**), 체크리스트, "등록 준비 완료" 모달(Figma 424:11318), 등록 확인 팝업, 토스트 "공연이 등록되었습니다."(Figma 424:11427), 기본 정보 폼(주소 검색 UI, **지도 미리보기** — Q3 해결), 섹션 탭 편집 + **Tiptap** 에디터, 미리보기(`section-viewer` 재사용 — **저장하기를 누를 수 있을 때만 연다**, 코멘트 Nemin 09-20 해결), 저장 안내 팝업, 이탈 경고, 준비중 카드 ⋮ 삭제 확인.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §2): 간편 공연 만들기 — Top app bar 아래 2단 진행 막대, Step1 호스트 선택 `41:1996` · 호스트 없음 `41:2235` · **Step1 안에서 호스트 만들기** `41:2343`/`82:2909`(진행 막대 유지, 만든 뒤 Step2로 바로 간다 — `?step=` 안의 지역 상태로 처리), Step2 `55:3164`/`82:2978`(이름 25자, 날짜 1칸 + 시작·종료 시각, 티켓 여부 Radio). 대시보드 체크리스트 `727:23088`(0/3) · `745:32167`(3/3)(옛 `329:7464` · `525:3570`, 원격 `필수 체크리스트` — 1/3·2/3 변형 없음) · PC 등록 전 `727:23210`(사이드바 메뉴 4개, 우측 패널 없음) — 행 ›는 각 화면으로 이동, 티켓 없음 공연의 ③ 면제 표시는 GUI에 없어 계획대로 그린다. 기본 정보 `748:33351`(빈 폼) · `748:33451`(입력)(옛 `311:1633` · `329:7170`) — 포스터 업로드 칸, 장소(주소 Search Field → 공연장 이름 → 상세주소 → **342×144 지도 미리보기**), 문의처 행 ✕ 삭제, 태그 다중선택(검정 채움), 하단 [미리보기] + [저장하기]. **PC 기본 정보** `748:34006`(1440) — 상단 바 + 공연 사이드바 + 본문 2열(왼쪽 342 포스터·안내·[이미지 업로드] | 간격 50 | 오른쪽 필드), 하단 고정 바 오른쪽 정렬 [미리보기][저장하기]. 1280·1133 PC와 2열 접힘 폭은 없다(Q39). **지도 미리보기는 확정이다**(Q3 해결 — 코멘트 Nemin 10-25 "지도 프리뷰"): 카카오맵 지도 SDK(`kakao.maps.Map` + 마커)로 좌표를 보여 준다 — Geocoder와 같은 SDK라 추가 의존성은 없다. 상세 정보 `525:4137`(탭 공연소개·예매안내·세트리스트·유의사항·+, 밑줄형) — 에디터 툴바·섹션 제목 편집·10개 제한은 GUI에 없다(`338:15509` 와이어 시안은 알약형 탭). 등록 준비 완료 모달·등록 확인 팝업·저장 안내 팝업·이탈 경고·공연 삭제 확인은 GUI에 없다.

**선행**: L — P10a-L, P5b-L(섹션 변환) · V — P11-L, P10a-V, P5b-V(섹션 뷰어) · **API**: PE-2 GE-3 PE-4 PE-10 GE-11 GE-5 PE-6 GE-7 PE-8 DE-9

**완료 기준 — L**(2026-10-26 P11-L, implementation-log)
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 만들기 → 기본 정보 → 섹션 → 등록까지 완주(티켓 없음 공연으로. 티켓 있는 공연의 등록은 P12-L 뒤에) — e2e `hosting-event.spec` 「체크리스트를 채우면 등록 준비 완료…」, api 「티켓 없음 공연: ① 기본 정보 + ② 섹션을 채우면 canOpen…」
- [x] 간편 만들기에서 일반 멤버인 호스트는 고를 수 없음
- [x] 포스터 업로드가 발급 → S3 → `key`까지 동작
- [x] 체크리스트를 다 채운 순간을 상태로 알림 — 이 화면이 본 `canOpen`이 false → true로 바뀐 직후(`justCompleted`), 처음부터 true로 들어오면 알리지 않는다(Claude 판단)
- [x] 등록하면 메뉴 항목이 바뀌고 대시보드가 체크리스트 모드에서 벗어남(등록 후 통계는 P13a)
- [x] 비멤버가 `/hosting/events/[id]/…`에 들어오면 403 판정(P10a 공용 화면)
- [x] 장소 저장 본문에 4필드가 모두 채워지고 체크리스트 ①이 충족됨 — 우편번호 창·카카오 Geocoder는 주입 어댑터(`Geocoder`)로, 테스트는 가짜(e2e는 SDK 스크립트를 가짜로 바꾼다). 실제 SDK 동작은 V
- [x] 등록된 공연을 저장하면 안내가 필요하다는 상태(`savedNotice: 'registeredChanged'`)
- [x] 준비중 공연 카드의 ⋮ 삭제가 일반 멤버에게 허용되지 않음(`canDeleteEvent` — 공연준비 홈 카드 `canDelete`)
- [x] 등록 후 `hasTicket` 토글 잠금, 정산중·지난 공연은 읽기 전용
- [x] 장소 수정 시 `detailAddress`를 함께 보냄
- [x] 섹션 저장 본문이 전체 교체(빠진 섹션 삭제)
- [x] 일반 멤버는 읽기 전용 판정
- [x] 저장·등록 뒤 공연 상세를 열면 바로 반영돼 있음 — PE-4·PE-6 뒤 GP-3(공개·viewer)·GE-5 공개 키를 정확히 무효화, mock 공연 저장소가 GP-3·GE-5에 반영
- [x] 에러 분기: patterns §화면별 에러 처리의 P11 행(+ 소스에서 찾은 PE-8 `Event_400_15`)
- [x] Step1 안에서 만든 호스트가 바로 선택된 채 Step2로 넘어감(`?step=2`)

**완료 기준 — V**
- [ ] 포스터 미리보기
- [ ] 체크리스트를 다 채우면 "등록 준비 완료" 모달, 등록하면 사이드메뉴가 바뀌고 토스트
- [ ] 등록된 공연을 저장하면 안내 팝업
- [ ] 섹션 저장이 전체 교체임을 UI가 반영, 일반 멤버는 읽기 전용 화면
- [ ] 데스크탑(1133 이상)에서 공연 사이드바가 등록 전 4개 · 등록 후 6개(대시보드 · 기본 정보 · 상세 정보 · 티켓 관리 · 예매자 관리 · QR 체크인) 메뉴와 "‹ 내 공연" · 공연 카드 · "공연 페이지 보기"(등록 후)로, 모바일에서 "대시보드 ▾ / 공연명" 헤더로 나옴(모바일 메뉴 방식은 Q37 대기)
- [ ] 기본 정보에서 저장할 수 없는 상태면 [미리보기]가 열리지 않음, 장소 아래 지도 미리보기에 좌표 마커

### P12 — 티켓 · 옵션 관리

**L 범위**: 티켓 관리 목록(G10/T-1), 티켓 폼 모델(P10/T-2 생성 · P10/T-3 수정 — 계좌의 은행은 목록에서 고르게 해 토스 송금 링크에 쓸 수 있는 값으로 고정. 2026-10-25: 목록은 서버 `GET /api/v2/banks`(공개, 25개)에서 받고 `bankCode`를 보낸다(`bankName` 생략 가능, 모르는 코드 400 — 백엔드 #804·#813). 수정 본문은 바뀐 필드만 + 비울 때 `clear[]`, patterns §23), ⋮ 메뉴 구성(수정·삭제·판매 중단·재개 — `isSold || hasPendingOrders`), 옵션(기존 옵션 재사용 / 직접 만들기 P10/O-2, 상세·수정·삭제, 수정 때 응답 형식은 읽기 전용 — 서버가 막는다), 티켓에 옵션 붙이기·떼기(P10/O-5). 옵션 삭제(D10/O-4, 옵션 자체를 지움)와 떼기(이 티켓에서만 뺌)를 구분한다. 새 옵션은 생성 + 지정 2회 호출을 한 동작으로(중간 실패 처리). 잠긴 옵션은 이름·설명만 수정. 옵션 설명은 필수. 폼 규칙 — 서버 `payType`(두둥 티켓 / 무료 티켓, Q6), 무제한이면 재고 공개를 강제로 끄고 비활성(`Ticket_Item_400_15` 조합 방지), 무료 티켓이면 가격·계좌 없음과 승인 토글 활성(서버 규칙), 판매 기간 On일 때 날짜. 티켓 없음 공연은 추가 불가(서버도 `Ticket_Item_400_12`로 막는다). **두둥티켓 생성 동의(2026-10-25 추가, 백엔드 #840)**: P10/T-2가 `payType === 'DUDOONG'`이면 본문에 `refundObligationAgreed`·`agreementVersion: '2026-10'`(수정 T-3에는 없다) — 사용자가 체크한 필드만 싣는다(UI 없는 것은 Q42 대기, `agreementFields`). 값을 만들 칸(호스트 환불 의무 동의 체크)은 v2 계획에 없어 design-requests Q42 — 칸이 정해질 때까지 보내지 않고, 칸이 생기면 동의 전 저장을 막는다. 동의 강제 400 `Agreement_400_1`. **금지 규칙(약관 제19조⑥)**: v2 호스팅 티켓·대시보드·안내 화면 어디에도 "승인 무료티켓 + 옵션에 계좌·금액을 적어 입금받기" 류 안내를 쓰지 않는다 — 무료티켓·공연 정보로 서비스 밖에서 대금을 받는 것이 금지됐다(백엔드 Develop 기획서가 v1 호스트 어드민 3곳을 고칠 대상으로 지목). 에러 분기 patterns §24 P12 행.

**약관 표시 의무 — v2 계획에 위치 없음(위험)**: 두둥티켓 개설 시 환불 의무 안내 + 동의(약관 제29조⑨). v1 운영(참고): 두둥 폼 맨 위 "환불 의무 안내" 박스 + 체크, 체크 전 저장 비활성(Front #350, legal-copy C-1).

**V 범위**: 티켓 목록·빈 상태, 티켓 폼(카운터, 토글, DatePicker), ⋮ 메뉴, 옵션 추가 모달, 옵션 상세 모달(삭제 입구는 디자인이 오기 전까지 상세 모달 하단 [삭제] — Figma 424:10455에 없음), 옵션 칩 · ⊗ · [옵션 추가], 옵션 가이드·관리자 승인 가이드 팝오버, 티켓 없음 공연의 안내.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §2 티켓 관리 — **2026-10-26 확인: 페이지 `724:5255`의 9장 모두 Ready for dev**, 옛 `579:2210`·`584:4775`·`593:2099`는 지워졌다): 빈 목록 `767:46535`·PC `821:26240`, 목록(있음) `767:50048`·PC `767:46943`(카드: 이름 + 상태 칩 판매중·판매 종료·판매 예정, 설명, 매수 제한·승인 안내, 판매 기간, 가격, "무제한 (공개)", **[티켓 옵션 추가]**, ⋮ / 위에 "티켓 옵션이란?" 링크), 새 티켓 만들기 두둥 `767:46560`·`767:46664`(토글 on)·PC `821:25116`·`821:25649`, 무료 `821:23712`. **GUI가 기본안과 같아진 것**: 라벨 "두둥 티켓 / 무료 티켓"(Q6 해결), 무료 티켓에서 가격·계좌 숨김, 판매 기간 날짜·시각 칸과 "공연 등록 즉시 판매 시작" 체크. **프론트가 바꾸는 것(그대로)**: ① 기본값 "무제한 + 재고 공개 On"은 서버가 거부하는 조합이라(`Ticket_Item_400_15`) 무제한이면 재고 공개를 끄고 비활성(Ready for dev 폼 기본값은 착수 때 다시 본다) ② **은행명은 Ready for dev 폼도 자유 입력** — 계획대로 목록 선택(design-requests §1 — 디자이너 재확인 필요) ③ 두둥이면 승인 토글 잠금, 무료일 때만 연다. **옵션**: GUI는 목록 카드의 [티켓 옵션 추가]에서 붙인다 — 폼 하단 옵션 칩 기본안 대신 이 진입점을 따른다(옵션 추가·상세·삭제 화면은 여전히 없다). 옵션 수정 화면 Figma 424:10517은 응답 형식을 바꿀 수 있게 그렸지만 서버가 막는다. 판매 중단 티켓 딤드 와이어 코멘트(`503:25595`)는 GP-5가 판매 중단·판매 기간 밖 티켓을 빼고 주므로 계획을 바꾸지 않는다(**Q33 대기**). ⋮ 메뉴를 연 상태 · 수정 · 잠긴 티켓 · 판매 중단 상태는 GUI에 없다.

**선행**: L — P11-L · V — P12-L, P11-V (GP-5 화면 확인은 P6-V 뒤) · **API**: 10/T-1~T-6, 10/O-1~O-5

**완료 기준 — L**(2026-10-30 P12-L, implementation-log)
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 두둥·무료 티켓 생성·수정·삭제
- [x] 무제한 선택 시 재고 공개가 꺼지고 비활성 상태
- [x] 수정 본문은 바뀐 필드만 + 비울 때 `clear[]`
- [x] 잠긴 티켓은 허용 필드만 활성, ⋮ 메뉴는 `isSold || hasPendingOrders`로 구성
- [x] 새 옵션은 생성 + 지정 2회 호출이 한 동작으로 묶임(중간 실패 처리 포함)
- [x] 판매 중단 → 재개가 목록과 GP-5 응답에 반영
- [x] 티켓 없음 공연에서 추가가 허용되지 않음
- [x] 옵션 수정 본문에서 응답 형식을 바꿀 수 없음
- [x] 에러 분기: patterns §화면별 에러 처리의 P12 행
- [x] 새 티켓 폼을 기본값 그대로 저장해도 서버가 받는 조합(무제한이면 재고 공개 꺼짐)
- [x] 두둥 티켓 생성 본문에 사용자가 체크한 `refundObligationAgreed`와 그때만 `agreementVersion`(칸은 Q42 대기), 무료 티켓에는 없음. 계좌 본문에 `bankCode`(2026-10-25 추가)

**완료 기준 — V**
- [ ] 라벨이 두둥 티켓/무료 티켓, 무제한이면 재고 공개 토글이 비활성으로 그려짐
- [ ] 티켓 없음 공연에서 추가 버튼이 없음
- [ ] 판매 중단 → 재개가 공연 상세 화면에 반영(P6-V 뒤)

### P13a — 예매자 관리 · 등록 후 대시보드

**L 범위**: 등록 후 대시보드 파생값(GD-1 — 승인 대기 NEW 배지 수, 주문·발급 티켓·판매금액, 입장 현황 `entranceStats`는 분모 = 발급 수, 발급 0이면 0/0. 데스크탑 단계 타임라인 날짜 — 공연 등록일은 서버 `openedAt`(GD-1·GE-3, 2026-10-25 백엔드 #802: 최초 OPEN 시각, 준비중이면 `null`, **2026-10 이전 오픈 공연도 `null`**)을 쓰고 공연 시작까지를 홍보·판매 기간으로 그린다(PR #802 본문은 "등록일~공연 전날"). `null`일 때 표시는 design-requests Q43. 주간 줄·타임라인 날짜 규칙은 design-requests Q39(gui-screens §3 9번)). 예매자 관리 — 주문 탭(GR-1 상태 탭, 검색 `searchType` NAME · PHONE · DEPOSITOR_NAME, 승인 PR-3, 거절 PR-4 사유 4종(기타는 문구 필수), 주문 상세 GR-2, 승인 후 취소 PR-5 사유 100자, 엑셀 GR-6), 발급된 티켓 탭(GI-1 `entrance` 필터 · `searchType` NAME · PHONE, 상세 GI-2, 엑셀 GI-3), **일반 멤버(GUEST) 개인정보(2026-10-25, 백엔드 #846)**: 구매자 연락처·이메일·입금자명은 가린 값으로 오므로 그대로 그리고, 연락처·입금자명 검색은 완전 일치만 되므로 일반 멤버 검색 칸에 안내를 둔다. 엑셀(GR-6·GI-3)은 매니저 이상만(일반 멤버 403 `HOST_400_1`) — 버튼을 `myRole`로 숨긴다. 운영자가 주문을 대리 승인·거절·취소하거나 환불을 알림 없이 완료할 수 있다(#828) — 400이면 다시 읽기로 흡수, 환불 탭(GF-1 `status` 필터, 환불 완료 PF-2는 `refundStatus=REQUESTED`일 때만). 주문 상태 탭은 서버가 6개다 — 디자인이 오기 전까지 전체/승인대기/승인 완료/승인 거절/취소 5개로 두고 FAILED는 보이지 않는다. Figma 예매자 관리는 주문·발급된 티켓 두 탭뿐이고 환불 화면이 없다 — 디자인이 오기 전까지 백엔드 GF-1을 그대로 세 번째 탭(`?tab=refunds`)으로 둔다. 와이어 `424:11710`은 6개 탭(주문 실패 포함) + 표의 "환불 여부" 열로 그렸다(2026-10-25 확인, 4개짜리는 `424:12165`·`503:27255` 배경뿐) — 계획은 그대로 두고 **Q32 대기**. **`?tab=`·`?order=` URL 상태 훅** — 주문 상세는 `?order=`를 보고 페이지가 선언적으로 렌더한다. 열 때는 `pushState`(state에 `ddOverlay` 표시), 닫을 때는 표시가 있으면 `router.back()`, 주소로 바로 들어와 표시가 없으면 `router.replace`로 `order`만 지운다(`?tab=`는 남긴다). 뒤로가기는 모달을 닫는다(P2 결정, patterns §6). 주문·티켓 상세의 404(`Order_404_1`·`IssuedTicket_404_1`)는 공용 404 화면이 아니라 닫고 목록을 다시 읽는다. 에러 분기 patterns §24 P13a 행.

**약관 근거 안내(참고)**: v1 운영은 거절에 확인 모달을 새로 두고 두둥 주문이면 "이미 입금을 받았다면 구매자에게 직접 환불해야 해요", 승인 후 취소 확인에 "구매자에게 지체 없이 직접 환불해 주세요"를 붙인다(Front #350, legal-copy C-2~C-4, 약관 제29조③). v2 계획(거절 사유 시트)이 정본이다. 두둥 판정은 GR-1·GR-2 `paymentChannel`·`totalAmount`, v1 주문(`paymentChannel=null`)은 backend-questions B19.

**V 범위**: 등록 후 대시보드(통계 카드, 도넛, 입장 현황 막대, 데스크탑 우측 패널), 예매자 관리 탭 화면, 거절 사유 시트, 주문·티켓 상세 모달, 엑셀 버튼.

**GUI**(V, [`gui-screens.md`](./gui-screens.md) §2·§3): 등록 후 대시보드 모바일 `669:2787`(옛 `525:3903`, 판매 있음) — 통계 카드 4개(승인 대기 · 승인 완료 · 승인 거절 · 환불 요청, 아이콘 `ic_대시보드`), 도넛 + 범례, 판매 장수·총액, 입장 현황 진행 막대 + "QR 체크인 열기 →", 유의사항. 판매 0 모바일(옛 `525:3717`)은 지워졌다 — PC 판매 0 `745:32726`과 같은 컴포넌트(`티켓 판매 정보` `판매 전`, 입장 현황 0/0)로 만든다. GUI의 입장 분모는 판매 장수로 보이는 곳이 있지만 계획대로 **발급 수**(`entranceStats`)로 그린다(PC 판매 0이 0/0이라 맞다). NEW 배지는 GUI에 없다. **PC 대시보드**(옛 `Desktop - 27` `14:1304` 대체): `680:672`(1133) · `669:2972`(1280) · `712:1646`(1440) · `669:2350`(1920) · `745:32726`(1440 판매 0) · `727:23210`(1440 등록 전, P11) — 머리(포스터 176×247 + 상태 칩 + 호스트명 + 공연명 + 일자·시간·장소·태그, 오른쪽 위 연필 = 기본 정보), 통계 카드 4개 한 줄(`승인 메뉴_desktop`, ↗), `티켓 판매 정보` + `입장 현황` 두 칸, 유의사항. **우측 `일정 패널`**(286 / 335 / 388 — 등록 후만): 주간 줄 + 단계 타임라인(공연 등록 · 공연 홍보 및 티켓 판매 · 공연 시작 · 공연 완료). 견본 값(D-n, 날짜)은 서로 안 맞아 규칙은 계획대로. 예매자 관리 · 주문/티켓 상세 화면은 GUI에 없다(페이지 `724:5256` 비어 있음).

**선행**: L — P12-L, P4b-L. 전 구간 검증은 P7-L · P8-L · P9-L · P9b-L과 교차 · V — P13a-L, P11-V · **API**: GD-1 GR-1~6 GF-1 PF-2 GI-1~3

**완료 기준 — L**(2026-10-31 P13a-L, implementation-log)
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 대시보드: NEW 배지 수가 승인 대기 수와 일치, 발급 0인 공연의 입장 현황이 0/0
- [x] 승인 실패 시 에러 안내 후 주문이 승인 대기로 남음
- [x] 공연 시작 후 승인·거절 비활성(승인에 `Event_400_5`·`Event_400_6`, 거절·취소에 `Order_400_9`가 오면 GR-2 다시 읽기)
- [x] 승인 후 취소(PR-5, 사유 선택) → 발급 티켓 취소, 유료면 환불 탭에 REQUESTED로 나타남
- [x] 환불 계좌는 매니저 이상에게만
- [x] 탭이 `?tab=`에 남아 새로고침해도 유지되고, `?order={orderUuid}`로 들어오면 주문 상세가 열린 상태. 알림 진입은 P9b-L과 P13a-L 중 늦게 끝나는 쪽이 검증한다
- [x] 주문 상세가 열린 채 뒤로가기 → 상세만 닫힘. 닫기로 닫은 뒤 뒤로가기가 헛돌지 않음
- [x] 승인·거절 뒤 상태 탭 `counts`가 갱신됨
- [x] 환불 요청 → 환불 완료 → 관객 주문상세의 환불 완료까지 이어짐
- [ ] **크리티컬 패스 전 구간**: 상세 → 선택 → 체크아웃 → 주문 → 호스트 승인 → 티켓탭에 발급 — 훅/라우트 테스트로 잇고, 스테이징에서 agent-browser로 실제 왕복 1회 — **훅/라우트 부분은 2026-10-31 P13a-L로 통과**(`critical-path.test`·e2e `hosting-guests.spec`), 스테이징이 아직 없어 agent-browser 왕복이 남아 열어 둔다
- [x] 에러 분기: patterns §화면별 에러 처리의 P13a 행
- [x] 엑셀 다운로드(래퍼 없는 xlsx) 동작, 1만 행 초과 안내
- [x] 일반 멤버에게 엑셀 버튼이 없고, 가린 연락처·입금자명이 그대로 그려지며 검색 칸에 완전 일치 안내(2026-10-25 추가)
- [x] 대시보드 등록일이 `openedAt`, `null`이면 Q43 기본안(2026-10-25 추가)

**완료 기준 — V**
- [ ] 대시보드에 주문·티켓·판매금액 표시, 환불 계좌 `updatedAt` 표시
- [ ] 크리티컬 패스 화면 흐름을 QA 시나리오(가짜 백엔드)로
- [ ] 발급 티켓에 `ownerName`·`giftState` 표시

### P13b — QR 체크인

**L 범위**: 체크인 통계(GQ-1, 스캔 뒤 갱신), [호스트가 스캔] 모드(스캔 값 → PQ-2, `result` → 화면 상태 — `features/shared/checkin-result`, P8c와 공유), [관객이 스캔] 모드(GQ-4 → `origin + qrPath` 값), 공연 상태별 안내 판정(정산중·지난 공연은 셀프 체크인 불가, `Event_400_27`), 연속 스캔 스로틀, 네트워크 실패 상태.

**V 범위**: 카메라 스캐너(`@yudiel/react-qr-scanner`), 카메라 권한 거부·스캔 실패 UI, `result`별 화면, [관객이 스캔] QR 표시, 전체화면. GUI QR 체크인 페이지(`724:5257`)는 비어 있다. 디자인 시스템의 "Tablet(QR 전용)" 1133이 GUI 스펙의 Tablet(데스크탑 레이아웃)으로 바뀐 것인지는 design-requests Q39(gui-screens §3 10번).

**선행**: L — P12-L, P4b-L. 실판독은 P8 · P8c와 교차 · V — P13b-L, P11-V · **API**: GQ-1 PQ-2 GQ-4

**완료 기준 — L**
- [x] MSW 위에서 시나리오가 훅/라우트 테스트로 통과
- [x] 체크인 통계(GQ-1)가 스캔 뒤 갱신됨
- [x] `result` 5종 판정
- [x] 공연이 끝난 뒤(정산중·지난 공연)에는 [관객이 스캔] 모드에 "공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요" 안내(시작 전 OPEN 공연에서는 셀프 체크인이 된다)
- [x] 준비중·지난 공연(`Event_400_27`) 안내
- [x] 네트워크 차단 시 실패 상태

**완료 기준 — V**
- [ ] 실기기 3종 이상에서 판독
- [ ] `result` 5종 화면
- [ ] [관객이 스캔] — GQ-4 QR을 실제 폰으로 찍어 `/check-in`이 열리고 입장까지 됨(D2 스테이징 주소로)
- [ ] 네트워크 차단 시 명확한 실패 UI

### P14 — 통합 하드닝

**포함**: 성능(LCP/TTFB/번들, 티켓 오픈 시 공연 상세의 백엔드 부하 — 캐시가 필요한지 여기서 판단), 보안(오픈 리다이렉트, 토큰 취급, 로그 PII, 선물 토큰·QR 유출 경로), 접근성, 회귀(공유 지점(S1~S8) 통합 시나리오 — `pnpm qa` 전체, Playwright를 PR 게이트에 넣을지 재검토), 부하(티켓 오픈 순간), 레거시 URL.

**선행**: 전 기능 Phase

### P15 — 컷오버 & 롤백

**포함**: URL 연속성(기존 공유 링크, 없어진 라우트와 `/admin/*` 301). Deploy 저장소 변경(tech-decisions §25): compose에서 `admin` 서비스 삭제·`front` 이미지 교체, nginx `location /admin/` 삭제. 컷오버 순서(스테이징 → 운영. 호스팅 센터만 먼저 열려면 nginx에 `/hosting` 분기를 임시로 추가), 프리즈 윈도우(진행 중·임박 공연 없는 시간대), 롤백(compose의 이미지 태그와 nginx 설정을 되돌림), 리허설. 리허설 체크리스트에 운영 쿠키(`SameSite=Strict`)에서 외부 링크 진입과 카카오 로그인 복귀를 넣는다(P4b는 로컬 재현까지). 데이터는 v1·v2가 같은 테이블을 쓰므로 FE 이관 대상이 아니다 — 백엔드 마이그레이션 실행과 순서만 맞춘다(2026-10-25: V001~V017·V019 실행, V018은 열린 PR #839 — backend-questions B5).

**선행**: P14

## 5. Phase 요약

P0~P4a는 끝났다. P4s~P13b는 L 선행과 V 선행을 따로 적는다. V 선행에는 모두 "+ 디자인"이 붙는다(§0).

| # | 제목 | 트랙 | L 선행 | V 선행 |
|---|---|---|---|---|
| P0 | 스캐폴딩 · 스파이크 · 의존성 확정 | 공통 | — (완료) | — |
| P1 | ui 토큰 · 프리미티브 · 반응형 | 공통 | P0 (완료) | — |
| P2 | ui 폼 · 오버레이 · 피드백 | 공통 | P1 (완료) | — |
| P3 | api 코어 + v2 계약 이식 + mock | 공통 | P0 (완료) | — |
| P4a | 세션 · 401 처리 | 공통 | P1, P3 (완료) | — |
| P4s | 레이아웃 셸(관객 · 호스팅) | 공통 | P4a (메뉴 데이터만) | P4s-L, P2 |
| P4b | 인증 실구현 | 공통 | P4a | P4b-L, P4s-V |
| P5a | 공연홈 + 리스트 | 관객 | P4b-L | P5a-L, P4s-V |
| P5b | 공연 상세 + 섹션 뷰어 + 공유 | 관객 | P4b-L | P5b-L, P4s-V |
| P5c | 호스트 홈 · 관심 호스트 | 관객 | P4b-L | P5c-L, P4s-V |
| P6 | 티켓 선택 | 관객 | P5b-L | P6-L, P5b-V |
| P7 | 체크아웃 · 주문 생성 | 관객 | P6-L, P4b-L | P7-L, P6-V |
| P8 | 티켓탭 · 입장 QR | 관객 | P4b-L | P8-L, P4s-V |
| P8b | 선물하기 | 관객 | P8-L, P4b-L | P8b-L, P8-V |
| P8c | 관객 셀프 체크인 | 관객 | P8-L, P4b-L | P8c-L, P4s-V |
| P9 | 마이페이지 | 관객 | P7-L, P4b-L | P9-L, P4s-V |
| P9b | 알림센터 | 관객 | P5c-L, P8-L, P9-L | P9b-L, P4s-V |
| P10a | 공연준비 홈 + 호스트 생성 | 호스팅 | P4b-L | P10a-L, P4s-V |
| P10b | 호스트 설정 · 멤버 | 호스팅 | P10a-L, P5c-L | P10b-L, P10a-V, P5c-V |
| P11 | 공연 생성 · 체크리스트 · 정보 · 섹션 · 등록 | 호스팅 | P10a-L, P5b-L | P11-L, P10a-V, P5b-V |
| P12 | 티켓 · 옵션 관리 | 호스팅 | P11-L | P12-L, P11-V (GP-5 화면 확인은 P6-V 뒤) |
| P13a | 예매자 관리 · 대시보드 | 호스팅 | P12-L, P4b-L (전 구간 검증은 P7-L · P8-L · P9-L · P9b-L) | P13a-L, P11-V |
| P13b | QR 체크인 | 호스팅 | P12-L, P4b-L | P13b-L, P11-V (실판독·셀프 체크인 검증은 P8-V · P8c-V) |
| P14 | 통합 하드닝 | 공통 | 전 기능 Phase의 L·V | ← |
| P15 | 컷오버 & 롤백 | 공통 | P14 | ← |

## 6. API → Phase 배정

| Phase | API |
|---|---|
| P3 | 공개 GET 9개 스키마(스모크, SYS-1 제외), 세션(GM-1), 업로드 URL 발급 3종 호출 경로(PH-15 · PE-10 · PM-3) |
| P5a | GP-1 GP-2 GE-11 |
| P5b | GP-3 GE-5 |
| P5c | GH-3 GH-14 PH-13 GH-6(멤버 시점) — GH-3 `members`(#811)는 쓰지 않음 |
| P6 | GP-5 |
| P7 | G11/O-0 P11/O-1 (+ G11/O-3 — 완료 화면) |
| P8 | G11/T-1 G11/T-2 G11/T-3 |
| P8b | PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7a, GG-7(화면이 있을 때) |
| P8c | PQ-5 |
| P9 | GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 PH-13(DELETE) GM-5, GP-3 viewer(호스트 문의), `GET /banks`(환불 계좌) |
| P9b | GN-1 GN-2 PN-3 (벨 GN-2는 P9b-L이 먼저 만들었다) |
| P10a | GH-1 GE-1 PH-2 (GN-2 — 먼저 착수 시) |
| P10b | PH-4 PH-15 GH-6 PH-7 PH-10 DH-11 PH-12 |
| P11 | PE-2 GE-3 PE-4 PE-6 GE-7 PE-8 DE-9 PE-10 (+ GE-5 GE-11) |
| P12 | G10/T-1 P10/T-2~T-6 G10/O-1 P10/O-2~O-5, G10/T-7 `GET /banks` |
| P13a | GD-1 GR-1~GR-6 GF-1 PF-2 GI-1~GI-3 |
| P13b | GQ-1 PQ-2 GQ-4 |
| — | SYS-1 — 화면에서 쓰지 않는다(헬스체크는 front `/healthz`) |
| 미정 | 공지 GA-1·GA-2·GA-3(#832) — 아래 "범위 밖·미정" |

## 7. 미확정 항목

### 범위 밖·미정 — 서비스 공지 게시판·상단 배너 (2026-10-25 제안, 사용자 결정 대기)

- **무엇**: 백엔드 공지 API GA-1(목록, `audience=USER|HOST`)·GA-2(상세, 본문 HTML)·GA-3(상단 배너)가 준비됐다(백엔드 #832, 비로그인 공개 — api-contract §5). 백엔드 Develop 기획서는 프론트 작업 요청 4번(우선순위 **높음**)으로 전달했다: 약관 제38조② "공지사항 게시"의 수단이고 약관 개정 사후 안내를 여기 올린다. **관객(`audience=USER`)과 호스팅(`audience=HOST`) 둘 다.**
- **지금 계획에 없다.** 새 Phase로 넣을지, 번호·배치(관객 트랙/호스팅 트랙/공통)는 **사용자 결정 대기**다. 이 문서는 Phase를 만들지 않았다.
- 정해지면 넣을 것(제안): L — 목록 무한 스크롤(`V2PageResponse`, size 최대 50), 상세(`Notice_404_1` → 공용 404), 배너 조회(페이지 없음)와 닫기 상태. 제목은 텍스트로만, 본문 HTML은 섹션 뷰어와 같은 sanitize를 한 번 더(PR #832 본문 권고). V — 목록·상세 화면, 관객 셸·호스팅 셸 상단 배너. 디자인 없음(design-requests Q44). 햄버거의 "서비스 업데이트 노트"(Q4)가 목적지 후보.

다음 라운드에서 채운다. 목록은 [`README.md`](./README.md) 참조.
