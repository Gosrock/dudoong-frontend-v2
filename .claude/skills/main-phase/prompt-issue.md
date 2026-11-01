# 작업: 디자인 이슈 #<n> 반영 — <이슈 제목>

## 배경
- 디자이너가 Figma 플러그인으로 올린 `Design Sync` 이슈다: <이슈 URL>. 라벨 <Design: 수정 / 신규 / …>, 대상 노드 <file · node-id · 프레임 이름>.
- 대상 화면: <화면 · 라우트 · Phase>, 지금 상태 **`GUI 구현됨`**(`gui-screens.md` §0). 이 틀은 `GUI 구현됨` 화면에 닿는 `Design: 수정`·`Design: 디자인 시스템` 이슈에만 쓴다 — `미구현`·`와이어로 구현됨` 화면의 이슈와 `Design: 신규 화면`은 워크트리 없이 계획(문서)만 고친다(design-workflow §4 "라벨로 가르기", 사용자 지시 2026-11-01).
- 반영하고 PR `Closes #n`.
- 사용자 결정(다시 묻지 않는다): GUI는 Ready for dev만 근거(2026-10-25) · 커스텀 지양, DS 우선(2026-10-31) · 1024부터 PC(2026-10-31) · 다크 모드 미지원 · 검사 3층(2026-11-01) · 멈추지 않고 끝까지 — 결정이 필요하면 기본안/되돌리기 쉬운 쪽으로 정하고 "🤖 Claude 판단"으로 기록(2026-11-01).

## 이미 된 것 — 다시 하지 않는다
- 그 화면의 V: PR #<n>(<Px>-V).

## 할 것
1. `gui-implement` 스킬의 이슈 반영 경로(① 열린 이슈 → ② 근거 판정 → ③ 노드 다시 받기 → ④ 구현 → ⑥ 비교 → ⑦ PR)를 따른다. 이슈에 적힌 변경만 한다 — 그 화면의 다른 차이는 PR 본문 "범위 밖"에 적는다.
2. 디자인 시스템 변경(토큰·컴포넌트)이 걸려 있으면 `gui-implement`의 DS 변경 절차로, 같은 PR에서 한다.
3. 그 화면의 QA 시나리오를 고쳐 `pnpm qa <feature>` 한 번, Figma와 나란히 비교.
4. 문서: `gui-screens.md` §0 그 줄의 "열린 이슈" 칸, implementation-log 그 Phase 절에 한 줄, `progress.md` "지금 진행 중"에서 자기 줄 빼기.

## 검사(사용자 결정 2026-11-01)
- **시작할 때**(세션 회고 15개 — 2026-11-01): 새 워크트리의 첫 명령은 `pnpm install --frozen-lockfile`(없으면 `next: command not found`). main을 merge한 뒤 낯선 모듈 오류가 나면 먼저 `pnpm install`. `npx` 대신 `pnpm exec`.
- 고치는 동안: typecheck · 바꾼 파일 lint · `vitest related <바꾼 파일> --run` · 브라우저 눈 비교.
- PR 직전: `pnpm qa <feature>` 한 번. 로컬 전체 게이트는 돌리지 않고 PR CI에 맡긴다.
- **셸·메뉴·드로어·셸 API 호출을 바꾸면** `pnpm qa shell`과 `e2e/shell.spec.ts`도 돌린다(호출 목록 정확히 일치·메뉴 항목 검사가 깨진다 — #78). QA가 실패하면 먼저 `git log origin/main`에서 그 시나리오를 고친 커밋이 있는지 본다.
- **병렬 세션과 포트**(회고 6개): 기본 포트를 쓰지 않는다 — `E2E_APP_PORT=31xx E2E_MOCK_PORT=41xx`, dev:mock은 `PORT=… MOCK_API_PORT=…`. `pnpm qa` 전에는 dev 서버를 내린다(`.next`를 같이 쓴다). 남은 서버는 `lsof -i :<포트>`로 PID를 찾아 끈다. `E2E_SKIP_BUILD=1`은 `.next/standalone`이 있을 때만.
- **PR 직전에 자기 라우트에 닿는 e2e spec은 반드시 돌린다**(2026-11-01 — V 마크업 변경으로 그룹 A 회귀 e2e 14건, #43). `grep -l <라우트> e2e/*.ts`로 찾는다. 테스트를 지우거나 약하게 만들지 않고 선택자·기대값만 고친다.
- **셸 명령은 단순하게**(2026-11-01 — 세션이 권한 확인으로 멈춘 일): zsh 전용 문법(`${arr:#…}` 필터, `F=($(…))` 배열), `eval`, 변수 안에 든 명령을 쓰지 않는다. Claude Code가 해석하지 못한 명령은 bypass 모드에서도 권한 확인으로 멈추고, 아무도 없으면 자동 거절된다. 파일 목록은 파이프·`xargs`로: `git diff --name-only --diff-filter=d | grep -v '\.md$' | xargs pnpm exec eslint`.
  zsh에서 `--include=*.ts` 같은 글롭 인자는 따옴표로 감싼다. macOS에는 `timeout`이 없다(Bash 도구의 timeout 인자를 쓴다). `sleep`을 이어 붙이지 말고 횟수를 정한 폴링으로.

## 규칙
- 프로젝트 지침(`CLAUDE.md`·`AGENTS.md`, `.claude/docs/README.md`)을 먼저 읽는다.
- 사실은 원본(Figma 현재 파일, 이슈 본문, 레포 코드)으로 확인한다. 추측해서 쓰지 않는다.
- Figma 쓰기는 코멘트만(확인 없이 — design-workflow §7). 이슈 닫기는 PR의 `Closes #n`으로만 — 직접 닫지 않는다.
- **PR 직전에 main 합치기**(회고 13개): `git fetch origin main && git merge origin/main`(리베이스 금지). `progress.md`·`gui-screens.md`·`design-requests.md` 표는 남의 줄은 main 그대로 두고 내 줄만 고친다. `implementation-log.md`는 main 판을 받고 내 Phase 절을 끝에 통째로 다시 붙인다(줄 단위로 합치지 않는다). merge 뒤 `progress.md` 자기 줄이 `끝`(PR 번호)인지 다시 본다.
- **PR 번호는 내가 쓴 줄만 손으로 고친다.** 디렉터리 전체에 `sed`로 `(#PR)` 같은 자리표시를 바꾸지 않는다 — 다른 문서의 같은 글자까지 바뀐다(#52·#74).
- 이 워크트리 브랜치에서 커밋하고 push, `main` 대상 PR. PR 본문에 **"ego-browser 확인" 절**(본 화면 · 폭 390/1440 · 발견 · 처리 — QA 캡처로 대신하지 않는다. DS만 바꾼 PR은 Storybook을 ego-browser로 연다, 사용자 요청 2026-11-01)과 **"열린 Design Sync 이슈" 줄**(`gh issue list --label "Design Sync" --state open` 결과 그대로)을 넣는다. **머지는 하지 않는다.**
- 디스코드 기록은 스레드 <thread id>에 id를 직접 지정(묻지 않는다). 토큰·비밀 값은 출력·커밋하지 않는다.
