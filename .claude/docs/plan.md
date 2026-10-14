# DuDoong-Front v2 — 구현 계획

> 기술 결정: [`tech-decisions.md`](./tech-decisions.md) · 백엔드 계약: [`api-contract.md`](./api-contract.md) · 구조: [`directory-structure.md`](./directory-structure.md)
> 2026-10-12 개정. 단일 Next 앱(App Router, vanilla-extract)으로 구조를 바꿨다. v1(`DuDoong-Front`)은 참고용이며 그대로 이어가지 않는다.

## 개요

공연 티켓팅 서비스 FE 전면 재작성. **Next 16 앱 하나**(App Router)에 관객 화면(`(public)`·`(app)`)과 호스팅 센터(`/hosting`)가 같이 있다. 공개·공유 화면은 요청마다 서버에서 조회해 렌더하고(서버 캐시 없음), 로그인 뒤 조작 화면은 클라이언트에서 조회한다.

**Phase는 도메인 단위다.** 실제 구현 티켓은 각 Phase 착수 시점에 `phase-N-spec.md`로 쪼갠다(1~5파일 / ~300줄 / 독립 typecheck 통과 단위).

**총 24개 Phase.** P0~P4b 공통 기반, P5a~P9b 관객(Track A), P10a~P13b 호스팅 센터(Track B), P14~P15 수렴. 두 트랙은 `features/audience`와 `features/hosting` 폴더 단위로 병렬 진행한다.

## 1. 이전 계획에서 바뀐 것

| 항목 | 이전 | 지금 |
|---|---|---|
| 계약 | FE가 zod로 C1~C6을 동결하고 백엔드가 수용 | 백엔드 계약이 이미 확정. P3는 Swagger를 zod로 옮기는 작업 |
| 결제 | 토스페이먼츠 SDK v2, `/pay/confirm` 콜백, 멱등 confirm (P7b·P7c) | PG 없음. 계좌송금 체크아웃 한 화면(P7)으로 합침 |
| 쿠폰 | P7a 쿠폰 선택, P9 쿠폰함 | v2 API 없음 — 범위에서 제외 |
| 공연 본문 | HTML 단일 필드 | 섹션 1~10개 + `contentFormat`(HTML/MARKDOWN) |
| Q&A · 슬랙 · 제휴 | P5b · P10b에 포함 | API도 화면도 없음 — 범위에서 제외 |
| 지도 | P5b · P11에 포함 | 관객 공연 상세의 지도 위젯은 제외. 호스팅 기본 정보의 주소 검색 → 좌표 변환은 P11에 남는다(서버가 좌표를 필수로 받는다) |
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
| S7 | 알림 벨 · 알림함 | P9b ↔ P10a | `features/shared/notification`. 벨(GN-2)은 먼저 착수한 Phase가 만들고 알림함 화면(`/mypage/notifications`)은 P9b |
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
3. 상태 코드 표 — {Suspense 있음 / 없음} × {카카오 UA / 브라우저 UA} × {없는 공연 / 백엔드 5xx}. 켠 구성에서 크롤러 404가 Suspense와 무관하면 `(public)`/`(app)`을 나눈 이유가 사라지므로 그룹 구조를 다시 본다. 5xx에서 크롤러에 200 + 에러 화면이 나가는지도 본다(카카오가 잘못된 미리보기를 캐시한다)
4. 프리페치 없는 `useSuspenseQuery` 페이지(`/tickets` 형태, `/hosting/events/[id]/…` 형태)를 열었을 때 Next 서버발 백엔드 호출이 0건인지(백엔드 접근 로그)
5. `instant = false` 라우트로 가는 `<Link>`의 프리페치가 백엔드 조회를 일으키는지(공연홈 카드 수만큼 호출이 늘어나는지)
6. `isomorphic-dompurify`(jsdom)를 포함한 standalone 기동과 섹션 10개짜리 공연 상세를 연속으로 열 때의 메모리

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
| 주소 검색 · 좌표 | Daum 우편번호 서비스(주소 검색) + 카카오맵 JS SDK `services.Geocoder`(주소 → 위도·경도). v1도 Geocoder를 썼다. 지도 위젯은 그리지 않는다 | P11 |
| `@use-funnel/browser`, `react-simplikit` | **쓰지 않는다** — 쓰는 곳이 적고 0.x다 | — |
| 날짜·파일 선택·토스트·캐러셀 | v1이 쓰던 것(`react-datepicker`, `react-drag-drop-files`, `react-toastify`, `swiper`)은 React 19에서 문제없다. 라이브러리로 갈지 자체 구현할지만 정한다 | P2, P5a |

**산출물 D — 외부 확인(첫날 착수)**
2. 리다이렉트 표는 tech-decisions §22에 있다. 실제로 유통된 URL이 무엇인지(접근 로그)만 확인한다
3. 백엔드 V001~V011 실행 일정, v1 FE와 병행 운영 가능 여부
4. 리프레시 토큰이 사용자당 하나인 것이 의도인지, 운영의 리프레시 토큰 수명
5. 카카오 개발자 콘솔 — 카카오맵·로컬 API 사용 설정, JS 키에 운영·스테이징·`localhost:3000` 도메인 등록

