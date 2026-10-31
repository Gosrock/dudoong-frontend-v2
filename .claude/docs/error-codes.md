# 백엔드 에러 코드

> `Gosrock/DuDoong-Backend` `dev`(`24aa595`, 2026-10-10)의 `*ErrorCode` enum에서 자동 추출했다. 13개 도메인, 200개 코드.
> **2026-10-25 `432cce4` 대조로 손으로 고친 곳**: `AUTH_401_2` 추가·`AUTH_403_2` 의미 변경(#808), `AgreementErrorCode`(#840)·`NoticeErrorCode`(#832) 절 추가. 다시 자동 추출하면 이 표시가 사라지니 그때 이 줄도 고친다.
> **제외 규칙**: 운영 어드민(`/internal-api`) 전용 코드는 v2 화면이 받지 않아 옮기지 않는다 — `ADMIN_400_3`(#803)·`ADMIN_400_4`(#824), `AdminTagErrorCode`(`ADMIN_TAG_*`, #826), `AlimTalkErrorCode`(`ALIMTALK_*`, #842·#854), `Order_400_29`(0원이 아닌 주문의 환불 요청 해제, #828 — 부르는 곳이 운영 어드민뿐), `Notice_400_1`·`Notice_400_2`(공지 작성, #832). 근거는 각 PR의 변경 파일이 `DuDoong-Admin/` 아래이거나 던지는 곳이 운영 어드민 경로뿐인 것.
> v1·v2가 같은 enum을 쓴다. `reason`은 서버가 내려 주는 문장이고, 화면 문구는 `code`로 분기해 FE가 정한다([`api-contract.md`](./api-contract.md) §1).
> HTTP 열은 enum에 적힌 값이다. **v2에서 호스트 권한 실패 코드는 enum이 400이어도 실제 응답은 403이다**(아래 표시).
> **토큰 없음(쿠키 만료 포함)·정지·탈퇴 계정은 HTTP 401 `AUTH_401_2`**(본문 `status`도 401, #808 — 그 전엔 `AUTH_403_2`에 본문 403). `AUTH_403_2`는 역할 부족(HTTP 403)만이다. `AUTH_403_1`(재발급 실패)은 쿠키를 지우지 않는다. 분기는 HTTP 상태로 한다([`api-contract.md`](./api-contract.md) §1).
> **#758 L-3(남은 항목)**: `IssuedTicket_400_1`(PQ-5 같은 공연 남의 티켓)과 10/O-5 다른 공연 `optionId` 400은 나중에 404로 바뀔 수 있다(백엔드 Develop 기획서 2026-10-25). 바뀌면 이 표와 patterns §24를 고친다.

## AdminErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `ADMIN_403_1` | 403 | 어드민 권한이 필요합니다. MANAGER 이상의 역할이 필요합니다. | `ADMIN_FORBIDDEN` |
| `ADMIN_403_2` | 403 | SUPER_ADMIN 권한이 필요합니다. | `ADMIN_SUPER_ADMIN_REQUIRED` |
| `ADMIN_400_2` | 400 | 자기 계정의 상태는 바꿀 수 없습니다. | `ADMIN_CANNOT_CHANGE_OWN_STATUS` |
| `ADMIN_400_1` | 400 | 스테이징 서버 설정이 없습니다. | `STAGING_SERVER_NOT_CONFIGURED` |
| `ADMIN_409_1` | CONFLICT | 스테이징 서버 상태가 바뀌는 중입니다. 잠시 후 다시 시도해 주세요. | `STAGING_SERVER_STATE_CONFLICT` |
| `ADMIN_503_1` | SERVICE_UNAVAILABLE | 스테이징 서버를 제어하지 못했습니다. 권한·네트워크 설정을 확인해 주세요. | `STAGING_SERVER_UNAVAILABLE` |

## GlobalErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `EXAMPLE_404_1` | 404 | 예시를 찾을 수 없는 오류입니다. | `EXAMPLE_NOT_FOUND` |
| `GLOBAL_400_1` | 400 | 검증 오류 | `ARGUMENT_NOT_VALID_ERROR` — **정의만 있고 던지는 곳이 없다(소스 확인 @432cce4, 2026-10-26).** 실제 검증 실패(`@Valid`·파라미터·경로 타입)는 400 `code: "BAD_REQUEST"`로 온다. 본문 검증이면 `reason`이 필드→메시지 JSON 문자열(`{"email":"…"}`), 경로 타입 오류면 `"Bad Request"`다(`GlobalExceptionHandler`). 화면에 `reason`을 그대로 보이지 않는다 |
| `AUTH_401_1` | 401 | 인증 시간이 만료되었습니다. 인증토큰을 재 발급 해주세요 | `TOKEN_EXPIRED` |
| `AUTH_403_1` | 403 | 인증 시간이 만료되었습니다. 재 로그인 해주세요. | `REFRESH_TOKEN_EXPIRED` |
| `AUTH_401_2` | 401 | 알맞은 accessToken을 넣어주세요. | `ACCESS_TOKEN_NOT_EXIST` (#808, 예전 `AUTH_403_2`) |
| `AUTH_403_2` | 403 | 접근 권한이 없습니다. | `ACCESS_DENIED` (#808, 역할 부족만) |
| `AUTH_403_3` | 403 | 허용되지 않은 출처의 요청입니다. | `ORIGIN_NOT_ALLOWED` |
| `AUTH_400_1` | 400 | 로그인 요청이 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요. | `OAUTH_STATE_MISMATCH` |
| `GLOBAL_401_1` | 401 | 잘못된 토큰입니다. 재 로그인 해주세요 | `INVALID_TOKEN` |
| `GLOBAL_500_1` | 500 | 서버 오류. 관리자에게 문의 부탁드립니다. | `INTERNAL_SERVER_ERROR` |
| `FEIGN_400_1` | 400 | Other server bad request | `OTHER_SERVER_BAD_REQUEST` |
| `FEIGN_400_2` | 400 | Other server unauthorized | `OTHER_SERVER_UNAUTHORIZED` |
| `FEIGN_400_3` | 400 | Other server forbidden | `OTHER_SERVER_FORBIDDEN` |
| `FEIGN_400_4` | 400 | Other server expired token | `OTHER_SERVER_EXPIRED_TOKEN` |
| `FEIGN_400_5` | 400 | Other server not found error | `OTHER_SERVER_NOT_FOUND` |
| `FEIGN_400_6` | 400 | Other server internal server error | `OTHER_SERVER_INTERNAL_SERVER_ERROR` |
| `Redisson_500_1` | 500 | can not get redisson lock | `NOT_AVAILABLE_REDISSON_LOCK` |
| `GLOBAL_500_2` | 500 | security context not found | `SECURITY_CONTEXT_NOT_FOUND` |
| `PAYMENTS_INTERNAL_SERVER` | 500 | 관리자에게 연락부탁드려요. | `TOSS_PAYMENTS_UNHANDLED` |
| `AOP_500_1` | 500 | 락의 키값이 잘못 세팅 되었습니다 | `BAD_LOCK_IDENTIFIER` |
| `FILE_400_1` | 400 | 파일 확장자가 잘못 되었습니다. | `BAD_FILE_EXTENSION` |
| `INFRA_500_1` | 500 | 토스페이먼츠 이넘값 관련 매칭 안된 문제입니다. | `TOSS_PAYMENTS_ENUM_NOT_MATCH` |
| `GLOBAL_429_1` | 429 | 과도한 요청을 보내셨습니다. 잠시 기다려 주세요. | `TOO_MANY_REQUEST` |

## CartErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Cart_404_1` | 404 | 장바구니를 찾을 수 없습니다. | `CART_NOT_FOUND` |
| `Cart_400_1` | 400 | 장바구니에 아이템을 담는 정책을 위반하였습니다. | `CART_INVALID_ITEM_KIND_POLICY` |
| `Cart_400_2` | 400 | 옵션을 잘못 응답 하였습니다. | `CART_INVALID_OPTION_ANSWER` |
| `Cart_400_3` | 400 | 장바구니 안에 상품을 찾을 수 없습니다. | `CART_LINE_NOT_FOUND` |
| `Cart_400_4` | 400 | 모든 질문에 답변을 하지 않았습니다. | `CART_NOT_ALL_ANSWER` |

## CommentErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Comment_404_1` | 404 | 응원글을 찾을 수 없습니다. | `COMMENT_NOT_FOUND` |
| `Comment_400_1` | 400 | 응원글과 이벤트가 맞지 않습니다. | `COMMENT_NOT_MATCH_EVENT` |
| `Comment_400_2` | 400 | 이미 삭제된 응원글입니다. | `COMMENT_ALREADY_DELETE` |
| `Comment_404_2` | 404 | 랜덤 응원글을 찾을 수 없습니다. | `RETRIEVE_RANDOM_COMMENT_NOT_FOUND` |

## CouponErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Coupon_400_1` | 400 | 동일한 쿠폰 코드가 이미 존재합니다. | `DUPLICATE_COUPON_CODE` |
| `Coupon_400_2` | 400 | 정률 할인은 100 이하 퍼센트만 할인 가능합니다. | `WRONG_DISCOUNT_AMOUNT` |
| `Coupon_404_1` | 404 | 존재하지 않는 쿠폰 캠페인입니다. | `NOT_FOUND_COUPON_CAMPAIGN` |
| `Coupon_400_4` | 400 | 이미 발급된 쿠폰입니다. | `ALREADY_ISSUED_COUPON` |
| `Coupon_400_5` | 400 | 쿠폰이 모두 소진됐습니다. | `NO_COUPON_STOCK_LEFT` |
| `Coupon_400_6` | 400 | 쿠폰 발급 가능 시각이 아닙니다. | `NOT_COUPON_ISSUING_PERIOD` |
| `Coupon_404_2` | 404 | 존재하지 않는 쿠폰 입니다. | `NOT_FOUND_COUPON` |
| `Coupon_400_7` | 400 | 내 쿠폰이 아닙니다. | `NOT_MY_COUPON` |
| `Coupon_400_8` | 400 | 이미 사용한 쿠폰입니다. | `ALREADY_USED_COUPON` |
| `Coupon_400_9` | 400 | 적용 불가 쿠폰입니다. 결제 금액이 할인 금액보다 작습니다. | `SUPPLY_LESS_THEN_DISCOUNT` |
| `Coupon_400_10` | 400 | 적용 불가 쿠폰입니다. 결제 금액이 최소 결제 금액보다 작습니다. | `SUPPLY_LESS_THEN_MINIMUM` |
| `Coupon_400_11` | 400 | 이미 복구한 쿠폰입니다. | `ALREADY_RECOVERED_COUPON` |

## EventErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Event_404_1` | 404 | 이벤트를 찾을 수 없습니다. | `EVENT_NOT_FOUND` |
| `Event_400_1` | 400 | Host Not Auth Event. | `HOST_NOT_AUTH_EVENT` |
| `Event_400_2` | 400 | 시작 시각은 종료 시각보다 빨라야 합니다. | `EVENT_CANNOT_END_BEFORE_START` |
| `Event_400_3` | 400 | 중복된 URL 표시 이름입니다. | `EVENT_URL_NAME_ALREADY_EXIST` |
| `Event_400_4` | 400 | 오픈된 이벤트 정보는 수정할 수 없습니다. | `CANNOT_MODIFY_OPEN_EVENT` |
| `Event_400_5` | 400 | 아직 오픈되지 않은 이벤트에는 접근할 수 없습니다. | `EVENT_NOT_OPEN` |
| `Event_400_6` | 400 | 이벤트 시작시간이 지나 티켓팅을 할 수 없습니다. | `EVENT_TICKETING_TIME_IS_PASSED` |
| `Event_400_7` | 400 | 이벤트 오픈 조건을 충족하지 않았습니다. | `CANNOT_OPEN_EVENT` |
| `Event_400_8` | 400 | 이미 오픈 중인 이벤트입니다. | `ALREADY_OPEN_STATUS` |
| `Event_400_9` | 400 | 이미 정산중인 이벤트입니다. | `ALREADY_CALCULATING_STATUS` |
| `Event_400_10` | 400 | 이미 닫은 이벤트입니다. | `ALREADY_CLOSE_STATUS` |
| `Event_400_11` | 400 | 이미 준비중인 이벤트입니다. | `ALREADY_PREPARING_STATUS` |
| `Event_400_12` | 400 | 이미 삭제된 이벤트입니다. | `ALREADY_DELETED_STATUS` |
| `Event_400_13` | 400 | 발급 티켓이 있는 이벤트는 삭제할 수 없습니다. | `CANNOT_DELETE_BY_ISSUED_TICKET` |
| `Event_400_14` | 400 | 오픈 상태인 이벤트는 삭제할 수 없습니다. | `CANNOT_DELETE_BY_OPEN_EVENT` |
| `Event_400_15` | 400 | 오픈 예정 시간이 현재 시간보다 빠릅니다. | `OPEN_TIME_EXPIRED` |
| `Event_400_16` | 400 | 허용되지 않는 상태 전이입니다. | `INVALID_EVENT_STATUS_TRANSITION` |
| `Event_400_17` | 400 | 종료된 공연은 수정할 수 없습니다. | `CANNOT_MODIFY_ENDED_EVENT` |
| `Event_400_18` | 400 | 등록된 공연은 티켓 여부를 바꿀 수 없습니다. | `CANNOT_CHANGE_HAS_TICKET` |
| `Event_400_19` | 400 | 준비중인 공연만 삭제할 수 있습니다. | `CANNOT_DELETE_NOT_PREPARING_EVENT` |
| `Event_400_20` | 400 | 문의처 형식이 올바르지 않습니다. | `INVALID_EVENT_CONTACT` |
| `Event_400_21` | 400 | 섹션 형식이 올바르지 않습니다. | `INVALID_EVENT_SECTION` |
| `Event_400_22` | 400 | 이 공연에 업로드한 이미지가 아닙니다. | `INVALID_EVENT_IMAGE_KEY` |
| `Event_400_23` | 400 | 태그가 올바르지 않습니다. | `INVALID_EVENT_TAG` |
| `Event_400_24` | 400 | 등록된 공연의 시작 시각은 현재 이후여야 합니다. | `CANNOT_MOVE_OPEN_EVENT_START_TO_PAST` |
| `Event_400_25` | 400 | 티켓이 있는 공연은 티켓 없음으로 바꿀 수 없습니다. | `CANNOT_DISABLE_TICKET_WITH_TICKETS` |
| `Event_400_26` | 400 | 유효하지 않은 체크인 QR 입니다. | `INVALID_CHECK_IN_TOKEN` |
| `Event_400_27` | 400 | 입장 처리를 할 수 없는 공연 상태입니다. | `CANNOT_CHECK_IN_EVENT_STATUS` |
| `Event_400_8` | 400 | 잘못된 접근입니다. | `USE_OTHER_API` |

## TicketGiftErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Gift_404_1` | 404 | 선물을 찾을 수 없습니다. | `GIFT_NOT_FOUND` |
| `Gift_400_1` | 400 | 선물할 수 없는 티켓입니다. | `GIFT_NOT_GIFTABLE` |
| `Gift_400_2` | 400 | 이미 선물 중인 티켓입니다. | `GIFT_ALREADY_PENDING` |
| `Gift_400_3` | 400 | 이미 처리된 선물입니다. | `GIFT_NOT_PENDING` |
| `Gift_400_4` | 400 | 내가 보낸 선물은 받을 수 없습니다. | `GIFT_OWN_LINK` |
| `Gift_400_5` | 400 | 선물을 받을 수 없는 공연입니다. | `GIFT_EXPIRED` |
| `Gift_400_6` | 400 | 선물을 받을 수 없는 상태입니다. | `GIFT_ORDER_INVALID` |
| `Gift_400_7` | 400 | 반환할 수 없는 티켓입니다. | `GIFT_CANNOT_RETURN` |
| `Gift_400_8` | 400 | 선물받은 티켓이 아닙니다. | `GIFT_NOT_RECEIVED_TICKET` |
| `Gift_400_9` | 400 | 메모는 50자까지 입력할 수 있습니다. | `GIFT_INVALID_MEMO` |

## HostErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `HOST_400_1` | 400 → **v2는 403** | 매니저 권한이 없는 유저입니다. | `NOT_MANAGER_HOST` |
| `HOST_400_2` | 400 → **v2는 403** | 해당 호스트에 대한 접근 권한이 없습니다. | `FORBIDDEN_HOST` |
| `HOST_400_3` | 400 | 이미 가입되어 있는 유저입니다. | `ALREADY_JOINED_HOST` |
| `HOST_400_4` | 400 → **v2는 403** | 마스터 호스트 권한이 없는 유저입니다. | `NOT_MASTER_HOST` |
| `HOST_400_5` | 400 | 마스터 호스트의 권한은 변경할 수 없습니다. | `CANNOT_MODIFY_MASTER_HOST_ROLE` |
| `HOST_400_6` | 400 → **v2는 403** | 아직 초대를 수락하지 않은 유저입니다. | `NOT_ACCEPTED_HOST` |
| `HOST_400_7` | 400 → **v2는 403** | 파트너 호스트만 사용할 수 있는 기능입니다. 제휴 신청을 해주세요. | `NOT_PARTNER_HOST` |
| `HOST_400_8` | 400 | 기존과 동일한 슬랙 url 입니다. | `DUPLICATED_SLACK_URL` |
| `HOST_400_9` | 400 | 유효하지 않은 않은 슬랙 url 입니다. | `INVALID_SLACK_URL` |
| `HOST_400_10` | 400 | 마스터 역할은 지정할 수 없습니다. 마스터 양도를 이용해주세요. | `CANNOT_ASSIGN_MASTER_ROLE` |
| `HOST_400_11` | 400 → **v2는 403** | 매니저는 일반 멤버만 추가·삭제할 수 있습니다. | `MANAGER_CAN_MANAGE_GUEST_ONLY` |
| `HOST_400_12` | 400 | 마스터는 삭제할 수 없습니다. | `CANNOT_REMOVE_MASTER` |
| `HOST_400_13` | 400 | 가입되지 않은 이메일입니다. | `MEMBER_EMAIL_NOT_FOUND` |
| `HOST_400_14` | 400 | 중복된 이메일이 있습니다. | `DUPLICATED_MEMBER_EMAIL` |
| `HOST_400_15` | 400 | 이미 호스트 멤버인 이메일입니다. | `ALREADY_HOST_MEMBER_EMAIL` |
| `HOST_400_16` | 400 | 연락처 형식이 올바르지 않습니다. | `INVALID_HOST_CONTACT` |
| `HOST_400_17` | 400 | 이 호스트에 업로드한 이미지가 아닙니다. | `INVALID_HOST_IMAGE_KEY` |
| `HOST_400_18` | 400 | 같은 이메일로 가입된 계정이 여러 개입니다. | `AMBIGUOUS_MEMBER_EMAIL` |
| `Host_404_1` | 404 | 해당 호스트를 찾을 수 없습니다. | `HOST_NOT_FOUND` |
| `HOST_404_2` | 404 | 가입된 호스트 유저가 아닙니다. | `HOST_USER_NOT_FOUND` |

## IssuedTicketErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `IssuedTicket_404_1` | 404 | 티켓을 찾을 수 없습니다. | `ISSUED_TICKET_NOT_FOUND` |
| `IssuedTicket_400_1` | 400 | IssuedTicket User Not Matched | `ISSUED_TICKET_NOT_MATCHED_USER` |
| `IssuedTicket_400_2` | 400 | 티켓을 취소 할 수 있는 상태가 아닙니다. | `CAN_NOT_CANCEL` |
| `IssuedTicket_400_3` | 400 | 티켓이 입장 취소 할 수 있는 상태가 아닙니다. | `CAN_NOT_CANCEL_ENTRANCE` |
| `IssuedTicket_400_4` | 400 | 티켓이 입장 할 수 있는 상태가 아닙니다. | `CAN_NOT_ENTRANCE` |
| `IssuedTicket_400_5` | 400 | 이미 입장 처리된 티켓입니다. | `ISSUED_TICKET_ALREADY_ENTRANCE` |
| `IssuedTicket_400_6` | 400 | 이 티켓은 해당 이벤트에서 발급된 티켓이 아닙니다. | `ISSUED_TICKET_NOT_MATCHED_EVENT` |
| `IssuedTicket_400_7` | 400 | 엑셀로 내려받을 티켓이 너무 많습니다. 필터로 줄여 주세요. | `EXPORT_TOO_MANY_ISSUED_TICKETS` |
| `IssuedTicket_400_8` | 400 | 선물 대기 중인 티켓입니다. | `ISSUED_TICKET_GIFT_PENDING` |

## OrderErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Order_400_1` | 400 | 본인의 주문이 아닙니다. | `ORDER_NOT_MINE` |
| `Order_400_2` | 400 | 올바르지 않은 주문입니다. | `ORDER_NOT_VALID` |
| `Order_400_3` | 400 | 결제,승인 대기중인 주문이 아닙니다. | `ORDER_NOT_PENDING` |
| `Order_400_4` | 400 | 지원하지 않는 방식의 주문입니다. | `ORDER_NOT_SUPPORTED_METHOD` |
| `Order_400_5` | 400 | 주문을 취소할 수 없는 상태입니다. | `ORDER_CANNOT_CANCEL` |
| `Order_400_6` | 400 | 주문을 환불할 수 없는 상태입니다. | `ORDER_CANNOT_REFUND` |
| `Order_400_7` | 400 | 승인 주문이 아닙니다. | `ORDER_NOT_APPROVAL` |
| `Order_400_8` | 400 | 결제 주문이 아닙니다. | `ORDER_NOT_PAYMENT` |
| `Order_400_9` | 400 | 환불을 할 수 있는 기한을 지났습니다. | `ORDER_NOT_REFUND_DATE` |
| `Order_404_1` | 404 | 주문을 찾을 수 없습니다. | `ORDER_NOT_FOUND` |
| `Order_404_2` | 404 | 주문 라인을 찾을 수 없습니다. | `ORDER_LINE_NOT_FOUND` |
| `Order_400_10` | 400 | 무료 주문이 아닙니다. | `ORDER_NOT_FREE` |
| `Order_400_11` | 400 | 최소 결제금액인 1000원보다 낮은 주문입니다. | `ORDER_LESS_THAN_MINIMUM` |
| `Order_400_12` | 400 | 장바구니에 아이템을 담는 정책을 위반하였습니다. | `ORDER_INVALID_ITEM_KIND_POLICY` |
| `Order_400_13` | 400 | 주문 과정중 아이템의 옵션이 변화했습니다. | `ORDER_OPTION_CHANGED` |
| `Order_400_14` | 400 | 유저가 탈퇴를 했습니다. | `CAN_NOT_DELETED_USER_APPROVE` |
| `Order_400_15` | 400 | 승인 대기중인 주문으로 인해 티켓 최대 구매 가능 횟수를 넘겼습니다.이미 신청한 주문이 승인 될 때까지 기다려주세요. | `APPROVE_WAITING_PURCHASE_LIMIT` |
| `Order_400_16` | 400 | 승인 대기중인 주문을 거절할 수 없는 상태입니다. | `ORDER_CANNOT_REFUSE` |
| `Order_400_17` | 400 | 환불 요청된 주문이 아닙니다. | `ORDER_REFUND_NOT_REQUESTED` |
| `Order_400_18` | 400 | 거절 사유가 올바르지 않습니다. | `INVALID_REFUSE_REASON` |
| `Order_400_19` | 400 | 엑셀로 내려받을 주문이 너무 많습니다. 필터로 줄여 주세요. | `EXPORT_TOO_MANY_ORDERS` |
| `Order_400_20` | 400 | 이 티켓은 앱에서 주문할 수 없습니다. | `V2_UNSUPPORTED_ORDER_TICKET` |
| `Order_400_21` | 400 | 티켓에 맞지 않는 결제 방식입니다. | `V2_INVALID_PAYMENT_METHOD` |
| `Order_400_22` | 400 | 입금자명은 1~20자로 입력해 주세요. | `V2_INVALID_DEPOSITOR_NAME` |
| `Order_400_23` | 400 | 옵션 답변이 올바르지 않습니다. | `V2_INVALID_OPTION_ANSWERS` |
| `Order_400_24` | 400 | 취소할 수 없는 주문입니다. | `V2_ORDER_CANNOT_CANCEL_BY_USER` |
| `Order_400_25` | 400 | 환불 받을 계좌를 입력해 주세요. | `V2_REFUND_ACCOUNT_REQUIRED` |
| `Order_400_26` | 400 | 같은 주문을 처리하고 있습니다. 잠시 후 주문내역을 확인해 주세요. | `V2_DUPLICATE_ORDER_IN_PROGRESS` |
| `Order_400_27` | 400 | 환불 계좌를 입력할 수 없는 주문입니다. | `V2_REFUND_ACCOUNT_NOT_ALLOWED` |
| `Order_400_28` | 400 | 이미 환불이 완료된 주문입니다. | `V2_REFUND_ALREADY_COMPLETED` |

## AgreementErrorCode (#840, 432cce4)

| code | HTTP | reason | enum |
|---|---|---|---|
| `Agreement_400_1` | 400 | 필수 동의 또는 확인이 필요합니다. | `AGREEMENT_REQUIRED` — `agreement.enforce=true`일 때만 난다(지금 기본 false). 가입(`ageOver14Confirmed`·`termsAgreed`), 주문(`hostProvisionAgreed`, 두둥티켓이면 `dudoongTicketNoticeConfirmed`), 두둥티켓 생성(`refundObligationAgreed`) |

## NoticeErrorCode (#832, 432cce4)

| code | HTTP | reason | enum |
|---|---|---|---|
| `Notice_404_1` | 404 | 공지사항을 찾을 수 없습니다. | `NOTICE_NOT_FOUND` — GA-2 숨김·없는 공지 |

## TicketItemErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `Ticket_Item_404_1` | 404 | 티켓 아이템을 찾을 수 없습니다. | `TICKET_ITEM_NOT_FOUND` |
| `Option_404_1` | 404 | 옵션을 찾을 수 없습니다. | `OPTION_NOT_FOUND` |
| `Ticket_Item_400_1` | 400 | 티켓 상품 재고가 부족합니다. ( 승인 대기 또는 앞선 주문으로 인해, 재고가 있어도 주문이 불가할 수 있습니다.) | `TICKET_ITEM_QUANTITY_LACK` |
| `Ticket_Item_400_2` | 400 | 티켓 아이템 재고가 0보다 작을 수 없습니다. | `TICKET_ITEM_QUANTITY_LESS_THAN_ZERO` |
| `Ticket_Item_400_3` | 400 | 설정할 수 없는 티켓 가격입니다. | `INVALID_TICKET_PRICE` |
| `Ticket_Item_400_4` | 400 | 공급량보다 많은 티켓 아이템 재고가 설정되었습니다. | `TICKET_ITEM_QUANTITY_LARGER_THAN_SUPPLY_COUNT` |
| `Option_Group_404_1` | 404 | 옵션그룹을 찾을 수 없습니다. | `OPTION_GROUP_NOT_FOUND` |
| `Option_Group_400_1` | 400 | 해당 이벤트 소속 옵션그룹이 아닙니다. | `INVALID_OPTION_GROUP` |
| `Ticket_Item_400_5` | 400 | 해당 이벤트 소속 티켓상품이 아닙니다. | `INVALID_TICKET_ITEM` |
| `Item_Option_Group_400_1` | 400 | 이미 적용된 옵션입니다. | `DUPLICATED_ITEM_OPTION_GROUP` |
| `Option_400_1` | 400 | 옵션에 대한 답변이 올바르지 않습니다. T/F형일 경우 예 아니요 로 보내주세요. | `OPTION_ANSWER_NOT_CORRECT` |
| `Ticket_Item_400_6` | 400 | 해당 티켓상품 최대 구매 가능 갯수를 넘었습니다. | `TICKET_ITEM_PURCHASE_LIMIT` |
| `Item_Option_Group_400_2` | 400 | 옵션 변경이 불가능한 상태입니다. | `FORBIDDEN_OPTION_CHANGE` |
| `Ticket_Item_400_7` | 400 | 티켓상품 삭제가 불가능한 상태입니다. | `FORBIDDEN_TICKET_ITEM_DELETE` |
| `Option_Group_400_2` | 400 | 옵션그룹 삭제가 불가능한 상태입니다. | `FORBIDDEN_OPTION_GROUP_DELETE` |
| `Ticket_Item_400_8` | 400 | 계좌정보가 필요합니다. | `EMPTY_ACCOUNT_INFO` |
| `Ticket_Item_400_9` | 400 | 잘못된 티켓 승인타입입니다. | `INVALID_TICKET_TYPE` |
| `Ticket_Item_400_3` | 400 | 제휴된 호스트가 아닙니다. | `INVALID_PARTNER` |
| `Item_Option_Group_400_3` | 400 | 적용되지 않은 옵션입니다. | `NOT_APPLIED_ITEM_OPTION_GROUP` |
| `Item_Option_Group_400_4` | 400 | 유료 옵션을 적용할 수 없습니다. | `FORBIDDEN_OPTION_PRICE` |
| `Option_Group_400_3` | 400 | 설정할 수 없는 추가 가격입니다. | `INVALID_OPTION_PRICE` |
| `Ticket_Item_400_10` | 400 | 지금은 판매 중인 티켓이 아닙니다. | `TICKET_ITEM_NOT_ON_SALE` |
| `Ticket_Item_400_11` | 400 | v2 에서는 두둥티켓·무료티켓만 만들거나 수정할 수 있습니다. | `UNSUPPORTED_V2_TICKET_PAY_TYPE` |
| `Ticket_Item_400_12` | 400 | 티켓 없음 공연에는 티켓을 만들 수 없습니다. | `TICKET_DISABLED_EVENT` |
| `Ticket_Item_400_13` | 400 | 판매 기간이 올바르지 않습니다. | `INVALID_TICKET_SALE_PERIOD` |
| `Ticket_Item_400_14` | 400 | 판매된 티켓은 설명·판매기간·재고공개·매수제한·수량 증가만 수정할 수 있습니다. | `FORBIDDEN_SOLD_TICKET_ITEM_CHANGE` |
| `Ticket_Item_400_15` | 400 | 티켓 입력값이 올바르지 않습니다. | `INVALID_TICKET_ITEM_FIELD` |
| `Ticket_Item_400_15` | 400 | 값을 비우려면 null 대신 clear 에 필드 이름을 넣어 주세요 (무제한·제한 없음·등록 즉시·공연 시작까지·설명 없음). | `TICKET_ITEM_NULL_FIELD` |
| `Option_Group_400_4` | 400 | v2 에서는 주관식·네/아니오 옵션만 만들 수 있습니다. | `UNSUPPORTED_V2_OPTION_TYPE` |
| `Option_Group_400_5` | 400 | 판매된 티켓에 붙은 옵션은 이름·설명만 수정할 수 있습니다. | `FORBIDDEN_LOCKED_OPTION_CHANGE` |
| `Option_Group_400_6` | 400 | 옵션 설명은 50자까지 입력할 수 있습니다. | `INVALID_OPTION_DESCRIPTION` |

## UserErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `USER_400_1` | 400 | 이미 회원가입한 유저입니다. | `USER_ALREADY_SIGNUP` |
| `USER_403_1` | 403 | 접근이 제한된 유저입니다. | `USER_FORBIDDEN` |
| `USER_403_2` | 403 | 이미 지워진 유저입니다. | `USER_ALREADY_DELETED` |
| `USER_404_1` | 404 | 유저 정보를 찾을 수 없습니다. | `USER_NOT_FOUND` |
| `USER_400_2` | 400 | 유저의 휴대폰 전화번호가 올바르지않습니다. 두둥 관리자에게 문의주세요 | `USER_PHONE_INVALID` |
| `USER_400_3` | 400 | 유저의 휴대폰 전화번호가 null입니다. | `USER_PHONE_EMPTY` |
| `USER_400_4` | 400 | 이름은 공백만으로 지을 수 없습니다. | `USER_NAME_INVALID` |
| `USER_400_5` | 400 | 본인에게 업로드한 이미지가 아닙니다. | `USER_PROFILE_IMAGE_KEY_INVALID` |
| `USER_400_6` | 400 | 마스터인 호스트가 있어 탈퇴할 수 없습니다. 마스터를 양도한 뒤 탈퇴해 주세요. | `USER_HOST_MASTER_CANNOT_WITHDRAW` |
| `USER_400_7` | 400 | 탈퇴한 계정의 상태는 바꿀 수 없습니다. | `USER_DELETED_STATE_IMMUTABLE` |

## KakaoKauthErrorCode

| code | HTTP | reason | enum |
|---|---|---|---|
| `KAKAO_KOE101` | 400 | invalid_client | `KOE101` |
| `KAKAO_KOE009` | 400 | misconfigured | `KOE009` |
| `KAKAO_KOE010` | 400 | invalid_client | `KOE010` (2026-10-31 백엔드 #887 @c80a3b73 — 전에는 `KAKAO_KOE101`로 중복) |
| `KAKAO_KOE303` | 400 | invalid_grant | `KOE303` |
| `KAKAO_KOE319` | 400 | invalid_grant | `KOE319` |
| `KAKAO_KOE320` | 400 | invalid_grant | `KOE320` |
| `KAKAO_KOE322` | 400 | invalid_grant | `KOE322` |
| `KAKAO_KOE_INVALID_REQUEST` | 400 | invalid_request | `KOE_INVALID_REQUEST` |
| `KAKAO_KOE400` | 400 | invalid_token | `KOE400` |
| `KAKAO_KOE401` | 400 | invalid_token | `KOE401` |
| `KAKAO_KOE402` | 400 | invalid_token | `KOE402` |
| `KAKAO_KOE403` | 400 | invalid_token | `KOE403` |
