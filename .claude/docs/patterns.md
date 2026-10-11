# DuDoong-Front v2 — 구현 패턴

> 2026-10-12 개정. §1~§3(반응형 · 텍스트 · 레이아웃)을 vanilla-extract 기준으로 다시 썼다. 이전 판은 tossinsu-desktop의 emotion 구현을 그대로 인용했는데, **원칙은 그대로 가져오고 구현만 바꿨다.** §4~§10은 tossinsu-desktop에서 가져온 패턴, §11 이후는 화면 패턴이다.
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

## 4. React Query 컨벤션

### 4-1. 조회·변경 정의 — 개별 export + `api` 객체

tossinsu-desktop은 `remotes/*.ts`에 `queryOptions`/`mutationOptions`를 조회 하나당 하나씩 export한다(`customerListQuery`, `customerCreateMutation`). DuDoong도 같은 모양을 쓴다. 정의는 tech-decisions §4.

```ts
// src/api/host/queries.ts
export const hostDetailQuery = (hostId: string) =>
  queryOptions({
    queryKey: ['hosts', hostId],
    queryFn: () => api.get(`hosts/${hostId}`, HostDetailSchema),
    staleTime: 0,                       // 브라우저가 쿠키와 함께 다시 조회해 myRole을 채운다
  });

// src/api/host/mutations.ts
export const addHostMembersMutation = (hostId: string) =>
  mutationOptions({
    mutationFn: (body: AddMembersRequest) => api.post(`hosts/${hostId}/members`, HostMemberListSchema, body),
  });
```

- `{대상}Query` / `{동작}Mutation`. 도메인 객체로 묶지 않는다.
- queryKey는 경로를 쪼갠 모양. 손으로 쓴다.
- `mutationOptions`에는 `mutationFn`만. 후속 동작은 화면의 `onSuccess`에.
- `@tanstack/react-query` v5는 `queryOptions`와 `mutationOptions`를 둘 다 제공한다. 자체 래퍼를 만들지 않는다.

### 4-2. Suspense 경계 — "가장 흔한 실수"로 명시된 규칙

원문 그대로:
> **MUST**: `useSuspenseQuery` 사용 시 반드시 `<Suspense>` boundary 내에서 렌더링. 내부적으로 Suspense query를 쓰는 컴포넌트(합성 컴포넌트)도 Suspense 필요.
> **Important Notes 1순위**: Suspense 필수 — 가장 흔한 실수.

```tsx
<Suspense fallback={<Loading />}>
  <ComponentWithSuspenseQuery />
</Suspense>
```

→ **DuDoong 적용**: §15에서 채택한 `@suspensive/react-query`가 정확히 이 실수를 구조적으로 방지하기 위한 라이브러리다(`<SuspenseQuery>` 컴포넌트가 내부에 `Suspense`+`ErrorBoundary`를 포함). 호스팅 센터(P10~P13)의 모든 `useSuspenseQuery` 사용처는 **직접 `<Suspense>`를 감싸지 말고 `@suspensive/react-query`의 컴포넌트 조합을 기본값으로** 한다 — "Suspense 까먹음"이라는 실수 자체를 라이브러리 레벨에서 없앤다.

### 4-3. 래퍼 훅 금지

원문:
> TanStack Query 훅을 단순 래핑하는 커스텀 훅 금지(복잡한 변환 로직이 있는 경우만 허용)

→ DuDoong도 동일 원칙 채택: `useCustomerQuery()`처럼 `useQuery(customerQuery())`를 그대로 감싸기만 하는 훅을 만들지 않는다. `queryOptions()` 자체가 이미 재사용 단위이므로 컴포넌트에서 직접 `useQuery(eventDetailQuery(id))`를 호출한다. **변환 로직이 진짜 있는 경우**(예: 여러 쿼리를 합쳐 파생 상태를 만드는 경우)만 커스텀 훅 허용.

### 4-4. 파생 쿼리(`select`)와 의존 쿼리(`dependsOn`) 헬퍼

