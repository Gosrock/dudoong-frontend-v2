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
| 아이콘 | `ic` 세트는 대부분 lucide(0.4대)에서 가져와 일부를 고친 세트다(아래). 코드는 **Figma에서 SVG를 뽑는 한 경로**로 만든다. `lucide-react`는 쓰지 않는다 — 버전마다 모양이 바뀌고(지금 Figma는 0.460과 그 이전이 섞여 있다), filled 12종·고친 6종·자체 5종은 어차피 Figma에서 뽑아야 하며, 이름도 다르다(`info` = lucide `file-pen` 등). lucide 라이선스(ISC, feather 유래는 MIT) 고지를 넣는다 |
| 토큰 | Figma 변수를 vanilla-extract 테마 변수(`createGlobalTheme` / `createThemeContract`)로 옮긴다. 이름은 Figma를 따르되 정리 요청(§5)이 반영되면 맞춘다 |

**shadcn과의 관계(검증 결과).** 컴포넌트의 모양과 속성 체계는 자체다. 속성 이름(`Color`/`type`/`Interaction`, `State`, `selected`)이 shadcn 키트 방식(`Variant`/`Size`/`State`)과 다르고, 크기·모서리(Button 32/45/56·r8/10/12, Input 44h)도 shadcn과 다르다. 그래서 "shadcn 컴포넌트를 가져와 커스텀했다"고 할 컴포넌트는 없다. 다만 shadcn 키트와 외부 아이콘 세트를 **작업 바탕으로 쓴 흔적**은 여러 곳에 있다.

| 흔적 | 위치 |
|---|---|
| 아이콘 세트 `ic`의 선 굵기 2px가 shadcn 키트 원격 변수 `tw/stroke-width/stroke-2`(44개 변형)·`mode/stroke-width`(40개 레이어)에 묶여 있다. 선 끝·꺾임이 둥근 2px — lucide 그리기 방식 | Icons 페이지 `36:178` |
| `ic/favorite`의 선 색이 shadcn 원격 `mode/foreground` | 같은 세트 |
| Toast 테두리 굵기가 shadcn 원격 `mode/border-width` | `303:2665` |
| Search Field 안 검색 아이콘이 외부 `icon/*` 세트(§6)의 원격 인스턴스 `icon/search`. 세트의 `ic/search`도 이 20px 그림을 24 틀에 넣은 것이다 | `73:19` |
| 대시보드 예시 안 Alert에 숨김 처리된 shadcn Button(lucide `square-dashed`, Geist 폰트) | `197:2968` > `197:2975` |
| "Sample GUI"가 shadcn·macOS·iOS 키트와 디자인 시스템 컴포넌트를 섞어 시안을 잡았다 | §6 |

**아이콘 세트는 대부분 lucide에서 가져왔다(3회차에 SVG 좌표를 lucide 원본과 비교해 확인).**

| 구분 | 개수 | 아이콘 |
|---|---|---|
| 24 outline — lucide(또는 그 원조 feather)와 좌표가 같다 | 26 | 이름이 같은 것: calendar, clock, check, chevron-left/right/up/down, Settings. 이름만 다른 것: Ticket(`ticket`), qr(`qr-code`), backward/forward(`arrow-left/right`), more(`ellipsis-vertical`), add(`plus`), up down(`chevrons-up-down`), circle-check, circle-request(`circle-alert`), panel-open(`panel-left`), dashboard(`layout-panel-left`), people(`users-round`), detail(`file-type-2`), order detail(`clipboard-list`), **info(`file-pen`, 문서와 연필)**, favorite(0.460의 `heart`). 옛 버전 모양: image_add(`image-plus`), menu(feather) |
| 24 outline — lucide를 고쳤다 | 6 | search(20px 그림을 24 틀에), close(plus를 45° 돌린 모양), circle-reject(안쪽 x가 작음), home(feather home에 둥근 모서리), preview(`scan-eye` 변형), Ticket-alert(ticket + 배지) |
| 24 outline — lucide가 아니다 | 5 | blank, notification, notificatio_onn, chat, instagram |
| filled | 12 | lucide에 filled가 없다. 8개는 lucide 외곽선을 채운 모양, mail·phone·open chat·etc는 자체 |
| 12px · 16px | 9 | chevron-down/up, add, minus, more, close 12와 information 16은 lucide를 작게 줄인 것(선 1·1.333). check 12는 선 1.5, gift 12는 자체 |

lucide 원본 비교본은 unpkg `lucide-static@0.460.0`과 최신(v1.57)이다. 최신에서는 heart·menu·search·image-plus 모양이 바뀌었다.

3절 표의 "참고할 shadcn" 열은 출처가 아니라 **동작 구조가 같은 shadcn 컴포넌트**를 적은 것이다. 원격 변수 연결은 코드에 영향이 없다 — SVG에는 선 굵기 2가 값으로 남는다.

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

**다크 모드(결정 2026-10-17).** 토큰은 처음부터 라이트·다크 두 벌로 만들고(`createThemeContract`) 출시는 라이트만 한다. 다크 값은 `<html data-theme="dark">`일 때만 적용된다(`src/ui/theme/tokens.css.ts`). 다크를 켤 때 컴포넌트를 고치지 않아도 되지만, 원시 색을 직접 쓰던 컴포넌트(위 표 — 코드에서는 `avatar`·`role`·`chip` 전용 토큰)는 다크 값이 디자인 대기라 라이트와 같다.

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

텍스트 스타일 21개. `Txt` 컴포넌트의 `typography` 프리셋 이름으로 쓴다(patterns §2). 표의 이름은 정리해서 적었다. Figma 원래 이름은 `Heading/md - emphasized`(공백-하이픈-공백)와 `Heading/lg-emphasized`(붙임)가 섞여 있다.

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
| Pretendard | 본문 전부 | OFL. npm `pretendard`의 가변 폰트 **동적 서브셋 CSS**를 루트 레이아웃에서 불러온다(화면에 나온 글자 조각만 받는다) |
| Kartrider Kor ExtraBold | `Title` — 공연 제목과 강조 문구(디자이너 설명), ConcertCard 제목 | 넥슨 폰트. **웹 임베드 라이선스 확인 필요** — P1에서는 불러오지 않고 font 스택만 둔다(설치돼 있으면 쓰고 아니면 Pretendard) |
| Saira Condensed Bold | `Title_number` — Kartrider와 함께 쓰는 숫자 | OFL(Google Fonts). `next/font/google` |

