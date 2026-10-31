# DuDoong v2 — 백엔드 질문

> **아직 답을 받지 못한 것만 남긴다**(2026-10-29 정리). 답이 나와 문서·코드에 반영한 항목(B1·B3·B4·B5·B6·B10·B12·B14·B20, B7·B8의 해결된 줄, "이미 확인해서 질문하지 않는 것")은 지웠다. 지운 내용과 근거는 `api-contract.md`·`error-codes.md`·`implementation-log.md`에 있고, 원문은 git 기록(`cc3275e`)에 있다.
> 기준: 백엔드 `dev` `432cce4`(2026-10-25) 소스, 일부는 `cb8d24e`까지 확인. 2026-10-31 재확인: dev `d89d4f9`(빌드 도구 업그레이드 #883뿐 — 아래 항목 변화 없음), Deploy `b5d4d20`(변화 없음). 코드로 알 수 없는 것(의도, 운영 값, 콘솔 설정)과 백엔드가 바꿔 주면 프론트가 단순해지는 것이다.

각 항목의 "답이 없으면"은 답이 오기 전까지 프론트가 그 방식으로 만든다는 뜻이다. 번호는 다른 문서가 참조하므로 그대로 둔다.

---

## 보낼 질문

### B2. 운영의 액세스·리프레시 토큰 수명은?

- **확인한 것**: 기본값은 env `JWT_ACCESS_EXP`·`JWT_REFRESH_EXP`(없으면 둘 다 3600초, `application-common.yml` @432cce4). 운영 값은 env(SSM)라 저장소로 알 수 없다. `cb8d24e`도 같다.
- **영향**: 기본값이면 한 시간 동안 조작이 없을 때 로그인이 풀린다. 리프레시 수명이 길어지면 프론트 세션 표시(`localStorage`)가 Safari에서 7일 뒤 지워지는 영향을 다시 본다.
- **답이 없으면**: 3600초로 보고 만든다.

### B7. 운영 값 세 가지

- GP-5 `payType`·`options[].type`이 실제로 null인 행이 운영에 있나? 소스로는 도메인 컬럼이 null일 때만 null이다(`V2TicketTypes.kt`). (null 허용으로 받는다)
- 업로드 URL 발급 제한의 운영 값이 기본값 30(env `PRESIGNED_URL_RATE_LIMIT`)인가? (30으로 안내한다)
- 공연 자동 만료 스케줄(`dudoong-batch-event-expiration`)이 운영에서 켜져 있나? 켜짐 여부는 SSM `/dudoong/infra/batch-schedules-state` 값이라 저장소로 알 수 없다. 스케줄 자체는 Deploy `infra/batch.yml`에 있다 — 매일 19:00~22:30 KST 30분마다, 실행 시각 기준으로 `startAt + runTime`이 지난 OPEN 공연을 CLOSED로 저장. 22:30 뒤에 끝나는 공연은 다음 날 19:00까지 OPEN이라 셀프 체크인·호스트 스캔이 된다. (켜져 있다고 보고, 공연 상태로 판정한다 — P13b-L)

### B8. 카카오 콘솔 설정

- 카카오 앱의 이메일·이름 동의 항목이 필수인가? 서버는 비어 올 수 있다고 보고 처리하고(`KakaoInformationResponse` nullable), 가입 본문 `email`·`name`은 `@NotEmpty`다. (가입 폼에서 직접 받는다 — 지금 그렇게 했다)
- 카카오 콘솔에 `https://staging.dudoong.com/kakao/callback`과 `http://localhost:3000/kakao/callback`이 등록돼 있나? 서버 허용 목록(`KakaoRedirectPolicy`, staging)에는 둘 다 있다.
- 사소한 버그: `KakaoKauthErrorCode.KOE010`의 errorCode가 `KAKAO_KOE101`로 중복돼 있다(`cb8d24e`도 같다).

### B9. 선물 알림 읽음 처리를 동기로 바꿀 수 있나?

- **확인한 것**: T-2를 열면 승인 알림 읽음 처리가 커밋 뒤 비동기로 돈다(`V2GiftNotificationEventHandler.handleOrderTicketViewed` `@Async` + `AFTER_COMMIT`). 그래서 직후 T-3이 아직 `hasNew: true`일 수 있다 — 설계대로다.
- **질문**: T-2 트랜잭션 안에서 끝내 줄 수 있나, 아니면 프론트가 짧게 한 번 더 읽어야 하나?
- **답이 없으면**: 열자마자 T-3을 한 번만 무효화한다.

### B13. 입금 전(승인 대기) 두둥 주문을 관객이 취소해도 호스트에게 "환불해 주세요" 메일이 가는 것이 의도인가? (#836)

- **확인한 것**: 간다. 사용자 취소(`Order.withdrawByUser`)는 승인 여부와 상관없이 REFUND로 두고, `DudoongTicketRefundHostEmailHandler`는 유료 승인형 + REFUND면 보낸다(@432cce4). 무료는 안 간다.
- **영향**: 입금 전 취소인데 호스트가 환불 요청으로 오해할 수 있다.
- **답이 없으면**: 화면 문구에 메일 이야기를 넣지 않는다.

### B16. 작은 것

- `GET /api/v2/banks`의 Swagger summary가 "[T-7] 은행 목록 (로그인, #797)"이다. 실제로는 #813부터 비로그인 공개다(`SecurityConfig.V2_PUBLIC_GET_PATHS`). `cb8d24e`도 그대로.
- 백엔드 `api/v2/README.md`(91행)는 DTO 검증 실패를 `GLOBAL_400_1`이라고 적지만 실제는 400 `code: "BAD_REQUEST"`다(`GlobalExceptionHandler`. `GLOBAL_400_1`은 던지는 곳이 없다). 문서나 코드 중 하나를 맞춰 달라 — 프론트는 둘 다 검증 오류로 처리한다.
- 동의 강제(env `AGREEMENT_ENFORCE`, 기본 false)를 켜는 날짜가 정해지면 미리 알려 달라. 컷오버 체크리스트에 들어간다.

### B17. 마이페이지 마케팅 수신 토글의 현재 값을 v2에서 어떻게 읽나?

- **확인한 것**: 변경 API는 v1 `PATCH /api/v1/users/me/marketing`이고 본문 없는 **반전**이다(`UserController.kt`). v2 GM-1(`V2MeResponse`)에는 `marketingAgree`가 없다(`cb8d24e`도 같다).
- **문제**: 초기값을 모르면 토글을 그릴 수 없고, 반전 API라 재시도되면 반대 값이 된다. `PATCH /api/v1/users/me/mail`(`receiveMail`)은 거래 메일까지 끄는 다른 스위치다.
- **요청**: GM-1에 `marketingAgree`를 넣거나, 값을 지정하는 API(`{marketingAgree: true|false}`)를 달라.
- **답이 없으면**: 초기값은 v1 `GET /api/v1/users/me`로 읽고, 요청 중 비활성 + 응답 값으로 맞춘다(재시도하지 않는다).

### B18. 두둥티켓 승인 대기 주문을 관객이 앱에서 취소할 수 있어야 하나? — **위험: 서버 동작과 약관 안내가 다름**

- **질문**: 두둥 승인 대기(`PENDING_APPROVE`) 주문에서 `canCancel`이 true라 관객이 앱에서 취소할 수 있다. 약관 제27조③과 v1 운영 안내는 "입금 후 승인 전에는 앱에서 취소할 수 없다"고 한다. 서버에서 막을 것인가, 약관·안내를 바꿀 것인가?
- **근거**: `V2UserOrderDomainService.canCancel`·`cancelBlocker` @432cce4 — 승인 대기는 상태 검사를 건너뛰고, 두둥은 `orderMethod = APPROVAL`이라 PG 사유에도 걸리지 않는다. 서버는 입금 여부를 모른다. 안내 문구는 legal-copy A-2 ⑤·A-7 ⑤·A-8 ⑤-b.
- **답이 없으면**: 서버 `canCancel`대로 그린다(design-requests Q31). 그대로 출시하면 안내와 동작이 어긋난다.

### B19. 승인 완료 주문 취소 때 v1 두둥 주문과 v1 PG 주문을 어떻게 가르나?

- **확인한 것**: 거절(승인 대기) 확인은 `totalAmount > 0`이면 두둥이다(승인 대기는 승인형으로만 생긴다). 승인 완료 주문은 v1 APPROVED(두둥)와 CONFIRM(PG)이 `APPROVED` 하나로 합쳐지고, GR-1·GR-2에 `orderMethod`가 없다. v1에서 만든 주문은 `paymentChannel`도 null이다(`V2OrderResponses.kt`).
- **영향**: 두둥 주문 취소 확인에 "직접 환불" 안내를 붙여야 한다(legal-copy C-3·C-4).
- **답이 없으면**: `paymentChannel`이 두둥 값이거나, null이고 `totalAmount > 0`이면 안내를 붙인다(빠뜨리는 쪽보다 더 붙는 쪽).

### B15. v2 프론트 이미지를 ECR에 올릴 수 있게 Deploy `infra/ecr.yml`을 갱신해 줄 수 있나? — **v2 레지스트리 ECR 결정(2026-10-29)**

- **확인한 것(Deploy `b5d4d20`)**: 운영·스테이징 이미지는 모두 비공개 ECR이고, 올리기는 저장소·ref별 OIDC 역할로만 된다(`infra/ecr.yml`). v2 저장소 `Gosrock/dudoong-frontend-v2`는 어느 역할의 신뢰 조건에도 없다. 서버 받기 권한(인스턴스 역할)도 5개 저장소로 한정돼 있다.
- **요청**(스택 갱신은 조직 관리자)
  1. v2용 ECR 저장소 하나(이름 예: `dudoong-front`). 다른 프론트 저장소처럼 `dev`만 덮어쓰기 허용, 같은 수명 정책.
  2. v2 저장소 푸시 역할 — 신뢰 조건 `refs/heads/main`(→ `:dev`)과 `refs/tags/v*`(→ 버전 태그). 스테이징 수동 배포([`staging-deploy-plan.md`](./staging-deploy-plan.md))를 쓰려면 브랜치 수동 실행도 필요하다 — 열어 줄 수 있는지, 아니면 main 머지 뒤에만 스테이징에 올릴지.
  3. 서버 인스턴스 역할의 받기 권한에 그 저장소 추가.
  4. v2 저장소 secret `AWS_ACCOUNT_ID` 등록.
- **답이 없으면**: 스테이징 첫 배포(deploy-plan D2)를 할 수 없다. 이 저장소의 이미지 워크플로(`image.yml`·`release.yml`)는 아직 GHCR이고, 위 변경이 들어간 뒤 ECR로 다시 쓴다(deploy-plan §1 첫 절).

---

## 조건이 맞으면 보낼 질문(후보)

### B11. 판매 중단 티켓을 GP-5에 포함할 수 있나? — design-requests Q33 답 대기

- GP-5는 판매 중단·판매 기간 밖 티켓을 뺀다(`V2PublicTicketItemMapper.onSaleItems`). 매진은 `isSoldOut`으로 남는다.
- Q33에서 "딤드로 보인다"로 정해지면 보낸다. 그 전까지 서버대로 보이지 않는다.

---

## 지켜보는 것

질문은 아니지만, 바뀌면 프론트 화면이 달라진다.

| 항목 | 프론트에 주는 영향 |
|---|---|
| 기획서의 "기본안"(변경 가능) — 입금자명 닉네임 고정, 받은 티켓 재선물 불가, 공연 검색 범위 등 | 바뀌면 체크아웃·선물·검색 규칙이 바뀐다 |
| #758(열린 이슈) 남은 것 — L-1 인가 스위치 제거, L-3 PQ-5 `IssuedTicket_400_1`·10/O-5 다른 공연 `optionId` 400 → 404 | L-3이 오면 그 두 에러 처리를 404로 바꾼다(error-codes, patterns §24) |
| #776(열린 이슈) — Origin 검사 켜기, 토큰 쿠키 HttpOnly, `state` 필수(@432cce4 기본값 모두 false) | v2 FE는 이미 대응돼 있다(api-contract §7). `state`가 필수가 되면 로그인 링크를 연 지 10분이 지나 돌아온 사용자는 다시 시작해야 한다 |
| #839(열린 PR) — 호스트 사업자 정보 `businessInfo`(GP-3·GH-3), V018 | 머지 뒤 공연 상세·호스트 홈 표시(P5b·P5c). 공개 상세 연락처 가림이 유지되는지 확인 |
| 동의 강제 `agreement.enforce`(지금 false) | 켜지면 design-requests Q42 칸이 생기기 전까지 가입·주문이 400이다(plan P4b·P7·P12) |
| 운영자 개입(#826·#828) — 선물 강제 회수, 주문 대리 승인·거절·취소 등 | 상태가 FE 모르게 바뀔 수 있다 — "400이면 다시 읽기"로 흡수 |
| 호스트별 취소 마감 시각(백로그, 프론트 + 백엔드) | 생기면 취소 화면이 바뀐다. 지금 범위 밖 |
| 마케팅 수신 동의 일시 기록·2년 재확인(백엔드 일) | plan P9 "위험(철회 수단)"·B17과 관련. 지금 범위 밖 |
| 백엔드 #884(열린 PR) — Spring Boot 4.1.2 + Jackson 3 + Hibernate 7 | 머지되면 `pnpm check:contract`로 공개 응답 모양을 다시 확인한다 |
| Deploy #74(열린 이슈) — front·admin을 bridge 네트워크 + `127.0.0.1` 포트 게시로, 컨테이너의 IMDS 접근 차단, nginx `limit_req` | 반영되면 deploy-plan §6 compose·nginx 변경안을 그 구조에 맞춘다 |
| Front #333 "v2 uuid null 처리"(백엔드 Develop 기획서가 "프론트 확인 대기"로 적음) | `Gosrock/DuDoong-Front` #333 본문의 SENT 행·T-2 `ticketUuid` null을 가리키는지는 **추정**이다. 프론트 스키마는 nullable로 받는다 |

---

이 목록은 프론트 계획 문서([`README.md`](./README.md))와 같이 갱신한다.