tossinsu-desktop `src/api/react-query/suspensive.ts`·`dependsOn.ts` 원본(그대로 인용):
```ts
/** 기존 queryOptions에 select를 붙여 파생 쿼리를 만든다(queryFn 재정의 없이 재사용) */
export const select = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey> & { queryKey: TQueryKey },
  selector: (data: TQueryFnData) => TData
) => ({ ...options, select: selector });
```
```ts
/** 의존 파라미터가 아직 없으면 즉시 reject하는 queryFn 래퍼 — `enabled` 체크를 호출부마다 반복하지 않아도 됨 */
export function dependsOn<T, R>(dependency: T | undefined, queryFn: (dependency: T) => Promise<R>): () => Promise<R> {
  return typeof dependency === 'undefined'
    ? () => Promise.reject(new Error('Dependency not passed to query'))
    : () => queryFn(dependency);
}
```
사용 예(주석의 의도를 실제 예시로 재구성):
```ts
// select — 상세 쿼리에서 제목만 뽑아 쓰는 파생 쿼리(예: OG 태그 생성용, P5b)
const eventTitleQuery = (id: string) => select(eventDetailQuery(id), event => event.title);

// dependsOn — hostId가 선택되기 전엔 쿼리를 실행하지 않는 대신, enabled 체크 없이 안전하게 표현(예: P11 마법사 Step2가 Step1의 hostId에 의존)
const eventDraftQuery = (hostId: string | undefined) =>
  queryOptions({ queryKey: ['eventDraft', hostId], queryFn: dependsOn(hostId, id => api.getEventDraft(id)) });
```

→ **DuDoong 적용**: `src/api/shared/queryHelpers.ts`에 `select`(그대로 이식 가능, 순수 타입 유틸)와 `dependsOn`(그대로 이식 가능)을 포함한다. 특히 `dependsOn`은 P11 마법사(Step 간 의존), P6→P7(티켓 선택→체크아웃의 연쇄 의존), P8b(선물 발송 시 발급 티켓 의존) 등 **의존 쿼리가 많은 DuDoong 도메인에 정확히 들어맞는다.**

### 4-5. QueryClient 기본 옵션 — 앱 성격에 따라 분리

tossinsu-desktop(순수 CSR, `react-query/client.ts`) 원본:
```ts
export const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: Infinity, gcTime: Infinity, throwOnError: true },
    mutations: { retry: false },
  },
});
```
`staleTime: Infinity`가 눈에 띈다 — **순수 CSR 사내 도구 앱이라 데이터가 자동으로 stale해질 필요가 없고, 대신 mutation 성공 시 명시적으로 `invalidateQueries`한다**는 전제의 설계다.

→ **DuDoong 시사점**: 이 값을 그대로 가져오지 않는다. DuDoong은 공개 화면을 서버에서 캐시해 렌더하고(tech-decisions §4), 클라이언트 쿼리는 대부분 로그인 뒤 조작 화면이라 최신이 중요하다. 호스팅 센터는 tossinsu-desktop과 성격이 같은 사내 도구형 화면이므로 "긴 `staleTime` + mutation 뒤 명시적 `invalidateQueries`"를 검토할 만하지만, 예매자 목록처럼 항상 최신이어야 하는 화면은 짧게 둔다. 기본값은 P3, 호스팅 센터용 값은 P10a에서 정한다.

---

## 5. API 클라이언트 패턴

tossinsu-desktop은 **axios가 아니라 `ky`**(fetch 기반 HTTP 클라이언트)를 쓴다. `src/api/client/apiClient.ts` 원본(발췌):
```ts
export const api = ky.create({
  headers: { 'X-Client-Credentials': getCredentials() },
  hooks: {
    afterResponse: [
      async (_request, _options, response) => {
        try {
          const jsonResponse = await response.clone().json();
          // 비즈니스 실패(resultType:'FAIL')를 HTTP 400으로 재작성 →
          // ky의 자동 HTTPError throw 메커니즘에 "논리적 실패"까지 태운다
          if ('resultType' in jsonResponse && response.status === 200 && jsonResponse.resultType === 'FAIL') {
            return new Response(JSON.stringify(jsonResponse), { status: 400, headers: response.headers });
          }
          return response;
        } catch { return response; }
      },
    ],
  },
});

// origin 도메인을 엔드포인트로 — 얇은 verb 래퍼가 BaseResponse를 까서 성공 데이터만 반환
export const apiGateway = {
  get: async <T>(path: string, options?: Options) => (await api.get(path, options).json<BaseResponse<T>>()).success,
  post: async <T>(path: string, options?: Options) => (await api.post(path, options).json<BaseResponse<T>>()).success,
  // put/delete/patch 동일 패턴
};

// baseURL을 고정한 별도 인스턴스 — 도메인/인증 요구사항이 다른 API군을 분리
export const crmApi = ky.create({ prefixUrl: DOMAIN.crm, headers: { 'X-Client-Credentials': getCredentials() } });

// 인증 헤더 없이 호출하는 공개 API 전용 인스턴스(공개 마케팅 사이트가 보호된 API의 공개 서브셋을 호출할 때)
export const crmPublicApi = ky.create({ prefixUrl: DOMAIN.crm });
```
에러 추출 유틸(`handleKyErrorResponse.ts`, 그대로 인용):
```ts
/** ky 에러에서 서버 에러코드만 안전하게 추출. 절대 throw하지 않아 catch 블록에서 항상 후속 처리 가능 */
export async function getKyErrorTitle(e: unknown): Promise<string | null> {
  const response = (e as HTTPError).response;
  if (response == null) return null; // 네트워크 에러/타임아웃 등 response 자체가 없는 경우
  try {
    const { error } = (await response.json()) as BaseResponse<null>;
    return error?.title || null;
  } catch { return null; }
}
```

