# DuDoong-Front v2 — 프론트 배포 계획

> 2026-10-12 작성. `Gosrock/DuDoong-Deploy`(`eee6e93`)와 v1 프론트 `Gosrock/DuDoong-Front`(`54767db`)의 Dockerfile·워크플로를 읽고 썼다.
> 서버 구성과 nginx 경로 분기는 [`tech-decisions.md`](./tech-decisions.md) §25에 있다. 이 문서는 **프론트 이미지를 어떻게 만들고 어떻게 올리는가**만 다룬다.

## 결론

**EC2 + Docker는 유지한다. 바꾸는 것은 이미지를 만드는 방식과 그 주변이다.**

| | v1 | v2 |
|---|---|---|
| 이미지 내용 | 저장소 전체 + 모든 `node_modules` + yarn | `output: 'standalone'` 산출물만 |
| 실행 | `yarn ticket:start`(`next start`) | `node server.js` |
| 이미지 크기(압축) | 494MB(Docker Hub 실측, `1.3.1` arm64) | 100MB 안팎 예상 — P0에서 잰다 |
| 이미지 개수 | 2개(ticket, admin) | 1개 |
| 스테이징과 운영 | 서로 다른 빌드(`dev` 브랜치 / 태그) | 같은 이미지를 승격 |
| 레지스트리 | 개인 Docker Hub 계정(`david0218`) | GHCR(`ghcr.io/gosrock/dudoong-front`) |
| front 헬스체크 | 없음(배포 스크립트가 백엔드만 본다) | `/healthz` |
| 배포 뒤 옛 탭 | 대책 없음 | `deploymentId`로 새로고침 유도 |

## 1. 지금 방식에서 확인한 것

| 사실 | 근거 | 문제 |
|---|---|---|
| ticket 이미지는 단일 스테이지다. `COPY . ./` → `yarn install` → 빌드 → 그대로 `yarn ticket:start` | `Dockerfile.ticket` | 소스, devDependencies, yarn 캐시가 전부 운영 이미지에 들어간다. 494MB |
| 서버는 메모리 1~2GB에 컨테이너 6개 + JVM, 스왑 2GB | `docker-install.sh` 주석 | 큰 이미지를 받고 푸는 동안 디스크·메모리를 같이 쓴다. Node 프로세스는 가벼울수록 좋다 |
| 배포 스크립트의 헬스체크는 `/api/v1/examples/health` 하나 | `scripts/remote-deploy.sh` | front가 뜨지 않아도 배포가 성공으로 끝난다 |
| 환경변수는 `secrets.ENV_VARS_TICKET`을 `.env` 파일로 써서 이미지에 넣는다 | `ticket-deploy.yml` | 이미지가 공개 저장소에 있다. 공개돼도 되는 값만 들어가야 하는데 형식(secret)이 그걸 보장하지 않는다 |
| 스테이징은 `:dev`(브랜치 빌드), 운영은 `Ticket-vX.Y.Z` 태그 빌드 | `ticket-staging.yml`, `ticket-deploy.yml` | 스테이징에서 본 이미지와 운영에 나가는 이미지가 다른 빌드다 |
| `:dev` 이미지를 새로 올려도 스테이징은 다시 받지 않는다. Deploy 저장소 `main`에 머지가 있어야 배포가 돈다 | `deploy.yml`, `staging-deploy.yml`(`workflow_call`만) | 스테이징만 다시 배포할 방법이 없다 |
| nginx가 `proxy_pass http://localhost:3000` | `nginx/site.conf` | v2는 3000을 루프백에만 연다(§25). `localhost`가 `::1`로도 풀리면 그쪽 시도는 실패한다 — 아래 §5 |
| front 컨테이너를 교체하는 동안 502 | compose `up -d` | 수 초. v1과 같다 |
| 액션 버전이 오래됐다(`checkout@v2`, `build-push-action@v2`) | 워크플로 | 새로 쓰면서 올린다 |

잘 돼 있어서 그대로 쓰는 것: ARM 러너(`ubuntu-24.04-arm`)에서 네이티브 빌드, Deploy 저장소의 태그 PR → 스테이징 → 운영(승인) 흐름, SSM 배포, stdout → CloudWatch.