**선행**: 없음

**완료 기준**
- [ ] `src/ui` 컴포넌트 1개 + `<Prefetch>`로 조회한 쿼리 1개(GE-11)를 `useSuspenseQuery`로 읽는 페이지를 Docker 이미지로 빌드해 서빙
- [ ] 개발 서버에서 `.css.ts` 수정이 브라우저에 새로고침 없이 반영됨
- [ ] 계층 규칙 위반 import가 lint에서 실패
- [ ] 커밋 시 스테이징된 파일에 lint·format이 적용됨
- [ ] 공개 env 누락 시 빌드 실패, 서버 env 누락 시 기동 실패
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
- queryKey 컨벤션, QueryClient 기본값(`retry`·`staleTime`). 의존값이 없으면 `skipToken`/`enabled`, 파생 값은 호출부의 `select` 옵션 — 별도 헬퍼를 두지 않는다
- 엑셀 응답(래퍼 없는 blob) 호출 경로
- `api` 객체(`get` / `post` / `patch` / `put` / `delete` / `download`): 호출 + 응답 래퍼 해제 + zod 파싱
- `src/api/server/`: `serverQuery`(요청별 QueryClient, 404 → `notFound()`), `<Prefetch>`
- v1 인증 호출(`/api/v1/auth/…`)은 v2 `api`와 기준 경로가 달라 따로 둔다
- **이미지 업로드 모듈**: 업로드 URL 발급(PH-15 · PE-10 · PM-3) → S3 PUT → `key` 반환. presigned URL 3분 유효, 분당 30회 제한 안내. P9 · P10b · P11이 쓰기만 한다

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
- [ ] 업로드 모듈이 MSW에서 발급 → PUT → `key` 반환까지 동작

### P4a — 세션 · 401 처리 (게이트)

**포함**: 세션 쿼리(GM-1). 401 처리 규칙은 [`tech-decisions.md`](./tech-decisions.md) §4 인증의 표를 따른다 — 보호 요청의 401은 재발급을 한 번 시도한 뒤 원 요청을 재시도한다(탭 안에서는 재발급 1회로 묶고, 탭 사이는 `navigator.locks`로 직렬화). **세션 쿼리의 최종 401은 throw하지 않고 익명(`null`)으로 끝난다. 이동은 `api`가 아니라 게이트만 한다.** 공개 GET의 401은 토큰 없이 한 번 재요청한다. 보호 화면의 로그인 게이트 골격 `(app)/(protected)/layout.tsx` — 세션이 확정된 뒤에만 `children`을 렌더하고, 익명이면 `/login?redirect=…`(서버에서 쿠키로 막지 않는다, tech-decisions §25). `/login/expired`는 직전에 세션이 있었던 경우에만. 세션이 있다가 없어지거나 로그아웃하면 `queryClient.clear()` 후 하드 이동. `redirect` 파라미터 검증(같은 origin 상대 경로만). mock 세션 3상태(로그인 · 비로그인 · 만료).

**선행**: P1, P3

**완료 기준**
- [ ] mock 3상태에서 더미 보호 라우트와 공개 화면 진입이 설계대로 분기(비로그인 → `/login?redirect=…`, `redirect` 검증 통과)
- [ ] 비로그인 방문자가 공개 화면에서 세션 401을 받아도 이동하지 않음
- [ ] 게이트가 세션 확정 전에 보호 화면의 쿼리를 내보내지 않음
- [ ] 동시 401 N건에서 재발급 1회, 두 탭이 동시에 만료돼도 로그인이 유지됨
- [ ] 공개 GET + 만료 토큰 → 익명 재요청
- [ ] 로그아웃 뒤 이전 사용자의 쿼리 캐시가 보이지 않음

### P4b — 인증 실구현: OAuth · 재발급 · 로그인 화면

**포함**: v1 카카오 OAuth 연동(흐름과 요청·응답은 [`api-contract.md`](./api-contract.md) §9), 재발급(`POST /api/v1/auth/token/refresh`), 로그아웃, 로그인·콜백 화면(1벌), 회원가입 오버레이. 토큰은 JS로 읽지 않고 쿠키 자동 전송에 맡긴다. refresh는 본문·쿠키로, 카카오 토큰은 본문으로, `state` 전달.

**선행**: P4a

**완료 기준**
- [ ] 카카오 OAuth 신규/기존 분기
- [ ] 보호 화면에 비로그인으로 들어와 로그인하면 원래 화면으로 돌아옴
- [ ] 만료 상태에서 보호 화면 진입 시 재발급 후 화면이 정상 렌더
- [ ] 정지·탈퇴 계정 토큰(익명 처리) 시 로그인 화면으로 수렴
- [ ] 오픈 리다이렉트 차단
- [ ] 스테이징에서 카카오 로그인 복귀 직후 로그인 상태가 유지됨(`SameSite` 확인)

