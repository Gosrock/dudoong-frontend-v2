// 생성 파일 — tools/figma-plugin/src/를 고치고 build.mjs를 돌린다.
(function () {
// 플러그인 메인 스레드(code.js)와 UI(ui.html)가 같이 쓰는 순수 로직. build.mjs가 두 파일에 그대로 넣는다.
// Figma 메인 스레드에 들어가므로 `?.`·`??`·객체 spread를 쓰지 않는다.

const REPO = { owner: 'Gosrock', name: 'dudoong-frontend-v2' };

/** 트래킹 대상 파일. 여기 없는 파일(테스트 파일)에서 만든 이슈는 테스트 라벨이 붙는다. */
const KNOWN_FILES = {
  '1Cn4WOu6TDaSajbFIuH6fO': { short: 'GUI', label: 'Figma: GUI' },
  FUQb8ldGBp3uYUuXPV5FDC: { short: '와이어', label: 'Figma: 와이어프레임' },
  '0QD9tGSt8ZciDqe7ol2gYH': { short: 'DS', label: 'Figma: 디자인 시스템' },
};

const CHANGE_TYPES = [
  { id: 'update', label: '수정', short: '수정', githubLabel: 'Design: 수정' },
  { id: 'new', label: '신규 화면', short: '새 화면', githubLabel: 'Design: 신규 화면' },
  {
    id: 'ready',
    label: 'Ready for dev 전환',
    short: 'Ready for dev',
    githubLabel: 'Design: Ready for dev',
  },
  {
    id: 'ds',
    label: '디자인 시스템 변경(토큰·컴포넌트)',
    short: '디자인 시스템',
    githubLabel: 'Design: 디자인 시스템',
  },
  { id: 'delete', label: '삭제', short: '삭제', githubLabel: 'Design: 삭제' },
];

const SYNC_LABEL = 'Design Sync';
const TEST_LABEL = 'Test: figma-plugin';

/** 저장소에 만들 라벨(sync-labels.mjs). 이름은 기존 `Type:`·`For:`·`Status:` 체계를 따른다. */
const LABELS = [
  {
    name: SYNC_LABEL,
    color: '7E57C2',
    description: '[디자인] Figma 플러그인으로 들어온 디자인 변경',
  },
]
  .concat(
    CHANGE_TYPES.map((t) => ({
      name: t.githubLabel,
      color: 'C5B3F6',
      description: `[디자인 변경 유형] ${t.label}`,
    })),
  )
  .concat(
    Object.keys(KNOWN_FILES).map((key) => ({
      name: KNOWN_FILES[key].label,
      color: 'BFD4F2',
      description: `[디자인 파일] ${KNOWN_FILES[key].short} (${key})`,
    })),
  )
  .concat([
    {
      name: TEST_LABEL,
      color: 'EDEDED',
      description: '[테스트] 플러그인 시험용 이슈 — 닫아도 된다',
    },
  ]);

const DEV_STATUS_TEXT = { READY_FOR_DEV: 'Ready for dev', COMPLETED: 'Completed' };

function devStatusText(status) {
  return status ? DEV_STATUS_TEXT[status] || status : '—';
}

function isKnownFile(fileKey) {
  return Object.prototype.hasOwnProperty.call(KNOWN_FILES, fileKey);
}

/** Figma 링크(공유 링크·브라우저 주소)에서 fileKey를 꺼낸다. */
function parseFileKey(url) {
  const m = /figma\.com\/(?:file|design|proto|board|slides)\/([A-Za-z0-9]+)/.exec(url || '');
  return m ? m[1] : null;
}

function nodeUrl(fileKey, nodeId) {
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeId.replace(/:/g, '-'))}`;
}

function marker(fileKey, nodeId) {
  return `<!-- figma-node:${fileKey}/${nodeId} -->`;
}

/** 이슈 본문의 마커 → `fileKey/nodeId` 목록 */
function parseMarkers(text) {
  const out = [];
  const re = /<!-- figma-node:([A-Za-z0-9]+\/[^\s>]+) -->/g;
  let m;
  while ((m = re.exec(text || '')) !== null) out.push(m[1]);
  return out;
}

/**
 * 고른 레이어를 "트래킹 단위"로 올린다: 페이지·섹션 바로 아래 노드(화면 프레임),
 * 컴포넌트는 그 자체, variant는 컴포넌트 세트.
 * node는 Figma 노드 또는 { type, parent } 모양의 객체.
 */
function resolveTarget(node) {
  let cur = node;
  while (cur.parent && cur.parent.type !== 'PAGE' && cur.parent.type !== 'SECTION') {
    if (cur.type === 'COMPONENT_SET') return cur;
    if (cur.type === 'COMPONENT' && cur.parent.type !== 'COMPONENT_SET') return cur;
    cur = cur.parent;
  }
  return cur;
}

/** 바깥 섹션부터의 섹션 이름 경로 */
function sectionPath(node) {
  const names = [];
  let cur = node.parent;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    if (cur.type === 'SECTION') names.unshift(cur.name);
    cur = cur.parent;
  }
  return names;
}

const DS_FILE = '0QD9tGSt8ZciDqe7ol2gYH';

/** 기본 변경 유형: 모두 Ready for dev → ready, 디자인 시스템 파일 → ds, 그 밖 → update */
function suggestType(targets, fileKey) {
  if (targets.length > 0 && targets.every((t) => t.devStatus === 'READY_FOR_DEV')) return 'ready';
  if (fileKey === DS_FILE) return 'ds';
  return 'update';
}

/** 변경 내용의 첫 줄 → 이슈 제목에 붙는 요약(길면 자른다) */
function summaryOf(text, max) {
  const limit = max || 40;
  const first = (text || '').trim().split(/\r?\n/)[0].trim();
  return first.length > limit ? `${first.slice(0, limit - 1)}…` : first;
}

function changeType(id) {
  const t = CHANGE_TYPES.find((c) => c.id === id);
  if (!t) throw new Error(`알 수 없는 변경 유형: ${id}`);
  return t;
}

function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function framesTable(fileKey, targets) {
  const rows = targets.map((t) => {
    const where = t.sections && t.sections.length ? t.sections.join(' › ') : '—';
    return `| [${escapeCell(t.name)}](${nodeUrl(fileKey, t.id)}) | \`${t.id}\` | ${t.type} | ${escapeCell(where)} | ${devStatusText(t.devStatus)} |`;
  });
  return ['| 프레임 | 노드 | 종류 | 섹션 | Dev Mode |', '|---|---|---|---|---|']
    .concat(rows)
    .join('\n');
}