### 이 패턴에서 DuDoong이 가져갈 것

1. **응답 봉투는 이미 확정돼 있다.** 백엔드 v2는 성공 `{success: true, status: 200, data, timeStamp}`(항상 HTTP 200), 실패 `{success: false, status, code, reason, timeStamp, path}`(실제 HTTP 상태 코드)로 응답한다. tossinsu-desktop처럼 "HTTP 200 + 논리적 실패"를 재작성할 필요는 없고, `afterResponse`에서 **성공 래퍼를 벗겨 `data`만 반환**하고 실패는 `ApiError{status, code, reason}`로 바꾸면 된다([`api-contract.md`](./api-contract.md) §1, 아래 §11).
2. **도메인/인증 요구사항별 클라이언트 인스턴스 분리**는 이미 DuDoong이 §12에서 `serverEnv.API_INTERNAL_BASE_URL`(인증 필요, 서버 전용) vs `clientEnv.NEXT_PUBLIC_API_BASE_URL`(공개) 구조로 동일한 결정을 내렸다 — **패턴이 이미 일치**한다는 확인.
3. **`ky` 채택 확정(axios 아님).** `ky`는 fetch 네이티브 기반이라 (a) Next.js의 fetch 확장(캐싱 옵션 등)과 결이 더 잘 맞고, (b) 번들이 가볍고, (c) `hooks.afterResponse` 같은 훅 API가 axios 인터셉터보다 타입 추론이 깔끔하다. tech-decisions §1의 `createApiClient`가 이미 `ky.create()` 기반으로 확정 반영됨.
4. **`getKyErrorTitle` 같은 "절대 throw하지 않는 에러 추출 유틸"** 패턴은 `src/api`의 에러 규약(§3 산출물 A)에 `getErrorTitle(e: unknown): string | null`로 그대로 이식한다 — axios를 유지하든 ky로 바꾸든 이 유틸의 인터페이스는 동일하게 만들 수 있다.

---

## 6. Overlay — `overlay-kit`은 tossinsu-desktop에서 "보조 패턴"이다

CRM 컨벤션 원문:
> 두 가지 패턴이 공존한다 — `openModalContent`(주 패턴, 213곳) vs `overlay-kit`(보조 패턴, 30곳). `openModalContent`이 더 간결하므로 기본 선택. `overlay.open`은 Dialog 등 isOpen/close 제어가 필요한 경우에 사용.

`openModalContent`는 `@insu-desktop/ui`(그들의 내부 디자인시스템 래퍼) 함수라 DuDoong엔 이식 대상이 없다 — **DuDoong은 이런 내부 래퍼가 없으므로 `overlay-kit`을 주 패턴(유일한 패턴)으로 그대로 채택**한다(§5에서 이미 결정). 다만 이 사례가 주는 시사점: tossinsu-desktop도 결국 "매번 `overlay.open(({isOpen, close}) => ...)` 콜백을 쓰는 게 번거로운 흔한 케이스"를 위해 더 간결한 래퍼(`EasyModalContent`류, async onClick 자동 로딩+완료 시 자동 닫힘)를 만들어 뒀다는 것이다.

