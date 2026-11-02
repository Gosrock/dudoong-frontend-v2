# v2 컷오버 · 롤백 런북

> 2026-11-01 작성(P15 — 이 저장소에서 코드·문서로 되는 것만). **이 문서의 모든 단계는 사람이 한다** — Deploy 저장소 PR · 태그 푸시 · 운영 배포 · DNS · 서치 콘솔은 프론트 세션이 하지 않는다.
> 근거: [`deploy-plan.md`](./deploy-plan.md) §5 · §6 · §8 · §9, [`tech-decisions.md`](./tech-decisions.md) §22(레거시 URL) · §25(배포 인프라), [`plan.md`](./plan.md) P15.
> Deploy 저장소 대조 기준: `Gosrock/DuDoong-Deploy` `main` **`d37e9ae`**(2026-11-01, 백엔드 2.5.3 배포) — `gh api` 읽기로 맞췄다. 적용 전에 `main`이 바뀌었으면 아래 diff를 그 판에 다시 맞춘다.
> **2026-11-01 백엔드 답(Backend #905) 반영**: 단계 A(스테이징 v2)는 **끝났다** — Deploy #93(§3-1 그대로 + 선물 토큰 로그 가림 · `/csp-report` 제한 → `Nginx-v1.9.6`) · #94(`docker-compose.staging.yml` front `dudoong-front:dev`). 스테이징 배포 확인 2026-11-01 18:48(`front try 1: 200`, `/healthz` 200, `og:url` = `https://staging.dudoong.com/events/55`, 업로드 출처 밖 `/_next/image` 400, 운영 `/_next/image` 404 그대로). "결정 대기" 대부분이 정해졌다(문서 끝 "정해진 것"). PR ②와 롤백 nginx 이미지는 **컷오버 날짜가 정해지면** 백엔드가 같이 준비한다(`v2.0.0` 이미지가 있어야 compose를 쓸 수 있어서).

## 0. 한눈에

| 단계 | 무엇 | 누가 · 어디 | 되돌리기 |
|---|---|---|---|
| A | **스테이징을 v2로**(D2 — deploy-plan §6 1 · 2 · 3 · 4 · 8번) — **끝남(2026-11-01, Deploy #93 · #94)**. 스테이징은 평소 꺼져 있다(매일 02:00 자동 종료) — 리허설할 때 Deploy Actions → **Staging Power → start**(최신 `:dev`를 다시 배포) | Deploy PR ①, `Nginx-v1.9.6` 태그 | PR ① 되돌림 |
| B | 스테이징 리허설(§4 체크리스트 전부) | 사람 · 스테이징 | — |
| C | 첫 버전 태그 `v2.0.0`(§6) — `:dev` 승격 | 프론트 저장소 관리자 | 태그는 덮어쓸 수 없다 — 다음 패치 버전으로 |
| D | 롤백용 nginx 이미지 미리 만들기(§5-3) — 컷오버 날짜가 정해지면 백엔드가 PR ②와 같이(#905 §1-3) | Deploy, `Nginx-v1.9.7` 태그 | — |
| E | **운영 컷오버**(deploy-plan §6 5 · 6 · 9번) — 프리즈 윈도우 안에서. 그 시간대에는 백엔드를 배포하지 않는다(#905 §1-3) | Deploy PR ②, `Nginx-v1.10.0` 태그, Deployment(운영 승인) | §5 롤백 |
| F | 컷오버 뒤 확인 · 검색 등록(§7) | 사람 | — |

nginx 설정은 이미지에 구워진다(`nginx/Dockerfile`이 `site.conf` · `nginx.conf`를 복사). 설정을 바꾸면 **`Nginx-vX.Y.Z` 태그 → `nginx-build.yml`이 ECR에 올린 뒤** compose의 nginx 태그를 올리는 순서다. 버전 번호(1.9.6 · 1.9.7 · 1.10.0)는 예시다 — 그때 최신 다음 번호를 쓴다.

## 1. 프리즈 윈도우(사람이 정할 칸)

배포하면 front 컨테이너 교체 동안 수 초 끊기고(deploy-plan §1), 롤백까지 최대 20~30분 걸릴 수 있다(§5-4). 그래서 아래를 모두 만족하는 시간대를 고른다.

| 조건 | 확인 | 값(사람이 채움) |
|---|---|---|
| 진행 중 공연 없음 — 당일 공연(현장 QR 체크인 중)이 없다 | 운영 공개 목록 `GET /api/v2/events` `displayStatus`, 내부 어드민 | |
| 임박 공연 없음 — 24시간 안에 시작하는 공연 · 티켓 오픈이 없다 | 같은 목록의 `startAt`, 호스트 공지 | |
| 승인 대기 주문이 몰려 있지 않다(호스트가 입금 확인을 하는 시간대 피하기) | 내부 어드민 | |
| 사람 둘 이상 대기(배포 승인자 + 확인자), 백엔드 담당 연락 가능 | — | |
| 백엔드 배포와 겹치지 않는다(같은 서버, Deployment 동시 실행 그룹 `deploy-production-server`) | Deploy 저장소 Actions | |
| 정한 시간대 | | **YYYY-MM-DD HH:MM ~ HH:MM** |

권장: 평일 새벽(02~05시) — 트래픽이 가장 적고, 롤백해도 영향이 작다. 서비스 상단 배너(서비스 공지, P9c)로 하루 전 점검 안내를 띄운다.

## 2. 컷오버 전에 끝나 있어야 하는 것(go / no-go)

하나라도 아니면 컷오버하지 않는다.

- [ ] **백엔드 `AGREEMENT_ENFORCE` 값 확인**(plan P15, v1 Front #384). 켜져 있으면 v2에 동의 칸 4개(Q42 — 디자인 대기)와 플래그(`AGE_OVER_14_FIELD` · `HOST_PROVISION_FIELD` · `DUDOONG_NOTICE_FIELD` · `REFUND_OBLIGATION_FIELD`)가 켜져 있어야 한다 — **칸 없이 출시하면 가입 · 주문 · 두둥티켓 생성 · 무료→두둥 수정이 전부 400(`Agreement_400_1`)이다.** 꺼져 있어도 **v2는 칸 4개를 켠 채로 출시한다**(동의는 법적으로 받아야 하는 값 — v2만 기록 모드로 두는 길은 없다, Backend #905 §1-1). 강제 날짜는 Backend #898에 미리 남겨 준다 **2026-11-01 칸 4개를 DS로 붙이고 플래그를 모두 켰다**(#101 — 위치는 디자인 Q42 답 전 잠정). 남은 확인: 스테이징만 `AGREEMENT_ENFORCE=true`로 켠 리허설(§4 — 가입 · 두둥/무료 주문 · 두둥티켓 생성 · 무료→두둥 수정이 통과하는지)
- [ ] GA · 카카오 애드핏이 들어가 있다(처리방침이 수집을 이미 적고 있다 — plan P14, 사용자가 직접)
- [ ] 단계 A · B 끝 — 스테이징 리허설(§4) 전부 체크
- [ ] `v2.0.0` 이미지가 ECR에 있고(단계 C), 그 이미지가 스테이징에서 본 이미지다(`release.yml` 로그 "태그만 붙인다")
- [ ] 롤백용 nginx 이미지(단계 D)가 ECR에 있다
- [ ] `next`가 `16.4.1` 이상(`package.json` 정확한 버전) — `/_next/image` 차단을 지우는 조건(deploy-plan §3). 그 뒤 이미지 최적화 보안 공지가 없는지 [GitHub advisories](https://github.com/vercel/next.js/security/advisories) 확인
- [ ] 카카오 개발자 콘솔 Redirect URI에 `https://dudoong.com/kakao/callback`이 있다(v1 티켓도 쓰는 값). `/admin/kakao/callback`은 v2가 받지 않는다(tech-decisions §22) — 백엔드 허용 목록에서 빼는 것은 컷오버 뒤
- [ ] 백엔드 마이그레이션이 운영에 실행돼 있다(backend-questions B5)
- [ ] **운영 백엔드가 Api 2.5.6 이상**(2026-11-02 — Backend #914 답 · Deploy#100은 스테이징만, 운영은 2.5.3). v2 프론트가 기대하는 것: 주문 `Idempotency-Key`(#923 — 없으면 헤더를 무시하고 10초 중복 판정만, 타임아웃 재시도가 새 주문이 될 수 있다), 카드 가격 줄 값(#925 — 없으면 줄이 안 보임), T-1 `approvalRequired`(#924 — 없으면 '승인완료'), 티켓 번호 체크인 `by-ticket-no`(#926 — **없으면 404**, QR 체크인 "티켓 번호로 입장"이 실패), 거절 사유 100자(#921 — **2.5.3은 20자라 21~100자 거절이 400 `Order_400_18`**), 검색에 공연장 이름(#922). 운영 compose 백엔드 태그를 컷오버 때 같이 올린다(백엔드 답 "컷오버 날짜를 정할 때 같이"). 선택 DDL V022(`idx_issued_ticket_no`)
- [ ] CSP: 스테이징에서 `csp.violation` 로그 0을 봤다. 강제(`CSP_ENFORCE=1`)는 컷오버와 따로 — Report-Only로 출시해도 된다(사용자 대기 "CSP 강제 전환")

## 3. Deploy 저장소 적용 diff

경로는 Deploy 저장소 루트 기준. `- ` 줄을 지우고 `+ ` 줄을 넣는다.

### 3-1. PR ① — 스테이징을 v2로(단계 A)

**`scripts/remote-deploy.sh`** — front 헬스체크(deploy-plan §6 1번). compose의 front가 v2 이미지(`dudoong-front`)일 때만 본다 — v1 front에는 `/healthz`가 없어서 운영(아직 v1)에 같은 스크립트가 돌아도 깨지지 않는다.

```diff
 echo "== 헬스체크 (최대 10분)"
 for i in $(seq 1 60); do
   code=$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://localhost/api/v1/examples/health || true)
   echo "try $i: $code"
-  [ "$code" = "200" ] && exit 0
+  [ "$code" = "200" ] && break
   sleep 10
 done
-echo "$NAME health check failed"
-sudo docker ps --format '{{.Names}}\t{{.Status}}'
-exit 1
+if [ "$code" != "200" ]; then
+  echo "$NAME health check failed"
+  sudo docker ps --format '{{.Names}}\t{{.Status}}'
+  exit 1
+fi
+
+# front v2(Next standalone)는 루프백 3000 의 /healthz 로 본다 (FE deploy-plan §6 1번). v1 front(dudoong-ticket)에는 이 경로가 없다
+if grep -q 'dudoong-front:' "$DIR/$COMPOSE"; then
+  echo "== front 헬스체크 (최대 2분)"
+  for i in $(seq 1 12); do
+    fcode=$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/healthz || true)
+    echo "front try $i: $fcode"
+    [ "$fcode" = "200" ] && exit 0
+    sleep 10
+  done
+  echo "$NAME front health check failed"
+  sudo docker ps --format '{{.Names}}\t{{.Status}}'
+  exit 1
+fi
+exit 0
```

**`.github/workflows/staging-deploy.yml`** — 스테이징만 다시 배포(deploy-plan §6 2번, 선택). 수동 실행을 열려면 `on:`에 한 줄. 이미지 태그 입력까지는 [`staging-deploy-plan.md`](./staging-deploy-plan.md) §2.

```diff
 on:
   workflow_call:
+  workflow_dispatch:
```

**`nginx/nginx.conf`** — `/_next/image` 차단을 호스트별로(deploy-plan §6 8번). `$admin_host` map 바로 아래에:

```diff
     map $host $admin_host {
         default                             0;
         internal-admin.dudoong.com          1;
         staging-internal-admin.dudoong.com  1;
     }
+    # /_next/image 차단 (site.conf). v1 티켓(Next 13)이 도는 호스트만 막는다 — v2(Next 16.4.1)는 연다.
+    # 컷오버 때 이 map 과 site.conf 의 /_next/image 블록을 같이 지운다 (FE deploy-plan §6 9번)
+    map $host $next_image_blocked {
+        default              1;
+        staging.dudoong.com  0;
+    }
```

**`nginx/site.conf`** — 차단 블록을 호스트별로(8번), `location /`을 IPv4 루프백 숫자로(3번 — v2는 `HOSTNAME=127.0.0.1`로만 듣는다. `localhost`가 `::1`로 풀리면 거절된다. v1에는 영향 없다).

```diff
-# Next.js 13 이미지 최적화 경로는 원격 코드 실행 취약점이 있어 막는다. 티켓은 images.unoptimized 로 원본을 직접 쓴다 (Deploy #73)
-location = /_next/image {
-    return 404;
-}
+# Next.js 13(v1 티켓) 이미지 최적화 경로는 원격 코드 실행 취약점이 있어 막는다 (Deploy #73).
+# v2(Next 16.4.1 — 고친 버전, 업로드 출처 하나만 최적화)가 도는 호스트는 연다. $next_image_blocked 는 nginx.conf
+location = /_next/image {
+    if ($next_image_blocked) {
+        return 404;
+    }
+    include /etc/nginx/proxy_headers.conf;
+    proxy_pass http://127.0.0.1:3000;
+}
```

```diff
 location / {
     include /etc/nginx/proxy_headers.conf;
-    proxy_pass http://localhost:3000;
+    proxy_pass http://127.0.0.1:3000;
 }
```

→ 커밋 뒤 **`Nginx-v1.9.6` 태그 푸시**(`nginx-build.yml`이 ECR에 올린다). 이미지가 올라간 뒤 아래 compose를 같은 PR(또는 뒤 커밋)에 넣는다.

**`docker-compose.staging.yml`** — front를 v2로(4번), nginx 새 이미지. `admin`(v1 어드민 `:dev`)은 컷오버까지 남긴다(`/admin/*`은 아직 v1 어드민으로 간다).

```diff
   front:
     restart: unless-stopped
-    image: "${ECR_REGISTRY:?}/dudoong-ticket:dev"
+    image: "${ECR_REGISTRY:?}/dudoong-front:dev"
     container_name: front
     network_mode: "host"
+    # 종료 신호를 Node 에 제대로 넘긴다 (FE deploy-plan §6 4번)
+    init: true
     environment:
       - TZ=Asia/Seoul
+      # Next standalone 은 루프백에서만 듣는다 (이미지 ENV 와 같은 값 — 명시)
+      - HOSTNAME=127.0.0.1
+      - PORT=3000
+    healthcheck:
+      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/healthz"]
+      interval: 30s
+      timeout: 3s
+      start_period: 10s
+      retries: 3
     logging:
```

```diff
   nginx:
 ...
-    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.9.5"
+    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.9.6"
```

`docker-compose.prod.yml`의 nginx도 `1.9.6`으로 올려도 된다(차단은 운영 호스트에서 그대로, `127.0.0.1:3000`은 v1 front에도 같다). 안 올리면 운영 배포 job은 바뀐 것이 없다 — PR ① 머지 뒤 Deployment의 운영 승인 요청은 **거절해도 된다**(스테이징 job만 의미 있음).

### 3-2. PR ② — 운영 컷오버(단계 E)

**`nginx/site.conf`** — `/admin/` 블록 삭제(6번 → `/admin/*`이 front로 가고 v2 `redirects()`가 308로 `/hosting/*` 등으로 보낸다), `/_next/image` 블록 삭제(9번 → `location /`로 간다).

```diff
-# Next.js 13(v1 티켓) 이미지 최적화 경로는 원격 코드 실행 취약점이 있어 막는다 (Deploy #73).
-# v2(Next 16.4.1 — 고친 버전, 업로드 출처 하나만 최적화)가 도는 호스트는 연다. $next_image_blocked 는 nginx.conf
-location = /_next/image {
-    if ($next_image_blocked) {
-        return 404;
-    }
-    include /etc/nginx/proxy_headers.conf;
-    proxy_pass http://127.0.0.1:3000;
-}
-
 location /api {
```

```diff
-location /admin/ {
-    include /etc/nginx/proxy_headers.conf;
-    proxy_pass http://localhost:3100/;
-}
-
 location / {
```

**`nginx/nginx.conf`** — 8번 map 삭제.

```diff
-    # /_next/image 차단 (site.conf). v1 티켓(Next 13)이 도는 호스트만 막는다 — v2(Next 16.4.1)는 연다.
-    # 컷오버 때 이 map 과 site.conf 의 /_next/image 블록을 같이 지운다 (FE deploy-plan §6 9번)
-    map $host $next_image_blocked {
-        default              1;
-        staging.dudoong.com  0;
-    }
```

`$admin_path` map(`^/(admin|internal-admin|internal-api)`)은 남긴다 — 해외에서 옛 `/admin/*` 주소를 열면 리다이렉트 대신 "관리자 화면은 국내에서만" 403이다. **v2 `/hosting`도 같은 정책으로 막는다(결정 2026-11-01, Backend #905 §1-3)** — PR ②에서 그 정규식에 `hosting`을 더한다(`^/(admin|hosting|internal-admin|internal-api)`, 화면만 막히고 API는 그대로).

→ 커밋 뒤 **`Nginx-v1.10.0` 태그 푸시**, 이미지가 올라간 뒤 compose:

**`docker-compose.prod.yml`** — front 교체, `admin` 서비스 삭제, nginx `depends_on`의 `admin` 삭제, nginx 새 이미지(5번).

```diff
   front:
     restart: unless-stopped
-    image: "${ECR_REGISTRY:?}/dudoong-ticket:1.4.3"
+    image: "${ECR_REGISTRY:?}/dudoong-front:2.0.0"
     container_name: front
     network_mode: "host"
+    init: true
     environment:
       - TZ=Asia/Seoul
+      - HOSTNAME=127.0.0.1
+      - PORT=3000
+      # 검색엔진 소유 확인 메타 (값이 비면 넣지 않는다 — (public) 레이아웃). 공개 값이라 compose 에 둔다. 받은 뒤 주석을 푼다 (§7)
+      # - GOOGLE_SITE_VERIFICATION=<서치 콘솔 값>
+      # - NAVER_SITE_VERIFICATION=<서치어드바이저 값>
+    healthcheck:
+      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/healthz"]
+      interval: 30s
+      timeout: 3s
+      start_period: 10s
+      retries: 3
     logging:
       driver: awslogs
       options:
         awslogs-group: "dudoong-prod"
         awslogs-region: "ap-northeast-2"
         awslogs-stream: "front"
-  admin:
-    restart: unless-stopped
-    image: "${ECR_REGISTRY:?}/dudoong-admin:1.4.0"
-    container_name: admin
-    network_mode: "host"
-    environment:
-      - TZ=Asia/Seoul
   internal-admin:
```

```diff
   nginx:
     network_mode: "host"
     depends_on:
       - backend
       - front
-      - admin
       - internal-admin
     restart: always
-    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.9.5"
+    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.10.0"
```

**`docker-compose.staging.yml`** — 같은 정리(스테이징도 v1 어드민을 내린다).

```diff
-  admin:
-    restart: unless-stopped
-    image: "${ECR_REGISTRY:?}/dudoong-admin:dev"
-    container_name: admin
-    network_mode: "host"
-    environment:
-      - TZ=Asia/Seoul
   internal-admin:
```

```diff
     depends_on:
       - backend
       - front
-      - admin
       - internal-admin
 ...
-    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.9.6"
+    image: "${ECR_REGISTRY:?}/dudoong-nginx:1.10.0"
```

> 주의: `admin` 서비스를 compose에서 지워도 `docker-compose up -d`는 남은 `admin` 컨테이너를 지우지 않는다(고아 컨테이너 — 3100을 계속 연다). nginx가 더는 보내지 않으니 해는 없지만 — **PR ②에서 `remote-deploy.sh`의 `up -d`에 `--remove-orphans`를 더해 정리한다(결정 2026-11-01, Backend #905 §1-3)**.

## 4. 리허설 체크리스트(스테이징, 단계 B)

스테이징을 켜고(Staging Power) PR ① 배포가 끝난 뒤. 주소는 `https://staging.dudoong.com`. 각 줄에 확인한 사람 · 시각을 남긴다.

**배포 · 인프라**

- [ ] `/healthz` 200 (`curl -s -o /dev/null -w '%{http_code}' https://staging.dudoong.com/healthz`) · 배포 로그에 "front 헬스체크" 통과
- [ ] `og:url`이 스테이징 도메인(deploy-plan §9 0번 — nginx가 `Host`·`X-Forwarded-Proto`를 넘기는 것은 `proxy_headers.conf`로 확인됨, 실제 값을 본다): `curl -s -A 'kakaotalk-scrap/1.0' https://staging.dudoong.com/events/<id> | grep -o '<meta property="og:url"[^>]*>'` → `https://staging.dudoong.com/events/<id>`. canonical도 같은 줄
- [ ] 없는 공연 `/events/999999999` → 크롤러 UA는 **404**, 브라우저 UA는 **200 + `noindex`**(Cache Components 셸 — tech-decisions §26 끝, 이슈 #90). 크롤러는 줄이지 않은 UA로: `curl -s -o /dev/null -w '%{http_code}' -A 'facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984' …` · `-A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'` → 404. 브라우저: `curl -s -A 'Mozilla/5.0' … | grep -o '<meta name="robots"[^>]*>'` → `noindex`
- [ ] `/_next/image` 열림: 공연 상세를 열고 포스터 `<img>`의 `currentSrc`가 `/_next/image?url=https%3A%2F%2Fasset.dudoong.com…`, 응답 200 `image/webp`. `curl -s -o /dev/null -w '%{http_code}' 'https://staging.dudoong.com/_next/image?url=https%3A%2F%2Fexample.com%2Fa.png&w=640&q=75'` → 400(업로드 출처 밖)
- [ ] 이미지 변환 부하(deploy-plan §9 5번): 공연홈을 처음 열 때 서버 CPU · 메모리(`docker stats front`) — 버거우면 `images.deviceSizes`를 줄인다
- [ ] `localhost`가 `::1`로 풀리는지(§9 4번 — 3번 diff를 넣었으니 참고용)
- [ ] 배포 중 front 끊김 시간(§9 8번): 재배포하며 `/healthz`를 1초마다 찍어 실패 초를 센다
- [ ] 옛 탭 새로고침(§9 3번): 배포 전에 연 탭에서 배포 뒤 화면 이동 → 전체 새로고침으로 넘어감
- [ ] CSP 보고: CloudWatch `dudoong-staging` / `front` 스트림에서 `csp.violation` — 카카오 로그인 · 공유 · 지도 · 우편번호 · 포스터 업로드를 한 바퀴 돈 뒤 0건(있으면 `src/utils/csp.ts` 허용 목록)
- [ ] 이미지 크기 · 유휴 메모리(§9 1번), jsdom 메모리(§9 9번 — 지금은 sanitize-html)

**쿠키 · 인증**(운영 쿠키는 `SameSite=Strict`, 스테이징은 `Lax` — tech-decisions §25. 스테이징 백엔드를 Strict로 잠시 바꿀 수 있으면 그 상태로, 아니면 컷오버 직후 운영에서 같은 줄을 다시 본다)

- [ ] 로그인한 상태에서 **외부 링크**(카카오톡 메시지 · 다른 사이트의 `<a>`)로 `/tickets` · `/hosting` 진입 → 로그인 화면으로 튕기지 않고 화면이 뜬다
- [ ] 카카오 로그인 → `/kakao/callback` 복귀 직후 로그인 상태 유지(새로고침해도)
- [ ] 로그인 → 액세스 만료 → 재발급 → 로그아웃의 `Set-Cookie` `Domain` · `Path` · `SameSite`(§9 15번)

**동의 강제(`AGREEMENT_ENFORCE` 켠 스테이징 백엔드)** — plan P15. 동의 칸 · 플래그가 켜진 v2 이미지로:

- [ ] 신규 가입 200
- [ ] 주문 — 두둥 티켓 200 · 무료 티켓 200
- [ ] 호스팅 — 두둥 티켓 생성 200
- [ ] 호스팅 — 무료 티켓 → 두둥 티켓 수정 200
- [ ] (칸 없는 v2로 같은 흐름이 400 `Agreement_400_1`인 것도 한 번 보면 go/no-go 근거가 분명해진다)

**URL 연속성**

- [ ] v1 관객 주소 → 308: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://staging.dudoong.com/history/<주문uuid>?utm_source=kakao'` → `308 …/orders/<주문uuid>?utm_source=kakao`. `/home` · `/ticket/qr` · `/events/<id>/book/order` · `/pay/success`도
- [ ] 그대로인 주소 200: `/events/<id>` · `/mypage` · `/login` · `/meta/term` · `/meta/privacy`
- [ ] `/admin/*` → 308은 **PR ① 상태에서는 v1 어드민이 받는다**(nginx `/admin/` 블록이 남아 있다). 컷오버 뒤 운영에서 확인(§7) — 미리 보려면 스테이징에 PR ②의 site.conf만 먼저 넣는다
- [ ] 전수 표는 tech-decisions §22, e2e `legacy-urls.spec.ts` · `hosting.spec.ts` "리다이렉트"(로컬에서 이미 통과)

**기능 한 바퀴**(실기기 — progress "사용자 대기" 표의 스테이징 줄을 여기서 같이 닫는다)

- [ ] 카카오톡 공유창 · 공유 디버거(QA EVT-10)
- [ ] 토스 송금 링크 실기기 · 실주문 1회(QA CHK-7)
- [ ] QR 체크인 실기기 3종 · 관객 셀프 체크인(QA QR-8 · QR-9 · CHK-8)
- [ ] 카카오맵 · 우편번호(QA HE-11)
- [ ] iOS Safari 오버레이(SHELL-7)
- [ ] 부하: `k6 run -e BASE_URL=https://staging.dudoong.com -e EVENT_ID=<id> scripts/load/ticket-open.k6.js`(스크립트가 운영 주소를 거부한다)

**롤백 리허설**(§5를 스테이징에서 한 번)

- [ ] PR ①을 되돌리는 PR → 스테이징이 v1(`dudoong-ticket:dev`)로 돌아오는 데 걸린 시간 기록: ____ 분
- [ ] 다시 PR ①을 넣어 v2로

## 5. 롤백

### 5-1. 판단 기준 — 이게 보이면 되돌린다

컷오버 뒤 30분 동안 확인자가 본다(§7). 아래 중 하나면 **고치려 하지 말고 되돌린다**:

| 보이는 것 | 어디서 |
|---|---|
| 배포 job 실패(front 헬스체크 2분 초과) 또는 `/healthz`가 200이 아님 | Deployment 로그, `curl` |
| 공연홈 · 공연 상세가 5xx이거나 빈 화면(5분 이상, 두 사람 이상 재현) | 브라우저, CloudWatch `front` |
| 로그인이 안 된다(카카오 복귀 뒤 로그인 화면으로 다시 감 — `SameSite=Strict`) | 브라우저 |
| 주문 생성 · 가입이 400 `Agreement_400_1`(동의 강제와 칸 불일치) | CloudWatch `backend`, 브라우저 |
| 호스트가 입장 QR 체크인을 못 한다 | 호스팅 QR 화면 |
| front 컨테이너 재시작 반복(`docker ps`의 `Restarting`) · 메모리 부족 | 서버 |

되돌리지 않고 고치는 것: 화면 한 곳의 표시 오류, 포스터 한두 개가 안 나옴(이미지 최적화만 문제면 §5-5), CSP 보고(Report-Only라 막지 않는다).

### 5-2. 정확한 단계

1. Deploy 저장소에서 PR ②를 **되돌리는 PR**(`git revert <PR ② 머지 커밋>`)을 만든다. 결과: `docker-compose.prod.yml`이 `dudoong-ticket:1.4.3` · `admin` 서비스(`dudoong-admin:1.4.0`) · nginx `1.9.7`(§5-3 롤백용 — 되돌림 커밋에서 `1.9.6` → `1.9.7`로 한 줄 고친다)로 돌아간다
2. 머지 → `Deployment`가 돈다. **급하면 스테이징을 기다리지 않는 `Deployment-live`(수동 실행, 운영 승인)를 쓴다**
3. 운영 승인 → SSM으로 `remote-deploy.sh prod` → `compose pull` → `up -d` → 백엔드 헬스체크(front 헬스체크는 compose가 v1이라 건너뛴다)
4. 확인: `https://dudoong.com/` v1 화면, `/admin` v1 어드민, `curl -s -o /dev/null -w '%{http_code}' https://dudoong.com/_next/image` → 404(차단 복귀)
5. 서버에 남은 v2 컨테이너는 compose의 `front` 이름을 v1이 다시 쓰므로 교체된다

v1 이미지는 ECR에 남아 있다(수명 정책은 저장소마다 최근 10개 — v1 저장소는 더 올리지 않으므로 `1.4.3` · `1.4.0`이 밀려나지 않는다). 서버에서는 배포 끝의 `docker system prune --all -f`가 안 쓰는 이미지를 지우므로 v1을 **다시 받는다**(v1 ticket 494MB — 1~2분).

### 5-3. 롤백용 nginx 이미지 미리 만들기(단계 D)

v2가 `/home` · `/history/*` · `/ticket/*` · `/admin/*` 등에 **308(영구)** 을 낸다. 브라우저는 308을 기억하므로, 롤백한 뒤에도 그 사이 옛 주소를 연 사람은 v2 주소(`/orders` · `/tickets` · `/hosting` …)로 가고 **v1에는 그 주소가 없어 404**다. 그래서 롤백할 nginx 이미지에는 v2 주소 → v1 주소 되돌림을 넣어 둔다. PR ① 판(`1.9.6`)의 `site.conf`에 아래를 `location /` 위에 더한 것을 `Nginx-v1.9.7`로 미리 올린다(컷오버 전, compose에는 넣지 않는다).

```nginx
# 롤백 전용 (FE cutover-runbook §5-3): v2 의 영구 리다이렉트(308)를 기억한 브라우저를 v1 주소로 돌린다
location = /orders { return 302 /history$is_args$args; }
location ~ ^/orders/([^/]+)$ { return 302 /history/$1$is_args$args; }
location = /tickets { return 302 /ticket$is_args$args; }
location = /hosting { return 302 /admin$is_args$args; }
location ~ ^/hosting/events/([0-9]+)/(dashboard|info|detail|guests|qr|tickets)$ { return 302 /admin/events/$1/$2$is_args$args; }
location ~ ^/hosting/hosts/([0-9]+)/settings$ { return 302 /admin/hosts/$1/info$is_args$args; }
location ~ ^/hosting/hosts/([0-9]+)/members$ { return 302 /admin/hosts/$1/member$is_args$args; }
location = /hosting/new/hosts { return 302 /admin/new/hosts$is_args$args; }
location = /hosting/new/events { return 302 /admin/new/events/1$is_args$args; }
location ~ ^/hosts/([0-9]+)$ { return 302 /admin/hosts/$1/dashboard$is_args$args; }
```

`/home` → `/`(v1에도 `/`가 있다) · `/admin/login` → `/login`(v1에도 있다)은 되돌릴 필요가 없다. `/hosts/:id`는 v2의 공개 호스트 홈이라 v1 어드민으로 보내는 것이 맞는지는 롤백 때 판단(빼도 된다 — v1엔 그 주소가 없어 어차피 404).

### 5-4. 걸리는 시간 예상

| 단계 | 예상 |
|---|---|
| 되돌림 PR 만들기 · 머지(준비된 경우) | 2~5분 |
| Actions 시작 · 운영 승인 대기 | 1~5분(승인자가 대기 중이면 1분) |
| SSM → `compose pull`(v1 ticket 494MB · admin · nginx) · `up -d` | 2~4분 |
| 백엔드 헬스체크(백엔드 이미지는 그대로라 재시작 없음) | 1분 안 |
| **합계** | **약 6~15분**(스테이징 리허설에서 잰 값으로 고친다 — §4 마지막 줄) |

### 5-5. 이미지 최적화만 문제일 때(되돌리지 않고)

`/_next/image`가 5xx · 느림이고 나머지는 정상이면 nginx에 차단을 되살린다(포스터가 원본 대신 404 → 빈 상자). 더 나은 길은 프론트 패치 버전으로 `UploadedImage`가 항상 `unoptimized`가 되게 하는 것(`src/utils/image.ts` `isOptimizableImage`가 `false`를 돌려주면 된다 — 한 줄) → `v2.0.1` 태그 → compose 태그 올림.

## 6. 버전 올리는 법(릴리스 경로 — deploy-plan §5 · §8 D3)

이미지 태그의 정본은 **git 태그 `v2.MINOR.PATCH`** 다. `package.json` `version`(`0.1.0`)은 쓰지 않는다(빌드 · 이미지와 무관).

| 규칙 | |
|---|---|
| 첫 컷오버 | `v2.0.0` |
| 기능 추가 | MINOR(`v2.1.0`) |
| 수정 · 롤백 대체 | PATCH(`v2.0.1`) |
| 같은 번호 다시 | 불가 — ECR 버전 태그는 덮어쓸 수 없다(`IMMUTABLE`). 실수했으면 다음 번호 |

순서:

1. 내보낼 커밋이 `main`에 머지돼 있고, 그 커밋의 **Image 워크플로(`image.yml`)가 성공**했다 — `gh run list --workflow image.yml --limit 3`. 이 실행이 ECR `dudoong-front:dev`를 그 커밋으로 덮어쓴다(라벨 `org.opencontainers.image.revision` = 커밋)
2. 스테이징에서 그 `:dev`를 봤다(Staging Power로 켜면 최신 `:dev`를 받는다)
3. **그 커밋에** 가벼운(lightweight) 태그를 단다 — 주석 달린 태그에서 `GITHUB_SHA`가 커밋인지 아직 확인 전이다(deploy-plan §9 17번):
   ```bash
   git fetch origin main
   git tag v2.0.0 <커밋 sha>          # -a · -m 을 쓰지 않는다
   git push origin v2.0.0
   ```
   (또는 GitHub 웹 Releases에서 태그를 새로 만들며 target을 그 커밋으로)
4. `release.yml` 실행 로그에서 **":dev(…)가 <sha> 이미지다 — 태그만 붙인다"** 줄을 본다. "새로 빌드한다"면 스테이징에서 본 이미지가 아니다(그 사이 `main`에 다른 머지가 있어 `:dev`가 바뀌었다) — 이미지는 나오지만 스테이징에서 다시 본다
5. Deploy 저장소 PR로 `docker-compose.prod.yml` front 태그를 올린다(§3-2 형식) → Deployment → 운영 승인

주의:

- 승격은 `:dev`가 정확히 그 커밋일 때만 된다. 태그를 달기 전에 `main`에 다른 PR이 머지되면 `:dev`가 넘어간다 — 컷오버 버전 태그는 머지를 잠시 멈추고 단다
- `v*` 태그는 **관리자만 만들어야 한다**(푸시 역할이 `refs/tags/v*`를 믿는다). **설정됨(2026-11-01, Backend #905 §3)**: ruleset "v* 릴리스 태그는 관리자만" — 생성 · 수정 · 삭제를 저장소 관리자와 조직 관리자만
- ECR 수명 정책은 태그 이미지를 최근 10개만 남긴다 — 롤백 가능한 프론트 버전은 최근 9개(`:dev` 하나 포함 10개)

## 7. 컷오버 당일 · 뒤

### 7-1. 당일 순서(단계 E)

- [ ] 프리즈 윈도우 시작, §2 go/no-go 전부 체크
- [ ] 서비스 상단 배너로 점검 안내(하루 전부터)
- [ ] PR ② 머지 → Deployment → 스테이징 job(켜져 있으면) 통과 확인 → 운영 승인
- [ ] 배포 로그 "front 헬스체크" 통과
- [ ] 바로 확인(5분 안):
  - [ ] `https://dudoong.com/healthz` 200
  - [ ] 공연홈 · 공연 상세 · 티켓탭 · 공연준비(`/hosting`) — 모바일 · PC
  - [ ] 포스터가 `/_next/image`로 온다(상세 `<img>` `currentSrc`)
  - [ ] `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://dudoong.com/admin` → `308 https://dudoong.com/hosting`, `/admin/events/<id>/guests` → `/hosting/events/<id>/guests`, `/history` → `/orders`
  - [ ] `og:url` = `https://dudoong.com/events/<id>`(§4의 curl)
  - [ ] **운영 쿠키 `SameSite=Strict`**: 로그인 상태로 카카오톡 메시지의 링크 → `/tickets` 진입 유지, 카카오 로그인 복귀 유지
  - [ ] 주문 1회(무료 공연이 있으면 무료로), 호스트 QR 화면 열림
- [ ] 30분 관찰: CloudWatch `dudoong-prod` `front`(에러 로그 · `csp.violation`), `backend`(4xx 급증 — 특히 `Agreement_400_1` · `AUTH_*`)
- [ ] §5-1 기준에 걸리면 바로 §5-2

### 7-2. 뒤(하루~일주일)

- [ ] 서버 고아 `admin` 컨테이너가 없는지(PR ② `--remove-orphans` — §3-2 주의). 남았으면 `sudo docker rm -f admin`
- [ ] 백엔드 허용 목록에서 `/admin/kakao/callback` 빼기, 카카오 콘솔 Redirect URI 정리(tech-decisions §22)
- [ ] **서치 콘솔 · 네이버 서치어드바이저 소유 확인**: 각 콘솔에서 "HTML 태그" 방식 값을 받아 `docker-compose.prod.yml` front `environment`의 `GOOGLE_SITE_VERIFICATION` · `NAVER_SITE_VERIFICATION` 주석을 풀어 넣는다(§3-2) → 배포 → `curl -s https://dudoong.com/ | grep -o '<meta name="\(google\|naver\)-site-verification"[^>]*>'`. 메타는 `src/app/(audience)/(public)/layout.tsx` `generateMetadata`가 런타임 환경변수로 넣는다(이미지를 다시 빌드하지 않는다). 공개 화면(`(public)`)에만 붙으므로 콘솔에 확인 주소로 `https://dudoong.com/`을 준다
- [ ] **sitemap 제출**: 두 콘솔에 `https://dudoong.com/sitemap.xml`(`src/app/sitemap.ts`), `robots.txt`가 그 주소를 가리키는지(`curl https://dudoong.com/robots.txt`)
- [ ] **리치 결과 테스트**: https://search.google.com/test/rich-results 에 공연 상세 2~3개 — `Event` 감지 · 오류 0(가격 · 재고는 일부러 없다 — P5b 원칙이라 "권장 필드" 경고는 괜찮다)
- [ ] **운영 LCP · TTFB 실측**: `scripts/perf-lighthouse.mjs`는 로컬 가짜 백엔드 전용이다 — 운영은 Lighthouse를 직접(`lighthouse https://dudoong.com/events/<id> --only-categories=performance --form-factor=mobile`, 또는 PageSpeed Insights · Chrome DevTools Performance)로 공연홈 · 공연 상세 · 티켓탭(로그인 — DevTools), 모바일. P14 로컬 수치(implementation-log 표)와 비교해 implementation-log에 남긴다. 포스터가 `/_next/image`로 바뀐 효과는 공연 상세 LCP에서 본다(원본 2.4MB → 폭 640 webp 약 60KB — 로컬 확인 2026-11-01)
- [ ] **k6**: 운영에는 돌리지 않는다(스크립트가 거부한다). 다음 큰 티켓 오픈 전에 스테이징에서(§4)
- [ ] 이미지 최적화 보안 공지 지켜보기(deploy-plan §3 — 의존성 알림이 없다)
- [ ] progress "사용자 대기"에서 닫은 줄 지우기

## 결정 대기(사람)

| 무엇 | 선택지 |
|---|---|
| 프리즈 윈도우 날짜 · 시각 | §1 표. 정해지면 백엔드에 알린다 — PR ② · 롤백 nginx 이미지를 그때 같이 준비하고, 프리즈 · 백엔드 담당 대기 시간도 그때 맞춘다(#905 §1-3) |
| 308로 출시할지, 안정될 때까지 307 | 이 PR은 plan P15대로 308(영구). 롤백 가능성이 크다고 보면 `next.config.ts`의 두 `permanent: true`를 `false`로 되돌린 패치 버전으로 출시하고 일주일 뒤 308로 — §5-3 되돌림 nginx가 필요 없어진다 |
| CSP 강제 전환(`CSP_ENFORCE=1`) | 리허설 때 스테이징 `csp.violation` 0 확인 뒤. 업로드 한 번으로 S3 presigned 실제 호스트를 확인한다(아래) |

## 정해진 것(2026-11-01, Backend #905)

| 무엇 | 결정 · 사실 |
|---|---|
| `/hosting` 해외 차단 | **막는다**(v1 `/admin`과 같은 정책) — PR ②에서 `$admin_path` 정규식에 `hosting`(§3-2) |
| 고아 `admin` 컨테이너 | PR ②에서 `remote-deploy.sh` `up -d --remove-orphans`(§3-2 주의) |
| `v*` 태그 ruleset | **설정됨** — "v* 릴리스 태그는 관리자만"(생성 · 수정 · 삭제를 저장소 · 조직 관리자만, §6) |
| 보안 응답 헤더 | **운영에 이미 붙는다** — `Referrer-Policy: strict-origin-when-cross-origin` · `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · HSTS. nginx가 앱 헤더를 숨기고 자기 값 하나만 보낸다(`site.conf`) — 선물 토큰 Referer 전제(tech-decisions §25)가 맞다 |
| `/csp-report` 요청 수 제한 | **넣음**(Deploy #93) — IP당 5r/s, burst 10, 넘으면 429 |
| 선물 토큰 접근 로그 | **가림**(Deploy #93, 스테이징 `Nginx-v1.9.6`) — 요청 경로 · Referer의 `/gifts/<token>` · `/api/v2/gifts/<token>/…` → `/gifts/***`(`/api/v2/me/gifts/{id}`는 그대로). 운영은 컷오버 nginx(PR ②)에 같이 들어간다. 로그 보존: CloudWatch `dudoong-prod` 30일 · `dudoong-staging` 7일(IAM 권한 필요) |
| 스테이징 전원 | 평소 꺼짐(매일 02:00 자동 종료). 리허설 때 Deploy Actions → **Staging Power → start** — 최신 `:dev`가 다시 배포된다 |
| S3 업로드(presigned) 호스트 | 운영 버킷 `dudoong`의 SDK 기본(가상 호스트) 주소 **`https://dudoong.s3.ap-northeast-2.amazonaws.com`**. 스테이징 버킷은 다를 수 있다 — 리허설 때 업로드를 한 번 해서 실제 값을 확인하고 CSP `connect-src`를 좁힌다. 보이는 이미지는 `https://asset.dudoong.com` |
| nginx 버퍼링 | 리허설 때 확인, 필요하면 PR ②에 넣는다 |
| `Host` · `X-Forwarded-Proto` | **확인됨** — 스테이징 `og:url` = `https://staging.dudoong.com/events/55` |
| 카카오 `/admin/kakao/callback` | 컷오버 뒤 백엔드가 허용 목록 · 콘솔에서 뺀다 |
| 동의 강제 `AGREEMENT_ENFORCE` | 운영 · 스테이징 따로(SSM env), 지금 둘 다 꺼짐. **v2만 기록 모드로 두는 길은 없다 — v2는 컷오버 전에 동의 칸 4개를 갖춘다.** 운영 강제는 v1 Front #384 배포 뒤 켜고 날짜를 Backend #898에 미리 남긴다. 칸을 켠 v2 이미지가 준비되면 #905에 알리면 스테이징만 `AGREEMENT_ENFORCE=true`로 바꿔 준다(리허설 §4) |
| 운영 백엔드 마이그레이션(B5) | V018(#839 사업자 정보)은 열린 PR — 컷오버 전에 백엔드가 운영 실행 여부를 다시 확인해 준다 |
