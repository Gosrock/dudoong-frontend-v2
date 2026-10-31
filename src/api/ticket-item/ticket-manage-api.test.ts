import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installLoggedInFetch } from '@/test/login-fetch';

import { setStoredStatus } from '../__mocks__/event-store';
import { events } from '../__mocks__/fixtures/event';
import { resetHostMockState } from '../__mocks__/host.handlers';
import { actAsRole } from '../__mocks__/host-store';
import { resetHostingStore } from '../__mocks__/hosting.handlers';
import {
  setTicketAgreementEnforced,
  setTicketPendingOrders,
  setTicketSold,
} from '../__mocks__/ticket-store';
import { ApiError } from '../errors';
import { createEventMutation } from '../event/mutations';
import { eventChecklistQuery, isEventManageQueryKey } from '../event/queries';
import {
  createOptionMutation,
  deleteOptionMutation,
  updateOptionMutation,
} from '../option/mutations';
import { eventOptionsQuery } from '../option/queries';
import { UpdateOptionRequestSchema } from '../option/schema';
import { AGREEMENT_VERSION } from '../shared/agreement';
import {
  createTicketItemMutation,
  deleteTicketItemMutation,
  replaceTicketOptionsMutation,
  resumeTicketItemMutation,
  suspendTicketItemMutation,
  updateTicketItemMutation,
} from './mutations';
import { eventTicketItemsQuery, ticketItemsManageQuery } from './queries';
import {
  type CreateTicketItemRequest,
  CreateTicketItemRequestSchema,
  type TicketItemManage,
  TicketItemsManageSchema,
  UpdateTicketItemRequestSchema,
} from './schema';

/**
 * P12 — G10/T-1 · P10/T-2~T-6 · G10/O-1 · P10/O-2~O-5 정의 + mock + 스키마가 맞물리는지(실제 `api`·zod 파싱을 탄다).
 * mock은 백엔드 `V2TicketItemController`·`V2TicketOptionController`·유스케이스·`V2TicketItemDomainService`·
 * `V2TicketOptionDomainService`·`TicketItemErrorCode`(432cce4 → dev cb8d24e)의 검사 순서·코드를 따른다.
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
const codeOf = (p: Promise<unknown>): Promise<[number, string] | null> =>
  p.then(
    () => null,
    (e: unknown) => {
      if (e instanceof ApiError) return [e.status, e.code];
      throw e;
    },
  );

/** 고스락(11, mock 사용자 마스터)의 준비중 공연(티켓 있음, 티켓 0개) */
const PREPARING = 140;
/** 고스락의 등록된 공연 — 501(판매됨, 옵션 701·702), 502(매진), 503(무료 무제한) */
const OPEN = 101;

const dudoong = (over: Partial<CreateTicketItemRequest> = {}): CreateTicketItemRequest => ({
  payType: 'DUDOONG',
  name: '일반 예매',
  price: 15000,
  supplyCount: 100,
  account: { bankCode: '088', accountHolder: '고스락', accountNumber: '110-123-456789' },
  approvalRequired: true,
  isQuantityPublic: true,
  ...over,
});
const free = (over: Partial<CreateTicketItemRequest> = {}): CreateTicketItemRequest => ({
  payType: 'FREE',
  name: '초대권',
  price: 0,
  approvalRequired: false,
  isQuantityPublic: false,
  ...over,
});
const list = (eventId: number) => get<TicketItemManage[]>(ticketItemsManageQuery(eventId));
const create = (eventId: number, body: CreateTicketItemRequest) =>
  call(createTicketItemMutation(eventId), body) as Promise<TicketItemManage>;
const update = (eventId: number, ticketItemId: number, body: object) =>
  call(updateTicketItemMutation(eventId), {
    ticketItemId,
    body: body as never,
  }) as Promise<TicketItemManage>;

