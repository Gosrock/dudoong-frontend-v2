# DuDoong-Front v2 — 디렉토리 구조

> 근거: [`tech-decisions.md`](./tech-decisions.md) §1·§3·§8 / [`plan.md`](./plan.md) / [`api-contract.md`](./api-contract.md)
> 2026-10-12 개정: 단일 Next 앱(App Router). 모노레포와 내부 패키지는 없다.
> 파일명은 권장안이며 phase-spec에서 확정한다. 라우트 경로 중 백엔드 응답에 박혀 있는 것은 `/gifts/[giftToken]`과 `/check-in` 둘이고, 나머지 신규 경로는 FE 제안이다.

## 루트

```
dudoong-frontend-v2/
├─ next.config.ts              # output:'standalone', vanilla-extract 플러그인, redirects(/admin/* → /hosting/*, 없앤 v1 라우트), 개발용 rewrites(/api → dev API)
├─ Dockerfile
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
│     └─ deploy.yml
├─ scripts/
│  └─ check-crawler.mjs        # 실제 카카오 UA로 OG가 <head>에 있는지 확인
├─ public/                     # term.html · privacy.html (v1에서 이전)
└─ src/
   ├─ app/
   ├─ features/
   ├─ ui/
   ├─ api/
   ├─ utils/
   └─ env/                     # server.ts · client.ts
```

## `src/app/` — 라우트

라우트 파일은 얇게 둔다. 레이아웃, 메타데이터, `<Prefetch>`, 화면 컴포넌트 조립까지만 한다. **서버 컴포넌트는 라우트 파일뿐이고**, 화면 구현(`src/features`)은 전부 클라이언트 컴포넌트다.

```
src/app/
├─ layout.tsx                          # <html>, 전역 스타일, Providers(QueryClient, OverlayProvider)
├─ providers.tsx                       # 'use client' — QueryClientProvider(서버 렌더마다 새 것, 브라우저는 하나), OverlayProvider
├─ not-found.tsx / error.tsx / global-error.tsx
│
├─ (audience)/                         # 관객 — GlobalNav 레이아웃
│  ├─ layout.tsx
│  ├─ page.tsx                         # P5a  공연홈 (Prefetch, 캐시)
│  ├─ events/
│  │  ├─ page.tsx                      # P5a  공연 리스트 (클라이언트 조회)
│  │  └─ [eventId]/
│  │     ├─ page.tsx                   # P5b  공연 상세 (Prefetch, 캐시 + 태그) + generateMetadata
│  │     └─ checkout/page.tsx          # P7   체크아웃
│  ├─ hosts/[hostId]/page.tsx          # P5c  호스트 홈 (Prefetch, 캐시) — 사용자별 값은 브라우저가 재조회
│  ├─ ticket/page.tsx                  # P8   티켓탭
│  ├─ gifts/[giftToken]/page.tsx       # P8b  선물 랜딩 (Prefetch, 캐시 없음) + generateMetadata
│  ├─ check-in/page.tsx                # P8c  셀프 체크인
│  ├─ history/
│  │  ├─ page.tsx                      # P9   주문내역
│  │  └─ [orderUuid]/page.tsx          # P9   주문상세
│  └─ mypage/
│     ├─ page.tsx                      # P9
│     ├─ following/page.tsx            # P9   관심 호스트
│     ├─ archive/page.tsx              # P9   관람 공연 아카이빙
│     └─ notifications/page.tsx        # P9b
│
├─ (auth)/
│  ├─ login/[[...state]]/page.tsx      # P4b  /login, /login/expired
│  └─ kakao/callback/page.tsx          # P4b
│
├─ hosting/                            # 호스팅 센터 — 전부 클라이언트 조회
│  ├─ layout.tsx                       # P10a 헤더, 알림 벨
│  ├─ page.tsx                         # P10a 공연준비 홈 (호스트 탭 / 공연 탭 / 검색)
│  ├─ new/
│  │  ├─ hosts/page.tsx                # P10a 호스트 만들기
│  │  └─ events/page.tsx               # P11  간편 공연 만들기 (내부 2단계)
│  ├─ hosts/[hostId]/
│  │  ├─ settings/page.tsx             # P10b 호스트 설정
│  │  └─ members/page.tsx              # P10b 멤버
│  └─ events/[eventId]/
│     ├─ layout.tsx                    # P11  사이드메뉴 (등록 상태별 항목)
│     ├─ dashboard/page.tsx            # P11(체크리스트) + P13a(등록 후 통계)
│     ├─ info/page.tsx                 # P11  기본 정보
│     ├─ detail/page.tsx               # P11  상세 정보 (섹션 에디터)
│     ├─ preview/page.tsx              # P11  미리보기
│     ├─ tickets/
│     │  ├─ page.tsx                   # P12
│     │  ├─ new/page.tsx               # P12
│     │  └─ [ticketItemId]/page.tsx    # P12
│     ├─ guests/page.tsx               # P13a 주문 탭 / 발급된 티켓 탭 / 환불
│     └─ qr/page.tsx                   # P13b
│
└─ fe-api/                             # Route Handler. nginx가 /api를 전부 백엔드로 보내므로 /api 아래에 두지 않는다
   └─ revalidate/route.ts              # P5b  공연·호스트 캐시 무효화 (호출자 권한 확인)
```

**호스트 홈은 `/hosts/[hostId]` 하나다.** 비로그인·관객·멤버·매니저·마스터가 같은 화면을 보고 `myRole`에 따라 버튼이 달라진다. 설정과 멤버 관리만 호스팅 센터에 있다.

