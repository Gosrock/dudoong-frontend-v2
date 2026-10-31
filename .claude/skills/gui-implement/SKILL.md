---
name: gui-implement
description: 화면(V)을 Figma 디자인대로 구현하거나 디자인 변경을 코드에 반영한다 — 열린 Design Sync 이슈 확인, 디자인 시스템 변경 반영(버전 비교·design-system.md·토큰), Ready for dev로 근거(GUI/와이어) 판정, Figma 노드 → 디자인 시스템 컴포넌트 매핑, 커스텀 지양 구현, QA 캡처와 Figma 스크린샷 비교, gui-screens 상태 갱신, PR `Closes #n`. "화면 구현", "V 시작", "GUI 반영", "디자인 이슈 반영", "Design Sync 이슈", "디자인 시스템 바뀐 거 반영", "피그마대로 만들어", "디자인 바뀐 거 반영", "Ready for dev 화면" 요청, Px-V Phase를 시작할 때 쓴다.
---

# 화면 구현(디자인 → 코드)

규칙의 정본은 `.claude/docs/design-workflow.md`다. 이 스킬은 그 규칙을 **어떤 순서로, 어떤 도구로** 하는지다. 규칙과 이 스킬이 다르면 규칙 문서가 맞다.

- **Figma는 읽기만 한다.** 이 스킬에서 Figma에 쓰는 것은 코멘트 둘뿐이다 — ⑤ "DS로 구현" 코멘트와 아래 "단계마다" 6의 "디자인 없음" 코멘트(진행하면서 바로, 사용자 결정 2026-10-31). 규칙은 `design-workflow.md` §7. 프레임·컴포넌트를 고치지 않는다(디자이너 작업 중 파일).
- 도구: 공식 Figma MCP(`get_design_context`)가 아니라 **REST(`figma_nodes.py`·`ds_diff.py`) + figma-console MCP(Desktop Bridge)** 를 쓴다. 토큰은 `~/.claude.json` figma-console env의 `FIGMA_ACCESS_TOKEN` — 출력·커밋하지 않는다(스크립트가 알아서 읽는다).
- 시작 전에 `CLAUDE.md`, `.claude/docs/README.md`, `design-workflow.md`, 그 Phase의 `plan.md` 절(V 범위·완료 기준 V·**선행**)을 읽는다.

```bash
F() { python3 -I .claude/skills/gui-implement/figma_nodes.py "$@"; }   # zsh는 변수 단어 분리를 안 해서 함수로
F ready                          # GUI 파일의 Ready for dev 노드 목록(파일 전체, 1분 안팎)
F ready --contains <node-id>     # 그 노드가 어느 Ready 프레임 안인지(밖이면 근거 아님)
F map <node-id>                  # 인스턴스 분류(DS/외부/로컬) + DS override + 직접 그린 상자(색)·도형·스타일 없는 글자
F shot <node-id> <out.png> [gui|wire|ds] [--scale 2]   # 노드 PNG(시각 목표·비교용). ds = 디자인 시스템 컴포넌트
D() { python3 -I .claude/skills/gui-implement/ds_diff.py "$@"; }
D versions                       # 디자인 시스템 파일 버전 목록
D diff <기준 버전> --out <dir>    # 기준 판 → 지금 판 컴포넌트·스타일 비교(폴더는 스크립트가 만든다)
```

출력 파일(스크린샷, JSON)은 scratchpad에 둔다. 저장소에 넣지 않는다.

## 단계마다 — 실제 화면 ↔ Figma 확인과 추론 점검(사용자 결정 2026-10-31)

④ 구현 안의 덩어리(공용 컴포넌트, 셸, 화면 하나)를 끝낼 때마다, 그리고 ⑥·⑦ 전에 **실제로 띄운 화면을 `ego-browser` 스킬로 열어** Figma와 맞춰 본다. 게이트·QA 리포트로 대신하지 않는다 — 다음 덩어리로 넘어가기 전에 한다.

**검사는 빠른 것만**(`design-workflow.md` §9 검사 시점, 2026-11-01): `NEXT_PUBLIC_KAKAO_JS_KEY=dummy pnpm typecheck`, 바꾼 파일만 `pnpm exec eslint <파일>`, `pnpm exec vitest related <바꾼 파일> --run`. 이 단계에서는 새 테스트(스토리·QA 시나리오·unit)를 쓰지 않는다 — Phase 끝(⑥)에 한꺼번에.

