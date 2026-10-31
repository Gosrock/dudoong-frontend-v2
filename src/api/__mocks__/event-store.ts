import type { EventManage, EventSection } from '../event/schema';
import { formatKstDateTime } from '../shared/date';
import { events, type MockEvent, preparingEvents } from './fixtures/event';
import { MOCK_IMAGE_ORIGIN } from './respond';
import { hasStoredTickets } from './ticket-store';

/**
 * 공연 관리(P11) mock 저장소. PE-2(만들기)·PE-4(기본 정보)·PE-6(섹션)·PE-8(등록)·DE-9(삭제)가 바꾸고,
 * GE-3·GE-7·GE-5·GP-3·GP-5·GE-1(공연준비 홈)이 읽는다 — 저장·등록 뒤 공연 상세를 열면 바로 반영된다(plan P11).
 * 티켓·옵션은 P12 티켓 저장소(`ticket-store.ts`)에 있다 — GP-5와 체크리스트 ③은 그쪽을 읽는다.
 * 처음 값은 공연 fixture(`fixtures/event.ts`의 공개 공연 + 준비중 공연)의 복사본이다. vitest·e2e는 `resetEventStore()`
 * (`resetHostingStore()`가 함께 부른다)로 되돌린다.
 */

/** fixture 모양 + 관리 화면에만 있는 값 */
export type StoredEvent = MockEvent & {
  posterImageKey: string | null;
  openedAt: string | null;
  /**
   * 유효 티켓이 있는 것으로 **강제로** 본다(P11 시나리오 도우미 `setStoredValidTicket`). 실제 판정은 `hasValidTicketOf` —
   * 이 값 또는 티켓 저장소(P12)에 유효 티켓이 있는지. `ticketItems`(공개 fixture 모양)는 GP-5가 쓰지 않는다
   */
  hasValidTicket: boolean;
};

/** PE-2로 만든 공연이 받는 id의 시작값(fixture id와 겹치지 않게) */
export const CREATED_EVENT_ID_START = 7001;

let store = new Map<number, StoredEvent>();
let nextEventId = CREATED_EVENT_ID_START;

const keyOf = (url: string | null) =>
  url?.startsWith(`${MOCK_IMAGE_ORIGIN}/`) ? url.slice(MOCK_IMAGE_ORIGIN.length + 1) : null;

function seed() {
  store = new Map(
    [...events, ...preparingEvents].map((e) => [
      e.eventId,
      {
        ...structuredClone(e),
        posterImageKey: keyOf(e.posterImageUrl),
        // fixture 공연은 모두 2026-10 이전 오픈으로 본다(기록 없음 — design-requests Q43)
        openedAt: null,
        hasValidTicket: false,
      },
    ]),
  );
  nextEventId = CREATED_EVENT_ID_START;
}
seed();

/** 처음 값으로 되돌린다 */
export const resetEventStore = seed;

/** 지운 공연을 뺀 전부 */
export const storedEvents = (): StoredEvent[] =>
  [...store.values()].filter((e) => e.status !== 'DELETED');

/** 지운 공연은 없는 것으로(백엔드 `@SQLRestriction("status != 'DELETED'")`) */
export function storedEvent(eventId: number): StoredEvent | undefined {
  const e = store.get(eventId);
  return e && e.status !== 'DELETED' ? e : undefined;
}

/** 공개 API(GP-3·GP-5·GE-5)가 보는 공연 — 준비중·삭제는 404 */
export function storedPublicEvent(eventId: number): StoredEvent | undefined {
  const e = storedEvent(eventId);
  return e && e.status !== 'PREPARING' ? e : undefined;
}

export function saveStoredEvent(event: StoredEvent) {
  store.set(event.eventId, event);
}

