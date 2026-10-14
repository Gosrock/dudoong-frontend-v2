# DuDoong v2 — 디자인 시스템과 컴포넌트 구현

> 2026-10-15 작성. Figma "디자인 시스템" 파일(`0QD9tGSt8ZciDqe7ol2gYH`)의 🎨Foundation 6페이지와 🧩Components 16페이지(+ 빈 "Page 22", 표지 "Thumbnail")를 `figma-console` MCP로 읽고 썼다. 같은 날 검증 루프 3회로 Figma를 다시 읽어 고쳤다(§7 검증 기록).
> **디자이너가 작업 중인 파일이다.** 값과 이름은 바뀔 수 있다. P1·P2를 시작할 때 다시 읽고 이 문서를 갱신한다. "Sample GUI" 페이지(프레임 96개)는 사용 컴포넌트 목록만 봤다(§6).
>
> 관련 문서: 스타일링 방식 [`tech-decisions.md`](./tech-decisions.md) §6, 반응형·텍스트·레이아웃 패턴 [`patterns.md`](./patterns.md) §1~§3, Phase [`plan.md`](./plan.md) P1·P2, 와이어프레임 관측 [`figma-structure.md`](./figma-structure.md).

## 결정 요약

| 항목 | 결정 |
|---|---|
| 동작 | **Radix 프리미티브(헤드리스)** 에 맡긴다. 키보드 조작, 포커스, 스크린리더 속성, 폼 연동을 직접 만들지 않는다 |
| 모양 | vanilla-extract로 디자인 시스템 토큰에 맞춰 입힌다. 컴포넌트마다 `.css.ts` 하나 |
| shadcn/ui | 코드를 가져오지 않는다. Tailwind 기반이라 스타일 체계가 둘이 되고, 디자인 시스템 컴포넌트는 모양이 shadcn과 다르다. Radix 조합과 접근성 속성을 볼 참고서로만 쓴다(shadcn도 Radix 위에 Tailwind 클래스를 얹은 것이다) |
| 토스트 | `sonner`의 unstyled 모드 + vanilla-extract |
| 바텀시트 | `vaul`(이미 채택, Radix Dialog 기반) |
| 아이콘 | 디자인 시스템의 자체 세트(`ic`)를 SVG 컴포넌트로 만든다. lucide 등 외부 세트를 쓰지 않는다 |
| 토큰 | Figma 변수를 vanilla-extract 테마 변수(`createGlobalTheme` / `createThemeContract`)로 옮긴다. 이름은 Figma를 따르되 정리 요청(§5)이 반영되면 맞춘다 |

**shadcn과의 관계(검증 결과).** 컴포넌트의 모양과 속성 체계는 자체다. 속성 이름(`Color`/`type`/`Interaction`, `State`, `selected`)이 shadcn 키트 방식(`Variant`/`Size`/`State`)과 다르고, 크기·모서리(Button 32/45/56·r8/10/12, Input 44h)도 shadcn과 다르다. 그래서 "shadcn 컴포넌트를 가져와 커스텀했다"고 할 컴포넌트는 없다. 다만 shadcn 키트를 **작업 바탕으로 쓴 흔적**은 여러 곳에 있다.

| 흔적 | 위치 |
|---|---|
| 아이콘 세트 `ic`의 선 굵기 2px가 shadcn 키트 원격 변수 `tw/stroke-width/stroke-2`(44개 변형)·`mode/stroke-width`(40개 레이어)에 묶여 있다. 선 끝·꺾임이 둥근 2px — lucide 그리기 방식 | Icons 페이지 `36:178` |
| `ic/favorite`의 선 색이 shadcn 원격 `mode/foreground` | 같은 세트 |
| Toast 테두리 굵기가 shadcn 원격 `mode/border-width` | `303:2665` |
| Search Field 안 검색 아이콘이 원격 인스턴스 `icon/search` | `73:19` |
| 대시보드 예시 안 Alert에 숨김 처리된 shadcn Button(lucide `square-dashed`, Geist 폰트) | `197:2968` > `197:2975` |
| "Sample GUI"가 shadcn·macOS·iOS 키트와 디자인 시스템 컴포넌트를 섞어 시안을 잡았다 | §6 |

**아이콘 세트는 lucide를 바탕으로 다듬었을 가능성이 높다**(이름도 chevron-*, search, calendar, clock, home, settings, mail 등이 lucide와 겹친다). 그래도 Ticket·qr·dashboard처럼 자체 아이콘이 섞여 있어 코드는 Figma에서 SVG를 뽑는 방식(결정 요약의 "아이콘")을 유지한다. 원격 변수 연결은 코드에 영향이 없다 — SVG에는 굵기 2가 값으로 남는다.

3절 표의 "참고할 shadcn" 열은 출처가 아니라 **동작 구조가 같은 shadcn 컴포넌트**를 적은 것이다.

**Radix인 이유.**
- `vaul`이 Radix Dialog 위에 만들어져 있어 포커스 처리와 겹침 순서가 충돌하지 않는다.
- 같은 동작을 Radix로 짠 shadcn 코드를 구조 참고서로 쓸 수 있다.
- 필요한 프리미티브(Select, Checkbox, RadioGroup, Switch, Tabs, Collapsible, Dialog, Popover)가 다 있다.

