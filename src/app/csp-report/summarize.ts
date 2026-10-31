/**
 * CSP 위반 보고 → 로그 한 줄에 넣을 값(P14 보안). 보고 본문은 브라우저가 보내는 대로 두 모양이다:
 * `application/csp-report`(`{"csp-report": {...}}`, `report-uri`) · `application/reports+json`(Reporting API 배열).
 *
 * **주소는 남기지 않는다** — 문서 주소에는 선물 토큰(`/gifts/<토큰>`)·체크인 토큰(`?token=`)이 있다.
 * 문서는 화면 패턴(`/gifts/:param`, 쿼리 버림 — tech-decisions §13과 같은 취지), 막힌 것은 출처(`https://x.com`)나 키워드(`inline`·`eval`)만.
 */
export type CspViolationSummary = {
  directive: string;
  blocked: string;
  page: string;
  disposition: string;
};

const MAX = 80;
const clip = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX) : '');

/** 출처만. URL이 아니면(`inline`·`eval`·`data` 등) 키워드 그대로, 모양이 이상하면 `other` */
export function blockedSource(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return 'unknown';
  if (!raw.includes(':')) return /^[a-z-]{1,20}$/i.test(raw) ? raw : 'other';
  try {
    const url = new URL(raw);
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'wss:' ||
      url.protocol === 'ws:'
    ) {
      return url.origin;
    }
    return url.protocol.replace(':', '');
  } catch {
    return 'other';
  }
}

/** 바로 뒤 세그먼트가 id·토큰인 화면 경로(`/orders/<uuid>`, `/gifts/<토큰>` 등). 모양과 상관없이 가린다 */
const ID_PARENTS = new Set(['events', 'hosts', 'orders', 'gifts', 'notices', 'tickets']);
const WORD = /^[a-z][a-z-]{0,30}$/;

/** 화면 주소 → 패턴(`/hosting/events/:param/qr`). 쿼리·해시는 버린다 */
export function pagePattern(raw: unknown): string {
  if (typeof raw !== 'string') return 'unknown';
  let segs: string[];
  try {
    segs = new URL(raw).pathname.split('/').filter(Boolean);
  } catch {
    return 'unknown';
  }
  const out = segs.map((seg, i) => {
    const prev = segs[i - 1];
    if (prev !== undefined && ID_PARENTS.has(prev)) return ':param';
    return WORD.test(seg) ? seg : ':param';
  });
  return `/${out.join('/')}`;
}

type Fields = { directive: unknown; blocked: unknown; page: unknown; disposition: unknown };

function fieldsOf(body: unknown): Fields[] {
  if (Array.isArray(body)) {
    return body
      .filter((r): r is { type: unknown; body: Record<string, unknown> } =>
        Boolean(
          r &&
          typeof r === 'object' &&
          (r as { body?: unknown }).body &&
          typeof (r as { body?: unknown }).body === 'object',
        ),
      )
      .filter((r) => r.type === 'csp-violation')
      .map((r) => ({
        directive: r.body.effectiveDirective,
        blocked: r.body.blockedURL,
        page: r.body.documentURL,
        disposition: r.body.disposition,
      }));
  }
  const report = (body as { 'csp-report'?: unknown } | null)?.['csp-report'];
  if (!report || typeof report !== 'object') return [];
  const r = report as Record<string, unknown>;
  return [
    {
      directive: r['effective-directive'] ?? r['violated-directive'],
      blocked: r['blocked-uri'],
      page: r['document-uri'],
      disposition: r.disposition,
    },
  ];
}

/** 보고 본문(이미 JSON으로 읽은 값) → 요약. 모양이 틀리면 빈 배열. 한 번에 최대 10개 */
export function summarizeCspReport(body: unknown): CspViolationSummary[] {
  return fieldsOf(body)
    .slice(0, 10)
    .map((f) => ({
      directive: clip(f.directive).split(' ')[0] || 'unknown',
      blocked: blockedSource(f.blocked),
      page: pagePattern(f.page),
      disposition: clip(f.disposition) || 'unknown',
    }));
}