function titleTargets(targets) {
  const first = targets[0].name;
  return targets.length > 1 ? `${first} 외 ${targets.length - 1}` : first;
}

/**
 * ctx: { fileKey, fileName, pageName, targets[{id,name,type,devStatus,sections}], typeId, summary, description, author }
 */
function buildIssue(ctx) {
  if (!ctx.targets.length) throw new Error('프레임을 하나 이상 골라야 한다');
  const type = changeType(ctx.typeId);
  const known = isKnownFile(ctx.fileKey);
  const fileShort = known ? KNOWN_FILES[ctx.fileKey].short : '테스트';
  const summary = ctx.summary.trim();
  const title = `[디자인·${fileShort}] ${titleTargets(ctx.targets)}${summary ? ` — ${summary}` : ''}`;

  const labels = [
    SYNC_LABEL,
    type.githubLabel,
    known ? KNOWN_FILES[ctx.fileKey].label : TEST_LABEL,
  ];

  const body = [
    `> Figma 플러그인으로 작성 · 작성자 **${ctx.author || '알 수 없음'}**`,
    '',
    `**변경 유형** ${type.label}  `,
    `**파일** ${ctx.fileName} (\`${ctx.fileKey}\`) · **페이지** ${ctx.pageName}`,
    '',
    '### 프레임',
    framesTable(ctx.fileKey, ctx.targets),
    '',
    '### 변경 내용',
    ctx.description.trim() || '_(내용 없음)_',
    '',
    ctx.targets.map((t) => marker(ctx.fileKey, t.id)).join('\n'),
  ].join('\n');

  return { title, body, labels };
}

/** 열린 이슈에 이어 쓰는 댓글. 이슈 본문에 없는 프레임은 newMarkers로 돌려준다(본문에 덧붙인다). */
function buildComment(ctx, issueBody) {
  if (!ctx.targets.length) throw new Error('프레임을 하나 이상 골라야 한다');
  const type = changeType(ctx.typeId);
  const existing = parseMarkers(issueBody);
  const newMarkers = ctx.targets
    .filter((t) => existing.indexOf(`${ctx.fileKey}/${t.id}`) === -1)
    .map((t) => marker(ctx.fileKey, t.id));
  const summary = ctx.summary.trim();
  const body = [
    `### 디자인 변경 — ${type.label}${summary ? ` · ${summary}` : ''}`,
    `> Figma 플러그인으로 작성 · 작성자 **${ctx.author || '알 수 없음'}** · 페이지 ${ctx.pageName}`,
    '',
    framesTable(ctx.fileKey, ctx.targets),
    '',
    ctx.description.trim() || '_(내용 없음)_',
  ].join('\n');
  return { body, newMarkers, label: type.githubLabel };
}

