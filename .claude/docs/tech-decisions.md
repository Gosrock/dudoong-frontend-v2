# DuDoong-Front v2 기술 결정

> 2026-10-12 전면 개정. 이전 판(모노레포 · Next 앱 2개 · Pages Router · emotion)을 폐기하고 **단일 Next 앱 · App Router · vanilla-extract**로 바꿨다. §16~§20(라이브러리 교체, 에디터, 체크아웃, 결제, 선물)은 이전 판에서 유지한다.
> 계약은 [`api-contract.md`](./api-contract.md), 구현 계획은 [`plan.md`](./plan.md), 폴더는 [`directory-structure.md`](./directory-structure.md).
> v1(`~/Desktop/repos/DuDoong-Front`)은 참고용이며 그대로 이어가지 않는다.

## 이 결정을 가른 요구사항

1. **카카오톡 공유** — 공연 상세·선물 랜딩의 OG 태그가 첫 HTML의 `<head>`에 있어야 한다. 카카오 크롤러는 JS를 실행하지 않는다.
2. **공연 상세 캐시** — 티켓 오픈 순간 트래픽을 버티고, 호스트가 수정하면 바로 반영돼야 한다. 잔여 수량은 캐시하지 않는다.
3. **화면의 80% 이상이 로그인 뒤 조작 화면**이다. 서버 렌더가 필요한 화면은 공연 상세, 선물 랜딩, 호스트 홈 정도다.
4. **관객과 호스트에 걸친 화면**이 있다 — 호스트 홈(역할별 뷰), 공연 미리보기, 알림함. 한 계정이 관객이자 호스트다.
5. 자체 호스팅(Docker), 인스턴스가 여럿일 수 있다.
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

### Cache Components를 켜 두는 이유

Cache Components는 Next 16의 기본 캐시·프리렌더 모델이다. 끄고 "이전 모델"로 갈 수도 있지만 켜 둔다.

- Next 문서와 가이드가 이 모델을 기준으로 쓰여 있다. 꺼 두면 문서를 볼 때마다 "Cache Components 없이" 쪽을 따로 찾아야 하고, 에이전트가 기본 문서를 따라 쓴 코드가 어긋난다.
- 프레임워크가 미는 방향에서 벗어나지 않는다. Pages Router를 버린 것과 같은 이유다.
- 호스팅 센터처럼 클라이언트에서 조회하는 화면은 빌드 때 만든 정적 셸이 나간다. 끄면 동적 경로(`/hosting/events/[eventId]/…`)를 요청마다 서버가 렌더한다.

켜 두는 대가로 규칙이 두 개 생긴다. 둘 다 어기면 빌드가 실패해서 조용히 넘어가지 않는다.

| 규칙 | 이유 |
|---|---|
| 서버에서 조회하는 라우트는 `export const instant = false`를 둔다 | 캐시하지 않는 데이터를 기다렸다가 내려 주는 라우트임을 선언한다. 없으면 빌드 에러 |
| 클라이언트 화면 묶음의 레이아웃에 `<Suspense>`를 둔다 | 클라이언트 페이지가 `useParams()`·`useSearchParams()`를 읽으려면 위에 경계가 있어야 한다. 없으면 빌드 에러 |

그리고 조용히 깨지는 것이 하나 있다. **서버 조회 라우트 위에 `<Suspense>`나 `loading.tsx`가 있으면 없는 공연이 404가 아니라 200으로 나간다.** 그래서 라우트 그룹을 나눈다(§3): 서버 조회 화면은 Suspense가 없는 그룹에, 클라이언트 화면은 Suspense가 있는 그룹에 둔다.

두 구성을 모두 돌려 봤다(§21·§22·§26).

| 항목 | 켬 (채택) | 끔 |
|---|---|---|
| 추가 코드 | 서버 조회 라우트 4개에 `instant = false`, 레이아웃 Suspense | 없음 |
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
- 없는 공연의 상태 코드는 `generateMetadata`와 페이지가 모두 `serverQuery`를 쓰고 `loading.tsx`가 없으면 브라우저·크롤러 모두 404다(§22).

## 3. 렌더 전략과 라우트

원칙: **공개되고 공유되는 화면은 서버에서 조회해 렌더하고, 로그인 뒤 조작하는 화면은 클라이언트에서 조회한다.** 서버 컴포넌트는 라우트 파일에만 쓰고 화면 컴포넌트는 전부 클라이언트 컴포넌트다(§4). 서버 캐시는 없다(§2).

라우트 그룹 셋으로 나눈다. 그룹 이름은 URL에 나오지 않는다.

| 그룹 | 조회 | 레이아웃 | 라우트 파일 |
|---|---|---|---|
| `(public)` | 서버(`<Prefetch>`) | Suspense·`loading.tsx` **없음** | `export const instant = false` |
| `(app)` | 클라이언트 | `<Suspense>` + 로그인 게이트 | 클라이언트 화면을 그대로 렌더 |
| `hosting` | 클라이언트 | `<Suspense>` + 로그인 게이트 | 같음 |