대안은 Base UI와 React Aria다. P0에서 Radix의 React 19 호환과 최근 유지보수 상태를 확인하고, 문제가 있으면 Base UI로 바꾼다. 바뀌는 범위는 `src/ui/components/*` 파일 안쪽뿐이다.

---

## 1. 토큰

### 색

| 컬렉션 | 내용 | 옮기는 방식 |
|---|---|---|
| `Atomic` | 10개 색 계열 × 50~900 + `Common/0`(검정)·`Common/100`(흰색), 모드 1개, 102개 | `vars.palette.violet[400]` 같은 원시 값 |
| `Sementic` | 38개, Light/Dark 모드. `Color/brand`(10) · `text`(11) · `status`(5) · `interaction`(5) · `surface`(4) · `Background`(3). 하나를 빼고 모두 Atomic을 가리킨다(예외: `surface/default-label` Dark가 `#FFFFFF` 직접 값) | `vars.color.*` |

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

**원시 색을 컴포넌트가 직접 쓰는 곳이 있다.** 원칙은 "컴포넌트와 화면은 의미 색만 쓴다"이지만, 지금 디자인은 아래가 원시 색에 묶여 있다.

| 컴포넌트 | 원시 색 |
|---|---|
| Avatar | Teal/300, Orange/300, Violet/200 |
| role chip(마스터·매니저) | Purple/50·400, Teal/50·400 |
| Ticket state chip 선물대기 | 배경 Coral-red/50(글자는 `brand/accent`) |
| Concert state chip D-day | 배경 Coral-red/50, 글자 Coral-red/200 |
| Concert state chip 지난 공연 | Neutral/50 |
| concert menu 선 | Neutral/900 |
| Toggle 손잡이 | Common/100 |
| 포스터 준비중 | Neutral/100(배경)·Neutral/600(그림) |
| `ic/chat`의 점 3개 | Common/100 |

Light 값이 같은 의미 색이 있는 것도 있다(Coral-red/50 = `brand/accent-subtle`, Neutral/50 = `surface/container`, Neutral/100 = `Background/grey`, Common/100 = `Background/normal`, Neutral/900 = `Background/dark`). 하지만 Dark 값은 다르므로 기계적으로 바꾸지 않는다. 코드에서는 이 색들을 컴포넌트 전용 의미 토큰으로 묶는다(`vars.color.avatar.teal`, `vars.color.role.master` 등). 디자이너가 의미 색을 추가하면 그 이름으로 바꾼다(§5).

**쓰이지 않는 의미 색.** 컴포넌트 어디에도 묶이지 않았다: `text/tertiary-label`, `text/disabled-label`, `text/danger-label`, `brand/accent-pressed`, `brand/accent-hover`, `status/warning`, `status/warning-subtle`, `status/error`, `Background/dark`. 토큰으로는 옮기되, 정리 요청(§5) 결과에 따라 지운다.

**다크 모드.** 의미 색에 Dark 값이 이미 정의돼 있다. 출시 범위는 정하지 않았다. 권장안은 이렇다.
- 토큰은 처음부터 `createThemeContract`로 라이트·다크 두 벌을 만든다.
- 출시는 라이트만 한다. 원시 색을 직접 쓰는 컴포넌트(위 표)는 다크 값이 없어서 다크를 켜기 전에 정리가 필요하다.

### 간격과 모서리 — 화면 크기에 따라 바뀐다

`Component` 컬렉션에 Mobile/Desktop 모드가 있다. 용도는 디자이너가 변수 설명에 적은 것이다.

| 토큰 | Mobile | Desktop | 용도 |
|---|---|---|---|
| `Space/1` | 4 | 4 | 아이콘-텍스트 사이, 뱃지 내부 |
| `Space/2` | 8 | 8 | 컴포넌트 내부 작은 간격 |
| `Space/3` | 12 | 12 | |
| `Space/4` | 16 | 16 | 컴포넌트 내부 기본 패딩 |
| `Space/5` | 24 | 24 | 컴포넌트 간 간격 |
| `Space/6` | 32 | 32 | |
| `Space/7` | 40 | 48 | 섹션 간 간격 |
| `Space/8` | 48 | 64 | |
| `Space/9` | 64 | 80 | 페이지 레벨 간격 |
| `Space/10` | 80 | 96 | |
| `Radius/1~7` | 4 · 8 · 10 · 12 · 16 · 20 · 24 | 같음 | |

옮기는 방식:
- `vars.space[1..10]`, `vars.radius[1..7]`을 CSS 변수로 두고, 데스크탑 미디어 쿼리에서 `space[7..10]`만 바꾼다.
- `sprinkles`의 간격 값은 이 변수를 가리킨다.
- 결과적으로 `<Spacing size={8} />` 하나가 화면 크기에 따라 48 또는 64가 된다(patterns §1의 조건부 값과 별개로 동작).
- 원형은 토큰이 없다. 코드에서 `9999px`로 둔다.

### 타이포그래피

텍스트 스타일 21개. `Text` 컴포넌트의 `typography` 프리셋 이름으로 쓴다(patterns §2). 표의 이름은 정리해서 적었다. Figma 원래 이름은 `Heading/md - emphasized`(공백-하이픈-공백)와 `Heading/lg-emphasized`(붙임)가 섞여 있다.

