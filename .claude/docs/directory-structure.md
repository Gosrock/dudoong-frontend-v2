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
│     ├─ image.yml             # main 머지 → 이미지(지금 GHCR — ECR `:dev`로 바꿀 예정, deploy-plan §1)
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
│  │  ├─ gifts/[giftToken]/page.tsx    # P8b  선물 랜딩 + generateMetadata — 사용자별 판정은 viewer 쿼리
│  │  └─ notices/[noticeId]/page.tsx   # P9c  서비스 공지 상세(GA-2 서버 조회, 숨김·없음 404, 탭 제목 = 공지 제목. P9c-L 생성 — NoticeDetailView)
│  │
│  └─ (app)/                           # 클라이언트 조회 화면
│     ├─ layout.tsx                    # <Suspense>. 게이트 없는 화면(이 폴더 바로 아래)은 useQuery만 쓴다
│     ├─ events/page.tsx               # P5a  공연 리스트
│     ├─ notices/page.tsx              # P9c  서비스 공지 목록(GA-1 `audience=USER`, 브라우저 무한 조회. P9c-L 생성 — NoticeListView)
│     ├─ login/[[...state]]/page.tsx   # P4b  /login, /login/expired
│     ├─ kakao/callback/page.tsx       # P4b
│     │
│     └─ (protected)/                  # 로그인 필요 — 보호 경로를 목록이 아니라 폴더로 정한다
│        ├─ layout.tsx                 # P4a  로그인 게이트 — 세션 확정 뒤에만 children 렌더
│        ├─ events/[eventId]/checkout/page.tsx   # P7   체크아웃
│        ├─ tickets/page.tsx           # P8   티켓탭
│        ├─ check-in/page.tsx          # P8c  셀프 체크인
│        ├─ orders/
│        │  ├─ page.tsx                # P9   주문내역 (P9-L 생성 — OrdersView)
│        │  └─ [orderUuid]/page.tsx    # P9   주문상세(OrderDetailView). 주문 완료 화면도 여기(?created=1, P7)
│        └─ mypage/
│           ├─ page.tsx                # P9   마이페이지 (프로필 편집 포함, P9-L 생성 — MyPageView)
│           ├─ following/page.tsx      # P9   관심 호스트 (P9-L 생성 — FollowingHostsView)
│           ├─ archive/page.tsx        # P9   관람 공연 아카이빙 (P9-L 생성 — ArchiveView)
│           ├─ notifications/page.tsx  # P9b  알림함 — 호스팅 센터의 알림 벨도 여기로 (P9b-L 생성 — NotificationInboxView)
│           └─ gifts/page.tsx          # (보류) 보낸·받은 선물 내역 GG-7 — Figma에 화면이 있을 때만
│
├─ hosting/                            # 호스팅 센터 — 전부 클라이언트 조회
│  ├─ layout.tsx                       # P4s <Suspense>, 로그인 게이트, 셸 — 데스크탑(1024 이상) 전역 상단 바(GUI `Top bar_Host` — 로고·공연 둘러보기·공연 준비하기·알림 벨·아바타 ▾) / 모바일 HostingHeader(`host title` 로고 헤더, 벨 없음) + 드로어(알림 벨은 드로어 안 — design-requests Q17). 공연 밖 화면은 사이드바 없이 본문 최대 1280. 활성 표시는 경로를 읽는 말단 + 자체 Suspense (tech-decisions §3)
│  ├─ notices/                         # P9c  서비스 공지 — page.tsx 목록(GA-1 `audience=HOST`)·[noticeId]/page.tsx 상세(공용 404). 서버 조회 없음(P9c-L 생성 — NoticeListView·NoticeDetailView)
│  ├─ page.tsx                         # P10a 공연준비 홈 (호스트 탭 / 공연 탭 / 검색) — 탭은 `?tab=hosts`(기본 공연 탭은 주소에 없음). P10a-L 생성 — HostingHomeView
│  ├─ new/
│  │  ├─ hosts/page.tsx                # P10a 호스트 만들기 (P10a-L 생성 — CreateHostView)
│  │  └─ events/page.tsx               # P11  간편 공연 만들기 (내부 2단계 `?step=1|2`, P11-L 생성 — NewEventView)
│  ├─ hosts/[hostId]/
│  │  ├─ settings/page.tsx             # P10b 호스트 설정 (P10b-L 생성 — HostSettingsView. 비멤버 403·없는 호스트 404는 클라이언트 판정)
│  │  └─ members/page.tsx              # P10b 멤버 (P10b-L 생성 — HostMembersView)
│  └─ events/[eventId]/                # page.tsx 없음 — next.config redirects()로 dashboard
│     ├─ layout.tsx                    # P11  공연 스코프 (GE-3, P11-L 생성 — EventScopeView: 숫자 아닌 id 404·비멤버 403·메뉴·읽기 전용) — 데스크탑 공연 사이드바 268(‹ 내 공연 · 공연 카드 · 메뉴 등록 전 4 / 후 6 · 예매자 관리 배지 · 공연 페이지 보기), 모바일은 "대시보드 ▾ / 공연명" 헤더(메뉴 방식 Q37 대기)
│     ├─ dashboard/page.tsx            # P11(체크리스트) + P13a(등록 후 통계). P11-L 생성 — EventDashboardView(`?created=1` 만든 직후)
│     ├─ info/page.tsx                 # P11  기본 정보 (P11-L 생성 — EventInfoView)
│     ├─ detail/page.tsx               # P11  상세 정보 (섹션 에디터, P11-L 생성 — EventDetailView)
│     ├─ preview/page.tsx              # P11  미리보기
│     ├─ tickets/
│     │  ├─ page.tsx                   # P12  티켓 관리 목록 + 카드의 옵션 붙이기·옵션 상세 (P12-L 생성 — TicketListView)
│     │  ├─ new/page.tsx               # P12  새 티켓 (P12-L 생성 — TicketFormView)
│     │  └─ [ticketItemId]/page.tsx    # P12  티켓 수정 (P12-L 생성 — TicketFormView, 숫자 아닌·목록에 없는 id는 공용 404)
│     ├─ guests/page.tsx               # P13a 주문 / 발급된 티켓 / 환불 — ?tab=, 주문 상세 모달은 ?order= (P13a-L 생성 — GuestsView. 옆에 크리티컬 패스 통합 테스트 `critical-path.test.tsx` — app 계층이라 관객·호스팅 훅을 같이 부른다)
│     └─ qr/page.tsx                   # P13b QR 체크인 (P13b-L 생성 — QrCheckInView, [호스트가 스캔]·[관객이 스캔] 전환 + 통계)
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
│  ├─ home/                    # P5a  HomePage(배너·캐러셀·두둥 소개), EventListPage(검색·TagFilter·지난공연 토글). model/: event-list-filter(URL ↔ 필터), tag-panel, useEventList
│  ├─ event/                   # P5b + P6
│  │  ├─ EventDetail/          # 섹션 탭, 해시태그, 공유 버튼, HostContactSheet
│  │  └─ SelectTicket/         # GP-5, 인라인 수량 스테퍼 (클라이언트)
│  ├─ checkout/                # P7   CheckoutPage, OptionAnswersForm, PaymentChannelSelect, AccountInfo, DepositConfirmDialog, OrderComplete(/orders/[orderUuid]?created=1에서 렌더)
│  ├─ ticket/                  # P8   TicketTabPage, TicketCarousel, TicketCard, QrCode, QrFullscreen. model/: my-ticket-state(state 11값), ticket-groups, useTicketTab, useTicketDetail
│  ├─ gift/                    # P8b  SendSheet, LinkCreated, GiftLanding(viewState 7종), SentTicketDetail. model/: gift-landing-state, gift-errors, gift-memo, gift-share, gift-metadata, gift-cache, gift-refetch, useGiftActions(보내기·링크·회수·반환), useGiftLanding
│  ├─ checkin/                 # P8c  SelfCheckInPage. model/: check-in-params, self-check-in-errors, useSelfCheckIn
│  └─ mypage/                  # P9   MyPage, Profile, OrderHistory(+ RefundAccountSheet), FollowingHosts, Archive. 지금은 로직 연결 자리 MyPageView·OrdersView·OrderDetailView·FollowingHostsView·ArchiveView. model/: order-status(상태 5종 × refundStatus 한 매핑), order-detail(취소 자리·선물 안내·환불 계좌 입구·거절 사유·금액·옵션·안내 종류), order-errors(patterns §24 P9 표), refund-account-form(bankCode), profile(닉네임 2~7자), lists(관심 호스트 탭·대표 공연 배지·아카이빙 주소·연도 탭), useMyOrders, useOrderDetail(+ useCancelOrder·useRefundAccount), useOrderHostContacts(GP-3 viewer만, 열 때), useProfileEdit, useFollowingHosts, useArchive, useWithdraw
│
├─ hosting/
│  ├─ shell/                   # P4s-V  (메뉴 데이터는 `shared/shell` — P4s-L) 전역 상단 바(PC, GUI `Top bar_Host` — 로고·공연 둘러보기·공연 준비하기·벨·아바타 ▾, hosting/layout.tsx), HostingHeader(모바일 `host title`), MobileDrawer, 3단 슬롯(사이드바 268 · 본문 · 우측 패널). 공연 사이드바(‹ 내 공연 · 공연 카드 · SidebarItem = GUI `사이드바 메뉴` true/false/alert · 공연 페이지 보기)와 EventSwitcherHeader(모바일 "대시보드 ▾ / 공연명" — 메뉴 방식 Q37)는 events/[eventId]/layout.tsx가 쓴다(P11). 공연 밖 화면은 사이드바 없이 본문 최대 1280
│  ├─ home/                    # P10a PrepHome(HostTab, EventTab, Search). 지금은 로직 연결 자리 HostingHomeView. model/: hosting-home(탭 `?tab=hosts` · 검색어 50자·300ms · 빈 상태 none/search · 카드 주소), useHostingHome(GH-1·GE-1 무한 목록, 지금 탭만 조회)
│  ├─ host/                    # P10a + P10b  CreateHost, HostSettings, HostMembers(InviteDialog, RoleMenu, TransferMasterDialog, PermissionGuide). 지금은 로직 연결 자리 CreateHostView. 지금은 로직 연결 자리 HostSettingsView·HostMembersView도. model/: host-fields(이름·소개·연락처 칸 규칙 — 만들기·설정 공용, 연락처 유형 6종·placeholder·줄 바꾸기), create-host-form(PH-2 본문), useCreateHost(PH-2 → GH-1·GM-1 무효화 → `/hosting?tab=hosts`), host-settings-form(바뀐 필드만 PH-4, 이미지 프로필·커버 key, 에러 문구), useHostSettings(GH-3 viewer → PH-15 → S3 → PH-4, 일반 멤버 읽기 전용), member-rules(행 메뉴 `memberActionsOf`, 초대 역할·칸 오류·실패 줄 매핑, 권한 가이드 표), useHostMembers(GH-6·PH-10·DH-11·PH-12), useInviteMembers(PH-7), host-cache(변경 응답 반영·`myRole` 쿼리 무효화)
│  ├─ access/                  # P10a 하위 화면(호스트 P10b·공연 P11)의 비멤버 403·404 판정. HostingAccessRejected(AsyncBoundary rejected)·HostingForbidden(P2 ForbiddenView). model/hosting-access(조회 에러 → forbidden·notFound·error, myRole → `can(role, 'viewManagement')`)
│  ├─ event/                   # P11  NewEventWizard, EventLayout, Checklist, EventInfo(PlaceInput: 우편번호 + 카카오 Geocoder), EventDetailEditor(SectionTabs + Tiptap). 지금은 로직 연결 자리 NewEventView·EventScopeView·EventDashboardView·EventInfoView·EventDetailView. model/: event-scope(주소 id·메뉴 등록 전 4/후 6·읽기 전용 이유·티켓 여부 잠금·`canDeleteEvent`), schedule(날짜 1칸 + 시각, 종료 ≤ 시작이면 다음 날), place(주소 → 좌표 어댑터 `Geocoder`·4필드·상세주소), kakao-geocoder(카카오맵 SDK `services.Geocoder` 어댑터), basic-info-form(PE-4 바뀐 필드만·문의처 0~10·태그 10·서버 코드 → 칸), sections-form(PE-6 전체 교체·기본 4탭·1~10/20자/20,000자), checklist(행 3개·③ 면제·PE-8 코드), create-event-form(Step·호스트 선택 가능·PE-2 본문·`?created=1`), event-cache(저장·등록·삭제 뒤 반영), useEventScope, useNewEventWizard(Step1 안 호스트 만들기는 `useCreateHost({onCreated})`), useEventDashboard, useEventBasicInfo, useEventSections, useDeleteEvent
│  ├─ ticket/                  # P12  TicketManage, TicketForm, TicketMenu, OptionManage. 지금은 로직 연결 자리 TicketListView·TicketFormView. model/: ticket-rules(잠금 `isSold || hasPendingOrders`·⋮ 메뉴·상태 칩·추가 가능·붙일 수 있는 옵션·주소), ticket-form(기본값·무제한 → 재고 공개 끔·두둥 승인 잠금·칸 검사·T-2 본문·T-3 바뀐 필드 + `clear[]`·동의 `REFUND_OBLIGATION_FIELD`(Q42)·서버 코드 → 칸), option-form(O-2·O-3 본문 — 형식 없음·잠긴 옵션 추가금 제외), bank-select(검색 거르기), ticket-cache(변경 뒤 T-1·O-1·GP-5·체크리스트 ③), useTicketList, useTicketForm, useBankSelect, useTicketOptions(붙이기·떼기·새 옵션 O-2 + O-5), useOptionEditor(O-3·O-4)
│  ├─ guest/                   # P13a OrderTab, IssuedTicketTab, RefundTab, OrderDetail(?order= 값으로 페이지가 선언적으로 렌더). 지금은 로직 연결 자리 GuestsView·GuestTabs. model/: guest-rules(탭·주소 `?tab=`·`?order=`, 상태 탭 5개(Q32 닫힘 2026-10-31 — "전체"에 결제 실패 포함), 검색 안내(#846), 처리 버튼 `orderActionsOf`, 거절·취소 본문, 두둥 판정·약관 안내 C-2~C-4, 에러 문구), guest-cache(처리 뒤 GR-2·GR-1·GF-1·GI-1·GD-1·T-1·GP-5), useGuestsUrlState, useOrderList, useOrderDetail, useIssuedTicketList, useRefundList, useGuestExport. 등록 후 대시보드 파생값은 event/model/dashboard-stats(+ useEventDashboard `stats`)
│  ├─ qr/                      # P13b HostScan, AudienceScan. 지금은 로직 연결 자리 QrCheckInView(스캐너 대신 글자 입력, QR 대신 주소 글자). model/: qr-check-in-rules(공연 상태별 안내 `hostScanBlockOf`·`selfCheckInBlockOf`, 스캔 값 정리 64자, 연속 스캔 쿨다운, PQ-2 실패 분류, `selfCheckInUrl` = origin + qrPath), qr-cache(스캔 뒤 GQ-1, `Event_400_27` 뒤 GE-3), useCheckInStats(GQ-1), useHostScan(PQ-2 — `submitScan(value)`·`retry`·`reset`), useSelfCheckInQr(GQ-4)
│  └─ overlays/                # 도메인별로 모은다 — 라우트가 아니라 누락되기 쉽다. 데이터를 읽으면 안에 AsyncBoundary
│     ├─ OpenEvent/ DeleteEvent/ UnsavedGuard/ NotifyGuestsNotice/
│     ├─ ToggleTicketSale/ DeleteTicket/ DetachOption/
│     └─ RefuseOrder/ CancelOrder/ IssuedTicketDetail/ CompleteRefund/
│
└─ shared/                     # 관객·호스팅 양쪽이 쓰는 것
   ├─ auth/                    # P4a/P4b  LoginGate(pending 스켈레톤 · 익명이면 항상 /login · error면 전체 화면 재시도), useSession, registerAuth(queryClient) — setAuthHandlers 등록(재발급 HTTP 호출 refreshTokens + onSessionLost) + storage·pageshow 감시, handleSessionLost(한 번만, 보호 영역은 /login/expired, 그 밖은 reload), useProtectedArea(보호 영역 판정 = 게이트 마운트 수), LoginRequiredLink·useRequireLogin, useLogout, loginHref·expiredHref. P4b: LoginView, KakaoCallbackView(최소 마크업 — V에서 교체), model/(auth-outcome·login-redirect·register-form·finish-login, useKakaoLogin·useKakaoCallback·useRegisterForm). 임시 GateCheckView(+ (protected)/gate-check — 실제 보호 화면이 생기면 지운다)
   ├─ host-home/               # P5c  HostHome — 공개 필드는 hostDetailQuery, myRole별 뷰와 로그인 사용자의 연락처 원문(#846)은 hostViewerQuery. model/: host-home-rules, useHostFollow(♡ 직렬화), useHostHome
   ├─ section-viewer/          # P5b  model/: render-section(contentFormat → marked → sanitize-html), sanitize-section-html, section-tabs(서버 섹션 없으면 기본 4탭). 뷰는 V
   ├─ contact/                 # P5b  model/contact-link — 연락처 6종 + UNKNOWN → 표시·링크(tel·mailto·http(s)만, 가린 값 `*`은 링크 없음 — #846). model/viewer-contacts(`resolveContacts` — 로그인 사용자 원문 연락처 상태, 2026-10-25 A안). P5c·P9 재사용
   ├─ shell/                   # P4s  셸 메뉴 — 관객 햄버거 · 관객 PC 아바타 드롭다운 · 호스팅 드로어(벨 포함) · 호스팅 PC 아바타 드롭다운이 같은 목록 하나를 쓴다(그래서 shared). 뷰·셸 레이아웃은 P4s-V(관객 `(audience)/layout.tsx`, 호스팅 `hosting/layout.tsx` + `features/hosting/shell/`). model/: shell-menu(`shellLink` — 항목·목적지·미로그인은 `/login?redirect=<그 경로>`, `shellHostRow` — GM-1 hosts 10 + hostCount → 줄·빈 문구·더 보기 `/hosting?tab=hosts`, `shellMenu(me | null)`), useShellMenu(useSession + useNotificationBell + useLogout + useLoginHref → pending·error·ready)
   ├─ notice/                  # P9c  서비스 공지(S9) — 관객·호스팅이 `audience`만 바꿔 쓴다. 최소 마크업 NoticeListView·NoticeDetailView·NoticeBannerView(셸에는 아직 안 붙음 — V). model/: notice-rules(경로 id·목록/상세 경로·행 값·본문 sanitize(section-viewer와 같은 허용 목록)·배너 종료 판정), banner-dismissal(닫은 배너 id — localStorage `dd:noticeBannerDismissed`, 최근 50개), useNoticeList(GA-1), useNoticeDetail(GA-2), useNoticeBanner(GA-3 + 닫기)
   ├─ notification/            # P9b · P10a  벨, 알림함, 타입 → 표시 매핑. 지금은 로직 연결 자리 NotificationInboxView. model/: notification-kind(17종 → 카테고리 3종·아이콘·받는 사람·이동 경로, PN-3 본문), useNotificationBell(GN-2 — P9b-L이 먼저 만들었다), useNotificationInbox(GN-1), useReadNotifications(PN-3 단건·전체)
   ├─ checkin-result/          # P8c · P13b  model/checkin-result — result → 화면(`'host' | 'self'`)
   ├─ image-upload/            # P9 · P10b · P11 (먼저 착수한 Phase)  업로드 UI(DropZone 연결, 미리보기). 호출은 src/api/upload
   ├─ permission/              # P5c  model/can — can(role, action), HOST_ACTIONS(api-contract §2 표 — P10b-L이 `manageManagers` 추가)
   └─ kakao-share/             # P5b · P8b  model/: feed-template(공연과 무관 — 선물 링크도 쓴다), kakao-sdk(SDK 2.8.3 + SRI, 앱 키는 호출할 때 읽음)
