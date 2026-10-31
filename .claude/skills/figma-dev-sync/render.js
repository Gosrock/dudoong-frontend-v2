// figma_execute로 실행한다. build.mjs가 맨 앞에 `const DATA = {...};`를 붙인다.
// GUI 파일 "개발 싱크용" 페이지에 리포트 섹션을 그린다. 같은 날짜 섹션이 있으면 지우고 다시 그린다.
// 결과: { sectionId, cards: { [카드 key]: 카드 노드 id }, missing: [찾지 못한 GUI 링크] }
const PAGE_ID = '794:3162';
const DS_KEY = '0QD9tGSt8ZciDqe7ol2gYH';
const F = 'Noto Sans KR'; // 어느 PC에서나 있는 글꼴(Pretendard는 설치 안 된 PC가 있다)
await Promise.all(['Regular', 'Medium', 'Bold'].map(s => figma.loadFontAsync({ family: F, style: s })));
await figma.loadAllPagesAsync();
const page = figma.root.children.find(p => p.id === PAGE_ID);
if (!page) throw new Error('개발 싱크용 페이지(794:3162)가 없다');
await figma.setCurrentPageAsync(page);

const hex = h => { const n = parseInt(h.slice(1), 16); return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }; };
const fill = h => [{ type: 'SOLID', color: hex(h) }];
const C = { ink: '#141413', sub: '#5F5E5A', line: '#E4E3DF', bg: '#F7F7F6', card: '#FFFFFF', link: '#3D38C9' };
const TAG = { '확인 필요': ['#FFF1E8', '#B54708'], 'Figma와 다름': ['#EEF0FF', '#3F37C9'], '알림': ['#EEF7EE', '#2B6B2F'] };
const LEGEND = [['확인 필요', '디자인 답이 오면 바꿉니다'], ['Figma와 다름', 'Figma 값을 일부러 바꿔 구현했습니다'], ['알림', '그대로 두어도 되는 정보성 결정']];

function text(chars, size, style = 'Regular', color = C.ink, width) {
  const t = figma.createText();
  t.fontName = { family: F, style }; t.fontSize = size;
  t.lineHeight = { unit: 'PERCENT', value: 150 };
  t.characters = chars; t.fills = fill(color);
  if (width) { t.textAutoResize = 'HEIGHT'; t.resize(width, t.height); }
  return t;
}
function stack(name, dir, gap, pad = 0) {
  const f = figma.createFrame();
  f.name = name; f.layoutMode = dir; f.itemSpacing = gap;
  f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = pad;
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  f.fills = [];
  return f;
}
function chip(label) {
  const [bg, fg] = TAG[label] || ['#F0F0F0', C.sub];
  const c = stack('tag', 'HORIZONTAL', 0);
  c.paddingLeft = c.paddingRight = 8; c.paddingTop = c.paddingBottom = 2;
  c.cornerRadius = 999; c.fills = fill(bg);
  c.appendChild(text(label, 12, 'Medium', fg));
  return c;
}

// 링크 대상: GUI 노드는 같은 파일 링크(지금 있는지 확인하고, 없으면 이름으로 찾는다), DS 노드는 URL
const missing = [];
async function resolveLink(l) {
  if (l.file === 'ds') return { type: 'URL', value: `https://www.figma.com/design/${DS_KEY}/?node-id=${l.node.replace(':', '-')}` };
  let n = l.node ? await figma.getNodeByIdAsync(l.node) : null;
  if (!n && l.name) {
    for (const p of figma.root.children) {
      n = p.findOne(x => (x.type === 'FRAME' || x.type === 'COMPONENT' || x.type === 'INSTANCE') && x.name === l.name);
      if (n) break;
    }
  }
  if (!n) { missing.push(`${l.label} (${l.node || ''} ${l.name || ''})`); return null; }
  l.resolved = n.id; // 코멘트 단계가 쓴다
  return { type: 'NODE', value: n.id };
}

