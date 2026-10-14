# DuDoong v2 — 디자인 시스템과 컴포넌트 구현

> 2026-10-15 작성. Figma "디자인 시스템" 파일(`0QD9tGSt8ZciDqe7ol2gYH`)의 🎨Foundation 6페이지와 🧩Components 17페이지를 `figma-console` MCP로 읽고 썼다.
> **디자이너가 작업 중인 파일이다.** 값과 이름은 바뀔 수 있다. P1·P2를 시작할 때 다시 읽고 이 문서를 갱신한다. 같은 파일의 "Sample GUI" 페이지(프레임 96개)는 아직 읽지 않았다.
>
> 관련 문서: 스타일링 방식 [`tech-decisions.md`](./tech-decisions.md) §6, 반응형·텍스트·레이아웃 패턴 [`patterns.md`](./patterns.md) §1~§3, Phase [`plan.md`](./plan.md) P1·P2, 와이어프레임 관측 [`figma-structure.md`](./figma-structure.md).

## 결정 요약

| 항목 | 결정 |
|---|---|
| 동작 | **Radix 프리미티브(헤드리스)** 에 맡긴다. 키보드 조작, 포커스, 스크린리더 속성, 폼 연동을 직접 만들지 않는다 |
| 모양 | vanilla-extract로 디자인 시스템 토큰에 맞춰 입힌다. 컴포넌트마다 `.css.ts` 하나 |
| shadcn/ui | 코드를 가져오지 않는다. Tailwind 기반이라 스타일 체계가 둘이 되고, 디자인이 이미 shadcn과 다르다. 구조를 볼 참고서로만 쓴다(shadcn도 Radix 위에 Tailwind 클래스를 얹은 것이다) |
| 토스트 | `sonner`의 unstyled 모드 + vanilla-extract |
| 바텀시트 | `vaul`(이미 채택, Radix Dialog 기반) |
| 아이콘 | 디자인 시스템의 자체 세트를 SVG 컴포넌트로 만든다. lucide 등 외부 세트를 쓰지 않는다 |
| 토큰 | Figma 변수를 vanilla-extract 테마 변수(`createGlobalTheme` / `createThemeContract`)로 옮긴다. 이름은 Figma를 따르되 정리 요청(아래)이 반영되면 맞춘다 |

**Radix인 이유.**
- `vaul`이 Radix Dialog 위에 만들어져 있어 포커스 처리와 겹침 순서가 충돌하지 않는다.
- 디자인 일부가 shadcn에서 왔는데 shadcn 코드가 Radix 기반이라, 구조를 그대로 참고할 수 있다.
- 필요한 프리미티브(Select, Checkbox, RadioGroup, Switch, Tabs, Dialog, Popover)가 다 있다.

대안은 Base UI와 React Aria다. P0에서 Radix의 React 19 호환과 최근 유지보수 상태를 확인하고, 문제가 있으면 Base UI로 바꾼다. 바뀌는 범위는 `src/ui/components/*` 파일 안쪽뿐이다.

---

## 1. 토큰

### 색

| 컬렉션 | 내용 | 옮기는 방식 |
|---|---|---|
| `Atomic` | 10개 색 계열 × 50~900 + `Common/0`(검정)·`Common/100`(흰색), 모드 1개 | `vars.palette.violet[400]` 같은 원시 값. 컴포넌트에서 직접 쓰지 않는다 |
| `Sementic` | 38개, Light/Dark 모드. `Color/brand`(10) · `text`(11) · `status`(5) · `interaction`(5) · `surface`(4) · `Background`(3) | `vars.color.*`. 컴포넌트와 화면은 이것만 쓴다 |

주요 의미 색(Light):

| 토큰 | 값 |
|---|---|
| `brand/primary` · `-hover` · `-pressed` · `-subtle` | Violet 400 · 500 · 600 · 50 |
| `brand/accent` 계열 | Coral-red 400 · 500 · 600 · 50 |
| `brand/Primary container` · `on Primary container` | Violet 100 · Violet 300 |
| `text/primary` · `secondary` · `tertiary` · `inverse` · `on-brand` | Neutral 800 · 500 · 300 · 50 · 50 |
| `status/success` · `warning` · `error` | Green 400 · Coral-red 400 · Coral-red 400 |
| `surface/default-border` · `strong-border` · `container` | Neutral 200 · 400 · 50 |
| `Background/normal` · `grey` · `dark` | 흰색 · Neutral 100 · Neutral 900 |
| `interaction/inactive` · `disabled-bg` | Neutral 300 · Neutral 100 |