export function createStoredEvent(input: {
  host: StoredEvent['host'];
  name: string;
  startAt: string;
  endAt: string;
  hasTicket: boolean;
}): StoredEvent {
  const eventId = nextEventId++;
  const event: StoredEvent = {
    eventId,
    name: input.name,
    posterImageUrl: null,
    posterImageKey: null,
    startAt: input.startAt,
    endAt: input.endAt,
    runTime: null,
    place: null,
    hasTicket: input.hasTicket,
    tags: [],
    host: input.host,
    contacts: [],
    status: 'PREPARING',
    displayStatus: 'PREPARING',
    dDay: null,
    sections: [],
    ticketItems: [],
    openedAt: null,
    hasValidTicket: false,
  };
  store.set(eventId, event);
  return event;
}

/** 이 공연에 유효 티켓이 있는 것으로 본다(티켓 저장소와 상관없이 — 체크리스트 ③·`Event_400_25` 시나리오) */
export function setStoredValidTicket(eventId: number, hasValidTicket: boolean) {
  const e = store.get(eventId);
  if (e) store.set(eventId, { ...e, hasValidTicket });
}

/** 이 공연의 상태를 바꾼다(정산중·지난 공연 읽기 전용 시나리오) */
export function setStoredStatus(eventId: number, status: StoredEvent['status']) {
  const e = store.get(eventId);
  if (!e) return;
  const displayStatus =
    status === 'PREPARING' ? 'PREPARING' : status === 'OPEN' ? 'UPCOMING' : 'PAST';
  store.set(eventId, { ...e, status, displayStatus });
}

// ─── 규칙(`V2EventDomainService`, 432cce4) ───────────────────

/** 유효(삭제 안 된) 티켓이 있는지(`ticketItemAdaptor.existsValidByEventId`) — 체크리스트 ③과 `Event_400_25` */
export const hasValidTicketOf = (e: StoredEvent) => e.hasValidTicket || hasStoredTickets(e.eventId);

/** 표시 섹션 — 섹션이 없으면 v1 본문 대체도 없다(mock 공연은 v1 본문을 따로 두지 않는다) */
const displaySections = (e: StoredEvent): EventSection[] => e.sections;

/** 체크리스트 ① — 포스터·이름·일정·장소 4필드·문의처 1개 이상 */
function hasBasic(e: StoredEvent) {
  const p = e.place;
  return (
    e.posterImageKey !== null &&
    !!e.name?.trim() &&
    e.startAt !== null &&
    e.endAt !== null &&
    p !== null &&
    p.name !== null &&
    p.address !== null &&
    p.latitude !== null &&
    p.longitude !== null &&
    e.contacts.length > 0
  );
}

/** mock의 "지금" — fixture 기준 시각(2026.10.17 20:00)이 아니라 실제 시각. 등록 가능은 시작 전이어야 한다 */
export const mockNow = () => formatKstDateTime(new Date());

export function checklistOf(e: StoredEvent, now = mockNow()): EventManage['checklist'] {
  const basic = hasBasic(e);
  const detail = displaySections(e).some((s) => !!s.content?.trim());
  const hasValidTicket = hasValidTicketOf(e);
  const filled = basic && detail && (!e.hasTicket || hasValidTicket);
  return {
    isBasicFilled: basic,
    isDetailFilled: detail,
    hasValidTicket,
    ticketRequired: e.hasTicket,
    canOpen: filled && e.status === 'PREPARING' && e.startAt !== null && e.startAt > now,
  };
}

/** 입력 항목 충족(상태·시각 제외 — `EventChecklist.isFilled`) */
export const isChecklistFilled = (e: StoredEvent) => {
  const c = checklistOf(e);
  return c.isBasicFilled && c.isDetailFilled && (!c.ticketRequired || c.hasValidTicket);
};

/** 진행 시간(분) — `yyyy.MM.dd HH:mm` 두 값의 차 */
export function runTimeOf(startAt: string | null, endAt: string | null): number | null {
  if (!startAt || !endAt) return null;
  const toMs = (v: string) => {
    const [d, t] = v.split(' ') as [string, string];
    const [y, m, day] = d.split('.').map(Number) as [number, number, number];
    const [h, min] = t.split(':').map(Number) as [number, number];
    return Date.UTC(y, m - 1, day, h, min);
  };
  return Math.round((toMs(endAt) - toMs(startAt)) / 60_000);
}