| 그룹 | 스타일 (크기/행간) |
|---|---|
| Title | `Title` Kartrider Kor ExtraBold 28/130%, `Title_number` Saira Condensed Bold 28/130% |
| Heading | `2xl` 32 SemiBold · `xl` 28 ExtraBold · `lg` 24 SemiBold · `lg-emphasized` 24 Bold · `md` 20 Regular · `md-emphasized` 20 Bold · `md2` 18 Regular · `md2-emphasized` 18 Bold · `sm` 16 Medium · `sm-emphasized` 16 Bold (모두 130%) |
| Body | `lg` 16 · `md` 14 · `sm` 13, Regular, 140% |
| Label | `lg-emphasized` 16 Bold 140%. 나머지 5개는 120% — `lg` 16 Regular · `md` 14 Medium · `md-emphasized` 14 Bold · `sm` 12 Medium · `xs` 11 Regular |

- 자간은 -1%, Heading/sm 두 개만 -4%다.
- 텍스트 스타일은 변수에 묶여 있지 않다.
- 코드 이름 예: `Heading/md - emphasized` → `headingMdEmphasized`.

**텍스트 스타일 없이 쓰인 글자가 있다.**
- ConcertCard 제목은 Kartrider Kor ExtraBold **18**이다. Title 스타일은 28 하나뿐이라 맞는 프리셋이 없다. 프리셋 `titleSm`(18) 추가를 요청한다(§5).
- Input·Dropdown의 입력 글자(Pretendard Medium 14), Badge 숫자(흰색 12), list의 "복사" 버튼(SemiBold 10)도 스타일이 연결돼 있지 않다. 코드에서는 가장 가까운 프리셋(`labelMd`, `labelSm`)을 쓴다.

**폰트.**

| 폰트 | 쓰는 곳 | 라이선스·로딩 |
|---|---|---|
| Pretendard | 본문 전부 | OFL. `next/font/local`로 서브셋 woff2 |
| Kartrider Kor ExtraBold | `Title` — 공연 제목과 강조 문구(디자이너 설명), ConcertCard 제목 | 넥슨 폰트. **웹 임베드 라이선스 확인 필요** |
| Saira Condensed Bold | `Title_number` — Kartrider와 함께 쓰는 숫자 | OFL(Google Fonts). `next/font/google` |

### 그림자와 스타일

- 이펙트 스타일 `drop shadow` 하나: y 4, blur 4, 검정 10%. Toast가 쓴다(테두리 `surface/strong-border` 1px도 있다).
- 페인트 스타일은 0개다. 색은 변수로만 정의돼 있다.

---

## 2. 레이아웃 그리드와 브레이크포인트

| 프레임 | 폭 | 칼럼 | 간격 | 좌우 여백 |
|---|---|---|---|---|
| Mobile | 390 | 4 | 16 | 24 |
| Tablet(QR 전용, 프레임 이름 "Tablet-QR만") | 1133 | 8 | 20 | 32 |
| Desktop-sm | 1280 | 12 | 24 | 40 |
| Desktop-lg | 1440 | 12 | 24 | 80 |

- 그리드 스타일로 등록된 것은 `mobile grid`와 `desktop-lg grid` 둘이다. 나머지 두 프레임은 프레임에 직접 칼럼을 넣었다. 행·베이스라인 그리드는 없다.
- **PC 레이아웃이 있다.** [`design-requests.md`](./design-requests.md)의 기획 질문 Q2(호스팅 센터 PC 레이아웃)는 실제 화면 디자인을 읽고 닫는다.
- 브레이크포인트는 P1에서 정한다. 지금 문서의 768은 임시값이다. 후보는 이렇다.
  - mobile: 기본
  - desktop: `min-width: 1024px`. 1280 프레임을 기준으로 그 아래 폭에도 데스크탑 배치를 쓴다.
  - QR 화면만 태블릿 폭 대응
- 간격 토큰의 Mobile/Desktop 전환도 같은 브레이크포인트를 쓴다.

---

## 3. 컴포넌트 목록

모든 컴포넌트는 **자체 디자인**이다(결정 요약의 "shadcn과의 관계"). "참고할 shadcn" 열은 같은 동작을 Radix로 짠 shadcn 컴포넌트다. 구조와 접근성 속성을 참고할 때 연다.

**Phase**: P2는 `src/ui/components`, 도메인 컴포넌트는 처음 쓰는 화면의 Phase가 `features`에 만든다.

