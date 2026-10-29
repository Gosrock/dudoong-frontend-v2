import { describe, expect, it } from 'vitest';

import type { Bank } from '@/api/bank/schema';
import type { TicketOptionManage } from '@/api/option/schema';
import { AGREEMENT_VERSION } from '@/api/shared/agreement';
import type { TicketItemManage } from '@/api/ticket-item/schema';

import { filterBanks } from './bank-select';
import {
  initialOptionFormValues,
  type OptionFormValues,
  toCreateOptionBody,
  toUpdateOptionBody,
  validateOptionForm,
} from './option-form';
import {
  initialTicketFormValues,
  isTicketFormDirty,
  needsRefundObligation,
  normalizeTicketForm,
  REFUND_OBLIGATION_FIELD,
  ticketFieldLocksOf,
  type TicketFormValues,
  ticketFormValuesOf,
  toCreateTicketBody,
  toServerDateTime,
  toUpdateTicketBody,
  validateTicketForm,
} from './ticket-form';
import {
  attachableOptionsOf,
  canAddTicket,
  canAttachMoreOptions,
  canChangeTicketOptions,
  isTicketLocked,
  parseTicketItemIdParam,
  ticketMenuOf,
  ticketSaleChipOf,
} from './ticket-rules';

const ticket = (over: Partial<TicketItemManage> = {}): TicketItemManage => ({
  ticketItemId: 1,
  payType: 'DUDOONG',
  name: '일반 예매',
  description: null,
  price: 15000,
  supplyCount: 100,
  remaining: 100,
  soldCount: 0,
  approvalRequired: true,
  isQuantityPublic: true,
  purchaseLimit: null,
  saleStartAt: null,
  saleEndAt: null,
  saleState: 'BEFORE_SALE',
  isSold: false,
  hasPendingOrders: false,
  pendingApproveCount: 0,
  isPurchasable: false,
  account: { bankName: '신한은행', bankCode: '088', accountHolder: '고스락', accountNumber: '110' },
  options: [],
  ...over,
});

const option = (over: Partial<TicketOptionManage> = {}): TicketOptionManage => ({
  optionId: 1,
  name: '옵션',
  description: '설명',
  type: 'SUBJECTIVE',
  yesAdditionalPrice: null,
  appliedTicketItemIds: [],
  isLocked: false,
  ...over,
});

const NOW = '2026.10.29 12:00';
const EVENT_START = '2026.11.21 19:00';

describe('잠금 · ⋮ 메뉴(isSold || hasPendingOrders)', () => {
  it.each([
    [{}, false],
    [{ isSold: true }, true],
    [{ hasPendingOrders: true }, true],
    [{ isSold: true, hasPendingOrders: true }, true],
  ] as const)('%j → 잠김 %s', (over, locked) => {
    expect(isTicketLocked(ticket(over))).toBe(locked);
  });

  it.each([
    ['판매 전 두둥', {}, true, ['edit', 'delete', 'suspend']],
    [
      '판매됨 → 삭제 대신 판매 중단만',
      { isSold: true, saleState: 'SOLD' },
      true,
      ['edit', 'suspend'],
    ],
    ['승인 대기 주문', { hasPendingOrders: true }, true, ['edit', 'suspend']],
    ['판매 중단 → 재개', { saleState: 'SUSPENDED' }, true, ['edit', 'delete', 'resume']],
    ['판매됨 + 중단', { isSold: true, saleState: 'SUSPENDED' }, true, ['edit', 'resume']],
    ['기존 PG 티켓은 수정 없음', { payType: 'PRICE' }, true, ['delete', 'suspend']],
    ['모르는 결제 방식도 수정 없음', { payType: 'UNKNOWN' }, true, ['delete', 'suspend']],
    ['읽기 전용(일반 멤버·끝난 공연)', {}, false, []],
  ] as const)('%s', (_, over, canEdit, menu) => {
    expect(ticketMenuOf(ticket(over as Partial<TicketItemManage>), canEdit)).toEqual(menu);
  });
});

