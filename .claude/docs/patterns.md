# DuDoong-Front v2 — 구현 패턴

> 2026-10-14 개정. §1~§3(반응형 · 텍스트 · 레이아웃)은 vanilla-extract 기준이다. §4~§10(조회 · API 클라이언트 · 오버레이 · 계층 · 네이밍)은 tossinsu-desktop 인용을 지우고 DuDoong 규칙만 남겼다. §11 이후는 화면 패턴, §24는 화면별 에러 처리다.
> 근거 문서: [`tech-decisions.md`](./tech-decisions.md), [`plan.md`](./plan.md), [`directory-structure.md`](./directory-structure.md), [`api-contract.md`](./api-contract.md)

---

## 1. 반응형 — CSS가 정하고, JS 분기는 마운트 뒤에만

**원칙: 서버와 클라이언트가 항상 같은 DOM을 그린다. 무엇이 보일지는 CSS가 정한다.** 첫 렌더에서 뷰포트를 JS로 판정하면 서버가 그린 것과 달라져 하이드레이션이 어긋난다.

### 1-1. 조건은 sprinkles에 한 번 정의한다

```ts
// src/ui/theme/sprinkles.css.ts
const responsive = defineProperties({
  conditions: {
    mobile: {},
    desktop: { '@media': 'screen and (min-width: 768px)' },   // 값은 P1에서 확정
  },
  defaultCondition: 'mobile',
  properties: {
    display: ['none', 'block', 'flex', 'inline'],
    flexDirection: ['row', 'column'],
    alignItems: ['flex-start', 'center', 'flex-end', 'stretch'],
    justifyContent: ['flex-start', 'center', 'flex-end', 'space-between'],
    gap: vars.space, padding: vars.space, marginTop: vars.space, /* … */
  },
});
export const sprinkles = createSprinkles(responsive, colorProperties);
```

### 1-2. 표시·숨김, 간격, 방향

```tsx
// 모바일에서만 보임
<p className={sprinkles({ display: { mobile: 'block', desktop: 'none' } })}>…</p>

// 데스크탑에서만 줄바꿈
<br className={sprinkles({ display: { mobile: 'none', desktop: 'inline' } })} />

// 브레이크포인트별 간격
<Spacing size={{ mobile: 4, desktop: 6 }} />

// 방향 전환
<Flex flexDirection={{ mobile: 'column', desktop: 'row' }} gap={4}>…</Flex>
```

둘 다 DOM에 있고 CSS가 하나만 보이게 한다. 이전 판의 `hideOn`/`showOn`, `MediaSpacing`이 이 조건부 값으로 대체된다.

### 1-3. 이미지 소스가 다를 때

둘 다 렌더하고 조건부 `display`로 하나만 보이거나 `<picture>` + `<source media>`를 쓴다. 안 보이는 쪽까지 내려받는 것이 부담이면 `<picture>`를 쓴다.

### 1-4. 컴포넌트 자체가 바뀌어야 할 때 — 초기값 `null`, 마운트 뒤 판정

데스크탑은 세로 스크롤 애니메이션, 모바일은 캐러셀처럼 **컴포넌트가 통째로 다를 때만** 쓴다.

```ts
// src/ui/hooks/useMediaQueries.ts
function useMediaQueries() {
  const [current, setCurrent] = useState<'mobile' | 'desktop' | null>(null);   // 핵심: 초기값 null
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setCurrent(mq.matches ? 'desktop' : 'mobile');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return current;
}
```

서버 렌더와 첫 하이드레이션 모두 `null`이라 결과가 같다. 판정은 마운트 뒤에 일어난다. `null`일 때는 양쪽에 공통인 자리표시를 그린다.

| 상황 | 방법 |
|---|---|
| 보이기·숨기기, 간격, 방향, 크기 | sprinkles 조건부 값 |
| 이미지 소스 | 둘 다 렌더 또는 `<picture>` |
| 컴포넌트 교체 | `useMediaQueries()` |

---

## 2. 텍스트 — `Text` 컴포넌트

- `<h1>`·`<p>`에 직접 글자 스타일을 주지 않는다. `Text`를 쓴다.
- 크기·굵기·행간은 `typography` 프리셋으로 정한다. 프리셋은 Figma 타이포 토큰에서 온다.
- 시맨틱 태그가 필요하면 스타일과 분리해 `as`로만 지정한다.

```tsx
<Text as="h2" typography="title2" color="gray900">제목</Text>
<Text typography="body1" color="gray700">본문</Text>
```

```ts
// src/ui/primitives/Text/Text.css.ts
export const text = recipe({
  variants: {
    typography: { title1: {…}, title2: {…}, body1: {…}, body2: {…}, caption: {…} },
  },
});
```

`color`는 토큰 키만 받는다(sprinkles 타입). 프리셋에 없는 크기가 필요하면 프리셋을 추가할지 먼저 본다.

---

## 3. 레이아웃 — `Flex` / `Spacing` 우선

- `div` + `display: flex` 대신 `<Flex>`, margin 대신 `<Spacing>`.
- 정렬은 `Flex.Center`(양축), `Flex.CenterVertical`(교차축), `Flex.CenterHorizontal`(주축).
- **간격을 추측하지 않는다.** Figma 노드에서 읽고, 모르면 묻는다.

```tsx
// src/ui/primitives/Flex/Flex.tsx
type FlexProps = Pick<Sprinkles, 'alignItems' | 'justifyContent' | 'flexDirection' | 'gap' | 'padding'> & {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: ReactNode;
};
export function Flex({ as: Tag = 'div', className, children, ...sx }: FlexProps) {
  return <Tag className={clsx(sprinkles({ display: 'flex', ...sx }), className)}>{children}</Tag>;
}
Flex.Center = (p: FlexProps) => <Flex alignItems="center" justifyContent="center" {...p} />;
```

```tsx
// src/ui/primitives/Spacing/Spacing.tsx — 자식을 받지 않는 순수 spacer
export function Spacing({ size, direction = 'vertical' }: { size: Sprinkles['marginTop']; direction?: 'vertical' | 'horizontal' }) { … }
```