| Figma | 동작 | 참고할 shadcn | 코드 props(제안)·메모 | Phase |
|---|---|---|---|---|
| **Button** — `Color` Primary/Secondary/primary 2 × `type` small 32 · medium 45 · Large 56 · round × `Icon` × `Text` × `Interaction` Normal/Hover/Pressed/Disabled/Selected, 텍스트 속성 `Label` | `<button>` | Button | `variant: 'primary' \| 'secondary' \| 'tonal'`(primary 2 = 배경 `brand/Primary container`, 글자 `text/brand-label`. 토큰 `brand/primary-subtle`과 다른 색이라 `subtle`로 부르지 않는다), `size: 'sm' \| 'md' \| 'lg'`, `icon?`, 아이콘만 있는 버튼은 `iconOnly`. 모서리 8/10/12. **변형이 듬성듬성하다**(240개 조합 중 27개): Hover는 Primary small·Large에만, Selected는 Secondary medium에만, primary 2는 Large에만 있다. 코드는 빈 조합을 같은 규칙으로 채운다. Secondary 글자색이 크기마다 다르다(small `text/primary`, medium·Large `text/secondary-label`, Large 아이콘형 `text/secondary`) — 코드는 하나로 통일. Primary medium 아이콘형만 46h. Hover·Pressed·Disabled는 CSS 상태, Selected만 prop | P2 |
| Button `round` | `<button>` | — | 56 원형 아이콘 버튼(FAB). 배경이 `text/primary`(검정). `variant`가 아니라 별도 `Fab` 컴포넌트로 둔다 | P2 |
| **numbering** — minus/plus × default/pressed, 20×20 | `<button>` | — | 수량 스테퍼(P6)의 부품 | P2 |
| **Input** 3종 — input field · text input(단위 접미사 "원") · icon input, `State` Default/Focus/Filled/disabled | `<input>` | Input | `leading?`(아이콘), `trailing?`(단위). 44h, 모서리 8, 포커스는 보라 테두리. Focus·Filled는 CSS 상태 | P2 |
| **Search Field** — Default/Focus/Filled(disabled 없음) | `<input type="search">` | Input | 검색 아이콘이 외부 라이브러리 아이콘이다. 코드는 `ic/search`를 쓴다 | P2 |
| **Dropdown** — 트리거(상태 1개) + dropdown item(selected) | Radix `Select` | Select / Combobox | 트리거 아이콘이 위아래 화살표(`ic/up down`)라 shadcn Combobox 모양에 가깝다. 열린 목록은 컴포넌트가 아닌 예시 프레임(`284:1755`)이다. placeholder·disabled·에러 상태 없음. placeholder 스타일은 Radix의 `[data-placeholder]`로 받는다 | P2 |
| **Sort Dropdown** — 공연임박순/최신등록순 | — | — | 정렬값이 서버에 하나뿐이라 **고정 라벨**(patterns §13) | P5a |
| **Checkbox**(`Box`) — `checked` × `Status` default/disabled | Radix `Checkbox` | Checkbox | 원형 20px. 채움 색이 `text/primary-label`(검정)이다 — 브랜드색이 아니다 | P2 |
| **Radio** — selected | Radix `RadioGroup` | Radio Group | 20px, 점 색 검정. disabled 없음 | P2 |
| **Toggle** — Off/On | Radix `Switch` | Switch | 45×24. disabled 없음 | P2 |
| **Tabs** — `tab`(공연/호스트 2개 고정) + tab item(selected) | Radix `Tabs` | Tabs | 밑줄형(아래 2px `brand/primary`). 탭 개수는 코드에서 자유롭게. 선택 탭 44h·미선택 42h 높이 차는 정리 요청. 값은 URL과 묶을 수 있게 제어형(`?tab=`, tech-decisions §3) | P2 |
| **Toast popup** — 1종 | `sonner` unstyled | Sonner | 358×54, 모서리 12, Body/lg 16 가운데 정렬, 아이콘·액션 없음. 성공·에러 구분 없음. 명령형 `toast()`(tech-decisions §13) | P2 |
| **Badge** — large(숫자 20×20)/small(점 8) | — | — | 알림 배지. large는 고정 20×20이라 두 자리 숫자를 못 담는다. 코드는 최소 폭 20 + 좌우 패딩으로 늘린다 | P2 |
| **Avatar** — 9개 변형: 24(grey만) · 32 · 40 × teal/orange/indigo/grey | — | Avatar | 캐릭터 일러스트. `size=40` 변형의 실제 크기는 **45px**, 호스트 행에서는 60px로 늘려 쓴다. 사진 변형이 없다 — 프로필 이미지(PM-3)를 어디에 보여 줄지는 디자인 확인 | P2 |
| **Filter Chip** — selected/open 4상태 | Radix `Popover`(펼칠 때) | — | 선택 여부는 숫자 Badge가 붙는 것뿐이다. 공연 리스트(P5a)와 예매자 관리(P13a)가 같이 쓰는 범용 컴포넌트 | P2 |
| **Tag** 5종 — Ticket state chip(승인완료·선물대기·선물완료·승인대기), tag(공연 태그·티켓 수, 텍스트 속성), role chip(마스터·매니저), Concert state chip(D-day·준비중·지난 공연), money option chip(`amount`) | — | Badge | 상태 값은 서버 enum과 매핑하고, 모르는 값은 기본 모양(tech-decisions §4). **Ticket state chip은 서버 티켓 상태 11가지 중 4가지만 있다**(아래 "없는 상태"). Concert state chip "D-7"은 텍스트 속성이 없다 | P2(공용 칩), 매핑은 사용 Phase |
| **list** — 10개 변형(`Hierarchy` First/second-closed/second-open/second-radio/third × `value type` text/badge/none/account/text+money 중 일부), 텍스트 속성 `label`·`value text` | 펼침형은 Radix `Collapsible` | Collapsible | 정보 행. `second-radio`는 이름과 달리 체크박스(`Box`)를 쓴다. `account`에 컴포넌트가 아닌 "복사" 버튼이 들어 있다 | P2 |
| **List**(호스트 행) — Role tag × Default/add | — | — | 도메인. 아바타 60px | P10a |
| **concert menu** — selected/unselected | — | — | 공연 어드민 사이드메뉴 항목. 도메인 | P11 |
| **Card list**, **example poster**(1~4, 준비중) | — | Card | 도메인. Card list 안에 ⋮(`ic/more`)와 Concert state chip. 호스트·날짜·장소는 컴포넌트에서 각 1줄 말줄임, 제목은 디자이너 메모로 최대 2줄(컴포넌트 설정은 줄 제한 없음) | P5a |
| **ConcertCard** — 포스터 + 날짜 + 제목, 텍스트 속성 `Title`·`date` | `<Link>` + 인라인 진행 표시(tech-decisions §3) | Card | 도메인. 제목 Kartrider 18(§1) | P5a |
| **Top app bar** — `Property 1` Default/only title/no title/Title+Backward × `leading icon` × `profile`(Default/true/false), Slot 2개 | — | — | 관객·호스팅 헤더. 모두 390폭(데스크탑 헤더 없음). `Default, leading icon=true, profile=false` 변형은 제목 옆에 ▾(`ic/chevron-down` 12)가 붙고 아랫줄에 공연 이름이 있는 **공연 전환형**이다(전환 메뉴는 없음). 제목은 텍스트 속성이 아니다. 긴 제목: `Title+Backward` 변형은 1줄 말줄임, 사본 `495:457`은 2줄 말줄임, 나머지 변형은 말줄임 없음 — 하나로 통일 요청(§5) | P5a, P10a |
| **ic** — 아이콘 **44종(변형 58개)**. 기본 24 outline, 둥근 선 2px(lucide 방식). filled는 12종(Ticket·dashboard·home·clock·circle-request/check/reject·Settings는 둘 다, mail·phone·open chat·etc는 filled만), 12px는 8종(more·check·chevron-down/up·gift·add·minus·close, gift·minus는 12px만), 16px는 `information` 1종 | — | — | `<Icon name size variant />`. 빌드 때 SVG를 컴포넌트로. 색은 `currentColor`로 바꾼다 — 예외(다색): `instagram`(그라데이션), 알림 점이 있는 `notificatio_onn`·`Ticket-alert`(빨간 점, `brand/accent`), `Settings` filled(회색 원 배경), `chat`(검정 말풍선 + 흰 점 3개), `gift` 12(검정 채움 + 밝은 리본 선). `chat`·`gift`의 흰 부분은 투명으로 뚫을지 디자이너 확인 | P1 |
| 일러스트 6종 — `img_포스터 준비중` 180×254, `img_티켓 없음`·`img_예매완료`·`img_선물`·`img_검색 결과 없음` 170×170, `img_login` 285×273 | — | — | 모두 벡터라 SVG로 뽑는다. 빈 화면용 | P2 |