1. 앱을 띄운다 — 백엔드 없이 `pnpm dev:mock`(로그인 상태는 `/api/__mock/login`·`/api/__mock/logout`). **`http://localhost:<포트>`로 연다** — `127.0.0.1`로 열면 Next dev 리소스가 막혀 하이드레이션이 안 된다(P4s-V). 폭은 `page.cdp("Emulation.setDeviceMetricsOverride", …)`로 Figma 프레임 폭(390 · 1133/1024 · 1280 · 1440)에 맞춘다.
2. 같은 폭의 브라우저 스크린샷과 ③의 Figma PNG(`F shot`, 와이어 근거면 와이어 PNG)를 나란히 Read로 본다. 누를 수 있는 것(메뉴 열기·드로어·드롭다운)은 실제로 눌러 열린 상태도 본다.
3. **다르게 구현한 것**을 줄마다 적는다 — 배치·간격·크기·글자·색·모서리·아이콘·문구·변형. 범위 안이면 고치고 다시 1, 범위 밖이면 PR "범위 밖", 일부러 다르게 한 것이면 그 이유.
4. **근거 없이 추론해서 정한 것**을 따로 적는다 — Figma·와이어·문서에 없는데 Claude가 정한 값·문구·동작·링크 목적지·아이콘 대체·토큰 반올림 등. 각 줄에 "근거 없음 / 무엇을 보고 그렇게 정했나 / 되돌리려면"을 쓴다. 이 목록은 `implementation-log.md` 그 Phase 절 "결정"과 ⑦ PR 본문에 옮기고, 사용자 결정이 필요한 것은 다음 덩어리 전에 묻는다(디스코드 기록에는 `🤖 Claude 판단` + 태그).
5. 확인한 덩어리 · 폭 · 다른 점 · 추론한 것을 작업 메모(scratchpad)에 남긴다 — ⑥ 비교 표와 PR 본문의 원본이 된다.
6. **Figma에 내용이 없거나 비어 있는 곳은 진행하면서 바로 Figma 코멘트로 남긴다**(사용자 지시 2026-10-31 — 따로 확인받지 않는다). 상태(hover·열림·로딩·실패·빈 값·개수 초과), 폭(모바일 최대 폭·1920 이상), 목적지(로고·아이콘이 가는 곳), 문구, DS에 없는 아이콘처럼 화면을 만들려면 필요한데 그려지지 않은 것. 그 부분을 가장 작게 감싸는 노드(GUI·와이어·디자인 시스템 중 근거 파일)에, 같은 노드는 하나로 묶어:
   ```bash
   python3 .claude/skills/figma-dev-sync/comment.py post <gui|ds|FUQb8ldGBp3uYUuXPV5FDC> <node-id> --date YYYY-MM-DD-impl --key <화면>-<부분> <<'EOF'
   [개발 · 디자인 없음] <무엇>
   <비어 있는 것 1~3줄 — 디자이너 말로, 코드 경로·토큰 이름 없이>
   개발에서는 지금 <이렇게> 해 두었습니다.
   → 디자인을 정해 주시거나, 지금 방식이 괜찮으면 답글로 알려 주세요.
   EOF
   ```
   머리말 `[개발 · 디자인 없음]`은 ⑤ `[개발 · DS 컴포넌트로 구현]`·`figma-dev-sync` `[개발 싱크 · …]`와 구별한다. 기록부 키는 `-impl` 날짜(figma-dev-sync `clear`가 지우지 않게). 단 코멘트(노드 · 머리 줄)는 implementation-log 그 Phase 절과 PR 본문에 적고, 디스코드에도 남긴다. 페이지(CANVAS)·화면 프레임 전체에는 달지 않는다. 같은 내용의 열린 코멘트가 이미 있으면(`comment.py list <파일> <node-id>`) 새로 달지 않고 `comment.py reply <파일> <comment_id> --date … --key …`로 잇는다.

## ⓪ 선행 확인

`plan.md` 그 Phase의 "선행" V 칸이 끝났는지 본다 — 화면은 셸 위에 선다(P4s-V가 먼저, P12-V·P13a-V는 P11-V 뒤 등, plan §2 V 레인). 선행 V가 안 끝났으면 사용자에게 알리고 순서를 묻는다.

## ① 열린 Design Sync 이슈 확인

```bash
gh issue list --label "Design Sync" --state open --search '-label:"Test: figma-plugin"' --limit 100 \
  --json number,title,labels,updatedAt
gh issue view <n> --comments   # 본문 + 이어 쓴 댓글 모두
```