→ **DuDoong 이식**: `src/ui`에 `overlay-kit` 위에 얇은 편의 컴포넌트를 하나 추가하는 걸 P2 범위로 검토한다:
```tsx
// src/ui/components/EasyOverlay/index.tsx (가칭, tossinsu-desktop EasyModalContent 아이디어 이식)
interface EasyOverlayProps {
  title: ReactNode;
  children: ReactNode;
  ctaLabel: string;
  onConfirm: () => Promise<void>; // 자동으로 로딩 상태 관리 + 성공 시 자동 close
}
// 내부에서 overlay-kit의 close를 호출하는 컨텍스트를 소비, onConfirm 실행 중 버튼 비활성화+로딩, 성공하면 자동 close, 실패하면 에러 토스트 후 오버레이 유지
```
P13a(승인/입금처리/취소 등 "확인 누르면 서버 호출 후 닫힘" 패턴이 6종이나 몰려 있음)와 P8b(선물 수락/거절)가 이 컴포넌트의 1차 소비처가 된다.

---

## 7. 계층 — 단방향 규칙

tossinsu-desktop은 패키지 사이에 "아래 계층만 import한다"는 규칙을 두고 역방향 import를 순환 의존성 원인으로 금지한다. DuDoong은 패키지가 아니라 폴더로 같은 규칙을 둔다.

```
src/app → src/features → src/ui → src/api → src/utils
```

- `features/audience` ↔ `features/hosting`은 서로 import하지 않는다. 같이 쓰는 것은 `features/shared`.
- `src/api`는 UI를 모른다. `src/ui`는 `features`·`api`를 모른다.
- `src/api/server/`는 라우트 파일과 Route Handler에서만 쓴다.
- eslint로 강제한다(P0). 문서로만 두지 않는다.

---

## 8. 네이밍 컨벤션

CRM 컨벤션 표 그대로 인용, DuDoong 맥락 주석 추가:

| Type | Convention | Example | DuDoong 적용 |
|---|---|---|---|
| Component | PascalCase | `CustomerCard.tsx` | 동일 채택 |
| Hook | camelCase + `use` prefix | `useCustomerQuery.ts` | 동일 채택 |
| Schema(zod) | PascalCase + `Schema` suffix | `CustomerDetailSchema` | 동일 채택 — `src/api`의 zod 스키마 명명에 적용(예: `EventDetailSchema`) |
| Import Path | `~/` = `./src/` | `import { X } from '~/components'` | **DuDoong은 이미 §9에서 `@/*` = `./src/*`로 확정** — `~/`가 아니라 `@/`를 쓰되 같은 개념(alias 1개로 통일)임을 명시 |
| Atom(Jotai) | camelCase + `Atom` suffix | `customersSelectedIdsAtom` | 해당 없음(§5에서 전역 상태 라이브러리 자체를 미도입) |

---

## 9. "직접 구현하지 말 것" — DuDoong 버전 유틸 대체표

CRM 컨벤션의 표 형식(용도 → Bad → Good)을 그대로 가져오되, 내용은 DuDoong 스택(§15에서 채택한 라이브러리들)에 맞게 재구성했다. **이 표 자체를 `src/utils`/`src/ui`의 README 또는 CLAUDE.md에 그대로 옮겨서 앱 개발자가 참조하게 한다.**

| 용도 | Bad (직접 구현) | Good (DuDoong 유틸) | 근거 |
|---|---|---|---|
| 로딩 상태 관리 | `useState(false)` + try/finally | `useLoading()` — `src/ui/hooks`에 직접 둔다 | tech-decisions §22 |
| delay | `setTimeout`/`new Promise` | `delay()` — `es-toolkit` | §15 |
| debounce/throttle | 직접 구현 | `debounce()`/`throttle()` — `es-toolkit` | §15 |
| 마운트 후에만 실행 | `useEffect`+`useState` 직접 조합 | `useIsClient()` — `src/ui/hooks`에 직접 둔다 | §1-4 |
| SSR-safe layout effect | `useLayoutEffect` 직접 사용(SSR 경고) | `useIsomorphicLayoutEffect()` — `src/ui/hooks`에 직접 둔다 | |
| 확인 다이얼로그 | `window.confirm()` | `overlay-kit` 기반 `ConfirmDialog` 오버레이 | §5, §6(위) |
| 오버레이(성공 시 자동 닫힘) | 매번 `close()` 수동 호출 | `EasyOverlay`(§6 위, tossinsu-desktop `EasyModalContent` 아이디어 이식) | 신규 |
| 토스트 | 직접 구현 | `useToast()` — `src/ui` | P2 |
| 클립보드 복사(선물 링크·공유 URL) | `navigator.clipboard.writeText()` 직접 호출 | `copyText()` — `src/utils`에 신규 구현(에러 폴백 포함) | P8b·P5b 공유 기능에서 실사용 |
| 날짜 포맷/타임존(KST) | 직접 포맷 | `kstFormat()` — `src/utils`에 신규 구현, `es-toolkit` 조합 | P12(§ "티켓/옵션 관리" 타임존 요구) |
| 파생 쿼리 | queryFn 복붙 | `select()` — `src/api`에 이식(§4-4) | 신규 |
| 의존 쿼리 | `enabled` 체크 산발 | `dependsOn()` — `src/api`에 이식(§4-4) | 신규 |
| 에러 타이틀 추출 | `try { e.response.data... } catch` 산발 | `getErrorTitle()` — `src/api`에 이식(§5) | 신규 |
| 엑셀 다운로드(예매자 명단) | 직접 구현 | `useExcelDownload()` — `src/utils`에 신규 구현(라이브러리는 P13a에서 확인 후 선정) | P13a |