### 디자이너가 남긴 사용 메모

예시 텍스트에 적혀 있던 규칙이다.

| 위치 | 메모 | 코드 |
|---|---|---|
| 대시보드 예시 `194:1126`(같은 내용의 사본 `197:3463`) | "티켓이름길면말줄임표하세요" | 티켓 이름 한 줄 말줄임 |
| 같은 화면 | "색상은 고정하려고" | 차트 색 고정 |
| 호스팅 센터 예시 `303:2082` 안 Card list 인스턴스 `303:2546` | "고스락 정기공연 최대 두줄까지 가능합니다" / "장소: 얘네는 한줄만 가능함" | 제목 2줄, 장소 1줄 말줄임 |
| Top app bar 사본 `495:457` | 긴 제목 시험 — 2줄 뒤 말줄임 | 컴포넌트 변형(1줄)과 다르다. 통일 요청(§5) |

### 없는 컴포넌트

계획에는 필요한데 디자인 시스템에 아직 없다. 디자인을 기다리되, 필요하면 Radix 기반으로 먼저 만들고 모양은 비슷한 컴포넌트를 따른다.
- 모달(Dialog), 확인 팝업 — 공연 등록 확인, 거절 사유
- 바텀시트 — `vaul`
- 표(DataTable) — 예매자 관리
- 날짜·시간 입력 — 공연 일정
- 텍스트 영역 — 소개글, 사유
- 이미지 업로드 칸 — 포스터, 프로필
- 스켈레톤
- 페이지네이션 또는 더 보기
- 대시보드 예시(`194:1126`)에만 있는 것: 상태 통계 카드, 도넛 차트와 범례, 진행 막대(입장 현황), 유의사항 안내(Alert)
- 데스크탑 사이드바 메뉴 — Sample GUI의 로컬 `Component 1`(`91:913`, 선택 true/false, 253×48)
- 데스크탑 헤더 — Top app bar는 모두 390폭
- ⋮ 메뉴(DropdownMenu) — Card list에 `ic/more`만 있다. 준비중 공연 삭제(P11)
- 공연 전환 메뉴 — Top app bar 공연 전환형의 ▾
- 로더·스피너 — Button 로딩, 화면 로딩
- 빈 화면·403·404 안내 배치 — 일러스트만 있다
- 단계 표시 — 간편 공연 만들기 2단계
- 체크리스트 — 등록 전 대시보드(GE-7)
- 공지 바 — 티켓탭 승인 알림(T-3)
- 카드 페이저(N/M) — 티켓탭 캐러셀
- 하단 내비게이션·햄버거 드로어·Footer
- QR — 스캐너 프레임, 카메라 권한 거부 화면, QR 전체화면
- 툴팁 — 16px `information` 아이콘 용도
- "NEW" 글자 배지 — 승인 대기 표시(GD-1). Badge는 숫자와 점뿐이다
- 거절 사유 시트 — 사유 4종 선택

