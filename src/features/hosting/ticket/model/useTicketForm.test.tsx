import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { hostingTicketSets } from '@/api/__mocks__/hosting-ticket.handlers';
import { server } from '@/api/__mocks__/server';
import { setTicketAgreementEnforced } from '@/api/__mocks__/ticket-store';
import { createEventMutation } from '@/api/event/mutations';
import { eventChecklistQuery, eventManageQuery } from '@/api/event/queries';
import { shouldToastMutationError } from '@/api/query-client';
import { AGREEMENT_VERSION } from '@/api/shared/agreement';
import { eventTicketItemsQuery, ticketItemsManageQuery } from '@/api/ticket-item/queries';
import {
  CreateTicketItemRequestSchema,
  UpdateTicketItemRequestSchema,
} from '@/api/ticket-item/schema';
import { installLoggedInFetch } from '@/test/login-fetch';
import { createTestQueryClient } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { useTicketForm } from './useTicketForm';

const nav = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => nav.router }));

let restore: () => void;
beforeEach(() => {
  resetHostMockState();
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  nav.router.replace.mockReset();
  restore();
  resetHostMockState();
  resetHostingStore();
});

const NOW = () => new Date('2026-10-29T03:00:00Z');

function setup(eventId: string, ticketItemId: number | null = null) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="불러오는 중">{children}</Suspense>
    </QueryClientProvider>
  );
  return {
    ...renderHook(() => useTicketForm(eventId, ticketItemId, { now: NOW }), { wrapper }),
    queryClient,
  };
}
type Hook = ReturnType<typeof setup>['result'];
const loaded = (result: Hook) => waitFor(() => expect(result.current).not.toBeNull());
const writes = async (sent: ReturnType<typeof recordRequests>) =>
  (await sent.list()).filter((r) => r.method !== 'GET');
async function save(result: Hook) {
  let ok = false;
  await act(async () => {
    ok = await result.current.save();
  });
  return ok;
}
/** 은행 목록이 온 뒤 */
const banksLoaded = (result: Hook) =>
  waitFor(() => expect(result.current.bank.status).toBe('success'));

async function fillDudoong(result: Hook) {
  await banksLoaded(result);
  act(() => {
    result.current.setName('일반 예매');
    result.current.setPrice('15000');
    result.current.bank.select('088');
    result.current.setAccountHolder('고스락');
    result.current.setAccountNumber('110-123');
  });
}