describe('T-1 목록 · GP-5 투영', () => {
  it('관리 목록은 생성 순 + 잠금 판정 값 — 판매된 티켓(501)은 isSold, 계좌 bankCode는 은행명으로 추정', async () => {
    const items = await list(OPEN);
    expect(TicketItemsManageSchema.parse(items)).toEqual(items);
    expect(items.map((t) => [t.ticketItemId, t.saleState, t.isSold])).toEqual([
      [501, 'SOLD', true],
      [502, 'SOLD', true],
      [503, 'BEFORE_SALE', false],
    ]);
    expect(items[0]).toMatchObject({
      supplyCount: 100,
      remaining: 42,
      soldCount: 58,
      account: { bankName: '신한은행', bankCode: '088' },
      options: [{ optionId: 701 }, { optionId: 702 }],
    });
    expect(items[2]).toMatchObject({ supplyCount: null, remaining: null, account: null });
  });

  it('GP-5 투영은 fixture 공개 티켓과 같다(fixture 기준 시각) — P6·P7 시나리오가 그대로', async () => {
    for (const eventId of [101, 102]) {
      const fixture = events.find((e) => e.eventId === eventId)!.ticketItems;
      expect(await get(eventTicketItemsQuery(eventId))).toEqual(fixture);
    }
  });

  it('키는 GE-3 아래(마스터 양도 뒤 술어 무효화에 걸린다)', () => {
    expect(isEventManageQueryKey(ticketItemsManageQuery(1).queryKey)).toBe(true);
    expect(isEventManageQueryKey(eventOptionsQuery(1).queryKey)).toBe(true);
    expect(isEventManageQueryKey(eventTicketItemsQuery(1).queryKey)).toBe(false);
  });

  it('권한: 일반 멤버는 목록을 보고 만들지 못한다(403 HOST_400_1), 비멤버는 목록도 403 HOST_400_2', async () => {
    actAsRole(11, 'GUEST');
    expect(await list(OPEN)).toHaveLength(3);
    expect(await codeOf(create(PREPARING, free()))).toEqual([403, 'HOST_400_1']);
    expect(await codeOf(list(102))).toEqual([403, 'HOST_400_2']);
  });
});