### P5a — 관객 셸 + 공연홈 + 공연 리스트

**포함**: 관객 레이아웃(헤더 · GlobalNav), `not-found`·`error`. 클라이언트 조회 화면용 공용 404 · 403 안내 컴포넌트(서버 조회 화면은 `notFound()`). 링크 이동 진행 표시(`(public)`에는 `loading.tsx`가 없어 누른 뒤 응답까지 화면이 그대로다). **햄버거**(Figma 454:556) — 로그인/비로그인, 소속 호스트 아바타 줄(GM-1 `hosts` 최대 10 + `hostCount`, 없으면 "아직 두둥에서 호스트가 없어요.", 더 있으면 공연준비 홈으로), 바로가기 "빠른 공연 만들기"(`/hosting/new/events`) · "빠른 호스트 만들기"(`/hosting/new/hosts`). **공연홈 `/`**(GP-1: 배너 · 캐러셀 · 두둥 소개, `<Prefetch>`). **공연 리스트 `/events`**(GP-2 + GE-11: 검색, 태그 필터 드롭다운 1개·4분류, 지난공연 토글, 무한 스크롤. 정렬은 "공연임박순" 고정 라벨 — 서버 정렬이 `UPCOMING` 하나라 드롭다운을 만들지 않는다).

**선행**: P2, P4a · **API**: GP-1 GP-2 GE-11 (+ GM-1)

**완료 기준**
- [ ] 공연홈이 서버에서 렌더되고 토큰 없이 조회됨
- [ ] 태그 필터·검색어가 URL에 반영되고 새로고침·뒤로가기에서 복구
- [ ] 하이드레이션 경고 0
- [ ] 햄버거의 호스트 줄이 0개 · 10개 이하 · 10개 초과(`hostCount`)에서 맞게 그려짐

### P5b — 공연 상세 + 섹션 뷰어 + 공유

**포함**: `/events/[eventId]` — 라우트 파일이 `<Prefetch>`로 GP-3 + GE-5를 조회(`instant = false`, 서버 캐시 없음), `generateMetadata`로 OG. 화면은 클라이언트 컴포넌트. **섹션 탭**(서버 섹션이 없으면 기본 4탭을 프론트가 그림), **섹션 뷰어**(`contentFormat`으로 HTML/마크다운 렌더러 선택 + sanitize, `features/shared`), 해시태그, 호스트 연락처 시트, 카카오 공유. 크롤러 계약 스크립트.

**선행**: P5a · **API**: GP-3 GE-5

**핵심 리스크**
1. 이 라우트 위에 `<Suspense>`나 `loading.tsx`가 있으면 `notFound()`가 200으로 나간다 — `(public)` 그룹에 둔다. 켠 구성에서 크롤러 기준으로도 그런지는 P0 산출물 B-3에서 확인한다
2. 5xx는 throw해서 `error.tsx`로 보낸다
3. 요청마다 백엔드를 부른다. 티켓 오픈 때 부하가 문제 되면 이 조회에만 캐시를 붙인다(tech-decisions §2)

**완료 기준**
- [ ] **실제 카카오 UA**(`facebookexternalhit/1.1; kakaotalk-scrap/1.0; …`)로 요청 → OG가 `<head>`에 있음(스크립트)
- [ ] 카카오 공유 디버거에서 미리보기 확인
- [ ] 없는·준비중 공연이 크롤러 UA에 404, 브라우저에는 not-found 화면
- [ ] v1 실데이터 본문 샘플(MARKDOWN·HTML)이 뷰어에서 정상 렌더 + XSS 페이로드 차단
- [ ] 응답 HTML에 재고 값 없음

### P5c — 호스트 홈(공개) · 관심 호스트

**포함**: 호스트 홈 `/hosts/[hostId]`(GH-3 + GH-14) — 호스트 정보, 연락처, 멤버 수(`memberCount`), 개설일(`createdAt`), 공연 리스트는 `<Prefetch>`로 조회하고 화면은 여기서 공개 필드만 읽는다. **사용자별 값은 키를 나눈다** — `hostViewerQuery`(같은 엔드포인트, 프리페치 안 함, 세션이 있을 때만)에서 `myRole`·`isFollowing`을 읽어 관심(♡) PH-13과 관리 버튼(설정·멤버·새 공연)을 그린다. 확정 전에는 ♡·관리 버튼을 비활성으로 둔다. 멤버(`myRole` 있음)는 GH-14도 브라우저에서 다시 조회해 준비중 공연까지 보고, 준비중 카드는 `/hosting/events/[eventId]`로 보낸다(`/events/[id]`는 404). 멤버 아바타 줄은 `myRole`이 있을 때만 GH-6으로 그린다. `features/shared/host-home`(S8).

**선행**: P5a · **API**: GH-3 GH-14 PH-13 GH-6

