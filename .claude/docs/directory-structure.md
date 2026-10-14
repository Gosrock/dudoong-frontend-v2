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
├─ vitest.config.ts
├─ CLAUDE.md                   # 규칙 요약 + .claude/docs 안내
├─ .husky/pre-commit           # lint-staged
├─ .storybook/                 # react-vite + vanilla-extract
├─ .github/
│  ├─ pull_request_template.md
│  └─ workflows/
│     ├─ pr-gate.yml           # typecheck → lint → test
│     ├─ image.yml             # main 머지 → GHCR에 sha 태그 이미지
│     └─ release.yml           # 버전 태그 → 같은 이미지에 태그 추가(재빌드 없음)
├─ scripts/
│  └─ check-crawler.mjs        # 실제 카카오 UA로 OG가 <head>에 있는지 확인
├─ public/                     # term.html · privacy.html (v1에서 이전)
└─ src/
   ├─ app/
   ├─ features/
   ├─ ui/
   ├─ api/
   ├─ utils/
   └─ env/                     # client.ts — 빌드 때 검증하는 공개 값(카카오 키)
```

## `src/app/` — 라우트

라우트 그룹은 조회 방식으로 나눈다(tech-decisions §3). 라우트 파일은 얇게 둔다. 레이아웃, 메타데이터, `<Prefetch>`, 화면 컴포넌트 조립까지만 한다. **서버 컴포넌트는 라우트 파일뿐이고**, 화면 구현(`src/features`)은 전부 클라이언트 컴포넌트다.

```
src/app/
├─ layout.tsx                          # <html>, 전역 스타일, Providers(QueryClient, OverlayProvider)
├─ providers.tsx                       # 'use client' — QueryClientProvider(서버 렌더마다 새 것, 브라우저는 하나), OverlayProvider, pageshow(bfcache) 재검사. 경로는 읽지 않는다
├─ OverlayRouteReset.tsx               # 'use client' 말단 — 경로가 바뀌면 overlay.unmountAll(). children을 감싸지 않고 layout.tsx에서 <Suspense fallback={null}>로 감싸 형제로 둔다
├─ not-found.tsx / error.tsx / global-error.tsx
├─ healthz/route.ts                    # P0   배포 헬스체크. 유일한 Route Handler. 백엔드를 부르지 않는다
│
├─ (audience)/
│  ├─ layout.tsx                       # P5a  관객 헤더·내비게이션(공통). usePathname·useSearchParams 쓰는 부분은 children을 감싸지 않는 말단 + 자체 <Suspense>
│  │
│  ├─ (public)/                        # 서버 조회 화면 — Suspense·loading.tsx를 두지 않는다
│  │  ├─ layout.tsx                    # export const instant = false (여기 한 곳)
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
│  ├─ layout.tsx                       # P10a 헤더, 알림 벨, <Suspense>, 로그인 게이트 (사이드메뉴는 events/[eventId]/layout.tsx)
│  ├─ page.tsx                         # P10a 공연준비 홈 (호스트 탭 / 공연 탭 / 검색)
│  ├─ new/
│  │  ├─ hosts/page.tsx                # P10a 호스트 만들기
│  │  └─ events/page.tsx               # P11  간편 공연 만들기 (내부 2단계)
│  ├─ hosts/[hostId]/
│  │  ├─ settings/page.tsx             # P10b 호스트 설정
│  │  └─ members/page.tsx              # P10b 멤버
│  └─ events/[eventId]/                # page.tsx 없음 — next.config redirects()로 dashboard
│     ├─ layout.tsx                    # P11  공연 어드민 사이드메뉴 (GE-3, 등록 상태별 항목)
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
   ├─ auth/                    # P4a/P4b  세션 쿼리(staleTime 5분), 게이트, LoginPage, KakaoCallback, Register, dd:hadSession·dd:refreshedAt 플래그. setAuthHandlers({ refresh, onSessionLost }) 등록 — 재발급(Web Locks, authApi)과 세션 상실 처리(보호 화면은 /login/expired, 공개 화면은 reload)의 단일 지점
   ├─ host-home/               # P5c  HostHome — 공개 필드는 hostDetailQuery, myRole별 뷰는 hostViewerQuery
   ├─ section-viewer/          # P5b  HTML/마크다운 렌더 + sanitize (공연 상세 ↔ 미리보기), 클라이언트 컴포넌트
   ├─ notification/            # P9b · P10a  벨, 알림함, 타입 → 표시 매핑
   ├─ checkin-result/          # P8c · P13b  result → 화면
   ├─ image-upload/            # P9 · P10b · P11 (먼저 착수한 Phase)  업로드 UI(DropZone 연결, 미리보기). 호출은 src/api/upload
   ├─ permission/              # can(role, action)
   └─ kakao-share/             # P5b · P8b