`Flex`와 `Spacing`은 훅도 상태도 없어 서버 컴포넌트에서 그대로 쓴다.

**함정 — 컬럼 방향 `Flex`는 자식을 가로로 늘리지 않는다.** `alignItems` 기본값을 `flex-start`로 두면 `justifyContent="space-between"`인 헤더 행이 내용 폭으로 줄어 양끝 정렬이 무효가 된다. 꽉 차야 하는 행에는 그 행에 직접 `width: 100%`를 준다. Storybook에 이 사례를 스토리로 남긴다.

### 스타일을 쓰는 세 가지 방법

`css={css(...)}`처럼 컴포넌트 파일 안에 스타일을 정의하는 방법은 없다. 정의는 `.css.ts` 파일에만 둘 수 있다. 파일을 매번 만들지 않도록 층을 둔다.

| 순서 | 방법 | 예 |
|---|---|---|
| 1 | 프리미티브 | `<Flex gap={4} alignItems="center">` |
| 2 | `sprinkles()` 인라인 | `className={sprinkles({ marginTop: 4, color: 'gray900' })}` |
| 3 | `Foo.css.ts` | 고유한 모양, 자손 선택자, 애니메이션, 변형(recipes) |

런타임에 정해지는 값은 CSS 변수에 넣는다.

```tsx
<div className={bar} style={assignInlineVars({ [progressVar]: `${rate}%` })} />
```

`Text` · `Flex` · `Spacing`이 갖춰지면 화면 코드에서 원시 `<div className={…}>`로 레이아웃을 짜는 것을 리뷰에서 지적할 근거가 생긴다.

---

## 4. 조회와 변경 — TanStack Query

정의와 기본 옵션의 근거는 [`tech-decisions.md`](./tech-decisions.md) §4. 여기에는 코드를 쓸 때 지킬 규칙만 둔다.

### 4-1. 정의 — 개별 export + `api` 객체

```ts
// src/api/host/queries.ts
export const hostDetailQuery = (hostId: string) =>
  queryOptions({
    queryKey: ['hosts', hostId],
    queryFn: () => api.get(`hosts/${hostId}`, HostDetailSchema, { public: true }),
    staleTime: 30_000,                  // 서버 프리페치 → 넘겨받은 직후 다시 조회하지 않는다
  });

export const hostViewerQuery = (hostId: string) =>
  queryOptions({
    queryKey: ['hosts', hostId, 'viewer'],   // 같은 엔드포인트, 쿠키와 함께 브라우저에서만
    queryFn: () => api.get(`hosts/${hostId}`, HostDetailSchema),
  });

// src/api/host/mutations.ts
export const addHostMembersMutation = (hostId: string) =>
  mutationOptions({
    mutationFn: (body: AddMembersRequest) => api.post(`hosts/${hostId}/members`, HostMemberListSchema, body),
  });
```

- 이름은 `{대상}Query` / `{동작}Mutation`. 도메인 객체로 묶지 않는다.
- queryKey는 경로를 쪼갠 모양으로 손으로 쓴다. 파라미터는 마지막 원소.
- `mutationOptions`에는 `mutationFn`만. 캐시 반영·토스트·이동은 화면의 `onSuccess`에.
- 의존값이 없으면 `skipToken`(또는 `useQuery`의 `enabled`). 파생 값은 호출부의 `select` 옵션. 헬퍼를 만들지 않는다.
- `useQuery(xxxQuery())`를 감싸기만 하는 훅을 만들지 않는다. 여러 쿼리를 합쳐 파생 상태를 만들 때만 훅을 둔다.

### 4-2. 공개 값과 사용자별 값은 키를 나눈다

서버 프리페치는 토큰 없이 돈다. 같은 응답에 사용자별 필드가 섞인 API(GH-3 `myRole`·`isFollowing`, GH-14 준비중 공연, GG-3 `isReceiver`·`viewState`)는 두 쿼리로 읽는다.

| | 공개 쿼리 `xxxQuery` | viewer 쿼리 `xxxViewerQuery` |
|---|---|---|
| 키 | `['hosts', id]` | `['hosts', id, 'viewer']` |
| 조회 | 라우트 파일의 `<Prefetch>` | 브라우저, 세션이 있을 때만(`enabled`) |
| 화면이 읽는 것 | 공개 필드 | 사용자별 필드 |

- 사용자에 따라 달라지는 버튼은 viewer가 확정되거나 익명이 확정된 뒤에만 활성화한다. 그 전에는 비활성 자리표시.
- 변경의 `setQueryData`·무효화 대상은 viewer 키다.

### 4-3. 경계

| 화면 | 규칙 |
|---|---|
| `(app)` · `hosting` | 데이터 경계는 `src/ui`의 `<AsyncBoundary>`(Suspense + ErrorBoundary + 재시도) 하나로 감싼다. `@suspensive/react-query`는 쓰지 않는다 |
| `(public)` | 프리페치한 쿼리만 `useSuspenseQuery`. 프리페치하지 않은 쿼리(GP-5 등)는 `useQuery`. 이 그룹에는 Suspense가 없다 |
| 오버레이 안 | 루트에서 렌더돼 라우트 경계 밖이다. 데이터를 읽는 오버레이는 안에 `<AsyncBoundary>`를 둔다 |

### 4-4. 기본 옵션 요약

| 대상 | 값 |
|---|---|
| query `retry` | 5xx·네트워크 오류만 1회 |
| mutation `retry` | 없음 |
| 서버 프리페치 쿼리 | `staleTime` 30초 |
| 조작 화면 · viewer · 세션 쿼리 | `staleTime` 0 |
| 폼 | RHF `defaultValues`로 한 번만 초기화. 다시 온 쿼리가 편집 중인 값을 덮지 않는다 |

---

## 5. API 클라이언트

`src/api/http.ts`의 ky 인스턴스를 감싼 객체 둘이다.

| 객체 | 경로 | 기본 주소 |
|---|---|---|
| `api` | `/api/v2` | 브라우저는 상대 경로, 서버는 `API_INTERNAL_URL`(`http://localhost:8080/api/v2`) |
| `authApi` | `/api/v1/auth` | 브라우저 전용(로그인 콜백, 재발급, 로그아웃, 탈퇴) |