## 2. 다른 방식과 비교

| 방식 | 판단 | 이유 |
|---|---|---|
| **EC2 + Docker, standalone 이미지** | **채택** | 지금 인프라와 배포 흐름을 그대로 쓴다. API가 같은 출처·같은 호스트라는 전제(§25)가 유지된다 |
| Vercel | 채택하지 않음 | 아래 |
| 정적 export + nginx/S3 | 불가 | 공연 상세·호스트 홈·선물 랜딩은 요청마다 서버에서 렌더해야 한다(카카오 미리보기, §2) |
| Lambda(OpenNext), Amplify | 채택하지 않음 | 서버 1대로 충분한 트래픽에 운영할 것이 늘어난다 |
| Docker 없이 systemd·pm2 + tar | 채택하지 않음(2026-10-12 검토) | standalone은 `node server.js`만으로 돌아 가능은 하다. 그런데 Node 설치, CloudWatch 로그 수집, 재시작, 릴리스 폴더·롤백을 서버에 새로 만들어야 하고, 나머지 5개는 계속 compose라 배포 경로가 둘이 된다. v1의 문제는 Docker가 아니라 이미지를 통째로 만 것이다 |

**Vercel을 쓰지 않는 이유.** Next를 올리기에 가장 편하고, PR마다 미리보기 주소가 생기고, 무중단 배포가 기본이다. 그런데 이 서비스는 설계가 "프론트와 API가 같은 출처"에 기대고 있다.

- `dudoong.com`을 Vercel로 돌리면 `/api`를 Vercel `rewrites`로 EC2에 넘겨야 한다. 요청이 한 번 더 돌아가고, 백엔드가 보는 클라이언트 IP가 Vercel이 된다(nginx는 `X-Forwarded-For`를 믿지 않도록 설정돼 있다).
- 서버 조회가 `localhost:8080` 대신 공개 인터넷을 탄다.
- 쿠키(`SameSite=Strict`, 백엔드가 `Set-Cookie`)와 카카오 리다이렉트(`{origin}/kakao/callback`, Referer로 분기)가 지금 도메인 구성에 맞춰져 있다. 백엔드·인프라 쪽 작업이 따라온다.
- Hobby 플랜은 상업적 사용을 허용하지 않는다. 티켓을 파는 서비스라 Pro가 필요하다.

얻는 것(미리보기, 무중단)보다 바꿔야 할 것이 크다.

## 3. 이미지

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_KAKAO_JS_KEY
ARG GIT_SHA
ENV NEXT_PUBLIC_KAKAO_JS_KEY=$NEXT_PUBLIC_KAKAO_JS_KEY \
    GIT_SHA=$GIT_SHA \
    NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=127.0.0.1 PORT=3000
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

- `standalone`은 서버가 실제로 import하는 파일만 추려 낸다. `public`과 `.next/static`은 들어가지 않으므로 직접 복사한다.
- 실행 이미지에 pnpm, 소스, devDependencies가 없다. root가 아닌 `node` 사용자로 돈다.
- `.dockerignore`: `.git`, `node_modules`, `.next`, `.claude`, `.env*`, 스토리·테스트 산출물.
- `next.config.ts`: `output: 'standalone'`, `deploymentId: process.env.GIT_SHA`.
- 이미지 어디에도 `API_INTERNAL_URL`을 넣지 않는다. `src/api/http.ts`가 호출할 때 `process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v2'`를 읽고, 그 기본값이 운영·스테이징 값과 같다. 바꿔야 하면 compose의 `environment:`로 준다. 빌드 때 검증하는 것은 `NEXT_PUBLIC_KAKAO_JS_KEY` 하나다(tech-decisions §12).

**`deploymentId`.** 배포하면 옛 JS 청크가 서버에서 사라진다. 배포 전에 열어 둔 탭이 화면을 이동하다 없는 청크를 요청하면 깨진다. `deploymentId`를 주면 Next가 버전이 달라진 것을 알아채고 전체 새로고침으로 넘어간다. 체크아웃 도중 배포가 나가는 경우가 여기 해당한다.

