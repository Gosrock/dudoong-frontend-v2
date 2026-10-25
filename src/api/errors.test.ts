import { describe, expect, it } from 'vitest';

import {
  ApiError,
  getErrorCode,
  getErrorStatus,
  isForbidden,
  isNotFound,
  isSessionLost,
  isUnauthorized,
  SessionLostError,
} from './errors';

describe('getErrorCode', () => {
  it('ApiError면 code', () => {
    expect(getErrorCode(new ApiError(400, 'Order_400_22', ''))).toBe('Order_400_22');
    expect(getErrorCode(new ApiError(0, 'NETWORK', ''))).toBe('NETWORK');
    expect(getErrorCode(new SessionLostError())).toBe('SESSION_LOST');
  });

  it('무엇을 받아도 throw하지 않고 null', () => {
    for (const e of [
      null,
      undefined,
      'x',
      0,
      {},
      { code: 'FAKE' },
      new Error('x'),
      new TypeError(),
    ]) {
      expect(() => getErrorCode(e)).not.toThrow();
      expect(getErrorCode(e)).toBeNull();
    }
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(getErrorCode(revoked.proxy)).toBeNull();
  });
});

describe('HTTP 상태 판별', () => {
  it('HTTP 상태로 판별한다(본문 status가 아니다)', () => {
    expect(isUnauthorized(new ApiError(401, 'AUTH_401_2', ''))).toBe(true);
    expect(isUnauthorized(new ApiError(401, 'GLOBAL_401_1', ''))).toBe(true);
    expect(isUnauthorized(new ApiError(403, 'AUTH_403_2', ''))).toBe(false);
    expect(isForbidden(new ApiError(403, 'HOST_400_2', ''))).toBe(true);
    expect(isNotFound(new ApiError(404, 'Event_404_1', ''))).toBe(true);
    expect(isNotFound(new ApiError(400, 'Event_404_1', ''))).toBe(false);
  });

  it('ApiError가 아니면 거짓, 상태는 null', () => {
    expect(isUnauthorized(new Error('401'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
    expect(getErrorStatus({ status: 404 })).toBeNull();
    expect(getErrorStatus(new ApiError(0, 'TIMEOUT', ''))).toBe(0);
  });

  it('SessionLostError는 401이면서 따로 판별된다', () => {
    const e = new SessionLostError();
    expect(isSessionLost(e)).toBe(true);
    expect(isUnauthorized(e)).toBe(true);
    expect(isSessionLost(new ApiError(401, 'AUTH_401_1', ''))).toBe(false);
  });
});