```ts
// 개념 — 훅(afterResponse)이 아니라 객체 안에서 처리한다(ky 2.x 훅 방식은 스파이크에서 실패, tech-decisions §22)
const res = await http(path, { throwHttpErrors: false, credentials: 'include', … });   // 공개 GET의 401 재요청만 'omit'
const body = await res.json();
if (!body.success) throw new ApiError(res.status, body.code, body.reason);   // 상태는 본문이 아니라 HTTP
return parse(schema, body.data);                                              // zod 정책은 tech-decisions §4
```

- 에러는 `ApiError{status, code, reason}` 하나다. `status`는 **HTTP 상태**다. 본문 `status`와 다른 응답이 있다(토큰 없음 401의 본문은 403, api-contract §1).
- 화면에서 코드를 꺼낼 때는 `getErrorCode(e: unknown): string | null`. 네트워크 오류·파싱 실패에서도 throw하지 않는다.
- `src/api`는 리다이렉트도 토스트도 하지 않는다. 던지기만 한다.

### 5-1. 401 처리

| 상황 | 처리 |
|---|---|
| 보호 요청의 401(코드 무관) | 재발급을 한 번 시도 → 성공하면 원 요청 재시도, 실패하면 "세션 없음" |
| 재발급 | `navigator.locks.request('dudoong-auth-refresh')`로 탭 간 직렬화. 잠금을 얻으면 원 요청을 먼저 다시 보내 다른 탭이 이미 갱신했는지 본다. 그래도 401이면 재발급. Web Locks가 없으면 탭 안 single-flight만 |
| 세션 쿼리(GM-1)의 최종 401 | throw하지 않고 `null`(익명)로 끝난다 |
| 공개 GET(`{ public: true }`)의 401 | `credentials: 'omit'`로 한 번 다시 요청 |
| 리다이렉트 | `api`가 아니라 로그인 게이트만 한다. `/login/expired`는 직전에 세션이 있었을 때만 |
| 세션 있음 → 없음, 로그아웃 | `queryClient.clear()` 후 `location.assign()`(하드 이동) |

재발급과 "세션 없음" 통지는 `src/api`가 `setAuthHandlers({ refresh, onSessionLost })`로 주입받는다. 등록은 `features/shared/auth`가 한다. 그래서 `src/api`가 `features`나 라우터를 import하지 않는다.

### 5-2. 로그

서버 로그(`serverQuery`, 파싱 실패)에 남기는 경로는 라우트 패턴이다(`gifts/:token`, `check-in?token=:token`). 실제 토큰이 든 경로·쿼리를 남기지 않는다. 계좌번호·입금자명·토큰은 값으로도 넣지 않는다.

---

## 6. 오버레이 — `overlay-kit`

- 확인·시트·모달은 `overlay-kit` 하나로 연다. `window.confirm()`을 쓰지 않는다.
- **"확인 누르면 서버 호출 후 닫힘"은 `src/ui`의 `EasyOverlay`로 쓴다.** `onConfirm`(Promise)이 도는 동안 버튼을 잠그고, 성공하면 닫고, 실패하면 오버레이를 유지한다. 실패 토스트는 화면이 띄우고 그 mutation에 `meta: { handled: true }`를 준다. 1차 소비처는 P13a(승인·거절·취소·환불 완료)와 P8b(선물 보내기·회수·반환·거절).
- **URL로 여는 오버레이는 `overlay.open`을 쓰지 않는다.** 예매자 관리의 `?order={orderUuid}`처럼 주소가 원본인 것은 페이지가 쿼리 값을 보고 선언적으로 렌더한다. 닫기 = `router.replace`(쿼리 제거). 뒤로가기·새로고침·알림 진입이 저절로 맞는다.
- 경로가 바뀌면 `overlay.unmountAll()`을 호출한다(루트 레이아웃의 경로 감시 한 곳). 열린 오버레이가 다른 화면에 남지 않는다.

---

## 7. 계층 — 단방향 규칙

```
src/app → src/features → src/ui → src/api → src/utils
```

- 화살표 방향으로만 import한다. `ui`는 `api`를 import할 수 있다(타입, 쿼리 정의).
- `features/audience` ↔ `features/hosting`은 서로 import하지 않는다. 같이 쓰는 것은 `features/shared`.
- `src/api`는 `src/ui`·`features`를 import하지 않는다. 예외는 `src/api/server/`가 쓰는 `HydrationBoundary`·`notFound()`.
- `src/api/server/`는 라우트 파일(`src/app`)에서만 쓴다.
- `src/utils`는 순수 함수만 둔다. 훅은 `src/ui/hooks` 또는 `features`.
- eslint(`boundaries`)로 강제한다(P0).

---

## 8. 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| 컴포넌트 | PascalCase | `EventCard.tsx` |
| 스타일 | 컴포넌트와 같은 이름 | `EventCard.css.ts` |
| 훅 | `use` 접두 | `useMediaQueries.ts` |
| zod 스키마 | `Schema` 접미 | `EventDetailSchema` |
| 조회 · 변경 정의 | `{대상}Query` · `{대상}ViewerQuery` · `{동작}Mutation` | `eventDetailQuery`, `hostViewerQuery`, `approveOrderMutation` |
| import alias | `@/*` = `./src/*` 하나 | `import { api } from '@/api/http'` |
| 코드의 영역 이름 | `audience` · `hosting` | `ticket`·`admin`을 쓰지 않는다 |

---

## 9. 직접 구현하지 말 것

