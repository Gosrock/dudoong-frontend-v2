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
| 12 | `src/ui/theme/breakpoints.ts` | desktop 1024 · wide 1280 | 디자인 시스템에 호스팅 그리드 1133/1280/1440(12칼럼·16·24)과 Tablet 12칼럼이 생겼다. 토큰 나누기는 이미 "P4s 착수 전에 정한다"(design-system §2, Q38) — 이번 변경으로 새로 생긴 일은 없다. → 2026-10-31 사용자 결정으로 관객·호스팅 모두 1024, 나누지 않는다(Q38 닫힘) | 참고 |

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

**남음**: V 전부(대시보드 카드·도넛·입장 막대·데스크탑 일정 패널(주간 줄 Q39)·NEW 배지 위치(사이드바 예매자 관리 배지 포함 — `newBadgeCount`), 예매자 관리 탭·DataTable·페이지 번호·검색 칸, 거절 사유 시트·확인 팝업(`EasyOverlay`)·주문/티켓 상세 모달(`?order=`는 L에 있다), 엑셀 버튼, 환불 계좌 `updatedAt` 표시, 발급 티켓 `ownerName`·`giftState` 표시), 크리티컬 패스 QA 시나리오 캡처, 스테이징 agent-browser 왕복(스테이징 생긴 뒤). Q32는 2026-10-31 사용자 결정으로 닫혔다 — 지금 L(주문 상태 5탭 + 환불 탭, "전체"에 결제 실패 주문 포함) 그대로
**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, P13b-L이 끝난 뒤 작업 트리 전체): typecheck · lint · prettier · test(2153) · test:stories(193) · build · e2e(342 — 새 20 = `hosting-guests.spec` 10건 ×2) 통과. e2e 출력의 `server_query.failed` 500은 의도한 에러 시나리오
**문서 반영**: plan P13a 완료 기준 L(크리티컬 패스 상자는 스테이징 왕복 때문에 열어 둠), patterns §6(`?order=` 구현)·§23(주문 처리 뒤 반영·엑셀 저장)·§24(P13a 승인·거절·취소 검사 순서, 처리 404, 환불 완료 멱등 행), api-contract 운영(F9)(P13a-L 소스 확인 — 파라미터·GF-1 검색 없음·일반 멤버 검색·가림 형식·상태 분류·검사 순서·GD-1 계산), storyboard(`?order=` 열기·닫기 — patterns §6과 맞춤), directory-structure(api order·issued-ticket·dashboard, utils download, features guest·dashboard-stats, 라우트, mock)

## P9c-L — 서비스 공지 (로직)

**상태**: done (2026-10-31, 커밋 전) — V 전부 남음(GUI 없음 — design-requests Q44). 2026-10-31 사용자 결정(Q44 → "새 Phase로 지금 L 진행")으로 새로 만든 Phase
**변경**: 새 `src/api/notice/`(`schema.ts` — `NOTICE_AUDIENCES`(USER·HOST)·`NoticeTargetSchema`(`openEnum` ALL·HOST)·`NOTICE_PAGE_SIZE`(20)·`NOTICE_PAGE_SIZE_MAX`(50)·`NOTICE_TITLE_MAX`(100)·`NoticeListItemSchema`·`NoticePageSchema`·`NoticeDetailSchema`·`NoticeBannerSchema`·`NoticeBannersSchema`, `queries.ts` — `NOTICES_KEY`·`noticesQuery`(GA-1 무한)·`noticeQuery`(GA-2)·`noticeBannersQuery`(GA-3, `meta.silent`)·`NOTICE_BANNERS_STALE_MS`. 모두 `public: true`, 변경 API 없음). 새 `features/shared/notice/`: `model/` notice-rules·banner-dismissal + 훅 3개(`useNoticeList`·`useNoticeDetail`·`useNoticeBanner`), 최소 마크업 `NoticeListView`·`NoticeDetailView`·`NoticeBannerView`. 라우트 `(audience)/(app)/notices/page.tsx`, `(audience)/(public)/notices/[noticeId]/page.tsx`(`instant = false`, `<Prefetch>`, `generateMetadata`, `notFound()`), `hosting/notices/page.tsx`, `hosting/notices/[noticeId]/page.tsx`. mock: `fixtures/notice.ts`(새, 읽기 전용), `notice.handlers.ts`(새 — default·empty·listServerError·bannersServerError·detailServerError), `handlers.ts`에 등록

**백엔드 소스**: dev `d89d4f9`(로컬 클론 `dev-latest`, `git show`·`git grep`으로만 읽음). `432cce4..d89d4f9` 사이에 공지 코드 변경 없음. 근거 파일: `V2NoticeController`·`V2NoticeDtos`(`V2NoticeAudience`·`V2NoticeListItemResponse`·`V2NoticeDetailResponse`·`V2NoticeBannerResponse`)·`V2ReadNoticesUseCase`·`V2Paging`·`V2PageResponse`·`SecurityConfig`(공개 경로 3개, id는 `[0-9]+`), 도메인 `Notice`(`isBannerActive` — 시작 포함·종료 미포함)·`NoticeTarget.visibleTo`·`NoticeAdaptor`·`NoticeRepository`(정렬·배너 쿼리)·`NoticeErrorCode`, 어드민 `AdminNoticeUseCase`(저장 때 `HtmlSanitizer.sanitizeV2RichText`), 테스트 `V2NoticeTest`. 정리는 api-contract §5 "서비스 공지"

**훅이 돌려주는 것**
- `useNoticeList(audience, {size}?)` → `{items[{id, title, pinned, hostOnly, createdAt, href}], empty, hasNext, isFetchingNext, nextPageFailed, fetchNext}`
- `useNoticeDetail(noticeId, audience)` → `{notice, html(sanitize 뒤, 비면 null), hostOnly, edited, listHref}`
- `useNoticeBanner(audience, {now}?)` → `{banner: {id, title, href} | null, remaining, dismiss()}`

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `notice-api.test` 12건, `notice-rules.test` 27건, `useNotice.test` 14건, e2e `notices.spec` 11건(×2 프로젝트) |
| 관객 ALL만 · 호스팅 ALL+HOST · 서버 순서 · `hasNext` | api 「관객(USER)은 ALL 공지만, 고정 먼저 → 최신순, 20건씩 …」·「호스팅 센터(HOST)는 ALL + HOST 공지」, 훅 「관객: 첫 페이지 20건(고정 먼저), 다음 페이지는 page=1로 …」·「호스팅 센터: HOST 공지가 섞이고 …」·「다음 페이지가 실패하면 …」, e2e 「목록은 브라우저에서만 audience=USER로 읽는다 …」·「로그인하면 목록에 HOST 공지가 섞이고 …」 |
| 관객 상세 상태 코드·제목·토큰 없음 | e2e 「있는 공지는 200이고 제목에 공지 제목 …」·「HOST 공지도 관객 주소로 열린다」·「숨긴 공지는 404」·「없는 공지는 404」·「숫자가 아닌 id는 백엔드를 부르지 않고 404」·「GA-2가 5xx면 500」, api 「숨긴 공지·없는 공지는 404 Notice_404_1」 |
| 본문 sanitize·빈 본문 | 규칙 「스크립트·이벤트 속성·javascript: 링크를 지우고 …」·「빈 문자열·공백만·sanitize 뒤 빈 본문 → null」, 훅 「본문은 sanitize한 html로 …」, e2e 「상세 본문은 sanitize되어 그려진다 …」 |
| 호스팅 상세: 서버 조회 없음·공용 404 | 훅 「숨김·없는 공지(Notice_404_1)는 공용 404 + 공지 목록으로」·「숫자가 아닌 id는 GA-2를 부르지 않고 공용 404」·「GA-2가 5xx면 다시 시도」, e2e 「숨긴 공지는 공용 404 + 공지 목록으로(클라이언트 판정이라 200)」·「비로그인이면 로그인으로 …」 |
| 배너 한 줄·닫기·기억·실패 | 훅 「관객: 상시 배너 한 줄 …」·「호스팅 센터: 닫으면 다음 배너(HOST)가 …」·「닫은 배너는 새로 열어도(새 캐시) 다시 뜨지 않고 …」·「응답을 받은 뒤 종료 시각이 지나면 …」·「GA-3이 실패하면 배너 없이 …(meta.silent)」·「배너 뷰: [닫기]를 누르면 사라진다」, 규칙 배너 종료 it.each 5행·닫기 기록 4건 |

**결정**
- Phase 번호 P9c(P9b 뒤 — 알림의 형제). 트랙은 공통: 코드는 `features/shared/notice`(S9), audience ↔ hosting import 금지를 지킨다
- 관객 목록은 `(app)`(무한 목록은 프리페치하지 않는다 — 공연 리스트와 같다), 관객 상세는 `(public)` 서버 조회(공유 링크·404 상태 코드). 호스팅은 서버 조회 없음
- 키: `['notices','list',audience,{size}]`·`['notices','detail',id]`(상세는 `audience`와 상관없이 같은 값이라 키에 넣지 않음)·`['notices','banners',audience]`

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. **배너 닫기를 이 브라우저에 기억한다** — `localStorage` `dd:noticeBannerDismissed`에 닫은 공지 id(최근 50개). 서버에 닫기 API가 없고, 기억하지 않으면 페이지를 옮길 때마다 다시 뜬다. 새 공지(새 id)는 다시 뜬다. 관객·호스팅이 같은 기록이라 한쪽에서 닫으면 다른 쪽도 닫힌다. 저장소가 막히면 탭 메모리만. 되돌리기: `banner-dismissal.ts`를 모듈 메모리만 쓰게(또는 `sessionStorage`)
2. **배너는 한 줄 = 첫 배너 하나만**, 닫으면 다음 배너. Q44 기본안 "상단 배너 한 줄"을 "동시에 하나"로 읽었다. 되돌리기: `useNoticeBanner`가 `live` 전체를 돌려주게
3. **배너 조회 `staleTime` 1분** — 셸에 붙으면 이동마다 다시 마운트돼 GA-3을 매번 부르게 된다. 끝난 배너는 FE가 `bannerEndAt`(분 단위, 종료 미포함)으로 바로 뺀다. 되돌리기: `NOTICE_BANNERS_STALE_MS` 제거
4. **배너를 셸에 아직 붙이지 않았다** — 관객·호스팅 셸이 빈 자리(P4s-V)라 L은 훅과 최소 `NoticeBannerView`까지. 그래서 e2e가 아니라 훅·뷰 테스트로만 본다. 되돌리기: `(audience)/layout.tsx`·`hosting/layout.tsx`에 `<NoticeBannerView audience=…/>`
5. **경로** `/notices`·`/notices/[id]`·`/hosting/notices`·`/hosting/notices/[id]` — 문서에 경로가 없었다(햄버거 "서비스 업데이트 노트"(Q4)가 목적지 후보). 되돌리기: `notice-rules.ts` `noticeListHref` + 라우트 폴더
6. **본문 sanitize는 섹션 뷰어 허용 목록 그대로**(`sanitizeSectionHtml`) — 백엔드도 공지에 v2 리치 에디터 기준을 쓴다. 공지 본문은 언제나 HTML(마크다운 경로 없음). 되돌리기: `renderNoticeHtml`
7. **화면 문구 잠정**: "공지사항", "아직 공지사항이 없어요", "공지를 찾을 수 없어요", [공지 목록], "내용이 없어요", "수정 {updatedAt}"(고친 공지 표시 — `createdAt ≠ updatedAt`), "고정" — V에서 디자인 문구로. 되돌리기: 각 뷰
8. ~~`pnpm check:contract`에 공지 GET을 넣지 않았다~~ → 2026-10-31 운영 배포를 확인하고 GA-1·GA-3·GA-2(공지가 있을 때만)를 넣었다(`scripts/check-contract.mjs`, 통과)

**남음**: V 전부(목록·상세·배너 화면, 셸에 배너 붙이기 — P4s-V 뒤, 햄버거 "서비스 업데이트 노트" 연결(Q4), 본문 타이포), QA 시나리오(V 때 — 화면이 최소 마크업이라 캡처할 것이 없다), storyboard 144행의 "plan §7 범위 밖·미정" 문구 갱신(다른 작업이 storyboard를 고치는 중이라 손대지 않음)
**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, 작업 트리 전체): typecheck · lint · prettier · test(2206) · test:stories(193) · build · e2e(364 — 새 22 = `notices.spec` 11건 ×2) 통과. e2e 출력의 `server_query.failed` 500은 의도한 에러 시나리오
**문서 반영**: plan(개요 Phase 수 26·남은 19, §0, §2 L 레인, §3 S9, §4 P9c 새 절·P4s 배너 문장, §5·§6 표, §7 공지 절 닫음), README(Phase 수, 범위 문단), api-contract §5 서비스 공지(P9c-L 소스 확인), patterns §24(P9c 3행), directory-structure(라우트·features/shared/notice·api/notice·mock), design-requests Q44(P9c 안내 한 줄)

## P4s-L — 레이아웃 셸: 셸 메뉴 (로직)