| 라우트 | 그룹 | 인증 | 비고 |
|---|---|---|---|
| `/` | `(public)` | 불필요 | 공연홈(GP-1) |
| `/events/[eventId]` | `(public)` | 불필요 | 공연 상세(GP-3 + GE-5), `generateMetadata`. 잔여(GP-5)는 클라이언트 |
| `/hosts/[hostId]` *(제안)* | `(public)` | 불필요 | 호스트 홈(GH-3 + GH-14). `myRole`·`isFollowing`은 브라우저가 다시 조회 |
| `/gifts/[giftToken]` | `(public)` | 불필요 | 선물 랜딩(GG-3), `generateMetadata`. 백엔드 `linkPath` |
| `/events` *(제안)* | `(app)` | 불필요 | 공연 리스트(GP-2). 필터는 URL 쿼리 |
| `/events/[eventId]/checkout` *(제안)* | `(app)` | 필수 | 체크아웃(G11/O-0) |
| `/tickets` | `(app)` | 필수 | 티켓탭. 카드·QR·전체화면은 내부 상태. v1의 `/ticket`에서 바꿨다 |
| `/check-in` | `(app)` | 필수 | 셀프 체크인(PQ-5). 백엔드 `qrPath` |
| `/orders`, `/orders/[orderUuid]` | `(app)` | 필수 | 주문내역·상세. v1의 `/history`에서 바꿨다 |
| `/mypage` | `(app)` | 필수 | 마이페이지. 프로필 편집(닉네임·이미지)도 이 화면 안에서 한다 |
| `/mypage/following`, `/mypage/archive` | `(app)` | 필수 | 관심 호스트, 관람 공연 아카이빙 |
| `/mypage/notifications` | `(app)` | 필수 | 알림함. 호스팅 센터의 알림 벨도 여기로 온다(알림함은 하나다) |
| `/mypage/gifts` *(보류)* | `(app)` | 필수 | 보낸·받은 선물 내역(GG-7). Figma에 화면이 있을 때만 만든다 |
| `/login`, `/login/expired`, `/kakao/callback` | `(app)` | 불필요 | |
| `/hosting/**` | `hosting` | 필수 | 호스팅 센터 전체. 경로는 [`directory-structure.md`](./directory-structure.md) |

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
- `/hosting/events/[eventId]`는 `dashboard`로 리다이렉트한다.
- 공연 관리의 `info`(기본 정보)·`detail`(상세 정보)은 화면 메뉴 이름을 따른 것이다. 백엔드 용어인 "섹션"은 주소에 쓰지 않는다.
- 관객용 헤더·내비게이션은 `(public)`과 `(app)`이 같은 컴포넌트를 쓴다. 그룹을 나눈 이유는 Suspense 유무뿐이다.
- 없앤 v1 라우트: `book/option`, `book/order`, `/pay/*`, `/history`(→ `/orders`), `/history/mycoupon`, `/ticket`(→ `/tickets`), `/ticket/[id]`, `/ticket/qr`, `/home`(→ `/`), `/admin/*`(→ `/hosting/*`).
- 클라이언트 컴포넌트도 빌드 때(정적 셸)와 서버 렌더 때 한 번 실행된다. `window`를 렌더 중에 만지는 것(에디터, QR 스캐너)은 `next/dynamic({ ssr: false })`로 감싼다.

## 4. 데이터

### 조회 정의는 한 벌

서버와 브라우저가 같은 `queryOptions`를 쓴다. 서버 전용 조회 함수를 따로 만들지 않는다.

```ts
// src/api/event/queries.ts — 개별 export, 이름은 {대상}Query / {동작}Mutation
export const eventDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ['events', id],
    queryFn: () => api.get(`events/${id}`, EventDetailSchema),
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

ky 인스턴스를 감싼 얇은 객체 하나다(`src/api/http.ts`). "호출 → 응답 래퍼 해제 → zod 파싱"을 묶어 Promise를 돌려준다.

| 메서드 | 용도 |
|---|---|
| `api.get(path, schema, options?)` | 조회 |
| `api.post / patch / put / delete(path, schema, body?, options?)` | 변경. 백엔드는 변경 응답으로도 값을 주므로 똑같이 파싱한다 |
| `api.download(path, params?)` | 파일(엑셀). 파싱하지 않는다 |

- `queryOptions`/`mutationOptions`와 queryKey는 손으로 쓴다. 더 감싸지 않는다.
- queryKey는 경로를 쪼갠 모양으로 맞춘다(`events/123/sections` → `['events', '123', 'sections']`). 파라미터는 마지막 원소.
- `mutationOptions`에는 `mutationFn`만 둔다. `onSuccess`(캐시 반영, 토스트, 이동)는 화면마다 달라 화면에서 쓴다.

### 서버에서 쓰기 — `<Prefetch>`

서버 컴포넌트는 **라우트 파일(`page.tsx`, `layout.tsx`)에만** 쓴다. 라우트 파일은 조회와 OG 태그를 맡고, 화면 컴포넌트는 전부 `'use client'`다.

```tsx
// app/(public)/events/[eventId]/page.tsx
export async function generateMetadata({ params }: Props) {
  const event = await serverQuery(eventDetailQuery((await params).eventId));
  return { title: event.name, openGraph: { title: event.name, images: [event.posterImageUrl] } };
}