- 본문의 `<!-- figma-node:<fileKey>/<nodeId> -->` 마커로 노드를 뽑는다. 이번 화면의 근거 노드(②)와 겹치는 이슈를 작업 범위에 넣는다. 노드가 Ready 프레임 안인지는 `F ready --contains <node>`.
- 처리 분기는 유형 라벨로 판정한다(design-workflow §4 "라벨로 가르기", 사용자 지시 2026-11-01). **Phase 세션**은 (a) `design-system.md` §8 "반영 대기" 중 이 화면이 쓰는 컴포넌트를 먼저 "디자인 시스템 변경"으로 반영하고, (b) 계획만 고쳐 둔 이 화면의 이슈(`gui-screens.md` §0 "열린 이슈" 칸 — `Design: 수정`·`Design: 신규 화면`)를 범위에 넣어 PR에서 `Closes`. **이슈 반영 세션**(`design-<n>`)은 `GUI 구현됨` 화면의 수정·DS 이슈만 받는다. 화면은 DS 변경 뒤.
- 유형별 처리와 닫는 규칙은 `design-workflow.md` §4. 반영할 이슈 번호를 적어 둔다(⑦ PR 본문).

## 디자인 시스템 변경

`Design: 디자인 시스템` 이슈가 왔을 때, 그리고 **이슈가 없어도 화면 작업을 시작할 때마다** 한다(이슈 없이 바뀌는 일이 있다 — 2026-10-25 오후에만 18번 공개됐고, 10-31 편집도 이슈 없이 들어왔다).

1. `D versions`로 `design-system.md` 머리의 "동기화 기준 버전" 뒤에 버전이 있나 본다. 없으면 끝.
2. `D diff <기준 버전> --out <scratchpad>` — 컴포넌트 세트·변형·값(크기·채움·테두리·모서리·패딩·간격·글자 스타일·변수 id)의 차이.
3. 변수(토큰) 값은 REST로 못 읽는다(403). Desktop Bridge가 디자인 시스템 파일(`0QD9tGSt8ZciDqe7ol2gYH`)에 연결돼 있으면(`figma_list_open_files`) `figma_execute`(`fileKey` 지정, 읽기만)로:
   ```js
   const cols = await figma.variables.getLocalVariableCollectionsAsync();
   const vars = await figma.variables.getLocalVariablesAsync();
   const byId = Object.fromEntries(vars.map(v => [v.id, v]));
   const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
   const fmt = v => v && v.type === 'VARIABLE_ALIAS' ? '→' + byId[v.id]?.name : v && typeof v === 'object' && 'r' in v ? hex(v) : JSON.stringify(v);
   return cols.map(c => ({ name: c.name, vars: c.variableIds.map(id => byId[id]).map(v => `${v.name} | ${v.id} | ${fmt(v.valuesByMode[c.modes[0].modeId])}`) }));
   ```
   결과를 `src/ui/theme/tokens.css.ts`·`palette.ts`와 1:1로 대조한다(Light 모드만 — 다크 모드 미지원). 텍스트 스타일은 `figma.getLocalTextStylesAsync()`로 `typography.css.ts`와. 연결이 없으면 사용자에게 디자인 시스템 파일에서 플러그인을 켜 달라고 한다.
4. `design-system.md`를 고친다 — 해당 줄(§1·§3·§4·§5)에 날짜를 붙여 바뀐 사실, §8에 "버전 → 버전" 절(바뀐 것 · 코드 영향 표), 머리의 동기화 기준 버전을 지금 버전으로.
5. 코드(토큰·`src/ui` 컴포넌트·아이콘·스토리)를 반영한다. 같은 PR로 할지 따로 할지는 크기를 보고 사용자에게 묻는다. 아이콘은 `src/ui/icons/README.md` 절차.
6. 이슈는 반영 PR의 `Closes #n`으로만 닫는다.

## ② 근거 판정 — Ready for dev?