describe('상태 칩(판매중 · 판매 예정 · 판매 종료 · 판매 중단)', () => {
  it.each([
    ['기간 없음 → 공연 시작 전이면 판매중', {}, 'onSale'],
    ['판매 시작 전', { saleStartAt: '2026.11.01 10:00' }, 'upcoming'],
    ['판매 시작 시각 = 지금 → 판매중', { saleStartAt: NOW }, 'onSale'],
    ['판매 종료가 지남', { saleEndAt: '2026.10.28 23:59' }, 'ended'],
    ['판매 종료 시각 = 지금 → 판매 종료', { saleEndAt: NOW }, 'ended'],
    ['판매 중단이 먼저', { saleState: 'SUSPENDED', saleEndAt: '2026.10.28 23:59' }, 'suspended'],
  ] as const)('%s', (_, over, chip) => {
    expect(ticketSaleChipOf(ticket(over), EVENT_START, NOW)).toBe(chip);
  });

  it('판매 종료가 없으면 공연 시작이 끝 — 공연이 시작됐으면 판매 종료', () => {
    expect(ticketSaleChipOf(ticket(), '2026.10.29 11:00', NOW)).toBe('ended');
  });
});

describe('추가 · 옵션 붙이기', () => {
  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
  ])(
    '티켓 있음 %s · 쓰기 가능 %s → 추가 %s (티켓 없음 공연은 서버도 Ticket_Item_400_12)',
    (hasTicket, canEdit, ok) => {
      expect(canAddTicket({ hasTicket }, canEdit)).toBe(ok);
    },
  );

  it('잠긴 티켓은 옵션을 바꿀 수 없다(Item_Option_Group_400_2)', () => {
    expect(canChangeTicketOptions(ticket(), true)).toBe(true);
    expect(canChangeTicketOptions(ticket({ isSold: true }), true)).toBe(false);
    expect(canChangeTicketOptions(ticket(), false)).toBe(false);
  });

  it('붙일 수 있는 옵션: 이미 붙은 것 빼고, 무료 티켓이면 유료 옵션도 뺀다', () => {
    const pool = [
      option({ optionId: 1 }),
      option({ optionId: 2, type: 'YES_NO', yesAdditionalPrice: 0 }),
      option({ optionId: 3, type: 'YES_NO', yesAdditionalPrice: 5000 }),
    ];
    const attached = [
      { optionId: 1, name: '옵션', type: 'SUBJECTIVE' as const, yesAdditionalPrice: null },
    ];
    expect(attachableOptionsOf(ticket({ options: attached }), pool).map((o) => o.optionId)).toEqual(
      [2, 3],
    );
    expect(attachableOptionsOf(ticket({ payType: 'FREE' }), pool).map((o) => o.optionId)).toEqual([
      1, 2,
    ]);
  });

  it('티켓당 옵션 10개까지', () => {
    const opts = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        optionId: i,
        name: null,
        type: null,
        yesAdditionalPrice: null,
      }));
    expect(canAttachMoreOptions(ticket({ options: opts(9) }))).toBe(true);
    expect(canAttachMoreOptions(ticket({ options: opts(10) }))).toBe(false);
  });

  it.each([
    ['12', 12],
    ['abc', null],
    ['1.5', null],
    ['99999999999999999999', null],
  ])('주소 티켓 id %s → %s', (raw, id) => {
    expect(parseTicketItemIdParam(raw)).toBe(id);
  });
});

const filled = (over: Partial<TicketFormValues> = {}): TicketFormValues => ({
  ...initialTicketFormValues(),
  name: '일반 예매',
  price: '15000',
  bankCode: '088',
  accountHolder: '고스락',
  accountNumber: '110-123',
  ...over,
});
const ctx = { base: null, ticket: null, eventStartAt: EVENT_START, now: NOW };

