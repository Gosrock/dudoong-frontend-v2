import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import {
  setEventCancelScenario,
  setStoredStatus,
  setStoredValidTicket,
} from '../__mocks__/event-store';
import { GUEST_ORDER, guestOrdersOf, storedGuestOrder } from '../__mocks__/guest-store';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import { MOCK_IMAGE_ORIGIN } from '../__mocks__/respond';
import { ApiError } from '../errors';
import { eventTicketItemsQuery } from '../ticket-item/queries';
import { uploadImage } from '../upload';
import {
  cancelEventMutation,
  createEventMutation,
  deleteEventMutation,
  openEventMutation,
  updateEventBasicMutation,
  updateEventSectionsMutation,
} from './mutations';
import {
  eventChecklistQuery,
  eventDetailQuery,
  eventListQuery,
  eventManageQuery,
  eventSectionsManageQuery,
  eventSectionsQuery,
  isEventManageQueryKey,
  myEventsQuery,
} from './queries';
import {
  CreateEventRequestSchema,
  EVENT_CANCEL_REASON_MAX,
  type EventCancelResult,
  EventCancelResultSchema,
  type EventManage,
  EventManageSchema,
  UpdateEventBasicRequestSchema,
  UpdateEventSectionsRequestSchema,
} from './schema';

/**
 * P11 — PE-2 · GE-3 · PE-4 · GE-5 · PE-6 · GE-7 · PE-8 · DE-9 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다).
 * mock은 백엔드 `V2EventController`·유스케이스·`V2EventDomainService`·`EventErrorCode`(432cce4)의 검사 순서·코드를 따른다.
 */

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
  resetHostingStore();
});

const call = <V>(m: { mutationFn?: (v: V, c: never) => Promise<unknown> }, v: V) =>
  m.mutationFn!(v, {} as never);
const get = <T>(q: { queryFn?: unknown }) =>
  (q.queryFn as (c: { signal: AbortSignal }) => Promise<T>)({
    signal: new AbortController().signal,
  });
/** 실패면 [HTTP 상태, code], 성공이면 null */
const codeOf = (p: Promise<unknown>): Promise<[number, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code];
      throw e;
    },
  );

/** 고스락(11, mock 사용자 마스터)의 준비중 공연 */
const PREPARING = 140;
/** 고스락의 등록된(OPEN) 공연 */
const OPEN = 101;
/** 소음공작소(12, mock 사용자 비멤버)의 공연 */
const OTHERS = 102;

async function createEvent(hasTicket = false) {
  const body = {
    hostId: 11,
    name: '새 공연',
    startAt: '2030.05.01 19:00',
    endAt: '2030.05.01 21:00',
    hasTicket,
  };
  expect(CreateEventRequestSchema.safeParse(body).success).toBe(true);
  const { eventId } = (await call(createEventMutation(), body)) as { eventId: number };
  return String(eventId);
}

async function fillBasic(eventId: string) {
  const { key } = await uploadImage({
    target: { kind: 'event', eventId: Number(eventId), purpose: 'POSTER' },
    file: new File([new Uint8Array([1])], 'p.png', { type: 'image/png' }),
  });
  const body = {
    posterImageKey: key,
    place: {
      name: '롤링홀',
      address: '서울 마포구 어울마당로 35',
      latitude: 37.5509,
      longitude: 126.9219,
      detailAddress: '지하 1층',
    },
    contacts: [{ type: 'INSTAGRAM' as const, value: '@band' }],
  };
  expect(UpdateEventBasicRequestSchema.safeParse(body).success).toBe(true);
  return call(updateEventBasicMutation(eventId), body);
}

describe('GE-3 공연 관리 상세 · GE-7 체크리스트', () => {
  it('멤버: 응답이 스키마를 통과하고 myRole·checklist가 온다', async () => {
    const data = await get(eventManageQuery(PREPARING));
    expect(EventManageSchema.parse(data)).toMatchObject({
      eventId: PREPARING,
      myRole: 'MASTER',
      status: 'PREPARING',
      openedAt: null,
      checklist: { isBasicFilled: false, canOpen: false, ticketRequired: true },
    });
    expect(await get(eventChecklistQuery(PREPARING))).toEqual(
      (data as { checklist: unknown }).checklist,
    );
  });

  it('비멤버는 403 HOST_400_2, 없는 공연은 404 Event_404_1', async () => {
    expect(await codeOf(get(eventManageQuery(OTHERS)))).toEqual([403, 'HOST_400_2']);
    expect(await codeOf(get(eventChecklistQuery(OTHERS)))).toEqual([403, 'HOST_400_2']);
    expect(await codeOf(get(eventManageQuery(999999)))).toEqual([404, 'Event_404_1']);
  });

  it('GE-3 키 모양은 P10b 양도 무효화 술어(isEventManageQueryKey)에 맞는다 — 체크리스트·편집용 섹션도 그 아래', () => {
    for (const q of [eventManageQuery(1), eventChecklistQuery(1), eventSectionsManageQuery(1)]) {
      expect(isEventManageQueryKey(q.queryKey)).toBe(true);
    }
    expect(eventManageQuery(1).queryKey).toEqual(['events', '1', 'manage']);
    expect(isEventManageQueryKey(eventSectionsQuery(1).queryKey)).toBe(false);
  });
});