describe('T-2 만들기', () => {
  it('두둥 티켓: bankCode만 보내면 은행명을 서버가 채운다 → 목록·체크리스트 ③에 반영', async () => {
    expect(
      (await get<{ hasValidTicket: boolean }>(eventChecklistQuery(PREPARING))).hasValidTicket,
    ).toBe(false);
    const body = CreateTicketItemRequestSchema.parse(dudoong());
    const created = await create(PREPARING, body);
    expect(created).toMatchObject({
      ticketItemId: 8101,
      payType: 'DUDOONG',
      approvalRequired: true,
      account: { bankName: '신한은행', bankCode: '088', accountHolder: '고스락' },
      saleState: 'BEFORE_SALE',
      isSold: false,
    });
    expect((await list(PREPARING)).map((t) => t.ticketItemId)).toEqual([8101]);
    expect(
      (await get<{ hasValidTicket: boolean }>(eventChecklistQuery(PREPARING))).hasValidTicket,
    ).toBe(true);
  });

  it('무료 티켓: 가격 0 · 계좌 없음 · 승인은 고른 대로', async () => {
    const created = await create(PREPARING, free({ approvalRequired: true }));
    expect(created).toMatchObject({
      payType: 'FREE',
      price: 0,
      account: null,
      approvalRequired: true,
    });
  });

  it.each([
    [
      '무제한 + 재고 공개(Figma 기본값 그대로)',
      free({ isQuantityPublic: true }),
      [400, 'Ticket_Item_400_15'],
    ],
    ['이름 13자', free({ name: '가'.repeat(13) }), [400, 'Ticket_Item_400_15']],
    ['설명 31자', free({ description: '가'.repeat(31) }), [400, 'Ticket_Item_400_15']],
    ['무료인데 가격', free({ price: 1000 }), [400, 'Ticket_Item_400_3']],
    ['두둥인데 0원', dudoong({ price: 0 }), [400, 'Ticket_Item_400_3']],
    ['두둥인데 계좌 없음', dudoong({ account: undefined }), [400, 'Ticket_Item_400_8']],
    [
      '모르는 은행 코드',
      dudoong({ account: { bankCode: '999', accountHolder: 'a', accountNumber: '1' } }),
      [400, 'BAD_REQUEST'],
    ],
    [
      '판매 종료가 공연 시작 뒤',
      free({ saleEndAt: '2027.03.20 18:01' }),
      [400, 'Ticket_Item_400_13'],
    ],
    [
      '판매 시작 ≥ 종료',
      free({ saleStartAt: '2027.03.01 10:00', saleEndAt: '2027.03.01 10:00' }),
      [400, 'Ticket_Item_400_13'],
    ],
    ['판매 종료가 지났다', free({ saleEndAt: '2020.01.01 10:00' }), [400, 'Ticket_Item_400_13']],
    ['수량 범위(본문 검증)', free({ supplyCount: 1_000_000 }), [400, 'BAD_REQUEST']],
  ] as const)('%s → %j', async (_, body, expected) => {
    expect(await codeOf(create(PREPARING, body as CreateTicketItemRequest))).toEqual(expected);
    expect(await list(PREPARING)).toEqual([]);
  });

  it('티켓 없음 공연에는 만들 수 없다(Ticket_Item_400_12)', async () => {
    const { eventId } = (await call(createEventMutation(), {
      hostId: 11,
      name: '버스킹',
      startAt: '2030.05.01 19:00',
      endAt: '2030.05.01 21:00',
      hasTicket: false,
    })) as { eventId: number };
    expect(await codeOf(create(eventId, free()))).toEqual([400, 'Ticket_Item_400_12']);
  });

  it('정산중·지난 공연은 Event_400_17(티켓 없음 검사보다 먼저)', async () => {
    setStoredStatus(PREPARING, 'CLOSED');
    expect(await codeOf(create(PREPARING, free()))).toEqual([400, 'Event_400_17']);
  });

  it('동의 강제(#840): 두둥은 refundObligationAgreed가 없으면 Agreement_400_1, 체크한 값과 버전이면 통과, 무료는 검사하지 않는다', async () => {
    setTicketAgreementEnforced(true);
    expect(await codeOf(create(PREPARING, dudoong()))).toEqual([400, 'Agreement_400_1']);
    await expect(
      create(
        PREPARING,
        dudoong({ refundObligationAgreed: true, agreementVersion: AGREEMENT_VERSION }),
      ),
    ).resolves.toMatchObject({ payType: 'DUDOONG' });
    await expect(create(PREPARING, free())).resolves.toMatchObject({ payType: 'FREE' });
  });
});

