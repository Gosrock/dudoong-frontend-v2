# DuDoong v2 — 백엔드 질문

> 2026-10-15 작성. 프론트 v2 계획을 백엔드 `dev`(`24aa595`) 코드와 통합 기획서(2026-10-10)에 대조하면서 나온 것이다.
> 코드로 확인할 수 있는 것은 이미 확인했다. 여기 남은 것은 **의도, 운영 값, 일정**처럼 코드로는 알 수 없는 것과, 백엔드에서 바꿔 주면 프론트가 단순해지는 것이다.
> **2026-10-25 갱신**: 백엔드 `dev` `432cce4`(2026-10-25)까지 머지된 PR 32개 + 백엔드 Develop 기획서(2026-10-25, 프론트 전달용 — 저장소 밖)로 답이 나온 것을 표시했다. 해결: B1·B3·B4·B6. 부분 해결: B5·B8. 새 질문은 B12부터.

각 항목의 "답이 없으면"은 답이 오기 전까지 프론트가 그 방식으로 만든다는 뜻이다.

---

## 질문

### B1. 리프레시 토큰이 사용자당 하나만 유효한 것이 의도인가? — **해결(#807)**

- **확인한 것(24aa595 기준)**: 리프레시 토큰을 Redis에 사용자 id를 키로 저장하고, 로그인·재발급 때마다 덮어쓴다.
- **문제**: 다른 기기에서 로그인하면 기존 기기의 다음 재발급이 실패해 로그아웃된다. 폰으로 티켓을 보던 사람이 노트북으로 호스팅 센터에 들어오면 한쪽이 끊긴다.
- ~~답이 없으면: 의도로 보고, "다른 기기에서 로그인하면 로그아웃될 수 있어요" 안내를 둔다.~~
- **답**: 의도가 아니었고 여러 기기 동시 로그인으로 바뀌었다. 로그인·가입 = 새 세션, 재발급 = 같은 세션 회전, 로그아웃 = 이 기기 세션만(`RefreshUseCase`·`LogoutUseCase` @432cce4). 세션 상한 10개(넘으면 가장 오래된 세션이 다음 재발급에서 403 `AUTH_403_1`), 재발급 경합 유예 30초, 유예가 지난 옛 토큰 재사용은 403 + 그 세션 폐기(`RefreshTokenAdaptor` @432cce4 — `MAX_SESSIONS = 10`, `GRACE_MILLIS = 30_000`. 상한 정리는 새 세션을 만들 때 마지막 발급이 가장 오래된 세션부터). 응답·쿠키 형식은 그대로라 FE 코드 변경은 필요 없다. "다른 기기에서 로그인하면…" 안내는 두지 않는다.

### B2. 운영의 액세스·리프레시 토큰 수명은?

