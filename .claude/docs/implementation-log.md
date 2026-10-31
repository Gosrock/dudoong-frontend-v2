# Implementation Log

> Phase 하나가 끝날 때마다 기록한다. 결정의 "왜"와 만난 허들을 남긴다. Phase 정의는 [`plan.md`](./plan.md).

## 기록 형식

```
## P{n} — {제목}

**상태**: pending | in-progress | done ({날짜})
**변경**: 한 줄 요약
**완료 기준**: plan.md 체크리스트 중 통과/미통과
**허들**: 만난 문제와 해결
**결정**: 계획과 다르게 한 것, 이유
**문서 반영**: 고친 문서와 절
```

---

## P0 — 스캐폴딩 · 스파이크 · 의존성 감사

**상태**: in-progress (2026-10-16) — 코드·스파이크 완료, Docker 이미지·CI 첫 실행·외부 확인(산출물 D) 남음
**변경**: 단일 Next 16.4.1 앱 골격, `src/{app,features,ui,api,utils,env}`, 라우트 그룹, `api`/`authApi` + `unwrap`(NON_JSON) + `openEnum`, `getQueryClient`, `serverQuery`·`<Prefetch>`, GE-11 수직 슬라이스, ESLint(계층·ky 금지)·Prettier·husky·lint-staged, Vitest+MSW(14건 — 응답 래퍼, 재시도 규칙, 서버 분기 Node 환경), Storybook, Dockerfile, GitHub Actions 3종, `/healthz`, `CLAUDE.md`
**완료 기준**: lint 계층 실패·커밋 훅·env 누락 빌드 실패는 통과. Docker 이미지·CI 게이트는 첫 실행 대기. `.css.ts` 반영은 서버 재컴파일까지 확인
**허들**: zsh의 `path` 변수가 `PATH`와 묶여 있어 스크립트가 깨짐(변수 이름 변경). ky `Request`가 상대 URL을 못 받음(origin 붙임). boundaries 7·MSW 3 문법 변경
**결정**: `instant = false`를 페이지마다 둔다(레이아웃만으로는 부족 — 스파이크로 확인). 나머지는 tech-decisions §31
**검증**: 2026-10-16 검증 루프(GUI 문서 + P0 코드) 회차마다 tech-decisions §31에 고친 것을 기록
**문서 반영**: tech-decisions §2·§3·§12·§31, plan P0 완료 기준, directory-structure, patterns §5, deploy-plan §3·§9

## P1 — `src/ui` 기반: 토큰 · 프리미티브 · 반응형

**상태**: done (2026-10-17)
**변경**: 색 토큰 라이트·다크 두 벌(`createThemeContract`, 다크는 `html[data-theme="dark"]`에서만 — 배포는 라이트만. **2026-10-25 다크 모드 미지원(사용자 결정 2026-10-25)로 다크 세트를 걷어내고 `createGlobalTheme(':root')` 한 벌로 바꿈**), space(데스크탑에서 7~10 확대)·radius·font·zIndex·shadow, 텍스트 스타일(Figma 이름), sprinkles, 브레이크포인트(desktop ≥ 1024, wide ≥ 1280), `colors` 객체. 프리미티브 `Txt`·`Flex`(+`Center` 등)·`Spacing`·`Divider`·`Container`, `useMediaQueries`, Button recipe(primary/secondary/tonal × sm/md/lg, selected). 아이콘 58개 + `<Icon />` + 생성 스크립트. 폰트(Pretendard 동적 서브셋, Saira Condensed). 스토리(토큰·프리미티브·스타일 세 방법·아이콘)
**완료 기준**: 6개 모두 통과. typecheck · lint · test(15) · build · storybook build 통과
**허들**: Figma SVG 내보내기에서 `home` outline 외곽선 누락, `Ticket-alert` 28×28 — 손으로 보정(design-system §4)
**결정**: 텍스트 프리미티브 이름은 계획의 `Text` 대신 `Txt`(사용자 요청, DOM `Text`와 충돌 회피). typography 키는 Figma 이름(`bodyMd` 등). 다색 아이콘의 잉크색도 `currentColor`. Kartrider 폰트는 라이선스 확인 전이라 미적재(폴백만)
**문서 반영**: design-system §2·§4, patterns §1~§3, directory-structure(ui 트리), CLAUDE.md, plan P1 완료 기준

## P2 — `src/ui` 컴포넌트: 폼 · 오버레이 · 피드백

**상태**: done (2026-10-17) — iOS Safari 실기기 확인만 P4b 스테이징 뒤로 남김
**변경**: 폼 14(Input·SearchField·TextArea·Dropdown·SelectButton·Counter·DropZone·TagButton·Checkbox·Radio·Toggle·Tabs·DatePicker·TimePicker), 오버레이·피드백(BottomSheet·ResponsiveOverlay·Modal·Popup·EasyOverlay·Toast·Loader·Skeleton·EmptyState·NotFoundView·ForbiddenView·AsyncBoundary·LinkProgress·Popover·Tooltip·DropdownMenu, `OverlayRouteReset`), 표시(Fab·Badge·Avatar·Chip·FilterChip·InfoRow·Accordion·Header·ListHeader·DataTable), 에셋(일러스트 PNG 6·SVG 8, Logo). Button `dark`·`loading`, 토큰 `overlay.*`·`zIndex.popover`. 의존성: Radix 11종, vaul 1.1.2, sonner 2.0.8, @tanstack/react-table 9.3.1, react-hook-form 7.90.0, @hookform/resolvers 5.9.2
**완료 기준**: 7개 중 6개 통과(iOS Safari 스모크 남음). typecheck · lint · prettier · test(49) · test:stories(187, 캐시 지운 첫 실행 포함 2회) · build · storybook build 통과. Next 빌드에서 PNG·SVG 정적 import가 해시 경로 200으로 나오는 것을 임시 페이지로 확인
**허들**: Figma 일러스트 벡터가 너무 커 SVG 추출이 막힘(→ PNG). Storybook(Vite)에서 `next/link`·`next/image`가 `process is not defined`(→ `define`, 이미지는 `<img>`). 새 의존성을 Vite가 실행 중에 최적화하며 첫 실행 실패(→ `optimizeDeps.include`). Radix RadioGroup은 키를 누른 동안 선택해서 play에서 `{ArrowDown>}`로 검사
**결정**: 뒤로가기 = 오버레이 닫기(사용자 결정, patterns §6). `test:stories` PR 게이트 포함. 날짜·시간은 네이티브 입력. Footer·NavBar 보류. 나머지는 design-system §4-2
**문서 반영**: design-system §3·§4-1·§4-2, patterns §6, tech-decisions §5·§24, plan P2·P13a, directory-structure(ui·app), CLAUDE.md(명령)

## P3 — `src/api` 코어 + v2 계약 이식 + mock

