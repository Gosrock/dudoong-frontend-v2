import type { MyEvent } from '@/api/event/schema';
import type { MyHost } from '@/api/host/schema';

/**
 * 공연준비 홈(`/hosting`, plan P10a) 규칙 — 탭 · 검색어 · 빈 상태 · 카드 이동 주소.
 * 탭은 [공연] [호스트] 두 개(GUI PC `741:30215` 알약형, 모바일 "공연 | 호스트" 밑줄형). 검색은 상단 하나로 지금 탭의 목록을
 * 찾는다(Figma `공연준비 검색` `531:12572` — 결과 있음·없음이 공연·호스트 각각, 검색 범위 = 내 공연·내 호스트).
 */

export const HOSTING_HOME_TABS = [
  { key: 'events', label: '공연' },
  { key: 'hosts', label: '호스트' },
] as const;
export type HostingHomeTab = (typeof HOSTING_HOME_TABS)[number]['key'];

/** 탭을 남기는 주소 쿼리. 기본 탭(공연)은 주소에 쓰지 않는다 */
export const HOSTING_TAB_PARAM = 'tab';
const DEFAULT_TAB: HostingHomeTab = 'events';

/** 주소 쿼리 → 탭. 모르는 값·없음은 기본 탭(공연) */
export function parseHostingHomeTab(search: URLSearchParams): HostingHomeTab {
  return search.get(HOSTING_TAB_PARAM) === 'hosts' ? 'hosts' : DEFAULT_TAB;
}

/** 탭을 바꾼 주소 쿼리(`?…` 또는 ''). 다른 쿼리는 그대로 둔다 */
export function hostingHomeSearch(tab: HostingHomeTab, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  if (tab === DEFAULT_TAB) params.delete(HOSTING_TAB_PARAM);
  else params.set(HOSTING_TAB_PARAM, tab);
  const next = params.toString();
  return next ? `?${next}` : '';
}

/** 호스트 탭 주소 — 호스트를 만든 뒤 여기로 돌아온다(design-requests Q19 기본안) */
export const HOSTING_HOME_HOSTS_HREF = `/hosting?${HOSTING_TAB_PARAM}=hosts`;

/** GH-1·GE-1 `keyword` 상한(api-contract §1 — 51자는 400). 입력에서 막는다 */
export const HOSTING_KEYWORD_MAX = 50;
/** 입력 뒤 검색어를 적용하기까지 기다리는 시간(공연 리스트 P5a와 같다) */
export const HOSTING_KEYWORD_DEBOUNCE_MS = 300;

export const clampHostingKeyword = (value: string) => value.slice(0, HOSTING_KEYWORD_MAX);

/**
 * 목록이 비었을 때 어떤 빈 상태인지. 검색어가 있으면 "검색 결과 없음"(`531:12572`), 없으면 "등록한 것 없음"
 * (호스트 탭 `37:758` — [새 호스트 만들기]가 있는 빈 상태).
 */
export type HostingEmptyKind = 'none' | 'search';
export const emptyKindOf = (keyword: string): HostingEmptyKind =>
  keyword.trim() ? 'search' : 'none';

/** 호스트 탭 빈 상태 문구(GUI `37:758`) */
export const HOSTS_EMPTY_TITLE = '두둥! 등록한 호스트가 없어요.';

/** 새 호스트 만들기 주소 */
export const NEW_HOST_HREF = '/hosting/new/hosts';

/** 호스트 카드 → 호스트 홈(storyboard F — 설정·멤버 입구가 거기 있다) */
export const myHostHref = (host: Pick<MyHost, 'hostId'>) => `/hosts/${host.hostId}`;

/** 공연 카드 → 공연 관리. `/hosting/events/{id}`는 `redirects()`가 대시보드로 보낸다(호스트 홈 준비중 카드와 같은 주소) */
export const myEventHref = (event: Pick<MyEvent, 'eventId'>) => `/hosting/events/${event.eventId}`;