const sectionName = `개발이 정한 것 — ${DATA.date}`;
page.children.filter(n => n.name === sectionName).forEach(n => n.remove());
const bottom = page.children.reduce((m, n) => Math.max(m, n.y + n.height), -120);

const W = 1200, CARD = 357, INNER = CARD - 40;
const root = stack(sectionName, 'VERTICAL', 32, 48);
root.fills = fill(C.bg); root.cornerRadius = 16;
root.counterAxisSizingMode = 'FIXED'; root.resize(W, 100);

const head = stack('header', 'VERTICAL', 8);
head.appendChild(text(DATA.title, 32, 'Bold'));
head.appendChild(text(DATA.subtitle, 15, 'Regular', C.sub, W - 96));
const legend = stack('legend', 'HORIZONTAL', 16);
for (const [k, v] of LEGEND) {
  const l = stack(k, 'HORIZONTAL', 6); l.counterAxisAlignItems = 'CENTER';
  l.appendChild(chip(k)); l.appendChild(text(v, 13, 'Regular', C.sub)); legend.appendChild(l);
}
head.appendChild(legend);
root.appendChild(head);

const cards = {};
const resolved = {};
for (const sec of DATA.sections) {
  const s = stack(sec.name, 'VERTICAL', 16);
  s.appendChild(text(sec.name, 20, 'Bold'));
  const grid = stack('cards', 'HORIZONTAL', 16);
  grid.layoutWrap = 'WRAP'; grid.counterAxisSpacing = 16;
  grid.primaryAxisSizingMode = 'FIXED'; grid.resize(W - 96, 100); grid.counterAxisSizingMode = 'AUTO';
  for (const it of sec.items) {
    const c = stack(it.title, 'VERTICAL', 10, 20);
    c.fills = fill(C.card); c.cornerRadius = 12; c.strokes = fill(C.line); c.strokeWeight = 1;
    c.counterAxisSizingMode = 'FIXED'; c.resize(CARD, 100);
    c.appendChild(chip(it.tag));
    c.appendChild(text(it.title, 16, 'Bold', C.ink, INNER));
    for (const [label, val] of [['무엇을 했나', it.what], ['왜', it.why], ['확인 요청', it.ask]]) {
      if (!val) continue;
      const r = stack(label, 'VERTICAL', 2);
      r.appendChild(text(label, 12, 'Medium', C.sub));
      r.appendChild(text(val, 14, 'Regular', C.ink, INNER));
      c.appendChild(r);
    }
    const links = [];
    for (const l of it.links || []) { const target = await resolveLink(l); if (target) links.push([l.label + ' ↗', target]); }
    if (links.length) {
      const prefix = '관련 화면\n';
      const t = text(prefix + links.map(x => x[0]).join('\n'), 13, 'Regular', C.sub, INNER);
      let pos = prefix.length;
      for (const [label, target] of links) {
        const end = pos + label.length;
        t.setRangeHyperlink(pos, end, target);
        t.setRangeFills(pos, end, fill(C.link));
        t.setRangeTextDecoration(pos, end, 'UNDERLINE');
        t.setRangeFontName(pos, end, { family: F, style: 'Medium' });
        pos = end + 1;
      }
      c.appendChild(t);
    }
    grid.appendChild(c);
    cards[it.key] = c.id;
    resolved[it.key] = (it.links || []).filter(l => l.file === 'ds' || l.resolved).map(l => ({ file: l.file, node: l.file === 'ds' ? l.node : l.resolved, label: l.label }));
  }
  s.appendChild(grid);
  root.appendChild(s);
}
if (DATA.footer) root.appendChild(text(DATA.footer, 13, 'Regular', C.sub, W - 96));

const section = figma.createSection();
section.name = sectionName;
page.appendChild(section);
section.appendChild(root);
root.x = 40; root.y = 40;
section.resizeWithoutConstraints(W + 80, root.height + 80);
section.x = 0; section.y = bottom + 120;
figma.viewport.scrollAndZoomIntoView([section]);
return { sectionId: section.id, cards, links: resolved, missing };