GUI 화면 파일에서 본 것(2026-10-15):
- 숫자 폰트는 **Saira Condensed Bold**다. GUI 화면 대시보드의 공연명 숫자·통계 숫자(`329:7470`, `525:3580`, `525:4095` 등)에 실제로 쓰였고 메모 `295:1070`도 "Saira condensed"다. 메모 `315:2209` 한 곳만 "saira extra condensed"라고 적어 디자이너 확인만 남긴다([`design-requests.md`](./design-requests.md) 4절 Q14). **2026-10-25 갱신**: 위 노드는 지워진 옛 대시보드 프레임 안에 있었다. 새 대시보드(`669:2787`·`712:1646` 등)는 숫자를 Pretendard 700으로 그렸고, Saira Condensed는 옛 제목형 판 `336:13781`에만 남았다(Q14 참고).
- "폰트고민" 페이지가 제목 후보 6종(학교안심 곧은제목, Cafe24 PRO Slim, 넥슨 카트 고딕, 신라고딕, 서평원 꺾깎체, 뉴트로닉)을 비교했고 결론은 "카트라이더 + 숫자"다.
- Inter·Geist는 흑백 섹션 `331:11009`의 주문상세·목록 7개 프레임(`331:11010`~`331:11519`, 원격 컴포넌트 안팎), 작업용 `338:14624`, 회색 와이어 `338:15509`(Geist "미리보기"·"저장하기"), 숨긴 Outline Button "Label"(`329:7498` 등), 삭제예정 체크아웃, 메모 레이어에 있다(목록은 `gui-screens.md` §6). 구현은 Pretendard로 통일한다.

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
- 위 표는 디자인 시스템 파일의 그리드 프레임이다. **실제 화면의 반응형은 GUI 화면 파일의 스펙을 따른다**(아래). Tablet 1133은 디자인 시스템 파일에서는 "QR 전용"이지만 GUI 스펙에서는 데스크탑 레이아웃의 최소 폭이다 — 같은 것인지는 [`design-requests.md`](./design-requests.md) Q39(gui-screens §3 "스펙에서 비는 것" 10번).
- **호스팅 PC 레이아웃(GUI 2026-10-25 "Ready for dev", [`gui-screens.md`](./gui-screens.md) §3).** 옛 `Desktop - 27`(`14:1304`, 사이드바 255 + 본문 793 + 우측 392)은 지워지고 아래로 바뀌었다(design-requests Q9 해결).
  - 반응형 스펙(페이지 `669:2109`): **1133 미만 모바일**(기준 390), Tablet 1133~1279(기준 1133), Desktop s 1280~1439(기준 1280), Desktop L 1440~(기준 1440). 1133 이상은 모두 데스크탑 레이아웃이다.
  - 공연 안의 화면: 상단 바 58(`Top bar_Host`) + 공연 사이드바 268 고정 + 가운데 fill(최소 572 ~ 최대 1261) + 우측 일정 패널 286 / 335 / 388(구간별 고정, **등록 후 대시보드만**). **1133~1279도 3단 그대로**다 — 우측 패널을 본문 아래로 내리지 않는다.
  - 공연 밖 화면(공연준비 홈 PC `741:30197`~`741:30233`): 상단 바만 있고 사이드바가 없다. 좌우 여백·본문 폭 40·1053(1133), 40·1200(1280), 80·1280(1440), 1920은 본문 1280. 여백 40·80은 위 표의 Desktop-sm/lg 여백과 같다.
  - 칼럼 그리드는 이 프레임들에 붙어 있지 않다. 사이드바·3단은 12칼럼을 따르지 않는다.
  - 스펙 숫자와 프레임 값이 조금 다른 곳, 대시보드 외 화면의 우측 패널, 기본 정보 2열 접힘 등 빈 곳은 design-requests Q39.
- **관객 PC**: 관객 화면(GUI)은 모두 390폭이다. PC 구조는 와이어프레임 WEB 섹션(`FUQb8ldGBp3uYUuXPV5FDC` `640:19274`, 1440폭, 본문 1200)에만 있다 — plan P4s. **관객 데스크탑 기준은 1024**(사용자 결정, plan P4s)로 두고 바꾸지 않는다. 관객도 1133으로 맞출지는 design-requests Q38.
- **브레이크포인트 — 호스팅 1133, 관객 1024(Q38 대기).**
  - 지금 코드(P1): desktop ≥ 1024px, wide ≥ 1280px(`src/ui/theme/breakpoints.ts`). 이것은 옛 `Desktop - 27` 기준(1024~1279에서 우측 패널을 본문 아래로)으로 정한 값이다.
  - 호스팅: 1133 미만 모바일, 1133 · 1280 · 1440에서 우측 패널 폭이 바뀐다(GUI 확정).
  - 관객: 1024 미만 모바일(태블릿 포함), 이상 PC.
  - **토큰을 어떻게 나눌지(호스팅용 경계를 따로 둘지, 하나로 합칠지)는 P4s 착수 전에 정한다**(Q38 답도 함께 본다).
  - 모바일에서는 사이드바 대신 헤더다. 공연 안 모바일 메뉴가 햄버거 드로어인지 제목 ▾ 바텀시트인지는 design-requests Q37.
- 간격 토큰의 Mobile/Desktop 전환도 같은 브레이크포인트를 쓴다.

---

## 3. 컴포넌트 목록

모든 컴포넌트는 **자체 디자인**이다(결정 요약의 "shadcn과의 관계"). "참고할 shadcn" 열은 같은 동작을 Radix로 짠 shadcn 컴포넌트다. 구조와 접근성 속성을 참고할 때 연다.

**Phase**: P2는 `src/ui/components`, 도메인 컴포넌트는 처음 쓰는 화면의 Phase가 `features`에 만든다.