**상태**: done (2026-10-17) — GG-3 실제 응답만 미확인
**변경**: `getErrorCode`·`getErrorStatus`·`is*` 판별(던지지 않음), `handleCodes`, 전역 에러 토스트(QueryCache·MutationCache onError → `setErrorNotifier`, providers.tsx에서 ui `toast` 주입), `api.download`(Content-Disposition·RFC 5987), `uploadImage`(발급 3종 → S3 PUT, Content-Type 서명값 고정, 쿠키 omit), `order/price.ts`, `shared/page.ts`(pageSchema·pageInfinite·flattenPages), `shared/date.ts`(KST 고정, TZ 바꿔도 같은 결과), `shared/common-schema.ts`. 공개 GET 9개 + GM-1 스키마·조회(공개/viewer 분리 — 공개 스키마에서 사용자별 필드 제거). MSW fixture·도메인 핸들러. `pnpm dev:mock`, `pnpm check:contract`
**완료 기준**: 6개 통과(GG-3 실제 응답 미확인). typecheck · lint · prettier · test(163) · test:stories(187) · build · e2e(4) · qa home 통과. `dev:mock`으로 `/` 200·태그 표시, `/api/v2/me` 401(당시 mock 코드 — 2026-10-25부터 `AUTH_401_2`, #808) 확인
**허들**: 기본 핸들러에 GG-3이 생겨 "핸들러 없는 요청 → NETWORK" 테스트가 깨짐(테스트 안에서 error 핸들러로 의도 유지). 일러스트 확인 때 띄운 standalone 서버가 프로세스 이름이 바뀌어 `pkill -f`로 안 죽고 3000번에 남아 있었음(정리)
**결정**: 금액 식은 백엔드 기준 `(단가 + 옵션) × 수량`(문서가 틀렸음 — tech-decisions §18 수정). `getErrorCode`는 `string | null`(patterns §5). 날짜는 스키마에서 문자열 유지(표시 직전 변환). 초기 조회 실패는 토스트하지 않고 배경 재조회·변경 실패만. 백엔드 확인 사항은 backend-questions B7
**문서 반영**: tech-decisions §18·§24, plan P3, directory-structure(api·scripts·pr-gate), backend-questions B7, CLAUDE.md(명령)

## P4a — 세션 · 401 처리 (게이트)

**상태**: done (2026-10-21) — 실제 재발급·두 탭 동시 만료·bfcache·인앱 확인은 P4b
**변경**: `session-flag.ts`, `auth-handlers.ts`(단일 비행 + Web Locks + 결과 판정), `client.ts` `withSessionRecovery`(`api`만, 서버·공개 GET 제외), `meQuery` 결과 셋(세션/null/throw), `features/shared/auth`(LoginGate, useSession, registerAuth, handleSessionLost, LoginRequiredLink·useRequireLogin, useLogout), `utils/redirect.ts`. `(protected)`·`hosting` 레이아웃에 게이트. 자리표시 `/login`·`/login/expired`, 임시 `/gate-check`. mock: 재발급·로그아웃 핸들러, 만료 상태, `e2e/support/auth.ts` `setMockSession`, dev-mock `/api/__mock/{login,expire,logout}`. mock 백엔드의 Set-Cookie 여러 개 버그 수정
**완료 기준**: 10개 통과(4번 두 탭은 mock 잠금까지). typecheck · lint · prettier · test(245) · test:stories(187) · build · e2e(4) · qa auth-gate(15 통과, 수동 2) · qa home 통과. 리포트 `qa/reports/auth-gate/latest/index.html`
**결정**: tech-decisions §4 인증 "P4a 구현 기록"
**문서 반영**: tech-decisions §4, directory-structure(api·features/shared/auth·utils), plan P4a, qa-scenario 스킬(로그인 상태)

## P4b-L — 카카오 로그인 · 회원가입 · 재발급 연결 (로직)

**상태**: done (2026-10-22) — D2 스테이징 배포, 두 탭 실제 동시 만료, 카카오톡 인앱 실기기는 남음(D2 뒤)
**변경**: `src/api/auth/`(schema·calls), `authApi` 쿼리 옵션, `features/shared/auth/model/`(auth-outcome, login-redirect, register-form, finish-login, useKakaoLogin, useKakaoCallback, useRegisterForm), `LoginView`·`KakaoCallbackView`(최소 마크업), 라우트 `/login`·`/login/expired`·`/kakao/callback`. mock: 카카오 흐름 + 가짜 인증 화면(`/api/__mock/kakao/authorize` — 기존/신규/이메일 미동의/정지/state 불일치/동의 취소), 이름 붙인 실패 세트, SameSite 옵션(`MOCK_COOKIE_SAMESITE=Strict`). 테스트 도구 `src/test/requests.ts` `recordRequests()`(실제 보낸 요청·credentials 기록)
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 통과 | `useKakaoLogin.test`, `useKakaoCallback.test`, `auth-wiring.test`, `e2e/auth.spec.ts` |
| 신규/기존 분기 | 훅 "코드 교환(state 전달) → 신규 판정 → 로그인…", "신규 판정이면 프로필로 가입 폼…", e2e 기존·신규 로그인 후 원래 화면 복귀 |
| 비로그인 진입 → 로그인 → 원래 화면 | e2e(`/gate-check?tab=1` 복귀), login-redirect |
| 만료 → 재발급 → 정상 렌더 | e2e 만료(재발급 성공), auth-wiring, QA AUTH-3 |
| 정지·탈퇴 토큰 수렴, `USER_403_1` 안내 | e2e 2건, 훅, auth-wiring 2건 |
| 로그인·콜백 401 → "잠시 후" | e2e 2건, 훅 2건, auth-outcome 행 — **2026-10-25 분기 제거**(아래 "백엔드 변경으로 생긴 코드 수정 거리" #10, 401은 일반 실패) |
| bfcache | `e2e/auth-bfcache.spec.ts`(실제 복원 + pageshow 새로고침) |
| `AUTH_400_1` 재시작 | e2e, 훅 |
| 오픈 리다이렉트 차단 | e2e 4종, login-redirect it.each 9행, 훅 |
| SameSite=Strict 재현 | e2e "외부 링크로 보호 화면 → 카카오 로그인 → 복귀 직후 유지"(Lax 대조 실험으로 검증) |

에러 코드 행: `auth-outcome.test.ts` 15행.
**검사**: typecheck · lint · prettier · test(337) · test:stories(187) · build · e2e(36) · qa auth-gate(15, 수동 2) 통과
**결정**: tech-decisions §4 "P4b-L 구현 기록" — redirect는 sessionStorage, 성공 이동은 replace, 로그인 응답 미검사, 가입 동의 구성
**허들**: 받아 둔 백엔드 사본에 Kotlin 소스가 없어 `gh api`로 해당 파일만 읽음. Playwright Chromium은 bfcache가 꺼져 있음(§10). 이 세션의 P0 스파이크 서버 3개(13000~13002)가 남아 있어 정리
**문서 반영**: tech-decisions §4·§10, directory-structure, plan P4b, design-requests Q25, backend-questions B8

## P5b-L — 공연 상세 라우트 · 섹션 뷰어 (로직)

**상태**: done (2026-10-22) — 카카오 공유 디버거만 D2 뒤
**변경**: `/events/[eventId]`(Prefetch GP-3 + GE-5, `instant = false`, `generateMetadata` OG, 숫자 아닌 id·없는·준비중 → `notFound()`, 5xx → throw), `src/api/server/request-origin.ts`, `features/shared/section-viewer/model/`(render-section, sanitize-section-html, section-tabs), `features/audience/event/model/`(event-schedule "(120분)", hashtags, event-summary, event-metadata, event-share, event-id, useEventDetail), `features/shared/contact/model/contact-link`, `features/shared/kakao-share/model/`(feed-template, kakao-sdk). 최소 마크업 `EventDetailView`. mock: 운영 v1 본문 4건(개인정보 없는 것), `event-detail.handlers.ts` 세트. 의존성 `marked` 18.1.1, `sanitize-html` 2.18.1(+ types)
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `useEventDetail.test.tsx` 「GP-3·GE-5만 쿠키 없이 부르고, 재고(GP-5)는 부르지 않는다」 외 3건, e2e 「서버가 GP-3·GE-5를 조회해 그리고, 브라우저는 다시 조회하지 않으며…」 |
| 카카오 UA → OG가 `<head>`에 | e2e 「실제 카카오 UA로 요청하면 OG(제목·설명·이미지·URL)가 <head>에 있다」, 「주소의 앞 0을 떼어 canonical·og:url을 하나로」, 단위 「OG 메타데이터」 |
| 없는·준비중 공연 크롤러 404 / 브라우저 not-found | e2e 4건(없는 공연, 준비중, 숫자 아닌 id, not-found noindex) |
| 5xx → 크롤러 500 | e2e 2건(GP-3·GE-5) |
| v1 본문 변환 + XSS 차단 | `render-section.test.ts` 「v1 실데이터 샘플」, 「XSS 차단」 38종 × 형식 3개, e2e 「섹션 본문의 XSS 페이로드는…실행되지 않는다」 |
| 응답 HTML에 재고 값 없음 | e2e 「응답 HTML에 재고 값이 없다」, 단위 2건 |
| 카카오 공유 디버거 | **남음**(D2 뒤) |

**결정**: sanitize는 `sanitize-html`(tech-decisions §17 측정표). 연락처는 GP-3 `contacts`. `error.tsx`·`not-found.tsx`는 P4s-V
**확인 필요**: D2 nginx `Host` 헤더(deploy-plan §9 #0), 기본 OG 이미지(Q26)

## P6-L · P7-L — 티켓 선택 · 체크아웃 · 주문 생성 (로직)

**상태**: done (2026-10-22) — 스테이징 실제 주문 1회만 D2 뒤
**변경**: `src/api/order/`(CheckoutSchema O-0, MyOrderDetailSchema O-1·O-3, CreateOrderRequestSchema, checkoutQuery, myOrderQuery, createOrderMutation), `features/audience/event/model/`(ticket-state, useTicketSelection — GP-5 staleTime 0, 상한 = min(purchaseLimit, remaining, 100), 1주문 1종류 경고, `checkoutHref`), `features/audience/checkout/model/`(checkout-params, option-form — RHF + zod 2모드·`toOrderBody`, payment — 3분기·CTA·토스 링크, checkout-errors — patterns §24 P7 표, order-result, useCheckout — 중복 제출 방지·`setQueryData` 후 replace·재고 에러 뒤 GP-5·O-0 재조회). 라우트 `(protected)/events/[eventId]/checkout`, `(protected)/orders/[orderUuid]`(최소 마크업). mock: order(O-1이 백엔드 검증 순서·10초 중복 처리, 만든 주문을 O-3이 돌려줌, 금액은 `price.ts` 없이 백엔드 식으로 따로 계산), ticket-item 세트 7개
**선택 → 체크아웃**: `/events/[eventId]/checkout?ticketItemId=&quantity=`(수량 1..100만, 틀리면 상세로). 비로그인은 게이트 → 로그인 → 같은 주소로 복귀(e2e)
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| P6 MSW 시나리오 | `useTicketSelection.test.tsx`(15), `ticket-state.test.ts` |
| P6 매진·판매 불가·PAST | `ticketState` 15행, `ticketListState` 9행, 훅 4행 |
| P6 상한 | `toTicketView` 6행, 훅 「수량 경계: 0 → 1, 1, 상한, 상한+1 → 상한」 외 3건 |
| P7 MSW 시나리오 | `useCheckout.test.tsx`(37), `e2e/checkout.spec.ts`(5 × 2) |
| P7 옵션 2모드 본문 | option-form 4건, 훅(보낸 본문을 `CreateOrderRequestSchema`로 검증), schema.test |
| P7 총액 == `totalAmount` | 훅 「계약 — 클라이언트 총액 == 주문 응답 totalAmount」 5행 |
| P7 3분기 | 훅 3건, rules.test |
| P7 새로고침 같은 내용 | 훅, e2e(완료 직후 O-3 0건 → 새로고침 뒤 1건, 같은 예매번호·금액, 뒤로가기로 체크아웃에 안 돌아감) |
| P7 토스 링크 금액 | 훅 「링크 금액 = 화면 총액 = 응답 totalAmount」, rules.test 7행 |
| P7 재고 에러 뒤 GP-5 재조회 | 훅 3행(보낸 GET 확인, 상한 4 → 1) |
| P7 에러 분기 | rules.test 16행, 훅 12건 + 무료 선착순 3건 |
| 스테이징 실제 주문 | **남음**(D2 뒤) |

**결정**: 티켓별 옵션도 `options: { applyToAll: false, answers: [] }`를 같이 보낸다(tech-decisions §18 수정). PRICE·UNKNOWN 결제 방식과 v1 객관식 옵션 티켓은 판매 불가·체크아웃 차단. 이동이 있는 에러(`Event_400_5/6` 등)는 토스트 + replace. 체크아웃 안에서 수량 변경 가능(Q27). 토스 은행명은 계좌 값 그대로(B3 TODO)
**관제 수정**: 가짜 데이터 공연 101이 ONGOING(시작 지남)인데 티켓이 구매 가능이었다 — 백엔드 `isPurchasable`은 시작 전만 true(`V2TicketItemDomainService`)라 실제로는 `Event_400_6`. 101을 UPCOMING(2026.11.21)으로 바꾸고, 티켓 없는 104를 ONGOING 예시로 바꿨다. 판정은 서버 `isPurchasable`을 따르는 그대로 둔다
**검사**(P5b·P6·P7 합친 뒤): typecheck · lint · prettier · test(731) · test:stories(187) · build · e2e(72) 통과

## P5a-L · P5c-L — 공연홈 · 공연 리스트 · 호스트 홈 · 관심 호스트 (로직)

**상태**: done (2026-10-22)
**변경**: `src/api/host/`(HostMemberSchema GH-6, HostFollowSchema PH-13, `hostMembersQuery`, mutations follow·unfollow), `features/audience/home/model/`(event-list-filter — URL ↔ 필터·50자·50개, tag-panel, useEventList — `history.replaceState(null)` 얕은 교체, 검색어 300ms, `Event_400_23` → GE-11 재조회 + 태그 필터만 초기화), `features/shared/permission/model/can.ts`(api-contract §2 11행), `features/shared/host-home/model/`(host-home-rules — 준비중 공연은 `/hosting/events/{id}`, useHostFollow — 변경 `scope` 직렬화·마지막 응답만 반영, useHostHome — GH-14는 세션·viewer 확정 뒤 한 번만). 라우트 `(public)/page.tsx`(GP-1 `<Prefetch>` — 이전 GE-11 수직 슬라이스 대체), `(app)/events/page.tsx`, `(public)/hosts/[hostId]/page.tsx`(404·5xx 분기, 탭 제목만). `TagList` 제거. mock: host 핸들러 세트(`hostSets.viewAs` 등), `eventBrowseSets`
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| P5a MSW 시나리오 | `useEventList.test.tsx`(21), `event-list-filter.test.ts`, e2e `event-list.spec`·`home.spec` |
| P5a 서버 렌더·토큰 없음 | e2e 「서버가 GP-1을 조회해 그리고, 브라우저는 다시 조회하지 않는다」, 「로그인한 사용자가 열어도 서버 조회(GP-1)에는 토큰이 붙지 않는다」, 「GP-1이 5xx면 카카오 크롤러는 500」 |
| P5a URL 반영·복구 | 훅 「칩을 누르면 바로 주소에 반영…」, 「검색어는 입력 뒤 잠시 기다렸다…」, 「뒤로가기로 주소가 바뀌면…」 / e2e 「…새로고침과 상세 → 뒤로가기에서 그대로다」, 「필터를 바꿔도 기록이 쌓이지 않는다」 |
| P5a `Event_400_23` | 훅 「없는 태그 id면 GE-11을 다시 받고 태그 필터를 비워 다시 읽는다」, 「그 밖의 400은 필터를 건드리지 않고 error」 |
| P5c MSW 시나리오 | `useHostHome.test.tsx`(24), `host-home-rules.test.ts`, `host-api.test.ts`, e2e `host-home.spec` |
| P5c 5시점 노출 | 훅 it.each 5행, `can.test.ts`(11동작 × 3역할 + null·undefined·UNKNOWN) |
| P5c 서버 조회 토큰 없음 | e2e 「로그인(마스터)해도 서버 조회에는 토큰이 없고…」, 훅 「비로그인: 사용자별 요청을 하나도 보내지 않고…」 |
| P5c ♡ 연타 | 훅 it.each 「연타 1~4번: 요청은 순서대로 하나씩…」, host-api 「PUT은 두 번 보내도 200…」 |
| P5c 빈 ♡ 없음 | 훅 「세션이 확정되기 전에는 ♡·관리 버튼이 비활성…」, 「viewer 응답 전에는 ♡가 비활성이다」 외 2 |
| P5c 비로그인 ♡ → 로그인 → 복귀 | e2e 「비로그인 사용자가 ♡를 누르면 요청 없이 로그인으로 가고…」 |
| P5c 준비중 공연 링크 | 훅 「멤버는 viewer 키로 쿠키와 함께 한 번만 읽고…」, e2e 마스터 시나리오 |

**결정**: GH-14는 patterns §4-2대로 확정 뒤 한 번만(tech-decisions §4 표를 맞춤). viewer·세션 실패면 ♡·관리 비활성, 목록은 공개 키. 호스트 홈 메타는 `<title>`만. 새 공연 버튼 주소 `/hosting/new/events?hostId=`는 잠정(P11에서 맞춤). 멤버 버튼·D-n 배지는 design-requests Q28·Q29
**남음**: V 전부. `qa/scenarios/home.qa.ts`는 GP-1 기준으로 최소 수정만 — 캡처는 P5a-V에서 다시 쓴다

## P8-L · P8b-L · P8c-L — 티켓탭 · 선물 · 셀프 체크인 (로직)

**상태**: done (2026-10-22) — 카카오 가입 왕복·카톡 공유·`sms:` 실기기는 D2 뒤
**변경**: `src/api/my-ticket/`(T-1·T-2·T-3, state 11값·선물 4값 `openEnum`), `src/api/gift/`(+ mutations 6종, GG-7a `sentGiftTicketQuery`, GG-7 스키마만), `src/api/check-in/`(PQ-5 — P13b가 같은 스키마 사용). `features/audience/ticket/model/`(my-ticket-state, ticket-groups, useTicketTab — 선택은 묶음 안 인덱스, useTicketDetail — 열 때만 T-2/GG-7a, 받은 뒤 T-3·알림 무효화, 404면 목록 재조회 + `gone`), `features/audience/gift/model/`(landing-state 7종 + UNKNOWN, gift-errors §24 P8b, memo, share — 카카오 피드 템플릿 재사용, metadata — OG 요약·noindex, cache, refetch, useGiftActions, useGiftLanding), `features/audience/checkin/model/`(params, errors, useSelfCheckIn — StrictMode에서도 요청 1회), `features/shared/checkin-result/model/`(`'host' | 'self'`). 라우트 `(public)/gifts/[giftToken]`(토큰 모양이 틀리면 백엔드 호출 없이 404), `(protected)/tickets`, `(protected)/check-in`. mock: 상태를 가진 티켓 저장소(`fixtures/my-ticket.ts` — 보내기 → 랜딩 → 수락 → 티켓탭이 이어짐), gift·my-ticket·check-in 핸들러 세트. 테스트 도구 `src/test/login-fetch.ts`
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| P8 MSW 시나리오 | `useTicketTab.test`(16), e2e `tickets.spec` 3건 |
| state 11값 | 「티켓 state 11값 → 표시」 12행, 「서버 enum 11값이 모두 매핑에 있다」, 「모르는 state 문자열은 UNKNOWN…」 |
| 받은 묶음 [주문상세] 없음 | 「받은 티켓 묶음(orderUuid=null)에는 [주문상세]가 없다」(규칙·훅), 「받은 티켓 상세에는…」 |
| 선물 대기·취소 → 안내 | 「qrValue null + %s → 안내」 8행, 훅 5행, e2e 「선물 보내기 → … QR 대신 선물 대기 안내」 |
| 옛 uuid 404 | 「옛 uuid(IssuedTicket_404_1) → gone + 티켓탭 목록을 다시 읽는다」(GG-7a `Gift_404_1` 포함) |
| 진입만으로 공지 바 유지 | 훅 「들어가면 T-1·T-3만 부르고…」, 「카드를 열면 T-2를 한 번 부르고, 그 뒤 공지 바(T-3)를 다시 읽어 풀린다」, e2e 같은 흐름 |
| P8b MSW 시나리오 | `useGiftActions.test`(19), `useGiftLanding.test`(14), e2e `gift-landing.spec` 8건 |
| viewState 7종 | 「랜딩 viewState 7종 → 화면 상태」 11행, 「수락·거절 버튼은 AVAILABLE에만」 |
| 미가입 → 가입 → 명시적 수락 | 훅 「비로그인 → 로그인 → 같은 주소로 복귀: 자동 수락하지 않고…」, e2e(가짜 카카오) — 실제 왕복은 **남음**(D2 뒤) |
| `Gift_400_3` | 훅 「수락이 %s…」 4행, 「동시 수락으로 이미 처리됨…」, e2e |
| canGift·canReturn | 훅 it.each 「버튼 노출은 서버 플래그 그대로」 |
| 보낸 본인 수락 불가 | 「viewer 확정 전은 pending, 확정 뒤 OWN_LINK — …enabled인 적이 없다」, e2e |
| 에러 분기 P8b | 「에러 분기 — patterns §24 P8b 행」 19행 + 4행 |
| 랜딩 OG 개인정보 없음 | 「공연·티켓 요약만 — 보낸 사람 닉네임이 없고 noindex」, e2e 카카오 UA |
| P8c MSW 시나리오 | `useSelfCheckIn.test`(10), e2e `check-in.spec` 5건 |
| 비로그인 → 같은 URL | e2e 「비로그인 → 로그인 → 같은 URL(토큰 포함)로 돌아와 PQ-5」 |
| result 분기·`Event_400_26` | `checkin-result.test` 9행 + SELECT·UNKNOWN, 훅 INVALID_QR·OTHER_EVENT·ALREADY_ENTERED |
| 에러 분기 P8c | `checkin-rules` 6행, 훅 「고른 티켓이 남의 것…」, e2e EVENT_NOT_OPEN |

**결정**: 랜딩 noindex·og:url 없음, 토큰 모양 검사(tech-decisions §20). 수락 뒤 `/tickets`로 push. 회수 `Gift_400_3`은 T-2·GG-3 둘 다 다시 읽음. 알림 무효화 키 `['me','notifications']` 접두(patterns §21 — P9b가 따른다). 문구 없는 7종은 잠정 문구(design-requests Q30). T-3 비동기 읽음은 backend-questions B9
**의존성(V)**: `qr-code-styling`(QR 렌더), 링크 복사 유틸
**검사**(P5a/P5c·P8 계열 합친 뒤): typecheck · lint · prettier · test(1036) · test:stories(187) · build · e2e(132) 통과

## P9-L — 마이페이지 (로직)

**상태**: done (2026-10-25, 커밋 `0022755`) — V 전부와 실서버 확인 남음
**변경**: `src/api/me/`(+ `mutations.ts` `updateMeMutation` PM-2, `followingHostsQuery` GM-4 `FOLLOWING_HOSTS_KEY`·`archiveQuery` GM-5, 스키마), `src/api/order/`(`myOrderQuery` O-3·`myOrdersQuery` O-2, `cancelMyOrderMutation` O-4·`putRefundAccountMutation` O-5, 스키마), `src/api/refund/`(새 — `banksQuery` `GET /api/v2/banks` 공개·`staleTime` 1시간, `BankSchema`), `src/api/user/calls.ts`(새 — `withdrawAccount`: v1 `DELETE /api/v1/auth/me`를 `withSessionRecovery`로). `features/audience/mypage/model/`: `order-status`(`orderStatusView` — 상태 5종 × `refundStatus` 한 매핑, 목록·상세 공용), `order-detail`(`cancelEntry`·`giftBlocksCancel`·`GIFT_BLOCKS_CANCEL_MESSAGE`·`refundAccountEntry`·`REFUSE_REASON_LABEL`·`refuseReasonText`·`orderAmounts`·`optionMode`·`cancelNotice`·`cancelResult`·`isPaidOrder`), `order-errors`(`CANCEL_ERROR_TABLE`·`REFUND_ACCOUNT_ERROR_TABLE`·`messageAfterCancelBlocked`), `refund-account-form`(`refundAccountDefaults`·`refundAccountErrors`·`toRefundAccountBody` — `bankCode`만), `profile`(`nicknameError` 2~7자·`PROFILE_ERROR_MESSAGE`), `lists`(`FOLLOWING_TABS`·`representativeBadge`·`archiveOrderHref`·`archiveYearTabs`), 훅 `useMyOrders`·`useOrderDetail`·`useCancelOrder`·`useRefundAccount`·`useOrderHostContacts`·`useProfileEdit`·`useFollowingHosts`·`useArchive`·`useWithdraw`(`WITHDRAW_MASTER_MESSAGE`). 화면 자리(로직 연결만): `MyPageView`·`OrdersView`·`OrderDetailView`·`FollowingHostsView`·`ArchiveView`. 라우트 `(protected)/mypage`·`mypage/following`·`mypage/archive`·`orders`(+ `orders/[orderUuid]` 수정). mock: `fixtures/mypage.ts`·`fixtures/order.ts`(P9 주문 시드 `P9_ORDER`), `me.handlers`(프로필·관심 호스트·아카이빙)·`order.handlers`(O-2·O-3·O-4·O-5 + 실패 세트 `cancelFails`·`refundAccountFails`)·`user.handlers`(새 — `default`·`masterBlocked`)
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `useOrders.test`(주문내역·주문상세·취소·환불 계좌·호스트 문의), `useMyPage.test`(프로필·관심 호스트·아카이빙·탈퇴), `mypage-rules.test`, `me/schema.test`, `order/schema.test` 「P9 주문 스키마」, e2e `mypage.spec` 11건 |
| 상태 5종 + `refundStatus` 매핑 하나 | `mypage-rules` 「주문 상태 5종 × refundStatus → 표시(목록·상세 공용 매핑 하나)」(it.each + 「서버 enum 5종 × 3종 + UNKNOWN 조합이 모두 라벨을 갖는다」), 훅 「첫 페이지를 쿠키와 함께 읽고, 행마다 상태 라벨이 주문상세(O-3)와 같은 매핑에서 나온다」 |
| `canCancel`·`canEditRefundAccount`로만 노출 | 훅 it.each 「버튼 노출은 서버 canCancel로만: %s」, `mypage-rules` 「환불 계좌 입구 — canEditRefundAccount · 유도 refundAccountRequired」 |
| 탈퇴 `USER_400_6` | 훅 「에러 분기 USER_400_6 → "마스터를 양도한 뒤 탈퇴해 주세요", 이동 없음, 토스트 없음」, 「성공하면 캐시와 dd:session을 지우고 홈으로 하드 이동한다」 |
| 아카이빙 `orderUuid=null` | `mypage-rules` 「아카이빙 orderUuid=null이면 주문상세 주소가 없다」, 훅 「전체(year 없음)로 읽고, 연도 탭은 응답 years, orderUuid=null이면 주문상세로 가지 않는다」, e2e 「orderUuid가 없는 공연은 주문상세로 가지 않고, 있는 공연은 그 주문상세로 간다」 |
| 유료 = 계좌 → 환불 요청, 무료 = 즉시 취소 | 훅 「유료: 계좌 값 없이 부르면 요청하지 않고 refundAccountMissing(계좌 시트)」, 「유료: 칸 오류면 요청하지 않는다」, 「유료: 계좌를 넣으면 목록에서 고른 bankCode로 O-4 → 환불 요청 상태, 상세 캐시·주문내역·티켓탭 갱신」, 「무료: 본문 없이 O-4 → 바로 취소」, 규칙 「유료 취소는 환불 계좌가 필요하고, 무료는 필요 없다」, it.each 「취소 결과: %s + %s → %s」 |
| 남의 주문 → 공용 404 | 훅 「남의(없는) 주문 주소면 공용 404 안내」, e2e 「남의(없는) 주문 주소는 공용 404 안내」 |
| 선물 안내 조건 | `mypage-rules` 「주문취소 자리 — canCancel · 선물 안내 조건(patterns §20)」 8행 + 「giftBlocksCancel: %s → %s」, 훅 「경합 Order_400_24: O-3을 다시 읽고, 다시 읽은 주문이 선물 조건이면 선물 안내 — [주문취소] 자리도 안내로 바뀐다」, e2e 「선물 대기 티켓이 있는 주문은 [주문취소] 대신 선물 안내」 |
| 환불 계좌 유도·`maskedAccountNumber` 갱신 | 훅 「유료 거절: 입력 유도 → PUT(bankCode만) → maskedAccountNumber가 생기고 유도가 꺼진다」, 「입금 미확인 거절은 입구만 있고 유도가 없다」, 「수정: 처음 값은 은행·예금주만(계좌번호는 다시 입력), 저장하면 마스킹 값이 바뀐다」 |
| 프로필 이미지 PM-3 → S3 → PM-2 → GM-1 | 훅 「이미지: PM-3 발급 → S3 PUT → PM-2 {profileImageKey} → 세션 키의 profileImageUrl이 바뀐다」, 「에러 분기 USER_400_5(본인 이미지 아님) → 안내, retry()는 같은 파일로 PM-3 발급부터 다시」, 「기본 이미지로: PM-2 {profileImageKey: ""} → profileImageUrl null」 |
| 관심 호스트 해제 | 훅 「해제하면 DELETE 뒤 모든 필터의 목록에서 빠지고, 목록을 다시 읽지 않는다」, 「호스트 홈 viewer 캐시가 있으면 isFollowing도 맞춘다」 |
| 호스트 문의 GP-3 쿠키 | 훅 「시트를 열기 전에는 요청이 없고, 열면 GP-3을 쿠키와 함께 한 번 읽어 원문 연락처를 준다(공개 GP-3은 부르지 않는다)」, 「삭제된 공연(eventId null)이면 요청하지 않고 문의 입구가 없다」, e2e 「호스트 문의는 열 때 GP-3을 쿠키와 함께(브라우저) 한 번 읽는다」 |
| 본문 `bankCode` | `mypage-rules` 「보내는 본문: 앞뒤 공백을 지우고 bankCode만(bankName 없음), 요청 스키마를 통과한다」, 훅 「은행 목록을 받았으면 목록에 없는 코드는 요청 없이 칸 오류」, 「옛 자유 입력 계좌(bankCode null)는 은행을 비워 목록에서 다시 고르게 한다」 |
| 삭제된 공연(`event: null`) | 훅 「삭제된 공연(event: null)이어도 깨지지 않고, 취소 입구·호스트 문의가 없다」, 「삭제된 공연의 주문도 행으로 나오고 eventRemoved」, e2e 「삭제된 공연의 주문상세는 공연 정보 없이 열리고 취소·문의 입구가 없다」 |
| 에러 분기 §24 P9 | `mypage-rules` 「에러 분기 — patterns §24 P9 행」(취소 5행·환불 계좌 3행 + 2), 훅 it.each 「에러 분기 %s → O-3 다시 읽기 + "%s"(토스트 없음)」 3행, 「에러 분기 Order_400_25(계좌 없음) → 다시 읽지 않고 refundAccountMissing(계좌 시트)」, 환불 계좌 it.each 3행, 「표에 없는 코드(Order_404_1)는 전역 토스트로 간다」, 프로필 「에러 분기 USER_400_4(공백만) → 칸 오류, 토스트 없음」 |

**결정**: 호스트 문의는 viewer만 읽기(`useOrderHostContacts` — 보호 화면이라 세션 확정 뒤, 열 때 쿠키 GP-3 한 번. 공개 GP-3은 부르지 않는다. `useEventContacts`는 프리페치 전제의 `useSuspenseQuery`라 쓰지 않음, patterns §20). 탈퇴는 `authApi`가 아니라 `withSessionRecovery`로 감싼 v1 DELETE(보호 API라 만료 쿠키면 401 → 재발급 후 한 번 다시, tech-decisions §4). 성공하면 캐시·`dd:session` 정리 뒤 홈으로 하드 이동. 환불 계좌 본문은 `bankCode`만 보내고 `bankName`은 생략(서버가 채운다). 은행 목록은 `src/api/refund`에 두었다 — P12 티켓 폼과 공유할 때 `src/api/bank`로 옮길지는 미정. 관심 호스트 탭 라벨("전체 / 공연 예정 / 지난 공연만")·거절 사유 라벨("입금 미확인 / 결제 금액 오류 / 티켓 매진")은 잠정(design-requests)
**남음**: V 전부. 실서버 확인 — 탈퇴 응답 래퍼(본문 `data` null 가정), `bankName` 생략 요청이 통과하는지. mock 정합성: 티켓탭 fixture(`fixtures/my-ticket.ts`)의 `mock-order-tickets-*` 주문이 O-3 mock에 없어 티켓탭 [주문상세]로 가면 404 — 맞출 거리

## P9b-L — 알림 (로직)

**상태**: done (2026-10-25, 커밋 `0022755`) — V 전부 남음. 호스트 주문 알림의 `?order=` 진입 검증은 P13a-L과 나눔
**변경**: `src/api/notification/`(새 — `schema.ts` 17종 `openEnum`·대상 4종·`extra` 값 `string | null`, `queries.ts` `NOTIFICATIONS_KEY`·`unreadNotificationCountQuery`(GN-2, `meta.silent`)·`NOTIFICATIONS_INFINITE_KEY`·`notificationsQuery`(GN-1), `mutations.ts` `readNotificationsMutation`(PN-3)). `src/api/query-client.ts` `shouldToastQueryError`에 세 번째 인자 `meta`(`meta.silent`면 토스트 없음). `features/shared/notification/model/`: `notification-kind`(`NOTIFICATION_CATEGORIES`·`notificationCategory`·`notificationAudience`·`isApprovalNotification`·`notificationHref`·`toNotificationView`·`readRequestOf`), `useNotificationBell`(벨 — S7, P9b-L이 먼저 만들었다), `useNotificationInbox`, `useReadNotifications`. 화면 자리 `NotificationInboxView`, 라우트 `(protected)/mypage/notifications`. mock: `fixtures/notification.ts`, `notification.handlers`(`default`·`empty`·`listServerError`·`countServerError`·`readServerError`)
**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `useNotification.test`(벨·알림함), `notification-rules.test`, `notification-api.test`, e2e `notifications.spec` 6건 |
| 17종 매핑·모르는 타입 | `notification-api` 「백엔드 알림 17종을 모두 안다(#810 리마인더 2종 포함)」, 「대상은 HOST · ORDER · GIFT · EVENT 4종」, 「extra 값이 null이어도(서버가 null 사유를 그대로 직렬화) 읽는다」, `notification-rules` 「알림 17종 → 카테고리·아이콘(plan P9b, Q13)」 it.each + 「17종 모두 UNKNOWN이 아닌 카테고리 3종 중 하나로 간다」, 「문구는 서버 title·body 그대로, 모르는 타입도 깨지지 않는다」, 훅 「모르는 타입·모르는 대상이 와도 깨지지 않고 기본 아이콘 + 서버 문구로 나온다」 |
| 벨 `count > 0`·PN-3 뒤 갱신 | 훅 「로그인하면 GN-2(쿠키 포함)를 읽고 count > 0이면 빨간 점」, 「안 읽은 알림이 0이면 빨간 점이 없다」, 「비로그인이면 GN-2를 부르지 않고 벨을 그리지 않는다」, 「GN-2가 실패하면 빨간 점 없이 둔다(벨은 화면을 막지 않는다)」, 「벨 조회(GN-2)는 배경 재조회가 실패해도 전역 토스트를 띄우지 않는다(meta.silent)」, 「refresh()는 GN-2를 다시 읽는다(메뉴·드로어 진입)」 |
| 읽음 뒤 `unreadCount`로 벨 | 훅 「승인 알림을 누르면 PN-3 {notificationIds:[id]} → 행은 바로 읽음, 벨은 응답 unreadCount로, 티켓탭 공지 바가 풀린다」, 「모두 읽음은 PN-3 {readAll:true} → 불러온 행이 모두 읽음, 벨 0, 공지 바 다시 읽기」, 「PN-3이 실패하면 이 요청이 바꾼 행만 안 읽음으로 되돌리고 벨은 그대로」, 「이미 읽은 알림을 누르면 PN-3을 보내지 않는다」, `notification-api` 「GN-2 안 읽은 수와 PN-3 응답 {updatedCount, unreadCount}」, e2e 「모두 읽음은 PN-3 {readAll:true}, 다시 들어와도 모두 읽음」 |
| 승인 알림 → 공지 바 해제 | `notification-rules` 「승인 알림(ORDER_APPROVED)만 티켓탭 공지 바를 푸는 알림이다」, 훅 「알림을 누르고 바로 알림함을 떠나도(언마운트) 벨과 공지 바가 갱신된다」, 「승인 알림이 아닌 알림을 읽으면 공지 바(T-3)를 다시 읽지 않는다」, e2e 「승인 알림을 누르면 PN-3 단건 → 주문상세로, 티켓탭 공지 바가 풀려 있다」 |
| `target.type` 4종별 이동 | `notification-rules` 「알림을 누르면 갈 곳 — target.type별(Q1 기본안 + #810)」 13행, 훅 「target.type 4종별 이동 경로가 행에 붙는다」, e2e 「target.type별 이동 — EVENT → 공연 상세, GIFT → 티켓탭, HOST → 호스트 홈」, 「호스트가 받은 주문 알림은 예매자 관리 ?order= 링크(진입 검증은 P13a)」 |

그 밖: 알림함 무한 스크롤 「첫 페이지(20건)를 읽고 다음 페이지는 page=1로 — 건수 UI 없이 hasNext로 끝난다」, 「다음 페이지가 실패하면 기존 행을 지우지 않고 nextPageFailed → fetchNext로 다시」, 「알림이 없으면 빈 상태」, e2e 「비로그인이면 로그인으로 가고 돌아올 곳은 알림함」, 「로그인하면 200, GN-1은 브라우저에서만 첫 페이지부터」.

**결정**: 키 구조 `['me','notifications','unread-count']`·`['me','notifications','infinite',{size}]`(patterns §21). 읽음 요청은 같은 `scope`로 순서대로 보내고, 캐시 반영은 `useMutation` 옵션에 둔다(언마운트 뒤에도 벨·공지 바 갱신). 벨 조회는 `meta.silent`로 배경 재조회 실패 토스트 없음(patterns §4-5). 호스트 주문 알림 4종(`ORDER_PENDING_APPROVE`·`ORDER_REFUND_REQUESTED`·`ORDER_CANCELED_BY_USER`·`REFUND_ACCOUNT_CHANGED`) → `/hosting/events/{eventId}/guests?order={uuid}`(eventId null이면 이동 없음). 모르는 타입 + `ORDER` 대상은 이동 없음. `EVENT` 대상 eventId null이면 `targetId`로 공연 상세. `GIFT_TICKET_CANCELED`는 티켓선물 안내로 묶음, 공연 알림 아이콘 `alarm-clock`은 아이콘 세트에 없음 — 둘 다 design-requests 확인 요청
**정리할 거리**: `NOTIFICATIONS_KEY`가 `src/api/notification/queries.ts`와 `features/audience/gift/model/gift-cache.ts` 두 곳에 같은 값(`['me','notifications']`)으로 정의돼 있다 — 하나로 정리
**남음**: V 전부. 호스트가 받은 주문 알림의 `?order=` 진입 검증은 P13a-L(이 Phase는 링크까지)
**검사**(P9-L · P9b-L 통합 뒤): typecheck · lint · prettier · test(1402) · test:stories(193) · build · e2e(174) 통과
**문서 반영**: plan P9·P9b·S7·API 표, patterns §4-5·§20·§21, design-requests Q1·Q13·새 확인 요청, directory-structure(api·features·라우트), tech-decisions §4

## 2026-10-25 연락처 마스킹 대응(A안)

백엔드 #846(공개 GP-3·GH-3가 비로그인에게 전화·이메일을 가린다)에 맞춘 코드 수정. 사용자 결정 A안: 연락처는 사용자별 값이고, 서버 조회는 그대로 토큰 없이 하며, 로그인 사용자는 쿠키로 다시 읽은 원문을 쓴다. 가린 값은 링크로 만들지 않는다(관제 확인 내용을 옮김).

- **공연 상세**: `eventDetailViewerQuery(eventId)` — 키 `['events', id, 'viewer']`, 쿠키, 프리페치 안 함, `staleTime` 0(`src/api/event/queries.ts`). `useEventContacts(eventId, {open})` → `{status: idle|pending|ready|error, items, masked, retry}`(`src/features/audience/event/model/useEventContacts.ts`). 요청 조건은 `open && 세션 있음`, 익명은 요청 없이 공개(가린) 값. 한 번 받은 원문은 닫아도 유지.
- **호스트 홈**: 로그인 사용자에게 이미 부르는 `hostViewerQuery`(GH-3 쿠키) 응답에서 연락처를 읽는다(추가 요청 없음 — "시트를 열 때"가 아니라 viewer 확정 때). `useHostHome().contacts`는 `ContactsState`(`src/features/shared/contact/model/viewer-contacts.ts`의 `resolveContacts`).
- **`contact-link.ts`**: `masked` 필드, `isMaskedContact`(`PHONE`·`EMAIL` 값에 `*`) → `href: null`. 알려진 한계: 원문 이메일 아이디에 `*`가 있으면 가린 값으로 오판한다(백엔드가 가림 여부를 따로 주지 않는다).
- **미확인 구간**: 만료 액세스 쿠키로 viewer를 부르면 #792 때문에 익명 200(가린 값) → `masked: true`인 `ready`, 재발급 없음. 실제로 생기는 구간인지 확인하지 않았다(tech-decisions §4).
- GH-3 `members[]`(#811)는 프론트 스키마에 없고 쓰지 않는다(멤버 줄은 GH-6).
- **mock**: `src/api/__mocks__/privacy-mask.ts`(백엔드 `PrivacyMasker` 이식). GP-3·GH-3 핸들러가 익명·만료면 가린 값을 준다.

| 기준 | 테스트 |
|---|---|
| 가린 값은 링크 없음 / 원문은 링크 | `contact-link.test` 가림 14행 + 원문 4행 |
| 마스킹 형식이 백엔드와 같음 | `privacy-mask.test` 백엔드 기대값 21행 |
| 공연 상세 연락처 상태 | `useEventContacts.test` |
| 호스트 홈 연락처 상태 | `useHostHome.test` |
| 화면 흐름 | e2e `event-detail` 「공연 상세 — 문의처(사용자별 값)」 2건 |

**검사**: test(1087) · test:stories(187) · e2e(136) 통과(관제 확인).

## 2026-10-25 백엔드 변경으로 생긴 코드 수정 거리

백엔드 `dev` `24aa595` → `432cce4`(PR 32개), 백엔드 Develop 기획서(2026-10-25), v1 프론트 운영(Front #345~#370) 대조로 나온, **이미 구현된 코드**에 필요한 수정 목록이다. 이 단계에서는 문서만 고쳤고 코드는 고치지 않았다(A안 항목만 위 절에서 완료). 아직 구현하지 않은 Phase의 일은 plan 각 Phase에 넣었다. **#4~#18은 커밋 `939a1e0`에서 처리했다** — 아래 "2026-10-25 백엔드 `432cce4` 따라가기" 절.

| # | 파일 · 심볼 | 이유 | 근거 PR | 상태 |
|---|---|---|---|---|
| 1 | `src/features/audience/event/model/useEventDetail.ts`, `src/features/shared/host-home/model/useHostHome.ts`, `src/api/event/queries.ts` | 공개 쿼리의 `contacts`가 비로그인 값(가린 값)이라 로그인 사용자에게도 가린 값이 보였다 | #846 | **완료(A안)** — 위 절 |
| 2 | `src/features/shared/contact/model/contact-link.ts` `hrefOf` | 가린 이메일 `ab***@gmail.com`이 `EMAIL` 정규식을 통과해 `mailto:` 링크가 됐다 | #846 | **완료(A안)** |
| 3 | `src/api/__mocks__/event.handlers.ts`·`host.handlers.ts`(가림), `event-detail.handlers.ts`(viewer 5xx 시나리오) | 익명 요청에 가린 연락처를 주지 않았다 | #846 | **완료(A안)** |
| 4 | `src/api/gift/schema.ts` `GIFT_CANCEL_REASONS` | 선물 `cancelReason`에 `ADMIN`(운영자 강제 회수)이 생겼다. 지금은 `openEnum`이 `UNKNOWN` + warn 로그로 받는다(깨지지는 않는다). `ADMIN`을 더한다 | #826 | **완료** |
| 5 | `src/api/auth/schema.ts` `RegisterBody`, `src/features/shared/auth/model/register-form.ts` | 가입 본문에 `termsAgreed`(이용약관 체크 값)·`ageOver14Confirmed`·`agreementVersion`이 없다(`marketingAgree`만). 만 14세 확인 칸은 v2 계획에 없다(design-requests Q42) — 동의 항목은 v2 계획 그대로 | #840·#850 | **완료** — `termsAgreed`만(만 14세는 Q42라 미전송) |
| 6 | `src/api/order/schema.ts` `CreateOrderRequestSchema`(`z.strictObject`), `src/features/audience/checkout/model/option-form.ts` | 주문 본문에 `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`·`agreementVersion`을 넣을 수 없다(strict라 스키마 확장 필수). 값을 만들 칸은 design-requests Q42 | #840 | **완료** — 스키마만, 화면 칸이 없어 안 보냄(Q42) |
| 7 | `agreementVersion` 상수 | v2는 앱 하나라 상수 하나(`'2026-10'`)로 둔다. v1은 티켓 앱 상수와 어드민 하드코딩 두 곳(Develop 기획서 "두 곳 모두 올린다") | #840 | **완료** |
| 8 | `src/api/__mocks__/auth.handlers.ts`·`order.handlers.ts` | 동의 강제 400 `Agreement_400_1` 시나리오가 없다 | #840 | **완료** |
| 9 | `src/api/__mocks__/respond.ts` `errors.noToken`(L37-38)·주석(L17), `src/api/__mocks__/me.handlers.ts` 주석, 테스트(`http.test.ts`, `auth-handlers.test.ts`, `errors.test.ts`, `auth-wiring.test.tsx`, `auth-outcome.test.ts`, `__mocks__/handlers.test.ts`) | 토큰 없음이 `fail(403, 'AUTH_403_2', …, 401)`이다 → 실제는 HTTP 401 + 본문 401 `AUTH_401_2`. 런타임 분기는 HTTP 상태 기준이라 동작 영향은 없다 | #808 | **완료** |
| 10 | `src/api/auth-handlers.ts` `STALE_ACCESS_CODES`(L29)·재시도 분기(L87), `src/features/shared/auth/model/auth-outcome.ts` `retryLater`(L8·L19) | 재발급·로그인 콜백의 401(낡은 액세스 쿠키)은 #792로 더 이상 오지 않는다. 동작상 무해 — 남길지(방어) 지울지 정한다. 주석의 근거(B6)는 고친다 | #792 | **제거** |
| 11 | `src/api/__mocks__/auth.handlers.ts` 시나리오 `kakaoLinkStaleAccess`·`kakaoExchangeStaleAccess`·`kakaoLoginStaleAccess`·`refreshStaleAccess`·`logoutStaleAccess` | 백엔드에 더는 없는 응답을 흉내 낸다. 대신 "보호 API + 위조 쿠키 → 401 `GLOBAL_401_1` + `accessToken` 삭제 `Set-Cookie`" 시나리오가 없다 | #792·#793 | **완료** |
| 12 | `src/api/__mocks__/respond.ts` `errors.refreshRejected` 주석 | 사유 "다른 기기에서 덮어씀"이 #807로 없어졌다(기기별 세션) | #807 | **완료** |
| 13 | `src/api/order/schema.ts` `AccountSchema`·`MyRefundAccountSchema`, `src/api/__mocks__/fixtures/order.ts` | 응답 `bankCode`가 없다(z.object라 파싱은 깨지지 않는다) | #804 | **완료** |
| 14 | `src/features/audience/checkout/model/payment.ts` `tossTransferLink`(TODO(B3), `bank: account.bankName.trim()`) | B3 해결 — 토스 은행 값을 `bankCode` 매핑으로 만들고 `bankCode`가 `null`이면 토스 버튼을 숨긴다. 매핑 값은 실기기 확인(P7) | #804 | **`bankCode` 수신만, 매핑 TODO(B3)** |
| 15 | `/api/v2/banks` mock 핸들러 | 없다(P9 환불 계좌·P12 티켓 폼에서 필요) | #804·#813 | **완료** — 해소(P9-L `banksQuery`가 이 mock으로 테스트, 커밋 `0022755`) |
| 16 | `public/term.html`·`public/privacy.html` | 개정 전 약관이다(v1 #355 직전 파일과 바이트 동일, 2026-10-25 비교). 2026-10-25 시행 개정본(Front #355, `release/ticket` `fc3278d`)으로 교체. `next.config.ts`의 `/meta/term`·`/meta/privacy` rewrite는 이미 있다 | Front #355 | **완료** |
| 17 | `public/no-poster.png` | v1 운영은 포스터 로드 실패 때 `/no-poster.png`로 바꾼다(Front #348). v2 `public/`에 자산이 없다(참고 — 쓸지는 V, design-requests Q26) | Front #348 | 참고(Q26 대기) |
| 18 | `src/api/host/schema.ts` `HostDetailSchema` 주석(L14-17 "공개 필드") | `contacts`가 공개 필드가 아니게 됐다 — 주석 정리 | #846 | **완료** |

`src/api/my-ticket/schema.ts`의 `event` nullable(#789)과 체크인 `result` 5종(#798)은 이미 맞다.

**mock 정합성 메모(P9-L 뒤)**: 티켓탭 fixture(`src/api/__mocks__/fixtures/my-ticket.ts`)의 `mock-order-tickets-a`~`d` 주문이 O-3 mock(`fixtures/order.ts`)에 없어, mock에서 티켓탭 [주문상세]로 가면 404다 — 두 fixture를 맞출 거리(코드 미수정).

## 2026-10-25 백엔드 `432cce4` 따라가기 (커밋 `939a1e0`)

위 표 #4~#18의 처리. 원칙은 "백엔드에 없는 응답은 흉내 내지 않고, 사용자가 체크하지 않은 동의는 보내지 않는다"이다.

- **동의 기록(#5~#8)**: `src/api/shared/agreement.ts` — `AGREEMENT_VERSION = '2026-10'`(상수 한 곳), `agreementFields({...})`는 `true`인 것만 남기고 하나라도 있으면 `agreementVersion`을 붙인다(없으면 빈 객체). 가입 `toRegisterBody`는 이용약관 체크를 `termsAgreed`로 싣는다. 만 14세(`ageOver14Confirmed`)는 화면 칸이 없어 보내지 않는다(TODO(Q42)). 주문 `CreateOrderRequestSchema`는 `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`(`z.literal(true).optional()`)·`agreementVersion`(50자)을 받고, 동의 필드와 `agreementVersion`이 짝이 안 맞으면 스키마 실패. `toOrderBody`는 칸이 없어 동의 필드를 보내지 않는다(TODO(Q42)). mock 세트 `authHandlers.registerAgreementEnforced`·`orderHandlers.agreementEnforced`(400 `Agreement_400_1`) — 강제가 켜지면 지금 본문은 가입 = 일반 실패, 주문 = 전역 토스트(patterns §24).
- **낡은 액세스 쿠키(#10·#11)**: `auth-handlers.ts`의 재발급 재시도(`STALE_ACCESS_RETRY_MS`·코드 집합)를 지웠다 — 재발급 4xx는 401 포함 모두 세션 상실. `classifyAuthFailure`의 401 분기를 지웠다 — 로그인 링크 발급·콜백·가입 제출의 401은 일반 실패 `failed`. mock은 `*StaleAccess` 세트 5개를 지우고 세션 상태에 위조(`accessToken=forged` → 보호 경로만 401 `GLOBAL_401_1` + 쿠키 삭제 `Set-Cookie`, `errors.invalidToken`)를 더했다. 공개 GET·재발급·OAuth·로그아웃은 만료·위조 쿠키에도 익명 통과. e2e `setMockSession(page, 'forged')`.
- **토큰 없음(#9)**: `errors.noToken`이 HTTP 401 + 본문 401 `AUTH_401_2`. 주석·테스트 이름을 맞췄다. 런타임 분기는 HTTP 상태라 동작 변화 없음.
- **은행(#13~#15)**: `BankCodeSchema`, `AccountSchema`·`MyRefundAccountSchema`에 `bankCode`(nullable, 키 누락은 계약 위반). fixture 계좌 `bankCode: '088'`. `bankHandlers`(`GET /api/v2/banks`, 25개 배열, 기본 목록). 토스 링크는 아직 `bankName` — `bankCode` → 토스 값 매핑과 null일 때 버튼 숨김은 근거 있는 매핑 표가 없어 실기기 확인(P7) 뒤(TODO(B3)).
- **그 밖**: 선물 `GIFT_CANCEL_REASONS`에 `ADMIN`(#4). `respond.ts` `refreshRejected` 주석(#12, 기기별 세션). `HostDetailSchema` 주석(#18). `public/term.html`·`privacy.html`을 2026-10-25 시행 개정본으로 교체(#16). #17(`no-poster.png`)은 참고로 남김(Q26).

| 기준 | 테스트 |
|---|---|
| 동의 필드는 체크한 것만, 버전은 그때만 | `agreement.test` 「동의 기록 필드(#840·#850) — 사용자가 체크한 것만…」(버전 상수 + 5행) |
| 가입 본문 `termsAgreed`만 | `register-form.test` it.each(이용약관 체크 → `termsAgreed` + 버전 / 미체크 → 키 없음) |
| 가입 동의 강제 400 | `useKakaoCallback.test` 「동의 강제가 켜진 백엔드(Agreement_400_1 — 만 14세 미전송)면 일반 실패로 남고 이동하지 않는다」 |
| 주문 스키마 동의 필드·`bankCode` | `order/schema.test` — 버전 짝 실패 4행·통과 행, `bankCode` 2행 + 키 누락 실패 |
| 주문 본문에 동의 필드 없음·강제 400 | `useCheckout.test` 「동의 기록 필드(#840) — 화면 칸이 없어 보내지 않는다(Q42)」 2행, 「동의 강제가 켜진 백엔드면 400 Agreement_400_1 — 화면 표에 없어 전역 토스트, 완료로 가지 않는다」 |
| 낡은 액세스 쿠키(#792·#793) — 보호 경로만 401 | `__mocks__/handlers.test` 「낡은 액세스 쿠키(#792·#793)…」(쿠키 없음 `AUTH_401_2` / 만료 `AUTH_401_1` / 위조 `GLOBAL_401_1` + 쿠키 삭제, 공개·재발급·로그아웃 익명 통과), 은행 목록 25개·코드 9행·위조 쿠키 200 |
| 재발급 401은 재시도 없이 상실 | `auth-handlers.test` 「재발급의 401은 다시 시도하지 않고 상실(#792…)」 3코드 |
| 로그인 401 → 일반 실패 | `auth-outcome.test` 401 3코드·`SessionLostError` → `failed`, `useKakaoLogin.test`·`useKakaoCallback.test` 만료·위조 쿠키 it.each |
| 토큰 없음 `AUTH_401_2` | `http.test` 「본문 status가 HTTP 상태와 달라도 HTTP 상태를 쓴다…」, `errors.test`, `auth-wiring.test` 정지·탈퇴 행 |
| 선물 `ADMIN` | `gift/schema.test` 「선물 취소 이유(cancelReason)」 6행 + GiftResult |
| 토스 링크 `bankCode` 영향 없음 | `rules.test` `bankCode` 2행(088·null) |
| 화면 흐름 | e2e `auth.spec` 「낡은(위조) 액세스 쿠키가 남아 있어도 링크 발급·콜백은 익명으로 통과해 로그인된다(#792)」, 「위조 액세스 쿠키(401 GLOBAL_401_1 + 쿠키 삭제)면 재발급 뒤 화면이 정상 렌더(#792)」, `legal.spec` `/meta/term`·`/meta/privacy` 200 + 2026-10-25 개정본 |

**문서 반영**: api-contract §4·§6·§7·§9, tech-decisions §4 인증·§19·§24, patterns §5-1·§24, plan P4a·P4b·P7·P12, backend-questions B6·예정 변경 표, directory-structure(api), storyboard.

## 2026-10-25 디자인 시스템 변경으로 생긴 코드 수정 거리

디자인 시스템 파일(`0QD9tGSt8ZciDqe7ol2gYH`) 2026-10-25T09:12Z 판과 10-14T17:51Z 판(design-system.md 작성 직전)의 비교([`design-system.md`](./design-system.md) 머리말·§7 "디자인 시스템 반영(2026-10-25)")에서 나온, **이미 구현된 `src/ui`(P1·P2)** 의 수정 목록이다. 이 단계에서는 문서만 고쳤고 코드는 고치지 않았다. **#1~#9는 커밋 `456e5f2`에서 처리했다**(아래 표 상태, 끝의 "처리" 문단). 지금 `src/features`·`src/app`은 아래 컴포넌트(Tabs·Fab·Button `tonal`·Chip `concert`)를 쓰지 않는다(2026-10-25 검색) — 화면 영향은 없고 스토리만 바뀐다. "V"는 그 화면의 디자인 단계(plan §0)에서 한다는 뜻이다.

| # | 파일 · 심볼 | 지금 코드 | Figma(2026-10-25) | 상태 |
|---|---|---|---|---|
| 1 | `src/ui/components/Button/Button.css.ts` `size.md`·`compoundVariants`(md `iconOnly` 폭) | 높이 45, 아이콘만 폭 45 | medium 변형이 모두 46h(옛 판은 아이콘형만 46) | **완료** |
| 2 | 같은 파일 `variant.secondary` | Hover·Pressed 모두 `background.grey`(#EEEEED) | Hover #F7F7F6(변수 `120:982`), Pressed #EEEEED(`197:4875`), 테두리는 둘 다 `surface/default-border`. Disabled는 테두리 없음(코드와 같음) | **완료** |
| 3 | 같은 파일 `variant.tonal`(primary 2)·주석 | 글자 `text.brandLabel`(Violet 400), Pressed 배경 `brand.primarySubtle`, Hover 없음 | Normal 글자·아이콘 Violet 300(`424:686` — 코드 `brand.onPrimaryContainer`와 같은 값), Hover 배경 Violet 200 + 글자 Violet 400, Pressed 배경 Violet 300 + 글자 Neutral 50. 새 Normal 대비 2.75:1이라 디자이너 확인 요청을 같이 냈다(design-system §5) | **완료** |
| 4 | `src/ui/components/Fab/Fab.css.ts` | Hover·Pressed가 투명도 0.9·0.8 | round Primary Hover #232220(Neutral 700), Pressed #0A0A09(Neutral 900), Disabled `interaction/disabled-bg`(코드와 같음). 흰 판 `Color=Secondary`(배경 `text/inverse`, Hover #EEEEED, Pressed `surface/default-border`)가 새로 생겼다 — 쓰는 화면이 생기면 변형 추가(V) | **완료**(round Secondary는 V) |
| 5 | `src/ui/components/Tabs/Tabs.css.ts` `tab`·주석 | 선택 `brand.primary` 글자·밑줄, 미선택 16 Bold `text.primary` | 선택 글자·밑줄 `text/primary-label`(검정), 미선택 `Label/lg`(16 Regular) `interaction/inactive`. `type=데스크탑`(20px `Heading/md`·`- emphasized`, 선택 48h)은 쓰는 화면이 생기면(V) | **완료** — `size` md/lg(lg 48 통일) |
| 6 | `src/ui/theme/tokens.css.ts` `chip.ddayText`·`chip.ddayBg`·`chip.pastBg`, `src/ui/theme/colors.ts`, `src/ui/components/Chip/Chip.css.ts` `tone.dday`·`tone.past` | D-day 글자 Coral-red 200·배경 Coral-red 50, 지난 공연 배경 Neutral 50 | D-day small 배경 `brand/accent-subtle`·글자 `brand/accent`(large는 `status/warning-subtle`·`status/warning`, 라이트 값 같음), 지난 공연 배경 `interaction/disabled-bg`(Neutral 100). 의미 색이 됐으므로 `chip.dday*`·`chip.pastBg` 전용 토큰을 의미 색으로 바꿀 수 있다 | **완료** |
| 7 | `src/ui/components/Chip/Chip.tsx`·`Chip.css.ts` concert `tone`(주석 "dday=…공연 중") | `ONGOING`을 D-day 모양으로 그린다(design-system §3 옛 잠정안) | `ing`(공연중 — 배경 `brand/accent`, 글자 `brand/accent-subtle`)이 생겼다. `size` small(22h, 좌우 10, 모서리 6, `Label/sm`)·large(25h, 좌우 12, 모서리 8, `Label/md`) — large는 공연준비 홈 PC 목록(P10a-V) | **`ing` 완료** · V(large) |
| 8 | `src/ui/icons/svg/`·`registry.ts`(`generate.mjs`로 생성), `src/ui/icons/README.md` 추출 절차 | 44종 58개 | 새 변형 11개 — `edit`·`up`·`diagonal`·`pop out`·`archiving`·`location`·`music`·`log out`·`update`(24 outline), `chevron-left`·`chevron-right` 20. 쓰는 곳: `diagonal`(통계 카드 ↗), `pop out`(사이드바 "공연 페이지 보기"), `edit`(대시보드 머리·`My`), `archiving`·`update`·`log out`(`My`), chevron 20(GUI 사이드바). `Ticket` filled는 세트 밖 낱개 `ic/ticket/filled/24`(`183:1130`)로 옮겨져 세트(`36:178`)만 내보내면 빠진다 — 추출 절차에 낱개를 더한다. `Ticket` → `ticket` 이름 변경은 `FIGMA_NAME_MAP`과 결과 키가 같다 | **완료** |
| 9 | `src/ui/illustrations/*.png` 6종, `Illustration.tsx` | PNG(벡터가 0.3~6.5MB, 포스터는 8MB 초과라서 — design-system §4-1) | REST SVG 내보내기가 8~75KB로 줄었다(포스터 준비중 40KB, login 60KB 등, design-system §3 일러스트 행). §4-1 "디자이너가 벡터를 단순화하면 SVG로 바꾼다" 조건 — SVG로 바꿀지 정한다. 포스터 준비중의 색 변경(밝은 회색)은 지금 PNG가 이미 같다 | **완료** — SVG로 전환 |
| 10 | `src/ui/illustrations/avatar-*.svg` | 몸통 #131313, 흰 부분 white | 몸통 대부분 #0A0A09(새 변수 `605:1952`), 흰 부분 #F7F7F6(`606:1920`). 채움 36개는 아직 #131313이라 Figma 작업이 끝나지 않았다 | 보류(디자이너 작업 끝난 뒤 재추출) |
| 11 | `src/ui/theme/tokens.css.ts` `shadow` | `drop`(y 4, blur 4, 10%) 하나 | 이펙트 스타일 `drop shadow2`(y 0, blur 9.2, 10%)가 생겼다 — PC 아바타 ▾ 메뉴 `My`가 쓴다 | V(P4s 아바타 메뉴) |
| 12 | `src/ui/theme/breakpoints.ts` | desktop 1024 · wide 1280 | 디자인 시스템에 호스팅 그리드 1133/1280/1440(12칼럼·16·24)과 Tablet 12칼럼이 생겼다. 토큰 나누기는 이미 "P4s 착수 전에 정한다"(design-system §2, Q38) — 이번 변경으로 새로 생긴 일은 없다 | 참고 |

`Header`의 `logo="host"`(`host title`), `Illustration`의 `dashboard-*`(`ic_대시보드` — 색 구성 같음), 텍스트 스타일·`titleNumber`(Saira Condensed)는 바꿀 것이 없다. 대시보드 숫자 폰트는 사용자 결정대로 `titleNumber`가 정본이고 디자이너 확인 중이다(design-requests Q14) — P13a-V에서 그린다.

**처리(커밋 `456e5f2`, 2026-10-25)**: Button medium 46h·`secondary` Hover/Pressed 분리·`tonal` 글자 Violet 300 + Hover·Pressed, `Fab` Hover·Pressed 색(투명도 대신), Tabs 검정 선택·회색 미선택 + `TabList` `size` md(44h)·lg(48h 통일 — Figma 선택 48·미선택 44와 다름), Chip concert 의미 색 + `ing`, 전용 토큰 `chip.dday*`·`chip.pastBg` 삭제와 `button.*` 추가(Figma 변수 이름을 몰라 둔 컴포넌트 전용 토큰 — 같은 날 플러그인으로 이름을 읽어 `brand.primaryContainerHover`·`brand.onPrimaryContainerHover`·`brand.primaryContainerPressed`·`text.onBrandFixed`·`surface.inverseHover`·`surface.inversePressed`로 바꾸고 `button` 그룹을 지웠다, 값 변화 없음 — design-system §1), 아이콘 11개 + 크기 20(53종 69개, `ticket` filled는 낱개 `183:1130`에서), 일러스트 6종 PNG → Figma SVG(아바타 제외 — #10 보류). 스토리(Button·Chip·Fab·Tabs·Icon·Illustrations) 갱신. 커밋 메시지 기준 격리 worktree에서 typecheck · test:stories · build · e2e 통과. 스토리 테스트에는 a11y 자동 검사가 없어 대비(primary 2 2.75:1, Tabs 미선택 2.01:1)는 사람 검토로만 본다(design-system 결정 요약·§5). **문서 반영**: design-system 결정 요약·§1·§3·§4·§4-1·§4-2·§5·§7.

## P10a-L — 공연준비 홈 · 호스트 만들기 (로직)

**상태**: done (2026-10-26, 커밋 전) — V 전부 남음
**변경**: `src/api/host/`(`schema.ts` + `MyHostSchema`(GH-1)·`CreateHostRequestSchema`·`CreateHostResponseSchema`(PH-2)·입력 규칙 상수 `HOST_NAME_MAX` 15·`HOST_INTRODUCE_MAX` 255·`HOST_CONTACTS_MIN/MAX` 1/10·`HOST_CONTACT_VALUE_MAX` 200·`HOST_PHONE_VALUE_MAX` 15, `queries.ts` `MY_HOSTS_KEY`·`myHostsQuery`, `mutations.ts` `createHostMutation`), `src/api/event/`(`MyEventSchema`(GE-1, 장소 평평한 세 필드)·`MY_EVENTS_KEY`·`myEventsQuery`). `features/hosting/home/model/`: `hosting-home`(`HOSTING_HOME_TABS`·`parseHostingHomeTab`·`hostingHomeSearch`·`HOSTING_HOME_HOSTS_HREF`·`clampHostingKeyword` 50자·`HOSTING_KEYWORD_DEBOUNCE_MS` 300·`emptyKindOf`·`HOSTS_EMPTY_TITLE`·`NEW_HOST_HREF`·`myHostHref`·`myEventHref`), `useHostingHome`. `features/hosting/host/model/`: `create-host-form`(`HOST_CONTACT_OPTIONS` 6종·`contactPlaceholder`·`initialCreateHostValues`·칸 오류 `nameError`·`introduceError`·`contactError`·`validateCreateHost`·`toCreateHostBody`·`CREATE_HOST_ERROR_MESSAGE`), `useCreateHost`. `features/hosting/access/`(새): `model/hosting-access`(`hostingAccessOfError`·`hostingAccessOfRole`·`HOSTING_ACCESS_BACK`), `HostingAccessRejected`·`HostingForbidden`(P2 `ForbiddenView`·`NotFoundView`). 화면 자리(로직 연결만): `HostingHomeView`·`CreateHostView`. 라우트 `hosting/page.tsx`·`hosting/new/hosts/page.tsx`. `next.config.ts` `redirects()`에 `/admin/*` 표(tech-decisions §22) 9줄. mock: `fixtures/hosting.ts`(멤버십 기본·mixed·many, `toMyHost`·`toMyEvent`), `hosting.handlers.ts`(GH-1·GE-1·PH-2 + 만든 호스트 저장소 `resetHostingStore`, `hostingSets`)

**훅이 돌려주는 것**
- `useHostingHome()` → `{tabs, tab, setTab, keywordInput, setKeywordInput, submitKeyword, keyword, hosts, events}`. `hosts`·`events`는 `{status: pending|error|empty|success, items(+ href), emptyKind: none|search|null, hasNextPage, isFetchingNextPage, nextPageError, loadMore, retry}`
- `useCreateHost()` → `{values, setName, setIntroduce, setContactType, setContactValue, addContact, removeContact, canAddContact, canRemoveContact, contactOptions, errors, attempted, contactsServerError, submitting, submit}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `useHostingHome.test` 11건, `useCreateHost.test` 8건, `hosting-home.test`, `create-host-rules.test`, `hosting-access.test`, `HostingAccessRejected.test` 8건, `host/hosting-api.test` 15건, e2e `hosting.spec` 29건(×2 프로젝트) |
| 호스트 생성 → 목록 반영 | 훅 「호스트 생성 → 목록 반영: 만든 호스트가 다음 GH-1에 마스터로 나온다」, 「PH-2 {name, introduce, contacts}를 보내고(공백 정리·빈 소개 null), GH-1·GM-1을 다시 읽게 한 뒤 공연준비 홈 호스트 탭으로 replace」, api 「본문이 요청 스키마를 통과하고, 응답 {hostId}의 호스트가 다음 GH-1에 마스터로 나온다」, e2e 「만들면 PH-2를 보내고 공연준비 홈 호스트 탭으로 — 새 호스트가 목록에 나온다」 |
| 비멤버 403(더미 하위 라우트) | `HostingAccessRejected.test` 「공연: 멤버 전용 조회가 403(HOST_400_2)이면 공용 403 안내, 돌아갈 곳은 공연준비 홈」, 「공연: 없는·남의 공연(404)은 공용 404 안내」, 「공연: 5xx는 403·404가 아니라 다시 시도」, 「호스트: 비멤버의 멤버 목록(GH-6 403 HOST_400_2)은 공용 403 안내」, 「호스트: 공개 GH-3 viewer가 200 + myRole null이어도 403 안내」 + 멤버 통과 3건, `hosting-access.test` 표 15행 |
| 벨 | 해당 없음 — P9b-L이 먼저 만들고 검증했다 |
| 서버 조회 없음(셸만) | 빌드 결과 `/hosting`·`/hosting/new/hosts` 정적(○), e2e 「로그인하면 200, 공연 탭이 기본 — GE-1만 브라우저에서 읽고 서버는 /api를 부르지 않는다」 |
| 호스팅 쿼리 기본값 | 전역 기본값 그대로(아래 결정) — 훅 「다음 페이지가 실패하면 기존 행을 두고 nextPageError → retry로 그 페이지를 다시, 전역 토스트 없음」 |
| 연락처 6종·placeholder | `create-host-rules` 「서버 enum 6종(YOUTUBE 포함)을 모두, 서버 순서로」, it.each 6행, 훅 「연락처 유형 6종(YOUTUBE 포함)과 처음 값」, e2e(유튜브 placeholder "URL") |

그 밖: 탭 「기본은 공연 탭: GE-1만 쿠키와 함께 첫 페이지를 읽고, GH-1은 부르지 않는다」, 「호스트 탭으로 바꾸면 주소에 ?tab=hosts가 남고 GH-1을 읽는다 — 카드에 myRole·eventCount·호스트 홈 주소」, 「카드의 myRole은 호스트마다 다르다」, 검색 「입력 뒤 300ms에 지금 탭 목록을 keyword로 새로 읽고(첫 페이지부터), 탭을 바꿔도 검색어가 남는다」, 「검색칸은 50자에서 막고…」, 빈 상태 「소속 호스트가 없으면 호스트 탭은 "등록한 것 없음" 빈 상태(검색 결과 없음과 구분)」, 무한 스크롤 「호스트 24개: 10개씩 page=1·2로 이어 읽고 hasNext가 false면 끝난다」, 에러 「에러 분기 HOST_400_16(연락처 형식) → 연락처 영역 오류, 이동 없음, 토스트 없음 — 연락처를 고치면 지운다」, 「표에 없는 실패(BAD_REQUEST·5xx)는 전역 토스트로 간다」, 「만드는 중에 다시 눌러도 한 번만 보낸다」, 리다이렉트 e2e 19행 + 쿼리 전달 + `/admin/kakao/callback` 404.

**결정**
- 필드는 처음에 통합 기획서(2026-10-10) API 레퍼런스에서 옮겼고, 통합 때 백엔드 소스 `432cce4`(`V2MyHostResponse`·`V2MyEventResponse`·`V2CreateHostRequest`/`Response`·`V2HostContactRequest`)와 대조해 같음을 확인했다(B20 해결)
- 호스팅 센터 쿼리 기본값: 전역 기본값 그대로(`staleTime` 0 · 5xx·네트워크 1회 · 포커스 재조회), 브라우저에서만. 목록 접두 키 `['me','hosts']`·`['me','events']`(patterns §4-4)
- 공연준비 홈: 지금 탭의 목록만 부른다(`enabled`). 검색칸 하나가 지금 탭을 찾고, 탭을 바꿔도 검색어는 남는다(Figma `531:12572` — 검색 하나, 결과 공연·호스트 각각). 검색어는 주소에 남기지 않는다
- 호스트 만들기 성공: GH-1 접두 키 + GM-1(`['me']` exact — `hosts`·`hostCount`) 무효화 → `/hosting?tab=hosts`로 `replace`
- 403 판정은 `features/hosting/access`(새 폴더). 하위 화면은 `<AsyncBoundary rejected={HostingAccessRejected}>`, 공개 GH-3 viewer로 여는 호스트 화면은 `hostingAccessOfRole(myRole)`(`can(role,'viewManagement')`)
- `/admin/*` 리다이렉트는 tech-decisions §22 표의 경로만, 307. 표 밖 `/admin/*`·`/admin/kakao/callback`은 404

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. 공연준비 홈 탭을 주소 `?tab=hosts`에 남긴다(tech-decisions §3 "주소에 남기는 것" 표에 없다) — 호스트를 만든 뒤 호스트 탭으로 돌아오게 하려고. 되돌리기: `useHostingHome`의 탭을 `useState`로, `HOSTING_HOME_HOSTS_HREF`를 `/hosting`으로
2. Q19 기본안 "호스트 설정이나 공연준비 홈" 중 공연준비 홈 호스트 탭을 골랐다(설정은 P10b라 아직 없다). 되돌리기: `useCreateHost`의 `router.replace` 주소 하나
3. 만든 뒤 GM-1 세션 키도 무효화(햄버거 호스트 줄이 GM-1 `hosts`를 쓴다). 되돌리기: `useCreateHost` `onSuccess`의 두 번째 `invalidateQueries` 삭제
4. 연락처 처음 값은 유형 미선택 한 줄, 1~10줄 추가·삭제를 L에 둔다(GUI 만들기는 한 줄 — design-requests Q51). 되돌리기: `initialCreateHostValues`의 `type`, `addContact`·`removeContact` 제거
5. 연락처 드롭다운 라벨은 GUI 문구(전화번호·오픈채팅방 …)를 쓰고, 유튜브를 기타 앞(서버 enum 순서)에 넣었다. 이메일 placeholder는 `null`(Q49)
6. 이름·소개·연락처 값의 앞뒤 공백을 지워 보내고 빈 소개는 `null`. 서버도 이름·연락처는 지우고 공백뿐인 소개는 `null`로 저장한다 — 소개의 앞뒤 공백까지 지우는 것만 프론트 판단. 되돌리기: `toCreateHostBody`
7. 칸 오류 문구("호스트 이름을 입력해 주세요" 등)·공연 탭 빈 상태·검색 결과 없음 문구는 잠정(Q50). `HOST_400_16`은 줄을 몰라 연락처 영역 전체 오류
8. 공연 카드 주소는 `/hosting/events/{id}`(redirects로 대시보드 — 호스트 홈 준비중 카드와 같은 주소), 호스트 카드는 호스트 홈 `/hosts/{id}`(storyboard F)
9. `/admin/*` 리다이렉트를 307(`permanent: false`)로, `/admin/new/events/:step*`는 단계 없이 `/hosting/new/events`로. 되돌리기: `next.config.ts` `adminRedirects`
10. mock GE-1 "최신 생성 순"은 생성일이 없어 id 큰 순으로 흉내 낸다. GH-1 정렬(호스트 id 큰 순)은 서버와 같다

**남음**: V 전부(카드·`myRole` 배지·FAB·sentinel·연락처 드롭다운·403 화면 모양). 준비중 카드 ⋮ 삭제는 P11
**검사**: typecheck · lint · prettier · test(1496) · test:stories(193) · build · e2e(232 — 새 58) 통과. 로컬에 `.env.local`이 없어 `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`로 돌렸다
**문서 반영**: plan P10a 완료 기준 L, patterns §4-4·§24(P10a 행), design-requests Q19·Q49~Q51, backend-questions B20, directory-structure(api·features·라우트·mock), README(질문 수)

## P10b-L — 호스트 설정 · 멤버 (로직)

**상태**: done (2026-10-26, 커밋 전) — V 전부 남음
**변경**: `src/api/host/`(`schema.ts` + `UpdateHostRequestSchema`(PH-4, 키 없음 = 변경 안 함, `.strict()`)·`UpdateHostResponseSchema`(= `HostViewerSchema`)·`HOST_IMAGE_KEY_MAX`·`HOST_MEMBERS_INVITE_MAX` 20·`AssignableHostRoleSchema`(MANAGER·GUEST)·`AddHostMembersRequestSchema`·`UpdateHostMemberRoleRequestSchema`·`TransferMasterRequestSchema`, `mutations.ts` `updateHostMutation`·`addHostMembersMutation`·`updateHostMemberRoleMutation`·`removeHostMemberMutation`·`transferMasterMutation`), `src/api/event/queries.ts` `isEventManageQueryKey`(GE-3 키 모양). `features/shared/permission/model/can`: `manageManagers`(MASTER) 추가, `downloadExcel`을 계약대로 MANAGER로. `features/hosting/host/model/`: `host-fields`(P10a `create-host-form`에서 이름·소개·연락처 칸 규칙을 옮긴 공용 모듈 — `contactInputsOf`·줄 바꾸기 함수 추가), `host-settings-form`(`hostSettingsValuesOf`·`changedHostFields`·`isHostSettingsDirty`·`validateHostSettings`(바뀐 칸만)·`toUpdateHostBody`(바뀐 필드만)·에러 문구), `useHostSettings`, `member-rules`(`HOST_ROLE_LABEL`·`memberActionsOf`·`inviteRoleOptions`·`inviteRowErrors`·`toAddMembersBody`·`inviteFailureEmails`·`inviteServerErrors`·`INVITE_ERROR_MESSAGE`·`MEMBER_ACTION_ERROR_MESSAGE`·`PERMISSION_GUIDE`), `useHostMembers`, `useInviteMembers`, `host-cache`(`applyMembers`·`invalidateHostSummary`·`applyUpdatedHost`·`invalidateMyRoleQueries`). `features/hosting/access`: `HostingNotFound` 추가. 화면 자리(로직 연결만): `HostSettingsView`·`HostMembersView`. 라우트 `hosting/hosts/[hostId]/settings`·`/members`. mock: `host-store.ts`(새 — 멤버·프로필 저장소, `actAsRole`), `host.handlers.ts`(PH-4·PH-7·PH-10·DH-11·PH-12, GH-3·GH-6이 저장소를 읽는다), `hosting.handlers.ts`(GH-1·GE-1 `myRole`·이름·이미지가 저장소를 따른다, `resetHostingStore`가 저장소도 되돌린다), `fixtures/host.ts` `mockUsers`

**훅이 돌려주는 것**
- `useHostSettings(hostId)` → `{host, access: ok|forbidden, canEdit, values, setName, setIntroduce, setContactType, setContactValue, addContact, removeContact, canAddContact, canRemoveContact, contactOptions, images: {PROFILE, COVER}: {url, changed, uploading, error, change(file), reset(), retry()}, errors, attempted, dirty, contactsServerError, saving, canSave, save(): Promise<boolean>}`
- `useHostMembers(hostId)` → `{access, myRole, hostName, members: [{userId, name, profileImageUrl, role, roleLabel, isMe, actions: {changeRoleTo, remove, transfer}}], canInvite, changeRole(userId, role), remove(userId), transferMaster(userId), pendingUserId, actionError, permissionGuide}`
- `useInviteMembers(hostId, myRole)` → `{rows, setEmail, setRole, addRow, removeRow, canAddRow, canRemoveRow, roleOptions, errors, serverErrors, formError, attempted, submitting, submit(): Promise<boolean>}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `useHostSettings.test` 16건, `useHostMembers.test` 17건(초대 포함), `member-rules.test` 38건, `host-settings-rules.test` 14건, `host-manage-api.test` 15건, `HostManageViews.test` 8건, `can.test` +1행, e2e `hosting-host.spec` 16건(×2 프로젝트) |
| 3시점 버튼 = 권한표 | `member-rules` 「행 메뉴 — 마스터·매니저·일반 3시점」 표 12행, 「권한 가이드 표 — 행과 칸이 계약 표와 같다」, 훅 「마스터 시점…」「매니저 시점…」「일반 시점…」, e2e 「마스터: …권한 가이드에 "호스트 삭제"가 없다」「매니저: 일반 멤버 삭제만…」「일반: 목록만」 |
| 매니저 초대 역할 "일반" 고정 | `member-rules` 「초대 역할 — 매니저는 "일반" 고정」, 훅 「마스터는 매니저·일반, 매니저는 "일반" 고정 — 다른 역할로 바꾸지 못한다」, e2e(매니저 시점 역할 옵션 `['일반']`) |
| 초대 실패 줄 매핑(13·14·15) | `member-rules` 「초대 실패 → 줄 매핑」 4행 + 폼 오류 폴백, 훅 it.each 3행(13·15·18 — 둘째 줄에만 사유, 토스트 없음, 고치면 지움), api 「PH-7 실패 …, 아무도 추가되지 않는다」 4행(검사 순서), e2e 「초대: 한 줄이 실패하면 그 줄에 사유…」 |
| 변경 응답으로 캐시 갱신 | 훅 「역할 변경(PH-10): 응답을 GH-6 키에 넣고, 내 myRole 쿼리는 무효화하지 않는다」, 「삭제(DH-11): …GH-3 두 키를 무효화」, 「한 명 초대: …응답 목록을 GH-6 키에」, e2e 「역할 변경: …GH-6을 다시 읽지 않는다」 |
| 양도 → myRole 무효화 → 매니저 버튼 | 훅 「마스터 양도(PH-12): myRole 쿼리(GH-1·GH-3 viewer·GE-1·GE-3·GM-1)를 무효화 → 버튼이 매니저 기준으로 바뀐다」, api 「PH-12 양도: …다음 GH-1·GE-1·GH-3의 myRole이 MANAGER」, e2e 「마스터 양도: …myRole 쿼리를 다시 읽는다」(공연준비 홈 카드도 MANAGER) |
| 이미지 발급 → S3 → PH-4 | 훅 「프로필 이미지를 올리면 폼에 key, 저장하면 profileImageKey로 PH-4…」, 「기본 이미지로 되돌리면 coverImageKey ""」, 「S3 PUT 실패 → …retry()는 같은 파일로 발급부터 다시」, 「JPG·PNG가 아니면 요청 없이…」, e2e 「이미지: 발급(PH-15) → S3 PUT → 저장(PH-4 profileImageKey) → 새 이미지 주소」(가짜 S3는 `page.route`) |
| 에러 분기 P10b | 훅 「HOST_400_16 → 연락처 영역 오류…」, 「HOST_400_17 → 올린 이미지를 버리고…」, 「HOST_404_2 → GH-6을 다시 읽고 actionError」, 「표에 없는 실패(5xx)는 전역 토스트」, api(400_5·400_10 경로·400_12·403 400_11·404_2·403 400_1·400_2·400_4) |
| 실제 하위 라우트 403·404 | `HostManageViews.test` describe.each 2화면 × 4건(비멤버 403·없는 호스트 404·숫자 아닌 id 요청 없이 404·멤버 통과), e2e 2화면 × 3건(비로그인 → 로그인, 비멤버 403 + 서버 /api 0건, 없는 호스트 404) |

그 밖: 설정 「바뀐 것이 없으면 요청하지 않는다」, 「이름·연락처를 바꾸면 그 두 필드만 PATCH — 응답을 viewer 키에…」, 「소개를 비우면 introduce ""」, 「일반 멤버: 읽기 전용 — 저장하지 않는다」, e2e 「이름을 바꿔 저장하면 바뀐 필드만 PH-4 — 공연준비 홈 호스트 카드에도 반영」.

**결정**
- 필드·규칙은 백엔드 소스 `432cce4`(`V2HostController`, `V2UpdateHostRequest`, `V2AddHostMembersRequest`, `V2HostMemberRole`, `V2TransferMasterRequest`, `V2HostImageUploadRequest/Response`, `V2HostMemberResponse`, 유스케이스 6개, `Host`, `V2HostDomainService`, `HostErrorCode`, `V2ErrorPolicy`, `S3UploadPresignedUrlService.isHostImageKey`)에서 옮겼다 — api-contract §6 운영에 정리
- 접근: 설정은 GH-3 viewer `myRole`(비멤버 200 + null → `hostingAccessOfRole` 403), 멤버는 GH-6 403을 경계가 받는다(`HostingAccessRejected`). 주소의 id는 P5c `parseHostIdParam`으로 거르고 숫자가 아니면 요청 없이 공용 404. 호스팅 센터는 서버 조회가 없어 403·404 모두 상태 코드 200
- 설정 폼은 `useState` + 처음 값 비교로 바뀐 필드를 만든다(P10a 만들기와 같은 방식 — patterns §23의 RHF `dirtyFields`와 결과는 같다). 이미지 key는 폼 값에 두고 [저장] 때 PH-4(patterns §23)
- 멤버 화면의 `myRole`은 GH-3 viewer에서 읽는다(patterns §22 — myRole을 주는 쿼리). GH-6 응답의 내 행으로 알 수도 있지만 문서 기준을 따랐다
- mock: 설정·멤버 변경이 다음 조회에 반영되도록 저장소를 두었다. 검증 실패는 백엔드처럼 400 `BAD_REQUEST`(P10b 핸들러만 — 기존 `GLOBAL_400_1` 정리는 아래 "백엔드 질문 소스 대조" 절)

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. 일반 멤버가 설정 주소로 들어오면 403이 아니라 읽기 전용(design-requests Q53). 되돌리기: `HostSettingsView`에서 `!f.canEdit`이면 `HostingForbidden`
2. 호스트 이미지는 프로필·커버 두 자리를 모두 L에 둔다(PH-15 `purpose` 둘 다, 호스트 홈 GUI에 배너·로고가 있다 — 설정 GUI에는 칸이 없다). 되돌리기: `HOST_IMAGE_SLOTS`에서 하나를 뺀다
3. `HOST_400_17`은 어느 자리 key인지 서버가 말하지 않아 이번에 새로 올려 보낸 자리를 모두 버린다(지운 자리 `""`는 남김). 되돌리기: `useHostSettings` `save`의 catch
4. 설정 저장 뒤 GH-1·GE-1·GM-1·공개 GH-3도 무효화(이름·이미지가 카드·햄버거에 나온다). 되돌리기: `host-cache.ts` `applyUpdatedHost`
5. 양도 뒤 GM-1도 무효화(`hosts[].myRole`), GE-3은 P11 전이라 키 모양 술어로. 되돌리기: `invalidateMyRoleQueries`의 마지막 줄 / P11에서 `eventManageQuery`가 다른 키를 쓰면 `isEventManageQueryKey`를 고친다
6. `HOST_400_18`도 사유 이메일을 그 줄에 단다(patterns는 문구만 적었다 — 서버가 이메일을 붙여 준다). 줄에 맞지 않으면 폼 오류로(소리 없이 묻히지 않게)
7. 초대 칸 검사: 빈칸·`@` 모양·같은 이메일(대소문자 무시)만 프론트가 막는다. 줄을 더하거나 빼면 지난 서버 사유를 모두 지운다
8. 멤버 변경은 한 번에 하나만(`pendingUserId`). `HOST_404_2`는 GH-6을 다시 읽고 안내 문구. 문구 전부 잠정(Q52)
9. 역할 이름 "마스터 / 매니저 / 일반"(plan의 "일반" — 서버 표시 이름 "게스트"는 쓰지 않는다), 모르는 역할 "알 수 없음"
10. `can()`: `downloadExcel`을 GUEST → MANAGER로 고쳤다(api-contract §2·patterns §22와 어긋나 있었다 — 쓰는 곳은 아직 없음). `manageManagers` 추가
11. `isMe`(GM-1 `userId`)를 행에 붙였다 — "나" 표시용

**남음**: V 전부(초대 모달·역할 메뉴·양도/삭제 확인·권한 가이드 표·이미지 칸 위치·이탈 확인 — `dirty`는 L에 있다). QA 시나리오 캡처(V). mock GM-1(`me.handlers`)은 양도 뒤에도 `hosts[].myRole`이 그대로다(저장소를 읽지 않는다)
**검사**: typecheck · lint · prettier · test(1605) · test:stories(193) · build · e2e(264 — 새 32) 통과. `useMyPage.test` 「기본 이미지로…」는 커밋 HEAD에서도 가끔 실패하는 기존 불안정 테스트다(이번 변경과 무관, 고치지 않았다). 로컬에 `.env.local`이 없어 `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`로 돌렸다
**문서 반영**: plan P10b 완료 기준 L, patterns §22·§24(P10b 행), api-contract §6 운영(PH-4·멤버 변경 소스 확인), design-requests Q52·Q53, directory-structure(api·features·라우트·mock), README(질문 수)

## 2026-10-26 백엔드 질문 소스 대조로 생긴 코드 수정 거리

백엔드 질문(backend-questions)을 소스(@432cce4, 새 커밋은 dev `cb8d24e`)로 대조하다 나온 것. 1~4는 고쳤다(2026-10-26, 아래 "검증 실패 코드 정리"). 5는 P12-L.

| # | 위치 | 지금 | 사실 | 할 일 |
|---|---|---|---|---|
| 1 | `src/features/shared/auth/model/useRegisterForm.ts`(`VALIDATION_FAILED = 'GLOBAL_400_1'`)·`register-form.ts` 주석 | 가입 검증 실패를 `GLOBAL_400_1`로 받아 폼 `invalid`로 보낸다 | 서버는 400 `BAD_REQUEST`를 준다 → 운영에서 `invalid` 분기가 안 타고 일반 실패가 된다 | **완료(2026-10-26)** 검증 실패 코드를 `BAD_REQUEST`로(또는 둘 다) 받는다 |
| 2 | 전역 에러 토스트(`src/api/query-client.ts` `messageOf`) | 표에 없는 실패는 `reason`을 그대로 토스트 | `BAD_REQUEST`의 `reason`은 `{"email":"…"}` JSON이나 "Bad Request"라 화면에 그대로 나가면 안 된다 | **완료(2026-10-26)** `BAD_REQUEST`면 고정 문구("입력값을 확인해 주세요" 등)로 바꾼다 — 한 곳(`src/api/errors.ts` 또는 `messageOf`) |
| 3 | mock(`respond.ts` `badRequest`, `host.handlers.ts`, `hosting.handlers.ts`, `order.handlers.ts`, `me.handlers.ts`)·주석(`host/mutations.ts`, `auth/schema.ts`, `profile.ts`, `member-rules.ts`, `create-host-form.ts`, `host-settings-form.ts`, `useInviteMembers.ts`)·테스트 | 검증 실패를 `GLOBAL_400_1`로 흉내 낸다 | 위와 같다 | **완료(2026-10-26)** mock 응답을 `code: 'BAD_REQUEST'`, `reason`을 필드 JSON으로 맞추고 주석·테스트를 고친다 |
| 4 | 경로 id 타입 오류 mock | 400 `GLOBAL_400_1` 가정(B7) | 로그인 400 `BAD_REQUEST`, 비로그인 공개 GET은 401 `AUTH_401_2`(숫자 id만 공개 경로 패턴에 걸린다) | **완료(2026-10-26)** mock·테스트를 맞춘다 |
| 5 | P10/T-3 티켓 수정 본문 | 동의 필드 없음 | dev `cb8d24e`(#873)에 `refundObligationAgreed`·`agreementVersion`(무료 → 두둥 전환 때만) | **완료(2026-10-30 P12-L)** `toUpdateTicketBody`가 무료 → 두둥일 때만 사용자가 체크한 값을 싣는다 |


## 2026-10-26 검증 실패 코드 정리 · `useMyPage` 불안정 테스트

위 표 1~4를 고쳤다.

**변경**: `src/api/errors.ts` `VALIDATION_ERROR_CODES`(`BAD_REQUEST`·`GLOBAL_400_1`)·`isValidationError`. `src/api/query-client.ts` `VALIDATION_ERROR_MESSAGE`("입력한 내용을 다시 확인해 주세요.") — `messageOf` 한 곳에서 검증 실패면 `reason` 대신 이 문구. `useRegisterForm`의 `invalid`가 `isValidationError`로 분기. mock `respond.ts`: `errors.badRequest(request, fields?)`는 400 `BAD_REQUEST` + 필드→메시지 JSON `reason`, `errors.typeMismatch`는 400 `BAD_REQUEST` "Bad Request", `publicIdMismatch`(공개 GET의 숫자가 아닌 id — 비로그인 401 `AUTH_401_2`, 로그인 400). 경로 id 타입 오류는 event·host·gift·order 핸들러가 `typeMismatch`/`publicIdMismatch`로, P10b 전용 `validationFailed`는 없앴다. 주석(`auth/schema`·`register-form`·`host/mutations`·`create-host-form`·`profile`·`event-id`·`host-home-rules`)·테스트(`useCreateHost`·`useEventList`·`checkout/rules`·`hosting-api`)를 맞추고, 테스트를 더했다(가입 400 `BAD_REQUEST`/`GLOBAL_400_1` → `invalid`, 검증 실패 토스트 고정 문구, `isValidationError`, mock 경로 id 타입 오류·본문 검증 `reason` JSON)
**결정**:
1. `GLOBAL_400_1`도 함께 받는다 — 지금은 나지 않지만 백엔드 README가 이 코드라고 적고 있어(B 질문 중) 어느 쪽으로 정리돼도 같은 분기를 탄다. 받는 코드 목록은 `VALIDATION_ERROR_CODES` 하나
2. 쿼리 파라미터 제약 실패(page·size·keyword 등)의 mock `reason`도 필드 JSON으로 둔다(백엔드 문장 모양은 확인하지 않았다 — 화면은 `reason`을 보이지 않으니 영향 없음)
3. `useMyPage.test` 「기본 이미지로…」 불안정: 훅 결과(`result.current`)가 `act` 직후 낡아 있었다. TanStack `notifyManager`는 캐시 변경을 `setTimeout(0)`으로 묶어 알리는데 `act`는 그 매크로태스크를 기다리지 않는다 — 그래서 ① `change()` 뒤 렌더가 아직 `pending`이면 `reset()`이 아무것도 보내지 않고 ② `reset()` 뒤 `profile`이 옛 URL로 남았다. `change()` 뒤 `pending=false`를, 끝에 `profile`을 `waitFor`로 기다리고 캐시 값은 바로 확인한다(닉네임 저장 테스트도 같은 모양이라 함께). 15회 연속 통과
**검사**: typecheck · lint · prettier · test(1618) · test:stories(193) · build · e2e(264) 통과(`NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`)

## P11-L — 공연 생성 · 체크리스트 · 기본 정보 · 섹션 편집 · 등록 (로직)

**상태**: done (2026-10-26, 커밋 전) — V 전부 남음
**변경**: `src/api/event/`(`schema.ts` + 입력 규칙 상수 `EVENT_NAME_MAX` 25·`EVENT_PLACE_TEXT_MAX` 255·`EVENT_CONTACTS_MAX` 10·`EVENT_CONTACT_VALUE_MAX` 200·`EVENT_TAGS_MAX` 10·`EVENT_SECTIONS_MIN/MAX` 1/10·`EVENT_SECTION_TITLE_MAX` 20·`EVENT_SECTION_CONTENT_MAX` 20,000, `EventChecklistSchema`(GE-7)·`EventManageSchema`(GE-3·PE-4 응답, `posterImageKey`·`checklist` 포함)·`CreateEventRequestSchema`/`ResponseSchema`(PE-2)·`EventPlaceRequestSchema`·`UpdateEventBasicRequestSchema`(PE-4, 키 없음 = 변경 안 함, `.strict()`)·`UpdateEventSectionsRequestSchema`(PE-6)·`EventStatusResultSchema`(PE-8·DE-9), `queries.ts` `eventManageQuery`(GE-3 `['events', id, 'manage']` — P10b 술어 그대로)·`eventChecklistQuery`(`…, 'manage', 'checklist']`)·`eventSectionsManageQuery`(쿠키 GE-5 `…, 'manage', 'sections']`)·`eventPublicKeys`, 새 `mutations.ts` 5종). `features/hosting/event/`(새): `model/` event-scope·schedule·place·kakao-geocoder·basic-info-form·sections-form·checklist·create-event-form·event-cache + 훅 6개, 화면 자리(로직 연결만) `NewEventView`·`EventScopeView`·`EventDashboardView`·`EventInfoView`·`EventDetailView`. `features/hosting/host/model/useCreateHost`: `{onCreated}` 옵션(주면 이동하지 않고 id를 넘기고 폼을 비운다). `features/hosting/home`: 공연 카드 `canDelete` + 최소 마크업 [삭제]·[새 공연 만들기]. 라우트 `hosting/new/events/page.tsx`, `hosting/events/[eventId]/layout.tsx`·`dashboard`·`info`·`detail/page.tsx`. mock: `event-store.ts`(새 — 공연 fixture 복사본, PE-2·4·6·8·DE-9가 바꾸고 GE-3·GE-7·GE-5·GP-3·GP-5·GE-1이 읽는다), `hosting-event.handlers.ts`(새 — PE-2·GE-3·PE-4·PE-6·GE-7·PE-8·DE-9, `hostingEventSets`, `mockRoleIn`), `event.handlers.ts`(GP-3·GP-5·GE-5가 저장소를 읽고, GE-5는 멤버(쿠키)에게 준비중 섹션), `hosting.handlers.ts`(`createdHostOf`, `resetHostingStore`가 공연 저장소도 되돌린다), `fixtures/hosting.ts` `hostEventsOf`가 저장소를 읽는다

**백엔드 소스**: `432cce4`(로컬 클론) → dev `cb8d24e` `git diff`에서 공연 API 변경 없음(`Event.kt`의 `@Where` → `@SQLRestriction`만, Spring Boot 3.5 업그레이드). 근거 파일: `V2EventController`, `V2CreateEventRequest`·`V2UpdateEventBasicRequest`(`V2EventPlaceRequest`·`V2EventContactRequest`)·`V2EventSectionRequest`·`V2EventImageUploadRequest`, `V2EventManageResponse`·`V2EventChecklistResponse`·`V2EventStatusResponse`·`V2EventImageUploadResponse`, 유스케이스 9개, `V2EventDomainService`·`EventChecklist`·`EventSection`·`EventContact`·`EventPlace`·`Event.open`·`EventService.deleteEventSoft`·`EventErrorCode`·`HostRoleAop`

**훅이 돌려주는 것**
- `useNewEventWizard({now?})` → `{step, hosts: {status, items(+ selectable), hasNextPage, loadMore, retry}, selectedHost, selectHost, canGoToStep2, goToStep2, creatingHost, startCreateHost, cancelCreateHost, createHost(= useCreateHost 반환값), values, setName, setSchedule, setHasTicket, scheduleRange, errors, scheduleServerError, attempted, submitting, submit}`
- `useEventScope(eventId)` → `{event(GE-3), registered, menu[{key,label,href}], publicHref, canEdit, readOnlyReason: role|ended|null, readOnlyMessage, hasTicketLocked, isManager}`
- `useEventDashboard(eventId)` → `{event, mode: checklist|registered, checklistStatus, retryChecklist, checklistItems[{key,label,done,exempt,href}], progress, canOpen, justCompleted, acknowledgeCompleted, showRegister, canRegister, registering, register(): Promise<boolean>, registerError, justRegistered, acknowledgeRegistered, createdNotice, dismissCreatedNotice}`
- `useEventBasicInfo(eventId, {geocode?, now?})` → `{event, canEdit, readOnlyReason, readOnlyMessage, registered, values, poster: {url, changed, uploading, error, change, remove, retry}, setName, setSchedule, scheduleRange, selectAddress(주소), setPlaceName, setDetailAddress, geocoding, placeLookupError, setContactType, setContactValue, addContact, removeContact, canAddContact, contactOptions, tagGroups, toggleTag, setHasTicket, hasTicketLocked, errors, serverErrors{schedule,contacts,tags,poster,hasTicket}, formError, attempted, dirty, saving, canSave, canPreview, save(), savedNotice: saved|registeredChanged|null, dismissSavedNotice}`
- `useEventSections(eventId)` → `{event, canEdit, readOnlyReason, readOnlyMessage, sections[{key,title,content}], setTitle, setContent, addSection, removeSection, moveSection, canAddSection, canRemoveSection, uploadSectionImage(file): Promise<url|null>, imageUploading, imageError, errors, attempted, formError, dirty, saving, canSave, canPreview, save(), savedNotice, dismissSavedNotice}`
- `useDeleteEvent()` → `{deleteEvent({eventId, status, myRole}): Promise<boolean>, deletingId, error}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `event-manage-api.test` 28건, `event-rules.test` 75건, `kakao-geocoder.test` 3건, `useNewEventWizard.test` 9건, `useEventDashboard.test` 10건, `useEventBasicInfo.test` 19건, `useEventSections.test` 7건, `useDeleteEvent.test` 4건, `EventScopeView.test` 6건, `useHostingHome.test` +1, e2e `hosting-event.spec` 12건(×2 프로젝트) |
| 만들기 → 기본 정보 → 섹션 → 등록 완주(티켓 없음) | e2e 「체크리스트를 채우면 등록 준비 완료, 등록하면 메뉴가 6개로 바뀌고 공연 상세가 열린다」, api 「티켓 없음 공연: ① 기본 정보 + ② 섹션을 채우면 canOpen → 등록하면 OPEN, 공개 상세가 열린다」 |
| 일반 멤버인 호스트는 선택 불가 | 훅 「일반 멤버인 호스트는 고를 수 없다 — 골라도 선택되지 않고 [다음]이 막힌다」, 규칙 「일반 멤버인 호스트는 고를 수 없다」, e2e 「일반 멤버인 호스트는 고를 수 없다 — …」, api it.each 「일반 멤버인 호스트·비멤버 호스트에는 만들 수 없다」 |
| 포스터 발급 → S3 → key | 훅 「포스터: PE-10(POSTER) 발급 → S3 PUT → 저장하면 posterImageKey로 PE-4」, 「S3 PUT 실패 → …retry()는 같은 파일로 발급부터 다시」, e2e 완주(포스터 img + PATCH 본문 `posterImageKey`) |
| 다 채운 순간 | 훅 「다 채운 순간: 이 화면이 본 canOpen이 false → true로 바뀐 직후 justCompleted(한 번) — 확인하면 꺼진다」, 「처음부터 다 찬 채로 들어오면(새로고침) 알리지 않는다」, e2e `ready-notice` |
| 등록 → 메뉴 바뀜 · 체크리스트 모드 벗어남 | 훅 「등록(PE-8): GE-3·GE-1만 무효화(GE-7은 아님) → GE-3이 다시 오면 등록 후 모드 + justRegistered」, `EventScopeView.test` 메뉴 4/6, 규칙 「등록 전 4개…, 등록 후 6개…」, e2e 완주(메뉴 6개) |
| 비멤버 403(`/hosting/events/[id]/…`) | `EventScopeView.test` 「비멤버(…102 — GE-3 403 HOST_400_2)는 공용 403 안내…」·404·숫자 아닌 id, e2e 「비멤버는 공용 403 안내 — 서버는 /api를 부르지 않는다」·「없는 공연·숫자가 아닌 id는 공용 404…」 |
| 장소 4필드 · 체크리스트 ① | 훅 「주소를 고르면 좌표를 얻고, 저장 본문에 장소 4필드 + 상세주소를 모두 채운다 → 체크리스트 ①에 반영」, 「좌표를 못 얻으면 다른 주소를 고르게 하고 저장하지 않는다」, api 「포스터 key·장소 4필드 + 상세주소·문의처를 저장하면 체크리스트 ①이 찬다」, e2e 완주(PATCH 본문 + `checklist-basic` done) |
| 등록된 공연 저장 → 안내 상태 | 훅 「등록된 공연을 저장하면 안내가 필요하다는 상태(registeredChanged)…」, 섹션 훅 「뺀 섹션은 본문에 없다 — 등록된 공연이면 registeredChanged…」, e2e 「기본 정보: 등록된 공연을 저장하면 안내가 필요하다는 상태…」 |
| 카드 ⋮ 삭제 — 일반 멤버 불허 | 규칙 it.each 「삭제(카드 ⋮)」 6행, `useHostingHome.test` 「공연 카드 ⋮ 삭제(P11)…」, `useDeleteEvent.test` 「일반 멤버·등록된 공연은 요청하지 않는다」, api 「삭제: 준비중 + 매니저 이상만…」, e2e 「준비중 공연만 [삭제]…」·「일반 멤버에게는 [삭제]가 없다」 |
| `hasTicket` 잠금 · 정산중·지난 공연 읽기 전용 | 규칙 「티켓 여부 잠금」 4행·「읽기 전용」 9행, 훅 「등록된 공연을 저장하면 … 티켓 여부는 잠겨 있다」·「지난 공연: 읽기 전용(ended)」, api 「티켓 여부: 등록 후 바꾸면 Event_400_18…」·「…정산중·지난 공연은 Event_400_17」, e2e `has-ticket-locked` |
| 장소 수정 시 `detailAddress` 함께 | 훅 「장소 수정 시 상세주소만 바꿔도 detailAddress를 포함한 장소 전체를 보낸다」, 규칙 「상세주소만 고쳐도 장소 전체(4필드 + 상세주소)를 보낸다」, api 「장소는 통째로 교체 — detailAddress를 빼면 지워진다」 |
| 섹션 전체 교체 | 훅 「탭 하나만 고쳐도 모든 섹션을 보낸다…」·「뺀 섹션은 본문에 없다…」, 규칙 「보내는 본문은 지금 목록 전부…」, api 「전체 교체: 빠진 섹션은 지워지고 sortOrder 순으로 0부터…」, e2e 「상세 정보: 섹션 저장은 전체 교체 — 뺀 탭은 공연 상세에서도 사라진다」 |
| 일반 멤버 읽기 전용 | 훅 「일반 멤버: 읽기 전용(role)…」(기본 정보·섹션), 대시보드 「일반 멤버: …[등록하기]가 없고…」, `EventScopeView.test` 「일반 멤버는 읽기 전용 안내」, e2e 「일반 멤버는 읽기 전용 — …」 |
| 저장·등록 뒤 공연 상세에 바로 반영 | 훅 「저장 뒤 GE-7·GE-1·관객 공연 상세 공개 키를 무효화한다 — 공연 상세를 열면 바로 반영」, api 「저장한 이름·장소가 관객 공연 상세(GP-3)에 바로 나온다」·섹션 「관객 공연 상세에도 바로」, e2e 완주(`/events/7001`)·등록된 공연 수정 2건 |
| 에러 분기 P11 | 훅 it.each `Event_400_2`·`24`·`20`·`23` 칸 오류, `25` 티켓 여부, `22` 포스터 버림, `17` GE-3 다시 읽기, 대시보드 it.each `7`·`8`·`15`, 섹션 `21`, 삭제 `19`, 만들기 `Event_400_2` + `BAD_REQUEST` 전역 토스트, api(코드·검사 순서) |
| Step1 안 호스트 만들기 → `?step=2` | 훅 「Step1 안에서 호스트를 만들면(PH-2) 그 호스트가 골라진 채 ?step=2로 — 공연준비 홈으로 가지 않는다」, e2e 「Step1 안에서 호스트를 만들면 그 호스트가 골라진 채 ?step=2로 간다」(뒤로가기 = Step1, 골라진 채) |

그 밖: 만들기 「PE-2 {hostId, name, startAt, endAt(종료 ≤ 시작이면 다음 날), hasTicket} → GE-1 무효화 → 대시보드(?created=1)로 replace」, 「고른 호스트가 없는 ?step=2(새로고침 등)는 Step1로 replace」, 「호스트 홈의 ?hostId=는 고를 수 있는 호스트일 때만 미리 고른다」, 대시보드 「등록된 공연은 등록 후 모드 — GE-7을 부르지 않는다」, 「?created=1이면 createdNotice — 닫으면 주소에서 지운다」, 일정 it.each(자정·달·해·윤년 넘김), 섹션 「v1 MARKDOWN 섹션은 HTML로 바꿔 에디터에 넣는다」, 본문 이미지 「PE-10(SECTION) → S3 → url」, GE-3 키 「isEventManageQueryKey에 맞는다」.

**결정**
- GE-3 키는 P10b가 무효화하던 모양 그대로 `['events', id, 'manage']`. GE-7·편집용 GE-5도 그 아래(`'checklist'`·`'sections'`)라 마스터 양도 뒤 함께 다시 읽힌다. PE-8 뒤에는 GE-3을 `exact`로만 무효화한다(GE-7은 무효화하지 않는다 — plan)
- 대시보드 체크리스트는 plan대로 GE-7을 따로 읽는다(GE-3에도 같은 `checklist`가 있지만 `Event_400_7` 뒤 "GE-7 다시 읽기"가 문서 규칙이다)
- 편집용 섹션은 쿠키를 싣는 GE-5(`eventSectionsManageQuery`) — 공개 키는 서버 프리페치(쿠키 없음)라 준비중 공연에서 404다
- 호스팅 센터는 서버 조회 없음: 레이아웃·페이지 모두 클라이언트 판정(403·404도 상태 코드 200). 공연 스코프 경계는 레이아웃 하나 + 상세 정보 화면 안 하나(섹션 Suspense가 메뉴를 가리지 않게)
- Step1 안 호스트 만들기는 P10a `useCreateHost`에 `onCreated`를 더해 재사용(칸 규칙·`HOST_400_16`·GH-1·GM-1 무효화 그대로)
- PE-4·PE-6 저장 뒤 관객 공연 상세의 공개 키(GP-3 공개·viewer, GE-5)를 `exact`로 무효화. 공연 상세는 서버 조회라 새로 열면 늘 새 값이다 — 남은 브라우저 캐시만 지운다
- mock: 공연 저장소를 두어 PE-* 변경이 GE-3·GP-3·GE-5·GE-1에 이어진다. "지금"은 실제 시각(`mockNow`) — 테스트의 새 공연은 2030년으로 만든다

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. "다 채운 순간" = 이 화면이 본 `canOpen`이 false → true로 바뀐 직후(처음부터 true면 알리지 않는다, 확인하면 꺼진다). 되돌리기: `useEventDashboard`의 `seenCanOpen` 비교
2. 간편 만들기 직후 토스트 상태를 주소 `?created=1`로 넘긴다(tech-decisions §3 "주소에 남기는 것" 표에 없다 — 주문 완료 `?created=1`과 같은 모양). 닫으면 `replace`로 지운다. 되돌리기: `createdEventHref`와 `useEventDashboard`의 `createdNotice`
3. Step1은 `?step=1`로 쓰고, `?step=2`인데 고른 호스트가 없으면(새로고침) Step1로 `replace`. 호스트 홈의 `?hostId=`(P5c 링크)는 고를 수 있는 호스트일 때만 미리 고르고 Step1에 머문다. 되돌리기: `create-event-form.ts`·`useNewEventWizard`의 effect
4. Step2 티켓 여부는 기본값 없음(`null` — 고르게 한다). 되돌리기: `initialCreateEventValues`
5. 일정 칸 값 모양은 브라우저 기본 입력(`YYYY-MM-DD`·`HH:mm`). 종료 = 시작도 다음 날(24시간). 바꾸지 않은 일정은 보내지 않는다 — 하루를 넘는 v1 공연이 단일 날짜 모델로 바뀌지 않게. 되돌리기: `schedule.ts`
6. 칸 검사는 바뀐 칸만(손대지 않은 빈 이름·지난 시작이 다른 칸 저장을 막지 않게). 준비중 공연의 지난 시작은 막지 않는다(서버도 막지 않음 — 등록만 못 한다). 되돌리기: `validateBasicInfo`
7. 공연 문의처는 빈 한 줄로 시작하고, 유형도 값도 없는 줄은 보내지 않는다(0개 저장 허용 — 서버 0~10). 유형·placeholder는 호스트 연락처 6종(`host-fields`)을 그대로 쓰고 전화 15자 제한은 두지 않는다(서버 공연 규칙). 되돌리기: `basic-info-form.ts` `isBlankContact`·`eventContactError`
8. 장소 칸을 모두 비우면 "바뀌지 않음"으로 본다(서버는 장소를 지우는 PE-4를 받지 않는다). 좌표 변환 중·실패면 저장하지 않는다. 주소는 우편번호 결과만 받는다(직접 입력 없음). 되돌리기: `changedBasicFields`의 `place`
9. 섹션 기본 4탭 제목은 관객 상세(P5b)의 `DEFAULT_SECTION_TITLES`("공연소개" — 붙여 씀)를 그대로 쓴다. 백엔드 `EventSection.DEFAULT_TITLES`는 "공연 소개"(띄어 씀)이고 v1 이관 섹션·관객 상세 대체 제목도 "공연 소개"다 — 디자인 확인 필요. 되돌리기: `section-tabs.ts` 상수 하나(관객 빈 탭도 같이 바뀐다)
10. 빈 본문(`<p></p>` 등 — 글자·이미지 없음)은 `content: null`로 보낸다. MARKDOWN 섹션은 `renderSectionHtml`로 바꿔 에디터에 넣는다(저장하면 HTML). 새 섹션 제목은 빈 칸(채워야 저장). 되돌리기: `sections-form.ts`
11. 저장 결과 상태 `savedNotice`: 준비중 `saved`, 등록 뒤 `registeredChanged`(안내 팝업 문구는 V — 최소 마크업 문구는 잠정). `canPreview` = `canSave`(plan V "저장하기를 누를 수 있을 때만")
12. PE-8 `Event_400_15`(시작이 지남)를 화면 처리 코드로 더했다(patterns §24에 없던 코드 — 소스 확인). 문구 잠정
13. 읽기 전용 문구("일반 멤버는 공연 정보를 볼 수만 있어요"·"끝난 공연은 수정할 수 없어요")·체크리스트 행 라벨·서버 코드 문구는 모두 잠정(design-requests 기본안 범위 — V에서 디자인 문구로)
14. 공연 삭제 입구는 공연준비 홈 카드에만 둔다(공연 화면 안 삭제는 계획에 없다). 지운 공연의 GE-3 이하 캐시는 버린다
15. 카카오 Geocoder 어댑터를 L에 둔다(`kakao-geocoder.ts` — 카카오맵 SDK `autoload=false` + `services`). 우편번호 창은 V. 최소 마크업은 주소 글자 칸 + [주소 선택]으로 대신한다

**남음**: V 전부(진행 막대·호스트 카드·Radio·날짜 선택기, 공연 사이드바·모바일 헤더(Q37)·활성 메뉴, 체크리스트 행·"등록 준비 완료" 모달·등록 확인 팝업·토스트, 기본 정보 2열·Daum 우편번호 창·지도 미리보기·태그 칩·이탈 확인(`dirty`는 L에 있다), Tiptap 에디터·탭·미리보기 화면(`preview/page.tsx` — L에서 만들지 않았다), 카드 ⋮ 메뉴·삭제 확인). 실제 카카오맵 SDK 동작(도메인·키)은 V/실환경 확인. 티켓 있는 공연의 등록 완주는 P12-L 뒤. QA 시나리오 캡처(V)
**검사**: typecheck · lint · prettier · test(1780 — 새 162) · test:stories(193) · build · e2e(288 — 새 24) 통과. 로컬에 `.env.local`이 없어 `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`로 돌렸다
**문서 반영**: plan P11 완료 기준 L, patterns §22(공연 스코프)·§23(저장 뒤 반영·일정 칸)·§24(P11 `Event_400_15`·`Event_400_13` 행), api-contract §6(P11-L 소스 확인 — GE-3 `checklist`·`posterImageKey`, 공연 문의처 규칙, PE-6·PE-8·DE-9 코드), directory-structure(api·features·라우트·mock)

## P12-L — 티켓 · 옵션 관리 (로직)

**상태**: done (2026-10-30, 커밋 전) — V 전부 남음
**변경**: `src/api/bank/`(`src/api/refund/`에서 옮김 — 환불 계좌·티켓 계좌 공통, import 3곳). `src/api/ticket-item/`: `schema.ts`에 관리 스키마(`TicketItemManageSchema`·`TicketSaleStateSchema`·`TicketAccountSchema`·`AppliedTicketOptionSchema`)·요청 스키마(`CreateTicketItemRequestSchema`·`UpdateTicketItemRequestSchema`(`clear[]`, `.strict()` — 명시적 null 불가)·`TicketAccountRequestSchema`(`bankCode`만)·`ReplaceTicketOptionsRequestSchema`)·입력 규칙 상수(`TICKET_NAME_MAX` 12·`TICKET_DESCRIPTION_MAX` 30·`TICKET_PRICE_MAX` 1,000만·`TICKET_COUNT_MAX` 999,999·`TICKET_OPTIONS_MAX` 10·계좌 30/30/50·`TICKET_CLEARABLE_FIELDS`), `queries.ts` `ticketItemsManageQuery`(T-1 `['events', id, 'manage', 'ticket-items']`), 새 `mutations.ts` 6종(T-2~T-6·O-5). 새 `src/api/option/`(schema·queries `eventOptionsQuery` O-1 `['events', id, 'manage', 'options']`·mutations O-2~O-4). `features/hosting/ticket/`(새): `model/` ticket-rules·ticket-form·option-form·bank-select·ticket-cache + 훅 5개, 화면 자리 `TicketListView`·`TicketFormView`. 라우트 `hosting/events/[eventId]/tickets/page.tsx`·`new/page.tsx`·`[ticketItemId]/page.tsx`. mock: `ticket-store.ts`(새 — fixture 공개 티켓·옵션을 관리 모양으로 옮긴 저장소, GP-5 투영 `publicTicketsOf`), `hosting-ticket.handlers.ts`(새), `event.handlers.ts`(GP-5가 저장소를 읽는다), `event-store.ts`(`hasValidTicketOf` — 체크리스트 ③·`Event_400_25`가 티켓 저장소를 본다, `hasValidTicket`은 강제 플래그로만), `hosting-event.handlers.ts`(`guard`·`isEditable`·`RANK` export), `hosting.handlers.ts`(`resetHostingStore`가 티켓 저장소도 되돌린다), `handlers.ts`

**백엔드 소스**: `432cce4`(로컬 클론) → dev `cb8d24e`(`git diff`에서 티켓·옵션·은행 변경은 #873 `f22fca0c` — `V2UpdateTicketItemRequest` 동의 필드 + `V2UpdateTicketItemUseCase`·`V2TicketItemDomainService.updateTicketItem` 무료 → 두둥 동의 검사·기록). 근거 파일: `V2TicketItemController`·`V2TicketOptionController`·`V2BankController`, `V2TicketItemRequest.kt`(`V2TicketItemRequest`·`V2UpdateTicketItemRequest.read`·`V2TicketAccountRequest`·`V2ReplaceTicketOptionsRequest`)·`V2TicketOptionRequest.kt`·`V2TicketItemManageResponse.kt`·`V2TicketTypes.kt`, 유스케이스 10개, `V2TicketItemDomainService`·`V2TicketItemForm`(`V2TicketClearableField`)·`V2TicketOptionDomainService`·`TicketItem`·`OptionGroup`·`TicketItemErrorCode`·`AgreementService`·`BankCode`·`V2PublicTicketItemMapper`

**훅이 돌려주는 것**
- `useTicketList(eventId, {now?})` → `{event, canEdit, readOnlyMessage, status, retry, noTicketEvent, canAdd, newHref, cards[{ticket, chip, chipLabel, locked, menu[{action: edit|delete|suspend|resume, label}], editHref, canManageOptions}], empty, suspend(id), resume(id), remove(id): Promise<boolean>, pendingId, actionError, dismissActionError}`
- `useTicketForm(eventId, ticketItemId | null, {now?})` → `{event, ticket, missing, mode: create|edit, canEdit, readOnlyReason: role|ended|noTicketEvent|priceTicket|null, readOnlyMessage, values, locks{locked, quantityPublic, approval, limitedSupply}, setPayType, setName, setDescription, setPrice, setUnlimited, setSupplyCount, setQuantityPublic, setLimitPurchase, setPurchaseLimit, setApprovalRequired, setAccountHolder, setAccountNumber, setSalePeriod, setSaleStartNow, setSaleStart(date, time), setSaleEnd(date, time), bank(= useBankSelect), agreement{field, required, agreed, setAgreed}, errors, serverErrors, formError, attempted, dirty, saving, canSave, save(), listHref}`
- `useBankSelect(value, onSelect)` → `{status, retry, banks, keyword, setKeyword, filtered, selected, select(code), codes}`
- `useTicketOptions(eventId, ticketItemId)` → `{ticket, canChange, attached, poolStatus, retryPool, attachable, canAttachMore, attach(id), detach(id), values, setName, setDescription, setType, setYesAdditionalPrice, errors, serverErrors, attempted, createAndAttach(): 'attached'|'createdOnly'|'failed', partial, retryAttach(), pending, error, dismissError}`
- `useOptionEditor(eventId, optionId)` → `{status, missing, option, canEdit, values, type(읽기 전용), priceLocked, setName, setDescription, setYesAdditionalPrice, errors, serverErrors, attempted, dirty, canSave, save(), canDelete, remove(), deleted, busy, error}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `ticket-manage-api.test` 40건, `ticket-rules.test` 88건, `useTicketList.test` 10건, `useTicketForm.test` 18건, `useTicketOptions.test` 10건, e2e `hosting-ticket.spec` 11건(×2 프로젝트) |
| 두둥·무료 생성·수정·삭제 | 훅 「기본값 그대로(두둥 …) 저장 → 서버가 받는다 …」·「무료 티켓: 승인 토글이 열리고 가격·계좌 없이 저장(가격 0)」·「바뀐 필드만 + 비우면 clear[] …」, 목록 「지우면 남은 목록을 넣고 …」, api T-2·T-3·T-4 describe, e2e 「빈 목록 → 두둥 티켓 …」·「무료 티켓 …」·「수정: 바뀐 필드만 보낸다」·「판매 전 티켓을 지우면 …」 |
| 무제한 → 재고 공개 꺼짐·비활성 | 규칙 「무제한이면 재고 공개를 끄고 비활성」, 훅 「무제한이면 재고 공개를 끄고 비활성 — 켜려 해도 바뀌지 않는다」, e2e(`재고 공개` 체크 해제 + disabled) |
| 수정 본문 바뀐 필드 + `clear[]` | 규칙 describe 「수정 본문(P10/T-3 …)」 8건, 훅 「바뀐 필드만 + 비우면 clear[]」·「수량 지정 → 무제한은 clear SUPPLY_COUNT + 재고 공개 끔」, api 「보낸 필드만 바뀌고, clear로 비운다」·「명시적 null은 400 …」 |
| 잠긴 티켓 허용 필드 · ⋮ 메뉴 | 규칙 it.each 「잠금」 4행·「⋮ 메뉴」 8행·「잠긴 티켓: … 잠금」·「잠긴 티켓의 수량은 늘리기만」, 훅 「잠긴 티켓(501): 이름·가격·결제 방식은 바뀌지 않고 …」·목록 「카드: …」, api 「잠긴 티켓(501 판매됨) …」·「승인 대기 주문이 있으면 잠긴다」, e2e 「판매된 티켓은 삭제 대신 판매 중단만 …」·「잠긴 티켓 수정 화면 …」 |
| 새 옵션 = 생성 + 지정(중간 실패) | 훅 「두 번 호출해 붙인다 → attached」·「붙이기가 실패하면 createdOnly — … retryAttach로 다시 붙인다」·「만들기가 실패하면 failed …」, e2e 「카드 [티켓 옵션 추가]에서 새 옵션을 만들면 생성 + 지정 두 번 호출 …」 |
| 판매 중단 → 재개가 목록 · GP-5에 | 목록 훅 「중단하면 목록 카드가 바뀌고 관객 GP-5 키를 정확히 무효화 — GP-5에서 빠진다, 재개하면 다시」, api 「판매 중단 → GP-5에서 빠지고, 재개 → 다시 나온다(멱등) …」, e2e 같은 시나리오(GP-5 응답) |
| 티켓 없음 공연 추가 불가 | 규칙 it.each 「티켓 있음 … → 추가」, 목록 훅 「티켓 없음 공연은 추가할 수 없다」, 폼 훅 「티켓 없음 공연은 만들 수 없다 — 읽기 전용 …」, api 「티켓 없음 공연에는 만들 수 없다(Ticket_Item_400_12)」, e2e 「티켓 없음 공연에서는 추가할 수 없다 …」 |
| 옵션 수정에서 응답 형식 못 바꿈 | 규칙 「수정 본문: 바뀐 것만, 형식(type)은 없다 …」, 훅 「잠긴 옵션(701): … 본문에 이름만(형식 없음)」, api 「O-3: 응답 형식은 본문에 없다(스키마가 거른다) …」 |
| 에러 분기 P12 | 훅 it.each `Ticket_Item_400_13`·`400_3`·`400_8` 칸 오류, `400_14` 폼 오류 + 목록 다시 읽기, `Agreement_400_1` 폼 오류, 목록 `400_7` 안내 + 다시 읽기, 옵션 `Option_Group_400_5` 안내 + 풀 다시 읽기·`400_6` 칸 오류, api(코드·검사 순서 — `400_2`·`400_11`·`400_12`·`400_15`·`Item_Option_Group_400_2`·`400_4`·`Option_Group_400_1`·`400_2`·`400_3`·`400_4`·`404`·`Event_400_17`) |
| 기본값 그대로 저장 가능 | 규칙 「새 폼 기본값: 두둥 · 무제한 + 재고 공개 꺼짐 · 승인 켬 …」, 훅·e2e 기본값 저장 → 200 |
| 두둥 생성 본문 동의 · `bankCode` | 규칙 「동의(#840): 두둥이고 사용자가 체크했을 때만 …」·「체크 칸은 Q42 대기」·「무료 → 두둥(#873) …」, 훅 「동의(#840): 기본은 보내지 않는다 …」, api 「동의 강제(#840) …」·「무료 → 두둥 …(#873) …」, e2e POST 본문(`bankCode`만, 동의 키 없음) |

그 밖: 은행 고르기 「은행은 목록에서만 — 검색어로 거르고 …」·`filterBanks` it.each 7행, 상태 칩 it.each 7행, GP-5 투영 「GP-5 투영은 fixture 공개 티켓과 같다」(P6·P7 시나리오 보존), 키 「GE-3 아래(마스터 양도 뒤 술어 무효화에 걸린다)」. **P11이 남긴 티켓 있는 공연의 등록 완주**: e2e 「만들기 → 기본 정보 → 섹션 → 체크리스트 ③은 티켓을 만들어야 찬다 → 등록 → 관객 GP-5에 티켓」.

**결정**
- 키: T-1·O-1은 GE-3 아래(`['events', id, 'manage', 'ticket-items' | 'options']`) — P10b 술어 무효화(양도)에 걸린다. GP-5 공개 키(`['events', id, 'ticket-items']`)는 티켓·옵션 변경 뒤 `exact`로 무효화
- mock: 티켓 저장소를 두어 T-*·O-* 변경이 T-1·O-1·GP-5·체크리스트 ③에 이어진다. 동의 강제는 저장소 플래그(`setTicketAgreementEnforced`)로 — 검사 순서까지 백엔드와 같게
- 은행 목록 모듈을 `src/api/bank`로 옮겼다(P9 주석이 "P12가 쓰게 되면 정한다"고 남긴 것)

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. GP-5 mock 투영은 fixture 기준 시각(`PUBLIC_VIEW_NOW` = 2026.10.17 20:00)으로 판매 기간·구매 가능을 계산한다(변경 검사는 실제 시각). 실제 시각이면 fixture 공연 102 등이 날짜가 지나 P6·P7 테스트가 깨진다. 되돌리기: `ticket-store.ts` `publicTicketsOf`의 `now` 기본값
2. 체크아웃·주문 mock(`fixtures/order.ts`·`ticketItemHandlers`)은 여전히 fixture 공개 티켓을 읽는다 — 호스트가 바꾼 티켓은 GP-5에만 반영되고 O-0·O-1 mock에는 반영되지 않는다. 되돌리기: order 핸들러가 `publicTicketsOf`를 읽게
3. 상태 칩: 판매 중단을 "판매 중단" 칩으로 따로 둔다(GUI 칩은 판매중·판매 종료·판매 예정 셋뿐). 판매 종료가 없으면 공연 시작을 끝으로 본다. 공연 등록 전·매진은 칩에 넣지 않는다. 되돌리기: `ticket-rules.ts` `ticketSaleChipOf`
4. ⋮ 메뉴: 기존 PG 티켓(`payType=PRICE`)·모르는 결제 방식은 [수정]을 두지 않는다(서버 `Ticket_Item_400_11`). 되돌리기: `ticketMenuOf`
5. 판매 기간 토글을 켜면 판매 종료는 필수(날짜·시각), 판매 시작은 "공연 등록 즉시" 체크 또는 날짜·시각. GUI에 종료 "공연 시작까지" 체크가 없어서다. 되돌리기: `salePeriodOf`
6. 수정 폼: 응답 `bankCode`가 null인 옛 자유 입력 은행명은 계좌를 고치지 않으면 보내지 않고, 고치면 목록에서 다시 고르게 한다. 계좌는 세 칸 중 하나라도 바뀌면 세 값을 통째로 보낸다. 되돌리기: `isAccountChanged`
7. 무료 → 두둥 전환 시 승인은 서버가 켜므로 `approvalRequired`를 보내지 않는다. 두둥 → 무료면 계좌를 보내지 않는다(서버가 지운다). 되돌리기: `toUpdateTicketBody`
8. 동의 칸: `REFUND_OBLIGATION_FIELD = false`(Q42 대기). 훅은 `agreement.agreed`·`setAgreed` 상태만 두고 화면은 그리지 않는다 — 기본 false라 보내지 않는다. 칸이 생기면 상수를 true로 바꾸면 동의 전 저장이 막힌다. `Agreement_400_1`은 폼 오류 "필수 동의를 확인해 주세요". 되돌리기: `ticket-form.ts` 상수·`useTicketForm`
9. 무료 티켓에 붙일 새 옵션은 추가금 0만 받는다(만든 뒤 O-5가 `Item_Option_Group_400_4`로 실패해 반쪽 성공이 되지 않게). 유료 옵션이 붙은 두둥 티켓은 무료로 바꾸지 못하게 결제 방식 칸 오류. 되돌리기: `validateOptionForm({freeTicket})`·`validateTicketForm` `hasPaidOption`
10. 새 옵션 만들기가 성공하면 붙이기 결과와 상관없이 폼을 비운다(다시 누르면 같은 옵션이 또 생기지 않게). 붙이기 실패면 `partial` + `retryAttach()`. 되돌리기: `useTicketOptions.createAndAttach`
11. 옵션 상세(수정·삭제)는 붙은 옵션에서만 연다(최소 마크업). 삭제 입구는 상세 하단(patterns §23 기본안), 잠긴 옵션이면 없다
12. 저장 뒤 티켓 목록으로 `replace`(만들기·수정 모두). 되돌리기: `useTicketForm` `onSaved`
13. 화면 문구(칸 오류·폼 오류·읽기 전용 안내·칩 라벨)는 모두 잠정(V에서 디자인 문구로). 금지 문구(약관 제19조⑥ — 무료티켓·옵션으로 대금 받기 안내)는 어디에도 쓰지 않았다
14. `src/api/refund` → `src/api/bank` 이동. 되돌리기: `git mv` + import 3곳

**남음**: V 전부(카드·상태 칩·⋮ 메뉴 팝오버·빈 상태, 티켓 폼 카운터·토글·DatePicker·은행 Combobox, 옵션 추가·상세 모달·옵션 칩·"티켓 옵션이란?"·관리자 승인 가이드 팝오버, 티켓 없음 공연 안내, 이탈 확인 — `dirty`는 L에 있다), 동의 칸(Q42), 판매 중단 딤드(Q33), 공연 상세에 판매 중단 반영 확인(P6-V 뒤). QA 시나리오 캡처(V)
**검사**: typecheck · lint · prettier · test(1946 — 새 166) · test:stories(193) · build · e2e(308 — 새 22 = `hosting-ticket.spec` 11건 ×2) 통과(`NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`)
**문서 반영**: plan P12 완료 기준 L, patterns §23(티켓·옵션 변경 뒤 반영)·§24(P12 `Ticket_Item_400_2`·`400_11`·수정 `Item_Option_Group_400_4`·`Event_400_17`·`Option_Group_400_3` 행, `Agreement_400_1` 행에 #873), api-contract §6(P12-L 소스 확인 — 응답 모양·검사 순서, #873 위치), directory-structure(api bank·ticket-item·option, features ticket, 라우트, mock)

## P13b-L — QR 체크인 (로직)

**상태**: done (2026-10-31, 커밋 전) — V 전부 남음
**변경**: `src/api/check-in/`: `schema.ts`에 `CheckInStatsSchema`(GQ-1)·`CheckInQrSchema`(GQ-4)·`HostCheckInRequestSchema`(PQ-2, `.strict()`, uuid 64자)·`CHECK_IN_TICKET_UUID_MAX`, 새 `queries.ts` `checkInStatsQuery`(`['events', id, 'manage', 'check-ins', 'stats']`)·`checkInQrQuery`(`…, 'manage', 'check-in-qr']`, `staleTime: Infinity`), `mutations.ts` `hostCheckInMutation`(PQ-2). `features/hosting/qr/`(새 — directory-structure의 이름): `model/` qr-check-in-rules·qr-cache + 훅 3개(`useCheckInStats`·`useHostScan`·`useSelfCheckInQr`), 화면 자리 `QrCheckInView`. 라우트 `hosting/events/[eventId]/qr/page.tsx`(브라우저 조회만). 공용 `features/shared/checkin-result`는 그대로 썼다(호스트 모드 `'host'`가 P8c-L에 이미 있었다 — 고치지 않음). mock: `check-in.handlers.ts`(GQ-1·PQ-2·GQ-4 + `hostCheckInSets`, 기본 목록 `checkInHandlers.default`에 들어가 `handlers.ts`는 안 고침), `fixtures/my-ticket.ts`(셀프 체크인 토큰을 저장소 `checkInTokens`로 — GQ-4가 새 토큰을 넣으면 PQ-5가 받는다, `hostCheckIn`·`checkInStatsOf`·`checkInTokenOf`·`markTicketCanceled`)

**백엔드 소스**: `432cce4`(로컬 클론) → dev `cb8d24e` — `git log 432cce4..origin/dev`에 체크인 변경 없음(`Event.kt`는 `@Where` → `@SQLRestriction`만). 근거 파일: `V2IssuedTicketController`(Q-1·Q-2·Q-4·Q-5), `V2CheckInUseCase`, `V2CheckInDomainService`, `V2OperationRequests.kt`, `V2CheckInResponses.kt`, `V2IssuedTicketResponses.kt`·`V2IssuedTicketQuery.stats`·`V2EntranceStats`, `EventErrorCode`(`Event_400_27`), `EventService.updateEventStatus`·`closeExpiredEventsEndAtBefore`, `DuDoong-Batch` `EventExpiration`, v1 `UpdateEventStatusUseCase`

**훅이 돌려주는 것**
- `useCheckInStats(eventId)` → `{status, stats{issuedCount, enteredCount, notEnteredCount, entranceRate} | null, refreshFailed, refreshing, retry}`
- `useHostScan(eventId, {cooldownMs?, now?})` → `{state: idle | checking{value} | result{value, view} | invalidQr | eventNotCheckable{message} | failed{value, failure{kind: network|server|forbidden|notFound, message, canRetry}}, submitScan(value): 'sent'|'queued'|'ignored'|'invalid'|'blocked', retry, reset, checking, block: notRegistered|ended|unknown|null, blockMessage}` — V 카메라는 인식할 때마다 `submitScan(value)`만 부르면 된다
- `useSelfCheckInQr(eventId, {origin?})` → `{status: blocked|pending|error|ready, block, guidance, hint, qrUrl, retry}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `check-in-host-api.test` 22건, `qr-check-in-rules.test` 38건, `useQrCheckIn.test` 24건, e2e `hosting-checkin.spec` 7건(×2 프로젝트) |
| 통계가 스캔 뒤 갱신 | 훅 「스캔 → 입장 완료(ownerName) → 체크인 통계(GQ-1)가 다시 읽혀 바뀐다 …」·「스캔 뒤 다시 읽기가 네트워크로 실패하면 지난 값을 두고 refreshFailed …」, api 「입장하면 GQ-1이 바뀐다」, e2e 「공연 메뉴 → QR 체크인, 스캔하면 입장 완료 + 체크인 통계가 갱신된다 …」 |
| `result` 5종 | 훅 it.each `ALREADY_ENTERED`·`OTHER_EVENT`·`CANCELED`·`GIFT_PENDING` + 첫 테스트 `ENTERED`, api 「result 5종 …」, 공용 `checkin-result.test`(호스트 문구), e2e 「선물 대기 · 다른 공연 티켓 결과 …」 |
| 끝난 공연 [관객이 스캔] 안내 | 규칙 it.each `selfCheckInBlockOf`·「공연이 끝나면 plan 문구로 안내한다」, 훅 it.each 「%s → 안내만, GQ-4를 부르지 않는다」, e2e 「정산중 공연 → 셀프 체크인 안내만 …」 |
| `Event_400_27` | 규칙 it.each `hostScanBlockOf`, 훅 「Event_400_27(스캔 사이에 공연이 끝남) → 안내 + GE-3 다시 읽어 막힌 상태로」·it.each 「공연 %s → block %s」, api it.each 「공연 %s → %j」·「검사 순서 …」, e2e 「스캔 사이에 공연이 끝나면 …」·「지난 공연은 스캔할 수 없고 요청도 없다」 |
| 네트워크 차단 실패 상태 | 훅 「네트워크 차단 → failed(network) + 토스트 없음, retry() …」·「5xx → failed(server) …」, 규칙 「PQ-2 실패 분류」, e2e 「네트워크 차단 → 실패 상태, 연결되면 다시 시도로 입장」(`page.route` abort) |

그 밖: 연속 스캔 「같은 값은 끝난 뒤 쿨다운 동안 무시 …」·「요청 중 같은 값은 무시, 다른 값은 하나만(가장 최근) 대기 …」, 스캔 값 「빈 값은 무시, 64자 넘는 값은 요청 없이 invalidQr」, QR 주소 it.each 9행(남의 출처·`//`·공백 거부), GQ-4 → PQ-5 이어짐(api 「토큰이 없던 공연은 만들고 …」, e2e 「QR 주소 = 이 사이트 origin + qrPath, 그 주소로 들어가면 셀프 체크인」), 일반 멤버도 GQ-1·PQ-2.

**결정**
- 폴더 이름은 directory-structure의 `features/hosting/qr/`(라우트 `qr/`, 공연 메뉴 키 `qr`과 같게)
- 키는 GE-3 아래 — P11·P12 공연 관리 키 규칙과 같게
- 공용 `checkin-result`를 그대로 쓴다 — 호스트 문구·`SELECT_TICKET` → UNKNOWN이 P8c-L에 있었다

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. 연속 스캔: 같은 값은 요청이 **끝난 때부터** 3초(`SCAN_COOLDOWN_MS`) 무시, 요청 중 들어온 다른 값은 가장 최근 것 하나만 대기시켰다가 이어서 보낸다(patterns §19 "대기시킨다"를 큐 1칸으로 읽음). 되돌리기: `qr-check-in-rules.ts` 상수·`useHostScan.submitScan`·`settle`
2. 64자 넘는 값(셀프 체크인 URL을 찍은 경우 등)은 요청 없이 `invalidQr` "티켓 QR이 아니에요". 64자 이하면 모양을 따지지 않고 보낸다(서버가 `OTHER_EVENT`). 되돌리기: `normalizeScanValue`
3. 공연 상태로 미리 막는다 — 호스트 스캔은 OPEN·CALCULATING만, 셀프 체크인 QR은 OPEN만(정산중·지난·준비중은 GQ-4를 부르지 않고 안내만). 모르는 상태(`UNKNOWN`)도 막는다(공연 스코프 읽기 전용과 같은 규칙). 판정은 표시 상태가 아니라 `status`. 되돌리기: `hostScanBlockOf`·`selfCheckInBlockOf`, `useSelfCheckInQr`의 `enabled`
4. PQ-2 에러는 모두 화면이 맡는다(`meta.handled`): 네트워크·타임아웃 → `failed(network)`, 5xx·파싱·모르는 코드 → `failed(server)`(둘 다 다시 시도), 403 → `forbidden`, 404 → `notFound`(다시 시도 없음), `BAD_REQUEST` → `invalidQr`. 되돌리기: `hostScanErrorOutcome`
5. `retry()`는 쿨다운을 보지 않고 같은 값을 다시 보낸다. 되돌리기: `useHostScan.retry`
6. 스캔 뒤에는 GQ-1만 정확한 키로 무효화한다(결과 종류와 상관없이 — 다른 기기의 입장도 반영). 대시보드 GD-1·발급 티켓 GI-1은 QR 화면에 없고 기본 `staleTime` 0이라 열 때 다시 읽는다. 되돌리기: `qr-cache.ts`
7. GQ-1은 `meta.silent` — 스캔 뒤 다시 읽기 실패가 스캔마다 토스트로 쌓이지 않게, 대신 `refreshFailed`. 되돌리기: `useCheckInStats`
8. GQ-4는 `staleTime: Infinity`(공연별 고정 토큰). 훅은 토큰을 돌려주지 않고 QR 주소만(DEC-011). QR 주소는 같은 출처 상대 경로 + http(s) origin일 때만 만든다(아니면 `error`). 되돌리기: `checkInQrQuery`·`selfCheckInUrl`
9. 모드 전환([호스트가 스캔]/[관객이 스캔])은 화면 상태(`useState`)로 두고 URL에 남기지 않았다 — GQ-4는 [관객이 스캔]을 열 때만 부른다. 되돌리기: `QrCheckInView`
10. 화면 문구(막힘 안내 · `Event_400_27` · 실패 · "티켓 QR이 아니에요" · 끝난 공연 다음 행동 안내)는 모두 잠정. 끝난 공연 안내 첫 줄은 plan 완료 기준 문구 그대로
11. mock: 셀프 체크인 토큰을 저장소로 옮겨 GQ-4가 만든 토큰을 PQ-5가 받게 했다(`mock-checkin-{eventId}` 규칙 — 기존 4개 토큰과 같은 모양). 취소된 티켓 시나리오는 seed를 늘리지 않고 도우미 `markTicketCanceled`로. 되돌리기: `fixtures/my-ticket.ts`

**남음**: V 전부 — 카메라 스캐너(`@yudiel/react-qr-scanner` 설치 포함)·카메라 권한 거부·기기 없음 화면, `result`별 화면, [관객이 스캔] QR 그림·전체화면, 통계 표시, 실기기 3종 판독, 실제 폰으로 GQ-4 QR → `/check-in` 입장(D2 스테이징), 네트워크 차단 실패 UI. Q39(1133 "Tablet-QR만"이 QR 전용 태블릿인지) 대기
**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, 같은 작업 트리에서 P13a-L 진행 중): typecheck 통과 · test:stories 통과 · build 통과. lint·prettier는 P13a 진행 파일(`src/api/order/queries.ts` import 정렬, `guest-store.ts`·`issued-ticket/queries.ts` 서식)만 실패 — P13b 파일은 깨끗. test 1905 중 14 실패 · e2e 322 중 15 실패는 모두 P13b와 무관한 테스트가 기기 정지로 멈춘 것(vitest 워커 시작 시간 초과, 테스트당 3~17분) — P13b 새 테스트 84건(unit)·`hosting-checkin.spec` 14건(e2e)은 전체 실행에서 모두 통과. 기기가 한가할 때 전체 게이트를 다시 돌려야 한다
**문서 반영**: plan P13b 완료 기준 L, patterns §24(P13b 행 보강 + 네트워크·5xx · `BAD_REQUEST` · 403·404 행), api-contract 체크인(F8)(P13b-L 소스 확인 — GQ-1 뜻, PQ-2 검사 순서·판정 순서, GQ-4는 상태를 안 봄, 셀프는 `status == OPEN`, 정산중이 되는 길과 만료 배치), directory-structure(api check-in, features qr, 라우트, mock)

## P13a-L — 예매자 관리 · 등록 후 대시보드 (로직)

**상태**: done (2026-10-31, 커밋 전) — V 전부 남음. 크리티컬 패스의 스테이징 agent-browser 왕복은 스테이징이 없어 남음(plan 상자 열어 둠)
**변경**: `src/api/order/`(`schema.ts`에 호스트 주문 스키마 — `HostOrderStatusSchema`(5값)·`HOST_ORDER_STATUS_FILTERS`·`ORDER_SEARCH_TYPES`·`REFUND_STATUS_FILTERS`·`OPERATION_PAGE_SIZE`(20)·`OPERATION_PAGE_SIZE_MAX`(100)·`OPERATION_KEYWORD_MAX`(50)·`HostOrderElementSchema`·`HostOrderCountsSchema`·`HostOrderListSchema`·`HostRefundAccountSchema`·`HostOrderDetailSchema`·`RefundElementSchema`·`RefuseOrderRequestSchema`(기타만 문구, `.strict()`)·`HostCancelOrderRequestSchema`, `queries.ts` `hostOrdersQuery`·`hostOrderQuery`·`refundsQuery`·`normalizeHostOrdersParams`·키 접두 `hostOrdersKey`·`hostRefundsKey`, `mutations.ts` approve·refuse·cancelHost·completeRefund·exportOrders). 새 `src/api/issued-ticket/`(schema·queries GI-1·GI-2·mutations GI-3, `EntranceStatsSchema`), 새 `src/api/dashboard/`(GD-1 schema·`eventDashboardQuery`), 새 `src/utils/download.ts`(`saveBlob` — `http.ts` 주석이 가리키던 파일). `features/hosting/guest/`(새): `model/` guest-rules·guest-cache + 훅 6개(`useGuestsUrlState`·`useOrderList`·`useOrderDetail`·`useIssuedTicketList`·`useRefundList`·`useGuestExport`), 화면 자리 `GuestsView`·`GuestTabs`. `features/hosting/event/`: `model/dashboard-stats.ts`(새) + `useEventDashboard`가 등록 후 모드에서 GD-1을 읽어 `stats`를 돌려준다, `EventDashboardView` 최소 마크업. 라우트 `hosting/events/[eventId]/guests/page.tsx`(+ 옆에 `critical-path.test.tsx`). mock: `guest-store.ts`(새), `hosting-guest.handlers.ts`(새), `order.handlers.ts`(O-1 주문을 예매자 저장소에 넣고, O-4·O-5를 넘기고, 호스트 처리를 O-3에 반영), `fixtures/my-ticket.ts`(끝에 `recordHostApprovedOrder`·`recordHostCanceledOrder`·`myTicketEntranceOf`), `privacy-mask.ts`(`maskName`), `hosting.handlers.ts`(`resetHostingStore`가 예매자 저장소도), `handlers.ts`

**백엔드 소스**: `432cce4`(로컬 클론) → dev `cb8d24e` `git log`/`git diff`에서 v2 주문 관리·환불·발급 티켓·대시보드 변경 없음(`a722a7c` #875 메일 발송 기록, `a88d537` #874 메일·알림톡 이름 빈 값, `f22fca0` #873 티켓 동의, `5444ef0` #872 JWT·Slack, `1b6ec4b` #864 카카오 챗봇, `cb8d24e` Spring Boot 3.5 — 응답·검사 순서에 영향 없음. `EventOrdersToExcel`은 배치 잡). 근거 파일: `V2OrderManageController`·`V2IssuedTicketController`·`V2Excel`, `V2OperationRequests.kt`·`V2OperationTypes.kt`·`V2OrderResponses.kt`·`V2IssuedTicketResponses.kt`·`V2DashboardResponse.kt`, `V2ReadOrdersUseCase`·`V2ChangeOrderUseCase`·`V2ReadIssuedTicketsUseCase`·`V2ReadDashboardUseCase`·`V2OperationMapper`, `V2OrderDomainService`·`V2OrderQuery`·`V2OrderStatus`·`V2MyOrderStatus`·`V2IssuedTicketQuery`·`AdminTableSearchType`·`OrderValidator`·`Order`·`RefundInfoVo`·`PrivacyMasker`·`OrderErrorCode`·`IssuedTicketErrorCode`·`OrderCustomRepositoryImpl.findRefunds`·`V2UserOrderDomainService`(O-3 플래그). 클론 작업 트리에 빠진 파일이 있어 확인은 `git show HEAD:`·`git grep HEAD`로 다시 했다(결론 같음)

**훅이 돌려주는 것**
- `useGuestsUrlState()` → `{tab: orders|tickets|refunds, setTab, orderUuid, openOrder(uuid), closeOrder()}`
- `useOrderList(eventId)` → `{event, status, retry, fetching, statusTabs[{key,label,count,selected}], statusFilter, setStatus, searchTypes, searchType, setSearchType, keywordInput, setKeywordInput, keywordMax, submitSearch, clearSearch, appliedKeyword, exactMatchHint, rows, empty, page, totalPages, totalElements, hasNext, setPage, canExport, exporting, exportError, dismissExportError, exportExcel()}`
- `useOrderDetail(eventId, orderUuid | null, {onMissing})` → `{open, status: idle|pending|error|success|missing, retry, detail, actions[{key: approve|refuse|cancel|completeRefund, label, enabled, blockedBy: started|notOpen|null}], blockedMessage, canSeeRefundAccount, pending, actionError, dismissActionError, missingNotice, dismissMissingNotice, approve(), refuseForm{reasonType, reasonText, setReasonType, setReasonText, errors}, refuseConfirm{title, body, dudoongNotice}, refuse(), cancelReason, setCancelReason, cancelReasonMax, cancelReasonError, cancelConfirm{body, dudoongNotice}, cancel(), completeRefund()}`(동작은 모두 `Promise<boolean>`)
- `useIssuedTicketList(eventId)` → `{status, retry, fetching, counts, entranceFilters[{key,label,count,selected}], entrance, setEntrance, searchTypes, searchType, setSearchType, keywordInput, setKeywordInput, keywordMax, submitSearch, appliedKeyword, exactMatchHint, rows, empty, page, totalPages, hasNext, setPage, selectedTicketUuid, openTicket, closeTicket, detailStatus, detail, missingNotice, dismissMissingNotice, canExport, exporting, exportError, dismissExportError, exportExcel()}`
- `useRefundList(eventId)` → `{status, retry, fetching, filters, statusFilter, setStatus, rows[{refund, canComplete}], empty, page, totalPages, hasNext, setPage, canSeeRefundAccount, complete(uuid), pendingUuid, actionError, dismissActionError}`
- `useEventDashboard(eventId)`에 더한 것 → `{statsStatus, retryStats, stats: {dashboard, cards[{key,label,count,href}], newBadgeCount, sales{state: beforeSale|selling, totalSoldCount, totalSupplyCount, salesAmount, items[+share]}, entrance{entered, issued, label, ratio, rate}, timeline[{key, label, from, to, state}], qrHref} | null}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `guest-manage-api.test` 30건, `guest-rules.test` 43건, `dashboard-stats.test` 10건, `useOrderDetail.test` 16건, `useGuestLists.test` 12건, `useGuestsUrlState.test` 6건, `useEventDashboard.test` +4(1건 고침), `critical-path.test` 2건, e2e `hosting-guests.spec` 10건(×2 프로젝트) |
| NEW 배지 = 승인 대기, 발급 0이면 0/0 | 대시보드 훅 「NEW 배지 수 = 승인 대기 수, 카드 4개 …」·「발급 0인 공연(103)은 입장 현황 0/0, 판매 전」, 규칙 「입장 현황 분모 = 발급 수」 it.each, api 「발급 0인 공연은 입장 현황 0/0」, e2e 「등록 후 대시보드 …」 |
| 승인 실패 → 안내 + 승인 대기 | 훅 it.each 「승인 실패(재고 부족 · 탈퇴한 주문자) → 안내 후 주문은 승인 대기로 남고 거절할 수 있다」, api it.each 「… → 코드, 주문은 그대로」·「1인 제한(4매) …」 |
| 시작 후 비활성 + 다시 읽기 | 훅 「공연 시작 후에는 승인·거절 비활성 …」·「화면을 연 뒤 공연이 시작됨 — 승인 Event_400_6 → GR-2·GE-3 다시 읽기」·「시작 후 거절·취소에 Order_400_9 …」, 규칙 「공연 시작 후 …」 it.each, api 「시작 후 거절·취소는 Order_400_9(상태 검사보다 먼저) …」 |
| 승인 후 취소 → 환불 탭 REQUESTED | 훅 「승인 후 취소(사유 선택) → 발급 티켓 취소, 유료면 환불 탭에 REQUESTED로 나타난다」, api 「승인 후 취소: … 환불 탭에 REQUESTED」·「무료 주문 취소는 환불 요청이 없다」 |
| 환불 계좌는 매니저 이상에게만 | 훅 「일반 멤버: … 환불 계좌 없음」·「매니저는 환불 계좌(updatedAt 포함)를 본다」, 목록 「환불 계좌는 매니저 이상에게만 …」, api GR-2·GF-1 |
| `?tab=` 유지, `?order=` 진입 | URL 훅 「탭은 주소에 남는다 …」·「새로고침(주소로 들어옴)해도 탭 유지, ?order=로 들어오면 상세가 열린 상태」, e2e 「탭은 주소에 남아 새로고침해도 유지된다」·「?order=로 들어오면(호스트 알림 진입) …」(P9b 알림 링크 모양 `/hosting/events/{id}/guests?order={uuid}` — 이 검증으로 P9b가 넘긴 진입 확인을 닫는다) |
| 뒤로가기는 상세만, 닫은 뒤 헛돌지 않음 | URL 훅 「열기 = pushState(ddOverlay) → 뒤로가기는 상세만 닫는다」·「닫기로 닫으면 내 항목을 소비 …」, e2e 「목록에서 열면 뒤로가기는 상세만 닫는다 — 닫기로 닫은 뒤 뒤로가기가 헛돌지 않는다」 |
| 승인·거절 뒤 `counts` 갱신 | 훅 「승인 → … 상태 탭 counts가 갱신된다(승인 대기 2 → 1)」, e2e 「승인하면 … 상태 탭 건수가 갱신된다」 |
| 환불 요청 → 환불 완료 → 관객 주문상세 | `critical-path.test` 「환불 요청 → 호스트 환불 완료 → 관객 주문상세의 환불 완료까지」, 훅 「환불 완료 — REQUESTED일 때만 버튼」, 목록 「[환불 완료]는 REQUESTED + 매니저만 …」 |
| 크리티컬 패스(훅/라우트 부분) | `critical-path.test` 「관객이 두둥 티켓 2매를 주문하면 … 승인하면 관객 티켓탭에 2장이 발급된다」(P6 `useTicketSelection` → P7 `useCheckout` → `useOrderList`·`useOrderDetail` → O-3 · P8 `useTicketTab`), e2e 「크리티컬 패스: 체크아웃 → 주문 → 호스트 승인 → 티켓탭에 발급」. **스테이징 왕복은 남음** |
| 에러 분기 P13a | 훅 승인 `Ticket_Item_400_1`·`Order_400_14`·`Event_400_6`·`Order_400_3`(#828), 거절·취소 `Order_400_9`·칸 오류, 404 조회·처리, 엑셀 `Order_400_19`·`IssuedTicket_400_7`·403 `HOST_400_1`, 티켓 상세 `IssuedTicket_404_1`, api(코드·검사 순서 — 승인 8단계, 거절 `Order_400_18`이 404보다 먼저, 취소, PF-2 멱등·`Order_400_17`) |
| 엑셀(래퍼 없는 xlsx), 1만 행 초과 | 목록 훅 「엑셀(매니저): 지금 필터로 xlsx를 받아 저장, 1만 행 초과는 안내」·티켓 「엑셀 1만 행 초과 안내」, api 「매니저: 래퍼 없는 xlsx + 파일 이름 …」, e2e 「매니저 이상은 엑셀(래퍼 없는 xlsx)을 내려받는다」(download 이벤트·파일 이름) |
| 일반 멤버: 엑셀 없음·가린 값·완전 일치 안내 | 목록 훅 「일반 멤버: 엑셀 없음, 연락처·입금자명 검색에 완전 일치 안내, 가린 값 그대로」·티켓 「일반 멤버: 엑셀 없음, 연락처 검색 안내」, 규칙 it.each 6행, api 「일반 멤버: … 완전 일치만(#846)」, e2e 「일반 멤버: …」 |
| 등록일 `openedAt`, null이면 Q43 | 대시보드 훅 「openedAt이 null이면 …(Q43 기본안)」·「방금 등록한 공연은 등록일 = 서버 openedAt(GD-1)」, 규칙 「일정 타임라인」 3건 |

**결정**
- 키: 모두 GE-3 아래(`['events', id, 'manage', 'orders' | 'refunds' | 'issued-tickets' | 'dashboard', …]`) — P10b 마스터 양도 술어 무효화에 걸린다(역할이 바뀌면 가림·계좌·엑셀 권한이 바뀐다)
- 화면 위치: plan의 `features/hosting/guests/` 대신 directory-structure의 `features/hosting/guest/`. 대시보드 파생값은 P11 대시보드 훅을 늘려 `event/model/dashboard-stats.ts`에 둔다(중복 없이)
- API 폴더: 호스트 주문은 `src/api/order/`에 더하고(P12가 `ticket-item`에 관리 스키마를 더한 것과 같은 방식), 발급 티켓은 directory-structure에 자리가 있던 `src/api/issued-ticket/`, GD-1은 새 `src/api/dashboard/`(`event` ↔ `issued-ticket` 순환 import를 피하려고)
- mock: 호스트 쪽 예매자 저장소를 따로 두고 관객 O-1 주문만 연결했다(시드 주문 9건은 연결 없음). 호스트 처리는 리스너로 `order.handlers.ts`의 O-3 저장소를 고치고, 승인은 티켓탭 저장소에 티켓을 넣는다 — 크리티컬 패스가 MSW 위에서 이어진다. P13b가 체크인을 티켓탭 저장소에 기록하므로 관객 주문 티켓의 입장 상태는 그쪽을 읽는다

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. `?order=` 닫기(표시 없음)와 탭 전환은 `router.replace` 대신 얕은 `replaceState(null, …)`(patterns §13 방식 — 같은 주소 결과에 서버 왕복이 없다). 상세에서 다른 주문을 열면 항목을 더 쌓지 않는다. 탭을 바꾸면 `order`를 지운다. 되돌리기: `useGuestsUrlState`의 `replaceSearch`를 `router.replace`로
2. 상태 탭·검색·페이지·입장/환불 필터·티켓 상세는 주소에 남기지 않는다(tech-decisions §3 표에 `?tab=`·`?order=`만). 그래서 대시보드 카드 ↗는 주문 탭(환불 요청만 `?tab=refunds`)으로만 간다. 되돌리기: `guest-rules.ts` `guestsSearch`에 파라미터를 더하고 `statCardsOf`의 `href`
3. 검색은 [검색]으로 적용(입력 중 자동 검색 없음), 적용하면 첫 페이지. 탭·필터를 바꿔도 첫 페이지. 되돌리기: 각 목록 훅의 `submitSearch`
4. 공연 시작 판정은 GE-3 `displayStatus`(진행중·지난 공연 = 시작 후, 모르는 값도 시작 후). 서버는 실제 시각 — 경계에서 어긋나면 서버 코드(`Event_400_6`·`Order_400_9`)가 와서 다시 읽는다. 환불 완료는 시작 후에도 연다(서버 검사 없음). 되돌리기: `isEventStarted`·`orderActionsOf`
5. 승인 후 취소 사유는 선택 자유 입력(plan "사유 선택"을 "사유는 선택"으로 읽었다 — 서버도 선택). 비면 본문 없이. 되돌리기: `toCancelBody`·`useOrderDetail.cancel`
6. 두둥 판정: `paymentChannel`이 계좌이체이고 금액 > 0, 또는 `null`(v1)이고 금액 > 0(B19 "답이 없으면"). 거절·취소 확인의 직접 환불 줄은 legal-copy C-3·C-4 문구 그대로, 확인 본문은 C-2 v1 운영 문구(참고 문구 — V에서 디자인 문구로). 되돌리기: `isDudoongOrder`·`REFUSE_CONFIRM`·`CANCEL_CONFIRM`
7. 일정 타임라인: 지금 단계는 표시 상태(예정 = 홍보·판매, 진행중 = 공연 시작, 지난 공연 = 공연 완료). 공연 완료 단계의 날짜는 두지 않고 주간 줄은 만들지 않았다(Q39 대기). `openedAt` null이면 등록 줄을 뺀다(Q43 기본안). 되돌리기: `scheduleTimelineOf`
8. 티켓 판매 "판매 전"은 총 판매 매수 0일 때. 도넛 몫은 판매 매수 / 총 판매 매수. 되돌리기: `ticketSalesOf`
9. 일반 멤버 검색 안내 문구 "연락처·입금자명은 전체를 정확히 입력해야 찾을 수 있어요"와 모든 에러·안내 문구는 잠정(V에서 디자인 문구로). 되돌리기: `guest-rules.ts` 상수
10. 엑셀 403 `HOST_400_1`은 전역 토스트(일반 403)에 두고 GE-3만 다시 읽는다(버튼이 사라진다). 되돌리기: `useGuestExport`의 `onError`
11. 처리 404(`Order_404_1`)도 조회 404와 같이 닫고 목록 다시 읽기(patterns §24 행은 상세 조회만 적었다). 되돌리기: `useOrderDetail`의 `approveCodes`·`withdrawCodes`·`refundCodes`에서 `Order_404_1` 제거
12. mock 판정: 시작 후 = 공연 표시 상태(fixture 기준, 실제 시각 아님 — 다른 mock과 같다). 1인 제한은 같은 주문자의 같은 티켓 유효 발급 수 + 이번 수량. 시드 주문과 티켓 저장소 판매 매수(101 일반 예매 58장)는 맞추지 않았다 — GD-1 판매 매수는 티켓 저장소, 건수·판매금액은 예매자 저장소. 관객 주문 티켓이 아닌 시드 티켓의 입장 상태는 P13b 체크인(GQ-1·PQ-2 — 티켓탭 저장소)과 이어지지 않는다(GD-1 입장 현황 ≠ GQ-1 가능). 되돌리기: `guest-store.ts`
13. 크리티컬 패스 통합 테스트를 `src/app/hosting/events/[eventId]/guests/critical-path.test.tsx`에 뒀다(관객·호스팅 훅을 함께 부를 수 있는 계층이 app뿐 — eslint boundaries). 되돌리기: 파일 이동 + 관객 쪽은 api 쿼리로 대신
14. `src/utils/download.ts`를 새로 만들었다(`http.ts` 주석이 가리키지만 없던 파일)

**남음**: V 전부(대시보드 카드·도넛·입장 막대·데스크탑 일정 패널(주간 줄 Q39)·NEW 배지 위치(사이드바 예매자 관리 배지 포함 — `newBadgeCount`), 예매자 관리 탭·DataTable·페이지 번호·검색 칸, 거절 사유 시트·확인 팝업(`EasyOverlay`)·주문/티켓 상세 모달(`?order=`는 L에 있다), 엑셀 버튼, 환불 계좌 `updatedAt` 표시, 발급 티켓 `ownerName`·`giftState` 표시), 크리티컬 패스 QA 시나리오 캡처, 스테이징 agent-browser 왕복(스테이징 생긴 뒤), Q32(탭 구성·"전체"에 주문 실패가 섞임)
**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, P13b-L이 끝난 뒤 작업 트리 전체): typecheck · lint · prettier · test(2153) · test:stories(193) · build · e2e(342 — 새 20 = `hosting-guests.spec` 10건 ×2) 통과. e2e 출력의 `server_query.failed` 500은 의도한 에러 시나리오
**문서 반영**: plan P13a 완료 기준 L(크리티컬 패스 상자는 스테이징 왕복 때문에 열어 둠), patterns §6(`?order=` 구현)·§23(주문 처리 뒤 반영·엑셀 저장)·§24(P13a 승인·거절·취소 검사 순서, 처리 404, 환불 완료 멱등 행), api-contract 운영(F9)(P13a-L 소스 확인 — 파라미터·GF-1 검색 없음·일반 멤버 검색·가림 형식·상태 분류·검사 순서·GD-1 계산), storyboard(`?order=` 열기·닫기 — patterns §6과 맞춤), directory-structure(api order·issued-ticket·dashboard, utils download, features guest·dashboard-stats, 라우트, mock)
