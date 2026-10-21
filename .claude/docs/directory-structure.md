# DuDoong-Front v2 — 디렉토리 구조

> 근거: [`tech-decisions.md`](./tech-decisions.md) §1·§3·§8 / [`plan.md`](./plan.md) / [`api-contract.md`](./api-contract.md)
> 2026-10-12 개정: 단일 Next 앱(App Router). 모노레포와 내부 패키지는 없다.
> 파일명은 권장안이며 phase-spec에서 확정한다. 라우트 경로 중 백엔드 응답에 박혀 있는 것은 `/gifts/[giftToken]`과 `/check-in` 둘이고, 나머지 신규 경로는 FE 제안이다.

## 루트

```
dudoong-frontend-v2/
├─ next.config.ts              # output:'standalone', deploymentId, vanilla-extract 플러그인, redirects(/admin/* → /hosting/*, 없앤 v1 라우트, /hosting/events/:eventId → …/dashboard), 개발용 rewrites(/api → dev API)
├─ Dockerfile                  # 멀티 스테이지, standalone 산출물만 (deploy-plan.md §3)
├─ .dockerignore
├─ package.json                # packageManager · engines 핀, 스크립트
├─ pnpm-lock.yaml
├─ tsconfig.json               # @/* → src/*
├─ eslint.config.mjs           # flat config — 계층 규칙, 금지 import
├─ .prettierrc / .prettierignore / .editorconfig
├─ .nvmrc
├─ .env.example
├─ vitest.config.mts           # 프로젝트 둘 — unit(jsdom 기본, 서버 분기 테스트는 파일 머리 `// @vitest-environment node`) · storybook(addon-vitest, Chromium). 경로 별칭은 Vite 내장 resolve.tsconfigPaths
├─ vitest.setup.ts             # jest-dom, MSW server.listen(onUnhandledFrame: 'error'), 테스트마다 resetHandlers + cleanup
├─ playwright.config.ts        # e2e 설정(baseConfig) — webServer: next build → standalone(3100), 뷰포트 mobile·desktop, workers 1
├─ e2e/                        # Playwright e2e — PR 게이트 밖(tech-decisions §10)
│  ├─ support/
│  │  ├─ mock-backend.ts       # 가짜 nginx + 백엔드(4100). /api/* → MSW 핸들러(getResponse), 나머지 → Next. 서버 조회·브라우저 요청이 같은 핸들러
│  │  ├─ fixtures.ts           # test.extend — mockApi(use/calls/unhandled), 핸들러 없는 /api 요청이면 실패
│  │  └─ env.ts                # 포트, KAKAO_SCRAP_UA, 뷰포트
│  └─ *.spec.ts                # 짧은 회귀 확인. 크롤러 계약(카카오 UA 상태 코드·OG)도 여기
├─ qa/                         # QA 시나리오 — .claude/skills/qa-scenario
│  ├─ scenario.ts              # DSL: scenario(id, title, meta, body) · scenario.manual · step · note · envelope
│  ├─ reporter.ts              # 단계별 캡처 HTML 리포트 + results.json
│  ├─ playwright.config.ts     # baseConfig를 이어받는다
│  ├─ run.mjs                  # pnpm qa <feature>
│  ├─ scenarios/<feature>.qa.ts
│  └─ reports/                 # (커밋하지 않음) <feature>/<시각>/index.html, latest 링크
├─ .vscode/                    # settings.json(저장 시 Prettier·ESLint), extensions.json — 이 둘만 커밋
├─ CLAUDE.md                   # 규칙 요약 + .claude/docs 안내
├─ .claude/skills/qa-scenario/ # QA 시나리오 스킬(SKILL.md)
├─ .husky/pre-commit           # lint-staged
├─ .storybook/                 # react-vite + vanilla-extract
├─ .github/
│  ├─ pull_request_template.md
│  └─ workflows/
│     ├─ pr-gate.yml           # typecheck → lint → test(Vitest unit) → test:stories(Chromium) → build. Playwright e2e·QA는 넣지 않는다
│     ├─ image.yml             # main 머지 → GHCR에 sha 태그 이미지
│     └─ release.yml           # 버전 태그 → 같은 이미지에 태그 추가(재빌드 없음)
├─ public/                     # term.html · privacy.html (v1에서 이전)
├─ scripts/                    # P3  dev-mock.mjs(pnpm dev:mock), check-contract.mjs(pnpm check:contract), ts-import.mjs(Node 타입 제거 + @/ 별칭 훅)
└─ src/
   ├─ app/
   ├─ features/
   ├─ ui/
   ├─ api/
   ├─ utils/
   ├─ env/                     # client.ts — 빌드 때 검증하는 공개 값(카카오 키)
   └─ test/                    # render.tsx — renderWithProviders(QueryClient·OverlayProvider·Suspense + user-event). *.test.* 파일만 import(eslint)