**상태**: done (2026-10-31, 커밋 전) — 마지막 L. V 전부 남음(셸 레이아웃·헤더·햄버거·상단 바·드로어 — 디자인 대기)
**변경**: 새 `features/shared/shell/model/` — `shell-menu.ts`(순수: `shellLink(key, loggedIn)`·`shellHostRow(me | null)`·`shellMenu(me | null)`, 상수 `SHELL_HOST_MAX`(10)·`SHELL_HOSTS_EMPTY_TEXT`·`SHELL_HOSTS_MORE_HREF`), `useShellMenu.ts`(훅). `LoginRequiredLink.tsx`의 `useLoginHref`를 내보냄(셸 [로그인]이 재사용). 스토리 문구 "호스팅 센터" → "공연준비"(`Tooltip`·`Header`·`NotFoundView`·`ForbiddenView` 스토리 — 호스팅 쪽 행동 문구는 P10a의 `HOSTING_ACCESS_BACK.label` "공연준비 홈으로"에 맞춤). 새 e2e `e2e/shell.spec.ts`. 레이아웃 파일(`(audience)/layout.tsx`·`hosting/layout.tsx`)은 손대지 않았다 — 메뉴를 그릴 셸이 V라 마운트할 곳이 없다

**백엔드 소스**: dev `d89d4f9`(로컬 클론 `dev-latest`, `git show`·`git grep`). GM-1 `V2MeResponse`(`V2MyPageResponses.kt`) — `hosts: List<V2MeHostResponse>`(hostId·name?·profileImageUrl?·myRole), `hostCount: Long`. `V2MeUseCase.MAX_HOST_SUMMARY = 10`. `V2MyPageHostQuery.findMyHosts` — 활성 소속(`hostUser.active`)만, 합류 최신순(`hostUser.createdAt desc, id desc`) limit 10, `countMyHosts` — 같은 조건의 전체 수. DTO 설명: hosts가 비면 "아직 두둥에서 호스트가 없어요.", hostCount가 더 많으면 GH-1(`/api/v2/me/hosts`)로 전체. FE 스키마(`src/api/me/schema.ts`)와 같다 — 코드 변경 없음

**훅이 돌려주는 것**
- `useShellMenu()` → `{status:'pending'}` | `{status:'error', retry}` | `{status:'ready', menu, hasUnread, refreshBell, logout}`
  - `menu`(= `shellMenu`) — 공통 `bell`·`shortcuts`(공연 둘러보기 `/events` · 공연 준비 `/hosting`)·`items`·`hostRow{hosts[{hostId,name,profileImageUrl,myRole,href:/hosts/{id}}], emptyText, more{count,href}}`·`create`(새 호스트 만들기 · 새 공연 만들기). `kind:'session'`이면 `profile{name,email,profileImageUrl,edit(/mypage)}`, `kind:'anonymous'`면 `login`(지금 주소로 돌아오는 `/login?redirect=…`)
  - 항목 하나 = `{key, label, href, to, viaLogin}` — 익명의 보호 항목은 `href = /login?redirect=<to>`, `viaLogin: true`
  - `logout` = `useLogout()` 그대로(로그인일 때만), `hasUnread`·`refreshBell` = `useNotificationBell()`(익명이면 GN-2 없음)

**이미 있던 것(다시 만들지 않음)**: 세션 4상태 `useSession`·게이트 `LoginGate`(P4a), `loginHref`·`safeRedirect`·`useKakaoLogin`(redirect 보관)·`useKakaoCallback`(복귀)(P4b-L), 벨 `useNotificationBell`(P9b-L S7), 로그아웃 `useLogout`(P4a), 공지 배너 `useNoticeBanner`(P9c-L — 셸에 붙이는 것은 P9c-V). 비로그인 `/hosting/**` → 로그인은 e2e `hosting.spec`(P10a)·`hosting-event.spec`(P11)·`hosting-host.spec`(P10b), "세션 확정 전 children 쿼리 0"은 `LoginGate.test`(P4a)가 이미 본다 — P4s-L은 라우트에서 "GM-1 말고 /api 없음"만 더했다

**완료 기준 L ↔ 테스트**

| 기준 | 테스트 |
|---|---|
| MSW 시나리오 | `shell-menu.test` 22건, `useShellMenu.test` 10건, e2e `shell.spec` 5건(×2 프로젝트) |
| 햄버거·아바타 드롭다운이 같은 목록 | 훅 「햄버거와 아바타 드롭다운이 같은 메뉴를 받는다 — GM-1은 한 번만 나간다」, 규칙 「로그인: 프로필 · 벨 · …」·「비로그인: [로그인] · 벨 · …」 |
| 호스트 줄 0 · ≤10 · >10 | 규칙 it.each 5행(0/0 · 1/1 · 10/10 · 10/11 · 10/37)·「서버가 10개보다 많이 줘도 …」·「익명은 빈 줄 + 빈 문구」, 훅 「호스트 줄: GM-1 hosts 10개 + hostCount 37 → …」 |
| 미로그인 항목 → 로그인 → 복귀 | 규칙 it.each 9행(항목별 로그인/익명 주소), 훅 「미로그인 항목 → 로그인 → 그 항목으로 복귀」 it.each 4행(bell·orders·hosting·newEvent — `useKakaoLogin` 보관 → `useKakaoCallback` replace), e2e 「벨(/login?redirect=/mypage/notifications)로 로그인하면 알림함으로 돌아온다」·「"공연 준비"로 로그인하면 공연준비 홈으로 돌아온다」 |
| 비로그인 `/hosting/**` · 확정 전 쿼리 없음 | `LoginGate.test`(P4a) 「세션 확인 중에는 스켈레톤 …」·「비로그인 … children은 그리지 않는다」, e2e `shell.spec` 「/hosting · /hosting/new/events · /hosting/events/140/dashboard: 로그인으로 가고, GM-1 말고는 /api를 부르지 않는다」 + 기존 P10a·P11·P10b e2e |
| 문구 "공연준비" · Q4 | 규칙 「화면 문구에 "호스팅 센터"가 없고 업데이트 노트·AD 항목이 없다(Q4)」 |

**결정**
- 위치 `features/shared/shell/model/` — plan 기본은 `features/audience/shell/model/`이었지만 호스팅 모바일 드로어(벨 포함, tech-decisions §3)와 호스팅 PC 아바타 드롭다운이 같은 메뉴를 쓰고 audience ↔ hosting import가 eslint로 막혀 있어 처음부터 shared에 뒀다(plan P4s L 범위에 기록)
- 브레이크포인트는 그대로(`desktop: 1024` — Q38 닫힘). L에 폭 분기가 없다

**문서와 다르게 한 것 / Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. **미로그인 항목은 GUI `331:11679`대로 주문내역 · 관심 호스트만** — plan 목록의 티켓 · 지난 공연 아카이빙 · 로그아웃은 로그인 메뉴에만 둔다. 되돌리기: `shellMenu`의 `items` 익명 분기
2. **"더 보기"는 공연준비 홈 호스트 탭 `/hosting?tab=hosts`** — plan "공연준비 홈으로"와 백엔드 DTO 설명(GH-1 전체 목록)을 합쳐 호스트 탭으로 읽었다. P10a `HOSTING_HOME_HOSTS_HREF`와 같은 값이지만 shared가 hosting을 import할 수 없어 상수를 따로 뒀다. 되돌리기: `SHELL_HOSTS_MORE_HREF = '/hosting'`
3. **호스트 줄 항목은 호스트 홈 `/hosts/{id}`로** — 문서에 목적지가 없다. P10a 호스트 카드(`myHostHref`)와 같게(설정·멤버 입구가 거기 있다). 되돌리기: `shellHostRow`의 `href`
4. **미로그인도 호스트 줄에 "아직 두둥에서 호스트가 없어요."** — GUI `331:11679`에 그 문구가 있다. 되돌리기: `shellHostRow(null)`이 `emptyText: null`
5. **항목 문구 잠정**: "알림"(벨 접근 이름), "프로필 편집"(아바타 연필 → `/mypage`), "티켓", "주문내역", "관심 호스트", "지난 공연 아카이빙", "공연 둘러보기", "공연 준비"(와이어 `128:2875` 바로가기 — PC 상단 바 글자 메뉴 "공연 준비하기"는 V가 바꿔 그린다), "새 호스트 만들기", "새 공연 만들기", "로그인". 되돌리기: `shell-menu.ts` `LINKS`
6. **프로필 편집 = `/mypage`** — P9 마이페이지가 프로필 편집을 겸한다(directory-structure). 되돌리기: `LINKS.profile.to`
7. **[로그인]은 지금 주소로 돌아온다**(`useLoginHref` 재사용 — 서버·하이드레이션 때는 `/login`, 렌더 때 주소를 읽는다). 햄버거·드롭다운은 열 때 다시 그려지므로 클라이언트 이동 뒤에도 맞다. 되돌리기: `useShellMenu`에서 `login.href` 덮어쓰기를 빼면 `/login`
8. **세션 실패(`error`)는 메뉴 없이 `retry`만** — 공개 화면의 셸은 화면을 막지 않는다(게이트는 보호 화면만 전체 재시도). 되돌리기: `useShellMenu`가 error를 anonymous처럼
9. **스토리 문구를 "공연준비"로 바꿨다**(V 스토리지만 "화면 문구에 호스팅 센터가 남지 않음" 기준 — 코드 주석·테스트 이름의 "호스팅 센터"는 화면 문구가 아니라 그대로). 되돌리기: 네 스토리 파일

**남음 / 위험**
- **약관 표시 의무 — v2 계획에 위치 없음(위험)** 그대로: 약관 제3조③ "서비스 첫 화면" 중개자 지위 표시(legal-copy A-3). 셸 V에 푸터가 없고 자리를 정하지 않았다 — 만들지 않았다
- V 전부: 관객 셸(모바일 헤더 + 햄버거 / PC 상단 바 + 아바타 드롭다운), 호스팅 셸(상단 바 58 · 드로어 · 3단 슬롯), 404·에러 화면, 말풍선 툴팁, 공지 배너 마운트(P9c-V), 하이드레이션 경고 0, QA `pnpm qa shell` 캡처, 바텀시트 iOS 실기기(P2에서 넘어옴)
- Q17(호스팅 모바일 헤더 로고형/제목형)은 V — 메뉴 데이터는 어느 쪽이든 같다

**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, 작업 트리 전체): typecheck · lint · prettier · test(2238) · test:stories(193) · build · e2e(374 — 새 10 = `shell.spec` 5건 ×2) 통과. e2e 출력의 `server_query.failed` 500은 의도한 에러 시나리오
**문서 반영**: plan(개요 진행 현황 — 남은 L 없음, P4s L 범위 위치·끝남 표시, L 완료 기준 5칸, §5 첫 문단), README(문서 지도 plan 행), directory-structure(`features/shared/shell`, hosting/shell은 V), patterns §21(셸 메뉴의 벨·항목 주소)

## P4s-V — 레이아웃 셸: 관객 · 호스팅 (뷰)

**상태**: done (2026-11-01, PR 대기) — V 레인 첫 번째. 스킬 `gui-implement` 첫 적용. 남은 것: iOS Safari 실기기(SHELL-7 수동)
**근거(gui-screens §0)**: 호스팅 PC 셸 = GUI Ready(`712:1646` 안 `Top bar_Host` `712:1648` — DS `538:4262`, 3단 폭 `712:1646`·`669:2972`·`680:672`·`669:2350`·`727:23210`), 아바타 ▾ 펼침 = DS `My` `585:752`(GUI에 놓인 곳 없음). 호스팅 공연 밖·모바일 = 와이어 `128:2875` + DS `host title` `619:2116`. 관객 = 와이어 `128:738`·`128:2875`·`128:2931`·`626:19888`·`640:17991`·`128:2772`
**변경**
- `src/ui` 새 컴포넌트(스토리 포함): `TopBar`(+`TopBarIconButton`·`TopBarIconLink`, `plainNav`) — DS `Top bar_Host` / `AccountMenu`(+`AccountMenuTrigger`, Radix DropdownMenu) — DS `My` / `Drawer`(vaul `direction=left`, 전체 화면, 뒤로가기로 닫힘) — 와이어 햄버거, DS 후보
- `src/ui` 고친 것: `breakpoints`(안 쓰이던 `wide` → `desktopS 1280`·`desktopL 1440` — 우측 패널 폭 구간용, 모바일↔PC 경계는 `desktop 1024` 하나 그대로), `tokens.shadow.drop2`(DS 이펙트 `drop shadow2`), `Container` 1440 미디어를 `media.desktopL`로, `Tooltip`에 `updatePositionStrategy`(드로어처럼 transform으로 들어오는 면 안에서 늘 열어 둘 때)
- `features/shared/shell/`: `ShellMenuButton`(햄버거 — 드로어 모듈은 누를 때 `import()`), `ShellDrawer`(`openShellDrawer` + 본문), `ShellParts`(`ShellBell`·`ShellAccountMenu`·`ShellRetry`·`SHELL_LINK_ICON`)
- `features/audience/shell/`: `AudienceShell`(모바일 로고 헤더 ☰·로고·검색·티켓 / PC 상단 바 검색 + [로그인]·아바타 ▾), `AudienceSubHeader`(하위 화면 뒤로가기 + 제목 — 있으면 로고 헤더가 CSS `:has`로 숨는다), `AudienceErrorView`
- `features/hosting/shell/`: `HostingShell`(PC `Top bar_Host` 벨 + 아바타 ▾ / 모바일 `host title` + 드로어, 공연 밖 본문 = `container`), `EventScopeFrame`(`[data-event-scope]` 3단 틀 — 사이드바 268 자리 + 가운데) · `EventPanelLayout`(우측 일정 패널 286/335/388 자리, 등록 후 대시보드만)
- `features/shared/auth/LoginGate`·`protected-area`: 하이드레이션 중에는 늘 스켈레톤, 스켈레톤에 보호 영역 표시(아래 "빌드에서만 …")
- 라우트: `(audience)/layout.tsx` 셸, `(audience)/not-found.tsx`·`error.tsx`(셸 안), 루트 `not-found.tsx`(없는 주소 — 관객 셸을 직접 두름), `hosting/layout.tsx`(게이트 안 셸). 하위 화면 헤더를 단 페이지 5개: `/orders`·`/mypage`·`/mypage/following`·`/mypage/archive`·`/mypage/notifications`
- L 화면 마크업 최소 수정: `EventScopeView`(사이드바 마크업을 `EventScopeFrame` 슬롯으로), `EventDashboardView`(등록 후만 `EventPanelLayout`)
- QA `qa/scenarios/shell.qa.ts`(SHELL-1~7), e2e `event-detail.spec` 404 기대 문구(Next 기본 → 셸 공용 404)
- 스킬 `gui-implement`: "단계마다 — 실제 화면 ↔ Figma 확인과 추론 점검"(ego-browser)·"디자인 없음 코멘트" 절(사용자 지시 2026-10-31)