브랜드 색은 Violet `#633EE7`, 강조는 Coral-red `#E84230`이다.

**다크 모드.** 의미 색에 Dark 값이 이미 정의돼 있다. 출시 범위는 정하지 않았다. 권장안은 이렇다.
- 토큰은 처음부터 `createThemeContract`로 라이트·다크 두 벌을 만든다.
- 출시는 라이트만 한다.
- 이렇게 하면 다크를 켤 때 컴포넌트를 고치지 않아도 된다.

### 간격과 모서리 — 화면 크기에 따라 바뀐다

`Component` 컬렉션에 Mobile/Desktop 모드가 있다.

| 토큰 | Mobile | Desktop |
|---|---|---|
| `Space/1~6` | 4 · 8 · 12 · 16 · 24 · 32 | 같음 |
| `Space/7~10` | 40 · 48 · 64 · 80 | 48 · 64 · 80 · 96 |
| `Radius/1~7` | 4 · 8 · 10 · 12 · 16 · 20 · 24 | 같음 |

옮기는 방식:
- `vars.space[1..10]`, `vars.radius[1..7]`을 CSS 변수로 두고, 데스크탑 미디어 쿼리에서 `space[7..10]`만 바꾼다.
- `sprinkles`의 간격 값은 이 변수를 가리킨다.
- 결과적으로 `<Spacing size={8} />` 하나가 화면 크기에 따라 48 또는 64가 된다(patterns §1의 조건부 값과 별개로 동작).

### 타이포그래피

텍스트 스타일 21개. `Text` 컴포넌트의 `typography` 프리셋 이름으로 쓴다(patterns §2).

| 그룹 | 스타일 (크기/행간) |
|---|---|
| Title | `Title` Kartrider Kor ExtraBold 28/130%, `Title_number` Saira Condensed Bold 28/130% |
| Heading | `2xl` 32 SemiBold · `xl` 28 ExtraBold · `lg` 24 SemiBold · `lg-emphasized` 24 Bold · `md` 20 Regular · `md-emphasized` 20 Bold · `md2` 18 Regular · `md2-emphasized` 18 Bold · `sm` 16 Medium · `sm-emphasized` 16 Bold (모두 130%) |
| Body | `lg` 16 · `md` 14 · `sm` 13, Regular, 140% |
| Label | `lg-emphasized` 16 Bold 140% · `lg` 16 Regular · `md` 14 Medium · `md-emphasized` 14 Bold · `sm` 12 Medium · `xs` 11 Regular (120%) |

- 자간은 -1%, Heading/sm 두 개만 -4%다.
- 코드 이름은 Figma 이름의 공백·하이픈을 정리한다. 예: `Heading/md - emphasized` → `headingMdEmphasized`.

**폰트.**

| 폰트 | 쓰는 곳 | 라이선스·로딩 |
|---|---|---|
| Pretendard | 본문 전부 | OFL. `next/font/local`로 서브셋 woff2 |
| Kartrider Kor ExtraBold | `Title` — 공연 제목과 강조 문구 | 넥슨 폰트. **웹 임베드 라이선스 확인 필요** |
| Saira Condensed Bold | `Title_number` — Kartrider와 함께 쓰는 숫자 | OFL(Google Fonts). `next/font/google` |

### 그림자

`drop shadow` 하나: y 4, blur 4, 검정 10%. Toast가 쓴다.

---

## 2. 레이아웃 그리드와 브레이크포인트

| 프레임 | 폭 | 칼럼 | 간격 | 좌우 여백 |
|---|---|---|---|---|
| Mobile | 390 | 4 | 16 | 24 |
| Tablet(QR 전용) | 1133 | 8 | 20 | 32 |
| Desktop-sm | 1280 | 12 | 24 | 40 |
| Desktop-lg | 1440 | 12 | 24 | 80 |

- **PC 레이아웃이 있다.** [`design-requests.md`](./design-requests.md)의 기획 질문 Q2(호스팅 센터 PC 레이아웃)는 실제 화면 디자인을 읽고 닫는다.
- 태블릿은 QR 체크인 화면에만 쓴다.
- 브레이크포인트는 P1에서 정한다. 지금 문서의 768은 임시값이다. 후보는 이렇다.
  - mobile: 기본
  - desktop: `min-width: 1024px`. 1280 프레임을 기준으로 그 아래 폭에도 데스크탑 배치를 쓴다.
  - QR 화면만 태블릿 폭 대응
- 간격 토큰의 Mobile/Desktop 전환도 같은 브레이크포인트를 쓴다.

---

