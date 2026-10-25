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

백엔드 `dev` `24aa595` → `432cce4`(PR 32개), 백엔드 Develop 기획서(2026-10-25), v1 프론트 운영(Front #345~#370) 대조로 나온, **이미 구현된 코드**에 필요한 수정 목록이다. 이 단계에서는 문서만 고쳤고 코드는 고치지 않았다(A안 항목만 위 절에서 완료). 아직 구현하지 않은 Phase의 일은 plan 각 Phase에 넣었다.

| # | 파일 · 심볼 | 이유 | 근거 PR | 상태 |
|---|---|---|---|---|
| 1 | `src/features/audience/event/model/useEventDetail.ts`, `src/features/shared/host-home/model/useHostHome.ts`, `src/api/event/queries.ts` | 공개 쿼리의 `contacts`가 비로그인 값(가린 값)이라 로그인 사용자에게도 가린 값이 보였다 | #846 | **완료(A안)** — 위 절 |
| 2 | `src/features/shared/contact/model/contact-link.ts` `hrefOf` | 가린 이메일 `ab***@gmail.com`이 `EMAIL` 정규식을 통과해 `mailto:` 링크가 됐다 | #846 | **완료(A안)** |
| 3 | `src/api/__mocks__/event.handlers.ts`·`host.handlers.ts`(가림), `event-detail.handlers.ts`(viewer 5xx 시나리오) | 익명 요청에 가린 연락처를 주지 않았다 | #846 | **완료(A안)** |
| 4 | `src/api/gift/schema.ts` `GIFT_CANCEL_REASONS` | 선물 `cancelReason`에 `ADMIN`(운영자 강제 회수)이 생겼다. 지금은 `openEnum`이 `UNKNOWN` + warn 로그로 받는다(깨지지는 않는다). `ADMIN`을 더한다 | #826 | 남음 |
| 5 | `src/api/auth/schema.ts` `RegisterBody`, `src/features/shared/auth/model/register-form.ts` | 가입 본문에 `termsAgreed`(이용약관 체크 값)·`ageOver14Confirmed`·`agreementVersion`이 없다(`marketingAgree`만). 만 14세 확인 칸은 v2 계획에 없다(design-requests Q42) — 동의 항목은 v2 계획 그대로 | #840·#850 | 남음 |
| 6 | `src/api/order/schema.ts` `CreateOrderRequestSchema`(`z.strictObject`), `src/features/audience/checkout/model/option-form.ts` | 주문 본문에 `hostProvisionAgreed`·`dudoongTicketNoticeConfirmed`·`agreementVersion`을 넣을 수 없다(strict라 스키마 확장 필수). 값을 만들 칸은 design-requests Q42 | #840 | 남음 |
| 7 | `agreementVersion` 상수 | v2는 앱 하나라 상수 하나(`'2026-10'`)로 둔다. v1은 티켓 앱 상수와 어드민 하드코딩 두 곳(Develop 기획서 "두 곳 모두 올린다") | #840 | 남음 |
| 8 | `src/api/__mocks__/auth.handlers.ts`·`order.handlers.ts` | 동의 강제 400 `Agreement_400_1` 시나리오가 없다 | #840 | 남음 |
| 9 | `src/api/__mocks__/respond.ts` `errors.noToken`(L37-38)·주석(L17), `src/api/__mocks__/me.handlers.ts` 주석, 테스트(`http.test.ts`, `auth-handlers.test.ts`, `errors.test.ts`, `auth-wiring.test.tsx`, `auth-outcome.test.ts`, `__mocks__/handlers.test.ts`) | 토큰 없음이 `fail(403, 'AUTH_403_2', …, 401)`이다 → 실제는 HTTP 401 + 본문 401 `AUTH_401_2`. 런타임 분기는 HTTP 상태 기준이라 동작 영향은 없다 | #808 | 남음 |
| 10 | `src/api/auth-handlers.ts` `STALE_ACCESS_CODES`(L29)·재시도 분기(L87), `src/features/shared/auth/model/auth-outcome.ts` `retryLater`(L8·L19) | 재발급·로그인 콜백의 401(낡은 액세스 쿠키)은 #792로 더 이상 오지 않는다. 동작상 무해 — 남길지(방어) 지울지 정한다. 주석의 근거(B6)는 고친다 | #792 | 남음(결정 필요) |
| 11 | `src/api/__mocks__/auth.handlers.ts` 시나리오 `kakaoLinkStaleAccess`·`kakaoExchangeStaleAccess`·`kakaoLoginStaleAccess`·`refreshStaleAccess`·`logoutStaleAccess` | 백엔드에 더는 없는 응답을 흉내 낸다. 대신 "보호 API + 위조 쿠키 → 401 `GLOBAL_401_1` + `accessToken` 삭제 `Set-Cookie`" 시나리오가 없다 | #792·#793 | 남음 |
| 12 | `src/api/__mocks__/respond.ts` `errors.refreshRejected` 주석 | 사유 "다른 기기에서 덮어씀"이 #807로 없어졌다(기기별 세션) | #807 | 남음(주석만) |
| 13 | `src/api/order/schema.ts` `AccountSchema`·`MyRefundAccountSchema`, `src/api/__mocks__/fixtures/order.ts` | 응답 `bankCode`가 없다(z.object라 파싱은 깨지지 않는다) | #804 | 남음 |
| 14 | `src/features/audience/checkout/model/payment.ts` `tossTransferLink`(TODO(B3), `bank: account.bankName.trim()`) | B3 해결 — 토스 은행 값을 `bankCode` 매핑으로 만들고 `bankCode`가 `null`이면 토스 버튼을 숨긴다. 매핑 값은 실기기 확인(P7) | #804 | 남음 |
| 15 | `/api/v2/banks` mock 핸들러 | 없다(P9 환불 계좌·P12 티켓 폼에서 필요) | #804·#813 | 남음 |
| 16 | `public/term.html`·`public/privacy.html` | 개정 전 약관이다(v1 #355 직전 파일과 바이트 동일, 2026-10-25 비교). 2026-10-25 시행 개정본(Front #355, `release/ticket` `fc3278d`)으로 교체. `next.config.ts`의 `/meta/term`·`/meta/privacy` rewrite는 이미 있다 | Front #355 | 남음 |
| 17 | `public/no-poster.png` | v1 운영은 포스터 로드 실패 때 `/no-poster.png`로 바꾼다(Front #348). v2 `public/`에 자산이 없다(참고 — 쓸지는 V, design-requests Q26) | Front #348 | 참고 |
| 18 | `src/api/host/schema.ts` `HostDetailSchema` 주석(L14-17 "공개 필드") | `contacts`가 공개 필드가 아니게 됐다 — 주석 정리 | #846 | 남음(주석만 — A안 작업 `f3dfedd`에서 고치지 않았다) |

`src/api/my-ticket/schema.ts`의 `event` nullable(#789)과 체크인 `result` 5종(#798)은 이미 맞다.

## 2026-10-25 디자인 시스템 변경으로 생긴 코드 수정 거리

디자인 시스템 파일(`0QD9tGSt8ZciDqe7ol2gYH`) 2026-10-25T09:12Z 판과 10-14T17:51Z 판(design-system.md 작성 직전)의 비교([`design-system.md`](./design-system.md) 머리말·§7 "디자인 시스템 반영(2026-10-25)")에서 나온, **이미 구현된 `src/ui`(P1·P2)** 의 수정 목록이다. 이 단계에서는 문서만 고쳤고 코드는 고치지 않았다. 지금 `src/features`·`src/app`은 아래 컴포넌트(Tabs·Fab·Button `tonal`·Chip `concert`)를 쓰지 않는다(2026-10-25 검색) — 화면 영향은 없고 스토리만 바뀐다. "V"는 그 화면의 디자인 단계(plan §0)에서 한다는 뜻이다.

| # | 파일 · 심볼 | 지금 코드 | Figma(2026-10-25) | 상태 |
|---|---|---|---|---|
| 1 | `src/ui/components/Button/Button.css.ts` `size.md`·`compoundVariants`(md `iconOnly` 폭) | 높이 45, 아이콘만 폭 45 | medium 변형이 모두 46h(옛 판은 아이콘형만 46) | 남음 |
| 2 | 같은 파일 `variant.secondary` | Hover·Pressed 모두 `background.grey`(#EEEEED) | Hover #F7F7F6(변수 `120:982`), Pressed #EEEEED(`197:4875`), 테두리는 둘 다 `surface/default-border`. Disabled는 테두리 없음(코드와 같음) | 남음 |
| 3 | 같은 파일 `variant.tonal`(primary 2)·주석 | 글자 `text.brandLabel`(Violet 400), Pressed 배경 `brand.primarySubtle`, Hover 없음 | Normal 글자·아이콘 Violet 300(`424:686` — 코드 `brand.onPrimaryContainer`와 같은 값), Hover 배경 Violet 200 + 글자 Violet 400, Pressed 배경 Violet 300 + 글자 Neutral 50. 새 Normal 대비 2.75:1이라 디자이너 확인 요청을 같이 냈다(design-system §5) | 남음 |
| 4 | `src/ui/components/Fab/Fab.css.ts` | Hover·Pressed가 투명도 0.9·0.8 | round Primary Hover #232220(Neutral 700), Pressed #0A0A09(Neutral 900), Disabled `interaction/disabled-bg`(코드와 같음). 흰 판 `Color=Secondary`(배경 `text/inverse`, Hover #EEEEED, Pressed `surface/default-border`)가 새로 생겼다 — 쓰는 화면이 생기면 변형 추가(V) | 남음 |
| 5 | `src/ui/components/Tabs/Tabs.css.ts` `tab`·주석 | 선택 `brand.primary` 글자·밑줄, 미선택 16 Bold `text.primary` | 선택 글자·밑줄 `text/primary-label`(검정), 미선택 `Label/lg`(16 Regular) `interaction/inactive`. `type=데스크탑`(20px `Heading/md`·`- emphasized`, 선택 48h)은 쓰는 화면이 생기면(V) | 남음 |
| 6 | `src/ui/theme/tokens.css.ts` `chip.ddayText`·`chip.ddayBg`·`chip.pastBg`(라이트·다크), `src/ui/theme/colors.ts`, `src/ui/components/Chip/Chip.css.ts` `tone.dday`·`tone.past` | D-day 글자 Coral-red 200·배경 Coral-red 50, 지난 공연 배경 Neutral 50 | D-day small 배경 `brand/accent-subtle`·글자 `brand/accent`(large는 `status/warning-subtle`·`status/warning`, 라이트 값 같음), 지난 공연 배경 `interaction/disabled-bg`(Neutral 100). 의미 색이 됐으므로 `chip.dday*`·`chip.pastBg` 전용 토큰을 의미 색으로 바꿀 수 있다 | 남음 |
| 7 | `src/ui/components/Chip/Chip.tsx`·`Chip.css.ts` concert `tone`(주석 "dday=…공연 중") | `ONGOING`을 D-day 모양으로 그린다(design-system §3 옛 잠정안) | `ing`(공연중 — 배경 `brand/accent`, 글자 `brand/accent-subtle`)이 생겼다. `size` small(22h, 좌우 10, 모서리 6, `Label/sm`)·large(25h, 좌우 12, 모서리 8, `Label/md`) — large는 공연준비 홈 PC 목록(P10a-V) | 남음(`ing`) · V(large) |
| 8 | `src/ui/icons/svg/`·`registry.ts`(`generate.mjs`로 생성), `src/ui/icons/README.md` 추출 절차 | 44종 58개 | 새 변형 11개 — `edit`·`up`·`diagonal`·`pop out`·`archiving`·`location`·`music`·`log out`·`update`(24 outline), `chevron-left`·`chevron-right` 20. 쓰는 곳: `diagonal`(통계 카드 ↗), `pop out`(사이드바 "공연 페이지 보기"), `edit`(대시보드 머리·`My`), `archiving`·`update`·`log out`(`My`), chevron 20(GUI 사이드바). `Ticket` filled는 세트 밖 낱개 `ic/ticket/filled/24`(`183:1130`)로 옮겨져 세트(`36:178`)만 내보내면 빠진다 — 추출 절차에 낱개를 더한다. `Ticket` → `ticket` 이름 변경은 `FIGMA_NAME_MAP`과 결과 키가 같다 | 남음(P4s·P13a 전) |
| 9 | `src/ui/illustrations/*.png` 6종, `Illustration.tsx` | PNG(벡터가 0.3~6.5MB, 포스터는 8MB 초과라서 — design-system §4-1) | REST SVG 내보내기가 8~75KB로 줄었다(포스터 준비중 40KB, login 60KB 등, design-system §3 일러스트 행). §4-1 "디자이너가 벡터를 단순화하면 SVG로 바꾼다" 조건 — SVG로 바꿀지 정한다. 포스터 준비중의 색 변경(밝은 회색)은 지금 PNG가 이미 같다 | 남음(결정 필요) |
| 10 | `src/ui/illustrations/avatar-*.svg` | 몸통 #131313, 흰 부분 white | 몸통 대부분 #0A0A09(새 변수 `605:1952`), 흰 부분 #F7F7F6(`606:1920`). 채움 36개는 아직 #131313이라 Figma 작업이 끝나지 않았다 | 보류(디자이너 작업 끝난 뒤 재추출) |
| 11 | `src/ui/theme/tokens.css.ts` `shadow` | `drop`(y 4, blur 4, 10%) 하나 | 이펙트 스타일 `drop shadow2`(y 0, blur 9.2, 10%)가 생겼다 — PC 아바타 ▾ 메뉴 `My`가 쓴다 | V(P4s 아바타 메뉴) |
| 12 | `src/ui/theme/breakpoints.ts` | desktop 1024 · wide 1280 | 디자인 시스템에 호스팅 그리드 1133/1280/1440(12칼럼·16·24)과 Tablet 12칼럼이 생겼다. 토큰 나누기는 이미 "P4s 착수 전에 정한다"(design-system §2, Q38) — 이번 변경으로 새로 생긴 일은 없다 | 참고 |

`Header`의 `logo="host"`(`host title`), `Illustration`의 `dashboard-*`(`ic_대시보드` — 색 구성 같음), 텍스트 스타일·`titleNumber`(Saira Condensed)는 바꿀 것이 없다. 대시보드 숫자 폰트는 사용자 결정대로 `titleNumber`가 정본이고 디자이너 확인 중이다(design-requests Q14) — P13a-V에서 그린다.
