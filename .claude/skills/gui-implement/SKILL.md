---
name: gui-implement
description: 화면(V)을 Figma 디자인대로 구현하거나 디자인 변경을 코드에 반영한다 — 열린 Design Sync 이슈 확인, Ready for dev로 근거(GUI/와이어) 판정, Figma 노드 → 디자인 시스템 컴포넌트 매핑, 커스텀 지양 구현, QA 캡처와 Figma 스크린샷 비교, gui-screens 상태 갱신, PR `Closes #n`. "화면 구현", "V 시작", "GUI 반영", "디자인 이슈 반영", "Design Sync 이슈", "피그마대로 만들어", "디자인 바뀐 거 반영", "Ready for dev 화면" 요청, Px-V Phase를 시작할 때 쓴다.
---

# 화면 구현(디자인 → 코드)

규칙의 정본은 `.claude/docs/design-workflow.md`다. 이 스킬은 그 규칙을 **어떤 순서로, 어떤 도구로** 하는지다. 규칙과 이 스킬이 다르면 규칙 문서가 맞다.

- **Figma는 읽기만 한다.** 이 스킬에서 Figma에 쓰는 것은 ⑤의 코멘트뿐이다. 프레임·컴포넌트를 고치지 않는다(디자이너 작업 중 파일).
- 도구: 공식 Figma MCP(`get_design_context`)가 아니라 **REST(`figma_nodes.py`) + figma-console MCP(Desktop Bridge)** 를 쓴다. 토큰은 `~/.claude.json` figma-console env의 `FIGMA_ACCESS_TOKEN` — 출력·커밋하지 않는다(스크립트가 알아서 읽는다).
- 시작 전에 `CLAUDE.md`, `.claude/docs/README.md`, `design-workflow.md`, 그 Phase의 `plan.md` 절(V 범위·완료 기준 V)을 읽는다.

```bash
F() { python3 -I .claude/skills/gui-implement/figma_nodes.py "$@"; }   # zsh는 변수 단어 분리를 안 해서 함수로
F ready                       # GUI 파일의 Ready for dev 노드 목록(파일 전체, 수십 초)
F map <node-id> [gui|wire]    # 노드 안 인스턴스 분류(DS/외부/로컬) + 직접 그린 상자·도형·스타일 없는 글자
F shot <node-id> <out.png> [gui|wire] [--scale 2]   # 노드 PNG(시각 목표·비교용)
```

출력 파일(스크린샷, JSON)은 scratchpad에 둔다. 저장소에 넣지 않는다.

## ① 열린 Design Sync 이슈 확인

```bash
gh issue list --label "Design Sync" --state open --search '-label:"Test: figma-plugin"' --limit 100 \
  --json number,title,labels,updatedAt
gh issue view <n> --comments   # 본문 + 이어 쓴 댓글 모두
```

- 본문의 `<!-- figma-node:<fileKey>/<nodeId> -->` 마커로 노드를 뽑는다. 이번 화면의 근거 노드(②)와 겹치는 이슈를 작업 범위에 넣는다.
- `Design: 디자인 시스템` 이슈가 있으면 **먼저** 그것부터(토큰·`src/ui` 컴포넌트·스토리·`design-system.md`). 화면은 그 뒤.
- 유형별 처리와 닫는 규칙은 `design-workflow.md` §4. 반영할 이슈 번호를 적어 둔다(⑦ PR 본문).

## ② 근거 판정 — Ready for dev?

1. `F ready`로 지금 Ready 노드 목록을 받는다. `gui-screens.md` §0의 기준 시각 이후 목록이 바뀌었으면(늘거나 줄거나 id가 바뀜) §0을 먼저 갱신한다.
2. 이번 화면(라우트)의 GUI 노드 중 Ready가 있나 본다 — 프레임 이름(`대시보드_공연등록후_모바일` 같은 `<화면>_<상태>_<폭>`)과 `gui-screens.md` §1·§2의 대응으로 찾는다. 자식 노드는 조상 프레임이 Ready면 근거다.
3. **Ready 있음 → GUI 근거.** 그 화면의 Ready 노드 전부(폭·상태)를 대상으로 한다.
   **Ready 없음 → 와이어 근거.** `figma-structure.md`에서 그 화면의 와이어 노드를 찾아 `F map <node> wire`·`F shot … wire`. Ready가 아닌 GUI 프레임의 모양은 가져오지 않는다.
