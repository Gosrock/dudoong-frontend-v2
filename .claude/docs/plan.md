# DuDoong-Front v2 — 구현 계획

> 기술 결정: [`tech-decisions.md`](./tech-decisions.md) · 백엔드 계약: [`api-contract.md`](./api-contract.md) · 구조: [`directory-structure.md`](./directory-structure.md)
> 2026-10-12 개정. 단일 Next 앱(App Router, vanilla-extract)으로 구조를 바꿨다. v1(`DuDoong-Front`)은 참고용이며 그대로 이어가지 않는다.

## 개요

공연 티켓팅 서비스 FE 전면 재작성. **Next 16 앱 하나**(App Router)에 관객 화면(`(public)`·`(app)`)과 호스팅 센터(`/hosting`)가 같이 있다. 공개·공유 화면은 서버에서 렌더하고 캐시하며, 로그인 뒤 조작 화면은 클라이언트에서 조회한다.

**Phase는 도메인 단위다.** 실제 구현 티켓은 각 Phase 착수 시점에 `phase-N-spec.md`로 쪼갠다(1~5파일 / ~300줄 / 독립 typecheck 통과 단위).

**총 24개 Phase.** P0~P4b 공통 기반, P5a~P9b 관객(Track A), P10a~P13b 호스팅 센터(Track B), P14~P15 수렴. 두 트랙은 `features/audience`와 `features/hosting` 폴더 단위로 병렬 진행한다.

## 1. 이전 계획에서 바뀐 것

| 항목 | 이전 | 지금 |
|---|---|---|
| 계약 | FE가 zod로 C1~C6을 동결하고 백엔드가 수용 | 백엔드 계약이 이미 확정. P3는 Swagger를 zod로 옮기는 작업 |
| 결제 | 토스페이먼츠 SDK v2, `/pay/confirm` 콜백, 멱등 confirm (P7b·P7c) | PG 없음. 계좌송금 체크아웃 한 화면(P7)으로 합침 |
| 쿠폰 | P7a 쿠폰 선택, P9 쿠폰함 | v2 API 없음 — 범위에서 제외 |
| 공연 본문 | HTML 단일 필드 | 섹션 1~10개 + `contentFormat`(HTML/MARKDOWN) |
| Q&A · 지도 · 슬랙 · 제휴 | P5b · P10b에 포함 | API도 화면도 없음 — 범위에서 제외 |
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
P0 ─┬─ P1 ── P2 ─────────────┐
    └─ P3 ───────────────────┼── P4a (게이트) ── P4b
                             │
  Track A (관객)           │
    P5a ─┬─ P5b ── P6 ── P7 ─┼─ P9 ── P9b
         ├─ P5c              │
         └─ P8 ─┬─ P8b       │
                └─ P8c       │
  Track B (호스팅 센터)            │
    P10a ─┬─ P10b            │
          └─ P11 ── P12 ─┬─ P13a
                         └─ P13b
                             │
              전 Phase ── P14 ── P15
