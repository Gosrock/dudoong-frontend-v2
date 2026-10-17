# DuDoong-Front v2 — 로컬에서 스테이징 배포 계획

> 2026-10-17 작성. **계획만 있고 아직 구현하지 않았다.**
> 근거: `Gosrock/DuDoong-Deploy`(`eee6e93`, 2026-10-10)의 `staging-deploy.yml`·`staging-power.yml`·`scripts/ssm-deploy.sh`·`scripts/remote-deploy.sh`·`docker-compose.staging.yml`·`infra/github-deploy-role.yml`. 전체 배포 흐름은 [`deploy-plan.md`](./deploy-plan.md).

## 목표

브랜치를 푸시하거나 머지하지 않고, 로컬의 작업 트리 그대로를 명령 하나로 스테이징에 올린다.

```bash
pnpm deploy:staging
```

---

## 1. 지금 스테이징 배포가 도는 경로

```
Deploy 저장소 main에 머지 ──▶ Deployment(deploy.yml)
                                ├─ 스테이징 단계(staging-deploy.yml) — 켜져 있을 때만
                                └─ 운영 단계(승인 후)

Staging Power(start) 수동 실행 ──▶ 서버 켜기 ──▶ staging-deploy.yml
```

| 사실 | 근거 | 문제 |
|---|---|---|
| `staging-deploy.yml`은 `workflow_call` 전용이다 | `on: workflow_call` | 스테이징만 다시 배포할 수 없다. 머지(운영 단계까지 돎)나 서버 껐다 켜기가 필요하다 |
| 스테이징 front 이미지가 compose에 고정돼 있다 | `image: david0218/dudoong-ticket:dev` | 다른 버전을 올리려면 compose를 고쳐 머지해야 한다 |
| 배포 스크립트의 헬스체크는 백엔드만 본다 | `remote-deploy.sh`의 `/api/v1/examples/health` | front가 안 떠도 배포가 성공으로 끝난다 |
| **서버에 명령을 보내는 AWS 역할은 Deploy 저장소의 Actions만 쓸 수 있다** | `infra/github-deploy-role.yml` 신뢰 조건 `repo:${GitHubRepo}:environment:DuDoong-Staging` | 로컬이나 프론트 저장소에서 AWS(SSM)를 직접 부를 수 없다 |

마지막 줄이 설계를 정한다. **로컬 CLI는 AWS를 부르지 않고, Deploy 저장소의 워크플로를 실행시킨다.** 로컬에 AWS 키를 두지 않아도 되고, 모든 배포가 Actions 기록에 남는다.

---

## 2. 설계

```
로컬: pnpm deploy:staging
  ① 이미지 준비
     ├─ 기본(로컬 빌드): 지금 작업 트리로 linux/arm64 이미지 빌드 → GHCR push
     │    태그 dev-<짧은 sha>[-dirty]-<GitHub 사용자>
     └─ --remote: 지금 브랜치를 push → 이 저장소 image.yml을 그 브랜치로 실행 → sha-<짧은 sha>
     └─ --tag <태그>: 빌드 없이 이미 있는 이미지
  ② gh workflow run staging-deploy.yml -R Gosrock/DuDoong-Deploy -f front_tag=<태그>
  ③ gh run watch로 끝까지 기다리고 결과·스테이징 주소 출력

Deploy 저장소 Actions(staging-deploy.yml, 환경 DuDoong-Staging, OIDC로 AWS 역할)
  └─ ssm-deploy.sh → 서버: FRONT_TAG=<태그> docker-compose pull && up -d → 백엔드·front 헬스체크
```

### 2-1. Deploy 저장소 변경