describe('티켓 폼 — 기본값 · 칸 사이 규칙', () => {
  it('새 폼 기본값: 두둥 · 무제한 + 재고 공개 꺼짐 · 승인 켬 — 그대로 저장해도 서버가 받는 조합', () => {
    const v = initialTicketFormValues();
    expect(v).toMatchObject({
      payType: 'DUDOONG',
      unlimited: true,
      isQuantityPublic: false,
      approvalRequired: true,
    });
    const body = toCreateTicketBody(filled(), { refundObligationAgreed: false });
    expect(body).toMatchObject({ isQuantityPublic: false, approvalRequired: true });
    expect(body).not.toHaveProperty('supplyCount');
  });

  it('무제한이면 재고 공개를 끄고 비활성', () => {
    const v = normalizeTicketForm(
      filled({ unlimited: false, supplyCount: '10', isQuantityPublic: true }),
    );
    expect(v.isQuantityPublic).toBe(true);
    const back = normalizeTicketForm({ ...v, unlimited: true });
    expect(back.isQuantityPublic).toBe(false);
    expect(ticketFieldLocksOf(back, null).quantityPublic).toBe(true);
    expect(ticketFieldLocksOf(v, null).quantityPublic).toBe(false);
  });

  it('두둥이면 승인 켠 채 잠금, 무료일 때만 연다', () => {
    const free = normalizeTicketForm(filled({ payType: 'FREE', approvalRequired: false }));
    expect(free.approvalRequired).toBe(false);
    expect(ticketFieldLocksOf(free, null).approval).toBe(false);
    const dudoong = normalizeTicketForm({ ...free, payType: 'DUDOONG' });
    expect(dudoong.approvalRequired).toBe(true);
    expect(ticketFieldLocksOf(dudoong, null).approval).toBe(true);
  });

  it('잠긴 티켓: 결제 방식·이름·가격·계좌·승인 잠금, 무제한 → 수량 지정 막음', () => {
    const locks = ticketFieldLocksOf(filled(), ticket({ isSold: true, supplyCount: null }));
    expect(locks).toEqual({
      locked: true,
      quantityPublic: true,
      approval: true,
      limitedSupply: true,
    });
  });

  it.each([
    ['2026-11-01', '10:30', '2026.11.01 10:30'],
    ['2026-02-30', '10:30', null],
    ['', '10:30', null],
    ['2026-11-01', '', null],
  ])('날짜 %s 시각 %s → %s', (d, t, out) => {
    expect(toServerDateTime(d, t)).toBe(out);
  });
});

describe('티켓 폼 — 칸 검사', () => {
  it.each([
    ['이름 없음', { name: ' ' }, 'name'],
    ['이름 13자', { name: '가'.repeat(13) }, 'name'],
    ['설명 31자', { description: '가'.repeat(31) }, 'description'],
    ['두둥 가격 0', { price: '0' }, 'price'],
    ['두둥 가격 1,000만 초과', { price: '10000001' }, 'price'],
    ['가격 글자', { price: '1만' }, 'price'],
    ['은행 없음', { bankCode: '' }, 'bankCode'],
    ['예금주 없음', { accountHolder: ' ' }, 'accountHolder'],
    ['계좌번호 51자', { accountNumber: '1'.repeat(51) }, 'accountNumber'],
    ['수량 0', { unlimited: false, supplyCount: '0' }, 'supplyCount'],
    ['수량 1,000,000', { unlimited: false, supplyCount: '1000000' }, 'supplyCount'],
    ['매수 제한 빈 칸', { limitPurchase: true, purchaseLimit: '' }, 'purchaseLimit'],
    [
      '판매 시작 빈 칸',
      { salePeriod: true, saleStartNow: false, saleEndDate: '2026-11-20', saleEndTime: '23:59' },
      'saleStart',
    ],
    ['판매 종료 빈 칸', { salePeriod: true }, 'saleEnd'],
    [
      '시작 ≥ 종료',
      {
        salePeriod: true,
        saleStartNow: false,
        saleStartDate: '2026-11-10',
        saleStartTime: '10:00',
        saleEndDate: '2026-11-10',
        saleEndTime: '10:00',
      },
      'saleStart',
    ],
    [
      '종료가 공연 시작 뒤',
      { salePeriod: true, saleEndDate: '2026-11-21', saleEndTime: '19:01' },
      'saleEnd',
    ],
    [
      '종료가 지났다',
      { salePeriod: true, saleEndDate: '2026-10-29', saleEndTime: '11:59' },
      'saleEnd',
    ],
  ] as const)('%s → %s 오류', (_, over, field) => {
    expect(validateTicketForm(filled(over), ctx)).toHaveProperty(field);
  });

  it('무료 티켓은 가격·계좌를 보지 않는다', () => {
    expect(validateTicketForm(filled({ payType: 'FREE', price: '', bankCode: '' }), ctx)).toEqual(
      {},
    );
  });

  it('은행 목록을 받았으면 목록에 없는 코드도 막는다', () => {
    expect(
      validateTicketForm(filled({ bankCode: '999' }), { ...ctx, bankCodes: ['088'] }),
    ).toHaveProperty('bankCode');
    expect(validateTicketForm(filled(), { ...ctx, bankCodes: ['088'] })).toEqual({});
  });

  it('종료 = 공연 시작은 된다(종료 ≤ 공연 시작)', () => {
    expect(
      validateTicketForm(
        filled({ salePeriod: true, saleEndDate: '2026-11-21', saleEndTime: '19:00' }),
        ctx,
      ),
    ).toEqual({});
  });

  it('수정: 이름·설명 길이는 바뀐 때만, 지난 판매 종료도 그대로면 통과, 옛 은행명(코드 없음)은 계좌를 고치지 않으면 묻지 않는다', () => {
    const base = filled({
      name: '아주아주긴v1티켓이름이에요',
      bankCode: '',
      salePeriod: true,
      saleEndDate: '2026-10-01',
      saleEndTime: '10:00',
    });
    expect(validateTicketForm(base, { ...ctx, base, ticket: ticket() })).toEqual({});
    expect(
      validateTicketForm({ ...base, accountHolder: '두둥' }, { ...ctx, base, ticket: ticket() }),
    ).toHaveProperty('bankCode');
  });

  it('잠긴 티켓의 수량은 늘리기만', () => {
    const base = filled({ unlimited: false, supplyCount: '100' });
    const locked = ticket({ isSold: true, supplyCount: 100 });
    expect(
      validateTicketForm({ ...base, supplyCount: '99' }, { ...ctx, base, ticket: locked }),
    ).toHaveProperty('supplyCount');
    expect(
      validateTicketForm({ ...base, supplyCount: '120' }, { ...ctx, base, ticket: locked }),
    ).toEqual({});
  });

  it('유료 옵션이 붙은 두둥 티켓은 무료로 바꿀 수 없다', () => {
    const base = filled();
    expect(
      validateTicketForm(
        { ...base, payType: 'FREE' },
        { ...ctx, base, ticket: ticket(), hasPaidOption: true },
      ),
    ).toHaveProperty('payType');
  });
});