export const instant = false;   // 서버에서 조회를 기다렸다가 내려 주는 라우트

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
| `<Prefetch queries>` | `serverQuery`로 조회 → `dehydrate` → `HydrationBoundary` |

- `generateMetadata`와 `Page`가 같은 쿼리를 불러도 조회는 한 번이다.
- **서버에서 도는 조회에는 토큰이 붙지 않는다.** 서버의 `fetch`에는 브라우저 쿠키가 자동으로 실리지 않는다. 공개 GET에 만료 토큰이 붙으면 401이 오는 문제가 여기서 막힌다. `src/api/server/`에서 `cookies()`를 읽지 않는 것이 규칙이다.
- **사용자별 값은 브라우저가 채운다.** 호스트 홈(`myRole`, `isFollowing`)과 선물 랜딩(`isReceiver`)은 서버가 토큰 없이 조회한 값으로 먼저 렌더하고, 브라우저가 같은 쿼리를 쿠키와 함께 다시 조회해 채운다. 이 쿼리들은 마운트 시 재조회되게 `staleTime: 0`으로 둔다. 그 밖의 서버 조회 쿼리는 넘겨받은 직후 다시 조회하지 않게 `staleTime`을 준다.
- **서버 조회 라우트 위에는 `<Suspense>`도 `loading.tsx`도 두지 않는다.** 경계 안에서 `notFound()`가 불리면 상태 코드가 200으로 굳는다. `(public)` 그룹을 따로 둔 이유다(§3).

### 브라우저에서 쓰기

- ky 클라이언트가 응답 래퍼 `{success, status, data, timeStamp}`를 벗기고 실패를 `ApiError{status, code, reason}`로 바꾼다.
- 기본 `staleTime`은 0에 가깝게 두고(조작 화면은 최신이 중요하다), 태그 목록처럼 잘 안 바뀌는 것만 길게 준다. 구체 값은 P3에서 정한다.
- 변경 응답이 "화면을 다시 그릴 값"이므로 `setQueryData`로 바로 반영한다.

```tsx
const { mutate } = useMutation({
  ...updateEventBasicMutation(eventId),
  onSuccess: updated => {
    queryClient.setQueryData(eventManageQuery(eventId).queryKey, updated);   // const queryClient = useQueryClient()
  },
});
```

### QueryClient

Next 문서의 TanStack Query 가이드(`node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`)를 그대로 따른다.

| 위치 | 방법 |
|---|---|
| 루트 `Providers` | 파일 안의 `getQueryClient()`로 만든다 — 서버 렌더에서는 매번 새 것, 브라우저에서는 하나를 재사용 |
| 화면 컴포넌트 | `useQueryClient()` 훅 |
| 서버(`<Prefetch>`, `serverQuery`) | 요청마다 새 QueryClient. 같은 요청 안의 `generateMetadata`와 페이지가 같은 것을 쓰도록 React `cache`로 묶는다 |

모듈에서 `new QueryClient()`를 상수로 export하지 않는다. 클라이언트 컴포넌트도 서버에서 한 번 렌더되므로 상수는 서버에서 모든 요청이 공유하게 된다.

같은 가이드가 권하는 것 중 이 설계가 따르는 것: 서버와 클라이언트가 같은 queryKey·`queryOptions`를 쓴다, 서버가 넘긴 데이터가 마운트 직후 다시 조회되지 않게 `staleTime`을 준다(사용자별 값을 다시 받아야 하는 호스트 홈·선물 랜딩만 예외로 0), 변경 응답으로 브라우저 캐시를 갱신한다(`setQueryData`). 서버 캐시가 없어 서버 쪽에 할 일은 없다.

`<Prefetch>`, `serverQuery`, 토큰 미전송, 404 처리는 구현해 돌려 확인했다(§22·§26). ky 2.x의 기본 URL 옵션은 `prefix`/`baseUrl`이고, 에러 변환은 훅이 아니라 `api` 객체 안에서 한다.

### 인증