## 3. 컴포넌트 목록

**출처** 열의 뜻:
- **shadcn 변형**: shadcn 키트에서 가져와 크기·상태를 바꾼 것. 구조를 shadcn 코드에서 참고한다.
- **자체**: 처음부터 다른 모양.

**Phase** 열의 뜻: P2는 `src/ui/components`, 도메인 컴포넌트는 처음 쓰는 화면의 Phase가 `features`에 만든다.

| Figma | 출처 | 동작 | 코드 props(제안) | Phase |
|---|---|---|---|---|
| **Button** — `Color` Primary/Secondary/primary 2 × `type` small 32 · medium 45 · Large 56 · round × `Icon` × `Interaction` Normal/Hover/Pressed/Disabled/Selected | shadcn 변형. 아이콘 자리 표시(`square-dashed`)가 키트 그대로, 크기 체계는 새로 만듦(모서리 8/10/12) | `<button>` | `variant: 'primary' \| 'secondary' \| 'subtle'`, `size: 'sm' \| 'md' \| 'lg'`, `shape?: 'round'`, `icon?`. Hover·Pressed·Disabled는 CSS 상태, Selected만 prop | P2 |
| **numbering** — minus/plus × default/pressed | 자체 | `<button>` | 수량 스테퍼(P6)의 부품 | P2 |
| **Input** 4종 — input / text input / icon input / Search, `State` Default/Focus/Filled/disabled | shadcn 변형. 높이 36 → 44, 포커스 링 대신 보라 테두리 | `<input>` | `leading?`(아이콘), `trailing?`(단위 "원", 검색 아이콘). Focus·Filled는 CSS 상태 | P2 |
| **Dropdown** + dropdown item | shadcn 변형(Select). 위아래 화살표 트리거, 선택 항목은 오른쪽 체크 + 배경 | Radix `Select` | `options`, `value`, `onValueChange` | P2 |
| **Sort Dropdown** — 공연임박순/최신등록순 | 자체 | 정렬값이 서버에 하나뿐이라 **고정 라벨**(patterns §13) | — | P5a |
| **Checkbox**(`Box`) — checked × default/disabled | 자체. 원형 20px | Radix `Checkbox` | `checked`, `disabled` | P2 |
| **Radio** — selected | 자체. 20px | Radix `RadioGroup` | 그룹 단위 | P2 |
| **Toggle** — Off/On | 자체. 45×24 iOS형 | Radix `Switch` | `checked`, `onCheckedChange` | P2 |
| **Tabs** — tab + tab item(selected) | 자체. 밑줄형 | Radix `Tabs` | 값은 URL과 묶을 수 있게 제어형(`?tab=`, tech-decisions §3) | P2 |
| **Toast popup** | shadcn 변형(Sonner). 아이콘·액션 없이 문구 한 줄 | `sonner` unstyled | 명령형 `toast()`(tech-decisions §13) | P2 |
| **Badge** — large(숫자)/small(점) | 자체. 알림 배지 | — | `count?` | P2 |
| **Avatar** — 24/32/40 × teal/orange/indigo/grey | 자체. 캐릭터 일러스트 | — | `size`, `color`, `src?` | P2 |
| **Filter Chip** — selected/open 4상태 | 자체 | 팝오버를 연다면 Radix `Popover` | `count?`, `open` | P5a |
| **Tag** 5종 — Ticket state chip(승인완료·선물대기·선물완료·승인대기), tag(공연 태그·티켓 수), role chip(마스터·매니저), Concert state chip(D-day·준비중·지난 공연), money option chip | 자체 | — | 상태 값은 서버 enum과 매핑. 모르는 값은 기본 모양(tech-decisions §4 zod 정책) | P2(공용 칩), 매핑은 사용 Phase |
| **list** — `Hierarchy` 5 × `value type` text/badge/none/account/text+money | 자체. 정보 행(라벨 + 값) | 펼침형은 Radix `Collapsible` | `label`, `value`, `kind` | P2 |
| **List**(호스트 행) — Role tag × Default/add | 자체 | — | 도메인 컴포넌트 | P10a |
| **concert menu** — selected/unselected | 자체. 공연 어드민 사이드메뉴 항목 | — | 도메인 | P11 |
| **Card list**, **example poster** | 자체 | — | 도메인 | P5a |
| **ConcertCard** — 포스터 + 날짜 + 제목 | 자체 | `<Link>` + 인라인 진행 표시(tech-decisions §3) | 도메인 | P5a |
| **Top app bar** — Default/only title/no title/Title+Backward × leading icon × profile, Slot 2개 | 자체 | — | 관객·호스팅 레이아웃 헤더 | P5a, P10a |
| **ic**(아이콘 58종) — 이름 × outline/filled × 24/16/12 | 자체 | — | `<Icon name size variant />`, SVG를 빌드 때 컴포넌트로 | P1 |
| 일러스트 6종 — 포스터 준비중, 티켓 없음, 예매완료, 선물, 검색 결과 없음, 로그인 | 자체 | — | 빈 화면용 이미지 | P2 |