describe('T-3 부분 수정', () => {
  it('보낸 필드만 바뀌고, clear로 비운다(무제한·제한 없음·설명 없음)', async () => {
    const t = await create(
      PREPARING,
      free({ description: '선착순', supplyCount: 30, purchaseLimit: 2 }),
    );
    const body = UpdateTicketItemRequestSchema.parse({
      clear: ['SUPPLY_COUNT', 'PURCHASE_LIMIT', 'DESCRIPTION'],
    });
    expect(await update(PREPARING, t.ticketItemId, body)).toMatchObject({
      name: '초대권',
      description: null,
      supplyCount: null,
      purchaseLimit: null,
    });
  });

  it('명시적 null은 400 Ticket_Item_400_15(clear를 쓰라는 사유), 같은 필드에 값과 clear도 400_15', async () => {
    const t = await create(PREPARING, free({ supplyCount: 30 }));
    const nullBody = await update(PREPARING, t.ticketItemId, { supplyCount: null }).catch(
      (e: ApiError) => e,
    );
    expect(nullBody).toMatchObject({ code: 'Ticket_Item_400_15' });
    expect((nullBody as ApiError).reason).toContain('clear');
    expect(
      await codeOf(update(PREPARING, t.ticketItemId, { supplyCount: 10, clear: ['SUPPLY_COUNT'] })),
    ).toEqual([400, 'Ticket_Item_400_15']);
    expect(UpdateTicketItemRequestSchema.safeParse({ supplyCount: null }).success).toBe(false);
  });

  it('무료 → 두둥: 가격·계좌를 같이 보낸다. 강제가 켜지면 동의 없이는 Agreement_400_1(#873), 이미 두둥인 티켓 수정에는 묻지 않는다', async () => {
    const t = await create(PREPARING, free());
    setTicketAgreementEnforced(true);
    const toDudoong = {
      payType: 'DUDOONG',
      price: 5000,
      account: { bankCode: '090', accountHolder: '고스락', accountNumber: '3333-01' },
    };
    expect(await codeOf(update(PREPARING, t.ticketItemId, toDudoong))).toEqual([
      400,
      'Agreement_400_1',
    ]);
    const converted = await update(PREPARING, t.ticketItemId, {
      ...toDudoong,
      refundObligationAgreed: true,
      agreementVersion: AGREEMENT_VERSION,
    });
    expect(converted).toMatchObject({
      payType: 'DUDOONG',
      approvalRequired: true,
      account: { bankName: '카카오뱅크' },
    });
    await expect(update(PREPARING, t.ticketItemId, { price: 6000 })).resolves.toMatchObject({
      price: 6000,
    });
  });

  it('잠긴 티켓(501 판매됨): 이름·가격·수량 감소는 Ticket_Item_400_14, 설명·수량 증가는 된다', async () => {
    expect(await codeOf(update(OPEN, 501, { name: '바뀐 이름' }))).toEqual([
      400,
      'Ticket_Item_400_14',
    ]);
    expect(await codeOf(update(OPEN, 501, { price: 20000 }))).toEqual([400, 'Ticket_Item_400_14']);
    expect(await codeOf(update(OPEN, 501, { supplyCount: 99 }))).toEqual([
      400,
      'Ticket_Item_400_14',
    ]);
    await expect(
      update(OPEN, 501, { description: '1인 1매 권장', supplyCount: 120 }),
    ).resolves.toMatchObject({ description: '1인 1매 권장', supplyCount: 120, remaining: 62 });
  });

  it('승인 대기 주문이 있으면 잠긴다(hasPendingOrders)', async () => {
    setTicketPendingOrders(503, 2);
    expect(await codeOf(update(OPEN, 503, { name: '초대' }))).toEqual([400, 'Ticket_Item_400_14']);
  });

  it('유료 옵션이 붙은 두둥 티켓을 무료로: Item_Option_Group_400_4', async () => {
    const t = await create(PREPARING, dudoong());
    const o = (await call(createOptionMutation(PREPARING), {
      name: '뒤풀이',
      description: '참석하나요?',
      type: 'YES_NO',
      yesAdditionalPrice: 10000,
    })) as { optionId: number };
    await call(replaceTicketOptionsMutation(PREPARING), {
      ticketItemId: t.ticketItemId,
      body: { optionIds: [o.optionId] },
    });
    expect(await codeOf(update(PREPARING, t.ticketItemId, { payType: 'FREE', price: 0 }))).toEqual([
      400,
      'Item_Option_Group_400_4',
    ]);
  });

  it('다른 공연의 티켓 id는 404 Ticket_Item_404_1', async () => {
    expect(await codeOf(update(PREPARING, 501, { description: 'x' }))).toEqual([
      404,
      'Ticket_Item_404_1',
    ]);
  });
});

