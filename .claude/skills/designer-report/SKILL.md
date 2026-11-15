---
name: designer-report
description: 디자이너 공유용 페이지 두 개(claude.ai 아티팩트) — "화면별 구현 현황"(화면마다 GUI대로 · 섞임 · 와이어대로 · 디자인 없음, 부탁, 스테이징 링크)과 "작업기록"(날짜별 타임라인) — 을 지금 상태로 갱신한다. "디자이너 리포트", "화면별 현황 업데이트", "진행사항 공유 페이지", "작업기록", "타임라인", "디자이너 공유 페이지 갱신", 관제탑이 묶음을 머지한 뒤 쓴다.
---

# 디자이너 공유 페이지 갱신

디자이너(비개발자)가 보는 페이지 두 개를 계속 같은 링크로 갱신한다. 둘은 서로 링크한다.

| 페이지 | 링크 · slug | 데이터 → 결과 |
|---|---|---|
| 화면별 구현 현황 | https://claude.ai/artifact/SMnBC5QhWSB2c9JX6GKfvY · `cd5b2eb2-f100-45a6-b623-c9cdb79fae59` · 제목 `두둥 v2 화면별 구현 현황 — 디자이너용` · **공개** | `screens.json` + `template.html` → `out/index.html` |
| 작업기록(날짜별) | https://claude.ai/artifact/7B8zv9nf3nSrc5LKKTbtXR · `320132ee-2ec6-41b0-9d17-2bc85eac1d40` · 제목 `두둥 v2 작업기록` · 공유 범위는 `get_artifact`의 read로 확인 | `timeline.json` + `git log main` + `timeline-template.html` → `out/timeline.html` |

`screens.json` · `timeline.json`이 정본(커밋한다). `build.py`가 둘 다 만든다(`out/`은 gitignore).

## 언제

- 관제탑(`main-phase`)이 화면을 바꾸는 PR을 머지했을 때 — 묶음이 끝나면 한 번(⑨).
- 디자이너 답 · 새 Design Sync 이슈로 "부탁" 목록이 바뀌었을 때.
- 사용자가 "리포트 업데이트", "진행사항 공유" 등을 말할 때.

## 하는 법

1. **바뀐 것 모으기** — `screens.json`의 `asOf` 뒤로:
   - `git log --since=<asOf> --format='%h %s' main` — 머지된 PR 제목
   - `git diff <asOf 무렵 커밋>..main -- .claude/docs/gui-screens.md` — 화면 상태 · 근거 칸이 바뀐 줄(§0이 정본)
   - `gh issue list --label "Design Sync" --state all --search "updated:>=<asOf>"` — 새 이슈 · 닫힌 이슈
   - `design-requests.md`에서 닫힌 Q · 새 Q(부탁 목록)
2. **`screens.json` 고치기**(손으로, 사실만):
   - 화면 하나 = `screens[]` 한 칸. 칸: `group`(audience | hosting) · `name` · `where`(무슨 화면인지 한 줄) · `kind` · `gui`(GUI대로 된 부분) · `other`(와이어 · 개발이 정한 부분) · `ask`(디자이너께 — 없으면 "") · `path`(스테이징 경로, 링크로 못 열면 null) · `hint`(들어가는 방법) · `updated`(이번에 바뀌었으면 그 날짜, 아니면 그대로).
   - `kind` 판정 — `gui-screens.md` §0 상태 칸 기준:
     - `gui` GUI 구현됨(디자인 없는 작은 상태 몇 개는 `other`에 적고 그대로 gui)
     - `mix` 한 화면에 GUI 구현 부분과 와이어 · 디자인 없음 부분이 크게 섞임(예: 모바일만 GUI, PC는 와이어)
     - `wire` 와이어로 구현됨(GUI 프레임이 Ready 아님 포함)
     - `none` 와이어 · GUI 모두 없음(DS로만)
   - 새 화면이 생기면 칸을 더한다. 화면이 없어지면 뺀다.
   - `asOf` = 오늘, `freshSince` = 이번 갱신에서 "최근 바뀜"으로 보일 시작 날짜(보통 직전 갱신 다음 날 또는 이번 묶음 시작 날짜). `recent` = 이번에 디자이너가 알면 좋은 반영 3~6줄. `asks` = 부탁 세 묶음(와이어 화면 GUI · 디자인 없는 화면/상태 · 답 기다리는 확인 요청).
   - 스테이징 예시 공연이 바뀌면 `staging.note`와 경로의 `59` · `17`을 같이 바꾼다(`curl https://staging.dudoong.com/api/v2/events?page=0&size=5`).