- API는 프론트와 같은 출처(`/api/v2/…`)다. 브라우저는 상대 경로로 부르고, 서버에서 도는 조회는 `http://localhost:8080/api/v2`로 부른다(§25).
- 인증 API는 v1 그대로다. 서버는 `Authorization: Bearer`를 먼저 보고 없으면 액세스 토큰 쿠키를 읽는다.
- **JS로 토큰 쿠키를 읽지 않는다.** 브라우저 요청은 쿠키 자동 전송(`credentials: 'include'`)에 맡긴다. 백엔드가 쿠키를 HttpOnly로 바꾸는 전제 조건이다.
- **로그인 게이트는 브라우저에서 한다. `proxy.ts`는 두지 않는다.** 보호 화면의 레이아웃이 세션 쿼리(GM-1)를 보고, 401이면 `/login?redirect=…`로 보낸다. 서버에서 쿠키 유무로 막지 않는 이유는 운영 쿠키가 `SameSite=Strict`라 외부 링크로 들어온 첫 요청에는 쿠키가 실리지 않기 때문이다(§25). 공개 화면 앞에 인증 처리가 끼지 않는다는 이점도 있다.
- 재발급은 클라이언트에서 한다: API가 `AUTH_401_1`을 주면 `POST /api/v1/auth/token/refresh`를 한 번만(동시 요청은 하나로 묶어) 부르고 원래 요청을 재시도한다. `GLOBAL_401_1`이나 재발급 실패는 `/login/expired?redirect=…`.
- **토큰 쿠키는 백엔드가 세팅한다.** 로그인·재발급 응답에 `Set-Cookie`로 액세스·리프레시 토큰이 함께 온다(만료 시간 = 토큰 수명). 본문에도 같은 값이 있지만 FE는 쓰지 않는다. FE가 쿠키를 쓰는 코드는 없다(백엔드 코드에서 확인, §23).
- **리프레시 토큰은 사용자당 하나만 저장된다**(§23). 재발급하면 이전 리프레시 토큰은 무효다. 한 브라우저 안의 동시 401은 재발급 1회로 묶고, 여러 탭이 동시에 재발급하는 경우는 실패한 탭이 쿠키의 새 토큰으로 한 번 더 시도한다. 다른 기기에서 로그인하면 이쪽 세션은 액세스 토큰 만료 뒤 끊긴다 — 백엔드에 의도인지 확인 중.
- 공개 화면에서 401이 오면 토큰 없이 한 번 더 요청한다.
- `redirect` 파라미터는 같은 origin의 상대 경로일 때만 따른다.
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

다단계 플로우 라이브러리는 두지 않는다. 공연 만들기 2단계(P11)는 `?step=` 쿼리 + 지역 상태로 만든다. 체크아웃은 한 화면 안의 섹션이고, 선물 보내기는 바텀시트 2장이다.

## 6. 스타일링

### 결론: **vanilla-extract.** emotion은 쓰지 않는다.

- 빌드 타임에 CSS 파일로 뽑혀 런타임 비용이 없고, 서버 컴포넌트에서 동작한다(Next 16.4 문서의 지원 목록에 있음).
- 스타일과 토큰을 TS로 쓴다. 토큰 이름을 틀리면 타입 에러가 난다.
- emotion의 객체 스타일 + 테마와 작성 방식이 가장 가깝다. 이전 판 `patterns.md`의 `Flex`·`Spacing`·표시/숨김 패턴을 거의 그대로 옮길 수 있다.

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