describe('PE-2 간편 공연 만들기', () => {
  it('만든 공연이 준비중으로 GE-3·GE-1에 나온다', async () => {
    const id = await createEvent();
    expect(await get(eventManageQuery(id))).toMatchObject({
      name: '새 공연',
      startAt: '2030.05.01 19:00',
      endAt: '2030.05.01 21:00',
      runTime: 120,
      hasTicket: false,
      status: 'PREPARING',
      checklist: { ticketRequired: false },
    });
    const page = await (
      myEventsQuery({ sort: 'LATEST' }).queryFn as unknown as (c: {
        pageParam: number;
        signal: AbortSignal;
      }) => Promise<{ content: { eventId: number; status: string }[] }>
    )({ pageParam: 0, signal: new AbortController().signal });
    // 최신 생성 순 — 방금 만든 공연이 맨 앞
    expect(page.content[0]).toMatchObject({ eventId: Number(id), status: 'PREPARING' });
  });

  it.each<[string, boolean, number, [number, string]]>([
    ['일반 멤버인 호스트', true, 11, [403, 'HOST_400_1']],
    ['비멤버 호스트', false, 12, [403, 'HOST_400_2']],
  ])('%s에는 만들 수 없다', async (_, asGuest, hostId, expected) => {
    if (asGuest) actAsRole(11, 'GUEST');
    const body = {
      hostId,
      name: '공연',
      startAt: '2030.05.01 19:00',
      endAt: '2030.05.01 21:00',
      hasTicket: true,
    };
    expect(await codeOf(call(createEventMutation(), body))).toEqual(expected);
  });

  it('종료 ≤ 시작은 Event_400_2, 지난 시작은 400 BAD_REQUEST(@Future)', async () => {
    const base = { hostId: 11, name: '공연', hasTicket: true };
    expect(
      await codeOf(
        call(createEventMutation(), {
          ...base,
          startAt: '2030.05.01 19:00',
          endAt: '2030.05.01 19:00',
        }),
      ),
    ).toEqual([400, 'Event_400_2']);
    expect(
      await codeOf(
        call(createEventMutation(), {
          ...base,
          startAt: '2020.05.01 19:00',
          endAt: '2020.05.01 21:00',
        }),
      ),
    ).toEqual([400, 'BAD_REQUEST']);
  });
});