**없앤 v1 라우트**: `/home`(→ `/`), `/events/[eventId]/book/option`·`book/order`, `/pay/*`, `/history/mycoupon`, `/ticket/[id]`, `/ticket/qr`, `/admin/*`(→ `/hosting/*`).

## `src/features/` — 화면 구현

```
src/features/
├─ audience/
│  ├─ home/                    # P5a  HomePage(배너·캐러셀·두둥 소개), EventListPage(검색·TagFilter·지난공연 토글)
│  ├─ event/                   # P5b + P6
│  │  ├─ EventDetail/          # 섹션 탭, 해시태그, 공유 버튼, HostContactSheet
│  │  └─ SelectTicket/         # GP-5, 인라인 수량 스테퍼 (클라이언트)
│  ├─ checkout/                # P7   CheckoutPage, OptionAnswersForm, PaymentChannelSelect, AccountInfo, DepositConfirmDialog, OrderComplete
│  ├─ ticket/                  # P8   TicketTabPage, TicketCarousel, TicketCard, QrCode, QrFullscreen
│  ├─ gift/                    # P8b  SendSheet, LinkCreated, GiftLanding(viewState 7종), SentTicketDetail
│  ├─ checkin/                 # P8c  SelfCheckInPage
│  └─ mypage/                  # P9   MyPage, Profile, OrderHistory(+ RefundAccountSheet), FollowingHosts, Archive
│
├─ hosting/
│  ├─ home/                    # P10a PrepHome(HostTab, EventTab, Search)
│  ├─ host/                    # P10a + P10b  CreateHost, HostSettings, HostMembers(InviteDialog, RoleMenu, TransferMasterDialog, PermissionGuide)
│  ├─ event/                   # P11  NewEventWizard, EventLayout, Checklist, EventInfo, EventDetailEditor(SectionTabs + Tiptap)
│  ├─ ticket/                  # P12  TicketManage, TicketForm, TicketMenu, OptionManage
│  ├─ guest/                   # P13a Dashboard, OrderTab, IssuedTicketTab, RefundTab
│  ├─ qr/                      # P13b HostScan, AudienceScan
│  └─ overlays/                # 도메인별로 모은다 — 라우트가 아니라 누락되기 쉽다
│     ├─ OpenEvent/ DeleteEvent/ UnsavedGuard/
│     ├─ ToggleTicketSale/ DeleteTicket/ DetachOption/
│     └─ RefuseOrder/ CancelOrder/ OrderDetail/ IssuedTicketDetail/ CompleteRefund/
│
└─ shared/                     # 관객·호스팅 양쪽이 쓰는 것
   ├─ auth/                    # P4a/P4b  세션 쿼리, LoginPage, KakaoCallback, Register, 재발급 단일 지점
   ├─ host-home/               # P5c  HostHome — myRole별 뷰
   ├─ section-viewer/          # P5b  HTML/마크다운 렌더 + sanitize (공연 상세 ↔ 미리보기), 클라이언트 컴포넌트
   ├─ notification/            # P9b · P10a  벨, 알림함, 타입 → 표시 매핑
   ├─ checkin-result/          # P8c · P13b  result → 화면
   ├─ upload/                  # P10a 발급 → S3 PUT → key
   ├─ permission/              # can(role, action)
   ├─ kakao-share/             # P5b · P8b
   └─ analytics/               # P5a  GA4
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
   ├─ Toast/ Loader/ Skeleton/ EmptyState/
   ├─ Accordion/ Header/ Footer/ NavBar/ Profile/ Tag/ ListHeader/
   └─ DataTable/
```

## `src/api/` — 스키마 · 조회 정의 · 호출

도메인 폴더는 백엔드 리소스 단위다. 각 폴더는 `schema.ts`(zod, Swagger 기준) + `queries.ts` + `mutations.ts`. 조회·변경 정의는 개별 export다(`eventDetailQuery`, `updateEventBasicMutation`).

```
src/api/
├─ http.ts                     # api 객체 — get / post / patch / put / delete / cached.get / download
├─ client.ts                   # ky 인스턴스(내부) — 응답 래퍼 해제, ApiError, 401 재발급 후 재시도
├─ errors.ts                   # ApiError{status, code, reason}, getErrorCode
├─ revalidate.ts               # revalidate(path) — /fe-api/revalidate 호출
├─ server/                     # 'server-only' — 라우트 파일에서만 쓴다
│  ├─ serverQuery.ts           # 요청별 QueryClient + fetchQuery + 404 → notFound()
│  └─ Prefetch.tsx             # 조회 → dehydrate → HydrationBoundary
├─ shared/
│  ├─ page.ts                  # V2PageResponse 스키마 팩토리, 페이지 기반 무한 쿼리 헬퍼
│  ├─ date.ts                  # 'yyyy.MM.dd HH:mm' ↔ Date (KST)
│  ├─ tags.ts                  # 경로 → 계층 태그
│  └─ enums.ts
├─ auth/  me/  host/  event/  ticket-item/  option/
├─ order/                      # + price.ts (금액 계산 순수함수)
├─ refund/  issued-ticket/  check-in/  my-ticket/  gift/  notification/  upload/
└─ __mocks__/                  # MSW 핸들러
```

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수는 없다.

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
3. `src/api/server/`는 라우트 파일과 Route Handler에서만 import한다(`'server-only'`). 여기서 `cookies()`를 읽지 않는다.
4. `src/api`는 `features`·`ui`를 import하지 않는다. 앱 어디에서도 엔드포인트나 스키마를 따로 정의하지 않는다.
5. `src/ui`는 `features`를 모른다.