### 없는 상태

컴포넌트는 있는데 제품에 필요한 상태가 없다.

| 컴포넌트 | 없는 상태 | 디자인 전까지 코드 |
|---|---|---|
| Input | 라벨, 도움말, 에러 상태·문구, 지우기 버튼 | 에러는 테두리 `status/error` + 아래 문구 Body/sm |
| Button | 로딩 | 라벨 자리에 스피너, 폭 유지 |
| Toggle, Radio | disabled | `interaction/disabled` 계열 |
| Dropdown | placeholder, disabled, 에러, 열린 목록 컴포넌트 | Input과 같은 규칙 |
| Toast | 성공·에러 구분, 액션 | 문구만 |
| Badge | 두 자리 이상 숫자 | 폭 늘림, 99+ |
| Ticket state chip | 서버 상태 11가지(`PENDING_APPROVE` · `REFUSED` · `APPROVED` · `GIFT_PENDING` · `GIFT_EXPIRED` · `GIFT_SENT` · `RECEIVED` · `ENTERED` · `CANCELED` · `REFUND_REQUESTED` · `REFUNDED`) 중 승인대기·승인완료·선물대기·선물완료 4가지만 있다 | 의미별로 나눈다: 거절·취소는 `status/error` 계열(예시 대시보드도 거절에 빨간 아이콘), 환불 요청·환불 완료·입장 완료·만료는 회색(`interaction/disabled-bg`), 받은 선물은 선물 계열 |
| Checkbox | indeterminate(표 전체 선택) | 가운데 가로선 |
| Search Field | 지우기 버튼, disabled | Input과 같게 |
| dropdown item | disabled, hover | `interaction/disabled-text`, hover는 선택 배경 |
| list `second-radio` | 체크 안 된 상태(지금은 회색 체크 하나뿐) | Checkbox 컴포넌트 그대로 |

---

## 4. 구현 규칙

- **파일**: `src/ui/components/<Name>/{<Name>.tsx, <Name>.css.ts, <Name>.stories.tsx}`. 도메인 컴포넌트는 `features/*`.
- **변형**: `recipe()`로 정의하고 `RecipeVariants`로 props 타입을 만든다. Figma에 듬성듬성 있는 변형(Button)은 축마다 규칙을 정해 빈 조합을 채운다.
- **Radix 상태**: `data-state`·`data-disabled`를 `.css.ts`의 `selectors`로 받는다. 예: `'&[data-state="checked"]'`.
- **Figma 상태 → 코드**: Hover·Pressed·Focus·Filled·Disabled는 prop이 아니라 CSS 상태(`:hover`, `:active`, `:focus-visible`, `:placeholder-shown`, `:disabled`)다. prop으로 두는 것은 Selected처럼 앱이 정하는 상태뿐이다.
- **토큰만 쓴다**: 색·간격·모서리에 리터럴을 쓰지 않는다. Figma에 토큰 없이 들어간 값은 가장 가까운 토큰으로 옮긴다.

  | Figma 하드코딩 | 코드 |
  |---|---|
  | 모서리 6 (Ticket·Concert state chip, money option chip) | `radius[1]` 4 또는 `radius[2]` 8 — 디자이너 확인 |
  | 모서리 8 (Filter Chip, ConcertCard 이미지) | `radius[2]` |
  | 모서리 10 (Button medium Disabled `438:1797` — 다른 medium은 `Radius/3`에 묶임) | `radius[3]` |
  | 모서리 12 (아이콘 버튼 `422:630`, 56×56) | `radius[4]` |
  | 모서리 12 (tag 72×24, Toggle 트랙 45×24) · 10 (Badge 20×20, numbering 20×20) · 17 (Checkbox 20×20) · 28 (round Button 56×56) — 높이의 절반 이상, 즉 알약·원형 | 원형 `9999px` |
  | 모서리 3 (tab item) · 4.79 (포스터) | `radius[1]` |
  | 모서리를 `Space` 변수에 묶은 곳(Toast `Space/3`, dropdown item `Space/1`, Card list `Space/4`, Top bar 아이콘 `Space/10`) | 같은 값의 `radius` 토큰(80은 원형) |

  칩 모서리 6처럼 토큰에 없는 값은 디자이너에게 확인한다(§5).
- **원시 색 예외**: §1 표의 컴포넌트는 컴포넌트 전용 의미 토큰으로 묶는다. 화면 코드에서 원시 색을 쓰지 않는다.
- **아이콘**: SVG의 단색 stroke·fill을 `currentColor`로 바꾼다. 다색 아이콘(§3 `ic` 행의 예외)은 원래 색을 유지한다.
- **shadcn 참고**: 같은 동작의 shadcn 소스에서 Radix 조합과 접근성 속성을 참고하고, Tailwind 클래스는 가져오지 않는다.
- **Storybook**: 각 컴포넌트의 Figma 변형 전부를 스토리로 둔다. 디자이너가 Figma와 나란히 비교할 수 있게 한다.

---

## 5. 디자이너에게 전할 정리 요청