describe('새 티켓(P10/T-2)', () => {
  it('기본값 그대로(두둥 · 무제한 · 재고 공개 꺼짐) 저장 → 서버가 받는다, 목록 캐시·체크리스트 ③·GP-5 반영 후 목록으로 replace', async () => {
    const { result, queryClient } = setup('140');
    await loaded(result);
    expect(result.current.mode).toBe('create');
    expect(result.current.locks.quantityPublic).toBe(true);
    await fillDudoong(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    const [post] = await writes(sent);
    expect(post).toMatchObject({ method: 'POST', path: '/api/v2/events/140/ticket-items' });
    expect(post!.body).toEqual({
      payType: 'DUDOONG',
      name: '일반 예매',
      price: 15000,
      account: { bankCode: '088', accountHolder: '고스락', accountNumber: '110-123' },
      approvalRequired: true,
      isQuantityPublic: false,
    });
    expect(CreateTicketItemRequestSchema.parse(post!.body)).toEqual(post!.body);
    expect(nav.router.replace).toHaveBeenCalledWith('/hosting/events/140/tickets');
    expect(queryClient.getQueryData(ticketItemsManageQuery('140').queryKey)).toEqual([
      expect.objectContaining({
        ticketItemId: 8101,
        account: expect.objectContaining({ bankName: '신한은행' }),
      }),
    ]);
    for (const key of [
      eventChecklistQuery('140').queryKey,
      eventManageQuery('140').queryKey,
      eventTicketItemsQuery('140').queryKey,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true });
    }
  });

  it('무제한이면 재고 공개를 끄고 비활성 — 켜려 해도 바뀌지 않는다', async () => {
    const { result } = setup('140');
    await loaded(result);
    act(() => result.current.setQuantityPublic(true));
    expect(result.current.values.isQuantityPublic).toBe(false);
    act(() => result.current.setUnlimited(false));
    act(() => result.current.setQuantityPublic(true));
    expect(result.current.values.isQuantityPublic).toBe(true);
    act(() => result.current.setUnlimited(true));
    expect(result.current.values.isQuantityPublic).toBe(false);
    expect(result.current.locks.quantityPublic).toBe(true);
  });

  it('무료 티켓: 승인 토글이 열리고 가격·계좌 없이 저장(가격 0)', async () => {
    const { result } = setup('140');
    await loaded(result);
    expect(result.current.locks.approval).toBe(true);
    act(() => {
      result.current.setPayType('FREE');
      result.current.setName('초대권');
    });
    expect(result.current.locks.approval).toBe(false);
    act(() => result.current.setApprovalRequired(false));
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    expect((await writes(sent))[0]!.body).toEqual({
      payType: 'FREE',
      name: '초대권',
      price: 0,
      approvalRequired: false,
      isQuantityPublic: false,
    });
  });

  it('두둥이면 승인을 끌 수 없다', async () => {
    const { result } = setup('140');
    await loaded(result);
    act(() => result.current.setApprovalRequired(false));
    expect(result.current.values.approvalRequired).toBe(true);
  });

  it('은행은 목록에서만 — 검색어로 거르고, 목록에 없는 코드는 고를 수 없다', async () => {
    const { result } = setup('140');
    await loaded(result);
    await banksLoaded(result);
    act(() => result.current.bank.setKeyword('카카오'));
    expect(result.current.bank.filtered.map((b) => b.code)).toEqual(['090']);
    act(() => result.current.bank.select('999'));
    expect(result.current.values.bankCode).toBe('');
    act(() => result.current.bank.select('090'));
    expect(result.current.values.bankCode).toBe('090');
    expect(result.current.bank.selected).toEqual({ code: '090', name: '카카오뱅크' });
  });

  it('칸 오류면 요청하지 않는다', async () => {
    const { result } = setup('140');
    await loaded(result);
    const sent = recordRequests();
    expect(await save(result)).toBe(false);
    expect(result.current.errors).toMatchObject({
      name: expect.any(String),
      price: expect.any(String),
    });
    expect(await writes(sent)).toEqual([]);
  });

  it('동의(#840): 기본은 보내지 않는다(칸은 Q42 대기). 사용자가 체크한 값이 있을 때만 refundObligationAgreed + agreementVersion', async () => {
    const { result } = setup('140');
    await loaded(result);
    await fillDudoong(result);
    expect(result.current.agreement).toMatchObject({ field: false, required: true, agreed: false });
    act(() => result.current.agreement.setAgreed(true));
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    expect((await writes(sent))[0]!.body).toMatchObject({
      refundObligationAgreed: true,
      agreementVersion: AGREEMENT_VERSION,
    });
  });

  it('동의 강제가 켜졌는데 보내지 않으면 Agreement_400_1 → 폼 오류, 토스트 없음', async () => {
    setTicketAgreementEnforced(true);
    const { result, queryClient } = setup('140');
    await loaded(result);
    await fillDudoong(result);
    expect(await save(result)).toBe(false);
    await waitFor(() => expect(result.current.formError).toBe('필수 동의를 확인해 주세요'));
    const m = queryClient.getMutationCache().getAll().at(-1)!;
    expect(shouldToastMutationError(m.state.error, m.options.meta)).toBe(false);
  });

  it.each([
    ['Ticket_Item_400_13', 'saleEnd'],
    ['Ticket_Item_400_3', 'price'],
    ['Ticket_Item_400_8', 'bankCode'],
  ] as const)('%s → %s 칸 오류(고치면 지운다)', async (code, field) => {
    server.use(...hostingTicketSets.createFails(140, code));
    const { result } = setup('140');
    await loaded(result);
    await fillDudoong(result);
    expect(await save(result)).toBe(false);
    await waitFor(() => expect(result.current.serverErrors[field]).toEqual(expect.any(String)));
  });

  it('티켓 없음 공연은 만들 수 없다 — 읽기 전용, 요청하지 않는다', async () => {
    const { eventId } = await createEventMutation().mutationFn!(
      {
        hostId: 11,
        name: '버스킹',
        startAt: '2030.05.01 19:00',
        endAt: '2030.05.01 21:00',
        hasTicket: false,
      },
      {} as never,
    );
    const { result } = setup(String(eventId));
    await loaded(result);
    expect(result.current.readOnlyReason).toBe('noTicketEvent');
    expect(result.current.canEdit).toBe(false);
    act(() => result.current.setName('x'));
    expect(result.current.values.name).toBe('');
  });

  it('일반 멤버는 읽기 전용', async () => {
    actAsRole(11, 'GUEST');
    const { result } = setup('140');
    await loaded(result);
    expect(result.current.readOnlyReason).toBe('role');
    expect(await save(result)).toBe(false);
  });
});