| 용도 | 쓰지 말 것 | 쓸 것 |
|---|---|---|
| 로딩 상태 | `useState(false)` + try/finally | mutation의 `isPending`, 그 밖은 `useLoading()`(`src/ui/hooks`) |
| delay · debounce · throttle | 직접 구현 | `es-toolkit` |
| 마운트 뒤에만 실행 | `useEffect` + `useState` 조합 | `useIsClient()`(`src/ui/hooks`) |
| 확인 다이얼로그 | `window.confirm()` | `overlay-kit` 기반 `ConfirmDialog`, `EasyOverlay`(§6) |
| 토스트 | 훅이나 직접 구현 | 명령형 `toast()`(`src/ui`). 렌더러는 루트 `Providers`에 하나 |
| 클립보드 | `navigator.clipboard.writeText()` 직접 | `copyText()`(`src/utils`, 실패 폴백 포함) |
| 날짜 파싱 · 표시 | 화면마다 포맷 | `src/api/shared/date.ts`(서버 형식 `yyyy.MM.dd HH:mm` ↔ 값, 표시 포맷) |
| 에러 코드 추출 | `try { e.response… }` | `getErrorCode()`(§5) |
| 엑셀 저장 | 직접 구현 | `api.download()` → `saveBlob()`(`src/utils`). 버튼과 파일명은 `features/hosting` |
| 데이터 경계 | `<Suspense>` + ErrorBoundary를 매번 조합 | `<AsyncBoundary>`(§4-3) |

---

## 10. 그 밖의 규칙

1. **typecheck는 `pnpm typecheck`로 한다**(`next typegen && tsc --noEmit`). 라우트 타입이 생성돼 있어야 통과한다. `tsc`만 돌리지 않는다.
2. **`any` 금지.** `unknown` 또는 구체 타입. `@typescript-eslint/no-explicit-any`로 강제한다(P0).
3. **간격·치수를 추측하지 않는다.** Figma 노드에서 읽고, 모르면 묻는다.
4. **v1 → v2 차이는 표(쓰지 말 것 → 쓸 것)로 남긴다.** Phase를 끝낼 때 [`implementation-log.md`](./implementation-log.md)에 적어 리뷰 체크리스트로 쓴다.

---

## 화면 패턴 — 읽는 법

> 2026-10-11 전면 개정. 이전 판(§11~§23)은 백엔드 계약을 모르는 상태에서 쓴 권장안이었다. 지금은 [`api-contract.md`](./api-contract.md)가 기준이고, 아래는 그 계약 위에서의 FE 구현 패턴이다. API ID는 api-contract §5를 따른다.
> 없어진 절: 지도(화면 없음), Q&A(API·화면 없음), 토스페이먼츠 위젯(PG 없음).

## 11. 공통 — 응답·에러·공개 GET

`api` 객체의 동작은 §5. 화면 쪽 규칙:

| 규칙 | 이유 |
|---|---|
| 화면 문구는 `code`로 분기하고 `reason`은 폴백으로만 쓴다 | `reason`은 서버 문장이라 화면 맥락과 안 맞을 수 있다 |
| 403은 HTTP 상태로 먼저 분기한다 | 호스트 권한 실패의 `code`가 `HOST_400_*`라 `code`의 숫자만 보면 400으로 오인한다 |
| 400 "이미 처리됨" 계열은 최신 상태를 다시 읽는다 | 409가 없다. 승인·거절·취소·선물 전이가 모두 이 패턴 |
| 공개 GET에서 401이 오면 토큰을 떼고 한 번 더 요청한다(`{ public: true }`, §5-1) | 공개 GET도 만료·잘못된 토큰이 붙으면 401 |
| 클라이언트 조회의 403·404는 공용 화면으로 보낸다 | 403 = "권한이 없어요"(호스팅 센터의 다른 호스트 공연 등), 404 = "찾을 수 없어요"(남의 주문 등). 서버 조회의 404는 `notFound()`(§14) |
| 변경 응답으로 캐시를 바로 채운다(`setQueryData`) | 변경 응답이 "화면을 다시 그릴 값"(수정된 리소스 · 남은 목록)이다 |
| 날짜는 표시 직전에만 변환한다 | 요청·응답 모두 `yyyy.MM.dd HH:mm` 문자열 |

`myRole` 기반 버튼 숨김은 편의이고 권한의 근거가 아니다. 숨긴 버튼이 호출돼도 서버가 403으로 막는다.

## 12. 목록 — 페이지 기반 무한 스크롤

커서가 아니라 `page`/`size`다.

```ts
// src/api/shared/page.ts — 개념
infiniteQueryOptions({
  queryKey: [...key, 'infinite', params],
  initialPageParam: 0,
  queryFn: ({ pageParam, signal }) => fetchPage({ ...params, page: pageParam, signal }),
  getNextPageParam: last => (last.hasNext ? last.page + 1 : undefined),
});
```

- 카드형 목록(공연 리스트, 호스트 공연, 알림함, 주문내역 G11/O-2, 관심 호스트 GM-4, 아카이빙 GM-5, 공연준비 홈 GH-1·GE-1, 선물 내역 GG-7)은 무한 스크롤 + 하단 sentinel. GG-7의 `direction`(`SENT`|`RECEIVED`)은 기본값이 없는 필수 파라미터다. 추가 로딩 실패는 기존 행을 지우지 않고 하단 재시도.
- 운영 표(주문 · 발급 티켓 · 환불)는 `DataTable` + 페이지 번호 + `placeholderData: keepPreviousData`.
- 알림함(GN-1)은 `totalElements`가 `null`이다. 건수를 쓰는 UI를 만들지 않는다.
- 페이지 방식이라 스크롤 도중 새 항목이 끼면 중복이 생길 수 있다. 렌더 전에 id로 중복을 제거한다.
- 필터가 바뀌면 새 queryKey의 첫 페이지부터 읽는다.

## 13. P5a — 태그 필터와 검색

**확정**: 드롭다운 1개 안에 4분류(`EVENT_TYPE` · `GENRE` · `AREA` · `TEAM`), 다중선택 칩, 초기화(`128:859`). 태그는 GE-11이 분류별로 묶어 준다. 서버 의미는 같은 분류 OR / 분류끼리 AND, `keyword`는 공연명 OR 호스트명, 지난공연은 `includePast`.