**완료 기준 V ↔ 확인**

| 기준 | 확인 |
|---|---|
| 관객 1024 미만 헤더 + 햄버거 / 이상 상단 바 + 아바타 ▾, 404·에러가 셸 안 | SHELL-3·5·6, ego-browser 390·1024·1440. 하이드레이션 경고: 빌드 콘솔에 오류 0(SHELL 단계 + 디버그 런) |
| 로그인 전 PC [로그인] | SHELL-3 |
| 호스트 줄 0 · 10 · 10 초과 | SHELL-4(`mockApi.use`로 GM-1 hosts 0/0 · 10/10 · 10/13) |
| 호스팅 1024 이상 상단 바(벨) / 미만 헤더 + 드로어, 공연 밖 최대 1280 | SHELL-1(1440·1280·1133·1024·1023 — 패널 x·폭 `1052/388 · 945/335 · 847/286 · 738/286`), SHELL-2(여백 80·40, 모바일 드로어 벨) |
| "공연 둘러보기 ↗" · "공연 준비 ↗", "호스팅 센터" 없음 | SHELL-2·3 |
| 캡처 | `qa/reports/shell/<시각>/`(커밋 안 함) |
| 셸이 서버 조회 안 함, (public) 404 | SHELL-6(`/no-such-page`·`/events/99999` 크롤러 404) |
| iOS 실기기 | SHELL-7 수동 — 사용자 |

**ego-browser 확인(스킬 "단계마다")에서 고친 것**: 우측 패널 선이 내용 높이까지만(→ 가운데 `<main>` flex 1), 아바타 ▾ 줄 간격 36 → 32(DS `My` 줄 20), 드로어 말풍선 안 보임(`DrawerLink`가 Tooltip의 ref·props를 안 넘김 + 드로어 transform → `updatePositionStrategy="always"`), 드로어 항목 간격 64 → 40(와이어)

**빌드에서만 보호 화면이 게이트 스켈레톤에서 멈추던 문제(고침 — `LoginGate`)**
- 증상: `next build` 산출물에서 `/orders`·`/orders/<id>`·`/mypage`·체크아웃 등 게이트 안 화면이 가끔(타이밍) "로그인 확인 중"에서 멈춤. GM-1·GN-2는 200, 본문 쿼리는 안 나감. `next dev`에서는 안 남. e2e `mypage.spec`·`hosting-guests` 크리티컬 패스 실패로 드러남
- 원인: 셸(게이트 밖)이 `useShellMenu` → GM-1을 먼저 받아 둔다. 게이트 경계가 나중에 하이드레이션될 때 캐시에 이미 세션이 있으면 `GateContent`가 바로 children을 그려 **서버 HTML(늘 스켈레톤 — 서버는 GM-1을 부르지 않는다)과 어긋난다** → React 파이버로 보면 게이트 `AsyncBoundary`의 Suspense가 dehydrated로 남는다(서버 HTML은 모든 경계를 `$RC`로 끝냈다). 셸이 없을 때는 게이트가 하이드레이션된 뒤에야 GM-1이 나가 늘 맞았다
- 처리: `GateContent`가 하이드레이션 중에는 데이터와 상관없이 스켈레톤(`useSyncExternalStore` 서버 스냅숏 false), 하이드레이션 뒤에 children. 클라이언트 이동에서는 처음부터 children. 추적 중 넣었던 셸 머리 형제 Suspense는 원인이 아니어서 뺐다. 게이트 바로 위 화면 58건(mypage·hosting-guests·checkout·tickets) + 전체 e2e로 확인
- 재현: `hydrated &&`를 빼고 `pnpm build` → e2e `mypage.spec` 「남의(없는) 주문 주소는 공용 404 안내」(타이밍이라 여러 번)

**같은 이유로 생긴 두 번째 문제(고침 — `protected-area`)**: 정지·탈퇴 계정 토큰(재발급 `USER_403_1`)으로 보호 화면에 오면 `/login/expired`가 아니라 `/login`으로 갔다(e2e `auth.spec` 「정지·탈퇴 계정의 토큰 …」). 셸의 GM-1이 게이트 effect(`useProtectedArea`)보다 먼저 세션 상실을 내서 `isInProtectedArea()`가 false였다. 게이트 스켈레톤에 `data-protected-area`를 달고(서버 HTML에도 있다) `isInProtectedArea()`가 그 표시도 본다

**셸 때문에 바뀐 테스트 기대값**: e2e `auth.spec`(GM-1을 정확한 경로로 셈) · `hosting.spec`(셸 벨 GN-2 뺌) · `home.spec`·`event-list.spec`("공연 둘러보기" 링크를 `main` 안으로 — 셸 상단 바에도 같은 링크) · `event-detail.spec`(404 문구) · QA `auth-gate`(GM-1 셈, [다시 시도]를 게이트 alert 안으로). **QA `auth-gate` AUTH 공연홈 시나리오는 셸 전부터 깨져 있다**(제목 "장르"가 지금 L 공연홈에 없다) — 그 시나리오의 "공개 화면에서 GM-1 0번"은 셸이 모든 화면에서 세션을 읽는 P4s 설계와도 맞지 않아 고치지 않고 남김(P5a-V에서 시나리오를 다시 쓸 때)

**결정**(사용자 2026-10-31): 매핑 표대로 / 햄버거는 `src/ui` `Drawer` 신설 / Q17 로고형 + 벨은 드로어 안 / DS 14:26Z 변경은 별도 PR / 관객 PC 메뉴 둘 다 검정(`plainNav`) / 벨 안 읽음 빨간 점 유지 / 호스팅 상단 바 로고 → `/` / 관객 PC 벨은 와이어대로 없음 + 디자이너 질문(design-requests Q54)

**문서·Figma와 다르게 한 것 / Claude 판단**(근거 없음 — 되돌리는 법 같이)
1. 토큰 반올림 — `My` 패딩 20 → `space[4]` 16, 아이콘–글자 14 → 12, 상단 바 오른쪽 간격 20 → 16, 이름–▾ 0 → 8. 아이콘 20은 24 SVG를 CSS로 줄임(코드에 20 크기 없음). 되돌리기: `AccountMenu.css.ts`·`TopBar.css.ts`
2. 상태 모양(Figma에 없음): 아바타 ▾·아이콘 hover와 열림 배경, 메뉴 항목 하이라이트 = `surface.container`. 되돌리기: 같은 파일 `selectors`
3. 관객 검색 아이콘(모바일·PC) → `/events`, 티켓 아이콘 → `/tickets`(빨간 점은 데이터가 없어 안 그림 — 와이어에는 있음). 되돌리기: `AudienceShell`
4. 드로어 아이콘: 새 호스트·새 공연 = DS `add`(와이어 사람+·음표+는 DS에 없음), 바로가기 ↗ = DS `diagonal`(와이어 검정 원은 안 그림), "N개 더 보기" 원 = `more`. 되돌리기: `SHELL_LINK_ICON`·`ShellDrawer`
5. 드로어 글자·크기를 가까운 토큰으로: 프로필 Avatar 60·`headingMd2Emphasized`/`labelMd`, 항목 `headingMd2`(줄 40), 바로가기 `headingMdEmphasized`. 와이어 회색 상자(호스트 없음)는 그리지 않고 문구만(design-workflow §3)
6. 미로그인 드로어는 L(GUI `331:11679`)대로 주문내역 · 관심 호스트만 — 와이어 `128:2931`에는 지난 공연 아카이빙도 있다(Figma 코멘트로 물음)
7. 하위 화면 헤더를 단 화면 5개(위)와 제목(메뉴 문구, `/mypage`는 "마이페이지"), 헤더 제목은 `div`(페이지 h1과 중복 방지), 뒤로가기는 기록이 있으면 back · 없으면 `/`. 보호 화면이라 게이트가 끝난 뒤에 나타난다(그 전에는 로고 헤더). 되돌리기: 각 `page.tsx`·`AudienceSubHeader`
8. 셸 메뉴 조회 실패 "메뉴를 불러오지 못했어요." + [다시 시도], 확인 중 "불러오는 중", 에러 화면 "화면을 불러오지 못했어요 / 잠시 후 다시 시도해 주세요." — 문구 근거 없음
9. 모바일(1024 미만) 최대 폭은 두지 않음(Q39 2번 답 전 — 화면 끝까지), 상단 바는 1920 이상에서도 끝까지(대시보드 1920 프레임대로 — 공연준비 홈 1920 예시와 다름, Figma 코멘트)
10. 하위 화면 헤더 숨김을 CSS `:has()`로 — 서버·클라이언트 같은 DOM. `:has` 없는 오래된 웹뷰(Chrome 105 미만)에서는 로고 헤더와 하위 헤더가 같이 보인다. 되돌리기: 헤더 변형을 라우트 그룹으로 나누기
11. 드로어 모듈 지연 로드(`import()`) — 셸 첫 번들을 가볍게(위 빌드 문제 추적 중 넣었고 그대로 둠)
12. e2e 기대값: `auth.spec` GM-1 세기를 정확한 경로로, `hosting.spec` 공연준비 홈 호출에서 셸 벨 GN-2를 뺌 — 셸이 벨을 부르기 시작해서

**Figma 코멘트**(`[개발 · 디자인 없음]`, 기록부 `2026-10-31-impl`, @멘션 안 걸림): DS `538:4262` Top bar_Host 상태·로고 목적지 / DS `585:752` My 상태·호스트 0·초과 / 와이어 `626:19888` 관객 PC 벨·활성 표시 / 와이어 `128:2875` 호스트 많을 때·로딩/실패·DS에 없는 아이콘 / 와이어 `128:2931` 미로그인 아카이빙 / 와이어 `128:738` 티켓 빨간 점·검색 목적지 / GUI `712:2427` 1024 미만 최대 폭·1920 이상 상단 바. "커스텀인데 DS로 가능"(`FIGMA-CUSTOM:`) 줄은 없다

**범위 밖(고치지 않음)**: 공연 사이드바 본문(검정 면·공연 카드·`사이드바 메뉴`) P11-V, 일정 패널 본문 P13a-V, 모바일 공연 어드민 메뉴(Q37) P11-V, 서비스 공지 배너 P9c-V, 페이지 본문(L 최소 마크업), mock 호스트 이미지 주소가 안 열림(목 데이터)

**스킬 절차에서 막히거나 어색했던 곳(보고 — 고치지 않음)**
- `ds_diff.py diff --out <dir>`이 폴더를 만들지 않아 실패한다(먼저 `mkdir -p`)
- `design-system.md` 머리의 동기화 기준 버전 시각(13:25Z)과 버전 API 시각(13:45:22Z)이 다르다
- `figma_nodes.py shot`이 gui·wire만 받아 DS 컴포넌트 PNG(`My`·`host title`)는 REST로 따로 받았다 — `ds` 대상이 있으면 좋다
- ③ 매핑 표의 대상이 "Ready 프레임 안 노드"뿐인데, 셸처럼 GUI에 펼친 상태가 없는 DS 컴포넌트(`My`)를 어디에 적는지 없다
- `comment.py`에 답글 기능이 없어, 이미 열린 디자이너 코멘트(`669:2109` "이정도 정의 충분한지")에 잇지 못하고 새 코멘트를 달았다
- ④ 뒤 dev:mock을 `127.0.0.1`로 열면 Next dev 리소스가 막혀 하이드레이션이 안 된다 — `localhost`로 연다(단계마다 1에 적을 만함)

## 2026-10-31 재발급 429를 세션 상실로 보던 버그 (`fix/refresh-429`)

