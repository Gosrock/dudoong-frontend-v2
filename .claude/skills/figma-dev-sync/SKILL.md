---
name: figma-dev-sync
description: Claude가 디자인 근거 없이 스스로 정하고 구현한 것(Figma와 다르게 만든 것, 디자인이 없어 정한 잠정안, 디자이너 확인이 필요한 것)을 GUI 화면 Figma 파일의 "개발 싱크용" 페이지에 디자이너가 읽기 쉬운 카드 리포트로 남기고, 관련 프레임·컴포넌트에 코멘트를 단다. "개발 싱크", "디자이너에게 리포트", "피그마에 결정 남겨줘", Phase를 마치고 디자인 결정이 쌓였을 때 쓴다.
---

# Figma 개발 싱크 리포트

디자이너가 Figma 안에서 바로 읽고 답할 수 있게, 개발이 정한 것을 **카드 리포트 + 프레임 코멘트**로 남긴다.

- 리포트: GUI 화면 파일(`1Cn4WOu6TDaSajbFIuH6fO`)의 페이지 **"개발 싱크용"(`794:3162`)**. 날짜마다 섹션 하나 `개발이 정한 것 — YYYY-MM-DD`(아래로 쌓인다).
- 코멘트: 카드가 가리키는 GUI 프레임과 디자인 시스템 파일(`0QD9tGSt8ZciDqe7ol2gYH`) 요소에.
- **쓰기 범위는 "개발 싱크용" 페이지와 코멘트뿐이다.** 다른 페이지·프레임은 읽기만 한다(디자이너 작업 중 파일).
- 디스코드 기록은 이 스킬에 넣지 않는다(사용자가 따로 요청할 때만).

## 도구가 하는 일

| 일 | 수단 | 필요한 것 |
|---|---|---|
| 리포트 그리기, 노드 확인 | Desktop Bridge 플러그인(`figma_execute`) | GUI 화면 파일에서 플러그인이 켜져 있어야 한다. REST API는 캔버스를 만들 수 없다 |
| 코멘트 달기·지우기 | `comment.py`(REST) | `~/.claude.json` figma-console env의 `FIGMA_ACCESS_TOKEN`(Comments 쓰기 권한) |

파일: `render.js`(그리기, `DATA`를 받는다) · `build.mjs`(리포트 JSON 검사 + 실행 코드 생성) · `comment.py`(코멘트, 기록부 `~/.dudoong-figma-sync.json`).

## 순서

### 1. 항목 모으기 — 근거 있는 것만

Claude가 정한 디자인 관련 결정만 쓴다. 사용자가 정한 것, 백엔드가 정한 것은 넣지 않는다(필요하면 "알림"으로 짧게).
출처: `.claude/docs/design-system.md` §4-2("결정", "Figma와 다르게 한 것", "디자이너 확인")·§5, `design-requests.md`의 새 Q, `implementation-log.md` Phase 절의 "결정"·"문서와 다르게 한 것", 이번 작업의 에이전트 보고. 지난 리포트(같은 페이지의 이전 날짜 섹션)에 이미 있는 항목은 상태가 바뀐 경우만 다시 쓴다.

### 2. 리포트 JSON 쓰기

scratchpad에 `report.json`:

```json
{
  "date": "2026-10-25",
  "title": "개발이 정한 것 — 디자인 확인 요청",
  "subtitle": "Claude(프론트 개발)가 디자인에 정답이 없어 스스로 정하고 구현한 것들. 2026-10-25 기준",
  "sections": [
    { "name": "1. 공통 컴포넌트", "items": [
      { "key": "tabs-lg-48", "tag": "Figma와 다름",
        "title": "Tabs 데스크탑 높이 48로 통일",
        "what": "데스크탑 탭은 선택·미선택 모두 높이 48.",
        "why": "Figma는 선택 48 · 미선택 44라 한 줄에서 높이가 들쭉날쭉합니다.",
        "ask": "48 통일로 괜찮은지",
        "links": [
          { "label": "Tabs 데스크탑(선택)", "file": "ds", "node": "657:2014" },
          { "label": "대시보드(모바일)", "file": "gui", "node": "669:2787", "name": "대시보드_공연등록후_모바일" }
        ] }
    ] }
  ],
  "footer": "답은 이 페이지나 해당 프레임 코멘트에 남겨 주세요."
}
```

