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

그 밖: 탭 「기본은 공연 탭: GE-1만 쿠키와 함께 첫 페이지를 읽고, GH-1은 부르지 않는다」, 「호스트 탭으로 바꾸면 주소에 ?tab=hosts가 남고 GH-1을 읽는다 — 카드에 myRole·eventCount·호스트 홈 주소」, 「카드의 myRole은 호스트마다 다르다」, 검색 「입력 뒤 300ms에 지금 탭 목록을 keyword로 새로 읽고(첫 페이지부터), 탭을 바꿔도 검색어가 남는다」, 「검색칸은 50자에서 막고…」, 빈 상태 「소속 호스트가 없으면 호스트 탭은 "등록한 것 없음" 빈 상태(검색 결과 없음과 구분)」, 무한 스크롤 「호스트 24개: 10개씩 page=1·2로 이어 읽고 hasNext가 false면 끝난다」, 에러 「에러 분기 HOST_400_16(연락처 형식) → 연락처 영역 오류, 이동 없음, 토스트 없음 — 연락처를 고치면 지운다」, 「표에 없는 실패(GLOBAL_400_1·5xx)는 전역 토스트로 간다」, 「만드는 중에 다시 눌러도 한 번만 보낸다」, 리다이렉트 e2e 19행 + 쿼리 전달 + `/admin/kakao/callback` 404.

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
