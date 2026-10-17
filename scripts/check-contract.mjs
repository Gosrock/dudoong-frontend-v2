#!/usr/bin/env node
// pnpm check:contract — 운영(기본 https://dudoong.com/api/v2)의 공개 GET 9개를 한 번씩 불러 zod 스키마로 파싱한다.
// 네트워크가 필요해 `pnpm test`(PR 게이트)에 넣지 않는다. 쿠키·토큰 없이 GET만 부른다.
//
// - id가 필요한 경로는 GP-1·GP-2 응답에서 실제 id를 고른다
// - GG-3(선물 랜딩)은 실제 토큰이 있어야 한다: CONTRACT_GIFT_TOKEN=<토큰> pnpm check:contract. 없으면 "미확인"
// - 출력에는 값을 넣지 않는다(개인정보·토큰). 실패는 zod issue의 경로, 모르는 enum은 UNKNOWN이 된 필드 경로만 남긴다
// - 대상 바꾸기: CONTRACT_BASE_URL=https://staging.dudoong.com/api/v2 pnpm check:contract
import './ts-import.mjs';

const BASE = (process.env.CONTRACT_BASE_URL ?? 'https://dudoong.com/api/v2').replace(/\/+$/, '');
const TIMEOUT_MS = 15_000;

const event = await import('../src/api/event/schema.ts');
const ticket = await import('../src/api/ticket-item/schema.ts');
const host = await import('../src/api/host/schema.ts');
const gift = await import('../src/api/gift/schema.ts');

// openEnum은 모르는 값을 UNKNOWN으로 바꾸며 경고 로그를 남긴다 — 결과에서 따로 찾아 보여 주므로 로그는 숨긴다
const warn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('api.unknown_enum')) return;
  warn(...args);
};

/** 값 없이 경로만. 배열 인덱스는 `[]`로 합친다 */
const pathOf = (segments) =>
  segments
    .map((s) => (typeof s === 'number' ? '[]' : String(s)))
    .join('.')
    .replace(/\.\[\]/g, '[]') || '(root)';

function unknownEnumPaths(value, segments = [], out = new Set()) {
  if (value === 'UNKNOWN') out.add(pathOf(segments));
  else if (Array.isArray(value))
    value.forEach((v, i) => unknownEnumPaths(v, [...segments, i], out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) unknownEnumPaths(v, [...segments, k], out);
  }
  return out;
}

async function call(path) {
  const res = await fetch(`${BASE}/${path}`, {
    credentials: 'omit',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { http: res.status, error: 'JSON이 아님' };
  }
  if (!body || typeof body.success !== 'boolean')
    return { http: res.status, error: '래퍼 모양이 아님' };
  if (!res.ok || !body.success) return { http: res.status, error: `실패 응답 ${body.code}` };
  return { http: res.status, data: body.data };
}

const results = [];

/** 한 엔드포인트. 파싱한 값을 돌려줘 다음 호출의 id를 고르게 한다 */
async function check(id, label, path, schema) {
  let r;
  try {
    r = await call(path);
  } catch (e) {
    results.push({
      id,
      label,
      ok: false,
      detail: [`요청 실패: ${e instanceof Error ? e.name : 'error'}`],
    });
    return null;
  }
  if (r.error) {
    results.push({ id, label, ok: false, detail: [`HTTP ${r.http} ${r.error}`] });
    return null;
  }
  const parsed = schema.safeParse(r.data);
  if (!parsed.success) {
    const paths = [...new Set(parsed.error.issues.map((i) => `${pathOf(i.path)} — ${i.code}`))];
    results.push({ id, label, ok: false, detail: paths });
    return null;
  }
  const unknown = [...unknownEnumPaths(parsed.data)];
  results.push({
    id,
    label,
    ok: true,
    detail: unknown.length ? unknown.map((p) => `모르는 enum 값(UNKNOWN): ${p}`) : [],
  });
  return parsed.data;
}

const skip = (id, label, why) => results.push({ id, label, ok: null, detail: [why] });

// ─── 호출 ────────────────────────────────────────────────────

await check('GE-11', '태그', 'tags', event.TagGroupsSchema);
const home = await check('GP-1', '공연홈', 'home', event.HomeSchema);
const list = await check(
  'GP-2',
  '공연 리스트(includePast, 50개)',
  'events?includePast=true&size=50',
  event.EventListPageSchema,
);

const eventId = home?.events[0]?.eventId ?? list?.content[0]?.eventId;
let hostId;
if (eventId !== undefined) {
  const detail = await check('GP-3', '공연 상세', `events/${eventId}`, event.EventDetailSchema);
  hostId = detail?.host.hostId;
  await check(
    'GP-5',
    '판매 중 티켓',
    `events/${eventId}/ticket-items`,
    ticket.PublicTicketItemsSchema,
  );
  await check('GE-5', '섹션', `events/${eventId}/sections`, event.EventSectionsSchema);
} else {
  for (const [id, label] of [
    ['GP-3', '공연 상세'],
    ['GP-5', '판매 중 티켓'],
    ['GE-5', '섹션'],
  ]) {
    skip(id, label, 'GP-1·GP-2에서 공연 id를 얻지 못했다');
  }
}

if (hostId !== undefined) {
  // 익명 응답이지만 사용자별 필드(isFollowing·myRole)도 키가 있어야 하므로 viewer 스키마로 본다
  await check('GH-3', '호스트 홈', `hosts/${hostId}`, host.HostViewerSchema);
  await check(
    'GH-14',
    '호스트 공연 목록(50개)',
    `hosts/${hostId}/events?size=50`,
    host.HostEventPageSchema,
  );
} else {
  skip('GH-3', '호스트 홈', 'GP-3에서 호스트 id를 얻지 못했다');
  skip('GH-14', '호스트 공연 목록', 'GP-3에서 호스트 id를 얻지 못했다');
}

const giftToken = process.env.CONTRACT_GIFT_TOKEN;
if (giftToken) {
  await check(
    'GG-3',
    '선물 랜딩',
    `gifts/${encodeURIComponent(giftToken)}`,
    gift.GiftLandingViewerSchema,
  );
} else {
  skip('GG-3', '선물 랜딩', '미확인 — 실제 선물 토큰이 없다(CONTRACT_GIFT_TOKEN)');
}

// ─── 결과 ────────────────────────────────────────────────────

console.log(`\n계약 확인 — ${BASE} (${new Date().toISOString()})\n`);
for (const r of results) {
  const mark = r.ok === null ? '건너뜀' : r.ok ? '통과' : '실패';
  console.log(`${mark.padEnd(4)} ${r.id.padEnd(6)} ${r.label}`);
  for (const d of r.detail) console.log(`       - ${d}`);
}
const failed = results.filter((r) => r.ok === false).length;
const passed = results.filter((r) => r.ok === true).length;
console.log(`\n통과 ${passed} · 실패 ${failed} · 건너뜀 ${results.length - passed - failed}`);
if (failed) process.exitCode = 1;