1. `F ready`로 지금 Ready 노드 목록을 받는다. `gui-screens.md` §0의 기준 이후 목록이 바뀌었으면(늘거나 줄거나 id가 바뀜) §0을 먼저 갱신한다.
2. 이번 화면(라우트)의 GUI 노드 중 Ready가 있나 본다 — 프레임 이름(`대시보드_공연등록후_모바일` 같은 `<화면>_<상태>_<폭>`)과 `gui-screens.md` §0·§1·§2의 대응으로 찾는다. 자식 노드는 `F ready --contains <node>`로 Ready 프레임 안인지 확인한다.
3. **Ready 있음 → GUI 근거.** 그 화면의 Ready 노드 전부(폭·상태)를 대상으로 한다. **`Design: 신규 화면` 이슈의 노드도 GUI 근거다**(Ready 표시가 없어도 — 디자이너가 완성 GUI로 등록, 사용자 지시 2026-11-01).
   **Ready 없음 → 와이어 근거.** `figma-structure.md`에서 그 화면의 와이어 노드를 찾아 `F shot <node> … wire`. 와이어는 DS를 거의 안 써서 `map`은 쓸모없다. Ready가 아닌 GUI 프레임의 모양은 가져오지 않는다.
4. 판정을 `gui-screens.md` §0 그 화면 줄에 적는다(근거 노드 id + 프레임 이름).

## ③ 매핑 표 — 구현 전에

### 시각 목표를 먼저 받는다

대상 노드마다 `F shot <node> <scratchpad>/figma/<node>.png`를 받아 Read로 본다. **이 그림은 목표일 뿐 구현 자산이 아니다** — 코드에 이미지로 넣지 않는다. Desktop Bridge가 켜져 있으면 `figma_take_screenshot`(nodeId)으로도 된다. ⑦에서 다시 비교하므로 파일을 남겨 둔다.

### 노드를 분류한다

`F map <node>`가 나눈다.

- **DS** — `INSTANCE`이고 메인 컴포넌트의 `key`(variant면 그 **컴포넌트 세트**의 `key`)가 디자인 시스템 파일 `0QD9tGSt8ZciDqe7ol2gYH`의 공개 컴포넌트 목록(`GET /v1/files/0QD9tGSt8ZciDqe7ol2gYH/components`·`/component_sets`)에 있다.
- **DS + override** — DS 인스턴스인데 채움·테두리·모서리·글자 크기·패딩 등을 덮어썼다(아이콘 색만 바꾼 것은 뺀다 — 코드는 `currentColor`). 2026-10-31 GUI Ready 프레임 안 인스턴스 751개 중 303개가 override가 있고 대부분 아이콘 색이지만, `input Field`·`Button`·`사이드바 메뉴`는 모양이 달라졌을 수 있다. 판단은 `design-workflow.md` §5 표.
- **외부** — `remote: true`인데 DS 목록에 없다(iOS 키트 `StatusBar`, `lucide/*`, 옛 `icon/*`). 원격 239개 중 44개가 이렇다 — `remote`만으로 DS라고 보지 않는다.
- **로컬** — `remote: false`(GUI 파일 안의 컴포넌트, 예: `Check Button`·`basic title`·`티켓 행_모바일`). DS가 아니다 — 디자이너가 화면용으로 묶은 것이라 "직접 그림"과 같이 본다.
- **직접 그림** — 인스턴스가 아닌 것. 채움·테두리가 있는 프레임(상자: 카드·패널 — 색과 변수 여부를 같이 낸다), 도형, 글자 스타일이 안 걸린 글자.

Desktop Bridge로 노드 하나를 볼 때(`figma_execute`, `fileKey: "1Cn4WOu6TDaSajbFIuH6fO"`, 읽기만):

```js
const n = await figma.getNodeByIdAsync('<node-id>');
const mc = n.type === 'INSTANCE' ? await n.getMainComponentAsync() : null;
const set = mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : null;
return mc ? { remote: mc.remote, key: (set || mc).key, name: (set || mc).name, variant: mc.name, props: n.componentProperties, overrides: n.overrides } : { type: n.type };
```

Plugin API는 라이브러리 파일 key를 주지 않는다 — 받은 `key`를 위 DS 목록과 대조한다.

### DS 컴포넌트 → 코드

`design-system.md` §3 표가 Figma 컴포넌트 ↔ `src/ui` 대응이다. **§3에 없는 DS 컴포넌트가 나오면**(디자인 시스템이 바뀐 것) 위 "디자인 시스템 변경"을 먼저 하고 §3에 줄을 더한다. 그 밖에 재사용할 것: `src/ui/components/*`(props는 각 `*.stories.tsx`), `src/ui/primitives`, `src/ui/theme`(`colors`·`sprinkles`·`typography`), `src/ui/icons`, `src/ui/illustrations`, 이미 있는 `features/*` 도메인 컴포넌트.

### 표를 쓴다

`design-workflow.md` §5 판단 표로 줄마다 정한다. 구현 전에 작업 메모(scratchpad)와 PR 본문에 둔다:

