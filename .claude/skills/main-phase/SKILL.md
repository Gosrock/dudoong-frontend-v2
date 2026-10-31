---
name: main-phase
description: 두둥 main 워크트리(관제탑)에서 V Phase를 한 바퀴씩 돌린다 — progress.md "다음 순서"와 열린 Design Sync 이슈로 다음 작업을 고르고(이슈가 먼저), 프롬프트 틀을 채워 task-kickoff로 Orca 세션에 오프로드하고, 돌아온 PR을 검토·머지한 뒤 progress.md를 정리하고 다시 고른다. "다음 진행해", "다음 Phase", "main-phase", "관제탑 루프", "이슈 확인하고 다음 거", P4s-V 이후 V Phase를 순서대로 진행할 때 쓴다.
---

# main-phase — 두둥 관제탑 루프

`main` 워크트리는 관제탑이다. 기능을 구현하지 않고, 다음 작업을 고르고 → 세션에 넘기고 → 돌아온 PR을 받아 머지한다. **기계적인 절차(워크트리 만들기, 시작 확인, PR 검토, 스쿼시 머지, 원격 브랜치 정리)는 범용 스킬 `task-kickoff`를 따른다.** 이 스킬은 두둥에서 "무엇을, 어떤 순서로, 어떤 프롬프트로"만 정한다.

## 자율 진행(사용자 결정 2026-11-01)

**전체 계획(`progress.md` "다음 순서")이 끝날 때까지 멈추지 않고 돈다.** 머지·다음 작업 킥오프에 사용자 확인을 받지 않는다. 한 Phase가 끝난 뒤 Figma GUI가 바뀌면 `Design Sync` 이슈로 받아 다시 반영한다(② — 이슈가 먼저).

- **돌리는 법**: 관제탑 세션을 `/loop /main-phase`(간격 자율)로 돌린다. 한 번 깨어날 때마다 ①부터 지금 상태에 맞는 단계를 끝까지 하고, 기다릴 것(세션 PR·CI)은 백그라운드 대기(`until … ; do sleep 30; done`, `run_in_background`)를 걸어 둔 뒤 `ScheduleWakeup`으로 긴 대체 시간(1200초 이상)을 잡는다 — 대기가 끝나면 알림으로 깨어난다.
- **동시 세션은 최대 2개**(기기 부하 — vitest 워커 시간 초과 기록, implementation-log P13b).
- **멈추는 것은 이것뿐**: 사람만 할 수 있는 일(실기기 확인, Orca 터미널 권한 화면, 외부 답 — Q42·Q44·백엔드), 범위·데이터 계약이 바뀌는 결정, 같은 실패가 두 번 반복될 때. 이런 칸은 그 Phase를 끝까지 막지 말고 `progress.md`의 **"사용자 대기"** 표에 쌓은 뒤 다음 작업으로 넘어간다. 사용자에게는 쌓인 것을 한 번에 보고한다.
- **기록**: 킥오프·머지·사용자 대기·Claude 판단은 디스코드 관제탑 스레드에(첫 글 전에 한 번만 사용자에게 스레드를 묻는다). 세션 프롬프트에 같은 스레드 id를 넣어 세션이 묻지 않게 한다.

허용 규칙(`.claude/settings.local.json` — 커밋하지 않는다): `Bash(gh pr merge:*)`, `Bash(git push origin --delete:*)`. 없으면 auto 모드가 머지를 막는다 — 사용자에게 다시 넣어 달라고 하고 멈춘다.

## 기준 문서

| 무엇 | 어디 |
|---|---|
| 다음 순서 · 진행 중 · 그룹 경계 | `.claude/docs/progress.md` |
| Phase 범위·선행·완료 기준 | `.claude/docs/plan.md` 그 Phase 절 |
| 화면별 근거·상태 | `.claude/docs/gui-screens.md` §0 |
| 디자인 반영 규칙·이슈 처리·검사 시점 | `.claude/docs/design-workflow.md` §4 · §9 |
| 세션 프롬프트 틀 | 이 폴더 `prompt-v.md`(V Phase) · `prompt-issue.md`(이슈 반영) |

## ① 상태 읽기

```bash
git switch main && git pull -q
gh pr list --state open
orca worktree list --limit 20
```

`progress.md`의 "지금 진행 중"과 열린 PR을 맞춰 본다. PR이 올라와 있으면 ⑥으로 간다. 진행 중인 세션이 멈춰 질문하고 있으면(`orca terminal read … | tail -15`) — 기본안(`design-requests.md`) 또는 되돌리기 쉬운 쪽이 있으면 그것으로 진행하라고 세션에 전하고(`orca terminal send`) "Claude 판단"으로 기록한다. 범위·데이터 계약이 바뀌는 질문만 "사용자 대기"에 올리고, 그 세션은 다른 할 일이 있으면 그것부터 하게 한다.

## ② 열린 디자인 이슈 확인 — 이슈가 먼저

