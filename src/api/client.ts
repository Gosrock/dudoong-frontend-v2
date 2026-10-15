import ky, { type KyInstance } from 'ky';
import type { z } from 'zod';

import { ApiError } from './errors';

/**
 * ky 인스턴스. 기준 주소 없이 만들고 `http.ts`가 요청마다 `prefix`를 넘긴다(tech-decisions §4·§12).
 * 에러 변환은 훅이 아니라 여기서 한다(ky 2.x에서 beforeError 변환이 동작하지 않았다 — §22).
 * 401 재발급(Web Locks, dd:session)은 P4a에서 여기에 붙는다.
 */
export const kyBase: KyInstance = ky.create({
  throwHttpErrors: false,
  retry: 0,
  credentials: 'include',
});

type Envelope =
  | { success: true; status: number; data: unknown }
  | {
      success: false;
      status: number;
      code: string;
      reason: string;
    };

/** 응답 래퍼를 벗기고 zod로 파싱한다. 본문이 JSON이 아니면(nginx HTML 502 등) `NON_JSON`. */
export async function unwrap<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  let body: Envelope;
  try {
    body = (await res.json()) as Envelope;
  } catch {
    throw new ApiError(res.status, 'NON_JSON', '');
  }
  if (!res.ok || !body.success) {
    const code = 'code' in body ? body.code : 'UNKNOWN';
    const reason = 'reason' in body ? body.reason : '';
    throw new ApiError(res.status, code, reason);
  }
  return schema.parse(body.data);
}