**완료 기준**
- [ ] 비로그인·관객·일반 멤버·매니저·마스터 시점 렌더
- [ ] 서버 조회에 토큰이 붙지 않음
- [ ] ♡ 연타에도 상태 일치(같은 요청 재전송 200)
- [ ] 이미 팔로우한 사용자에게 빈 ♡가 눌리는 순간이 없음(viewer 쿼리 확정 전 비활성)
- [ ] 멤버 시점에 준비중 공연 카드가 보이고 호스팅 센터로 이동

### P6 — 티켓 선택

**포함**: 공연 상세 안의 티켓 선택(GP-5). 티켓 종류 선택 → 인라인 수량 스테퍼. 잔여·매진·구매 가능 표시(`remaining`·`isSoldOut`·`isPurchasable`), 1주문 1종류 안내. 서버에서 조회하지 않고 브라우저에서 `staleTime:0`.

**선행**: P5b · **API**: GP-5

**완료 기준**
- [ ] 매진·판매 불가·PAST 공연 분기 렌더
- [ ] 수량 상한 = `purchaseLimit`, `remaining`, 100 중 가장 작은 값(서버 `MAX_QUANTITY = 100`)

### P7 — 체크아웃 · 주문 생성

**목표**: 금전 경로. 한 화면에서 옵션 입력 → 결제 정보 확인 → 결제 방식 → 환불 규정 동의 → 주문 생성까지 닫는다.

**포함**: G11/O-0(티켓 + 계좌). 옵션 응답 폼(모든 티켓 동일 / 티켓별, 옵션 없으면 폼 생략). 금액(`order/price.ts`). 결제 방식(직접 계좌이체 · 토스 송금) — 계좌 복사, **토스 송금 링크 생성**. 입금자명(닉네임 고정 표시). "입금하셨나요?" 확인 모달 → P11/O-1. 무료는 [신청]. 3분기(입금형 · 무료 승인형 · 무료 선착순). **주문 완료 화면은 `/orders/[orderUuid]?created=1`** — 생성 응답을 `setQueryData`로 넣고 `replace`로 이동하며, 새로고침이나 배포 뒤 하드 리로드(`deploymentId`)에서도 G11/O-3로 다시 그린다. 무료 선착순 확정 실패는 주문이 아니라 에러로 온다(FAILED 주문은 사용자에게 보이지 않는다) — 재시도만 안내한다.

**선행**: P6, P4b(통합 검증 시) · **API**: G11/O-0 P11/O-1 (+ G11/O-3)

**핵심 리스크**: 화면 총액과 토스 송금 금액이 서버 `totalAmount`와 어긋나면 입금 금액 오류로 거절된다. 모달 중복 제출(10초 내 같은 요청은 서버가 앞 주문을 돌려준다).

**완료 기준**
- [ ] 옵션 2모드 제출 본문이 스키마 검증 통과(`applyToAll` / `perTicketOptions`)
- [ ] 클라이언트 계산 총액 == 주문 응답 `totalAmount`(계약 테스트)
- [ ] 3분기 각각 주문 생성 응답의 상태가 맞음(승인은 dev 서버의 v1 어드민이나 API 직접 호출로 대신한다)
- [ ] 주문 완료 화면에서 새로고침해도 같은 내용
- [ ] 에러 분기: patterns §화면별 에러 처리의 P7 행
- [ ] agent-browser로 상세 → 선택 → 체크아웃 → 주문 생성까지 검증. 승인 → 티켓 발급까지의 전 구간은 P13a

### P8 — 티켓탭 · 입장 QR

**포함**: 티켓탭(G11/T-1 묶음 목록 + G11/T-3 공지 바), 카드 스와이프(N/M 페이저), 티켓 상세·입장 QR(G11/T-2, `qrValue`를 `qr-code-styling`으로 렌더), QR 전체화면. 티켓 `state` 11값 표시. 묶음마다 상태별 개수 배지(`counts`). 승인 대기·거절 주문(티켓 없이 주문만)도 목록에 나온다. 정렬은 "공연임박순" 고정 라벨(서버 정렬이 하나).

**선행**: P4a, P5a · **API**: G11/T-1 G11/T-2 G11/T-3

**완료 기준**
- [ ] `state` 11값 렌더
- [ ] 받은 티켓 묶음(`orderUuid=null`)에 [주문상세]가 없음
- [ ] 선물 대기·취소 티켓은 QR 대신 안내
- [ ] 옛 uuid로 404가 오면 티켓탭을 다시 읽음

### P8b — 선물하기

