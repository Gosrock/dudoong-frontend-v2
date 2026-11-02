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
