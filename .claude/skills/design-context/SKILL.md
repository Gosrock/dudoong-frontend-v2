---
name: design-context
description: 디자이너·기획자가 두둥 화면을 디자인하거나 기획할 때 "이 화면 왜 이렇게 됐어?", "이 상태는 언제 나와?", "서버에서 이 값이 와?", "개발이 정한 거야 확정된 거야?", "이 코멘트 무슨 뜻이야?"처럼 묻는 것에 답한다 — 디스코드 #프론트 작업 기록 스레드, Figma 코멘트·개발 싱크 카드·Ready for dev, 프론트 코드·설계 문서, 백엔드 코드(Gosrock/DuDoong-Backend)를 읽고 출처를 붙여 디자이너 말로 설명한다. 답이 없거나 결정이 필요하면 확인을 받아 질문 이슈를 남긴다. 읽기 전용이다. 디자인 맥락, 개발 맥락, 기획 질문, "디자이너 질문", "개발에서 어떻게 했어" 요청에 쓴다.
---

# 디자이너 Q&A — 개발 맥락 찾아 주기

개발은 Claude 세션으로 진행되고, 결정은 디스코드 스레드·GitHub 이슈·Figma 코멘트·설계 문서·코드에 흩어져 쌓인다. 이 스킬은 디자이너가 그걸 직접 뒤지지 않아도 되게 **찾아서 디자이너 말로 설명**한다.

- **읽기 전용**이다. 코드·문서를 고치지 않고, Figma에 코멘트를 달지 않고, 디스코드에 글을 올리지 않는다. 유일한 쓰기는 사용자가 확인한 **질문 이슈** 하나(아래 ⑥).
- 대화 상대는 디자이너다. 답은 한국어로, 화면 말로 한다(아래 "말 바꾸기").
- 처음 쓰는 사람이면 준비부터: [`README.md`](./README.md).

## 도구

```bash
S=.claude/skills/design-context
python3 $S/discord_read.py check                         # 디스코드 읽기 권한 확인
python3 $S/discord_read.py threads [--query 말] [--since 2026-11-01]
python3 $S/discord_read.py search 환불 계좌 [--since …]    # 스레드 제목 + 본문, 단어는 모두 포함(AND). 🤖 = Claude 판단 댓글
python3 $S/discord_read.py read <thread_id> [--claude]    # 스레드 전체 / Claude 판단만

python3 $S/figma_read.py comments [gui|ds|wire] [--query 말] [--node 1175:20350 [--deep]] [--all] [--since …]
#   파일을 안 주면 gui. --query는 모두 포함(AND). --deep: 그 프레임 안 하위 노드에 달린 코멘트까지
python3 $S/figma_read.py devsync [--query 말] [--date 2026-10-25]   # "개발 싱크용" 카드 리포트
python3 $S/figma_read.py node <node_id> [gui|ds|wire]               # 노드 이름 · Ready 여부
python3 .claude/skills/gui-implement/figma_nodes.py ready [gui]     # Ready for dev 전체 목록(파일 전체, 수십 초)
python3 .claude/skills/gui-implement/figma_nodes.py shot <node_id> <scratchpad>/x.png   # 프레임 그림

gh issue list -R Gosrock/dudoong-frontend-v2 --search "말" --state all
gh issue list -R Gosrock/DuDoong-Backend --search "말" --state all
gh pr list -R Gosrock/dudoong-frontend-v2 --state open        # 반영 전 변경(아래 ③-1)
gh pr view <n> -R Gosrock/dudoong-frontend-v2 --json title,body,headRefName,files
git fetch -q origin <headRefName> && git show origin/<headRefName>:<경로>   # 브랜치 이름은 pr view로 확인(예: 9yujin/p9-gui-orders)
```

백엔드 코드는 얕게 받아 두고 읽는다(비공개 저장소 — 읽기 권한 필요):

```bash
B=~/.cache/dudoong-design-context/backend
[ -d $B ] && git -C $B pull -q --ff-only || gh repo clone Gosrock/DuDoong-Backend $B -- --depth 1 -b dev -q
grep -rn "REFUND" $B --include='*.kt' --include='*.java' | head   # 백엔드는 대부분 Kotlin. zsh에서는 glob에 따옴표
```

## 순서

### ① 시작 확인 (한 번)