**포함**: 보내기(티켓탭 위 바텀시트 → PG-1 → 링크 생성 완료 · 공유 [메세지](`sms:` 링크) · [카카오톡] · [링크 복사] · 메모 PG-8), 회수(DG-2), **공개 랜딩 `/gifts/[giftToken]`**(GG-3, `viewState` 7종), 수락(PG-4) · 거절(PG-5), 반환(PG-6), 보낸 사람의 "선물 완료" 상세(GG-7a). 보낸/받은 내역(GG-7, `/mypage/gifts`)은 Figma에 화면이 있을 때만 만들고, 없으면 스키마만 둔다. [선물하기]는 G11/T-2의 `canGift`, [선물 반환]은 `canReturn`으로만 노출한다(목록 G11/T-1에는 이 값이 없어 카드에서 T-2를 읽는다). `Gift_400_2`(이미 선물 중)면 T-2의 `gift.linkPath`로 기존 링크 화면을 보여 준다. 랜딩의 `OWN_LINK`·`EXPIRED`에서 `giftId`가 있으면(보낸 사람) 회수 버튼. 랜딩도 호스트 홈처럼 공개 값(서버 프리페치)과 사용자별 값(브라우저 조회)을 나누고, 사용자별 값이 확정된 뒤에만 수락·거절 버튼을 활성화한다.

**선행**: P8, P4b · **API**: PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7a (+ GG-7은 화면이 있을 때)

**핵심 리스크**: 비로그인 → 로그인 → 복귀 후 **명시적 수락**. 수락·반환 뒤 uuid가 바뀌므로 캐시된 티켓 쿼리를 전부 무효화한다.

**완료 기준**
- [ ] `viewState` 7종 화면
- [ ] 미가입 수신자가 링크 → 가입 → 수락까지 완주(agent-browser)
- [ ] `Gift_400_3`(이미 처리됨) 시 랜딩을 다시 읽어 상태 화면으로
- [ ] [선물하기]·[선물 반환]이 `canGift`·`canReturn`과 일치
- [ ] 선물을 보낸 본인이 랜딩을 열어도 수락 버튼이 눌리는 순간이 없음
- [ ] 에러 분기: patterns §화면별 에러 처리의 P8b 행
- [ ] 랜딩 OG에 개인정보 없음(보낸 사람 닉네임은 서버가 가려서 준다)

### P8c — 관객 셀프 체크인

**포함**: `/check-in?token=…` — 로그인 게이트 후 PQ-5. 1장이면 바로 입장, 여러 장이면 `SELECT_TICKET` → 후보 선택 → 재요청. `result`별 화면. 셀프 체크인은 OPEN 공연만 된다 — 공연이 끝나 정산중이면 `Event_400_5`가 오므로 "호스트에게 티켓 QR을 직접 보여 주세요"로 안내한다.

**선행**: P8, P4b · **API**: PQ-5

**완료 기준**
- [ ] 비로그인 → 로그인 → 같은 URL 복귀
- [ ] `result` 분기 전부 렌더, `Event_400_26`(잘못된 토큰) 안내
- [ ] 에러 분기: patterns §화면별 에러 처리의 P8c 행(OPEN 아님, `IssuedTicket_400_1`)

### P9 — 마이페이지

**포함**: 프로필(GM-1, PM-2 닉네임 2~7자, PM-3 이미지 — P3 업로드 모듈), 주문내역(G11/O-2, 무한 스크롤), 주문상세(G11/O-3), 주문 취소(P11/O-4 — 유료는 환불 계좌 시트를 채워야 요청되고 환불 요청 상태가 된다, 무료는 바로 취소. 선물 대기·완료 티켓이 있으면 `Order_400_24` → "선물을 먼저 취소하거나 돌려받아 주세요"), 환불 계좌 입력·수정(P11/O-5, 은행명 20자 · 예금주 20자 · 계좌번호 30자 숫자·하이픈), 관심 호스트(GM-4, `status` 필터, 화면 안에서 해제 PH-13 DELETE, 무한 스크롤), 관람 공연 아카이빙(GM-5, 연도 탭), 로그아웃 · 회원 탈퇴(v1 — 확인 문구에 "보낸 선물 중 대기 중인 것은 취소된다"). 햄버거 자체는 P5a.

**선행**: P7(주문 도메인), P4b · **API**: GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 PH-13(DELETE) GM-5

**완료 기준**
- [ ] 주문 상태 5종 + `refundStatus` 조합이 목록·상세에서 일관
- [ ] 취소 버튼은 `canCancel`, 환불 계좌 입구는 `canEditRefundAccount`로만 노출
- [ ] 탈퇴 `USER_400_6` 안내
- [ ] 아카이빙에서 `orderUuid=null`이면 주문상세로 이동하지 않음
- [ ] 유료 취소는 계좌 입력 → 환불 요청, 무료 취소는 즉시 취소로 끝남
- [ ] 남의 주문 주소로 들어오면 공용 404 안내
- [ ] 에러 분기: patterns §화면별 에러 처리의 P9 행

### P9b — 알림센터

**포함**: 벨 빨간 점(GN-2, `features/shared/notification` — P10a가 먼저 착수하면 그쪽이 만든다), 알림함(GN-1 무한 스크롤), 읽음(PN-3 단건·전체, 한 번에 최대 100건), 알림 탭 시 `target.type`(HOST · ORDER · GIFT)으로 이동. 15종 타입 → 카테고리·아이콘 매핑.