**변경**: `src/api/auth-handlers.ts` `refreshOnce` — 재발급 4xx 중 429·408(`TRANSIENT_4XX`)은 `RefreshRejected`가 아니라 일시 오류로 그 에러를 그대로 던진다(5xx·네트워크와 같은 길: 세션 유지, `onSessionLost` 없음, 상실 1회 플래그 그대로, 원 요청은 재발급 응답의 에러로 실패). 원인: 백엔드 `ThrottlingInterceptor`가 재발급에도 걸리고 재발급은 유효한 액세스 토큰 없이 나가 IP 버킷(기본 분당 60)을 쓴다 — 공유 NAT(공연장 Wi-Fi)에서 리프레시 토큰이 살아 있는데 `/login/expired`로 튕기고 다른 탭도 따라 나갔다(dev `fe423ed` `ThrottlingWebConfigure`·`application.yml`로 확인). 테스트 `auth-handlers.test` 5건 추가(429 실제 `authApi`·408 HTML·429 뒤 다음 401에서 다시 재발급해 성공·대조 401/403은 상실). 문서: tech-decisions §4 재발급 결과 판정·요약 표, api-contract §9 재발급 행, patterns §5-1, backend-questions B21
**Claude 판단**(되돌리는 법 같이)
1. **408도 일시 오류** — 백엔드는 408을 내지 않지만 앞단(ALB·nginx)이 요청 본문을 다 받기 전에 끊으면 낸다. 429와 같이 토큰을 보기 전의 응답이라 세션에 대해 아무것도 말하지 않는다. 되돌리기: `TRANSIENT_4XX`에서 408을 뺀다
2. **429를 자동 재시도하지 않는다** — 쿼리 기본 retry(5xx·네트워크만)에 넣지 않았다. 제한에 걸린 IP에서 다시 두드리면 버킷만 더 빈다. `Retry-After`도 백엔드가 주지 않는다. 사용자는 전역 에러 처리(토스트·에러 화면 재시도)로 다시 시도한다. 되돌리기: `query-client.ts` `shouldRetry`
3. B21 번호 — B20은 답을 받아 지운 번호라(backend-questions 머리말) 다음 번호를 썼다
**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`): typecheck · lint · prettier · test(2243) · build · e2e `auth.spec`·`auth-bfcache.spec`(32) 통과. 수정을 빼면 새 테스트 3건(429·408·429 뒤 재발급)이 실패하는 것을 확인했다

## 계약 대조 수정(2026-10-31)

서버(백엔드 `dev-latest` `fe423ed4`)와 프론트의 계약 대조에서 확인된 항목을 고치고 사용자 결정 둘을 반영했다. 항목마다 소스를 다시 보고 고쳤다. 브랜치 `fix/contract-audit-1031`. 리프레시 429(`src/api/auth-handlers.ts`, tech-decisions §4·api-contract §9의 "4xx = 세션 상실")는 다른 브랜치 몫이라 건드리지 않았다.

**사용자 결정**
- **가입 전화번호 = `010-1234-1234`**: `register-form.ts` `PHONE_PATTERN`·`formatPhoneInput`(숫자만 남겨 하이픈 자동, `+82 10-…` → `010-…`, 11자리에서 자름), 모양이 틀리면 칸 오류 `phoneFormat`(문구 잠정 `PHONE_FORMAT_MESSAGE`). 서버 `PhoneNumberVo`는 검사 없이 저장하고 꺼낼 때 `USER_400_2`라서다. 같은 사용자 전화 필드에 쓰는 다른 v2 입력은 없다(PM-2는 이름·이미지, 호스트·공연 연락처는 `PhoneNumberVo`가 아니다 — 규칙 그대로). plan P4b, backend-questions B22
- **SUPER_ADMIN 허용**: GM-1 `V2MeResponse`·JWT 어디에도 계정 역할이 없다. 대신 G+ 검사(`HostQualification.GUEST` → `Host.validateActiveHostUser`)는 활성 멤버가 아니면 403이고 건너뛰는 길은 `SuperAdminBypass`뿐, `myRole`은 `Host.getActiveRoleOf`(활성 멤버 아니면 null)라 **"G+ 조회 성공 + `myRole: null`" = SUPER_ADMIN**이 서버 의미로 안전하다. `can.ts`에 `ActorRole`(`HostRole | 'SUPER_ADMIN'`)·`superAdminOrRole`, `useEventScope().role`(GE-3), `useHostMembers`(GH-6 + viewer), `useHostSettings`(GH-3 viewer + **GH-6을 함께 읽음**). patterns §22, api-contract §2, plan P10a

**고친 것 — 코드**
- 거절(PR-4) 뒤에도 T-1·GP-5 무효화(`guest-cache.ts` 플래그 `stockChanged` → `ticketAvailabilityChanged`) — 서버가 잔여·매진·구매 가능·T-1 잠금에서 승인 대기 수량을 뺀다
- QR 스캔 `ENTERED` 뒤 GI-1·GI-2·GD-1도 무효화(`qr-cache.ts` `invalidateAfterScan(qc, id, result)`)
- 선물 반환 `Gift_400_8` → 목록 다시 읽기 + `gone`(`gift-errors.ts`, 문구 잠정)
- 셀프 체크인 `Event_400_5` 문구를 "지금은 셀프 체크인을 할 수 없는 공연이에요"로(준비중에도 온다)
- PE-8 `Event_400_15`인데 다시 읽은 GE-3이 등록 뒤면 `Event_400_8` 문구(`checklist.ts` `registerErrorMessageOf`, `useEventDashboard`가 코드를 들고 있다)
- `me/schema.ts` 대표 공연 `startAt`·`endAt`, 관람 공연 `startAt` → `kstDateTime.nullable()`. 닉네임 공백 판정 `NOT_BLANK`를 서버 `\p{javaWhitespace}`와 같게(전각 공백·U+001C 등도 막는다), PM-2 400 `BAD_REQUEST` → 닉네임 칸 오류
- 낡은 주석: `useLogout`(로그아웃은 permitAll, 항상 200 + 쿠키 삭제), `errors.ts` `isForbidden`(`AUTH_403_1`·`AUTH_403_2`·`AUTH_403_3`·`USER_403_1`도 403), `order/mutations.ts` PR-3 순서(`Order_404_1` 먼저, `Order_400_13`은 1인 제한 뒤), `profile.ts`
- 거절·승인 후 취소 매핑에서 서버가 내지 않는 `Order_400_3`·`Event_400_6`을 뺐다(`validCanRefuse`·`validCanCancel` — 시작 시각은 `Order_400_9`가 먼저 막는다)

**고친 것 — mock(테스트가 불가능한 경로를 증명하지 않게)**
- GH-14 순서 = id 내림차순(`Sort.by(DESC, "id")`)
- O-4 `cancelBlockCode` = 지운 공연 `Event_404_1` → 상태 `Order_400_5` → OPEN 아님 `Event_400_5` → 시작 후 `Order_400_9` → `Order_400_24`
- O-3·O-4 옵션 404를 `Event_400_17`보다 먼저(`withAppliedTicketLocks`)
- 일반 멤버 연락처 완전 일치에서 `82…`와 `0…`을 같은 번호로(`phoneExactMatch` = `ContactSearch.phoneExact`, `contact-search.test`)

**고친 것 — 문서**: patterns §19·§22·§23(주문 처리 뒤)·§24(P7 `Event_404_1`, P8b `Gift_400_8`, P8c, P9 `USER_400_4`·`BAD_REQUEST`, P11 `Event_400_20`·`Event_400_15`, P12 `Ticket_Item_400_15`), api-contract(§2 SUPER_ADMIN, GH-14 순서, 환불 계좌 입력 조건, 사용자 취소 차단 순서, O-3·O-4·O-5 검사 순서, `Event_400_20`), plan(P4b 전화번호·D2 계약 확인, P10a SUPER_ADMIN, P12 T-3 동의 #873), backend-questions(B19 관객 쪽 풀림, B22 — 처음 B20으로 썼다가 지운 번호와 겹쳐 B22로, B16 참고 둘), deploy-plan §9 12~16(Void 본문·로그인 전용 필드 이름·엑셀 403·쿠키 흐름·스테이징 `check:contract`)

**대조에서 틀린 것(그대로 두거나 고쳐 적음)**
- P7 `Event_404_1`: 대조 메모는 "비공개 공연은 O-0 `Ticket_Item_404_1`"이었지만 O-0(`V2ReadCheckoutUseCase` → `onSaleItems` → `validatePublic`)은 비공개(준비중) 공연에 `Event_404_1`을 낸다. 문서에는 소스대로 "지운·없는 공연 + O-0의 비공개 공연 = `Event_404_1`, O-1의 비공개 = `Event_400_5`"로 적었다

**Claude 판단**(근거 문서 없음 — 되돌리는 법 같이)
1. **SUPER_ADMIN 범위 = 매니저 + 역할 변경**: 서버가 권한 검사는 건너뛰지만 매니저 추가·삭제(`validateCanManageRole` 요청자 = 마스터)와 양도(`transferMaster` → `validateMasterHostUser(요청자)`)는 도메인이 다시 막는다. 역할 변경은 요청자를 보지 않아 열었다. 되돌리기: `can.ts` `SUPER_ADMIN_BLOCKED`
2. **호스트 설정이 GH-6을 함께 읽는다**(요청 1개 늘어남): GH-3은 공개라 `myRole: null`만으로는 비멤버와 SUPER_ADMIN을 가를 수 없다. 비멤버는 이제 `access: 'forbidden'`이 아니라 GH-6 403 → 경계의 공용 403으로 간다. 되돌리기: `useHostSettings`를 `useSuspenseQuery(hostViewerQuery)` 하나로 + `hostingAccessOfRole(host.myRole)`
3. **전화번호는 `010`만**: 결정 문구 그대로 `^010-\d{4}-\d{4}$`(011·016 등 옛 번호는 막힌다). 되돌리기: `PHONE_PATTERN`
4. **카카오 전화번호도 자동 변환해 채운다**(`+82 10-…` → `010-…`): 그대로 두면 처음부터 칸 오류다. 되돌리기: `initialRegisterValues`의 `formatPhoneInput`
5. **`Gift_400_8`은 목록 다시 읽기 + 상세 닫기(`gone`)**: 받은 티켓이 아니게 된 상태라 상세가 낡았다고 봤다. 되돌리기: `GIFT_ERROR_TABLE.return.Gift_400_8.refetch = ['ticket']`
6. **`Event_400_15` + 등록 뒤 → `Event_400_8` 문구**: "시작 시각" 문구는 일정을 바꾸라는 안내라 이미 등록된 공연에 맞지 않는다. 되돌리기: `registerErrorMessageOf`가 코드 문구 그대로
7. **PM-2 `BAD_REQUEST`를 닉네임 칸 오류로**: 이름만 보내는 요청이라 검증 실패는 닉네임 탓이다(이미지 요청은 따로 — 그쪽 `BAD_REQUEST`는 전역 그대로). 되돌리기: `useProfileEdit` `nameCodes`의 `BAD_REQUEST`
8. **문구 잠정 셋**: 전화번호 형식, `Gift_400_8`, 셀프 체크인 `Event_400_5`. 되돌리기: 각 상수

**남음**
- 런타임 확인 5건(deploy-plan §9 12~16)은 D2 뒤
- B22(서버 전화번호 검증), B19 호스트 쪽(GR-1·GR-2 `orderMethod`) 답 대기

**검사**(2026-10-31, `NEXT_PUBLIC_KAKAO_JS_KEY=e2e-placeholder`, 작업 트리 전체): typecheck · lint · prettier · test(2285) · test:stories(193) · build · e2e(374) 통과

## B15 ECR 이미지 워크플로(2026-10-31)

B15 처리(Deploy #85, `deploy-latest` `e8e5bcf`의 `infra/ecr.yml`) 뒤 `image.yml`·`release.yml`을 GHCR에서 비공개 ECR로 다시 썼다. 근거: `FrontV2Repository`(`dudoong-front`, `IMMUTABLE_WITH_EXCLUSION` — `dev`만 덮어쓰기, 태그 이미지 10개·untagged 7일 수명 정책), `FrontV2PushRole`(`dudoong-github-ecr-front-v2`, 신뢰 조건 `repo:Gosrock/dudoong-frontend-v2:ref:refs/heads/main`·`ref:refs/tags/v*`, `aud` `sts.amazonaws.com`), 리전 `ap-northeast-2`(`scripts/ecr-login.sh`), 서버는 `${ECR_REGISTRY}/dudoong-<이름>:<태그>`로 받는다(compose). 로그인 방식은 Deploy `nginx-build.yml`·`infra-image-copy.yml`과 같다(`configure-aws-credentials@v4` + `role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/…` + `mask-aws-account-id`, `amazon-ecr-login@v2`, 승격은 `docker buildx imagetools create`).

**`image.yml`** — `push: main` 다시 켬 + `workflow_dispatch`(main에서만 — 다른 ref면 첫 단계에서 오류로 멈춘다), `id-token: write`·`contents: read`(`packages: write` 뺌), `ubuntu-24.04-arm`·`linux/arm64`·`type=gha` 캐시·빌드 인자(`NEXT_PUBLIC_KAKAO_JS_KEY` variable, `GIT_SHA`) 그대로, 태그는 `:dev` 하나, revision 라벨은 `metadata-action`. 저장소 variable이 비면 빌드 전에 멈춘다.

**`release.yml`** — `v*.*.*` 태그 → `:2.x.y`. ① 같은 버전 태그가 있으면 revision이 같을 때만 성공(재실행), 다르면 실패 ② `:dev`를 digest로 고정해 revision 라벨을 읽고 태그 커밋과 같으면 `imagetools create`로 승격 ③ 아니면(또는 `:dev` 없음) 태그 커밋으로 빌드. 판단 스크립트는 가짜 `docker`로 다섯 경우(승격·다른 커밋·`:dev` 없음·재실행 같은 커밋·재실행 다른 커밋)를 로컬에서 돌려 봤다. AWS CLI는 쓰지 않는다(ARM 러너 이미지에 있는지 확인하지 못해서 — `imagetools inspect`로 대신).

문서: deploy-plan(머리말·결론 표·§1·§5·§6 7번·§6 끝 메모·§8 D1·§9 7번·17번 추가), staging-deploy-plan(브랜치 빌드 경로 삭제 — `pnpm deploy:staging`은 기존 태그 재배포만), plan.md 브랜치 계획·D2 대기 칸.

**Claude 판단**
- `image.yml` `concurrency: image-dev`, `cancel-in-progress: false` — 왜: `:dev` 하나만 덮어쓰므로 늦게 끝난 옛 빌드가 새 `:dev`를 되돌리면 안 된다. 직렬로 돌리면 대기 중 실행은 최신 하나로 바뀌고 마지막에 끝나는 실행이 main 최신이다(중간 커밋엔 이미지가 없을 수 있다 → 그 커밋에 버전 태그를 달면 `release.yml`이 빌드). 되돌리기: `concurrency` 블록 삭제.
- 수동 실행을 main 밖에서 첫 단계 오류로 멈춤 — 왜: 신뢰 조건 밖이라 어차피 `configure-aws-credentials`에서 실패하는데, 원인을 바로 알 수 있게. 되돌리기: "main에서만" 단계 삭제.
- `NEXT_PUBLIC_KAKAO_JS_KEY` 빈 값 사전 검사 — 왜: 2026-10-31 `gh variable list` 결과 저장소 variable이 없다(조직 variable도 없음). `next build`가 `src/env/client.ts` 검증에서 실패하므로 빌드 10분 전에 원인을 알린다. 되돌리기: "빌드 인자 확인" 단계 삭제.
- revision 라벨은 `imagetools inspect --format '{{json .Image}}'` 출력에서 `Labels`를 재귀로 찾는다 — 왜: provenance 증명이 붙으면 인덱스가 되어 `.Image`가 플랫폼별 맵으로 나온다(단일이면 객체). 실제 출력 모양은 첫 태그에서 확인(deploy-plan §9 17번). 어긋나도 빌드 경로로 가므로 이미지는 나온다.
- `release.yml` 빌드 경로는 `cache-to`를 두지 않는다(`cache-from`만) — 왜: 드문 경로라 main 캐시를 덮지 않게. 되돌리기: `cache-to: type=gha,mode=max` 추가.
- `pr-gate.yml`은 바꾸지 않았다(ECR과 무관).

## 이슈 #8 검색·AI 노출 — robots · sitemap · 공연 JSON-LD (2026-10-31)

GitHub 이슈 #8. 근거: 백엔드 `dev-latest` `78b1b6e7`(`V2EventBrowseResponses.kt`·`V2EventBrowseController.kt`·`V2Paging.kt`·`Event.kt`·`BaseTimeEntity.kt`), Next 16 설치 문서(`sitemap.md`·`generate-sitemaps.md`·`generate-metadata.md` "With Cache Components"·`json-ld.md`).

- **`src/app/robots.ts`** — `*`와 AI 크롤러(`GPTBot`·`OAI-SearchBot`·`PerplexityBot`·`ClaudeBot`·`Google-Extended`) 두 그룹에 같은 규칙(이름이 맞는 그룹이 있으면 크롤러는 `*`를 보지 않는다). 허용 `/`·`/events/`·`/hosts/`·`/notices/`, 막음 `/hosting`·`/mypage`·`/orders`·`/tickets`·`/check-in`·`/gate-check`·`/kakao`·`/login`·`/gifts` + 아래 판단의 둘. `Sitemap:`은 요청 origin.
- **`src/app/sitemap.ts`** + **`src/api/server/sitemap-source.ts`** — `/`, 종료 전 공연 상세(GP-2 `includePast=false` = 진행 중 + 시작 전 OPEN), 그 공연들의 호스트 홈. GP-2는 `size=50`(백엔드 `V2Paging.MAX_SIZE`)으로 `hasNext`까지, 같은 id는 한 번. GP-2 항목에 `hostId`가 없고(`hostName`만) 공개 호스트 목록 API도 없어 공연마다 GP-3(`eventDetailQuery`)을 5개씩 불러 `host.hostId`를 모은다 — 404면 그 공연도 빼고, 그 밖의 실패는 호스트만 빠진다(`sitemap.host_lookup_failed` warn, 개수만). GP-2가 실패하면 throw → 500. `lastModified`는 넣지 않는다 — GP-2·GP-3에 수정 시각이 없다(엔티티에는 `updatedAt`이 있다 → backend-questions B16에 `hostId`·`updatedAt` 추가 요청).
- 둘 다 `headers()`(`requestOrigin`)를 읽어 빌드 표에서 `ƒ`(요청마다)다. 서버 캐시 없음 규칙 그대로.
- **공연 상세 JSON-LD** — `features/audience/event/model/event-json-ld.ts`의 `eventJsonLd`(순수 함수)와 `serializeJsonLd`. `name`·`description`(OG 설명과 같은 요약)·`startDate`/`endDate`(KST → `+09:00` ISO. 종료는 `endAt`, 없으면 시작 + `runTime`분, 0분·모름이면 없음 — `eventSchedule` 규칙)·`location`(`Place` 이름 + `PostalAddress`(주소 + 상세주소, `KR`) + 좌표)·`image`(포스터)·`organizer`(`Organization` 호스트 이름 + `/hosts/{id}`)·`url`·`eventStatus` `EventScheduled`·`eventAttendanceMode` `Offline`. **`offers` 없음**(P5b — 응답 HTML에 가격·재고 없음). 직렬화는 `<`·`>`·`&`·U+2028·U+2029를 `\uXXXX`로(`</script>` 주입 방지, Next `json-ld.md`는 `<`만 바꾼다). 페이지(`events/[eventId]/page.tsx`)가 `<script type="application/ld+json">`을 `<Prefetch>` 앞에 둔다 — GP-3·GE-5를 `Promise.all`로 먼저 받고(요청 QueryClient라 `<Prefetch>`가 다시 부르지 않는다).
- **`metadataBase`·기본 OG·소유 확인** — `(public)/layout.tsx`의 `generateMetadata`: `metadataBase` = 요청 origin, `DEFAULT_OG_IMAGE`(`src/utils/site.ts`)가 있으면 `openGraph.images`, 런타임 env `GOOGLE_SITE_VERIFICATION`·`NAVER_SITE_VERIFICATION`이 있으면 `verification`(tech-decisions §12 표, `.env.example`). 공연 상세는 `openGraph`를 통째로 덮으므로 `eventMetadata`가 포스터가 없을 때 같은 기본 이미지를 쓴다.
- **기본 OG 이미지는 없다** — `public/`에는 `privacy.html`·`term.html`뿐이고 `src/ui/brand`는 로고 SVG 경로뿐(OG용 1200×630 래스터 없음). 그래서 `DEFAULT_OG_IMAGE = null`(지금 동작 그대로, 그림을 만들지 않았다). 이미지를 받으면 `public/`에 두고 값 하나만 바꾼다.
- 테스트: 유닛 `event-json-ld.test.ts`(7 — 전체 값, 종료 계산, 자정 넘김, 빈 값, 장소 일부, 이스케이프), `event-metadata-default-og.test.ts`(2 — `vi.mock`으로 기본 이미지가 있을 때). e2e `e2e/seo.spec.ts`(4 — robots 두 그룹 규칙·sitemap 주소, sitemap 포함·제외·`lastmod` 없음, GP-2 5xx → 500, 공연 상세 원본 HTML의 ld+json). 소유 확인 메타는 env를 준 일회성 실행으로 `/`·`/events/101`·`/hosts/11`의 `<head>`에 나오고 `/hosting`에는 없는 것을 확인했다(스펙으로 남기지 않음 — e2e 서버 env가 고정).

**Claude 판단**
- `metadataBase`를 루트 레이아웃이 아니라 `(public)` 레이아웃에 — 왜: 사이트 origin을 값으로 두지 않는 규칙(§12) 때문에 요청 `Host`가 필요한데, 루트 `generateMetadata`에서 `headers()`를 읽으면 정적 프리렌더 화면(호스팅 센터·`/login` 등)의 메타가 요청 시점으로 밀려 Cache Components가 빌드를 막는다(`generate-metadata.md` "With Cache Components"). `(public)`은 원래 요청 시점 조회 그룹이다. 공유·검색되는 화면(공연·호스트·공지·홈·선물)이 모두 여기 있다. 되돌리기: `(public)/layout.tsx`의 `generateMetadata` 삭제.
- 소유 확인 메타를 빌드 값이 아니라 런타임 env로 — 왜: 스테이징·운영이 같은 이미지(§12·deploy-plan §4). 비어 있으면 아무것도 넣지 않는다. 되돌리기: `verification` 블록 삭제.
- robots에 `/events/*/checkout`·`/api/`를 더 막음 — 왜: 주문서는 로그인 뒤 화면인데 `/events/` 허용 아래에 있고, `/api/`는 JSON이라 색인할 것이 없다. 되돌리기: `DISALLOWED_PATHS`에서 두 줄 삭제.
- sitemap에 `/`(공연홈)를 넣고 `/events`(공연 리스트)·공지는 넣지 않음 — 왜: 리스트는 브라우저 조회 화면(`(app)`)이라 원본 HTML에 공연이 없고, 공지 공개 목록은 서버 조회 화면이 아니다. 공지 상세는 robots로 허용만. 되돌리기: `sitemap.ts`에 항목 추가.
- 호스트 홈을 GP-3 팬아웃으로 모음(5개씩) — 왜: 이슈가 호스트 홈을 넣으라 했고 다른 공개 원천이 없다. 비용은 sitemap 요청마다 종료 전 공연 수만큼 GP-3. 백엔드가 GP-2에 `hostId`를 주면 지운다(B16). 되돌리기: `withHosts` 호출을 빼고 공연만 넣는다.
- `generateSitemaps`는 지금 쓰지 않음, 공연 상한 2,000개(`MAX_PAGES` 40 × 50) — 왜: 한 파일 50,000 URL 한도보다 한참 아래이고, 종료 전 공연이 수천 개가 될 일은 당장 없다. 상한은 요청마다 백엔드를 부르는 횟수를 묶기 위한 것. 넘기 전에 나눈다(plan P14).
- JSON-LD에 `description`(OG 설명과 같은 요약)·`geo`를 더함, `eventStatus`는 언제나 `EventScheduled` — 왜: 검색 권장 필드이고 공개 값이다. 공개 응답에 취소·연기 상태가 없다(삭제 공연은 404). 장소가 없는 공연은 `location`을 빼서 리치 결과에서 오류로 남는다(필수 필드) — 지어내지 않는다.
- JSON-LD를 `<head>`가 아니라 본문 첫머리에 — 왜: Next `json-ld.md` 권장 방식(페이지 컴포넌트의 `<script>`)이고 구글은 본문 JSON-LD도 읽는다.

**남은 것**: 기본 OG 이미지(디자인), 리치 결과 테스트(공개 URL — D2 스테이징 뒤), 서치 콘솔·네이버 인증과 sitemap 제출(운영 도메인이 v2로 넘어간 뒤 — 운영 작업), 선물 OG(`gift-metadata.ts`)는 기본 이미지를 아직 쓰지 않는다(값이 정해질 때 같이).

## 백엔드 답변 반영(2026-10-31)

백엔드 2.5.1(`dev-latest` `78b1b6e7`, #887 `c80a3b73`·#888 `78b1b6e7`, 운영·스테이징 배포)과 백엔드 개발자 답변. 답마다 소스로 확인했다(`V2MyPageResponses.kt` `V2MeResponse`, `V2MyPageRequests.kt` `V2UpdateMeRequest`, `V2MeUseCase`·`V2UserDomainService.updateProfile`·`User.changeMarketingAgree`, `V2OrderResponses.kt` `V2OrderElement.orderMethod`·`V2OperationTypes.kt` `V2OrderMethod`·`V2OperationMapper`, `V2MyTicketUseCase.markApprovedReadOnView`·`V2NotificationDomainService.markOrderApprovedRead`(`timeout = 3`)·`V2GiftNotificationEventHandler`(비동기 핸들러 삭제), `OrderWithDrawRefundHostEmailService.subjectOf`·`HostRefundMailInfoHelper`, `KakaoKauthErrorCode`, `V2BankController`, v2 `README.md`).

| 질문 | 답 | 반영 |
|---|---|---|
| B2 토큰 수명 | 운영·스테이징 액세스·리프레시 둘 다 518400초(6일). env 값이라 소스로는 기본 3600만 보인다 | 코드 변경 없음. 리프레시가 Safari 7일 `localStorage` 삭제보다 먼저 끝나 잃는 재발급이 없다 — tech-decisions §4·patterns·plan P4a 줄, api-contract §9 |
| B7 운영 값 | `payType`·옵션 `type` null 행 없음(티켓 3,378·옵션 그룹 1,568), 업로드 URL 제한 기본 30, 자동 만료 스케줄 켜짐(19:00~22:30 KST 30분마다) | 스키마는 null 허용 그대로(지워도 되지만 이득이 없다). api-contract §1 업로드·§6 정산 줄 |
| B8 카카오 | KOE010 코드 `KAKAO_KOE010`로 고침(#887). 동의 항목·콜백 등록은 콘솔 확인 중, 가입 폼에서 계속 받는다 | error-codes 행. 질문은 콘솔 두 줄만 남김 |
| B9 T-3 | T-2·GG-7a가 응답 전에 읽음 처리(별도 트랜잭션 3초) → 직후 T-3 `hasNew:false`. 드문 실패도 T-2는 200 | 코드는 이미 "한 번 무효화, 기다림·재시도 없음"이라 **바꿀 것이 없다** — `useTicketDetail` 주석만(비동기 → 응답 전). mock T-2도 이미 동기 읽음. api-contract 마이페이지 절 |
| B13 호스트 메일 | 그대로 보내되 승인 전 취소(`approvedAt == null`)면 제목·본문 "…승인 전 주문을 취소했습니다. 입금됐다면 환불해 주세요." | 화면 문구 없음. api-contract 취소 절, legal-copy 머리 |
| B15 ECR | 저장소 `dudoong-front`, 역할 `dudoong-github-ecr-front-v2`(main·`v*`만, 브랜치 수동 실행 안 열림) | 워크플로는 다른 작업(위 "B15 ECR 이미지 워크플로") — 여기서는 backend-questions·README만 |
| B16 | Swagger "(비로그인 공개)"·README `BAD_REQUEST` 고침(#887). `AGREEMENT_ENFORCE` 꺼짐, 날짜 없음 | 질문은 날짜·참고 항목만 남김(참고 3건은 `78b1b6e7`에서도 그대로) |
| B17 마케팅 | GM-1·PM-2 응답 `marketingAgree`, 변경 PM-2 `{marketingAgree}`(값 지정·멱등, 생략 = 그대로) | `MeSchema.marketingAgree`(필수 boolean), `UpdateMeRequestSchema.marketingAgree?`, mock PM-2·fixture, L 훅 `useMarketingSetting`(아래 판단). v1 토글·`GET /api/v1/users/me` 우회 코드는 원래 없었다(만들기 전) |
| B18 | 서버 그대로(승인 대기 셀프 취소 허용, `canCancel`대로). 약관 제27조③·안내 문구 개정 예정 | 코드 변경 없음. plan P9·legal-copy·v1-additions D-2. 질문은 문구 대기로 남김 |
| B19 | GR-1·GR-2 `orderMethod`(APPROVAL/PAYMENT, v1 주문 포함) | `HostOrderElementSchema.orderMethod`(열린 enum, nullable), `isDudoongOrder` = `orderMethod === 'APPROVAL' && totalAmount > 0`, mock `StoredGuestOrder.orderMethod`(두둥 APPROVAL, 선착순 무료 PAYMENT, 관객 O-1 주문은 `approvalRequired`로). plan P13a·legal-copy C-3·v1-additions D-4 |
| B21·B22 | 답 없음 — `78b1b6e7`의 `ThrottlingWebConfigure`(제외 경로 `kakao-skill/my-orders`뿐)·`RegisterRequest.phoneNumber`(검증 없음) 그대로 | 열린 질문으로 둔다 |

- 바뀐 코드: `src/api/me/schema.ts`(+테스트), `src/api/order/schema.ts`(+`schema.test.ts`·`guest-manage-api.test.ts`), `src/features/hosting/guest/model/guest-rules.ts`(+테스트 10줄 표), `src/features/audience/mypage/model/{profile.ts,useMarketingSetting.ts}`(+`useMyPage.test.tsx` 3건), `src/features/audience/ticket/model/useTicketDetail.ts`(주석), mock `fixtures/me.ts`·`me.handlers.ts`·`guest-store.ts`, `LoginGate.test.tsx`(GM-1 응답에 `marketingAgree` — 없으면 스키마가 계약 위반으로 막는다).
- 문서: backend-questions(답 받은 B2·B7·B9·B13·B15·B17·B19 삭제, B8·B16·B18 줄 정리, 머리말), api-contract, error-codes(KOE010), plan(P4a 줄·P9·P13a), legal-copy, v1-additions, tech-decisions §4, patterns(Safari 줄), README(질문 수·B15·마케팅 줄·개정 이력).

**Claude 판단**
- **마케팅 수신 L 훅을 지금 만듦**(`useMarketingSetting` — 화면에 넣을지는 여전히 사용자 결정) — 왜: B17로 API가 생겼고, 철회 수단이 없는 것이 처리방침 10장 위험이라 V 결정이 나오면 바로 붙일 수 있게. 낙관 갱신 없이 요청 중 비활성, 성공 응답으로 세션 키 갱신 + 통지(legal-copy B-7 v1 문구, 처리 일자 KST), 실패는 값 그대로 + B-7 실패 문구(`meta.handled` — 전역 토스트 없음). 되돌리기: `useMarketingSetting.ts`와 `profile.ts`의 마케팅 절, `useMyPage.test.tsx`의 그 describe 삭제(스키마 필드는 계약이라 남긴다).
- **`orderMethod`가 null·모르는 값이면 예전 판정으로** — 왜: 서버 타입이 `V2OrderMethod?`(도메인 값이 없을 때 null)라 빠뜨리는 쪽보다 더 붙는 쪽을 유지. v1 PG 주문(`PAYMENT` + 금액 > 0)은 이제 안내가 붙지 않는다(전에는 붙었다). 되돌리기: `isDudoongOrder`의 null 분기를 `false`로.
- **B7 null 허용 스키마는 그대로** — 왜: 운영에 null이 없다는 것은 지금 데이터 이야기이고 서버 타입은 nullable이다. 좁히면 계약 위반 위험만 생긴다.
- **error-codes.md KOE010 행을 손으로 고침**(이 작업 목록 밖의 문서) — 왜: 소스(#887)와 다른 사실이 남아 있었다. 되돌리기: 그 한 줄.

## 백엔드 최종 답변 2.5.2 반영(2026-10-31)

백엔드 최종 답변("백엔드 질문 답변 최종 2026-10-31")과 백엔드 2.5.2(`dev` `cb53bfaa` — #894 `f7d4acd3`·#895 `1cb52ba6`·#896 `cb53bfaa`, 운영·스테이징 배포). 답마다 소스로 확인했다(`V2EventBrowseResponses.kt` `V2PublicTicketItemResponse.isSuspended`, `V2PublicTicketItemMapper.publicItems`·`onSaleItems`, `TicketItem.isInSalePeriod`, `V2ReadCheckoutUseCase`, `PhoneNumberVo.validate`, `RegisterRequest.toOauthInfo`·`RegisterUseCase`, `UserErrorCode.USER_PHONE_INVALID`, `ThrottlingInterceptor.AUTH_TOKEN_PATHS`, `IPRateLimiter.resolveAuthBucket`, `application.yml` `throttle.*`, `KakaoInformationResponse.getName`). 2.5.1 답(B2·B7·B9·B13·B15·B16 문구·B17·B19)은 위 "백엔드 답변 반영(2026-10-31)"(PR #14)에 있다.

| 질문 | 답 | 반영 |
|---|---|---|
| Q33·B11 판매 중단 티켓 | GP-5가 판매 기간 안이면 판매 중단 티켓도 넣고 `isSuspended: Boolean`(true면 `isPurchasable` 항상 false, `remaining`·`isSoldOut`도 계산). 기간 밖·삭제는 빠짐. O-0은 판매 중단에 404 | `PublicTicketItemSchema.isSuspended`(필수 boolean), `ticket-state.ts` 상태 `SUSPENDED`(PAST 다음·매진보다 먼저), 목록은 모두 판매 중단이면 `NOT_ON_SALE`. mock: `ticket-store` `publicTicketsOf`가 `isInSalePeriod`로 거르고 `isSuspended: !isSellable`, 세트 `suspended`·`allSuspended`, O-0 mock 판매 중단 404, O-1 mock 판매 중단 `Ticket_Item_400_10`, fixture 전부 `isSuspended: false`. design-requests Q33 닫힘 |
| B22(문서의 N2) 가입 전화번호 | 가입 때 서버 검사 — 빈 값·공백은 null 저장, 한국 번호는 유효 번호만, 해외는 가능한 번호, 형식 고정 없음. 실패 400 `USER_400_2`(서버 문구 "…두둥 관리자에게 문의주세요"). 운영 36,207건 중 거절 0 | `useRegisterForm`이 `USER_400_2`를 제출 실패가 아니라 칸 오류 `phoneInvalid`로(`PHONE_INVALID_MESSAGE` "전화번호를 확인해 주세요" — 잠정), 거절된 번호를 고치거나 지울 때까지 `canSubmit` false. 프론트 `010-1234-1234` 모양 검사(`phoneFormat`)는 그대로. mock 가입이 서버 규칙을 흉내 낸다(`isAcceptablePhone` — 근사), `errors.userPhoneInvalid`. patterns §24 P4b 행 |
| B21 재발급 요청 제한 | 비로그인 `POST /token/refresh`·`/logout`은 인증 전용 IP 버킷(`auth:{ip}`, 분당 600, env `RATE_LIMIT_AUTH`). 다른 비로그인 요청은 분당 60. 운영·스테이징 모두 기본값 | 코드 변경 없음 — 429·408 일시 오류 처리(PR #10)는 상한이 남아 있어 유지. api-contract §9, tech-decisions §4 |
| B8 카카오 콘솔 | 이메일·닉네임·프로필 사진·전화번호 필수 동의, 이름 사용 안 함, 콜백 staging·localhost:3000·운영 등록 | 코드 변경 없음(주석·fixture 설명만). `/oauth/kakao/info`의 `name`은 서버가 `kakao_account.name ?: properties.nickname`으로 채워 **사실상 닉네임** — 가입 폼 이름 칸 초깃값으로 그대로 둔다. api-contract §9 |
| B15 보충 | main 수동 실행(workflow_dispatch)은 된다, 다른 브랜치는 안 연다 | `image.yml` 머리 주석·deploy-plan §5·§6 이미 같은 내용 — 변경 없음 |

- 바뀐 코드: `src/api/ticket-item/schema.ts`·`queries.ts`(주석), `src/features/audience/event/model/ticket-state.ts`(+테스트), `useTicketSelection.test.tsx`(판매 중단 고르기·중단되면 선택 풀림), `src/api/ticket-item/ticket-manage-api.test.ts`(중단 → GP-5에 `isSuspended`), `src/features/shared/auth/model/register-form.ts`·`useRegisterForm.ts`, `useKakaoCallback.test.tsx`(`USER_400_2` 2건), mock `ticket-store.ts`·`ticket-item.handlers.ts`·`order.handlers.ts`·`auth.handlers.ts`·`respond.ts`·`fixtures/{event,order,kakao}.ts`, e2e `hosting-ticket.spec.ts`(중단 → GP-5에 남고 `isSuspended`)
- 호스트 쪽 영향 없음: `ticketSaleChipOf`·티켓 관리는 T-1(`TicketItemManage.saleState`)을 보고 GP-5 모양과 무관하다. `guest-cache`의 GP-5 무효화도 그대로.
- 문서: backend-questions(B8·B11·B21·B22 삭제 — 남은 것 B16·B18), README(개수·개정 이력), api-contract(머리, 구매 절 GP-5, §9 가입 전화번호·카카오 콘솔·요청 제한), tech-decisions §4·§30 Q33, patterns §15·§24, plan P6·P4b, design-requests(Q33 닫힘, 41건)

**Claude 판단**
- **판매 중단을 매진보다 먼저 판정** — 왜: 서버가 판매 중단 티켓에도 `isSoldOut`을 계산해 주므로 둘 다 참일 수 있고, 딤드(호스트가 판매를 멈춤)가 화면에서 더 강한 사실이다. 지난 공연은 그보다 먼저. 되돌리기: `ticketState`의 `isSuspended` 줄을 `isSoldOut` 아래로.
- **모두 판매 중단인 목록은 새 목록 상태를 만들지 않고 `NOT_ON_SALE`** — 왜: 버튼·빈 상태 문구가 "살 수 있는 티켓이 없다"와 같고, 따로 문구가 필요한지는 V(디자인) 결정이다. 매진 + 판매 중단 섞임도 `ALL_SOLD_OUT`이 아니라 `NOT_ON_SALE`. 되돌리기: `ticketListState`에 분기 추가.
- **`USER_400_2`는 거절된 번호를 기억해 그 번호 그대로는 다시 못 내게** — 왜: 같은 번호는 같은 400이 나고, 칸 오류가 고치면 풀리는 편이 다른 칸 오류(`phoneFormat`)와 같은 동작이다. 제출 실패(`error`)는 비워 둔다. 되돌리기: `rejectedPhone` 상태를 지우고 `registerError`에 분기.
- **카카오 프로필 `name`(= 닉네임)을 이름 칸 초깃값으로 유지** — 왜: 서버가 이미 닉네임으로 채워 주고, 사용자가 고칠 수 있으며 v1도 같은 값을 썼다. 비워 두면 모든 신규 가입자가 이름을 직접 쳐야 한다. 되돌리기: `initialRegisterValues`의 `name`을 `''`로.
- **mock 전화번호 검사는 libphonenumber 근사**(휴대폰 `01[016789]`·지역번호 + 자릿수, 해외 10자리 이상) — 왜: mock에 라이브러리를 들이지 않는다. 실제 판정은 서버이고, FE는 코드(`USER_400_2`)로만 분기하므로 mock 규칙의 세부는 테스트 입력용이다.

## 에러 처리 정리(2026-10-31)

**변경**
- `@suspensive/react` 3.21.4 도입. `src/ui/components/ErrorBoundary`(suspensive ErrorBoundary + `QueryErrorResetBoundary`, `shouldCatch`·`holdOn`·`resetKeys`, `ErrorBoundaryGroup` 등 재노출), `AsyncBoundary`를 그 위에 suspensive `Suspense`로 다시 구현. 자체 class 경계 삭제. 사용처 `ignoreError` → `holdOn`. `isLocalBoundaryError`(`src/api/errors.ts`)
- `src/api/handle-error.ts`(`handleError`), `src/utils/try-catch.ts`(Go 스타일 `tryCatch` → `[data, error]`), `src/api/error-toast.ts`. 호출 쪽은 기본 try/catch, 연쇄만 `tryCatch`(사용자 결정 — 처음엔 결과값 유틸 `settle`로 했다가 TanStack 관례가 아니라 바꿨다). 전역 `MutationCache.onError`는 로그만. `handle-codes.ts`·`meta.handled*`·`shouldToastMutationError` 삭제. 변경 훅 약 30개 이관
- eslint `no-restricted-syntax`: 옵션 onError/onSettled, try 블록 밖이면서 `tryCatch` 인자도 아닌 mutateAsync, mutate 금지. 테스트는 `errorToast` 스파이(`src/test/error-toast.ts`)
- 문서: tech-decisions §4·§13·§15, patterns §4-3(바운더리 영역 설정 가이드)·§4-5·§24 앞

**결정**(사용자, 관제탑 2026-10-31): 조회 전역 토스트 유지, 바운더리는 suspensive에서, 변경은 호출 쪽 명시 처리.

**Claude 판단**
- `handleError`는 로그를 다시 남기지 않는다(전역이 이미 남김). 세 번째 인자 `{ otherwise }`로 표 밖 실패를 화면이 맡는다(무료 선착순·셀프 체크인·마케팅·호스트 스캔)
- 낙관 갱신 되돌리기(알림 읽음)는 옵션 onError를 eslint-disable로 예외
- 옵션 onSuccess에 남긴 화면 반응: 선물 반환 `setDone`, 옵션 삭제 `setDeleted`(캐시 반영보다 먼저 세워야 해서), 탈퇴 세션 정리·이동
- 관심 호스트 해제: 캐시 반영을 옵션 onSuccess로 옮겨 연달아 해제해도 모두 빠진다(이전엔 마지막 호출만 — 작은 동작 개선)
- eslint는 실제로 `ui → api`를 허용하지만 경계는 일반 술어 prop으로 유지

## 이용약관 일부 개정 반영 — v1 Front #385, 2026-11-07 시행 (2026-10-31)

원본: v1 `Gosrock/DuDoong-Front` PR #385 "docs: 약관 제27조③ 두둥티켓 승인 전 취소 일부 개정" — **2026-10-31 기준 OPEN(머지 전)**, base `dev`, head `706b561d6828c63b912d819e07abe22d7c2b8e15`, 바뀐 파일 `apps/ticket/public/term.html` 하나(+6 −4). backend-questions B18(백엔드 이슈 #897)의 약관 원문이다. 사용자 결정(2026-10-31): 약관 내용 변경만 가져오고 v1 화면·코드는 가져오지 않는다.

- **대조**: head의 부모 `eee59f1`의 `term.html`이 v2 `public/term.html`과 바이트 단위로 같다(`cmp`) → head 파일을 그대로 복사했다. 처리방침은 바뀌지 않았다.
- **바뀐 조항**: 제27조③(승인 전에도 서비스에서 취소 가능, 못 하면 호스트에게 요청, 회사는 입금 여부를 확인하지 않고 취소, 입금액은 제29조③에 따라 호스트가 환불), 제29조③1호("예매를 취소(승인 전 취소를 포함합니다)하거나"), 제19조② 괄호("승인 전에 예매를 취소하거나 취소를 요청한 경우"), 부칙 제1조 ①②(② 개정 조항 2026-11-07 시행), 제3조 개정 이력 한 줄.
- **코드**: `AGREEMENT_VERSION` `'2026-10'` → `'2026-11'`(`src/api/shared/agreement.ts` + 기대값 쓰는 테스트 5개). `order-detail.ts` `cancelNotice` 주석(B18 위험 → 약관 해결·문구 대기). 동작 변경 없음.
- **e2e**: `e2e/legal.spec.ts` 출처 주석(#385 머지 전·head), 이용약관은 부칙 제1조①(10-25)과 ②(11-07 시행) 두 문장을 본다.
- **문서**: `legal/terms-2026-10-25.md`(머리 출처·"시행 뒤 고친 것" 행·본문 4곳 — 새 파일을 만들지 않는 것은 #379와 같은 방식), legal-copy(머리, 위험 줄 → "승인 전 취소 안내 — v2 문구 확정 대기", A-2·A-7·A-8 ⑤ 표시, 약관 원문 파일 절, **"B18 잠정안" 절**), backend-questions B18(제목·약관 해결·남은 것), v1-additions(§1 #385 행, L-1·L-2, 제27조③ 행, D-2, 닫을 것 표), plan P9 두 줄, design-requests Q31, api-contract §4 동의 필드, README(표 2줄·미확정·개정 이력).

**사용자 결정(2026-10-31)**
- B18을 "약관 해결 / v2 안내 문구 확정 대기"로 좁힌다.
- `agreementVersion`을 `'2026-11'`로 올린다. 근거: 동의 칸 문구는 그대로지만 동의 대상 약관의 판이 바뀌었다(시행 월 기준). #379 때는 올리지 않았던 것과 다르다. v1은 #385에서 올리지 않아 v1 값은 `'2026-10'`이다 — 서버 기록상 v1·v2 값이 다를 수 있다.

**Claude 판단**
- **v1 안내 문구 대신 쓸 잠정안을 legal-copy에 적음(확정 아님)** — 왜: v2는 `canCancel=true`라 v1 ⑤("승인 전에는 앱에서 취소할 수 없습니다")를 쓸 수 없고, 개정 약관 문장만으로 초안을 만들 수 있다. 잠정안은 제27조③·제29조③1호·제19조② 괄호(승인 전 취소에는 호스트 환불 기준이 우선하지 않음)만 옮겼다. 되돌리기: legal-copy "B18 잠정안" 절 삭제.
- **시행 전(11-07 전) 게시해도 된다고 봄** — 왜: 게시본 부칙 제1조②가 개정 조항의 시행일을 따로 적어 그 전 예매·취소에는 종전 제27조③이 적용된다는 것이 문서 안에 드러난다. v1도 같은 파일 하나로 시행 전에 배포한다(#385 본문 "2026-11-07 전에 나가면 된다"). v2는 컷오버(P15) 전이라 운영 `/meta/term`은 v1이 게시하고, v2 V Phase가 모두 디자인 대기라 운영 출시는 11-07 뒤일 가능성이 크다(plan·deploy-plan에 날짜 없음). 스테이징에서는 개정본이 먼저 보인다.
- **`useKakaoCallback`·`register-form`·`schema.test`의 버전 문자열도 `'2026-11'`로** — 왜: 앞 둘은 상수 값을 기대하는 테스트이고, `schema.test`는 임의 문자열이어도 되지만 다른 값이 섞이면 읽는 사람이 헷갈린다.

## 동의 강제 임박 대응 — v1 Front #384 (2026-10-31)

v1 Front #384(백엔드 담당 작성, 2026-10-31): v1에서 동의를 안 보내는 곳은 호스트 어드민 카카오 가입(`/admin/kakao/callback`)뿐이고, 그 수정이 배포되면 백엔드가 `AGREEMENT_ENFORCE=true`로 켠다. v2는 칸(Q42)이 없어 강제가 켜지면 가입·주문·두둥티켓 생성이 전부 400이다.

- 사실 확인: v2 카카오 콜백은 `/kakao/callback` 하나(호스팅 트랙에 가입 경로 없음, `next.config.ts` 리다이렉트 표에 `/admin/kakao/callback` 없음), 가입 `idToken`은 본문(`toRegisterBody`) — #384의 어드민 경로 문제는 v2에 없다. 백엔드 `dev` `cb53bfaa` 검사 위치는 api-contract 동의 강제 줄·v1-additions §3 B.
- 가입: `RegisterConsents.ageOver14` → 체크하면 `ageOver14Confirmed: true`. `AGE_OVER_14_FIELD`(false)가 켜지면 필수·"전체 동의"에 들어간다(`requiredConsents`·`visibleConsents`·`withAllConsents` — 플래그를 인자로 받아 테스트). `useRegisterForm().consentFields`.
- 주문: 폼 값 `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`(초깃값 false) → 체크한 것만 `agreementFields`로 본문에, 무료는 두둥 확인을 싣지 않는다. `HOST_PROVISION_FIELD`·`DUDOONG_NOTICE_FIELD`(false)가 켜지면 스키마가 `true`를 요구한다(두둥 확인은 두둥만 — `checkoutAgreementFields`). `useCheckout().agreementFields`.
- 두둥티켓: `REFUND_OBLIGATION_FIELD` false 유지(변경 없음).
- 테스트: `register-form.test`(플래그 켠 필수·전체 동의·본문), `useKakaoCallback.test`(전체 동의가 만 14세를 켜지 않음, 체크하면 강제 mock 통과), `option-form.test`(플래그 켠 스키마·본문 4경우), `useCheckout.test`(두둥·무료가 강제 mock 통과, MSW 본문 검사).
- 문서: plan(L 열린 칸 Q42 행·P4b·P7·P12·P15 리허설), v1-additions(§3 B 머리·B-1·B-2·B-4·B-5·§5 Q42), design-requests Q42(우선순위 높음), backend-questions B16(시점 갱신 + 새 질문 2줄)·지켜볼 것, api-contract(동의 필드·동의 강제 줄).

**사용자 결정**: 필수 판정은 칸마다 상수 플래그로 두고 기본 끔 — 칸(V)이 붙으면 켠다. 체크값은 사용자가 체크했을 때만 싣는다(자동 `true` 없음). 강제가 칸보다 먼저 켜지면 v2가 400인 위험은 문서(plan P4b 위험 줄·P15)와 B16 질문으로 남긴다.

**Claude 판단**
- **"전체 동의"는 칸이 없는 만 14세를 켜지 않는다** — 왜: 칸 없이 `ageOver14Confirmed: true`가 실리면 동의 위조다. 되돌리기: `withAllConsents`가 `visibleConsents` 대신 모든 키를 켜게.
- **주문 동의 값은 RHF 폼 값으로 둔다**(별도 상태 아님) — 왜: 환불 규정 동의(`agreeRefundPolicy`)와 같은 자리이고, 플래그를 켜면 같은 resolver가 칸 오류를 낸다. 두둥 확인은 "입금하셨나요?" 확인에서 `form.setValue`로 켠다(V).
- **무료 주문은 두둥 확인을 체크값과 상관없이 빼고 보낸다** — 왜: 서버가 두둥만 검사·기록하고, 무료 화면에는 그 칸이 없다. 되돌리기: `toOrderBody`의 `payType === 'DUDOONG'` 조건.

## 디자인 시스템 10-31 판 코드 반영(2026-10-31, `feat/ds-sync-2026-10-31`)

design-system §8 "2026-10-31" 표의 반영 거리를 처리했다.

- 토큰: `interaction.disabled` Neutral 300 → 200, `overlay.dim` 70% → 85%(Figma `Background/dimmed`), 전용 토큰 `role.*`·`chip.giftPendingBg` → `chip.cyan`·`cyanSubtle`·`purple`·`purpleSubtle`(`colors.ts`도).
- **Chip 교체(사용자 결정)**: 옛 Tag 5종(`variant` status·tag·role·concert·money + `tone`)을 없애고 Figma `tag_v2` 하나 — `<Chip size shape color theme>`. 옛 칩 대응과 차이는 design-system §3 "옛 Tag → tag_v2". `formatDday`·`formatOptionAmount`는 그대로 둔다. 쓰는 곳은 스토리뿐이었다(V 시작 전).
- Button: `tonal` 아이콘만 배경 `brand.secondary` 계열. Dropdown item 36h. Input `leading` 아이콘 16(20 자리). Header: 바깥 끝 아이콘 버튼을 16 더 내보내 아이콘이 화면 끝에서 16(Figma 패딩 8 + 슬롯 40).
- 아이콘: 11변형 + `lightbulb`(다색, 세트 밖 낱개) 추가, `gift` 12 삭제 → 56종 80개.
- 확인: typecheck · lint · test(2346) · test:stories(194) 통과. 화면이 아직 없어 Figma와 캡처 비교는 하지 않았다(스토리 `Components/Chip` `FigmaVariants`·`OldTagMapping`).
- **결정(Claude)**: `tag_v2` small 좌우 10(Figma 직접 값)은 토큰 `space[2]` 8로 — 디자이너에게 토큰 값 요청(design-system §5). Header는 패딩을 바꾸지 않고 끝 버튼 여백으로 맞췄다(로고·아바타 슬롯 위치를 지키려고). primary 2 아이콘만 색은 Figma에 Large만 있어 모든 크기에 같은 규칙.


## 디자인 시스템 11-01 판 코드 반영(2026-11-01, `9yujin/ds-sync-1101`)

`Design: 디자인 시스템` 이슈 #23 · #25 · #26 · #27 · #28과 이슈 없는 변경(10-31 14:00~16:15Z)을 한 PR로. 비교·값은 design-system §8 "2026-11-01". 변수·텍스트 스타일은 바뀌지 않아 토큰은 그대로다.

- Checkbox: `shape?: 'round' | 'square'`(Figma `type`, #23). square 모서리 `radius[1]`. 기본 round라 기존 사용처는 그대로.
- Radio(#25·#26): 미선택 테두리 `surface.strongBorder`, disabled 배경 삭제(테두리·점만 `interaction.disabled`). 지름은 원래 20(가운데 정렬과 같음).
- Toggle(#27): 꺼짐 disabled 트랙 `interaction.disabled`(N200, 옛 N100). 켜짐 disabled는 이미 Violet 100.
- 다이얼로그(#28): 새 컴포넌트 없이 `Popup`(`Modal compact`)을 DS 모양으로 — 310폭, 안쪽 24, 흰 배경, 본문 `labelSm` `textSecondaryLabel`, 글자 묶음↔버튼 24, 버튼 `md`. `openConfirm` popup 변형이 같이 바뀐다.
- Button: primary 2 글자만 변형은 기존 `tonal` 규칙과 같아 주석만. 아이콘 슬롯 `ic_blank` 스왑은 코드 영향 없음.
- Header: 공연 전환형(`switcher`)만 끝 아이콘 버튼이 화면 끝에서 16(Figma `510:1947` 오른쪽 패딩 16, 다른 변형 8).
- 아이콘: ic_v2(이번에 공개)에서 `gift`·`gift-return`·`gift-cancel` filled 24, `link` 24, 낱개 `important` 24(다색) → 58종 85개.
- 사용처: `features/*`·`app`에서 Checkbox·Radio·Toggle·Popup·`openConfirm`을 쓰는 곳은 아직 없다(grep). props 이름은 바꾸지 않았다(더하기만).
- 확인: typecheck · eslint(바꾼 파일) · `vitest related`(42파일 234) · 스토리 테스트(50파일 208) 통과. Storybook 390폭 캡처를 Figma `F shot`(120:1249 · 295:1858 · 77:8 · 758:1714)과 나란히 봄 — 다른 점 없음(팝업은 첫 포커스 [취소] 테두리만 더 있음).
- **결정(🤖 Claude 판단)**:
  - Figma `type`(round/square)을 코드 `shape`로 — `type`은 Radix Checkbox(`<button>`)의 HTML 속성과 겹친다. Chip(`variant` → `shape`)과 같은 이름. 되돌리려면 prop 이름만.
  - 다이얼로그를 새 `Dialog` 컴포넌트로 만들지 않고 `Popup`을 바꿨다 — 같은 역할(되돌리기 어려운 확인, alertdialog), 커스텀 지양. 옛 GUI `567:9468`(342 · Large 버튼 · 회색 배경)과 달라진다. DS가 정본이라 판단.
  - 다이얼로그에 없는 상태(버튼 하나 · 진행 중 · 추가 내용)는 기존 동작 유지 — Figma 코멘트로 물음.
  - Radio 미선택 채움: Figma는 채움 없음, 코드는 흰색(`background.normal`)을 유지 — 흰 배경 위에서 같고, 회색 카드 위에서 테두리 안이 비쳐 보이지 않게.
  - Button primary 2 medium 글자만 45h(Figma) → 46(코드 medium 하나).
  - 아이콘 이름은 `ic` 체계를 유지하고 ic_v2 그림을 같은 이름으로 넣었다. `icon/link`(`760:2841`)는 REST 내보내기가 비어 있고 `ic_link`와 같은 그림으로 보여 뽑지 않음.
- **Figma 코멘트**: 디자인 시스템 `758:1714` 다이얼로그 — "[개발 · 디자인 없음] 다이얼로그 — 버튼 하나 · 진행 중 · 추가 내용"(id 1989698280).

## 디자인 시스템 #36 Top app bar spacing(2026-11-01, `9yujin/design-36`)

`Design: 디자인 시스템` 이슈 #36. 비교·값은 design-system §8 "2026-11-01(2)". Top app bar 패딩·간격이 변수 `Space/4`·`Space/5`에 묶였고 숫자는 그대로 — 대신 앞 PR(#35)이 놓친 아이콘 쪽 패딩 8 → 16(전 변형)을 반영했다.

- Header: 바깥 끝 아이콘 버튼의 추가 내보냄(-16, `switcher`면 -8)을 지움 → 아이콘 40 틀이 화면 끝에서 16, 제목 시작 72(Figma와 같음). 내부 `switcherRoot` 클래스 삭제, props는 그대로.
- 사용처: 셸 로고 헤더(`AudienceShell`·`HostingShell`)와 `AudienceSubHeader`의 아이콘이 8 안쪽으로 들어간다 — 로고 헤더는 Figma(`basic title`·`host title`, 패딩 24)와 이제 맞는다.
- 결정: 🤖 Claude 판단 — 로고 헤더(GUI 로컬·`host title`)는 Top app bar가 아니지만 같은 `Header`라 같이 바뀌는 것을 그대로 둠(Figma 아이콘 위치 24와 맞음 · 되돌리려면 logo일 때만 바깥 여백 -16).
- 확인: typecheck · eslint(Header) · `vitest related`(11) 통과. Storybook 390폭에서 요소 위치를 재서 Figma `37:44`(16:22Z 판) 값과 대조 — 아이콘 틀 L16·R16, 프로필 R24, 제목 L72 · 다른 점 없음.

## P5b-V — 공연 상세 · 섹션 뷰어 · 호스트 연락처 시트 · 공유 · PC 두 열 (뷰)

**상태**: done (2026-11-01, PR 대기) — 스킬 `gui-implement`. 남은 것: 카카오 공유창·공유 디버거 실기기(D2 뒤, QA EVT-10 수동)
**근거(gui-screens §0)**: 전부 **와이어** — GUI 2026-10-31T16:23Z 판 Ready for dev 35개(23 → 35: 공연결제·공연홈·예매하기·주문완료·티켓페이지 추가) 중 공연상세 `759:12772`·`759:19679`·호스트 연락처 `759:22611`은 Ready 밖. 모바일 `121:1216`, 연락처 `500:929`(공연상세 위 팝업)·`121:2026`(아이콘 + 값 행), PC `640:1957`, PC 연락처 모달 `666:14989`. 열린 Design Sync #36(DS Top app bar — design-36 세션)·#29·#30·#19(티켓탭)는 이 화면과 겹치지 않음. DS 기준 판 뒤 변경도 Top app bar(#36)뿐
**변경**
- `features/audience/event/EventDetail/`: `EventDetailView`(모바일 한 열 + 하단 고정 바 / PC 1024~ 두 열 `1fr 382` + 오른쪽 sticky 카드 — 같은 DOM, CSS로), `TicketOptionList`(GP-5 표시만 — 가격·조건·잔여·매진/판매 중단/판매 종료 칩, 판매 중단 딤드), `EventContactsOverlay`(`ResponsiveOverlay` — 모바일 바텀시트 · PC 모달, 열 때 `useEventContacts`), `shareEvent`(카카오 공유 → 실패 시 주소 복사 + 토스트), `week-calendar`(공연 날짜가 든 일~토, 표시용)
- `features/shared/section-viewer/ui/SectionViewer`(sanitize된 HTML 렌더 + 본문 서식 — DS 글자 스타일 값, 빈 탭 "아직 등록된 내용이 없어요") — P11 미리보기가 재사용
- `features/shared/contact/ui/ContactList`(아이콘 + 종류 + 값 행, 링크면 누름, 가린 값은 글자 + "로그인하면 볼 수 있어요" `replace` 링크, 로딩·실패·없음) — P5c·P9 재사용 후보
- `src/ui` 더한 것: `Tabs` `size="responsive"`(모바일 md · 1024부터 lg, 스토리 `Responsive`). 기존 props 바꾸지 않음
- `src/utils/copy-text.ts`(patterns §9 표의 `copyText` — 없어서 만들었다. clipboard → textarea 폴백)
- 테스트 기대값: `useEventDetail.test` 화면 3건을 V 마크업으로(섹션 region → tab/tabpanel, "잔여를 그리지 않는다" → "재고는 브라우저 GP-5로만" — 응답 HTML 재고 없음은 e2e 그대로)
- QA `qa/scenarios/event-detail.qa.ts` EVT-1~9(+ EVT-10 수동) — 18/18 통과(mobile · desktop)

**완료 기준 V ↔ 확인**

| 기준 | 확인 |
|---|---|
| v1 실데이터 본문 샘플(MARKDOWN·HTML)이 뷰어에서 정상 렌더 | QA EVT-2(섹션 10개 — v1 샘플 HTML·MARKDOWN 번갈아, 탭마다 본문·스크립트 없음), ego-browser 390·1440 캡처 |
| 라우트 규칙(`instant = false`, Suspense·loading 없음, 404) | 라우트 파일 손대지 않음. e2e `event-detail.spec`(P5b-L) 그대로 |
| 모바일 하단 고정 바 PC에서 숨김(같은 DOM) | QA EVT-1 desktop(버튼 2개 중 하단 바 것 hidden) |
| 연락처 A안 | QA EVT-3(익명 — 서버 GP-3만, 가린 값 + 로그인 링크) · EVT-4(로그인 — 열 때 browser viewer, `tel:`) · EVT-5(viewer 실패 → [다시 시도]) |

**ego-browser 확인(단계마다)에서 고친 것**: 서버 HTML 포스터가 하이드레이션 전에 실패하면 `onError`를 놓쳐 깨진 그림 + alt가 보임 → ref에서 `complete && naturalWidth === 0`도 본다 / PC 정보 표 행 간격이 InfoRow 패딩과 겹쳐 넓음 → 표 gap 제거 / 섹션이 많으면(10) 모바일 탭 줄이 폭을 넘음 → 탭 줄만 가로 스크롤 / 탭 크기를 JS(`useMediaQueries`)로 나누던 것을 `Tabs size="responsive"`(CSS)로

**결정 — 🤖 Claude 판단**(근거 없음 / 무엇을 보고 / 되돌리려면)
1. 중개자 고지(legal-copy A-1 원문 그대로)를 정보 아래 "예매 안내 문구" 자리(와이어 `640:1957`)에 모바일·PC 공통으로 — 계획에 위치가 없는 약관 표시 의무를 와이어의 빈 문구 자리에 넣었다. 문구 안 '판매정보'는 v2에 탭이 없다(A-2 위치 없음 — 그대로 둠, 원문 수정 금지). 이용약관 링크는 v2 경로 `/meta/term` 새 창. 되돌리기: `IntermediaryNotice` 빼기
2. 연락처는 아이콘만 나열(`500:929`)하지 않고 `121:2026`처럼 아이콘 + 종류 + 값 행 — 가린 값(Q41)이 보여야 해서. 제목 "문의하기"(plan Q20), 호스트 사진 Avatar 80 + 이름. 되돌리기: `ContactList`
3. PC 문의 입구 — 와이어에 없음. 정보 표 '호스트' 옆 [문의하기] secondary sm. 되돌리기: `EventDetailView` 호스트 InfoRow
4. 공유 아이콘 — DS에 공유가 없어 `link`. 모바일 포스터 오른쪽 위 tonal sm, PC 정사각 tonal lg(Q22). 유튜브 연락처 아이콘도 `link`
5. [티켓 구매하기] — P6-V 전까지 누를 자리만: 살 수 있는 티켓이 있으면 활성(누르면 아무 일 없음), 없으면 비활성. `hasTicket: false`면 티켓 카드·버튼 없음. 연락처가 없으면 [문의하기] 없음
6. 티켓 행 문구: 가격 `15,000원`/`무료`, 조건 `인당 N매 제한 / 호스트 승인 후 확정 | 구매 후 자동 확정`, 잔여 `잔여 N매`(살 수 있을 때만), 상태 칩 매진·판매 중단(딤드 — 글자 `textDisabledLabel`)·판매 종료, 빈 "판매 중인 티켓이 없어요"/"지난 공연이에요", 실패 "티켓 정보를 불러오지 못했어요." — 와이어 문구(`₩6,000`·`Free`·`Ticket Options`)는 한국어 표기로
7. PC 정보 표는 DS `InfoRow`(third) — 와이어의 왼쪽 정렬 표와 달리 값이 오른쪽 정렬(DS 우선). 모바일 장소 행에 주소(회색)도 — 와이어 모바일엔 이름만, PC엔 주소. 장소 › 는 지도(Q35)라 없음
8. 포스터 비율 282:400(와이어 두 폭 모두), 없음·실패는 `surfaceImageBg` 빈 상자(Q26). `next/image` 대신 `<img>`(v1 #378 `/_next/image` 차단)
9. 주간 달력 — "2026년 11월" + SUN~SAT + 날짜, 공연일 brand 원(Q21 표시용, `aria-hidden` — 날짜는 표에 있다)
10. ↑ 맨 위로 버튼(와이어 두 폭) 그리지 않음. 섹션 탭은 비제어(`useState`) — `?tab=` 연동 안 함(근거 없음, 되돌리기: Tabs 제어형 + searchParams 말단)
11. 레이아웃 값: 컨테이너 `Container`(1440에서 1280 — 와이어는 1200), 오른쪽 카드 382 sticky `space[5]`, 두 열 간격 `space[5]`, 카드 모서리 `radius[4]`

**Figma 코멘트**(`[개발 · 디자인 없음]`, 기록부 `2026-11-01-impl`): 와이어 `640:1957` PC 문의 입구·버튼 상태·폭(`1989701613`) / `640:1957` 지도 코멘트(Tomato `1970662720`)에 답글 — 주소 글자만(`1989701615`) / `500:929` 연락처 값 표시·상태·유튜브 아이콘(`1989701617`) / `121:1216` 공유 아이콘·포스터 없음·티켓 상태·맨 위로(`1989701618`). `FIGMA-CUSTOM:` 줄은 없다(와이어 근거)

**범위 밖(고치지 않음)**: 티켓 고르기·시트(P6-V), 지도(Q35), 판매정보 탭(legal-copy A-2 — 계획에 위치 없음), mock 호스트·포스터 이미지 주소가 열리지 않음(목 데이터), 관객 셸 로고가 `h1`이라 화면에 `h1`이 둘(P4s 셸 — 공연 제목도 h1), 탭 포커스 링이 탭 줄 가로 스크롤 영역에서 위아래로 잘릴 수 있음