---

## 10. 기타 운영 규칙 (그대로 채택 권장)

CRM 컨벤션의 "Important Notes"에서 DuDoong에도 그대로 적용 가능한 것들:

1. **`tsc` 직접 실행 금지, 반드시 워크스페이스 스크립트로 typecheck.** DuDoong은 `turbo run typecheck --filter=<workspace>`가 동일 역할(§8/§11에서 이미 CI 게이트로 채택). 로컬에서도 `tsc` 대신 이 명령을 쓰도록 각 `package.json`의 `typecheck` 스크립트를 표준화한다.
2. **`any` 금지 — `unknown` 또는 구체적 타입 사용.** DuDoong §9의 `strict`+`noUncheckedIndexedAccess` 설정과 함께 `@typescript-eslint/no-explicit-any` eslint 규칙을 P0에서 명시적으로 켠다(현재 tech-decisions엔 이 개별 규칙이 명시돼 있지 않았음 — P0 eslint 설정에 추가).
3. **간격/치수를 추측하지 않는다 — 디자인 노드에서 실측.** §3에서 이미 이식. Figma MCP로 노드 값을 직접 조회하는 걸 기본 워크플로로 삼는다(figma-desktop-plugin 연결 확인됨, 세션 초반 참조).
4. **Deprecated Patterns 표 형식 자체를 v1→v2 마이그레이션에도 적용.** tech-decisions.md의 여러 "v1 대비 마이그레이션 포인트" 섹션이 이미 이 형식(Bad=v1, Good=v2)을 산문으로 풀어 쓰고 있는데, 실제 구현 단계(phase-spec)에서는 **표 형태**로 다시 정리하면 코드리뷰 체크리스트로 바로 쓸 수 있다.

---

## 화면 패턴 — 읽는 법

> 2026-10-11 전면 개정. 이전 판(§11~§23)은 백엔드 계약을 모르는 상태에서 쓴 권장안이었다. 지금은 [`api-contract.md`](./api-contract.md)가 기준이고, 아래는 그 계약 위에서의 FE 구현 패턴이다. API ID는 api-contract §5를 따른다.
> 없어진 절: 지도(화면 없음), Q&A(API·화면 없음), 토스페이먼츠 위젯(PG 없음).

## 11. 공통 — 응답·에러·공개 GET

```ts
// src/api/client.ts — 개념
afterResponse: 본문이 { success: true, data } → data만 반환
              { success: false, status, code, reason } → throw new ApiError(status, code, reason)
```

| 규칙 | 이유 |
|---|---|
| 화면 문구는 `code`로 분기하고 `reason`은 폴백으로만 쓴다 | `reason`은 서버 문장이라 화면 맥락과 안 맞을 수 있다 |
| 403은 HTTP 상태로 먼저 분기한다 | 호스트 권한 실패의 `code`가 `HOST_400_*`라 `code`의 숫자만 보면 400으로 오인한다 |
| 400 "이미 처리됨" 계열은 최신 상태를 다시 읽는다 | 409가 없다. 승인·거절·취소·선물 전이가 모두 이 패턴 |
| 공개 GET에서 401이 오면 토큰을 떼고 한 번 더 요청한다 | 공개 GET도 만료 토큰이 붙으면 401 |
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

- 카드형 목록(공연 리스트, 호스트 공연, 알림함)은 무한 스크롤 + 하단 sentinel. 추가 로딩 실패는 기존 행을 지우지 않고 하단 재시도.
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

## 14. P5b — 공연 상세: 서버 조회 · 섹션 · 공유