describe('T-4 삭제 · T-5/T-6 판매 중단 · 재개', () => {
  it('잠긴 티켓은 지울 수 없다(판매됨·승인 대기 — Ticket_Item_400_7), 잠기지 않은 티켓은 지우면 남은 목록', async () => {
    expect(await codeOf(call(deleteTicketItemMutation(OPEN), 501))).toEqual([
      400,
      'Ticket_Item_400_7',
    ]);
    setTicketPendingOrders(503, 1);
    expect(await codeOf(call(deleteTicketItemMutation(OPEN), 503))).toEqual([
      400,
      'Ticket_Item_400_7',
    ]);
    setTicketPendingOrders(503, 0);
    const remaining = (await call(deleteTicketItemMutation(OPEN), 503)) as TicketItemManage[];
    expect(remaining.map((t) => t.ticketItemId)).toEqual([501, 502]);
  });

  it('지우면 체크리스트 ③이 다시 빈다', async () => {
    const t = await create(PREPARING, free());
    await call(deleteTicketItemMutation(PREPARING), t.ticketItemId);
    expect(
      (await get<{ hasValidTicket: boolean }>(eventChecklistQuery(PREPARING))).hasValidTicket,
    ).toBe(false);
  });

  it('판매 중단 → GP-5에 isSuspended로 남고(딤드, #894), 재개 → 다시 살 수 있다(멱등). 잠긴 티켓도 중단할 수 있다', async () => {
    const flags = async () =>
      (
        (await get(eventTicketItemsQuery(OPEN))) as {
          ticketItemId: number;
          isSuspended: boolean;
          isPurchasable: boolean;
        }[]
      ).map((t) => [t.ticketItemId, t.isSuspended, t.isPurchasable]);
    expect(await flags()).toEqual([
      [501, false, true],
      [502, false, false],
      [503, false, true],
    ]);
    const suspended = (await call(suspendTicketItemMutation(OPEN), 501)) as TicketItemManage;
    expect(suspended).toMatchObject({ saleState: 'SUSPENDED', isSold: true, isPurchasable: false });
    await call(suspendTicketItemMutation(OPEN), 501);
    expect((await flags())[0]).toEqual([501, true, false]);
    expect((await call(resumeTicketItemMutation(OPEN), 501)) as TicketItemManage).toMatchObject({
      saleState: 'SOLD',
    });
    expect((await flags())[0]).toEqual([501, false, true]);
  });
});