4. 판정을 `gui-screens.md` §0 그 화면 줄에 적는다(근거 노드 id + 프레임 이름).

## ③ 매핑 표 — 구현 전에

### 시각 목표를 먼저 받는다

대상 노드마다 `F shot <node> scratchpad/figma/<node>.png`를 받아 Read로 본다. **이 그림은 목표일 뿐 구현 자산이 아니다** — 코드에 이미지로 넣지 않는다. Desktop Bridge가 켜져 있으면 `figma_take_screenshot`(nodeId)으로도 된다.

### 노드를 분류한다

`F map <node>`가 인스턴스마다 분류한다.

- **DS** — `INSTANCE`이고 메인 컴포넌트의 `key`(variant면 그 **컴포넌트 세트**의 `key`)가 디자인 시스템 파일 `0QD9tGSt8ZciDqe7ol2gYH`의 공개 컴포넌트 목록(`GET /v1/files/0QD9tGSt8ZciDqe7ol2gYH/components`·`/component_sets`)에 있다.
- **외부** — `remote: true`인데 DS 목록에 없다(iOS 키트 `StatusBar`, `lucide/*`, 옛 `icon/*`). `GET /v1/components/<key>`가 DS 파일 key를 돌려주지 않는다(403·404).
- **로컬** — `remote: false`(이 GUI 파일 안의 컴포넌트, 예: `Check Button`·`basic title`). DS가 아니다.
- **직접 그림** — 인스턴스가 아닌 것. 채움·테두리가 있는 프레임(상자: 카드·패널), 도형, 글자 스타일이 안 걸린 글자.

화면 하나에서 `remote: true`라고 DS인 것은 아니다(2026-10-31 GUI 파일: 원격 239개 중 DS 195개, 나머지 44개는 다른 라이브러리). 반드시 DS key 목록과 대조한다.

Desktop Bridge로 노드 하나를 볼 때(`figma_execute`, `fileKey: "1Cn4WOu6TDaSajbFIuH6fO"`, 읽기만):

```js
const n = await figma.getNodeByIdAsync('<node-id>');
const mc = n.type === 'INSTANCE' ? await n.getMainComponentAsync() : null;
const set = mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : null;
return mc ? { remote: mc.remote, key: (set || mc).key, name: (set || mc).name, variant: mc.name, props: n.componentProperties } : { type: n.type };
```

Plugin API는 라이브러리 파일 key를 주지 않는다 — 받은 `key`를 위 DS 목록과 대조한다.

### 표를 쓴다

`design-workflow.md` §5 판단 표로 줄마다 정한다. 이 표를 구현 전에 작업 메모(scratchpad)와 PR 본문에 둔다:

| Figma 노드(id · 이름) | 분류 | 코드 | 판단 | 주석·코멘트 |
|---|---|---|---|---|
| `767:50140` Button (Secondary, small) | DS | `<Button variant="secondary" size="sm">` | DS 인스턴스 | — |
| `767:50855` Frame 1707480356 342×152 r16 | 직접 그림(카드) | `TicketCard.css.ts` | 커스텀, DS 불가(카드 컴포넌트 없음) | 주석(→ 커스텀), §3 후보 |
| `<id>` <이름> | 직접 그림 | `<DS 컴포넌트>` | 커스텀, DS 가능 | 주석(→ DS) + 코멘트 |

(위 줄은 형식 예시다 — 노드는 티켓관리 모바일 `767:50048`에서 왔다. 실제 판단은 그때 노드를 보고 한다.)