```

## `src/app/` — 라우트

라우트 그룹은 조회 방식으로 나눈다(tech-decisions §3). **`src/app`에는 라우트 파일과 루트 셸 클라이언트 파일 2개(`providers.tsx`, `OverlayRouteReset.tsx`)만 둔다**(tech-decisions §8). 라우트 파일은 얇게 둔다. 레이아웃, 메타데이터, `<Prefetch>`, 화면 컴포넌트 조립까지만 한다. **서버 컴포넌트는 라우트 파일뿐이고**, 화면 구현(`src/features`)은 전부 클라이언트 컴포넌트다.

```
src/app/
├─ favicon.ico                         # v1에서 가져옴(메타데이터 파일)
├─ layout.tsx                          # <html>, 전역 스타일, Providers(QueryClient, OverlayProvider)
├─ providers.tsx                       # P2·P4a  'use client' — QueryClientProvider(서버 렌더마다 새 것, 브라우저는 하나), OverlayProvider, 인증 핸들러 등록, storage(다른 탭 로그아웃)·pageshow(bfcache) 감시 — dd:session 값 비교. 경로는 읽지 않는다
├─ OverlayRouteReset.tsx               # P2  'use client' 말단 — 경로가 바뀌면 overlay.unmountAll(). children을 감싸지 않고 providers.tsx 안에서 <Suspense fallback={null}>로 감싸 형제로 둔다(<Toaster />도 여기)
├─ not-found.tsx / error.tsx / global-error.tsx
├─ healthz/route.ts                    # P0   배포 헬스체크. 유일한 Route Handler. 백엔드를 부르지 않는다
│
├─ (audience)/
│  ├─ layout.tsx                       # P5a  관객 헤더·내비게이션(공통). usePathname·useSearchParams 쓰는 부분은 children을 감싸지 않는 말단 + 자체 <Suspense>
│  │
│  ├─ (public)/                        # 서버 조회 화면 — Suspense·loading.tsx를 두지 않는다
│  │  ├─ layout.tsx                    # export const instant = false (아래 page.tsx에도 각각 둔다 — tech-decisions §2)
│  │  ├─ page.tsx                      # P5a  공연홈
│  │  ├─ events/[eventId]/page.tsx     # P5b  공연 상세 + generateMetadata
│  │  ├─ hosts/[hostId]/page.tsx       # P5c  호스트 홈 — 사용자별 값은 viewer 쿼리
│  │  └─ gifts/[giftToken]/page.tsx    # P8b  선물 랜딩 + generateMetadata — 사용자별 판정은 viewer 쿼리
│  │
│  └─ (app)/                           # 클라이언트 조회 화면
│     ├─ layout.tsx                    # <Suspense>. 게이트 없는 화면(이 폴더 바로 아래)은 useQuery만 쓴다
│     ├─ events/page.tsx               # P5a  공연 리스트
│     ├─ login/[[...state]]/page.tsx   # P4b  /login, /login/expired
│     ├─ kakao/callback/page.tsx       # P4b
│     │
│     └─ (protected)/                  # 로그인 필요 — 보호 경로를 목록이 아니라 폴더로 정한다
│        ├─ layout.tsx                 # P4a  로그인 게이트 — 세션 확정 뒤에만 children 렌더
│        ├─ events/[eventId]/checkout/page.tsx   # P7   체크아웃
│        ├─ tickets/page.tsx           # P8   티켓탭
│        ├─ check-in/page.tsx          # P8c  셀프 체크인
│        ├─ orders/
│        │  ├─ page.tsx                # P9   주문내역
│        │  └─ [orderUuid]/page.tsx    # P9   주문상세. 주문 완료 화면도 여기(?created=1, P7)
│        └─ mypage/
│           ├─ page.tsx                # P9   마이페이지 (프로필 편집 포함)
│           ├─ following/page.tsx      # P9   관심 호스트
│           ├─ archive/page.tsx        # P9   관람 공연 아카이빙
│           ├─ notifications/page.tsx  # P9b  알림함 — 호스팅 센터의 알림 벨도 여기로
│           └─ gifts/page.tsx          # (보류) 보낸·받은 선물 내역 GG-7 — Figma에 화면이 있을 때만
│
├─ hosting/                            # 호스팅 센터 — 전부 클라이언트 조회
│  ├─ layout.tsx                       # P10a <Suspense>, 로그인 게이트, 셸 — 데스크탑 HostingSidebar(호스팅 홈·호스트 섹션·사용자 줄 + 알림 벨) / 모바일 HostingHeader(`host title` 로고 헤더, 벨 없음) + 드로어(알림 벨은 드로어 안 — design-requests Q17). 사이드바·헤더의 활성 표시는 경로를 읽는 말단 + 자체 Suspense (tech-decisions §3)
│  ├─ page.tsx                         # P10a 공연준비 홈 (호스트 탭 / 공연 탭 / 검색)
│  ├─ new/
│  │  ├─ hosts/page.tsx                # P10a 호스트 만들기
│  │  └─ events/page.tsx               # P11  간편 공연 만들기 (내부 2단계)
│  ├─ hosts/[hostId]/
│  │  ├─ settings/page.tsx             # P10b 호스트 설정
│  │  └─ members/page.tsx              # P10b 멤버
│  └─ events/[eventId]/                # page.tsx 없음 — next.config redirects()로 dashboard
│     ├─ layout.tsx                    # P11  공연 스코프 (GE-3) — 사이드바에 공연 메뉴 항목(등록 상태별), 모바일은 공연 전환 ▾ 헤더
│     ├─ dashboard/page.tsx            # P11(체크리스트) + P13a(등록 후 통계)
│     ├─ info/page.tsx                 # P11  기본 정보
│     ├─ detail/page.tsx               # P11  상세 정보 (섹션 에디터)
│     ├─ preview/page.tsx              # P11  미리보기
│     ├─ tickets/
│     │  ├─ page.tsx                   # P12
│     │  ├─ new/page.tsx               # P12
│     │  └─ [ticketItemId]/page.tsx    # P12
│     ├─ guests/page.tsx               # P13a 주문 / 발급된 티켓 / 환불 — ?tab=, 주문 상세 모달은 ?order=
│     └─ qr/page.tsx                   # P13b
```

Route Handler는 `/healthz` 하나다. 더 만들게 되면 nginx가 `/api`를 전부 백엔드로 보내므로 `/api` 밖에 둔다.

`events/[eventId]`(공개 상세)와 `events/[eventId]/checkout`(보호)은 서로 다른 그룹에 있지만 URL은 이어진다. 라우트 그룹은 URL에 나오지 않는다.


**호스트 홈은 `/hosts/[hostId]` 하나다.** 비로그인·관객·멤버·매니저·마스터가 같은 화면을 보고 `myRole`에 따라 버튼이 달라진다. 설정과 멤버 관리만 호스팅 센터에 있다.

**없앤 v1 라우트**: `/home`(→ `/`), `/events/[eventId]/book/option`·`book/order`, `/pay/*`, `/history`(→ `/orders`), `/ticket`(→ `/tickets`), `/history/mycoupon`, `/ticket/[id]`, `/ticket/qr`, `/admin/*`(→ `/hosting/*`).

## `src/features/` — 화면 구현

화면 상태 훅과 도메인 규칙(순수 함수)은 feature 폴더 안 `model/`에 둔다(예: `audience/event/model/useTicketSelection.ts`, `ticket-state.ts`). 훅은 UI 동작(시트 열기 등) 없이 상태·동작·파생값만 돌려주고, 뷰는 같은 feature 폴더의 컴포넌트가 훅을 연결한다. 여러 화면·양쪽 트랙이 쓰면 `shared/<x>/model/`, API 응답에만 의존하는 순수 계산이면 `src/api/<domain>/`(예: `order/price.ts`). 디자인 전에는 `model/`(L)만 만든다(plan §0).

```
src/features/
├─ audience/
│  ├─ home/                    # P5a  HomePage(배너·캐러셀·두둥 소개), EventListPage(검색·TagFilter·지난공연 토글)
│  ├─ event/                   # P5b + P6
│  │  ├─ EventDetail/          # 섹션 탭, 해시태그, 공유 버튼, HostContactSheet
│  │  └─ SelectTicket/         # GP-5, 인라인 수량 스테퍼 (클라이언트)
│  ├─ checkout/                # P7   CheckoutPage, OptionAnswersForm, PaymentChannelSelect, AccountInfo, DepositConfirmDialog, OrderComplete(/orders/[orderUuid]?created=1에서 렌더)
│  ├─ ticket/                  # P8   TicketTabPage, TicketCarousel, TicketCard, QrCode, QrFullscreen
│  ├─ gift/                    # P8b  SendSheet, LinkCreated, GiftLanding(viewState 7종), SentTicketDetail
│  ├─ checkin/                 # P8c  SelfCheckInPage
│  └─ mypage/                  # P9   MyPage, Profile, OrderHistory(+ RefundAccountSheet), FollowingHosts, Archive
│
├─ hosting/
│  ├─ shell/                   # P4s  HostingSidebar(+ SidebarItem = GUI `Component 1`), HostingHeader, EventSwitcherHeader(공연 전환 ▾), MobileDrawer
│  ├─ home/                    # P10a PrepHome(HostTab, EventTab, Search)
│  ├─ host/                    # P10a + P10b  CreateHost, HostSettings, HostMembers(InviteDialog, RoleMenu, TransferMasterDialog, PermissionGuide)
│  ├─ event/                   # P11  NewEventWizard, EventLayout, Checklist, EventInfo(PlaceInput: 우편번호 + 카카오 Geocoder), EventDetailEditor(SectionTabs + Tiptap)
│  ├─ ticket/                  # P12  TicketManage, TicketForm, TicketMenu, OptionManage
│  ├─ guest/                   # P13a Dashboard, OrderTab, IssuedTicketTab, RefundTab, OrderDetail(?order= 값으로 페이지가 선언적으로 렌더)
│  ├─ qr/                      # P13b HostScan, AudienceScan
│  └─ overlays/                # 도메인별로 모은다 — 라우트가 아니라 누락되기 쉽다. 데이터를 읽으면 안에 AsyncBoundary
│     ├─ OpenEvent/ DeleteEvent/ UnsavedGuard/ NotifyGuestsNotice/
│     ├─ ToggleTicketSale/ DeleteTicket/ DetachOption/
│     └─ RefuseOrder/ CancelOrder/ IssuedTicketDetail/ CompleteRefund/
│
└─ shared/                     # 관객·호스팅 양쪽이 쓰는 것
   ├─ auth/                    # P4a/P4b  LoginGate(pending 스켈레톤 · 익명이면 항상 /login · error면 전체 화면 재시도), useSession, registerAuth(queryClient) — setAuthHandlers 등록(재발급 HTTP 호출 refreshTokens + onSessionLost) + storage·pageshow 감시, handleSessionLost(한 번만, 보호 영역은 /login/expired, 그 밖은 reload), useProtectedArea(보호 영역 판정 = 게이트 마운트 수), LoginRequiredLink·useRequireLogin, useLogout, loginHref·expiredHref. P4b: LoginView, KakaoCallbackView(최소 마크업 — V에서 교체), model/(auth-outcome·login-redirect·register-form·finish-login, useKakaoLogin·useKakaoCallback·useRegisterForm). 임시 GateCheckView(+ (protected)/gate-check — 실제 보호 화면이 생기면 지운다)
   ├─ host-home/               # P5c  HostHome — 공개 필드는 hostDetailQuery, myRole별 뷰는 hostViewerQuery
   ├─ section-viewer/          # P5b  model/: render-section(contentFormat → marked → sanitize-html), sanitize-section-html, section-tabs(서버 섹션 없으면 기본 4탭). 뷰는 V
   ├─ contact/                 # P5b  model/contact-link — 연락처 6종 + UNKNOWN → 표시·링크(tel·mailto·http(s)만). P5c·P9 재사용
   ├─ notification/            # P9b · P10a  벨, 알림함, 타입 → 표시 매핑
   ├─ checkin-result/          # P8c · P13b  result → 화면
   ├─ image-upload/            # P9 · P10b · P11 (먼저 착수한 Phase)  업로드 UI(DropZone 연결, 미리보기). 호출은 src/api/upload
   ├─ permission/              # P5c  can(role, action) — 호스트 홈 관리 버튼에서 처음 쓴다
   └─ kakao-share/             # P5b · P8b  model/: feed-template(공연과 무관 — 선물 링크도 쓴다), kakao-sdk(SDK 2.8.3 + SRI, 앱 키는 호출할 때 읽음)
```

## `src/ui/` — 디자인 시스템 (P1, P2)

```
src/ui/
├─ theme/
│  ├─ palette.ts               # Figma Atomic 원시 색 102개(화면은 직접 쓰지 않는다)
│  ├─ tokens.css.ts            # vars — 의미 색(createThemeContract, 라이트 기본 + data-theme="dark"), space(7~10 데스크탑 확대), radius, font, zIndex, shadow
│  ├─ colors.ts                # colors — <Txt color={colors.textSecondary} />처럼 값으로 넘기는 색(의미 색 + 원시 색)
│  ├─ typography.css.ts        # Figma 텍스트 스타일 21개(bodyMd, headingSmEmphasized …)
│  ├─ sprinkles.css.ts         # 조건(mobile/desktop) + 토큰 유틸리티
│  ├─ breakpoints.ts           # desktop ≥ 1024, wide ≥ 1280
│  ├─ types.ts                 # 공개 props 타입(SpaceKey, Responsive<T> …) — vanilla-extract 타입을 밖에 내보내지 않는다
│  └─ global.css.ts            # reset, 본문 폰트, focus-visible
├─ primitives/                 # Flex(+ .Center 등), Spacing, Txt, Divider, Container
├─ hooks/                     # useMediaQueries, useCloseOnBack(뒤로가기로 오버레이 닫기), useOnExited, useReturnFocus
├─ illustrations/             # 일러스트(PNG 3x — 벡터가 너무 커서), illust_dashboard·아바타 캐릭터(SVG) → <Illustration name /> (<img>)
├─ brand/                     # Logo(audience·host) 인라인 SVG, currentColor
├─ stories/                    # Foundation 스토리 — 토큰, 프리미티브, 스타일 세 방법
├─ icons/                      # Figma ic 세트에서 뽑은 SVG → <Icon name size variant />. 라이선스 고지(lucide ISC) 포함
└─ components/                 # 컴포넌트마다 Foo.tsx + Foo.css.ts + Foo.stories.tsx
   ├─ Button/ Fab/              # Fab: 56 원형 아이콘 버튼(Figma Button type=round). 아이콘만 있는 일반 버튼은 Button iconOnly
   ├─ Input/ SearchField/ TextArea/ Dropdown/ SelectButton/ Counter/ DropZone/ TagButton/   # SelectButton = GUI 로컬 `Check Button`(예/아니오, 결제방식 선택)
   ├─ Checkbox/ Radio/ Toggle/ Tabs/   # Radix Checkbox·RadioGroup·Switch·Tabs + vanilla-extract (design-system.md §3)
   ├─ Badge/ Avatar/ FilterChip/ Chip/   # Chip: Ticket·Concert 상태, role, tag, money option
   ├─ DatePicker/ TimePicker/
   ├─ BottomSheet/ Modal/ Popup/ EasyOverlay/   # BottomSheet/ResponsiveOverlay: PC=Modal, 모바일=시트. EasyOverlay: openConfirm() → Promise<boolean>
   ├─ Toast/                   # 명령형 toast() — 훅이 아니어서 QueryCache.onError에서도 부른다
   ├─ Popover/ Tooltip/ DropdownMenu/   # Radix 래퍼. 모바일 ⓘ 설명은 Popover(Tooltip은 터치로 안 열린다)
   ├─ Loader/ Skeleton/ EmptyState/ LinkProgress/   # LinkProgress: 카드 <Link> 안의 인라인 이동 표시(useLinkStatus, 100ms 지연)
   ├─ NotFoundView/ ForbiddenView/   # P2  클라이언트 조회 화면용 공용 404·403 안내 (P5a·P9·P10a가 쓴다)
   ├─ AsyncBoundary/           # P2  QueryErrorResetBoundary + ErrorBoundary + Suspense + 재시도(reset). SessionLostError는 fallback 없이 무시
   ├─ Accordion/ Header/ ListHeader/ InfoRow/   # Footer·NavBar는 쓰는 곳이 없어 보류(P2)   # Header = Figma Top app bar(관객·호스팅 공용, 뒤로가기·제목·공연 전환형). 로고 헤더(GUI 로컬 `basic title` 관객, `host title` 호스팅)는 각 셸이 Header의 변형으로 그린다. InfoRow = Figma list(라벨 + 값 행, 펼침형은 Accordion)
   └─ DataTable/
```

## `src/api/` — 스키마 · 조회 정의 · 호출

도메인 폴더는 백엔드 리소스 단위다. 각 폴더는 `schema.ts`(zod, Swagger 기준) + `queries.ts` + `mutations.ts`. 조회·변경 정의는 개별 export다(`eventDetailQuery`, `updateEventBasicMutation`).

```
src/api/
├─ client.ts                   # 요청 파이프라인 — ky 인스턴스 하나(기준 주소 없음, timeout 10초), 기준 주소 계산(prefixV2·prefixV1Auth), ky 네트워크·타임아웃 → ApiError(0), 본문 읽기 시간 제한, 래퍼 해제(NON_JSON·BAD_ENVELOPE·PARSE_ERROR). 401 재발급은 P4a에서 request()에 붙는다
├─ http.ts                     # api(/api/v2) · authApi(/api/v1/auth) 객체만 — client.ts의 request()를 감싼다. { public: true }는 credentials:'omit'
├─ auth-handlers.ts            # P4a  setAuthHandlers({ refresh, onSessionLost }) + 재발급 조정: 탭 안 단일 비행, 탭 사이 Web Locks(15초 abort) + dd:refreshedAt 비교, 결과 판정(성공 / 상실 → SessionLostError + onSessionLost 한 번 / 일시 오류 → 세션 유지), B6 대응(1초 뒤 1회). features는 HTTP 호출만 등록한다(api가 features를 import할 수 없어서)
├─ session-flag.ts             # P4a  dd:session(로그인마다 새 무작위 값)·dd:refreshedAt 읽기·쓰기. 저장소 실패 = 없음. client.ts의 401 처리가 읽어야 해서 api에 둔다
├─ errors.ts                   # ApiError{status, code, reason}, SessionLostError, getErrorCode
├─ query-client.ts             # getQueryClient() — Next 가이드 방식, 재시도는 5xx·status 0만
├─ handle-codes.ts             # handleCodes({ 코드: 처리 }) → { meta: { handledCodes }, onError } — 변경 에러를 화면이 처리할 코드를 한 곳에 쓴다
├─ upload.ts                   # P3  발급 → S3 PUT → key (호스트·공연·프로필 공용)
├─ server/                     # 'server-only' — 라우트 파일에서만 쓴다. src/api 중 유일하게 React(HydrationBoundary)·notFound를 쓴다
│  ├─ serverQuery.ts           # 요청별 QueryClient + fetchQuery + 404 → notFound()
│  └─ Prefetch.tsx             # queries → dehydrate → HydrationBoundary. 무한 목록은 받지 않는다(GH-14는 브라우저 useInfiniteQuery)
├─ shared/
│  ├─ common-schema.ts         # P3  Contact·Place·HostRole — 도메인 폴더끼리 import하면 순환이 생겨 여기 둔다
│  ├─ page.ts                  # V2PageResponse 스키마 팩토리, 페이지 기반 무한 쿼리 헬퍼
│  ├─ date.ts                  # 'yyyy.MM.dd HH:mm' ↔ Date (KST)
│  ├─ route-pattern.ts         # routePattern() — 로그용 경로(id·토큰 → :param, 쿼리 버림)
│  └─ open-enum.ts             # openEnum(name, values) — 모르는 문자열은 UNKNOWN, 누락은 PARSE_ERROR
├─ auth/                       # P4b  calls.ts(카카오 링크·코드 교환·register/valid·login·info·register, 재발급·로그아웃 — authApi), schema.ts
├─ me/  host/  event/  ticket-item/  option/
├─ order/                      # + price.ts (금액 계산 순수함수)
├─ refund/  issued-ticket/  check-in/  my-ticket/  gift/  notification/
└─ __mocks__/                  # MSW — handlers.ts(기본 목록), <도메인>.handlers.ts, upload-handlers.ts, fixtures/(현실적인 한국어 값·null·404 예시), respond.ts(ok·fail·paginate·쿠키 판정)
```

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수는 없다. 사용자별 값이 섞인 응답은 viewer 쿼리를 따로 둔다(`hostViewerQuery`, `hostEventsViewerQuery`, `giftLandingViewerQuery` — tech-decisions §4).

`env/`: `client.ts`(`NEXT_PUBLIC_KAKAO_JS_KEY`, 빌드 때 검증)만 둔다. 서버 값(`API_INTERNAL_URL`)은 `http.ts`가 호출할 때 기본값과 함께 읽으므로 검증 파일이 없다. `instrumentation.ts`도 두지 않는다(tech-decisions §12).

queryKey 순서는 리소스 → `'viewer'` → `'infinite'` → 파라미터 객체다(예: `['hosts', id, 'events', 'viewer', 'infinite', { size }]`, tech-decisions §4).

## `src/utils/`

```
src/utils/
├─ log.ts                      # 구조화 stdout 로그 log(level, event, fields)
├─ clipboard.ts                # copyText()
├─ money.ts                    # 원 단위 표시
├─ download.ts                 # blob 저장 (엑셀)
└─ redirect.ts                 # P4a  safeRedirect(raw, fallback) — 같은 출처 상대 경로만. //·\\·제어 문자·2048자 초과·/login*·/kakao/callback(되돌이) 거부
```

## 계층 규칙 (eslint로 강제)

```
app → features → ui → api → utils
```

1. 위에서 아래로만 import한다.
2. `features/audience`와 `features/hosting`은 서로 import하지 않는다. 같이 쓰는 것은 `features/shared`로 올린다.
3. `src/api/server/`는 라우트 파일에서만 import한다(`'server-only'`). 여기서 `cookies()`를 읽지 않는다.
4. `src/api`는 `features`·`ui`를 import하지 않는다(예외: `src/api/server/`의 `HydrationBoundary`·`notFound`). 위 계층이 필요한 것은 주입 지점(`setAuthHandlers`)으로 받는다. 앱 어디에서도 엔드포인트나 스키마를 따로 정의하지 않는다.
5. `src/ui`는 `features`를 모른다.
6. `src/test`는 테스트 헬퍼다. 어느 계층의 `*.test.*` 파일이든 import하고, 테스트가 아닌 파일은 import하지 않는다.
