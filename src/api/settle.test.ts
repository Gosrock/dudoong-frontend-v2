import { describe, expect, it, vi } from 'vitest';

import { errorToast } from '@/test/error-toast';

import { FALLBACK_ERROR_MESSAGE, VALIDATION_ERROR_MESSAGE } from './error-toast';
import { ApiError, SessionLostError } from './errors';
import { handleError, settle } from './settle';

describe('settle', () => {
  it('성공은 { ok: true, data }', async () => {
    expect(await settle(Promise.resolve(3))).toEqual({ ok: true, data: 3 });
  });

  it('실패는 throw하지 않고 { ok: false, error } — 에러가 아닌 값도', async () => {
    const e = new ApiError(400, 'X', 'x');
    expect(await settle(Promise.reject(e))).toEqual({ ok: false, error: e });
    expect(await settle(Promise.reject(undefined))).toEqual({ ok: false, error: undefined });
  });
});

describe('handleError', () => {
  it('표에 있는 코드는 그 처리만 하고 토스트하지 않는다', () => {
    const a = vi.fn();
    const b = vi.fn();
    const e = new ApiError(400, 'Order_400_22', '입금자명');
    handleError(e, { Order_400_22: a, Order_400_23: b });
    expect(a).toHaveBeenCalledWith(e);
    expect(b).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('표에 없으면 공용 토스트(reason), id는 mutation:<코드>', () => {
    handleError(new ApiError(400, 'Order_400_24', '취소할 수 없어요'), { Order_400_22: vi.fn() });
    expect(errorToast).toHaveBeenCalledWith('취소할 수 없어요', 'mutation:Order_400_24');
  });

  it('reason이 비었거나 ApiError가 아니면 고정 문구', () => {
    handleError(new ApiError(0, 'NETWORK', ''));
    expect(errorToast).toHaveBeenLastCalledWith(FALLBACK_ERROR_MESSAGE, 'mutation:NETWORK');
    handleError(new TypeError('boom'));
    expect(errorToast).toHaveBeenLastCalledWith(FALLBACK_ERROR_MESSAGE, 'mutation:UNKNOWN');
  });

  it.each([
    ['BAD_REQUEST', '{"email":"비어 있을 수 없습니다"}'],
    ['BAD_REQUEST', 'Bad Request'],
    ['GLOBAL_400_1', '검증 오류'],
  ])('검증 실패(%s)는 reason(%s)이 아니라 고정 문구', (code, reason) => {
    handleError(new ApiError(400, code, reason));
    expect(errorToast).toHaveBeenCalledWith(VALIDATION_ERROR_MESSAGE, `mutation:${code}`);
  });

  it('세션 상실은 아무것도 하지 않는다(표·otherwise도 부르지 않는다)', () => {
    const handler = vi.fn();
    const otherwise = vi.fn();
    handleError(new SessionLostError(), { SESSION_LOST: handler }, { otherwise });
    expect(handler).not.toHaveBeenCalled();
    expect(otherwise).not.toHaveBeenCalled();
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('otherwise가 있으면 표에 없는 에러를 토스트 대신 맡는다', () => {
    const otherwise = vi.fn();
    const e = new ApiError(500, 'X', 'x');
    handleError(e, {}, { otherwise });
    expect(otherwise).toHaveBeenCalledWith(e);
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('프로토타입 키·ApiError가 아닌 값은 표와 맞추지 않는다', () => {
    const handler = vi.fn();
    handleError(new ApiError(400, 'toString', ''), {});
    handleError(null, { toString: handler });
    expect(handler).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledTimes(2);
  });
});