1. **프리미티브** — `<Flex gap={4} alignItems="center">`, `<Spacing size={6} />`, `<Text typography="body1">`. 화면 코드의 대부분은 이걸로 끝난다.
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
src/app      → 라우트 (얇게: 조회, 메타데이터, 화면 조립)
src/features → 화면 단위 구현 (audience / hosting / shared)
src/ui       → 디자인 시스템
src/api      → zod 스키마, queryOptions, api 객체, 서버용 헬퍼(server/)
src/utils    → 순수 유틸
```

의존 방향은 위에서 아래로만. eslint로 강제한다.

- `features/audience` ↔ `features/hosting`은 서로 import하지 않는다. 둘이 같이 쓰는 것은 `features/shared`로 올린다.
- `src/api/server/`는 `'server-only'`로 표시해 클라이언트 번들에 섞이지 않게 한다. 라우트 파일에서만 import한다.
- `src/api`는 React 컴포넌트를 import하지 않는다.

## 9. TypeScript

TS 5.x, `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`. alias는 `@/*` → `src/*` 하나. `any` 금지(`@typescript-eslint/no-explicit-any`). Next가 생성하는 라우트 타입(`PageProps`, `LayoutProps`)을 쓴다 — CI에서 `next typegen` 뒤에 typecheck한다.

## 10. 테스트

Vitest(단위) + Storybook(UI 스모크) + agent-browser(인터랙티브 검증). CI 자동 E2E 스위트는 두지 않는다.

- **CI 게이트**: typecheck + lint + Vitest.
- **Vitest 대상**: zod 스키마(실제 응답 샘플 파싱), 금액 계산, 응답 래퍼·에러 변환, 날짜 변환, 권한 판정(`can(role, action)`), 상태 → 표시 매핑.
- **크롤러 계약 스크립트**: 빌드된 앱에 **실제 카카오 UA**로 요청을 보내 OG가 `<head>`에 있고 없는 공연이 404인지 확인한다. 공연 상세와 선물 랜딩. Next 버전을 올릴 때마다 돌린다.
- **agent-browser**: 주문 크리티컬 패스(상세 → 선택 → 체크아웃 → 주문 → 호스트 승인 → 티켓), 선물 수락, QR 체크인. 이 경로를 건드리는 PR은 리뷰 체크리스트로 확인한다.

**포기한 것**: 금전 경로의 자동 회귀 방지. 사람이나 에이전트가 다시 확인해야 발견된다.

## 11. CI/CD

GitHub Actions. Dockerfile 하나(`output: 'standalone'`, 멀티 스테이지). `main` 머지마다 이미지를 만들어 GHCR에 올리고, 버전 태그는 다시 빌드하지 않고 같은 이미지에 붙인다. 배포는 Deploy 저장소의 compose 파일에서 태그를 올려 한다(§25). `next build`는 lint를 하지 않으므로 CI에 lint 단계를 둔다. 자세한 것은 [`deploy-plan.md`](./deploy-plan.md).

- 호스팅 센터 수정도 전체 재배포다. 티켓 오픈 시간대 배포는 피한다.

## 12. 환경변수

zod로 빌드 타임 검증. 서버 전용(`env/server.ts`)과 공개(`env/client.ts`)를 파일로 나눈다. `NEXT_PUBLIC_*`는 리터럴로 하나씩 참조한다(객체 스프레드는 인라인되지 않는다). `next.config.ts`에서 두 모듈을 import해 누락 시 빌드를 실패시킨다.

필요한 값: 서버 내부용 API 주소(운영은 `http://localhost:8080`), 사이트 origin(공유 링크·OG용), 카카오 JS 키. 브라우저용 API 주소는 상대 경로 `/api`라 값이 필요 없다. 토스페이먼츠 키는 없다. 환경마다 다른 값은 이미지에 넣지 않는다 — 스테이징과 운영이 같은 이미지를 쓴다. 서버용 API 주소는 런타임에 읽고(두 환경 모두 같은 호스트), 사이트 origin은 값으로 두지 않고 브라우저는 `location.origin`, 서버는 요청의 `Host` 헤더로 만든다. 빌드 때 굽는 것은 카카오 JS 키 하나다([`deploy-plan.md`](./deploy-plan.md) §4).

## 13. 에러와 로깅

Sentry 등 외부 수집은 두지 않는다. 구조는 둔다.

- 라우트별 `error.tsx` + 루트 `global-error.tsx`. 금전 경로(체크아웃)에는 맥락 있는 문구의 경계를 따로 둔다.
- `QueryCache`/`MutationCache`의 `onError`에서 구조화 로그 + 토스트. 화면을 대체해야 하는 실패만 `throwOnError`.
- `serverQuery`와 Route Handler는 구조화 JSON을 stdout에 남긴다. 계좌번호·입금자명·토큰은 넣지 않는다.

**포기한 것**: 프로덕션 장애의 실시간 알림. 필요해지면 `onError`와 `instrumentation`에 연결만 추가하면 된다.

## 14. 반응형

원칙은 이전 판과 같다: **서버와 클라이언트가 항상 같은 DOM을 그리고, 보이는 것만 CSS가 정한다.**

- breakpoint는 sprinkles의 조건으로 한 번 정의한다(`mobile` / `desktop`, 필요하면 `tablet`).
- 표시·숨김, 간격, 방향 차이는 조건부 값으로 쓴다: `sprinkles({ display: { mobile: 'none', desktop: 'block' } })`, `<Flex flexDirection={{ mobile: 'column', desktop: 'row' }}>`.
- PC/Mobile의 이미지 소스가 다르면 둘 다 렌더하고 하나만 보이거나 `<picture>`를 쓴다.
- **컴포넌트 자체가 바뀌어야 할 때만** `useMediaQueries()`를 쓴다. 초기값을 `null`로 두고 마운트 뒤에 판정한다([`patterns.md`](./patterns.md) §1).
- `react-responsive`처럼 첫 렌더에서 뷰포트를 판정하는 도구는 쓰지 않는다.

와이어프레임은 호스팅 센터까지 모바일 프레임(390 폭)이다. PC 레이아웃 범위는 디자인 확인 뒤 P1에서 breakpoint를 정한다.

## 15. 유틸리티 라이브러리

| 라이브러리 | 역할 | 비고 |
|---|---|---|
| `ky` | HTTP 클라이언트 | fetch 기반 |
| `zod` | 스키마 | 폼·API·env 공용 |
| `es-toolkit` | 배열·객체 유틸, debounce 등 | |
| `overlay-kit` | 오버레이 상태 | |
| `@suspensive/react-query` | Suspense 쿼리를 컴포넌트로 | 호스팅 센터 위주 |
| `marked` + `isomorphic-dompurify` | 섹션 본문 렌더(MARKDOWN → HTML → sanitize) | |

`react-simplikit`과 `@use-funnel/browser`는 쓰지 않는다(§22). 필요한 훅 몇 개와 공연 만들기 2단계는 직접 만든다.

## 16. UI 라이브러리 교체 (에디터 제외)

> **2026-10-12**: `react-beautiful-dnd`는 `@dnd-kit`으로 바꾸는 것이 아니라 **대체 없이 제거**한다. v1의 드래그는 옵션을 티켓에 끌어다 붙이는 UI였는데 v2는 모달과 칩으로 바뀌었고, 옵션 표시 순서는 서버가 id 순으로 고정한다. 아래 표의 해당 행은 이력으로만 남긴다.

### 결론

admin: `antd`(Table만 사용) → `@tanstack/react-table`(`^9.2`), `react-beautiful-dnd` → `@dnd-kit/core`(`^6.3`), `react-qr-reader` → `@yudiel/react-qr-scanner`(`^2.6`). ticket: `react-spring-bottom-sheet` → `vaul`(`^1.1`).

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
  perTicketOptions: [[{ optionId, answer }], …],   // applyToAll=false, 길이 = quantity
  paymentChannel: 'BANK_TRANSFER' | 'TOSS_TRANSFER' | 'FREE',
  depositorName,            // 1~20자
  agreeRefundPolicy,
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
//                                  individual → { perTicketOptions }
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

`src/api/order/price.ts` 한 곳에서 계산한다: `price × quantity + Σ(YES로 답한 옵션의 yesAdditionalPrice)`. 화면 표시 총액과 토스 송금 링크 금액이 여기서 나오고, 주문 생성 응답의 `totalAmount`와 같아야 한다(P7 계약 테스트).

---

## 19. 결제 — 계좌송금 체크아웃 (P7)

> 2026-10-11 전면 개정. **v2에는 PG가 없다.** 이전 판의 토스페이먼츠 SDK v2 위젯, `/pay/confirm` 콜백 모드 분리, confirm 멱등성 설계는 전부 폐기한다. `@tosspayments/*` 의존성도 넣지 않는다.

### 모델

두둥은 입금을 확인할 수 없다. 사용자가 **"입금했어요"를 누른 순간이 주문 시점**이고, 호스트의 승인이 입금 확인이다.

| 티켓 | `paymentChannel` | 화면 |
|---|---|---|
| 두둥(`DUDOONG`) | `BANK_TRANSFER` | 계좌·예금주 표시 + 복사 → "입금하셨나요?" 모달 → 주문 생성 |
| 두둥(`DUDOONG`) | `TOSS_TRANSFER` | 토스 송금 링크로 이동 → 돌아와서 "입금하셨나요?" 모달 → 주문 생성 |
| 무료(`FREE`) | `FREE` | 결제 정보·방식 없이 [신청] → 주문 생성 |

### 흐름

1. `G11/O-0`(로그인 필요)으로 티켓 + `account{bankName, accountHolder, accountNumber}`를 받는다. 계좌는 두둥 티켓이고 지금 살 수 있을 때만 값이 있다. 클라이언트에서 조회한다.
2. 옵션 입력(§18) → 결제 정보(금액·계좌) → 결제 방식 → 환불 규정 동의.
3. CTA → "입금하셨나요?" 확인 모달(`EasyOverlay`). `onConfirm`에서 `P11/O-1`을 await한다.
4. 성공하면 응답(주문 상세와 같은 형태)으로 주문 완료 화면을 그린다.

### 구현 규칙

- **토스 송금 링크는 프론트가 만든다**(계좌 + 총액). 비공식 스킴 `supertoss://send?bank=&accountNo=&amount=`가 쓰인다(§22). 실기기 확인 전에는 구현을 확정하지 않고, 앱이 없으면 직접 계좌이체로 안내한다. 백엔드의 `bankName`은 자유 입력이라 호스트가 적은 값이 스킴과 안 맞을 수 있다 — 티켓 폼(P12)에서 은행을 목록으로 고르게 한다(§23).
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
| 링크 생성 완료 | `455:8935` | 공유(카카오톡 · 링크 복사) + 메모(PG-8, 50자) |
| 티켓탭 카드 | `state` | `GIFT_PENDING`(선물 취소) · `GIFT_EXPIRED`(회수 안내) · `GIFT_SENT`(GG-7a로) · `RECEIVED`(선물 반환) |
| 랜딩 | `viewState` | 7종 분기. `AVAILABLE`만 버튼 2개 |
| 반환 | 바텀시트(`528:14695`) | `canReturn`으로 노출. `onConfirm`에서 PG-6 |

### 구현 규칙

- **랜딩은 캐시하지 않는다.** 상태가 바뀌므로 서버 조회는 `cache: 'no-store'`. OG 메타는 공연·티켓 요약만 쓴다(보낸 사람 닉네임은 서버가 가려서 준다).
- 랜딩 GG-3은 공개 GET이지만 토큰이 있으면 본인 판정(`isReceiver`, `OWN_LINK`)에 쓴다. **만료 토큰이 붙으면 401**이므로 익명 재요청 규칙(§1)을 반드시 태운다.
- 비로그인 수락: 로그인 → 같은 URL로 복귀 → GG-3 다시 조회 → 사용자가 **다시 눌러** 수락. 로그인만으로 자동 수락하지 않는다.
- 소유권 이전은 낙관적으로 처리하지 않는다. 서버 성공 뒤에 화면을 바꾼다.
- 수락(PG-4)·반환(PG-6)·회수(DG-2)·거절(PG-5) 성공 뒤에는 `my-ticket` 목록·상세, `gift`, `notification` 쿼리를 무효화한다. 응답의 새 `ticketUuid`로만 이동한다.
- `Gift_400_3`(이미 처리됨)이면 GG-3을 다시 읽어 상태 화면으로 보낸다. `IssuedTicket_404_1`이면 티켓탭을 다시 읽는다.
- 선물 대기·완료 티켓이 있는 주문은 사용자가 취소할 수 없다(`Order_400_24`) — 주문상세에서 "선물을 먼저 취소하거나 돌려받아 주세요"로 안내한다.
- 토큰은 분석 로그·외부 SDK 메타데이터에 넣지 않는다.

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

**독립 검토의 지적 중 설계에 반영한 것**: 시간 의존 필드 때문에 TTL 병행(§4), 등록 시점 무효화(§4), 무효화 엔드포인트 인증(§4), `proxy.ts` 범위 축소(§4), 서버 조회에 쿠키 금지(§4), 다중 인스턴스 캐시 핸들러(§4), `SameSite=Strict` 확인(§4).

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
| 은행명 값 | **자유 입력**(30자 이내). enum이 아니다 | `V2TicketItemRequest.kt` |
| 알림에 이동 경로가 오나 | 안 온다. `target{type, targetId, eventId}`와 `extra`(공연명·주문번호·호스트명·역할)만 온다. 이동 화면은 FE가 정한다 | `V2NotificationDomainService.kt` |
| #758(일반 멤버 개인정보 가림, 엑셀 M+) | 미구현(이슈 열림). 입금자명은 이슈 본문에 "포함 여부 검토"로 남아 있다 | 이슈 #758 |
| #776(HttpOnly 등) | 미구현(이슈 열림). 조건은 "프론트 B단계 배포" | 이슈 #776 |
| DB 스키마 V001~ 실행 | staging·prod 실행 기록이 비어 있다 | `db/migration/V001…sql` |
| 로컬 개발 서버에서 dev API를 쿠키 인증으로 부를 수 있나 | 된다. 스테이징·dev의 CORS 허용 출처에 `http://localhost:3000`이 있고 쿠키는 `SameSite=None`이다. **포트는 3000**(5173은 v1 호스트 어드민으로 취급) | `WebOriginPolicy.kt`, `CookieHelper.kt`, `KakaoRedirectPolicy.kt` |
| 카카오 콜백 주소 | `{출처}/kakao/callback`. 요청 Referer의 경로가 `/admin`으로 시작할 때만 `/admin/kakao/callback` — v2에서는 해당 없음 | `KakaoRedirectPolicy.kt` |
| 은행 목록·토스 송금 링크 | 백엔드에 없다 | 전체 검색 |
| 에러 코드 전체 | 13개 도메인 200개 → [`error-codes.md`](./error-codes.md) | `*ErrorCode` enum |

코드를 읽다 새로 알게 된 것:

- **리프레시 토큰이 사용자당 하나다.** Redis에 사용자 id를 키로 저장해서 로그인·재발급 때마다 덮어쓴다. 이전 리프레시 토큰은 조회되지 않아 재발급이 실패한다. 폰과 노트북에서 같이 쓰면 한쪽이 끊긴다.
- **리프레시 토큰 수명 기본값이 3600초**로 액세스 토큰과 같다(env `JWT_REFRESH_EXP`). 운영 값은 코드로 알 수 없다. 기본값 그대로면 한 시간 동안 아무 요청이 없을 때 로그인이 풀린다.
- **은행명이 자유 입력이라 토스 송금 링크가 깨질 수 있다.** 호스트가 "국민은행", "KB", "kb국민"처럼 제각각 적으면 `supertoss://send?bank=`에 넣을 값을 만들 수 없다. FE 티켓 폼에서 은행을 목록으로 고르게 해 값을 고정하는 것이 필요하다(§19).

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

| 도구 | 버전 | 용도 |
|---|---|---|
| Vitest | 5.0 | 단위 테스트 |
| `@testing-library/react` | 16.3 | 컴포넌트 테스트 |
| MSW | 3.0 | 백엔드 mock(브라우저 + 테스트) |
| Storybook | 10.6 | `@storybook/react-vite` + `@vanilla-extract/vite-plugin`(§22에서 빌드 확인) |

### 스크립트

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "node .next/standalone/server.js",
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "check:crawler": "node scripts/check-crawler.mjs"
}
```

`typecheck`는 `next typegen`을 먼저 돌린다. 라우트 타입(`PageProps` 등)이 생성돼 있어야 `tsc`가 통과한다.

### CI

PR 게이트 한 개: `pnpm install --frozen-lockfile` → `typecheck` → `lint` → `test`. `build`는 배포 워크플로에서 Docker 이미지로 한다.

### 그 밖에 P0에서 만드는 것

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` | 이 저장소의 규칙 요약(계층, `api` 객체, 스타일 세 층, 서버 컴포넌트 범위)과 `.claude/docs` 안내. 에이전트가 매번 문서 전체를 읽지 않게 한다 |
| `.env.example` | 필요한 환경변수 목록 |
| `.editorconfig`, `.prettierignore`, `.gitignore` | |
| `.github/pull_request_template.md` | 체크리스트 — 금전 경로(주문·선물·체크인) 변경 시 agent-browser 확인 여부, `SerializedStyles` 같은 스타일 타입 노출 여부 |
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
| **API가 프론트와 같은 출처다**(`https://dudoong.com/api/…`) | 브라우저는 상대 경로 `/api/v2/…`로 부른다. CORS가 필요 없고 쿠키는 퍼스트파티다. 로컬에서는 Next `rewrites`로 `/api`를 dev API에 연결해 운영과 같은 모양을 만든다 |
| **nginx가 `/api`로 시작하는 요청을 전부 백엔드로 보낸다** | Next Route Handler를 `/api/…` 아래에 두면 브라우저에서 닿지 않는다. 지금 설계에는 Route Handler가 없지만, 만들게 되면 `/api` 밖(예: `/fe-api`)에 둔다 |
| 서버가 1대, front 컨테이너도 1개 | 서버 캐시를 쓰지 않아 인스턴스 수와 무관하다. 나중에 캐시를 붙이고 인스턴스를 늘리면 호스트의 Redis를 공유 저장소로 쓸 수 있다 |
| 백엔드가 같은 호스트의 8080이다 | 서버에서 도는 조회는 nginx를 거치지 않고 `http://localhost:8080/api/v2`로 부른다 |
| front 컨테이너에 `.env`가 주입되지 않는다 | 환경마다 다른 값을 두지 않아 이미지 하나를 두 환경이 쓴다. 필요해지면 compose의 `environment:`로 준다([`deploy-plan.md`](./deploy-plan.md) §4) |
| 호스트 네트워크 | standalone 서버를 `HOSTNAME=127.0.0.1`, `PORT=3000`으로 띄워 3000 포트가 밖에 열리지 않게 한다. nginx의 `proxy_pass`도 `127.0.0.1:3000`으로 맞춘다 |
| nginx가 `X-Frame-Options: DENY`, HSTS 등을 붙이고 `X-Forwarded-Host`를 지운다 | 앱에서 보안 헤더를 중복으로 넣지 않는다. 절대 URL이 필요하면 `Host` 헤더나 환경변수를 쓴다 |
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

## 핵심 결정 요약

| 항목 | 결정 | 한 줄 근거 |
|---|---|---|
| 1. 앱 구조 | 단일 Next 앱, 모노레포·패키지 없음 | 런타임이 같아졌고 관객·호스트에 걸친 화면이 많다 |
| 2. 라우터 | App Router, Cache Components 켬(기본값), 서버 캐시 없음 | emotion을 버리면 Pages Router를 고를 이유가 없다. 트래픽상 캐시의 이득이 없고 따라오는 복잡도가 크다 |
| 3. 렌더 | 라우트 그룹 `(public)`(서버 조회, Suspense 없음) / `(app)`·`hosting`(클라이언트 조회) | 서버 조회가 필요한 화면이 4개뿐. 404 상태 코드를 지키려면 Suspense 밖이어야 한다 |
| 4. 데이터 | `queryOptions` 한 벌을 서버(`<Prefetch>`)와 브라우저가 공유. `api` 객체. 서버 컴포넌트는 라우트 파일만 | 서버에서 도는 조회에는 토큰이 붙지 않는다 |
| 4-b. 인증 | v1 OAuth, JS로 쿠키 안 읽음, 재발급과 로그인 게이트 모두 브라우저에서. `proxy.ts` 없음 | 운영 쿠키가 `SameSite=Strict`라 서버 게이트가 외부 링크 진입을 잘못 막는다 |
| 5. 상태 | 전역 상태 라이브러리 없음 | v1 전역 상태는 전부 서버 상태·오버레이·지역 상태였다 |
| 6. 스타일 | vanilla-extract(+ recipes, sprinkles) | 제로 런타임, 서버 컴포넌트 동작, 토큰 타입 검사, emotion과 가까운 작성 방식 |
| 7. 폼 | react-hook-form + zod | |
| 8. 계층 | `app → features → ui → api → utils`, eslint 강제 | 패키지 경계를 폴더 경계로 대체 |
| 10. 테스트 | Vitest + Storybook + agent-browser + 크롤러 계약 스크립트 | CI E2E 없음 |
| 11. 배포 | Dockerfile 하나, standalone. 서버 1대의 docker-compose에 v1 front·admin 대신 들어간다 | API는 같은 출처(`/api`) |
| 13. 에러 | 외부 수집 없음, 구조화 로그 | |
| 14. 반응형 | sprinkles 조건부 값, 같은 DOM 원칙 | |
| 16. 라이브러리 교체 | `antd`→TanStack Table, `react-qr-reader`→`@yudiel/react-qr-scanner`, `react-spring-bottom-sheet`→`vaul`. `react-beautiful-dnd`는 대체 없이 제거 | 옵션은 id 순 고정이라 드래그 UI가 없다 |
| 17. 에디터 | Tiptap, 섹션 1~10개, 뷰어는 HTML·MARKDOWN 렌더러 + sanitize | |
| 18. 체크아웃 옵션 | same/individual union → `options{applyToAll}` / `perTicketOptions` | |
| 19. 결제 | 계좌송금 체크아웃 한 화면, PG 없음 | |
| 20. 선물 | 서버 상태를 화면에 매핑, 랜딩은 캐시 금지 | |