```

## `src/ui/` — 디자인 시스템 (P1, P2)

```
src/ui/
├─ theme/
│  ├─ palette.ts               # Figma Atomic 원시 색 102개(화면은 직접 쓰지 않는다)
│  ├─ tokens.css.ts            # vars — 의미 색(createGlobalTheme 라이트 한 벌 — 다크 모드 미지원), space(7~10 데스크탑 확대), radius, font, zIndex, shadow
│  ├─ colors.ts                # colors — <Txt color={colors.textSecondary} />처럼 값으로 넘기는 색(의미 색 + 원시 색)
│  ├─ typography.css.ts        # Figma 텍스트 스타일 21개(bodyMd, headingSmEmphasized …)
│  ├─ sprinkles.css.ts         # 조건(mobile/desktop) + 토큰 유틸리티
│  ├─ breakpoints.ts           # desktop ≥ 1024, wide ≥ 1280(P1). 관객·호스팅 모두 1024부터 PC(사용자 결정 2026-10-31, Q38 닫힘 — GUI의 1133 경계 대신). 호스팅 우측 패널 폭은 1280 · 1440(GUI)
│  ├─ types.ts                 # 공개 props 타입(SpaceKey, Responsive<T> …) — vanilla-extract 타입을 밖에 내보내지 않는다
│  └─ global.css.ts            # reset, 본문 폰트, focus-visible
├─ primitives/                 # Flex(+ .Center 등), Spacing, Txt, Divider, Container
├─ hooks/                     # useMediaQueries, useCloseOnBack(뒤로가기로 오버레이 닫기), useOnExited, useReturnFocus
├─ illustrations/             # 일러스트 SVG(빈 화면 6종 — P2엔 PNG였다가 2026-10-25 Figma 벡터가 가벼워져 SVG로), illust_dashboard·아바타 캐릭터(SVG) → <Illustration name /> (<img>)
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
   ├─ AsyncBoundary/           # P2  ErrorBoundary + suspensive Suspense. holdOn(SessionLostError)은 pending 유지
   ├─ ErrorBoundary/           # @suspensive/react ErrorBoundary + QueryErrorResetBoundary(shouldCatch·holdOn·resetKeys), ErrorBoundaryGroup 재노출(2026-10-31)
   ├─ Accordion/ Header/ ListHeader/ InfoRow/   # Footer·NavBar는 쓰는 곳이 없어 보류(P2)   # Header = Figma Top app bar(관객·호스팅 공용, 뒤로가기·제목·공연 전환형). 로고 헤더(GUI 로컬 `basic title` 관객, `host title` 호스팅)는 각 셸이 Header의 변형으로 그린다. InfoRow = Figma list(라벨 + 값 행, 펼침형은 Accordion)
   └─ DataTable/