- `tag`: `확인 필요`(답이 오면 바꿈) · `Figma와 다름`(일부러 다르게 구현) · `알림`(정보성).
- 문장은 디자이너가 읽는 말로. 코드 용어(훅·스키마·토큰 이름)는 꼭 필요할 때만, 노드 id는 **문장과 `label`에 쓰지 않는다** — 링크가 대신한다(`build.mjs`가 막는다).
- `links`: `file`은 `gui` | `ds`. GUI 노드는 `name`(프레임 이름)도 같이 — 디자이너가 프레임을 새로 만들어 id가 바뀌면 이름으로 다시 찾는다. 노드 id는 `scratchpad/figma/*_now.json`이 아니라 **지금 파일**에서 확인한다(오늘도 바뀌었다).

### 3. 그리기

1. `figma_list_open_files`로 GUI 화면 파일 연결 확인 → `figma_navigate`(lock: true). 연결이 없으면 사용자에게 "GUI 화면 파일에서 Desktop Bridge 플러그인을 켜 달라"고 하고 멈춘다(코멘트만 먼저 달지 묻는다).
2. `node .claude/skills/figma-dev-sync/build.mjs report.json > run.js` — 검사 오류가 나면 JSON을 고친다.
3. `run.js` 내용을 그대로 `figma_execute`(timeout 30000, **`fileKey: "1Cn4WOu6TDaSajbFIuH6fO"` 필수**)로 실행 — 활성 파일이 다른 파일로 바뀌어 있어도 GUI 파일에만 실행되고, GUI 파일 연결이 없으면 실패한다(lock은 플러그인이 끊기면 풀린다). `render.js`도 페이지 `794:3162`가 없으면 아무것도 만들지 않고 멈춘다. 결과의 `cards`(카드 key → 노드 id), `links`(실제로 걸린 노드), `missing`(못 찾은 GUI 링크)을 받는다. `missing`이 있으면 이름으로 찾아 JSON을 고치고 다시 실행하거나 사용자에게 알린다.
4. `figma_take_screenshot`(섹션 id, scale 0.6)으로 확인: 3열 카드, 겹침 없음, 링크 줄. 같은 날짜로 다시 실행하면 그 날짜 섹션을 지우고 새로 그린다.

### 4. 코멘트

1. 같은 날짜를 다시 실행하는 경우 먼저 `python3 .claude/skills/figma-dev-sync/comment.py clear <date>`(그 날짜에 단 코멘트를 지운다).
2. 카드의 `links`마다(같은 노드는 한 번에 묶어) 코멘트:
   ```bash
   python3 .claude/skills/figma-dev-sync/comment.py post gui <node> --date <date> --key <card key> <<'EOF'
   [개발 싱크 · 확인 요청] <카드 제목>
   <무엇을 했나 + 왜 — 2~3문장, 디자이너 말로>
   → <확인 요청>
   리포트: https://www.figma.com/design/1Cn4WOu6TDaSajbFIuH6fO/GUI?node-id=<카드 id의 :를 -로>
   EOF
   ```
   - 디자인 시스템 요소는 `post ds <node>`.
   - 머리말: `확인 필요` → `[개발 싱크 · 확인 요청]`, `Figma와 다름` → `[개발 싱크 · Figma와 다르게 구현]`, `알림` → 코멘트를 달지 않는다(리포트에만).
   - 페이지(CANVAS) 노드에는 달지 않는다 — 그 안의 컴포넌트나 프레임을 고른다.
3. @멘션은 API로 걸리지 않는다(디자이너에게 알림이 따로 가지 않는다). 사용자에게 그렇게 알린다.

### 5. 보고

사용자에게: 섹션 링크, 카드 수(태그별), 코멘트를 단 곳(화면 이름), 못 찾은 노드, 다음에 디자이너 답을 확인할 방법(`figma_get_comments`로 이 리포트 코멘트의 답글 읽기).

## 하지 말 것

- "개발 싱크용" 밖의 노드를 만들거나 고치지 않는다.
- 근거 없는 항목, 사용자 결정을 Claude 판단처럼 쓰지 않는다.
- 토큰을 출력하거나 파일에 쓰지 않는다.
