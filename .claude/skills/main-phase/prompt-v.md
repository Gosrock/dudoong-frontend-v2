# 작업: <Px>-V — <화면 묶음 한 줄>

## 배경
- 로직(L)은 끝났다(implementation-log <Px>-L). 이 작업은 V(화면)다. **`gui-implement` 스킬로 시작한다**(⓪ 선행 확인부터 순서대로). 범위·완료 기준의 정본은 `plan.md` <Px> 절의 **V 범위 · 완료 기준 V**다.
- 근거 판정(관제탑이 `gui-screens.md` §0에서 미리 본 것 — 스킬 ②에서 지금 파일로 다시 확인한다):
  - <화면> → **GUI**(Ready 노드 <id …>) / **와이어**(<와이어 노드 또는 "구현 때 figma-structure에서 찾음">) / **없음**(DS 컴포넌트로만)
- 열린 디자인 이슈(이 Phase 구현 PR에서 `Closes`): <계획만 고쳐 둔 이 Phase 화면의 이슈 — `gui-screens.md` §0 "열린 이슈" 칸(`Design: 수정`·`Design: 신규 화면`) + `design-system.md` §8 "반영 대기" 중 이 화면이 쓰는 DS 변경(`Design: 디자인 시스템`). #n — 무엇> 또는 없음. 신규 화면 이슈 노드는 GUI 근거다(사용자 지시 2026-11-01).
- 열린 질문: <design-requests Qxx — 답 전까지 기본안>.
- 사용자 결정(다시 묻지 않는다):
  - GUI는 **Ready for dev 노드만** 근거, 나머지는 와이어 근거로 단순 와이어 수준(DS 토큰·컴포넌트만, 모양을 지어내지 않음) → 상태 `와이어로 구현됨`(2026-10-25).
  - **커스텀 지양, DS·`src/ui` 우선.** Figma가 커스텀인데 DS로 되는 부분은 DS로 + `FIGMA-CUSTOM:` 주석 + Figma 코멘트(2026-10-31).
  - 관객·호스팅 모두 **1024px부터 PC**(Q38 닫힘, 2026-10-31). **다크 모드 미지원**(2026-10-31 보류).
  - **검사는 3층**(2026-11-01) — 아래 "검사".
  - **멈추지 않고 끝까지**(2026-11-01) — 관제탑이 자율로 돌린다. 아래 "질문".
  - <이 Phase에 해당하는 그 밖의 결정, 날짜와 함께>

