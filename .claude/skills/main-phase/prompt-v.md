# 작업: <Px>-V — <화면 묶음 한 줄>

## 배경
- 로직(L)은 끝났다(implementation-log <Px>-L). 이 작업은 V(화면)다. **`gui-implement` 스킬로 시작한다**(⓪ 선행 확인부터 순서대로). 범위·완료 기준의 정본은 `plan.md` <Px> 절의 **V 범위 · 완료 기준 V**다.
- 근거 판정(관제탑이 `gui-screens.md` §0에서 미리 본 것 — 스킬 ②에서 지금 파일로 다시 확인한다):
  - <화면> → **GUI**(Ready 노드 <id …>) / **와이어**(<와이어 노드 또는 "구현 때 figma-structure에서 찾음">) / **없음**(DS 컴포넌트로만)
- 열린 디자인 이슈: <#n — 무엇, Ready 여부 → Closes / Refs> 또는 없음.
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
- **구현 덩어리마다**: `NEXT_PUBLIC_KAKAO_JS_KEY=dummy pnpm typecheck`, 바꾼 파일만 `pnpm exec eslint <파일>`, `pnpm exec vitest related <바꾼 파일> --run`, 브라우저로 Figma 눈 비교. **새 테스트를 쓰지 않는다.**
- **Phase 끝(PR 직전) 한 번**: 스토리·QA 시나리오를 쓰고 `pnpm qa <feature>`. 로컬 전체 게이트(`pnpm test` 전체, `pnpm test:stories` 전체)는 돌리지 않는다 — push하고 PR CI(`pr-gate`)에 맡긴 뒤 실패만 고친다.
- `pnpm test:e2e` 전체는 관제탑이 그룹 경계에서 돌린다. 세션은 자기 화면 spec만 필요하면 돌린다.

## 질문(사용자 결정 2026-11-01)
- 사용자 결정이 필요해 보이면 묻지 말고: `design-requests.md`에 기본안이 있으면 그것, 없으면 되돌리기 쉬운 쪽으로 정해 진행한다. implementation-log "결정"에 "🤖 Claude 판단 — 근거 / 되돌리려면"으로 적고 디스코드에 태그해 남긴다.
- ③ 매핑 표도 확인받지 않는다 — PR 본문에 둔다.
- 멈추는 것은 범위·데이터 계약(API·저장 값)이 바뀌는 결정, 사람만 할 수 있는 일(실기기)뿐이다. 그때도 그 칸만 남기고 나머지는 끝까지 하고, PR 본문 "사용자 대기"에 적는다.

## 규칙
- 프로젝트 지침(`CLAUDE.md`·`AGENTS.md`, `.claude/docs/README.md`, `progress.md`)을 먼저 읽는다. Next 동작은 `node_modules/next/dist/docs/`로 확인한다.
- 사실은 원본(Figma 현재 파일, 레포 코드)으로 확인한다. 추측해서 쓰지 않는다 — 원본에 없으면 위 "질문" 규칙대로.
- Figma 쓰기는 코멘트만 — "DS로 구현"·"디자인 없음" 둘 다 확인 없이 바로 단다(`design-workflow.md` §7). 프레임·컴포넌트는 고치지 않는다.
- 파일 소유: <병렬 세션이 있으면 — 이 세션이 고칠 수 있는 공용 파일 / 고치지 않을 파일>. 공용 문서는 자기 Phase 줄만.
- 이 워크트리 브랜치에서 작업하고 커밋한다. Phase 끝 검사를 마치면 push하고 `main` 대상 PR을 연다. PR 본문: 비교 표(프레임 · 캡처 · 차이 · 처리), 근거 없이 정한 것, 단 Figma 코멘트 목록, `Closes #n`/`Refs #n`. **머지는 하지 않는다.**
- 디스코드 기록(`discord-log` 스킬)은 스레드 <thread id>에, id를 직접 지정해서 올린다(묻지 않는다).
- 토큰·비밀 값은 출력·커밋하지 않는다.
