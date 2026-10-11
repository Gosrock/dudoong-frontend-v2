# 백엔드 v2 API 계약 요약

> 출처: 백엔드 「두둥 v2 통합 기획서」(2026-10-10, Backend dev `a67e7f25`, #755 컨벤션 통일 이후)와 「두둥 v2 API 안내서」(2026-10-09, #755 **이전**).
> 두 문서가 다르면 통합 기획서를 따른다. **필드 이름·타입의 최종 기준은 Swagger**(`/swagger-ui/index.html` → `v2-전체` · `v2-호스팅센터` · `v2-사용자앱`)다.
> 이 문서는 FE가 매번 원문을 열지 않도록 규약과 색인만 옮긴 것이다. 필드 단위 명세는 옮기지 않았다 — 화면 구현 시 Swagger 또는 통합 기획서의 API 레퍼런스에서 해당 ID를 찾는다.

## 0. 전제

- `/api/v2` 82개(호스팅센터 55 · 사용자앱 27)가 **이미 구현·테스트되어 dev에 머지**돼 있다. FE가 계약을 먼저 동결하고 백엔드가 수용하는 구조가 아니다.
- v1(`/api/v1`)과 같은 서버·같은 테이블을 쓰고 API 계층만 분리돼 있다. v2 스키마 변경 V001~V011은 staging·prod에 아직 실행 전이다.
- **v2에 없는 것**: 인증(로그인·재발급·로그아웃·탈퇴는 v1 그대로), PG 결제, 쿠폰, 공연 Q&A(Talk), 슬랙 웹훅, 제휴, 호스트 삭제, 공연 D-1·1시간 전 알림, 푸시·알림톡.
- 결제는 **계좌송금만**이다. 두둥 티켓(직접 계좌이체 또는 토스 송금, 호스트 승인)과 무료 티켓. 기존 PG 티켓(`PRICE`)은 조회만 된다.

## 1. 공통 규약

### 인증

- 로그인: v1 카카오 OAuth(`/api/v1/auth/oauth/kakao/link` → `/oauth/kakao` → `/oauth/kakao/login`·`/register`).
- 재발급 `POST /api/v1/auth/token/refresh`(본문 `{refreshToken}` 또는 쿠키), 로그아웃 `POST /api/v1/auth/logout`, 탈퇴 `DELETE /api/v1/auth/me`.
- 토큰은 `Authorization: Bearer` 헤더를 먼저 보고, 없으면 액세스 토큰 쿠키를 읽는다.
- 사용자 id는 토큰에서 채운다. 요청에 `userId`를 보내지 않는다.
- 공개(비로그인) GET은 10개뿐이다: GP-1 GP-2 GP-3 GP-5 GE-5 GE-11 GH-3 GH-14 GG-3 SYS-1. 나머지 72개는 비로그인이면 401.
- **공개 GET이라도 만료·잘못된 토큰이 붙으면 401**이다. 공개 화면에서는 토큰 없이 다시 부른다.
- 정지·탈퇴 계정의 토큰은 익명으로 처리된다(보호 경로 401, 공개 경로는 그대로).
- 로그인·재발급 응답이 `Set-Cookie`로 `accessToken`·`refreshToken`을 내려 준다(만료 = 토큰 수명, 액세스 기본 3600초). 리프레시 토큰은 사용자당 하나만 유효하다.
- 쿠키: 운영은 `.dudoong.com`·`SameSite=Strict`, 스테이징은 host-only·`Lax`, 로컬·dev는 `SameSite=None`. 현재 `auth.cookie.http-only=false`이고 프론트 전환(Front #338 B단계) 뒤 HttpOnly로 바뀐다.

### 응답과 에러

- 성공은 **항상 HTTP 200**(생성도 201 아님, 삭제도 204 아님). 본문 `{success: true, status: 200, data, timeStamp}`.
- 예외: 엑셀 GR-6·GI-3은 래퍼 없는 xlsx 파일.
- 변경 응답은 화면을 다시 그릴 값이다. 수정은 수정된 리소스, 목록에서 지우면 남은 목록, 상태 전이는 전이 결과.
- 필드는 항상 키가 있고 값이 없으면 `null`. 그 역할에게 안 보이는 값도 `null`.
- 에러 `{success: false, status, code, reason, timeStamp, path}`. `code` = `{도메인}_{HTTP}_{번호}`(예: `Order_400_24`). 도메인 접두는 대소문자가 섞여 있다(`HOST_`, `USER_`, `Order_`, `Event_`, `Ticket_Item_`, `Option_Group_`, `IssuedTicket_`, `Gift_`).
- `reason`은 보여도 되는 한국어 문장이지만 화면 문구는 `code`로 분기한다.
- **409는 없다.** 중복·이미 처리됨도 400. 형식·길이 검증 실패는 `GLOBAL_400_1`.

### 401 · 403 · 404

| 상태 | 뜻 | FE 처리 |
|---|---|---|
| 401 `AUTH_401_1` | 만료 | 재발급 후 재시도 |
| 401 `GLOBAL_401_1` | 잘못된 토큰 | 재로그인 |
| 403 | 호스트 권한 실패만(멤버 아님·역할 부족). `code`는 `HOST_400_1·2·4·6·7·11` | **HTTP 상태로 분기**, `code`로 사유 구분 |
| 404 | 없는 리소스 + 남의 리소스 + 다른 공연 소속 + 비공개(준비중·삭제) 공연 | 존재를 숨기는 응답이므로 "찾을 수 없어요" |

예외: 체크인 PQ-2는 항상 200 + `result`. PQ-5의 같은 공연 남의 티켓(400 `IssuedTicket_400_1`)과 10/O-5 본문의 다른 공연 `optionId`(400)는 #758에서 정리 예정.

### 페이지네이션

- 쿼리 `page`(0부터) · `size`. 응답 `V2PageResponse{content, page, size, totalElements, totalPages, hasNext}`. **커서 방식이 아니다.**
- 기본 크기: 카드형 목록(GE-1 GH-1 GH-14 GP-2) 10, 그 밖 20. 상한: 일반 50, 운영 표·알림(GR-1 GF-1 GI-1 GN-1) 100.
- GN-1은 Slice라 `totalElements`·`totalPages`가 `null` — `hasNext`로 무한 스크롤.
- 건수가 같이 오는 목록: `{counts, orders|tickets: V2PageResponse}`(GR-1, GI-1), 연도 탭 `{years, events: V2PageResponse}`(GM-5).
- 멤버·티켓 관리·옵션·섹션·태그·판매 중 티켓·내 티켓은 페이지 없이 배열.
- `keyword`는 50자까지(51자는 400). 필터 enum은 `ALL`이 기본값.

### 날짜 · 금액 · 이름

- 날짜는 요청·응답 모두 **`yyyy.MM.dd HH:mm`**(Asia/Seoul, 초 없음).
- 금액은 원 단위 정수. 티켓 가격 `price`, 주문 시점 가격 `unitPrice`, 합계 `*Amount`, 옵션 추가금 `additionalPrice`.
- Boolean: 상태 `is*`, 소유·존재 `has*`, 가능 여부 `can*`, 설정값 `*Required`.
- 계좌는 어디서나 `bankName / accountHolder / accountNumber`(본인 환불 계좌만 `maskedAccountNumber`). 결제 방식은 `paymentChannel`.
- 저장 상태는 `status`, 화면 판정 상태는 `*State`. 공연 `displayStatus`만 예외.
- **같은 이름 다른 뜻**: `remaining` — 사용자 화면(GP-5, G11/O-0) = 재고 − 승인 대기, 호스트 G10/T-1 = 재고(승인 대기는 `pendingApproveCount`).
- 식별자: 호스트가 만드는 리소스는 숫자 id(`eventId`, `hostId`, `ticketItemId`, `optionId`, `giftId`), 주문·발급 티켓은 uuid(`orderUuid`, `ticketUuid` — QR 값), 공유 링크는 토큰(`giftToken`). 사람이 읽는 번호 `orderNo`(R…) · `issuedTicketNo`(T…).

### 메서드 의미

- **PATCH** 부분 수정: `null`(키 없음) = 변경 안 함. 객체·배열 필드는 통째 교체(PE-4 `place`·`contacts`·`tagIds`, PH-4 `contacts`). P10/T-3에서 "값 없음"은 `clear[]`.
- **PUT** 전체 교체·upsert: PE-6 섹션, P10/O-5 옵션 지정, P11/O-5 환불 계좌, PH-13 팔로우. 빠진 항목은 지워진다. 본문은 객체로 감싼다(`{sections}`, `{optionIds}`).
- 같은 전이를 다시 보내면: 부작용 없는 전이는 200(판매 중단·재개, 환불 완료, 알림 읽음, 팔로우), 발급·환불 요청·알림이 따르는 전이는 400(승인·거절·취소·공연 등록·삭제·선물 회수·수락·거절). 400이면 최신 상태를 다시 읽는다.
- 주문 생성 P11/O-1은 10초 안의 같은 요청에 앞 주문을 돌려준다. `Idempotency-Key`는 없다.

### 이미지 업로드

1. 업로드 URL 발급 — 호스트 PH-15 `{purpose: PROFILE|COVER, extension}`, 공연 PE-10 `{purpose: POSTER|SECTION, extension}`, 프로필 PM-3 `{extension}` → `{presignedUrl, key, url}`.
2. `presignedUrl`로 S3에 PUT.
3. 저장 API에 받은 `key`를 그대로 보낸다(PH-4, PE-4, PM-2). `""` = 기본 이미지. 섹션 본문 이미지는 받은 `url`을 HTML에 넣는다.

발급은 **사용자당 분당 30회** 제한이다. 화면에서 반복 호출하지 않는다.

### API ID 표기

ID는 Swagger summary의 화면 ID에 메서드 접두(G/P/D)를 붙인 것이다. `T-`·`O-`는 호스팅(10 문서)과 사용자(11 문서)에서 번호가 겹쳐 `10/T-1`(티켓 관리) · `11/T-1`(내 티켓)처럼 문서 번호를 붙인다.

## 2. 역할과 권한

권한은 호스트 단위다. 같은 사람이 호스트 A에서 마스터, B에서 일반 멤버일 수 있다. 버튼을 숨길 때는 응답의 `myRole`(GH-1 GH-3 GE-1 GE-3)을 쓴다.

| 표기 | 뜻 |
|---|---|
| P | 공개(비로그인 허용) |
| U | 로그인, 본인 리소스만 |
| G+ | 그 호스트의 일반 멤버(`GUEST`) 이상 |
| M+ | 매니저(`MANAGER`) 이상 |
| MS | 마스터(`MASTER`)만 |

| 할 수 있는 일 | 일반 멤버 | 매니저 | 마스터 |
|---|---|---|---|
| 관리 화면 조회(준비중 포함), 멤버·티켓·옵션 목록, 체크리스트 | 읽기 전용 | ✓ | ✓ |
| 대시보드, 주문·발급 티켓·환불 목록과 상세 | ✓ (#758 예정: 연락처·이메일 가림) | ✓ | ✓ |
| 환불 계좌 전체 보기 | — (`null`) | ✓ | ✓ |
| 엑셀 다운로드 | ✓ (#758 예정: 매니저 이상으로) | ✓ | ✓ |
| QR 체크인, 셀프 체크인 QR 띄우기, 체크인 통계 | ✓ | ✓ | ✓ |
| 공연·티켓·옵션 쓰기, 호스트 설정·이미지 | — | ✓ | ✓ |
| 멤버 추가·삭제 | — | 일반 멤버만 | ✓ |
| 주문 승인·거절·승인 후 취소·환불 완료 | — | ✓ | ✓ |
| 역할 변경(일반 ↔ 매니저), 마스터 양도 | — | — | ✓ |
| 호스트 삭제 | 없음 | 없음 | 없음(`DELETE`는 405) |

마스터는 호스트마다 정확히 1명이고 양도하면 기존 마스터는 매니저가 된다. 멤버 추가는 가입된 이메일만, 한 번에 20명까지, **수락 없이 즉시 활성**이다.

## 3. 상태와 enum

| 대상 | 값 |
|---|---|
| 공연 저장 상태 | `PREPARING` → `OPEN` → `CALCULATING` · `CLOSED`, `DELETED`. OPEN → PREPARING은 호스트가 못 한다 |
| 공연 `displayStatus` | `PREPARING` · `UPCOMING`(`dDay` 값 있음, 당일 0) · `ONGOING` · `PAST` |
| 티켓 `payType` | `DUDOONG`(계좌송금, 승인 항상 ON, 계좌 필수) · `FREE`(승인 ON/OFF) · `PRICE`(기존 PG, 조회만) |
| 티켓 `saleState` | `BEFORE_SALE` · `SOLD` · `SUSPENDED` 등. **잠금 판정은 `isSold \|\| hasPendingOrders`** |
| 옵션 `type` | `SUBJECTIVE`(주관식) · `YES_NO`(네·아니오 + 네 추가금 `yesAdditionalPrice`) |
| `paymentChannel` | `BANK_TRANSFER` · `TOSS_TRANSFER` · `FREE` |
| 주문 상태(호스트) | `PENDING_APPROVE` · `APPROVED` · `REFUSED` · `CANCELED` · `FAILED` |
| 주문 상태(사용자) | `PENDING_APPROVE` · `APPROVED` · `REFUSED` · `CANCELED` · `REFUNDED` |
| `refundStatus` | `NONE` · `REQUESTED` · `COMPLETED` |
| 거절 `reasonType` | `DEPOSIT_UNCONFIRMED` · `AMOUNT_MISMATCH` · `SOLD_OUT` · `ETC`(`reasonText` 필수, 20자) |
| 선물 `status` | `PENDING` · `ACCEPTED` · `REJECTED` · `RETURNED` · `CANCELED` |
| 선물 랜딩 `viewState` | `AVAILABLE` · `ALREADY_ACCEPTED` · `REJECTED` · `RETURNED` · `CANCELED` · `OWN_LINK` · `EXPIRED` |
| 내 티켓 `state` | `PENDING_APPROVE` · `REFUSED` · `APPROVED` · `GIFT_PENDING` · `GIFT_EXPIRED` · `GIFT_SENT` · `RECEIVED` · `ENTERED` · `CANCELED` · `REFUND_REQUESTED` · `REFUNDED` |
| 티켓 `giftState` | 내 티켓: `NONE` · `PENDING` · `SENT` · `RECEIVED` / 호스트 발급 티켓: `NONE` · `PENDING` · `ACCEPTED` |
| 입장 `entrance` | `BEFORE` · `DONE`(되돌리는 API 없음) |
| 체크인 `result` | `ENTERED` · `ALREADY_ENTERED` · `OTHER_EVENT` · `CANCELED` · `GIFT_PENDING` · `SELECT_TICKET`(셀프 전용) |
| 연락처 `type` | `PHONE` · `EMAIL` · `INSTAGRAM` · `OPEN_CHAT` · `YOUTUBE` · `ETC` |
| 태그 분류 | `EVENT_TYPE` · `GENRE` · `AREA` · `TEAM` (22종, 시드로만 관리) |
| 섹션 `contentFormat` | `HTML`(v2 에디터) · `MARKDOWN`(v1 이관분) |
| 알림 `target.type` | `HOST` · `ORDER` · `GIFT` |

알림 15종: `HOST_MEMBER_ADDED` / `ORDER_PENDING_APPROVE` · `ORDER_APPROVED` · `ORDER_REFUSED` · `ORDER_REFUND_REQUESTED` · `ORDER_CANCELED_BY_USER` · `ORDER_CANCELED_BY_HOST` · `ORDER_REFUND_COMPLETED` · `REFUND_ACCOUNT_CHANGED` / `GIFT_SENT` · `GIFT_ACCEPTED` · `GIFT_RECEIVED` · `GIFT_REJECTED` · `GIFT_RETURNED` · `GIFT_TICKET_CANCELED`.

## 4. 입력 제한

| 대상 | 제한 |
|---|---|
| 호스트 | 이름 1~15자, 소개글 255자(Figma의 100자는 수정 요청 중), 연락처 1~10개(값 200자, `PHONE`은 15자) |
| 공연 | 이름 1~25자, 종료 > 시작, 장소 `{name, address, latitude, longitude}` 필수 + `detailAddress`(선택, 255자), 섹션 1~10개 |
| 티켓 | 이름 12자, 설명 30자, 가격 0~1,000만 원, 수량 1~999,999 또는 무제한. 계좌의 은행명·예금주는 자유 입력 30자 |
| 옵션 | 이름 20자, 설명 50자. 응답 형식은 만든 뒤 못 바꾼다 |
| 주문 | 입금자명 1~20자, 거절 `reasonText` 20자, 호스트 취소 사유 100자 |
| 선물 메모 | 50자 |
| 닉네임 | 2~7자 |
| 검색어 | 50자 |

## 5. API 색인 (82개, #755 이후 경로)

경로는 모두 `/api/v2` 아래다.

### 호스트·멤버

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| GH-1 | GET `/me/hosts` | U |
| PH-2 | POST `/hosts` | U |
| GH-3 | GET `/hosts/{hostId}` | P |
| PH-4 | PATCH `/hosts/{hostId}` | M+ |
| GH-6 | GET `/hosts/{hostId}/members` | G+ |
| PH-7 | POST `/hosts/{hostId}/members` | M+ |
| PH-10 | PATCH `/hosts/{hostId}/members/{userId}/role` | MS |
| DH-11 | DELETE `/hosts/{hostId}/members/{userId}` | M+ |
| PH-12 | POST `/hosts/{hostId}/transfer-master` | MS |
| PH-13 | PUT · DELETE `/hosts/{hostId}/follow` | U |
| GH-14 | GET `/hosts/{hostId}/events` | P |
| PH-15 | POST `/hosts/{hostId}/images` | M+ |

### 공연 준비

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| GE-1 | GET `/me/events` | U |
| PE-2 | POST `/events` | M+ |
| GE-3 | GET `/events/{eventId}/manage` | G+ |
| PE-4 | PATCH `/events/{eventId}/basic` | M+ |
| GE-5 | GET `/events/{eventId}/sections` | P (준비중은 멤버만) |
| PE-6 | PUT `/events/{eventId}/sections` | M+ |
| GE-7 | GET `/events/{eventId}/checklist` | G+ |
| PE-8 | POST `/events/{eventId}/open` | M+ |
| DE-9 | DELETE `/events/{eventId}` | M+ |
| PE-10 | POST `/events/{eventId}/images` | M+ |
| GE-11 | GET `/tags` | P |

### 티켓 · 옵션 (호스팅, 10 문서)

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| G10/T-1 | GET `/events/{eventId}/ticket-items/manage` | G+ |
| P10/T-2 | POST `/events/{eventId}/ticket-items` | M+ |
| P10/T-3 | PATCH `/events/{eventId}/ticket-items/{ticketItemId}` | M+ |
| D10/T-4 | DELETE `/events/{eventId}/ticket-items/{ticketItemId}` | M+ |
| P10/T-5 · T-6 | POST `…/{ticketItemId}/suspend` · `/resume` | M+ |
| G10/O-1 | GET `/events/{eventId}/options` | G+ |
| P10/O-2 | POST `/events/{eventId}/options` | M+ |
| P10/O-3 | PATCH `/events/{eventId}/options/{optionId}` | M+ |
| D10/O-4 | DELETE `/events/{eventId}/options/{optionId}` | M+ |
| P10/O-5 | PUT `/events/{eventId}/ticket-items/{ticketItemId}/options` | M+ |

### 공연 운영 (대시보드 · 주문 · 환불 · 발급 티켓 · 체크인)

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| GD-1 | GET `/events/{eventId}/dashboard` | G+ |
| GR-1 | GET `/events/{eventId}/orders` | G+ |
| GR-2 | GET `/events/{eventId}/orders/{orderUuid}` | G+ |
| PR-3 · PR-4 · PR-5 | POST `…/orders/{orderUuid}/approve` · `/refuse` · `/cancel` | M+ |
| GR-6 | GET `/events/{eventId}/orders/export` | G+ |
| GF-1 | GET `/events/{eventId}/refunds` | G+ |
| PF-2 | POST `/events/{eventId}/refunds/{orderUuid}/complete` | M+ |
| GI-1 | GET `/events/{eventId}/issued-tickets` | G+ |
| GI-2 | GET `/events/{eventId}/issued-tickets/{ticketUuid}` | G+ |
| GI-3 | GET `/events/{eventId}/issued-tickets/export` | G+ |
| GQ-1 | GET `/events/{eventId}/check-ins/stats` | G+ |
| PQ-2 | POST `/events/{eventId}/check-ins` | G+ |
| GQ-4 | GET `/events/{eventId}/check-in-qr` | G+ |
| PQ-5 | POST `/check-ins/self` | U |

### 공연 탐색 (사용자)

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| GP-1 | GET `/home` | P |
| GP-2 | GET `/events` (`keyword`, `tagIds`, `includePast`, `sort=UPCOMING`) | P |
| GP-3 | GET `/events/{eventId}` | P |
| GP-5 | GET `/events/{eventId}/ticket-items` | P |

### 주문 · 취소 · 환불 계좌 (사용자, 11 문서)

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| G11/O-0 | GET `/events/{eventId}/ticket-items/{ticketItemId}/checkout` | U |
| P11/O-1 | POST `/me/orders` | U |
| G11/O-2 | GET `/me/orders` | U |
| G11/O-3 | GET `/me/orders/{orderUuid}` | U |
| P11/O-4 | POST `/me/orders/{orderUuid}/cancel` | U |
| P11/O-5 | PUT `/me/orders/{orderUuid}/refund-account` | U |

### 티켓탭 · 선물 (사용자)

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| G11/T-1 | GET `/me/tickets` | U |
| G11/T-2 | GET `/me/tickets/{ticketUuid}` | U |
| G11/T-3 | GET `/me/tickets/new-approved` | U |
| PG-1 | POST `/me/tickets/{ticketUuid}/gift` | U |
| DG-2 | DELETE `/me/gifts/{giftId}` | U |
| PG-8 | PATCH `/me/gifts/{giftId}` | U |
| GG-3 | GET `/gifts/{giftToken}` | P |
| PG-4 · PG-5 | POST `/gifts/{giftToken}/accept` · `/reject` | U |
| PG-6 | POST `/me/tickets/{ticketUuid}/return` | U |
| GG-7 | GET `/me/gifts` (`direction=SENT\|RECEIVED`) | U |
| GG-7a | GET `/me/gifts/{giftId}/ticket` | U |

### 마이페이지 · 알림 · 기타

| ID | 메서드 · 경로 | 권한 |
|---|---|---|
| GM-1 | GET `/me` | U |
| PM-2 | PATCH `/me` | U |
| PM-3 | POST `/me/images` | U |
| GM-4 | GET `/me/following-hosts` (`status=ALL\|ACTIVE\|ENDED`) | U |
| GM-5 | GET `/me/archive` (`year`) | U |
| GN-1 | GET `/me/notifications` | U |
| GN-2 | GET `/me/notifications/unread-count` | U |
| PN-3 | POST `/me/notifications/read` (`{notificationIds}` 또는 `{readAll: true}`) | U |
| SYS-1 | GET `/health` | P |

## 6. 플로우별 핵심 규칙

### 공연 (F2 · F4)

- 간편 생성 필드: 호스트, 이름, 시작·종료 일시, 티켓 여부(`hasTicket`). 생성 직후 `PREPARING`.
- 체크리스트(GE-7): ① 기본 정보(포스터·이름·일정·장소·문의처 1개 이상) ② 본문 있는 섹션 1개 이상 ③ 티켓 1개 이상("티켓 없음" 공연은 면제). 셋 다 차면 `canOpen=true`.
- **등록 후에는 `hasTicket`만 잠긴다.** 등록된 공연의 시작 시각은 현재 이후로만 바꿀 수 있고, 정산중·지난 공연은 수정 불가. 삭제는 준비중 공연만.
- 새 공연은 서버에 섹션이 없다. 기본 4탭(공연 소개 · 예매안내 · 세트리스트 · 유의사항)은 **프론트가 그린다**. 첫 섹션 = 공연 소개(v1 본문과 동기화).
- 준비중·삭제 공연은 사용자 API(GP-3, GP-5, G11/O-0)에서 호스트 멤버여도 404다. 멤버는 호스팅 센터 GE-3으로 본다.
- 리스트 검색 = 공연명 OR 호스트명 부분일치. 태그는 같은 분류 OR / 분류끼리 AND.
- 상세의 문의처는 공연 문의처, 없으면 호스트 연락처.

### 티켓 · 옵션 (F3)

- **무제한 + 재고 공개는 불가**(`Ticket_Item_400_15`). Figma 폼 기본값이 이 조합이라 그대로 저장하면 실패한다 — 무제한을 고르면 재고 공개를 끄고 비활성.
- 잠긴 티켓은 설명·판매기간·재고 공개·매수 제한·수량 증가만 수정, 삭제 불가(판매 중단만).
- P10/T-3: 보낸 필드만 바뀐다. 값을 비울 때는 `clear: ["SUPPLY_COUNT" | "PURCHASE_LIMIT" | "SALE_START_AT" | "SALE_END_AT" | "DESCRIPTION"]`. 이 5개 필드에 명시적 `null`을 보내면 400. `payType`을 바꾸면 `price`도 함께 보낸다.
- 옵션은 공연 단위 풀에 있고 티켓에 붙인다. 티켓 폼 칩의 ⊗ = 이 티켓에서 떼기(P10/O-5), 옵션 상세 [삭제] = 옵션 자체 삭제(D10/O-4). 새 옵션은 P10/O-2 생성 + P10/O-5 지정 두 번 호출.
- 무료 티켓에는 유료(추가금) 옵션을 붙일 수 없다.

### 구매 (F5)

- 1주문 1종류. 두둥이 입금을 확인할 수 없으므로 **사용자가 "입금했어요"를 누른 순간이 주문 시점**이고 호스트 승인이 입금 확인이다.
- 계좌·예금주는 주문 전에 G11/O-0(로그인)에서 받는다. 두둥 티켓이고 지금 살 수 있을 때만 값이 있다. **토스 송금 링크는 이 계좌와 총액으로 프론트가 만든다.**
- 입금자명은 현재 닉네임을 보내고 사용자가 고칠 수 없다(기본안).
- **티켓에 붙은 옵션은 전부 필수 응답이다.** 주관식은 1~255자.
- 옵션 본문: `options{applyToAll: true, answers[{optionId, answer}]}` 또는 `applyToAll=false` + `perTicketOptions[[…],[…]]`(티켓 수만큼). 네/아니오 답은 `YES`/`NO`.
- 수량 스테퍼 상한 = `purchaseLimit`. 이미 산 수량은 화면이 모른다 — 넘으면 주문 때 에러.

| 티켓 | 주문 생성 직후 | 그다음 |
|---|---|---|
| 두둥(입금형) | `PENDING_APPROVE` | 승인 → 발급 / 거절 → `REFUSED` + 환불 요청 |
| 무료 승인형 | `PENDING_APPROVE` | 승인 → 발급 / 거절 → `REFUSED`, 환불 요청 없음 |
| 무료 선착순 | 즉시 발급 → `APPROVED` | 확정 실패 시 `FAILED`, 재시도는 새 주문 |

- 호스트 승인(PR-3)이 재고·1인 제한·탈퇴 등으로 실패해도 **주문은 승인 대기로 남는다**. 에러를 안내하고 거절로 이어지게 한다.
- 공연이 시작되면 승인·거절이 모두 막힌다.
- 승인 전에는 티켓번호가 없다.

### 취소 · 환불 (F6)

- 사용자 취소(P11/O-4): 공연 OPEN + 시작 전만. 입장한 티켓, 선물 대기·완료 티켓이 있으면 불가(`Order_400_24`). 유료는 환불 계좌 필수, 무료는 바로 취소.
- 송금은 호스트가 직접 하고 [환불 완료](PF-2)를 누른다.
- 환불 계좌 입력·수정(P11/O-5)은 `refundStatus=REQUESTED` 동안만. 입구는 G11/O-3의 `canEditRefundAccount`로만 띄우고, `refundAccountRequired=true`면 입력을 유도한다.
- 0원 주문의 거절·호스트 취소는 환불 요청을 만들지 않는다.

### 선물 (F7)

- 받는 사람을 고르지 않는 링크 방식. `linkPath = /gifts/{giftToken}`(origin은 프론트가 붙인다).
- 선물 대기 중인 티켓은 어느 경로로도 입장할 수 없고 `qrValue`도 `null`이다.
- **시간 만료 없음.** 공연이 시작돼도 자동으로 돌아오지 않는다. 보낸 사람이 입장하려면 직접 회수(DG-2)해야 한다.
- 수락·반환 때마다 **티켓 uuid가 새 값**이 된다. 옛 uuid로 연 화면은 404, 옛 QR은 `OTHER_EVENT`.
- 거절(PG-5, 수락 전)과 반환(PG-6, 수락 후·공연 시작 전)은 **별개 상태**다.
- 받은 티켓은 다시 선물할 수 없다. 돌아온 티켓은 보낸 사람이 다시 선물할 수 있다.
- 보낸 사람 화면에는 수락 뒤에도 "선물 완료"(`giftState=SENT`, uuid 없음)로 남고 상세는 GG-7a.
- "선물 만료"는 저장 상태가 아니다. `PENDING`인데 받을 수 있는 공연이 아니면 랜딩 `viewState=EXPIRED`, 목록 `isGiftExpired=true`.

### 체크인 (F8)

- 호스트 스캔(PQ-2) `{ticketUuid}` — **QR 값 = 티켓 uuid**(G11/T-2 `qrValue`). 항상 200 + `result`. 체크인 취소는 없다.
- 호스트 스캔은 OPEN·CALCULATING 공연만(그 밖 400 `Event_400_27`). 셀프 체크인은 OPEN만.
- 셀프 체크인 QR(GQ-4): 공연별 고정 토큰. 응답 `qrPath = /check-in?token=…`(origin은 프론트가 붙인다).
- 관객 셀프 체크인(PQ-5) `{token, ticketUuid?}`: 입장 전 티켓이 여러 장이면 `SELECT_TICKET` + `candidates` → 하나를 골라 다시 요청.
- 결과의 `buyerName` = 주문자, `ownerName` = 현재 소유자. **현장 확인은 `ownerName`으로.**

### 운영 (F9)

- 주문 목록 `counts`는 검색어는 반영하고 상태 필터는 무시한 탭 건수. `searchType` = `NAME`(기본) · `PHONE` · `DEPOSITOR_NAME`.
- 주문 상세: 승인 전에는 `issuedTickets`가 빈 배열 → 라인을 "티켓 1, 2…"로 표시.
- 발급 티켓 목록은 취소 티켓 제외, 검색은 현재 소유자 기준.
- 엑셀은 최대 1만 행(넘으면 `Order_400_19` · `IssuedTicket_400_7`).

### 마이페이지 · 알림 (F10 · F11)

- 내 티켓(G11/T-1): 주문 단위 묶음, 공연 임박순, 페이지 없음. `groupKey`는 내 주문 = 주문 uuid, 받은 티켓 = `ticket:{첫 티켓 번호}`(이때 `orderUuid`가 `null` → [주문상세] 없음).
- 공지 바(G11/T-3) 해제는 그 승인 알림을 읽거나 그 주문 티켓을 G11/T-2로 열 때다. 티켓탭 진입만으로는 해제되지 않는다.
- 주문상세에 호스트 연락처가 없어 문의 시트는 GP-3을 다시 부른다.
- 탈퇴는 마스터인 호스트에 다른 활성 멤버나 OPEN·정산중 공연이 있으면 400 `USER_400_6` — "마스터를 양도한 뒤 탈퇴해 주세요".
- 알림은 커밋 후 비동기로 저장돼 API 응답 직후 목록에 바로 없을 수 있다. 호스팅 센터와 사용자 앱이 같은 알림함을 쓴다.
- 벨 빨간 점은 GN-2 `{count}`. PN-3 응답은 `{updatedCount, unreadCount}`.

## 7. 예정된 변경

| 이슈 | 내용 | FE 영향 |
|---|---|---|
| #758 | 엑셀 M+, 일반 멤버에게 구매자 연락처·이메일 가림, 403·404 통일 | 엑셀 버튼을 `myRole`로 숨김, 가려진 값 표시 |
| #776 | Origin 검사 차단, OAuth `state` 필수, 토큰 쿠키 HttpOnly | JS로 토큰 쿠키를 읽지 않는 구조가 전제 |

## 8. API 안내서(10-09)에만 있는 정보

- 테스트: Kotlin 통합 1,773개 통과, 실 MySQL E2E 337개 통과. v2 operation 82개 모두 통합 테스트가 호출한다.
- Figma 전수검사 3차: 서버 미구현 0. 디자인 요청으로 분류된 요소가 다수(디자이너 확인 25건의 근거).
- 테스트 공백: GG-7a E2E 없음, `Event_400_20` · `Order_400_26`은 테스트에서 확인된 적 없음.