| Figma 노드(id · 이름) | 분류 | 코드 | 판단 | 주석·코멘트 |
|---|---|---|---|---|
| `<id>` Button (Secondary, small) | DS | `<Button variant="secondary" size="sm">` | DS 인스턴스 | — |
| `<id>` Button (round) — fills | DS + override | `<Fab>` | override가 변형으로 안 됨 → 변형대로 | 주석(→ DS) + 코멘트 |
| `<id>` 티켓 행_모바일 | 로컬 | `TicketRow.css.ts` | 커스텀, DS 불가(카드 컴포넌트 없음) | 주석(→ 커스텀), §3 후보 |
| `<id>` Frame … 342×40 r8 채움(변수) | 직접 그림 | `<DS 컴포넌트>` | 커스텀, DS 가능 | 주석(→ DS) + 코멘트 |

(형식 예시다. 실제 판단은 그때 노드를 보고 한다.)

Ready 프레임에 펼친 상태가 없어 **DS 컴포넌트만 근거인 것**(예: 아바타 ▾ 메뉴 — DS `My`)도 같은 표에 "DS(Ready 프레임 밖)" 분류로 적는다 — 노드 id는 디자인 시스템 파일의 것, 시각 목표는 `F shot <node> … ds`.

## ④ 구현

`CLAUDE.md` 규칙 그대로:

- 화면은 `'use client'` 컴포넌트, L 훅(`features/<track>/<feature>/model/`)에 연결한다. 훅·도메인 규칙은 V에서 고치지 않는다(바꿔야 하면 사용자에게).
- 스타일 순서: 프리미티브(`Flex`·`Spacing`·`Txt`·`Divider`·`Container`) → `sprinkles()` → `Foo.css.ts`. 색은 `colors`(의미 색 우선), 간격·모서리는 토큰만. 글자는 `<Txt typography="…" color={colors.…}>`.
- **Figma의 절대 위치를 그대로 옮기지 않는다** — 오토레이아웃·간격을 `Flex`(`direction`·`gap`)와 `Spacing`으로, 폭은 반응형 스펙(`gui-screens.md` §3, 1024부터 PC)으로 바꾼다. 고정 위치는 Figma도 고정인 것(하단 고정 바, FAB)만.
- Figma 상태(Hover·Pressed·Focus·Disabled)는 CSS 상태, Selected처럼 앱이 정하는 것만 prop(`design-system.md` §4).
- 누를 수 있는 부분을 실제로 동작하게 만든다(버튼·링크·탭·폼). Figma는 정지 화면이다.
- 정적 에셋은 정확한 것만(`design-workflow.md` §5). 서버 이미지는 데이터로.
- 와이어 근거 화면은 `design-workflow.md` §3 — DS 토큰·컴포넌트만, 모양을 짓지 않는다.

## ⑤ "커스텀인데 DS 가능" — 주석 + 코멘트

매핑 표의 그 줄마다:

1. 코드에 주석(형식 고정, `design-workflow.md` §6):
   ```tsx
   {/* FIGMA-CUSTOM: <무엇>(gui <node-id> "<Figma 노드 이름>") 커스텀 → DS <컴포넌트>. Figma 코멘트 YYYY-MM-DD */}
   ```
   DS로 불가해 커스텀으로 만든 줄은 `→ 커스텀 <파일>.css.ts. DS 후보(design-system §3)`.
2. 구현하면서 바로 단다(확인 없이 — 사용자 결정 2026-11-01). 단 목록(노드 · 머리 줄)은 PR 본문·디스코드에 남긴다. 형식 고정(`design-workflow.md` §7):
   ```bash
   python3 .claude/skills/figma-dev-sync/comment.py post gui <node-id> --date YYYY-MM-DD-impl --key <화면>-<부분> <<'EOF'
   [개발 · DS 컴포넌트로 구현] <무엇>
   이 부분은 디자인 시스템 밖에서 직접 그려져 있어, 개발에서는 디자인 시스템 <컴포넌트>(<변형>)로 구현했습니다.
   달라지는 점: <차이 1~2개, 없으면 "없음">
   → 디자인 시스템 컴포넌트로 바꿔 주시거나, 직접 그린 모양이 꼭 필요하면 답글로 알려 주세요.
   EOF
   ```
   같은 노드에 여러 줄이면 코멘트 하나로 묶는다.
3. 커스텀으로 만든 것이 두 화면 이상에서 반복되면 `design-system.md` §3 "없는 컴포넌트"에 후보로 올린다.