```

이 그림은 배치도다. 실제 선행은 각 Phase의 "선행" 줄과 §5 요약표를 따른다.

## 3. 관객과 호스팅 센터가 공유하는 지점

같은 데이터를 반대편에서 다루는 지점이다. `src/api`의 같은 스키마·같은 함수, `features/shared`의 같은 컴포넌트를 쓰는 것으로 관리한다.

| ID | 공유 지점 | 관계 Phase | 관리 수단 |
|---|---|---|---|
| S1 | 티켓·옵션 | P6·P7 ↔ P12 | `ticket-item`·`option` 스키마 공유. `remaining`의 뜻이 화면마다 다르다는 점을 타입 주석에 남긴다 |
| S2 | 금액 계산 | P7 ↔ P12 | `order/price.ts` 순수함수 1개. 체크아웃 총액과 토스 송금 링크 금액이 여기서 나온다 |
| S3 | 공연 상세·섹션 | P5b ↔ P11 | `features/shared/section-viewer`를 미리보기가 재사용 |
| S4 | QR · 체크인 | P8·P8c ↔ P13b | QR 값 = 티켓 uuid. `check-in` 스키마의 `result` enum과 결과 화면 공유 |
| S5 | 주문 · 환불 | P9 ↔ P13a | `order` 스키마 공유. 사용자 상태와 호스트 상태 분류가 다르다 |
| S7 | 알림함 | P9b ↔ P10a | `features/shared/notification` |
| S8 | 호스트 홈 | P5c ↔ P10b | `features/shared/host-home`. 한 화면이 `myRole`로 분기 |

**계약 변경 절차**: 계약의 출처는 Swagger다. 백엔드 변경이 오면 `src/api`만 고치는 별도 PR로 받고, 기능 PR에 스키마 변경을 섞지 않는다.

## 4. Phase 상세

### P0 — 스캐폴딩 · 스파이크 · 의존성 확정

**목표**: 이후 Phase가 밟을 지반이 실제로 작동함을 수직 슬라이스 하나로 증명한다.

**산출물 A — 골격**
- 단일 Next 16 앱(App Router, `output: 'standalone'`, Cache Components는 기본값대로 켬), `src/{app,features,ui,api,utils,env}`, 라우트 그룹 `(public)` / `(app)` / `hosting`
- TS `strict` + `noUncheckedIndexedAccess`, alias `@/*`
- vanilla-extract 연결(`@vanilla-extract/next-plugin`, `unstable_turbopack: { mode: 'auto' }`)
- Dockerfile(멀티 스테이지, `HOSTNAME=127.0.0.1` `PORT=3000`), `/healthz`, `deploymentId`, 이미지 빌드 워크플로(GHCR) — [`deploy-plan.md`](./deploy-plan.md) D1
- 개발용 `rewrites`(`/api` → dev API), PR 게이트(`next typegen` → typecheck · lint · vitest)
- env zod 검증(`env/server.ts` · `env/client.ts`), 구조화 stdout 로그
- ESLint(flat config) + Prettier + husky + lint-staged. 프로젝트 고유 규칙(계층, `ky` 직접 import 금지 등)은 [`tech-decisions.md`](./tech-decisions.md) §24
- Vitest + Testing Library + MSW, Storybook
- `CLAUDE.md`, `.env.example`, PR 템플릿, `public/term.html`·`privacy.html`(v1에서 이전)

**산출물 B — 스파이크**: 설계의 전제는 2026-10-11~12에 돌려 확인했다([`tech-decisions.md`](./tech-decisions.md) §21·§22·§26). 다만 전체 구성(ky + vanilla-extract + `<Prefetch>`)은 Cache Components를 끈 상태로, 켠 상태는 축소 구성으로만 확인했다. P0에서 채운다.
1. **Cache Components를 켠 전체 구성**에서 빌드·개발 서버·`<Prefetch>`·토큰 미전송·실제 카카오 UA의 OG 위치·404가 §26과 같게 나오는지
2. 운영 쿠키 `SameSite=Strict`에서 외부 링크 진입과 카카오 로그인 복귀(스테이징 필요)

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
| 지도 | **없음** — 화면 없음 | — |
| `@use-funnel/browser`, `react-simplikit` | **쓰지 않는다** — 쓰는 곳이 적고 0.x다 | — |
| 날짜·파일 선택·토스트·캐러셀 | v1이 쓰던 것(`react-datepicker`, `react-drag-drop-files`, `react-toastify`, `swiper`)은 React 19에서 문제없다. 라이브러리로 갈지 자체 구현할지만 정한다 | P2, P5a |

**산출물 D — 외부 확인(첫날 착수)**
2. 리다이렉트 표는 tech-decisions §22에 있다. 실제로 유통된 URL이 무엇인지(접근 로그)만 확인한다
3. 백엔드 V001~V011 실행 일정, v1 FE와 병행 운영 가능 여부
4. 리프레시 토큰이 사용자당 하나인 것이 의도인지, 운영의 리프레시 토큰 수명

**선행**: 없음

**완료 기준**
- [ ] `src/ui` 컴포넌트 1개 + `<Prefetch>`로 조회한 쿼리 1개(GE-11)를 `useSuspenseQuery`로 읽는 페이지를 Docker 이미지로 빌드해 서빙
- [ ] 개발 서버에서 `.css.ts` 수정이 브라우저에 새로고침 없이 반영됨
- [ ] 계층 규칙 위반 import가 lint에서 실패
- [ ] 커밋 시 스테이징된 파일에 lint·format이 적용됨
- [ ] env 누락 시 빌드 실패
- [ ] typecheck · lint · test CI 게이트 동작

### P1 — `src/ui` 기반: 토큰 · 프리미티브 · 반응형

**포함**: 토큰(`tokens.css.ts` — color/typography/space/radius/zIndex), 전역 스타일·reset·폰트, sprinkles(조건 `mobile`/`desktop` + 토큰 유틸리티). 프리미티브 `Flex`(`Flex.Center` 등) · `Spacing` · `Text`(typography prop, `as`로 시맨틱 태그만 분리) · `Divider` · `Container` · `Button`(recipes). `useMediaQueries`. 아이콘 파이프라인. Storybook. 루트 `Providers`(QueryClient, `OverlayProvider`).

**선행**: P0 · **병렬**: P3

**완료 기준**
- [ ] 토큰·프리미티브 스토리
- [ ] 화면 코드에서 스타일을 쓰는 세 방법(프리미티브 / `sprinkles()` / `.css.ts`)의 예제 스토리
- [ ] `src/ui` 공개 API에 vanilla-extract 타입 미노출

### P2 — `src/ui` 컴포넌트: 폼 · 오버레이 · 피드백

**포함**: 폼(Input/TextArea/Dropdown/SelectButton/Counter/DropZone/ToggleButton/TagButton/DatePicker/TimePicker). 오버레이(BottomSheet/Modal/Popup, PC=Modal · Mobile=Sheet 분기, 상태는 `overlay-kit`). `EasyOverlay`(async 확인 + 자동 close). 피드백(Toast/Loader/Skeleton/EmptyState). 표시(Accordion/Header/Footer/NavBar/Profile/Tag/ListHeader). `DataTable`.

**선행**: P1 · **병렬**: P3

**완료 기준**
- [ ] 컴포넌트 스토리
- [ ] 바텀시트·모달 iOS Safari 스크롤 락·키보드 회피 스모크
- [ ] RHF `register` 직결 / `Controller` 필요 컴포넌트 표 확정

### P3 — `src/api` 코어 + v2 계약 이식 + mock

**목표**: 백엔드 계약을 FE 타입으로 옮기고, 백엔드 없이도 개발할 수 있게 한다.

**산출물 A — 코어**
- ky 클라이언트(내부): `{success, status, data, timeStamp}`를 벗겨 `data`만 반환, 실패는 `ApiError{status, code, reason}`
- 에러 분기 유틸: HTTP 상태(401/403/404)와 `code`. `getErrorCode(e)`는 절대 throw하지 않는다
- `V2PageResponse` 스키마 팩토리와 페이지 기반 무한 쿼리 헬퍼(`hasNext`)
- 날짜 변환(`yyyy.MM.dd HH:mm` ↔ `Date`, KST 고정)
- `select`/`dependsOn` 헬퍼, queryKey 컨벤션, `staleTime` 기본값
- 엑셀 응답(래퍼 없는 blob) 호출 경로
- `api` 객체(`get` / `post` / `patch` / `put` / `delete` / `download`): 호출 + 응답 래퍼 해제 + zod 파싱
- `src/api/server/`: `serverQuery`(요청별 QueryClient, 404 → `notFound()`), `<Prefetch>`

**산출물 B — 도메인 슬라이스**: [`api-contract.md`](./api-contract.md) §5의 82개를 도메인별 `schema.ts` · `queries.ts`로 옮긴다. P3는 코어와 **공개 GET 10개 + 세션**까지, 나머지는 각 기능 Phase가 채운다.

**산출물 C — mock**: MSW 핸들러. 에러 응답도 실제 형식(`code` 포함).

**산출물 D — 금액 계산**: `order/price.ts` 순수함수(단가 × 수량 + 옵션 추가금).

**선행**: P0 · **병렬**: P1/P2 · **API 의존**: Swagger 접근(로그인 필요)

**완료 기준**
- [ ] 응답 래퍼·에러·페이지·날짜 유틸 단위 테스트
- [ ] 공개 GET 10개 스키마가 dev 서버 실제 응답을 파싱
- [ ] MSW로 백엔드 없이 기동
- [ ] 금액 계산 경계값(0원, 옵션 가산, 수량 상한)
- [ ] 서버에서 도는 조회에 토큰이 붙지 않음

### P4a — 세션 · 401 처리 (게이트)

**포함**: 세션 쿼리(GM-1). 401 정책 — `AUTH_401_1`은 재발급 후 재시도(동시 요청은 재발급 1회로 묶음), `GLOBAL_401_1`·재발급 실패는 `/login/expired`. **공개 화면에서 401이 오면 토큰 없이 재요청.** 보호 화면의 로그인 게이트(레이아웃이 세션 쿼리를 보고 401이면 `/login?redirect=…` — 서버에서 쿠키로 막지 않는다, tech-decisions §25). `redirect` 파라미터 검증(같은 origin 상대 경로만). mock 세션 3상태(로그인 · 비로그인 · 만료).

**선행**: P1, P3

**완료 기준**
- [ ] mock 3상태에서 보호 화면·공개 화면 진입이 설계대로 분기
- [ ] 동시 401 N건에서 재발급 1회
- [ ] 공개 GET + 만료 토큰 → 익명 재요청
- [ ] 보호 화면에 비로그인으로 들어오면 로그인으로 이동하고, 로그인 뒤 원래 화면으로 돌아옴

### P4b — 인증 실구현: OAuth · 재발급 · 로그인 화면

**포함**: v1 카카오 OAuth 연동(흐름과 요청·응답은 [`api-contract.md`](./api-contract.md) §9), 재발급(`POST /api/v1/auth/token/refresh`), 로그아웃, 로그인·콜백 화면(1벌), 회원가입 오버레이. 토큰은 JS로 읽지 않고 쿠키 자동 전송에 맡긴다. refresh는 본문·쿠키로, 카카오 토큰은 본문으로, `state` 전달.

**선행**: P4a

**완료 기준**
- [ ] 카카오 OAuth 신규/기존 분기
- [ ] 만료 상태에서 보호 화면 진입 시 재발급 후 화면이 정상 렌더
- [ ] 정지·탈퇴 계정 토큰(익명 처리) 시 로그인 화면으로 수렴
- [ ] 오픈 리다이렉트 차단
- [ ] 스테이징에서 카카오 로그인 복귀 직후 로그인 상태가 유지됨(`SameSite` 확인)

### P5a — 관객 셸 + 공연홈 + 공연 리스트

**포함**: `(public)`·`(app)` 레이아웃, GlobalNav(햄버거, 로그인/비로그인), `not-found`·`error`. **공연홈 `/`**(GP-1: 배너 · 캐러셀 · 두둥 소개, `<Prefetch>`). **공연 리스트 `/events`**(GP-2 + GE-11: 검색, 태그 필터 드롭다운 1개·4분류, 지난공연 토글, 무한 스크롤).

**선행**: P2, P4a · **API**: GP-1 GP-2 GE-11

**완료 기준**
- [ ] 공연홈이 서버에서 렌더되고 토큰 없이 조회됨
- [ ] 태그 필터·검색어가 URL에 반영되고 새로고침·뒤로가기에서 복구
- [ ] 하이드레이션 경고 0

### P5b — 공연 상세 + 섹션 뷰어 + 공유

**포함**: `/events/[eventId]` — 라우트 파일이 `<Prefetch>`로 GP-3 + GE-5를 조회(`instant = false`, 서버 캐시 없음), `generateMetadata`로 OG. 화면은 클라이언트 컴포넌트. **섹션 탭**(서버 섹션이 없으면 기본 4탭을 프론트가 그림), **섹션 뷰어**(`contentFormat`으로 HTML/마크다운 렌더러 선택 + sanitize, `features/shared`), 해시태그, 호스트 연락처 시트, 카카오 공유. 크롤러 계약 스크립트.

**선행**: P5a · **API**: GP-3 GE-5

**핵심 리스크**
1. 이 라우트 위에 `<Suspense>`나 `loading.tsx`가 있으면 `notFound()`가 200으로 나간다 — `(public)` 그룹에 둔다
2. 5xx는 throw해서 `error.tsx`로 보낸다
3. 요청마다 백엔드를 부른다. 티켓 오픈 때 부하가 문제 되면 이 조회에만 캐시를 붙인다(tech-decisions §2)

**완료 기준**
- [ ] **실제 카카오 UA**(`facebookexternalhit/1.1; kakaotalk-scrap/1.0; …`)로 요청 → OG가 `<head>`에 있음(스크립트)
- [ ] 카카오 공유 디버거에서 미리보기 확인
- [ ] 없는·준비중 공연이 크롤러 UA에 404, 브라우저에는 not-found 화면
- [ ] v1 실데이터 본문 샘플(MARKDOWN·HTML)이 뷰어에서 정상 렌더 + XSS 페이로드 차단
- [ ] 응답 HTML에 재고 값 없음

### P5c — 호스트 홈(공개) · 관심 호스트

**포함**: 호스트 홈 `/hosts/[hostId]`(GH-3 + GH-14) — 호스트 정보, 연락처, 공연 리스트는 `<Prefetch>`로 조회. `myRole`·`isFollowing`은 브라우저가 같은 쿼리를 쿠키와 함께 다시 조회해 관심(♡) PH-13과 관리 버튼(설정·멤버·새 공연)을 그린다. `features/shared/host-home`(S8).

**선행**: P5a · **API**: GH-3 GH-14 PH-13

**완료 기준**
- [ ] 비로그인·관객·일반 멤버·매니저·마스터 시점 렌더
- [ ] 서버 조회에 토큰이 붙지 않음
- [ ] ♡ 연타에도 상태 일치(같은 요청 재전송 200)

### P6 — 티켓 선택

**포함**: 공연 상세 안의 티켓 선택(GP-5). 티켓 종류 선택 → 인라인 수량 스테퍼. 잔여·매진·구매 가능 표시(`remaining`·`isSoldOut`·`isPurchasable`), 1주문 1종류 안내. 서버에서 조회하지 않고 브라우저에서 `staleTime:0`.

**선행**: P5b · **API**: GP-5

**완료 기준**
- [ ] 매진·판매 불가·PAST 공연 분기 렌더
- [ ] 수량 상한 = `purchaseLimit`(없으면 잔여)

### P7 — 체크아웃 · 주문 생성

**목표**: 금전 경로. 한 화면에서 옵션 입력 → 결제 정보 확인 → 결제 방식 → 환불 규정 동의 → 주문 생성까지 닫는다.

**포함**: G11/O-0(티켓 + 계좌). 옵션 응답 폼(모든 티켓 동일 / 티켓별, 옵션 없으면 폼 생략). 금액(`order/price.ts`). 결제 방식(직접 계좌이체 · 토스 송금) — 계좌 복사, **토스 송금 링크 생성**. 입금자명(닉네임 고정 표시). "입금하셨나요?" 확인 모달 → P11/O-1. 무료는 [신청]. 주문 완료 화면. 3분기(입금형 · 무료 승인형 · 무료 선착순).

**선행**: P6, P4b(통합 검증 시) · **API**: G11/O-0 P11/O-1

**핵심 리스크**: 화면 총액과 토스 송금 금액이 서버 `totalAmount`와 어긋나면 입금 금액 오류로 거절된다. 모달 중복 제출(10초 내 같은 요청은 서버가 앞 주문을 돌려준다).

**완료 기준**
- [ ] 옵션 2모드 제출 본문이 스키마 검증 통과(`applyToAll` / `perTicketOptions`)
- [ ] 클라이언트 계산 총액 == 주문 응답 `totalAmount`(계약 테스트)
- [ ] 3분기 각각 주문 생성 직후 상태가 맞음
- [ ] 에러 분기: `Order_400_15`, `Ticket_Item_400_1`, `Ticket_Item_400_10`, `Order_400_26`
- [ ] **agent-browser로 크리티컬 패스 검증**: 상세 → 선택 → 체크아웃 → 주문 → 호스트 승인(호스팅 센터) → 티켓 발급

### P8 — 티켓탭 · 입장 QR

**포함**: 티켓탭(G11/T-1 묶음 목록 + G11/T-3 공지 바), 카드 스와이프(N/M 페이저), 티켓 상세·입장 QR(G11/T-2, `qrValue`를 `qr-code-styling`으로 렌더), QR 전체화면. 티켓 `state` 11값 표시. 승인 대기·거절 주문(티켓 없이 주문만)도 목록에 나온다.

**선행**: P4a, P5a · **API**: G11/T-1 G11/T-2 G11/T-3

**완료 기준**
- [ ] `state` 11값 렌더
- [ ] 받은 티켓 묶음(`orderUuid=null`)에 [주문상세]가 없음
- [ ] 선물 대기·취소 티켓은 QR 대신 안내
- [ ] 옛 uuid로 404가 오면 티켓탭을 다시 읽음

### P8b — 선물하기

**포함**: 보내기(티켓탭 위 바텀시트 → PG-1 → 링크 생성 완료 · 공유 · 메모 PG-8), 회수(DG-2), **공개 랜딩 `/gifts/[giftToken]`**(GG-3, `viewState` 7종), 수락(PG-4) · 거절(PG-5), 반환(PG-6), 보낸/받은 내역(GG-7), 보낸 사람의 "선물 완료" 상세(GG-7a).

**선행**: P8, P4b · **API**: PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7 GG-7a

**핵심 리스크**: 비로그인 → 로그인 → 복귀 후 **명시적 수락**. 수락·반환 뒤 uuid가 바뀌므로 캐시된 티켓 쿼리를 전부 무효화한다.

**완료 기준**
- [ ] `viewState` 7종 화면
- [ ] 미가입 수신자가 링크 → 가입 → 수락까지 완주(agent-browser)
- [ ] `Gift_400_3`(이미 처리됨) 시 랜딩을 다시 읽어 상태 화면으로
- [ ] 랜딩 OG에 개인정보 없음(보낸 사람 닉네임은 서버가 가려서 준다)

### P8c — 관객 셀프 체크인

**포함**: `/check-in?token=…` — 로그인 게이트 후 PQ-5. 1장이면 바로 입장, 여러 장이면 `SELECT_TICKET` → 후보 선택 → 재요청. `result`별 화면.

**선행**: P8, P4b · **API**: PQ-5

**완료 기준**
- [ ] 비로그인 → 로그인 → 같은 URL 복귀
- [ ] `result` 분기 전부 렌더, `Event_400_26`(잘못된 토큰) 안내

### P9 — 마이페이지

**포함**: 햄버거 · 프로필(GM-1, PM-2, PM-3), 주문내역(G11/O-2), 주문상세(G11/O-3), 주문 취소(P11/O-4, 유료는 환불 계좌 시트), 환불 계좌 입력·수정(P11/O-5), 관심 호스트(GM-4), 관람 공연 아카이빙(GM-5, 연도 탭), 로그아웃 · 회원 탈퇴(v1).

**선행**: P7(주문 도메인), P4b · **API**: GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 GM-5

**완료 기준**
- [ ] 주문 상태 5종 + `refundStatus` 조합이 목록·상세에서 일관
- [ ] 취소 버튼은 `canCancel`, 환불 계좌 입구는 `canEditRefundAccount`로만 노출
- [ ] 탈퇴 `USER_400_6` 안내
- [ ] 아카이빙에서 `orderUuid=null`이면 주문상세로 이동하지 않음

### P9b — 알림센터

**포함**: 벨 빨간 점(GN-2), 알림함(GN-1 무한 스크롤), 읽음(PN-3 단건·전체), 알림 탭 시 `target`으로 이동. 15종 타입 → 카테고리·아이콘 매핑.

**선행**: P4a, P9 · **API**: GN-1 GN-2 PN-3

**완료 기준**
- [ ] 15종 타입 렌더(모르는 타입이 와도 깨지지 않음)
- [ ] 읽음 후 `unreadCount`로 벨 갱신
- [ ] 승인 알림을 읽으면 티켓탭 공지 바 해제

### P10a — 호스팅 센터 셸 + 공연준비 홈 + 호스트 생성 + 이미지 업로드

**포함**: `hosting/layout.tsx`(헤더, 알림 벨 — 누르면 `/mypage/notifications`, S7), **공연준비 홈**(호스트 탭 GH-1 / 공연 탭 GE-1, 검색, 빈 상태), **호스트 만들기**(PH-2), **이미지 업로드**(발급 → S3 PUT → key 저장, 3종 공통. 분당 30회 제한 대응). `/admin/*` → `/hosting/*` 리다이렉트.

**선행**: P2, P4a · **API**: GH-1 GE-1 PH-2 PH-15 GN-*

**완료 기준**
- [ ] 호스트 생성 → 목록 반영
- [ ] 카드에 호스트별 `myRole` 배지
- [ ] 이미지 업로드가 발급 → S3 → 표시까지 동작
- [ ] 호스팅 센터 화면이 서버에서 데이터를 조회하지 않음(셸만 렌더)
- [ ] 호스팅 센터용 쿼리 기본값(`staleTime` 등) 확정

### P10b — 호스트 홈 · 설정 · 멤버

**포함**: 호스트 설정(PH-4: 이름·소개·연락처·이미지), 멤버 목록(GH-6), 멤버 초대(PH-7, 복수·즉시 추가), 역할 변경(PH-10), 삭제(DH-11), 마스터 양도(PH-12), 권한 가이드 표. 호스트 홈 화면 자체는 P5c.

**선행**: P10a, P5c · **API**: PH-4 GH-6 PH-7 PH-10 DH-11 PH-12

**완료 기준**
- [ ] 마스터·매니저·일반 3시점에서 버튼 노출이 권한표와 일치
- [ ] 매니저 화면의 초대 역할 선택지는 "일반" 고정
- [ ] 초대 실패 시 사유의 이메일을 해당 줄에 표시(`HOST_400_13`·`14`·`15`)
- [ ] 변경 응답(멤버 전체 목록)으로 화면을 다시 그림

### P11 — 공연 생성 · 체크리스트 · 기본 정보 · 섹션 편집 · 등록

**포함**: 간편 공연 만들기 2단계(호스트 선택 → 공연 만들기, PE-2, `?step=` + 지역 상태). 공연 스코프 레이아웃(GE-3, 사이드메뉴는 등록 상태에 따라 항목이 다름). 대시보드 — 준비중은 체크리스트(GE-7) + [공연 등록하기](PE-8, 확인 팝업). 기본 정보(PE-4: 포스터·이름·일정·장소·문의처·태그·티켓 여부). 상세 정보(GE-5/PE-6: 섹션 탭 편집, **Tiptap**, 본문 이미지 PE-10 `SECTION`). 미리보기(`section-viewer` 재사용). 삭제(DE-9). 미저장 이탈 경고.

**선행**: P10a, P5b(섹션 뷰어) · **API**: PE-2 GE-3 PE-4 PE-10 GE-11 GE-5 PE-6 GE-7 PE-8 DE-9

**완료 기준**
- [ ] 만들기 → 기본 정보 → 섹션 → 등록까지 완주
- [ ] 등록 후 `hasTicket` 토글 잠금, 정산중·지난 공연은 읽기 전용
- [ ] 장소 수정 시 `detailAddress`를 함께 보냄
- [ ] 섹션 저장은 전체 교체(빠진 섹션 삭제)임을 UI가 반영
- [ ] 일반 멤버는 읽기 전용 화면
- [ ] 저장·등록 뒤 공연 상세를 열면 바로 반영돼 있음

### P12 — 티켓 · 옵션 관리

**포함**: 티켓 관리 목록(G10/T-1), 티켓 폼(P10/T-2 생성 · P10/T-3 수정 — 계좌의 은행은 목록에서 고르게 해 토스 송금 링크에 쓸 수 있는 값으로 고정), ⋮ 메뉴(수정·삭제·판매 중단·재개), 옵션 추가 모달(기존 옵션 재사용 / 직접 만들기 P10/O-2), 옵션 상세·수정·삭제, 티켓에 옵션 붙이기·떼기(P10/O-5). 옵션 가이드·관리자 승인 가이드 팝오버.

**선행**: P11 · **API**: 10/T-1~T-6, 10/O-1~O-5

**완료 기준**
- [ ] 두둥·무료 티켓 생성·수정·삭제
- [ ] 무제한 선택 시 재고 공개 토글이 꺼지고 비활성
- [ ] 수정 본문은 바뀐 필드만 + 비울 때 `clear[]`
- [ ] 잠긴 티켓은 허용 필드만 활성, ⋮ 메뉴는 `isSold || hasPendingOrders`로 구성
- [ ] 새 옵션은 생성 + 지정 2회 호출이 한 동작으로 묶임(중간 실패 처리 포함)

### P13a — 예매자 관리 · 등록 후 대시보드

**포함**: 등록 후 대시보드(GD-1, 승인 대기 NEW 배지). 예매자 관리 — 주문 탭(GR-1 상태 탭·검색, 승인 PR-3, 거절 PR-4 사유 시트, 주문 상세 GR-2, 승인 후 취소 PR-5, 엑셀 GR-6), 발급된 티켓 탭(GI-1, 상세 GI-2, 엑셀 GI-3), 환불(GF-1, 환불 완료 PF-2).

**선행**: P12, P4b · **API**: GD-1 GR-1~6 GF-1 PF-2 GI-1~3

**완료 기준**
- [ ] 승인 실패 시 에러 안내 후 주문이 승인 대기로 남음을 표시
- [ ] 공연 시작 후 승인·거절 버튼 비활성
- [ ] 환불 계좌는 매니저 이상에게만, `updatedAt` 표시
- [ ] 탭이 `?tab=`에 남아 새로고침해도 유지되고, `?order={orderUuid}`로 들어오면 주문 상세가 열림
- [ ] 엑셀 다운로드(래퍼 없는 xlsx) 동작, 1만 행 초과 안내
- [ ] 발급 티켓에 `ownerName`·`giftState` 표시

### P13b — QR 체크인

**포함**: 체크인 통계(GQ-1), [호스트가 스캔] 모드(카메라 → PQ-2, `result`별 화면), [관객이 스캔] 모드(GQ-4 → `origin + qrPath`를 QR로 표시), 전체화면. 카메라 권한 거부·스캔 실패 UI. 연속 스캔 스로틀.

**선행**: P12, P4b. 실판독은 P8·P8c와 교차 · **API**: GQ-1 PQ-2 GQ-4

**완료 기준**
- [ ] 실기기 3종 이상에서 판독
- [ ] `result` 5종 화면
- [ ] 준비중·지난 공연(`Event_400_27`) 안내
- [ ] 네트워크 차단 시 명확한 실패 UI

### P14 — 통합 하드닝

**포함**: 성능(LCP/TTFB/번들, 티켓 오픈 시 공연 상세의 백엔드 부하 — 캐시가 필요한지 여기서 판단), 보안(오픈 리다이렉트, 토큰 취급, 로그 PII, 선물 토큰·QR 유출 경로), 접근성, 회귀(공유 지점(S1~S8) 통합 시나리오), 부하(티켓 오픈 순간), 레거시 URL.

**선행**: 전 기능 Phase

### P15 — 컷오버 & 롤백

**포함**: URL 연속성(기존 공유 링크, 없어진 라우트와 `/admin/*` 301). Deploy 저장소 변경(tech-decisions §25): compose에서 `admin` 서비스 삭제·`front` 이미지 교체, nginx `location /admin/` 삭제. 컷오버 순서(스테이징 → 운영. 호스팅 센터만 먼저 열려면 nginx에 `/hosting` 분기를 임시로 추가), 프리즈 윈도우(진행 중·임박 공연 없는 시간대), 롤백(compose의 이미지 태그와 nginx 설정을 되돌림), 리허설. 데이터는 v1·v2가 같은 테이블을 쓰므로 FE 이관 대상이 아니다 — 백엔드 V001~V011 실행과 순서만 맞춘다.

**선행**: P14

## 5. Phase 요약

| # | 제목 | 트랙 | 선행 |
|---|---|---|---|
| P0 | 스캐폴딩 · 스파이크 · 의존성 확정 | 공통 | — |
| P1 | ui 토큰 · 프리미티브 · 반응형 | 공통 | P0 |
| P2 | ui 폼 · 오버레이 · 피드백 | 공통 | P1 |
| P3 | api 코어 + v2 계약 이식 + mock | 공통 | P0 |
| P4a | 세션 · 401 처리 | 공통 | P1, P3 |
| P4b | 인증 실구현 | 공통 | P4a |
| P5a | 관객 셸 + 공연홈 + 리스트 | 관객 | P2, P4a |
| P5b | 공연 상세 + 섹션 뷰어 + 공유 | 관객 | P5a |
| P5c | 호스트 홈 · 관심 호스트 | 관객 | P5a |
| P6 | 티켓 선택 | 관객 | P5b |
| P7 | 체크아웃 · 주문 생성 | 관객 | P6, P4b |
| P8 | 티켓탭 · 입장 QR | 관객 | P4a, P5a |
| P8b | 선물하기 | 관객 | P8, P4b |
| P8c | 관객 셀프 체크인 | 관객 | P8, P4b |
| P9 | 마이페이지 | 관객 | P7, P4b |
| P9b | 알림센터 | 관객 | P4a, P9 |
| P10a | 호스팅 센터 셸 + 공연준비 홈 + 호스트 생성 + 업로드 | 호스팅 | P2, P4a |
| P10b | 호스트 설정 · 멤버 | 호스팅 | P10a, P5c |
| P11 | 공연 생성 · 체크리스트 · 정보 · 섹션 · 등록 | 호스팅 | P10a, P5b |
| P12 | 티켓 · 옵션 관리 | 호스팅 | P11 |
| P13a | 예매자 관리 · 대시보드 | 호스팅 | P12, P4b |
| P13b | QR 체크인 | 호스팅 | P12, P4b |
| P14 | 통합 하드닝 | 공통 | 전 기능 Phase |
| P15 | 컷오버 & 롤백 | 공통 | P14 |

## 6. API → Phase 배정

| Phase | API |
|---|---|
| P3 | 공개 GET 10개 스키마(스모크), 세션(GM-1) |
| P5a | GP-1 GP-2 GE-11 |
| P5b | GP-3 GE-5 |
| P5c | GH-3 GH-14 PH-13 |
| P6 | GP-5 |
| P7 | G11/O-0 P11/O-1 |
| P8 | G11/T-1 G11/T-2 G11/T-3 |
| P8b | PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7 GG-7a |
| P8c | PQ-5 |
| P9 | GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 GM-5 |
| P9b · P10a | GN-1 GN-2 PN-3 |
| P10a | GH-1 GE-1 PH-2 PH-15 |
| P10b | PH-4 GH-6 PH-7 PH-10 DH-11 PH-12 |
| P11 | PE-2 GE-3 PE-4 PE-6 GE-7 PE-8 DE-9 PE-10 (+ GE-5 GE-11) |
| P12 | G10/T-1 P10/T-2~T-6 G10/O-1 P10/O-2~O-5 |
| P13a | GD-1 GR-1~GR-6 GF-1 PF-2 GI-1~GI-3 |
| P13b | GQ-1 PQ-2 GQ-4 |

## 7. 미확정 항목

다음 라운드에서 채운다. 목록은 [`README.md`](./README.md) 참조.