/**
 * 이슈 목록(GitHub REST 응답)에서 고른 노드가 들어 있는 것만 고른다. 열린 것 먼저, 최근 것 먼저.
 * 반환: [{ number, title, state, url, createdAt, author, nodeIds }]
 */
function matchIssues(issues, fileKey, nodeIds) {
  const wanted = nodeIds.map((id) => `${fileKey}/${id}`);
  return issues
    .filter((i) => !i.pull_request)
    .map((i) => {
      const hits = parseMarkers(i.body).filter((k) => wanted.indexOf(k) !== -1);
      return {
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        createdAt: i.created_at,
        author: i.user ? i.user.login : '',
        nodeIds: hits.map((k) => k.slice(fileKey.length + 1)),
      };
    })
    .filter((i) => i.nodeIds.length > 0)
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === 'open' ? -1 : 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
}

/** fine-grained PAT 발급 페이지(미리 채움). 저장소는 문서상 미리 고를 수 없어 디자이너가 고른다. now는 테스트용 */
function tokenUrl(now) {
  // 토큰 이름은 계정 안에서 겹치면 안 된다 — 다시 발급할 때(만료·분실) 막히지 않게 발급 시각을 붙인다
  const d = now || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const params = [
    ['name', `DuDoong Figma 트래커 ${stamp}`],
    ['description', `Figma 플러그인에서 ${REPO.owner}/${REPO.name} 이슈 작성용`],
    ['target_name', REPO.owner],
    ['expires_in', '366'],
    ['issues', 'write'],
  ];
  return `https://github.com/settings/personal-access-tokens/new?${params
    .map((p) => `${p[0]}=${encodeURIComponent(p[1])}`)
    .join('&')}`;
}

// 플러그인 메인 스레드. build.mjs가 core.mjs를 앞에 붙여 plugin/code.js를 만든다.
// 문서에 접근하고 clientStorage를 읽고 쓴다. GitHub 호출은 UI(iframe)가 한다.
/* global figma, __html__, resolveTarget, sectionPath */

const TOKEN_KEY = 'githubToken';
const FILE_KEYS = 'fileKeysByName'; // figma.fileKey를 못 받을 때 디자이너가 붙여 넣은 링크 → { 파일 이름: fileKey }

function describe(node) {
  const target = resolveTarget(node);
  const status = 'devStatus' in target && target.devStatus ? target.devStatus.type : null;
  return {
    id: target.id,
    name: target.name,
    type: target.type,
    devStatus: status,
    sections: sectionPath(target),
  };
}

function selection() {
  const seen = {};
  const out = [];
  for (const node of figma.currentPage.selection) {
    const d = describe(node);
    if (seen[d.id]) continue;
    seen[d.id] = true;
    out.push(d);
  }
  return out;
}

function sendSelection() {
  figma.ui.postMessage({
    type: 'selection',
    pageName: figma.currentPage.name,
    targets: selection(),
  });
}

async function fileKey() {
  if (figma.fileKey) return figma.fileKey;
  const map = (await figma.clientStorage.getAsync(FILE_KEYS)) || {};
  return map[figma.root.name] || null;
}

async function init() {
  figma.showUI(__html__, { width: 360, height: 520, themeColors: true });
  figma.ui.postMessage({
    type: 'init',
    token: (await figma.clientStorage.getAsync(TOKEN_KEY)) || null,
    fileKey: await fileKey(),
    fileName: figma.root.name,
    author: figma.currentUser ? figma.currentUser.name : null,
    pageName: figma.currentPage.name,
    targets: selection(),
  });
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'save-token':
      await figma.clientStorage.setAsync(TOKEN_KEY, msg.token);
      break;
    case 'clear-token':
      await figma.clientStorage.deleteAsync(TOKEN_KEY);
      break;
    case 'save-file-key': {
      const map = (await figma.clientStorage.getAsync(FILE_KEYS)) || {};
      map[figma.root.name] = msg.fileKey;
      await figma.clientStorage.setAsync(FILE_KEYS, map);
      break;
    }
    case 'open-url':
      figma.openExternal(msg.url);
      break;
    case 'notify':
      figma.notify(msg.text, { error: Boolean(msg.error) });
      break;
    case 'close':
      figma.closePlugin();
      break;
  }
};

figma.on('selectionchange', sendSelection);
figma.on('currentpagechange', sendSelection);

init();

})();