**편집 전에 재사용할 것을 먼저 찾는다**: `src/ui/components/*`(목록과 props는 각 `*.stories.tsx`), `src/ui/primitives`, `src/ui/theme`(`colors`·`sprinkles`·`typography`), `src/ui/icons`, `src/ui/illustrations`, 이미 있는 `features/*` 도메인 컴포넌트. `design-system.md` §3 표가 Figma 컴포넌트 ↔ 코드 대응이다.

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
2. 그 노드에 Figma 코멘트(형식 고정, `design-workflow.md` §7):
   ```bash
   python3 .claude/skills/figma-dev-sync/comment.py post gui <node-id> --date YYYY-MM-DD-impl --key <화면>-<부분> <<'EOF'
   [개발 · DS 컴포넌트로 구현] <무엇>
   이 부분은 디자인 시스템 밖에서 직접 그려져 있어, 개발에서는 디자인 시스템 <컴포넌트>(<변형>)로 구현했습니다.
   달라지는 점: <차이 1~2개, 없으면 "없음">
   → 디자인 시스템 컴포넌트로 바꿔 주시거나, 직접 그린 모양이 꼭 필요하면 답글로 알려 주세요.
   EOF
   ```
   같은 노드에 여러 줄이면 코멘트 하나로 묶는다. 사용자가 이번 작업에서 Figma 쓰기를 막았으면 코멘트는 달지 않고 본문을 PR에 적어 둔다.
3. 커스텀으로 만든 것이 두 화면 이상에서 반복되면 `design-system.md` §3 "없는 컴포넌트"에 후보로 올린다.

근거 없이 정한 것(Ready에 없는 상태·폭, 일부러 다르게 한 것)은 `implementation-log.md`에 적고 Phase를 마칠 때 `figma-dev-sync`로 남긴다(`design-workflow.md` §8).

## ⑥ QA 캡처와 Figma 비교

1. 스킬 `qa-scenario`로 시나리오를 쓰고 `pnpm qa <feature>`. PC 프레임이 1440이면 그 단계에서 `await page.setViewportSize({ width: 1440, height: 1024 })` 뒤 캡처(기본 desktop은 1280×800).
2. `qa/reports/<feature>/latest/images/`의 캡처와 ③에서 받은 Figma PNG를 **같은 폭으로 나란히** Read로 본다. 볼 것: 배치·간격·글자 크기·색·모서리, 컴포넌트 변형, 에셋 자리·크기, 문구.
3. 차이마다 처리:
   - 범위 안 → 고치고 다시 ⑥.
   - 범위 밖(다른 화면·공용 컴포넌트에 원래 있던 것) → **고치지 않고** 적어 둔다(PR 본문 "범위 밖").
   - 일부러 다르게 한 것(DS로 바꾼 것 포함) → 이미 ⑤에 있다.
4. 비교 결과 표(프레임 · 캡처 · 차이 · 처리)를 PR 본문에 둔다. 리포트·캡처는 커밋하지 않는다.

와이어 근거 화면은 와이어 PNG와 구조·문구·동작만 비교한다.

## ⑦ 상태 갱신과 PR

1. `gui-screens.md` §0 그 화면 줄: 상태(`GUI 구현됨` / `와이어로 구현됨`), 근거 노드, 반영한 이슈.
2. 게이트 `pnpm typecheck && pnpm lint && pnpm test`.
3. **PR 올리기 직전에 ①을 한 번 더** — 작업 중에 새로 온 이슈·댓글을 반영하거나 PR 본문에 적는다.
4. PR 본문: 근거(Ready 노드 / 와이어 노드), ③ 매핑 표, ⑥ 비교 표, 범위 밖 차이, 반영 이슈 `Closes #n`(일부만이면 `Refs #n` + 남은 것). 이슈를 손으로 닫지 않는다.

## 하지 말 것

- Ready가 아닌 GUI 프레임을 근거로 모양을 가져오지 않는다.
- Figma 스크린샷을 코드에 이미지로 넣지 않는다. 에셋을 비슷한 것으로 바꾸거나 다시 그리지 않는다.
- DS로 되는 것을 커스텀으로 만들지 않는다. 화면 안에서 `src/ui`에 있어야 할 컴포넌트를 짓지 않는다.
- 범위 밖 불일치를 이 작업에서 고치지 않는다.
- 디자인 이슈를 손으로 닫지 않는다. 토큰을 출력하지 않는다.