describe('티켓 수정(P10/T-3)', () => {
  it('바뀐 필드만 + 비우면 clear[] — 무제한으로', async () => {
    const { result } = setup('101', 503);
    await loaded(result);
    expect(result.current.dirty).toBe(false);
    act(() => {
      result.current.setDescription('입장 시 확인');
      result.current.setLimitPurchase(true);
      result.current.setPurchaseLimit('2');
    });
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    const [patch] = await writes(sent);
    expect(patch).toMatchObject({ method: 'PATCH', path: '/api/v2/events/101/ticket-items/503' });
    expect(patch!.body).toEqual({ description: '입장 시 확인', purchaseLimit: 2 });
    expect(UpdateTicketItemRequestSchema.parse(patch!.body)).toEqual(patch!.body);
    expect(nav.router.replace).toHaveBeenCalledWith('/hosting/events/101/tickets');
  });

  it('수량 지정 → 무제한은 clear SUPPLY_COUNT + 재고 공개 끔', async () => {
    const { result } = setup('101', 502);
    await loaded(result);
    // 502는 매진(판매됨)이라 잠겼다 — 수량은 늘리기만, 무제한은 늘리기다
    act(() => result.current.setUnlimited(true));
    const sent = recordRequests();
    expect(await save(result)).toBe(true);
    expect((await writes(sent))[0]!.body).toEqual({
      isQuantityPublic: false,
      clear: ['SUPPLY_COUNT'],
    });
  });

  it('잠긴 티켓(501): 이름·가격·결제 방식은 바뀌지 않고, 수량 감소는 칸 오류', async () => {
    const { result } = setup('101', 501);
    await loaded(result);
    expect(result.current.locks.locked).toBe(true);
    act(() => {
      result.current.setName('바뀐 이름');
      result.current.setPrice('1');
      result.current.setPayType('FREE');
      result.current.setSupplyCount('50');
    });
    expect(result.current.values).toMatchObject({
      name: '일반 예매',
      price: '15000',
      payType: 'DUDOONG',
    });
    expect(result.current.errors.supplyCount).toBe('판매된 티켓은 수량을 늘리기만 할 수 있어요');
  });

  it('잠긴 필드 변경(Ticket_Item_400_14)이 오면 폼 오류 + 목록 다시 읽기', async () => {
    server.use(...hostingTicketSets.updateFails(101, 'Ticket_Item_400_14'));
    const { result, queryClient } = setup('101', 503);
    await loaded(result);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => result.current.setName('초대'));
    expect(await save(result)).toBe(false);
    await waitFor(() => expect(result.current.formError).toMatch(/설명·판매 기간/));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ticketItemsManageQuery('101').queryKey,
      exact: true,
    });
  });

  it('목록에 없는 티켓은 missing(공용 404)', async () => {
    const { result } = setup('101', 999);
    await loaded(result);
    expect(result.current.missing).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });
});