- 서버에서는 GP-3 + GE-5만 조회한다. 티켓 잔여(GP-5)는 브라우저가 따로 조회한다.
- 라우트 파일이 `<Prefetch queries={[eventDetailQuery(id), eventSectionsQuery(id)]}>`로 조회하고, 화면은 `useSuspenseQuery`로 같은 쿼리를 읽는다. 서버 캐시는 없다 — 요청마다 백엔드를 부른다. 서버에서는 토큰이 붙지 않는다. 라우트 파일에 `export const instant = false`를 둔다.
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
- 수량 스테퍼 상한 = `purchaseLimit`과 `remaining` 중 작은 값(둘 다 `null`이면 상한 없음). 이미 산 수량은 화면이 모른다.
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
| `OrderComplete` | 주문 생성 응답으로 렌더 |

G11/O-0의 `account`가 `null`(무료·매진·지난 공연)이면 결제 정보 영역을 그리지 않는다. 404면 티켓 선택으로 돌려보낸다.

## 17. P8 — 티켓탭 · 캐러셀 · QR

- **목록**: G11/T-1은 페이지 없이 전부 온다. 묶음 `groupKey` 단위 카드, 묶음 안 티켓은 좌우 스와이프 + `N/M` 텍스트 페이저(도트 근거 없음).
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

- `viewState` 7종을 한 매핑으로 화면·버튼에 연결한다. Figma에 없는 5종(ALREADY_ACCEPTED · REJECTED · RETURNED · OWN_LINK · EXPIRED)은 문구만 백엔드 문서에 있다.
- 보내기·회수·반환·거절 확인은 `EasyOverlay`. `onConfirm`의 mutation이 끝날 때까지 버튼을 잠근다.
- 링크는 `origin + linkPath`로 만든다. 복사는 `copyText()`.
- 메모는 대기 중일 때만 수정할 수 있다(빈 값 = 삭제).

## 19. P8c · P13b — 체크인 결과

호스트 스캔(PQ-2)과 셀프(PQ-5)는 같은 `result` enum을 쓴다. 결과 화면 컴포넌트를 공유할 수 있게 `result` → 표시 매핑을 `src/api/check-in`에 둔다.

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

## 20. P9 — 주문상세 · 취소 · 환불 계좌

- 버튼 노출은 서버 플래그로만: 주문취소 = `canCancel`, 환불 계좌 입구 = `canEditRefundAccount`, 입력 유도 = `refundAccountRequired`.
- 사용자 주문 상태 5종 × `refundStatus` 3종을 한 매핑에서 라벨로 바꾼다.
- 유료 취소는 환불 계좌 시트가 필수(`Order_400_25`), 무료는 확인만.
- 본인 환불 계좌는 `maskedAccountNumber`로만 온다. 수정 화면은 전체를 다시 입력받는다.
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

## 23. 호스팅 센터 — 폼과 부분 수정

- **PATCH는 바뀐 필드만 보낸다.** RHF `dirtyFields`로 본문을 만든다.
- 객체·배열 필드는 통째 교체다. `place`를 고치면 `detailAddress`까지 다시 보낸다. `contacts`·`tagIds`도 전체를 보낸다.
- **티켓 수정(P10/T-3)**: 값을 비울 때는 `null`이 아니라 `clear[]`. 같은 필드에 값과 clear를 함께 보내지 않는다. `payType`을 바꾸면 `price`를 함께 보낸다.
- **티켓 폼**: "무제한"을 고르면 "재고 공개"를 끄고 비활성. 잠긴 티켓(`isSold || hasPendingOrders`)은 허용 필드만 활성.
- **섹션(PE-6)**: 전체 교체다. 탭 하나를 저장해도 모든 섹션을 보낸다.
- **새 옵션**: P10/O-2(생성) → P10/O-5(지정) 두 번 호출. 두 번째가 실패하면 옵션은 풀에 남아 있으므로 "옵션은 만들어졌고 티켓에 붙이지 못했다"로 안내한다.
- 이미지: 발급(분당 30회 제한) → S3 PUT → 폼 값에 `key` 보관 → 저장 API에 `key`. 저장 전에는 서버에 반영되지 않는다.
- 미저장 이탈: 변경이 있으면 메뉴 이동·뒤로가기에서 확인(`503:22904`).
- 승인 실패(PR-3): 에러를 보여 주고 주문은 승인 대기로 남는다는 것과 거절로 정리하는 길을 함께 안내한다.
- 엑셀: 응답이 래퍼 없는 xlsx다. blob으로 받아 저장한다. JSON 파서를 태우지 않는다.
