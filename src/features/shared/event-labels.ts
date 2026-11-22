import type { TagGroup } from '@/api/event/schema';

/**
 * 공연명이 없을 때 쓰는 대체 문구(코드 패턴 점검 A37, 2026-11-02). 화면마다 문자열을 직접 쓰지 않는다.
 * - 공연 상세 공유·OG 제목은 따로 "두둥 공연"(`event/model/event-summary` `UNTITLED_EVENT`) — 밖으로 나가는 문구라 서비스 이름을 붙인다
 * - 공연홈 · 공연 리스트 카드 · 호스팅(공연준비 홈 · 공연 사이드바 · 대시보드) · 호스트 홈도 이 상수(묶음 ④ ⑤ — 관객·호스팅이 같이 쓰려고 `features/shared`)
 */

/** 이름이 없는 오래된 공연(`name: null`) */
export const UNNAMED_EVENT = '이름 없는 공연';

/** 공연이 지워져 응답의 `event`가 null인 주문·티켓 */
export const DELETED_EVENT = '삭제된 공연';

/**
 * 태그 분류 이름 — 서버 GE-11 `category`별(GUI 태그 패널 `324:3237` · 기본 정보 태그 묶음 `1590:832`, Design Sync #316 · #317).
 * 관객 공연 리스트 태그 패널과 호스팅 기본 정보가 같이 쓴다. 모르는 분류는 "기타"
 */
export const TAG_CATEGORY_LABEL: Record<TagGroup['category'], string> = {
  EVENT_TYPE: '공연구분',
  GENRE: '장르',
  AREA: '장소',
  TEAM: '팀',
  UNKNOWN: '기타',
};