- 적용 필터는 **URL 쿼리**(`?keyword=&tagIds=1,2&includePast=true`), 드롭다운 열림은 로컬 상태.
- 칩 클릭 즉시 적용 + shallow `replace`. 적용 버튼은 Figma에 없다.
- `tagIds`는 정렬·중복 제거 후 queryKey에 넣는다(순서만 다른 캐시를 만들지 않는다).
- 없는 태그 id로 `Event_400_23`이 오면 GE-11을 다시 받아 필터를 초기화한다.
- 검색어는 50자에서 입력을 막는다. debounce 후 URL 반영.
- "공연임박순"은 드롭다운이 아니라 고정 라벨이다. 서버 정렬값이 `UPCOMING` 하나뿐이다(티켓탭도 같다).

## 14. P5b — 공연 상세: 서버 조회 · 섹션 · 공유

- 서버에서는 GP-3 + GE-5만 조회한다. 티켓 잔여(GP-5)는 브라우저가 따로 조회한다.
- 라우트 파일이 `<Prefetch queries={[eventDetailQuery(id), eventSectionsQuery(id)]}>`로 조회하고, 화면은 `useSuspenseQuery`로 같은 쿼리를 읽는다. 서버 캐시는 없다 — 요청마다 백엔드를 부른다. 서버에서는 토큰이 붙지 않는다. `export const instant = false`는 `(public)/layout.tsx` 한 곳에 있다(tech-decisions §4).
- 404(준비중·삭제·없음)는 `serverQuery`가 `notFound()`로 바꾼다. 이 라우트 위에 `<Suspense>`나 `loading.tsx`를 두지 않는다(경계 안에서 불리면 200이 된다). 5xx는 throw해서 `error.tsx`로 보낸다.
- `generateMetadata`도 `serverQuery(eventDetailQuery(id))`를 쓴다(요청당 QueryClient가 같아 조회는 한 번).
- **섹션 탭**: 서버 섹션이 있으면 그대로, 없으면 기본 4탭 라벨을 프론트가 그리고 빈 상태를 보여 준다.
- **섹션 뷰어**(`features/shared/section-viewer`): `contentFormat`으로 렌더러를 고른다(`HTML` → sanitize 후 렌더 / `MARKDOWN` → 마크다운 렌더 후 같은 sanitize). 클라이언트 컴포넌트다(`isomorphic-dompurify`는 서버 렌더와 브라우저 양쪽에서 돈다). 미리보기가 같은 컴포넌트를 쓴다.
- 문의처는 GP-3이 준다(공연 문의처, 없으면 호스트 연락처). 연락처 `type` 6종 → 아이콘·링크 매핑은 한 곳에서.
- `displayStatus`·`dDay`는 서버가 요청 시점에 계산해 준다. 구매 가능 여부는 GP-5의 `isPurchasable`로 판단한다.
- **카카오 공유**: `features/shared/kakao-share`가 SDK 준비를 소유한다. 실패하면 `copyText(canonicalUrl)` 폴백. OG 태그는 `generateMetadata`가 서버에서 넣는다 — 크롤러는 SDK를 실행하지 않는다.
- **크롤러 확인은 실제 카카오 UA로 한다**: `facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984`. `kakaotalk-scrap`만 보내면 Next가 크롤러로 인식하지 못해 OG가 `<body>`로 나간다(tech-decisions §2).

## 15. P6 — 티켓 선택과 잔여

- GP-5는 `staleTime: 0` + focus 재조회. 판매 중단·기간 밖·삭제 티켓은 서버가 이미 뺀다.
- `remaining`은 재고 − 승인 대기이고, **재고 공개 + 수량 지정일 때만 값이 있다**(그 밖엔 `null`). `null`을 0으로 표시하지 않는다.
- 구매 버튼은 `isPurchasable`로만 판단한다. 기존 PG 티켓은 목록에 남고 `false`다.
- 수량 스테퍼 상한 = `purchaseLimit` · `remaining` · 100 중 가장 작은 값(`null`은 빼고 고른다). 서버가 주문 수량을 100으로 막는다. 이미 산 수량(승인 대기 포함)은 화면이 모른다 — 넘으면 주문 때 에러.
- 다른 티켓을 고르면 "티켓은 한 주문당 한 종류만 구매할 수 있습니다"(`121:1517`).
- 선택은 페이지 이동 없이 상세 하단 인라인 스테퍼다(`424:18684`).

## 16. P7 — 체크아웃

폼 모델과 결제 흐름은 [`tech-decisions.md`](./tech-decisions.md) §18·§19.

| 컴포넌트 | 책임 |
|---|---|
| `CheckoutPage` | G11/O-0 조회, 섹션 조립, 제출 |
| `OptionAnswersForm` | same/individual 모드, 아코디언 `(n/N)` |
| `PaymentAmount` | `order/price.ts` 결과 표시. 화면에서 다시 계산하지 않는다 |
| `PaymentChannelSelect` | 직접 계좌이체 / 토스 송금 단일 선택. 무료면 렌더하지 않는다 |
| `AccountInfo` | 은행·계좌·예금주 + 복사 |
| `DepositConfirmDialog` | `EasyOverlay`. `onConfirm`에서 주문 생성 |
| `OrderComplete` | 주문 완료는 `orderUuid`를 가진 주소로 보낸다(라우트는 tech-decisions §3·§19). 생성 응답을 `setQueryData`로 G11/O-3 캐시에 넣고, 새로고침·배포 뒤 하드 리로드에도 G11/O-3으로 다시 그린다 |

G11/O-0의 `account`가 `null`(무료·매진·지난 공연)이면 결제 정보 영역을 그리지 않는다. 404면 티켓 선택으로 돌려보낸다.

## 17. P8 — 티켓탭 · 캐러셀 · QR