```

## `src/ui/` — 디자인 시스템 (P1, P2)

```
src/ui/
├─ theme/
│  ├─ tokens.css.ts            # createGlobalTheme — color, typography, space, radius, zIndex
│  ├─ sprinkles.css.ts         # 조건(mobile/desktop) + 토큰 유틸리티
│  └─ global.css.ts            # reset, 폰트
├─ primitives/                 # Flex, Spacing, Text, Divider, Container
├─ hooks/useMediaQueries.ts
├─ icons/
└─ components/                 # 컴포넌트마다 Foo.tsx + Foo.css.ts + Foo.stories.tsx
   ├─ Button/ IconButton/
   ├─ Input/ TextArea/ Dropdown/ SelectButton/ Counter/ DropZone/ ToggleButton/ TagButton/
   ├─ DatePicker/ TimePicker/
   ├─ BottomSheet/ Modal/ Popup/ EasyOverlay/
   ├─ Toast/                   # 명령형 toast() — 훅이 아니어서 QueryCache.onError에서도 부른다
   ├─ Loader/ Skeleton/ EmptyState/ LinkProgress/   # LinkProgress: useLinkStatus 기반 이동 표시(공개 화면)
   ├─ NotFoundView/ ForbiddenView/   # P2  클라이언트 조회 화면용 공용 404·403 안내 (P5a·P9·P10a가 쓴다)
   ├─ AsyncBoundary/           # QueryErrorResetBoundary + ErrorBoundary + Suspense + 재시도(reset)
   ├─ Accordion/ Header/ Footer/ NavBar/ Profile/ Tag/ ListHeader/
   └─ DataTable/
```

## `src/api/` — 스키마 · 조회 정의 · 호출

도메인 폴더는 백엔드 리소스 단위다. 각 폴더는 `schema.ts`(zod, Swagger 기준) + `queries.ts` + `mutations.ts`. 조회·변경 정의는 개별 export다(`eventDetailQuery`, `updateEventBasicMutation`).

```
src/api/
├─ client.ts                   # ky 인스턴스(v2 · v1 인증, 내부) — 응답 래퍼 해제, ApiError, zod 파싱 정책, 401 가로채기(v2만 — 주입된 refresh 호출 후 재시도. v1 인증 인스턴스에는 없다)
├─ http.ts                     # api(/api/v2) · authApi(/api/v1/auth) 객체 — get / post / patch / put / delete / download. get의 { public: true }는 항상 credentials:'omit'. 서버 분기는 호출할 때 process.env.API_INTERNAL_URL ?? 기본값
├─ auth-handlers.ts            # setAuthHandlers({ refresh, onSessionLost }) — 등록은 features/shared/auth
├─ errors.ts                   # ApiError{status, code, reason}, getErrorCode
├─ upload.ts                   # P3  발급 → S3 PUT → key (호스트·공연·프로필 공용)
├─ server/                     # 'server-only' — 라우트 파일에서만 쓴다. src/api 중 유일하게 React(HydrationBoundary)·notFound를 쓴다
│  ├─ serverQuery.ts           # 요청별 QueryClient + fetchQuery + 404 → notFound()
│  └─ Prefetch.tsx             # queries · infiniteQueries(첫 페이지만 fetchInfiniteQuery) → dehydrate → HydrationBoundary
├─ shared/
│  ├─ page.ts                  # V2PageResponse 스키마 팩토리, 페이지 기반 무한 쿼리 헬퍼
│  ├─ date.ts                  # 'yyyy.MM.dd HH:mm' ↔ Date (KST)
│  └─ enums.ts
├─ auth/  me/  host/  event/  ticket-item/  option/
├─ order/                      # + price.ts (금액 계산 순수함수)
├─ refund/  issued-ticket/  check-in/  my-ticket/  gift/  notification/
└─ __mocks__/                  # MSW 핸들러
```

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수는 없다. 사용자별 값이 섞인 응답은 viewer 쿼리를 따로 둔다(`hostViewerQuery`, `hostEventsViewerQuery`, `giftLandingViewerQuery` — tech-decisions §4).

`env/`: `client.ts`(`NEXT_PUBLIC_KAKAO_JS_KEY`, 빌드 때 검증)만 둔다. 서버 값(`API_INTERNAL_URL`)은 `http.ts`가 호출할 때 기본값과 함께 읽으므로 검증 파일이 없다. `instrumentation.ts`도 두지 않는다(tech-decisions §12).

queryKey 순서는 리소스 → `'viewer'` → `'infinite'` → 파라미터 객체다(예: `['hosts', id, 'events', 'viewer', 'infinite', { size }]`, tech-decisions §4).

## `src/utils/`

```
src/utils/
├─ clipboard.ts                # copyText()
├─ money.ts                    # 원 단위 표시
└─ download.ts                 # blob 저장 (엑셀)
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