## 이미 된 것 — 다시 하지 않는다
- <Px>-L: <코드 위치·훅 이름>(implementation-log <Px>-L).
- 셸(P4s-V, PR #<n>)과 선행 V: <Phase · PR 번호>.
- <이 Phase 범위에서 빠지는 것 — 다른 Phase 몫>

## 할 것
1. `gui-implement` 스킬 ⓪~⑦. 구현 덩어리마다 "단계마다" 절(실제 화면 ↔ Figma 눈 비교, 근거 없이 정한 것 기록).
2. <Phase 특유의 할 일 — 실기기, 상태 분기, 특이 화면>
3. Phase 끝에 스토리(새 `src/ui` 컴포넌트)·QA 시나리오(`qa-scenario` 스킬)를 **한꺼번에** 쓰고 `pnpm qa <feature>` 한 번. GUI 부분은 Figma 스크린샷과 같은 폭으로 나란히 비교.
4. 문서: `gui-screens.md` §0 그 화면 줄(상태·근거), `implementation-log.md` <Px>-V 절(결정·근거 없이 정한 것), `plan.md` 완료 기준 V 체크, `progress.md`의 **자기 줄만**(Phase 판·"다음 순서" → `끝`(PR 번호), "지금 진행 중"에서 자기 줄 빼기).

## 검사(사용자 결정 2026-11-01 — design-workflow §9)
- **시작할 때**(세션 회고 15개 — 2026-11-01): 새 워크트리의 첫 명령은 `pnpm install --frozen-lockfile`(없으면 `next: command not found`). main을 merge한 뒤 낯선 모듈 오류가 나면 먼저 `pnpm install`. `npx` 대신 `pnpm exec`.
- **구현 덩어리마다**: `NEXT_PUBLIC_KAKAO_JS_KEY=dummy pnpm typecheck`, 바꾼 파일만 `pnpm exec eslint <파일>`, `pnpm exec vitest related <바꾼 파일> --run`, 브라우저로 Figma 눈 비교. **새 테스트를 쓰지 않는다.**
- **Phase 끝(PR 직전) 한 번**: 스토리·QA 시나리오를 쓰고 `pnpm qa <feature>`. 로컬 전체 게이트(`pnpm test` 전체, `pnpm test:stories` 전체)는 돌리지 않는다 — push하고 PR CI(`pr-gate`)에 맡긴 뒤 실패만 고친다.
- `pnpm test:e2e` 전체는 관제탑이 그룹 경계에서 돌린다. 세션은 자기 화면 spec만 필요하면 돌린다.
- **셸·메뉴·드로어·셸 API 호출을 바꾸면** `pnpm qa shell`과 `e2e/shell.spec.ts`도 돌린다(호출 목록 정확히 일치·메뉴 항목 검사가 깨진다 — #78). QA가 실패하면 먼저 `git log origin/main`에서 그 시나리오를 고친 커밋이 있는지 본다.
- **병렬 세션과 포트**(회고 6개): 기본 포트를 쓰지 않는다 — `E2E_APP_PORT=31xx E2E_MOCK_PORT=41xx`, dev:mock은 `PORT=… MOCK_API_PORT=…`. `pnpm qa` 전에는 dev 서버를 내린다(`.next`를 같이 쓴다). 남은 서버는 `lsof -i :<포트>`로 PID를 찾아 끈다. `E2E_SKIP_BUILD=1`은 `.next/standalone`이 있을 때만.
- **PR 직전에 자기 라우트에 닿는 e2e spec은 반드시 돌린다**(2026-11-01 — V 마크업 변경으로 그룹 A 회귀 e2e 14건, #43). `grep -l <라우트> e2e/*.ts`로 찾는다. 테스트를 지우거나 약하게 만들지 않고 선택자·기대값만 고친다.
- **셸 명령은 단순하게**(2026-11-01 — 세션이 권한 확인으로 멈춘 일): zsh 전용 문법(`${arr:#…}` 필터, `F=($(…))` 배열), `eval`, 변수 안에 든 명령을 쓰지 않는다. Claude Code가 해석하지 못한 명령은 bypass 모드에서도 권한 확인으로 멈추고, 아무도 없으면 자동 거절된다. 파일 목록은 파이프·`xargs`로: `git diff --name-only --diff-filter=d | grep -v '\.md$' | xargs pnpm exec eslint`.
  zsh에서 `--include=*.ts` 같은 글롭 인자는 따옴표로 감싼다. macOS에는 `timeout`이 없다(Bash 도구의 timeout 인자를 쓴다). `sleep`을 이어 붙이지 말고 횟수를 정한 폴링으로.

## 질문(사용자 결정 2026-11-01)
- 사용자 결정이 필요해 보이면 묻지 말고: `design-requests.md`에 기본안이 있으면 그것, 없으면 되돌리기 쉬운 쪽으로 정해 진행한다. implementation-log "결정"에 "🤖 Claude 판단 — 근거 / 되돌리려면"으로 적고 디스코드에 태그해 남긴다.
- ③ 매핑 표도 확인받지 않는다 — PR 본문에 둔다.
- GUI가 로직 규칙을 바꾸면 그 Phase `model/`·단위 테스트를 같은 PR에서 고쳐도 된다 — 작게, PR 본문·implementation-log에 "L 변경" 줄(사용자 결정 2026-11-01, plan §0).
- 멈추는 것은 범위·데이터 계약(API·저장 값)이 바뀌는 결정, 사람만 할 수 있는 일(실기기)뿐이다. 그때도 그 칸만 남기고 나머지는 끝까지 하고, PR 본문 "사용자 대기"에 적는다.

## 규칙
- 프로젝트 지침(`CLAUDE.md`·`AGENTS.md`, `.claude/docs/README.md`, `progress.md`)을 먼저 읽는다. Next 동작은 `node_modules/next/dist/docs/`로 확인한다.
- 사실은 원본(Figma 현재 파일, 레포 코드)으로 확인한다. 추측해서 쓰지 않는다 — 원본에 없으면 위 "질문" 규칙대로.
- Figma 쓰기는 코멘트만 — "DS로 구현"·"디자인 없음" 둘 다 확인 없이 바로 단다(`design-workflow.md` §7). 프레임·컴포넌트는 고치지 않는다.
- 파일 소유: <병렬 세션이 있으면 — 이 세션이 고칠 수 있는 공용 파일 / 고치지 않을 파일>. 공용 문서는 자기 Phase 줄만.
- 병렬 세션이 새로 만드는 `src/ui`·반영 중인 DS 컴포넌트: <목록 / 없음>. 여기 적힌 것은 새로 만들지 말고 그 세션 머지 뒤 main에서 가져다 쓴다(2026-11-01 ConcertCard 두 번 · DS 반영 겹침).
- **PR 직전에 main 합치기**(회고 13개): `git fetch origin main && git merge origin/main`(리베이스 금지). `progress.md`·`gui-screens.md`·`design-requests.md` 표는 남의 줄은 main 그대로 두고 내 줄만 고친다. `implementation-log.md`는 main 판을 받고 내 Phase 절을 끝에 통째로 다시 붙인다(줄 단위로 합치지 않는다). merge 뒤 `progress.md` 자기 줄이 `끝`(PR 번호)인지 다시 본다.
- **PR 번호는 내가 쓴 줄만 손으로 고친다.** 디렉터리 전체에 `sed`로 `(#PR)` 같은 자리표시를 바꾸지 않는다 — 다른 문서의 같은 글자까지 바뀐다(#52·#74).
- 이 워크트리 브랜치에서 작업하고 커밋한다. Phase 끝 검사를 마치면 push하고 `main` 대상 PR을 연다. PR 본문: 비교 표(프레임 · 캡처 · 차이 · 처리), 근거 없이 정한 것, 단 Figma 코멘트 목록, `Closes #n`/`Refs #n`. PR 본문에 **"ego-browser 확인" 절**(본 화면 · 폭 390/1440 · 발견 · 처리 — QA 캡처로 대신하지 않는다. DS만 바꾼 PR은 Storybook을 ego-browser로 연다, 사용자 요청 2026-11-01)과 **"열린 Design Sync 이슈" 줄**(`gh issue list --label "Design Sync" --state open` 결과 그대로)을 넣는다. **머지는 하지 않는다.**
- 디스코드 기록(`discord-log` 스킬)은 스레드 <thread id>에, id를 직접 지정해서 올린다(묻지 않는다).
- 토큰·비밀 값은 출력·커밋하지 않는다.