- **목록**: G11/T-1은 페이지 없이 전부 온다. 묶음 `groupKey` 단위 카드, 묶음 안 티켓은 좌우 스와이프 + `N/M` 텍스트 페이저(도트 근거 없음).
- 묶음 카드에 상태별 개수 `counts`를 배지로 그린다("승인완료 2 / 선물 대기중 1", `455:8958`).
- 목록에는 `canGift`·`canReturn`이 없다. 버튼은 카드에서 연 G11/T-2로 판단한다. G11/T-2를 열면 그 주문의 승인 알림이 읽음 처리돼 공지 바가 풀린다(아래).
- 정렬은 고정 라벨 "공연임박순"(§13).
- **캐러셀**: CSS `scroll-snap`(추가 의존성 없음). 선택 티켓은 `ticketUuid`가 아니라 **묶음 안 인덱스**로 기억한다 — uuid는 선물 수락·반환 때 바뀐다.
- **`state` → 카드**: 11값을 한 매핑 테이블에서 라벨·색·가능 액션으로 바꾼다. 모르는 값이 와도 깨지지 않게 기본 분기를 둔다.
- 받은 티켓 묶음은 `orderUuid`가 `null`이라 [주문상세]가 없다. 승인 대기·거절 주문은 티켓 없이 주문만 온다.
- **QR**: `qrValue`를 그대로 인코딩한다(값 = 티켓 uuid). 가공하지 않는다. `null`(선물 대기·취소)이면 QR 대신 사유 안내.

```tsx
// ticket/blocks/QrCode.tsx — qr-code-styling은 DOM이 필요해 effect에서 import
useEffect(() => {
  let disposed = false;
  const el = ref.current;
  if (!el) return;
  el.replaceChildren();
  void import('qr-code-styling').then(({ default: QRCodeStyling }) => {
    if (disposed) return;
    new QRCodeStyling({ type: 'svg', data: qrValue }).append(el);
  });
  return () => { disposed = true; el.replaceChildren(); };
}, [qrValue]);
```

- G11/T-2를 열면 서버가 그 주문의 승인 알림을 읽음 처리한다(비동기). 열고 나서 G11/T-3과 GN-2를 무효화한다.
- G11/T-2가 `IssuedTicket_404_1`이면 티켓탭 목록을 다시 읽는다(선물로 넘어갔거나 uuid가 바뀜).
- 웹에서 화면 밝기 강제·스크린샷 차단은 할 수 없다. `navigator.wakeLock`은 QR 표시 중 선택적으로만 쓴다.
- QR 값이 고정 uuid라 스크린샷이 유출되면 타인이 입장할 수 있다. 서버가 중복 입장을 막고(`ALREADY_ENTERED`), 선물 수락 시 옛 값이 무효가 되는 것이 방어선이다.

## 18. P8b — 선물

상태와 규칙은 tech-decisions §20.

- **버튼 노출은 G11/T-2 플래그로만**: [선물하기] = `canGift`, [선물 반환] = `canReturn`. 목록(G11/T-1)에는 이 값이 없다.
- `viewState` 7종을 한 매핑으로 화면·버튼에 연결한다. Figma에 없는 5종(ALREADY_ACCEPTED · REJECTED · RETURNED · OWN_LINK · EXPIRED)은 문구만 백엔드 문서에 있다.
  - `viewState`와 `isReceiver`는 사용자에 따라 달라 viewer 쿼리로 읽는다(§4-2). 확정 전에는 수락·거절 버튼을 비활성으로 둔다.
  - `OWN_LINK`(보낸 본인): [선물 취소]로 안내한다.
  - `EXPIRED`: 보낸 사람이면(GG-3 `giftId`가 있음) [회수] 버튼을 둔다(DG-2).
- 보내기·회수·반환·거절 확인은 `EasyOverlay`. `onConfirm`의 mutation이 끝날 때까지 버튼을 잠근다. 거절 확인 팝업은 `128:1831`.
- 이미 선물 중인 티켓으로 보내기를 하면 `Gift_400_2`다. G11/T-2를 다시 읽어 `gift.linkPath`로 기존 링크 화면을 보여 준다.
- 링크는 `origin + linkPath`로 만든다. 공유는 [메세지] `sms:?body={링크}`, [카카오톡] `features/shared/kakao-share`, [링크복사] `copyText()` 세 가지(`455:8935`).
- 메모는 대기 중일 때만 수정할 수 있다(빈 값 = 삭제).

## 19. P8c · P13b — 체크인 결과

호스트 스캔(PQ-2)과 셀프(PQ-5)는 같은 `result` enum을 쓴다. 결과 화면 컴포넌트와 `result` → 표시 매핑은 `features/shared/checkin-result`에 둔다(`src/api`는 UI를 모른다).

| `result` | 표시 |
|---|---|
| `ENTERED` | 성공 + `ownerName` · 티켓 이름 |
| `ALREADY_ENTERED` | 경고 + `enteredAt` |
| `OTHER_EVENT` | "이 공연 티켓이 아니에요"(티켓 정보 없음) |
| `CANCELED` | "취소된 티켓이에요" |
| `GIFT_PENDING` | "선물 대기 중인 티켓이에요. 보낸 분이 선물을 취소해야 입장할 수 있어요" |
| `SELECT_TICKET` | (셀프 전용) `candidates`에서 고르기 |

- PQ-2는 실패도 200이다. 에러 경로가 아니라 `result`로 분기한다.
- 연속 스캔: 같은 값의 재인식은 일정 시간 무시하고, 요청 중에는 다음 인식을 대기시킨다.
- 현장 확인 이름은 `buyerName`이 아니라 `ownerName`.
- 카메라 권한 거부·기기 없음은 스캔 결과와 다른 화면으로 처리한다.
- 셀프 체크인(PQ-5)은 OPEN 공연만 된다. 정산중 공연에서 관객이 QR을 찍으면 `Event_400_5`다 — "호스트에게 티켓 QR을 직접 보여 주세요"로 안내한다.

## 20. P9 — 주문상세 · 취소 · 환불 계좌