| Figma | 동작 | 참고할 shadcn | 코드 props(제안)·메모 | Phase |
|---|---|---|---|---|
| **Button** — `Color` Primary/Secondary/primary 2 × `type` small 32 · medium 45 · Large 56 · round × `Icon` × `Text` × `Interaction` Normal/Hover/Pressed/Disabled/Selected, 텍스트 속성 `Label` | `<button>` | Button | `variant: 'primary' \| 'secondary' \| 'tonal'`(primary 2 = 배경 `brand/Primary container`, 글자 `text/brand-label`. 토큰 `brand/primary-subtle`과 다른 색이라 `subtle`로 부르지 않는다), `size: 'sm' \| 'md' \| 'lg'`, `icon?`, 아이콘만 있는 버튼은 `iconOnly`. 모서리 8/10/12. **변형이 듬성듬성하다**(240개 조합 중 27개): Hover는 Primary small·Large에만, Selected는 Secondary medium에만, primary 2는 Large에만 있다. 코드는 빈 조합을 같은 규칙으로 채운다. Secondary 글자색이 크기마다 다르다(small `text/primary`, medium·Large `text/secondary-label`, Large 아이콘형 `text/secondary`) — 코드는 하나로 통일. medium 아이콘형(Primary `36:68`·Secondary `36:118`)은 46h, 아이콘 없는 medium은 45h. Selected는 글자 `text/primary-label` + 테두리 `strong-border`. Hover·Pressed·Disabled는 CSS 상태, Selected만 prop | P2 |
| Button `round` | `<button>` | — | 56 원형 아이콘 버튼(FAB). 배경이 `text/primary`(검정). `variant`가 아니라 별도 `Fab` 컴포넌트로 둔다 | P2 |
| **numbering** — minus/plus × default/pressed, 20×20 | `<button>` | — | 수량 스테퍼(P6)의 부품 | P2 |
| **Input** 3종 — input field · text input(단위 접미사 "원") · icon input, `State` Default/Focus/Filled/disabled | `<input>` | Input | `leading?`(아이콘), `trailing?`(단위). 44h, 모서리 8, 포커스는 보라 테두리. Focus·Filled는 CSS 상태 | P2 |
| **Search Field** — Default/Focus/Filled(disabled 없음) | `<input type="search">` | Input | 검색 아이콘이 외부 `icon/search`다. 코드는 `ic/search`를 쓴다 | P2 |
| **Dropdown** — 트리거(상태 1개) + dropdown item(selected) | Radix `Select` | Select / Combobox | 트리거 아이콘이 위아래 화살표(`ic/up down`)라 shadcn Combobox 모양에 가깝다. 열린 목록은 컴포넌트가 아닌 예시 프레임(`284:1755`)이다. placeholder·disabled·에러 상태 없음. placeholder 스타일은 Radix의 `[data-placeholder]`로 받는다 | P2 |
| **SortButton**(페이지 이름 Sort Dropdown) — 라벨이 변형(공연임박순/최신등록순) | — | — | 정렬값이 서버에 하나뿐이라 **고정 라벨**(patterns §13). Figma에 chevron-down 12가 붙어 있지만 코드는 chevron 없이 누를 수 없게 | P5a, P8 |
| **Checkbox**(`Box`) — `checked` × `Status` default/disabled | Radix `Checkbox` | Checkbox | 원형 20px. 채움 색이 `text/primary-label`(검정)이다 — 브랜드색이 아니다 | P2 |
| **Radio** — selected | Radix `RadioGroup` | Radio Group | 20px, 점 색 검정. disabled 없음 | P2 |
| **Toggle** — Off/On | Radix `Switch` | Switch | 45×24. disabled 없음 | P2 |
| **Tabs** — `tab`(공연/호스트 2개 고정) + tab item(selected) | Radix `Tabs` | Tabs | 밑줄형(아래 2px `brand/primary`). 탭 개수는 코드에서 자유롭게. 선택 탭 44h·미선택 42h 높이 차는 정리 요청. 값은 URL과 묶을 수 있게 제어형(`?tab=`, tech-decisions §3) | P2 |
| **Toast popup** — 1종 | `sonner` unstyled | Sonner | 358×54, 모서리 12, Body/lg 16 가운데 정렬, 아이콘·액션 없음. 성공·에러 구분 없음. 명령형 `toast()`(tech-decisions §13) | P2 |
| **Badge** — large(숫자 20×20)/small(점 8) | — | — | 알림 배지. large는 고정 20×20이라 두 자리 숫자를 못 담는다. 코드는 최소 폭 20 + 좌우 패딩으로 늘린다 | P2 |
| **Avatar** — 9개 변형: 24(grey만) · 32 · 40 × teal/orange/indigo/grey | — | Avatar | 캐릭터 일러스트. `size=40` 변형의 실제 크기는 **45px**, 호스트 행에서는 60px로 늘려 쓴다. 사진 변형이 없다 — 프로필 이미지(PM-3)를 어디에 보여 줄지는 디자인 확인 | P2 |
| **Filter Chip** — selected/open 4상태 | Radix `Popover`(펼칠 때) | — | 선택 여부는 숫자 Badge가 붙는 것뿐이다. 공연 리스트(P5a)가 쓰고, 예매자 관리(P13a) 필터에도 쓸 것으로 본다(추정 — P13a 필터 디자인은 아직 없다). "태그" 문구가 고정이라 텍스트 속성이 필요하다 | P2 |
| **Tag** 5종 — Ticket state chip(승인완료·선물대기·선물완료·승인대기), tag(공연 태그·티켓 수, 텍스트 속성), role chip(마스터·매니저), Concert state chip(D-day·준비중·지난 공연), money option chip(`amount`) | — | Badge | 상태 값은 서버 enum과 매핑하고, 모르는 값은 기본 모양(tech-decisions §4). **Ticket state chip은 서버 티켓 상태 11가지 중 4가지만 있다**(아래 "없는 상태"). **Concert state chip에 공연 중(`ONGOING`)이 없다**. role chip에 GUEST가 없다(호스트 행의 `Role tag=false`가 그 경우로 보인다). 다른 enum(사용자 주문 상태 × `refundStatus`, 호스트 주문 상태, `entrance`, `giftState`)의 칩 매핑은 쓰는 Phase에서 정한다. Concert state chip "D-7"은 텍스트 속성이 없다 | P2(공용 칩), 매핑은 사용 Phase |
| **list** — 10개 변형(`Hierarchy` First/second-closed/second-open/second-radio/third × `value type` text/badge/none/account/text+money 중 일부), 텍스트 속성 `label`·`value text` | 펼침형은 Radix `Collapsible` | Collapsible | 정보 행. `second-radio`는 이름과 달리 체크박스(`Box`)를 쓴다. `account`에 컴포넌트가 아닌 "복사" 버튼이 들어 있다 | P2 |
| **List**(호스트 행) — Role tag × Default/add | — | — | 도메인. 아바타 60px | P10a |
| **concert menu** — selected/unselected | — | — | 공연 어드민 사이드메뉴 항목. 도메인 | P11 |
| **Card list**, **example poster**(1~4, 준비중) | — | Card | 도메인. **호스팅 센터 공연준비 홈의 카드**다(인스턴스는 예시 `303:2082` 하나). Card list 안에 ⋮(`ic/more` 24를 20×20으로 줄여 씀)와 Concert state chip. ⋮는 지난 공연 카드에도 그려져 있지만 계획(P11)대로 **준비중 공연 + 매니저 이상**일 때만 보인다(§5 확인 요청). 호스트·날짜·장소는 각 1줄 말줄임, 제목은 디자이너 메모로 최대 2줄(컴포넌트 설정은 줄 제한 없음) | P10a |
| **ConcertCard** — 포스터 + 날짜 + 제목, 텍스트 속성 `Title`·`date` | `<Link>` + 인라인 진행 표시(tech-decisions §3) | Card | 도메인. 제목 Kartrider 18(§1), **제목 2줄 말줄임**(컴포넌트 설정), 날짜는 말줄임 없음 | P5a |
| **Top app bar** — `Property 1` Default/only title/no title/Title+Backward × `leading icon` × `profile`(Default/true/false), Slot 2개 | — | — | 관객·호스팅 헤더. 모두 390폭(데스크탑 헤더 없음). `Default, leading icon=true, profile=false` 변형은 제목 옆에 ▾(`ic/chevron-down` 12)가 붙고 아랫줄에 공연 이름이 있는 **공연 전환형**이다(전환 메뉴는 없음). 제목은 텍스트 속성이 아니다. 긴 제목: `Title+Backward` 변형은 1줄 말줄임, 사본 `495:457`은 2줄 말줄임, 나머지 변형은 말줄임 없음 — 하나로 통일 요청(§5) 모든 변형의 Slot·Slot2(24×24)가 비어 있다(`Title+Backward`에도 뒤로가기 아이콘이 없다). profile 아바타는 Avatar 32 grey. 관객과 호스팅이 같이 쓰므로 `src/ui/components/Header`(directory-structure)로 둔다 | P2 |
| **ic** — 아이콘 **44종(변형 58개)**. 기본 24 outline, 둥근 선 2px(lucide 방식). filled는 12종(Ticket·dashboard·home·clock·circle-request/check/reject·Settings는 둘 다, mail·phone·open chat·etc는 filled만), 12px는 8종(more·check·chevron-down/up·gift·add·minus·close, gift·minus는 12px만), 16px는 `information` 1종 | — | — | `<Icon name size variant />`. 빌드 때 SVG를 컴포넌트로. 색은 `currentColor`로 바꾼다 — 예외(다색): `instagram`(그라데이션), 알림 점이 있는 `notificatio_onn`·`Ticket-alert`(빨간 점, `brand/accent`), `Settings` filled(회색 원 배경), `chat`(검정 말풍선 + 흰 점 3개), `gift` 12(검정 채움 + 밝은 리본 선). `chat`의 점(Common/100)과 `gift` 12의 리본(`text/on-brand`)은 다크 모드에서 몸통(`text/primary-label` Dark = Neutral 50)과 같은 색이 돼 사라진다 — 투명으로 뚫어 `currentColor` 하나로 쓰는 것을 권한다(디자이너 확인). **SVG 추출이 깨지는 것**: `home` outline(`120:972`)은 `SVG_STRING`으로 뽑으면 외곽선이 빠지고 문만 나온다(둥근 모서리 처리 문제로 보임), `Ticket-alert`(`213:34`)는 배지가 틀 밖으로 나가 28×28로 뽑힌다. 출처는 결정 요약 아래 표 | P1 |
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