- 프론트 코드가 최신인지: `git fetch -q origin main && git rev-list --count HEAD..origin/main`. 0이 아니면 사용자에게 "코드가 N커밋 뒤처져 있어요"라고 알리고, `main`에 있고 변경이 없으면 `git pull --ff-only`, 아니면 `git show origin/main:<경로>`로 읽는다(여러 파일이면 `git worktree add ~/.cache/dudoong-design-context/main origin/main --detach`로 따로 받아 그 폴더를 읽는 편이 빠르다 — 다음부터는 `git -C <그 폴더> checkout -q --detach origin/main`). 답은 **origin/main 기준**이다.
- 도구가 실패하면(토큰 없음·권한 없음) 그 출처만 빼고 계속하고, 답 끝에 "못 본 출처"로 적는다. README의 해당 절을 가리킨다.

### ② 질문을 화면·기능으로 바꾸기

디자이너는 화면 이름·Figma 프레임 이름으로 묻는다. 먼저 그게 코드·문서에서 무엇인지 찾는다.

- 화면 ↔ 라우트 ↔ Figma 노드: [`gui-screens.md`](../../docs/gui-screens.md) §0(화면별 상태·노드)·§1~§2, 흐름은 [`storyboard.md`](../../docs/storyboard.md)
- Figma 링크를 주면 `figma_read.py node <id>`로 이름을 보고, 그 이름·노드 id로 문서·코드를 찾는다(`grep -rn "1175:20350\|1175-20350"`)
- 화면 코드 위치: `src/app/` 라우트 → `src/features/<audience|hosting>/<피처>/`(화면 `ui/`, 규칙·상태 `model/`)

### ③ 어디를 볼지 고르기

질문 종류마다 **먼저 볼 곳**이 다르다. 위에서 답이 나오면 아래는 확인용으로만 본다.

| 질문 | 먼저 | 다음 |
|---|---|---|
| 이 화면 지금 어떻게 구현됐어? 어떤 상태가 있어? | 코드 `src/features/…/ui`·`model`(상태·문구), QA 시나리오 `qa/scenarios/` | `gui-screens.md` §0(근거가 GUI인지 와이어인지) |
| 왜 이렇게 했어? 누가 정했어? | `design-requests.md` §3(프론트가 정한 것) · `claude-decisions-*.md` · `implementation-log.md` | 디스코드 `search` → `read --claude`, Figma `devsync` |
| 이 코멘트·카드 무슨 뜻이야? | 그 Figma 코멘트(`comments --node`) + 답글 | 코멘트가 가리키는 코드·문서 |
| 디자인 답을 기다리는 게 뭐야? | `design-requests.md` §2(기획 질문 Q번호, 열린 것) · Figma `comments`(열린 것) | 열린 `Design Sync` 이슈(`gh issue list -l "Design Sync"`) |
| 서버에서 이 값이 와? 이 상태가 존재해? 규칙이 뭐야? | [`api-contract.md`](../../docs/api-contract.md)(상태·권한·필드) · [`error-codes.md`](../../docs/error-codes.md) | 백엔드 코드(enum·검증·에러 코드) → `backend-questions.md`(B번호) · 백엔드 이슈 |
| 정책·약관 문구 | [`legal-copy.md`](../../docs/legal-copy.md) — **문구를 바꾸자고 제안하지 않는다**(약관 근거) | `legal/` 원문 |
| 디자인 시스템 컴포넌트 · 토큰 | [`design-system.md`](../../docs/design-system.md) | 코드 `src/ui/components`, Figma `comments ds` |
| 언제 나와? 어디까지 됐어? | [`progress.md`](../../docs/progress.md) | `plan.md`, 디스코드 최근 스레드 |

#### ③-1 반영 전 변경도 본다

`main`만 보면 틀릴 수 있다 — 개발이 이미 바꿔 PR로 올렸지만 아직 반영 전인 결정은 그 PR 브랜치(코드·문서)와 최근 디스코드 댓글에만 있다. 질문한 화면·주제가 **열린 PR**(`gh pr list`)의 제목·바뀐 파일에 걸리면 그 브랜치를 읽고, 답에 "⏳ 반영 전(PR #n)"으로 따로 적는다. 지금 서비스·`main`의 모습과 반영 뒤 모습을 둘 다 말한다.