**선행**: P4a, P8, P9 · **API**: GN-1 GN-2 PN-3

**완료 기준**
- [ ] 15종 타입 렌더(모르는 타입이 와도 깨지지 않음)
- [ ] 읽음 후 `unreadCount`로 벨 갱신
- [ ] 승인 알림을 읽으면 티켓탭 공지 바 해제
- [ ] `target.type` 3종별 이동. 호스트가 받은 주문 알림의 `?order=` 진입은 P13a에서 검증

### P10a — 호스팅 센터 셸 + 공연준비 홈 + 호스트 생성

**포함**: `hosting/layout.tsx`(헤더, 알림 벨 — 누르면 `/mypage/notifications`, S7), **공연준비 홈**(호스트 탭 GH-1 / 공연 탭 GE-1, 검색, 빈 상태, 무한 스크롤. 준비중 공연 카드의 ⋮ 삭제는 P11), **호스트 만들기**(PH-2 `{name, introduce, contacts}` — 이미지는 만든 뒤 설정에서), 비멤버가 호스트·공연 경로에 들어올 때의 403 안내. `/admin/*` → `/hosting/*` 리다이렉트.

**선행**: P2, P4a · **API**: GH-1 GE-1 PH-2 (+ GN-2 벨)

**완료 기준**
- [ ] 호스트 생성 → 목록 반영
- [ ] 카드에 호스트별 `myRole` 배지
- [ ] 비멤버가 `/hosting/hosts/[id]/…`·`/hosting/events/[id]/…`에 들어오면 403 안내 화면
- [ ] 호스팅 센터 화면이 서버에서 데이터를 조회하지 않음(셸만 렌더)
- [ ] 호스팅 센터용 쿼리 기본값(`staleTime` 등) 확정

### P10b — 호스트 설정 · 멤버

**포함**: 호스트 설정(PH-4: 이름·소개·연락처, 이미지는 PH-15 + P3 업로드 모듈), 멤버 목록(GH-6 — 응답에 이메일이 없다), 멤버 초대(PH-7, 복수·즉시 추가), 역할 변경(PH-10), 삭제(DH-11), 마스터 양도(PH-12), 권한 가이드 표. 호스트 홈 화면 자체는 P5c. **Figma 문구와 백엔드가 다른 곳**: 권한 가이드 표(503:30950)의 "호스트 삭제" 행은 뺀다(백엔드에 없다, api-contract §2 기준으로 그린다). 초대 모달(503:31067)의 "상대방 승인 후 멤버 목록에 표시됩니다"는 즉시 추가에 맞게 "바로 멤버로 추가됩니다"로 바꾼다.

**선행**: P10a, P5c · **API**: PH-4 PH-15 GH-6 PH-7 PH-10 DH-11 PH-12

**완료 기준**
- [ ] 마스터·매니저·일반 3시점에서 버튼 노출이 권한표와 일치
- [ ] 매니저 화면의 초대 역할 선택지는 "일반" 고정
- [ ] 초대 실패 시 사유의 이메일을 해당 줄에 표시(`HOST_400_13`·`14`·`15`)
- [ ] 변경 응답(멤버 전체 목록)으로 화면을 다시 그림
- [ ] 마스터를 양도하면 `myRole`을 주는 쿼리(GH-1 · GH-3 viewer · GE-1 · GE-3)를 무효화해 버튼이 매니저 기준으로 바뀜
- [ ] 호스트 이미지 업로드가 발급 → S3 → 표시까지 동작
- [ ] 에러 분기: patterns §화면별 에러 처리의 P10b 행

### P11 — 공연 생성 · 체크리스트 · 기본 정보 · 섹션 편집 · 등록

**포함**: 간편 공연 만들기 2단계(호스트 선택 → 공연 만들기, PE-2, `?step=` + 지역 상태). 공연 스코프 레이아웃(GE-3, 사이드메뉴는 등록 상태에 따라 항목이 다름). 대시보드 — 준비중은 체크리스트(GE-7) + [공연 등록하기](PE-8, 확인 팝업). 기본 정보(PE-4: 포스터·이름·일정·장소·문의처·태그·티켓 여부). **장소 입력** — 주소 검색(Daum 우편번호) → 카카오 Geocoder로 `latitude`·`longitude` → 공연장 이름 · 상세주소. 4필드(`name`·`address`·`latitude`·`longitude`)가 다 있어야 체크리스트 ①이 찬다. 폼 안에 지도 미리보기를 그릴지는 README 기획 질문 P3. **일정 입력** — Figma는 날짜 하나 + 시작·종료 시각이고 서버는 시작·종료 일시를 따로 받는다. 디자인이 오기 전까지 종료 시각이 시작 시각 이하면 다음 날로 계산한다(자정을 넘는 공연). 상세 정보(GE-5/PE-6: 섹션 탭 편집, **Tiptap**, 본문 이미지 PE-10 `SECTION`). 미리보기(`section-viewer` 재사용). **등록된 공연의 정보를 저장하면 "예매자에게 꼭 안내해 주세요" 팝업**(서버는 예매자에게 알림을 보내지 않는다). **티켓 없음(`hasTicket=false`) 공연** — 체크리스트 ③을 면제로 표시(`ticketRequired=false`), 유효 티켓이 있는데 티켓 없음으로 바꾸면 `Event_400_25`. 삭제(DE-9) — 공연준비 홈의 준비중 공연 카드 ⋮ 메뉴, 매니저 이상만(등록 후 카드에는 ⋮ 삭제가 없다). 미저장 이탈 경고.

