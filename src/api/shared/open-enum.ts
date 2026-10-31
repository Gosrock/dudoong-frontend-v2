import { z } from 'zod';

import { log } from '@/utils/log';

/**
 * 서버 enum을 열린 타입으로 받는다(tech-decisions §4 zod 정책).
 * - 문자열이지만 모르는 값 → `'UNKNOWN'`으로 바꾸고 로그를 남긴다(값은 남기지 않는다)
 * - 문자열이 아니거나 필드가 없으면 → 계약 위반이라 파싱 실패로 둔다(`PARSE_ERROR`)
 * 모든 매핑에는 UNKNOWN 분기를 둔다.
 */
const warned = new Set<string>();

export function openEnum<const T extends readonly [string, ...string[]]>(name: string, values: T) {
  return z.string().pipe(
    z.enum([...values, 'UNKNOWN']).catch(() => {
      // 같은 enum은 프로세스(탭)마다 한 번만 남긴다 — 항목마다 반복되면 로그가 넘친다
      if (!warned.has(name)) {
        warned.add(name);
        log('warn', 'api.unknown_enum', { name });
      }
      return 'UNKNOWN' as const;
    }),
  );
}
