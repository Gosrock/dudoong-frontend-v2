#!/usr/bin/env node
/**
 * 라우트별 First Load JS(압축 전 · gzip)와 큰 의존성이 어느 라우트의 첫 로드에 실리는지 표로 낸다(P14 성능).
 * Next 16(Turbopack) `next build` 출력에는 First Load JS 칸이 없어서 `.next/diagnostics/route-bundle-stats.json`을 읽는다.
 *
 *   pnpm build && node scripts/bundle-stats.mjs            # 표
 *   node scripts/bundle-stats.mjs --json > before.json     # 비교용 저장
 *   node scripts/bundle-stats.mjs --compare before.json    # 전/후 표
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const STATS = '.next/diagnostics/route-bundle-stats.json';

// 청크 본문에서 찾을 표식 — 패키지 고유 문자열(번들 안에 남는 것)
const HEAVY = {
  tiptap: /prosemirror|@tiptap|tiptap/i,
  'qr-code-styling': /qr-code-styling|QRCodeStyling/,
  'qr-scanner(zxing)': /zxing|BarcodeDetector|react-qr-scanner/i,
  vaul: /vaul-drawer|data-vaul/,
  'react-table': /getCoreRowModel|@tanstack\/table/,
  marked: /marked|Lexer\.lex|walkTokens/,
  'sanitize-html': /sanitize-html|allowedTags/,
  zod: /ZodError|_zod/,
  'react-hook-form': /useFormContext|react-hook-form/,
  kakaoSDK: /dapi\.kakao\.com|t1\.kakaocdn\.net/,
};

const args = process.argv.slice(2);
const stats = JSON.parse(readFileSync(STATS, 'utf8'));
const cache = new Map();
function chunk(path) {
  if (!cache.has(path)) {
    const buf = readFileSync(path);
    const text = buf.toString('utf8');
    cache.set(path, {
      raw: buf.length,
      gz: gzipSync(buf).length,
      heavy: Object.entries(HEAVY)
        .filter(([, re]) => re.test(text))
        .map(([k]) => k),
    });
  }
  return cache.get(path);
}

const rows = stats
  .map((r) => {
    const cs = r.firstLoadChunkPaths.map(chunk);
    return {
      route: r.route,
      raw: cs.reduce((a, c) => a + c.raw, 0),
      gz: cs.reduce((a, c) => a + c.gz, 0),
      heavy: [...new Set(cs.flatMap((c) => c.heavy))].sort(),
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const kb = (n) => (n / 1024).toFixed(0);

if (args[0] === '--json') {
  process.stdout.write(JSON.stringify(rows, null, 2));
} else if (args[0] === '--compare') {
  const before = new Map(JSON.parse(readFileSync(args[1], 'utf8')).map((r) => [r.route, r]));
  console.log('| 라우트 | 전 gzip KB | 후 gzip KB | 차이 | 후 첫 로드의 큰 의존성 |');
  console.log('|---|---:|---:|---:|---|');
  for (const r of rows) {
    const b = before.get(r.route);
    const d = b ? r.gz - b.gz : 0;
    console.log(
      `| \`${r.route}\` | ${b ? kb(b.gz) : '—'} | ${kb(r.gz)} | ${d === 0 ? '0' : (d > 0 ? '+' : '') + kb(d)} | ${r.heavy.join(', ')} |`,
    );
  }
} else {
  console.log('| 라우트 | First Load JS (KB, 압축 전) | gzip KB | 첫 로드의 큰 의존성 |');
  console.log('|---|---:|---:|---|');
  for (const r of rows)
    console.log(`| \`${r.route}\` | ${kb(r.raw)} | ${kb(r.gz)} | ${r.heavy.join(', ')} |`);
}