3. **쓰는 말**(디자이너가 읽는다):
   - 해요체. 코드 이름 · 파일 경로 · PR/이슈 번호 · 노드 id · 라우트는 쓰지 않는다(경로는 `path`에만).
   - "Ready for dev", "디자인 시스템", "와이어", "GUI", "토스트", "칩"은 써도 된다(디자이너 말).
   - 개발이 정한 것은 무엇을 정했는지만 짧게. 이유가 필요하면 Figma 코멘트에 있으니 길게 쓰지 않는다.
   - "DS"는 Figma 디자인 시스템 파일 컴포넌트만 뜻한다(메모리 — 코드 `src/ui`를 디자인 시스템이라 부르지 않는다).
3-1. **작업기록 `timeline.json`** — 이번에 작업한 날짜(들)를 `days` 끝에 한 칸 더한다(며칠 묶으면 `date` ~ `until`). 칸: `title`(그날 한 줄) · `tags`(design 디자인 반영 · screen 화면·기능 · backend 백엔드 답 · quality 점검·품질 · base 준비·기반) · `points`(디자이너가 알면 좋은 것 2~6줄, 해요체, 위 "쓰는 말" 규칙 그대로). `asOf` = 오늘. 원문 목록(`items`)은 빌드가 `git log main`에서 그 날짜들의 작업 제목을 붙인다(머지 커밋 제외) — 손으로 쓰지 않는다. **main에 작업이 들어간 날이 `days`에 없으면 빌드가 멈춘다**(새 칸을 더하거나 `until`로 묶는다).
4. **빌드** — `python3 .claude/skills/designer-report/build.py`. 검사(빈 칸 · kind 값 · 이름 중복 · 날짜 형식)가 실패하면 고친다. 출력의 화면 수 · kind 집계 · 최근 바뀜 목록을 본다.
5. **미리 보기** — ego-browser로 `file://…/designer-report/out/index.html`을 1280 · 390에서 열어 카드 수 · 링크 수 · "최근 바뀐 것만" 필터를 확인한다. 바뀐 카드의 스테이징 링크는 스테이징이 켜져 있으면 실제로 열어 본다(200인지).
6. **올리기** — 두 페이지 각각. `get_artifact`(slug)로 `version` · `read` · `title`을 받고, `publish_files`로 `out/index.html`(현황) · `out/timeline.html`(작업기록)을 각 페이지의 `index.html`로 올린다: `slug`, `base_version` = 받은 version, `shared_live` = 받은 read(`public`), `artifact_title` = 받은 title, `label` = `YYYY-MM-DD 갱신`. 제목 · 아이콘은 넘기지 않는다(그대로). 공개 페이지라 auto 모드가 막으면 사용자에게 "공개 페이지 올려도 될까요"를 묻는다 — 사용자가 이 스킬을 부른 것 자체가 허락이면 그대로 올린다.
7. **커밋** — `screens.json` · `timeline.json`(와 템플릿을 고쳤으면 그것도)을 docs PR로 낸다. 관제탑이면 그 묶음의 docs PR에 같이 넣는다(main에 직접 커밋하지 않는다).
8. **기록** — 디스코드 관제탑 스레드에 "디자이너 페이지 갱신: <asOf> · GUI n · 섞임 n · 와이어 n · 없음 n · 최근 바뀜 …" 한 줄.

## 함정

| 상황 | 대응 |
|---|---|
| `gui-screens.md` 상태와 페이지 판정이 다름 | §0이 정본. 페이지를 §0에 맞춘다. §0 자체가 낡았으면 docs PR로 §0부터 고친다 |
| 스테이징이 꺼져 있음(02:00 자동) | 링크 확인은 건너뛰고 보고에 적는다. 켜는 것은 사용자가 시킬 때만(`staging-deploy`) |
| 스테이징에서 화면이 안 열림(502 · 에러) | 페이지를 올리기 전에 사용자에게 보고 — 디자이너가 깨진 링크를 누르게 하지 않는다 |
| 템플릿 모양을 바꾸고 싶음 | `template.html` · `timeline-template.html`만 고친다. 데이터는 `/*__DATA__*/null` 한 곳으로만 들어간다 |
| 빌드가 "작업기록에 빠진 날짜"로 멈춤 | 그날 main에 들어간 작업이 있는데 `timeline.json`에 칸이 없다. 커밋 날짜(committer date)가 기준이라 PR을 연 날과 하루 다를 수 있다 |