계획에는 필요한데 디자인 시스템에 아직 없다. GUI 화면 파일(`1Cn4WOu6TDaSajbFIuH6fO`)에 화면 안 패턴으로 그려진 것과 여전히 없는 것을 나눴다. 디자인 시스템에 컴포넌트로 들어오기 전까지는 GUI의 모양을 따라 Radix 기반으로 만든다.

**GUI에 그려진 것** (디자인 시스템 컴포넌트는 아니다)

| 컴포넌트 | GUI 노드 | 메모 |
|---|---|---|
| 바텀시트 | `331:5853`, `324:4503` | 티켓 선택. `vaul` |
| 모달·확인 팝업 | `567:9468` | "주문 완료하기 / 입금 하셨나요?" 하나뿐. 등록 확인·삭제 확인·거절 사유는 없다 |
| 햄버거 드로어 | `331:11622`, `331:11679` | 로그인·미로그인. 하단 내비게이션·Footer는 없다 |
| 수량 스테퍼 완성형(plan의 `Counter`) | `324:4503` | numbering ± + 숫자 + 금액 + × 줄 |
| 태그 다중선택 패널·칩(plan의 `TagButton`) | `324:3237`, `329:7170` | 4분류 패널 + 선택 수 + 초기화. 호스팅 기본 정보는 4열 버튼, 선택은 검정 채움. 컴포넌트로는 잡히지 않는다 |
| `SelectButton` | 로컬 `Check Button` `567:7982`(Default/selected) | 예/아니오, 결제방식 선택 |
| 툴팁 말풍선 | `331:11622` | "두둥에서 공연을 시작해보세요!" |
| 빈 화면 배치 | `37:758`, `579:2210`, `567:9821` | 일러스트 + 문구 + 검정 버튼. 403·404는 없다 |
| 데스크탑 사이드바 메뉴 | `사이드바 메뉴`(원격 `727:25256`~`727:25258`, `true` 선택 / `false` / `alert` 빨간 숫자 배지) | 2026-10-25에 옛 원격 `Component 1`(`14:1306` 안 8개, Sample GUI에서는 로컬 `91:913`)을 대체했다. 출처 라이브러리 파일은 미확인 |
| PC 상단 바 | `Top bar_Host`(원격 `727:23925`, 높이 58) | 로고 + "공연 둘러보기"·"공연 준비하기" + 벨 + Avatar 32 + 닉네임 ▾. 검색 없음 |
| PC 일정 패널 | `일정 패널`(원격 `741:28401`) | 주간 줄 + 단계 타임라인 4개. 등록 후 대시보드 우측 |
| 대시보드 통계 카드 | 원격 `승인 메뉴_desktop`(`727:23999`) + 아이콘 `ic_대시보드`(`727:14604`~`727:14607`) | 승인 대기·승인 완료·승인 거절·환불 요청. 2026-10-25에 옛 원격 `Frame 1707480333`~`336`을 대체했다 |
| 도넛 차트와 범례, 진행 막대(입장 현황) | `669:2787`, `712:1646` — 원격 `티켓 판매 정보`(`748:33213`·`748:33214`, 판매 후/전), `입장 현황`(`748:35312`) | |
| 유의사항 안내(Alert) | `727:23088`, `669:2787` | |
| 체크리스트 | `727:23088`, `745:32167` — 원격 `필수 체크리스트`(`748:35374`·`748:35375`) | 회색 카드 + Box + chevron 행 + 버튼 |
| 단계 표시 | `41:1996`, `55:3164` | 간편 공연 만들기 2단 진행 막대(로컬 사각형) |
| 이미지 업로드 칸 | `748:33351`, PC `748:34006` | 포스터 영역 + 가운데 Secondary "이미지 업로드" |
| 날짜·시간 입력 트리거 | `55:3164`, `748:33351` | icon input Field(달력·시계). **피커(달력 팝업)는 없다** |
| 연락처 드롭다운 열린 목록 | `748:33557` | dropdown item 5개 |
| 공연 전환 헤더 ▾ | 대시보드 헤더 | 헤더만 있고 전환 메뉴는 없다 |

**여전히 없는 것**
- 표(DataTable) — 예매자 관리
- 텍스트 영역 — GUI의 소개글·티켓 설명은 한 줄 Input + 글자 수 카운터다
- 날짜·시간 피커(달력 팝업)
- 스켈레톤·로더·스피너 — Button 로딩, 화면 로딩
- 페이지네이션 또는 더 보기
- 403·404 안내 배치
- 관객 데스크탑 헤더 — Top app bar는 모두 390폭. 호스팅 PC 상단 바는 `Top bar_Host`(위 표)로 생겼다. 관객 PC 상단 바(로고 + 글자 메뉴 + 검색 + 로그인/아바타 ▾)는 와이어프레임에만 있다(`626:19888`·`640:17991`) — 구성이 `Top bar_Host`와 같다(검색만 더함, gui-screens §3). GUI 요청 Q23
- ⋮ 메뉴(DropdownMenu) — 공연 카드(P11), 티켓(수정·삭제·판매 중단·재개, P12)
- 공연 전환 메뉴
- 공지 바 — 티켓탭 승인 알림(T-3)
- 카드 페이저(N/M) — 티켓탭 캐러셀
- 하단 내비게이션, Footer, 모바일 공연 어드민 메뉴(드로어 또는 바텀시트 — Q37)
- QR — 스캐너 프레임, 카메라 권한 거부 화면, QR 전체화면
- 툴팁(ⓘ 아이콘은 있음, 내용 팝업은 없음)
- "NEW" 글자 배지 — 승인 대기 표시(GD-1). Badge는 숫자와 점뿐이다
- 거절 사유 시트 — 사유 4종 선택
- `ListHeader` — plan P2에 있고 Figma에 없다
- 링크 이동 표시(`LinkProgress`) — tech-decisions §3
- 에디터 툴바 — 상세 정보(`525:4137`)는 탭 틀만 있다(Tiptap, P11)

