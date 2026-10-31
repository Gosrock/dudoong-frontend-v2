import { describe, expect, it, vi } from 'vitest';

import { ApiError, SessionLostError } from './errors';
import { handleCodes, isHandledByScreen } from './handle-codes';

describe('handleCodes', () => {
  it('meta.handledCodes를 처리 함수의 키에서 만든다', () => {
    const { meta } = handleCodes({ Order_400_22: () => {}, Order_400_23: () => {} });
    expect(meta.handledCodes).toEqual(['Order_400_22', 'Order_400_23']);
  });

  it('맞는 코드의 처리 함수만 부른다', () => {
    const a = vi.fn();
    const b = vi.fn();
    const { onError } = handleCodes({ Order_400_22: a, Order_400_23: b });
    const e = new ApiError(400, 'Order_400_22', '입금자명');
    onError(e);
    expect(a).toHaveBeenCalledWith(e);
    expect(b).not.toHaveBeenCalled();
  });

  it('목록에 없는 코드·ApiError가 아닌 값·프로토타입 키는 무시한다', () => {
    const a = vi.fn();
    const { onError } = handleCodes({ Order_400_22: a });
    expect(() => onError(new ApiError(400, 'Order_400_24', ''))).not.toThrow();
    expect(() => onError(new ApiError(400, 'toString', ''))).not.toThrow();
    expect(() => onError(new Error('x'))).not.toThrow();
    expect(() => onError(null)).not.toThrow();
    expect(a).not.toHaveBeenCalled();
  });
});

describe('isHandledByScreen', () => {
  const e = new ApiError(400, 'Order_400_22', '');
  it('handledCodes에 코드가 있거나 meta.handled면 참', () => {
    expect(isHandledByScreen(handleCodes({ Order_400_22: () => {} }).meta, e)).toBe(true);
    expect(isHandledByScreen({ handled: true }, new Error('x'))).toBe(true);
  });
  it('그 밖은 거짓', () => {
    expect(isHandledByScreen(undefined, e)).toBe(false);
    expect(isHandledByScreen({ handledCodes: ['Order_400_23'] }, e)).toBe(false);
    expect(isHandledByScreen({ handledCodes: 'Order_400_22' }, e)).toBe(false);
    expect(isHandledByScreen({ handledCodes: ['SESSION_LOST'] }, new Error('x'))).toBe(false);
    expect(isHandledByScreen({}, new SessionLostError())).toBe(false);
  });
});