describe('티켓 폼 — 만들기 본문(P10/T-2)', () => {
  it('두둥: 계좌는 bankCode만(bankName 없음), 값 없음 필드는 키가 없다', () => {
    expect(
      toCreateTicketBody(filled({ description: ' 1인 1매 ' }), { refundObligationAgreed: false }),
    ).toEqual({
      payType: 'DUDOONG',
      name: '일반 예매',
      description: '1인 1매',
      price: 15000,
      account: { bankCode: '088', accountHolder: '고스락', accountNumber: '110-123' },
      approvalRequired: true,
      isQuantityPublic: false,
    });
  });

  it('무료: 가격 0, 계좌 없음, 승인은 고른 대로 + 수량·매수 제한·판매 기간', () => {
    expect(
      toCreateTicketBody(
        filled({
          payType: 'FREE',
          approvalRequired: false,
          unlimited: false,
          supplyCount: '50',
          isQuantityPublic: true,
          limitPurchase: true,
          purchaseLimit: '2',
          salePeriod: true,
          saleStartNow: false,
          saleStartDate: '2026-11-01',
          saleStartTime: '10:00',
          saleEndDate: '2026-11-20',
          saleEndTime: '23:59',
        }),
        { refundObligationAgreed: true },
      ),
    ).toEqual({
      payType: 'FREE',
      name: '일반 예매',
      price: 0,
      supplyCount: 50,
      approvalRequired: false,
      isQuantityPublic: true,
      purchaseLimit: 2,
      saleStartAt: '2026.11.01 10:00',
      saleEndAt: '2026.11.20 23:59',
    });
  });

  it('동의(#840): 두둥이고 사용자가 체크했을 때만 refundObligationAgreed + agreementVersion, 무료는 체크해도 없다', () => {
    expect(toCreateTicketBody(filled(), { refundObligationAgreed: true })).toMatchObject({
      refundObligationAgreed: true,
      agreementVersion: AGREEMENT_VERSION,
    });
    expect(toCreateTicketBody(filled(), { refundObligationAgreed: false })).not.toHaveProperty(
      'agreementVersion',
    );
    expect(
      toCreateTicketBody(filled({ payType: 'FREE' }), { refundObligationAgreed: true }),
    ).not.toHaveProperty('refundObligationAgreed');
  });

  it('체크 칸은 Q42 대기 — 칸이 정해질 때까지 없다', () => {
    expect(REFUND_OBLIGATION_FIELD).toBe(false);
  });
});

