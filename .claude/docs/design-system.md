# DuDoong v2 — 디자인 시스템과 컴포넌트 구현

> 2026-10-15 작성. Figma "디자인 시스템" 파일(`0QD9tGSt8ZciDqe7ol2gYH`)의 🎨Foundation 6페이지와 🧩Components 16페이지(+ 빈 "Page 22", 표지 "Thumbnail")를 `figma-console` MCP로 읽고 썼다. 같은 날 검증 루프 3회로 Figma를 다시 읽어 고쳤다(§7 검증 기록).
> **디자이너가 작업 중인 파일이다.** 값과 이름은 바뀔 수 있다. P1·P2를 시작할 때 다시 읽고 이 문서를 갱신한다. "Sample GUI" 페이지(프레임 96개)는 사용 컴포넌트 목록만 봤다(§6).
> 2026-10-25 갱신: 같은 파일의 2026-10-25T09:12Z 판을 2026-10-14T17:51Z 판(버전 `2410274134017083703`, 이 문서를 쓰기 직전)과 비교해 반영했다 — 새 페이지 "┗ Menu"(`538:1497`), 호스팅 PC 컴포넌트(§3 "호스팅 PC·대시보드 컴포넌트"), Button 상태 변형, Tabs·Concert state chip 변경, 아이콘 추가, 호스팅 그리드(§2). 텍스트 스타일·Typography 페이지는 바뀌지 않았다. 코드에 미치는 것은 [`implementation-log.md`](./implementation-log.md) "2026-10-25 디자인 시스템 변경으로 생긴 코드 수정 거리"(§7 검증 기록).
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
| concert menu 선 | Neutral/900 |
| Toggle 손잡이 | Common/100 |
| `ic/chat`의 점 3개 | Common/100 |

