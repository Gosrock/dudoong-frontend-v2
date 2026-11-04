import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/errors';
import type { BulkOrderResultResponse } from '@/api/order/schema';
import type { Result } from '@/utils/try-catch';

import { APPROVE_ERROR_MESSAGE } from './guest-rules';
import {
  BULK_NOT_PROCESSED_MESSAGE,
  bulkFailureMessage,
  bulkResultMessage,
  runBulkOrders,
} from './useBulkOrderActions';

/** 일괄 실행부(백엔드 #929 B34) — 50건 나누기 · 처리되지 않은 주문만 다시 · 일괄 API가 없으면 단건 차례 호출 */

const okRes = (r: BulkOrderResultResponse): Result<BulkOrderResultResponse> => [r, null];
const fail = (status: number, code: string): Result<never> => [
  null,
  new ApiError(status, code, `${code} reason`),
];
const success = (orderUuid: string) => ({
  orderUuid,
  success: true,
  errorCode: null,
  reason: null,
});
const results = (rs: BulkOrderResultResponse['results']) =>
  okRes({
    succeeded: rs.filter((r) => r.success).length,
    failed: rs.filter((r) => !r.success).length,
    results: rs,
  });
const never = vi.fn(async () => fail(500, 'X'));

describe('runBulkOrders', () => {
  it('50건씩 나눠 보낸다', async () => {
    const uuids = Array.from({ length: 120 }, (_, i) => `o${i}`);
    const send = vi.fn(async (chunk: string[]) => results(chunk.map(success)));
    const out = await runBulkOrders('approve', uuids, send, never);
    expect(send.mock.calls.map(([c]) => c.length)).toEqual([50, 50, 20]);
    expect(out?.result).toEqual({ kind: 'approve', succeeded: 120, failed: [] });
  });

  it('실패 이유는 코드 문구 → 없으면 서버 reason', async () => {
    const send = vi.fn(async () =>
      results([
        success('a'),
        { orderUuid: 'b', success: false, errorCode: 'Ticket_Item_400_1', reason: '재고' },
        { orderUuid: 'c', success: false, errorCode: 'GLOBAL_500_1', reason: '서버 오류' },
      ]),
    );
    const out = await runBulkOrders('approve', ['a', 'b', 'c'], send, never);
    expect(out?.result.failed).toEqual([
      { orderUuid: 'b', message: APPROVE_ERROR_MESSAGE.Ticket_Item_400_1 },
      { orderUuid: 'c', message: '서버 오류' },
    ]);
    expect(bulkResultMessage(out!.result)).toBe('1건을 승인했어요. 2건은 승인하지 못했어요.');
  });

  it('ORDER_BULK_NOT_PROCESSED인 주문만 다시 보낸다, 하나도 처리되지 않으면 멈춘다', async () => {
    const np = (orderUuid: string) => ({
      orderUuid,
      success: false,
      errorCode: 'ORDER_BULK_NOT_PROCESSED',
      reason: '시간',
    });
    const send = vi
      .fn<(chunk: string[]) => Promise<Result<BulkOrderResultResponse>>>()
      .mockResolvedValueOnce(results([success('a'), np('b'), np('c')]))
      .mockResolvedValueOnce(results([success('b'), np('c')]))
      .mockResolvedValueOnce(results([np('c')]));
    const out = await runBulkOrders('refuse', ['a', 'b', 'c'], send, never);
    expect(send.mock.calls.map(([c]) => c)).toEqual([['a', 'b', 'c'], ['b', 'c'], ['c']]);
    expect(out?.result.succeeded).toBe(2);
    expect(out?.result.failed).toEqual([{ orderUuid: 'c', message: BULK_NOT_PROCESSED_MESSAGE }]);
  });

  it('일괄 API가 없으면(404 · 405) 단건을 차례로', async () => {
    const send = vi.fn(async () => fail(405, 'METHOD_NOT_ALLOWED'));
    const order: string[] = [];
    const sendOne = vi.fn(async (uuid: string): Promise<Result<unknown>> => {
      order.push(uuid);
      return uuid === 'b' ? fail(400, 'Order_400_3') : [{}, null];
    });
    const out = await runBulkOrders('approve', ['a', 'b'], send, sendOne);
    expect(send).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['a', 'b']);
    expect(out?.result.succeeded).toBe(1);
    expect(out?.result.failed).toEqual([
      { orderUuid: 'b', message: APPROVE_ERROR_MESSAGE.Order_400_3 },
    ]);
  });

  it('요청 전체가 실패하면 남은 주문 모두 그 이유', async () => {
    const send = vi.fn(async () => fail(400, 'Order_400_18'));
    const out = await runBulkOrders('refuse', ['a', 'b'], send, never);
    expect(out?.result.failed.map((f) => f.message)).toEqual([
      bulkFailureMessage('refuse', 'Order_400_18', null),
      bulkFailureMessage('refuse', 'Order_400_18', null),
    ]);
  });
});