**GUI에서 새로 나온 패턴** (계획·디자인 시스템 모두에 없었다)

| 패턴 | GUI 노드 | 쓰는 곳 |
|---|---|---|
| 인라인 경고 배너(빨간 배경) | `331:7397` | "티켓은 한 주문당 한 종류만" — P6 |
| 알림 리스트 아이템(카테고리 아이콘 · 안 읽음 점 · 상대 시간) | `331:11574` | P9b |
| 주문 카드(포스터 위 D-day 오버레이 + 상태 칩) | `331:11519` | 주문내역 P9 |
| 거절 사유 박스 + 문의 아이콘 버튼 | `331:11330` 등 | 거절 주문상세 P9 |
| 프로필 아바타 + 편집 배지 | `331:11622` | 햄버거 P5a |
| 히어로 일러스트 블록 | `91:4925` | 공연홈 P5a |
| 주간 달력 + 공연 단계 타임라인 | `712:1646` 우측 `일정 패널` | PC 대시보드 P13a |
| ↗ 링크가 달린 통계 카드 | `712:1646` | PC 대시보드 |
| 연락처 행 ✕ 삭제 + 유형별 placeholder | `329:7170`, `318:5764`~`318:5785` | P10a·P10b·P11 |
| 폼 하단 고정 2버튼 바([미리보기] + [저장하기]) | `748:33351`, `525:4137`, PC `748:34006`(오른쪽 정렬) | P11 |
| Input 글자 수 카운터("0/12", "0/30") | `584:4775` | P12 — Input "없는 상태"에 추가 |

**로컬 헤더 2종.** Top app bar와 별도로 GUI 화면 파일에만 있다: `basic title`(`567:9967`, search/no search — 관객 로고 헤더), `host title`(`467:3169`, 메인은 `37:758` 안, 호스팅 홈 로고 헤더 "dudoong host", 벨 없음 — 벨은 햄버거 드로어 안에 둔다. 제목형 대안은 design-requests Q17). 코드는 `Header` 하나에 로고형 변형을 둔다.

**`illust_dashboard`**(`14:1529`, 로컬)는 헤더가 아니라 통계 카드용 상태 아이콘 36×36 4종(승인대기·승인완료·승인 거절·환불 요청)이다. 인스턴스가 0개라 지금은 안 쓰인다. PC 대시보드 타임라인 일러스트는 컴포넌트가 아닌 벡터 그룹(`14:1462`)이다.

### 없는 상태

컴포넌트는 있는데 제품에 필요한 상태가 없다.

| 컴포넌트 | 없는 상태 | 디자인 전까지 코드 |
|---|---|---|
| Input | 라벨, 도움말, 에러 상태·문구, 지우기 버튼, 글자 수 카운터(GUI `584:4775`에만 그려짐) | 에러는 테두리 `status/error` + 아래 문구 Body/sm. 카운터는 `maxLength`가 있는 칸의 아래 오른쪽 "0/12"(GUI `584:4775`, 간격 4, 12 Medium, text/tertiary) |
| Button | 로딩 | 라벨 자리에 스피너, 폭 유지 |
| Toggle, Radio | disabled | `interaction/disabled` 계열 |
| Dropdown | placeholder, disabled, 에러, 열린 목록 컴포넌트 | Input과 같은 규칙 |
| Toast | 성공·에러 구분, 액션 | 문구만 |
| Badge | 두 자리 이상 숫자 | 폭 늘림, 99+ |
| Ticket state chip | 서버 상태 11가지(`PENDING_APPROVE` · `REFUSED` · `APPROVED` · `GIFT_PENDING` · `GIFT_EXPIRED` · `GIFT_SENT` · `RECEIVED` · `ENTERED` · `CANCELED` · `REFUND_REQUESTED` · `REFUNDED`) 중 승인대기·승인완료·선물대기·선물완료 4가지만 있다 | **디자이너에게 에러·중립 칩 색을 요청한다**(§5). 기존 색으로 바로 만들 수 없는 이유: `status/error` = `brand/accent`라 거절 칩이 선물대기 칩과 똑같아지고, 회색(`interaction/disabled-*`)은 이미 승인대기가 쓰고 있으며 용도가 다른 토큰이다. 그때까지 코드는 컴포넌트 전용 토큰 `chip/neutral`·`chip/danger`를 두고 — 거절·취소는 `chip/danger`(글자 Coral + 테두리만, 배경 없음), 환불 요청·환불 완료·입장 완료는 `chip/neutral`, 선물 만료(`GIFT_EXPIRED`, 회수 안내가 필요한 상태)는 선물대기 모양, 받은 선물(`RECEIVED`)은 승인완료 모양 |
| Concert state chip | 공연 중(`ONGOING`), D-0 표기 | `ONGOING`은 "공연 중"(D-day 모양), `dDay` 0은 "D-day" |
| Checkbox | indeterminate | 지금 계획에는 쓰는 곳이 없다. 필요해지면 가운데 가로선 |
| Search Field | 지우기 버튼, disabled | Input과 같게 |
| dropdown item | disabled, hover | disabled는 `interaction/disabled-text`. hover는 선택 배경과 구별되는 옅은 배경(디자이너 확인) |
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
  | 모서리 12 (tag 72×24, Toggle 트랙 45×24) · 10 (Badge 20×20, numbering 20×20) · 17 (Checkbox 20×20) · 28 (round Button 56×56) — 높이의 절반 이상, 즉 알약·원형. role chip(57×24)도 `Radius/7`(24)로 알약을 만든다 | 원형 `9999px` |
  | 모서리 3 (tab item) · 4.79 (포스터) | `radius[1]` |
  | 모서리를 `Space` 변수에 묶은 곳(Toast `Space/3`, dropdown item `Space/1`, Card list `Space/4`, Top bar 아이콘 `Space/10`) | 같은 값의 `radius` 토큰 — 번호가 다르다(Space/3 12 → `radius[4]`, Space/1 4 → `radius[1]`, Space/4 16 → `radius[5]`, Space/10 80 → 원형) |

  칩 모서리 6처럼 토큰에 없는 값은 디자이너에게 확인한다(§5).
