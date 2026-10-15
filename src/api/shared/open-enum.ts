import { z } from 'zod';

import { log } from '@/utils/log';

/**
 * 서버 enum을 열린 타입으로 받는다. 모르는 값은 `'UNKNOWN'`으로 바꾸고 로그를 남긴다(값은 남기지 않는다).
 * 모든 매핑에는 UNKNOWN 분기를 둔다(tech-decisions §4 zod 정책).
 */
export function openEnum<const T extends readonly [string, ...string[]]>(name: string, values: T) {
  return z.enum([...values, 'UNKNOWN']).catch((ctx) => {
    log('warn', 'zod.unknown_enum', {
      name,
      issues: ctx.issues.map((i) => (i.path ?? []).join('.')),
    });
    return 'UNKNOWN' as const;
  });
}
