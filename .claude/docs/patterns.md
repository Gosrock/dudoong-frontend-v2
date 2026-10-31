# DuDoong-Front v2 — 구현 패턴

> 2026-10-14 개정. §1~§3(반응형 · 텍스트 · 레이아웃)은 vanilla-extract 기준이다. §4~§10(조회 · API 클라이언트 · 오버레이 · 계층 · 네이밍)은 tossinsu-desktop 인용을 지우고 DuDoong 규칙만 남겼다. §11 이후는 화면 패턴, §24는 화면별 에러 처리다. 2026-10-15 검토 2회차: 세션 상실·에러 토스트·URL 오버레이·zod enum 규칙을 확정하고 §24를 기획서 표 기준으로 채웠다. 같은 날 검토 3회차: 세션 표시를 `dd:session` 값 하나로 합치고 GM-1 결과를 셋으로 정했다(§5-1), `handleCodes` 헬퍼(§4-5), `?order=`는 열고 닫기 모두 `replace`(§6), GH-14는 브라우저에서만 읽는다(§4-2), 선물 취소 안내 조건을 백엔드 판정 순서에 맞췄다(§20).
> 근거 문서: [`tech-decisions.md`](./tech-decisions.md), [`plan.md`](./plan.md), [`directory-structure.md`](./directory-structure.md), [`api-contract.md`](./api-contract.md)

---

## 1. 반응형 — CSS가 정하고, JS 분기는 마운트 뒤에만

**원칙: 서버와 클라이언트가 항상 같은 DOM을 그린다. 무엇이 보일지는 CSS가 정한다.** 첫 렌더에서 뷰포트를 JS로 판정하면 서버가 그린 것과 달라져 하이드레이션이 어긋난다.

브레이크포인트는 `src/ui/theme/breakpoints.ts` 한 곳에 있다. 지금 코드(P1): **desktop ≥ 1024px**, wide ≥ 1280px(옛 `Desktop - 27` 3단 배치용). 간격 토큰 `Space/7~10`도 같은 기준으로 데스크탑에서 커진다(design-system §1). **관객·호스팅 모두 1024부터 데스크탑이다**(사용자 결정 2026-10-31, design-requests Q38 닫힘). 호스팅 GUI 반응형 스펙의 1133 경계 대신 1024를 쓰고, 1024~1132는 GUI가 1133에서 그린 레이아웃을 쓴다. 호스팅 우측 패널 폭은 1280 · 1440에서 바뀐다(GUI 스펙). 경계가 하나라 토큰을 나누지 않는다(design-system §2).

### 1-1. 조건부 값 — sprinkles와 프리미티브 props

```tsx
// 모바일에서만 보임
<p className={sprinkles({ display: { mobile: 'block', desktop: 'none' } })}>…</p>

// 브레이크포인트별 간격
<Spacing size={{ mobile: 4, desktop: 6 }} />

// 방향 전환
<Flex direction={{ mobile: 'column', desktop: 'row' }} gap={4}>…</Flex>
```

둘 다 DOM에 있고 CSS가 하나만 보이게 한다. 조건 이름은 `mobile`(기본)·`desktop`이다(`src/ui/theme/sprinkles.css.ts`).

### 1-2. 이미지 소스가 다를 때

둘 다 렌더하고 조건부 `display`로 하나만 보이거나 `<picture>` + `<source media>`를 쓴다. 안 보이는 쪽까지 내려받는 것이 부담이면 `<picture>`를 쓴다.

### 1-3. 컴포넌트 자체가 바뀌어야 할 때 — `useMediaQueries()`

데스크탑은 사이드바, 모바일은 드로어처럼 **컴포넌트가 통째로 다를 때만** `src/ui/hooks/useMediaQueries.ts`를 쓴다. 첫 렌더는 서버와 같게 `null`이고 마운트 뒤에 `'mobile' | 'desktop'`을 판정한다. `null`일 때는 양쪽에 공통인 자리표시를 그린다.

| 상황 | 방법 |
|---|---|
| 보이기·숨기기, 간격, 방향, 크기 | sprinkles 조건부 값 / 프리미티브 props |
| 이미지 소스 | 둘 다 렌더 또는 `<picture>` |
| 컴포넌트 교체 | `useMediaQueries()` |

---

## 2. 텍스트 — `Txt`

- `<h1>`·`<p>`에 직접 글자 스타일을 주지 않는다. `Txt`를 쓴다(`src/ui/primitives/Txt.tsx`).
- 크기·굵기·행간·자간은 `typography` 프리셋으로 정한다. 프리셋은 Figma 텍스트 스타일 21개다(`src/ui/theme/typography.css.ts`, design-system §1). 이름은 Figma 이름을 정리한 것이다 — `Body/md` → `bodyMd`, `Heading/sm - emphasized` → `headingSmEmphasized`.
- 색은 **`colors`의 값**으로 넘긴다(`src/ui/theme/colors.ts`). 의미 색(`colors.textSecondary`, `colors.brandPrimary` …)은 CSS 변수라 이쪽을 먼저 쓴다(라이트 한 벌 — 다크 모드 미지원(사용자 결정 2026-10-25)). 원시 색(`colors.blue400` …)은 Figma Atomic 값 그대로다 — 의미 색에 없는 색이 꼭 필요할 때만 쓰고, 그런 색은 디자이너에게 의미 색 추가를 요청한다.
- 시맨틱 태그가 필요하면 스타일과 분리해 `as`로만 지정한다. 줄 수 제한은 `lines={1 | 2}`.

```tsx
<Txt as="h2" typography="headingSmEmphasized">공연 정보</Txt>
<Txt typography="bodyMd" color={colors.textSecondary}>설명</Txt>
<Txt typography="headingSmEmphasized" lines={2}>긴 공연 제목은 두 줄에서 말줄임</Txt>
```

폰트: 본문은 Pretendard(가변, 동적 서브셋 CSS — 화면에 나온 글자 조각만 받는다), 숫자 전용 `titleNumber`는 Saira Condensed(`next/font/google`). `title`의 Kartrider는 웹 임베드 라이선스 확인 전이라 불러오지 않고 Pretendard로 대신한다(design-system §1).

---

## 3. 레이아웃 — `Flex` / `Spacing` 우선

- `div` + `display: flex` 대신 `<Flex>`, margin 대신 `<Spacing>`. 페이지 폭은 `<Container>`(Figma 그리드 여백 24 · 40 · 80), 구분선은 `<Divider>`.
- 정렬은 `Flex.Center`(양축), `Flex.CenterVertical`(교차축), `Flex.CenterHorizontal`(주축).
- props는 토큰 키만 받는다 — `gap={4}`는 `Space/4`(16px). 반응형 값은 `{ mobile, desktop }`.
- **간격을 추측하지 않는다.** Figma 노드에서 읽고, 모르면 묻는다.

```tsx
<Flex direction="column" gap={2}>
  <Flex justify="space-between" fullWidth>
    <Txt typography="headingSmEmphasized">공연 정보</Txt>
    <Txt typography="labelSm" color={colors.textSecondary}>더보기</Txt>
  </Flex>
  <Spacing size={4} />
</Flex>
```

**함정 — 컬럼 방향 `Flex`는 자식을 가로로 늘리지 않는다.** 양끝 정렬 행이 내용 폭으로 줄어든다. 꽉 차야 하는 행에는 `fullWidth`를 준다(Storybook `Foundation/Primitives` → `FlexLayouts`).

`Flex`·`Spacing`·`Txt`·`Divider`·`Container`는 훅도 상태도 없어 서버 컴포넌트에서도 쓴다. `src/ui`의 공개 props 타입은 vanilla-extract 타입(Sprinkles, RecipeVariants)을 노출하지 않는다 — `src/ui/theme/types.ts`의 자체 타입(`SpaceKey`, `Responsive<T>` …)을 쓴다.

### 스타일을 쓰는 세 가지 방법

`css={css(...)}`처럼 컴포넌트 파일 안에 스타일을 정의하는 방법은 없다. 정의는 `.css.ts` 파일에만 둘 수 있다. 파일을 매번 만들지 않도록 층을 둔다(Storybook `Foundation/Styling methods`).

| 순서 | 방법 | 예 |
|---|---|---|
| 1 | 프리미티브 | `<Flex gap={4} align="center">` |
| 2 | `sprinkles()` 인라인 | `className={sprinkles({ marginTop: 4, background: 'grey' })}` |
| 3 | `Foo.css.ts` | 고유한 모양, 자손 선택자, 애니메이션, 변형(recipes) |

런타임에 정해지는 값은 CSS 변수에 넣는다.

```tsx
<div className={bar} style={assignInlineVars({ [progressVar]: `${rate}%` })} />
```

`Txt` · `Flex` · `Spacing`이 갖춰졌으므로 화면 코드에서 원시 `<div className={…}>`로 레이아웃을 짜는 것을 리뷰에서 지적한다.

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
- queryKey는 경로를 쪼갠 모양으로 손으로 쓴다. `viewer`는 리소스 바로 뒤, `infinite`는 그 뒤, 파라미터는 마지막 원소다. 예: 호스트 공연 목록의 공개 키 `['hosts', id, 'events', 'infinite', params]`, 멤버용 `['hosts', id, 'events', 'viewer', 'infinite', params]`.
- `mutationOptions`에는 `mutationFn`만. 캐시 반영·토스트·이동은 화면의 `onSuccess`에.
- 의존값이 없으면 `skipToken`(또는 `useQuery`의 `enabled`). 파생 값은 호출부의 `select` 옵션. 헬퍼를 만들지 않는다.
- `useQuery(xxxQuery())`를 감싸기만 하는 훅을 만들지 않는다. 여러 쿼리를 합쳐 파생 상태를 만들 때만 훅을 둔다.

### 4-2. 공개 값과 사용자별 값은 키를 나눈다

서버 프리페치는 토큰 없이 돈다. 같은 응답에 사용자별 필드가 섞인 API(GH-3 `myRole`·`isFollowing`·**`contacts`**, GP-3 **`contacts`**, GH-14 준비중 공연, GG-3 `isReceiver`·`viewState`)는 두 쿼리로 읽는다. 연락처가 사용자별 값이 된 것은 백엔드 #846(2026-10-25 — GP-3·GH-3이 비로그인에게 전화·이메일을 가린다) 때문이다. GH-3 `members[].name`(#811로 생긴 필드)도 #846으로 비로그인에게 가려지지만 프론트는 `members`를 쓰지 않는다(멤버 줄은 GH-6).

| | 공개 쿼리 `xxxQuery` | viewer 쿼리 `xxxViewerQuery` |
|---|---|---|
| 키 | `['hosts', id]` | `['hosts', id, 'viewer']` |
| 조회 | 라우트 파일의 `<Prefetch>`(GH-14 목록은 예외 — 아래) | 브라우저, 세션이 있을 때만(`enabled`) |
| 화면이 읽는 것 | 공개 필드 | 사용자별 필드 |