- **확인한 것**: 코드 기본값은 둘 다 3600초다.
- **문제**: 기본값 그대로면 한 시간 동안 조작이 없을 때 로그인이 풀린다. 리프레시 수명이 길어지면 프론트의 세션 표시(`localStorage`)가 Safari에서 7일 뒤 지워지는 영향도 다시 봐야 한다.
- **답이 없으면**: 3600초로 보고 만든다.
- **소스 확인(@432cce4, 2026-10-26)**: 기본값은 env `JWT_ACCESS_EXP`·`JWT_REFRESH_EXP`(없으면 3600, `application-common.yml`). 운영 값은 env(SSM)로만 정해져 저장소로 알 수 없다 — 질문 유지. dev `cb8d24e`(#872)도 수명 기본값은 그대로다.

### B3. 티켓 계좌의 은행명을 목록(코드값)으로 바꿀 수 있나? — **해결(#804·#813)**

- **확인한 것**: 지금은 자유 입력 30자다.
- **문제**: 관객의 "토스로 송금" 버튼은 은행명을 정해진 값으로 넣어야 열린다. 자유 입력이면 링크를 만들 수 없는 경우가 생긴다.
- ~~답이 없으면: 프론트 폼에서만 은행 목록으로 고르게 하고, 서버에는 지금처럼 문자열로 보낸다.~~
- **답**: 요청 계좌(10/T-2·T-3 `account`, 11/O-4·O-5 `refundAccount`)에 선택 필드 `bankCode`(금융결제원 3자리)가 생겼다. 있으면 우선하고 `bankName`은 서버가 표시 이름으로 채운다. 모르는 코드는 400. 응답 계좌에도 `bankCode`(서버 추정, 실패 `null`). 은행 목록 `GET /api/v2/banks`(25개, 비로그인 공개 — #813)(`V2TicketItemRequest`·`V2OrderRequests`·`V2BankController`·`BankCode` @432cce4). 저장은 여전히 표시 이름 문자열이다(PR #804 본문). **토스 링크의 은행 값으로 바꾸는 매핑은 서버에 없다 — 프론트 몫**(PR 본문). 그래서 "저장된 자유 입력 값은 토스 버튼을 숨긴다"는 `bankCode`가 `null`인 계좌로 좁혀진다(P7, 실기기 확인은 그대로).

### B4. #758에서 일반 멤버에게 입금자명도 가리나? — **해결(#846): 가린다**

- **확인한 것**: #758은 일반 멤버에게 연락처·이메일을 가린다.
- **영향**: 예매자 관리 주문 목록의 한 열이다. 입금 확인은 입금자명으로 하므로, 가리면 일반 멤버는 승인을 도울 수 없다.
- ~~답이 없으면: 가리지 않는다고 보고, 응답에 값이 없으면 "—"로 그린다.~~
- **답**: 가린다. 일반 멤버에게 주문·발급 티켓의 구매자 연락처·이메일·입금자명이 가린 값(`김*수` 형식)으로 오고, 연락처·입금자명 검색은 완전 일치만 된다. 이름·입장 상태는 원문(`V2OperationMapper` @432cce4 주석 "#822, #758 M-1"). 일반 멤버는 원래 승인 권한이 없으므로(M+) 승인 흐름 영향은 없다. 화면은 받은 값을 그대로 그린다(P13a).

### B5. #758·#776 머지 시점과 마이그레이션(V001~V011)의 staging·prod 실행 일정은? — **부분 해결**

- **영향**: 프론트 통합 테스트를 시작할 시점과 컷오버 순서가 여기에 달려 있다. 스테이징에 v2 프론트를 처음 올리는 일(P4b)도 마이그레이션이 실행돼 있어야 의미가 있다.
- **확인한 것(2026-10-25)**
  - #758·#776은 PR이 아니라 **열린 이슈**다. #758은 M-1(일반 멤버 가림·엑셀 M+)이 #846으로 들어갔고 L-1(인가 스위치 제거)·L-3(400 → 404 통일)이 남았다. #776의 플래그 3개는 @432cce4 기본값이 모두 false다(백엔드 Develop 기획서: v1 프론트 Front #338 A·B단계 배포 뒤 켬).
  - 마이그레이션 파일은 @432cce4에 V001~V017, V019가 있다. V018은 열린 PR #839(호스트 사업자 정보)에만 있다.
  - Deploy 릴리스 PR 체크리스트: #52(2026-10-10 머지) "스테이징·운영 DB에 DDL(V001~V011) 실행", #57(2026-10-24) V012, #66(2026-10-25) "V016을 운영에 실행. 나머지 V012~V015·V017은 이미 적용", #68(2026-10-25) V016·V019 스테이징·운영. 백엔드 Develop 기획서도 "V012~V017, V019 운영 적용 완료"라고 적는다.
  - 각 마이그레이션 파일의 실행 기록 헤더는 V014만 채워져 있어, 실행 사실은 위 체크리스트·기획서 문장 근거까지만이다.
- **남은 것**: 없음(질문으로는 닫는다). V018은 #839 머지 때 확인한다.
- **소스 확인(@432cce4, 2026-10-26)**: dev `cb8d24e`에 V020(#877, 이메일 발송 이력 — 백엔드 전용, FE 영향 없음)이 생겼다. V018은 여전히 열린 PR #839에만 있다.

### B6. 인증 경로에서는 잘못된 액세스 쿠키를 익명으로 처리하거나 지워 줄 수 있나? — **해결(#792·#793)**

- **답**: 요청대로 구현됐다. `JwtTokenFilter`가 파싱 실패(만료·위조)를 익명으로 넘기고, 인증이 필요한 경로에서만 `TokenAuthenticationEntryPoint`가 401(만료 `AUTH_401_1`, 위조 `GLOBAL_401_1`)을 낸다. 위조 토큰이 쿠키로 왔으면 `accessToken` 삭제 `Set-Cookie`를 붙인다(@432cce4). 재발급·OAuth·로그아웃·공개 GET은 `permitAll`이라 그대로 통과한다. 로그아웃은 언제나 200 + 쿠키 삭제이고 리프레시 토큰으로 서버 세션도 정리한다(#793). 아래 "답이 없으면"의 FE 대비(재발급 401 재시도, 로그인 401 → "잠시 후 다시")는 원인이 없어져 **FE 분기 제거(2026-10-25)** — 재발급 401은 다른 4xx와 같이 세션 상실, 로그인·콜백 401은 일반 실패다(implementation-log "백엔드 변경으로 생긴 코드 수정 거리" #10). mock도 백엔드처럼 위조 쿠키를 보호 경로에서만 401 `GLOBAL_401_1` + 쿠키 삭제로 흉내 낸다(#11).

- **확인한 것(24aa595 기준 — 아래는 질문 당시 기록)**: `JwtTokenFilter`는 경로와 상관없이 토큰이 있으면 먼저 파싱한다. 재발급·로그아웃·OAuth가 `permitAll`이어도 필터 단계에서 만료면 401 `AUTH_401_1`, 서명이 다르면 401 `GLOBAL_401_1`을 내고 컨트롤러까지 가지 않는다. 테스트(`TokenCookieCorsIntegrationTest`)는 유효한 액세스 쿠키로만 확인한다.
- **문제**
  - 쿠키 Max-Age가 JWT 만료보다 조금 늦게 끝나는 짧은 구간에는, 리프레시 토큰이 살아 있어도 재발급이 401이다.
  - 서명 키가 다른 액세스 쿠키가 남으면(로컬에서 dev ↔ staging 전환, 운영 키 교체) 쿠키가 만료될 때까지 재발급·로그인·로그아웃이 모두 막힌다. 로그아웃도 401이라 쿠키를 지우지 못한다. #776으로 HttpOnly가 되면 프론트도 지울 수 없다.
- **요청**: `/api/v1/auth/token/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/oauth/**`에서는 토큰 파싱 실패를 익명으로 처리하거나, 401과 함께 액세스 쿠키를 지워 달라.
- **답이 없으면**(질문 당시 계획 — 2026-10-25 제거됨): 프론트는 재발급이 `AUTH_401_1`·`GLOBAL_401_1`이면 잠깐 뒤 한 번 더 시도하고, 그래도 실패하면 로그아웃으로 처리한다. 로그아웃은 응답과 상관없이 프론트에서 정리한다. 로그인 화면에서 401이 나면 "잠시 후 다시 시도해 주세요"를 띄운다. 서명 키가 다른 쿠키는 프론트로 풀 방법이 없다.

### B7. P3 계약 이식에서 나온 확인 사항

백엔드 dev `24aa595`(2026-10-10) 코드와 운영 공개 GET 응답으로 스키마를 만들며 생긴 질문이다. 답이 없어도 프론트는 괄호 안처럼 처리한다.

- GP-5의 `payType`과 `options[].type`이 nullable(`V2TicketPayType?`, `V2TicketOptionType?`)인데 실제로 null이 올 수 있나? (null 허용으로 받는다) → **소스 확인(@432cce4, 2026-10-26)** **부분**: 도메인 컬럼이 null일 때만 null이고 enum 값은 모두 대응된다(`V2TicketTypes.kt`). 실제 null 행이 있는지는 운영 데이터라 null 허용을 유지한다
- `dDay`가 GH-14 응답에만 있고 GP-1·GP-2·GP-3에는 없다. 공연 카드·상세의 D-day 칩은 `startAt`으로 프론트가 계산해도 되나? (KST 기준으로 프론트가 계산한다) → **소스 확인(@432cce4, 2026-10-26)** **규칙 확인**: `V2EventDisplayRule.dDayOf` — `displayStatus=UPCOMING`일 때만, 시각을 뺀 날짜 차이, 당일 0, JVM 시간대 KST(`Dockerfile` `-Duser.timezone=Asia/Seoul`). 프론트도 같은 규칙으로 계산한다. 덧붙여 GH-14·GE-1·GE-3·GD-1·GM-5에는 있다(design-requests Q29)
- GH-14 `status`와 GH-3·GM-1 `myRole`이 enum이 아니라 `String`이다. 값 목록이 설명과 같다고 봐도 되나? (모르는 값은 UNKNOWN으로 받는다) → **소스 확인(@432cce4, 2026-10-26)** **해결**: 모두 enum 이름 그대로다. GH-14 `status`는 비멤버에게 OPEN·CALCULATING·CLOSED, 멤버에게는 PREPARING까지(`V2ReadHostEventsUseCase`). `myRole`은 MASTER·MANAGER·GUEST(GH-3은 비멤버 null)
- 경로의 숫자 id 자리에 숫자가 아닌 값이 오면 400 `GLOBAL_400_1`인가 404인가? (mock은 400으로 가정) → **소스 확인(@432cce4, 2026-10-26)** **해결 — 둘 다 아니다**: 로그인 상태면 400 `code: "BAD_REQUEST"`(Spring TypeMismatch → `GlobalExceptionHandler.handleExceptionInternal`, 백엔드 테스트 `InputLogHardeningWebTest`). 비로그인으로 공개 GET을 부르면 `V2_PUBLIC_GET_PATHS`가 숫자 id만 허용해 401 `AUTH_401_2`. **덧붙여 `GLOBAL_400_1`은 백엔드 어디서도 내지 않는다** — Bean Validation 실패도 400 `BAD_REQUEST`이고 `reason`은 필드→메시지 JSON 문자열이다(`handleMethodArgumentNotValid`). 프론트 코드 수정 거리(implementation-log 2026-10-26 절)
- GP-2 `tagIds`를 여러 개 보낼 때 같은 분류는 OR, 분류끼리는 AND가 맞나? (쉼표로 이어 보낸다) → **소스 확인(@432cce4, 2026-10-26)** **해결**: 맞다(`V2EventBrowseDomainService.tagFilterGroups`). 중복 id는 합치고, 없는 id는 400 `Event_400_23`. 쉼표·반복 키 둘 다 된다
- 업로드 URL 발급 제한 `throttle.presigned-url-per-minute`의 운영 값이 30인가? (문서값 30으로 안내한다) → **소스 확인(@432cce4, 2026-10-26)**: 기본값 30(env `PRESIGNED_URL_RATE_LIMIT`). 운영 덮어쓰기는 저장소로 알 수 없다 — 질문 유지

### B8. P4b-L 카카오 로그인 구현에서 나온 것 — **부분 해결**

- 카카오 앱의 이메일·이름 동의 항목이 필수인가? 선택이면 비어 올 수 있어 가입 폼에서 직접 받는다(지금 그렇게 했다). → **소스 확인(@432cce4, 2026-10-26)**: 서버는 비어 올 수 있다고 보고 처리한다(`KakaoInformationResponse` nullable, 이름은 없으면 닉네임). 가입 본문 `email`·`name`은 `@NotEmpty`. 콘솔 필수 여부만 남았다(질문 유지)
- 카카오 콘솔에 `https://staging.dudoong.com/kakao/callback`과 `http://localhost:3000/kakao/callback`이 등록돼 있나? → **소스 확인(@432cce4, 2026-10-26)**: 서버 허용 목록(`KakaoRedirectPolicy`, staging 프로필)에는 둘 다 있다. 카카오 콘솔 등록 여부만 남았다(질문 유지)
- 이용약관·개인정보 동의를 서버가 기록하나? `RegisterRequest`에는 `marketingAgree`만 있다. → **답(#840·#850)**: 가입 본문에 `ageOver14Confirmed`·`termsAgreed`·`agreementVersion`(선택, `true`일 때만 기록)이 생겼다(`RegisterRequest` @432cce4). 개인정보 처리방침은 동의 종류(`AgreementType`)에 없어 기록하지 않는다(v1 운영·백엔드 Develop 기획서는 처리방침을 체크가 아닌 안내로 둔다 — 참고. v2 가입 계획은 그대로, design-requests Q25). 동의 강제가 켜지면 만 14세·이용약관이 필수(400 `Agreement_400_1`) — v2 계획에 만 14세 칸이 없어 design-requests Q42.
- 사소한 버그: `KakaoKauthErrorCode.KOE010`의 errorCode가 `KAKAO_KOE101`로 중복돼 있다. (**소스 확인(@432cce4, 2026-10-26)**: 그대로다, dev `cb8d24e`도 같다)
- ~~B6(낡은 액세스 쿠키로 링크 발급·콜백이 401)이 로그인 화면에서 실제로 막는다.~~ → **해소(#792)**: `/oauth/**`는 낡은 쿠키가 있어도 익명으로 통과한다.

### B9. P8-L 티켓탭·선물에서 나온 것

- T-2를 열 때 승인 알림 읽음 처리가 비동기라, 직후 T-3이 아직 `hasNew: true`일 수 있다. 프론트는 열자마자 T-3을 한 번만 무효화한다. 읽음 처리를 T-2 트랜잭션 안에서 끝내 줄 수 있나, 아니면 프론트가 짧게 한 번 더 읽어야 하나? → **소스 확인(@432cce4, 2026-10-26)** **부분**: 일부러 비동기다 — T-2 커밋 뒤 알림 전용 풀에서 읽음 처리한다(`V2GiftNotificationEventHandler.handleOrderTicketViewed` `@Async` + `AFTER_COMMIT`, 주석 "읽음 처리 실패는 조회에 영향 없음"). 직후 T-3이 true일 수 있는 것은 설계다. 동기화 요청 여부만 남았다

### B10. 끝난 공연의 티켓이 티켓탭(T-1)에서 빠지나? "티켓 정리" 알림이 있나? — **해결(소스 확인 @432cce4, 2026-10-26)**

> 빠지지 않는다. T-1은 끝난 공연·취소 티켓도 포함해 종료 전(임박순) → 지난 공연(최근순)으로 준다(`V2MyTicketUseCase`, 페이지 없음, 승인 대기·거절 주문 포함). "티켓 정리" 알림 타입은 없다(`NotificationType` 17종). 와이어 코멘트대로 하려면 서버 변경이 필요하다 — design-requests Q40.

- **출처**: 와이어프레임 코멘트 Tomato 2026-10-24(`696:17261`, 미해결) — 공연이 끝나면 티켓탭에서 티켓이 사라지고, 알림함에 "00공연 티켓이 정리됐다, 지난 공연은 주문내역·아카이빙에서" 알림이 온다([`figma-structure.md`](./figma-structure.md) 2026-10-25 절, [`design-requests.md`](./design-requests.md) Q40).
- **확인할 것**: G11/T-1이 끝난 공연(어느 표시 상태부터)의 티켓을 빼는지, 그런 알림 타입이 서버 알림 타입(`NotificationType`)에 있는지.
- **상태**: 백엔드 최신 코드를 조사하는 작업이 따로 진행 중이다. 그 결과를 보고 질문으로 올릴지 정한다. 그 전까지 프론트는 T-1 응답 그대로 그린다.
- **2026-10-25 조사 결과(일부)**: 알림 타입은 17종이 됐지만(#810 — `EVENT_REMINDER_D1`·`EVENT_STARTING_SOON` 추가) "티켓 정리" 알림 타입은 없다(`NotificationType.kt` @432cce4). T-1이 끝난 공연의 티켓을 빼는지는 이번 조사(24aa595 이후 PR) 범위 밖이라 **미확인**이다.

### B11(후보 — 디자인 답 대기). 판매 중단 티켓을 GP-5에 포함할 수 있나?

- **출처**: 와이어프레임 코멘트 Nemin 2026-10-03(`503:25595`) — 판매 중단 티켓은 관객에게 딤드로 보인다(design-requests Q33).
- **확인한 것**: GP-5는 판매 중단 티켓을 빼고 준다([`patterns.md`](./patterns.md) §15). **소스 확인(@432cce4, 2026-10-26)**: 판매 중단에 더해 판매 기간 밖(시작 전·종료 후) 티켓도 뺀다(`V2PublicTicketItemMapper.onSaleItems` — `isOnSale(now)`). 매진은 `isSoldOut`으로 남는다.
- **상태**: Q33에서 딤드로 정해지면 질문한다. 그 전까지 프론트는 서버대로 보이지 않는다.

### B12. 운영자가 승인 대기 주문을 취소하면 관객 O-3의 `refuseReasonType`은 `null`인가? (#828) — **해결(소스 확인 @432cce4, 2026-10-26)**

> `null`이다. `V2AdminOrderDomainService.cancel`은 승인 대기면 `refuseByHost`만 부르고 사유 종류를 기록하지 않는다 → CANCELED + `approvedAt` null이라 `V2OrderStatus.of`가 **REFUSED**로 준다. `refuseReasonType: null`, `refuseReason` = 운영자 문구(빈 값이면 null). 유료 v2 두둥 주문이고 계좌가 없으면 `refundAccountRequired: true`(입금 미확인과 달리 계좌 입력을 유도한다). 프론트 처리(아래 "답이 없으면")와 맞다.

- **확인한 것**: 운영 어드민 취소는 승인 대기 주문을 `refuseByHost`로 거절 전이시키는데, PR #828 diff에서 이 경로는 `recordRefuseReasonType`을 부르지 않는다. 그러면 사유 종류 없는 거절이 된다.
- **영향**: 관객 주문 상세의 거절 사유 표시, `DEPOSIT_UNCONFIRMED` 여부에 달린 환불 계좌 입력 유도(api-contract §6 취소·환불).
- **답이 없으면**: 스키마가 이미 nullable이라 깨지지 않는다(`src/api/order/schema.ts`). `null`이면 사유 없이 "주문이 거절됐어요"로 그리고 `refundAccountRequired`를 그대로 따른다.

### B13. 입금 전(승인 대기) 유료 두둥티켓 주문을 관객이 취소해도 호스트에게 "환불해 주세요" 메일이 가나? (#836)

- **확인한 것**: 메일 조건은 `isDudoongTicketOrder && isRefund`이고, 사용자 취소(`Order.withdrawByUser`)는 승인 여부와 상관없이 `orderStatus = REFUND`로 둔다(@432cce4 `Order.kt`). v2 사용자 취소(O-4)는 승인 대기 주문이면 유료·무료 모두 `withdrawByUser`(REFUND, 유료면 환불 요청), 승인 완료 유료 주문이면 v1 `Order.refund`로 간다(`V2UserOrderDomainService.cancel` @432cce4). 그래서 입금 전(승인 대기) 두둥 주문을 취소해도 메일 조건이 참이 된다.
- **영향**: 호스팅 센터·관객 취소 안내 문구(입금 전 취소인데 호스트에게 환불 요청이 갔다고 오해할 수 있다).
- **답이 없으면**: 화면 문구에 메일 이야기를 넣지 않는다.
- **소스 확인(@432cce4, 2026-10-26)** **동작 확인**: 간다. `DudoongTicketRefundHostEmailHandler`는 유료 승인형(`isDudoongTicketOrder`) + REFUND면 보내고, 승인 대기 취소도 `withdrawByUser`로 REFUND가 된다. 무료는 안 간다. dev `cb8d24e`(#877)는 발송 이력만 더했다. **의도인지만 묻는다**(질문 유지).

### B14. 운영자가 포스터·프로필 이미지를 되돌리면 v2 응답 URL은 `null`인가 기본 이미지 URL인가? (#830) — **해결(소스 확인 @432cce4, 2026-10-26)**

> `null`이다. `AdminResetImageUseCase`·`Event.adminResetPosterImage`가 key를 null로 저장하고 `ImageVo.generateImageUrl`은 key가 없으면 null을 준다. 프론트는 이미 null을 처리한다.

- **확인한 것**: PR 본문은 "v2 '빈 문자열이면 기본 이미지'와 같은 저장값"이라고만 적는다. 응답 매핑은 확인하지 않았다.
- **답이 없으면**: FE는 둘 다 처리한다(이미지 URL은 모두 nullable — `src/api/event/schema.ts`·`src/api/host/schema.ts`). 질문 우선순위 낮음.

### B15(후보 — 사용자 결정 대기). v2 프론트 이미지를 ECR로 올린다면 푸시 권한을 이 저장소에도 열어 줄 수 있나?

- **확인한 것**: 백엔드·v1 프론트·Deploy 저장소는 운영 이미지를 비공개 ECR로 옮겼다(2026-10-24~25). 버전 태그는 덮어쓸 수 없다(`:dev`만 예외). 푸시 권한은 v1 프론트 저장소에만 있고 v2 저장소는 없다.
- **상태**: v2 프론트 이미지 레지스트리(GHCR 계획 유지 / ECR로 변경)는 사용자 결정 대기다([`deploy-plan.md`](./deploy-plan.md) §1). ECR로 정하면 이 질문을 보낸다.

### B16. 작은 것

- `GET /api/v2/banks`의 Swagger summary가 아직 "[T-7] 은행 목록 (로그인, #797)"이다. 실제로는 #813부터 비로그인 공개다(`SecurityConfig.V2_PUBLIC_GET_PATHS` @432cce4). 문구만 고쳐 주면 된다. (소스 확인 2026-10-26: dev `cb8d24e`도 그대로)
- 백엔드 `api/v2/README.md`(91행)는 DTO 검증 실패를 `GLOBAL_400_1`이라고 적지만, 실제 응답은 400 `code: "BAD_REQUEST"`다(`GlobalExceptionHandler`, `GlobalErrorCode.ARGUMENT_NOT_VALID_ERROR`는 던지는 곳이 없다). 문서를 고치거나 코드를 `GLOBAL_400_1`로 맞춰 달라 — 어느 쪽이든 프론트는 둘 다 검증 오류로 처리한다(B7).
- 동의 강제(`agreement.enforce`)를 켜는 날짜가 정해지면 미리 알려 달라. v2는 처음부터 보내지만, v2 화면이 운영에 나가기 전에 켜지는지가 컷오버 체크리스트에 들어간다. (**소스 확인(@432cce4, 2026-10-26)**: env `AGREEMENT_ENFORCE`(기본 false) 재배포로 켠다 — `V017__835_agreement_log.sql` 헤더 "프론트 배포 뒤". 날짜는 없다)
- dev `cb8d24e`(#873, 2026-10-25): 티켓 수정(P10/T-3) 본문에 선택 필드 `refundObligationAgreed`·`agreementVersion`이 생겼다. 무료 → 두둥으로 바꿀 때만 검사·기록하고, 강제가 켜지면 `Agreement_400_1`. P12-L에서 반영한다(api-contract §3).

### B17. 마이페이지 마케팅 수신 토글의 현재 값을 v2에서 어떻게 읽나?

- **확인한 것**: 변경 API는 v1 `PATCH /api/v1/users/me/marketing`이고 본문이 없는 **반전(토글)**이며 응답이 `UserInfoVo`다(`UserController.kt` @432cce4 "마케팅 동의 여부를 토글링 합니다"). v2 GM-1 응답에는 `marketingAgree`가 없다(`src/api/me/schema.ts`, 백엔드 Develop 기획서 F10 "마케팅 수신 설정 토글(v1 화면 반영)"). v1 운영 화면은 v1 `GET /api/v1/users/me`의 `marketingAgree`로 초기값을 그린다(Front #364 `MarketingSetting.tsx`).
- **문제**: 초기값을 모르면 토글을 그릴 수 없고, 반전 API라 두 번 눌리거나 재시도되면 의도와 반대 값이 된다. `PATCH /api/v1/users/me/mail`(`receiveMail`)은 거래 메일까지 끄는 다른 스위치라 섞으면 안 된다(Develop 기획서).
- **요청**: GM-1에 `marketingAgree`를 넣거나, 값을 지정하는 API(`{marketingAgree: true|false}`)를 주면 좋다.
- **소스 확인(@432cce4, 2026-10-26)**: 그대로 없다(`V2MeResponse`에 `marketingAgree` 없음, dev `cb8d24e`도 같다). 질문 유지.
- **답이 없으면**: 초기값은 v1 `GET /api/v1/users/me`로 읽고, 토글은 요청 중 비활성 + 응답 값으로 화면을 맞춘다(재시도하지 않는다).

### B18(보낼 질문). 두둥티켓 승인 대기 주문을 관객이 앱에서 취소할 수 있어야 하나? — **위험: 서버 동작과 안내가 다름**

- **질문**: 두둥티켓 승인 대기(`PENDING_APPROVE`) 주문에서 v2 `canCancel`이 true라 관객이 앱에서 취소할 수 있다. 약관 제27조③과 v1 운영 안내는 "입금 후 승인 전에는 앱에서 취소할 수 없다"고 한다. 서버에서 이 취소를 막을 것인가, 약관·안내 쪽을 바꿀 것인가?
- **근거**: `V2UserOrderDomainService.canCancel`·`cancelBlocker` @432cce4 — `canCancel`은 `cancelBlocker == null`이고, 막는 사유는 카드(PG) 결제 유료 주문·취소 불가 상태·OPEN 아님·시작 뒤·(승인 대기가 아닐 때) 입장·선물 티켓뿐이다. 승인 대기는 상태 검사를 건너뛰고, 두둥은 `orderMethod = APPROVAL`이라 첫 사유에도 걸리지 않는다. 서버는 입금 여부를 모른다. 안내 문구는 legal-copy A-2 ⑤·A-7 ⑤·A-8 ⑤-b(v1 운영). v2 화면은 [주문취소]를 서버 `canCancel`로만 띄운다(patterns §20).
- **답이 없으면**: 서버 `canCancel`대로 그린다(v2 계획 — Q31). 그대로 출시하면 화면 안내와 실제 동작이 어긋난다(legal-copy·plan P9의 "위험" 표시).

### B19. 호스팅 GR-1·GR-2에서 v1으로 만든 주문의 두둥/PG를 어떻게 가르나?

- **확인한 것**: GR-1 행에는 `paymentChannel`·`totalAmount`가 있어 v2 두둥 주문은 상세 재조회 없이 판정할 수 있다(`V2OrderResponses.kt` @432cce4). v1에서 만든 주문은 `paymentChannel`이 `null`이라 v1 PG 주문과 v1 두둥 주문을 이 필드로 가를 수 없다. 두둥 주문 거절·취소 확인에 "직접 환불" 안내를 붙이려면 필요하다(v1 운영 Front #350은 상세의 `orderMethod`로 판정, legal-copy C-3·C-4).
- **답이 없으면**: `paymentChannel`이 두둥 값이거나, `null`이고 `totalAmount > 0`이면 안내를 붙인다(빠뜨리는 쪽보다 더 붙는 쪽).
- **소스 확인(@432cce4, 2026-10-26)** **부분 해결**: 승인 대기 주문은 `Order.createApproveOrder`(승인형)로만 생기므로 **거절(승인 대기) 확인은 `totalAmount > 0`이면 두둥**이다. 승인 완료 주문 취소에서는 v1 APPROVED(두둥)와 CONFIRM(PG)이 `APPROVED` 하나로 합쳐지고 GR-1·GR-2에 `orderMethod`가 없어 가를 수 없다 — 질문은 취소에만 남는다.


### B20. P10a-L 공연준비 홈·호스트 만들기에서 나온 것 — **해결(소스 확인 @432cce4, 2026-10-26)**

> 백엔드 저장소 `432cce4` 소스로 아래 질문에 모두 답이 나왔다. 보낼 필요 없다. 원래 질문은 기록으로 남긴다.
>
> - **필드**: `V2MyHostResponse`(hostId·name·profileImageUrl·myRole·eventCount)·`V2MyEventResponse`(eventId·hostId·hostName·myRole·name·posterImageUrl·startAt·endAt·placeName·placeAddress·placeDetailAddress·status·displayStatus·dDay)·`V2CreateHostRequest`·`V2CreateHostResponse{hostId}`가 프론트 스키마와 같다.
> - **GH-1 정렬**: 호스트 id 큰 순(`queryPageHostsByActiveUserId` `hostIdDesc`) — 방금 만든 호스트가 첫 페이지 맨 앞.
> - **`HOST_400_16`**: `V2HostDomainService.validateContacts` — 연락처 0개·11개 이상, 공백뿐인 값, 길이 초과(PHONE 15·그 밖 200, 앞뒤 공백 지운 뒤). 형식(숫자·이메일·URL) 검사는 없고 어느 줄인지 알려 주지 않는다 → 프론트 처리(연락처 영역 전체 오류)를 그대로 둔다.
> - **공백**: 이름 `@NotBlank` + `trim()`, 연락처 값 `@NotBlank` + `trim()`, 소개는 `ifBlank { null }`(앞뒤 공백은 지우지 않는다).
> - `keyword` 50자(`V2Paging.KEYWORD_MAX_LENGTH`), 카드형 기본 크기 10·상한 50.

- **필드 출처**: GH-1 `V2MyHostResponse`·GE-1 `V2MyEventResponse`·PH-2 `V2CreateHostRequest`/`V2CreateHostResponse`는 백엔드 소스(@432cce4)가 아니라 통합 기획서(2026-10-10) API 레퍼런스 H-1·E-1·H-2로 옮겼다(소스를 로컬에 받아 두지 않았다). `432cce4`에서 이 네 DTO가 바뀌었는지 확인해 달라(`src/api/host/schema.ts`·`src/api/event/schema.ts`).
- **GH-1 정렬**: 레퍼런스에 정렬 규칙이 없다(GE-1은 "최신 생성 순"). 어떤 순서로 주나? 방금 만든 호스트가 첫 페이지에 오나? — **답이 없으면**: 서버 순서 그대로 그린다. 만든 뒤에는 GH-1을 다시 읽으므로 어느 순서든 목록에는 나온다.
- **`HOST_400_16`(연락처 형식) 조건**: 어떤 값이 형식 오류인가(전화 숫자만? 이메일 형식? URL?)와 여러 줄 중 어느 줄인지 알 수 있나? — **답이 없으면**: 프론트는 길이(값 200자, 전화 15자)와 빈 값만 미리 막고, 이 코드가 오면 연락처 영역 전체에 "연락처 형식을 확인해 주세요"를 보인다.
- **이름·연락처 공백**: 서버가 이름·연락처 값의 앞뒤 공백을 지우나, 공백만인 이름을 막나(`@NotBlank`)? — **답이 없으면**: 프론트가 앞뒤 공백을 지워 보내고 빈 값은 보내지 않는다.

---

## 지켜보는 것

결정을 요청하는 것은 아니지만, 바뀌면 프론트 화면이 달라진다. 변경되면 알려 주면 좋다.

| 항목 | 프론트에 주는 영향 |
|---|---|
| 기획서의 "기본안"(변경 가능) 항목 — 입금자명 닉네임 고정, 받은 티켓 재선물 불가, 공연 검색 범위 등 | 바뀌면 체크아웃·선물·검색 화면 규칙이 바뀐다 |
| #758(열린 이슈) — M-1(엑셀 매니저 이상, 일반 멤버 연락처·이메일·입금자명 가림)은 #846으로 반영됨. **남은 것**: L-1 인가 스위치(`ableHostRoleAop`) 제거, L-3 PQ-5 `IssuedTicket_400_1`·10/O-5 다른 공연 `optionId` 400 → 404 (백엔드 Develop 기획서) | L-3이 오면 그 두 에러 처리를 404로 바꾼다(error-codes, patterns §24) |
| #763(dev 반영됨) — Origin 검사는 `/api`는 기록만 한다(report-only, `auth.origin-check.enforce` 기본 false). `/internal-api/`는 #847부터 항상 막는다. OAuth `state`는 불일치만 거절하고 빈 값은 허용 | 같은 출처 요청이라 정상 흐름에는 영향이 없다. 로컬 프론트는 3000번 포트여야 허용 목록에 든다. v2 FE는 `/internal-api`를 부르지 않는다 |
| #776(열린 이슈) — Origin 검사 켜기, 토큰 쿠키 HttpOnly, `state` 필수. @432cce4 기본값은 셋 다 false. v1 프론트(Front #338) A·B단계 배포 뒤 켠다(백엔드 Develop 기획서) | **v2 FE는 이미 대응돼 있다**(2026-10-25 코드 확인 — `state` 전달, 카카오 토큰 본문, 재발급은 리프레시 쿠키, `document.cookie` 미사용. api-contract §7). `state`가 필수가 되면 로그인 링크를 연 지 10분이 지나 돌아온 사용자는 로그인을 다시 시작해야 한다(안내 문구를 둔다) |
| #839(열린 PR, 예정) — 호스트 사업자 정보 `businessInfo`(GP-3·GH-3), V018. #846과 같은 공개 상세 유스케이스를 고쳐 rebase가 필요해 보인다 | 머지 뒤 공연 상세·호스트 홈 표시(P5b·P5c), 쓰기는 v1 `PATCH /api/v1/hosts/{hostId}/profile`. 머지 때 공개 상세 연락처 가림이 유지되는지 확인 |
| 동의 강제 `agreement.enforce`(지금 false) — 기록이 쌓인 뒤 후속 PR로 true(백엔드 Develop 기획서) | v2 가입·주문·두둥티켓 생성은 사용자가 체크한 필드만 보낸다(UI 없는 것은 design-requests Q42 대기 — 2026-10-25 지금은 가입 `termsAgreed`만). 강제가 켜지면 Q42 칸이 생기기 전까지 가입·주문이 400이다(plan P4b·P7·P12) |
| 운영자 개입(#826·#828) — 선물 강제 회수(`cancelReason=ADMIN`), v2 주문 대리 승인·거절·취소, 알림 없는 환불 완료, 0원 환불 요청 해제 | 상태가 FE 모르게 바뀔 수 있다 — "400이면 다시 읽기"로 흡수. 선물 취소 사유 목록에 `ADMIN` |
| 호스트별 취소 마감 시각 설정(백로그, 프론트 + 백엔드 — 유료티켓에도 호스트 기준 적용). 근거: 백엔드 Develop 기획서(2026-10-25) 남은 일 | 기획서가 "프론트 + 백엔드" 일로 적었다. 생기면 프론트 취소 화면도 바뀐다. 지금 계획 범위에는 없다 |
| 마케팅 수신 동의·철회 일시 기록과 2년마다 재확인 — 지금은 불린만 있다. 근거: 백엔드 Develop 기획서(2026-10-25) 남은 일 | 백엔드 일. plan P9 마케팅 수신 설정의 "위험(철회 수단)"·B17과 관련. 지금 계획 범위에는 없다 |
| Front #333 "v2 uuid null 처리"(백엔드 Develop 기획서가 "프론트 확인 대기"로 적음) | **근거 찾음(2026-10-26)** — `Gosrock/DuDoong-Front` 이슈 #333(OPEN, "[백엔드 공유] v2 API 변경")이다. 본문에 보낸 선물(SENT) 행·T-2의 `ticketUuid`가 null일 수 있다, G-4·G-6 뒤 uuid 재발급이 있다. "uuid null 처리"가 이것을 가리키는지는 **추정**이다. 프론트 스키마는 `ticketUuid` nullable로 받는다 |

---

## 이미 확인해서 질문하지 않는 것

코드로 확인했고 프론트 문서(`api-contract.md`)에 적었다. 틀렸으면 알려 주면 된다.

- 토큰이 없을 때 보호 API는 HTTP 401 + `AUTH_401_2`(본문 `status`도 401)를 준다. 정지·탈퇴 계정도 같다. (#808 전에는 `AUTH_403_2`·본문 403이었다. `AUTH_403_2`는 이제 역할 부족 403만.)
- 재발급 실패는 HTTP 403 `AUTH_403_1`이고 쿠키를 지우지 않는다. 정지 계정은 `USER_403_1`이다.
- 탈퇴한 사람이 카카오로 다시 들어오면 기존 계정을 찾지 못해 가입 흐름으로 간다.
- 무료 선착순 주문이 확정에 실패하면 응답은 원래 에러이고, `FAILED` 주문은 내 주문 목록에 나오지 않는다.
- 공연 등록(PE-8) 응답은 `{eventId, status, displayStatus}`뿐이다.

---

이 목록은 프론트 계획 문서([`README.md`](./README.md))와 같이 갱신한다.
