import { log } from '@/utils/log';

import { summarizeCspReport } from './summarize';

/** 보고 하나가 이보다 크면 읽지 않는다(누구나 보낼 수 있는 주소 — 로그를 키우지 않게) */
const MAX_BYTES = 16 * 1024;

/**
 * CSP 위반 보고 받기(`report-uri`, `src/utils/csp.ts`). 구조화 로그 `csp.violation`만 남기고 204.
 * 주소·토큰은 남기지 않는다(`summarize.ts`). 응답은 언제나 204 — 보고하는 브라우저에 아무것도 알려 주지 않는다.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) return new Response(null, { status: 204 });
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return new Response(null, { status: 204 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }
  for (const v of summarizeCspReport(body)) log('warn', 'csp.violation', v);
  return new Response(null, { status: 204 });
}