**선행**: P10a, P5b(섹션 뷰어) · **API**: PE-2 GE-3 PE-4 PE-10 GE-11 GE-5 PE-6 GE-7 PE-8 DE-9

**완료 기준**
- [ ] 만들기 → 기본 정보 → 섹션 → 등록까지 완주(티켓 없음 공연으로. 티켓 있는 공연의 등록은 P12 뒤에)
- [ ] 장소 저장 본문에 4필드가 모두 채워지고 체크리스트 ①이 충족됨
- [ ] 등록된 공연을 저장하면 안내 팝업
- [ ] 준비중 공연 카드의 ⋮ 삭제가 일반 멤버에게 보이지 않음
- [ ] 등록 후 `hasTicket` 토글 잠금, 정산중·지난 공연은 읽기 전용
- [ ] 장소 수정 시 `detailAddress`를 함께 보냄
- [ ] 섹션 저장은 전체 교체(빠진 섹션 삭제)임을 UI가 반영
- [ ] 일반 멤버는 읽기 전용 화면
- [ ] 저장·등록 뒤 공연 상세를 열면 바로 반영돼 있음
- [ ] 에러 분기: patterns §화면별 에러 처리의 P11 행

### P12 — 티켓 · 옵션 관리

**포함**: 티켓 관리 목록(G10/T-1), 티켓 폼(P10/T-2 생성 · P10/T-3 수정 — 계좌의 은행은 목록에서 고르게 해 토스 송금 링크에 쓸 수 있는 값으로 고정), ⋮ 메뉴(수정·삭제·판매 중단·재개), 옵션 추가 모달(기존 옵션 재사용 / 직접 만들기 P10/O-2), 옵션 상세·수정·삭제, 티켓에 옵션 붙이기·떼기(P10/O-5). 옵션 삭제(D10/O-4, 옵션 자체를 지움)와 떼기(⊗, 이 티켓에서만 뺌)를 구분한다. 잠긴 옵션은 이름·설명만 수정. 옵션 설명은 필수. 옵션 가이드·관리자 승인 가이드 팝오버. 티켓 없음 공연의 티켓 관리 화면은 추가 버튼 없이 안내만(서버도 `Ticket_Item_400_12`로 막는다).

**선행**: P11 · **API**: 10/T-1~T-6, 10/O-1~O-5

**완료 기준**
- [ ] 두둥·무료 티켓 생성·수정·삭제
- [ ] 무제한 선택 시 재고 공개 토글이 꺼지고 비활성
- [ ] 수정 본문은 바뀐 필드만 + 비울 때 `clear[]`
- [ ] 잠긴 티켓은 허용 필드만 활성, ⋮ 메뉴는 `isSold || hasPendingOrders`로 구성
- [ ] 새 옵션은 생성 + 지정 2회 호출이 한 동작으로 묶임(중간 실패 처리 포함)
- [ ] 판매 중단 → 재개가 목록과 공연 상세(GP-5)에 반영
- [ ] 티켓 없음 공연에서 추가 버튼이 없음
- [ ] 에러 분기: patterns §화면별 에러 처리의 P12 행

### P13a — 예매자 관리 · 등록 후 대시보드

**포함**: 등록 후 대시보드(GD-1, 승인 대기 NEW 배지). 예매자 관리 — 주문 탭(GR-1 상태 탭·검색 `searchType` NAME · PHONE · DEPOSITOR_NAME, 승인 PR-3, 거절 PR-4 사유 시트 4종(기타는 문구 필수), 주문 상세 GR-2, 승인 후 취소 PR-5 사유 100자, 엑셀 GR-6), 발급된 티켓 탭(GI-1 `entrance` 필터 · `searchType` NAME · PHONE, 상세 GI-2, 엑셀 GI-3), 환불 탭(GF-1 `status` 필터, [환불 완료] PF-2는 `refundStatus=REQUESTED`일 때만). Figma 예매자 관리는 주문·발급된 티켓 두 탭뿐이고 환불 화면이 없다 — 디자인이 오기 전까지 백엔드 GF-1을 그대로 세 번째 탭(`?tab=refunds`)으로 둔다. 주문 상세 모달은 `?order=`를 보고 페이지가 선언적으로 렌더한다(닫기 = `router.replace`).