미완성 파일이라 당연한 것들이다. 코드로 옮기기 전에 정리되면 토큰 이름을 한 번만 정하면 된다.

**색**

| 대상 | 지금 | 요청 |
|---|---|---|
| 의미 색 이름 중복 | `text/primary`·`tertiary`는 `-label` 짝과 두 모드 모두 같다. `secondary`는 Light만 같고 Dark가 다르다(Neutral 300 대 400) | 한 벌로 합치기. secondary는 어느 Dark 값을 남길지 |
| 경고와 에러 | `status/warning` = `status/error` = Coral-red 400(Dark도 같음) | 경고를 다른 색으로 할지. 지금은 둘 다 컴포넌트에서 안 쓴다 |
| 다크의 `brand/primary-subtle` | Blue/800(다른 brand 색은 Violet 계열) | Violet 계열인지 확인 |
| `on Primary container` | 이름과 달리 money option chip **배경**으로 쓰인다(그 위 글자 `text/inverse`, 대비 Light 3.96:1, Dark 4.35:1) | 이름·용도 정리, 대비 4.5:1 이상 |
| `Primary container` 위 `text/brand-label`(primary 2 버튼) | 대비 Light 4.04:1, **Dark 1.47:1** | Dark 값 조정 |
| Concert state chip D-day | 글자 Coral-red/200 on 배경 Coral-red/50, 대비 2.15:1 | 대비 확보 |
| `surface/default-label` | Dark가 다른 토큰을 가리키지 않고 `#FFFFFF` 직접 값. 이름은 label인데 surface 그룹 | 용도와 그룹 확인 |
| 원시 색 직접 사용 | §1 표(Avatar, role chip, 상태 칩, concert menu, Toggle, 포스터) | 의미 색 추가(예: `avatar/*`, `role/*`, `chip/*`) |
| 의미가 다른 토큰 | round Button 배경 `text/primary`, Checkbox 채움·Radio 점 `text/primary-label`, 지난 공연 칩 글자 `surface/strong-border`, numbering 배경 `surface/default-label` | 배경·채움용 의미 색으로 |
| Atomic 컬렉션 공개 | 라이브러리 공개 대상이고 모든 용도에 쓸 수 있다 | 공개에서 숨기기 |
| Semantic 견본 페이지 | 38개 중 31개만 보이고, "disabled" 견본이 `text/tertiary-label`에 묶여 있다. 라벨 `border-default`·`border-strong` ↔ 변수 `default-border`·`strong-border` | 견본 갱신(코드는 변수 기준) |

**간격·모서리·글자**

| 대상 | 지금 | 요청 |
|---|---|---|
| 모서리 변수 | Toast(`Space/3`), dropdown item(`Space/1`), Card list(`Space/4`), Top bar 아이콘(`Space/10`)의 모서리가 Space 변수에 묶임. Component 변수 17개가 모든 용도로 열려 있어서 생긴다 | `Radius` 변수로. 변수 용도를 Space는 간격·패딩, Radius는 모서리로 제한 |
| 원격 변수 연결 | 아이콘 세트의 선 굵기와 `favorite` 선 색, Toast 테두리 굵기가 shadcn 키트 변수에 묶여 있다 | 연결 끊고 값 또는 자체 변수로 |
| 하드코딩 모서리 | 칩 6, Badge 10, numbering 10, tag 12, Toggle 트랙 12, Checkbox 17, tab item 3, 포스터 4.79, Button medium Disabled 10(형제는 변수) | Radius 토큰으로, 알약·원형은 원형 값으로. 칩 6은 토큰에 없는 값 |
| 텍스트 스타일 미연결 | ConcertCard 제목(Kartrider 18), Input·Dropdown 글자, Badge 숫자, 복사 버튼 | 스타일 연결. Kartrider 18용 `Title` 작은 크기 추가 |
| 이름 규칙 | 컬렉션 `Sementic`, `Background`만 대문자, `on Primary container` 공백, emphasized 표기 혼재(` - emphasized` 대 `-emphasized`), 견본 라벨 `md1` ↔ 스타일 `md`, "Katrider" 오타 | 정리 |

**컴포넌트**

| 대상 | 지금 | 요청 |
|---|---|---|
| Input 플레이스홀더 | "stakeholder" | "placeholder" 또는 실제 예시 문구 |
| Search Field 아이콘 | 외부 라이브러리 `icon/search` | 자체 `ic/search`로 |
| Avatar | `size=40` 변형이 실제 45px, 호스트 행에서 60px | 크기 체계 확인, 사진 표시 여부 |
| Tabs | 2개 고정, 선택 44h·미선택 42h | 탭 개수 자유, 높이 통일 |
| list | `second-radio`가 체크박스를 씀, "복사" 버튼이 컴포넌트가 아님 | 이름 또는 부품 정리 |
| Top app bar | `profile` 값 Default/true/false 중 Default가 하나뿐, 제목이 텍스트 속성 아님, 긴 제목 말줄임이 1줄(`Title+Backward`)·2줄(사본)·없음(나머지)으로 제각각 | 축 정리, 말줄임 1줄·2줄 중 하나로 통일 |
| Button Secondary | 글자색이 크기마다 다름(`text/primary`·`secondary-label`·`secondary`) | 하나로 |
| 없는 상태 | §3 "없는 상태" 표 | 우선순위: Input 에러, Button 로딩, Ticket 거절·환불 칩 |
| 없는 컴포넌트 | §3 "없는 컴포넌트" 목록 | 우선순위: 모달·바텀시트·날짜 입력 |