근거 없이 정한 것은 "단계마다" 4로 `implementation-log.md`에 적는다. 그중 **Figma에 그려지지 않아 정한 것**은 "단계마다" 6 코멘트로 이미 남았다. Phase를 마칠 때 `figma-dev-sync` 리포트에는 **나머지**(Figma에 있는데 일부러 다르게 한 것, 와이어 화면에서 정한 배치)만 올리고, 이미 코멘트한 것은 "코멘트로 물음" 한 줄로만 적는다(`design-workflow.md` §8).

## ⑥ QA 캡처와 Figma 비교

1. **Phase 끝에 한 번** — 스토리(새 `src/ui` 컴포넌트)와 QA 시나리오(스킬 `qa-scenario`)를 이때 한꺼번에 쓰고 `pnpm qa <feature>`. PC 프레임이 1440이면 그 시나리오를 `viewports: ['desktop']`로 두고 단계에서 `await page.setViewportSize({ width: 1440, height: 1024 })` 뒤 캡처(기본 desktop은 1280×800, mobile 프로젝트에서 크기를 바꾸면 안 된다).
2. `qa/reports/<feature>/latest/images/`의 캡처와 ③에서 받은 Figma PNG를 **같은 폭으로 나란히** Read로 본다. 볼 것: 배치·간격·글자 크기·색·모서리, 컴포넌트 변형, 에셋 자리·크기, 문구.
3. 차이마다 처리:
   - 범위 안 → 고치고 다시 ⑥.
   - 범위 밖(다른 화면·공용 컴포넌트에 원래 있던 것) → **고치지 않고** 적어 둔다(PR 본문 "범위 밖").
   - 일부러 다르게 한 것(DS로 바꾼 것 포함) → 이미 ⑤에 있다.
4. 비교 결과 표(프레임 · 캡처 · 차이 · 처리)를 PR 본문에 둔다. 리포트·캡처는 커밋하지 않는다.

와이어 근거 화면은 와이어 PNG와 구조·문구·동작만 비교한다.

## ⑦ 상태 갱신과 PR

1. `gui-screens.md` §0 그 화면 줄: 상태(`GUI 구현됨` / `와이어로 구현됨`), 근거 노드, 반영한 이슈.
2. 로컬에서는 `NEXT_PUBLIC_KAKAO_JS_KEY=dummy pnpm typecheck`와 `pnpm lint`까지만. **전체 게이트(`pnpm test` 전체·`pnpm test:stories` 전체·build)는 PR CI(`pr-gate`)에 맡긴다** — push 뒤 `gh pr checks <n>`을 기다려 실패만 고친다(`design-workflow.md` §9, 2026-11-01). e2e 전체는 관제탑이 그룹 끝에 돌린다.
3. **PR 올리기 직전에 다시 본다** — 디자이너는 Ready 표시를 그대로 둔 채 프레임 안을 고치기도 한다(2026-10-31 티켓관리 모바일 `767:50048`의 카드가 이슈 없이 로컬 컴포넌트 `티켓 행_모바일`로 바뀜).
   - ①을 다시 — 새 이슈·댓글.
   - 근거 노드를 `F shot`으로 다시 받아 ③의 PNG와 비교하고, 다르면 `F map`도 다시. 바뀐 것은 반영하거나 PR 본문에 적고 사용자에게 알린다.
   - `D versions` — 디자인 시스템이 그사이 바뀌었는지.
4. PR 본문: 근거(Ready 노드 / 와이어 노드), ③ 매핑 표, ⑥ 비교 표, 범위 밖 차이, 반영 이슈 `Closes #n`(일부만이면 `Refs #n` + 남은 것). 이슈를 손으로 닫지 않는다.

## 하지 말 것

- Ready가 아닌 GUI 프레임을 근거로 모양을 가져오지 않는다.
- Figma 스크린샷을 코드에 이미지로 넣지 않는다. 에셋을 비슷한 것으로 바꾸거나 다시 그리지 않는다.
- DS로 되는 것을 커스텀으로 만들지 않는다. 화면 안에서 `src/ui`에 있어야 할 컴포넌트를 짓지 않는다.
- 범위 밖 불일치를 이 작업에서 고치지 않는다.
- Figma 코멘트를 단 뒤 PR 본문에 빠뜨리지 않는다. 디자인 이슈를 손으로 닫지 않는다. 토큰을 출력하지 않는다.
- 구현 덩어리마다 전체 테스트를 돌리거나 새 테스트를 쓰지 않는다(검사 시점 §9).