- 버튼 노출은 서버 플래그로만: 주문취소 = `canCancel`, 환불 계좌 입구 = `canEditRefundAccount`, 입력 유도 = `refundAccountRequired`.
- 사용자 주문 상태 5종 × `refundStatus` 3종을 한 매핑에서 라벨로 바꾼다.
- 유료 취소는 환불 계좌 시트가 필수(`Order_400_25`), 무료는 확인만.
- 본인 환불 계좌는 `maskedAccountNumber`로만 온다. 수정 화면은 전체를 다시 입력받는다.
- 환불 계좌 폼 제한: 은행명 20자, 예금주 20자, 계좌번호 30자(숫자·하이픈·공백, `^[0-9][0-9 -]*[0-9]$`). 티켓 계좌(30/30/50)와 다르다(api-contract §4).
- 입금 미확인 거절(`DEPOSIT_UNCONFIRMED`)은 `refundAccountRequired=false`라 입력을 유도하지 않는다. 입구(`canEditRefundAccount`)는 그대로 둔다.
- 거절 사유: `reasonType`별 고정 문구는 프론트가 가진다. `ETC`만 호스트가 쓴 `reasonText`.
- 옵션 표시: `lines`가 1개면 "모든 티켓에 같은 옵션", 여러 개면 티켓별. 선물 상태는 `issuedTickets[]`에서 읽는다.
- 호스트 문의 시트는 주문상세에 연락처가 없어 GP-3을 따로 부른다.

## 21. P9b · P10a — 알림

- **벨**: GN-2 `{count}`. `count > 0`이면 빨간 점(숫자는 그리지 않는다). 로그인된 셸에서 항상 구독하고 focus·메뉴 진입 시 재조회.
- **알림함**: GN-1 무한 스크롤. 항목 `{notificationId, type, title, body, target{type, targetId, eventId}, extra, isRead, createdAt}`.
- **읽음**: PN-3 `{notificationIds: [id]}` 또는 `{readAll: true}`. 응답 `{updatedCount, unreadCount}`로 벨 캐시를 바로 갱신한다 — 낙관적 차감을 추정으로 하지 않는다.
- 행의 읽음 표시는 낙관적으로 바꾸고 실패하면 되돌린다.
- **타입 매핑**: 15종 → 카테고리(티켓선물 안내 / 티켓승인 안내 / 공연 알림 등)·아이콘은 한 매핑에서. 모르는 타입은 기본 아이콘 + `title`·`body` 그대로.
- 본문은 서버가 만든 문자열이다. HTML로 넣지 않는다.
- 알림은 커밋 후 비동기 저장이라 mutation 직후 목록에 없을 수 있다. mutation 성공 직후의 알림 재조회에 기대지 않는다.
- 관객 화면과 호스팅 센터가 같은 알림함을 쓴다. 쿼리는 `src/api/notification`, 벨·알림함·타입 매핑은 `features/shared/notification`.

## 22. 호스팅 센터 — 권한별 화면

- `myRole`(GH-1 · GH-3 · GE-1 · GE-3)로 화면 모드를 정한다: 매니저 이상 = 편집, 일반 멤버 = 읽기 전용.
- 권한 판정은 한 곳(`can(role, action)`)에 두고 화면에서 역할 문자열을 직접 비교하지 않는다. 표는 api-contract §2.
- 공연 만들기의 호스트 선택에서 내가 일반 멤버인 호스트는 비활성으로 둔다.
- 매니저의 멤버 초대는 역할 선택지를 "일반"으로 고정한다. 마스터 행에는 메뉴를 두지 않는다.
- 멤버 변경 응답은 전부 "변경 후 멤버 전체 목록"이다. 그대로 캐시에 넣는다.
- **마스터 양도·역할 변경 뒤에는 `myRole`을 주는 쿼리를 무효화한다**(GH-1, GH-3 viewer, GE-1, GE-3). 양도하면 내가 매니저가 되므로 화면 모드가 바뀌어야 한다.
- 멤버 목록(GH-6)에는 이메일이 없다.
- 권한 가이드 표(`503:30950`)는 api-contract §2로 그린다. Figma의 "호스트 삭제" 행은 뺀다.

## 23. 호스팅 센터 — 폼과 부분 수정

- **PATCH는 바뀐 필드만 보낸다.** RHF `dirtyFields`로 본문을 만든다.
- 객체·배열 필드는 통째 교체다. `place`를 고치면 `detailAddress`까지 다시 보낸다. `contacts`·`tagIds`도 전체를 보낸다.
- **티켓 수정(P10/T-3)**: 값을 비울 때는 `null`이 아니라 `clear[]`. 같은 필드에 값과 clear를 함께 보내지 않는다. `payType`을 바꾸면 `price`를 함께 보낸다.
- **티켓 폼**: "무제한"을 고르면 "재고 공개"를 끄고 비활성. 잠긴 티켓(`isSold || hasPendingOrders`)은 허용 필드만 활성.
- **섹션(PE-6)**: 전체 교체다. 탭 하나를 저장해도 모든 섹션을 보낸다.
- **새 옵션**: P10/O-2(생성) → P10/O-5(지정) 두 번 호출. 두 번째가 실패하면 옵션은 풀에 남아 있으므로 "옵션은 만들어졌고 티켓에 붙이지 못했다"로 안내한다.
- 이미지: 발급(분당 30회 제한) → S3 PUT → 폼 값에 `key` 보관 → 저장 API에 `key`. 저장 전에는 서버에 반영되지 않는다. 발급된 URL은 3분 유효라 고른 직후 올린다. PUT이 실패하면 발급부터 다시 한다.
- 장소: "주소 찾기"(다음 우편번호) → 고른 주소를 카카오맵 `services.Geocoder`로 좌표 변환 → `place{name, address, latitude, longitude, detailAddress}`. 좌표를 못 얻으면 저장하지 않고 다른 주소를 고르게 한다.
- 옵션 설명은 필수다(서버 `@NotBlank`).
- 미저장 이탈: 변경이 있으면 메뉴 이동·뒤로가기에서 확인(`503:22904`).
- 승인 실패(PR-3): 에러를 보여 주고 주문은 승인 대기로 남는다는 것과 거절로 정리하는 길을 함께 안내한다.
- 엑셀: 응답이 래퍼 없는 xlsx다. blob으로 받아 저장한다. JSON 파서를 태우지 않는다.

## 24. 화면별 에러 처리

백엔드 통합 기획서 각 장의 "에러와 예외 처리" 표에서 화면이 따로 처리해야 하는 코드만 모았다. 코드 전체는 [`error-codes.md`](./error-codes.md), 공통 규칙(403·404·"이미 처리됨")은 §11. 여기 없는 400은 `reason`을 토스트로 보여 준다.

