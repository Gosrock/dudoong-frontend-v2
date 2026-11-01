# DuDoong-Front v2 기술 결정

> 2026-10-12 전면 개정. 이전 판(모노레포 · Next 앱 2개 · Pages Router · emotion)을 폐기하고 **단일 Next 앱 · App Router · vanilla-extract**로 바꿨다. §16~§20(라이브러리 교체, 에디터, 체크아웃, 결제, 선물)은 이전 판에서 유지한다.
> 계약은 [`api-contract.md`](./api-contract.md), 구현 계획은 [`plan.md`](./plan.md), 폴더는 [`directory-structure.md`](./directory-structure.md).
> v1(`~/Desktop/repos/DuDoong-Front`)은 참고용이며 그대로 이어가지 않는다.

## 이 결정을 가른 요구사항

1. **카카오톡 공유** — 공연 상세·선물 랜딩의 OG 태그가 첫 HTML의 `<head>`에 있어야 한다. 카카오 크롤러는 JS를 실행하지 않는다.
2. **공연 상세는 항상 최신** — 호스트가 수정하면 바로 반영돼야 한다. 티켓 오픈 순간의 부하는 P14에서 측정하고, 필요하면 그 조회에만 캐시를 붙인다(§2).
3. **화면의 80% 이상이 로그인 뒤 조작 화면**이다. 서버 렌더가 필요한 화면은 공연 상세, 선물 랜딩, 호스트 홈 정도다.
4. **관객과 호스트에 걸친 화면**이 있다 — 호스트 홈(역할별 뷰), 공연 미리보기, 알림함. 한 계정이 관객이자 호스트다.
5. 자체 호스팅(Docker). 서버 1대에 front 컨테이너 1개다(§25).
6. 작은 팀이 오래 유지한다(가정).

## 0. 버전

2026-10-11 npm 실측: `next@16.4.0`, `react@19.3.0`, `@tanstack/react-query@5.104.1`, `@vanilla-extract/css@1.21.3`, `@vanilla-extract/next-plugin@2.5.2`. Node 22. 정확한 핀은 P0에서 고정한다.

Next 16에서 설계에 영향을 주는 것: Turbopack 기본, `middleware.ts` → `proxy.ts`(Node 런타임), `next lint` 제거(ESLint 직접 실행), `create-next-app` 기본값이 Cache Components 켬. 설치된 버전의 문서가 `node_modules/next/dist/docs/`에 들어 있다 — **Next 동작은 기억이 아니라 이 문서로 확인한다.**

## 1. 앱 구조

### 결론: **단일 Next 앱. 모노레포와 내부 패키지를 두지 않는다.**

| 이전 판의 분리 이유 | 지금 |
|---|---|
| admin이 Vite SPA + nginx라 런타임이 달랐다 | 둘 다 Next standalone으로 정한 순간 런타임·라우터·인증이 같아졌다 |
| 배포를 따로 했다 | 같은 계정·같은 쿠키·같은 알림함을 쓰는 한 제품이다 |

- 요구사항 4의 화면들은 두 앱이면 양쪽에서 각각 만들어야 한다.
- 두 앱이라서 생기던 것이 사라진다: `basePath:'/admin'` 엣지 라우팅, 로그인·콜백·`proxy.ts`·Dockerfile 2벌, 앱 간 캐시 무효화용 공유 시크릿, `turbo prune`·`transpilePackages`·`outputFileTracingRoot`.
- `packages/{ui,api,utils}`를 쓰는 곳이 이 앱 하나뿐이다(운영 어드민은 별도 레포). 패키지 경계 대신 폴더 경계를 eslint로 강제한다(§8).
- 번들은 Next가 라우트 단위로 쪼갠다. 에디터·QR 스캐너·테이블은 호스팅 센터 라우트에서만 로드된다(무거운 것은 `next/dynamic`).

**잃는 것**: 독립 배포(호스팅 센터만 고쳐도 전체가 재배포된다), 장애 격리(루트 레이아웃의 버그가 양쪽에 번진다). 팀이 나뉘거나 배포 주기가 달라지면 재검토한다.

**이름**: 코드에서 `audience`(관객) / `hosting`(호스팅 센터). "admin"은 운영 어드민과 헷갈려 쓰지 않는다. URL은 관객 화면이 루트, 호스팅 센터가 `/hosting/*`(2026-10-12 확정). 기존 `/admin/*`은 `redirects()`로 받는다.

## 2. 라우터와 캐시 모델

### 결론: **App Router. Cache Components는 켠 채로 둔다(`create-next-app` 기본값). 서버 캐시는 쓰지 않는다.**

### App Router인 이유

이전 판이 Pages Router를 고른 사슬은 "emotion 유지 → 서버 컴포넌트 불가 → 전부 `'use client'` → `generateMetadata` 불가 → Pages Router"였다. 첫 고리가 무너졌다.

- emotion을 유지할 이유가 "v1 코드 이식 비용 0"이었는데, UI는 새 디자인으로 처음부터 다시 만든다. 옮겨 올 코드가 없다.
- emotion은 Next 16.4 문서에서도 서버 컴포넌트 미지원 목록에 있다(확인).
- Pages Router는 유지보수 모드다. 새 프로젝트를 그 위에서 시작할 이유가 없다.
- 중첩 레이아웃과 라우트 그룹이 `(public)` / `(app)` / `hosting` 구조와 공연 어드민 사이드메뉴에 그대로 맞는다.

### 서버 캐시를 쓰지 않는 이유

공연 상세 같은 공개 화면의 백엔드 응답을 Next 서버에 캐시하는 안을 검토했고, 쓰지 않기로 했다(2026-10-12).

- 캐시가 해 주는 일은 "같은 페이지를 여러 사람이 짧은 시간 안에 열 때 백엔드 호출을 줄이는 것" 하나다. 트래픽이 그 정도가 아니고, 백엔드가 같은 서버라 호출 한 번이 가볍다.
- v1 공연 상세도 요청마다 서버에서 백엔드를 불러 왔다(캐시 설정이 잘못 달려 있어 동작하지 않았다).
- 캐시 하나 때문에 따라오는 것이 많았다: 수정이 늦게 보이는 문제와 그걸 메우는 무효화 엔드포인트·권한 확인·태그, 등록 전에 열린 URL의 404가 남는 문제, 시간으로 바뀌는 값(`displayStatus`·`dDay`)이 굳는 문제, 인스턴스가 늘 때의 공유 저장소.

그래서 **서버에서 조회하는 화면은 요청마다 백엔드를 부른다.** 항상 최신이고 무효화가 필요 없다. 티켓 오픈 때 부하가 문제가 되면 그때 해당 조회에만 캐시를 붙인다(`'use cache'` + `cacheLife`). 조회 정의가 한 곳에 있어 범위는 좁다.

### 공연 상세 캐시 — P14 판단(2026-11-01): 붙이지 않는다, 스위치만 정해 둔다

**🤖 Claude 판단** — 근거는 implementation-log "P14 — 성능 · 부하"의 요청 수 표. 요약:

- 공연 상세를 한 번 여는(하드 내비게이션) 동안 백엔드 호출은 익명 5건 · 로그인 6건이다: 서버 GP-3 · GE-5(Next가 부름, `generateMetadata`와 페이지가 요청 QueryClient 하나를 같이 써서 GP-3은 한 번), 브라우저 GM-1 · GA-3 배너 · GP-5 재고(+ 로그인이면 GN-2 벨). 캐시로 없앨 수 있는 것은 **GP-3 · GE-5 둘(약 40%)뿐**이고, 오픈 순간 정말 무거운 GP-5(재고)와 주문 생성 O-1은 **서버 캐시 대상이 아니다**(재고는 절대 캐시하지 않는다).
- 백엔드 포화를 잰 적이 없다. 부하 시험(`scripts/load/ticket-open.k6.js`)은 D2 스테이징 뒤에 돈다 — 거기서 GP-3 · GE-5가 먼저 무너지는 것이 보이면 켠다. 안 붙인 상태가 되돌리기 쉬운 쪽이다(붙인 뒤에는 "수정이 늦게 보인다"는 문의가 생긴다).
- 브라우저는 이미 공개 상세를 30초 신선하게 본다(`PREFETCHED_STALE_MS`) — 서버 캐시 수명을 이보다 짧게(10초) 두면 사용자가 느끼는 최신성은 지금과 같은 범위다.

**켤 때 — 스위치 위치와 모양**(코드 없음, 이 표대로 붙인다)

| 무엇 | 어떻게 |
|---|---|
| 위치 | `src/api/server/cached-public.ts`(새 파일, `server-only`) — `'use cache'` + `cacheLife({ stale: 30, revalidate: 10, expire: 60 })` 함수 둘: GP-3 원문 JSON, GE-5 원문 JSON. 인자는 `eventId` 문자열 하나 |
| 붙이는 곳 | `src/app/(audience)/(public)/events/[eventId]/page.tsx`와 `generateMetadata`에서만 `{ ...eventDetailQuery(id), queryFn: () => parse(cachedGp3(id)) }`처럼 **서버 쪽 queryFn만 바꾼다**. `queries.ts`(브라우저와 같이 쓰는 정의)는 그대로 — 브라우저에는 캐시가 없다 |
| 끄기 | 그 두 줄을 원래 `serverQuery(eventDetailQuery(id))`로 |
| 캐시하지 않는 것 | GP-5 · O-1 · viewer 쿼리(쿠키) · 다른 공개 화면(호스트 홈 · 선물 — 선물은 토큰이 키라 캐시 금지) |

**규칙과 충돌하는지**(설치본 `use-cache.md` · `cacheLife.md` 확인)