- 사용자에 따라 달라지는 버튼은 viewer가 확정되거나 익명이 확정된 뒤에만 활성화한다. 그 전에는 비활성 자리표시.
- **익명이 확정되면 그 버튼은 요청을 보내지 않는 로그인 링크다**(`/login?redirect=현재경로`). 호스트 홈 ♡, 선물 랜딩 [선물받기]가 해당한다. 익명 상태에서 보호 API를 불러 401을 받는 경로를 만들지 않는다.
- 호스트 홈 공연 목록(GH-14)은 서버에서 프리페치하지 않는다. 브라우저에서 `useInfiniteQuery`로 읽는다(`(public)`이라 Suspense 없이, 스켈레톤으로). 비멤버는 공개 키, 멤버는 viewer 키. OG에 필요 없는 목록이라 서버 렌더 호출을 늘리지 않는다.
- 세션 쿼리(GM-1)가 확정된 뒤 viewer를 부르므로 요청이 직렬이 된다. 받아들인 비용이다.
- 변경의 `setQueryData`·무효화 대상은 viewer 키다. 공개 키에도 화면에 쓰는 같은 필드가 있으면 공개 키도 `invalidateQueries`한다. GH-3의 `followerCount`는 응답에 있지만 화면에 그리지 않으므로 팔로우 뒤 공개 키를 무효화하지 않는다.
- 토글 변경(♡)은 같은 `scope`로 묶어 요청을 순서대로 하나씩 보낸다. 마지막 클릭의 응답만 캐시에 반영하고, 마지막 요청이 실패하면 viewer를 다시 읽는다(P5c-L `useHostFollow`).
- 확인 전에 기다리는 영역을 화면마다 정한다.

| 화면 | 공개 값으로 그리는 것 | 세션·viewer가 확정될 때까지 기다리는 것 |
|---|---|---|
| 선물 랜딩 | OG, 공연 요약 | 상태 영역 전체(`viewState`·`isReceiver`에 따른 본문과 버튼)를 스켈레톤으로 |
| 호스트 홈 | 소개 | ♡ 상태, 설정·멤버 버튼, **연락처**(viewer 확정 뒤 `hostViewerQuery` 응답의 원문 — 추가 요청 없음. 확정 전·실패 동안은 공개(가린) 값 + `status` `pending`·`error`, 익명은 가린 값 그대로. `useHostHome().contacts`는 `ContactsState`). 공연 목록은 세션이 확정된 뒤 공개 키(비멤버) 또는 viewer 키(멤버)로 한 번만 읽는다 — 공개 목록을 그렸다가 바꾸지 않는다 |
| 공연 상세 | 연락처 시트를 열기 전 전부(공개 키 GP-3) | 연락처 시트 안 목록만: 시트를 열고(`open`) 세션이 있을 때 `eventDetailViewerQuery`(`['events', id, 'viewer']`, 쿠키, 프리페치 안 함, `staleTime` 0)로 원문을 읽는다(`useEventContacts(eventId, {open})` → `{status: idle\|pending\|ready\|error, items, masked, retry}`). 익명이면 요청 없이 가린 값. 한 번 받은 원문은 닫아도 유지 |

- **가린 값은 링크로 만들지 않는다**(`contact-link.ts` — `PHONE`·`EMAIL` 값에 `*`가 있으면 `masked: true`, `href: null`). 가린 이메일 `ab***@gmail.com`이 `mailto:` 링크가 되던 문제를 막는다. 알려진 한계: 원문 이메일 아이디에 `*`가 있으면 가린 값으로 오판한다(백엔드가 가림 여부를 따로 주지 않는다).
- 만료된 액세스 쿠키로 viewer를 부르면 #792 뒤로 401이 아니라 익명 200(가린 값)이 와서 재발급이 일어나지 않는다 → 연락처는 `masked: true`인 `ready`. 실제로 생기는 구간인지는 미확인(tech-decisions §4).

### 4-3. 경계

| 화면 | 규칙 |
|---|---|
| `(protected)` · `hosting` | 데이터 경계는 `src/ui`의 `<AsyncBoundary>`(`QueryErrorResetBoundary` + Suspense + ErrorBoundary + 재시도) 하나로 감싼다. `@suspensive/react-query`는 쓰지 않는다. `SessionLostError`는 경계가 잡지 않는다(fallback 유지, §5-1) |
| 게이트 없는 `(app)` 화면(`/events`, `/login`, `/kakao/callback`) | `useQuery`만 쓴다. 서버 렌더에서 조회가 돌지 않게 한다 |
| `(public)` | 프리페치한 쿼리만 `useSuspenseQuery`. 프리페치하지 않은 쿼리(GP-5 등)는 `useQuery`. 이 그룹에는 Suspense가 없다 |
| 오버레이 안 | 루트에서 렌더돼 라우트 경계 밖이다. 데이터를 읽는 오버레이는 안에 `<AsyncBoundary>`를 둔다 |

### 4-4. 기본 옵션 요약

| 대상 | 값 |
|---|---|
| query `retry` | 5xx·네트워크 오류만 1회 |
| mutation `retry` | 없음 |
| 서버 프리페치 쿼리 | `staleTime` 30초 |
| 세션 쿼리(GM-1) | `staleTime` 5분. 로그인·로그아웃·프로필 수정 때 직접 갱신. `refetchOnWindowFocus`는 켜지만 stale일 때만 다시 조회하므로 5분 안에는 포커스로 갱신되지 않는다 — 다른 탭의 로그아웃은 `storage` 이벤트로 받는다(§5-1) |
| 조작 화면 · viewer 쿼리 | `staleTime` 0 |
| 호스팅 센터(공연준비 홈 GH-1·GE-1부터) | 전역 기본값 그대로 — `staleTime` 0, 5xx·네트워크 1회 재시도, 포커스 재조회. 브라우저에서만(게이트가 세션을 확정한 뒤 화면이 마운트된다). 변경 뒤에는 목록 접두 키(`MY_HOSTS_KEY` `['me','hosts']`·`MY_EVENTS_KEY` `['me','events']`)를 무효화한다(P10a-L, 2026-10-26) |
| 무한 목록 | 서버에서 프리페치하지 않는다. `<Prefetch>`는 `queries`만 받는다 |
| 폼 | RHF `defaultValues`로 한 번만 초기화. 다시 온 쿼리가 편집 중인 값을 덮지 않는다 |

### 4-5. 에러 토스트

| 대상 | 규칙 |
|---|---|
| `QueryCache.onError` | `query.state.data !== undefined`일 때(배경 재조회 실패)만 토스트. 무한 목록의 다음 페이지 실패는 제외(하단 재시도가 맡는다, §12). 첫 로딩 실패는 `<AsyncBoundary>`나 공용 403·404 화면이 맡는다 |
| `MutationCache.onError` | `meta.handled`이거나 `meta.handledCodes`에 코드가 있으면 토스트하지 않는다. 그 밖은 `reason` 토스트 — 검증 실패(400 `BAD_REQUEST`, `isValidationError`)는 `reason`(필드 JSON·"Bad Request") 대신 고정 문구 `VALIDATION_ERROR_MESSAGE` |
| `meta.silent` 조회 | 배경 재조회가 실패해도 토스트하지 않는다(벨 GN-2처럼 사용자가 할 일이 없는 배경 조회, `src/api/query-client.ts` `shouldToastQueryError` 세 번째 인자 `meta`, §21) |
| `SessionLostError` | 어디서도 토스트하지 않는다. 경계·게이트도 무시한다(§5-1) |
| 중복 | 토스트에 고정 id를 준다(쿼리는 queryKey 해시, mutation은 코드). 배경 재조회가 한꺼번에 실패해도 하나만 뜬다 |

화면이 직접 처리하는 코드는 **`handleCodes` 헬퍼로 한 곳에 적는다.** 코드 목록과 처리 함수를 따로 쓰면 둘이 어긋날 때 에러가 아무 피드백 없이 삼켜진다.

```ts
// src/api/handle-codes.ts — 개념(tech-decisions §4, directory-structure)
export const handleCodes = (map: Record<string, (e: ApiError) => void>) => ({
  meta: { handledCodes: Object.keys(map) },
  onError: (e: unknown) => { const c = getErrorCode(e); if (c && map[c]) map[c](e as ApiError); },
});

useMutation({
  ...createOrderMutation(),
  ...handleCodes({
    Order_400_22: () => setFormError('입금자명을 확인해 주세요'),
    Order_400_23: () => setFormError('옵션 답변을 확인해 주세요'),
  }),
});
```

전역 `MutationCache.onError`는 화면의 `onError`보다 **먼저** 실행된다(TanStack `mutation.ts`). 그래서 처리할 코드를 `meta`에 미리 적어야 하고, 헬퍼가 그 목록을 처리 함수의 키에서 만든다.
---

## 5. API 클라이언트

`src/api/client.ts`에 ky 인스턴스·래퍼 해제·401 처리를 두고, `src/api/http.ts`가 그 위에 객체 둘을 연다.

| 객체 | 경로 | 기본 주소 |
|---|---|---|
| `api` | `/api/v2` | 브라우저는 `${location.origin}/api/v2`, 서버는 `API_INTERNAL_URL`(`http://localhost:8080/api/v2`, `/api/v2`로 끝나야 한다) |
| `authApi` | `/api/v1/auth` | 로그인 콜백, 재발급, 로그아웃, 탈퇴. 지금 쓰는 곳은 브라우저뿐이지만 서버 분기도 있다(`API_INTERNAL_URL`의 `/v2` → `/v1/auth`). **401 가로채기(재발급·재시도)가 없다** |

```ts
// 개념 — 훅(afterResponse)이 아니라 객체 안에서 처리한다(ky 2.x 훅 방식은 스파이크에서 실패, tech-decisions §22)
// 요약. 실제 코드는 src/api/http.ts · client.ts
const prefix = typeof window === 'undefined'
  ? (process.env.API_INTERNAL_URL || 'http://localhost:8080/api/v2')   // 요청마다 읽는다, /api/v2로 끝나야 한다
  : `${window.location.origin}/api/v2`;                                // ky의 Request가 절대 URL을 요구한다
let res;
try {
  res = await kyBase(path, { prefix, credentials: isPublic ? 'omit' : 'include', … });  // throwHttpErrors: false
} catch (e) {   // ky 에러 메시지에는 URL(토큰)이 들어 있다 → URL 없는 ApiError로
  if (isTimeoutError(e)) throw new ApiError(0, 'TIMEOUT', '', route);   // reason은 비우고 route(`GET gifts/:param`)는 따로
  if (isNetworkError(e)) throw new ApiError(0, 'NETWORK', '', route);
  throw e;
}
// 본문은 마감 시각 안에서 읽는다(끊김 NETWORK, 시간 초과 TIMEOUT)
// unwrap: JSON 파싱 실패 → NON_JSON, 래퍼 모양 아님 → BAD_ENVELOPE, 실패 응답 → ApiError(HTTP 상태, code, reason),
//         스키마 불일치 → 로그(라우트 패턴·issue 경로) 후 PARSE_ERROR
```