디스코드 스레드는 시간순 작업 기록이라 **"왜"와 "언제"** 에 강하고, 코드는 **"지금 실제로 어떻게"** 의 정답이다. 문서는 그 둘을 정리한 것이다.

### ④ 근거 판정 — 확정인지 잠정인지

답의 핵심 문장마다 상태를 붙인다.

| 표시 | 뜻 | 알아보는 법 |
|---|---|---|
| ✅ 확정 | 사람이 정했다(사용자·디자이너 합의·백엔드 답) | 문서에 "사용자 결정", "합의", "(백엔드 #n 답)", 닫힌 Q · B |
| 🤖 Claude 잠정안 | Claude가 근거 없이 정했고 디자이너 확인을 기다린다 | 디스코드 `🤖 Claude 판단:` 댓글, Figma `[개발 · 디자인 없음]` · 개발 싱크 "확인 필요", 문서의 "잠정", "추론", ⚠ |
| 🎨 디자인 따름 | Figma Ready for dev 노드(또는 와이어)대로 | `gui-screens.md` §0 근거 칸, 코드 주석 `FIGMA-CUSTOM:` 은 "Figma와 다르게 DS로 바꾼 것" |
| ⏳ 반영 전 | 개발이 바꿔 올렸지만 아직 `main`에 없다 | 열린 PR(③-1). 위 표시와 같이 쓴다(예: ⏳🤖) |
| ❓ 모름 · 열림 | 아직 답이 없다 | 열린 Q · B · 이슈, 아무 데도 없음 |

- **번호가 어긋나면**(코드 주석과 문서의 Q · B 번호가 다름) 문서 번호를 쓰고 어긋남을 "스킬 밖 메모"로 사용자에게 한 줄 알린다.
- **코드와 문서가 다르면** 코드가 "지금 동작", 문서가 "계획"이다. 둘 다 적고 어긋남을 짚는다.
- **출처끼리 충돌하면** Swagger·백엔드 > `api-contract.md` > `tech-decisions`·`plan` > `figma-structure`(저장소 규칙). v1(운영 중인 옛 사이트)과 v2 계획이 다르면 v2 계획이 맞다.
- 디스코드 댓글은 그 시점 기록이다. 뒤에 바뀌었을 수 있으니 같은 주제의 **더 최근 댓글·문서**로 확인한 뒤 답한다. 날짜를 같이 적는다.
- 추측으로 빈칸을 채우지 않는다. 못 찾았으면 ❓로 두고 ⑥을 제안한다.

### ⑤ 답하기

```
**한 줄 답** — (결론. 확정이면 확정, 잠정이면 잠정이라고)

**자세히**
- ✅ … (근거: design-requests Q42 · 2026-11-01 사용자 결정)
- 🤖 … — 디자이너 확인을 기다리는 잠정안이에요. 바꾸려면: …
- 서버 쪽: … (근거: 백엔드 `OrderStatus` enum)

**지금 화면에서는** — (사용자가 실제로 보는 것. 문구는 코드 그대로 따옴표로)

**출처**
- 디스코드 [스레드 제목](링크) 2026-11-04 댓글
- Figma [프레임 이름](링크) 코멘트
- 문서 `.claude/docs/design-requests.md` Q42 · 코드 `src/features/…/x.ts:12`

**디자인할 때 참고** — (빠진 상태·폭·문구, 서버가 못 주는 값, 같이 정해야 할 것. 있으면만)
```

- 길게 늘어놓지 않는다. 질문에 필요한 것만, 결론 먼저.
- 코드 조각을 보여 주지 않는다. 필요하면 "코드에 이렇게 적혀 있어요"로 풀어 말하고 문구만 그대로 옮긴다.
- 디자인할 때 놓치기 쉬운 것(빈 상태·에러·권한별 차이·모바일/PC·긴 글자)은 "디자인할 때 참고"에 짚어 준다 — 코드의 상태 목록·에러 처리(`patterns.md` §24)에서 찾는다.
- 화면 확인이 도움이 되면 `figma_nodes.py shot`으로 프레임 그림을 받아 보여 줄 수 있다(scratchpad에 저장, 저장소에 넣지 않음).

### ⑥ 질문 이슈 남기기 (확인 받고만)