describe('티켓 폼 — 수정 본문(P10/T-3: 바뀐 필드만 + clear[])', () => {
  const base = filled({
    description: '1인 1매',
    unlimited: false,
    supplyCount: '100',
    isQuantityPublic: true,
    limitPurchase: true,
    purchaseLimit: '4',
    salePeriod: true,
    saleStartNow: false,
    saleStartDate: '2026-11-01',
    saleStartTime: '10:00',
    saleEndDate: '2026-11-20',
    saleEndTime: '23:59',
  });
  const no = { refundObligationAgreed: false };

  it('바뀐 것이 없으면 null(요청하지 않는다)', () => {
    expect(toUpdateTicketBody(base, base, no)).toBeNull();
    expect(isTicketFormDirty(base, base)).toBe(false);
    expect(isTicketFormDirty(null, base)).toBe(true);
  });

  it('값을 비우면 null이 아니라 clear — 설명·수량(무제한 → 재고 공개도 끈다)·매수 제한·판매 기간', () => {
    const v = normalizeTicketForm({
      ...base,
      description: '',
      unlimited: true,
      limitPurchase: false,
      salePeriod: false,
    });
    expect(toUpdateTicketBody(base, v, no)).toEqual({
      isQuantityPublic: false,
      clear: ['DESCRIPTION', 'SUPPLY_COUNT', 'PURCHASE_LIMIT', 'SALE_START_AT', 'SALE_END_AT'],
    });
  });

  it('바뀐 값만: 수량·매수 제한·판매 종료(시작 그대로)', () => {
    expect(
      toUpdateTicketBody(
        base,
        { ...base, supplyCount: '120', purchaseLimit: '2', saleEndTime: '22:00' },
        no,
      ),
    ).toEqual({
      supplyCount: 120,
      purchaseLimit: 2,
      saleEndAt: '2026.11.20 22:00',
    });
  });

  it('"등록 즉시"로 바꾸면 SALE_START_AT만 clear', () => {
    expect(toUpdateTicketBody(base, { ...base, saleStartNow: true }, no)).toEqual({
      clear: ['SALE_START_AT'],
    });
  });

  it('계좌는 고쳤을 때만 세 값 통째로(bankCode)', () => {
    expect(toUpdateTicketBody(base, { ...base, bankCode: '090' }, no)).toEqual({
      account: { bankCode: '090', accountHolder: '고스락', accountNumber: '110-123' },
    });
  });

  it('두둥 → 무료: payType과 price 0을 같이, 계좌는 보내지 않는다', () => {
    const v = normalizeTicketForm({ ...base, payType: 'FREE', approvalRequired: false });
    expect(toUpdateTicketBody(base, v, no)).toEqual({
      payType: 'FREE',
      price: 0,
      approvalRequired: false,
    });
  });

  it('무료 → 두둥(#873): 가격·계좌를 같이, 사용자가 체크했으면 동의 필드. 이미 두둥인 티켓 수정에는 없다', () => {
    const freeBase = filled({
      payType: 'FREE',
      price: '',
      bankCode: '',
      accountHolder: '',
      accountNumber: '',
      approvalRequired: false,
    });
    const v = normalizeTicketForm({
      ...freeBase,
      payType: 'DUDOONG',
      price: '5000',
      bankCode: '090',
      accountHolder: '고스락',
      accountNumber: '3333',
    });
    expect(needsRefundObligation(freeBase, v)).toBe(true);
    expect(toUpdateTicketBody(freeBase, v, { refundObligationAgreed: true })).toEqual({
      payType: 'DUDOONG',
      price: 5000,
      account: { bankCode: '090', accountHolder: '고스락', accountNumber: '3333' },
      refundObligationAgreed: true,
      agreementVersion: AGREEMENT_VERSION,
    });
    expect(needsRefundObligation(base, { ...base, name: '바뀜' })).toBe(false);
    expect(
      toUpdateTicketBody(base, { ...base, name: '바뀜' }, { refundObligationAgreed: true }),
    ).toEqual({ name: '바뀜' });
  });

  it('응답 → 폼 값: 무제한·제한 없음·기간 없음, 두둥 계좌 bankCode', () => {
    expect(
      ticketFormValuesOf(
        ticket({ supplyCount: null, isQuantityPublic: false, saleEndAt: '2026.11.20 23:59' }),
      ),
    ).toMatchObject({
      unlimited: true,
      limitPurchase: false,
      salePeriod: true,
      saleStartNow: true,
      saleEndDate: '2026-11-20',
      saleEndTime: '23:59',
      bankCode: '088',
      price: '15000',
    });
  });
});