- **원시 색 예외**: §1 표의 컴포넌트는 컴포넌트 전용 의미 토큰으로 묶는다. 화면 코드에서 원시 색을 쓰지 않는다.
- **아이콘(P1 구현)**: `src/ui/icons/` — Figma에서 뽑은 원본 SVG 58개(`svg/<key>-<variant>-<size>.svg`) → `generate.mjs`가 정리·`registry.ts` 생성 → `<Icon name variant size title? />`(인라인 SVG, 훅 없음). `IconSpec`은 Figma에 있는 조합만 타입으로 허용한다. 단색 52개는 `currentColor`. 다색 6개(`chat`, `gift` 12, `instagram`, `notification-on`, `settings` filled, `ticket-alert`)도 본문 잉크색(#141413)은 `currentColor`로 바꾸고 강조색(빨간 점, 흰 점, 리본, 회색 원, 그라데이션)만 원래 값으로 남겼다. 손으로 고친 것: `home` outline은 filled와 같은 중심선을 선 2px로 그려 만들었고(PNG 비교 일치), `Ticket-alert`는 24 viewBox로 되돌리고 배지는 Figma처럼 틀 밖으로 나가게 두어 `overflow="visible"`로 그린다(계획의 "코드에서 겹침" 대신 — 배지를 따로 빼려면 rect 한 줄 삭제). 이 두 파일은 재추출 때 덮어쓰지 않는다(`src/ui/icons/README.md`). Figma 이름 → 키 대응(`notificatio_onn` → `notification-on` 등 8개)은 `generate.mjs`의 `FIGMA_NAME_MAP`. 라이선스 고지는 루트 `THIRD_PARTY_NOTICES.md`(lucide ISC, feather MIT). 남은 것: `chat` 점·`gift` 12 리본의 다크 모드 소실(디자이너 확인), 한 페이지에 `instagram`을 여러 번 그리면 그라데이션 id가 겹침(내용이 같아 보통 무해).
- **shadcn 참고**: 같은 동작의 shadcn 소스에서 Radix 조합과 접근성 속성을 참고하고, Tailwind 클래스는 가져오지 않는다.
- **Storybook**: 각 컴포넌트의 Figma 변형 전부를 스토리로 둔다. 디자이너가 Figma와 나란히 비교할 수 있게 한다.

### 4-1. 에셋 관리

종류마다 출처와 바뀌는 빈도가 달라서 위치와 쓰는 방식을 나눈다.

| 종류 | 출처 | 위치 | 쓰는 방식 | Phase |
|---|---|---|---|---|
| 아이콘(`ic` 44종, 변형 58개) | Figma Icons 페이지 | `src/ui/icons/svg/` → `registry.ts`(생성) | `<Icon />` 인라인 SVG, `currentColor` | P1 완료 |
| 일러스트(빈 화면 6종, 로그인, 포스터 준비중) | Figma image 페이지(벡터) | `src/ui/illustrations/*.png`(3x) | **PNG로 넣었다(P2)** — Figma 벡터가 0.3~6.5MB(포스터 준비중은 8MB 넘어 SVG 추출 자체가 막힘)라 웹에 맞지 않는다. 래스터화하면 개당 7~28KB. 다시 뽑는 노드 ID는 `Illustration.tsx` 주석. `<Illustration name />`이 정적 import + `<img>`로 그린다(Storybook에서 `next/image`가 안 돌아서). 빌드 해시로 장기 캐시(P2에서 Next 빌드로 확인) | P2 완료 |
| `illust_dashboard` 4종(36×36) | Figma | `src/ui/illustrations/dashboard-*.svg` | `<Illustration />` | P2 완료 |
| 아바타 캐릭터(4색) | Figma Avatar("40" = 45px 변형) | `src/ui/illustrations/avatar-*.svg` | Avatar 컴포넌트가 색으로 고른다 | P2 완료 |
| 로고(관객·호스팅) | GUI `logo` 페이지 | `src/ui/brand/Logo.tsx` | 인라인 SVG, `currentColor`(호스팅 "host" 글자는 evenodd로 뚫음) | P2 완료 |
| 폰트 | npm `pretendard`, Google Fonts(Saira Condensed) | 저장소에 파일 없음 | 루트 레이아웃에서 적재. Kartrider는 라이선스 확인 뒤 `next/font/local` | P1 완료 |
| 사용자 업로드(포스터·프로필·호스트 이미지) | 백엔드 S3(presigned 업로드) | 저장소 밖 | `next/image` + `images.remotePatterns`에 업로드 도메인 | P5a |
| 고정 주소가 필요한 파일 | — | `src/app/`(favicon, robots, 기본 OG 이미지), `public/`(약관 HTML) | 파일 규칙 그대로 | P0 완료 · P5b(OG) |

- **아이콘과 일러스트를 나누는 이유**: 아이콘은 작고 한 화면에 많으며 상태에 따라 색이 바뀐다 → 인라인 + `currentColor`. 일러스트는 크고 여러 색이며 색이 바뀌지 않는다 → 인라인으로 넣으면 JS 번들만 커지므로 정적 파일.
- **Figma가 바뀌면**: 아이콘은 `src/ui/icons/README.md` 절차(내보내기 → `node src/ui/icons/generate.mjs`). 일러스트·로고는 해당 SVG만 다시 내보내 교체한다. 원본 SVG를 저장소에 두므로 무엇이 바뀌었는지 git diff로 보인다(PNG로 넣은 일러스트 6종은 예외 — 디자이너가 벡터를 단순화하면 SVG로 바꾼다).
- **SVG 정리**: 내보낸 SVG의 `id`가 페이지 안에서 겹치지 않게 파일 이름 접두사를 붙인다(그라데이션·clipPath). 일러스트는 `<img>`로 그리므로 겹쳐도 무해하고, 인라인으로 그리는 아이콘·로고만 해당한다.
- **라이선스**: 외부에서 온 에셋은 루트 `THIRD_PARTY_NOTICES.md`에 고지한다.

### 4-2. P2 구현 기록 (2026-10-17)

**결정**

| 항목 | 결정 | 이유 |
|---|---|---|
| 날짜·시간 입력 | 네이티브 `<input type="date"/"time">`을 icon input 모양으로 감쌈. 값은 `'yyyy-MM-dd'`·`'HH:mm'` 문자열, 칸 어디를 눌러도 `showPicker()` | 피커 디자인이 없고, 모바일 네이티브 피커가 가장 쓰기 좋으며 의존성이 없다 |
| 뒤로가기 | 열린 시트·모달·팝업을 닫는다(사용자 결정, patterns §6) | — |
| 오버레이 토큰 | `color.overlay.dim`(라이트 Neutral 900 70%)·`overlay.shadow`, `zIndex.popover`(1150 — 모달 위, 토스트 아래) 추가. 드롭다운 목록·팝오버·툴팁·메뉴가 popover | `background.dark`는 다크에서 흰색이라 딤에 못 쓴다. Figma 딤은 모달 검정 80%·시트 Neutral 900 70%로 달라 70%로 통일 |
| Button | `variant="dark"`(검정 채움 — 빈 화면·주문 완료 버튼), `loading`(라벨 폭 유지 + 스피너, `aria-busy`, 변형 색 유지) 추가 | GUI가 Primary 채움을 검정으로 덮어써 쓴다 |
| 칩 neutral·danger | `Chip.css.ts` 안에서 기존 의미 토큰을 조합(neutral = surface.container 배경 + defaultBorder + text.secondary, danger = 배경 없음 + dangerLabel) | 디자이너 색이 오기 전 임시(§3 "없는 상태") |
| Footer · NavBar | 만들지 않음(보류) | plan·storyboard·GUI·v1 어디에도 쓰는 곳이 없다. GUI는 햄버거 드로어 |
| Tooltip | 터치로 열리지 않으므로 모바일 ⓘ 설명은 Popover | Radix Tooltip 동작 |
| DropdownMenu | `modal={false}` | 메뉴 항목에서 확인 팝업을 열 때 body `pointer-events`가 남는 문제 회피 |

**react-hook-form 연결**

| 컴포넌트 | 연결 | 이유 |
|---|---|---|
| Input · SearchField · TextArea · DatePicker · TimePicker | `register` | 네이티브 요소에 ref·onChange·onBlur·name이 그대로 간다 |
| Dropdown · Checkbox · Toggle · Radio · SelectButton | `Controller` | Radix(button 기반), 값은 콜백으로만 나온다. `field.ref`는 트리거에 붙어 검증 포커스가 간다 |
| Counter | `Controller` | 값이 number, 입력 칸이 없다. `field.ref`는 줄이기 버튼(min에서 비활성이면 포커스 못 받음) |
| TagButtonGroup | `Controller` | 값이 string[]. `field.ref`는 첫 칩 |
| DropZone | 폼 밖 | `onFile` 콜백뿐. 업로드 결과 키를 `setValue`로 넣는다(P3 upload.ts, P11) |

예제: `src/ui/stories/FormWithRHF.stories.tsx`(zod + 제출 play).

**Figma와 다르게 한 것**: SearchField 아이콘은 Figma대로 오른쪽(지우기 버튼은 그 왼쪽). Tabs 높이 44 통일. 칩 모서리 6 → 8, 고정 폭 72 → 최소 폭. 토큰에 없는 간격 10 → 8. dropdown item 28h → 최소 36h(터치 영역). Header 제목 1줄 말줄임, 아이콘 버튼 누르는 영역 40. 바텀시트 모서리 0(Figma 그대로)·데스크탑 최대 폭 600, Modal 최대 폭 480(디자인 없음). Toggle 손잡이 Common/100 → `background.normal`(라이트 같은 값).

**디자이너 확인**: 일러스트 벡터 단순화(가능하면 SVG로), 칩 모서리 6과 neutral·danger 색, 딤 색·투명도 통일과 시트 모서리 0, dropdown item hover 색, Toggle·Radio·SelectButton·TagButton disabled 모양, 간격 10, Tabs 높이, 날짜·시간 placeholder 문구, 403·404 문구·일러스트, Avatar 사진 변형, Header 제목 줄 수.

**미확인(실기기)**: iOS Safari 바텀시트 스크롤 잠금·키보드 회피(vaul `repositionInputs` 켬 — BottomSheet 스토리 `WithInput`·`LongContent`로 확인), 안드로이드 하드웨어 백·iOS 스와이프 백으로 오버레이 닫힘, DatePicker의 iOS placeholder·`showPicker`.

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
| 상태 칩 대비 | Concert D-day 2.15:1, Ticket 승인대기 1.73:1(Dark 1.67), Ticket 선물완료·Concert 준비중 2.90:1, Concert 지난 공연 3.10:1, Ticket 선물대기 3.53:1, 승인완료 Dark 3.77:1 | 글자 대비 4.5:1 이상 |
| 칩 색 체계 | 에러 계열 칩 색이 없다(`status/error` = `brand/accent`라 선물대기와 같아진다), 중립 칩 색이 없다 | 에러·중립 칩 색 추가 |
| 대시보드 상태 아이콘 색 | 예시 `194:1126`에서 덮어쓴 색 — 승인 `status/success`, 거절 `brand/accent`, 대기는 노랑 직접 값(#FFDC4F·#FFB32F, 토큰 없음). 칩 체계(보라·회색)와 다르다 | 대기 의미 색 추가, 아이콘과 칩 색 체계 맞추기 |
| `surface/default-label` | Dark가 다른 토큰을 가리키지 않고 `#FFFFFF` 직접 값. 이름은 label인데 surface 그룹 | 용도와 그룹 확인 |
| 원시 색 직접 사용 | §1 표(Avatar, role chip, 상태 칩, concert menu, Toggle, 포스터) | 의미 색 추가(예: `avatar/*`, `role/*`, `chip/*`) |
| 의미가 다른 토큰 | round Button 배경 `text/primary`, Checkbox 채움·Radio 점 `text/primary-label`, 지난 공연 칩 글자 `surface/strong-border`, numbering 배경 `surface/default-label`, `ic/Settings` filled의 회색 원 `surface/strong-border`, Avatar grey 배경 `surface/default-border`(Avatar 그림 자체는 #131313·#FFFFFF·#D9D9D9 직접 값) | 배경·채움용 의미 색으로 |
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
| Top app bar | `profile` 값 Default/true/false 중 Default가 하나뿐, 제목이 텍스트 속성 아님, 긴 제목 말줄임이 1줄(`Title+Backward`)·2줄(사본)·없음(나머지)으로 제각각 | 축 정리, 말줄임 1줄·2줄 중 하나로 통일, Slot에 뒤로가기·액션 아이콘 예시 |
| Button Secondary | 글자색이 크기마다 다름(`text/primary`·`secondary-label`·`secondary`) | 하나로 |
| Card list ⋮ | 지난 공연 카드에도 ⋮가 그려져 있다 | 준비중 + 매니저 이상일 때만 보이는지 확인 |
| 없는 상태 | §3 "없는 상태" 표 | 우선순위: Input 에러, Button 로딩, Ticket 거절·환불 칩 |
| 없는 컴포넌트 | §3 "없는 컴포넌트" 목록 | 우선순위: 모달·바텀시트·날짜 입력 |

**아이콘·정리**

| 대상 | 지금 | 요청 |
|---|---|---|
| 아이콘 이름 | `notificatio_onn` 오타, 대소문자 섞임(`Ticket`, `Settings`), 공백(`up down`, `order detail`, `open chat`), 밑줄(`image_add`). `info`(24)는 이름과 달리 문서 편집 그림(lucide `file-pen`) — 느낌표는 `circle-request`, `information`(16)은 i | 이름 정리 |
| 세트 밖 낱개 아이콘 | 선물 filled 12(`439:1836`), 선물 outline 낱개 벡터 5개(약 13px, `439:1843~1847`, 선 색은 원격 변수), 컬러 말풍선 30(`422:652`), 검색 20(`321:1558`), `icon/chevron-down` 12·24 낱개 프레임, `image 1 [Vectorized]`(`473:1599`), 외부 `icon/clipboard-list`(`344:370`) | 세트에 넣거나 지우기 |
| 아이콘 색 | 58개 변형 중 54개는 변수(53개는 `text/primary-label` 등 로컬, `favorite`는 shadcn 원격 `mode/foreground`), 4개는 변수 없음(`phone` #292929, `open chat`·`etc` #292828, `instagram` 그라데이션) | 단색은 같은 의미 색으로 |
| 아이콘 벡터 | `home` outline이 SVG로 뽑으면 외곽선이 빠진다, `Ticket-alert` 배지가 24 틀 밖으로 나간다 | 벡터 정리(외곽선 평탄화), 배지는 틀 안으로 |
| Alert 예시 | 대시보드 예시 안 Alert에 숨김 처리된 shadcn Button(`197:2975`) | 지우기 |
| 숨긴 이미지 | Top bar 3개(`197:4241`·`197:4639`·`197:4848`), Icons 2개(`473:1566`·`473:1587`), image 3개(일러스트 원본 `499:1440`·`503:1161`·`506:1636`) | 지우기 |
| 대시보드 예시 | 같은 내용이 두 벌(`194:1126`, `197:3463`) | 하나로 |
| 삭제된 컴포넌트를 가리키는 인스턴스 | Sample GUI의 `icon/settings`(`62:3992`)·`icon/log-out`(`62:3988`), 옛 `list/third/badge/선물대기`(`202:2073`)·`…/승인대기`(`202:2206`) | 현재 컴포넌트로 바꾸기 |
| 빈 페이지 | "Page 22" | 지우기 |

---

## 6. Sample GUI 페이지

사용 컴포넌트 목록만 확인했다. 화면 자체는 읽지 않았다. 외부 키트와 디자인 시스템 컴포넌트를 섞은 시안이다.
- **원격 shadcn 키트**: Input, Date Picker Input, Radio Group·Radio, Switch, Pagination, `Decoration`, `Icon / *` 아이콘(`Icon / circle-dashed`, `Icon / calendar`, `Icon / plus` 등), `lucide/loader`, `header`·`header 2`
- **세 번째 아이콘 세트 `icon/*`(원격)**: search, chevron-up/down/left, arrow-up-right, link, view, image-plus, plus, user, clipboard-list
- **원격 macOS 키트**: Segmented Control, Push/Pulldown/Pop-Up Button, Text Field, Search Field, 표용 List Item·Column Header, 사이드바 `Item`·`Section Header`·`_Disclosure - Header`, `Window`, `Liquid Glass - Medium`
- **원격 iOS 키트**: `Status bar - iPhone`, `Home Indicator`, `StatusBar`
- **디자인 시스템 컴포넌트**: ConcertCard, Filter Chip, Toggle, SortButton, Badge, Ticket state chip, Checkbox(`Box`), Avatar, tag, `ic` 다수
- **로컬 전용**: `Component 1`(`91:913`, 데스크탑 사이드바 메뉴)
- **삭제된 컴포넌트를 가리키는 인스턴스**: `icon/settings`·`icon/log-out`(햄버거 안), 옛 `list/third/badge/선물대기`·`…/승인대기`

디자인 시스템 기준으로 보지 않고, 날짜 입력·페이지네이션·데스크탑 사이드바가 필요하다는 신호로 쓴다(§3 "없는 컴포넌트").

---

## 7. 확인할 것

| 항목 | 언제 |
|---|---|
| Radix의 React 19 호환과 유지보수 상태 | P0 |
| Kartrider Kor 웹 임베드 라이선스 | P1 전 |
| 다크 모드 출시 범위 | P1 전 |
| 브레이크포인트 확정 | P1(2026-10-25 GUI 스펙으로 다시 — 호스팅 1133, 관객 1024는 Q38. 토큰 나누기는 P4s 착수 전) |
| 실제 화면 디자인 페이지(디자인 시스템 파일 밖) | 받는 대로 |

### 검증 기록

| 회차 | 고친 것 |
|---|---|
| 1회차(2026-10-15) | Button을 "shadcn 변형"으로 본 판단 철회(아이콘 자리는 자체 `ic/name=blank`). Input·Dropdown·Toast도 출처 단정 철회. 아이콘 58종 → 44종(변형 58). Avatar 변형 9개·40=45px. 원시 색 직접 사용, 없는 상태, 사용 메모, Sample GUI 원격 키트, 모서리 변수 오용 범위, 하드코딩 값 표 추가 |
| 2회차(2026-10-15) | shadcn 흔적 재정리 — 아이콘 세트 선 굵기·Toast 테두리가 shadcn 키트 원격 변수에 묶여 있고 아이콘이 lucide 방식(둥근 선 2px)이라 lucide 바탕일 가능성. "원격 인스턴스 없음" 철회. `on Primary container` 용도(배경)와 대비 수치 정정, 아이콘 색 "직접 값" 정정(54/58은 변수). 다색 아이콘 `chat`·`gift` 12, 원시 색 표·모서리 표 보강(알약·원형 정리), Top app bar 말줄임과 공연 전환형, Ticket state chip 11가지 중 4가지, 없는 컴포넌트 15개·없는 상태 4개 추가, Button `variant` `subtle` → `tonal`, Filter Chip P2로 |
| 3회차(2026-10-15) | 아이콘 출처 확정 — SVG 좌표 비교로 24 outline 37개 중 26개가 lucide와 같고 6개는 고친 것, 5개는 자체, filled 12는 lucide에 없음. `lucide-react`는 쓰지 않고 Figma SVG 한 경로 + 라이선스 고지. `info` 그림 정정(file-pen), SVG 추출이 깨지는 `home`·`Ticket-alert`, 다색 아이콘의 다크 모드 문제. Card list·example poster Phase P5a → P10a(호스팅 센터 카드), Top app bar P2 `Header`로. Ticket 칩 임시안 정정(`status/error` = `brand/accent`라 거절이 선물대기와 같아짐 → 칩 전용 토큰), Concert chip ONGOING, 상태 칩 대비 6건, 대시보드 상태 아이콘 색, plan P2와 대응 안 된 컴포넌트 6개 추가 |
| GUI 반영(2026-10-15) | GUI 화면 파일 반영 — PC 대시보드 3단 레이아웃과 1024~1279 중간 배치 필요(§2), 없는 컴포넌트를 "GUI에 그려진 것"(18개)과 "여전히 없는 것"으로 나눔, GUI 새 패턴 11개, 로컬 헤더 3종, 숫자 폰트 이름 불일치(saira extra condensed), Inter·Geist는 잔재, Input 글자 수 카운터 |
| GUI 검증 1회차(2026-10-16) | 숫자 폰트 정정 — GUI에 Saira Condensed가 실제로 쓰였다("쓰인 곳이 없다" 철회). `illust_dashboard`는 헤더가 아니라 미사용 상태 아이콘 4종(로컬 헤더 3종 → 2종). Inter·Geist 범위를 숨김·삭제예정·메모 레이어까지로 |
| GUI 검증 2회차(2026-10-16) | `host title` 메인 컴포넌트가 `37:758` 안에 있다는 점 정정, 로고형 헤더는 벨이 없어 벨을 햄버거 드로어 안에 둔다(Q17), Inter·Geist 범위 정정, 이 검증 기록 표의 끊김 수정 |
| GUI 검증 3회차(2026-10-16) | Inter 범위를 주문상세·목록 7개 프레임으로 좁힘. PC 호스팅 셸에는 실제 벨이 없어(사이드바 아이콘은 자리표시) 사이드바 하단 사용자 줄에 둔다 |
| GUI 반영(2026-10-25) | GUI "Ready for dev" 판 — §2 호스팅 반응형 스펙(1133/1280/1440, 1133~1279도 3단, 사이드바 268, 우측 패널 286/335/388, 상단 바 58)으로 `Desktop - 27` 문단 대체, 브레이크포인트를 호스팅 1133 / 관객 1024(Q38)로 나눠 적음. PC 벨은 상단 바(사이드바 하단 사용자 줄 철회). `Component 1` → `사이드바 메뉴`, 통계 카드 → `승인 메뉴_desktop`, 지워진 GUI 노드 id 갱신 |