답이 ❓이거나, 디자이너가 결정을 내렸거나(개발에 알려야 함), 개발·서버에 요청이 있으면 제안한다. **초안을 먼저 보여 주고, 사용자가 "올려줘"라고 한 뒤에만** 만든다.

| 내용 | 저장소 | 라벨 · 제목 |
|---|---|---|
| 화면 · 동작 · 문구 · 개발 잠정안에 대한 답 · 디자인 시스템 | `Gosrock/dudoong-frontend-v2` | 라벨 `Design: 질문` · `[디자인 질문] …` |
| 데이터 · 정책 · API(서버가 주는 값, 상태 규칙, 권한) | `Gosrock/DuDoong-Backend` | 라벨 `design` · `[디자인 질문] …` |

- 화면 변경 자체(프레임을 고침)는 이슈가 아니라 Figma 플러그인 `Design Sync`로 남긴다고 안내한다(`tools/figma-plugin/README.md`).
- 이미 같은 질문이 있는지 먼저 찾는다(`gh issue list --search`, `design-requests.md` Q · `backend-questions.md` B). 있으면 새로 만들지 말고 그 이슈·번호를 알려 주고, 댓글을 달지 묻는다.
- 본문 틀:

```markdown
## 질문
(한두 문장)

## 배경 — 지금 어떻게 돼 있나
- (찾은 사실 + 출처 링크. 확정/잠정 표시)

## 정해 주셨으면 하는 것
- [ ] …

## 관련
- Figma: (프레임 링크) · 문서: (Q/B 번호) · 디스코드: (스레드 링크)

<sub>디자이너 Q&A 스킬(design-context)로 정리 — 질문: (사용자 이름)</sub>
```

```bash
gh issue create -R Gosrock/dudoong-frontend-v2 -l "Design: 질문" -t "[디자인 질문] …" -F <scratchpad>/issue.md
```

만든 뒤 이슈 링크를 알려 준다. 개발 쪽 Claude 세션은 이 이슈를 보고 답·반영한다.

## 말 바꾸기

디자이너에게 개발 용어를 그대로 쓰지 않는다. 처음 나올 때 풀어 쓴다.

| 개발 쪽 말 | 디자이너에게 |
|---|---|
| Q12 · B30 | 디자인 질문 12번(`design-requests.md`) · 서버 질문 30번(`backend-questions.md`) |
| L / V, P9-V 같은 Phase | 로직 / 화면 작업, 작업 단계 이름(`plan.md`) |
| GUI 근거 · 와이어 근거 | Ready for dev 프레임대로 / 와이어프레임 수준으로 단순하게 |
| DS · `src/ui` | Figma 디자인 시스템 컴포넌트 · 코드에만 있는 부품(디자인 시스템이라고 부르지 않는다) |
| `FIGMA-CUSTOM:` | Figma는 직접 그렸지만 디자인 시스템 컴포넌트로 바꿔 만든 곳 |
| 잠정안 · Claude 판단 | 디자인이 없어 개발이 임시로 정한 것(확인 기다림) |
| mock · e2e · QA 시나리오 | 가짜 서버 · 자동 화면 테스트 · 화면 점검 목록 |
| 스테이징 · 운영 · v1 | 시험 서버 · 실제 서비스 · 지금 운영 중인 옛 사이트 |
| enum · status 값 | 상태 종류(예: 승인 대기 · 결제 완료 …) |
| 403 · 400 · 에러 코드 | 권한 없음 · 요청이 거절됨 · 서버가 알려 주는 실패 이유 |
| PR · 머지 · 커밋 | 개발 변경 묶음 · 반영됨 |

## 하지 않는 것

- 코드·문서·Figma를 고치지 않는다. 디자이너가 "이렇게 바꿔줘"라고 해도 이 스킬은 바꾸지 않고 ⑥ 이슈로 넘긴다.
- 디스코드에 글을 올리지 않는다(`discord_read.py`에는 올리는 기능이 없다. `discord-log` 스킬을 쓰지 않는다).
- 토큰·계좌번호·입금자명·개인정보를 답·이슈에 옮기지 않는다. 디스코드·코드에서 보더라도 요약만.
- 약관 근거 문구(`legal-copy.md`)를 바꾸자고 제안하지 않는다 — 바꾸려면 운영·법무 확인이 먼저라고 안내한다.
- 확인하지 않은 것을 확정처럼 말하지 않는다.
