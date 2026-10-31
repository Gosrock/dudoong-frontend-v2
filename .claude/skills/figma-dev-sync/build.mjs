#!/usr/bin/env node
// 리포트 JSON을 검사하고 render.js 앞에 붙여 figma_execute에 넘길 코드를 만든다.
// node .claude/skills/figma-dev-sync/build.mjs <report.json> > <out.js>
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , input] = process.argv;
if (!input) {
  console.error('사용법: build.mjs <report.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, 'utf8'));
const errors = [];
const TAGS = ['확인 필요', 'Figma와 다름', '알림'];
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date ?? '')) errors.push('date는 YYYY-MM-DD');
for (const k of ['title', 'subtitle']) if (!data[k]) errors.push(`${k}가 없다`);
const keys = new Set();
for (const sec of data.sections ?? []) {
  for (const it of sec.items ?? []) {
    const where = `${sec.name} / ${it.title}`;
    if (!it.key || keys.has(it.key)) errors.push(`${where}: key가 없거나 겹친다`);
    keys.add(it.key);
    if (!TAGS.includes(it.tag)) errors.push(`${where}: tag는 ${TAGS.join(' | ')}`);
    for (const f of ['title', 'what', 'why']) if (!it[f]) errors.push(`${where}: ${f}가 없다`);
    for (const l of it.links ?? []) {
      if (!['gui', 'ds'].includes(l.file)) errors.push(`${where}: link.file은 gui | ds`);
      if (!l.label) errors.push(`${where}: link.label이 없다`);
      if (!l.node && !(l.file === 'gui' && l.name)) errors.push(`${where}: link.node(또는 gui면 name)가 없다`);
      if (/\d+:\d+/.test(l.label)) errors.push(`${where}: label에 노드 id를 쓰지 않는다(사람이 읽는 이름)`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
process.stdout.write(`const DATA = ${JSON.stringify(data)};\n` + readFileSync(join(here, 'render.js'), 'utf8'));