한계도 있다. 전체 새로고침이라 `useState` 같은 컴포넌트 상태와 입력 중인 폼 값은 사라진다(Next 문서 self-hosting #version-skew). 그래서 주문 완료 화면은 메모리의 응답이 아니라 주소(`/orders/[orderUuid]?created=1`)로 다시 그릴 수 있게 했다(tech-decisions §3). 또 화면 이동 없이 불러오는 지연 청크(`next/dynamic`)의 404는 이 기능이 막지 못한다 — 옛 청크를 서버에 남겨 두는 기능이 아니다. 에디터·QR 스캐너를 여는 순간 배포가 겹치면 그 부분만 깨질 수 있고, 경계(`AsyncBoundary`)의 재시도로 새로고침을 안내한다.

**이미지 최적화(`next/image`).** 포스터는 호스트가 올린 원본이라 그대로 내려보내기엔 크다. `next/image`를 쓰되 변환 결과가 컨테이너 안(`.next/cache/images`)에 쌓여 배포마다 사라지는 점, 변환이 CPU·메모리를 쓰는 점을 D2(스테이징 첫 배포)에서 스테이징 서버 사양으로 본다. 부담이 크면 `deviceSizes`를 v1처럼 두세 개로 줄이고, 그래도 크면 캐시 폴더를 볼륨으로 뺀다.

## 4. 환경변수 — 이미지 하나를 스테이징과 운영이 같이 쓴다

**환경마다 다른 값을 이미지에 넣지 않는다.** 값 목록과 검증 시점은 tech-decisions §12가 원본이다.

| 값 | 어디서 | 환경별 차이 |
|---|---|---|
| 브라우저용 API 주소 | 상대 경로 `/api/v2` | 없음 |
| 서버용 API 주소 `API_INTERNAL_URL` | 코드의 기본값(`http://localhost:8080/api/v2`). 호출할 때 읽으므로 compose `environment:`로 덮어쓸 수 있다 | 없음(두 서버 모두 같은 호스트) |
| 카카오 JS 키 | 빌드 인자 → `NEXT_PUBLIC_*` | 없음(v1도 같은 값으로 두 환경을 빌드한다) — 확인 필요 |
| 사이트 origin | 브라우저는 `location.origin`, 서버는 요청의 `Host` 헤더(nginx가 그대로 넘긴다) | 값을 두지 않는다 |

- 빌드 인자는 GitHub **variables**에 둔다(secret이 아님). 이미지는 공개되므로 "공개돼도 되는 값만"이 형식으로도 드러나야 한다. 비밀 값은 이미지에 넣지 않는다 — 지금 설계에는 프론트가 가진 비밀 값이 없다.
- 나중에 환경별 값이 생기면 다시 빌드하지 않고 compose의 `environment:`로 준다. 서버에서 런타임에 읽는 값만 이렇게 줄 수 있다(`NEXT_PUBLIC_*`은 빌드 때 고정된다).

## 5. 빌드와 배포 흐름

```
PR ──▶ CI 게이트(typecheck · lint · test)                         [프론트 저장소]
main 머지 ──▶ 이미지 빌드 ──▶ ghcr.io/gosrock/dudoong-front:sha-<7자리>, :main
태그 v2.x.y ──▶ 다시 빌드하지 않고 같은 이미지에 :2.x.y 태그를 추가
                                                                   [Deploy 저장소]
compose의 front 태그를 올리는 PR ──▶ main 머지 ──▶ 스테이징(켜져 있으면) ──▶ 운영(승인)
```

| 단계 | 내용 |
|---|---|
| 이미지 빌드 | `ubuntu-24.04-arm`, `linux/arm64`만. buildx의 GitHub Actions 캐시(`type=gha`)를 쓴다. `GITHUB_TOKEN`으로 GHCR에 올리므로 Docker Hub secret이 필요 없다 |
| 버전 태그 | `docker buildx imagetools create`로 `sha-…` 이미지에 태그만 붙인다. 태그의 커밋으로 만든 이미지가 없으면 실패시킨다 |
| 스테이징 | compose가 `:main`을 가리킨다. 서버를 켤 때(Staging Power) 최신을 받는다 |
| 운영 | compose가 `:2.x.y`를 가리킨다. 지금처럼 Deploy 저장소 PR로 올린다 |
| 롤백 | Deploy 저장소의 태그 PR을 되돌린다. 이전 이미지는 레지스트리에 남아 있다. 급하면 `Deployment-live`(스테이징 생략) |

Deploy 저장소 PR은 손으로 올린다. 프론트 저장소에서 자동으로 PR을 열 수도 있지만 저장소 간 토큰이 필요하고, 운영 배포 시점을 사람이 고르는 지금 방식이 이 서비스에 맞다(티켓 오픈 시간대를 피해야 한다).

**GHCR로 옮기는 이유.** 이미지가 개인 계정(`david0218`)에 있어 그 계정의 토큰이 있어야 배포할 수 있다. GHCR은 조직 소유이고 워크플로의 기본 토큰으로 올린다. 패키지를 공개로 설정하면 서버는 로그인 없이 받는다. 조직 설정에서 공개 패키지를 막아 뒀다면 Docker Hub에 조직 계정을 만들어 쓴다.

## 6. Deploy 저장소에서 바꿀 것

| # | 파일 | 변경 | 시점 |
|---|---|---|---|
| 1 | `scripts/remote-deploy.sh` | 백엔드 헬스체크 뒤에 `curl http://127.0.0.1:3000/healthz`가 200인지 본다 | 아무 때나(v2 이미지가 올라간 뒤) |
| 2 | `.github/workflows/staging-deploy.yml` | `workflow_dispatch` 추가 — 스테이징만 다시 배포 | 아무 때나 |
| 3 | `nginx/site.conf` | `location /`의 `proxy_pass`를 `http://127.0.0.1:3000`으로 | v2를 스테이징에 처음 올릴 때 |
| 4 | `docker-compose.staging.yml` | `front` 이미지를 `ghcr.io/gosrock/dudoong-front:main`으로, `init: true`, `healthcheck` | v2를 스테이징에 처음 올릴 때 |
| 5 | `docker-compose.prod.yml` | `front` 이미지를 `:2.x.y`로, `admin` 서비스와 nginx `depends_on`의 `admin` 삭제 | 컷오버(P15) |
| 6 | `nginx/site.conf` | `location /admin/` 삭제 | 컷오버(P15) |

- **3번.** Next를 `HOSTNAME=127.0.0.1`로 띄우면 IPv4 루프백에서만 듣는다. nginx는 `localhost`를 `127.0.0.1`과 `::1` 둘 다로 풀 수 있고, 그러면 `::1` 쪽 연결은 거절된다. 주소를 숫자로 적으면 이 문제가 없다. v1에도 영향이 없는 변경이다.
- **4번.** nginx 이미지는 스테이징과 운영이 같이 쓰므로 `/admin/` 블록은 컷오버 전까지 남는다. 그동안 스테이징에서는 v2 front와 v1 admin이 같이 돈다. v2의 `/hosting`은 영향을 받지 않고, `/admin/*` 리다이렉트만 컷오버 뒤에 확인할 수 있다.
- `healthcheck`: `wget -qO- http://127.0.0.1:3000/healthz`. `init: true`는 종료 신호를 Node에 제대로 전달하려고 넣는다.

`/healthz`는 `app/healthz/route.ts`에 두고 백엔드를 부르지 않는다(프로세스가 요청을 받는지만 본다). nginx가 `/api`를 백엔드로 보내므로 `/api` 아래에는 둘 수 없다.

## 7. 지금 하지 않는 것

| 항목 | 이유 | 필요해지면 |
|---|---|---|
| 무중단 배포(blue/green) | front가 다시 뜨는 데 수 초다. 같은 서버의 백엔드(JVM)는 재기동이 훨씬 길고 그동안 API가 안 된다. front만 무중단으로 만들어도 사용자가 겪는 것은 거의 같다 | front를 3000·3001 두 개로 띄우고 nginx `upstream`에 둘 다 넣은 뒤 하나씩 교체한다. 메모리가 Node 하나만큼 더 든다 |
| CDN, nginx 정적 캐시 | `_next/static`은 Next가 `immutable`로 내려보내고 압축도 Next가 한다. 서버 1대로 충분한 트래픽이다 | P14에서 티켓 오픈 부하를 보고 판단 |
| PR 미리보기 환경 | 스테이징도 평소에 꺼 둔다. 로컬에서 `rewrites`로 dev API에 붙여 확인한다 | — |
| Deploy 저장소 PR 자동 생성 | §5 | 저장소 간 토큰을 발급하고 릴리스 워크플로에 한 단계 추가 |
| Storybook 배포 | v1은 GitHub Pages에 올렸다. 지금은 로컬에서 본다 | Pages 워크플로 하나 |

## 8. 순서

| 단계 | 내용 | Phase |
|---|---|---|
| D1 | Dockerfile, `.dockerignore`, `/healthz`, `deploymentId`, 이미지 빌드 워크플로, GHCR 패키지 공개 설정. 이미지 크기와 유휴 메모리를 잰다 | P0 |
| D2 | Deploy 저장소 1~4번. 스테이징에 v2를 올리고 확인 항목을 본다 | P4b(스테이징이 처음 필요한 시점). `plan.md` P4b의 포함·완료 기준에 들어 있다. 공개 URL이 필요한 확인(카카오 공유 디버거 P5b, QR 실기기 P13b)은 D2 뒤에 한다 |
| D3 | 버전 태그 워크플로, 롤백 리허설 | P14 |
| D4 | Deploy 저장소 5·6번, 컷오버 | P15 |

D2는 백엔드 마이그레이션(V001~V011)이 스테이징에 실행돼 있어야 의미가 있다([`backend-questions.md`](./backend-questions.md) B5).

## 9. 확인할 것

이 문서는 저장소의 설정 파일을 읽고 쓴 것이다. 아래는 돌려 봐야 안다.

| # | 확인 | 언제 |
|---|---|---|
| 1 | standalone 이미지의 실제 크기, 유휴 상태와 공연 상세를 연속으로 열 때의 메모리 | D1 |
| 2 | vanilla-extract + Cache Components 구성에서 `standalone` 산출물에 빠지는 파일이 없는지(컨테이너로 띄워 주요 라우트를 연다) | D1 |
| 3 | `deploymentId`를 바꿔 배포했을 때 옛 탭이 새로고침으로 넘어가는지 | D2 |
| 4 | 스테이징 서버에서 `localhost`가 `::1`로도 풀리는지(§6의 3번이 실제로 필요한지) | D2 |
| 5 | `next/image` 변환이 스테이징 서버 사양에서 감당되는지 | D2 |
| 6 | 카카오 JS 키가 스테이징과 운영에서 같은지 — 다르면 §4의 "이미지 하나"가 깨지므로 키를 서버에서 내려주는 방식으로 바꾼다 | D1 전 |
| 7 | 조직이 GHCR 공개 패키지를 허용하는지 | D1 |
| 8 | 배포 중 front가 꺼져 있는 시간(초) | D2 |
| 9 | `isomorphic-dompurify`가 띄우는 jsdom의 메모리 — 섹션 10개짜리 공연 상세를 연속으로 열 때의 RSS, jsdom이 standalone 산출물에 빠지지 않고 기동되는지. 부담이 크면 `sanitize-html`로 바꾼다(tech-decisions §17) | D1 |
| 10 | nginx 버퍼링 — 호스팅 센터의 정적 셸이 먼저 흘러 나가는지. Next 문서는 nginx 뒤에서 스트리밍하려면 `X-Accel-Buffering: no`가 필요하다고 한다(self-hosting #streaming-and-suspense). 필요하면 `next.config.ts`의 `headers()`로 `/hosting/:path*`에 붙인다. 공개 화면은 어차피 블로킹이라 영향이 없다 | D2 |
| 11 | `next typegen`(CI)과 `next build`가 `next.config.ts`의 카카오 키 검증 때문에 CI 변수를 요구하는지 — 요구하면 PR 게이트에도 GitHub variable을 넘긴다 | D1 |
