#!/usr/bin/env node
// svg/*.svg → registry.ts. 실행: node src/ui/icons/generate.mjs
//
// 1. Figma 기본 이름으로 내보낸 파일(`name=home, type=outline, size=24.svg`)은 `<key>-<type>-<size>.svg`로 바꾼다.
// 2. 각 SVG를 정리해 파일에 다시 쓴다(여러 번 돌려도 결과가 같다).
//    - width/height 제거, viewBox 유지
//    - 색이 하나뿐인 아이콘은 fill/stroke를 모두 currentColor로
//    - 색이 여럿이거나 그라데이션이 있는 아이콘(다색)은 본문 잉크색(#141413)만 currentColor로, 강조색은 그대로
//    - id(clipPath·gradient)는 파일 이름을 앞에 붙여 아이콘끼리 겹치지 않게
// 3. registry.ts(키 → viewBox·body)와 이름·크기·변형 조합 타입을 만든다.
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const svgDir = join(here, 'svg');
const outFile = join(here, 'registry.ts');

// Figma `ic` 세트(36:178)의 name 값 → 코드 키. 여기 없는 이름은 소문자·kebab-case로 바꾼다.
const FIGMA_NAME_MAP = {
  notificatio_onn: 'notification-on',
  Ticket: 'ticket',
  'Ticket-alert': 'ticket-alert',
  Settings: 'settings',
  'up down': 'up-down',
  'order detail': 'order-detail',
  'open chat': 'open-chat',
  image_add: 'image-add',
};

// 다색 아이콘에서 currentColor로 바꿀 본문 색(Figma `text/primary-label` 계열)
const INK = new Set(['#141413']);

const FILE_RE = /^(.+)-(outline|filled)-(12|16|24)\.svg$/;
const FIGMA_FILE_RE = /^name=(.+), type=(outline|filled), size=(12|16|24)\.svg$/;

const toKey = (figmaName) =>
  FIGMA_NAME_MAP[figmaName] ??
  figmaName
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

function renameFigmaExports() {
  for (const file of readdirSync(svgDir)) {
    const m = FIGMA_FILE_RE.exec(file);
    if (!m) continue;
    const [, name, type, size] = m;
    const next = `${toKey(name)}-${type}-${size}.svg`;
    renameSync(join(svgDir, file), join(svgDir, next));
    console.log(`rename: ${file} → ${next}`);
  }
}

const COLOR_ATTR_RE = /\b(fill|stroke|stop-color)="([^"]+)"/g;

function normalize(svg, idPrefix) {
  const root = /<svg\b([^>]*)>/.exec(svg);
  if (!root) throw new Error('no <svg> root');
  const attrs = root[1];
  const viewBox = /viewBox="([^"]+)"/.exec(attrs)?.[1];
  if (!viewBox) throw new Error('no viewBox');
  const overflow = /overflow="visible"/.test(attrs);

  let body = svg
    .slice(root.index + root[0].length, svg.lastIndexOf('</svg>'))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

  // id 충돌 방지
  const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    if (id.startsWith(`${idPrefix}-`)) continue;
    const next = `${idPrefix}-${id}`;
    body = body.replaceAll(`id="${id}"`, `id="${next}"`).replaceAll(`url(#${id})`, `url(#${next})`);
  }

  // 색
  const colors = new Set();
  // clipPath·mask 안의 색은 그려지지 않으므로 다색 판정에서 뺀다
  const painted = body.replace(/<(clipPath|mask)\b[\s\S]*?<\/\1>/g, '');
  for (const [, , value] of painted.matchAll(COLOR_ATTR_RE)) {
    if (value === 'none' || value.startsWith('url(')) continue;
    colors.add(
      value === 'currentColor' ? value : value.toUpperCase().replace(/^WHITE$/, '#FFFFFF'),
    );
  }
  const hasGradient = /(fill|stroke)="url\(#/.test(body);
  const multicolor = hasGradient || colors.size > 1;
  body = body.replace(COLOR_ATTR_RE, (all, attr, value) => {
    if (value === 'none' || value.startsWith('url(') || value === 'currentColor') return all;
    if (!multicolor || INK.has(value.toUpperCase())) return `${attr}="currentColor"`;
    return all;
  });

  const file =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"` +
    `${overflow ? ' overflow="visible"' : ''}>\n${body}\n</svg>\n`;
  return { file, viewBox, overflow, multicolor, body: body.replace(/\n/g, '') };
}

function main() {
  renameFigmaExports();
  const entries = [];
  for (const file of readdirSync(svgDir).sort()) {
    if (!file.endsWith('.svg')) continue;
    const m = FILE_RE.exec(file);
    if (!m)
      throw new Error(`파일 이름 규칙(<key>-<outline|filled>-<12|16|24>.svg)에 맞지 않음: ${file}`);
    const [, name, variant, size] = m;
    const path = join(svgDir, file);
    const src = readFileSync(path, 'utf8');
    const n = normalize(src, file.replace(/\.svg$/, ''));
    if (n.file !== src) writeFileSync(path, n.file);
    if (n.viewBox !== `0 0 ${size} ${size}`) {
      console.warn(`warn: ${file} viewBox가 "${n.viewBox}"다(0 0 ${size} ${size}이어야 함)`);
    }
    entries.push({ name, variant, size: Number(size), ...n });
  }

  const names = [...new Set(entries.map((e) => e.name))].sort();
  const union = entries
    .map((e) => {
      const v = e.variant === 'outline' ? `variant?: 'outline'` : `variant: '${e.variant}'`;
      const s = e.size === 24 ? `size?: 24` : `size: ${e.size}`;
      return `  | { name: '${e.name}'; ${v}; ${s} }`;
    })
    .join('\n');
  const records = entries
    .map((e) => {
      // prettier(singleQuote) 출력과 같게 쓴다
      const body = `'${e.body.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      const lines = [`viewBox: '${e.viewBox}'`, `body: ${body}`];
      if (e.overflow) lines.push('overflow: true');
      if (e.multicolor) lines.push('multicolor: true');
      return `  '${e.name}/${e.variant}/${e.size}': {\n${lines.map((l) => `    ${l},\n`).join('')}  },`;
    })
    .join('\n');

  const ts = `// 생성 파일 — 직접 고치지 말 것. node src/ui/icons/generate.mjs 로 다시 만든다.
// 원본: src/ui/icons/svg/*.svg (Figma 디자인 시스템 ic 세트 36:178)

export type IconName =
${names.map((n) => `  | '${n}'`).join('\n')};

export type IconVariant = 'outline' | 'filled';
export type IconSize = 12 | 16 | 24;

/** Figma에 있는 (name, variant, size) 조합만 허용한다. variant 기본값 'outline', size 기본값 24. */
export type IconSpec =
${union};

export type IconEntry = {
  viewBox: string;
  body: string;
  /** 배지가 틀 밖으로 나가는 아이콘(ticket-alert) */
  overflow?: true;
  /** 강조색을 원래 색으로 유지하는 다색 아이콘 */
  multicolor?: true;
};

export const icons: Record<string, IconEntry> = {
${records}
};

export const iconList = [
${entries.map((e) => `  { name: '${e.name}', variant: '${e.variant}', size: ${e.size} },`).join('\n')}
] as const satisfies readonly IconSpec[];
`;
  writeFileSync(outFile, ts);
  console.log(`registry.ts: ${entries.length} icons (${names.length} names)`);
}

main();