**아이콘·정리**

| 대상 | 지금 | 요청 |
|---|---|---|
| 아이콘 이름 | `notificatio_onn` 오타, 대소문자 섞임(`Ticket`, `Settings`), 공백(`up down`, `order detail`, `open chat`), 밑줄(`image_add`), `info`(24, 느낌표)와 `information`(16, i)은 다른 그림 | 이름 정리 |
| 세트 밖 낱개 아이콘 | 선물 filled 12(`439:1836`), 선물 outline 낱개 벡터 5개(약 13px, `439:1843~1847`, 선 색은 원격 변수), 컬러 말풍선 30(`422:652`), 검색 20(`321:1558`), `icon/chevron-down` 12·24 낱개 프레임, `image 1 [Vectorized]`(`473:1599`), 외부 `icon/clipboard-list`(`344:370`) | 세트에 넣거나 지우기 |
| 아이콘 색 | 58개 변형 중 54개는 `text/primary-label` 등 변수에 묶여 있다. `phone`·`open chat`·`etc`는 직접 값(#292929·#292828), `instagram`은 그라데이션, `favorite`는 shadcn 원격 `mode/foreground` | 단색은 같은 의미 색으로 |
| Alert 예시 | 대시보드 예시 안 Alert에 숨김 처리된 shadcn Button(`197:2975`) | 지우기 |
| 숨긴 이미지 | Top bar 3개(`197:4241`·`197:4639`·`197:4848`), Icons 2개(`473:1566`·`473:1587`), image 3개(일러스트 원본 `499:1440`·`503:1161`·`506:1636`) | 지우기 |
| 대시보드 예시 | 같은 내용이 두 벌(`194:1126`, `197:3463`) | 하나로 |
| 빈 페이지 | "Page 22" | 지우기 |

---

## 6. Sample GUI 페이지

사용 컴포넌트 목록만 확인했다. 화면 자체는 읽지 않았다. 외부 키트와 디자인 시스템 컴포넌트를 섞은 시안이다.
- **원격 shadcn 키트**: Input, Date Picker Input, Radio Group·Radio, Switch, Pagination, `Decoration`, lucide 아이콘 다수(`circle-dashed`, `calendar`, `plus`, `loader` 등)
- **세 번째 아이콘 세트 `icon/*`(원격)**: search, chevron-up/down/left, arrow-up-right, link, view, image-plus, plus, user, clipboard-list
- **원격 macOS 키트**: Segmented Control, Push/Pulldown/Pop-Up Button, Text Field, Search Field, 표용 List Item·Column Header, 사이드바 `Item`·`Section Header`·`_Disclosure - Header`, `Window`, `Liquid Glass - Medium`
- **원격 iOS 키트**: `Status bar - iPhone`, `Home Indicator`, `StatusBar`
- **디자인 시스템 컴포넌트**: ConcertCard, Filter Chip, Toggle, SortButton, Badge, Ticket state chip, list, Checkbox(`Box`), Avatar, tag, `ic` 다수
- **로컬 전용**: `Component 1`(`91:913`, 데스크탑 사이드바 메뉴), 세트 밖 `icon/settings`(`62:3992`)·`icon/log-out`(`62:3988`)

디자인 시스템 기준으로 보지 않고, 날짜 입력·페이지네이션·데스크탑 사이드바가 필요하다는 신호로 쓴다(§3 "없는 컴포넌트").

---

## 7. 확인할 것

| 항목 | 언제 |
|---|---|
| Radix의 React 19 호환과 유지보수 상태 | P0 |
| Kartrider Kor 웹 임베드 라이선스 | P1 전 |
| 다크 모드 출시 범위 | P1 전 |
| 브레이크포인트 확정 | P1 |
| 실제 화면 디자인 페이지(디자인 시스템 파일 밖) | 받는 대로 |

### 검증 기록

| 회차 | 고친 것 |
|---|---|
| 1회차(2026-10-15) | Button을 "shadcn 변형"으로 본 판단 철회(아이콘 자리는 자체 `ic/name=blank`). Input·Dropdown·Toast도 출처 단정 철회. 아이콘 58종 → 44종(변형 58). Avatar 변형 9개·40=45px. 원시 색 직접 사용, 없는 상태, 사용 메모, Sample GUI 원격 키트, 모서리 변수 오용 범위, 하드코딩 값 표 추가 |
| 2회차(2026-10-15) | shadcn 흔적 재정리 — 아이콘 세트 선 굵기·Toast 테두리가 shadcn 키트 원격 변수에 묶여 있고 아이콘이 lucide 방식(둥근 선 2px)이라 lucide 바탕일 가능성. "원격 인스턴스 없음" 철회. `on Primary container` 용도(배경)와 대비 수치 정정, 아이콘 색 "직접 값" 정정(54/58은 변수). 다색 아이콘 `chat`·`gift` 12, 원시 색 표·모서리 표 보강(알약·원형 정리), Top app bar 말줄임과 공연 전환형, Ticket state chip 11가지 중 4가지, 없는 컴포넌트 15개·없는 상태 4개 추가, Button `variant` `subtle` → `tonal`, Filter Chip P2로 |