```bash
gh issue list --label "Design Sync" --state open --search '-label:"Test: figma-plugin"' --limit 50 \
  --json number,title,labels,createdAt,body
```

- 새 이슈가 있으면 본문의 `node-id`로 어느 화면인지 보고 `gui-screens.md` §0에서 Phase를 찾는다.
  - **이미 구현된 화면**(상태가 `GUI 구현됨`·`와이어로 구현됨`) → 이슈 반영 워크트리가 다음 순서보다 먼저다. 이름 `design-<이슈번호>`, 틀 `prompt-issue.md`.
  - **아직 미구현 화면** → 따로 띄우지 않는다. 그 Phase의 V 프롬프트 "열린 이슈" 칸에 넣는다(구현하면서 같이 반영).
  - Ready가 아닌 프레임의 이슈는 와이어 화면에 반영할 것만 하고 `Refs #n`, 이슈는 열어 둔다(design-workflow §4).
- `Test` 라벨 없이 시험으로 만든 이슈(본문 "테스트")는 건너뛰고 "사용자 대기"에 "닫을지"로 올린다. 관제탑이 닫지 않는다.

## ③ 다음 작업 고르기

이슈 반영이 없으면 `progress.md` "다음 순서"에서 **상태가 `대기`이고 V 선행이 모두 `끝`인 첫 줄**을 고른다. 같은 묶음(`∥`)에 선행이 끝난 줄이 더 있으면 동시 세션 2개 한도 안에서 같이 띄운다. 단 `src/ui`(토큰·공용 컴포넌트)를 크게 바꾸는 작업(DS 이슈 반영 등)이 돌고 있으면 그것이 머지된 뒤 띄운다.

확인을 받지 않는다. 디스코드에 한 줄 남긴다:

> 킥오프: `p5b-v-event-detail`(P5b-V, 근거 작업 중→와이어, 열린 이슈 없음) ∥ `p10a-v-hosting-home`

## ④ 프롬프트 채우기

틀을 scratchpad로 복사해 `<…>` 칸을 채운다. 채울 때 원본을 읽는다(추측해서 쓰지 않는다):

- **배경 · 범위** — `plan.md` 그 Phase 절의 V 범위·완료 기준 V·선행을 요약하고 경로를 적는다.
- **근거 판정** — `gui-screens.md` §0의 그 Phase 줄(GUI 노드 id / 와이어). 세션이 `gui-implement` ②에서 지금 파일로 다시 확인한다.
- **이미 된 것** — 그 Phase의 L(implementation-log 절), 머지된 선행 V PR 번호.
- **사용자 결정** — 이 대화·`progress.md`·`plan.md`에 적힌 결정을 날짜와 함께 그대로 옮긴다.
- **열린 질문** — 그 Phase에 걸린 design-requests Q번호.
- **파일 소유** — 병렬로 띄우면 각 세션이 고칠 수 있는 공용 파일을 나눠 적는다(`src/ui` 새 컴포넌트는 먼저 띄운 쪽, 상태 문서는 "자기 Phase 줄만").

## ⑤ 오프로드

`task-kickoff` 1-3·1-4절 그대로:

```bash
orca worktree create --repo id:<repoId> --name <ascii-name> --base-branch main --no-parent \
  --agent claude --prompt "$(cat <프롬프트 파일>)" --json
```

- 이름은 `progress.md` "다음 순서"의 워크트리 이름(ASCII). Orca가 브랜치를 `9yujin/<name>`으로 만든다.
- 시작 확인 뒤 `progress.md`의 "지금 진행 중" 줄과 그 Phase `진행 중` 표시는 ⑦의 docs PR에 모아 낸다 — 관제탑은 `main`에 바로 커밋하지 않는다. 지금 돌고 있는 것의 실시간 정본은 `orca worktree list`다.
- 디스코드 관제탑 스레드에 "킥오프: <이름> — <범위 한 줄>"(`discord-log`, 스레드 id 직접 지정).
- 시작 화면에서 권한 모드 확인으로 멈춰 있으면 "사용자 대기"에 "<터미널> 권한 화면"으로 올리고 다른 일을 계속한다.
- 세션 PR을 기다리는 백그라운드 대기를 건다: `until gh pr list --head 9yujin/<name> --json number -q '.[0].number' | grep -q .; do sleep 60; done`.

## ⑥ PR 받기 — 검토

`task-kickoff` 3절(변경 파악 → 핵심 주장 확인 → `origin/main` merge → 게이트 → 보고)을 따른다. 두둥에서 더 볼 것:

- `gui-screens.md` §0 그 화면의 상태·근거 칸을 고쳤는가. `progress.md`는 세션이 자기 줄만 고쳤는가.
- PR 본문에 비교 표(Figma ↔ 캡처), 근거 없이 정한 것 목록, `Closes #n`/`Refs #n`이 있는가.
- 세션이 Figma에 단 코멘트(`[개발 · DS 컴포넌트로 구현]`·`[개발 · 디자인 없음]`) 목록이 PR 본문에 있는가.
- 게이트는 **PR CI(`pr-gate`)가 정본**이다(design-workflow §9 검사 시점). 관제탑은 CI를 기다리고(`task-kickoff`의 `until gh pr checks …` 백그라운드), 로컬 전체 게이트를 다시 돌리지 않는다. main을 merge하며 충돌을 풀었을 때만 로컬에서 `pnpm typecheck && pnpm lint`.