- 에러는 `ApiError{status, code, reason}`와 그 하위 클래스 `SessionLostError`(§5-1)다. `status`는 언제나 **HTTP 상태**다. 본문 `status`는 보지 않는다(#808 전에는 토큰 없음 401의 본문이 403이었다. 지금은 같지만 HTTP 상태 분기 원칙은 그대로, api-contract §1).
- **본문이 JSON이 아니면 `ApiError(res.status, 'NON_JSON', '')`**를 던진다. 래퍼 모양이 아니면 `BAD_ENVELOPE`, 스키마와 맞지 않으면 `PARSE_ERROR`(재시도하지 않는다 — 실제 코드는 `src/api/client.ts`). 백엔드 재기동 중 nginx가 돌려주는 HTML 502가 `SyntaxError`로 새면 "5xx만 재시도", "재발급 5xx = 일시 오류" 판정이 모두 깨진다. Vitest 대상(P3): HTML 502 → `ApiError{status: 502, code: 'NON_JSON'}`.
- ky 인스턴스(`client.ts`)는 기준 주소 없이 만든다. `http.ts`가 요청마다 `prefix`를 넘긴다(서버 판정은 `typeof window === 'undefined'`). 인스턴스를 만들 때 주소를 고정하면 "호출 시점에 읽는다"가 깨진다.
- 화면에서 코드를 꺼낼 때는 `getErrorCode(e: unknown): string | null`. 네트워크 오류·파싱 실패에서도 throw하지 않는다.
- **응답 enum은 `openEnum(name, values)` 한 가지로만 연다**(tech-decisions §4 zod 정책). 모르는 문자열은 `UNKNOWN`(enum 이름만 로그, 같은 이름은 한 번), 누락·비문자열은 `PARSE_ERROR`. 상태·타입을 화면으로 바꾸는 매핑에는 모두 `UNKNOWN` 분기를 둔다. `.or(z.string())`은 쓰지 않는다(타입이 `string`으로 합쳐져 완전성 검사를 잃는다).
- `src/api`는 리다이렉트도 토스트도 하지 않는다. 던지기만 한다.
- 서버 쪽 기본 주소는 호출 시점에 `process.env.API_INTERNAL_URL || 'http://localhost:8080/api/v2'`로 읽는다(모듈 최상위에서 읽지 않는다). 서버 전용 env 모듈이 없으므로 브라우저 번들에 서버 코드가 섞이지 않는다.

### 5-1. 401 처리

규칙의 정본은 [`tech-decisions.md`](./tech-decisions.md) §4 인증. 구현할 때 보는 요약이다.

**세션 표시 `dd:session`** — `localStorage`에 둔다. 로그인할 때마다 새로 만드는 무작위 값이다. 값이 있으면 "이 브라우저에 세션이 있었다", 값이 바뀌면 "다른 세션"이다. 로그인 성공 때 세우고, 세션 상실·로그아웃 때 지운다. 저장소 접근이 실패하면 값 없음으로 본다.

| 상황 | 처리 |
|---|---|
| `dd:session`이 없을 때의 401 | 재발급도 `onSessionLost`도 없이 `ApiError(401)`로 던진다. 익명 방문자가 재발급 요청을 만들지 않는다 |
| `dd:session`이 있을 때 보호 요청의 401(코드 무관) | 재발급을 한 번 시도 → 성공하면 원 요청 재시도 |
| 재발급 직렬화 | `navigator.locks.request('dudoong-auth-refresh', { signal: AbortSignal.timeout(15_000) }, …)`. 잠금 안에서 `dd:refreshedAt`이 원 요청을 보낸 시각보다 뒤면 다른 탭이 이미 갱신했으므로 재발급 없이 원 요청만 다시 보낸다. 아니면 `authApi`로 재발급을 부르고(타임아웃 10초), 성공하면 `dd:refreshedAt`을 기록한다. 잠금 대기가 abort되면 일시 오류 |
| 재발급 결과 | 2xx = 성공. **4xx = 세션 상실** — 401(코드 무관), 403(`AUTH_403_1`, 정지 계정 `USER_403_1`), `USER_404_1`, 400. 재시도하지 않는다(예전의 "낡은 액세스 쿠키 401이면 한 번 더"는 백엔드 #792로 재발급이 `permitAll` 익명이 돼 2026-10-25 지웠다, api-contract §9). 5xx·네트워크·타임아웃 = 일시 오류 — **재발급 응답의 에러**를 던지고 세션은 유지한다(5xx 재시도 규칙이 그대로 적용된다) |
| Web Locks가 없을 때 | 탭 안 single-flight만. 재발급이 403이어도 그 사이 `dd:refreshedAt`이 바뀌었으면(다른 탭이 먼저 갱신) 원 요청을 한 번 재시도한다 |
| 세션 쿼리(GM-1) | 결과는 셋이다. **세션** / **`null`**(`dd:session` 없음의 401, 또는 재발급이 세션 상실) / **throw**(GM-1의 5xx·네트워크, 재발급 일시 오류) |
| 로그인 게이트(`(protected)`·`hosting` 레이아웃) | pending = 스켈레톤. `null` = `/login?redirect=…`. error = children 대신 전체 화면 재시도(`AsyncBoundary`의 재시도 UI), **이동하지 않는다**. `/login/expired`로는 보내지 않는다 — 그건 `onSessionLost`만 한다 |
| 공개 GET(`{ public: true }`) | 항상 `credentials: 'omit'`. 401이 올 일이 없다 |
| `authApi` | 401 가로채기 없음. 잠금 안에서 재발급을 부르므로 같은 잠금을 다시 요청하는 교착이 없다 |
| 로그인 콜백 | 성공 → `dd:session`을 새 값으로 세우고 `location.assign(redirect)`(하드 이동 — 익명으로 캐시된 GM-1·viewer를 버린다). `USER_403_1` → "이용이 제한된 계정이에요". `AUTH_400_1`(OAuth `state` 불일치) → 로그인 다시 시작. 그 밖(401 포함) → 일반 실패(`failed`), 재시도 없음(예전의 401 "잠시 후 다시" 분기는 #792로 원인이 없어져 2026-10-25 지웠다) |
| 로그아웃 | 진행 중인 mutation이 있으면(`useIsMutating() > 0`) 버튼 비활성. 응답과 상관없이(5xx·네트워크 포함) `queryClient.clear()` → `dd:session` 제거 → 이동. 백엔드는 언제나 200 + 쿠키 삭제(#793) |

**세션 상실(`onSessionLost`)** — 모듈 플래그로 **한 번만** 실행한다. 동시에 실패한 401 N건은 모두 `SessionLostError`(`ApiError` 하위)로 끝난다. `QueryCache`/`MutationCache`의 `onError`, `<AsyncBoundary>`, 게이트는 이 에러를 무시한다(토스트·에러 화면 없이 fallback 유지, 곧 이동한다).

1. `queryClient.clear()`
2. `dd:session` 제거
3. 현재 위치에 따라 이동: `(protected)` 또는 `/hosting` 아래면 `location.assign('/login/expired?redirect=' + 현재경로)`, 그 밖(공개 화면·`/events`·`/login`)이면 `location.reload()` — 같은 주소에서 익명으로 다시 그린다

**다른 탭·뒤로가기**

- `window`의 `storage` 이벤트로 `dd:session`이 **사라지거나 값이 바뀌면** `queryClient.clear()` 후, 보호 영역이면 `location.assign('/login?redirect=…')`, 그 밖이면 `location.reload()`. 한 탭의 로그아웃·계정 전환이 다른 탭에 남은 이전 사용자 화면을 지운다.
- 루트에 `pageshow` 핸들러를 두고, `event.persisted`이면서 `dd:session` 값이 페이지 로드 때와 다르면 `location.reload()`. 값 비교라 "A 로그아웃 → B 로그인 → 뒤로가기로 A 화면 복원"도 잡는다.
- 이동은 `src/api`가 하지 않는다. `src/api`는 `setAuthHandlers({ refresh, onSessionLost })`로 주입받고, 등록은 `features/shared/auth`가 한다. 그래서 `src/api`가 `features`나 라우터를 import하지 않는다.
- `localStorage`는 Safari ITP에서 7일 미방문 시 지워질 수 있다. 그러면 리프레시 쿠키가 살아 있어도 조용한 재발급 대신 익명으로 시작한다. 지금 토큰 수명(기본 3600초)에서는 영향이 없다. [`backend-questions.md`](./backend-questions.md) B2의 답으로 수명이 길어지면 다시 본다.

### 5-2. 로그

서버 로그(`serverQuery`, 파싱 실패)에 남기는 경로는 `routePattern()`의 라우트 패턴이다(예: `GET gifts/:param`, 쿼리스트링은 버린다). 실제 토큰이 든 경로·쿼리를 남기지 않는다. 계좌번호·입금자명·토큰은 값으로도 넣지 않는다.

---

## 6. 오버레이 — `overlay-kit`

- 확인·시트·모달은 `overlay-kit` 하나로 연다. `window.confirm()`을 쓰지 않는다.
- **"확인 누르면 서버 호출 후 닫힘"은 `src/ui`의 `EasyOverlay`로 쓴다.** `onConfirm`(Promise)이 도는 동안 버튼을 잠그고, 성공하면 닫고, 실패하면 오버레이를 유지한다. 실패 토스트는 기본적으로 전역 토스트(§4-5)에 맡긴다. 문구를 화면이 따로 정해야 하는 코드만 `meta.handledCodes`에 넣고 화면이 처리한다. 1차 소비처는 P13a(승인·거절·취소·환불 완료)와 P8b(선물 보내기·회수·반환·거절).
- **뒤로가기는 열린 오버레이를 닫는다**(P2 사용자 결정). 시트·모달·팝업(`BottomSheet`·`Modal`·`Popup`·`ResponsiveOverlay`·`EasyOverlay`)은 `useCloseOnBack`으로 열 때 `window.history.pushState({ ...history.state, ddOverlay: id }, '', location.href)`로 항목을 하나 넣는다(주소는 그대로, Next의 `__NA` 등 기존 state 보존). 뒤로가기(popstate)로 표시가 빠지면 닫히고, UI로 닫으면(버튼·Esc·바깥·스와이프) 내 항목이 맨 위일 때 `history.back()`으로 소비한다. 겹친 오버레이는 맨 위 것만 닫힌다. 토스트·팝오버·툴팁·메뉴는 해당 없다. 실제 Next 16 dev 서버에서 RSC 재요청 0건을 확인했다.
  - `EasyOverlay`의 `onConfirm`이 도는 동안 뒤로가기는 무시한다(항목을 다시 넣는다). 요청은 이미 갔으니 결과를 보여 준다. 성공하면 항목을 소비한 뒤 resolve하므로 호출한 쪽이 `await` 뒤에 `router.push`해도 엇갈리지 않는다.
  - **오버레이 안에서 다른 경로로 갈 때는 `router.replace`·`<Link replace>`를 쓴다.** push하면 기록이 [A, A+오버레이, B]가 되어 B에서 뒤로가기를 두 번 눌러야 A로 간다.
  - 남는 경우: 오버레이가 열린 채 새로고침하면 뒤로가기가 한 번 헛돈다. 위에 다른 오버레이가 있는 채 아래 것을 UI로 닫으면 그 항목이 남는다. 둘 다 드물어 두었다.
- **URL로 여는 오버레이는 `overlay.open`을 쓰지 않는다.** 예매자 관리의 `?order={orderUuid}`처럼 주소가 원본인 것은 페이지가 쿼리 값을 보고 선언적으로 렌더한다. 위 규칙과 맞춰 **열 때는 `pushState`(파라미터를 더한 주소, state에 `ddOverlay` 표시), 닫을 때는 표시가 있으면 `router.back()`, 없으면(주소로 바로 들어온 경우) `router.replace`로 그 파라미터만 지운다.** 다른 쿼리(`?tab=`)는 남긴다. Next 라우터와 `useSearchParams`가 `pushState`를 따라간다. **P13a-L 구현(`useGuestsUrlState`)**: 열기 `pushState({ ddOverlay: 'guests-order' }, '', ?order=…)` — 첫 인자에 Next state(`__NA`)를 펼치지 않는다(Next가 내부 값을 덧붙이고 `useSearchParams`를 갱신한다, `app-router.js` `copyNextJsInternalHistoryState`). 닫기는 표시가 맨 위면 `router.back()`, 없으면 `router.replace` 대신 같은 결과의 얕은 `replaceState(null, …)`(§13 — 서버 왕복 없음). 상세에서 다른 주문을 열면 항목을 더 쌓지 않는다(`replaceState`). 탭(`?tab=`)도 얕은 교체이고 탭을 바꾸면 `order`를 지운다.
- 경로가 바뀌면 `overlay.unmountAll()`을 호출한다. 이 감시는 루트 `Providers`의 children을 감싸지 않는 말단 컴포넌트 `<OverlayRouteReset />`이 하고, 형제 위치의 `<Suspense fallback={null}>` 안에 둔다. 이 파일과 `providers.tsx`는 `src/app`에 두는 루트 셸 클라이언트 파일이다(라우트 파일이 아닌 예외 둘, tech-decisions §8).
- **`usePathname`·`useSearchParams`를 쓰는 컴포넌트는 children을 감싸지 않는 말단으로 두고 자체 `<Suspense fallback={null}>`로 감싼다.** Cache Components에서 이 훅은 `generateStaticParams`가 없는 동적 경로에서 suspend하고, Suspense가 없으면 빌드가 실패한다. children을 감싸는 위치에 Suspense를 두면 `(public)` 서버 조회 라우트 위에 경계가 생겨 404 상태 코드가 깨진다(tech-decisions §2).

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
| 공개 GET은 `{ public: true }`로 쿠키 없이 보낸다(§5-1) | 공개 값은 원래 익명 값이다 — 서버 조회와 같은 값을 한 키로 쓴다. (처음 근거였던 "공개 GET도 만료·잘못된 토큰이 붙으면 401"은 백엔드 #792로 없어졌다.) 사용자별 값(연락처 원문 등)은 쿠키를 싣는 viewer 쿼리로 따로 읽는다(§4-2) |
| 클라이언트 조회의 403·404는 공용 화면으로 보낸다 | 403 = "권한이 없어요"(호스팅 센터의 다른 호스트 공연 등), 404 = "찾을 수 없어요"(남의 주문 등). 서버 조회의 404는 `notFound()`(§14). 예외: 모달 안의 조회(예매자 관리 `?order=`·발급 티켓 상세) 404는 모달을 닫고 목록을 다시 읽는다(§24 P13a) |
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

- 카드형 목록(공연 리스트, 호스트 공연(GH-14 — 브라우저에서만, §4-2), 알림함, 주문내역 G11/O-2, 관심 호스트 GM-4, 아카이빙 GM-5, 공연준비 홈 GH-1·GE-1, 선물 내역 GG-7)은 무한 스크롤 + 하단 sentinel. GG-7의 `direction`(`SENT`|`RECEIVED`)은 기본값이 없는 필수 파라미터다. 추가 로딩 실패는 기존 행을 지우지 않고 하단 재시도. 이 실패는 전역 토스트를 띄우지 않는다(§4-5).
- 운영 표(주문 · 발급 티켓 · 환불)는 `DataTable` + 페이지 번호 + `placeholderData: keepPreviousData`.
- 알림함(GN-1)은 `totalElements`가 `null`이다. 건수를 쓰는 UI를 만들지 않는다.
- 페이지 방식이라 스크롤 도중 새 항목이 끼면 중복이 생길 수 있다. 렌더 전에 id로 중복을 제거한다.
- 필터가 바뀌면 새 queryKey의 첫 페이지부터 읽는다.
- `(public)`의 무한 목록(호스트 홈 GH-14)은 서버에서 프리페치하지 않는다. 브라우저에서 `useInfiniteQuery`로 첫 페이지부터 읽는다. 키는 비멤버 `['hosts', id, 'events', 'infinite', params]`, 멤버 `['hosts', id, 'events', 'viewer', 'infinite', params]`(§4-2).

## 13. P5a — 태그 필터와 검색

**확정**: 드롭다운 1개 안에 4분류(`EVENT_TYPE` · `GENRE` · `AREA` · `TEAM`), 다중선택 칩, 초기화(`128:859`). 태그는 GE-11이 분류별로 묶어 준다. 서버 의미는 같은 분류 OR / 분류끼리 AND, `keyword`는 공연명 OR 호스트명, 지난공연은 `includePast`.

- 적용 필터는 **URL 쿼리**(`?keyword=&tagIds=1,2&includePast=true`), 드롭다운 열림은 로컬 상태.
- 칩 클릭 즉시 적용 + shallow `replace`. 적용 버튼은 Figma에 없다.
- shallow 교체는 `window.history.replaceState(null, '', url)`로 한다(Next의 Native History API). **첫 인자는 `null`** — `history.state`(Next 내부 `__NA` 포함)를 넘기면 `useSearchParams`가 갱신되지 않는다(P5a-L e2e에서 확인).
- `tagIds`는 정렬·중복 제거 후 queryKey에 넣는다(순서만 다른 캐시를 만들지 않는다).
- 없는 태그 id로 `Event_400_23`이 오면 GE-11을 다시 받아 **태그 필터만** 비운다(검색어·지난공연은 둔다).
- 검색어는 50자에서 입력을 막는다. debounce 후 URL 반영.
- "공연임박순"은 드롭다운이 아니라 고정 라벨이다. 서버 정렬값이 `UPCOMING` 하나뿐이다(티켓탭도 같다).

## 14. P5b — 공연 상세: 서버 조회 · 섹션 · 공유

- 서버에서는 GP-3 + GE-5만 조회한다. 티켓 잔여(GP-5)는 브라우저가 따로 조회한다.
- 라우트 파일이 `<Prefetch queries={[eventDetailQuery(id), eventSectionsQuery(id)]}>`로 조회하고, 화면은 `useSuspenseQuery`로 같은 쿼리를 읽는다. 서버 캐시는 없다 — 요청마다 백엔드를 부른다. 서버에서는 토큰이 붙지 않는다. `export const instant = false`는 `(public)/layout.tsx`와 각 `page.tsx`에 둔다(tech-decisions §2).
- 404(준비중·삭제·없음)는 `serverQuery`가 `notFound()`로 바꾼다. 이 라우트 위에 `<Suspense>`나 `loading.tsx`를 두지 않는다(경계 안에서 불리면 200이 된다). 5xx는 throw해서 `error.tsx`로 보낸다.
- `generateMetadata`도 `serverQuery(eventDetailQuery(id))`를 쓴다(요청당 QueryClient가 같아 조회는 한 번).
- **섹션 탭**: 서버 섹션이 있으면 그대로, 없으면 기본 4탭 라벨을 프론트가 그리고 빈 상태를 보여 준다.
- **섹션 뷰어**(`features/shared/section-viewer`): `contentFormat`으로 렌더러를 고른다(`HTML` → sanitize 후 렌더 / `MARKDOWN` → 마크다운 렌더 후 같은 sanitize). 클라이언트 컴포넌트다(`isomorphic-dompurify`는 서버 렌더와 브라우저 양쪽에서 돈다). 미리보기가 같은 컴포넌트를 쓴다.
- 문의처는 GP-3이 준다(공연 문의처, 없으면 호스트 연락처). 연락처 `type` 6종 → 아이콘·링크 매핑은 한 곳에서(`contact-link.ts`).
- **문의처는 사용자별 값이다**(백엔드 #846): 서버 조회(익명) 값은 전화·이메일이 가려져 있다. 연락처 시트는 `useEventContacts(eventId, {open})`로 읽는다 — 로그인 사용자는 시트를 열 때 `eventDetailViewerQuery`(쿠키)로 원문, 익명은 가린 값(§4-2). 가린 값은 링크로 만들지 않는다. 비로그인에게 가린 값을 그대로 보일지 "로그인하면 볼 수 있어요" 안내를 둘지는 design-requests Q41.
- **약관 표시 의무 — v2 계획에 위치 없음(위험)**: 2026-10-25 시행 약관은 공연 상세에 중개자 고지(제3조③)와 두둥티켓 호스트 환불 기준 우선 안내(제19조③)를 표시한다고 약속한다. v2 계획(P5b)에는 그 자리가 없다(계획은 바꾸지 않았다). v1 운영 문구·위치(참고)는 [`legal-copy.md`](./legal-copy.md) A-1·A-2 — 넣게 되면 V 착수 때 약관 원문과 대조한다.
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
- 묶음 카드에 상태별 개수 `counts`를 배지로 그린다("승인완료 ③", `455:8958` — 2026-10-25에 두 번째 배지 "선물 대기중 ❶"은 지워졌다).
- 목록에는 `canGift`·`canReturn`이 없다. 버튼은 카드를 눌러 연 G11/T-2로 판단한다. **G11/T-2는 카드를 눌러 상세·QR을 열 때만 조회한다. 캐러셀에 보이는 카드마다 미리 읽지 않는다** — T-2를 읽으면 서버가 그 주문의 승인 알림을 읽음 처리해서, 미리 읽으면 티켓탭 진입만으로 공지 바가 풀린다(기획서: 진입만으로는 풀리지 않는다). [선물하기]·[선물 반환]은 상세 화면에 둔다.
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
- **QR 값 갱신**: T-2는 `staleTime` 0이라 다시 열거나 창에 돌아오면 다시 읽는다. 수락·반환·회수 뒤에는 `['me','tickets']` 전체를 무효화한다. 404면 목록을 다시 읽는다(P8-L `useTicketDetail`).
- 웹에서 화면 밝기 강제·스크린샷 차단은 할 수 없다. `navigator.wakeLock`은 QR 표시 중 선택적으로만 쓴다.
- QR 값이 고정 uuid라 스크린샷이 유출되면 타인이 입장할 수 있다. 서버가 중복 입장을 막고(`ALREADY_ENTERED`), 선물 수락 시 옛 값이 무효가 되는 것이 방어선이다.

## 18. P8b — 선물

상태와 규칙은 tech-decisions §20.

- **버튼 노출은 G11/T-2 플래그로만**: [선물하기] = `canGift`, [선물 반환] = `canReturn`. 목록(G11/T-1)에는 이 값이 없다.
- `viewState` 7종을 한 매핑으로 화면·버튼에 연결한다. Figma에 없는 4종(ALREADY_ACCEPTED · RETURNED · OWN_LINK · EXPIRED)은 문구만 백엔드 문서에 있다(2026-10-25 — CANCELED는 `696:17551`, 거절 완료는 `696:17608`이 생겼다, design-requests §1).
  - `viewState`와 `isReceiver`는 사용자에 따라 달라 viewer 쿼리로 읽는다(§4-2). 확정 전에는 수락·거절 버튼을 비활성으로 둔다.
  - `OWN_LINK`(보낸 본인): [선물 취소]로 안내한다.
  - `EXPIRED`: 보낸 사람이면(GG-3 `giftId`가 있음) [회수] 버튼을 둔다(DG-2).
- 보내기·회수·반환·거절 확인은 `EasyOverlay`. `onConfirm`의 mutation이 끝날 때까지 버튼을 잠근다. 거절 확인은 바텀시트 `128:1831`([선물 돌려주기] 한 버튼 — 2026-10-25 팝업에서 바뀜).
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
- 셀프 체크인(PQ-5)은 OPEN 공연이면 시작 전에도 된다. 공연이 끝난 뒤(정산중·지난 공연) 관객이 QR을 찍으면 `Event_400_5`다 — "공연이 끝나 셀프 체크인을 할 수 없어요. 호스트에게 티켓 QR을 보여 주세요"로 안내한다.

## 20. P9 — 주문상세 · 취소 · 환불 계좌

- 버튼 노출은 서버 플래그로만: 주문취소 = `canCancel`, 환불 계좌 입구 = `canEditRefundAccount`, 입력 유도 = `refundAccountRequired`.
- **선물 때문에 취소할 수 없을 때의 안내**: 아래 조건이 모두 맞을 때만 [주문취소] 자리에 "선물을 먼저 취소하거나 돌려받아 주세요"를 보인다. 이 경우 버튼이 처음부터 숨어 `Order_400_24`가 오지 않으므로, 안내가 없으면 사용자가 이유를 알 수 없다.

  ```ts
  const giftBlocksCancel =
    !order.canCancel &&
    order.status === 'APPROVED' &&
    order.event?.displayStatus === 'UPCOMING' &&                 // OPEN이고 시작 전(cancelBlocker의 앞 단계 통과)
    !order.issuedTickets.some(t => t.entrance === 'DONE') &&     // 입장한 티켓이 있으면 선물을 정리해도 못 취소한다
    order.issuedTickets.some(t => (t.giftState === 'PENDING' || t.giftState === 'SENT') && t.entrance !== 'CANCELED');
  ```

  조건을 좁힌 이유: 백엔드 `cancelBlocker`는 PG 결제 → 취소 가능 상태 → 공연 OPEN(`Event_400_5`) → 시작 전(`Order_400_9`) 순으로 먼저 막고, 그다음에야 차단 티켓(입장 완료 · 다른 사람 소유 · 선물 대기)을 본다. 또 `giftState`는 선물이 수락된 뒤 주문이 취소돼도 `SENT`로 남는다. `giftState`만 보면 공연 시작 후·호스트 취소 주문·입장 티켓이 섞인 주문에도 선물 안내가 잘못 뜬다.
- 사용자 주문 상태 5종 × `refundStatus` 3종을 한 매핑에서 라벨로 바꾼다.
- 유료 취소는 환불 계좌 시트가 필수(`Order_400_25`), 무료는 확인만.
- 본인 환불 계좌는 `maskedAccountNumber`로만 온다. 수정 화면은 전체를 다시 입력받는다.
- 환불 계좌 폼 제한: 은행명 20자, 예금주 20자, 계좌번호 30자(숫자·하이픈·공백, `^[0-9][0-9 -]*[0-9]$`). 티켓 계좌(30/30/50)와 다르다(api-contract §4).
- 입금 미확인 거절(`DEPOSIT_UNCONFIRMED`)은 `refundAccountRequired=false`라 입력을 유도하지 않는다. 입구(`canEditRefundAccount`)는 그대로 둔다.
- 거절 사유: `reasonType`별 고정 문구는 프론트가 가진다. `ETC`만 호스트가 쓴 `reasonText`.
- 옵션 표시: `lines`가 1개면 "모든 티켓에 같은 옵션", 여러 개면 티켓별. 선물 상태는 `issuedTickets[]`에서 읽는다.
- 호스트 문의 시트는 주문상세에 연락처가 없어 GP-3을 따로 부른다. 공개 키로 부르면 가린 값이다(#846). 시트 컴포넌트는 공연 상세(P5b)와 같은 것을 쓴다. 공연 상세의 `useEventContacts`는 서버 프리페치를 전제로 공개 GP-3을 `useSuspenseQuery`로 늘 읽어 주문상세에는 쓰지 않는다 — **viewer만 읽기로 정함(`useOrderHostContacts` — 보호 화면이라 세션 확정 뒤, 열 때 쿠키 GP-3 한 번)**: 쿠키를 싣는 `eventDetailViewerQuery`를 `open && 세션 있음`일 때만 `useQuery`로 읽고, 공개 GP-3(`eventDetailQuery`)은 부르지 않는다. 상태 판정은 공연 상세·호스트 홈과 같은 `resolveContacts`(공개 값 자리는 빈 목록). 삭제된 공연(`eventId` null)이면 요청하지 않고 `available: false`(P9-L, 2026-10-25).
- 환불 계좌 폼의 은행은 `GET /api/v2/banks`(공개, #804·#813) 목록에서 고르고 `bankCode`를 보낸다(`bankName`은 생략 가능 — 서버가 채운다). 응답 계좌의 `bankCode`가 `null`이면(옛 자유 입력 값) 수정 폼은 목록에서 다시 고르게 한다.

## 21. P9b · P10a — 알림

벨·알림함·읽음은 P9b-L이 먼저 만들었다(S7, 2026-10-25). 코드 `src/api/notification`, `features/shared/notification/model`.

- **쿼리 키**: 모두 `['me','notifications', …]` 아래 — 벨 `['me','notifications','unread-count']`, 알림함 `['me','notifications','infinite',{size}]`(접두 `NOTIFICATIONS_INFINITE_KEY`). 접두 `NOTIFICATIONS_KEY`는 `src/api/notification/queries.ts`에 정의됐다. 선물·티켓 변경이 이 접두로 미리 무효화를 걸어 두었다(`features/audience/gift/model/gift-cache.ts`의 `NOTIFICATIONS_KEY`, P8-L — 값이 같은 상수가 두 곳에 있다, implementation-log P9b-L).
- **벨**(`useNotificationBell`): GN-2 `{count}`. 세션이 있을 때만 부르고, `count > 0`이면 빨간 점(숫자는 그리지 않는다). 확정 전·실패면 점 없음(벨은 화면을 막지 않는다). 창 포커스로 재조회, 메뉴·드로어 진입은 `refresh()`. 벨 조회는 `meta.silent`라 배경 재조회가 실패해도 전역 토스트를 띄우지 않는다(§4-5).
- **알림함**(`useNotificationInbox`): GN-1 무한 스크롤(Slice — 건수 없이 `hasNext`로 끝). 항목 `{notificationId, type, title, body, target{type, targetId, eventId}, extra, isRead, createdAt}`. `extra` 값은 nullable(`string | null` — 서버가 null 사유를 그대로 직렬화).
- **읽음**(`useReadNotifications`): PN-3 `{notificationIds: [id]}` 또는 `{readAll: true}`. 응답 `{updatedCount, unreadCount}`로 벨 캐시를 바로 갱신한다 — 낙관적 차감을 추정으로 하지 않는다. 읽음 요청은 같은 `scope`(`notifications-read`)로 묶어 순서대로 보낸다 — 나중 응답의 `unreadCount`가 언제나 더 최신이다. 캐시 반영은 `useMutation` 옵션(`onMutate`·`onError`·`onSuccess`)에 둔다 — 알림을 누르고 바로 화면을 떠나도(언마운트) 벨·공지 바가 갱신된다. 이미 읽은 알림은 PN-3을 보내지 않는다.
- 행의 읽음 표시는 낙관적으로 바꾸고 실패하면 이 요청이 바꾼 행만 되돌린다(벨은 그대로).
- 승인 알림(`ORDER_APPROVED`)을 읽었거나 모두 읽음이면 티켓탭 공지 바(T-3)를 다시 읽는다. 다른 알림은 T-3을 다시 읽지 않는다.
- **타입 매핑**: 17종(#810으로 `EVENT_REMINDER_D1`·`EVENT_STARTING_SOON` 추가) → 카테고리 3종(티켓선물 안내 / 티켓승인 안내 / 공연 알림)·아이콘은 한 매핑에서(`notification-kind.ts`). 멤버 추가 → 공연 알림, 주문·환불·취소 → 티켓승인 안내, `GIFT_TICKET_CANCELED` → 티켓선물 안내. 모르는 타입은 `OTHER`(기본 아이콘, 카테고리 이름 없음) + `title`·`body` 그대로.
- **이동**(`notificationHref`, Q1 기본안 + #810): `HOST` → `/hosts/{hostId}`, `GIFT` → `/tickets`, `EVENT` → `/events/{eventId}`(eventId가 null이면 `targetId`로 공연 상세), `ORDER` → 관객이 받은 알림은 `/orders/{orderUuid}`, 호스트가 받은 주문 알림 4종(`ORDER_PENDING_APPROVE`·`ORDER_REFUND_REQUESTED`·`ORDER_CANCELED_BY_USER`·`REFUND_ACCOUNT_CHANGED`)은 `/hosting/events/{eventId}/guests?order={uuid}`(eventId가 null이면 이동 없음). 모르는 타입 + `ORDER` 대상은 받는 사람을 몰라 이동 없음, 모르는 `target.type`도 이동 없음(읽음 처리만). 경로 값은 인코딩한다.
- 본문은 서버가 만든 문자열이다. HTML로 넣지 않는다.
- 알림은 커밋 후 비동기 저장이라 mutation 직후 목록에 없을 수 있다. mutation 성공 직후의 알림 재조회에 기대지 않는다.
- 관객 화면과 호스팅 센터가 같은 알림함을 쓴다. 쿼리는 `src/api/notification`, 벨·알림함·타입 매핑은 `features/shared/notification`.
- **셸 메뉴의 벨**(P4s-L): 햄버거·드로어·아바타 드롭다운은 벨을 따로 부르지 않고 `useShellMenu`(`features/shared/shell/model`)의 `hasUnread`·`refreshBell`을 쓴다(안에서 `useNotificationBell`). 미로그인 벨은 그리되 GN-2를 부르지 않고 `/login?redirect=%2Fmypage%2Fnotifications`로 간다(Q16). 메뉴 항목 주소는 `shellLink`가 정한다 — 화면이 `loginHref`를 직접 조립하지 않는다. 문구는 "공연준비"/"공연 준비"이고 "호스팅 센터"는 쓰지 않는다(라우트 `/hosting` 그대로)

## 22. 호스팅 센터 — 권한별 화면

- `myRole`(GH-1 · GH-3 · GE-1 · GE-3)로 화면 모드를 정한다: 매니저 이상 = 편집, 일반 멤버 = 읽기 전용.
- 권한 판정은 한 곳(`can(role, action)`)에 두고 화면에서 역할 문자열을 직접 비교하지 않는다. 표는 api-contract §2.
- 공연 만들기의 호스트 선택에서 내가 일반 멤버인 호스트는 비활성으로 둔다.
- 매니저의 멤버 초대는 역할 선택지를 "일반"으로 고정한다. 마스터 행에는 메뉴를 두지 않는다. 매니저는 일반 멤버만 지운다 — 매니저 역할을 다루는 일은 `can(role, 'manageManagers')`(마스터, P10b-L). 내 행은 이 규칙만으로 늘 메뉴가 없다(백엔드도 본인 삭제를 막는다).
- 호스트 설정에 일반 멤버가 주소로 들어오면 403이 아니라 읽기 전용으로 그린다(관리 화면 조회는 일반 멤버 읽기 전용 — api-contract §2, design-requests Q53). 비멤버는 공개 GH-3 viewer가 200 + `myRole: null`이라 `hostingAccessOfRole`로 403.
- 멤버 변경 응답은 전부 "변경 후 멤버 전체 목록"이다. 그대로 캐시에 넣는다(`applyMembers`). 초대·삭제는 멤버 수가 바뀌어 GH-3 공개·viewer 두 키를 정확히(`exact`) 무효화한다.
- 호스트 설정(PH-4) 응답은 GH-3과 같은 모양(요청자 기준 `myRole`·원문 연락처, `V2UpdateHostUseCase` @432cce4)이라 viewer 키에 넣고, 공개 GH-3·GH-1·GE-1·GM-1을 무효화한다(`applyUpdatedHost`).
- **마스터 양도 뒤에는 `myRole`을 주는 쿼리를 무효화한다**(GH-1, GH-3 viewer, GE-1, GE-3 + GM-1 `hosts[].myRole` — `invalidateMyRoleQueries`). GE-3은 P11 전이라 키 모양 `['events', id, 'manage']` 전체를 술어(`isEventManageQueryKey`)로 무효화한다 — P11의 `eventManageQuery`는 이 모양을 지킨다. 양도하면 내가 매니저가 되므로 화면 모드가 바뀌어야 한다. 역할 변경(PH-10)은 다른 멤버의 역할이라 내 `myRole`이 바뀌지 않는다 — 응답(멤버 목록)만 캐시에 넣는다.
- **공연 스코프(P11-L)**: `/hosting/events/[eventId]/layout.tsx`가 GE-3(`eventManageQuery`, 키 `['events', id, 'manage']`)으로 메뉴(등록 전 4 / 등록 후 6)·읽기 전용(일반 멤버 `role` / 정산중·지난 공연 `ended` — `readOnlyReasonOf`)·티켓 여부 잠금(준비중이 아니면)을 정한다. 체크리스트 GE-7(`['events', id, 'manage', 'checklist']`)·편집용 GE-5(쿠키, `['events', id, 'manage', 'sections']`)도 이 키 아래라 양도 뒤 술어 무효화에 함께 걸린다. 비멤버는 GE-3 403 → `HostingAccessRejected`. 공연 삭제는 준비중 + 매니저 이상만(`canDeleteEvent` — 공연준비 홈 카드 `canDelete`).
- 멤버 목록(GH-6)에는 이메일이 없다.
- **일반 멤버(GUEST) 개인정보**(#846): 주문·발급 티켓의 구매자 연락처·이메일·입금자명은 가린 값으로 온다 — 받은 값을 그대로 그린다. 연락처·입금자명 검색은 완전 일치만 되므로 일반 멤버의 검색 칸에 "전체를 정확히 입력해 주세요" 류 안내를 둔다. 엑셀 버튼은 매니저 이상에게만 보인다(권한 판정 한 곳에서, 일반 멤버는 403).
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
- **티켓·옵션 변경 뒤(P12-L)**: 티켓 응답(T-2·T-3·T-5·T-6·O-5)은 T-1 목록 키(`['events', id, 'manage', 'ticket-items']`)에, T-4·O-4 응답(남은 목록)은 통째로 넣는다. 관객 GP-5(`['events', id, 'ticket-items']`)는 티켓·옵션이 바뀌면 정확히 무효화한다(판매 중단 → 재개가 공연 상세에 바로). 만들기·삭제 뒤 체크리스트 ③ 때문에 GE-7·GE-3을 무효화한다. 옵션 풀(`…, 'manage', 'options']`)의 붙은 티켓·잠김은 티켓 쪽 변경 뒤, 티켓의 붙은 옵션 이름·추가금은 옵션 변경 뒤 다시 읽는다(`ticket-cache.ts`).
- **옵션 응답 형식은 만든 뒤 바꿀 수 없다.** 수정 요청(P10/O-3)에 `type` 필드가 없다. Figma 수정 화면(`424:10517`)은 형식 버튼이 편집 가능하게 그려져 있지만 수정 화면에서는 읽기 전용으로 그린다.
- 옵션 삭제(D10/O-4)의 입구가 Figma 옵션 상세(`424:10455`)에 없다. 디자인이 오기 전까지 상세 모달 하단에 [삭제]를 둔다(잠긴 옵션이면 숨김).
- **공연 등록(PE-8) 뒤**: 응답이 `{eventId, status, displayStatus}`뿐이라 `setQueryData`로 화면을 채울 수 없다. GE-3(사이드메뉴 항목)·GE-1(공연준비 홈)을 무효화하고(등록 뒤에는 체크리스트를 그리지 않으므로 GE-7은 무효화하지 않는다), 대시보드를 등록 후 모드(GD-1)로 바꾼 뒤 "공연이 등록되었습니다." 토스트(`424:11427`). 등록 후 통계는 GD-1(P13a-L — `useEventDashboard`의 `stats`, `dashboard-stats.ts`).
- **기본 정보·섹션 저장 뒤(P11-L)**: PE-4 응답(GE-3 모양)은 GE-3 키에, PE-6 응답(섹션 목록)은 편집용 GE-5 키에 넣는다. 체크리스트 ①②가 바뀌므로 GE-7을, 카드 값이 바뀌므로 GE-1(PE-4)·GE-3(PE-6 — `checklist`)을, 관객 공연 상세가 바로 반영되도록 GP-3 공개·viewer·GE-5 공개 키를 정확히(`exact`) 무효화한다(`event-cache.ts`). 등록된 공연이면 `savedNotice: 'registeredChanged'`(안내 팝업은 V).
- **일정 칸(P11-L)**: 날짜 1칸 + 시작·종료 시각(`YYYY-MM-DD`·`HH:mm`). 종료 ≤ 시작이면 종료를 다음 날로 보낸다. 간편 만들기와 등록된 공연의 시작 변경은 지금 이후만(`@Future`·`Event_400_24`). 바꾸지 않은 일정은 보내지 않는다(하루를 넘는 v1 공연의 일정이 단일 날짜 모델로 바뀌지 않게).
- 체크리스트를 다 채운 순간(`canOpen`이 `true`가 된 직후) "등록 준비 완료" 모달(`424:11318`)을 한 번 띄운다. [등록하기]는 같은 확인 팝업(`424:9837`) → PE-8로 이어진다.
- 미저장 이탈: 변경이 있으면 메뉴 이동·뒤로가기에서 확인(`503:22904`).
- 승인 실패(PR-3): 에러를 보여 주고 주문은 승인 대기로 남는다는 것과 거절로 정리하는 길을 함께 안내한다. 코드별 문구는 §24 P13a 행.
- 엑셀: 응답이 래퍼 없는 xlsx다. blob으로 받아 저장한다. JSON 파서를 태우지 않는다.
- **주문 처리 뒤(P13a-L)**: PR-3·PR-4·PR-5·PF-2 응답(처리 뒤 주문 상세)은 GR-2 키(`['events', id, 'manage', 'orders', 'detail', uuid]`)에 넣고, GR-1 목록(`…, 'orders', 'list', …]` — 상태 탭 `counts`)·GF-1(`…, 'refunds']`)·GI-1·GI-2(`…, 'issued-tickets']`)·GD-1(`…, 'dashboard']`)을 무효화한다. 승인·승인 후 취소는 재고가 바뀌므로 T-1·관객 GP-5도 정확히 무효화한다(`guest-cache.ts`). 모두 GE-3 아래 키라 마스터 양도 뒤 술어 무효화에 걸린다(역할이 바뀌면 가림·계좌 노출도 바뀐다). 처리에 실패해 "다시 읽기"가 필요한 코드는 GR-2를 `exact`로 + 목록, 공연 상태가 원인이면 GE-3도.
- 엑셀 저장은 `src/utils/download.ts` `saveBlob`(파일 이름은 `Content-Disposition`, 없으면 `orders-{id}.xlsx`·`issued-tickets-{id}.xlsx`).

## 24. 화면별 에러 처리

백엔드 통합 기획서 각 장의 "에러와 예외 처리" 표에서 화면이 따로 처리해야 하는 코드만 모았다. 코드 전체는 [`error-codes.md`](./error-codes.md), 공통 규칙(403·404·"이미 처리됨")은 §11. 여기 없는 400은 `reason`을 토스트로 보여 준다(검증 실패 400 `BAD_REQUEST`만 고정 문구 — `src/api/query-client.ts` `messageOf`).

| Phase | 화면 | 코드 | 처리 |
|---|---|---|---|
| P4b | 로그인 콜백 | `USER_403_1` | 정지 계정. "이용이 제한된 계정이에요" 안내(재발급에서 오면 세션 상실, §5-1). 탈퇴한 사람은 이 코드가 아니라 가입 흐름(`canRegister=true`)으로 간다 |
| P4b | 로그인 콜백 | `AUTH_400_1` | OAuth `state` 불일치. 로그인을 처음부터 다시 시작. 값 누락·쿠키 만료(10분)는 지금 통과하고 #776(state 필수)부터 이 코드가 된다 |
| 공통 | 변경 요청 | `AUTH_403_3` | 허용되지 않은 출처. 백엔드가 enforce를 켜야 나고, 같은 출처 fetch는 Origin을 보내므로 정상 흐름에서는 생기지 않는다. 오면 일반 403 화면 |
| P5a | 공연 리스트 | `Event_400_23` | 없는 태그. GE-11을 다시 받아 필터 초기화(§13) |
| P7 | 체크아웃 | `Event_400_5` · `Event_400_6` | 오픈 전·시작 후. 구매 버튼 비활성 + 상세로 돌려보냄 |
| P7 | 체크아웃 | `Order_400_15` | 승인형 1인 제한(승인 대기 포함). "이미 신청한 주문이 승인될 때까지 기다려 주세요" + 수량 줄이기 |
| P7 | 체크아웃 | `Ticket_Item_400_6` | 1인 제한(발급 기준). 안내 + 수량 줄이기 |
| P7 | 체크아웃 | `Ticket_Item_400_1` | 재고 부족(승인 대기 포함). GP-5를 다시 읽어 잔여·상한 갱신 |
| P7 | 체크아웃 | `Ticket_Item_400_10` · 404 `Ticket_Item_404_1` · `Event_404_1` | 판매 중이 아님 · 다른 공연 티켓 · 비공개 공연. 티켓 선택으로 돌려보냄 |
| P7 | 체크아웃 | `Order_400_22` | 입금자명 오류. 입금자명은 닉네임 고정 표시라 사용자가 칸에서 고칠 수 없다 — 폼 상단 오류 + "프로필에서 닉네임을 확인해 주세요" |
| P7 | 체크아웃 | `Order_400_23` | 옵션 답변 오류. 폼 상단 표시(tech-decisions §18) |
| P7 | 체크아웃 | `Order_400_26` | 같은 무료 선착순 주문 처리 중. "잠시 후 주문내역을 확인해 주세요" + `/orders`로 이동 |
| P8 | 티켓 상세 | `IssuedTicket_404_1` | 선물로 넘어갔거나 uuid가 바뀜. 티켓탭 목록 다시 읽기(§17) |
| P8b | 선물 보내기 | `Gift_400_1` | `canGift`로 버튼을 미리 숨긴다. 오면 G11/T-2 다시 읽기 |
| P8b | 선물 보내기 | `Gift_400_2` | 이미 선물 중. 기존 링크 화면(§18) |
| P8b | 선물 랜딩 | `Gift_400_4` · `Gift_400_5` | 각각 `OWN_LINK` · `EXPIRED` 화면으로. GG-3을 다시 읽는다 |
| P8b | 선물 랜딩 | `Gift_400_6` | 원 주문·티켓이 정상 아님(방어용). GG-3을 먼저 다시 읽고, 그래도 대기면 `CANCELED`와 같은 화면 |
| P8b | 수락·거절·회수·메모 | `Gift_400_3` | 이미 처리된 선물(동시 수락, 보낸 사람 회수와 경합). 받는 쪽은 GG-3, 보낸 쪽은 G11/T-2를 다시 읽어 상태 화면으로 |
| P8b | 메모 | `Gift_400_9` | 메모 50자 초과(앞뒤 공백 제외). 칸 오류 |
| P8b | 선물 랜딩 | 404 `Gift_404_1` | "선물을 찾을 수 없어요" |
| P8b | 회수 · 메모 · 선물 완료 상세(GG-7a) | 404 `Gift_404_1` | 내 선물이 아니거나 선물 완료가 아님. 티켓탭 다시 읽기 |
| P8b | 선물 보내기 · 반환 | 404 `IssuedTicket_404_1` | 남의 티켓·바뀐 uuid. 티켓탭 다시 읽기 |
| P8b | 선물 반환 | `Gift_400_7` | 반환할 수 없는 티켓. G11/T-2 다시 읽기 |
| P8c | 셀프 체크인 | `Event_400_26` | 잘못된 체크인 QR |
| P8c | 셀프 체크인 | `Event_400_5` | 공연이 끝남(정산중·지난 공연). "공연이 끝나 셀프 체크인을 할 수 없어요. 호스트에게 티켓 QR을 보여 주세요"(§19) |
| P8c | 셀프 체크인 | `IssuedTicket_400_1` | 같은 공연의 남의 티켓. "내 티켓이 아니에요" |
| P9 | 주문 취소 | `Order_400_5` | 이미 취소·거절됨. G11/O-3 다시 읽기 |
| P9 | 주문 취소 | `Order_400_24` | 입장 완료·다른 사람 소유·선물 대기 티켓이 있음. G11/O-3 다시 읽기. 다시 읽은 주문이 §20의 `giftBlocksCancel` 조건에 맞을 때만 "선물을 먼저 취소하거나 돌려받아 주세요". 정상 흐름에서는 `canCancel`로 미리 숨고 같은 조건으로 버튼 자리에 안내한다 |
| P9 | 주문 취소 | `Event_400_5` | 공연이 OPEN이 아님. `canCancel`로 미리 숨는다. 오면 G11/O-3 다시 읽기 |
| P9 | 주문 취소 | `Order_400_9` | 공연 시작 후. [주문취소]는 `canCancel`로 이미 숨는다 |
| P9 | 주문 취소 | `Order_400_25` | 유료 취소에 환불 계좌 없음. 계좌 시트를 연다 |
| P9 | 환불 계좌 | `Order_400_27` · `Order_400_28` | 입력할 수 없는 주문 · 이미 환불 완료. G11/O-3 다시 읽기 |
| P9 | 프로필 | `USER_400_4` | 닉네임 공백만. 칸 오류 |
| P9 | 프로필 | `USER_400_5` | 본인이 올린 이미지가 아님. PM-3 발급부터 다시 |
| P9 | 탈퇴 | `USER_400_6` | "마스터를 양도한 뒤 탈퇴해 주세요" |
| P10a | 호스트 만들기 | `HOST_400_16` | 연락처 형식. 서버가 어느 줄인지 알려 주지 않아 연락처 영역 전체 오류("연락처 형식을 확인해 주세요"), 연락처를 고치면 지운다(`useCreateHost`). 검증 실패(400 `BAD_REQUEST`)는 폼이 길이·빈 값을 먼저 막으므로 오면 전역 토스트(고정 문구) |
| P10b | 호스트 설정 | `HOST_400_16` | 연락처 칸 오류. 서버가 줄을 알려 주지 않아 연락처 영역 전체 오류(P10a와 같은 문구), 연락처를 고치면 지운다(`useHostSettings`) |
| P10b | 호스트 설정 | `HOST_400_17` | 이 호스트에 올린 이미지가 아님. 어느 자리인지 서버가 말하지 않아 이번에 새로 올려 보낸 자리(프로필·커버)를 모두 버리고 그 자리에 "이미지를 다시 올려 주세요" — 업로드 처음부터(`retry()`는 발급부터). 다른 칸 변경은 남긴다 |
| P10b | 호스트 이미지 | `UPLOAD_INVALID_EXTENSION` · `UPLOAD_PUT_FAILED` | 그 자리 오류(P9 프로필과 같은 문구). 발급의 429·네트워크는 전역 토스트 |
| P10b | 멤버 초대 | `HOST_400_13` · `14` · `15` | 미가입 · 중복 · 이미 멤버. 백엔드가 `reason` 끝 괄호에 문제 이메일을 `, `로 붙인다(`"가입되지 않은 이메일입니다. (a@x.com)"`, `HostErrorCode.toDetailException` @432cce4) — 대소문자·공백 무시로 줄에 맞춰 사유 표시(`inviteServerErrors`). 맞는 줄이 없으면 폼 오류. 그 줄을 고치면 지운다. 한 번에 한 사유만 온다(검사 순서 14 → 18 → 13 → 15) |
| P10b | 멤버 초대 | `HOST_400_18` | 같은 이메일 계정이 여럿. 사유에 이메일이 붙어 와서 그 줄에 "같은 이메일로 가입된 계정이 여러 개예요. 두둥에 문의해 주세요" |
| P10b | 멤버 관리 | `HOST_404_2` | 이미 없는 멤버(역할 변경·삭제·양도). GH-6 다시 읽기 + 안내 문구(`actionError`) |
| P10b | 멤버 관리 | `HOST_400_5` · `10` · `12` · 403 `HOST_400_11` | 마스터 대상 변경 · MASTER 지정 · 마스터 삭제 · 매니저가 매니저를 다룸. 버튼을 미리 숨긴다(`memberActionsOf`). 오면 전역 토스트 |
| P11 | 간편 만들기 · 기본 정보 | `Event_400_2` | 시작 ≥ 종료. 일정 칸 오류(FE는 "종료 ≤ 시작이면 다음 날"로 계산하므로 날짜 계산 버그를 의심) |
| P11 | 기본 정보 | `Event_400_17` | 정산중·지난 공연 수정. 수정 화면을 읽기 전용으로 |
| P11 | 기본 정보 | `Event_400_18` | 등록 후 티켓 여부 변경. 등록 후에는 토글을 잠근다 |
| P11 | 기본 정보 | `Event_400_20` · `Event_400_23` | 문의처 형식 · 없는 태그. 해당 칸 오류 |
| P11 | 기본 정보 | `Event_400_22` | 이 공연에 발급한 포스터 key가 아님. 업로드를 처음부터 |
| P11 | 공연 삭제 | `Event_400_19` | 준비중이 아닌 공연. 등록 후 카드에는 ⋮ 삭제를 두지 않는다. 오면 목록 다시 읽기 |
| P11 | 기본 정보 | `Event_400_24` | "등록된 공연은 지금 이후로만 바꿀 수 있어요" |
| P11 | 상세 정보 | `Event_400_21` | 섹션 형식(1~10개, 제목 20자, 본문 20,000자) |
| P11 | 공연 등록 | `Event_400_7` | 조건 미충족. GE-7을 다시 읽어 빠진 항목 표시 |
| P11 | 공연 등록 | `Event_400_8` | 이미 오픈됨. GE-3 다시 읽기 |
| P11 | 공연 등록 | `Event_400_15` | 체크리스트는 찼지만 시작 시각이 지남(`Event.validateStartAt` — 2026-10-26 P11-L 소스 확인으로 추가). "공연 시작 시각이 지나 등록할 수 없어요. 일정을 바꿔 주세요" + GE-7·GE-3 다시 읽기. `canOpen`이 시작 전을 보므로 정상 흐름에서는 버튼이 막혀 있다 |
| P11 | 공연 삭제 | `Event_400_13` | 발급 티켓이 있음(v1 규칙 `EventService.deleteEventSoft`). 준비중 공연에는 정상 흐름에서 나지 않는다 — 전역 토스트 |
| P11 | 기본 정보 | `Event_400_25` | 유효 티켓이 있는데 "티켓 없음"으로 바꾸려 함. 토글 칸 오류 |
| P12 | 티켓 폼 | `Ticket_Item_400_3` | 가격(두둥 1원 이상, 무료 0원) |
| P12 | 티켓 폼 | `Ticket_Item_400_12` | 티켓 없음 공연. 추가 버튼을 미리 숨긴다 |
| P12 | 티켓 폼 | `Ticket_Item_400_15` | 입력 조합 오류 — 무제한 + 재고 공개, 같은 필드에 값과 `clear` 동시, `clear` 대상에 명시적 `null`. 폼에서 미리 막고 비우기는 `clear`로만(§23) |
| P12 | 티켓 폼 | `Ticket_Item_400_14` | 잠긴 티켓의 잠긴 필드 변경·수량 감소. 해당 칸을 비활성으로 그린다 |
| P12 | 티켓 폼 | `Ticket_Item_400_8` · `Ticket_Item_400_13` | 두둥 티켓인데 계좌 없음 · 판매 기간 오류. 해당 칸 오류 |
| P12 | 티켓 삭제 | `Ticket_Item_400_7` | 잠긴 티켓. ⋮ 메뉴에서 삭제 대신 판매 중단을 보인다 |
| P12 | 옵션 폼 | `Option_Group_400_6` | 설명 50자 초과(바뀐 때만 검증). 글자 수 표시 |
| P12 | 옵션 수정·삭제 | `Option_Group_400_5` · `Option_Group_400_2` | 잠긴 티켓에 붙은 옵션. 이름·설명 밖 수정과 삭제를 막고 잠금 표시 |
| P12 | 옵션 붙이기 | `Option_Group_400_1` | 다른 공연의 옵션. 옵션 풀 다시 읽기 |
| P12 | 티켓·옵션 | 404 `Ticket_Item_404_1` · `Option_Group_404_1` | 없거나 다른 공연. 목록 새로고침 |
| P12 | 옵션 붙이기 | `Item_Option_Group_400_2` | 잠긴 티켓. ⊗를 미리 숨긴다 |
| P12 | 옵션 붙이기 | `Item_Option_Group_400_4` | 무료 티켓에 유료 옵션. 선택지에서 미리 뺀다 |
| P12 | 티켓 폼 | `Ticket_Item_400_2` | 수량·1인 매수 제한 범위(1~999,999 — `TicketItemQuantityException`, 2026-10-30 P12-L 소스 확인으로 추가). 폼이 먼저 막는다. 오면 수량 칸 오류 |
| P12 | 티켓 수정 | `Ticket_Item_400_11` | 기존 PG 티켓(`payType=PRICE`)은 v2에서 고칠 수 없다. ⋮ 메뉴에 [수정]을 두지 않는다. 오면 폼 오류 |
| P12 | 티켓 수정 | `Item_Option_Group_400_4` | 유료 옵션이 붙은 티켓을 무료로 바꿈(`applyUpdate.hasPaidOption`). 결제 방식 칸에서 미리 막고, 오면 폼 오류 |
| P12 | 티켓·옵션 | `Event_400_17` | 정산중·지난 공연(`validateEditable` — 모든 티켓·옵션 변경). 화면은 공연 스코프가 읽기 전용으로 그린다. 오면 폼 오류 + GE-3 다시 읽기 |
| P12 | 옵션 폼 | `Option_Group_400_3` | 추가금 오류(주관식에 0이 아닌 값 등). 추가금 칸 오류 |
| P13a | 주문 상세 | `Order_400_3` | 이미 처리된 주문. GR-2 다시 읽기 |
| P13a | 주문·티켓 상세 모달 | 404 `Order_404_1` · `IssuedTicket_404_1` | 다른 공연의 주문·티켓. 공용 404 화면으로 보내지 않는다 — 모달을 닫고(`order` 파라미터 제거) 목록 다시 읽기 |
| P13a | 승인 | `Event_400_5` · `Event_400_6` | 공연이 OPEN이 아님 · 시작 후. 버튼 비활성, 오면 GR-2 다시 읽기 |
| P13a | 승인 | `Order_400_14` | 탈퇴한 주문자. "거절로 정리해 주세요" |
| P13a | 승인 | `Ticket_Item_400_1` | 재고 부족. "승인할 수 없어요. 거절로 정리해 주세요". 주문은 승인 대기로 남는다 |
| P13a | 승인 | `Ticket_Item_400_6` | 1인 제한. 주문은 승인 대기로 남는다는 안내 + 거절로 정리하는 길 |
| P13a | 거절 · 승인 후 취소 | `Order_400_5` · `Order_400_9` | 거절·취소할 수 없는 상태 · 공연 시작 후. 시작 후에는 거절·취소 버튼 비활성. 오면 GR-2 다시 읽기(승인의 시작 후 코드는 `Event_400_6`) |
| P13a | 거절 | `Order_400_18` | 사유 오류(`ETC`는 문구 필수, 20자). 시트에서 미리 검증 |
| P13a | 환불 완료 | `Order_400_17` | 환불 요청 상태가 아님. [환불 완료]는 `refundStatus=REQUESTED`일 때만 |
| P13a | 엑셀 | `Order_400_19` · `IssuedTicket_400_7` | 1만 행 초과. 필터를 좁히라고 안내 |
| P13a | 엑셀 | 403 `HOST_400_1` | 일반 멤버(#846 — 엑셀은 매니저 이상). 버튼을 `myRole`로 숨기므로 정상 흐름에선 안 온다. 오면 일반 403 처리 + `myRole` 쿼리 다시 읽기 |
| P13a | 승인 | `Order_400_3` · `Event_400_5` · `Event_400_6` | 이미 처리됨(운영자 대리 처리 #828 포함) · OPEN 아님 · 시작 후. 안내 + GR-2 다시 읽기(공연 쪽 코드는 GE-3도). 검사 순서는 PG 주문 `Order_400_7` → 상태 `Order_400_3` → OPEN `Event_400_5` → 시작 `Event_400_6` → 재고 `Ticket_Item_400_1` → 1인 제한 `Ticket_Item_400_6` → 옵션 변경 `Order_400_13` → 탈퇴 `Order_400_14`(`OrderValidator.validCanApproveOrder`, 2026-10-31 P13a-L 소스 확인). `Order_400_7`(PG 주문)·`Order_400_13`(옵션 변경)은 화면이 따로 처리하지 않는다 — 전역 토스트(mock은 내지 않는다) |
| P13a | 거절 | `Order_400_18` · 404 | 거절 사유 검사가 주문 조회보다 먼저다(`V2OrderDomainService.refuse` — 없는 주문에도 `Order_400_18`). 그다음 404 → 시작 후 `Order_400_9` → 상태 `Order_400_5` → OPEN `Event_400_5`. 본문 `reasonType` 없음은 400 `BAD_REQUEST`(전역, 시트가 먼저 막는다) |
| P13a | 승인 후 취소 | `Order_400_9` → `Order_400_5` → `Event_400_5` | 시작 후 검사가 상태보다 먼저(`OrderValidator.validCanCancel`). 사유는 선택(본문 없이 보낼 수 있다), 100자 초과는 400 `BAD_REQUEST` — 칸에서 막는다 |
| P13a | 환불 완료 | 200(이미 완료) | 이미 완료된 주문은 그대로 200(멱등). 화면은 응답으로 갱신한다 |
| P13a | 주문·티켓 상세 처리 | 404 `Order_404_1` | 조회뿐 아니라 처리(승인·거절·취소·환불 완료)의 404도 같은 길 — 닫고 목록 다시 읽기 |
| P4b · P7 · P12 | 가입 · 주문 · 두둥티켓 생성(+ 무료 → 두둥 수정, #873) | `Agreement_400_1` | 백엔드가 동의 강제를 켰는데 동의 필드가 빠짐(#840). 화면에서 체크 전 버튼을 막으므로 정상 흐름에선 안 온다. 오면 "필수 동의를 확인해 주세요"로 동의 영역으로 보낸다. **단 2026-10-25 현재 FE는 화면 칸이 없는 필드(가입 만 14세, 주문 호스트 제공 동의·두둥티켓 고지)를 보내지 않으므로(Q42) 강제가 켜지면 정상 흐름에서도 온다** — 지금 L 구현은 가입 = 일반 실패(`failed`), 주문 = 표에 없는 400이라 전역 토스트이고 완료로 가지 않는다(`useKakaoCallback.test`·`useCheckout.test`), 티켓 폼 = 폼 오류 "필수 동의를 확인해 주세요"(`useTicketForm.test`, P12-L) |
| P13b | 호스트 스캔 | `Event_400_27` | OPEN·정산중이 아닌 공연. GE-3 `status`로 미리 막는다(`hostScanBlockOf` — 준비중·지난 공연은 요청하지 않음). 스캔 사이에 상태가 바뀌어 오면 "준비중이거나 지난 공연은 입장 처리를 할 수 없어요" + GE-3 다시 읽기(`useHostScan`, P13b-L) |
| P13b | 호스트 스캔 | 네트워크 · 타임아웃 · 5xx | 실패 상태 + [다시 시도](같은 값, 쿨다운 무시). 전역 토스트 없음(`meta.handled`). 통계(GQ-1) 다시 읽기 실패는 지난 값 유지 + `refreshFailed`(`meta.silent`) (P13b-L) |
| P13b | 호스트 스캔 | 400 `BAD_REQUEST` | 64자 넘는 값 — 화면이 요청 전에 "티켓 QR이 아니에요"로 막는다(`normalizeScanValue`). 오면 같은 안내 (P13b-L) |
| P13b | 호스트 스캔 | 403 · 404 `Event_404_1` | 권한을 잃었거나 공연이 지워짐. 실패 상태(다시 시도 없음). 정상 흐름에선 공연 스코프가 먼저 공용 403·404로 보낸다 (P13b-L) |
| P9c | 공지 상세 | 404 `Notice_404_1` | 숨김·없는 공지. 관객 `/notices/[id]`는 서버 조회라 `notFound()`(상태 코드 404), 호스팅 `/hosting/notices/[id]`는 공용 404 "공지를 찾을 수 없어요" + [공지 목록](클라이언트 판정, 200). 숫자가 아닌 id는 부르지 않고 같은 404 (P9c-L) |
| P9c | 공지 목록 · 배너 | 5xx · 네트워크 | 목록 첫 페이지는 경계의 [다시 시도], 다음 페이지는 기존 행을 지우지 않고 하단 재시도(§12). 배너(GA-3)는 배너 없이 두고 전역 토스트 없음(`meta.silent`) (P9c-L) |
| P9c | 공지 목록 · 배너 | 400 `BAD_REQUEST` | 모르는 `audience`·`size` 51 이상. FE는 `USER`·`HOST`와 기본 크기만 보내 정상 흐름에서 오지 않는다 — 전역 처리 (P9c-L) |

표의 코드는 모두 `error-codes.md`에 있는 것을 확인했다(2026-10-14, 2회차 추가분 2026-10-15). 처리 문구는 백엔드 통합 기획서 각 장의 "프론트 처리" 열을 따른다. 화면에서 직접 처리하는 코드는 `handleCodes({...})`로 적는다(§4-5). 3회차(2026-10-15)에 백엔드 코드로 승인의 시작 후 코드(`OrderValidator.validCanApproveOrder` → `validTicketingTime` = `Event_400_6`)와 로그인·콜백의 401(JWT 필터)을 확인했다. 셀프 체크인의 `Event_400_5`는 백엔드 `V2CheckInDomainService.selfCheckIn` → `Event.validateNotOpenStatus()` → `EventNotOpenException`(`EVENT_NOT_OPEN`)에서 확인했다.