describe('옵션 O-1~O-5', () => {
  it('O-1: 잠긴 티켓(501)에 붙은 옵션은 isLocked, 붙은 티켓 id', async () => {
    expect(await get(eventOptionsQuery(OPEN))).toEqual([
      expect.objectContaining({
        optionId: 701,
        type: 'YES_NO',
        yesAdditionalPrice: 10000,
        appliedTicketItemIds: [501],
        isLocked: true,
      }),
      expect.objectContaining({
        optionId: 702,
        type: 'SUBJECTIVE',
        yesAdditionalPrice: null,
        isLocked: true,
      }),
    ]);
  });

  it('O-2 만들기 → O-5 붙이기 → GP-5 옵션에도 나온다(공연 등록 후)', async () => {
    const o = (await call(createOptionMutation(OPEN), {
      name: '응원 문구',
      description: '짧게 적어 주세요',
      type: 'SUBJECTIVE',
    })) as { optionId: number; appliedTicketItemIds: number[] };
    expect(o).toMatchObject({ optionId: 8701, appliedTicketItemIds: [] });
    const t = (await call(replaceTicketOptionsMutation(OPEN), {
      ticketItemId: 503,
      body: { optionIds: [o.optionId] },
    })) as TicketItemManage;
    expect(t.options.map((x) => x.optionId)).toEqual([8701]);
    const gp5 = (await get(eventTicketItemsQuery(OPEN))) as {
      ticketItemId: number;
      options: { optionId: number }[];
    }[];
    expect(gp5.find((x) => x.ticketItemId === 503)?.options.map((x) => x.optionId)).toEqual([8701]);
  });

  it.each([
    [
      '설명 51자',
      { name: 'a', description: '가'.repeat(51), type: 'SUBJECTIVE' },
      [400, 'Option_Group_400_6'],
    ],
    ['설명 없음', { name: 'a', description: ' ', type: 'SUBJECTIVE' }, [400, 'BAD_REQUEST']],
    [
      '주관식에 추가금',
      { name: 'a', description: 'b', type: 'SUBJECTIVE', yesAdditionalPrice: 100 },
      [400, 'Option_Group_400_3'],
    ],
    [
      '객관식',
      { name: 'a', description: 'b', type: 'MULTIPLE_CHOICE' },
      [400, 'Option_Group_400_4'],
    ],
  ] as const)('O-2 %s → %j', async (_, body, expected) => {
    expect(await codeOf(call(createOptionMutation(PREPARING), body as never))).toEqual(expected);
  });

  it('O-5 오류: 잠긴 티켓 변경 Item_Option_Group_400_2(같은 목록은 200), 무료 티켓에 유료 옵션 400_4, 다른 공연 옵션 Option_Group_400_1, 없는 옵션 404', async () => {
    const replace = (eventId: number, ticketItemId: number, optionIds: number[]) =>
      codeOf(call(replaceTicketOptionsMutation(eventId), { ticketItemId, body: { optionIds } }));
    expect(await replace(OPEN, 501, [701])).toEqual([400, 'Item_Option_Group_400_2']);
    expect(await replace(OPEN, 501, [702, 701])).toBeNull();
    expect(await replace(OPEN, 503, [701])).toEqual([400, 'Item_Option_Group_400_4']);
    const t = await create(PREPARING, free());
    expect(await replace(PREPARING, t.ticketItemId, [702])).toEqual([400, 'Option_Group_400_1']);
    expect(await replace(PREPARING, t.ticketItemId, [999])).toEqual([404, 'Option_Group_404_1']);
    expect(
      await replace(
        PREPARING,
        t.ticketItemId,
        Array.from({ length: 11 }, (_, i) => i),
      ),
    ).toEqual([400, 'BAD_REQUEST']);
  });

  it('O-3: 응답 형식은 본문에 없다(스키마가 거른다). 잠긴 옵션은 이름·설명만 — 추가금 변경은 Option_Group_400_5', async () => {
    expect(UpdateOptionRequestSchema.safeParse({ type: 'YES_NO' }).success).toBe(false);
    const updateOption = (optionId: number, body: object) =>
      call(updateOptionMutation(OPEN), { optionId, body: body as never });
    expect(await codeOf(updateOption(701, { yesAdditionalPrice: 5000 }))).toEqual([
      400,
      'Option_Group_400_5',
    ]);
    await expect(
      updateOption(701, { name: '뒤풀이', yesAdditionalPrice: 10000 }),
    ).resolves.toMatchObject({
      name: '뒤풀이',
      type: 'YES_NO',
    });
    expect(await codeOf(updateOption(701, { description: '가'.repeat(51) }))).toEqual([
      400,
      'Option_Group_400_6',
    ]);
    expect(
      await codeOf(call(updateOptionMutation(PREPARING), { optionId: 701, body: { name: 'x' } })),
    ).toEqual([404, 'Option_Group_404_1']);
  });

  it('O-4: 잠긴 옵션은 Option_Group_400_2, 판매 전 티켓에 붙은 옵션은 떼어 내고 지운다(남은 풀)', async () => {
    expect(await codeOf(call(deleteOptionMutation(OPEN), 701))).toEqual([
      400,
      'Option_Group_400_2',
    ]);
    const t = await create(PREPARING, free());
    const o = (await call(createOptionMutation(PREPARING), {
      name: '이름',
      description: '설명',
      type: 'SUBJECTIVE',
    })) as { optionId: number };
    await call(replaceTicketOptionsMutation(PREPARING), {
      ticketItemId: t.ticketItemId,
      body: { optionIds: [o.optionId] },
    });
    expect(await call(deleteOptionMutation(PREPARING), o.optionId)).toEqual([]);
    expect((await list(PREPARING))[0]?.options).toEqual([]);
  });

  it('판매가 생기면 붙은 옵션도 잠긴다', async () => {
    const t = await create(PREPARING, free());
    const o = (await call(createOptionMutation(PREPARING), {
      name: 'n',
      description: 'd',
      type: 'SUBJECTIVE',
    })) as {
      optionId: number;
    };
    await call(replaceTicketOptionsMutation(PREPARING), {
      ticketItemId: t.ticketItemId,
      body: { optionIds: [o.optionId] },
    });
    setTicketSold(t.ticketItemId, 1);
    expect(await get(eventOptionsQuery(PREPARING))).toEqual([
      expect.objectContaining({ isLocked: true }),
    ]);
  });
});
