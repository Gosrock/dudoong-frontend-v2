/**
 * 관객 화면 주소(코드 패턴 점검 A36, 2026-11-02 — ⑤에서 알림 · 셸 · 호스트 홈 · 호스팅도 쓰게 `features/shared`로). `/events/${id}` 같은 주소를 화면마다 직접 쓰지 않는다.
 * 쿼리가 붙는 주소(체크아웃 `checkoutHref` · 주문 완료 `orderCreatedHref`)는 그 피처의 model에 둔다.
 */

/** 공연 상세 `/events/[eventId]` */
export const eventHref = (eventId: string | number) => `/events/${encodeURIComponent(eventId)}`;

/** 호스트 홈 `/hosts/[hostId]` */
export const hostHref = (hostId: string | number) => `/hosts/${encodeURIComponent(hostId)}`;

/** 주문상세 `/orders/[orderUuid]` */
export const orderHref = (orderUuid: string) => `/orders/${encodeURIComponent(orderUuid)}`;

/**
 * 두둥 고객센터(카카오톡 채널) — 공연홈 푸터 SNS의 세 번째 주소(v1 운영 푸터 `feda26a`, design-requests Q221)와 같은 곳.
 * 공연 취소 "처리 불가" [문의하기](GUI `1912:4037`, Design Sync #332 — 목적지는 Figma에 없어 🤖 Claude 판단 2026-11-22, Q166)
 */
export const SUPPORT_CHANNEL_URL = 'http://pf.kakao.com/_xiaLWxj';