**없는 컴포넌트.** 계획에는 필요한데 디자인 시스템에 아직 없는 것이다. 디자인을 기다리되, 필요하면 Radix 기반으로 먼저 만들고 모양은 비슷한 컴포넌트를 따른다.
- 모달(Dialog), 확인 팝업 — 공연 등록 확인, 거절 사유
- 바텀시트 — `vaul`
- 표(DataTable) — 예매자 관리
- 날짜·시간 입력 — 공연 일정
- 텍스트 영역 — 소개글, 사유
- 이미지 업로드 칸 — 포스터, 프로필
- 스켈레톤
- 페이지네이션 또는 더 보기

---

## 4. 구현 규칙

- **파일**: `src/ui/components/<Name>/{<Name>.tsx, <Name>.css.ts, <Name>.stories.tsx}`. 도메인 컴포넌트는 `features/*`.
- **변형**: `recipe()`로 정의하고 `RecipeVariants`로 props 타입을 만든다.
- **Radix 상태**: `data-state`·`data-disabled`를 `.css.ts`의 `selectors`로 받는다. 예: `'&[data-state="checked"]'`.
- **Figma 상태 → 코드**: Hover·Pressed·Focus·Filled·Disabled는 prop이 아니라 CSS 상태(`:hover`, `:active`, `:focus-visible`, `:placeholder-shown`, `:disabled`)다. prop으로 두는 것은 Selected처럼 앱이 정하는 상태뿐이다.
- **토큰만 쓴다**: 색·간격·모서리에 리터럴을 쓰지 않는다. 디자인에 토큰이 없는 값이 나오면 디자이너에게 묻는다(patterns §3 "간격을 추측하지 않는다").
- **shadcn 참고**: shadcn 변형 컴포넌트는 shadcn 소스의 Radix 조합과 접근성 속성을 참고하고, Tailwind 클래스는 가져오지 않는다.
- **Storybook**: 각 컴포넌트의 Figma 변형 전부를 스토리로 둔다. 디자이너가 Figma와 나란히 비교할 수 있게 한다.

---

## 5. 디자이너에게 전할 정리 요청

미완성 파일이라 당연한 것들이다. 코드로 옮기기 전에 정리되면 토큰 이름을 한 번만 정하면 된다.

| 대상 | 지금 | 요청 |
|---|---|---|
| 의미 색 이름 중복 | `text/primary`와 `text/primary-label`이 같은 값(secondary·tertiary도) | 한 벌로 합치기 |
| 경고와 에러 | `status/warning` = `status/error` = Coral-red 400 | 경고를 다른 색(예: Orange·Yellow)으로 할지 |
| 다크의 `brand/primary-subtle` | Blue/800(다른 brand 색은 Violet 계열) | Violet 계열인지 확인 |
| 모서리 변수 | Toast·Dropdown 항목의 모서리가 `Space` 변수에 묶임 | `Radius` 변수로 |
| 이름 규칙 | 컬렉션 `Sementic`, `Background`만 대문자, `on Primary container` 공백 | 오타·대소문자 정리 |
| Input 플레이스홀더 | "stakeholder" | "placeholder" 또는 실제 예시 문구 |
| Alert 예시 | shadcn 원본 Button·lucide 아이콘·Geist 폰트가 남은 미등록 프레임(Top bar 페이지) | 컴포넌트로 만들거나 지우기 |
| 아이콘 이름 | `notificatio_onn`, 대소문자 섞임(`Ticket`, `Settings`) | 이름 정리 |
| 없는 컴포넌트 | 3절 목록 | 우선순위: 모달·바텀시트·날짜 입력 |

---

## 6. 확인할 것

| 항목 | 언제 |
|---|---|
| Radix의 React 19 호환과 유지보수 상태 | P0 |
| Kartrider Kor 웹 임베드 라이선스 | P1 전 |
| 다크 모드 출시 범위 | P1 전 |
| 브레이크포인트 확정 | P1 |
| "Sample GUI" 페이지(실제 화면 디자인일 수 있음) | 다음에 읽는다 |