| 파일 | 변경 |
|---|---|
| `.github/workflows/staging-deploy.yml` | `workflow_dispatch`를 추가하고 입력 `front_tag`(문자열, 기본 `main`)를 받는다. `workflow_call`에도 같은 입력을 기본값 `main`으로 둬서 기존 경로(머지, Staging Power)는 그대로 `main` 이미지를 쓴다. 실행 요약에 실행자(`github.actor`)와 태그를 남긴다 |
| `scripts/ssm-deploy.sh` | 네 번째 인자로 태그를 받는다. `^[A-Za-z0-9_.-]{1,64}$`만 허용하고(서버 명령 주입 방지), 서버에서 실행할 명령에 넘긴다 |
| `scripts/remote-deploy.sh` | 세 번째 인자를 `FRONT_TAG`로 받아 `export FRONT_TAG="${3:-main}"` 후 compose를 실행한다(셸 환경변수가 `--env-file`보다 우선한다). 백엔드 헬스체크 뒤에 `curl http://127.0.0.1:3000/healthz` 200 확인을 더한다 |
| `docker-compose.staging.yml` | front를 `image: ghcr.io/gosrock/dudoong-front:${FRONT_TAG:-main}`으로 바꾸고 `init: true`, `healthcheck`를 넣는다 |
| `nginx/site.conf` | `location /`의 `proxy_pass`를 `http://127.0.0.1:3000`으로(v2는 IPv4 루프백에서만 듣는다 — deploy-plan §6 #3). v1에도 영향 없음 |

`staging-deploy.yml`의 `workflow_dispatch` 부분 개념:

```yaml
on:
  workflow_call:
    inputs:
      front_tag: { type: string, default: main }
  workflow_dispatch:
    inputs:
      front_tag:
        description: 'front 이미지 태그 (예: main, sha-1a2b3c4, dev-1a2b3c4-dirty-9yujin)'
        type: string
        default: main
# … 기존 단계 그대로 …
      - name: deploy via SSM
        if: ${{ env.SKIP != 'true' }}
        run: bash scripts/ssm-deploy.sh "$INSTANCE_ID" staging "$GITHUB_SHA" "${{ inputs.front_tag }}"
```

`deploy.yml`의 운영 단계는 바꾸지 않는다. 운영 compose는 지금처럼 버전 태그를 파일에 적고 머지로 올린다(deploy-plan §5).

### 2-2. 프론트 저장소 스크립트

`scripts/deploy-staging.sh`, `package.json`에 `"deploy:staging": "bash scripts/deploy-staging.sh"`.

| 사용 | 하는 일 |
|---|---|
| `pnpm deploy:staging` | 지금 작업 트리(커밋 안 한 변경 포함)를 로컬에서 빌드해 올린다 |
| `pnpm deploy:staging --remote` | 지금 브랜치를 push하고 GitHub ARM 러너에서 빌드한다(Docker 불필요, 머지 불필요) |
| `pnpm deploy:staging --tag <태그>` | 빌드 없이 이미 있는 이미지를 올린다(예: `main`으로 되돌리기) |
| `--start` | 스테이징이 꺼져 있으면 Staging Power(start)를 먼저 실행한다 |
| `--dry-run` | 실제로 실행하지 않고 할 일만 출력한다 |

순서:

1. **사전 확인**: `gh auth status`와 Deploy 저장소 쓰기 권한을 확인한다. 로컬 빌드면 Docker 데몬과 GHCR 로그인도 확인한다. 실패하면 [4. 준비할 것](#4-준비할-것)의 해당 명령을 안내하고 멈춘다.
2. **태그 정하기**: `dev-$(git rev-parse --short HEAD)`. 작업 트리에 변경이 있으면 `-dirty`, 끝에 `-$(gh api user --jq .login)`. 64자 제한과 허용 문자를 검사한다.
3. **빌드·push**(로컬): `docker buildx build --platform linux/arm64 --build-arg NEXT_PUBLIC_KAKAO_JS_KEY=… --build-arg GIT_SHA=<태그> -t ghcr.io/gosrock/dudoong-front:<태그> --push .`
   - 카카오 키는 `.env.local`에서 읽는다. 없으면 멈춘다.
   - `GIT_SHA`에 태그를 넣어 `deploymentId`가 바뀌게 한다 — 배포 전에 열린 탭이 새 버전으로 하드 이동한다.
4. **빌드**(`--remote`): `git push -u origin HEAD` → `gh workflow run image.yml --ref <브랜치>` → `gh run watch`. 태그는 `sha-<짧은 sha>`. 커밋 안 한 변경이 있으면 멈추고 알린다.
5. **배포 실행**: `gh workflow run staging-deploy.yml -R Gosrock/DuDoong-Deploy -f front_tag=<태그>`. 방금 만든 실행을 `gh run list --workflow staging-deploy.yml -R … --limit 1`로 찾아 `gh run watch`.
6. **배포 후 확인(크롤러 응답)**: 실제 nginx·백엔드를 거친 응답을 본다. 가짜 백엔드 위의 Playwright e2e(tech-decisions §10)가 대신할 수 없는 부분이다. 별도 스크립트를 두지 않고 이 단계에 넣는다.
   - `curl -s -o /dev/null -w '%{http_code}' -A 'facebookexternalhit/1.1; kakaotalk-scrap/1.0' <스테이징>/` → 200
   - 공연 상세가 생긴 뒤(P5b): 있는 공연 200, 없는 공연 404, 그리고 `og:title`이 HTML에 들어 있는지(`curl … | grep og:title`)
   - 실패하면 배포는 그대로 두고 결과만 경고로 출력한다(되돌리기는 `--tag main`).
7. **결과**: 성공이면 스테이징 주소와 태그를 출력한다. 스테이징이 꺼져 있어 건너뛰었으면 `--start`를 안내한다.

---

## 3. 운영 규칙

| 항목 | 규칙 |
|---|---|
| 스테이징은 공용이다 | 누가 로컬 이미지를 올려도 다음 Deploy 머지나 Staging Power(start) 때 `main`으로 돌아간다. 다른 사람이 확인 중이면 먼저 알린다. 실행 요약에 실행자·태그가 남는다 |
| 되돌리기 | `pnpm deploy:staging --tag main` |
| 이미지 정리 | GHCR에 `dev-*` 태그가 쌓인다. 프론트 저장소에 정리 워크플로를 둔다(매일, 7일 지난 `dev-*` 버전 삭제 — `actions/delete-package-versions` 또는 `gh api`) |
| 운영과 분리 | 이 경로는 스테이징만 바꾼다. 운영은 deploy-plan §5대로 버전 태그 + Deploy PR + 승인 |
| 백엔드 마이그레이션 | 스테이징 DB에 v2 마이그레이션(V001~V011)이 실행돼 있어야 v2 화면이 동작한다([`backend-questions.md`](./backend-questions.md) B5) |

---

## 4. 준비할 것

**AWS 키는 필요 없다.** AWS는 Deploy 저장소의 Actions가 OIDC로 받는다.

| 무엇 | 누가 | 한 번만 | 확인 방법 |
|---|---|---|---|
| `gh` 로그인 + Deploy 저장소 쓰기 권한 | 각자 | ✓ | `gh auth status`, `gh api repos/Gosrock/DuDoong-Deploy --jq .permissions.push` |
| GHCR 쓰기 권한 — 기존 `gh` 토큰에 `write:packages` 추가 | 각자(로컬 빌드만) | ✓ | `gh auth refresh -s write:packages` 후 `gh auth token \| docker login ghcr.io -u <계정> --password-stdin` |
| Docker(OrbStack 권장, Docker Desktop·colima도 됨) | 각자(로컬 빌드만) | ✓ | `docker info` |
| `.env.local`의 `NEXT_PUBLIC_KAKAO_JS_KEY` | 각자 | ✓ | `.env.example` |
| GHCR 패키지 `dudoong-front`를 공개로 | 조직 관리자 | ✓ | 서버가 로그인 없이 받는다. 조직 정책이 공개 패키지를 막으면 대안 필요(아래 6) |
| `DuDoong-Staging` 환경의 승인 규칙 확인 | 저장소 관리자 | ✓ | Deploy 저장소 Settings → Environments. 승인 규칙이 있으면 배포마다 승인이 필요하다 |

2026-10-17 이 컴퓨터 기준: `gh` 로그인(`9yujin`, `repo` 범위)과 두 저장소 admin 권한은 있다. `write:packages`와 Docker는 없다 — 그전까지는 `--remote`만 쓸 수 있다.

---

## 5. 순서

| 단계 | 내용 | 어디 |
|---|---|---|
| S1 | Deploy 저장소 2-1 변경(5개 파일) — PR. 백엔드 쪽과 함께 쓰는 저장소라 리뷰를 받는다 | Deploy |
| S2 | GHCR 패키지 첫 생성(`image.yml`을 main에서 한 번 실행) 후 공개 설정 | 조직 관리자 |
| S3 | `scripts/deploy-staging.sh` + `package.json` 스크립트 + 이미지 정리 워크플로 | 이 저장소 |
| S4 | 확인: `--tag main`(빌드 없음) → `--remote` → 로컬 빌드 순서로 한 번씩 | — |

S1이 머지되기 전에는 S3 스크립트가 동작하지 않는다(`workflow_dispatch`가 없다). S2 전에는 서버가 이미지를 받지 못한다.

---

## 6. 확인할 것

| # | 질문 | 영향 |
|---|---|---|
| 1 | Gosrock 조직이 GHCR 공개 패키지를 허용하나 | 막혀 있으면 서버가 GHCR에 로그인해야 한다(서버의 SSM 파라미터에 읽기 전용 토큰). 또는 Docker Hub 조직 계정 |
| 2 | `DuDoong-Staging` 환경에 승인 규칙이나 브랜치 제한이 있나 | 있으면 매번 승인 대기. `workflow_dispatch`는 Deploy 저장소의 `main` 기준으로 실행되므로 브랜치 제한은 문제없다 |
| 3 | Deploy 저장소 쓰기 권한을 가진 사람이 누구인가 | 그 사람은 누구나 임의의 front 이미지를 스테이징에 올릴 수 있다. 스테이징 데이터가 운영과 분리돼 있는지 함께 본다 |
| 4 | 스테이징이 v2 front로 바뀌면 v1 admin(`/admin/`)은 그대로 둘 것인가 | 컷오버 전까지는 둘 다 산다(deploy-plan §6 #4) |

---

## 하지 않는 것

- 로컬에서 AWS를 직접 부르는 방식(SSM 직접 호출, SSH) — 역할 신뢰 조건이 Deploy 저장소 Actions로 묶여 있고, 배포 기록이 남지 않는다.
- 운영에 같은 경로를 여는 것 — 운영은 승인·버전 태그 경로만 쓴다.
- PR마다 미리보기 환경 — 스테이징 서버가 한 대라 동시에 하나만 올라간다.
