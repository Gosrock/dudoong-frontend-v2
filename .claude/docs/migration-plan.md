# Dudoong Frontend Migration Plan

## 1. As-Is

### 1.1 Repository

- **Repo**: [Gosrock/DuDoong-Front](https://github.com/Gosrock/DuDoong-Front)
- **Package Manager**: Yarn Berry 3.3.0
- **Monorepo**: Yarn Workspaces
- **Node**: 18-alpine

### 1.2 Project Structure

```
DuDoong-Front/
├── apps/
│   ├── ticket/          # Next.js 13 - 사용자 티켓 서비스 (SSR)
│   └── admin/           # Vite 4 + React 18 - 호스트 어드민 (SPA)
├── shared/
│   ├── ui/              # @dudoong/ui - 공용 디자인 시스템 (30+ 컴포넌트)
│   └── utils/           # @dudoong/utils - 공용 유틸리티 & API 레이어
├── .github/workflows/   # CI/CD (태그 기반 Docker 배포)
├── nginx/               # Admin Nginx 설정
└── Dockerfile.*         # ticket, admin 각각 Docker 빌드
```

### 1.3 Tech Stack

| Category | Ticket App | Admin App |
|----------|-----------|-----------|
| Framework | Next.js 13 (Pages Router) | Vite 4 + React 18 |
| Routing | Next.js Pages Router | React Router DOM v6 |
| Styling | Emotion (styled + css prop) | Emotion + Ant Design 5 |
| Global State | Recoil 0.7.6 | Recoil 0.7.6 |
| Server State | @tanstack/react-query 4 | @tanstack/react-query 4 |
| API Client | Axios (interceptor 기반 토큰 갱신) | Axios |
| Auth | 카카오 OAuth + JWT (SSR 토큰 갱신) | 카카오 OAuth + Route Guard |
| Payment | @tosspayments/payment-widget-sdk | - |
| Editor | @toast-ui/react-editor | @toast-ui/editor + plugins |
| Deploy | Docker (Node 서버, :3000) | Docker (Nginx 정적 서빙, :3100) |

### 1.4 Shared UI (`@dudoong/ui`)

**테마 시스템** (Emotion ThemeProvider 기반):
- 색상: 메인 보라(main_100~500), 민트 포인트, 그레이스케일, 경고 레드
- 타이포: Pretendard (Header 28/24/20, Text 18/16/14/12/10)
- 미디어쿼리: pc(768px+), mobile(~767px)
- Storybook 배포: GitHub Pages

**컴포넌트 (30개)**:
Accordion, Button, ButtonSet, Counter, Divider, DropZone, Dropdown, Footer, Header, ListHeader, Loader, MenuBar, MenuItem, Modal, NavBar, Popup, PopupDropdown, Profile, ProfileDropdown, SelectButton, Spacing, Tag, TagButton, Text, TextField, TicketCount, Toast, ToggleButton 등

**레이아웃**: BorderBox, FlexBox, FullScreen, Padding, LoginMarkup, ListRow, RoundBlock

### 1.5 Shared Utils (`@dudoong/utils`)

- **API**: Axios 인스턴스 (`BASE_URL: https://dudoong.com/api/v1`), 인증/이벤트 API
- **Hooks**: useHandleError, useInfiniteQueries, useInput, useInputs, useResponsive, useScreenHeight, useScrollEffect
- **Utils**: calcMoneyType, checkName, getTimeForToday, isEqualObject, loginFc, parseDate

### 1.6 Pages

**Ticket App (16 routes)**:

| Route | Description |
|-------|-------------|
| `/` | 랜딩 (Landing) |
| `/home` | 메인 홈 |
| `/events/[eventId]` | 이벤트 상세 |
| `/events/[eventId]/book/option` | 예매 옵션 선택 |
| `/events/[eventId]/book/order` | 예매 주문 확인 |
| `/ticket/[id]` | 티켓 상세 |
| `/ticket/qr` | 티켓 QR |
| `/pay/confirm` | 결제 확인 |
| `/pay/success` | 결제 성공 |
| `/pay/fail` | 결제 실패 |
| `/mypage` | 마이페이지 |
| `/history` | 주문 내역 |
| `/history/[orderId]` | 주문 상세 |
| `/history/mycoupon` | 쿠폰 목록 |
| `/login` | 로그인 |
| `/kakao/callback` | 카카오 OAuth 콜백 |

**Admin App (20+ routes)**:

| Route | Description |
|-------|-------------|
| `/admin/` | 홈 대시보드 |
| `/admin/new/hosts` | 호스트 생성 |
| `/admin/new/events` | 이벤트 생성 |
| `/admin/hosts/:hostId/dashboard` | 호스트 대시보드 |
| `/admin/hosts/:hostId/info` | 호스트 정보 |
| `/admin/hosts/:hostId/events` | 이벤트 목록 |
| `/admin/hosts/:hostId/member` | 멤버 관리 |
| `/admin/hosts/:hostId/slack` | 슬랙 연동 |
| `/admin/hosts/:hostId/alliance` | 제휴 관리 |
| `/admin/events/:eventId/options` | 옵션 관리 |
| `/admin/events/:eventId/tickets` | 티켓 관리 |
| ... | 기타 이벤트 관리 페이지 |

### 1.7 Auth Flow

**Ticket (SSR)**:
1. `_app.tsx` getInitialProps에서 서버사이드 토큰 갱신
2. Recoil initializeState로 인증 상태 초기화
3. Axios interceptor로 클라이언트 401 → 자동 refresh

**Admin (SPA)**:
1. `<RequireAuth />` / `<RefuseAuth />` 라우트 가드
2. react-cookie로 토큰 관리

### 1.8 CI/CD & Deploy

- **Trigger**: `Ticket-v*.*.*` / `Admin-v*.*.*` 태그 푸시
- **Registry**: Docker Hub (`david0218/dudoong-ticket`, `david0218/dudoong-admin`)
- **Env**: GitHub Secrets → 빌드 시 `.env` 생성
- **Staging**: 별도 staging 워크플로우 존재

### 1.9 Key Dependencies

```
# 공통
react 18, typescript ~4.9, emotion, recoil, react-query 4, axios
react-beautiful-dnd, react-hook-form, react-kakao-maps-sdk, use-debounce

# Ticket 전용
next 13, cookies-next, @tosspayments/payment-widget-sdk, @toss/impression-area
swiper, qr-code-styling, react-spring-bottom-sheet

# Admin 전용
vite 4, react-router-dom 6, antd 5, react-cookie, react-error-boundary
@toast-ui/editor + plugins, react-qr-reader

# Shared UI
react-datepicker, react-spinners, react-toastify, react-bootstrap-icons
polished, emotion-reset, storybook 6

# DevTools
eslint, prettier, husky, lint-staged
```

---

## 2. To-Be

<!-- 여기부터 작성해주세요 -->

### 2.1 Target Tech Stack

| Category | As-Is | To-Be |
|----------|-------|-------|
| Node | 18 | 22.11.0 |
| Package Manager | Yarn Berry 3.3.0 | Yarn 4.12.0 |
| Service Framework | Next.js 13 (Pages Router) | Next.js 16 (App Router) |
| Admin Framework | Vite 4 + React 18 | Vite 7 (유지) |
| Styling | Emotion | Emotion (유지) |
| Server State | Recoil + @tanstack/react-query 4 | @tanstack/react-query 5 + @suspensive/react, @suspensive/react-query |
| Client State | Recoil | 별도 라이브러리 없이 React Context로 대체 |
| Utilities | lodash 계열, 자체 utils | es-toolkit, react-simplikit |
| API Client | Axios | ky |
| Overlay/Toast | Recoil globalOverlay + react-toastify | overlay-kit |



### 2.2 Target Structure

```
dudoong-frontend-v2/
├── dudoong.com/
│   ├── service/                        # Next.js 16, App Router
│   │   ├── app/                        #   라우팅 레이어 (page.tsx = re-export)
│   │   │   ├── layout.tsx              #     루트 레이아웃 (Provider 조합 포함)
│   │   │   ├── global-error.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── (public)/               #     비인증 레이아웃
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx            #       홈 (루트 `/`)
│   │   │   │   ├── intro/page.tsx      #       랜딩/소개
│   │   │   │   └── events/[eventId]/page.tsx
│   │   │   ├── (protected)/            #     인증 필요 레이아웃
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── mypage/page.tsx
│   │   │   │   ├── history/{page,mycoupon,[orderId]/page}.tsx
│   │   │   │   ├── ticket/{[id],qr}/page.tsx
│   │   │   │   └── events/[eventId]/book/{option,order}/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── pay/{confirm,success,fail}/page.tsx
│   │   │   └── kakao/callback/page.tsx
│   │   │
│   │   ├── src/
│   │   │   ├── pages/                  #   실제 페이지 구현 코드
│   │   │   ├── components/             #   공용 컴포넌트
│   │   │   ├── hooks/                  #   공용 훅
│   │   │   ├── types/
│   │   │   └── remotes/               #   도메인별 API + DTO
│   │   │       └── {event,order,ticket,cart,user}.{ts,dto.ts}
│   │   ├── lib/api.ts                  #   ky 인스턴스 (SSR 인증 설정)
│   │   ├── proxy.ts                #   인증 미들웨어 (쿠키 체크, 리다이렉트)
│   │   └── next.config.ts
│   │
│   └── admin/                          # Vite 7, React SPA
│       └── src/
│           ├── App.tsx, main.tsx
│           ├── router.tsx              #   라우트 설정 (react-router-dom)
│           ├── pages/                  #   페이지 (라우팅 + 구현)
│           ├── components/, hooks/
│           ├── lib/api.ts              #   ky 인스턴스 (클라이언트 인증 설정)
│           └── remotes/               #   도메인별 API + DTO
│               └── {host,event,ticket,order,option,user}.{ts,dto.ts}
│
├── packages/
│   ├── core/src/
│   │   ├── api/client.ts               #   createApiClient 팩토리
│   │   ├── auth/                       #   oauth.ts, token.ts
│   │   ├── providers/                  #   react-query-provider.tsx
│   │   └── types/                      #   공유 타입
│   ├── ui/src/
│   │   ├── components/...
│   │   └── theme/                      #   palette, typo, media
│   └── utils/src/...
│
├── infra/                              #   nginx/, docker/
├── .nvmrc                              # v22.11.0
├── package.json                        # packageManager: yarn@4.12.0
└── ...                                 # tsconfig.base, eslint, prettier
```

**패키지 분리 기준**:

| 위치 | 포함하는 것 | 기준 |
|------|------------|------|
| `packages/core` | API 클라이언트 팩토리, 인증, 공유 타입 | 인프라 레벨, 앱에 독립적 |
| `dudoong.com/*/remotes` | `도메인.ts` (queryOptions) + `도메인.dto.ts` (타입) | 앱별 API + DTO를 도메인 단위로 colocate |

> **참고: remotes 패턴 (tossinsu-crm-client 참고)**
> - `remotes/` 폴더에 도메인별로 `*.ts` + `*.dto.ts` 쌍으로 관리
> - `*.ts`: queryOptions, mutationOptions 정의
> - `*.dto.ts`: 요청/응답 타입 정의
> - 별도 query hook 레이어 없이 페이지에서 바로 import해서 사용



### 2.3 Architecture Decisions

- Service: Next.js 최신 버전으로 업그레이드 (Pages Router → App Router)
- Admin: Vite 유지 (SSR 불필요, 정적 빌드 + Nginx 서빙이 더 적합)
- 인증 방식 변경: getInitialProps(매 요청 토큰 갱신) + Recoil 인증 상태 → `proxy.ts` 쿠키 체크만으로 단순화
- 인증 로직(OAuth, 토큰 교환)은 `packages/core/auth/`에 통합, 로그인 UI/페이지는 각 앱에 유지
- `cookies-next` 제거 → `next/headers`의 `cookies()` 사용 (App Router 내장)

> **참고: App Router 인증 구조**
> - `proxy.ts`(구 middleware.ts): 쿠키 유무만 체크하는 optimistic check (DB/API 검증 X)
>   - 보호 페이지(`/mypage`, `/history`) 접근 시 쿠키 없으면 `/login` 리다이렉트
>   - 로그인 상태에서 `/login` 접근 시 `/home` 리다이렉트
> - 실제 인증: API 호출 시 ky 인스턴스가 쿠키를 헤더에 첨부 → 서버에서 검증
> - 클라이언트 전역 상태(Recoil)에 인증 정보 주입하던 패턴 불필요해짐

> **참고: 로그인 워크스페이스 분리 검토**
> - 카카오 OAuth 플로우는 동일하나, 로그인 후 동작이 앱마다 다름 (리다이렉트 대상, 토큰 저장 방식)
> - 별도 `apps/login`은 SSO 구조가 되어 앱 간 쿠키 공유/리다이렉트 관리 복잡도 증가 → 현 규모에서는 과도
> - 대안: OAuth 로직은 `packages/core/auth/`, 로그인 페이지는 각 앱에 유지 (로직 중복 없이 앱별 맥락 처리)

> **참고: Admin에 Vite를 유지하는 이유**
> - 내부 도구에 SSR/Node 서버 불필요 → Nginx 정적 서빙이 인프라 더 단순
> - Vite dev server가 Next.js 대비 HMR/콜드 스타트 빠름
> - 모든 page에 `"use client"` 선언하는 불필요한 마찰 없음

---

## 3. Migration Strategy

### 3.1 Approach

**새 레포에 처음부터 구축 (Greenfield) + 디자인 리뉴얼 병행**

기존 DuDoong-Front를 점진적으로 수정하지 않고, dudoong-frontend-v2에 새로 세팅한 뒤 기존 코드를 옮겨오는 방식.

- 프레임워크 버전(Next.js 13→16, Vite 4→7)과 라우팅 패러다임(Pages→App Router) 차이가 크므로 점진 마이그레이션 비효율적
- 새 레포에서 인프라(모노레포, 빌드, 린트) 먼저 세팅 → 페이지 단위로 기존 코드 이전
- 기존 레포는 레퍼런스로 유지, 새 레포에서 동작 확인 후 전환
- **디자인 리뉴얼 병행**: 페이지 구조는 유지하되, 디자인 시스템·컴포넌트·페이지 디자인이 전면 변경됨. 디자인 확정 전까지 인프라 + 보일러플레이트 세팅을 먼저 진행

### 3.2 Phases

**Phase 0: 인프라 + 보일러플레이트 (디자인 확정 전)**
- 모노레포 구조 (`dudoong.com/service`, `dudoong.com/admin`, `packages/*`)
- Yarn 4, Node 22, TypeScript 5, ESLint 9, Prettier
- `packages/core`: ky 기반 API 클라이언트 팩토리, auth (OAuth, token)
- `packages/ui`: 테마 토큰 구조 (palette, typo, global) — 값은 디자인 확정 후 채움
- `packages/utils`: 공용 유틸리티, 훅 이전
- Service: App Router 기본 구조 (`app/`, `proxy.ts`, `layout.tsx`, 라우트 그룹)
- Admin: Vite 7 + React Router DOM v6 기본 구조 (`router.tsx`)
- 인증 흐름, API 레이어, react-query v5 + @suspensive 세팅

**Phase 1: Service 페이지 구현 (디자인 확정 후)**
- 새 디자인 시스템 기반 `packages/ui` 컴포넌트 구현
- 페이지 단위 구현 (우선순위: 홈 → 이벤트 상세 → 예매 플로우 → 결제 → 마이페이지/히스토리)
- Recoil 제거 → React Context, overlay-kit

**Phase 2: Admin 페이지 구현 (디자인 확정 후)**
- 페이지 단위 구현 (호스트 관리 → 이벤트 관리 → 티켓/옵션/게스트)
- antd, toast-ui editor 그대로 유지

**Phase 3: 의존성 교체**
- `react-beautiful-dnd` → `@dnd-kit`
- `react-spring-bottom-sheet` → `vaul` + `overlay-kit`
- `swiper` v11 업그레이드
- QR 라이브러리 업그레이드

**Phase 4: CI/CD & 배포**
- Docker 빌드 설정 갱신
- GitHub Actions 워크플로우
- 환경변수, 도메인 전환

### 3.3 Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| App Router + Emotion 서버 컴포넌트 비호환 | UI 깨짐, 빌드 실패 | `"use client"` 경계 명확히 설정, `@emotion/babel-plugin` 설정 조정 |
| react-query v5 breaking changes | API 레이어 전면 수정 | `@suspensive/react-query`로 마이그레이션 부담 완화 |
| 결제 SDK (`@tosspayments`) 호환성 | 결제 플로우 장애 | Client Component로 격리, 별도 검증 |
| 기존 Recoil 전역 상태 누락 | 런타임 에러 | 이전 전 Recoil atom/selector 전수 조사 후 Context 매핑 |

---

## 4. Decisions Log

### 4.1 라우트 [결정 완료]

**Service** — 누락 라우트 모두 To-Be 구조에 반영 완료:

| 라우트 | 결정 | 비고 |
|--------|------|------|
| `/` (루트) | `(public)` 홈으로 변경 | 기존 `/home`이 루트 `/`로 이동 |
| `/intro` | `(public)`에 추가 | 기존 Landing 페이지가 `/intro`로 이동 |
| `/events/[eventId]/book/option` | `(protected)`에 추가 | 예매 핵심 플로우 |
| `/events/[eventId]/book/order` | `(protected)`에 추가 | 예매 핵심 플로우 |
| `/history/[orderId]` | `(protected)`에 추가 | 주문 상세 |
| `/history/mycoupon` | `(protected)`에 추가, 유지 | 쿠폰 목록 |
| `/ticket/qr` | `(protected)`에 별도 유지 | 1초 폴링 QR 전용 페이지, ticket/[id]와 역할 다름 |

**Admin** — SPA이므로 `router.tsx`에서 전체 라우트 정의. 구조도에 세부 라우트 나열 불필요.

### 4.2 도메인 의존성 [결정 완료]

| 의존성 | 결정 | 비고 |
|--------|------|------|
| `@tosspayments/payment-widget-sdk` | **유지** | `"use client"` 경계 설계 필요 |
| `@toast-ui/editor` + plugins | **유지** | 1차 마이그레이션에서 교체 X, 추후 Tiptap 등 검토 |
| `antd` (admin) | **유지** | 1차에서는 그대로, 추후 `@dudoong/ui` 대체 검토 |
| `react-hook-form` | **유지** | |
| `react-beautiful-dnd` | **@dnd-kit으로 교체** | 공식 deprecated |
| `react-kakao-maps-sdk` | **유지** | Client Component로 격리 |
| `swiper` | **v11 업그레이드** | |
| `qr-code-styling` / `react-qr-reader` | **유지 + 업그레이드** | |
| `react-spring-bottom-sheet` | **vaul + overlay-kit으로 교체** | |
| `@toss/impression-area` | **유지** | |
| `next-transpile-modules` | **제거** | Next.js 13+에서 `next.config.ts`의 `transpilePackages`로 대체 |
| `next-cookies` | **제거** | `cookies-next`와 함께 제거, `next/headers` cookies()로 대체 |
| `@next/font` | **제거** | Next.js 14+에서 `next/font`으로 내장화, 패키지 삭제됨 |
| `react-scripts` (shared) | **제거** | packages/ 구조 전환 시 빌드 툴체인 교체 (tsup 등) |
| `@emotion/babel-plugin` | **설정 변경** | App Router + Emotion 조합에 맞게 next.config.ts 설정 필요 |

### 4.3 shared 코드 이전 매핑

**shared/utils → packages 이전:**

| 기존 | 목적지 | 비고 |
|------|--------|------|
| `apis/axios.ts` | `packages/core/api/client.ts` | ky로 교체 |
| `apis/auth/AuthApi.ts` OAUTH_* | `packages/core/auth/oauth.ts` | |
| `apis/auth/AuthApi.ts` REFRESH | `packages/core/auth/token.ts` | 단일 파일 → 두 목적지 분리 |
| `apis/auth/authType.ts` | `packages/core/auth/` 또는 `types/` | colocate 여부 결정 필요 |
| `apis/event/EventApi.ts` | 각 앱의 `remotes/event.ts` | 앱별 엔드포인트 동일 여부 확인 |
| `hooks/useInfiniteQueries` | 재작성 필요 | react-query v5 breaking change |
| `hooks/useInput, useInputs` | `packages/utils/` 또는 각 앱 | |
| `hooks/useResponsive` | `packages/utils/` | shared/ui 중복 → 통합 |
| `hooks/useHandleError` | **폐기** | 빈 stub |
| `utils/loginFc.ts` | `packages/core/auth/` | proxy.ts 구조에 맞게 변경 |
| `utils/calcMoneyType, parseDate 등` | `packages/utils/` | |

**shared/ui 이전:**

| 항목 | 결정 |
|------|------|
| `theme/global.ts` | `packages/ui`에 포함 |
| `theme/emotion.d.ts` | `packages/ui`에 포함 |
| `theme/dudoong-fonts.css` | `packages/ui`에 포함 |
| `assets/` (icons, image, logo) | `packages/ui/assets/`로 이전 |
| `lib/useToastify.ts` | **폐기** (overlay-kit 전환) |
| `LoginMarkup` 컴포넌트 | **packages/ui에 유지** |

### 4.4 구조적 사항 [결정 완료]

| 항목 | 결정 |
|------|------|
| remotes 위치 | **모두 `src/remotes/`** (service, admin 동일) |
| Admin 라우터 | **별도 `router.tsx`** 파일로 분리 |
| Storybook | **1차 마이그레이션 범위에서 제외**, 추후 별도 진행 |

### 4.5 기본 원칙

이 문서에서 논의되지 않은 변경사항이나 누락은, 기존 DuDoong-Front의 코드와 Next.js 16 / Vite 7의 기본 구현 방법을 따른다. 별도 결정이 필요한 경우 사용자에게 다시 확인한다.

---

## 5. Reference

-
