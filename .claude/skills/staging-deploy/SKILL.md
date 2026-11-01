---
name: staging-deploy
description: 프론트 v2를 스테이징(staging.dudoong.com)에 배포한다 — main 브랜치이고 로컬 main과 origin/main이 같을 때만, 그 커밋의 :dev 이미지 빌드가 끝났는지 확인한 뒤 Gosrock/DuDoong-Deploy의 Staging Power start를 실행하고 헬스체크까지 본다. "스테이징 배포", "스테이징에 올려", "스테이징 켜", "staging deploy", 스테이징 리허설 전에 쓴다.
---

# 스테이징 배포

프론트 저장소는 이미지만 만든다. `main`에 머지될 때마다 `image.yml`이 ECR `dudoong-front:dev`를 덮어쓴다. 스테이징 서버에 올리는 일은 **Gosrock/DuDoong-Deploy 워크플로**가 한다. 둘은 이어져 있지 않다. 그래서 main 머지만으로는 스테이징이 바뀌지 않는다.

| Deploy 워크플로 | 하는 일 |
|---|---|
| **Staging Power** `start` | 서버를 켜고(이미 켜져 있으면 그대로) `staging-deploy.yml`로 최신 `:dev`를 받아 다시 띄운다. 이 스킬은 이것만 쓴다 |
| Staging Deploy | 켜져 있을 때만 배포한다(꺼져 있으면 건너뜀) |
| Staging Power `stop` / 매일 02:00 KST | 끈다 |

## 지키는 조건(스크립트가 검사 — 하나라도 어기면 멈춘다)

1. **지금 브랜치가 `main`**이다.
2. `git fetch` 뒤 **로컬 `main` == `origin/main`**이다. 앞서거나 뒤처지면 멈춘다. 스테이징에 올라가는 것은 원격 커밋의 이미지이고, 내가 보고 있는 코드와 같아야 한다.
3. 그 커밋의 **Image 워크플로가 성공**했다. 도는 중이면 최대 20분 기다리고, 실패했거나 실행이 없으면 멈춘다.
4. 기다리는 사이 `origin/main`이 바뀌지 않았다. 바뀌었다면 `:dev`가 덮어써졌을 수 있다.

## 하는 법

```bash
bash .claude/skills/staging-deploy/staging_deploy.sh --check   # 조건만 검사
bash .claude/skills/staging-deploy/staging_deploy.sh           # 검사 → Staging Power start → 끝날 때까지 → /healthz
```

- 관제탑(main 워크트리)에서 실행한다. 세션 워크트리는 브랜치가 `9yujin/*`라 1번에서 멈춘다.
- 외부 저장소(Deploy)에 워크플로 실행을 거는 일이다. **사용자가 이 스킬을 부르거나 배포하라고 했을 때만** 실행한다. 관제탑 루프가 스스로 돌리지 않는다.
- 실행에 6~10분 걸린다(서버 켜기 + 이미지 pull + 헬스체크). Bash 도구는 `run_in_background`로 돌린다.
- `DuDoong-Staging` environment에는 브랜치 정책만 있고 승인자는 없다(2026-11-01 확인).

## 끝나면

- 보고할 것: 배포한 커밋(짧은 해시와 제목), Deploy 실행 URL, `/healthz` 결과.
- 동의 강제 리허설처럼 백엔드에 알려야 할 일이 있으면, 무엇을 알릴지 사용자에게 말한다. Backend 저장소에는 직접 쓰지 않는다.
- 스테이징은 02:00 KST에 자동으로 꺼진다. 다시 볼 때는 이 스킬을 또 실행한다.

## 멈췄을 때

| 메시지 | 할 일 |
|---|---|
| 브랜치가 main이 아니다 | `git switch main`. 회귀 중이면 끝난 뒤에 |
| 로컬 ≠ origin | `git pull`(뒤처짐). 앞섰다면 PR로 넣고 머지 뒤에. 관제탑은 main에 직접 push하지 않는다 |
| Image 실행 없음 · 실패 | 이 저장소 Actions의 Image 실행을 본다. 다시 돌리려면 사용자에게 `gh workflow run image.yml` 또는 rerun을 요청한다(auto 모드가 막는다) |
| Staging Power 실패 | 실행 로그의 `deploy via SSM`과 front 헬스체크 단계를 본다. Deploy 쪽 문제면 사용자에게 |
