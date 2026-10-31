import { describe, expect, it } from 'vitest';

import { tryCatch } from './try-catch';

describe('tryCatch', () => {
  it('성공은 [data, null]', async () => {
    expect(await tryCatch(Promise.resolve(3))).toEqual([3, null]);
  });

  it('실패는 throw하지 않고 [null, error] — 같은 에러 객체', async () => {
    const e = new TypeError('boom');
    const [data, error] = await tryCatch(Promise.reject(e));
    expect(data).toBeNull();
    expect(error).toBe(e);
  });

  it('Error가 아닌 값은 Error로 감싸고 cause에 원래 값', async () => {
    const [, error] = await tryCatch(Promise.reject('문자열'));
    expect(error).toBeInstanceOf(Error);
    expect(error?.cause).toBe('문자열');
  });

  it('구조분해한 뒤 error로 data의 타입이 좁혀진다', async () => {
    const [data, error] = await tryCatch(Promise.resolve({ n: 1 }));
    if (error) throw error;
    expect(data.n).toBe(1);
  });
});
