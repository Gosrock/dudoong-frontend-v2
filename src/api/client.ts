import ky, { type KyInstance } from 'ky';
import type { z } from 'zod';

import { log } from '@/utils/log';

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

/** 응답 본문이 백엔드 래퍼(`{success, status, data | code, reason}`) 모양인지 본다. */
function isEnvelope(body: unknown): body is { success: boolean } & Record<string, unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { success?: unknown }).success === 'boolean'
  );
}

/**
 * 응답 래퍼를 벗기고 zod로 파싱한다. `ApiError.status`는 언제나 HTTP 상태다.
 * - 본문이 JSON이 아니면(nginx HTML 502 등) `NON_JSON`
 * - JSON이지만 래퍼 모양이 아니면 `BAD_ENVELOPE`
 * - 스키마와 맞지 않으면 `PARSE_ERROR`(구조화 로그를 남기고 던진다. 값은 남기지 않는다)
 */
export async function unwrap<T>(res: Response, schema: z.ZodType<T>, route: string): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, 'NON_JSON', '');
  }
  if (!isEnvelope(body)) throw new ApiError(res.status, 'BAD_ENVELOPE', '');
  if (!res.ok || !body.success) {
    const code = typeof body.code === 'string' ? body.code : 'UNKNOWN';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    throw new ApiError(res.status, code, reason);
  }
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    log('error', 'api.parse_failed', {
      route,
      issues: parsed.error.issues.map((i) => i.path.join('.')),
    });
    throw new ApiError(res.status, 'PARSE_ERROR', '');
  }
  return parsed.data;
}