| Phase | 화면 | 코드 | 처리 |
|---|---|---|---|
| P5a | 공연 리스트 | `Event_400_23` | 없는 태그. GE-11을 다시 받아 필터 초기화(§13) |
| P7 | 체크아웃 | `Event_400_5` · `Event_400_6` | 오픈 전·시작 후. 구매 버튼 비활성 + 상세로 돌려보냄 |
| P7 | 체크아웃 | `Order_400_22` | 입금자명 칸 오류 |
| P8 | 티켓 상세 | `IssuedTicket_404_1` | 선물로 넘어갔거나 uuid가 바뀜. 티켓탭 목록 다시 읽기(§17) |
| P8b | 선물 보내기 | `Gift_400_1` | `canGift`로 버튼을 미리 숨긴다. 오면 G11/T-2 다시 읽기 |
| P8b | 선물 보내기 | `Gift_400_2` | 이미 선물 중. 기존 링크 화면(§18) |
| P8b | 선물 랜딩 | `Gift_400_4` · `Gift_400_5` · `Gift_400_6` | 각각 `OWN_LINK` · `EXPIRED` · `CANCELED` 화면으로. GG-3을 다시 읽는다 |
| P8b | 선물 반환 | `Gift_400_7` | 반환할 수 없는 티켓. G11/T-2 다시 읽기 |
| P8c | 셀프 체크인 | `Event_400_26` | 잘못된 체크인 QR |
| P8c | 셀프 체크인 | `Event_400_5` | OPEN이 아닌 공연(정산중 포함). "호스트에게 티켓 QR을 직접 보여 주세요"(§19) |
| P8c | 셀프 체크인 | `IssuedTicket_400_1` | 같은 공연의 남의 티켓. "내 티켓이 아니에요" |
| P9 | 주문 취소 | `Order_400_5` · `Order_400_24` | 취소할 수 없는 상태. G11/O-3 다시 읽기(`canCancel`이 꺼진다) |
| P9 | 주문 취소 | `Order_400_9` | 공연 시작 후. [주문취소]는 `canCancel`로 이미 숨는다 |
| P9 | 주문 취소 | `Order_400_25` | 유료 취소에 환불 계좌 없음. 계좌 시트를 연다 |
| P9 | 환불 계좌 | `Order_400_27` · `Order_400_28` | 입력할 수 없는 주문 · 이미 환불 완료. G11/O-3 다시 읽기 |
| P9 | 프로필 | `USER_400_4` | 닉네임 공백만. 칸 오류 |
| P9 | 프로필 | `USER_400_5` | 본인이 올린 이미지가 아님. PM-3 발급부터 다시 |
| P9 | 탈퇴 | `USER_400_6` | "마스터를 양도한 뒤 탈퇴해 주세요" |
| P10b | 호스트 설정 | `HOST_400_16` | 연락처 칸 오류 |
| P10b | 호스트 설정 | `HOST_400_17` | 이 호스트에 올린 이미지가 아님. 업로드 처음부터 |
| P10b | 멤버 초대 | `HOST_400_13` · `14` · `15` | 미가입 · 중복 · 이미 멤버. 사유의 이메일을 해당 줄에 표시 |
| P10b | 멤버 초대 | `HOST_400_18` | 같은 이메일 계정이 여럿. "두둥에 문의해 주세요" |
| P10b | 멤버 관리 | `HOST_404_2` | 이미 없는 멤버. 멤버 목록 다시 읽기 |
| P11 | 기본 정보 | `Event_400_24` | "등록된 공연은 지금 이후로만 바꿀 수 있어요" |
| P11 | 상세 정보 | `Event_400_21` | 섹션 형식(1~10개, 제목 20자, 본문 20,000자) |
| P11 | 공연 등록 | `Event_400_7` | 조건 미충족. GE-7을 다시 읽어 빠진 항목 표시 |
| P11 | 공연 등록 | `Event_400_8` | 이미 오픈됨. GE-3 다시 읽기 |
| P11 | 기본 정보 | `Event_400_25` | 유효 티켓이 있는데 "티켓 없음"으로 바꾸려 함. 토글 칸 오류 |
| P12 | 티켓 폼 | `Ticket_Item_400_3` | 가격(두둥 1원 이상, 무료 0원) |
| P12 | 티켓 폼 | `Ticket_Item_400_12` | 티켓 없음 공연. 추가 버튼을 미리 숨긴다 |
| P12 | 티켓 폼 | `Ticket_Item_400_15` | 무제한 + 재고 공개. 폼에서 미리 막는다(§23) |
| P12 | 옵션 붙이기 | `Item_Option_Group_400_2` | 잠긴 티켓. ⊗를 미리 숨긴다 |
| P12 | 옵션 붙이기 | `Item_Option_Group_400_4` | 무료 티켓에 유료 옵션. 선택지에서 미리 뺀다 |
| P13a | 주문 상세 | `Order_400_3` | 이미 처리된 주문. GR-2 다시 읽기 |
| P13a | 승인 | `Order_400_14` | 탈퇴한 주문자. "거절로 정리해 주세요" |
| P13a | 거절 | `Order_400_18` | 사유 오류(`ETC`는 문구 필수, 20자). 시트에서 미리 검증 |
| P13a | 환불 완료 | `Order_400_17` | 환불 요청 상태가 아님. [환불 완료]는 `refundStatus=REQUESTED`일 때만 |
| P13a | 엑셀 | `Order_400_19` · `IssuedTicket_400_7` | 1만 행 초과. 필터를 좁히라고 안내 |
| P13b | 호스트 스캔 | `Event_400_27` | OPEN·정산중이 아닌 공연 |

표의 코드는 모두 `error-codes.md`에 있는 것을 확인했다(2026-10-14). 셀프 체크인의 `Event_400_5`는 백엔드 `V2CheckInDomainService.selfCheckIn` → `Event.validateNotOpenStatus()` → `EventNotOpenException`(`EVENT_NOT_OPEN`)에서 확인했다.