**선행**: P12, P4b. 전 구간 검증은 P7 · P8 · P9b와 교차 · **API**: GD-1 GR-1~6 GF-1 PF-2 GI-1~3

**완료 기준**
- [ ] 승인 실패 시 에러 안내 후 주문이 승인 대기로 남음을 표시
- [ ] 공연 시작 후 승인·거절 버튼 비활성
- [ ] 환불 계좌는 매니저 이상에게만, `updatedAt` 표시
- [ ] 탭이 `?tab=`에 남아 새로고침해도 유지되고, `?order={orderUuid}`로 들어오면(알림 진입 포함) 주문 상세가 열림
- [ ] 승인·거절 뒤 상태 탭 `counts`가 갱신됨
- [ ] 환불 요청 → [환불 완료] → 관객 주문상세의 환불 완료까지 이어짐
- [ ] **agent-browser로 크리티컬 패스 전 구간 검증**: 상세 → 선택 → 체크아웃 → 주문 → 호스트 승인 → 티켓탭에 발급
- [ ] 에러 분기: patterns §화면별 에러 처리의 P13a 행
- [ ] 엑셀 다운로드(래퍼 없는 xlsx) 동작, 1만 행 초과 안내
- [ ] 발급 티켓에 `ownerName`·`giftState` 표시

### P13b — QR 체크인

**포함**: 체크인 통계(GQ-1), [호스트가 스캔] 모드(카메라 → PQ-2, `result`별 화면), [관객이 스캔] 모드(GQ-4 → `origin + qrPath`를 QR로 표시), 전체화면. 카메라 권한 거부·스캔 실패 UI. 연속 스캔 스로틀.

**선행**: P12, P4b. 실판독은 P8·P8c와 교차 · **API**: GQ-1 PQ-2 GQ-4

**완료 기준**
- [ ] 실기기 3종 이상에서 판독
- [ ] `result` 5종 화면
- [ ] [관객이 스캔] — GQ-4 QR을 실제 폰으로 찍어 `/check-in`이 열리고 입장까지 됨
- [ ] OPEN이 아닌 공연(정산중 포함)에서는 [관객이 스캔] 모드에 "셀프 체크인은 공연 중에만 된다"고 안내
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
| P9b | 알림센터 | 관객 | P4a, P8, P9 |
| P10a | 호스팅 센터 셸 + 공연준비 홈 + 호스트 생성 | 호스팅 | P2, P4a |
| P10b | 호스트 설정 · 멤버 | 호스팅 | P10a, P5c |
| P11 | 공연 생성 · 체크리스트 · 정보 · 섹션 · 등록 | 호스팅 | P10a, P5b |
| P12 | 티켓 · 옵션 관리 | 호스팅 | P11 |
| P13a | 예매자 관리 · 대시보드 | 호스팅 | P12, P4b (전 구간 검증은 P7 · P8) |
| P13b | QR 체크인 | 호스팅 | P12, P4b |
| P14 | 통합 하드닝 | 공통 | 전 기능 Phase |
| P15 | 컷오버 & 롤백 | 공통 | P14 |

## 6. API → Phase 배정

| Phase | API |
|---|---|
| P3 | 공개 GET 10개 스키마(스모크), 세션(GM-1), 업로드 URL 발급 3종 호출 경로(PH-15 · PE-10 · PM-3) |
| P5a | GP-1 GP-2 GE-11 |
| P5b | GP-3 GE-5 |
| P5c | GH-3 GH-14 PH-13 GH-6(멤버 시점) |
| P6 | GP-5 |
| P7 | G11/O-0 P11/O-1 |
| P8 | G11/T-1 G11/T-2 G11/T-3 |
| P8b | PG-1 PG-8 DG-2 GG-3 PG-4 PG-5 PG-6 GG-7a, GG-7(화면이 있을 때) |
| P8c | PQ-5 |
| P9 | GM-1 PM-2 PM-3 G11/O-2 G11/O-3 P11/O-4 P11/O-5 GM-4 PH-13(DELETE) GM-5 |
| P9b | GN-1 GN-2 PN-3 (벨 GN-2는 P10a가 먼저 만들 수 있다) |
| P10a | GH-1 GE-1 PH-2 |
| P10b | PH-4 PH-15 GH-6 PH-7 PH-10 DH-11 PH-12 |
| P11 | PE-2 GE-3 PE-4 PE-6 GE-7 PE-8 DE-9 PE-10 (+ GE-5 GE-11) |
| P12 | G10/T-1 P10/T-2~T-6 G10/O-1 P10/O-2~O-5 |
| P13a | GD-1 GR-1~GR-6 GF-1 PF-2 GI-1~GI-3 |
| P13b | GQ-1 PQ-2 GQ-4 |
| — | SYS-1 — 화면에서 쓰지 않는다(헬스체크는 front `/healthz`) |

## 7. 미확정 항목

다음 라운드에서 채운다. 목록은 [`README.md`](./README.md) 참조.