2026-10-25에 원시 색에서 벗어난 것:
- Concert state chip D-day(옛 배경 Coral-red/50·글자 Coral-red/200) → small은 배경 `brand/accent-subtle`·글자 `brand/accent`, large는 `status/warning-subtle`·`status/warning`(Light 값은 같다). 지난 공연(옛 배경 Neutral/50) → 배경 `interaction/disabled-bg`(Neutral 100).
- 포스터 준비중(옛 Neutral/100 배경·Neutral/600 그림) → 배경은 새 변수 `622:2202`(값 #EEEEED), 그림은 `text/tertiary`(#B8B7B3, 선 없음). 코드 PNG(`poster-placeholder.png`)는 이미 이 밝은 회색이다(렌더 비교).
- Avatar 그림의 직접 값 #131313(채움 144개 중 108개, 선 34개 전부) → 새 변수 `605:1952`(값 #0A0A09 = Neutral 900), #FFFFFF(27개 전부) → 새 변수 `606:1920`(값 #F7F7F6 = Neutral 50). 채움 36개는 아직 #131313, #D9D9D9 18개는 그대로다.

**새로 쓰인 변수(2026-10-25).** 옛 판에서 어느 노드에도 묶이지 않았던 로컬 변수 ID 12개가 묶였다. 이름은 확인하지 못했다(REST 변수 API는 403, Desktop Bridge 플러그인은 다른 파일에 연결돼 있었다) — 그래서 새로 만든 변수인지, 있던 변수가 처음 쓰인 것인지도 모른다. 옛 판에도 쓰이던 변수는 노드에 묶인 값으로 비교하면 **값이 바뀐 것이 없다**(색·모서리·간격 모두).

| 변수 ID | 값 | 쓰는 곳 |
|---|---|---|
| `606:1920` | #F7F7F6 (Neutral 50) | Primary 버튼 Normal 글자(옛 `text/on-brand`), primary 2 Pressed 글자, 사이드바 메뉴 글자, Avatar 흰 부분 |
| `605:1952` | #0A0A09 (Neutral 900) | Avatar 그림 선·채움 |
| `606:1921` | #FFFFFF | `Top bar_Host` 배경 |
| `622:2202` | #EEEEED (Neutral 100) | 포스터 준비중 배경 |
| `640:1888` | #D5C9FF (Violet 100) | primary 2 Normal 배경(옛 `brand/Primary container` `166:1233` — 아이콘만 있는 `422:630`은 아직 옛 변수) |
| `649:1159` · `649:1161` | #B49FFD (Violet 200) · #633EE7 (Violet 400) | primary 2 Hover 배경 · 글자 |
| `649:1160` | #8162F1 (Violet 300) | primary 2 Pressed 배경 |
| `649:1162` · `649:1163` | #232220 (Neutral 700) · #0A0A09 (Neutral 900) | round Primary Hover · Pressed 배경 |
| `161:3481` | 20 | 모서리 20(`My`·`승인 메뉴_desktop`·`티켓 판매 정보`) — 값이 `Radius/6`과 같다 |
| `35:176` | 2.09(인스턴스 축소 값) | `example poster` 준비중 mobile 모서리 |

Light 값이 같은 의미 색이 있는 것도 있다(Coral-red/50 = `brand/accent-subtle`, Neutral/50 = `surface/container`, Neutral/100 = `Background/grey`, Common/100 = `Background/normal`, Neutral/900 = `Background/dark`). 하지만 Dark 값은 다르므로 기계적으로 바꾸지 않는다. 코드에서는 이 색들을 컴포넌트 전용 의미 토큰으로 묶는다(`vars.color.avatar.teal`, `vars.color.role.master` 등). 디자이너가 의미 색을 추가하면 그 이름으로 바꾼다(§5).

**쓰이지 않는 의미 색.** 컴포넌트 어디에도 묶이지 않았다: `text/tertiary-label`, `text/disabled-label`, `text/danger-label`, `brand/accent-pressed`, `brand/accent-hover`, `status/warning`, `status/warning-subtle`, `status/error`, `Background/dark`. 토큰으로는 옮기되, 정리 요청(§5) 결과에 따라 지운다. 2026-10-25: `status/warning`·`warning-subtle`은 Concert state chip D-day large가, `text/tertiary-label`은 `Top bar_Host`의 비활성 메뉴·`날짜` 요일 글자가 쓰기 시작했다.

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
- **2026-10-25 디자인 시스템 확인**: `Title_number`는 Saira Condensed 700 28/36.4 그대로다(텍스트 스타일 변경 없음). 디자인 시스템 파일 안에서 Saira Condensed가 쓰인 곳은 Typography 페이지 견본 두 줄(`400:653`·`400:654`)뿐이다. 새 대시보드 컴포넌트의 숫자도 이 스타일이 아니다 — `티켓 판매 정보`의 "54"·"170,000"과 `입장 현황`의 "100/238"은 `Heading/lg-emphasized`(Pretendard 700 24), `승인 메뉴_desktop`의 "0건"은 `Heading/md - emphasized`(20), `승인 메뉴_mobile`은 `Heading/md2 - emphasized`(18). **사용자 결정(2026-10-25): 디자인 시스템 정의(`Title_number`)가 정본이다.** 대시보드 숫자를 Pretendard로 그린 것이 의도인지는 디자이너에게 묻는다(Q14).
- "폰트고민" 페이지가 제목 후보 6종(학교안심 곧은제목, Cafe24 PRO Slim, 넥슨 카트 고딕, 신라고딕, 서평원 꺾깎체, 뉴트로닉)을 비교했고 결론은 "카트라이더 + 숫자"다.
- Inter·Geist는 흑백 섹션 `331:11009`의 주문상세·목록 7개 프레임(`331:11010`~`331:11519`, 원격 컴포넌트 안팎), 작업용 `338:14624`, 회색 와이어 `338:15509`(Geist "미리보기"·"저장하기"), 숨긴 Outline Button "Label"(`329:7498` 등), 삭제예정 체크아웃, 메모 레이어에 있다(목록은 `gui-screens.md` §6). 구현은 Pretendard로 통일한다.

### 그림자와 스타일

- 이펙트 스타일 `drop shadow` 하나: y 4, blur 4, 검정 10%. Toast가 쓴다(테두리 `surface/strong-border` 1px도 있다).
- 2026-10-25에 이펙트 스타일 `drop shadow2`(`538:5174`)가 생겼다: y 0, blur 9.2, 검정 10%. PC 아바타 ▾ 메뉴 `My`가 쓴다.
- 페인트 스타일은 0개다. 색은 변수로만 정의돼 있다.

---

## 2. 레이아웃 그리드와 브레이크포인트

| 프레임 | 폭 | 칼럼 | 간격 | 좌우 여백 |
|---|---|---|---|---|
| Mobile `35:162` | 390 | 4 | 16 | 24 |
| Tablet `35:172`(프레임 이름 "Tablet-QR만") | 1133 | 12 | 24 | 40 |
| Desktop-sm `35:169` | 1280 | 12 | 24 | 40 |
| Desktop-lg `35:164` | 1440 | 12 | 24 | 80 |
| Tablet host `569:5224`(프레임 이름도 "Tablet-QR만") | 1133 | 12 | 16 | 24 |
| Desktop-sm-host `565:5221` | 1280 | 12 | 16 | 24 |
| Desktop-lg-host `565:5219` | 1440 | 12 | 16 | 24 |

- **2026-10-25 변경**: Tablet `35:172`가 8칼럼·간격 20·여백 32에서 12칼럼·24·40(Desktop-sm과 같은 값)으로 바뀌었다. 호스팅용 프레임 3개(`-host`, 12칼럼·간격 16·여백 24)가 생겼다. 그리드 스타일이 2개에서 7개가 됐다: `mobile grid`, `tablet grid`, `desktop-sm grid`, `desktop-lg grid`, `tablet-host grid`, `desktop-sm grid-host`, `desktop-lg grid-host`. 모든 프레임이 스타일에 묶였다. 행·베이스라인 그리드는 없다.
- 위 표는 디자인 시스템 파일의 그리드 프레임이다. **실제 화면의 반응형은 GUI 화면 파일의 스펙을 따른다**(아래). Tablet 1133은 디자인 시스템 파일에서는 "QR 전용"이지만 GUI 스펙에서는 데스크탑 레이아웃의 최소 폭이다 — 같은 것인지는 [`design-requests.md`](./design-requests.md) Q39(gui-screens §3 "스펙에서 비는 것" 10번). 2026-10-25 판에서 1133 프레임은 칼럼이 데스크탑과 같은 12칼럼이 됐고 호스팅용 판도 생겼지만, **두 프레임 이름은 여전히 "Tablet-QR만"이다** — 이름과 GUI 스펙이 맞지 않는 것은 그대로라 Q39에 근거로 더했다.
- **GUI 프레임과 대조(2026-10-25 GUI 판)**: 공연준비 홈 PC `741:30197`(1133)·`741:30179`(1280)·`741:30215`(1440)는 `tablet grid`·`desktop-sm grid`·`desktop-lg grid`(12칼럼·간격 24·여백 40/40/80)에 묶여 있다 — GUI 반응형 스펙의 공연 밖 화면 좌우 여백 40·40·80(아래)과 같다. 기본 정보 PC `748:34006`(1440)은 `desktop-lg grid-host`(12칼럼·16·24)에 묶여 있다 — 여백 24가 본문 좌우 24(gui-screens §3)와 `Top bar_Host` 좌우 패딩 24와 같다. 대시보드 PC 프레임(`680:672`·`669:2972`·`712:1646`·`669:2350`·`727:23210`)에는 그리드가 없다.
- **호스팅 PC 레이아웃(GUI 2026-10-25 "Ready for dev", [`gui-screens.md`](./gui-screens.md) §3).** 옛 `Desktop - 27`(`14:1304`, 사이드바 255 + 본문 793 + 우측 392)은 지워지고 아래로 바뀌었다(design-requests Q9 해결).
  - 반응형 스펙(페이지 `669:2109`): **1133 미만 모바일**(기준 390), Tablet 1133~1279(기준 1133), Desktop s 1280~1439(기준 1280), Desktop L 1440~(기준 1440). 1133 이상은 모두 데스크탑 레이아웃이다.
  - 공연 안의 화면: 상단 바 58(`Top bar_Host`) + 공연 사이드바 268 고정 + 가운데 fill(최소 572 ~ 최대 1261) + 우측 일정 패널 286 / 335 / 388(구간별 고정, **등록 후 대시보드만**). **1133~1279도 3단 그대로**다 — 우측 패널을 본문 아래로 내리지 않는다.
  - 공연 밖 화면(공연준비 홈 PC `741:30197`~`741:30233`): 상단 바만 있고 사이드바가 없다. 좌우 여백·본문 폭 40·1053(1133), 40·1200(1280), 80·1280(1440), 1920은 본문 1280. 여백 40·80은 위 표의 Desktop-sm/lg 여백과 같다.
  - 대시보드 프레임에는 칼럼 그리드가 붙어 있지 않다. 사이드바·3단은 12칼럼을 따르지 않는다(1440 host 그리드의 칼럼 101.3 + 간격 16으로는 268이 칼럼 경계에 맞지 않는다). 공연 밖·폼 화면의 그리드는 위 "GUI 프레임과 대조".
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
| **Button** — `Color` Primary/Secondary/primary 2 × `type` small 32 · medium 45 · Large 56 · round × `Icon` × `Text` × `Interaction` Normal/Hover/Pressed/Disabled/Selected, 텍스트 속성 `Label` | `<button>` | Button | `variant: 'primary' \| 'secondary' \| 'tonal'`(primary 2 = 배경 `brand/Primary container`, 글자 `text/brand-label`. 토큰 `brand/primary-subtle`과 다른 색이라 `subtle`로 부르지 않는다), `size: 'sm' \| 'md' \| 'lg'`, `icon?`, 아이콘만 있는 버튼은 `iconOnly`. 모서리 8/10/12. **변형이 듬성듬성했다**(2026-10-15 240개 조합 중 27개 → **2026-10-25 68개**, 아래 "Button 상태 색"). Selected는 여전히 Secondary medium에만 있다. 코드는 빈 조합을 같은 규칙으로 채운다. Secondary 글자색이 크기마다 다르다(small `text/primary`, medium·Large `text/secondary-label`, Large 아이콘형 `text/secondary`) — 코드는 하나로 통일. medium은 2026-10-25에 **모두 46h**다(옛 판은 아이콘형만 46h, 아이콘 없는 것은 45h). Selected는 배경 #EEEEED(변수 `197:4875`) + 글자 `text/primary-label` + 테두리 `strong-border`. Hover·Pressed·Disabled는 CSS 상태, Selected만 prop | P2 |
| Button `round` | `<button>` | — | 56 원형 아이콘 버튼(FAB). Primary 배경이 `text/primary`(검정). `variant`가 아니라 별도 `Fab` 컴포넌트로 둔다. 2026-10-25: Primary에 Hover·Pressed·Disabled가, 흰 판 `Color=Secondary`(Normal·Hover·Pressed)가 생겼다(아래 표) | P2 |
| **numbering** — minus/plus × default/pressed, 20×20 | `<button>` | — | 수량 스테퍼(P6)의 부품 | P2 |
| **Input** 3종 — input field · text input(단위 접미사 "원") · icon input, `State` Default/Focus/Filled/disabled | `<input>` | Input | `leading?`(아이콘), `trailing?`(단위). 44h, 모서리 8, 포커스는 보라 테두리. Focus·Filled는 CSS 상태 | P2 |
| **Search Field** — Default/Focus/Filled(disabled 없음) | `<input type="search">` | Input | 검색 아이콘이 외부 `icon/search`다. 코드는 `ic/search`를 쓴다 | P2 |
| **Dropdown** — 트리거(상태 1개) + dropdown item(selected) | Radix `Select` | Select / Combobox | 트리거 아이콘이 위아래 화살표(`ic/up down`)라 shadcn Combobox 모양에 가깝다. 열린 목록은 컴포넌트가 아닌 예시 프레임(`284:1755`)이다. placeholder·disabled·에러 상태 없음. placeholder 스타일은 Radix의 `[data-placeholder]`로 받는다 | P2 |
| **SortButton**(페이지 이름 Sort Dropdown) — 라벨이 변형(공연임박순/최신등록순) | — | — | 정렬값이 서버에 하나뿐이라 **고정 라벨**(patterns §13). Figma에 chevron-down 12가 붙어 있지만 코드는 chevron 없이 누를 수 없게 | P5a, P8 |
| **Checkbox**(`Box`) — `checked` × `Status` default/disabled | Radix `Checkbox` | Checkbox | 원형 20px. 채움 색이 `text/primary-label`(검정)이다 — 브랜드색이 아니다 | P2 |
| **Radio** — selected | Radix `RadioGroup` | Radio Group | 20px, 점 색 검정. disabled 없음 | P2 |
| **Toggle** — Off/On | Radix `Switch` | Switch | 45×24. disabled 없음 | P2 |
| **Tabs** — `tab`(공연/호스트 2개 고정) + tab item(`selected` × `type` 모바일/데스크탑) | Radix `Tabs` | Tabs | 밑줄형. **2026-10-25 변경**: 선택 = 글자 `Label/lg-emphasized` + 아래 2px 모두 `text/primary-label`(검정, 옛 `brand/primary` 보라), 미선택 = `Label/lg`(16 Regular) `interaction/inactive`(회색, 옛 16 Bold `text/primary`). 모바일은 선택·미선택 모두 44h(옛 42h 차이 해소). `type=데스크탑`이 새로 생겼다 — 20px(`Heading/md` / `Heading/md - emphasized`), 선택 48h·미선택 44h. 탭 개수는 코드에서 자유롭게. 값은 URL과 묶을 수 있게 제어형(`?tab=`, tech-decisions §3) | P2 |
| **Toast popup** — 1종 | `sonner` unstyled | Sonner | 358×54, 모서리 12, Body/lg 16 가운데 정렬, 아이콘·액션 없음. 성공·에러 구분 없음. 명령형 `toast()`(tech-decisions §13) | P2 |
| **Badge** — large(숫자 20×20)/small(점 8) | — | — | 알림 배지. large는 고정 20×20이라 두 자리 숫자를 못 담는다. 코드는 최소 폭 20 + 좌우 패딩으로 늘린다 | P2 |
| **Avatar** — 9개 변형: 24(grey만) · 32 · 40 × teal/orange/indigo/grey | — | Avatar | 캐릭터 일러스트. `size=40` 변형의 실제 크기는 **45px**, 호스트 행에서는 60px로 늘려 쓴다. 사진 변형이 없다 — 프로필 이미지(PM-3)를 어디에 보여 줄지는 디자인 확인 | P2 |
| **Filter Chip** — selected/open 4상태 | Radix `Popover`(펼칠 때) | — | 선택 여부는 숫자 Badge가 붙는 것뿐이다. 공연 리스트(P5a)가 쓰고, 예매자 관리(P13a) 필터에도 쓸 것으로 본다(추정 — P13a 필터 디자인은 아직 없다). "태그" 문구가 고정이라 텍스트 속성이 필요하다 | P2 |
| **Tag** 5종 — Ticket state chip(승인완료·선물대기·선물완료·승인대기), tag(공연 태그·티켓 수, 텍스트 속성), role chip(마스터·매니저), Concert state chip(D-day·준비중·지난 공연), money option chip(`amount`) | — | Badge | 상태 값은 서버 enum과 매핑하고, 모르는 값은 기본 모양(tech-decisions §4). **Ticket state chip은 서버 티켓 상태 11가지 중 4가지만 있다**(아래 "없는 상태"). **Concert state chip**(2026-10-25 변경): `Property 1` ready/d-day/past에 **`ing`(공연중 — 배경 `brand/accent`, 글자 `brand/accent-subtle`)** 이 더해졌고, `size` 축이 생겼다 — small 22h·좌우 10·모서리 6(직접 값)·`Label/sm`, large 25h·좌우 12·모서리 8(변수 `35:177`)·`Label/md`. 색은 §1 "원시 색에서 벗어난 것". 공연준비 홈 PC 목록(`공연 리스트_Desktop`)이 large를 쓴다. role chip에 GUEST가 없다(호스트 행의 `Role tag=false`가 그 경우로 보인다). 다른 enum(사용자 주문 상태 × `refundStatus`, 호스트 주문 상태, `entrance`, `giftState`)의 칩 매핑은 쓰는 Phase에서 정한다. Concert state chip "D-7"은 텍스트 속성이 없다 | P2(공용 칩), 매핑은 사용 Phase |
| **list** — 10개 변형(`Hierarchy` First/second-closed/second-open/second-radio/third × `value type` text/badge/none/account/text+money 중 일부), 텍스트 속성 `label`·`value text` | 펼침형은 Radix `Collapsible` | Collapsible | 정보 행. `second-radio`는 이름과 달리 체크박스(`Box`)를 쓴다. `account`에 컴포넌트가 아닌 "복사" 버튼이 들어 있다 | P2 |
| **List**(호스트 행) — Role tag × Default/add | — | — | 도메인. 아바타 60px | P10a |
| **concert menu** — selected/unselected | — | — | 공연 어드민 사이드메뉴 항목. 도메인 | P11 |
| **Card list**, **example poster**(1~4, 준비중 × `size` mobile 94×133 / desktop 145×205 — size 축은 2026-10-25) | — | Card | 도메인. **호스팅 센터 공연준비 홈의 카드**다(인스턴스는 예시 `303:2082` 하나). 2026-10-25: 정보 줄이 호스트명 · 날짜 · **시각("19:30~21:30", 새 줄)** · 장소 4줄이 됐고 "호스트: "·"날짜: "·"장소: " 접두어가 빠졌다. Card list 안에 ⋮(`ic/more` 24를 20×20으로 줄여 씀)와 Concert state chip. ⋮는 지난 공연 카드에도 그려져 있지만 계획(P11)대로 **준비중 공연 + 매니저 이상**일 때만 보인다(§5 확인 요청). 호스트·날짜·장소는 각 1줄 말줄임, 제목은 디자이너 메모로 최대 2줄(컴포넌트 설정은 줄 제한 없음) | P10a |
| **ConcertCard** — 포스터 + 날짜 + 제목, 텍스트 속성 `Title`·`date` | `<Link>` + 인라인 진행 표시(tech-decisions §3) | Card | 도메인. 제목 Kartrider 18(§1), **제목 2줄 말줄임**(컴포넌트 설정), 날짜는 말줄임 없음. 2026-10-25: 포스터 모서리 8이 변수 `35:152`(값 8 — 같은 변수가 간격·패딩에도 묶여 있다, §5 모서리 변수 요청과 같은 문제)에 묶였다 | P5a |
| **Top app bar** — `Property 1` Default/only title/no title/Title+Backward × `leading icon` × `profile`(Default/true/false), Slot 2개 | — | — | 관객·호스팅 헤더. 모두 390폭(데스크탑 헤더 없음). `Default, leading icon=true, profile=false` 변형은 제목 옆에 ▾(`ic/chevron-down` 12)가 붙고 아랫줄에 공연 이름이 있는 **공연 전환형**이다(전환 메뉴는 없음). 제목은 텍스트 속성이 아니다. 긴 제목: `Title+Backward` 변형은 1줄 말줄임, 사본 `495:457`은 2줄 말줄임(이 사본은 2026-10-25에 지워졌다), 나머지 변형은 말줄임 없음 — 하나로 통일 요청(§5). 컴포넌트 세트 자체는 2026-10-25에 바뀌지 않았다. 모든 변형의 Slot·Slot2(24×24)가 비어 있다(`Title+Backward`에도 뒤로가기 아이콘이 없다). profile 아바타는 Avatar 32 grey. 관객과 호스팅이 같이 쓰므로 `src/ui/components/Header`(directory-structure)로 둔다 | P2 |
| **ic** — 아이콘 **44종(변형 58개)**. 기본 24 outline, 둥근 선 2px(lucide 방식). filled는 12종(Ticket·dashboard·home·clock·circle-request/check/reject·Settings는 둘 다, mail·phone·open chat·etc는 filled만), 12px는 8종(more·check·chevron-down/up·gift·add·minus·close, gift·minus는 12px만), 16px는 `information` 1종 | — | — | `<Icon name size variant />`. 빌드 때 SVG를 컴포넌트로. 색은 `currentColor`로 바꾼다 — 예외(다색): `instagram`(그라데이션), 알림 점이 있는 `notificatio_onn`·`Ticket-alert`(빨간 점, `brand/accent`), `Settings` filled(회색 원 배경), `chat`(검정 말풍선 + 흰 점 3개), `gift` 12(검정 채움 + 밝은 리본 선). `chat`의 점(Common/100)과 `gift` 12의 리본(`text/on-brand`)은 다크 모드에서 몸통(`text/primary-label` Dark = Neutral 50)과 같은 색이 돼 사라진다 — 투명으로 뚫어 `currentColor` 하나로 쓰는 것을 권한다(디자이너 확인). **SVG 추출이 깨지는 것**: `home` outline(`120:972`)은 `SVG_STRING`으로 뽑으면 외곽선이 빠지고 문만 나온다(둥근 모서리 처리 문제로 보임), `Ticket-alert`(`213:34`)는 배지가 틀 밖으로 나가 28×28로 뽑힌다. 출처는 결정 요약 아래 표. **2026-10-25**: 세트가 **53종·변형 68개**가 됐다 — 새 이름 9개 `edit`(`538:2529`)·`up`(`651:356`)·`diagonal`(`538:2534`, ↗)·`pop out`(`538:2766`)·`archiving`(`538:4837`)·`location`(`662:746`)·`music`(`662:749`)·`log out`(`538:5095`)·`update`(`538:5100`), 새 크기 `chevron-left`·`chevron-right` **20**(`622:2133`·`622:1841`). `Ticket` → `ticket`(소문자). `Ticket` filled는 세트에서 빠져 낱개 컴포넌트 `ic/ticket/filled/24`(`183:1130`)가 됐다. 세트 밖 낱개 프레임 `ic`(`662:722`·`662:726`, 같은 그림 둘)·`icon/music-4`(`662:730`)가 더 생겼다. `favorite` 선 색은 shadcn 원격 `mode/foreground`에서 로컬 `text/primary-label`로 바뀌었다(선 굵기는 여전히 원격 변수). 대시보드 상태 아이콘 세트 `ic_대시보드`는 아래 "호스팅 PC·대시보드 컴포넌트" | P1 |
| 일러스트 6종 — `img_포스터 준비중` 180×254, `img_티켓 없음`·`img_예매완료`·`img_선물`·`img_검색 결과 없음` 170×170, `img_login` 285×273 | — | — | 모두 벡터라 SVG로 뽑는다. 빈 화면용. **2026-10-25 벡터가 가벼워졌다** — REST SVG 내보내기 크기(옛 판 → 지금): 포스터 준비중 932KB → 40KB, 티켓 없음 52 → 8KB, 예매완료 52 → 26KB, 선물 454 → 75KB, 검색 결과 없음 271 → 9KB, login 970 → 60KB. 티켓 없음·예매완료·login은 채움과 같은 색의 외곽선이 빠졌고, 포스터 준비중은 색이 바뀌었다(§1). 노드 수는 같다 | P2 |

### Button 상태 색(2026-10-25)

68개 변형에서 읽은 값이다. 모서리·크기·패딩은 위 표와 같다. Disabled는 모든 색에서 배경 `interaction/disabled-bg`(#EEEEED) + 글자 `interaction/disabled-text`(#B8B7B3)이고 **테두리가 없다**(Secondary도).

| Color | Normal | Hover | Pressed | 있는 크기 |
|---|---|---|---|---|
| Primary | `brand/primary` #633EE7, 글자 #F7F7F6(새 변수 `606:1920`) | #4B36C4(Violet 500) | #301891(Violet 600) | small·medium·Large(글자/아이콘 조합 대부분). Hover·Pressed 글자는 `text/on-brand` |
| Secondary | `Background/normal` + 테두리 `surface/default-border` | 배경 #F7F7F6(변수 `120:982`) + 같은 테두리 | 배경 #EEEEED(변수 `197:4875`) + 같은 테두리 | small·medium·Large. 글자색은 위 표(크기마다 다름) |
| primary 2 | 배경 #D5C9FF(Violet 100) + 글자·아이콘 **#8162F1(Violet 300, `424:686` — money option chip 배경과 같은 변수)**. 옛 판 글자는 `text/brand-label` #633EE7 | 배경 #B49FFD(Violet 200) + 글자 #633EE7 | 배경 #8162F1(Violet 300) + 글자 #F7F7F6 | medium 아이콘형(새로 생김)·Large(텍스트형·아이콘만) |
| round Primary | `text/primary` #141413 | #232220(Neutral 700) | #0A0A09(Neutral 900) | 56 원형 |
| round Secondary(새로 생김) | `text/inverse` #F7F7F6 | #EEEEED(변수 `119:736`) | `surface/default-border` #DDDCDA | 56 원형, Disabled 없음 |

- Button 페이지에 상태 라벨 글자(Normal·Hover·Pressed·Disabled·Selected·Primary·Secondary·Primary2 — `645:1513`~`645:1519`, `650:1323`~`650:1330`)가 생겼다. 컴포넌트가 아닌 견본 표의 머리글이다.
- 대비(계산): primary 2 Normal 2.75:1(옛 4.04:1), Hover 2.76:1, Pressed 3.96:1. §5 대비 요청에 더한다.

### 호스팅 PC·대시보드 컴포넌트(2026-10-25)

2026-10-25에 새 페이지 "┗ Menu"(`538:1497`)와 Top bar 페이지에 생긴 컴포넌트다. GUI 화면 파일이 원격으로 쓰는 같은 이름의 컴포넌트(gui-screens §6)는 **이 파일의 컴포넌트다** — GUI 파일 `components`의 원격 키가 이 파일 컴포넌트 키와 같다(2026-10-25 대조). 그래서 아래 "없는 컴포넌트 — GUI에 그려진 것"에 있던 해당 행을 이 표로 옮겼다. 화면 안에서의 배치·폭은 [`gui-screens.md`](./gui-screens.md) §3.

| Figma(이 파일 노드 · GUI 원격 노드) | 구성 · 크기 · 토큰 | 코드 | Phase |
|---|---|---|---|
| **`Top bar_Host`** `538:4262` · GUI `727:23925` | 1440×58, 배경 #FFFFFF(새 변수 `606:1921`), 아래 선 1px #F7F7F6(`120:982`), 좌우 패딩 24. 왼쪽 로고(dudoong, "host" 글자 없음) + 글자 메뉴 "공연 둘러보기"(`text/tertiary-label`)·"공연 준비하기"(`text/primary-label`), 둘 다 `Heading/sm - emphasized` 16 Bold, 메뉴 칸 높이 58. 오른쪽 `ic/notification` 24 + 간격 20 + Avatar 32 grey + 닉네임 `Label/md` + `ic/chevron-down` 12. 옛 `Top app bar` 사본 `495:457`은 지워졌다 | 호스팅 셸 전역 상단 바(plan P4s) | P4s |
| **`host title`** `619:2116` · GUI `727:23982` | 390×64, 좌우 패딩 24. 왼쪽 `ic/menu` 24 + 로고("dudoong" + "host" 판). 벨 없음. GUI 로컬 `467:3169`가 이 파일로 옮겨졌다 | `Header` `logo="host"`(P2에 있음) | P2 · P10a |
| **`사이드바 메뉴`** `91:913`(`true` `91:912` / `false` `91:766` / **`alert` `538:2786`** 새로 생김) · GUI `727:25256`~`727:25258` | 옛 Sample GUI 로컬 `Component 1`이 이름을 바꿔 Menu 페이지로 왔다. 행 249×47, 패딩 12, 아이콘 20 + 간격 16, 글자 #F7F7F6(`606:1920`) 18(`Heading/md2`, 선택은 `- emphasized`). 선택 배경은 #F7F7F6 10%(변수 없음, 모서리 12 `36:50`) — 옛 판은 `brand/primary`. `alert`는 오른쪽에 Badge large(빨강, 숫자) | 공연 사이드바 `SidebarItem` | P4s |
| **`공연 리스트_Desktop`** `585:753` · GUI `741:28246` | 1196×205. `example poster` desktop 145×205 + 간격 24 + Concert state chip large + 공연명 `Heading/md - emphasized` 20 + 호스트·날짜·시각·장소 4줄 `Body/lg` `text/secondary-label`(각 1줄 말줄임) | 공연준비 홈 PC 목록 행 | P10a |
| **`My`** `585:752` | 263×494, 배경 `Background/normal`, 모서리 20(`161:3481`), 패딩 20, 그림자 `drop shadow2`. 프로필(Avatar 45 + 닉네임 `Label/lg-emphasized` + 이메일 `Label/sm` + 검정 원 안 `ic/edit`) / 티켓·주문내역·관심 호스트·지난 공연 아카이빙(아이콘 20 `ticket`·`order detail`·`favorite`·`archiving` + `Label/md-emphasized`) / "내 호스트" + 호스트 줄(Avatar 24) + 새 호스트 만들기 / 서비스 업데이트 노트(`update`) · 로그아웃(`log out`). 구획 사이 `surface/default-border` 선. GUI 파일은 아직 이 컴포넌트를 쓰지 않는다. 항목은 와이어 관객 PC 상단 바 드롭다운(figma-structure 2026-10-25 절)과 같다 | PC 아바타 ▾ 메뉴(Radix `DropdownMenu`) | P4s(V) |
| **`승인 메뉴_desktop`** `538:2562` · GUI `727:23999` | 112×123, 배경 #F7F7F6(`120:982`), 모서리 20(`161:3481`), 패딩 12·16. `ic_대시보드` 36 + 라벨 `Label/md` `text/secondary-label` + "0건" `Heading/md - emphasized` + 오른쪽 위 `ic/diagonal` 24 | 대시보드 통계 카드(↗ 링크형) | P13a(V) |
| **`승인 메뉴_mobile`** `605:1665` | 155×61, 같은 배경, 모서리 20(직접 값), 패딩 12, `ic_대시보드` 36 + 라벨 `Label/sm` + "0건" `Heading/md2 - emphasized` | 모바일 통계 카드 | P13a(V) |
| **`ic_대시보드`** `538:2072`(승인대기·승인완료·승인거절·환불요청, 36×36) · GUI `727:14604`~`727:14607` | GUI 로컬 `illust_dashboard`(`14:1529`, 지워짐)를 대체. 칠한 색 구성(#1C7CE9·#27AF59·#FA5E6C·#FD5432·#FCBC2C·#FD8708)이 옛 것과 같다 — 코드 `dashboard-*.svg`와 같은 색이다(모양은 비교하지 않았다) | `<Illustration name="dashboard-*" />`(P2에 있음) | P2 |
| **`티켓 판매 정보`** `627:1864`(`판매 후` `605:1666` / `판매 전` `627:1863`) · GUI `748:33213`·`748:33214` | 260×238 / 260×166, 배경 #F7F7F6(`120:982`), 모서리 20(`161:3481`). 제목 `Heading/md2 - emphasized`. 판매 후: 도넛 104 + 범례(티켓 이름 `Label/sm` 1줄 말줄임 — 견본 문구 "티켓이름길면말줄임표하세요"·"색상은 고정하려고") + 판매 장수·총액(`Label/md` + `Heading/lg-emphasized`). 판매 전: "아직 판매된 티켓이 없어요!" `Body/md` `text/tertiary-label` | 대시보드 판매 카드 | P13a(V) |
| **`입장 현황`** `652:1902`(`type=데스크탑` `606:1922`만) · GUI `748:35312` | 260×166, 배경 #F7F7F6, 모서리 20(직접 값). 제목 + "100/238" `Heading/lg-emphasized` + 막대 + "QR 체크인 열기" `Label/lg-emphasized` `brand/primary` + `ic/forward` 16. 모바일 변형은 없다 | 대시보드 입장 카드 | P13a(V) |
| **`필수 체크리스트`** `627:1799`(`unchecked` `622:2201` / `checked` `627:1785`) · GUI `748:35374`·`748:35375` | 318×287, 배경 #F7F7F6, 모서리 20(직접 값), 패딩 24·20. 제목 `Heading/md2 - emphasized` + 안내 `Body/md` + 체크 줄 3개(기본 정보 입력·상세 정보 입력·하나 이상의 티켓 생성) + Button Large [공연 등록하기](unchecked는 Disabled `206:4961`, checked는 Normal `36:77`) | 등록 전 대시보드 | P13a(V) |
| **`일정 패널`** `605:1951` · GUI `741:28401` | 293×686, 배경 `Background/normal`, 선 #EEEEED(`119:736`), 패딩 28·24, 간격 19. `날짜` + `일정` 4개 | 대시보드 우측 패널 | P13a(V) |
| **`날짜`** `605:1875` · GUI `727:16823` | 245×79. "26년 10월" `Label/lg-emphasized` + 요일(SUN~SAT `Label/sm`)·날짜(`Label/md`) 7칸, 글자 `text/tertiary-label` | 주간 줄 | P13a(V) |
| **`일정`** `605:1848`(`지난 일정` `605:1782` / `현재 일정` `605:1783` / `미래 일정` `605:1784` / `미래일정_공연완료` `605:1785`) · GUI `741:28379`~`741:28382` | 245폭, 모서리 12(`36:50`), 패딩 12, 체크박스 `Box` + 제목 `Label/lg-emphasized` + 날짜 `Label/md`. 지난 = 배경 #F7F7F6 + 회색 체크(`Box` checked·disabled). 현재 = 배경 `brand/primary-subtle` + 보라 체크·보라 글자 + 기간 2줄 + `img_예매완료` 90. 미래 = 흰 배경 + 테두리 `surface/default-border` + 빈 체크. 공연완료 = 날짜 없음 | 단계 타임라인 항목 | P13a(V) |

- 모서리 20은 같은 값이 변수(`161:3481` — `My`·`승인 메뉴_desktop`·`티켓 판매 정보`)와 직접 값(`승인 메뉴_mobile`·`입장 현황`·`필수 체크리스트`)으로 섞여 있다. 카드 배경 #F7F7F6은 변수 `120:982`(dropdown item 선택 배경과 같은 변수)다.
- 이 컴포넌트들의 숫자는 Pretendard다(§1 폰트, Q14).

### 디자이너가 남긴 사용 메모

예시 텍스트에 적혀 있던 규칙이다.

| 위치 | 메모 | 코드 |
|---|---|---|
| 대시보드 예시 `194:1126`(같은 내용의 사본 `197:3463`) | "티켓이름길면말줄임표하세요" | 티켓 이름 한 줄 말줄임 |
| 같은 화면 | "색상은 고정하려고" | 차트 색 고정 |
| 호스팅 센터 예시 `303:2082` 안 Card list 인스턴스 `303:2546` | "고스락 정기공연 최대 두줄까지 가능합니다" / "장소: 얘네는 한줄만 가능함" | 제목 2줄, 장소 1줄 말줄임 |
| Top app bar 사본 `495:457`(2026-10-25 지워짐) | 긴 제목 시험 — 2줄 뒤 말줄임 | 컴포넌트 변형(1줄)과 다르다. 통일 요청(§5) |
| `티켓 판매 정보` 범례 견본(2026-10-25 컴포넌트) | 위 대시보드 예시의 두 메모가 범례 티켓 이름 견본으로 들어갔다. 범례 이름은 1줄 말줄임으로 설정됐다 | 같음 |

### 없는 컴포넌트

계획에는 필요한데 디자인 시스템에 아직 없다. GUI 화면 파일(`1Cn4WOu6TDaSajbFIuH6fO`)에 화면 안 패턴으로 그려진 것과 여전히 없는 것을 나눴다. 디자인 시스템에 컴포넌트로 들어오기 전까지는 GUI의 모양을 따라 Radix 기반으로 만든다.

**GUI에 그려진 것** (디자인 시스템 컴포넌트는 아니다). 2026-10-25에 이 표에 있던 데스크탑 사이드바 메뉴·PC 상단 바·PC 일정 패널·대시보드 통계 카드·판매 정보(도넛)·입장 현황·체크리스트는 디자인 시스템 컴포넌트가 돼 위 "호스팅 PC·대시보드 컴포넌트"로 옮겼다(옛 원격 `Component 1`·`Frame 1707480333`~`336`을 대체).

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
| 유의사항 안내(Alert) | `727:23088`, `669:2787` | |
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
- 관객 데스크탑 헤더 — Top app bar는 모두 390폭. 호스팅 PC 상단 바는 `Top bar_Host`(위 "호스팅 PC·대시보드 컴포넌트")로 생겼고, 아바타 ▾ 드롭다운은 `My`로 생겼다. 관객 PC 상단 바(로고 + 글자 메뉴 + 검색 + 로그인/아바타 ▾)는 와이어프레임에만 있다(`626:19888`·`640:17991`) — 구성이 `Top bar_Host`와 같다(검색만 더함, gui-screens §3). GUI 요청 Q23
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

**로컬 헤더 2종.** Top app bar와 별도로 GUI 화면 파일에만 있다: `basic title`(`567:9967`, search/no search — 관객 로고 헤더), `host title`(`467:3169`, 메인은 `37:758` 안, 호스팅 홈 로고 헤더 "dudoong host", 벨 없음 — 벨은 햄버거 드로어 안에 둔다. 제목형 대안은 design-requests Q17). 코드는 `Header` 하나에 로고형 변형을 둔다. 2026-10-25: `host title`은 디자인 시스템 컴포넌트 `619:2116`이 됐다(위 "호스팅 PC·대시보드 컴포넌트"). `basic title`은 여전히 GUI 로컬이다.

**`illust_dashboard`**(`14:1529`, 로컬)는 헤더가 아니라 통계 카드용 상태 아이콘 36×36 4종(승인대기·승인완료·승인 거절·환불 요청)이다. 2026-10-25에 GUI에서 지워지고 디자인 시스템 `ic_대시보드`(`538:2072`)로 대체됐다. 옛 PC 대시보드 타임라인 일러스트는 컴포넌트가 아닌 벡터 그룹(`14:1462`)이었다 — 새 `일정` `현재 일정`은 `img_예매완료`를 쓴다.

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
| Concert state chip | D-0 표기. 공연 중(`ONGOING`)은 2026-10-25에 `ing`("공연중")으로 생겼다 | `ONGOING`은 `ing` 모양("공연중"), `dDay` 0은 "D-day" |
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
  | 모서리 6 (Ticket·Concert state chip, money option chip) | `radius[1]` 4 또는 `radius[2]` 8 — 디자이너 확인. 2026-10-25: Concert state chip large는 8(변수)이고 small은 여전히 6 |
  | 모서리 8 (Filter Chip, ConcertCard 이미지 — 2026-10-25에 ConcertCard 이미지는 변수 `35:152`에 묶였다) | `radius[2]` |
  | 모서리 20 (2026-10-25 `승인 메뉴_mobile`·`입장 현황`·`필수 체크리스트` — 같은 값의 형제 카드는 변수 `161:3481`) | `radius[6]` |
  | 사이드바 메뉴 선택 배경 #F7F7F6 10%(변수 없음) | 컴포넌트 전용 토큰(검정 사이드바 위 흰 10%) |
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
| 일러스트(빈 화면 6종, 로그인, 포스터 준비중) | Figma image 페이지(벡터) | `src/ui/illustrations/*.png`(3x) | **PNG로 넣었다(P2)** — Figma 벡터가 0.3~6.5MB(포스터 준비중은 8MB 넘어 SVG 추출 자체가 막힘)라 웹에 맞지 않는다. 래스터화하면 개당 7~28KB. 다시 뽑는 노드 ID는 `Illustration.tsx` 주석. `<Illustration name />`이 정적 import + `<img>`로 그린다(Storybook에서 `next/image`가 안 돌아서). 빌드 해시로 장기 캐시(P2에서 Next 빌드로 확인). **2026-10-25**: Figma 벡터가 가벼워져 REST SVG 내보내기가 8~75KB가 됐다(§3 일러스트 행) — 아래 "Figma가 바뀌면"의 SVG 전환 조건이 생겼다(코드 수정 거리) | P2 완료 |
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

2026-10-25 판에서 달라진 것: Concert state chip D-day·지난 공연이 의미 색으로 바뀌었다(원시 색 요청 일부 해결). 대비는 D-day 3.53:1(옛 2.15:1), 지난 공연 2.86:1(옛 3.10:1), 새 공연중 3.53:1. primary 2 버튼 글자가 Violet 300으로 바뀌어 대비가 2.75:1(옛 4.04:1)로 낮아졌다. Tabs 미선택(`interaction/inactive` on 흰색)·`Top bar_Host` 비활성 메뉴(`text/tertiary-label`)는 2.01:1. `favorite` 선 색은 로컬 변수가 됐다. Tabs 높이 차는 모바일에서 없어졌다(데스크탑 변형은 48·44). 새로 쓰인 변수 12개의 이름 확인이 필요하다(§1).

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
| 원격 변수 연결 | 아이콘 세트의 선 굵기와 `favorite` 선 색, Toast 테두리 굵기가 shadcn 키트 변수에 묶여 있다(2026-10-25: `favorite` 선 색은 로컬 `text/primary-label`로 바뀜) | 연결 끊고 값 또는 자체 변수로 |
| 하드코딩 모서리 | 칩 6, Badge 10, numbering 10, tag 12, Toggle 트랙 12, Checkbox 17, tab item 3, 포스터 4.79, Button medium Disabled 10(형제는 변수) | Radius 토큰으로, 알약·원형은 원형 값으로. 칩 6은 토큰에 없는 값 |
| 텍스트 스타일 미연결 | ConcertCard 제목(Kartrider 18), Input·Dropdown 글자, Badge 숫자, 복사 버튼 | 스타일 연결. Kartrider 18용 `Title` 작은 크기 추가 |
| 이름 규칙 | 컬렉션 `Sementic`, `Background`만 대문자, `on Primary container` 공백, emphasized 표기 혼재(` - emphasized` 대 `-emphasized`), 견본 라벨 `md1` ↔ 스타일 `md`, "Katrider" 오타 | 정리 |

**컴포넌트**

| 대상 | 지금 | 요청 |
|---|---|---|
| Input 플레이스홀더 | "stakeholder" | "placeholder" 또는 실제 예시 문구 |
| Search Field 아이콘 | 외부 라이브러리 `icon/search` | 자체 `ic/search`로 |
| Avatar | `size=40` 변형이 실제 45px, 호스트 행에서 60px | 크기 체계 확인, 사진 표시 여부 |
| Tabs | 2개 고정, 선택 44h·미선택 42h(2026-10-25 모바일은 44 통일, 데스크탑 변형은 48·44) | 탭 개수 자유, 데스크탑 높이 통일 |
| 새로 쓰인 변수 12개(2026-10-25, §1) | 이름을 REST로 읽을 수 없다. 대부분 기존 의미 색과 같은 값이다(#F7F7F6·#FFFFFF·#EEEEED·#0A0A09 등) | 이름 알려 주기. 기존 의미 색과 같은 값이면 하나로 |
| primary 2 상태 색(2026-10-25) | 글자가 Violet 300으로 바뀌어 대비 2.75:1, Hover 2.76:1 | 대비 4.5:1 이상 |
| Tabs 미선택·상단 바 비활성 메뉴 | 회색 #B8B7B3 on 흰색 2.01:1 | 대비 확인 |
| "Tablet-QR만" 프레임 이름 | 1133 프레임 2개(`35:172`·`569:5224`)가 12칼럼 데스크탑 그리드가 됐는데 이름은 "QR만"이다 | 이름 정리(Q39) |
| list | `second-radio`가 체크박스를 씀, "복사" 버튼이 컴포넌트가 아님 | 이름 또는 부품 정리 |
| Top app bar | `profile` 값 Default/true/false 중 Default가 하나뿐, 제목이 텍스트 속성 아님, 긴 제목 말줄임이 1줄(`Title+Backward`)·2줄(사본 — 2026-10-25 지워짐)·없음(나머지)으로 제각각 | 축 정리, 말줄임 1줄·2줄 중 하나로 통일, Slot에 뒤로가기·액션 아이콘 예시 |
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
- **로컬 전용**: `Component 1`(`91:913`, 데스크탑 사이드바 메뉴) — 2026-10-25에 `사이드바 메뉴`로 이름이 바뀌어 "┗ Menu" 페이지로 옮겨졌다(§3). Sample GUI 안 인스턴스 21개도 같은 이름이 됐다. 나머지 Sample GUI 변경은 컴포넌트 변경이 인스턴스에 따라온 것(Avatar 색, 사이드바 메뉴 색)이다
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
| 새로 쓰인 변수 12개의 이름(§1) — Desktop Bridge 플러그인을 디자인 시스템 파일에 연결하거나 디자이너에게 받는다 | P4s 전 |

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
| 디자인 시스템 반영(2026-10-25) | 디자인 시스템 파일 2026-10-25T09:12Z 판을 10-14T17:51Z 판과 비교(REST 파일 JSON의 노드·변수 바인딩·스타일 + 렌더·SVG 내보내기). 새 페이지 "┗ Menu"와 호스팅 PC 컴포넌트 14개를 §3 새 표로 — GUI 원격 컴포넌트가 이 파일 것임을 키로 확인하고 "없는 컴포넌트"의 해당 6행을 옮김. Button 27 → 68변형·상태 색 표·medium 46h, round Secondary. Tabs 검정 선택·회색 미선택·데스크탑 변형. Concert state chip `ing`·`size`·의미 색. 아이콘 53종·68변형(9종 + 20 크기), `Ticket` filled 분리. 그리드: Tablet 12칼럼, host 그리드 3개, 그리드 스타일 7개 — GUI 프레임과 여백 대조(§2). `drop shadow2`. 새로 쓰인 변수 12개(이름 미확인), 옛 변수 값 변화 없음. 일러스트 SVG 크기 감소. 숫자 폰트: 디자인 시스템 `Title_number` 그대로, 대시보드 컴포넌트 숫자는 Pretendard(Q14). 코드 수정 거리는 implementation-log |