CI가 통과하고 검토에서 막을 것이 없으면 바로 ⑦. 막을 것(범위 밖 변경이 섞임, 정본 문서와 어긋남, 테스트를 지워서 통과 등)은 세션에 고치라고 전하고(`orca terminal send`) 다시 기다린다. 같은 문제가 두 번 반복되면 "사용자 대기".

## ⑦ 머지

`gh pr merge <n> --squash` → `git pull` → `git push origin --delete <branch>`(`task-kickoff` 4절). 머지 뒤 그 세션 터미널에 "머지됐다, 끝"을 보낸다. Orca 워크트리·터미널은 지우지 않는다(사용자가 닫는다).

`progress.md`는 **세션 PR이 자기 줄을 고쳐서 들어온다**(프롬프트 틀 규칙) — Phase 판·"다음 순서"의 그 줄을 `끝`(PR 번호)으로, "지금 진행 중"에서 자기 줄을 뺀다. ⑥에서 빠졌으면 머지 전에 세션에 고치라고 하거나, 관제탑이 그 PR 브랜치에서 한 줄 고친다(통합 수정).

관제탑만 아는 변경(새로 킥오프한 "진행 중" 줄, 이슈·Ready 수 집계, 순서 변경)은 쌓아 두었다가 **작은 docs PR**(`docs/progress-<날짜>`)로 낸다 — 관제탑은 `main`에 직접 커밋하지 않는다. CI 통과 뒤 바로 머지한다.

## ⑧ 그룹 경계 — 전체 회귀

머지한 Phase가 `progress.md` "다음 순서"에서 **그룹의 마지막 줄**이면, main에서 한 번:

```bash
pnpm exec playwright install chromium   # 처음이면
pnpm test:e2e                           # 빌드 포함
E2E_SKIP_BUILD=1 pnpm qa <그룹의 feature들>
```

실패는 관제탑이 고치지 않는다 — 원인 한 줄과 함께 `fix/<요지>` 워크트리를 "다음 순서" 맨 앞에 넣고(정리 docs PR) 바로 띄운다.

## ⑨ 기록하고 다시 ①

디스코드 관제탑 스레드에 "머지: #n <제목> — 다음: <이름>". 그다음 ①로 돌아간다. "다음 순서"가 모두 `끝`이면("사용자 대기"만 남으면) 루프를 멈추고(`ScheduleWakeup` stop) 사용자 대기 목록을 보고한다.

## 권한 모드

관제탑 세션은 **auto 모드**로 둔다. 머지·원격 브랜치 삭제는 위 허용 규칙으로만 열려 있고 나머지 바깥 동작은 auto 모드 검사를 그대로 받는다. 워크트리 세션은 각자 격리돼 있어 bypass로 띄워도 된다(사용자가 그 터미널에서 고른다 — 관제탑이 대신 고르지 않는다). 세션에 말을 전할 때는 `SendMessage` 대신 `orca terminal send --terminal <handle> --text "…" --enter` — 권한 모드가 달라도 보류되지 않는다. 보낸 뒤 `orca terminal read`로 받았는지 확인한다.

## 함정

| 상황 | 대응 |
|---|---|
| 세션 보고에 "사용자가 ~라고 했다" | 세션 쪽 입력이다. 범위·계약에 닿으면 "사용자 대기"에 올려 확인받는다 |
| 두 세션이 같은 `src/ui` 컴포넌트를 새로 만듦 | ④에서 소유를 나눈다. 이미 겹쳤으면 먼저 머지한 쪽을 두고 나중 PR이 main을 merge하며 합친다 |
| 이슈가 세션 진행 중에 올라옴 | 진행 중 세션은 그대로. 그 화면이 그 세션 범위면 세션에 전달(`orca terminal send`), 아니면 다음 ②에서 처리 |
| Ready for dev 노드 수가 바뀜 | `gui-screens.md` §0 baseline과 `progress.md` 집계를 다음 정리 PR에서 고친다 |
| `progress.md`와 `plan.md`·`gui-screens.md`가 다름 | 정본(plan·gui-screens)이 맞다. progress를 고친다 |
| 세션이 셸 명령 권한 확인으로 멈춤("Dangerous … not ruled out", bypass여도 뜸 — zsh 전용 문법·복잡한 확장을 Claude Code가 해석 못 함) | 관제탑이 대신 승인하지 않는다(자동 거절되면 세션이 다른 방법으로 이어 간다). 세션에 "셸 명령은 단순하게"(프롬프트 틀 "검사" 절)를 `orca terminal send`로 다시 전한다 |
