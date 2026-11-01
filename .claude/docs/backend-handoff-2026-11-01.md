# 서버(백엔드 · 운영) 전달 문서 — v2 프론트 출시 전(2026-11-01)

> ## ✅ 답 받음 — Backend #905(2026-11-01 10:21Z)
> 이 문서로 연 [Gosrock/DuDoong-Backend#905](https://github.com/Gosrock/DuDoong-Backend/issues/905)에 백엔드 답이 왔다(백엔드 2.5.4는 **스테이징에만**, 운영 2.5.3 — Deploy #96). 답은 원본 문서로 옮겼다 — 아래 본문은 **보낸 당시의 판**이라 지금 상태와 다르다(지금 상태는 원본을 본다).
> - 1-1 동의 강제 → `backend-questions.md` B16(환경별 따로 · v2만 기록 모드 없음 — 출시 전 칸 필수 · 날짜는 #898) · `cutover-runbook.md` §2 · "정해진 것"
> - 1-2 스테이징 v2 → **끝남**(Deploy #93 · #94, `cutover-runbook.md` 머리 · 단계 A). 확인된 문제: 없는 공연 상태 코드 200 → 이슈 #90
> - 1-3 컷오버 · 롤백 → PR ② · 롤백 nginx는 **컷오버 날짜가 정해지면**. `/hosting` 해외 차단 · `--remove-orphans` 결정(`cutover-runbook.md` §3-2 · "정해진 것")
> - 2-1 B18 → **확정 문구**(#897 댓글) — `legal-copy.md` "B18 확정 문구", 2026-11-07 시행 전에는 ⑤를 뺀다. `agreementVersion`은 그대로
> - 2-2 티켓탭 공지 바 → T-3 `refusedOrderUuids`(2.5.4) · '공연 시작'은 프론트 판정 — `api-contract.md` 마이페이지 절, `design-requests.md` Q55, 코드 `ticket-groups.ts` `noticeBar`
> - 2-3 쿠키 · 인증 → 일정 없음(`backend-questions.md` "지켜보는 것" #871)
> - 2-4 `Void` → 래퍼(`api-contract.md` §1, `src/api/http.test.ts`)
> - 3 운영 · 인프라 → `cutover-runbook.md` "정해진 것"(선물 토큰 로그 가림 · 보안 헤더 있음 · `/csp-report` 제한 · S3 호스트 · `v*` ruleset 설정됨 · 스테이징 전원)
> - 4 작은 이슈 → 2.5.3 · 2.5.4로 고침, PQ-5는 400 유지(`api-contract.md` §1 · §4 · 공연 절 · 운영 절)
> - **남은 사람 몫**: 스테이징 리허설(런북 §4), 컷오버 날짜(§1), CSP 강제(리허설 뒤), 동의 강제 날짜(#898). B23~B27은 #905에 보내지 않았다

> v2 프론트 기능 Phase · P14 하드닝 · P15 컷오버 준비(코드 몫)가 끝난 시점에 서버 쪽에 넘길 것을 한 장으로 모았다.
> 원본: [`backend-questions.md`](./backend-questions.md)(열린 질문 B16 · B18 · "지켜보는 것"), [`cutover-runbook.md`](./cutover-runbook.md), `implementation-log.md` P14 보안 · 성능 · 회귀 · P15 절, `design-requests.md` Q55, `progress.md` "사용자 대기".
> 기준 소스: 백엔드 `dev` `cb53bfaa`(2.5.2) · Deploy `main` `d37e9ae`(백엔드 2.5.3 배포). 받은 답이 생기면 원본 문서를 고치고 이 문서는 지운다.

우선순위: **🔴 출시를 막음** · 🟠 출시 전에 답이 필요 · 🟢 출시 뒤여도 됨

---

## 1. 출시를 막는 것 🔴

### 1-1. 동의 강제 `AGREEMENT_ENFORCE` — 켜는 시점(B16, Backend #898)
- **지금**: 운영 · 스테이징 모두 꺼짐(2.5.2 답). 켜는 시점은 "v1 호스트 어드민 카카오 가입 수정 배포 직후"(v1 Front #384) — v2 출시보다 먼저일 가능성이 크다.
- **문제**: v2는 동의 칸 4개(만 14세 · 호스트 정보 제공 · 두둥티켓 안내 · 환불 의무 — 디자인 Q42 대기)가 아직 화면에 없다. 강제가 켜지면 **v2의 가입 · 주문(두둥 · 무료) · 두둥티켓 생성 · 무료→두둥 수정이 전부 400 `Agreement_400_1`**이다. 프론트 로직은 칸 플래그만 켜면 되게 끝나 있다.
- **요청**
  1. 강제를 켜는 날짜 · 환경을 미리 알려 달라(운영 · 스테이징을 따로 켤 수 있나).
  2. v2가 칸을 갖추기 전에 켜야 한다면, v2 출시(컷오버) 전까지 v2 경로만 기록 모드로 둘 수 있나 — 아니면 v2는 출시 전에 칸을 반드시 갖춰야 하나.
  3. 스테이징 리허설 때 강제를 켠 백엔드로 4개 흐름을 확인하고 싶다(런북 §4).

### 1-2. 스테이징에 v2 올리기(D2) — Deploy 저장소
- **지금**: Deploy `main` `d37e9ae`에 v2 스테이징 변경이 아직 없다. v2 이미지는 ECR `dudoong-front:dev`로 main 머지마다 올라간다(Deploy #85로 저장소 · 푸시 역할 생김).
- **요청**: 런북 §3-1 "Deploy PR ①" — 파일별 diff를 그대로 붙일 수 있게 적어 두었다.
  - `scripts/remote-deploy.sh` 백엔드 헬스체크 뒤 `curl http://127.0.0.1:3000/healthz`
  - `nginx/site.conf` `location /`의 `proxy_pass`를 `http://127.0.0.1:3000`(숫자 주소 — `localhost`는 `::1`로 풀릴 수 있음)
  - `nginx/nginx.conf` · `site.conf` `/_next/image` 차단을 호스트별로(스테이징만 열기)
  - `docker-compose.staging.yml` `front` 이미지 `…/dudoong-front:dev`, `init: true`, `healthcheck`
  - nginx 이미지 태그 `Nginx-v1.9.6`
- 스테이징이 없으면 아래 실환경 확인(카카오 공유 · 토스 · QR 실기기 · 카카오맵 · CSP · k6)이 전부 멈춘다.

### 1-3. 운영 컷오버 · 롤백(Deploy PR ②)
- 런북 §3-2 · §5 · §7-1: compose `front` 이미지 교체(`dudoong-front:2.x.y`), `admin` 서비스와 nginx `depends_on` 삭제, nginx `location /admin/` 삭제, `/_next/image` 차단 삭제.
- 롤백: compose 이미지 태그와 nginx 설정을 되돌린다(예상 6~15분). v2는 v1 주소를 **308**로 보내서 롤백하면 브라우저가 기억한 v2 주소가 v1에서 404가 된다 → **롤백용 nginx 되돌림 이미지(`Nginx-v1.9.7`)를 미리 만들어 두는 것**을 요청(런북 §5-3).
- 프리즈 윈도우(진행 중 · 임박 공연 없는 시간대), 백엔드 배포와 겹치지 않게(같은 서버, 동시 실행 그룹 `deploy-production-server`), 백엔드 담당이 연락 가능한 시간.
- 운영 백엔드 마이그레이션이 실행돼 있는지(B5 — V018은 열린 PR #839 몫).

---

## 2. 출시 전에 답이 필요한 것 🟠

### 2-1. B18 — 두둥티켓 승인 대기 주문 셀프 취소 안내 문구
- 서버 동작은 그대로(승인 대기 셀프 취소 허용, `canCancel`대로)이고 약관 제27조③은 v1 Front #385로 해결(2026-11-07 시행, **#385는 머지 전 PR**).
- **남은 것**: v2 화면 안내 문구(legal-copy A-2 ⑤ · A-7 ⑤ · A-8 ⑤-b). v1 문구 "승인 전에는 앱에서 취소할 수 없습니다"는 v2에서 틀린 말이 된다. 프론트 초안은 legal-copy "B18 잠정안"(지금 화면에 쓰는 중) — **운영이 문구를 따로 줄지, 잠정안을 확인만 할지** 답을 달라.
- #385가 머지 전에 바뀌면 알려 달라(v2 `public/term.html`을 그 판으로 바꿔 두었다).

### 2-2. 티켓탭 공지 바 — 서버 값(design-requests Q55)
- GUI(Ready `908:3276`)에는 승인 대기 "티켓 주문이 완료되었습니다!" · 승인 거절 "…승인이 거절되었습니다." + [티켓보기] · 공연 시작 "공연이 시작되었습니다!" 공지 바가 있다.
- T-3은 "새로 승인된 주문"(`hasNew` · `orderUuids`)만 줘서 나머지를 **언제 띄우고 언제 지울지** 화면이 알 수 없다. 지금은 승인 NEW와 기본 문구 두 가지만 그린다.
- **요청**: 이 변형들을 띄울 서버 값(예: 새로 거절된 주문, 시작된 공연)을 줄 계획이 있나 — 없으면 디자인에서 빼는 쪽으로 정리한다.

### 2-3. 운영 쿠키 · 인증(#776 · #871 — 열린 이슈)
- v2는 HttpOnly 쿠키 · `state` 검사 · Origin 검사에 이미 대응돼 있다.
- **요청**: 리프레시 쿠키 Path 제한 · Domain 제거가 들어가는 시점을 알려 달라 — 재발급 · 로그아웃 경로와 쿠키 전송을 스테이징에서 확인해야 한다. 운영 쿠키 `SameSite=Strict`에서 외부 링크 진입 · 카카오 로그인 복귀는 리허설 항목(런북 §4).

### 2-4. `Void` 응답 본문(deploy-plan §9 12번)
- 탈퇴 `DELETE /api/v1/auth/me` · 로그아웃 `POST /api/v1/auth/logout`이 **빈 본문인지 `{success, data: null}` 래퍼인지** — 소스(`ResponseEntity<Void>` + 응답 래퍼 어드바이스)만으로 확정이 안 된다. 프론트 파서는 둘 다 받게 했지만 실제 바이트를 알려 주면 확인을 지운다.

---

## 3. 운영 · 인프라(Deploy · nginx) 🟠

P14 보안 점검(#79)에서 나온 것. 앱 쪽은 끝났고 서버 설정만 남았다.

| 무엇 | 왜 | 요청 |
|---|---|---|
| nginx 접근 로그의 선물 토큰 | 선물 랜딩 주소 `/gifts/<giftToken>`이 접근 로그에 그대로 남는다(앱 로그는 화면 패턴만 남김) | 접근 로그 보존 기간 · 접근 권한 확인, 필요하면 그 경로 마스킹 |
| 보안 응답 헤더 | 앱은 보안 헤더를 중복으로 넣지 않는다(tech-decisions §25) — 선물 토큰 Referer 유출은 nginx `Referrer-Policy: strict-origin-when-cross-origin`이 막는 전제 | 운영 nginx에 `Referrer-Policy` · `X-Frame-Options`가 실제로 붙는지 확인 |
| `/csp-report` 요청 수 제한 | v2가 CSP 위반 보고를 받는 엔드포인트(Report-Only) — 누구나 POST 가능 | nginx `limit_req`(Deploy #74와 같이) |
| CSP 강제 전환 | e2e · QA는 SDK가 가짜라 실제 출처를 못 본다 | 스테이징에서 `csp.violation` 로그 0 확인 → `CSP_ENFORCE=1` 빌드. S3 presigned 실제 호스트를 알려 주면 `connect-src`를 좁힌다 |
| nginx 버퍼링(deploy-plan §9 10번) | 호스팅 센터 정적 셸이 먼저 흘러 나가는지 | 스테이징에서 확인, 필요하면 `X-Accel-Buffering: no` |
| `Host` · `X-Forwarded-Proto` 전달(§9 0번) | 안 넘기면 공연 상세 `og:url` · canonical이 `127.0.0.1:3000` | 스테이징에서 `curl -A kakaotalk-scrap …/events/<id> \| grep og:url` |
| 카카오 콘솔 · 허용 목록 | v2는 `/admin/kakao/callback`을 받지 않는다(§22) | 컷오버 뒤 백엔드 허용 목록 · 콘솔 Redirect URI에서 빼기 |
| 고아 `admin` 컨테이너 | 컷오버로 compose에서 빠진다 | 컷오버 뒤 정리 |
| `/hosting` 해외 차단 | v1은 `/admin`을 해외 차단했다 | v2 `/hosting`도 막을지 결정(런북 "결정 대기") |
| 저장소 `v*` 태그 ruleset 없음 | ECR 푸시 역할이 `refs/tags/v*`를 믿는다 — 누구나 태그를 달면 운영 이미지가 올라간다 | 저장소 Settings → Rules에서 `v*` 생성 · 삭제를 관리자만 |

---

## 4. 서버 쪽 작은 이슈 · 개선 제안 🟢

`cb53bfaa`에서도 그대로인 것. 프론트는 지금 방식으로 막아 두었다.

| 무엇 | 지금 동작(근거) | 제안 |
|---|---|---|
| 호스트 이름 전각 공백 | `@Pattern(".*\\S.*")`이 전각 공백(U+3000)을 통과시키고, 호스트는 `V2UpdateHostUseCase`의 `trim()`이 지워 **빈 이름이 저장된다**(공연 · 옵션은 패턴만) | `\p{javaWhitespace}` 패턴(마이페이지 이름처럼) 또는 trim 뒤 검사. 프론트는 보내기 전에 trim으로 막음 |
| 멤버 일괄 추가 `HOST_400_15` 사유 | 동시 추가로 unique 위반이 나면 사유에 **요청한 이메일 전부**를 붙인다(`V2AddHostMembersUseCase`) | 실제로 겹친 이메일만. 지금은 모든 줄에 "이미 멤버"가 붙음 |
| README M-2 설명 | "공백만인 이름은 `USER_400_4`" — #884 뒤로는 `@Pattern`이 먼저라 400 `BAD_REQUEST`, `USER_400_4`는 줄바꿈 금지 공백(U+00A0 등)만 | 문서만 고치기(README 191행) |
| GP-2 목록에 `hostId` · `updatedAt` | sitemap이 호스트 홈 주소를 모으려고 종료 전 공연마다 GP-3을 한 번씩 부르고, 수정일이 없어 `lastModified`를 비운다 | 둘 다 `Event`에 이미 있음 — `V2EventListItemResponse`에 더해 주면 GP-3 호출이 사라짐 |
| 섹션 기본 제목 띄어쓰기 | 백엔드 `EventSection.DEFAULT_TITLES` "공연 소개"(띄어 씀) vs 프론트 · 디자인 "공연소개" | 어느 쪽으로 맞출지(디자인 확인 같이) |
| PQ-5 `IssuedTicket_400_1` · 10/O-5 다른 공연 `optionId`(#758 L-3) | 400 | 404로 바뀌면 알려 달라 — 프론트 에러 처리를 바꾼다 |

---

## 5. 지켜보는 것 — 들어오면 프론트가 바뀜

| 서버 쪽 | 프론트 영향 |
|---|---|
| #870 공연별 "두둥티켓 취소 · 환불 기준" 필드 · 주문 시점 스냅샷 | 기본 정보 폼에 칸, 공연 상세 · 체크아웃 · 취소 화면에 표시 |
| #869 공연 종료 6개월 뒤 구매자 연락처 마스킹 · 엑셀 차단 | 예매자 관리에서 가린 값 · 엑셀 거부 에러 처리(에러 코드는 그때 확인) |
| #839 호스트 사업자 정보 `businessInfo`(V018) | 공연 상세 · 호스트 홈 표시 |
| Deploy #74 bridge 네트워크 · IMDS 차단 · `limit_req` | 컷오버 diff를 그 구조에 맞춤 |
| 운영자 개입(#826 · #828) | 프론트는 "400이면 최신 상태 다시 읽기"로 흡수 |
| 마케팅 수신 동의 일시 기록 · 2년 재확인 | 마이페이지 수신 토글(지금 화면에 없음 — 사용자 결정 대기) |

---

## 6. 서버 · 스테이징이 열리면 프론트가 확인할 것(참고)

서버 일은 아니지만 스테이징(D2)이 있어야 한다: 카카오톡 공유 · 공유 디버거, 토스 앱 송금 링크 · 실주문 1회, QR 실기기 3종 판독 · 셀프 체크인, 카카오맵 · 우편번호 SDK(앱 도메인 · 키), k6 부하 시험(읽기만 — 주문까지는 시험 계정 · 무료 티켓 · 시간 맞춤), 운영 LCP/TTFB 실측.
