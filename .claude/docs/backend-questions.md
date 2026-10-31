# DuDoong v2 — 백엔드 질문

> **아직 답을 받지 못한 것만 남긴다**(2026-10-29 정리). 답이 나와 문서·코드에 반영한 항목(B1·B3·B4·B5·B6·B10·B12·B14·B20, B7·B8의 해결된 줄, "이미 확인해서 질문하지 않는 것")은 지웠다. 지운 내용과 근거는 `api-contract.md`·`error-codes.md`·`implementation-log.md`에 있고, 원문은 git 기록(`cc3275e`)에 있다.
> 기준: 백엔드 `dev` `432cce4`(2026-10-25) 소스, 일부는 `cb8d24e`까지 확인. 2026-10-31 재확인: dev `d89d4f9`(빌드 도구 업그레이드 #883뿐), Deploy `b5d4d20`(변화 없음) — B2·B7·B8·B9·B11·B13·B16~B19의 근거 소스를 하나씩 다시 봤고 모두 그대로다. 답이 온 항목은 없다. 코드로 알 수 없는 것(의도, 운영 값, 콘솔 설정)과 백엔드가 바꿔 주면 프론트가 단순해지는 것이다.
> **2026-10-31 백엔드 답변(백엔드 2.5.1 — `dev-latest` `78b1b6e7`, #887·#888, 운영·스테이징 배포) 반영**: B2·B7·B9·B13·B15·B17·B19는 답을 받아 지웠고, B8(KOE010 버그)·B16(Swagger·README `BAD_REQUEST`)의 고친 줄도 지웠다. 답과 반영 위치는 `api-contract.md`(토큰 수명·`marketingAgree`·T-3 읽음 동기화·`orderMethod`·승인 전 취소 메일·운영 값)와 `implementation-log.md` "백엔드 답변 반영(2026-10-31)"에 있다(옛 B15 ECR 답: 저장소 `dudoong-front`, 푸시 역할 `dudoong-github-ecr-front-v2` — 신뢰 조건 `main`·`v*` 태그만, 브랜치 수동 실행은 열지 않음. 이미지 워크플로는 2026-10-31 ECR로 다시 썼다 — `deploy-plan.md`). 지운 원문은 git 기록. 남은 것: B8 콘솔 확인, B16 동의 강제 날짜·참고 항목, B18 약관 문구, B21·B22(`78b1b6e7` 소스로 다시 봤고 그대로 — 답 없음), 후보 B11.

각 항목의 "답이 없으면"은 답이 오기 전까지 프론트가 그 방식으로 만든다는 뜻이다. 번호는 다른 문서가 참조하므로 그대로 둔다.

---

## 보낼 질문

### B8. 카카오 콘솔 설정 — 백엔드 확인 중(2026-10-31 답: 콘솔에서 확인하고 있다)

- 카카오 앱의 이메일·이름 동의 항목이 필수인가? 서버는 비어 올 수 있다고 보고 처리하고(`KakaoInformationResponse` nullable), 가입 본문 `email`·`name`은 `@NotEmpty`다. (가입 폼에서 직접 받는다 — 백엔드도 2026-10-31 "폼에서 계속 받아 달라")
- 카카오 콘솔에 `https://staging.dudoong.com/kakao/callback`과 `http://localhost:3000/kakao/callback`이 등록돼 있나? 서버 허용 목록(`KakaoRedirectPolicy`, staging)에는 둘 다 있다.

### B16. 작은 것

- 동의 강제(env `AGREEMENT_ENFORCE`, 기본 false)를 켜는 날짜가 정해지면 미리 알려 달라. 컷오버 체크리스트에 들어간다. (2026-10-31 답: 운영·스테이징 모두 꺼져 있고 날짜는 아직 없다)
- (계약 대조 2026-10-31, 참고) 멤버 일괄 추가(PH-7)가 동시 추가로 unique 위반이 나면 `HOST_400_15` 사유에 **요청한 이메일 전부**를 붙인다(`V2AddHostMembersUseCase` `DataIntegrityViolationException` 분기 @fe423ed4) — 실제로 이미 멤버인 이메일만이 아니다. 프론트는 사유의 이메일을 줄에 맞추므로 이 경우 모든 줄에 "이미 멤버"가 붙는다. 가능하면 겹친 이메일만 알려 달라. (`78b1b6e7`에서도 그대로)
- (계약 대조 2026-10-31, 참고) 백엔드 `api/v2/README.md` M-2 설명("유니코드 공백만인 이름은 `V2UserDomainService`가 400 `USER_400_4`")이 #884 뒤 동작과 다르다. 지금은 `@Pattern`(`\p{javaWhitespace}`)이 먼저라 공백만인 이름은 400 `BAD_REQUEST`이고, `USER_400_4`는 줄바꿈 금지 공백(U+00A0 등)만인 이름에만 온다. 문서만 맞춰 달라. (`78b1b6e7` README 191행도 그대로 — #887은 다른 두 줄만 고쳤다)
- (계약 대조 2026-10-31, 참고) 호스트·공연·옵션 이름의 `@Pattern(".*\\S.*")`(`V2UpdateHostRequest`·`V2UpdateEventBasicRequest`·`V2TicketOptionRequest` @fe423ed4)은 Java `\S`가 전각 공백(U+3000)을 공백으로 보지 않아 통과시킨다. 호스트는 `V2UpdateHostUseCase`의 `trim()`이 그 공백을 지워 **빈 이름이 저장된다**(공연·옵션은 패턴만 확인). 프론트는 보내기 전에 `trim()`으로 막는다 — 다른 경로 대비로 `\p{javaWhitespace}`(마이페이지 이름처럼)나 trim 뒤 검사를 제안. (`78b1b6e7`에서도 그대로)
- (이슈 #8 sitemap, 2026-10-31) GP-2(`GET /api/v2/events`) 항목에 `hostId`와 `updatedAt`을 더해 줄 수 있나? 둘 다 `Event` 엔티티에 이미 있다(`hostId`, `BaseTimeEntity.updatedAt` @`78b1b6e7`). 지금 `V2EventListItemResponse`에는 `hostName`만 있고 공개 호스트 목록 API도 없어서, 프론트 `sitemap.xml`이 호스트 홈 주소를 모으려고 종료 전 공연마다 GP-3을 한 번씩 부른다. 수정일이 없어 `lastModified`도 비워 둔다. 더해 주면 GP-3 호출이 사라지고 `lastModified`를 채운다(`src/api/server/sitemap-source.ts`).

### B18. 두둥티켓 승인 대기 주문 셀프 취소 — 약관·안내 개정 문구 대기 — **위험: 서버 동작과 약관 안내가 다름**

- **답(2026-10-31)**: 서버는 바꾸지 않는다 — 관객은 두둥 승인 대기(`PENDING_APPROVE`) 주문을 앱에서 취소할 수 있고, 프론트는 `canCancel`대로 그린다. 약관 제27조③과 안내 문구(legal-copy A-2 ⑤·A-7 ⑤·A-8 ⑤-b)는 백엔드(운영)가 고친다.
- **남은 것**: 개정 약관 제27조③·안내 문구 원문. 받으면 legal-copy 해당 행과 `agreementVersion`을 바꾼다. 그 전에 출시하면 안내와 동작이 어긋난다.
- 승인 전 취소의 호스트 메일 제목·본문은 "입금됐다면 환불해 주세요"로 바뀌었다(#887, api-contract §6 취소 절 — 옛 B13).

### B22. 가입 전화번호(`phoneNumber`)를 서버에서도 검증할 수 있나? — 프론트는 `010-1234-1234`만 보낸다(사용자 결정 2026-10-31)

- **확인한 것(@fe423ed4)**: v1 `POST /api/v1/auth/oauth/kakao/register`의 `RegisterRequest.phoneNumber`는 검증 없이 `PhoneNumberVo`에 그대로 저장된다. 꺼내서 형식을 바꿀 때(`getNationalFormat`·`getInternationalFormat` — libphonenumber `parse(raw, "KR")`) 해석하지 못하면 `USER_400_2`("유저의 휴대폰 전화번호가 올바르지않습니다")가 그때 난다.
- **프론트가 한 것**: 가입 폼이 숫자만 남겨 `010-XXXX-XXXX`로 하이픈을 넣고, 그 모양이 아니면 제출을 막는다(plan P4b). 다른 클라이언트(v1 프론트·직접 호출)는 여전히 아무 값이나 보낼 수 있다.
- **요청**: 저장 전에 같은 규칙(또는 libphonenumber 해석 가능 여부)으로 검증해 400을 달라. 프론트는 칸 오류로 받는다.
- **답이 없으면**: 프론트 검증만으로 둔다.

### B21. 재발급(`POST /api/v1/auth/token/refresh`)을 IP 요청 제한에서 빼 줄 수 있나?

- **확인한 것**: `ThrottlingWebConfigure`가 `/api/v1/kakao-skill/my-orders`만 빼고 모든 경로에 `ThrottlingInterceptor`를 건다. 유효한 액세스 토큰이 없으면(userId 0) IP 버킷(`ipRateLimiter`, `application.yml` `RATE_LIMIT_OVERDRAFT`·`RATE_LIMIT_REFILL` 기본 분당 60)을 쓰고, 넘치면 429 `GLOBAL_429_1`이다(dev `fe423ed`). 재발급은 액세스 토큰이 만료된 뒤에 부르므로 늘 IP 버킷이다.
- **영향**: 공연장 Wi-Fi(체크인 시간)처럼 한 IP 뒤에 사람이 몰리면 재발급이 429를 받는다. 프론트는 2026-10-31부터 429를 일시 오류로 보고 세션을 지키지만(tech-decisions §4), 그 요청은 실패로 끝나 사용자가 다시 시도해야 한다.
- **요청**: 재발급을 IP 제한에서 빼거나(리프레시 토큰 단위 제한으로 바꾸거나) IP 버킷을 넉넉히 해 달라.
- **답이 없으면**: 지금대로 — 429면 세션 유지 + 원 요청 실패(자동 재시도 없음).

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
| #871(열린 이슈, 2026-10-25) — #776의 쿠키 부분을 더 넓힌 것: HttpOnly, Domain 제거(호스트 전용 쿠키), **리프레시 쿠키 Path를 재발급·로그아웃 엔드포인트로 제한**, CSP Report-Only, 프론트 배포 → 스테이징 → 운영 순 | HttpOnly는 대응돼 있다(#776 행). Path 제한·Domain 제거가 들어가면 재발급·로그아웃 요청 경로와 쿠키 전송을 스테이징에서 확인한다(plan P15 리허설). CSP가 오면 Next 헤더·외부 스크립트(카카오 SDK 등) 허용 목록을 맞춘다 |
| #870(열린 이슈) — 공연에 "두둥티켓 취소·환불 기준" 전용 필드, 변경 이력, 주문 시점 스냅샷. 이슈는 공연 상세·예매·구매자 취소 화면 노출을 프론트 후속 이슈로 나눈다 | 들어오면 기본 정보 폼(P11)에 입력 칸, 공연 상세·체크아웃·취소 화면(P5b·P7·P9)에 표시가 생긴다 |
| #869(열린 이슈) — 공연 종료 6개월 뒤 호스트 화면의 구매자 연락처 마스킹·엑셀 차단(도메인 규칙 + API 응답) | 들어오면 예매자 관리(P13a)에서 지난 공연의 가린 값·엑셀 거부 에러를 처리한다. 에러 코드는 그때 소스로 확인한다 |
| #839(열린 PR) — 호스트 사업자 정보 `businessInfo`(GP-3·GH-3), V018 | 머지 뒤 공연 상세·호스트 홈 표시(P5b·P5c). 공개 상세 연락처 가림이 유지되는지 확인 |
| 동의 강제 `agreement.enforce`(지금 false) | 켜지면 design-requests Q42 칸이 생기기 전까지 가입·주문이 400이다(plan P4b·P7·P12) |
| 운영자 개입(#826·#828) — 선물 강제 회수, 주문 대리 승인·거절·취소 등 | 상태가 FE 모르게 바뀔 수 있다 — "400이면 다시 읽기"로 흡수 |
| 호스트별 취소 마감 시각(백로그, 프론트 + 백엔드) | 생기면 취소 화면이 바뀐다. 지금 범위 밖 |
| 마케팅 수신 동의 일시 기록·2년 재확인(백엔드 일) | plan P9 "위험(철회 수단)"과 관련(값 읽기·지정 API는 B17 답으로 생겼다 — GM-1·PM-2 `marketingAgree`). 지금 범위 밖 |
| 백엔드 #884 — Spring Boot 4.1.2 + Jackson 3 + Hibernate 7(**머지돼 2.5.1로 운영·스테이징에 배포됨**, 2026-10-31) | `pnpm check:contract`로 공개 응답 모양을 다시 확인한다 |
| Deploy #74(열린 이슈) — front·admin을 bridge 네트워크 + `127.0.0.1` 포트 게시로, 컨테이너의 IMDS 접근 차단, nginx `limit_req` | 반영되면 deploy-plan §6 compose·nginx 변경안을 그 구조에 맞춘다 |
| Front #333 "v2 uuid null 처리"(백엔드 Develop 기획서가 "프론트 확인 대기"로 적음) | `Gosrock/DuDoong-Front` #333 본문의 SENT 행·T-2 `ticketUuid` null을 가리키는지는 **추정**이다. 프론트 스키마는 nullable로 받는다 |

---

이 목록은 프론트 계획 문서([`README.md`](./README.md))와 같이 갱신한다.
