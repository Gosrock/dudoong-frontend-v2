# DuDoong-Front v2 — 로컬에서 스테이징 배포 계획

> 2026-10-17 작성. **계획만 있고 아직 구현하지 않았다.**
> **2026-10-29 ECR 기준으로 고쳤다**(사용자 결정 — [`deploy-plan.md`](./deploy-plan.md) §1 첫 절). 바뀐 점: 이미지는 비공개 ECR, 올리기는 GitHub Actions OIDC만 되므로 **로컬 빌드·push 경로를 뺐다**(로컬에 AWS 키를 두지 않는다). 수명 정책(태그 이미지 최근 10개)이 있어 브랜치마다 새 태그를 만들지 않고 덮어쓰기가 허용된 `:dev` 하나를 쓴다.
> **2026-10-31 브랜치 빌드 경로를 뺐다.** B15가 처리됐지만(Deploy #85) 푸시 역할 `dudoong-github-ecr-front-v2`의 신뢰 조건은 `refs/heads/main`·`refs/tags/v*`뿐이다 — 다른 브랜치 수동 실행은 열지 않았다(백엔드 답: 아무 브랜치나 스테이징 `:dev`를 덮어쓰게 되므로). 그래서 **스테이징의 v2는 main 머지 뒤 `image.yml`이 올린 `:dev`로만 바뀐다.** `pnpm deploy:staging`은 이미 있는 태그를 스테이징에 다시 배포하는 명령으로 줄인다(아래 ①). 아래 본문의 브랜치 빌드 설명은 ~~취소선~~이나 "(2026-10-31 없음)"으로 표시했다.
> 근거: `Gosrock/DuDoong-Deploy`(`eee6e93`, 2026-10-10)의 `staging-deploy.yml`·`staging-power.yml`·`scripts/ssm-deploy.sh`·`scripts/remote-deploy.sh`·`docker-compose.staging.yml`·`infra/github-deploy-role.yml`. 전체 배포 흐름은 [`deploy-plan.md`](./deploy-plan.md).

## 목표

~~브랜치를 푸시하거나 머지하지 않고, 로컬의 작업 트리 그대로를 명령 하나로 스테이징에 올린다.~~ → (2026-10-31) 머지 없이 브랜치를 스테이징에 올리는 길은 없다. 목표는 **이미 있는 이미지(main `:dev` 또는 버전 태그)를 명령 하나로, Deploy 저장소 머지 없이 스테이징에 다시 배포하는 것**이다.

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
| 스테이징 front 이미지가 compose에 고정돼 있다 | `image: "${ECR_REGISTRY:?}/dudoong-ticket:dev"`(Deploy `b5d4d20`) | 다른 버전을 올리려면 compose를 고쳐 머지해야 한다 |
| 배포 스크립트의 헬스체크는 백엔드만 본다 | `remote-deploy.sh`의 `/api/v1/examples/health` | front가 안 떠도 배포가 성공으로 끝난다 |
| **서버에 명령을 보내는 AWS 역할은 Deploy 저장소의 Actions만 쓸 수 있다** | `infra/github-deploy-role.yml` 신뢰 조건 `repo:${GitHubRepo}:environment:DuDoong-Staging` | 로컬이나 프론트 저장소에서 AWS(SSM)를 직접 부를 수 없다 |

마지막 줄이 설계를 정한다. **로컬 CLI는 AWS를 부르지 않고, Deploy 저장소의 워크플로를 실행시킨다.** 로컬에 AWS 키를 두지 않아도 되고, 모든 배포가 Actions 기록에 남는다.

---

## 2. 설계

```
로컬: pnpm deploy:staging
  ① 이미지 준비
     ├─ 기본: 빌드 없이 :dev(= main 최신 커밋. main 머지 때 image.yml이 덮어쓴다)
     │        (2026-10-31 없음: 브랜치 push → 그 브랜치로 image.yml 실행 — 푸시 역할이 main·v* 태그만 믿는다)
     └─ --tag <태그>: 빌드 없이 이미 있는 이미지(예: 2.0.1)
  ② gh workflow run staging-deploy.yml -R Gosrock/DuDoong-Deploy -f front_tag=<dev 또는 태그>
  ③ gh run watch로 끝까지 기다리고 결과·스테이징 주소 출력

Deploy 저장소 Actions(staging-deploy.yml, 환경 DuDoong-Staging, OIDC로 AWS 역할)
  └─ ssm-deploy.sh → 서버: ecr-login → FRONT_TAG=<태그> docker-compose pull && up -d → 백엔드·front 헬스체크
```

### 2-1. Deploy 저장소 변경

| 파일 | 변경 |
|---|---|
| `.github/workflows/staging-deploy.yml` | `workflow_dispatch`를 추가하고 입력 `front_tag`(문자열, 기본 `dev`)를 받는다. `workflow_call`에도 같은 입력을 기본값 `dev`로 둬서 기존 경로(머지, Staging Power)는 그대로 `:dev`를 쓴다. 실행 요약에 실행자(`github.actor`)와 태그를 남긴다 |
| `scripts/ssm-deploy.sh` | 네 번째 인자로 태그를 받는다. `^[A-Za-z0-9_.-]{1,64}$`만 허용하고(서버 명령 주입 방지), 서버에서 실행할 명령에 넘긴다 |
| `scripts/remote-deploy.sh` | 세 번째 인자를 `FRONT_TAG`로 받아 `export FRONT_TAG="${3:-dev}"` 후 compose를 실행한다(셸 환경변수가 `--env-file`보다 우선한다). 백엔드 헬스체크 뒤에 `curl http://127.0.0.1:3000/healthz` 200 확인을 더한다 |
| `docker-compose.staging.yml` | front를 `image: "${ECR_REGISTRY:?}/dudoong-front:${FRONT_TAG:-dev}"`로 바꾸고 `init: true`, `healthcheck`를 넣는다 |
| `infra/ecr.yml` | v2용 ECR 저장소와 v2 저장소 푸시 역할 — [`deploy-plan.md`](./deploy-plan.md) §6 7번. ~~이 경로는 브랜치에서 `image.yml`을 돌리므로 신뢰 조건에 브랜치 수동 실행도 들어가야 한다(B15에 함께 요청)~~ → **완료(Deploy #85, 2026-10-31)**, 브랜치 수동 실행은 열지 않았다(`refs/heads/main`·`refs/tags/v*`만) |
| `nginx/site.conf` | `location /`의 `proxy_pass`를 `http://127.0.0.1:3000`으로(v2는 IPv4 루프백에서만 듣는다 — deploy-plan §6 #3). v1에도 영향 없음 |

`staging-deploy.yml`의 `workflow_dispatch` 부분 개념:

```yaml
on:
  workflow_call:
    inputs:
      front_tag: { type: string, default: dev }
  workflow_dispatch:
    inputs:
      front_tag:
        description: 'front 이미지 태그 (예: dev, 2.0.1)'
        type: string
        default: dev
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
| `pnpm deploy:staging` | 빌드 없이 `:dev`(main 최신)를 스테이징에 다시 배포한다(Docker·AWS 키 불필요). ~~지금 브랜치를 push하고 빌드해 `:dev`로 올린다~~ — 2026-10-31 없음 |
| `pnpm deploy:staging --tag <태그>` | 빌드 없이 이미 있는 이미지를 올린다(예: 운영 버전 `2.0.1`) |
| `--start` | 스테이징이 꺼져 있으면 Staging Power(start)를 먼저 실행한다 |
| `--dry-run` | 실제로 실행하지 않고 할 일만 출력한다 |

순서:

1. **사전 확인**: `gh auth status`와 Deploy 저장소 쓰기 권한을 확인한다. ~~커밋 안 한 변경이 있으면 멈추고 알린다(원격 빌드는 커밋만 본다).~~(2026-10-31 빌드가 없어 필요 없다 — 대신 지금 작업 트리가 스테이징에 올라가지 않는다는 것을 출력한다.) 실패하면 [4. 준비할 것](#4-준비할-것)의 해당 명령을 안내하고 멈춘다.
2. ~~**빌드**: `git push` → `gh workflow run image.yml --ref <브랜치>`~~ (2026-10-31 없음 — 다른 브랜치는 푸시 역할을 받지 못하고 `image.yml` 첫 단계에서 멈춘다). 대신 **`:dev` 확인**: 태그가 `dev`면 `gh run list --workflow image.yml --branch main --limit 1`로 main 최신 커밋의 이미지 빌드가 끝났는지 보고, 진행 중이면 기다리거나(`gh run watch`) 경고한다. `deploymentId`는 main 빌드가 `GIT_SHA`로 바꿔 둔다.
3. **배포 실행**: `gh workflow run staging-deploy.yml -R Gosrock/DuDoong-Deploy -f front_tag=<dev 또는 태그>`. 방금 만든 실행을 `gh run list --workflow staging-deploy.yml -R … --limit 1`로 찾아 `gh run watch`.
4. **배포 후 확인(크롤러 응답)**: 실제 nginx·백엔드를 거친 응답을 본다. 가짜 백엔드 위의 Playwright e2e(tech-decisions §10)가 대신할 수 없는 부분이다.
   - `curl -s -o /dev/null -w '%{http_code}' -A 'facebookexternalhit/1.1; kakaotalk-scrap/1.0' <스테이징>/` → 200
   - 공연 상세: 있는 공연 200, 없는 공연 404, `og:title`이 HTML에 들어 있는지(`curl … | grep og:title`)
   - 실패하면 배포는 그대로 두고 결과만 경고로 출력한다.
5. **결과**: 성공이면 스테이징 주소와 태그를 출력한다. 스테이징이 꺼져 있어 건너뛰었으면 `--start`를 안내한다.

---

## 3. 운영 규칙

| 항목 | 규칙 |
|---|---|
| 스테이징은 공용이다 | `:dev`는 main 머지로만 바뀐다(2026-10-31 — 브랜치 빌드 없음). `--tag <버전>`으로 버전 이미지를 올리면 다음 배포(머지·서버 켜기) 때 compose 기본값 `:dev`로 돌아간다. 다른 사람이 확인 중이면 먼저 알린다. 실행 요약에 실행자·태그가 남는다 |
| 되돌리기 | `pnpm deploy:staging --tag dev`(main 최신). 운영 버전으로 맞추려면 `--tag <버전>`. `:dev` 자체를 되돌리려면 main에서 되돌리는 커밋을 머지한다(`image.yml` 수동 실행은 main에서만 되고 main 최신을 다시 빌드할 뿐이다) |
| 이미지 정리 | 따로 두지 않는다. 덮어써져 태그가 없어진 옛 `:dev`는 ECR 수명 정책이 7일 뒤 지운다(`infra/ecr.yml`) |
| 운영과 분리 | 이 경로는 스테이징만 바꾼다. 운영은 deploy-plan §5대로 버전 태그 + Deploy PR + 승인 |
| 백엔드 마이그레이션 | 스테이징 DB에 v2 마이그레이션(V001~V011)이 실행돼 있어야 v2 화면이 동작한다([`backend-questions.md`](./backend-questions.md) B5) |

---

## 4. 준비할 것

**AWS 키는 필요 없다.** AWS는 Deploy 저장소의 Actions가 OIDC로 받는다.

| 무엇 | 누가 | 한 번만 | 확인 방법 |
|---|---|---|---|
| `gh` 로그인 + Deploy 저장소 쓰기 권한 | 각자 | ✓ | `gh auth status`, `gh api repos/Gosrock/DuDoong-Deploy --jq .permissions.push` |
| v2용 ECR 저장소·푸시 역할(`infra/ecr.yml`) + v2 저장소 secret `AWS_ACCOUNT_ID` | 조직 관리자 | ✓ | **완료**(Deploy #85, 2026-10-31). `gh secret list -R Gosrock/dudoong-frontend-v2` |
| 저장소 variable `NEXT_PUBLIC_KAKAO_JS_KEY`(이미지 빌드 인자) | 저장소 관리자 | ✓ | `gh variable list -R Gosrock/dudoong-frontend-v2` — 2026-10-31 기준 없음. 없으면 `image.yml`이 첫 단계에서 멈춘다 |
| `DuDoong-Staging` 환경의 승인 규칙 확인 | 저장소 관리자 | ✓ | Deploy 저장소 Settings → Environments. 승인 규칙이 있으면 배포마다 승인이 필요하다 |

Docker와 AWS 키는 로컬에 필요 없다.

---

## 5. 순서

| 단계 | 내용 | 어디 |
|---|---|---|
| S1 | Deploy 저장소 2-1 변경(5개 파일) — PR. 백엔드 쪽과 함께 쓰는 저장소라 리뷰를 받는다 | Deploy |
| S2 | `infra/ecr.yml` 갱신(v2 ECR 저장소·푸시 역할) + secret 등록(B15) — **완료(Deploy #85)**. 이 저장소 `image.yml`을 ECR로 다시 썼다(2026-10-31) — main 머지에서 처음 돈다 | 조직 관리자 · 이 저장소 |
| S3 | `scripts/deploy-staging.sh` + `package.json` 스크립트 | 이 저장소 |
| S4 | 확인: `--tag dev`(빌드 없음) → `--tag <버전>` 순서로 한 번씩(브랜치 빌드는 2026-10-31 없음) | — |

S1이 머지되기 전에는 S3 스크립트가 동작하지 않는다(`workflow_dispatch`가 없다). S2 전에는 서버가 이미지를 받지 못한다.

---

## 6. 확인할 것

| # | 질문 | 영향 |
|---|---|---|
| 1 | ~~브랜치에서 `image.yml`을 수동 실행할 때도 푸시 역할을 받을 수 있게 신뢰 조건을 열어 주나(B15)~~ → **답: 열지 않는다(2026-10-31, Deploy #85)** | 브랜치 이미지를 스테이징에 올릴 수 없다 — main 머지 뒤에만 스테이징에서 본다. 위 ①·2-2를 그에 맞게 줄였다 |
| 2 | `DuDoong-Staging` 환경에 승인 규칙이나 브랜치 제한이 있나 | 있으면 매번 승인 대기. `workflow_dispatch`는 Deploy 저장소의 `main` 기준으로 실행되므로 브랜치 제한은 문제없다 |
| 3 | Deploy 저장소 쓰기 권한을 가진 사람이 누구인가 | 그 사람은 누구나 임의의 front 이미지를 스테이징에 올릴 수 있다. 스테이징 데이터가 운영과 분리돼 있는지 함께 본다 |
| 4 | 스테이징이 v2 front로 바뀌면 v1 admin(`/admin/`)은 그대로 둘 것인가 | 컷오버 전까지는 둘 다 산다(deploy-plan §6 #4) |

---

## 하지 않는 것

- 로컬에서 AWS를 직접 부르는 방식(SSM 직접 호출, SSH) — 역할 신뢰 조건이 Deploy 저장소 Actions로 묶여 있고, 배포 기록이 남지 않는다.
- 운영에 같은 경로를 여는 것 — 운영은 승인·버전 태그 경로만 쓴다.
- PR마다 미리보기 환경 — 스테이징 서버가 한 대라 동시에 하나만 올라간다.