describe('옵션 폼', () => {
  const v = (over: Partial<OptionFormValues> = {}): OptionFormValues => ({
    ...initialOptionFormValues(),
    name: '뒤풀이',
    description: '참석하나요?',
    ...over,
  });

  it.each([
    ['이름 없음', { name: '' }, 'name'],
    ['이름 21자', { name: '가'.repeat(21) }, 'name'],
    ['설명 없음(필수)', { description: '  ' }, 'description'],
    ['설명 51자', { description: '가'.repeat(51) }, 'description'],
    ['추가금 글자', { type: 'YES_NO', yesAdditionalPrice: '천원' }, 'yesAdditionalPrice'],
    ['추가금 상한 초과', { type: 'YES_NO', yesAdditionalPrice: '10000001' }, 'yesAdditionalPrice'],
  ] as const)('%s → %s 오류', (_, over, field) => {
    expect(validateOptionForm(v(over))).toHaveProperty(field);
  });

  it('무료 티켓에 붙일 새 옵션은 추가금 0만', () => {
    expect(
      validateOptionForm(v({ type: 'YES_NO', yesAdditionalPrice: '1000' }), { freeTicket: true }),
    ).toHaveProperty('yesAdditionalPrice');
    expect(
      validateOptionForm(v({ type: 'YES_NO', yesAdditionalPrice: '' }), { freeTicket: true }),
    ).toEqual({});
  });

  it('만들기 본문: 주관식은 추가금 없음, 네/아니오는 빈 칸 = 0', () => {
    expect(toCreateOptionBody(v())).toEqual({
      name: '뒤풀이',
      description: '참석하나요?',
      type: 'SUBJECTIVE',
    });
    expect(toCreateOptionBody(v({ type: 'YES_NO' }))).toMatchObject({ yesAdditionalPrice: 0 });
  });

  it('수정 본문: 바뀐 것만, 형식(type)은 없다. 잠긴 옵션은 추가금을 보내지 않는다. 설명 길이는 바뀐 때만', () => {
    const base = v({ type: 'YES_NO', yesAdditionalPrice: '10000', description: '가'.repeat(60) });
    expect(validateOptionForm(base, { base })).toEqual({});
    const changed = {
      ...base,
      name: '2차',
      type: 'SUBJECTIVE' as const,
      yesAdditionalPrice: '5000',
    };
    expect(toUpdateOptionBody(base, changed, { locked: false, yesNo: true })).toEqual({
      name: '2차',
      yesAdditionalPrice: 5000,
    });
    expect(toUpdateOptionBody(base, changed, { locked: true, yesNo: true })).toEqual({
      name: '2차',
    });
    expect(toUpdateOptionBody(base, base, { locked: false, yesNo: true })).toBeNull();
  });
});

describe('은행 고르기', () => {
  const banks: Bank[] = [
    { code: '004', name: 'KB국민은행' },
    { code: '012', name: '지역농·축협' },
    { code: '088', name: '신한은행' },
    { code: '090', name: '카카오뱅크' },
  ];
  it.each([
    ['', ['004', '012', '088', '090']],
    ['신한', ['088']],
    ['kb', ['004']],
    ['농축', ['012']],
    ['카카오 뱅크', ['090']],
    ['08', ['088']],
    ['없는은행', []],
  ])('"%s" → %j', (q, codes) => {
    expect(filterBanks(banks, q).map((b) => b.code)).toEqual(codes);
  });
});