- **사용자별 값이 섞이지 않는다** — 서버 조회는 언제나 익명이다(`{ public: true }` → `credentials: 'omit'`, §4). 그래서 캐시 값은 모두에게 같은 "가린 연락처" 응답이다(#846). **서버 조회에 쿠키 · 토큰을 싣는 순간 이 캐시는 다른 사람의 연락처 원문을 내보낸다** — 캐시를 켤 때 `cached-public.ts` 머리에 이 경고를 적는다.
- **`cookies()` · `headers()`는 캐시 밖에서** — `requestOrigin()`(Host 헤더)은 지금처럼 캐시 밖에서 읽는다. 캐시 안에서 읽으면 `next build`는 통과하고 `next start`에서 실패한다(문서).
- **`instant = false`와 충돌 없음** — 검증 설정일 뿐이고 페이지는 여전히 `await params`로 요청마다 렌더한다. `revalidate` 10초 · `expire` 60초(5분 미만)라 프리렌더에서 빠지는 "동적 구멍"이 되어 빌드 때 채우려 하지도 않는다(`cacheLife.md`).
- **404 상태 코드** — `notFound()`는 지금처럼 캐시 밖 `serverQuery`가 부른다. 캐시 함수는 404를 값으로 돌려주지 말고 던진다. **던진 에러가 캐시되지 않는지는 문서에 적혀 있지 않다 — 켤 때 e2e로 확인**(없는 공연 → 404, 같은 id로 바로 공연 생성 → 10초 안에 200). 캐시되더라도 수명이 10초라 §2 위의 "등록 전 URL의 404가 남는 문제"는 10초로 줄어든다.
- **Suspense · `loading.tsx` 불필요** — 바뀌는 것은 queryFn 하나라 404 규칙(§2 위)과 무관하다.
- **저장소** — 기본 핸들러는 인스턴스 메모리 LRU다. 운영 `front` 컨테이너는 하나라(§25) 공유 저장소가 필요 없다. 배포하면 키(`deploymentId`)가 바뀌어 비워진다. 컨테이너를 늘리면 인스턴스마다 따로 채운다(그래도 초당 호출은 "인스턴스 수 / 10초"로 묶인다).
- **시간으로 바뀌는 값** — `displayStatus` · `dDay`가 최대 10초 늦게 바뀐다. 판매 가능 여부 · 잔여는 GP-5(캐시 안 함)가 정하므로 오픈 순간 [구매] 버튼이 늦게 켜지지 않는다.

### Cache Components를 켜 두는 이유

Cache Components는 Next 16의 기본 캐시·프리렌더 모델이다. 끄고 "이전 모델"로 갈 수도 있지만 켜 둔다.

- Next 문서와 가이드가 이 모델을 기준으로 쓰여 있다. 꺼 두면 문서를 볼 때마다 "Cache Components 없이" 쪽을 따로 찾아야 하고, 에이전트가 기본 문서를 따라 쓴 코드가 어긋난다.
- 프레임워크가 미는 방향에서 벗어나지 않는다. Pages Router를 버린 것과 같은 이유다.
- 호스팅 센터처럼 클라이언트에서 조회하는 화면은 빌드 때 만든 정적 셸이 나간다. 끄면 동적 경로(`/hosting/events/[eventId]/…`)를 요청마다 서버가 렌더한다.

켜 두는 대가로 규칙이 두 개 생긴다. 둘 다 어기면 빌드가 실패해서 조용히 넘어가지 않는다.

| 규칙 | 이유 |
|---|---|
| 서버 조회 라우트의 **`page.tsx`마다** `export const instant = false`를 둔다(`(public)/layout.tsx`에도 둔다) | **빈 정적 셸 검증과 즉시 이동 검증에서 뺀다**. 렌더 방식(요청마다 await해 내려 주는 것)은 바꾸지 않는다 — 검증 설정이다. 레이아웃의 `false`는 밖에서 그 레이아웃으로 **들어오는** 이동만 허용하고, 같은 레이아웃 아래 페이지끼리의 이동은 여전히 검증한다(설치본 문서 `instant.md` "Disabling instant"). P0 스파이크에서 레이아웃에만 두면 `next dev`가 "uncached data … outside of `<Suspense>`" 에러를 내고, 페이지에도 두면 사라지는 것을 확인했다(§31). 2회차 검토의 "레이아웃 한 곳" 결정을 되돌렸다 |
| 클라이언트 화면 묶음의 레이아웃에 `<Suspense>`를 둔다 | 클라이언트 페이지가 `useParams()`·`useSearchParams()`를 읽으려면 위에 경계가 있어야 한다. 없으면 빌드 에러 |

그리고 조용히 깨지는 것이 하나 있다. **서버 조회 라우트 위에 `<Suspense>`나 `loading.tsx`가 있으면 스트림이 먼저 시작돼 없는 공연이 404가 아니라 200으로 나간다**(Next 문서 `loading` #status-codes). 그래서 라우트 그룹을 나눈다(§3): 서버 조회 화면은 Suspense가 없는 그룹에, 클라이언트 화면은 Suspense가 있는 그룹에 둔다.

이 규칙의 근거는 끈 구성(§22)에서 확인한 것이다. 켠 구성에서는 Suspense가 없어도 브라우저 UA가 200이었으므로(§26) 이 규칙이 지키는 것은 크롤러 404다. **P0에서 {Suspense 유/무} × {카카오 UA/브라우저 UA} × {없는 공연/백엔드 5xx} 표를 채운다.** 크롤러가 Suspense와 무관하게 404라면 `(public)`/`(app)` 분리와 `loading.tsx` 금지를 없앨 수 있다. 5xx일 때 크롤러에 200 + 에러 화면이 나가면 카카오가 잘못된 미리보기를 캐시하므로 크롤러 계약(Playwright e2e, §10)의 검사 항목에 넣는다.

두 구성을 모두 돌려 봤다(§21·§22·§26).

| 항목 | 켬 (채택) | 끔 |
|---|---|---|
| 추가 코드 | `(public)` 레이아웃과 그 아래 `page.tsx`마다 `instant = false`, `(app)`·`hosting` 레이아웃 Suspense | 없음 |
| 호스팅 센터 동적 경로 | 정적 셸 | 요청마다 서버 렌더 |
| 실제 카카오 UA의 OG 위치 | `<head>` | `<head>` |
| 없는 공연의 상태 코드 | 크롤러 404, **브라우저 200**(화면은 not-found, `noindex` 포함) | 둘 다 404 |
| 요청마다 백엔드 호출(캐시 없음) | 확인 | 확인 |
| Next 문서와의 일치 | 기본 경로 | "이전 모델" 가이드 |

브라우저에 200이 나가는 것은 사용자에게는 차이가 없고(not-found 화면이 뜬다) 검색 엔진에는 `noindex`로 전달된다. 받아들인다.

### 카카오 미리보기 — 확인된 동작

App Router는 데이터 조회가 필요한 메타 태그를 `<head>`가 나간 뒤 `<body>`로 흘려 보낸다(스트리밍 메타데이터, Next 15.2~). Next는 내장 크롤러 목록에 있는 User-Agent에게만 `<head>`에 넣어 준다.

- 카카오 스크랩 서버의 UA는 `facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984`다(카카오 데브톡, 2021). `facebookexternalhit`이 내장 목록에 있어 **기본 설정으로 `<head>`에 들어간다**(캐시 없는 첫 요청에서 확인).
- `kakaotalk-scrap/1.0`만 보내면 `<body>`로 나간다. 테스트할 때 UA를 줄여 쓰지 않는다.
- 이 동작은 UA 문자열에 의존한다. **실제 카카오 공유 디버거로 확인하는 것을 P5b 완료 기준에 넣는다.**
- 없는 공연의 상태 코드는 `generateMetadata`와 페이지가 모두 `serverQuery`를 쓰고 `loading.tsx`가 없을 때, 켠 구성(채택)에서 크롤러 404 / 브라우저 200이다(§26). 끈 구성에서는 둘 다 404였다(§22). 켠 구성에서 브라우저가 200인 이유는 문서에서 찾지 못했다.

## 3. 렌더 전략과 라우트

원칙: **공개되고 공유되는 화면은 서버에서 조회해 렌더하고, 로그인 뒤 조작하는 화면은 클라이언트에서 조회한다.** 서버 컴포넌트는 라우트 파일에만 쓰고 화면 컴포넌트는 전부 클라이언트 컴포넌트다(§4). 서버 캐시는 없다(§2).

라우트 그룹으로 나눈다. 그룹 이름은 URL에 나오지 않는다.

```
app/
├─ (audience)/layout.tsx          관객 헤더·내비게이션(공통). 이동해도 다시 마운트되지 않는다
│  ├─ (public)/layout.tsx         export const instant = false(그 아래 page.tsx에도). Suspense·loading.tsx 없음
│  └─ (app)/layout.tsx            <Suspense>
│     └─ (protected)/layout.tsx   로그인 게이트
└─ hosting/layout.tsx             <Suspense> + 로그인 게이트 + 셸(데스크탑 상단 바 / 모바일 헤더)
   └─ events/[eventId]/layout.tsx 공연 스코프(GE-3) — 데스크탑 공연 사이드바(메뉴 항목), 모바일 공연 헤더(제목 ▾)
```

| 그룹 | 조회 | 레이아웃 |
|---|---|---|
| `(audience)` | — | 공통 헤더. 경로를 읽는 부분은 아래 "경로를 읽는 컴포넌트" 규칙을 따른다 |
| `(public)` | 서버(`<Prefetch>`) | Suspense·`loading.tsx` **없음**, `instant = false`를 레이아웃과 페이지마다 |
| `(app)` | 클라이언트 | `<Suspense>` |
| `(app)/(protected)` | 클라이언트 | 로그인 게이트(§4 인증) |
| `hosting` | 클라이언트 | `<Suspense>` + 로그인 게이트(P4a의 게이트 컴포넌트를 그대로 쓴다, P4s) + 셸. 셸은 아래 "호스팅 센터 셸" |

**경로를 읽는 컴포넌트.** Cache Components에서 `usePathname()`은 `generateStaticParams`가 없는 동적 파라미터 경로에서 suspend하고, 위에 Suspense가 없으면 빌드가 실패한다([Next 문서](https://nextjs.org/docs/app/api-reference/functions/use-pathname)). 그렇다고 children을 감싸는 Provider·레이아웃에 Suspense를 두면 `(public)` 서버 조회 라우트 위에 경계가 생겨 404가 200으로 굳는다(§2). 그래서 **`usePathname()`·`useSearchParams()`를 쓰는 컴포넌트는 children을 감싸지 않는 말단 컴포넌트로 두고, 형제 위치의 자체 `<Suspense>`로 감싼다.** 헤더의 활성 메뉴 표시, 경로가 바뀔 때 오버레이를 닫는 `<OverlayRouteReset />`(§5)이 여기에 해당한다. P0 상태 코드 표(§2)는 이 컴포넌트들을 넣은 최종 헤더로 채운다.

**호스팅 센터 셸(GUI 반영, 2026-10-15 → 2026-10-25 갱신).** GUI 화면 파일의 2026-10-25 "Ready for dev" 판 — PC 대시보드 6장·공연준비 홈 PC 4폭·기본 정보 PC 1장과 반응형 스펙([`gui-screens.md`](./gui-screens.md) §3) — 과 모바일 화면들(§2)을 따른다. 옛 `Desktop - 27`(사이드바 255 + 본문 + 우측 392, 사이드바에 "호스팅 홈"·"호스트" 섹션·사용자 줄)은 지워졌다. 화면 문구의 "호스팅 센터"는 "공연준비"로 바뀌는 중이다(문구만 — 라우트 `/hosting`은 그대로).

| 폭 | 셸 | 위치 |
|---|---|---|
| 데스크탑(1024 이상) | **전역 상단 바** `Top bar_Host`(높이 58): 왼쪽 로고 + "공연 둘러보기"(`/events`) · "공연 준비하기"(`/hosting`, 호스팅에서는 굵게), 오른쪽 **알림 벨** + 아바타 + 닉네임 ▾. 검색 없음 | `hosting/layout.tsx` — 모든 호스팅 화면 |
| | **공연 사이드바**(폭 268, 공연 안의 화면에만): "‹ 내 공연"(공연준비 홈으로) → 공연 카드(포스터 + 공연명 + "호스트명 · D-n") → 메뉴(등록 전 4개: 대시보드 · 기본 정보 · 상세 정보 · 티켓 관리 / 등록 후 6개: + 예매자 관리(숫자 배지) · QR 체크인) → 맨 아래 "공연 페이지 보기"(등록 후만, 공개 상세로). 공연 전환 메뉴는 없다("‹ 내 공연"으로 나가서 고른다) | `events/[eventId]/layout.tsx`가 GE-3(등록 상태별 항목)으로 채운다 |
| | 가운데 본문 fill(최소 572 ~ 최대 1261). **우측 일정 패널**(286 / 335 / 388 — 1024 / 1280 / 1440 구간별, GUI 기준 디자인은 1133 / 1280 / 1440)은 **등록 후 대시보드만**. 1024~1279도 3단 그대로다 | 우측 패널은 페이지가 슬롯으로 채운다 |
| | **공연 밖 화면**(공연준비 홈 등): 사이드바 없이 상단 바 + 본문. 본문 최대 1280(좌우 여백 40 · 40 · 80 — GUI 1133 · 1280 · 1440 프레임) | `hosting/layout.tsx` |
| 모바일(1024 미만) | 헤더(공연준비 홈은 로고 헤더 `host title` — 벨 자리가 없어 **알림 벨은 햄버거 드로어 안**에 둔다. 제목형 "호스팅 센터"(햄버거 없음 + 벨 + 아바타) 대안은 확인 대기(design-requests Q17). 공연 안에서는 햄버거 + "대시보드 ▾ / 공연명" + 벨) + **햄버거 드로어**에 같은 메뉴. 공연 안 메뉴를 드로어로 열지, 와이어 `487:16952`처럼 제목 ▾ 바텀시트로 열지는 design-requests Q37 대기(잠정: 햄버거 → 드로어, 제목 ▾ → 공연 전환) | 같은 레이아웃 파일들이 폭에 따라 상단 바·사이드바 또는 헤더를 그린다(둘 다 DOM에 두고 CSS로 하나만 보인다 — patterns §1) |

- 사이드바·헤더의 활성 메뉴 표시는 `usePathname()`을 쓰므로 **children을 감싸지 않는 말단 컴포넌트 + 자체 `<Suspense>`**(위 "경로를 읽는 컴포넌트")다.
- 경계값은 관객과 같은 1024다(사용자 결정 2026-10-31, design-requests Q38 닫힘) — GUI 스펙의 1133 경계 대신 1024 미만 모바일 / 1024 이상 데스크탑, 1024~1132는 GUI가 1133에서 그린 레이아웃을 쓴다. 우측 패널 폭은 1280 · 1440에서 바뀐다(GUI 스펙). 토큰은 `desktop: 1024` 하나다(§14).
- PC 화면이 있는 것은 대시보드·공연준비 홈·기본 정보(1440)뿐이다. 그 밖의 화면(상세 정보, 티켓, 예매자 표, QR)의 PC 배치는 디자인을 기다린다 — 그 전까지 사이드바 + 본문(우측 패널 없음, 기본 정보 PC `748:34006`과 같다)에 모바일 폼을 최대 폭으로 둔다. 스펙의 빈 곳은 design-requests Q39.
- 사이드바 메뉴 항목 컴포넌트는 GUI의 원격 `사이드바 메뉴`(`727:25256`~`727:25258` — `true` 선택 / `false` / `alert` 빨간 숫자 배지, 옛 `Component 1`)다. "예매자 관리" 배지 숫자의 뜻은 design-requests Q39(gui-screens §3 8번).

보호 경로를 목록으로 판정하지 않고 폴더로 나눈다. 게이트가 필요 없는 `/events`, `/login`, `/login/expired`, `/kakao/callback`은 `(protected)` 밖에 둔다.

| 라우트 | 그룹 | 인증 | 비고 |
|---|---|---|---|
| `/` | `(public)` | 불필요 | 공연홈(GP-1) |
| `/events/[eventId]` | `(public)` | 불필요 | 공연 상세(GP-3 + GE-5), `generateMetadata`. 잔여(GP-5)는 클라이언트 |
| `/hosts/[hostId]` *(제안)* | `(public)` | 불필요 | 호스트 홈(GH-3 + GH-14). 사용자별 값은 viewer 쿼리(§4) |
| `/gifts/[giftToken]` | `(public)` | 불필요 | 선물 랜딩(GG-3), `generateMetadata`. 백엔드 `linkPath`. 사용자별 판정은 viewer 쿼리(§4) |
| `/events` *(제안)* | `(app)` | 불필요 | 공연 리스트(GP-2). 필터는 URL 쿼리 |
| `/login`, `/login/expired`, `/kakao/callback` | `(app)` | 불필요 | |
| `/events/[eventId]/checkout` *(제안)* | `(protected)` | 필수 | 체크아웃(G11/O-0) |
| `/tickets` | `(protected)` | 필수 | 티켓탭. 카드·QR·전체화면은 내부 상태. v1의 `/ticket`에서 바꿨다 |
| `/check-in` | `(protected)` | 필수 | 셀프 체크인(PQ-5). 백엔드 `qrPath` |
| `/orders`, `/orders/[orderUuid]` | `(protected)` | 필수 | 주문내역·상세. v1의 `/history`에서 바꿨다. 주문 완료 화면도 여기다(`?created=1`) |
| `/mypage` | `(protected)` | 필수 | 마이페이지. 프로필 편집(닉네임·이미지)도 이 화면 안에서 한다 |
| `/mypage/following`, `/mypage/archive` | `(protected)` | 필수 | 관심 호스트, 관람 공연 아카이빙 |
| `/mypage/notifications` | `(protected)` | 필수 | 알림함. 호스팅 센터의 알림 벨도 여기로 온다(알림함은 하나다) |
| `/mypage/gifts` *(보류)* | `(protected)` | 필수 | 보낸·받은 선물 내역(GG-7). Figma에 화면이 있을 때만 만든다 |
| `/hosting/**` | `hosting` | 필수 | 호스팅 센터 전체. 경로는 [`directory-structure.md`](./directory-structure.md) |
| `/healthz` | — | 불필요 | Route Handler(`app/healthz/route.ts`). 배포 헬스체크용, 백엔드를 부르지 않는다. **Route Handler는 이것 하나다** |

**주문 완료 화면은 `/orders/[orderUuid]?created=1`이다.** 주문 생성 응답을 `setQueryData`로 G11/O-3 키에 미리 넣고 `replace`로 이동한다. 메모리에만 있는 응답으로 그리면 새로고침이나 배포 직후의 하드 리로드(`deploymentId`, [`deploy-plan.md`](./deploy-plan.md) §3)에서 계좌·금액 안내가 사라진다. 주소에 `orderUuid`가 있으면 G11/O-3으로 다시 그린다. `created=1`은 완료 문구와 안내를 보일지만 정한다.

**공개 화면의 이동 피드백.** `(public)`은 `loading.tsx`가 없어 카드를 눌러도 서버 응답이 올 때까지 화면이 그대로다. `src/ui`의 `<LinkProgress />`을 **카드 `<Link>` 안에 고정 크기 인라인 표시로** 넣는다(100ms 지연 뒤 페이드, 빠른 이동에서는 안 보이게). 상단 전역 진행 막대로는 만들 수 없다 — `useLinkStatus`는 `<Link>`의 하위 컴포넌트 안에서만 동작하고, 프리페치가 끝난 경로는 pending을 건너뛴다([Next 문서](https://nextjs.org/docs/app/api-reference/functions/use-link-status)). P5a에서 붙인다. `instant = false` 라우트로 가는 `<Link>` 프리페치는 문서상 동적 경로라 건너뛰거나 부분만 한다("Dynamic Route: prefetching is skipped, or the route is partially prefetched if `loading.tsx` is present"). 백엔드 조회가 일어나지 않는지는 P0에서 확인한다(일어나면 카드 수만큼 호출이 는다).

- *(제안)* 은 FE가 새로 정한 경로다.
- **화면 안 상태 중 주소에 남기는 것**: 새로고침·뒤로가기·알림에서의 진입이 필요한 것만 쿼리에 둔다.

  | 화면 | 쿼리 | 이유 |
  |---|---|---|
  | 공연 리스트 | `?keyword=&tagIds=&includePast=` | 필터 공유·복구 |
  | 체크아웃 | `?ticketItemId=&quantity=` | 상세에서 고른 티켓 전달 |
  | 간편 공연 만들기 | `?step=2` | 뒤로가기 |
  | 예매자 관리 | `?tab=orders\|tickets\|refunds` | 새로고침 시 탭 유지 |
  | 예매자 관리의 주문 상세 모달 | `?order={orderUuid}` | 호스트가 받은 주문 알림에서 바로 열기 |

  그 밖의 모달·바텀시트·티켓 카드 위치는 주소에 남기지 않는다.
- `/hosting/events/[eventId]`는 `dashboard`로 리다이렉트한다. 페이지 파일을 두지 않고 `next.config.ts`의 `redirects()`로 한다.
- 공연 관리의 `info`(기본 정보)·`detail`(상세 정보)은 화면 메뉴 이름을 따른 것이다. 백엔드 용어인 "섹션"은 주소에 쓰지 않는다.
- 관객용 헤더·내비게이션은 `(audience)` 레이아웃 하나에 있다. `(public)`과 `(app)`을 나눈 이유는 Suspense 유무뿐이다.
- 없앤 v1 라우트: `book/option`, `book/order`, `/pay/*`, `/history`(→ `/orders`), `/history/mycoupon`, `/ticket`(→ `/tickets`), `/ticket/[id]`, `/ticket/qr`, `/home`(→ `/`), `/admin/*`(→ `/hosting/*`).
- 클라이언트 컴포넌트도 빌드 때(정적 셸)와 서버 렌더 때 한 번 실행된다. `window`를 렌더 중에 만지는 것(에디터, QR 스캐너)은 `next/dynamic({ ssr: false })`로 감싼다.
- **클라이언트 조회 화면의 `useSuspenseQuery`가 서버에서 실행되는지 P0에서 확인한다.** Next 가이드는 Cache Components에서 클라이언트 컴포넌트도 프리렌더된다고 쓰고, 상위 표는 `useSuspenseQuery`를 "하이드레이션 뒤 브라우저 요청"으로 분류한다. 서버에서 돈다면 보호 API가 쿠키 없이 401을 받고 브라우저 전용 재발급 코드가 서버에서 돈다. 확인 기준: 프리페치 없는 `useSuspenseQuery` 페이지(`/tickets`, `/hosting/events/[id]/…` 형태)를 열 때 백엔드 접근 로그에 Next 서버발 호출이 0건. 보호 화면은 게이트가 세션 확정 전에 children을 그리지 않아 막힌다. **게이트가 없는 `(app)` 화면(`/events`, `/login/*`, `/kakao/callback`)은 결과와 상관없이 `useQuery`만 쓴다**(2회차에서 확정). P0 확인은 보호 화면에 대한 검증으로 남는다.

## 4. 데이터

### 조회 정의는 한 벌

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수를 따로 만들지 않는다.

```ts
// src/api/event/queries.ts — 개별 export, 이름은 {대상}Query / {동작}Mutation
export const eventDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ['events', id],
    queryFn: () => api.get(`events/${id}`, EventDetailSchema, { public: true }),   // 공개 GET(GP-3)
  });

export const eventTicketsQuery = (id: string) =>
  queryOptions({
    queryKey: ['events', id, 'ticket-items'],
    queryFn: () => api.get(`events/${id}/ticket-items`, TicketsSchema),
  });

// src/api/event/mutations.ts
export const updateEventBasicMutation = (eventId: string) =>
  mutationOptions({
    mutationFn: (body: UpdateEventBasicRequest) => api.patch(`events/${eventId}/basic`, EventManageSchema, body),
  });
```

### `api` 객체

**`src/api/client.ts`는 ky 인스턴스(v2·v1 인증)와 응답 래퍼 해제·에러 변환·401 가로채기를, `src/api/http.ts`는 그 위의 `api`·`authApi` 객체를 둔다.** `api` 객체는 "호출 → 응답 래퍼 해제 → zod 파싱"을 묶어 Promise를 돌려준다.

- **ky 인스턴스는 기준 주소 없이 만들고, `http.ts`가 요청마다 `prefix`를 넘긴다.** 브라우저는 `${location.origin}/api/v2`(또는 `/api/v1/auth`) — 같은 출처지만 ky의 `Request`가 절대 URL을 요구한다, 서버(`typeof window === 'undefined'`)는 호출 시점에 읽은 `process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v2'`다(§12). 인스턴스를 만들 때 주소를 고정하면 런타임에 읽는 env가 깨진다.
- **`ApiError.status`는 언제나 HTTP 상태다.** 본문이 JSON이 아니면(백엔드 재기동 중 nginx가 내는 HTML 502 등) `ApiError(res.status, 'NON_JSON', '')`를 던진다. 본문이 JSON이 아니면 `NON_JSON`, JSON이지만 래퍼 모양이 아니면(`null` 등) `BAD_ENVELOPE`, 스키마와 맞지 않으면 구조화 로그(경로·issue 경로, 값 없음) 후 `PARSE_ERROR`. 재시도는 5xx·네트워크 오류만이고 `PARSE_ERROR`는 재시도하지 않는다(§31). 재시도·일시 오류 판정이 전부 `status`에 기대므로, 파싱 실패가 `SyntaxError`로 새어 나가면 판정이 깨진다. Vitest 대상이다(§10).

| 메서드 | 용도 |
|---|---|
| `api.get(path, schema, options?)` | 조회. 공개 GET은 `{ public: true }`를 준다 — **항상 `credentials: 'omit'`로 보낸다**(쿠키를 싣지 않으므로 401 재요청이 없다. 사용자별 값은 viewer 쿼리가 따로 받는다) |
| `api.post / patch / put / delete(path, schema, body?, options?)` | 변경. 백엔드는 변경 응답으로도 값을 주므로 똑같이 파싱한다 |
| `api.download(path, params?)` | 파일(엑셀). 파싱하지 않는다 |

객체는 둘이다. `api`는 `/api/v2`, `authApi`는 v1 인증(`/api/v1/auth`: 로그인 콜백, 재발급, 로그아웃)이다. **회원 탈퇴(v1 `DELETE /api/v1/auth/me`)는 `authApi`가 아니라 `withSessionRecovery`로 감싼 호출이다**(`src/api/user/calls.ts` `withdrawAccount`, P9-L) — 같은 v1 인증 경로지만 보호 API라 만료 액세스 쿠키면 401이므로, `api` 객체처럼 `dd:session`이 있을 때 재발급 후 한 번 다시 보낸다. 재발급은 `authApi`(가로채기 없음)로 하므로 Web Lock 재진입은 없다. 같은 래퍼 해제·에러 변환을 쓴다. **`authApi`에는 401 가로채기(재발급·재시도)가 없다** — 재발급 호출이 다시 재발급을 부르면 같은 이름의 Web Lock을 다시 요청해 영원히 기다린다(같은 실행 컨텍스트의 같은 잠금 요청도 큐에 쌓인다, [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)).

- `queryOptions`/`mutationOptions`와 queryKey는 손으로 쓴다. 더 감싸지 않는다.
- queryKey는 경로를 쪼갠 모양으로 맞춘다(`events/123/sections` → `['events', '123', 'sections']`). 순서는 **리소스 → `'viewer'`(있으면) → `'infinite'`(있으면) → 파라미터 객체(마지막)**다. 예: `['hosts', id, 'events', 'viewer', 'infinite', { size }]`.
- `mutationOptions`에는 `mutationFn`만 둔다. `onSuccess`(캐시 반영, 토스트, 이동)는 화면마다 달라 화면에서 쓴다.
- 의존값이 없으면 `skipToken`(또는 `useQuery`의 `enabled`)을 쓰고, 파생 값은 호출부에서 `select` 옵션으로 만든다. 이를 위한 헬퍼는 두지 않는다.

**zod 파싱 정책**

| 대상 | 규칙 |
|---|---|
| 응답 enum | `src/api/shared/open-enum.ts`의 `openEnum(name, values)` **한 가지로만** 쓴다 — `z.string().pipe(z.enum([...values, 'UNKNOWN']).catch(() => 'UNKNOWN'))`. 문자열이지만 모르는 값은 `UNKNOWN`이 되고 enum 이름만 로그로 남긴다(같은 이름은 한 번만, 값은 남기지 않는다). 필드가 없거나 문자열이 아니면 계약 위반이라 파싱 실패(`PARSE_ERROR`)로 둔다. 리터럴 타입이 유지되고(`.or(z.string())`은 `string`으로 뭉개져 완전성 검사를 잃는다), 백엔드가 값을 하나 늘려도 화면의 `UNKNOWN` 분기까지 간다. 모든 enum 매핑에 `UNKNOWN` 분기를 둔다 |
| 응답 객체 | 기본 동작(모르는 키 제거). `.strict()`를 쓰지 않는다 |
| 파싱 실패 | 개발·운영 모두 구조화 로그(`api.parse_failed` — 요청 라우트 패턴과 zod issue의 경로만, 값은 넣지 않음)를 남기고 `ApiError(status, 'PARSE_ERROR')`를 던진다. 재시도하지 않는다 |
| 요청(폼) 스키마 | 엄격하게 둔다 |

### 서버에서 쓰기 — `<Prefetch>`

서버 컴포넌트는 **라우트 파일(`page.tsx`, `layout.tsx`)에만** 쓴다. 라우트 파일은 조회와 OG 태그를 맡고, 화면 컴포넌트는 전부 `'use client'`다.

```tsx
// app/(audience)/(public)/events/[eventId]/page.tsx
export const instant = false; // 페이지마다 둔다(레이아웃만으로는 그룹 안 이동이 검증된다 — §2)
export async function generateMetadata({ params }: Props) {
  const event = await serverQuery(eventDetailQuery((await params).eventId));
  return { title: event.name, openGraph: { title: event.name, images: [event.posterImageUrl] } };
}

export default async function Page({ params }: Props) {
  const { eventId } = await params;
  return (
    <Prefetch queries={[eventDetailQuery(eventId), eventSectionsQuery(eventId)]}>
      <EventDetailPage eventId={eventId} />     {/* 'use client' — useSuspenseQuery(eventDetailQuery(eventId)) */}
    </Prefetch>
  );
}
```

`src/api/server/`(`'server-only'`)에 두 가지가 있다.

| | 하는 일 |
|---|---|
| `serverQuery(options)` | `fetchQuery` + 백엔드 404 → `notFound()`. 5xx는 throw → `error.tsx` |
| `<Prefetch queries>` | `serverQuery`로 조회 → `dehydrate` → `HydrationBoundary`. **무한 목록은 받지 않는다** — 쓰는 곳이 호스트 홈 공연 목록(GH-14) 하나뿐이고 OG에도 필요 없다. 그 목록은 브라우저에서 `useInfiniteQuery`로 읽는다(3회차에서 `infiniteQueries`를 뺐다) |

- `generateMetadata`와 `Page`가 같은 쿼리를 불러도 조회는 한 번이다.
- **서버에서 도는 조회에는 토큰이 붙지 않는다.** 서버의 `fetch`에는 브라우저 쿠키가 자동으로 실리지 않는다. `src/api/server/`에서 `cookies()`를 읽지 않는 것이 규칙이다. (처음 근거였던 "공개 GET에 만료 토큰이 붙으면 401"은 백엔드 #792로 없어졌다 — 지금은 만료·위조 토큰이 붙어도 익명 200이다. 규칙은 그대로 둔다: 서버 조회는 언제나 익명 값이고 그 값을 공개 키에 둔다.)
- **v1과 다른 점(Front #365)**: v1 티켓 앱은 공연 상세 SSR(`getServerSideProps`)에서 쿠키의 액세스 토큰을 그 요청에만 `Authorization: Bearer`로 붙여 로그인 사용자에게 첫 HTML부터 연락처 원문을 그린다(Front #365, 백엔드 Develop 기획서). v2는 서버 조회를 익명으로 두고, 사용자별 값만 아래 viewer 쿼리로 브라우저에서 읽는다(A안, 2026-10-25 사용자 결정).
- **사용자별 값은 별도 쿼리(viewer)로 받는다.** 서버가 토큰 없이 받은 값과 브라우저가 쿠키로 받은 값을 같은 queryKey에 두면, 첫 진입에 익명 값으로 조작 가능한 화면(빈 ♡, 보낸 본인에게 수락 버튼)이 먼저 뜨고, 다시 들어올 때 서버가 내려 준 익명 데이터가 캐시의 인증 데이터를 덮는다. 그래서 키를 나눈다.

  | 쿼리 | 키 | 조회 | 화면이 읽는 것 | 확정 전 대기 영역 |
  |---|---|---|---|---|
  | `hostDetailQuery(id)` | `['hosts', id]` | 서버 프리페치, `staleTime` 30초 | 공개 필드(이름·소개·이미지·`memberCount`·`createdAt` 등). **`contacts`는 공개 필드가 아니다** — 비로그인 값은 전화·이메일이 가려져 있다(#846) | — |
  | `hostViewerQuery(id)` | `['hosts', id, 'viewer']` | 같은 엔드포인트, 프리페치 안 함, 세션이 있을 때만(`enabled`), `staleTime` 0 | `myRole`, `isFollowing`, **`contacts`**(로그인 사용자 원문 — 추가 요청 없이 이 응답에서 읽는다) | 팔로우·설정·멤버 버튼 자리(비활성 자리표시). 연락처는 viewer 확정 전·실패 동안 공개(가린) 값 + `status` `pending`·`error` |
  | `eventDetailQuery(id)` / `eventDetailViewerQuery(id)` | `['events', id]` / `['events', id, 'viewer']` | GP-3. 공개는 서버 프리페치. viewer는 쿠키, 프리페치 안 함, `staleTime` 0, **연락처 시트가 열리고(`open`) 세션이 있을 때만** 요청 | viewer: `contacts`만(`useEventContacts`). 나머지 필드는 공개 키 | 연락처 시트 안 목록. 익명이면 요청 없이 공개(가린) 값. 한 번 받은 원문은 시트를 닫아도 유지 |
  | `eventDetailViewerQuery(id)` — 주문상세 호스트 문의 | `['events', id, 'viewer']` | GP-3 viewer만. **문의 시트를 열 때만**(`open`) + 세션이 있을 때, `useQuery`. 공개 GP-3(`eventDetailQuery`)은 읽지 않는다. 삭제된 공연(`eventId` null)이면 요청 없음 | `contacts`만(`useOrderHostContacts`, P9-L) | 보호 화면이라 게이트가 세션을 확정한 뒤에만 그려진다 — 공개 값으로 먼저 그릴 일이 없다(공개 값 자리는 빈 목록, `resolveContacts`) |
  | `hostEventsQuery(id)` / `hostEventsViewerQuery(id)` | `['hosts', id, 'events', 'infinite', params]` / `['hosts', id, 'events', 'viewer', 'infinite', params]` | GH-14. 둘 다 브라우저 `useInfiniteQuery`(프리페치 안 함). 공개는 `{ public: true }`, viewer는 세션이 있을 때만 | 공개: 공개 공연. viewer: 멤버에게만 보이는 준비중 공연 포함 목록 | 세션·viewer가 확정된 뒤 둘 중 하나로 **한 번만** 읽는다(patterns §4-2 — 공개 목록을 그렸다가 바꾸지 않는다). viewer·세션 확인이 실패하면 공개 키로 읽는다(P5c-L 구현) |
  | `giftLandingQuery(token)` / `giftLandingViewerQuery(token)` | `['gifts', token]` / `['gifts', token, 'viewer']` | 같은 방식 | viewer: `isReceiver`, 사용자에 따라 달라지는 `viewState`(`OWN_LINK` 등) | **상태 영역 전체**를 스켈레톤으로 둔다. 공개 값으로는 OG와 공연 요약만 그린다(`viewState`가 화면 전체를 정하므로 버튼만 막으면 깜빡인다) |

  - 사용자에 따라 달라지는 버튼(팔로우, 설정·멤버, 선물 수락·거절)은 viewer 쿼리가 확정되거나 익명이 확정된 뒤에만 활성화한다. 그 전에는 비활성 자리표시를 그린다.
  - **익명이 확정되면 이 버튼들은 요청을 보내지 않고 `/login?redirect=현재 경로`로 가는 링크다.** 익명 사용자가 보호 액션을 눌러 401 → 재발급 → 새로고침으로 이어지지 않게 한다.
  - 변경(팔로우 PH-13, 선물 수락 등)의 `setQueryData`·무효화 대상은 viewer 키다. 같은 필드가 공개 키에도 있으면 공개 키도 `invalidateQueries`한다. GH-3의 `followerCount`는 응답에 있지만 화면에 보이지 않으므로(기획서 F4) 팔로우 뒤 공개 키를 무효화하지 않는다.
  - viewer 쿼리는 세션(GM-1) 확정을 기다리므로 GM-1 → viewer가 직렬이다. 받아들인 비용이다.
  - 비용은 로그인 사용자에 한해 같은 엔드포인트 1회 추가 호출이다(공연 상세는 연락처 시트를 열 때만).
  - **연락처(A안, 2026-10-25 사용자 결정)**: 연락처는 사용자별 값이다(백엔드 #846 — GP-3·GH-3는 비로그인에게 `PHONE`·`EMAIL` 값을 `010-****-5678`·`ab***@gmail.com`으로 가린다). 서버 조회는 그대로 토큰 없이 하고, 로그인 사용자는 쿠키로 다시 읽은 값의 원문을 쓴다 — 공연 상세는 시트를 열 때 `eventDetailViewerQuery`, 호스트 홈은 이미 부르는 `hostViewerQuery`. 화면은 `ContactsState`(`{status: idle|pending|ready|error, items, masked}`)를 받고 공개 `contacts`를 직접 그리지 않는다. **가린 값(`PHONE`·`EMAIL`에 `*`)은 링크로 만들지 않는다**(`contact-link.ts` `isMaskedContact` → `href: null`). 알려진 한계: 원문 이메일 아이디에 `*`가 있으면 가린 값으로 오판한다(백엔드가 가림 여부를 따로 주지 않는다). 비로그인에게 가린 값을 그대로 보일지 "로그인하면 볼 수 있어요"로 안내할지는 design-requests Q41.
  - **미확인 구간(#792)**: 만료된 액세스 쿠키로 viewer를 부르면 이제 401이 아니라 익명 200(가린 값)이 와서 재발급이 일어나지 않는다. 연락처는 `masked: true`인 `ready`가 된다. 쿠키 만료 = 토큰 수명이라 만료 쿠키는 보통 사라져 있고(→ 401 `AUTH_401_2` → 재발급), viewer는 GM-1 확정 뒤에 돌지만, GM-1 `staleTime` 5분 안에 액세스가 만료된 경우가 실제로 생기는지는 확인하지 않았다. 선물 랜딩 viewer(`isReceiver`)도 같다(PR #792 본문 "로그인 여부가 결과를 바꾸는 화면은 진입 전에 재발급").
- 그 밖의 서버 조회 쿼리는 넘겨받은 직후 다시 조회하지 않게 `staleTime` 30초를 준다.
- **`(public)` 화면에서 프리페치하지 않은 쿼리(GP-5 잔여, viewer 쿼리 등)는 `useQuery`만 쓴다.** 그 그룹에는 Suspense가 없어 `useSuspenseQuery`를 쓰면 화면 전체가 멈춘다.
- **서버 조회 라우트 위에는 `<Suspense>`도 `loading.tsx`도 두지 않는다.** 경계 안에서 `notFound()`가 불리면 상태 코드가 200으로 굳는다. `(public)` 그룹을 따로 둔 이유다(§2·§3).

### 브라우저에서 쓰기

- `api` 객체가 응답 래퍼 `{success, status, data, timeStamp}`를 벗기고 실패를 `ApiError{status, code, reason}`로 바꾼다.
- 변경 응답이 "화면을 다시 그릴 값"이므로 `setQueryData`로 바로 반영한다.
- 클라이언트 조회 화면의 데이터 경계는 `src/ui`의 `<AsyncBoundary>`(에러만이면 `<ErrorBoundary>`)로 쓴다. **`@suspensive/react`의 `ErrorBoundary`·`Suspense`를 감싼 것**에 TanStack `QueryErrorResetBoundary`를 붙여, [다시 시도](`reset`)가 실패한 쿼리를 다시 조회한다(2026-10-31). 잡을 에러는 `shouldCatch`, 세션 상실 대기는 `holdOn`, 섹션 묶음 재시도는 `ErrorBoundaryGroup`. 어디에 경계를 두나는 patterns §4-3.
- **변경 에러는 호출 쪽이 처리한다**(2026-10-31, TanStack 문서·TkDodo 권장과 같다). `mutateAsync`를 **try/catch**로 부르고 catch에서 `handleError(error, { 코드: 처리 })`. 요청을 연달아 보내며 단계마다 실패를 다르게 다룰 때만 Go 스타일 `tryCatch(promise)` → `[data, error]`(`src/utils/try-catch.ts`)를 쓴다. 화면이 사라져도 꼭 해야 하는 캐시 반영·무효화만 `useMutation` 옵션의 `onSuccess`에 둔다(옵션 콜백은 컴포넌트가 언마운트돼도 돈다).

```tsx
const queryClient = useQueryClient();
const mutation = useMutation({
  ...updateEventBasicMutation(eventId),
  // 꼭 실행할 캐시 반영만 — 화면 반응(안내·이동·칸 오류)은 두지 않는다
  onSuccess: (updated) => queryClient.setQueryData(eventManageQuery(eventId).queryKey, updated),
});

const save = async (values: Values) => {
  try {
    await mutation.mutateAsync(toBody(values));
    router.replace(next);                                              // 성공 뒤 화면 반응은 여기
  } catch (e) {
    handleError(e, { Event_400_9: () => setError('title', …) });       // 표에 없으면 공용 토스트
  }
};

// 연쇄 — 단계마다 실패 처리가 다를 때만 tryCatch
const [created, createError] = await tryCatch(createMutation.mutateAsync(body));
if (createError) return handleError(createError, { … });
const [, attachError] = await tryCatch(attachMutation.mutateAsync(created.id));
if (attachError) return handleError(attachError, {}, { otherwise: () => setPartial(true) });
```

### QueryClient

Next 문서의 TanStack Query 가이드(`node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`)를 따른다. **provider 구성은 가이드대로이고, 프리페치는 변형이다.** 가이드는 pending 쿼리를 await 없이 dehydrate해 Suspense로 흘려 보내지만, 이 설계는 404 상태 코드와 OG 때문에 await해서 다 받은 뒤 내려 준다(블로킹). `queryFn`도 서버·브라우저가 같은 것을 쓴다.

| 위치 | 방법 |
|---|---|
| 루트 `Providers` | 파일 안의 `getQueryClient()`로 만든다 — 서버 렌더에서는 매번 새 것, 브라우저에서는 하나를 재사용 |
| 화면 컴포넌트 | `useQueryClient()` 훅 |
| 서버(`<Prefetch>`, `serverQuery`) | 요청마다 새 QueryClient. 같은 요청 안의 `generateMetadata`와 페이지가 같은 것을 쓰도록 React `cache`로 묶는다 |

모듈에서 `new QueryClient()`를 상수로 export하지 않는다. 클라이언트 컴포넌트도 서버에서 한 번 렌더되므로 상수는 서버에서 모든 요청이 공유하게 된다.

같은 가이드가 권하는 것 중 이 설계가 따르는 것: 서버와 클라이언트가 같은 queryKey·`queryOptions`를 쓴다, 서버가 넘긴 데이터가 마운트 직후 다시 조회되지 않게 `staleTime`을 준다, 변경 응답으로 브라우저 캐시를 갱신한다(`setQueryData`). 서버 캐시가 없어 서버 쪽에 할 일은 없다.

**기본 옵션**(P3에서 이대로 만든다)

| 옵션 | 값 | 이유 |
|---|---|---|
| query `retry` | 5xx와 네트워크 오류에서만 1회 | 기본값(3회 백오프)이면 400·401·403·404도 재시도해 에러 화면이 수 초 늦고 401 재발급과 겹친다 |
| mutation `retry` | 0 | 변경은 재시도하지 않는다 |
| 서버 프리페치 쿼리 `staleTime` | 30초 | 넘겨받은 직후 다시 조회하지 않게. Next 가이드 예시도 30초 |
| 조작 화면 쿼리 `staleTime` | 0(기본) | 최신이 중요하다. 태그 목록처럼 잘 안 바뀌는 것만 길게 준다 |
| viewer 쿼리 `staleTime` | 0 | 위 표 |
| 세션 쿼리(GM-1) `staleTime` | 5분. `refetchOnWindowFocus`는 켠다 | 헤더·게이트·햄버거·체크아웃 입금자명이 마운트될 때마다 다시 조회하지 않게. 포커스 재조회는 stale일 때만 일어나므로(TanStack `queryObserver.shouldFetchOn`) 5분 안에는 다시 부르지 않는다. 다른 탭의 로그아웃·계정 전환은 `storage` 이벤트로 따로 잡는다(인증 표). 로그인·로그아웃·프로필 수정 뒤에는 명시적으로 갱신한다 |
| 폼 화면 | RHF는 `defaultValues`로 한 번만 초기화한다 | `refetchOnWindowFocus`로 쿼리가 다시 와도 편집 중인 값을 덮지 않는다 |
| 전역 `QueryCache.onError` | 구조화 로그. 토스트는 **`query.state.data !== undefined`(배경 재조회 실패)일 때만**. 무한 목록의 다음 페이지 실패(`fetchNextPage`)는 제외하고, 토스트 id를 고정해 여러 쿼리가 한꺼번에 실패해도 하나만 띄운다 | 첫 로딩 실패는 `<AsyncBoundary>`나 공용 403·404 화면이 맡는다. 다음 페이지 실패는 목록 하단 재시도가 맡는다(patterns §12) |
| 전역 `MutationCache.onError` | **구조화 로그만**(2026-10-31). 토스트·안내는 호출 쪽 `handleError`가 한다 | 전역이 토스트하면 화면이 맡는 코드를 미리 알려야 해서(`meta.handledCodes`) 목록과 분기가 두 곳에 갈렸다. 호출 쪽 처리로 바꿔 한 곳(`handleError`의 표)에만 쓴다 |
| 변경 호출 try/catch + `handleError`(`src/api/handle-error.ts`) | 기본은 try/catch. 연쇄(단계별 실패 처리)만 `tryCatch(promise)` → `[data, null] \| [null, Error]`(`src/utils/try-catch.ts`, 절대 throw 안 함, Error가 아니면 감싸고 `cause`). `handleError(error, 표?, { otherwise? })`: 세션 상실 → 아무것도 안 함, 표에 코드가 있으면 그 처리, `otherwise`가 있으면 그 처리, 아니면 **공용 토스트**(`reason`, 비면 — 네트워크·타임아웃·파싱 실패 — 고정 문구, 검증 실패 400 `BAD_REQUEST`는 `VALIDATION_ERROR_MESSAGE`, id `mutation:<코드>`) | try/catch가 가장 흔한 모양이라 기본으로 둔다(2026-10-31 사용자 결정 — 처음 만든 결과값 유틸 `settle`은 TanStack 관례가 아니라 뺐다). 연쇄에서 try/catch를 겹치면 단계별 처리가 흐려져 그때만 `tryCatch`. try 블록 안 성공 후속 코드가 throw하면 catch로 가 공용 토스트가 뜨니 후속은 짧게 둔다. `otherwise`는 표에 없는 실패도 화면이 맡는 곳(무료 선착순 확정 실패, 셀프 체크인 결과, 마케팅 설정 실패 문구). 로그는 전역이 이미 남겨 다시 남기지 않는다 |
| eslint(`no-restricted-syntax`, 테스트·스토리 제외) | `useMutation` 옵션의 `onError`/`onSettled`, try 블록 안도 `tryCatch(...)` 인자도 아닌 `mutateAsync`(catch 블록 안도 금지), `mutate`(호출·구조분해) 금지 | 처리 누락을 정적으로 막는다. **예외 하나**: 낙관 갱신 되돌리기(`onMutate`에서 바꾼 캐시를 `onError`에서 되돌림)는 화면이 사라져도 해야 하므로 옵션에 두고 `eslint-disable-next-line`에 이유를 쓴다(알림 읽음) |
| `SessionLostError` | 토스트·에러 화면 모두 무시한다 | 세션 상실이면 `client.ts`가 `ApiError`의 하위 클래스인 이 에러를 던진다. 이동·다시 그리기가 결과를 보여 주므로 하드 이동 직전에 토스트나 에러 화면이 깜빡이지 않게 Query/MutationCache `onError`, `handleError`, `<AsyncBoundary holdOn={isSessionLost}>`, 게이트가 이것을 거른다 |

`<Prefetch>`, `serverQuery`, 토큰 미전송, 404 처리는 구현해 돌려 확인했다(§22·§26). ky 2.x의 기본 URL 옵션은 `prefix`/`baseUrl`이고, 에러 변환은 훅이 아니라 `api` 객체 안에서 한다.

### 인증

**P4a 구현 기록(2026-10-21)** — 아래 규칙대로 구현했고, 위치·세부는 이렇게 정했다.
- `dd:session`·`dd:refreshedAt`(`src/api/session-flag.ts`)과 재발급 조정(`src/api/auth-handlers.ts` — 단일 비행, Web Locks, 결과 판정)은 `src/api`에 둔다. `client.ts`의 401 처리가 읽어야 하는데 `api`는 `features`를 import할 수 없다. `features/shared/auth`는 재발급 HTTP 호출(`authApi`)과 `onSessionLost`만 등록한다.
- 보호 영역 판정은 경로가 아니라 **마운트된 `LoginGate` 수**(`useProtectedArea`)로 한다. React 밖(`onSessionLost`·`storage`)에서도 쓸 수 있다.
- GM-1은 세션 상실에 `null`을 돌려주지만, 게이트는 상실이 이미 시작됐으면 `/login`으로 보내지 않는다(`/login/expired` 하드 이동과 경합 방지).
- 재발급 뒤 다시 보낸 요청이 또 401이면 반복하지 않고 그대로 던진다(GM-1은 `null`).
- 잠금 대기가 끊기면 `ApiError(0, 'TIMEOUT')` — 일시 오류와 같은 규칙.
- `storage`에서 플래그가 없다가 생기면: 이 탭이 이미 세션이면 값만 받아들이고, 익명으로 그려져 있으면 새로고침.
- `hosting/layout.tsx`에도 게이트를 붙였다(P4s 셸이 그 안에 들어간다).
- `safeRedirect`는 `/login*`·`/kakao/callback`(되돌이)·공백·제어 문자·2048자 초과도 거부한다. `loginHref('/')`는 `redirect`를 붙이지 않는다.

**P4b-L 구현 기록(2026-10-22)** — 백엔드 `24aa595`의 `AuthController`·`OauthStateHelper`·`KakaoRedirectPolicy`·`CookieHelper`를 읽고 맞췄다.
- 콜백 경로 `(app)/kakao/callback`(백엔드 `{출처}/kakao/callback`). 흐름: 링크 발급 → 카카오 → 코드 교환(`state` 전달) → `register/valid` → 기존이면 로그인, 신규면 `info`로 프로필을 받아 가입 폼 → `register`. 가입이 `USER_400_1`(이미 가입)이면 같은 id 토큰으로 로그인한다.
- **돌아올 주소는 `sessionStorage`(`dd:loginRedirect`)에 보관한다.** `redirect_uri`는 카카오 콘솔에 등록한 고정 주소라 쿼리를 붙일 수 없고, `state`는 백엔드가 만들어 쿠키와 비교하는 값이라 FE가 내용을 넣을 수 없다. 저장·꺼낼 때 모두 `safeRedirect`.
- **성공 이동은 `location.replace`**(문서의 `assign`에서 바꿈). 쓴 인가 코드가 든 콜백 주소가 기록에 남으면 뒤로가기가 코드를 다시 교환해 `KOE320`으로 실패한다. `AUTH_400_1` 재시작·동의 취소도 replace. 같은 인가 코드는 모듈 단위로 한 번만 교환한다(개발 StrictMode의 effect 두 번 대비).
- 실패 판정 `classifyAuthFailure`: `USER_403_1` → 정지 안내, `AUTH_400_1` → 처음부터, 그 밖(401 포함) → 일반 실패 `failed`. 예전의 HTTP 401 → "잠시 후 다시" 분기(B6)는 #792로 원인이 없어져 2026-10-25 지웠다(링크 발급·가입 제출도 같다). 카카오 `error=`(동의 취소)·코드 없음 → 로그인 화면. 이 흐름은 mutation·전역 토스트를 쓰지 않고 화면 상태로만 보인다.
- 로그인 응답(`TokenAndUser`)은 검사하지 않는다(`z.unknown()`) — 쿠키는 이미 세팅됐는데 쓰지 않는 필드 모양 때문에 `PARSE_ERROR`로 로그인이 실패하지 않게.
- 가입 동의: 이용약관·개인정보 필수 + 마케팅 선택(`marketingAgree`). 이름·이메일·전화번호는 고칠 수 있다(카카오 값이 비어 올 수 있다) — design-requests Q25. **2026-10-25 추가**: 동의 항목은 v2 계획 그대로다(v1 운영 가입 화면 — 만 14세·이용약관 필수, 처리방침은 안내 — 은 참고, legal-copy B-3·B-4). 백엔드 계약상 본문이 받는 `termsAgreed`·`ageOver14Confirmed`·`agreementVersion`(#840·#850) 중 **v2는 `termsAgreed`만 보낸다**(2026-10-25 구현) — 이용약관을 체크했으면 `termsAgreed: true` + `agreementVersion: '2026-10'`, 아니면 두 키 모두 없다(`agreementFields`, `src/api/shared/agreement.ts`). 만 14세 확인 칸은 v2 계획에 없어 `ageOver14Confirmed`는 보내지 않는다(design-requests Q42 — 동의 강제가 켜지면 가입이 400 → 일반 실패). 칸 없이 `true`를 만들지 않는다.
- 인증 호출 정의(`refreshTokens`·`requestLogout`·카카오 6종)는 `src/api/auth/calls.ts`. 등록은 여전히 `registerAuth`·`useLogout`.

- API는 프론트와 같은 출처(`/api/v2/…`)다. 브라우저는 같은 출처(`${location.origin}/api/v2`)로 부르고, 서버에서 도는 조회는 `http://localhost:8080/api/v2`로 부른다(§25).
- 인증 API는 v1 그대로다. 서버는 `Authorization: Bearer`를 먼저 보고 없으면 액세스 토큰 쿠키를 읽는다.
- **JS로 토큰 쿠키를 읽지 않는다.** 브라우저 요청은 쿠키 자동 전송(`credentials: 'include'`)에 맡긴다. 백엔드가 쿠키를 HttpOnly로 바꾸는 전제 조건이다.
- **로그인 게이트는 브라우저에서 한다. `proxy.ts`는 두지 않는다.** 서버에서 쿠키 유무로 막지 않는 이유는 운영 쿠키가 `SameSite=Strict`라 외부 링크로 들어온 첫 요청에는 쿠키가 실리지 않기 때문이다(§25). 공개 화면 앞에 인증 처리가 끼지 않는다는 이점도 있다.
- **토큰 쿠키는 백엔드가 세팅한다.** 로그인·재발급 응답에 `Set-Cookie`로 액세스·리프레시 토큰이 함께 온다(만료 시간 = 토큰 수명). 본문에도 같은 값이 있지만 FE는 쓰지 않는다. FE가 쿠키를 쓰는 코드는 없다(백엔드 코드에서 확인, §23).
- **리프레시 토큰은 로그인(기기)마다 따로 있다**(백엔드 #807, 2026-10-25 — 그 전엔 사용자당 하나라 다른 기기 로그인이 이쪽 세션을 끊었다, §23·B1 해결). 재발급은 같은 세션을 회전하고, 직전 토큰은 30초 동안 다시 써도 된다. 사용자당 세션 10개를 넘으면(새 로그인 때) 마지막 발급이 가장 오래된 세션이 끊긴다(`RefreshTokenAdaptor` @432cce4).

**401 처리 규칙.** 액세스 토큰 쿠키는 토큰과 같이 만료되므로, 만료 뒤의 요청은 "만료 토큰"(`AUTH_401_1`)이 아니라 "토큰 없음"(HTTP 401 `AUTH_401_2` — #808 전엔 `AUTH_403_2`)으로 간다. 그래서 재발급 조건을 코드로 가리지 않고 HTTP 상태로 본다.

| 상황 | 처리 |
|---|---|
| 세션 표시 `dd:session` | `localStorage`에 **로그인할 때마다 새로 만드는 무작위 값**을 둔다. 값이 있으면 "세션이 있었다", 값이 바뀌면 "다른 세션"이다. 로그인 성공·GM-1 성공(값이 없을 때) 때 세우고 세션 상실·로그아웃 때 지운다. 저장소 접근이 실패하면 "없음"으로 본다 |
| **`dd:session`이 없을 때의 401** | 요청 종류와 상관없이 재발급도 `onSessionLost`도 없이 `ApiError(401)`로 던진다. 익명 방문자의 GM-1 한 번이 401 → 잠금 → 재발급 403까지 3~4건으로 늘어나지 않고, 익명 사용자의 보호 액션이 새로고침으로 이어지지 않는다 |
| `dd:session`이 있을 때 보호 요청(`api`)의 401(코드 무관) | 재발급을 한 번 시도 → 성공하면 원래 요청을 재시도, 세션 상실이면 `SessionLostError`, 일시 오류면 **재발급 응답의 에러**(5xx·네트워크)를 던진다 — 원래 요청의 401을 던지면 기본 retry(5xx·네트워크만)가 적용되지 않는다 |
| 재발급 직렬화 | `navigator.locks.request('dudoong-auth-refresh', { signal: AbortSignal.timeout(15000) }, …)`로 탭 사이에서도 한 번에 하나. 잠금 대기가 15초를 넘겨 abort되면 일시 오류다(잠금을 쥔 탭이 멈춰도 다른 탭이 무한히 기다리지 않게). 잠금 안에서 `localStorage`의 `dd:refreshedAt`이 **원래 요청을 보낸 시각보다 뒤면** 다른 탭이 이미 갱신한 것이므로 재발급 없이 바로 재시도한다. 아니면 `authApi`로 `POST /api/v1/auth/token/refresh`를 부르고(타임아웃 10초), 성공하면 `dd:refreshedAt`을 기록한다 |
| Web Locks가 없을 때 | 탭 안의 동시 요청만 하나로 묶는다. 재발급이 403이어도 그 사이 `dd:refreshedAt`이 바뀌었으면(다른 탭이 먼저 교체) 세션 상실로 보지 않고 원래 요청을 한 번 재시도한다. 백엔드가 재발급 때 리프레시 토큰을 교체하므로 필요하다(#807 뒤로는 직전 토큰을 30초 동안 다시 쓸 수 있어 동시 재발급 자체가 대부분 성공한다 — 이 경로는 남겨도 해가 없다) |
| 재발급 결과 판정 | 2xx = 성공. **429·408을 뺀 4xx = 세션 상실, 재시도 없음** — 401(코드 무관), 403(`AUTH_403_1`, 정지 계정의 `USER_403_1`), 사용자 없음 `USER_404_1`, 400. **429 `GLOBAL_429_1`(과도한 요청)·408(요청 타임아웃)은 일시 오류** — 토큰을 보기 전에 끊긴 응답이다. 백엔드 `ThrottlingInterceptor`는 재발급에도 걸린다 — 재발급은 늘 유효한 액세스 토큰 없이 나가 IP 버킷을 쓰고, 2.5.2(#895, 2026-10-31 B21 답)부터 비로그인 재발급·로그아웃은 **인증 전용 IP 버킷(분당 600, env `RATE_LIMIT_AUTH`)**이라 다른 비로그인 요청(분당 60 — 운영·스테이징 모두 기본값)과 따로 센다. 공연장 Wi-Fi 같은 공유 NAT에서 몰릴 일은 크게 줄었지만 상한은 남아 있어, 리프레시 토큰이 살아 있는데 429로 로그아웃되면 안 된다는 처리는 그대로 둔다(api-contract §9). 예전의 "401 `AUTH_401_1`·`GLOBAL_401_1`(낡은 액세스 쿠키)이면 한 번 더"는 #792로 재발급이 `permitAll` 익명이 돼 2026-10-25 지웠다. **5xx·네트워크 오류·타임아웃·잠금 abort = 일시 오류** — 세션은 유지한다(백엔드 재기동 중 배포마다 로그인 사용자 전원이 튕기지 않게) |
| `authApi` | 401 가로채기가 없다(재발급이 재발급을 부르는 교착 방지). 응답을 위 판정대로 해석한다 |
| 세션 쿼리(GM-1)의 결과 | 세 가지다. **세션**(2xx) / **`null`**(`dd:session` 없는 401, 또는 재발급이 세션 상실) / **throw**(GM-1 자체의 5xx·네트워크, 또는 재발급 일시 오류) |
| 공개 GET | `{ public: true }`는 항상 `credentials: 'omit'`. 401이 오지 않는다 |
| 이동 | `src/api`는 이동하지 않는다. 이동은 게이트와 `onSessionLost`가 한다 |
| 게이트 | 세션이 확정된 뒤에만 children을 렌더한다. pending이면 스켈레톤. **error면 children 대신 전체 화면 재시도**(`<AsyncBoundary>`의 재시도 UI)를 그리고 이동하지 않는다. 익명(`null`)이면 항상 `/login?redirect=…`. `/login/expired`는 `onSessionLost`만 보낸다 |
| `onSessionLost` | 모듈 플래그로 **한 번만** 실행한다(동시에 401을 받은 요청 N건이 N번 부르지 않게). `queryClient.clear()` → `dd:session` 제거 → `(protected)`·`/hosting`이면 `location.assign('/login/expired?redirect=' + 현재 경로)`, 그 밖(공개 화면, `/events`, `/login`)이면 `location.reload()` — 익명으로 볼 수 있는 화면에서 사용자를 내보내지 않고 같은 주소를 익명으로 다시 그린다 |
| 다른 탭의 로그아웃·계정 전환 | 루트에서 `window`의 `storage` 이벤트를 듣는다. `dd:session`이 사라지거나 값이 바뀌면 `queryClient.clear()` 후 `(protected)`·`/hosting`이면 `location.assign('/login?redirect=…')`, 그 밖이면 `location.reload()`. 공개 화면은 `credentials: 'omit'`라 401이 오지 않고 세션 쿼리도 5분 동안 다시 부르지 않으므로, 이게 없으면 다른 탭에 이전 사용자 화면이 남는다 |
| 뒤로가기 캐시(bfcache) | 루트의 `pageshow` 핸들러가 `event.persisted`이고 `dd:session` **값**이 페이지 로드 때와 다르면 `location.reload()`한다. 값으로 비교하므로 A 로그아웃 → B 로그인 뒤 뒤로가기도 잡는다(불린이면 둘 다 "있음"이라 놓친다). Chrome은 인증 상태가 바뀌면 bfcache에서 내보낸다고 문서화했으므로 실제로 막는 대상은 주로 Safari 계열이다 |
| 로그아웃 | `authApi` 로그아웃을 부르고 **응답과 상관없이(5xx·네트워크 포함)** 로컬 정리(`clear`, `dd:session` 제거) 후 `location.assign('/')`. 백엔드는 언제나 200 + 쿠키 삭제이고 리프레시 쿠키로 이 기기 세션도 지운다(#792·#793 — 그 전엔 만료·잘못된 액세스 쿠키면 401에 쿠키를 지우지 않았다). 진행 중인 변경이 있으면(`useIsMutating() > 0`) 버튼을 비활성으로 둔다 — 하드 이동이 진행 중인 POST(주문 생성 등)를 끊지 않게 |
| 로그인 콜백 | 성공하면 `dd:session`을 새 값으로 세우고 **`location.assign(redirect)`(하드 이동)** — 익명으로 캐시된 GM-1(`null`)과 viewer 캐시를 남기지 않는다. `USER_403_1` → "이용이 제한된 계정이에요"(정지 계정만 해당. 탈퇴 계정은 가입 흐름으로 간다). `AUTH_400_1`(OAuth `state` 불일치) → 로그인을 처음부터 다시 시작. **그 밖(401 포함) → 일반 실패 `failed`, 재시도 없음**(예전 401 "잠시 후 다시" 분기는 원인이던 남은 액세스 쿠키 401이 #792로 없어져 2026-10-25 지웠다) |

- **소유**: `src/api`는 `ApiError`(세션 상실이면 하위 클래스 `SessionLostError`)만 던지고 주입 지점 `setAuthHandlers({ refresh, onSessionLost })` 하나를 연다(`client.ts`의 401 가로채기가 부른다). 재발급 호출(`authApi`)과 세션 상실 처리(캐시 비우기, `dd:session`, 이동), `storage`·`pageshow` 감시는 `features/shared/auth`가 등록한다(루트 `providers.tsx`에서). `src/api`는 `features`도 라우터도 import하지 않는다(§8).
- 게이트가 세션 확정 전에 children을 그리지 않으므로, 보호 화면의 쿼리가 게이트보다 먼저 나가는 경합이 없다.
- `redirect` 파라미터는 같은 origin의 상대 경로일 때만 따른다.
- **백엔드 코드로 확인(2026-10-14, 2026-10-25 `432cce4`로 갱신)**: 토큰이 없으면 HTTP 401 + `AUTH_401_2`(본문 `status`도 401 — #808, 그 전엔 `AUTH_403_2`·본문 403), 만료 토큰은 401 `AUTH_401_1`, 잘못된 토큰은 401 `GLOBAL_401_1`이다. 쿠키 만료 = 토큰 수명이라 실제로는 `AUTH_401_2`가 가장 흔하다. 그래서 분기는 코드가 아니라 HTTP 상태로 한다. 재발급 실패는 HTTP 403 `AUTH_403_1`이고 백엔드가 쿠키를 지우지 않는다 — 세션 상실 처리는 FE가 한다(api-contract §1·§9).
- **[해소 — 백엔드 #792, 2026-10-25]** 지금은 `JwtTokenFilter`가 파싱 실패를 익명으로 넘기고 보호 경로에서만 `TokenAuthenticationEntryPoint`가 401을 낸다(위조 쿠키면 `accessToken` 삭제 `Set-Cookie`). 재발급·`/oauth/**`·로그아웃·공개 GET은 낡은 쿠키가 있어도 통과한다. 아래 문단은 그 전(24aa595) 기록이다.
- **백엔드 코드로 확인(2026-10-15) — 인증 경로도 액세스 쿠키를 먼저 검사한다.** `JwtTokenFilter`는 경로와 상관없이 토큰이 있으면 파싱하고, 실패하면 `JwtExceptionFilter`가 401을 바로 돌려준다. `permitAll`(재발급, `/oauth/**`, 로그아웃)은 인가 단계라 이 401을 막지 못한다. 그래서 만료·잘못된 액세스 쿠키가 남아 있으면 **재발급·로그인·로그아웃이 모두 401**이다. 쿠키 Max-Age가 JWT 만료보다 네트워크 지연만큼 늦게 끝나는 짧은 구간에서 실제로 생긴다(그때 둔 "잠깐 뒤 한 번 더" 재시도가 이 구간을 넘겼다 — 2026-10-25 지움). 서명 키가 다른 쿠키(로컬에서 rewrite 대상을 바꾼 경우, 운영 키 교체)는 쿠키가 만료될 때까지 로그인도 로그아웃도 막힌다 — [`backend-questions.md`](./backend-questions.md) B6("인증 경로에서는 토큰 파싱 실패를 익명으로 처리하거나 쿠키를 지워 달라").
- **Origin 검사는 이미 들어가 있다**(#763, `CookieOriginFilter`). 기본은 report-only이고, 켜지면 `Authorization` 헤더 없이 accessToken 쿠키가 실린 POST·PUT·PATCH·DELETE에서 Origin(없으면 Referer의 출처)이 허용 목록 밖일 때 403 `AUTH_403_3`이다(재발급·로그아웃 제외). 같은 출처 fetch는 Origin을 보내므로 정상 흐름에서는 생기지 않는다. 로컬 FE 포트가 3000이어야 하는 이유이기도 하다(허용 목록에 `localhost:3000`만 있다). #776은 이것을 켜는 것과 HttpOnly 전환이다.
- **대가 — Safari ITP.** Safari는 7일 동안 방문이 없으면 스크립트 저장소(`localStorage`)를 지운다. 그러면 `dd:session`이 없어 리프레시 쿠키가 살아 있어도 재발급을 시도하지 않고 익명으로 보인다. **2026-10-31 B2 답**: 운영·스테이징의 액세스·리프레시 수명은 둘 다 518400초(6일)다(백엔드 답변, env 값). 재발급마다 리프레시가 회전해 만료는 마지막 방문 + 최대 6일이므로, 7일 미방문으로 `localStorage`가 지워질 때는 리프레시 쿠키도 이미 만료돼 있다 — 잃는 조용한 재발급이 없다. **영향 없음, 코드 변경 없음.** 수명이 7일 이상으로 늘면 다시 본다(그때는 `dd:session`이 없어도 GM-1 한 번은 재발급을 시도하는 식의 보완을 검토).
- **카카오톡 인앱 브라우저**(iOS WKWebView, Android WebView)에서 Web Locks와 `localStorage` 영속성이 되는지는 caniuse에 WebView 항목이 없어 확인하지 못했다. Web Locks가 없으면 위 대체 경로로 간다. P4b에서 실기기로 확인한다.
- 로컬·dev 프로필의 쿠키는 `SameSite=None`, 스테이징은 host-only·`Lax`, 운영은 `.dudoong.com`·`Strict`다. CORS 허용 출처는 운영 `https://dudoong.com`, 스테이징 `https://staging.dudoong.com`·localhost다.
- **확인 필요**: 운영 쿠키가 `SameSite=Strict`다. 다른 사이트에서 넘어온 첫 요청(카카오 로그인 복귀 등)에는 쿠키가 안 실릴 수 있다. 서버에서 로그인 여부로 분기하는 곳을 최소로 두는 이유이기도 하다.

## 5. 상태 관리

범용 전역 상태 라이브러리를 두지 않는다. v1의 전역 상태 4종은 전부 다른 것의 대리물이었다.

| v1 atom | v2 |
|---|---|
| `authState` | 세션 쿼리(GM-1) |
| `globalOverlay` | `overlay-kit`(`overlay.open` / `openAsync`) |
| `soldOption` | 서버 데이터 → query cache |
| `bottomButton` | 레이아웃 지역 상태 |

**오버레이 규칙**

| 경우 | 방법 |
|---|---|
| 주소로 여는 오버레이(`?order={orderUuid}` 주문 상세) | `overlay.open`을 쓰지 않는다. 페이지가 쿼리 값을 보고 선언적으로 렌더한다. **P2 결정으로 뒤로가기가 모달을 닫는다** — 아래 `pushState` 방식으로 열고 닫는다(patterns §6). 다른 쿼리(`?tab=`)는 보존한다. 2회차의 "push로 열고 history state 표시를 보고 back/replace로 닫는다"는 쓸 수 없다 — `router.push`에는 history state를 넘길 인자가 없고, 사용자 state는 클라이언트 이동에서 유지되지 않는다(Next PR #58335 커밋 노트). 방식: `window.history.pushState({ ...history.state, ddOverlay: 1 }, '', url)`로 열고(Next 문서: "`pushState` and `replaceState` calls integrate into the Next.js Router"), `history.state?.ddOverlay`가 있으면 `router.back()`, 없으면 `replace`로 닫는다. 새로고침 뒤 표시가 남는지는 미확인이지만, 사라져도 결과는 `replace`로 닫는 것뿐이라 무해하다 |
| 데이터를 읽는 오버레이 | 루트 `OverlayProvider`에서 렌더되어 라우트의 Suspense·`error.tsx` 밖이다. 안에 `<AsyncBoundary>`를 둔다 |
| 경로 이동 | 경로가 바뀌면 `overlay.unmountAll()`을 부른다. 이 일을 하는 `<OverlayRouteReset />`은 children을 감싸지 않는 말단 컴포넌트로 루트 Provider 옆에 두고, 자체 `<Suspense fallback={null}>`로 감싼다(§3 "경로를 읽는 컴포넌트") |
| 오버레이가 열린 채 뒤로가기 | **오버레이를 닫는다**(P2 사용자 결정). 시트·모달·팝업이 `useCloseOnBack`으로 같은 주소의 history 항목을 하나 넣고, popstate로 닫는다. UI로 닫으면 그 항목을 `history.back()`으로 소비한다. 오버레이 안에서의 경로 이동은 `replace`. 자세한 규칙과 남는 경우는 patterns §6 |
| `EasyOverlay`의 변경 실패 | 오버레이를 유지하고 공용 토스트(`handleError` 기본)에 맡긴다. 문구가 다를 때만 `handleError`의 표로 화면이 처리한다(§4) |

다단계 플로우 라이브러리는 두지 않는다. 공연 만들기 2단계(P11)는 `?step=` 쿼리 + 지역 상태로 만든다. 체크아웃은 한 화면 안의 섹션이고, 선물 보내기는 바텀시트 2장이다.

## 6. 스타일링

### 결론: **vanilla-extract.** emotion은 쓰지 않는다.

- 빌드 타임에 CSS 파일로 뽑혀 런타임 비용이 없고, 서버 컴포넌트에서 동작한다(Next 16.4 문서의 지원 목록에 있음).
- 스타일과 토큰을 TS로 쓴다. 토큰 이름을 틀리면 타입 에러가 난다.
- emotion의 객체 스타일 + 테마와 작성 방식이 가장 가깝다. 이전 판 `patterns.md`의 `Flex`·`Spacing`·표시/숨김 패턴을 거의 그대로 옮길 수 있다.

**컴포넌트**: 동작은 Radix 프리미티브(헤드리스), 모양은 vanilla-extract. shadcn/ui 코드는 가져오지 않고 구조 참고로만 쓴다. 토큰·컴포넌트 목록과 구현 규칙은 [`design-system.md`](./design-system.md).

**검토한 대안**: Tailwind v4(연결 위험이 가장 낮지만 토큰이 문자열이고 작성 방식이 다르다), StyleX(공식 연결이 Babel 설정을 요구해 Next 컴파일러가 SWC에서 Babel로 바뀐다, 0.19로 1.0 이전).

### 구성

| 도구 | 용도 |
|---|---|
| `@vanilla-extract/css` | `style`, `createGlobalTheme`(토큰), `globalStyle`(reset) |
| `@vanilla-extract/recipes` | 변형이 있는 컴포넌트(Button의 tone·size 등) |
| `@vanilla-extract/sprinkles` | 토큰에 묶인 유틸리티. 레이아웃 프리미티브와 일회성 스타일에 쓴다 |
| `@vanilla-extract/dynamic` | 런타임 값(`assignInlineVars`) |
| `@vanilla-extract/next-plugin` | Next 연결. `unstable_turbopack: { mode: 'auto' }` |

### 스타일을 쓰는 세 가지 방법

`css={css(...)}` 같은 컴포넌트 파일 안 인라인 정의는 없다. 스타일 정의는 `.css.ts` 파일에만 둘 수 있다(빌드 때 실행되는 파일). 대신 파일을 매번 만들지 않아도 되게 층을 둔다.

1. **프리미티브** — `<Flex gap={4} alignItems="center">`, `<Spacing size={6} />`, `<Txt typography="bodyMd" color={colors.textSecondary}>`. 화면 코드의 대부분은 이걸로 끝난다.
2. **`sprinkles()` 인라인** — `className={sprinkles({ marginTop: { mobile: 4, desktop: 6 }, color: 'gray900' })}`. 컴포넌트 파일 안에서 바로 쓴다. 값은 토큰으로 제한된다.
3. **`.css.ts` 파일** — 위 둘로 안 되는 것(고유한 모양, 자손 선택자, 애니메이션, 변형). 컴포넌트 옆에 `Foo.css.ts`로 둔다.

런타임에 정해지는 값(진행률 폭 등)은 CSS 변수에 `assignInlineVars`로 넣는다.

| 규칙 | 강제 수단 |
|---|---|
| 색·간격·글자 크기는 토큰(`vars`)으로만 쓴다 | sprinkles 타입 + 리뷰(`.css.ts` 안의 리터럴) |
| 화면 코드는 `src/ui` 컴포넌트와 프리미티브를 조합한다 | 리뷰 |
| `src/ui` 컴포넌트는 `className`을 받아 병합한다. vanilla-extract 타입을 공개 API에 드러내지 않는다 | 리뷰 |
| 간격·치수는 추측하지 않고 Figma 노드에서 읽는다 | 리뷰 |

**위험**: Turbopack 연결 옵션이 `unstable_`이고 전용 플러그인이 0.1.x다. 프로덕션 빌드, 개발 서버의 `.css.ts` 수정·추가 반영, Storybook 빌드까지 확인했다(§21·§22). 깨지면 `next dev/build --webpack`으로 돌아갈 수 있으나 Turbopack 속도 이점을 잃는다.

## 7. 폼

`react-hook-form` v7 + zod resolver. 필드가 2개 이상이거나 검증 규칙이 있으면 RHF, 그 외는 `useState`. v1의 `useInput`/`useInputs`는 이식하지 않는다. zod 스키마는 `src/api`의 요청 스키마를 재사용한다. PATCH 본문은 `dirtyFields`로 만든다([`patterns.md`](./patterns.md) §23).

## 8. 저장소와 계층

단일 패키지. pnpm. 린트·포맷·훅·테스트 도구는 §24.

```
src/app      → 라우트 파일(얇게: 조회, 메타데이터, 화면 조립) + 루트 셸 클라이언트 파일 2개(providers.tsx, OverlayRouteReset.tsx)
src/features → 화면 단위 구현 (audience / hosting / shared)
src/ui       → 디자인 시스템
src/api      → zod 스키마, queryOptions, api 객체, 서버용 헬퍼(server/)
src/utils    → 순수 유틸
```

의존 방향은 위에서 아래로만. eslint로 강제한다.

- `features/audience` ↔ `features/hosting`은 서로 import하지 않는다. 둘이 같이 쓰는 것은 `features/shared`로 올린다.
- `src/app`에 두는 라우트 파일이 아닌 파일은 `providers.tsx`(QueryClient·overlay·인증 핸들러 등록, `storage`·`pageshow` 감시)와 `OverlayRouteReset.tsx` 둘뿐이다. 화면 구현은 두지 않는다. 둘 다 계층상 `features/shared`를 import할 수 있다.
- `src/api/server/`는 `'server-only'`로 표시해 클라이언트 번들에 섞이지 않게 한다. 라우트 파일에서만 import한다.
- `src/api`는 `src/ui`와 `features`를 import하지 않는다. 예외는 `src/api/server/`(`HydrationBoundary`, `notFound`를 쓴다). 인증 처리처럼 위 계층이 필요한 것은 주입 지점(`setAuthHandlers`)으로 받는다(§4 인증).
- 이미지 업로드 모듈(발급 → S3 PUT → key)은 `src/api/upload`에 둔다(P3). 호스트·공연·프로필 세 화면이 같이 쓴다.

## 9. TypeScript

TS 5.x, `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`. alias는 `@/*` → `src/*` 하나. `any` 금지(`@typescript-eslint/no-explicit-any`). Next가 생성하는 라우트 타입(`PageProps`, `LayoutProps`)을 쓴다 — CI에서 `next typegen` 뒤에 typecheck한다.

## 10. 테스트

> **bfcache**: Playwright는 Chromium을 `--disable-back-forward-cache`로 띄운다. bfcache 복원을 보는 테스트는 새 headless(`channel: 'chromium'`) + `ignoreDefaultArgs`로 그 인자를 빼야 하고, 이 옵션은 워커 단위라 `e2e/auth-bfcache.spec.ts`처럼 파일을 나눈다(P4b-L).

2026-10-17 개정(브랜치 `feat/testing-setup`). 세 층으로 나누고, **PR 게이트에는 Vitest만 넣는다**(P2에서 스토리 테스트도 추가 — §24). Playwright(e2e·QA 시나리오)는 로컬 명령과 `qa-scenario` 스킬로만 돈다(사용자 결정).

| 층 | 대상 | 도구 | 명령 | 게이트 |
|---|---|---|---|---|
| 유닛 | 순수 함수, zod 스키마, 응답 래퍼·에러 변환, 훅 | Vitest(jsdom, 서버 분기는 `// @vitest-environment node`) | `pnpm test` | O |
| 컴포넌트 통합 | 컴포넌트 + 쿼리 + 가짜 API | Vitest + Testing Library(+ user-event, jest-dom) + MSW. `renderWithProviders`(`src/test/render.tsx`) | `pnpm test` | O |
| 스토리 | 스토리마다 렌더 스모크 + `play` 함수 | `@storybook/addon-vitest`(Vitest 브라우저 모드, Chromium) | `pnpm test:stories` | O(P2부터) |
| 앱 화면 e2e | 빌드한 standalone 앱의 화면 흐름, 상태 코드, 서버/브라우저 조회 위치 | `@playwright/test` + 가짜 백엔드 | `pnpm test:e2e` | X |
| QA 시나리오 | 피처별 시나리오(정상·빈 상태·에러·권한·모바일/데스크탑) → 단계별 캡처 HTML 리포트 | 위와 같은 엔진 + `qa/` DSL·리포터 | `pnpm qa <feature>` | X |
| 실제 환경 | 가짜로 대신할 수 없는 것 — 스테이징의 카카오 로그인 왕복·쿠키, 실기기 | agent-browser(선택), 사람 | — | X |

- **Vitest 대상**: zod 스키마(실제 응답 샘플 파싱), 금액 계산, 응답 래퍼·에러 변환, 날짜 변환, 권한 판정(`can(role, action)`), 상태 → 표시 매핑, 그리고 컴포넌트의 분기(빈 목록, 모르는 enum, 에러 코드별 문구). 컴포넌트 테스트는 `renderWithProviders(<Foo />)` — 테스트마다 새 `QueryClient`(재시도 끔) + `OverlayProvider` + `Suspense`, `user`(user-event)를 같이 돌려준다. 응답은 `server.use(http.get(...))`로 바꾼다. `src/test/`는 `*.test.*` 파일만 import한다(eslint).
- **가짜 백엔드(e2e·QA)**: `e2e/support/mock-backend.ts`가 Playwright 워커 안에서 "nginx + 백엔드"로 뜬다(앞문 4100). `/api/*`는 MSW 핸들러(`src/api/__mocks__/handlers.ts` 기본값 + 테스트별 `mockApi.use()`)를 `msw`의 `getResponse()`로 직접 돌려 응답하고, 나머지는 Next standalone(3100)으로 넘긴다. Next의 `API_INTERNAL_URL`도 4100을 향해 **서버 조회와 브라우저 요청이 같은 핸들러를 탄다.** 운영 nginx와 같은 경로 구성이라 브라우저의 같은 출처 `/api/v2`도 그대로 동작한다. 받은 요청은 `mockApi.calls()`로 보이고 `from: 'server' | 'browser'`로 나뉜다(Node fetch는 UA가 `node`, 브라우저는 `Mozilla/…`. `sec-fetch-mode`는 undici도 붙여서 쓸 수 없다). 핸들러가 없는 `/api` 요청이 있으면 테스트가 실패한다.
  - **이유**: 서버 조회는 Next 프로세스 안에서 일어나 `page.route()`로 막을 수 없다. 가짜 응답을 테스트 코드(함수)로 바로 넘기려면 가짜 백엔드가 테스트와 같은 프로세스에 있어야 한다. 운영과 같은 standalone 산출물을 띄운다.
  - **대가**: 포트 하나를 테스트가 바꿔 쓰므로 **워커 1개**(직렬). 지금 규모(시나리오 수십 개, 하나에 0.2초 안팎)에서는 문제없다. 느려지면 워커마다 앱+백엔드 쌍을 띄우는 방식으로 바꾼다.
  - **검토하고 쓰지 않은 것**: Next의 `experimental.testProxy`(`next/experimental/testmode/playwright`) — 서버 fetch를 테스트별로 가로채 병렬이 되지만 실험 기능이고(설치된 문서 `node_modules/next/dist/docs`에 없다) `next.config`에 `experimental.testProxy`를 켜야 한다. 운영 빌드 설정을 테스트 때문에 바꾸지 않는다. standalone `server.js`에서 동작하는지는 미확인. `@mswjs/http-middleware`(express) — `getResponse()`로 충분해 의존성을 늘리지 않았다.
- **e2e와 QA의 차이**: 엔진·가짜 백엔드·뷰포트(mobile 390×844, desktop 1280×800)는 같다(`playwright.config.ts`의 `baseConfig`를 `qa/playwright.config.ts`가 이어받는다). e2e(`e2e/*.spec.ts`)는 짧은 회귀 확인, QA(`qa/scenarios/<feature>.qa.ts`)는 근거 문서가 달린 시나리오 + 단계별 캡처 + 사람이 읽는 리포트(`qa/reports/<feature>/<시각>/index.html`, `results.json`, Playwright 리포트·trace). 리포트는 커밋하지 않는다. 쓰는 법은 `.claude/skills/qa-scenario/SKILL.md`.
- **크롤러 계약**: 계획했던 `scripts/check-crawler.mjs` 대신 Playwright e2e에서 **실제 카카오 UA**(`KAKAO_SCRAP_UA`, §2)로 빌드된 앱에 요청한다. 가짜 백엔드로 404·5xx를 마음대로 만들 수 있어 별도 스크립트보다 넓게 본다. 지금은 공연홈 5xx → 500(`e2e/home.spec.ts`, QA `HOME-3`). 공연 상세·선물 랜딩의 OG `<head>`·404는 P5b·P8b에서 추가하고, Next 버전을 올릴 때마다 `pnpm test:e2e`를 돌린다.
- **agent-browser의 역할**: Playwright를 대신하지 않는다. (1) 시나리오를 쓰기 전에 새 화면을 직접 눌러 보며 셀렉터(접근성 트리)·흐름을 확인할 때, (2) 가짜로 대신할 수 없는 실제 환경(스테이징의 카카오 로그인 왕복, `SameSite` 쿠키)을 볼 때만 쓴다. 결과는 QA 시나리오의 `scenario.manual()`과 PR 설명에 남긴다. 필수 도구가 아니다(설치: `npm i -g agent-browser && agent-browser install`, 이 머신은 0.27.0).
- **금전 경로**: 주문 크리티컬 패스(상세 → 선택 → 체크아웃 → 주문 → 호스트 승인 → 티켓), 선물 수락, QR 체크인은 QA 시나리오로 화면 흐름과 에러 분기를 고정하고, 실제 백엔드 왕복은 스테이징에서 agent-browser로 한 번 본다. 이 경로를 건드리는 PR은 리뷰 체크리스트(`pnpm qa` 리포트)로 확인한다.

**포기한 것**: 금전 경로의 **CI** 자동 회귀 방지. 로컬 `pnpm qa`로 재현할 수 있지만 PR마다 강제되지 않는다 — 게이트에 넣으면 Chromium 설치·빌드 두 번으로 PR 게이트가 길어지고, 시나리오가 화면 변경마다 깨지는 비용을 Phase 진행 중에 매번 치르게 된다. 화면이 안정되는 P14에서 다시 본다.

**미확인**: Playwright UI 모드(`pnpm qa <feature> --ui`)에서 QA 리포터가 함께 도는지(대화형이라 이 세션에서 돌려 보지 않았다). `isMobile` 에뮬레이션은 Chromium에서만 돈다 — WebKit(iOS Safari) 프로젝트는 넣지 않았다.

## 11. CI/CD

GitHub Actions. Dockerfile 하나(`output: 'standalone'`, 멀티 스테이지). `main` 머지마다 이미지를 만들어 비공개 ECR `:dev`에 올리고(2026-10-29 GHCR → ECR 결정), 버전 태그는 `:dev`가 그 커밋 이미지면 다시 빌드하지 않고 붙인다. 배포는 Deploy 저장소의 compose 파일에서 태그를 올려 한다(§25). `next build`는 lint를 하지 않으므로 CI에 lint 단계를 둔다. 자세한 것은 [`deploy-plan.md`](./deploy-plan.md).

- 호스팅 센터 수정도 전체 재배포다. 티켓 오픈 시간대 배포는 피한다.

## 12. 환경변수

검증 장치를 늘리지 않는다. 빌드 때 꼭 있어야 하는 값 하나만 zod로 검증한다(`env/client.ts`). `NEXT_PUBLIC_*`는 리터럴로 하나씩 참조한다(객체 스프레드는 인라인되지 않는다).

| 값 | 이름 | 언제 정해지나 | 검증 |
|---|---|---|---|
| 카카오 JS 키 | `NEXT_PUBLIC_KAKAO_JS_KEY` | 빌드(인라인) | 빌드 때 — `next.config.ts`가 `env/client.ts`를 import해 누락 시 빌드 실패 |
| 서버 내부용 API 주소 | `API_INTERNAL_URL` | 런타임 | `/api/v2`로 끝나는지 요청할 때 검사(아니면 에러). `src/api/http.ts`의 서버 분기가 **호출할 때** `process.env.API_INTERNAL_URL || 'http://localhost:8080/api/v2'`를 읽는다(모듈 최상위에서 읽지 않는다, 빈 문자열도 기본값). 기본값이 운영·스테이징 값과 같아 보통 지정하지 않는다. 바꿀 때는 compose의 `environment:`로 준다 |
| 로컬 개발 API 출처 | `DEV_API_ORIGIN` | `next dev`만 | 없음. 브라우저 요청 `/api/*`을 이 출처로 넘기는 rewrite. **서버 프리페치는 rewrite를 타지 않으므로 로컬에서는 `API_INTERNAL_URL=${DEV_API_ORIGIN}/api/v2`도 함께 준다**(P0 2회차 검증에서 확인 — 빼면 `/`가 500) |
| 검색엔진 소유 확인 | `GOOGLE_SITE_VERIFICATION` · `NAVER_SITE_VERIFICATION` | 런타임(선택) | 없음. `(public)` 레이아웃 `generateMetadata`가 요청 때 읽어 `<meta name="google-site-verification">`·`naver-site-verification`으로 넣는다. 비어 있으면 넣지 않는다(이슈 #8 — implementation-log) |

- `instrumentation.ts`와 `env/server.ts`는 두지 않는다. 기본값이 있는 값에 "누락 시 기동 실패"는 의미가 없고, `http.ts`가 서버 전용 모듈을 import하면 브라우저 번들에 섞이거나 `server-only`로 빌드가 깨진다(1회차 설계를 2회차에서 되돌렸다).
- 브라우저용 API 주소는 같은 출처(`${location.origin}/api/v2`, 인증은 `/api/v1/auth`)라 값이 필요 없다. 토스페이먼츠 키는 없다.
- `API_INTERNAL_URL`은 `/api/v2`로 끝나야 한다(끝의 `/`는 지운다). 아니면 요청할 때 바로 에러를 던진다 — 접미사를 빠뜨리면 모든 공개 페이지가 조용히 404(→ `notFound()`)가 되고 카카오가 그 404를 캐시하기 때문이다. `authApi`의 서버 주소는 이 값의 `/v2`를 `/v1/auth`로 바꾼다(경로 접두사 유지).
- 키 없이 `pnpm typecheck`(`next typegen`)를 돌리면 `next.config.ts`가 `env/client.ts`를 불러 실패한다(P0에서 확인). CI는 자리 값을 넣는다.
- 사이트 origin은 값으로 두지 않는다. 브라우저는 `location.origin`, 서버는 요청의 `Host` 헤더로 만든다.
- 환경마다 다른 값은 이미지에 넣지 않는다 — 스테이징과 운영이 같은 이미지를 쓴다([`deploy-plan.md`](./deploy-plan.md) §4).

## 13. 에러와 로깅

Sentry 등 외부 수집은 두지 않는다. 구조는 둔다.

- 라우트별 `error.tsx` + 루트 `global-error.tsx`. 금전 경로(체크아웃)에는 맥락 있는 문구의 경계를 따로 둔다.
- `QueryCache`/`MutationCache`의 `onError`에서 구조화 로그. 조회는 배경 재조회 실패일 때만 명령형 `toast()`(훅이 아니다 — 다음 페이지 실패 제외, 고정 id로 중복 합침). 변경 토스트는 호출 쪽 `handleError`가 표에 없는 코드일 때 띄운다(2026-10-31 — 전역 변경 토스트를 뺐다). `SessionLostError`는 둘 다 띄우지 않는다. 화면을 대체해야 하는 실패만 `throwOnError`(에러 경계로).
- `serverQuery`는 구조화 JSON을 stdout에 남긴다. 계좌번호·입금자명·토큰은 넣지 않는다. **경로는 라우트 패턴으로 남긴다** — `routePattern()`이 소문자 단어 세그먼트만 남기고 나머지와 `gifts` 바로 뒤 세그먼트를 `:param`으로 가리며 쿼리스트링은 버린다(예: `GET gifts/:param`). `serverQuery` 로그는 리소스 이름(queryKey 첫 원소)·status·code·route만, `ApiError`가 아닌 에러는 이름만 남긴다(메시지에 queryKey·env 값이 들어 있을 수 있다).
- nginx 접근 로그는 쿼리스트링을 지우고 경로까지 남긴다(Deploy `nginx.conf`). 경로에 있는 `giftToken`은 남는다 — 로그 보존 기간과 접근 권한은 Deploy 저장소 · 운영 계정 몫이라 P14 보안에서 사용자 대기로 남겼다(implementation-log "P14 — 보안", progress "사용자 대기"). 앱 쪽 로그는 토큰을 남기지 않는다(`routePattern`, CSP 보고는 화면 패턴만).

**포기한 것**: 프로덕션 장애의 실시간 알림. 필요해지면 `onError`에 연결만 추가하면 된다.

## 14. 반응형

원칙은 이전 판과 같다: **서버와 클라이언트가 항상 같은 DOM을 그리고, 보이는 것만 CSS가 정한다.**

- breakpoint는 sprinkles의 조건으로 한 번 정의한다(`mobile` / `desktop`, 필요하면 `tablet`).
- 표시·숨김, 간격, 방향 차이는 조건부 값으로 쓴다: `sprinkles({ display: { mobile: 'none', desktop: 'block' } })`, `<Flex flexDirection={{ mobile: 'column', desktop: 'row' }}>`.
- PC/Mobile의 이미지 소스가 다르면 둘 다 렌더하고 하나만 보이거나 `<picture>`를 쓴다.
- **컴포넌트 자체가 바뀌어야 할 때만** `useMediaQueries()`를 쓴다. 초기값을 `null`로 두고 마운트 뒤에 판정한다([`patterns.md`](./patterns.md) §1).
- `react-responsive`처럼 첫 렌더에서 뷰포트를 판정하는 도구는 쓰지 않는다.

경계값(2026-10-31 사용자 결정, design-requests Q38 닫힘): **관객·호스팅 모두 1024부터 데스크탑**. 관객은 와이어 WEB 섹션 기준으로 정한 1024 그대로이고, 호스팅은 GUI 반응형 스펙(gui-screens §3)의 1133 경계 대신 1024를 쓴다 — 1024~1132는 GUI가 1133에서 그린 레이아웃, 1280 · 1440에서 우측 패널 폭이 바뀐다. 지금 코드(P1의 desktop ≥ 1024 · wide ≥ 1280)와 경계가 같아 `breakpoints.ts`를 나누지 않는다.

## 15. 유틸리티 라이브러리

| 라이브러리 | 역할 | 비고 |
|---|---|---|
| `ky` | HTTP 클라이언트 | fetch 기반 |
| `zod` | 스키마 | 폼·API·env 공용 |
| `es-toolkit` | 배열·객체 유틸, debounce 등 | |
| `overlay-kit` | 오버레이 상태 | 규칙은 §5 |
| Radix 프리미티브(`@radix-ui/react-select`·`-checkbox`·`-radio-group`·`-switch`·`-tabs`·`-collapsible`·`-popover`·`-dialog`·`-dropdown-menu`·`-tooltip`) | 컴포넌트 동작(키보드·포커스·접근성) | 모양은 vanilla-extract. P0에서 React 19 호환·유지보수 확인, 문제가 있으면 Base UI([`design-system.md`](./design-system.md)) |
| `sonner` | 토스트 | unstyled 모드 + vanilla-extract |
| `marked` + `sanitize-html` | 섹션 본문 렌더(MARKDOWN → HTML → sanitize). P5b-L에서 `isomorphic-dompurify` 대신 `sanitize-html`로 정했다(§17 측정) | 클라이언트 번들 gzip 약 58KB(§17) |
| 다음 우편번호(Postcode) + 카카오맵 JS `services.Geocoder` | 공연 장소 입력: 주소 검색 → `address`, 좌표 변환 → `latitude`·`longitude` | 호스팅 기본 정보(P11). PE-4가 좌표를 필수로 받는다. 카카오 JS 키·도메인 등록 필요 |

- `react-simplikit`과 `@use-funnel/browser`는 쓰지 않는다(§22). 필요한 훅 몇 개와 공연 만들기 2단계는 직접 만든다.
- `@suspensive/react-query`는 쓰지 않는다. `<SuspenseQuery>`는 `useSuspenseQuery`를 JSX로 쓰게 해 줄 뿐 경계를 포함하지 않는다(suspensive.org 문서 예시도 바깥에서 `ErrorBoundary`·`Suspense`로 감싼다).
- **`@suspensive/react`(3.21.x, peer React 18/19)는 쓴다**(2026-10-31 사용자 결정). `src/ui`의 `<ErrorBoundary>`·`<AsyncBoundary>`가 그 `ErrorBoundary`(`shouldCatch`·`resetKeys`·`onReset`, fallback 안에서 난 에러는 부모 경계로)·`Suspense`를 감싸고, `ErrorBoundaryGroup`·`useErrorBoundaryGroup`·`useErrorBoundary`·`useErrorBoundaryFallbackProps`를 그대로 다시 내보낸다. 화면은 `@suspensive/react`를 직접 import하지 않고 `src/ui`에서 가져온다. 이전에는 라이브러리 없는 작은 class 경계였다 — 경계를 섹션·위젯 단위로 나눌 때(V) 거르기·묶음 재시도를 직접 만들지 않으려고 바꿨다.
- "지도 제외"는 관객 공연 상세의 지도 위젯 이야기다. 호스팅 기본 정보 폼의 주소 검색·좌표 변환은 필요하다(Figma `424:9918`에 "주소 찾기"가 있다). 폼 안에 지도 미리보기를 그릴지는 디자인 확인 뒤 정한다 → 2026-10-25 GUI에서 지도 미리보기로 확정(design-requests Q3 해결, 카카오맵 지도 SDK — plan P11, §30).

## 16. UI 라이브러리 교체 (에디터 제외)

> **2026-10-12**: `react-beautiful-dnd`는 `@dnd-kit`으로 바꾸는 것이 아니라 **대체 없이 제거**한다. v1의 드래그는 옵션을 티켓에 끌어다 붙이는 UI였는데 v2는 모달과 칩으로 바뀌었고, 옵션 표시 순서는 서버가 id 순으로 고정한다. 아래 표의 해당 행은 이력으로만 남긴다.

### 결론

`antd`(Table만 사용) → `@tanstack/react-table`(`^9.2`), `react-qr-reader` → `@yudiel/react-qr-scanner`(`^2.6`), `react-spring-bottom-sheet` → `vaul`(`^1.1`). `react-beautiful-dnd`는 대체 없이 제거한다(위 머리말).

> 아래 근거 표의 `admin`/`ticket`은 v1 앱 이름이고, `@dnd-kit` 행은 폐기된 결정의 이력이다.

> 에디터 교체는 이 섹션에서 다루지 않는다 — §17 참조. (v1 실측 결과 저장 포맷이 마크다운이 아니라 **순수 HTML**이라 "마크다운 전환"은 폐기하고 HTML 유지 쪽으로 결정을 뒤집었다.)

### 근거 — v1 실사용 범위 대비 교체 타당성

| 교체 대상 | v1 실사용 범위 (실측) | v2 대안 | 채택 근거 | 리스크 / 마이그레이션 비용 |
|---|---|---|---|---|
| `antd`(`apps/admin/package.json`: `^5.2.2`) → `@tanstack/react-table` | admin 전용, import **2개 파일**, **`Table` 컴포넌트만** 사용. `GuestTable.tsx:81-94`(참가자 목록, 서버사이드 페이지네이션만), `TableDetailView.tsx:155-165`(주문 상세 팝업 내 정적 표 2개, `pagination={false}`, `scroll={{y:300}}`). Form/DatePicker 등 antd의 다른 컴포넌트는 미사용 | `@tanstack/react-table`(headless) | 실사용이 정렬·필터 없는 순수 표+페이지네이션뿐이라 antd 전체 번들을 끌고 올 이유가 없음. headless라 자체 스타일로 바로 렌더 — antd v5 자체 CSS-in-JS(`@ant-design/cssinjs`)를 끌고 올 필요가 없어짐 | antd가 제공하던 페이지네이션 UI(버튼/pageSize 셀렉터)를 `src/ui`에 신규 컴포넌트로 직접 구현해야 함 |
| `react-beautiful-dnd` → `@dnd-kit/core` | admin 전용, 옵션 적용 화면 **3개 파일**(`options/apply/index.tsx`, `OptionList.tsx`, `OptionDropArea.tsx`). `DragDropContext`로 왼쪽 옵션목록→오른쪽 티켓영역 **컬럼 간 이동**(단순 리스트 재정렬 아님, 좌석배치 캔버스도 아님), 카드 전체가 drag handle(`{...draggableProps}{...dragHandleProps}`를 div 통째로 부착) | `@dnd-kit/core`(+필요 시 `@dnd-kit/sortable`) | `react-beautiful-dnd`는 Atlassian이 공식 유지보수 종료(포크 `@hello-pangea/dnd`만 명맥 유지). `@dnd-kit`은 React 18/19 대응하며 활발히 유지보수 | API가 전혀 달라 3개 파일 전면 재작성 필요. `DragDropContext`의 `droppableId` 2개 구조는 `DndContext`+`useDroppable`/`useDraggable` 조합으로 1:1 대응 가능 |
| `react-qr-reader` → `@yudiel/react-qr-scanner` | admin 전용, `QrScanner.tsx` 입장 체크인 **1개 파일**. `onError={() => {}}`로 **에러 처리 사실상 없음**, 카메라 권한 처리도 라이브러리 기본 동작 의존 | `@yudiel/react-qr-scanner` | `react-qr-reader`는 릴리스가 오래되어 React 19 대응이 불확실. `@yudiel/react-qr-scanner`는 최근까지 유지보수됨 | 라이브러리를 갈아타는 김에 **v1이 방치한 에러 핸들링(카메라 권한 거부, 스캔 실패)을 구현**해야 함 — 단순 스왑이 아니라 UX 보강이 딸려옴. P13b 완료 기준에 "카메라 권한 거부/스캔 실패 UI" 항목으로 명시 권장 |
| `react-spring-bottom-sheet` → `vaul` | ticket 전용. 직접 2곳(`TicketItem.tsx:49-67` QR 상세 보기 등) + 공용 `OverlayBox.tsx`(PC=Modal, Mobile=BottomSheet 분기, `snapPoints={({minHeight})=>minHeight}`)를 통해 **6개 화면이 간접 사용** | `vaul` | tossinsu-desktop 이식 기조(`patterns.md`)와 정합, Radix 계열이라 접근성 기본 제공. `react-spring-bottom-sheet`는 릴리스 케이던스 낮음 | 직접 마이그레이션 대상은 사실상 `OverlayBox.tsx` 1파일 — 6개 간접 사용처는 이 리팩터 하나로 흡수됨. `overlay-kit`(§5)과의 조합 설계도 이 파일에서 같이 확정 |

### 트레이드오프

4건 모두 "라이브러리 유지보수 상태 개선" 또는 "쓰지 않는 기능까지 딸려오는 번들 비용 제거"가 공통 동기다. `antd`·`react-beautiful-dnd`는 실사용 범위가 라이브러리 전체 기능 대비 매우 좁아 교체 비용이 작고, `react-qr-reader`는 교체와 별개로 원래 있어야 했던 에러 핸들링이 함께 들어가는 게 오히려 이득이다. `vaul` 교체는 파일 1개(`OverlayBox.tsx`)로 수렴해 리스크가 가장 낮다.

---

## 17. 에디터 (공연 상세 설명)

> **2026-10-22 sanitize 결정(P5b-L): `sanitize-html` 2.18.1 + `marked` 18.1.1.** standalone 빌드 세 벌로 `/events/101`(운영 v1 본문 10개, 14.8KB)을 순차 2000번 + 동시 10으로 500번 요청해 쟀다(2회).
>
> | | 순차 최고 RSS | 동시 10 이후 RSS | 요청당 | standalone |
> |---|---|---|---|---|
> | sanitize 없음 | 282MB | 364MB | 13ms | 43MB |
> | `sanitize-html` | 291~304MB | 388~446MB | 13ms | 43MB |
> | `isomorphic-dompurify` | 439~483MB | 723~724MB | 22~23ms | 57MB |
>
> jsdom은 standalone 추적에 들어가 기동은 됐지만 메모리·CPU 부담이 커서 아래 "메모리 주의"의 대안을 택했다. 허용 목록은 백엔드 jsoup `Safelist.relaxed()` + v1 서식(글자색 span, 체크리스트 class, `code` 언어 class, del·s·hr). 링크는 `rel="noopener noreferrer"`, `target`은 `_blank`만. **대가는 클라이언트 번들**: `sanitize-html` gzip 57.7KB(DOMPurify 12.1KB) — 공연 상세 청크가 약 46KB 커진다. 줄여야 하면 V·P14에서 "섹션 queryFn 안에서 sanitize + 브라우저 동적 import" 또는 "서버 sanitize-html / 브라우저 DOMPurify"를 본다. 운영 공개 공연 51개를 보니 `contentFormat: MARKDOWN` 본문은 모두 toast-ui가 저장한 HTML 한 줄이었다(`marked`가 블록 HTML을 그대로 넘기는 것을 테스트로 확인). RSC 페이로드에는 sanitize 전 원본이 JSON 문자열로 실리지만 실행되지 않는다(e2e 확인).

> **2026-10-11 개정 — 섹션 모델.** 아래 결론(Tiptap 채택, HTML 저장, sanitize 추가)은 유지하되 전제가 두 가지 바뀌었다.
>
> 1. **본문은 필드 하나가 아니라 섹션 1~10개다**(GE-5 / PE-6, `{title, content, sortOrder}`). 새 공연은 서버에 섹션이 없고 기본 4탭(공연 소개 · 예매안내 · 세트리스트 · 유의사항)은 프론트가 그린다. 저장은 전체 교체(PUT)라 빠진 섹션은 지워진다. 첫 섹션은 v1 상세 본문과 동기화된다.
> 2. **섹션마다 `contentFormat`이 `HTML` 또는 `MARKDOWN`이다.** v2 에디터가 저장한 것은 HTML, v1 이관분은 MARKDOWN으로 온다. "v1 콘텐츠가 전부 HTML이라 legacy 분기가 불필요하다"는 아래 서술은 더 이상 맞지 않는다 — **뷰어는 렌더러 두 개가 필요하다.** 마크다운 렌더러는 `marked`를 쓰고 결과 HTML을 HTML 섹션과 같은 sanitize 경로에 태운다(§22).
>
> 서버가 저장 시 HTML을 정리하지만(공통 `HtmlSanitizer`), 렌더 직전 `isomorphic-dompurify` sanitize는 그대로 둔다. 마크다운 렌더 결과에도 같은 sanitize를 태운다. 섹션 본문 이미지는 PE-10(`purpose: SECTION`)으로 받은 `url`을 HTML에 넣고, `http` 이미지는 서버 정리 때 지워진다.

### 결론: **마크다운 전환 폐기. `@toast-ui/react-editor` → Tiptap(`@tiptap/react`)로 교체하되 저장 포맷은 HTML 그대로 유지.** 렌더링 시 `isomorphic-dompurify`로 명시적 sanitize를 신규 추가한다.

### 근거

**v1 실사용 범위 (실측):** 에디터 사용처는 `apps/admin/src/components/events/detail/EventDetailInfo.tsx` **1곳뿐**(공연 상세 설명). `getInstance().getHTML()`로 뽑아 백엔드 `content` 필드에 HTML 문자열 그대로 저장하고, 편집 시 `setHTML(content)`로 재주입하는 **순수 HTML 파이프라인**이다. `getMarkdown()`/`setMarkdown()` 호출은 레포 전체에 0건. ticket 쪽은 toast-ui `Viewer` 컴포넌트로 렌더링한다(`apps/ticket/src/components/events/blocks/MdViewer.tsx`).

**3라운드 검토에서 "마크다운 전환"으로 잘못 결정했던 이유:** `@toast-ui/react-editor`가 npm 기준 `peerDependencies: { react: "^17.0.1" }`로 고정돼 있고 마지막 배포가 2023-02-17(3년+ 방치)이라 **React 19/Next 16 조합에서 못 쓴다는 것이 진짜 문제**였다. 그런데 "저장 포맷을 마크다운으로 바꾼다"는 이 비호환 문제의 해결책이 아니라 에디터 교체에 딸려온 불필요한 부작용이었다 — v1 데이터가 전부 HTML이라 마크다운 전환은 기존 콘텐츠 전량 변환(포맷 손실 리스크 포함)을 강제하면서, 정작 React 19 비호환이라는 원인은 포맷과 무관하게 남는다.

**Tiptap이 해결책인 이유 (npm 실측, 2026-09-15):**

| | `@toast-ui/react-editor` | `@tiptap/react` |
|---|---|---|
| 최신 버전 / 배포일 | `3.2.3` / 2023-02-17(3년+ 방치) | `3.31.3` / 2026-09-04 |
| peer deps | `react: ^17.0.1`만 — React 19 미지원 확정 | `react: ^17\|\|^18\|\|^19` |
| 콘텐츠 API | `getHTML()` / `setHTML()` | `editor.getHTML()` / `editor.commands.setContent(html)` |

API가 `getHTML`/`setHTML` ↔ `getHTML`/`setContent`로 개념적으로 1:1 대응해 **저장 포맷을 HTML로 유지하면 v1 콘텐츠 마이그레이션이 0건**이고, 백엔드 `content` 필드 계약도 그대로 간다. `EventDetailInfo.tsx` 재작성 범위도 에디터 초기화 로직에 국한된다.

### 신규로 반드시 추가할 것 — sanitize 레이어

v1은 sanitize 코드가 레포 전체에 **0건**이며, toast-ui `Viewer`의 내장 sanitizer에만 전적으로 의존하는 구조였다. 에디터를 무엇으로 바꾸든 이 방어선이 단일 장애점이라는 사실은 그대로 남는다. admin 계정 탈취나 실수로 악성 스크립트가 섞인 HTML이 저장되면, 카카오톡으로 유통되는 공개 라우트(`/events/[eventId]`)에 그대로 노출된다.

**메모리 주의(2026-10-14):** `isomorphic-dompurify`는 서버에서 jsdom을 띄운다. 섹션 뷰어가 공연 상세의 서버 렌더에서 돌아 Node 프로세스에 jsdom이 올라가고, JVM과 메모리를 나눠 쓰는 1~2GB 서버에서 유휴 메모리와 티켓 오픈 때 요청당 CPU에 영향을 준다. standalone 추적에서 jsdom 파일이 빠지는 문제도 흔하다. P0(배포 D1)에서 "섹션 10개짜리 공연 상세를 연속으로 열 때의 RSS"와 "jsdom 포함 standalone 기동"을 잰다. 부담이 크면 DOM이 필요 없는 `sanitize-html`로 바꾼다 — 백엔드가 저장 때 이미 정리하므로 2차 방어선 역할은 같다.

**v2 설계:** `getHTML()` 출력을 렌더링 직전에 `isomorphic-dompurify`(Next.js SSR·클라이언트 양쪽에서 동작)로 명시적 sanitize한다. Tiptap 공식 가이드도 "신뢰하는 에디터의 출력이라도 항상 sanitize하라"고 명시한다. Next SSR에서 Tiptap을 직접 렌더링할 경우 `useEditor({ immediatelyRender: false })`로 하이드레이션 mismatch를 방지한다(Tiptap 공식 권고).

### 트레이드오프 / 리스크

| | 채택안 (Tiptap + HTML 유지) | 기각안 (마크다운 전환) |
|---|---|---|
| 장점 | 콘텐츠 마이그레이션 0, 백엔드 계약 불변, React 19/Next 16 호환, 활발히 유지보수 | 콘텐츠가 plain text에 가까워 diff·검색·XSS 표면이 단순해짐(장기적 이점이긴 하나 이번 재설계 스코프에서 필수는 아님) |
| 단점 | ProseMirror 기반이라 toast-ui보다 커스터마이징 학습곡선 있음 | 기존 HTML 전량 변환 필요(`turndown` 등 HTML→MD 변환기 사용 시 복잡한 마크업 손실 위험), 변환 후 45개 공연 상세 페이지 수동 대조 필요 |

사용처가 1개 화면·1개 필드로 좁아 어느 쪽이든 구현 비용 자체는 작지만, **HTML 유지 쪽이 리스크와 작업량 모두 더 작다.**

---

## 18. 체크아웃 — 옵션 응답 폼과 제출 본문 (P7)

> 2026-10-11 전면 개정. 이전 판은 서버 DTO를 모르는 상태의 초안이었다. 지금은 P11/O-1 본문이 확정돼 있다.

### 서버 본문

```ts
// POST /api/v2/me/orders
{
  eventId, ticketItemId, quantity,
  // 둘 중 하나
  options: { applyToAll: true, answers: [{ optionId, answer }] },
  // 티켓별: options를 같이 보내야 한다 — 없으면 백엔드가 applyToAll=true로 본다(V2CreateOrderRequest.applyToAll(), P7-L에서 확인)
  options: { applyToAll: false, answers: [] }, perTicketOptions: [[{ optionId, answer }], …],   // 길이 = quantity
  paymentChannel: 'BANK_TRANSFER' | 'TOSS_TRANSFER' | 'FREE',
  depositorName,            // 1~20자
  agreeRefundPolicy,
  // 2026-10-25 추가(#840, 모두 선택 — api-contract §6, plan P7): hostProvisionAgreed, dudoongTicketNoticeConfirmed(두둥만), agreementVersion
}
```

- `answer`는 문자열이다. `YES_NO` 옵션은 `YES`/`NO`, `SUBJECTIVE`는 자유 입력.
- 티켓별로 다르게 답하면 서버가 수량 1짜리 주문 라인 N개로 저장한다. 주문상세에서 `lines`가 1개면 "모든 티켓에 같은 옵션", 여러 개면 티켓별이다.
- 옵션 정의(질문·형식·추가금)는 GP-5 / G11/O-0의 티켓 응답에 들어 있다.

### 폼 모델

RHF + zod. 화면의 두 모드를 판별 union으로 두고 제출 시 서버 본문으로 바꾼다.

```ts
// src/features/audience/checkout/OptionAnswersForm/formSchema.ts
const Answer = z.object({ optionId: z.number(), answer: z.string() });
const FormSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('same'), answers: z.array(Answer) }),
  z.object({ mode: z.literal('individual'), tickets: z.array(z.array(Answer)).min(1) }),
]);
// toOrderOptions(form, quantity): same → { options: { applyToAll: true, answers } }
//                                  individual → { options: { applyToAll: false, answers: [] }, perTicketOptions }
```

| 상황 | 처리 |
|---|---|
| 옵션이 없는 티켓 | 폼 자체를 렌더하지 않는다 |
| same → individual | 현재 공통 응답을 N개로 복사 |
| individual → same | 응답이 서로 다르면 어느 세트를 쓸지 확인 후 덮어쓴다 |
| 수량 1 | 모드 선택 없이 same |
| `YES_NO` 미응답 | `undefined`로 둔다. `NO`와 구분한다 |
| 검증 실패 | 첫 오류 티켓의 아코디언을 열고 focus. 서버 `Order_400_23`은 폼 상단에 표시 |

**티켓에 붙은 옵션은 전부 필수다**(백엔드 코드에서 확인, §23). 모든 옵션에 정확히 한 번씩 답해야 하고, 주관식은 trim 후 1~255자다. 폼 스키마에 그대로 넣는다.

### 금액

`src/api/order/price.ts` 한 곳에서 계산한다. **식은 백엔드와 같다**(`OrderLineItem.getTotalOrderLinePrice = (price + Σ옵션) × quantity`, P3에서 확인): 모든 티켓 같은 옵션이면 `(price + Σ YES 추가금) × 수량` — 옵션 추가금도 수량만큼 곱한다. 티켓별 옵션이면 티켓마다 수량 1인 줄이라 `Σ_i (price + Σ YES 추가금_i)`. NO 답은 0원, v2에 쿠폰 없음. 수량 1~100(`V2CreateOrderRequest.MAX_QUANTITY`). 화면 표시 총액과 토스 송금 링크 금액이 여기서 나오고, 주문 생성 응답의 `totalAmount`와 같아야 한다(P7 계약 테스트).

---

## 19. 결제 — 계좌송금 체크아웃 (P7)

> 2026-10-11 전면 개정. **v2에는 PG가 없다.** 이전 판의 토스페이먼츠 SDK v2 위젯, `/pay/confirm` 콜백 모드 분리, confirm 멱등성 설계는 전부 폐기한다. `@tosspayments/*` 의존성도 넣지 않는다.

### 모델

두둥은 입금을 확인할 수 없다. 사용자가 **"입금했어요"를 누른 순간이 주문 시점**이고, 호스트의 승인이 입금 확인이다.

| 티켓 | `paymentChannel` | 화면 |
|---|---|---|
| 두둥(`DUDOONG`) | `BANK_TRANSFER` | 계좌·예금주 표시 + 복사 → "입금하셨나요?" 모달 → 주문 생성 |
| 두둥(`DUDOONG`) | `TOSS_TRANSFER` | 토스 송금 링크로 이동 → 돌아와서 "입금하셨나요?" 모달 → 주문 생성 |
| 무료(`FREE`) | `FREE` | 결제 정보·방식 없이 [신청하기] → 주문 생성 |

### 흐름

1. `G11/O-0`(로그인 필요)으로 티켓 + `account{bankName, accountHolder, accountNumber}`(2026-10-25부터 `bankCode`도, §19 구현 규칙)를 받는다. 계좌는 두둥 티켓이고 지금 살 수 있을 때만 값이 있다. 클라이언트에서 조회한다.
2. 옵션 입력(§18) → 결제 정보(금액·계좌) → 결제 방식 → 환불 규정 동의.
3. CTA → "입금하셨나요?" 확인 모달(`EasyOverlay`). `onConfirm`에서 `P11/O-1`을 await한다.
4. 성공하면 응답(주문 상세와 같은 형태)을 G11/O-3 키에 `setQueryData`로 넣고 `/orders/[orderUuid]?created=1`로 `replace` 이동한다(§3). 새로고침·하드 리로드에도 같은 화면이 다시 그려진다.

### 구현 규칙

- **토스 송금 링크는 프론트가 만든다**(계좌 + 총액). 비공식 스킴 `supertoss://send?bank=&accountNo=&amount=`가 쓰인다(§22). 실기기 확인 전에는 구현을 확정하지 않고, 앱이 없으면 직접 계좌이체로 안내한다. 백엔드의 `bankName`은 자유 입력이라 호스트가 적은 값이 스킴과 안 맞을 수 있다 — 티켓 폼(P12)에서 은행을 목록으로 고르게 한다(§23). **2026-10-25 바뀜(#804·#813)**: 계좌 응답에 `bankCode`(금융결제원 3자리, 서버가 `bankName`에서 추정, 실패 `null`)가 오고 은행 목록 `GET /api/v2/banks`(공개)가 생겼다. 토스 스킴의 은행 값은 `bankCode` → 토스 값 매핑으로 프론트가 만든다(서버에 매핑 없음, PR 본문). `bankCode`가 `null`이면 토스 버튼을 숨긴다(B3). 매핑 값은 실기기에서 확인(P7). **2026-10-25 현재: `bankCode`는 계좌 스키마(`AccountSchema`·`MyRefundAccountSchema`, nullable)로 받기만 하고, 매핑과 토스 버튼 숨김은 미구현이다** — `tossTransferLink`는 아직 `bankName`을 넣는다(TODO(B3), 근거 있는 매핑 표가 없어 실기기 확인 뒤 정한다).
- 입금자명은 현재 닉네임(GM-1 `name`)을 보내고 화면에서 고칠 수 없게 표시한다.
- 중복 제출: 모달의 확인 버튼은 요청 중 비활성. 서버도 10초 안의 같은 요청에는 앞 주문을 돌려준다. `Order_400_26`(무료 선착순 처리 중)이면 주문내역으로 보낸다.
- 재고는 표시용이다. 주문 시 `Ticket_Item_400_1`이면 GP-5를 다시 읽어 잔여를 갱신하고, `Ticket_Item_400_10`(판매 중 아님)·404면 티켓 선택으로 돌려보낸다.
- 1인 제한: 화면은 이미 산 수량을 모른다. `Order_400_15` · `Ticket_Item_400_6`이 오면 안내하고 수량을 줄이게 한다.
- 계좌 복사는 `copyText()`.
- 주문 완료 후 뒤로가기로 체크아웃에 돌아와 다시 제출하지 못하게 `replace`로 이동한다.

### 응답 헤더 주의

nginx가 `X-Frame-Options: DENY`를 붙인다. 체크아웃을 iframe에 넣는 구성은 쓸 수 없다.

---

## 20. 선물 — 서버 상태와 화면 매핑 (P8b)

> 2026-10-11 전면 개정. 이전 판의 전이표는 Figma만 보고 만든 제안이었다. 지금은 백엔드 상태가 확정돼 있다.

### 확정된 것

- 저장 상태 `PENDING` · `ACCEPTED` · `REJECTED` · `RETURNED` · `CANCELED`. 화면 판정은 랜딩 `viewState` 7종, 티켓탭 `state` · `giftState`, 목록 `isGiftExpired`.
- **거절(수락 전, PG-5)과 반환(수락 후, PG-6)은 다른 액션이다.** 이전 판의 "반송 = 거절" 결론은 틀렸다.
- **시간 만료가 없다.** "선물 만료"는 저장 상태가 아니라 `PENDING`인데 받을 수 있는 공연이 아닐 때의 판정이다.
- 수락·반환 때 티켓 uuid가 바뀐다.
- 링크 경로는 `/gifts/{giftToken}`이고 서버는 `linkPath`만 준다. origin은 프론트가 붙인다.

### 화면 매핑

| 화면 | 근거 | 구현 |
|---|---|---|
| 보내기 확인 | 바텀시트(`528:14520`) | `EasyOverlay`. `onConfirm`에서 PG-1 |
| 링크 생성 완료 | `455:8935` | 공유(메세지 `sms:` · 카카오톡 · 링크 복사) + 메모(PG-8, 50자) |
| 티켓탭 카드 | `state` | `GIFT_PENDING`(선물 취소) · `GIFT_EXPIRED`(회수 안내) · `GIFT_SENT`(GG-7a로) · `RECEIVED`(선물 반환) |
| 랜딩 | `viewState` | 7종 분기. `AVAILABLE`만 버튼 2개 |
| 반환 | 바텀시트(`528:14695`) | `canReturn`으로 노출. `onConfirm`에서 PG-6 |

### 구현 규칙

- 랜딩은 서버에서 요청마다 조회한다(서버 캐시 없음, §2). OG 메타는 공연·티켓 요약만 쓴다(보낸 사람 닉네임은 서버가 가려서 준다).
- 랜딩 GG-3은 공개 GET이지만 토큰이 있으면 본인 판정(`isReceiver`, `OWN_LINK`)에 쓴다. 서버 조회(익명)와 브라우저의 viewer 조회를 키로 나눈다(§4). 공개 쿼리는 `{ public: true }`(쿠키 없이)로 받고, 본인 판정은 viewer 쿼리가 한다. 버튼은 viewer 쿼리가 확정되거나 익명이 확정된 뒤에만 활성화한다.
- 비로그인 수락: 로그인 → 같은 URL로 복귀 → GG-3 다시 조회 → 사용자가 **다시 눌러** 수락. 로그인만으로 자동 수락하지 않는다.
- 소유권 이전은 낙관적으로 처리하지 않는다. 서버 성공 뒤에 화면을 바꾼다.
- 수락(PG-4)·반환(PG-6)·회수(DG-2)·거절(PG-5) 성공 뒤에는 `my-ticket` 목록·상세, `gift`, `notification` 쿼리를 무효화한다. 응답의 새 `ticketUuid`로만 이동한다.
- `Gift_400_3`(이미 처리됨)이면 GG-3을 다시 읽어 상태 화면으로 보낸다. 보낸 쪽 회수(DG-2)에서 오면 연 곳(T-2·GG-3)을 둘 다 다시 읽는다(P8b-L).
- 랜딩은 `noindex`이고 `og:url`·canonical을 쓰지 않는다(토큰이 든 주소). 토큰이 `[A-Za-z0-9_-]{1,64}`가 아니면 백엔드를 부르지 않고 404(체크인 토큰은 INVALID_QR)(P8b-L·P8c-L). `IssuedTicket_404_1`이면 티켓탭을 다시 읽는다.
- 선물 대기·완료 티켓이 있는 주문은 사용자가 취소할 수 없다(`Order_400_24`) — 주문상세에서 "선물을 먼저 취소하거나 돌려받아 주세요"로 안내한다.
- 토큰은 공유 링크 URL 외에는 넣지 않는다(로그, 외부 SDK 메타데이터 등). 서버 로그는 라우트 패턴으로 남긴다(§13). 외부로 나가는 링크의 Referer는 nginx의 `Referrer-Policy: strict-origin-when-cross-origin`이 origin까지로 줄인다(Deploy `site.conf`).

---

## 21. 설계 검증 기록 (2026-10-11)

> 이 절은 당시의 기록이다. 여기서 내린 "Cache Components 끔" 결론은 서버 캐시를 쓰지 않기로 하면서 뒤집혔다(§2·§26).

Next 16.4.0 · React 19.3 · standalone 빌드 · 모의 백엔드로 두 구성(Cache Components 켬 / 끔)을 돌렸다. 코드는 남기지 않았다.

**확인된 것**

| 항목 | 결과 |
|---|---|
| 캐시된 서버 페이지 + `generateMetadata` + 태그 무효화 | 동작. 끈 구성은 `revalidateTag(tag, {expire: 0})` 직후 요청에 새 내용 |
| 공개 조회에 토큰이 붙지 않음 | 확인 |
| `proxy.ts`가 요청 Cookie 헤더를 다시 쓰면 같은 요청의 서버 컴포넌트 `cookies()`가 새 값을 읽음 | 확인(지금 설계에서는 쓰지 않는다 — §4 인증) |
| 클라이언트 전용 호스팅 페이지 빌드 | 켬: Suspense 경계 필요. 끔: 제약 없음 |
| 실제 카카오 UA, 캐시 없는 첫 요청의 OG 위치 | `<head>` |
| vanilla-extract + Turbopack(`unstable_turbopack`) — 토큰·recipes·sprinkles·`assignInlineVars`, 서버/클라이언트 컴포넌트 | 프로덕션 빌드 동작. 개발 서버 미확인 |
| StyleX + Turbopack(공식 Babel + PostCSS) | 빌드 동작. Next가 Babel 컴파일로 전환됨 |
| Tailwind v4 + Turbopack | 동작 |
| emotion의 서버 컴포넌트 지원 | 16.4 문서에서도 미지원 |

**풀리지 않은 것**

- `htmlLimitedBots: /.*/`(모든 UA에 스트리밍 메타데이터 끄기)를 넣고 빌드 산출물에 반영된 것까지 확인했는데, 목록 밖 UA의 첫 요청 결과가 바뀌지 않았다. 다른 사용자들은 효과가 있다고 보고한다(vercel/next.js #79313). 원인 미확인. 카카오는 기본 목록으로 해결되므로 이 설정에 의존하지 않는다.
- `notFound()`가 크롤러 UA에 HTTP 200으로 나갔다. 브라우저 UA는 404.

**독립 검토의 지적 중 설계에 반영한 것**: 시간 의존 필드 때문에 TTL 병행, 등록 시점 무효화, 무효화 엔드포인트 인증, 다중 인스턴스 캐시 핸들러 *(서버 캐시 폐기로 무효, §2)*, `proxy.ts` 범위 축소 *(`proxy.ts` 자체를 두지 않기로 해 무효, §4)*, 서버 조회에 쿠키 금지(§4), `SameSite=Strict` 확인(§4).

## 22. 조사 결과 (2026-10-12)

README의 "FE가 조사할 것"을 풀었다. 스파이크는 Next 16.4.0 · React 19.3 · ky 2.2.0 · TanStack Query 5.104 · vanilla-extract 1.21 · Storybook 10.6으로 돌렸고 코드는 남기지 않았다.

### §4 설계를 그대로 돌린 결과

> 당시 설계에는 서버 캐시(`api.cached.get`, 태그 무효화)가 있었다. 지금은 뺐다(§2). 캐시 관련 행은 나중에 캐시를 붙일 때의 참고로 남긴다.

`api.cached.get`(ky + `next` 옵션), 개별 `queryOptions`, `getQueryClient()`, `serverQuery`, `<Prefetch>`, 클라이언트 화면의 `useSuspenseQuery`를 그대로 구현해 프로덕션 빌드로 확인했다.

| 확인 | 결과 |
|---|---|
| `api.cached.get`이 Next 서버 캐시에 걸림 | 됨. 같은 조회가 백엔드에 1번만 나감 |
| `api.get`은 캐시되지 않음 | 됨. 요청마다 백엔드 호출 |
| `revalidate('events/1')` → 다음 요청에 새 내용 | 됨 |
| 상위 경로 태그 `revalidate('events')`로 하위가 함께 지워짐 | 됨 |
| 브라우저 쿠키가 있는 요청에서도 서버 조회에 토큰이 붙지 않음 | 됨 |
| 서버가 조회한 값이 HTML에 실려 브라우저 쿼리로 넘어감 | 됨 |
| 실제 카카오 UA, 첫 요청의 OG 위치 | `<head>` |
| 없는 공연의 상태 코드 | **브라우저·크롤러 모두 404** |
| 같은 라우트에 `loading.tsx`를 두면 | **전부 200** — "`loading.tsx` 금지" 규칙이 필요한 이유 |

- §21의 "크롤러에게 200으로 나감"은 `generateMetadata`가 정상 반환한 뒤 페이지 본문에서 `notFound()`를 부른 구조 때문이었다. `generateMetadata`도 `serverQuery`를 쓰면 메타데이터 단계에서 404가 확정된다. Next 문서의 설명과 일치한다(스트리밍이 시작된 뒤의 `notFound()`는 200 + `noindex`).
- 이 구성에서 공연 상세 라우트는 요청마다 서버 렌더되고 **데이터만 캐시**된다. 백엔드 호출은 없고 React 렌더 비용만 든다. HTML까지 캐시하려면 `generateStaticParams` + `revalidate`를 더하면 되는데, 필요해질 때(P14 부하 측정) 판단한다.
- **ky 2.x는 `prefixUrl`이 아니라 `prefix` / `baseUrl`이다.** 그리고 스파이크에서 `beforeError` 훅으로 에러를 바꾸려다 실패했다. 에러 변환은 훅 대신 `api` 객체 안에서 한다(`throwHttpErrors: false`로 받고 상태·본문을 보고 `ApiError`를 던짐).

### vanilla-extract

| 확인 | 결과 |
|---|---|
| 개발 서버(Turbopack)에서 `.css.ts` 수정 반영 | 됨 |
| 개발 서버에서 새 `.css.ts` 파일 추가 | 됨 |
| Storybook 10 + Vite + `@vanilla-extract/vite-plugin` 정적 빌드 | 됨 |

브라우저에서 새로고침 없이 바뀌는지(HMR 화면 반영)는 서버 응답으로만 확인했고 눈으로 보지는 않았다.

### 라이브러리

| 항목 | 결과 | 판단 |
|---|---|---|
| React 19 peer 지원 | `react-datepicker` 9.1, `react-toastify` 11.1, `react-drag-drop-files` 3.1, `hamburger-react` 2.5, `vaul` 1.1, `overlay-kit` 1.9, `@yudiel/react-qr-scanner` 2.6, `@tiptap/react` 3.31, `@tanstack/react-table` 9.2, `@suspensive/react-query` 3.21, `react-hook-form` 7.90 전부 React 19 허용. `swiper` 14, `qr-code-styling` 1.9는 React peer 없음 | 호환 문제 없음. 날짜 선택·토스트·파일 선택·캐러셀을 라이브러리로 할지 자체 구현할지는 P2·P5a에서 정한다 |
| `@use-funnel/browser` | 0.0.17, 마지막 릴리스 2026-04. 연 2회 수준 | **쓰지 않는다.** 쓰는 곳이 공연 만들기 2단계 하나뿐이라 `?step=` 쿼리 + 지역 상태로 충분하다 |
| `react-simplikit` | 0.3.2. 2026-08-26~09-30 사이 0.1 → 0.2 → 0.3으로 마이너가 세 번 올랐다 | **쓰지 않는다.** 필요한 것이 `useIsClient` 수준의 훅 몇 개라 직접 둔다 |
| 마크다운 렌더러 | `marked` 18.1(2026-10), `markdown-it` 15.0(2026-09), `react-markdown` 10.1(2025-03, 원시 HTML을 쓰려면 `rehype-raw` + `rehype-sanitize` 추가) | **`marked`.** MARKDOWN → HTML 문자열 → HTML 섹션과 같은 `isomorphic-dompurify` 경로로 합친다. sanitize 경로가 하나가 된다 |

마크다운 판단의 전제: v1 본문은 toast-ui 에디터가 만든 것이라 마크다운 안에 HTML이 섞여 있을 수 있다. v1 실데이터 샘플로 렌더 결과를 확인하는 것은 P5b 완료 기준에 그대로 둔다.

### 토스 송금 링크

공식 문서는 찾지 못했다. 개발자 커뮤니티와 공개 저장소에서 쓰이는 형식은 다음과 같다.

```
supertoss://send?bank={은행명}&accountNo={계좌번호}&amount={금액}
```

- 은행명은 "국민은행"이 아니라 "국민"처럼 줄여 쓰는 사례가 있다. 계좌번호는 하이픈 제거, 금액은 정수.
- 비공식 스킴이라 예고 없이 바뀔 수 있고, 토스 앱이 없으면 열리지 않는다.
- **실기기에서 확인하기 전에는 구현을 확정하지 않는다**(P7). 백엔드의 `bankName` 값이 이 스킴이 받는 은행명과 맞는지도 그때 본다. 앱이 없을 때는 직접 계좌이체(계좌 복사)로 안내한다.

### v1 라우트와 리다이렉트

v1 코드(`490b5ac`, 2025-04-19)에서 라우트를 전수 추출했다. 실제로 외부에 유통된 URL이 어느 것인지는 코드로 알 수 없어 전부 매핑한다.

| v1 | v2 | 비고 |
|---|---|---|
| `/` | `/` | 랜딩 → 공연홈으로 내용이 바뀐다 |
| `/home` | `/` | |
| `/events/[eventId]` | 그대로 | 카카오로 유통된 주 경로 |
| `/events/[eventId]/book/option` · `book/order` | `/events/[eventId]` | |
| `/pay/confirm` · `/pay/success` · `/pay/fail` | `/orders` | PG 없음 |
| `/history` | `/orders` | 이름 변경 |
| `/history/[orderId]` | `/orders/[orderUuid]` | v1 `orderId`도 주문 uuid라 값은 그대로 넘긴다 |
| `/history/mycoupon` | `/mypage` | 쿠폰 없음 |
| `/ticket` · `/ticket/[id]` · `/ticket/qr` | `/tickets` | v1 `id`는 주문 uuid |
| `/mypage`, `/login`, `/login/expired`, `/kakao/callback` | 그대로 | |
| `/meta/term` · `/meta/privacy` | 그대로 | v1은 `public/term.html`·`privacy.html`로 rewrite한다. **정적 파일을 옮겨 와야 한다** |
| `/admin` | `/hosting` | |
| `/admin/new/hosts` | `/hosting/new/hosts` | |
| `/admin/new/events/:step` | `/hosting/new/events` | |
| `/admin/hosts/:hostId/dashboard` · `events` · `slack` · `alliance` | `/hosts/:hostId` | 슬랙·제휴 화면은 없어진다 |
| `/admin/hosts/:hostId/info` | `/hosting/hosts/:hostId/settings` | |
| `/admin/hosts/:hostId/member` | `/hosting/hosts/:hostId/members` | |
| `/admin/events/:eventId/dashboard` · `info` · `detail` · `guests` · `qr` | `/hosting/events/:eventId/…` | |
| `/admin/events/:eventId/tickets/*` · `options/*` | `/hosting/events/:eventId/tickets` | 옵션 화면은 티켓 관리 안으로 |
| `/admin/login` | `/login` | |
| `/admin/kakao/callback` | — | 리다이렉트로 받지 않는다. 카카오 `redirect_uri`를 `/kakao/callback` 하나로 정리하고 백엔드 허용 목록에서 뺀다 |

## 23. 백엔드 코드에서 확인한 것 (2026-10-12)

`Gosrock/DuDoong-Backend` `dev` 브랜치(`24aa595`, 2026-10-10)를 읽어 "백엔드에 물을 것"을 직접 확인했다.

| 질문 | 답 | 근거 |
|---|---|---|
| HttpOnly 전환 뒤 토큰 쿠키를 누가 세팅하나 | **백엔드.** 로그인·재발급이 지금도 `Set-Cookie`로 두 토큰을 내려 준다. HttpOnly는 설정값(`auth.cookie.http-only`) 하나만 바뀐다 | `CookieHelper.kt`, `AuthController.kt` |
| 액세스 토큰 쿠키 수명 | 토큰 수명과 같다(`accessTokenAge`). 기본 3600초, env로 바뀐다 | `TokenGenerateHelper.kt`, `application-common.yml` |
| 붙은 옵션은 전부 필수인가 | **전부 필수.** 티켓에 붙은 옵션 전부에 정확히 한 번씩 답해야 한다. 주관식 1~255자(trim 후), 네/아니오는 `YES`/`NO` | `V2UserOrderDomainService.cartAnswers` |
| 셀프 체크인 경로 | `/check-in` 상수로 고정 | `V2CheckInUseCase.QR_PATH` |
| 은행명 값 | **자유 입력**(30자 이내). enum이 아니다 → **2026-10-25: 선택 필드 `bankCode` 추가, 있으면 우선(#804)** | `V2TicketItemRequest.kt` |
| 알림에 이동 경로가 오나 | 안 온다. `target{type, targetId, eventId}`와 `extra`(공연명·주문번호·호스트명·역할)만 온다. 이동 화면은 FE가 정한다 | `V2NotificationDomainService.kt` |
| #758(일반 멤버 개인정보 가림, 엑셀 M+) | 미구현(이슈 열림). 입금자명은 이슈 본문에 "포함 여부 검토"로 남아 있다 → **2026-10-25: #846으로 구현, 입금자명도 가린다**(이슈는 L-1·L-3이 남아 열려 있다) | 이슈 #758, `V2OperationMapper` @432cce4 |
| #776(HttpOnly 등) | 미구현(이슈 열림). 조건은 "프론트 B단계 배포" → 2026-10-25에도 같다(기본값 셋 다 false). v2 FE는 대응돼 있다(api-contract §7) | 이슈 #776 |
| DB 스키마 V001~ 실행 | staging·prod 실행 기록이 비어 있다 → 2026-10-25: Deploy 릴리스 PR 체크리스트로 V001~V017·V019 실행(B5) | `db/migration/V001…sql`, Deploy #52·#57·#66·#68 |
| 로컬 개발 서버에서 dev API를 쿠키 인증으로 부를 수 있나 | 된다. 스테이징·dev의 CORS 허용 출처에 `http://localhost:3000`이 있고 쿠키는 `SameSite=None`이다. **포트는 3000**(5173은 v1 호스트 어드민으로 취급) | `WebOriginPolicy.kt`, `CookieHelper.kt`, `KakaoRedirectPolicy.kt` |
| 카카오 콜백 주소 | `{출처}/kakao/callback`. 요청 Referer의 경로가 `/admin`으로 시작할 때만 `/admin/kakao/callback` — v2에서는 해당 없음 | `KakaoRedirectPolicy.kt` |
| 은행 목록·토스 송금 링크 | 백엔드에 없다 → **2026-10-25: 은행 목록 `GET /api/v2/banks` 생김(#804, 공개 #813). 토스 링크·토스 은행 값 매핑은 여전히 없다** | 전체 검색, `V2BankController` @432cce4 |
| 에러 코드 전체 | 13개 도메인 200개 → [`error-codes.md`](./error-codes.md) | `*ErrorCode` enum |

코드를 읽다 새로 알게 된 것:

- **리프레시 토큰이 사용자당 하나다.** Redis에 사용자 id를 키로 저장해서 로그인·재발급 때마다 덮어쓴다. 이전 리프레시 토큰은 조회되지 않아 재발급이 실패한다. 폰과 노트북에서 같이 쓰면 한쪽이 끊긴다. → **2026-10-25: #807로 기기별 세션이 됐다(B1 해결).**
- **리프레시 토큰 수명 기본값이 3600초**로 액세스 토큰과 같다(env `JWT_REFRESH_EXP`). 운영 값은 코드로 알 수 없다. 기본값 그대로면 한 시간 동안 아무 요청이 없을 때 로그인이 풀린다.
- **은행명이 자유 입력이라 토스 송금 링크가 깨질 수 있다.** 호스트가 "국민은행", "KB", "kb국민"처럼 제각각 적으면 `supertoss://send?bank=`에 넣을 값을 만들 수 없다. FE 티켓 폼에서 은행을 목록으로 고르게 해 값을 고정하는 것이 필요하다(§19). → 2026-10-25: 서버 목록과 `bankCode`가 생겨 티켓 폼은 `GET /banks`에서 고르고 `bankCode`를 보낸다(#804).

## 24. 개발 도구 세팅 (P0)

2026-10-12 npm 실측 버전을 적는다. 정확한 핀은 P0에서 고정한다.

### 런타임과 패키지

| 항목 | 결정 |
|---|---|
| Node | 22. `.nvmrc` + `package.json`의 `engines` |
| 패키지 매니저 | pnpm. `packageManager` 필드로 고정(corepack) |
| TypeScript | `create-next-app`이 넣는 5.x를 쓴다. npm 최신은 7.0이지만 Next·typescript-eslint의 지원을 확인하기 전에는 올리지 않는다 |

### 린트와 포맷

| 도구 | 버전 | 설정 |
|---|---|---|
| ESLint | 9 이상(flat config). 최신은 10.12 — 플러그인이 전부 지원하면 10으로 간다 | `eslint.config.mjs` |
| `eslint-config-next` | 16.4 | `core-web-vitals` + `typescript` |
| `typescript-eslint` | 8.x | `no-explicit-any`, 타입 기반 규칙은 느려지지 않는 선에서 |
| `eslint-plugin-boundaries` | 7.x | 계층 규칙(§8) |
| import 정렬 | `eslint-plugin-import-x` 또는 `simple-import-sort` 중 하나 | 자동 수정 가능한 규칙만 |
| Prettier | 3.9 | `eslint-config-prettier`로 충돌 규칙을 끈다 |

`next build`는 lint를 돌리지 않는다. `pnpm lint`를 따로 두고 CI에서 실행한다.

**프로젝트 고유 규칙** — eslint로 강제하는 것:

| 규칙 | 방법 |
|---|---|
| 계층: `app → features → ui → api → utils` | `boundaries` |
| `features/audience` ↔ `features/hosting` 상호 import 금지 | `boundaries` |
| `ky`는 `src/api` 안에서만 import | `no-restricted-imports` |
| `src/api/server/`는 `src/app`에서만 import | `boundaries` |
| `any` 금지 | `@typescript-eslint/no-explicit-any` |

`eslint`가 못 잡는 것(서버 조회 라우트의 `loading.tsx` 금지, `.css.ts`의 토큰 미사용 리터럴)은 작은 스크립트나 리뷰로 본다.

### Git 훅

| 도구 | 버전 | 하는 일 |
|---|---|---|
| husky | 9.1 | `pre-commit` 훅 |
| lint-staged | 17 | 스테이징된 파일에 `eslint --fix` + `prettier --write` |

- typecheck와 테스트는 훅에 넣지 않는다(느리다). CI 게이트에서 돌린다.
- 커밋 메시지는 지금 저장소가 쓰는 `type: 내용` 형식을 따른다. `commitlint`로 강제할지는 정하지 않았다.

### 테스트와 스토리

2026-10-17 npm 실측(설치한 정확한 버전). 구성은 §10.

| 도구 | 버전 | 용도 |
|---|---|---|
| Vitest | 5.0.5 | 유닛·컴포넌트 통합(`unit` 프로젝트), 스토리 테스트(`storybook` 프로젝트) |
| `@testing-library/react` | 16.3.3 | 컴포넌트 렌더(`renderWithProviders`) |
| `@testing-library/user-event` | 14.6.8 | 사용자 입력 |
| `@testing-library/jest-dom` | 7.0.1 | DOM 단언(`toBeInTheDocument` 등, `vitest.setup.ts`에서 `/vitest` 진입점) |
| MSW | 3.0.3 | 백엔드 mock — Vitest(`msw/node`)와 e2e·QA 가짜 백엔드(`getResponse()`)가 같은 핸들러를 쓴다 |
| Storybook | 10.6.2 | `@storybook/react-vite` + `@vanilla-extract/vite-plugin`(§22에서 빌드 확인) |
| `@storybook/addon-vitest` | 10.6.2 | 스토리를 Vitest 테스트로. `@vitest/browser`·`@vitest/browser-playwright` 5.0.5, `playwright` 1.64.1 |
| `@playwright/test` | 1.64.1 | e2e·QA 시나리오. 브라우저는 Chromium(headless shell 156)만 받는다 — `pnpm exec playwright install chromium` |
| agent-browser | 0.27.0(이 머신, 전역 설치) | 선택 도구. 저장소 의존성에 넣지 않는다 |

### 스크립트

```json
{
  "dev": "next dev",
  "dev:mock": "node scripts/dev-mock.mjs",
  "check:contract": "node scripts/check-contract.mjs",
  "build": "next build",
  "start": "cp -R public .next/standalone/ && cp -R .next/static .next/standalone/.next/ && node .next/standalone/server.js",
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "vitest run --project unit",
  "test:stories": "vitest run --project storybook",
  "test:e2e": "playwright test",
  "qa": "node qa/run.mjs",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

- `dev:mock`(P3): 가짜 백엔드(`e2e/support/mock-backend.ts` 재사용, MSW 핸들러, 기본 4200번)를 띄우고 `next dev`의 `DEV_API_ORIGIN`·`API_INTERNAL_URL`을 그쪽으로 향하게 한다. 백엔드 없이 서버 조회·브라우저 조회가 같은 mock을 탄다. 로그인 흉내 `/api/__mock/login`·`/logout`(쿠키). 포트는 `PORT`·`MOCK_API_PORT`.
- **mock 세션 상태·세트**(`src/api/__mocks__/respond.ts`, 2026-10-25 백엔드 `432cce4` 기준): 액세스 쿠키 값으로 상태를 정한다 — 로그인(아무 값) / 비로그인(쿠키 없음 → 보호 요청 401 `AUTH_401_2`, 본문 `status`도 401 — #808) / 만료(`accessToken=expired` → 401 `AUTH_401_1`) / **위조(`accessToken=forged`, `authState` `'invalid'` → 401 `GLOBAL_401_1` + `accessToken` 삭제 `Set-Cookie`)**. 만료·위조는 보호 경로에서만 401이고 공개 GET·재발급·OAuth·로그아웃은 익명으로 통과한다(#792·#793) — 그래서 "낡은 액세스 쿠키 401" 세트(`*StaleAccess`)는 지웠다. 동의 강제(`agreement.enforce=true`, #840)는 기본 핸들러가 흉내 내지 않고 이름 붙인 세트만 낸다: `authHandlers.registerAgreementEnforced`(가입 — `ageOver14Confirmed`·`termsAgreed`가 `true`가 아니면 400 `Agreement_400_1`), `orderHandlers.agreementEnforced`(주문 — `hostProvisionAgreed`, 두둥이면 `dudoongTicketNoticeConfirmed`). 은행 목록 `bankHandlers`(`GET /api/v2/banks`, 백엔드 `BankCode` 25개, 공개라 쿠키를 보지 않는다)는 기본 목록에 있다. 주문 fixture 계좌에는 `bankCode`(`'088'`)가 있다. e2e는 `setMockSession(page, 'forged')`(위조 액세스 + 유효한 리프레시 쿠키 + `dd:session`)로 위조 상태를 만든다.
- `check:contract`(P3): 운영 `https://dudoong.com/api/v2`(`CONTRACT_BASE_URL`로 바꿈)의 공개 GET을 한 번씩 불러 zod 스키마로 파싱한다. 실패 필드 경로와 UNKNOWN enum 경로만 출력한다(값 없음). 네트워크가 필요해 게이트에 넣지 않는다. GG-3은 `CONTRACT_GIFT_TOKEN`이 있을 때만.
- 두 스크립트는 의존성 없이 Node 22 타입 제거 + `scripts/ts-import.mjs`(`@/` 별칭·확장자 없는 import 해석 훅)로 TS 소스를 읽는다.

- `test:e2e`·`qa`는 `next build` 뒤 standalone 서버(3100)를 띄운다(`playwright.config.ts`의 `webServer`). 방금 빌드했으면 `E2E_SKIP_BUILD=1`. 빌드할 때 `NEXT_PUBLIC_KAKAO_JS_KEY`가 없으면 `e2e-placeholder`를 넣는다 — 그 빌드의 `.next`를 그대로 배포하지 않는다.
- `qa`는 `pnpm qa <feature> [--open] [playwright 인자]`. 리포트는 `qa/reports/<feature>/<시각>/`, `latest` 링크.
- `test:stories`는 첫 실행에서 Vite가 의존성을 다시 최적화하며 실패했다. `.css.ts`가 런타임으로 부르는 `@vanilla-extract/recipes/createRuntimeFn`·`sprinkles/createRuntimeSprinkles`를 `optimizeDeps.include`에 넣어 캐시 없이도 통과한다. P2에서 스토리가 쓰는 Radix·vaul·sonner·overlay-kit·react-table·react-hook-form·zod·next/link도 같은 목록에 넣었다. `.storybook/main.ts`는 `next/link`가 읽는 `process.env`를 `define`으로 비운다(없으면 Vite에서 `process is not defined`). `next/image`는 Storybook에서 쓰지 않는다 — `src/ui`의 이미지는 `<img>`로 그린다.
- 계획했던 `check:crawler`(`scripts/check-crawler.mjs`)는 만들지 않는다 — 가짜 백엔드 위의 크롤러 응답은 Playwright e2e가 맡는다(§10). 실제 nginx·백엔드를 거친 응답은 스테이징 배포 후 확인 단계에서 curl로 본다([`staging-deploy-plan.md`](./staging-deploy-plan.md) §2-2 6단계).

`typecheck`는 `next typegen`을 먼저 돌린다. 라우트 타입(`PageProps` 등)이 생성돼 있어야 `tsc`가 통과한다.

### CI

PR 게이트 한 개: `pnpm install --frozen-lockfile` → `typecheck` → `lint` → `test`(Vitest `unit`) → `build`(§31 3회차에서 추가). ~~`test:e2e`·`qa`는 넣지 않는다(§10, 사용자 결정).~~ **P14 재검토(2026-11-01) → 사용자 결정 — main push에서만**: `test:e2e`를 같은 워크플로의 별도 job `e2e`(`if: github.event_name == 'push'` — `main` push에서만, PR에서는 skipped. 한 job · 빌드 1번, job 30분 · 테스트 단계 20분 상한, 실패 trace artifact 7일)로 넣었다. 근거 — 그룹 A 회귀에서 V 마크업 변경이 e2e 14건을 깨도 CI가 못 잡았다(#43)는 것은 main에서 잡고, PR 전에는 세션이 바꾼 라우트의 e2e를, 그룹 경계에서는 관제탑이 전체 회귀를 돌린다 — PR마다 러너 3대·빌드 3번(처음 안의 3조각)은 낭비. 로컬 전체 555건 7.3분(빌드 포함)·실패 0. `qa`는 계속 게이트 밖. 되돌리려면 `pr-gate.yml`의 `e2e` job을 지운다(implementation-log "P14 — 회귀 · 레거시 URL · 검색 노출").

### 그 밖에 P0에서 만드는 것

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` | 이 저장소의 규칙 요약(계층, `api` 객체, 스타일 세 층, 서버 컴포넌트 범위)과 `.claude/docs` 안내. 에이전트가 매번 문서 전체를 읽지 않게 한다 |
| `.env.example` | 필요한 환경변수 목록 |
| `.editorconfig`, `.prettierignore`, `.gitignore` | |
| `.github/pull_request_template.md` | 체크리스트 — 금전 경로(주문·선물·체크인) 변경 시 `pnpm qa` 리포트 확인 여부, `src/ui` 공개 API에 vanilla-extract 타입 노출 여부 |
| `public/term.html`, `public/privacy.html` | v1에서 옮겨 온다(§22) |

**넣지 않기로 한 것**: Turborepo, 원격 캐시, 번들 분석 상시 실행, 커버리지 기준. 필요해지면 추가한다.

## 25. 배포 인프라 (2026-10-12)

`Gosrock/DuDoong-Deploy`(`eee6e93`, 2026-10-10)를 읽었다. 프론트 쪽 구성은 바꿀 수 있다.

### 지금 구조

운영 서버 1대(스테이징도 1대, 평소 꺼 둠)에서 docker-compose로 전부 띄운다. 컨테이너는 호스트 네트워크를 쓴다.

| 컨테이너 | 포트 | 이미지 |
|---|---|---|
| nginx | 80 / 443 (TLS 종료, HTTP/2) | `water0641/dudoong-nginx` |
| backend | 8080 | `water0641/dudoong-api` |
| front (v1 관객) | 3000 | `david0218/dudoong-ticket` |
| admin (v1 호스트, nginx 정적 서빙) | 3100 | `david0218/dudoong-admin` |
| internal-admin (운영 어드민) | 3200 | `water0641/dudoong-internal-admin` |
| redis | 6379 (127.0.0.1만) | `redis:alpine` |

**2026-10-25 바뀐 사실(레지스트리)**: 백엔드·v1 프론트·Deploy 저장소는 운영 이미지를 비공개 ECR로 옮겼다(2026-10-24~25). 버전 태그는 덮어쓸 수 없고 스테이징용 `:dev`만 예외다. 푸시 권한은 v1 프론트 저장소에만 있다. 위 표의 이미지 이름은 2026-10-12 기준 기록이다. **2026-10-29: v2도 ECR로 간다(사용자 결정)** — [`deploy-plan.md`](./deploy-plan.md) §1, Deploy 권한 요청은 backend-questions B15.

nginx 경로 분기(`nginx/site.conf`):

| 경로 | 보내는 곳 |
|---|---|
| `/api` | backend 8080 |
| `/internal-api` | backend 8080 |
| `/internal-admin/` | 3200 |
| `/admin/` | 3100 |
| `/` | 3000 |

배포: Deploy 저장소의 compose 파일에서 이미지 태그를 올려 `main`에 머지 → 스테이징(켜져 있을 때) → 운영 순으로 `docker-compose pull && up -d`. 헬스체크는 백엔드만 본다. front·nginx·backend의 stdout은 CloudWatch(`dudoong-prod`)로 간다.

### 설계에 주는 영향

| 사실 | 영향 |
|---|---|
| **API가 프론트와 같은 출처다**(`https://dudoong.com/api/…`) | 브라우저는 같은 출처(`${location.origin}/api/v2/…`)로 부른다. CORS가 필요 없고 쿠키는 퍼스트파티다. 로컬에서는 Next `rewrites`로 `/api`를 dev API에 연결해 운영과 같은 모양을 만든다 |
| **nginx가 `/api`로 시작하는 요청을 전부 백엔드로 보낸다** | Next Route Handler를 `/api/…` 아래에 두면 브라우저에서 닿지 않는다. 지금 Route Handler는 `/healthz`와 `/csp-report`(CSP 위반 보고 — P14 보안)이고, 더 만들게 되면 `/api` 밖에 둔다 |
| 서버가 1대, front 컨테이너도 1개 | 서버 캐시를 쓰지 않아 인스턴스 수와 무관하다. 나중에 캐시를 붙이고 인스턴스를 늘리면 호스트의 Redis를 공유 저장소로 쓸 수 있다 |
| 백엔드가 같은 호스트의 8080이다 | 서버에서 도는 조회는 nginx를 거치지 않고 `http://localhost:8080/api/v2`로 부른다 |
| front 컨테이너에 `.env`가 주입되지 않는다 | 환경마다 다른 값을 두지 않아 이미지 하나를 두 환경이 쓴다. 필요해지면 compose의 `environment:`로 준다([`deploy-plan.md`](./deploy-plan.md) §4) |
| 호스트 네트워크 | standalone 서버를 `HOSTNAME=127.0.0.1`, `PORT=3000`으로 띄워 3000 포트가 밖에 열리지 않게 한다. nginx의 `proxy_pass`도 `127.0.0.1:3000`으로 맞춘다 |
| nginx가 `X-Frame-Options: DENY`, HSTS 등을 붙이고 `X-Forwarded-Host`를 지운다 | 앱에서 보안 헤더를 중복으로 넣지 않는다. 예외는 CSP — 허용 목록이 앱 코드(SDK 출처)와 같이 바뀌어서 앱이 붙인다(`next.config.ts` `headers()` · `src/utils/csp.ts`, 2026-11-01 P14 보안 — Report-Only). 절대 URL이 필요하면 `Host` 헤더나 환경변수를 쓴다 |
| 배포하면 컨테이너가 교체된다 | 수 초간 끊긴다(v1도 같음). 티켓 오픈 시간대 배포는 피한다 |
| front의 stdout이 CloudWatch로 간다 | §13의 구조화 로그가 그대로 수집된다 |

### 컷오버 때 Deploy 저장소에서 바꿀 것

컷오버 전에 미리 넣을 수 있는 변경(front 헬스체크, 스테이징 단독 배포 등)을 포함한 전체 목록은 [`deploy-plan.md`](./deploy-plan.md) §6에 있다.

1. `docker-compose.*.yml`: `admin` 서비스 삭제, `front` 이미지를 v2로 교체, nginx의 `depends_on`에서 `admin` 제거
2. `nginx/site.conf`: `location /admin/` 블록 삭제 → `/admin/*`이 front로 가고 Next `redirects()`가 `/hosting/*`으로 보낸다(§22의 표)
3. nginx 이미지 버전 올리기

호스팅 센터만 먼저 여는 단계적 전환을 하려면 nginx에 `location /hosting`을 추가해 v2 컨테이너(다른 포트)로 보내는 방법이 있다. 한 번에 바꾸면 위 세 가지로 끝난다.

### 로그인 게이트와 `SameSite=Strict`

운영 쿠키는 `SameSite=Strict`다. 브라우저는 **다른 사이트에서 넘어오는 첫 페이지 요청**에 Strict 쿠키를 싣지 않는다. 그 페이지가 뜬 뒤에 나가는 API 호출은 같은 사이트 요청이라 쿠키가 실린다.

그래서 서버(`proxy.ts`)에서 "쿠키가 없으면 로그인으로 보낸다"를 하면, 로그인한 사용자가 외부 링크로 `/tickets`나 `/hosting`에 들어올 때 로그인 화면으로 잘못 튕긴다. **로그인 게이트는 서버가 아니라 브라우저에서 한다**(§4 인증). `proxy.ts`는 두지 않는다.

이 동작은 브라우저의 쿠키 규칙에서 추론한 것이고 실제 환경에서 재현하지는 않았다. 스테이징에서 확인한다(P4b). 스테이징 쿠키는 `Lax`라 운영과 다르게 동작할 수 있다는 점도 같이 본다.

## 26. Cache Components를 켠 구성 확인 (2026-10-12)

§21에서 Cache Components를 끄기로 했던 근거는 대부분 캐시를 쓸 때 생기는 문제였다(무효화 직후 옛 내용, 빌드 때 id 1개 이상 필요). 서버 캐시를 쓰지 않기로 하면서 다시 확인했다. §4의 `<Prefetch>` 구조를 `cacheComponents: true`로 빌드했다.

| 단계 | 결과 |
|---|---|
| 설계 코드 그대로 | 빌드 실패 — 서버 조회 라우트가 "캐시되지 않은 데이터를 프리렌더 중에 읽었다" |
| 서버 조회 라우트에 `export const instant = false` | 그 라우트는 통과. 호스팅 센터의 클라이언트 페이지가 `useParams()`로 실패 |
| 호스팅 레이아웃에 `<Suspense>` | 빌드 성공 |

빌드된 앱의 동작:

| 확인 | 결과 |
|---|---|
| 실제 카카오 UA, OG 위치 | `<head>` |
| 브라우저 UA, OG 위치 | `<head>` |
| 요청마다 백엔드 호출 | 됨(3번 열면 3번 호출) |
| 없는 공연 | 카카오 UA 404, 브라우저 UA 200 |

이 확인은 ky와 vanilla-extract를 뺀 축소 구성으로 했다. 전체 구성(§22)은 끈 상태로만 돌렸으므로, **켠 상태의 전체 구성 확인이 P0의 첫 작업**이다.

## 27. 검토 1회차 (2026-10-14)

요구사항 · 원본(기획서, Figma 이미지, 백엔드 `dev`) · 아키텍처 세 방향으로 독립 검토를 돌렸다. 이 문서에서 바꾼 것:

| 바꾼 것 | 위치 |
|---|---|
| 401 처리를 표로 확정 — 코드 무관 재발급, 탭 간 `navigator.locks` 직렬화, GM-1 401은 익명, `api`는 이동하지 않음, 게이트는 세션 확정 뒤 렌더, 세션 상실 시 `queryClient.clear()` + 하드 이동, `setAuthHandlers` 주입 | §4 인증, §8 |
| 사용자별 값을 viewer 쿼리로 분리(호스트 홈, GH-14 준비중 공연, 선물 랜딩) | §4, §20 |
| 라우트 트리 — `(audience)` 공통 헤더, `(public)` 레이아웃 한 곳에 `instant = false`(P0에서 "페이지마다"로 정정, §31), `(app)/(protected)` 게이트 | §3 |
| 주문 완료 화면 = `/orders/[orderUuid]?created=1` | §3, §19 |
| Route Handler는 `/healthz` 하나 | §3, §25 |
| `(public)`의 비프리페치 쿼리는 `useQuery`, 공개 화면 이동 피드백(`useLinkStatus`) | §3, §4 |
| zod 파싱 정책, QueryClient 기본 옵션, 명령형 `toast()`와 `meta.handled` | §4, §13 |
| 오버레이 규칙(주소 연동은 선언적, 내부 `AsyncBoundary`, 이동 시 `unmountAll`) | §5 |
| `@suspensive/react-query` 제거 → `<AsyncBoundary>` | §15 |
| 장소 입력(우편번호 + 카카오 Geocoder) 추가, "지도 제외" 범위를 관객 상세로 좁힘 | §15 |
| env — 빌드 검증은 카카오 키만, 서버 값은 `instrumentation.ts`에서(2회차에서 없앰, §28), 이름 `API_INTERNAL_URL`, `api`/`authApi` | §4, §12 |
| `isomorphic-dompurify`(jsdom) 메모리 측정, 대안 `sanitize-html` | §17 |
| §2 안의 404 서술 모순 정리, P0 확인 표(Suspense × UA × 404/5xx) | §2 |
| 서버 캐시·인스턴스 여럿 전제, `cache: 'no-store'`, `SerializedStyles`, §16 결론의 `@dnd-kit` 잔재 정리 | 요구사항, §16, §20, §24 |

여전히 확인하지 못한 것:

| 항목 | 확인 방법 |
|---|---|
| 카카오 UA가 Next 내장 봇 목록에 걸리는 것 | 팀 스파이크 기록뿐. P5b 카카오 공유 디버거 |
| 켠 구성에서 Suspense 없이도 브라우저가 200인 이유 | 문서에 설명 없음. P0 표 |
| `@vanilla-extract/next-plugin`의 `unstable_turbopack: { mode: 'auto' }` 옵션 이름 | §22 스파이크에서 썼으나 공식 문서로는 미확인. P0에서 설치 버전 README로 확인 |
| `useSuspenseQuery`가 클라이언트 조회 화면에서 서버 호출을 일으키는지 | P0(§3) |

2회차에서 확인: TanStack `HydrationBoundary`는 캐시에 이미 있는 쿼리를 **dehydrate된 `dataUpdatedAt`이 더 새로울 때만**, 렌더 뒤 effect에서 덮어쓴다([소스](https://github.com/TanStack/query/blob/main/packages/react-query/src/HydrationBoundary.tsx)). 다시 들어올 때 서버가 새로 받은 익명 값이 캐시의 인증 값보다 새로우므로 덮어쓴다 — viewer 분리가 실제로 필요하다. 401 코드는 백엔드 코드로 확인했다(§4).

## 28. 검토 2회차 (2026-10-15)

1회차에서 새로 쓴 설계를 다시 검토했다. 이 문서에서 바꾼 것:

| 바꾼 것 | 위치 |
|---|---|
| 세션 상실의 기준과 이동 — 재발급 응답이 401·403일 때만 세션 상실(5xx·네트워크는 일시 오류로 세션 유지), `onSessionLost`는 보호 화면이면 `/login/expired`, 공개 화면이면 같은 주소를 익명으로 `reload` | §4 인증 |
| `dd:hadSession` 플래그 — 익명 방문자의 GM-1은 재발급을 시도하지 않음, `/login`과 `/login/expired`를 가름. 세션 쿼리 `staleTime` 5분 (3회차에서 값 플래그 `dd:session`으로 바꾸고 게이트 분기를 없앰, §29) | §4 |
| 탭 간 재발급 확인을 `dd:refreshedAt` 비교로 단순화(잠금 안에서 원래 요청을 재시도하지 않음), 재발급 타임아웃 10초 | §4 |
| `authApi`에는 401 가로채기 없음(Web Locks 재진입 교착 방지). 로그인 콜백의 `USER_403_1`·`AUTH_400_1` 처리 | §4 |
| `{ public: true }`는 항상 `credentials: 'omit'` | §4 |
| 로그아웃은 진행 중 변경이 있으면 비활성, `pageshow` bfcache 재검사 | §4 |
| 경로를 읽는 컴포넌트는 children을 감싸지 않는 말단 + 자체 Suspense, `<OverlayRouteReset />` | §3, §5 |
| 게이트 없는 `(app)` 화면은 `useQuery`만 | §3 |
| `/hosting/events/[eventId]` 리다이렉트는 `redirects()`로, 공연 어드민 사이드메뉴는 `hosting/events/[eventId]/layout.tsx` | §3 |
| 토스트 — 조회는 배경 재조회 실패만, 변경은 `meta.handledCodes`, 세션 상실은 토스트 없음(2026-10-31: 변경은 호출 쪽 `handleError`로 바뀜) | §4, §13 |
| 주소로 여는 오버레이 — push로 열고 연 주체에 따라 back/replace로 닫음, 다른 쿼리 보존 (3회차에서 `replace`만으로 바꿈, §29) | §5 |
| viewer 표에 "확정 전 대기 영역"(선물 랜딩은 상태 영역 전체 스켈레톤), 공개 키 무효화 | §4 |
| `<Prefetch>`가 `infiniteQueries`도 받음(3회차에서 뺌, §29), queryKey 순서(리소스 → viewer → infinite → 파라미터) | §4 |
| zod 열린 enum은 `.catch` + `UNKNOWN` 한 가지 | §4 |
| `<AsyncBoundary>`에 `QueryErrorResetBoundary` 포함 | §4 |
| `client.ts`(ky·래퍼 해제·401) / `http.ts`(`api`·`authApi`) 역할 정리 | §4 |
| env — `instrumentation.ts`·`env/server.ts` 제거, `http.ts`가 호출할 때 읽음 | §12 |
| Origin 검사(#763)는 이미 report-only로 들어가 있음 | §4 |
| §21 끝의 캐시 설계 항목을 무효로 표시 | §21 |

여전히 확인하지 못한 것:

| 항목 | 확인 방법 |
|---|---|
| `useLinkStatus`의 실제 동작 | P5a |
| `instant = false` 라우트로 가는 `<Link>` 프리페치가 백엔드를 부르는지 | P0(§3) |
| 헤더의 형제 Suspense가 `(public)` 상태 코드에 영향을 주는지 | P0 상태 코드 표(§2) |
| `useSuspenseQuery`가 빌드·서버 렌더에서 실행되는지 | P0(§3) |
| `next typegen`·`next dev`가 `next.config.ts`를 로드해 카카오 키를 요구하는지 | P0 |
| 정적 셸 경로가 bfcache 대상이 되는지 | P4b |

3회차에서 닫힌 항목: "백엔드 JWT 필터가 재발급 앞에서 401을 내는지"는 낸다(§4 인증, 백엔드 코드 — 2026-10-25 백엔드 #792로 더는 내지 않는다). "GH-3에 팔로워 수가 있는지"는 있지만 화면에 보이지 않아 팔로우 뒤 공개 키를 무효화하지 않는다(§4). `useLinkStatus`의 동작은 문서로 확인했다(§3).

## 29. 검토 3회차 (2026-10-15)

2회차에서 새로 쓴 인증·토스트·오버레이 설계를 끝까지 따라가 보고, 쌓인 규칙 중 덜어낼 것을 찾았다. 이 문서에서 바꾼 것:

| 바꾼 것 | 위치 |
|---|---|
| `instant = false`의 뜻을 바로잡음 — 렌더 방식이 아니라 빈 정적 셸·즉시 이동 검증에서 빼는 설정 | §2 |
| 세션 표시를 불린 `dd:hadSession`에서 **로그인마다 새로 만드는 값 `dd:session`**으로. `pageshow`가 계정 전환도 잡는다 | §4 인증 |
| `dd:session`이 없으면 **모든** 401이 재발급 없이 `ApiError(401)` — GM-1 특례를 일반 규칙으로. 익명 확정 상태의 사용자별 버튼은 `/login?redirect=` 링크 | §4 |
| GM-1 결과를 세 가지로(세션 / `null` / throw). 게이트에 error 상태(전체 화면 재시도, 이동 없음). 게이트는 항상 `/login`, `/login/expired`는 `onSessionLost`만 | §4 |
| 재발급 일시 오류면 원래 요청의 401이 아니라 재발급 응답의 에러를 던진다(기본 retry가 적용되게) | §4 |
| 재발급 401이 `AUTH_401_1`·`GLOBAL_401_1`이면 잠깐 뒤 한 번 더 — 백엔드 필터가 인증 경로에서도 액세스 쿠키를 먼저 검사한다(백엔드 코드로 확인). 그 밖의 4xx도 세션 상실 (→ 2026-10-25 백엔드 #792로 원인 해소, 재시도 제거 — 지금은 4xx 모두 상실) | §4 |
| 잠금 대기에 `AbortSignal.timeout(15000)`, Web Locks가 없을 때 `dd:refreshedAt` 변경 시 한 번 재시도 | §4 |
| `SessionLostError`(토스트·에러 화면이 거른다), `onSessionLost`는 한 번만 | §4 |
| 다른 탭의 로그아웃·계정 전환은 `storage` 이벤트로 | §4 |
| 로그인 콜백 성공은 하드 이동, 콜백 401 안내, 로그아웃은 응답과 상관없이 로컬 정리 | §4 |
| ky 인스턴스는 기준 주소 없이, `http.ts`가 요청마다 `prefix`. JSON이 아닌 응답은 `ApiError(status, 'NON_JSON')` | §4 |
| `<Prefetch>`에서 `infiniteQueries`를 뺌 — GH-14는 브라우저 `useInfiniteQuery` | §4 |
| 변경 에러 처리는 `handleCodes(map)` 헬퍼 하나로(코드 목록을 한 곳에). 조회 토스트에서 다음 페이지 실패 제외·고정 id(2026-10-31: `handleCodes` → 호출 쪽 try/catch + `handleError`) | §4, §13 |
| 뒤로가기는 열린 오버레이(시트·모달·팝업·주소 오버레이)를 닫는다 — `pushState`로 같은 주소 항목을 넣고 popstate로 닫는다(P2) | §5 |
| `LinkProgress`은 카드 `<Link>` 안 인라인 표시(전역 막대 불가) | §3 |
| 호스팅 센터 게이트는 P4a 게이트를 그대로 쓴다 | §3 |
| `src/app` = 라우트 파일 + 루트 셸 클라이언트 파일 2개 | §8 |
| Safari ITP 대가, 카카오톡 인앱 브라우저 확인을 기록 | §4 |

여전히 확인하지 못한 것:

| 항목 | 확인 방법 |
|---|---|
| 헤더 등 형제 Suspense가 `(public)` 상태 코드에 영향을 주는지(영향이 없을 가능성이 높다 — 요청 시점엔 경로가 정해져 말단이 suspend하지 않고, 페이지 await는 셸 안이다) | P0 상태 코드 표(§2) |
| Cache Components의 부분 프리페치가 `instant = false` 라우트로 가는 링크에서 백엔드를 부르는지 | P0 |
| 카카오톡 인앱 브라우저의 Web Locks·`localStorage` 영속성 | P4b 실기기 |
| 하이드레이션 뒤에도 사용자 history state가 남는지(지금은 `replace`만 써서 상관없다. P2에서 `pushState`로 바꿀 때만 의미가 있다) | P2 |
| 정적 셸 경로가 bfcache 대상이 되는지 | P4b |
| Chrome의 "인증 상태가 바뀌면 bfcache에서 내보냄" 롤아웃 완료 여부 | P4b |

### 3회 검토 요약

세 번 모두 같은 세 기준(요구사항 충족, 기획서·Figma·백엔드와의 모순·누락, 프론트 아키텍처)으로 서로 다른 검토자가 보고 반영했다.

| 회차 | 지적 | 주요 변경 |
|---|---|---|
| 1회차(2026-10-14) | 58건(상 6) | 장소 좌표 입력, Phase 선후 관계, 401은 코드 무관 재발급, 공개/viewer 쿼리 분리, `(audience)`·`(protected)` 라우트 그룹, `@suspensive` 제거, `patterns.md` §4~§10 재작성, 화면별 에러 표 신설(§27) |
| 2회차(2026-10-15) | 42건(상 2) | 세션 상실 기준(재발급 401·403만)과 이동할 곳, 토스트 규칙, `instrumentation.ts` 제거, 에러 표 보강, 주문 완료 라우트 보강(§28) |
| 3회차(2026-10-15) | 59건(상 1) | GM-1 일시 오류 처리, `dd:session` 값 플래그와 탭 간 동기화, 백엔드 인증 필터 확인, 선물 취소 안내 조건 축소, 완료 기준·Figma 차이 보강. **덜어낸 것**: `<Prefetch infiniteQueries>`, 주소 오버레이의 back/replace 분기, 게이트의 `/login/expired` 분기, GM-1 특례 행(§29) |

1·2회차는 빠진 것을 채웠고, 3회차는 구조를 바꾸는 지적 없이 문서 간 어긋남과 경계 상황을 닫았다. 상(上) 지적은 6 → 2 → 1로 줄었다.

## 30. GUI 화면 반영 (2026-10-15)

Figma "GUI 화면" 파일(`1Cn4WOu6TDaSajbFIuH6fO`)을 읽었다. 화면 목록은 [`gui-screens.md`](./gui-screens.md)에, GUI·서버 차이에서 프론트가 정한 것(핸드오프)의 원본은 [`design-requests.md`](./design-requests.md) §3에 있다. 결정에 영향을 준 것만 적는다.

| 바뀐 것 | 위치 |
|---|---|
| 호스팅 센터 데스크탑 셸 = 고정 좌측 사이드바(`Desktop - 27`). 모바일은 헤더 + 햄버거 드로어 + 공연 전환 ▾. 1024~1279 배치는 P1 | §3 "호스팅 센터 셸", plan P1·P4s·P11 |
| GUI가 서버 계약과 다른 곳은 서버 기준으로 만든다(체크아웃 예매번호·티켓번호 제거, 은행명 추가, 할인금액 제거, v2에 없는 리마인드 알림 제외(→ 2026-10-25 #810으로 D-1·1시간 전 앱 내 알림이 생겼다 — plan P9b), 티켓 폼 라벨·기본값, 호스트 삭제 숨김, 입장 분모 = 발급 수) | plan P7·P9·P9b·P10b·P12·P13a, design-requests §3 |
| GUI에 없는 입구는 계획대로 만든다([주문취소]·환불 계좌, 옵션 붙이기, 공유 버튼, 무료 [신청하기]) | plan P5b·P7·P9·P12 |
| 공연 생성 뒤 이동은 GUI(홈 + 토스트)와 계획(대시보드)이 달라 디자인 확인 전까지 대시보드 | plan P10a |
| 장소 아래 회색 박스(`329:7206`) — 지도 미리보기면 카카오맵 지도 SDK로 그린다(Geocoder와 같은 SDK) | plan P11, design-requests Q3 |
| 공연준비 홈 헤더는 로고형(`host title`, 벨 없음)으로 잠정 — 모바일 알림 벨은 햄버거 드로어 안, 데스크탑은 사이드바 하단 사용자 줄. 제목형(벨 + 아바타)으로 정해지면 `Header` 변형과 벨 위치만 바꾼다 | §3 "호스팅 센터 셸", plan P4s, design-requests Q17 |

**2026-10-25 갱신** — GUI 화면 파일의 "Ready for dev" 판(gui-screens §3)과 와이어프레임 V0.9 변경·코멘트(figma-structure 2026-10-25 절)를 반영했다. GUI가 확정한 호스팅 PC 구조는 받아들이고, 와이어프레임만 근거인 동작 변경은 계획을 바꾸지 않고 질문(design-requests Q31~Q40)으로 올렸다. 위 표의 첫 행(`Desktop - 27` 사이드바 셸, 1024~1279 배치)과 마지막 행의 데스크탑 벨 위치는 아래로 바뀌었다.

| 바뀐 것 | 위치 |
|---|---|
| 호스팅 데스크탑 셸 = 전역 상단 바 `Top bar_Host`(58, 벨 포함 — `hosting/layout.tsx`) + 공연 스코프 사이드바(268, 등록 전 4 / 후 6 메뉴 — `events/[eventId]/layout.tsx`) + 등록 후 대시보드만 우측 일정 패널(286/335/388). 공연 밖 화면은 사이드바 없이 본문 최대 1280. PC 벨은 상단 바 | §3 "호스팅 센터 셸", plan P4s·P11·P13a, design-requests Q2(해결 — git `f71a2dc`) |
| 호스팅 브레이크포인트 1133 / 1280 / 1440(1133 미만 모바일, 1133~1279도 3단). 관객은 1024 유지 — 관객도 1133인지 Q38. 토큰 나누기는 P4s 착수 전(→ 2026-10-31 사용자 결정: 둘 다 1024, 나누지 않음) | §14, design-system §2, patterns §1 |
| 사이드바 메뉴 컴포넌트 이름 `Component 1` → `사이드바 메뉴`(`true`/`false`/`alert`) | §3, design-system §3 |
| 지도 미리보기 확정(Q3 해결) — 카카오맵 지도 SDK. 미리보기는 저장할 수 있을 때만 연다 | plan P11 |
| 화면 문구 "호스팅 센터" → "공연준비"(라우트 `/hosting`은 그대로) | plan P4s·P5a, design-requests 문구 정정 |
| 와이어 근거 동작 변경은 보류: [주문취소] = 호스트 연락처 시트(Q31), 예매자 관리 6탭 + 환불 여부 열(Q32 — 2026-10-31 사용자 결정으로 계획대로 5탭 + 환불 탭), 판매 중단 티켓 딤드(Q33 — 2026-10-31 딤드로 결정, 백엔드 2.5.2 #894 GP-5 `isSuspended`), 체크아웃 "판매정보"(Q34), PC 상세 지도(Q35), 주문내역 상태 필터(Q36), 모바일 공연 메뉴 바텀시트(Q37), 끝난 공연 티켓 정리(Q40 · backend-questions B10) | plan 해당 Phase에 "(Qxx 대기)" |

## 31. P0 스캐폴딩과 스파이크 결과 (2026-10-16)

브랜치 `feat/p0-scaffold`(2026-10-31 `feat/v2-foundation-logic`으로 이름 변경). Next 16.4.1 · React 19.3.1 · TanStack Query 5.104.3 · ky 2.2.0 · zod 4.6.7 · vanilla-extract(css 1.21.3, next-plugin 2.5.2) · ESLint 9.39 · TypeScript 5.9 · Vitest 5.0 · MSW 3.0 · Storybook 10.6 · pnpm 10.34.7.

### 수직 슬라이스

`(audience)/(public)/page.tsx`가 `<Prefetch queries={[eventTagsQuery()]}>`로 GE-11을 서버에서 조회하고, 클라이언트 컴포넌트 `TagList`가 `useSuspenseQuery`로 같은 쿼리를 읽어 `src/ui` `Button`으로 그린다. `next build` 결과 `/`는 동적(ƒ), `/healthz`는 정적(○)이다.

### 스파이크 — 가짜 백엔드 + standalone 서버

저장소 복사본에 실험 라우트를 붙여 standalone 서버(`HOSTNAME=127.0.0.1`)로 돌렸다. 실험 라우트는 저장소에 넣지 않았다.

| 경우 | 카카오 UA | 브라우저 UA |
|---|---|---|
| 공연 있음, Suspense 없음 | 200, OG `<head>` | 200, OG `<head>` |
| 없는 공연, Suspense 없음 | **404** | 200 + `noindex` |
| 백엔드 500, Suspense 없음 | **500** | 200 |
| 공연 있음, Suspense 있음 | 200, OG `<head>` | 200, OG **본문**(스트리밍) |
| 없는 공연, Suspense 있음 | **200** | 200 |
| 백엔드 500, Suspense 있음 | **200** | 200 |

- **`(public)`에 Suspense를 두지 않는 규칙은 필요하다.** Suspense가 있으면 크롤러도 404·500 대신 200을 받는다. `(public)`/`(app)` 분리를 유지한다.
- **서버 조회에 쿠키가 실리지 않는다.** 요청에 쿠키를 붙였는데 백엔드가 받은 17건 모두 쿠키가 없었다.
- **클라이언트 조회 화면도 서버에서 백엔드를 부른다.** 프리페치 없이 `useSuspenseQuery`만 쓴 보호 화면에서 Next 서버발 호출이 생겼다. 게이트가 세션 확정 전 children을 그리지 않는 규칙(§4)이 실제로 필요하다.
- **`instant = false`는 페이지마다 둔다**(§2 규칙 표).
- 실패한 서버 조회는 캐시되지 않아 `generateMetadata`와 페이지가 각각 다시 부른다(500일 때 요청 하나에 백엔드 호출 1~2번). 정상 응답은 한 번만 부른다.
- 메모리: standalone 유휴 RSS 약 163MB, 공연 상세 500회 요청 뒤 187MB. `isomorphic-dompurify`(jsdom)는 아직 넣지 않아 P5b에서 다시 잰다.
- standalone 산출물 43MB.
- `.css.ts` 변경 반영: 개발 서버에서 토큰 값을 바꾸면 다시 시작하지 않고 새 CSS가 나온다. 브라우저 HMR(새로고침 없음)은 브라우저로 보지 않았다.

### 하지 못한 것

| 항목 | 이유 | 언제 |
|---|---|---|
| Docker 이미지 빌드 | 이 컴퓨터에 Docker가 없다. Dockerfile·워크플로는 썼다 | GitHub Actions 첫 실행(`image.yml`) |
| `<Link>` 프리페치가 `instant = false` 라우트에서 백엔드를 부르는지 | 브라우저가 필요하다 | P5a(공연홈 카드) |
| 브라우저 HMR | 브라우저가 필요하다 | P1 |
| 외부 확인(산출물 D) | 사람이 할 일 | 진행 중 |

### 계획과 다르게 한 것

- `eslint-plugin-boundaries` 7.x는 규칙 이름이 `boundaries/dependencies`, 옵션이 `policies`로 바뀌었다.
- MSW 3.x는 `onUnhandledRequest`가 `onUnhandledFrame`이다.
- 브라우저의 API 기준 주소를 `/api/v2`가 아니라 `${location.origin}/api/v2`로 만든다. ky가 만드는 `Request`가 절대 URL을 요구한다(테스트 환경에서 드러남). 동작은 같다.
- 응답 enum은 `src/api/shared/open-enum.ts`의 `openEnum(name, values)` 한 가지로 연다.
- 기존 `.gitignore`가 `term.html`·`privacy.html`을 무시하고 있어 지웠다.
- Next 16.4.1의 `create-next-app` 기본값에 `partialPrefetching: true`가 들어 있어 그대로 켰다.
- mock은 `src/api/__mocks__/`(directory-structure대로). `vitest.config.mts`(ESM 설정).
- Dockerfile은 deploy-plan §3 원본에 `pnpm install --ignore-scripts`(빌드 스크립트 없이 설치해도 standalone에 sharp가 들어가는 것을 확인), `HEALTHCHECK`(`/healthz`), runner의 `NEXT_TELEMETRY_DISABLED`를 더했다. `HOSTNAME=127.0.0.1`이라 로컬에서 `docker run -p 3000:3000`으로는 접속되지 않는다 — 확인할 때는 `--network host` 또는 `-e HOSTNAME=0.0.0.0`.
- `release.yml`(버전 태그 재사용, deploy-plan D3)을 P0에 미리 넣었다. 태그는 그 커밋의 Image 워크플로가 끝난 뒤 푸시한다. `pr-gate.yml`은 `main` 푸시에서도 돈다.
- `check:crawler` 스크립트는 P5b에서 만든다. (2026-10-17: 스크립트 대신 Playwright e2e가 맡기로 바꿨다 — §10)
- `poweredByHeader: false`, `/meta/term`·`/meta/privacy` → `public/*.html` rewrite(운영 포함). `/admin/*` 리다이렉트는 경로별 표(§22)대로 P10a에서 넣는다.

### 1회차 검증 뒤 고친 것

| 문제 | 고침 |
|---|---|
| 파싱 실패(ZodError)가 `ApiError`가 아니어서 재시도되고 코드가 없었다 | `safeParse` → 로그 → `ApiError(status, 'PARSE_ERROR')`. 재시도 화이트리스트(5xx `ApiError`, `TypeError`, ky `TimeoutError`) |
| 본문이 `null`·원시값이면 `TypeError`가 샜다 | `BAD_ENVELOPE` |
| `API_INTERNAL_URL` 접미사를 빠뜨리면 공개 페이지가 조용히 404 | `/api/v2`로 끝나지 않으면 에러 |
| `openEnum`이 필드 누락까지 `UNKNOWN`으로 삼키고 로그 경로가 비었다 | 문자열만 열린 enum, 누락은 `PARSE_ERROR`. 로그는 enum 이름만 |
| UNKNOWN 그룹이 둘이면 React key 중복 | 순서를 key에 섞고 라벨 타입을 enum으로 좁힘 |
| 수동 실행이 다른 브랜치에서 `:main`을 덮어쓸 수 있었다, 동시 빌드 | `:main`은 main에서만(metadata-action), `concurrency`, OCI 라벨 |
| `<Prefetch>`가 무한 쿼리를 받았다 | 타입에서 `initialPageParam`·`getNextPageParam`을 막음 |
| QueryClient 기본 `staleTime` 30초가 모든 쿼리에 | 기본 0, 공개 쿼리는 `queryOptions`에서 30초 |
| `serverQuery` 실패 로그가 없었다 | 리소스 이름·status·code만 로그. Next 내부 신호(`unstable_rethrow`)는 로그 없이 다시 던짐 |
| 등록되지 않은 폴더·`ky/*` 깊은 경로가 lint를 우회 | `boundaries/no-unknown-files`, `ky/*` 패턴 |
| `.env.production` 등이 무시되지 않았다 | `.env*` + `!.env.example`, `.dockerignore`에 `*.tsbuildinfo` |

테스트 9건(응답 래퍼 7, 재시도 규칙 2). `error.tsx`·`not-found.tsx`는 P5a 범위다.

### 2회차 검증 뒤 고친 것

| 문제 | 고침 |
|---|---|
| ky 2.2는 네트워크 오류를 `TypeError`가 아니라 `NetworkError`로 던져 재시도되지 않았다(1회차 테스트가 실제로 던지지 않는 `TypeError`로 검사해 가렸다) | `http.ts`가 ky의 `NetworkError`·`TimeoutError`를 `ApiError(0, 'NETWORK' \| 'TIMEOUT', 라우트 패턴)`으로 바꾼다. 재시도는 `status >= 500 \|\| status === 0`(PARSE_ERROR 제외) |
| 파싱 실패 로그의 `route`와 Next가 찍는 ky 에러 메시지에 실제 경로(`gifts/<토큰>`)가 남았다 | 로그는 `routePattern()`(소문자 단어 세그먼트만 남기고 나머지는 `:param`). ky 에러는 URL 없는 `ApiError`로 바꿔 던진다 |
| 기준 주소 계산 실패가 동기로 던져져 프리렌더 중 `Date.now()` 에러가 함께 찍혔다 | `request()`를 async로 바꿔 Promise 거절로 낸다 |
| `API_INTERNAL_URL=`(빈 문자열)이면 500 | `\|\|`로 기본값 |
| `authApi` 서버 주소가 경로 접두사를 버렸다 | `/api/v2` → `/api/v1/auth` 치환 |
| `openEnum` 경고가 항목마다 반복됐다 | enum 이름별로 한 번만 |
| `serverQuery` 비정형 실패 로그가 `Error`뿐이었다 | `이름: 메시지`(ky 에러는 이미 URL 없는 ApiError) |
| `image.yml`의 `concurrency`가 대기 중인 중간 커밋 빌드를 취소해 sha 이미지가 빠질 수 있었다 | 빌드는 동시 제한 없이 커밋마다, `:main`은 별도 잡이 main 최신 커밋일 때만 `imagetools create`로 옮긴다 |
| 로컬에서 `DEV_API_ORIGIN`만 주면 `/`가 500 | §12 표와 `.env.example`에 `API_INTERNAL_URL`도 함께 준다고 적었다 |
| `engines`가 `>=22` | `22.x` |

테스트 14건(응답 래퍼 7, 재시도 규칙 2, 서버 분기 Node 환경 5 — 닫힌 포트·접미사 누락·빈 문자열·authApi 경로·routePattern).

**남은 것**: `<Prefetch>`가 `queryFn` 없는 객체를 타입에서 막지 못한다(`queryOptions()` 결과 타입에서 `queryFn`이 선택 필드). 상태 코드 표는 헤더 없는 셸로 채웠으므로, 헤더(`usePathname` 말단 + Suspense)가 생기는 P2·P5a에서 다시 채운다(§3 약속). Docker 베이스 이미지(`node:22-alpine`)는 태그를 고정하지 않았다 — 첫 CI 빌드에서 다이제스트를 확인해 고정한다.

### 3회차 검증 뒤 고친 것

| 문제 | 고침 |
|---|---|
| 본문 읽기(`res.json()`)가 ky 타임아웃·네트워크 처리 밖에 있었다 — 천천히 오면 SSR이 끝없이 기다리고, 받다가 끊기면 `NON_JSON`(재시도 안 됨) | `request()`가 본문을 마감 시각(헤더+본문 10초, `REQUEST_TIMEOUT_MS`) 안에서 읽는다. 시간 초과 `TIMEOUT`, 끊김 `NETWORK`, 호출자 취소는 그 사유를 그대로. 마감 계산은 `performance.now()` — `Date.now()`는 Cache Components 프리렌더에서 빌드가 멈춘다(이 실수를 빌드가 잡았다) |
| NETWORK·TIMEOUT의 `reason`에 라우트 패턴이 들어가 P4 토스트에 그대로 보일 뻔했다 | `ApiError`에 `route` 필드를 따로 둔다. `reason`은 서버 문장만(없으면 `''`). 토스트는 `reason`이 비면 고정 문구 |
| `authApi` 경로 테스트가 아무것도 검증하지 않았다(변이 실험에서도 통과) | MSW로 정확한 주소(`/prefix/api/v1/auth/token/refresh`)에 응답을 두고 성공을 단언. 끊김은 실제 소켓으로 테스트 |
| `pnpm start`가 `public`·`.next/static` 없이 떠 CSS·약관이 404 | `start`가 두 폴더를 standalone으로 복사한 뒤 띄운다 |
| `serverQuery`가 비 ApiError 메시지(queryKey 토큰·env 값 포함 가능)를 남겼다 | 이름만. `<Prefetch>`는 `queryFn`이 없으면 리소스 이름만 담은 에러를 먼저 던진다 |
| 전부 소문자인 토큰이 `routePattern`을 통과했다 | `gifts` 바로 뒤 세그먼트는 모양과 상관없이 가린다 |
| PR 게이트가 `next build`를 돌리지 않아 Cache Components 위반이 main에서야 드러났다 | `pr-gate.yml`에 `pnpm build` |
| ky timeout이 기본값에 암묵적으로 기댔다 | `timeout: 10_000` 명시 |
| `@swc/core` 빌드 스크립트 경고 | `pnpm.ignoredBuiltDependencies` |

테스트 15건. 3회차까지 P0 코드에서 고친 것은 버그 19건(1회차 7, 2회차 6, 3회차 6)이다.

**보일러플레이트 정리(2026-10-17)**: 요청 파이프라인(기준 주소·ky 호출·본문 읽기·에러 변환·래퍼 해제)을 `src/api/client.ts`로 모으고 `http.ts`는 `api`·`authApi` 객체만 남겼다 — P4a의 401 재발급이 `client.ts`의 `request()`에 붙는다. `routePattern`은 `src/api/shared/route-pattern.ts`. 테스트는 대상 이름(`http.test.ts`, `http.server.test.ts`)으로, vitest 전역 타입을 빼고 각 테스트가 `vitest`에서 import한다. `vite-tsconfig-paths` 대신 Vite 내장 `resolve.tsconfigPaths`(Vitest·Storybook). `CLAUDE.md`가 `@AGENTS.md`를 불러온다. `src/app/favicon.ico`, `.vscode/settings.json`·`extensions.json` 추가.

**P0에서 하지 않은 것(추가)**: deploy-plan D1의 레지스트리 준비(§9 #7 — 2026-10-29 ECR로 결정, B15 대기), 카카오 JS 키가 환경별로 같은지(§9 #6), 이미지 크기(standalone 41~43MB만 쟀다), `global-error.tsx`(P5a).

## 32. 테스트 환경 세팅 (2026-10-17)

브랜치 `feat/testing-setup`. 구성과 이유는 §10, 버전·스크립트는 §24.

| 확인 | 결과 |
|---|---|
| `pnpm test`(Vitest `unit`) | 4파일 18건 통과 — 기존 15건 + `TagList` 컴포넌트 통합 3건(정상, 모르는 카테고리 → 기타, 빈 배열) |
| `pnpm test:stories` | 스토리 19개 통과, 약 2초. 캐시를 지운 첫 실행도 통과(`optimizeDeps.include`, §24) |
| `pnpm test:e2e` | 빌드 포함 4건(2 × 뷰포트) 통과 — 서버가 GE-11을 한 번 조회하고 브라우저는 다시 부르지 않음, 백엔드 500에 카카오 UA 500 |
| `pnpm qa home` | 자동 3개 × 2뷰포트 통과 + 수동 1개. 실패 시나리오(일부러 만든 것)에서 실패 단계 캡처·에러·Playwright 실패 화면이 리포트에 들어가는 것 확인 |
| 백엔드 500일 때 브라우저 화면 | 200 + Next 기본 에러 화면("This page couldn’t load", `error.tsx`는 P5a). P0 상태 코드 표(§31)와 같다 |

- 서버발 요청 구분: Node fetch(undici)가 `sec-fetch-mode: cors`를 붙여 이 헤더로는 브라우저와 구분되지 않았다(첫 시도에서 서버 조회가 `browser`로 잡힘). UA로 가른다.
- eslint: `src/test/`를 계층 요소 `test-support`로 등록하고, `*.test.*` 밖에서 `@/test/*` import를 막았다. `e2e/`·`qa/`는 `src` 밖이라 계층 규칙 대상이 아니다(나머지 규칙·Prettier·tsc는 적용).
- `.gitignore`: `/test-results/`, `/playwright-report/`, `/qa/reports/`. `.dockerignore`에 `e2e`·`qa`·`playwright.config.ts`.

**남은 것**: 로그인 상태 픽스처(P4a·P4b 이후), 크롤러 계약의 OG `<head>`·404(P5b·P8b), Playwright를 게이트에 넣을지 P14에서 재검토 → main push에서만(사용자 결정, §CI).

## 핵심 결정 요약

| 항목 | 결정 | 한 줄 근거 |
|---|---|---|
| 1. 앱 구조 | 단일 Next 앱, 모노레포·패키지 없음 | 런타임이 같아졌고 관객·호스트에 걸친 화면이 많다 |
| 2. 라우터 | App Router, Cache Components 켬(기본값), 서버 캐시 없음 | emotion을 버리면 Pages Router를 고를 이유가 없다. 트래픽상 캐시의 이득이 없고 따라오는 복잡도가 크다 |
| 3. 렌더 | `(audience)` 공통 헤더 아래 `(public)`(서버 조회, Suspense 없음) / `(app)`(클라이언트 조회, 그 안의 `(protected)`에 게이트), `hosting`(데스크탑 상단 바 + 공연 사이드바 / 모바일 헤더 + 드로어 셸, §3·§30) | 서버 조회가 필요한 화면이 4개뿐. 크롤러에 404를 지키려면 Suspense 밖이어야 한다(켠 구성의 브라우저는 200, P0에서 표로 재확인) |
| 4. 데이터 | `queryOptions` 한 벌을 서버(`<Prefetch>`, 무한 목록 제외)와 브라우저가 공유. 사용자별 값은 viewer 쿼리로 분리. `api`·`authApi`. 응답 enum은 `.catch` → `UNKNOWN`. 서버 컴포넌트는 라우트 파일만 | 서버에서 도는 조회에는 토큰이 붙지 않는다. 같은 키에 두면 익명 값이 인증 값을 덮는다 |
| 4-b. 인증 | v1 OAuth, JS로 쿠키 안 읽음, 401이면 코드 무관 재발급(탭 간 Web Locks, `authApi`는 가로채기 없음). 재발급이 4xx일 때만 세션 상실(429·408과 5xx·네트워크는 유지) — 보호 화면은 `/login/expired`, 공개 화면은 익명으로 다시 그림. `dd:session` 값으로 익명 방문자의 재발급 생략·탭 간 로그아웃 동기화. `proxy.ts` 없음 | 운영 쿠키가 `SameSite=Strict`라 서버 게이트가 외부 링크 진입을 잘못 막는다. 배포 중 502로 로그인 사용자가 튕기지 않게 |
| 5. 상태 | 전역 상태 라이브러리 없음 | v1 전역 상태는 전부 서버 상태·오버레이·지역 상태였다 |
| 6. 스타일 | vanilla-extract(+ recipes, sprinkles) | 제로 런타임, 서버 컴포넌트 동작, 토큰 타입 검사, emotion과 가까운 작성 방식 |
| 7. 폼 | react-hook-form + zod | |
| 8. 계층 | `app → features → ui → api → utils`, eslint 강제 | 패키지 경계를 폴더 경계로 대체 |
| 10. 테스트 | 게이트: Vitest(유닛 + 컴포넌트 통합, MSW), 스토리 테스트(P2부터). Playwright e2e는 `main` push CI에서만(P14부터 — 사용자 결정, PR에서는 돌지 않음). 게이트 밖: QA 시나리오(빌드한 앱 + 가짜 nginx/백엔드), agent-browser는 실제 환경 확인용 | 서버 조회까지 가짜로 막으려면 앞문 프록시가 필요하다. e2e는 PR 전 세션의 라우트별 실행 + 관제탑 그룹 경계 회귀 + main push(§CI) |
| 11. 배포 | Dockerfile 하나, standalone. 서버 1대의 docker-compose에 v1 front·admin 대신 들어간다 | API는 같은 출처(`/api`) |
| 13. 에러 | 외부 수집 없음, 구조화 로그. 토스트는 배경 재조회 실패·처리 안 한 변경 실패만(호출 쪽 `handleError`, 2026-10-31), `SessionLostError`는 무시 | 에러 화면과 토스트가 겹치지 않게 |
| 14. 반응형 | sprinkles 조건부 값, 같은 DOM 원칙 | |
| 16. 라이브러리 교체 | `antd`→TanStack Table, `react-qr-reader`→`@yudiel/react-qr-scanner`, `react-spring-bottom-sheet`→`vaul`. `react-beautiful-dnd`는 대체 없이 제거 | 옵션은 id 순 고정이라 드래그 UI가 없다 |
| 17. 에디터 | Tiptap, 섹션 1~10개, 뷰어는 HTML·MARKDOWN 렌더러 + sanitize | |
| 18. 체크아웃 옵션 | same/individual union → `options{applyToAll}` / `perTicketOptions` | |
| 19. 결제 | 계좌송금 체크아웃 한 화면, PG 없음 | |
| 20. 선물 | 서버 상태를 화면에 매핑, 랜딩은 요청마다 조회 + viewer 쿼리 | |
