/**
 * 호스팅 피처 사이에서 같이 쓰는 주소(코드 패턴 점검 A14 — 피처끼리 import하지 않게 여기로).
 * 관객 쪽 주소는 `features/audience/routes.ts`.
 */

/** 공연준비 홈 탭을 남기는 주소 쿼리. 기본 탭(공연)은 주소에 쓰지 않는다 */
export const HOSTING_TAB_PARAM = 'tab';

/** 호스트 탭 주소 — 호스트를 만든 뒤 여기로 돌아온다(design-requests Q19 기본안) */
export const HOSTING_HOME_HOSTS_HREF = `/hosting?${HOSTING_TAB_PARAM}=hosts`;

/** 간편 공연 만들기 주소(P11) */
export const NEW_EVENT_PATH = '/hosting/new/events';
