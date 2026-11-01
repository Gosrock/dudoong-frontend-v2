import { describe, expect, it, vi } from 'vitest';

import { errorToast } from '@/test/error-toast';

import { FALLBACK_ERROR_MESSAGE, VALIDATION_ERROR_MESSAGE } from './error-toast';
import { ApiError, SessionLostError } from './errors';
import { handleError, handlersFrom } from './handle-error';

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

describe('handlersFrom', () => {
  const TABLE = {
    Option_400_1: { field: 'name', message: '이름을 확인해 주세요' },
    Option_400_2: { field: 'price', message: '금액을 확인해 주세요' },
  } as const;

  it('표의 값·코드·에러로 처리기를 만든다', () => {
    const onCode = vi.fn();
    const e = new ApiError(400, 'Option_400_2', '금액');
    handleError(e, handlersFrom(TABLE, onCode));
    expect(onCode).toHaveBeenCalledExactlyOnceWith(TABLE.Option_400_2, 'Option_400_2', e);
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('다른 처리기와 펼쳐 합칠 수 있고, 표에 없는 코드는 공용 토스트', () => {
    const onCode = vi.fn();
    const ended = vi.fn();
    const handlers = { ...handlersFrom(TABLE, onCode), Event_400_17: ended };
    handleError(new ApiError(400, 'Event_400_17', '끝난 공연'), handlers);
    expect(ended).toHaveBeenCalledOnce();
    handleError(new ApiError(400, 'Option_400_9', '다른 실패'), handlers);
    expect(onCode).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith('다른 실패', 'mutation:Option_400_9');
  });
});