describe('PE-4 기본 정보', () => {
  it('포스터 key·장소 4필드 + 상세주소·문의처를 저장하면 체크리스트 ①이 찬다 — 응답은 GE-3 모양', async () => {
    const id = await createEvent();
    const saved = EventManageSchema.parse(await fillBasic(id));
    expect(saved.posterImageUrl).toMatch(new RegExp(`^${MOCK_IMAGE_ORIGIN}/event/${id}/`));
    expect(saved.place).toEqual({
      name: '롤링홀',
      address: '서울 마포구 어울마당로 35',
      detailAddress: '지하 1층',
      latitude: 37.5509,
      longitude: 126.9219,
    });
    expect(saved.checklist.isBasicFilled).toBe(true);
  });

  it('장소는 통째로 교체 — detailAddress를 빼면 지워진다', async () => {
    const id = await createEvent();
    await fillBasic(id);
    const saved = EventManageSchema.parse(
      await call(updateEventBasicMutation(id), {
        place: { name: '롤링홀', address: '서울 마포구 어울마당로 35', latitude: 1, longitude: 2 },
      }),
    );
    expect(saved.place?.detailAddress).toBeNull();
  });

  it.each([
    ['다른 공연의 포스터 key', { posterImageKey: 'event/1/x.png' }, 'Event_400_22'],
    ['종료 ≤ 시작', { startAt: '2030.05.01 19:00', endAt: '2030.05.01 18:00' }, 'Event_400_2'],
    ['없는 태그', { tagIds: [1, 999] }, 'Event_400_23'],
    ['빈 문의처 값', { contacts: [{ type: 'PHONE', value: ' ' }] }, 'BAD_REQUEST'],
  ])('%s → %s', async (_, body, code) => {
    const id = await createEvent();
    expect(await codeOf(call(updateEventBasicMutation(id), body as never))).toEqual([400, code]);
  });

  it('태그는 중복을 뺀 뒤 10개까지 — 넘으면 Event_400_23(요청 스키마도 막는다)', async () => {
    const id = await createEvent();
    const eleven = { tagIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
    expect(UpdateEventBasicRequestSchema.safeParse(eleven).success).toBe(false);
    expect(await codeOf(call(updateEventBasicMutation(id), eleven))).toEqual([400, 'Event_400_23']);
    const saved = EventManageSchema.parse(
      await call(updateEventBasicMutation(id), { tagIds: [7, 1, 1, 2] }),
    );
    // 분류 순 → 분류 안 순서
    expect(saved.tags.map((t) => t.tagId)).toEqual([1, 2, 7]);
  });

  it('티켓 여부: 등록 후 바꾸면 Event_400_18, 유효 티켓이 있는데 티켓 없음으로 바꾸면 Event_400_25', async () => {
    expect(await codeOf(call(updateEventBasicMutation(OPEN), { hasTicket: false }))).toEqual([
      400,
      'Event_400_18',
    ]);
    setStoredValidTicket(PREPARING, true);
    expect(await codeOf(call(updateEventBasicMutation(PREPARING), { hasTicket: false }))).toEqual([
      400,
      'Event_400_25',
    ]);
    // 같은 값은 허용
    expect(await codeOf(call(updateEventBasicMutation(OPEN), { hasTicket: true }))).toBeNull();
  });

  it('등록된 공연의 시작을 지금 이전으로 옮기면 Event_400_24, 정산중·지난 공연은 Event_400_17', async () => {
    expect(
      await codeOf(
        call(updateEventBasicMutation(OPEN), {
          startAt: '2020.01.01 10:00',
          endAt: '2020.01.01 12:00',
        }),
      ),
    ).toEqual([400, 'Event_400_24']);
    setStoredStatus(PREPARING, 'CALCULATING');
    expect(await codeOf(call(updateEventBasicMutation(PREPARING), { name: '바꿈' }))).toEqual([
      400,
      'Event_400_17',
    ]);
  });

  it('일반 멤버는 403 HOST_400_1', async () => {
    actAsRole(11, 'GUEST');
    expect(await codeOf(call(updateEventBasicMutation(PREPARING), { name: '바꿈' }))).toEqual([
      403,
      'HOST_400_1',
    ]);
  });

  it('저장한 이름·장소가 관객 공연 상세(GP-3)에 바로 나온다', async () => {
    await call(updateEventBasicMutation(OPEN), { name: '이름 바꾼 정기공연' });
    expect(await get(eventDetailQuery(OPEN))).toMatchObject({ name: '이름 바꾼 정기공연' });
  });
});

describe('GE-5 · PE-6 섹션', () => {
  it('준비중 공연의 섹션은 멤버(쿠키)만 — 공개 GE-5는 404', async () => {
    const id = await createEvent();
    expect(await get(eventSectionsManageQuery(id))).toEqual([]);
    expect(await codeOf(get(eventSectionsQuery(id)))).toEqual([404, 'Event_404_1']);
  });

  it('전체 교체: 빠진 섹션은 지워지고 sortOrder 순으로 0부터 다시 매긴다', async () => {
    const before = (await get<{ sectionId: number }[]>(eventSectionsManageQuery(OPEN))).length;
    expect(before).toBe(4);
    const body = {
      sections: [
        { title: '둘째', content: '<p>b</p>', sortOrder: 5 },
        { title: '첫째', content: '<p>a</p>', sortOrder: 1 },
      ],
    };
    expect(UpdateEventSectionsRequestSchema.safeParse(body).success).toBe(true);
    const saved = await call(updateEventSectionsMutation(OPEN), body);
    expect(saved).toMatchObject([
      { title: '첫째', sortOrder: 0, contentFormat: 'HTML' },
      { title: '둘째', sortOrder: 1 },
    ]);
    // 관객 공연 상세에도 바로
    expect(await get(eventSectionsQuery(OPEN))).toMatchObject([
      { title: '첫째' },
      { title: '둘째' },
    ]);
  });

  it.each([
    ['0개', []],
    [
      '11개',
      Array.from({ length: 11 }, (_, i) => ({ title: `t${i}`, content: null, sortOrder: i })),
    ],
    ['제목 21자', [{ title: 'ㄱ'.repeat(21), content: null, sortOrder: 0 }]],
    ['빈 제목', [{ title: '  ', content: null, sortOrder: 0 }]],
    ['본문 20,001자', [{ title: '소개', content: 'a'.repeat(20_001), sortOrder: 0 }]],
  ])('형식 오류(%s) → Event_400_21', async (_, sections) => {
    expect(UpdateEventSectionsRequestSchema.safeParse({ sections }).success).toBe(false);
    expect(await codeOf(call(updateEventSectionsMutation(OPEN), { sections } as never))).toEqual([
      400,
      'Event_400_21',
    ]);
  });
});

describe('PE-8 등록 · DE-9 삭제', () => {
  it('티켓 없음 공연: ① 기본 정보 + ② 섹션을 채우면 canOpen → 등록하면 OPEN, 공개 상세가 열린다', async () => {
    const id = await createEvent(false);
    expect(await codeOf(call(openEventMutation(id), undefined))).toEqual([400, 'Event_400_7']);
    await fillBasic(id);
    await call(updateEventSectionsMutation(id), {
      sections: [{ title: '공연 소개', content: '<p>소개</p>', sortOrder: 0 }],
    });
    expect(await get(eventChecklistQuery(id))).toMatchObject({
      isBasicFilled: true,
      isDetailFilled: true,
      ticketRequired: false,
      hasValidTicket: false,
      canOpen: true,
    });
    expect(await call(openEventMutation(id), undefined)).toEqual({
      eventId: Number(id),
      status: 'OPEN',
      displayStatus: 'UPCOMING',
    });
    expect(await get(eventManageQuery(id))).toMatchObject({ status: 'OPEN' });
    expect(await get(eventDetailQuery(id))).toMatchObject({ name: '새 공연' });
    // 다시 보내면 이미 오픈
    expect(await codeOf(call(openEventMutation(id), undefined))).toEqual([400, 'Event_400_8']);
  });

  it('티켓 있는 공연은 ③ 티켓이 없으면 Event_400_7', async () => {
    const id = await createEvent(true);
    await fillBasic(id);
    await call(updateEventSectionsMutation(id), {
      sections: [{ title: '공연 소개', content: '<p>소개</p>', sortOrder: 0 }],
    });
    expect(await get(eventChecklistQuery(id))).toMatchObject({
      canOpen: false,
      ticketRequired: true,
    });
    expect(await codeOf(call(openEventMutation(id), undefined))).toEqual([400, 'Event_400_7']);
  });

  it('삭제: 준비중 + 매니저 이상만 — 등록된 공연은 Event_400_19, 일반 멤버는 403', async () => {
    expect(await codeOf(call(deleteEventMutation(), OPEN))).toEqual([400, 'Event_400_19']);
    actAsRole(11, 'GUEST');
    expect(await codeOf(call(deleteEventMutation(), PREPARING))).toEqual([403, 'HOST_400_1']);
    actAsRole(11, 'MASTER');
    expect(await call(deleteEventMutation(), PREPARING)).toMatchObject({ status: 'DELETED' });
    expect(await codeOf(get(eventManageQuery(PREPARING)))).toEqual([404, 'Event_404_1']);
  });
});

describe('E-11 공연 취소(Api 2.5.8 — 백엔드 #932)', () => {
  /** 남은 대상 주문(오래된 순 — 서버가 처리하는 순서) */
  const targets = () =>
    guestOrdersOf(OPEN)
      .filter((o) => o.status === 'PENDING_APPROVE' || o.status === 'APPROVED')
      .sort((x, y) => x.seq - y.seq);
  const cancel = (eventId: number, reason: string) =>
    call(cancelEventMutation(eventId), { reason }) as Promise<EventCancelResult>;

  it('마스터 · 시작 전 OPEN: 승인 대기는 거절(기타 "공연 취소: 사유"), 승인은 취소 — 결제 금액이 있으면 환불 요청', async () => {
    const pending = targets().filter((o) => o.status === 'PENDING_APPROVE').length;
    const approved = targets().filter((o) => o.status === 'APPROVED').length;
    expect(pending + approved).toBeGreaterThan(0);
    const r = await cancel(OPEN, '  공연장 사정  ');
    expect(EventCancelResultSchema.parse(r)).toMatchObject({
      eventId: OPEN,
      cancelReason: '공연장 사정',
      refused: pending,
      canceled: approved,
      failed: 0,
      failedOrderUuids: [],
      remaining: 0,
    });
    expect(r.canceledAt).not.toBeNull();
    const refused = storedGuestOrder(GUEST_ORDER.pendingTransfer)!;
    expect(refused).toMatchObject({
      status: 'REFUSED',
      refuseReasonType: 'ETC',
      reasonText: '공연 취소: 공연장 사정',
      canceledBy: 'HOST',
    });
    expect(storedGuestOrder(GUEST_ORDER.approved)).toMatchObject({ status: 'CANCELED' });
    // 상태는 OPEN 그대로, GE-3 · GP-3에 canceledAt · cancelReason
    const manage = await get<EventManage>(eventManageQuery(OPEN));
    expect(manage).toMatchObject({ status: 'OPEN', cancelReason: '공연장 사정' });
    expect(manage.canceledAt).toBe(r.canceledAt);
    expect(await get(eventDetailQuery(OPEN))).toMatchObject({ cancelReason: '공연장 사정' });
  });

  it('멱등: 다시 부르면 사유를 보지 않고 남은 주문만 — 처음 시각 · 사유 그대로', async () => {
    const first = await cancel(OPEN, '처음 사유');
    const again = await cancel(OPEN, '');
    expect(again).toMatchObject({
      canceledAt: first.canceledAt,
      cancelReason: '처음 사유',
      refused: 0,
      canceled: 0,
      remaining: 0,
    });
  });

  it('한 번에 처리하는 상한 · 실패한 주문은 remaining · failed로 남고 다시 부르면 처리된다', async () => {
    const all = targets();
    expect(all.length).toBeGreaterThan(1);
    setEventCancelScenario({ limit: 1, failOnce: [all[0]!.orderUuid] });
    const first = await cancel(OPEN, '사유');
    expect(first).toMatchObject({ failed: 1, failedOrderUuids: [all[0]!.orderUuid] });
    expect(first.remaining).toBe(all.length);
    setEventCancelScenario({ limit: 100 });
    const second = await cancel(OPEN, '사유');
    expect(second.refused + second.canceled).toBe(all.length);
    expect(second).toMatchObject({ failed: 0, remaining: 0 });
  });

  it('검사 순서: 마스터 아님 403 HOST_400_4 → 준비중 Event_400_28 → 지난 공연 Event_400_29 → 사유 Event_400_31', async () => {
    actAsRole(11, 'MANAGER');
    expect(await codeOf(cancel(OPEN, '사유'))).toEqual([403, 'HOST_400_4']);
    actAsRole(11, 'MASTER');
    expect(await codeOf(cancel(PREPARING, '사유'))).toEqual([400, 'Event_400_28']);
    expect(await codeOf(cancel(OPEN, '   '))).toEqual([400, 'Event_400_31']);
    expect(await codeOf(cancel(OPEN, 'a'.repeat(EVENT_CANCEL_REASON_MAX + 1)))).toEqual([
      400,
      'Event_400_31',
    ]);
    setStoredStatus(OPEN, 'CLOSED');
    expect(await codeOf(cancel(OPEN, '사유'))).toEqual([400, 'Event_400_29']);
  });

  it('GE-3 cancelRemainingCount · cancelRetryable(Api 2.5.9 — B44): 취소 전 null, 남은 수 = 응답 remaining, 정산 기록이 생기면 다시 처리 불가', async () => {
    expect(await get(eventManageQuery(OPEN))).toMatchObject({
      cancelRemainingCount: null,
      cancelRetryable: null,
    });
    setEventCancelScenario({ limit: 1 });
    const r = await cancel(OPEN, '사유');
    expect(r.remaining).toBeGreaterThan(0);
    expect(await get(eventManageQuery(OPEN))).toMatchObject({
      cancelRemainingCount: r.remaining,
      cancelRetryable: true,
    });
    setEventCancelScenario({ settled: [OPEN] });
    expect(await get(eventManageQuery(OPEN))).toMatchObject({
      cancelRemainingCount: r.remaining,
      cancelRetryable: false,
    });
    expect(await codeOf(cancel(OPEN, '사유'))).toEqual([400, 'Event_400_29']);
  });

  it('취소된 공연은 GP-5 isPurchasable=false, GP-2 목록에서 빠진다', async () => {
    await cancel(OPEN, '사유');
    const tickets = await get<{ isPurchasable: boolean }[]>(eventTicketItemsQuery(OPEN));
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => !t.isPurchasable)).toBe(true);
    const listFn = eventListQuery({ includePast: true }).queryFn as unknown as (c: {
      pageParam: number;
      signal: AbortSignal;
    }) => Promise<{ content: { eventId: number }[] }>;
    const page = await listFn({ pageParam: 0, signal: new AbortController().signal });
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.map((e) => e.eventId)).not.toContain(OPEN);
  });
});