```

## `src/api/` — 스키마 · 조회 정의 · 호출

도메인 폴더는 백엔드 리소스 단위다. 각 폴더는 `schema.ts`(zod, Swagger 기준) + `queries.ts` + `mutations.ts`. 조회·변경 정의는 개별 export다(`eventDetailQuery`, `updateEventBasicMutation`).

```
src/api/
├─ client.ts                   # 요청 파이프라인 — ky 인스턴스 하나(기준 주소 없음, timeout 10초), 기준 주소 계산(prefixV2·prefixV1Auth), ky 네트워크·타임아웃 → ApiError(0), 본문 읽기 시간 제한, 래퍼 해제(NON_JSON·BAD_ENVELOPE·PARSE_ERROR). 401 재발급은 P4a에서 request()에 붙는다
├─ http.ts                     # api(/api/v2) · authApi(/api/v1/auth) 객체만 — client.ts의 request()를 감싼다. { public: true }는 credentials:'omit'
├─ auth-handlers.ts            # P4a  setAuthHandlers({ refresh, onSessionLost }) + 재발급 조정: 탭 안 단일 비행, 탭 사이 Web Locks(15초 abort) + dd:refreshedAt 비교, 결과 판정(성공 / 상실 → SessionLostError + onSessionLost 한 번 / 일시 오류 → 세션 유지). 재발급 4xx는 401 포함 모두 상실(낡은 액세스 쿠키 401 재시도는 #792로 근거가 없어져 2026-10-25 지움). features는 HTTP 호출만 등록한다(api가 features를 import할 수 없어서)
├─ session-flag.ts             # P4a  dd:session(로그인마다 새 무작위 값)·dd:refreshedAt 읽기·쓰기. 저장소 실패 = 없음. client.ts의 401 처리가 읽어야 해서 api에 둔다
├─ errors.ts                   # ApiError{status, code, reason}, SessionLostError, getErrorCode
├─ query-client.ts             # getQueryClient() — Next 가이드 방식, 재시도는 5xx·status 0만
├─ settle.ts                   # settle(promise) → {ok,data}|{ok:false,error}, handleError(error, { 코드: 처리 }, { otherwise }) — 변경 에러는 호출 쪽이 처리(2026-10-31)
├─ error-toast.ts              # 공용 에러 토스트 주입(setErrorNotifier)·문구(errorMessageOf)
├─ upload.ts                   # P3  발급 → S3 PUT → key (호스트·공연·프로필 공용)
├─ server/                     # 'server-only' — 라우트 파일에서만 쓴다. src/api 중 유일하게 React(HydrationBoundary)·notFound를 쓴다
│  ├─ serverQuery.ts           # 요청별 QueryClient + fetchQuery + 404 → notFound()
│  └─ Prefetch.tsx             # queries → dehydrate → HydrationBoundary. 무한 목록은 받지 않는다(GH-14는 브라우저 useInfiniteQuery)
├─ shared/
│  ├─ common-schema.ts         # P3  Contact·Place·HostRole — 도메인 폴더끼리 import하면 순환이 생겨 여기 둔다
│  ├─ page.ts                  # V2PageResponse 스키마 팩토리, 페이지 기반 무한 쿼리 헬퍼
│  ├─ date.ts                  # 'yyyy.MM.dd HH:mm' ↔ Date (KST)
│  ├─ route-pattern.ts         # routePattern() — 로그용 경로(id·토큰 → :param, 쿼리 버림)
│  ├─ agreement.ts             # 2026-10-25  동의 기록 필드(#840·#850) — AGREEMENT_VERSION('2026-10'), agreementFields(사용자가 체크한 true만 + 그때만 agreementVersion)
│  └─ open-enum.ts             # openEnum(name, values) — 모르는 문자열은 UNKNOWN, 누락은 PARSE_ERROR
├─ auth/                       # P4b  calls.ts(카카오 링크·코드 교환·register/valid·login·info·register, 재발급·로그아웃 — authApi), schema.ts
├─ me/                         # GM-1·PM-2(mutations updateMeMutation)·GM-4 followingHostsQuery·GM-5 archiveQuery (P9)
├─ host/  event/  ticket-item/  option/   # P12: ticket-item — ticketItemsManageQuery(T-1 `['events', id, 'manage', 'ticket-items']`)·mutations.ts(T-2~T-6·O-5)·관리 스키마·요청 스키마(`.strict()`)·입력 규칙 상수(`TICKET_NAME_MAX` 12 등), option — eventOptionsQuery(O-1 `…, 'manage', 'options']`)·mutations.ts(O-2~O-4)·스키마(O-3에 `type` 없음). P10a: host — myHostsQuery(GH-1, `MY_HOSTS_KEY`)·createHostMutation(PH-2)·입력 규칙 상수, event — myEventsQuery(GE-1, `MY_EVENTS_KEY`). P10b: host — updateHostMutation(PH-4)·addHostMembersMutation(PH-7)·updateHostMemberRoleMutation(PH-10)·removeHostMemberMutation(DH-11)·transferMasterMutation(PH-12), event — `isEventManageQueryKey`(GE-3 키 모양 `['events', id, 'manage']`, 양도 뒤 무효화). P11: event — eventManageQuery(GE-3)·eventChecklistQuery(GE-7)·eventSectionsManageQuery(GE-5 쿠키 — 모두 `['events', id, 'manage', …]`)·`eventPublicKeys`, mutations.ts createEventMutation(PE-2)·updateEventBasicMutation(PE-4)·updateEventSectionsMutation(PE-6)·openEventMutation(PE-8)·deleteEventMutation(DE-9), 입력 규칙 상수(`EVENT_NAME_MAX` 25 등)
├─ order/                      # + price.ts (금액 계산 순수함수). P9: myOrdersQuery(O-2)·myOrderQuery(O-3)·cancelMyOrderMutation(O-4)·putRefundAccountMutation(O-5). P13a: 호스트 주문 스키마(`HostOrder*`·`RefundElement`·`RefuseOrderRequestSchema`·`HostCancelOrderRequestSchema`·`OPERATION_*` 상수), hostOrdersQuery(GR-1 `['events', id, 'manage', 'orders', 'list', params]`)·hostOrderQuery(GR-2 `…, 'detail', uuid]`)·refundsQuery(GF-1 `…, 'manage', 'refunds', params]`), mutations approve·refuse·cancelHost·completeRefund·exportOrders(GR-6)
├─ my-ticket/                  # P8   T-1·T-2·T-3 (state 11값 openEnum)
├─ gift/                       # P8b  queries + mutations(보내기·회수·메모·수락·거절·반환)
├─ check-in/                   # P8c  PQ-5. P13b: queries.ts checkInStatsQuery(GQ-1 `['events', id, 'manage', 'check-ins', 'stats']`)·checkInQrQuery(GQ-4 `…, 'manage', 'check-in-qr']`, staleTime Infinity), mutations hostCheckInMutation(PQ-2), 스키마 CheckInStats·CheckInQr·HostCheckInRequest(`.strict()`, uuid 64자)
├─ bank/                       # P9·P12 은행 목록 banksQuery(`GET /api/v2/banks`, 공개) — 환불 계좌·티켓 입금 계좌 공통(P12-L에서 refund/ → bank/)
├─ user/                       # P9   calls.ts withdrawAccount — 회원 탈퇴 v1 `DELETE /api/v1/auth/me`를 withSessionRecovery로(authApi 아님)
├─ notice/                     # P9c  GA-1 noticesQuery(`['notices','list',audience,{size}]`, 무한)·GA-2 noticeQuery(`['notices','detail',id]`)·GA-3 noticeBannersQuery(`['notices','banners',audience]`, meta.silent, staleTime 1분) — 모두 공개(쿠키 없음), 변경 API 없음
├─ notification/               # P9b  GN-1 notificationsQuery·GN-2 unreadNotificationCountQuery(meta.silent)·PN-3 readNotificationsMutation, NOTIFICATIONS_KEY(`['me','notifications']`)
├─ issued-ticket/               # P13a GI-1 hostIssuedTicketsQuery(`['events', id, 'manage', 'issued-tickets', 'list', params]`)·GI-2 hostIssuedTicketQuery·mutations exportIssuedTicketsMutation(GI-3), `EntranceStatsSchema`(GD-1·GI-1·GQ-1 공통 모양)
├─ dashboard/                  # P13a GD-1 eventDashboardQuery(`['events', id, 'manage', 'dashboard']`)
└─ __mocks__/                  # MSW — handlers.ts(기본 목록), <도메인>.handlers.ts, upload-handlers.ts, fixtures/(현실적인 한국어 값·null·404 예시), respond.ts(ok·fail·paginate·쿠키 판정 — 세션 상태 valid·expired·invalid(`accessToken=forged`)·none), bank.handlers.ts(`GET /api/v2/banks` 25개), user.handlers.ts(탈퇴 — default·masterBlocked), notification.handlers.ts(GN-1·GN-2·PN-3), notice.handlers.ts(P9c GA-1·GA-2·GA-3 — `audience` 검사·숨김 404·배너 기간, `noticeHandlers` empty·listServerError·bannersServerError·detailServerError, 데이터 `fixtures/notice.ts` 읽기 전용), hosting.handlers.ts(GH-1·GE-1·PH-2 — 만든 호스트가 다음 GH-1에 나오는 저장소, `hostingSets` mixedRoles·manyHosts·noMembership·noEvents·nextPageError·listServerError·createFails), host.handlers.ts에 P10b PH-4·PH-7·PH-10·DH-11·PH-12(백엔드 검사 순서·코드), host-store.ts(P10b 저장소 — 설정·멤버·양도가 GH-3·GH-6·GH-1·GE-1의 `myRole`·프로필에 반영, `actAsRole(hostId, role)`로 3시점, `resetHostStore` — `resetHostMockState`·`resetHostingStore`가 함께 부른다), fixtures/host.ts `mockUsers`(초대 이메일 — `twin@example.com`은 계정 둘), event-store.ts(P11 공연 저장소 — PE-2·PE-4·PE-6·PE-8·DE-9가 바꾸고 GE-3·GE-7·GE-5·GP-3·GP-5·GE-1이 읽는다, `setStoredValidTicket`·`setStoredStatus`, `resetHostingStore`가 함께 되돌린다), ticket-store.ts(P12 티켓·옵션 저장소 — T-2~T-6·O-2~O-5가 바꾸고 T-1·O-1·GP-5·체크리스트 ③이 읽는다, GP-5 투영은 fixture 기준 시각 `PUBLIC_VIEW_NOW`, `setTicketPendingOrders`·`setTicketSold`·`setTicketAgreementEnforced`, `resetHostingStore`가 함께 되돌린다), hosting-ticket.handlers.ts(T-1~T-6·O-1~O-5 — 백엔드 검사 순서·코드, `hostingTicketSets` createFails·updateFails·deleteFails·replaceOptionsFails·updateOptionFails·listServerError), check-in.handlers.ts에 P13b GQ-1·PQ-2·GQ-4(백엔드 검사 순서·코드, `hostCheckInSets` scanFails·scanServerError·scanNetworkError·statsServerError·statsNetworkError·qrServerError — 판정·통계·토큰은 `fixtures/my-ticket.ts` 저장소 `hostCheckIn`·`checkInStatsOf`·`checkInTokenOf`·`markTicketCanceled`), hosting-event.handlers.ts(PE-2·GE-3·PE-4·PE-6·GE-7·PE-8·DE-9 — 백엔드 검사 순서·코드, `hostingEventSets` createFails·basicFails·sectionsFails·openFails·deleteFails·manageServerError, `mockRoleIn`), privacy-mask.ts(백엔드 `PrivacyMasker` 이식 — 익명 GP-3·GH-3 연락처 가림, P13a `maskName`), guest-store.ts(P13a 예매자 저장소 — 고스락 37회(101)에 상태별 주문 9건, O-1 관객 주문을 받아 호스트 승인·거절·취소·환불 완료를 관객 O-3·티켓탭(`fixtures/my-ticket.ts` `recordHostApprovedOrder`)에 잇는다, 승인·취소가 티켓 저장소 재고를 바꾼다, `resetHostingStore`가 함께 되돌린다), hosting-guest.handlers.ts(GD-1·GR-1·GR-2·PR-3~PR-5·GR-6·GF-1·PF-2·GI-1~GI-3 — 백엔드 검사 순서·코드·일반 멤버 가림, `hostingGuestHandlers` approveFails·refuseFails·cancelFails·exportTooMany·listServerError)
```

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수는 없다. 사용자별 값이 섞인 응답은 viewer 쿼리를 따로 둔다(`hostViewerQuery`, `hostEventsViewerQuery`, `giftLandingViewerQuery`, `eventDetailViewerQuery`(연락처 원문, 2026-10-25 A안) — tech-decisions §4).

`env/`: `client.ts`(`NEXT_PUBLIC_KAKAO_JS_KEY`, 빌드 때 검증)만 둔다. 서버 값(`API_INTERNAL_URL`)은 `http.ts`가 호출할 때 기본값과 함께 읽으므로 검증 파일이 없다. `instrumentation.ts`도 두지 않는다(tech-decisions §12).

queryKey 순서는 리소스 → `'viewer'` → `'infinite'` → 파라미터 객체다(예: `['hosts', id, 'events', 'viewer', 'infinite', { size }]`, tech-decisions §4).

## `src/utils/`

```
src/utils/
├─ log.ts                      # 구조화 stdout 로그 log(level, event, fields)
├─ clipboard.ts                # copyText()
├─ money.ts                    # 원 단위 표시
├─ download.ts                 # blob 저장 (엑셀) — saveBlob(blob, filename, fallback) (P13a-L 생성)
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
