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
**변경**: 색 토큰 라이트·다크 두 벌(`createThemeContract`, 다크는 `html[data-theme="dark"]`에서만 — 배포는 라이트만), space(데스크탑에서 7~10 확대)·radius·font·zIndex·shadow, 텍스트 스타일(Figma 이름), sprinkles, 브레이크포인트(desktop ≥ 1024, wide ≥ 1280), `colors` 객체. 프리미티브 `Txt`·`Flex`(+`Center` 등)·`Spacing`·`Divider`·`Container`, `useMediaQueries`, Button recipe(primary/secondary/tonal × sm/md/lg, selected). 아이콘 58개 + `<Icon />` + 생성 스크립트. 폰트(Pretendard 동적 서브셋, Saira Condensed). 스토리(토큰·프리미티브·스타일 세 방법·아이콘)
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
**완료 기준**: 6개 통과(GG-3 실제 응답 미확인). typecheck · lint · prettier · test(163) · test:stories(187) · build · e2e(4) · qa home 통과. `dev:mock`으로 `/` 200·태그 표시, `/api/v2/me` 401 `AUTH_403_2` 확인
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
| 로그인·콜백 401 → "잠시 후" | e2e 2건, 훅 2건, auth-outcome 행 |
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
