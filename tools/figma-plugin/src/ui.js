// 플러그인 UI(iframe). build.mjs가 core.mjs와 함께 plugin/ui.html에 넣는다.
// iframe origin이 null이라 Access-Control-Allow-Origin: * 인 api.github.com만 부른다.
// 디자이너가 쓰는 칸은 "무엇이 바뀌었나요?" 하나 — 제목은 첫 줄, 유형·보낼 곳은 자동으로 고르고 바꿀 수만 있다.
/* global REPO, CHANGE_TYPES, SYNC_LABEL, buildIssue, buildComment, matchIssues, devStatusText, isKnownFile, parseFileKey, suggestType, summaryOf, tokenUrl */

const API = 'https://api.github.com';
const MAX_ISSUE_PAGES = 5; // 100개씩, 최근 500개까지

const state = {
  token: null,
  login: null,
  fileKey: null,
  fileName: '',
  author: null,
  pageName: '',
  targets: [],
  issues: [],
  issuesLoaded: false,
  issuesError: null,
  typeId: 'update',
  typeTouched: false,
  forceNew: false, // 열린 이슈가 있어도 새 이슈로
  busy: false,
  result: null, // { url, text }
  error: null,
};

// ── GitHub ──

class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function gh(path, options) {
  const opts = options || {};
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${opts.token || state.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch {
      // 본문 없음
    }
    throw new GitHubError(res.status, explain(res.status, detail));
  }
  return res.status === 204 ? null : res.json();
}

function explain(status, detail) {
  switch (status) {
    case 401:
      return '토큰이 맞지 않거나 만료됐어요. 다시 연결해 주세요.';
    case 403:
      return `권한이 없어요. 토큰이 조직 승인 대기 중이거나, 저장소 ${REPO.name}를 고르지 않았거나, Issues 쓰기 권한이 없을 수 있어요. (${detail})`;
    case 404:
      return `저장소를 찾을 수 없어요. 토큰에 ${REPO.owner}/${REPO.name}를 골랐는지 확인해 주세요.`;
    case 422:
      return `GitHub가 요청을 거절했어요: ${detail}`;
    default:
      return `GitHub 오류 ${status}: ${detail}`;
  }
}

const repoPath = `/repos/${REPO.owner}/${REPO.name}`;

async function loadIssues() {
  state.issuesError = null;
  const all = [];
  try {
    for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
      const batch = await gh(
        `${repoPath}/issues?labels=${encodeURIComponent(SYNC_LABEL)}&state=all&per_page=100&page=${page}`,
      );
      all.push(...batch);
      if (batch.length < 100) break;
    }
    state.issues = all;
    state.issuesLoaded = true;
  } catch (e) {
    state.issuesError = e.message;
  }
  render();
}

// ── Figma ↔ UI ──

function post(msg) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function openUrl(url) {
  post({ type: 'open-url', url });
}

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;
  if (msg.type === 'init') {
    Object.assign(state, {
      token: msg.token,
      fileKey: msg.fileKey,
      fileName: msg.fileName,
      author: msg.author,
      pageName: msg.pageName,
    });
    setTargets(msg.targets);
    if (state.token) connect(state.token, { silent: true });
  } else if (msg.type === 'selection') {
    state.pageName = msg.pageName;
    setTargets(msg.targets);
  }
  render();
};

function setTargets(targets) {
  state.targets = targets;
  state.result = null;
  state.error = null;
  state.forceNew = false;
  if (!state.typeTouched) state.typeId = suggestType(targets, state.fileKey);
}

async function connect(token, opts) {
  state.busy = true;
  state.error = null;
  render();
  try {
    const user = await gh('/user', { token });
    state.token = token;
    state.login = user.login;
    if (!(opts && opts.silent)) post({ type: 'save-token', token });
    loadIssues();
  } catch (e) {
    state.token = null;
    state.login = null;
    state.error = e.message;
  }
  state.busy = false;
  render();
}

function disconnect() {
  post({ type: 'clear-token' });
  Object.assign(state, { token: null, login: null, issues: [], issuesLoaded: false });
  render();
}

// ── 제출 ──

/** 이어서 기록할 이슈 — 고른 프레임이 든 열린 이슈 중 가장 최근 것. 없거나 "새 이슈로"면 null */
function continueIssue() {
  if (state.forceNew) return null;
  return openMatches()[0] || null;
}

function context() {
  const description = document.getElementById('description').value;
  return {
    fileKey: state.fileKey,
    fileName: state.fileName,
    pageName: state.pageName,
    targets: state.targets,
    typeId: state.typeId,
    summary: summaryOf(description),
    description,
    author: state.author,
  };
}

async function submit() {
  const ctx = context();
  if (!ctx.targets.length) return fail('캔버스에서 프레임을 먼저 골라 주세요.');
  if (!ctx.description.trim()) return fail('무엇이 바뀌었는지 적어 주세요.');
  const target = continueIssue();
  state.busy = true;
  state.error = null;
  render();
  try {
    if (!target) {
      const created = await gh(`${repoPath}/issues`, { method: 'POST', body: buildIssue(ctx) });
      state.result = { url: created.html_url, text: `#${created.number} 이슈를 만들었어요` };
    } else {
      const number = target.number;
      const current = await gh(`${repoPath}/issues/${number}`);
      const comment = buildComment(ctx, current.body);
      const created = await gh(`${repoPath}/issues/${number}/comments`, {
        method: 'POST',
        body: { body: comment.body },
      });
      if (comment.newMarkers.length) {
        await gh(`${repoPath}/issues/${number}`, {
          method: 'PATCH',
          body: { body: `${current.body || ''}\n${comment.newMarkers.join('\n')}` },
        });
      }
      await gh(`${repoPath}/issues/${number}/labels`, {
        method: 'POST',
        body: { labels: [comment.label] },
      });
      state.result = { url: created.html_url, text: `#${number}에 이어서 기록했어요` };
    }
    document.getElementById('description').value = '';
    state.typeTouched = false;
    state.typeId = suggestType(state.targets, state.fileKey);
    post({ type: 'notify', text: state.result.text });
    loadIssues();
  } catch (e) {
    state.error = e.message;
    if (e.status === 401) disconnect();
  }
  state.busy = false;
  render();
}

function fail(text) {
  state.error = text;
  render();
}

// ── 화면 ──

function esc(text) {
  return String(text == null ? '' : text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function matches() {
  if (!state.fileKey) return [];
  return matchIssues(
    state.issues,
    state.fileKey,
    state.targets.map((t) => t.id),
  );
}

function openMatches() {
  return matches().filter((i) => i.state === 'open');
}

function show(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function setHtml(id, html) {
  document.getElementById(id).innerHTML = html;
}

function render() {
  const connected = Boolean(state.token && state.login);
  show('view-connect', !connected);
  show('view-file', connected && !state.fileKey);
  show('view-main', connected && Boolean(state.fileKey));
  document.getElementById('connect-error').textContent = connected ? '' : state.error || '';
  document.getElementById('connect-button').disabled = state.busy;
  if (!connected || !state.fileKey) return;

  renderCard();
  const has = state.targets.length > 0;
  show('form', has);

  setHtml(
    'types',
    CHANGE_TYPES.map(
      (t) =>
        `<button class="chip${state.typeId === t.id ? ' on' : ''}" data-type="${t.id}" title="${esc(t.hint)}">${esc(t.short)}</button>`,
    ).join(''),
  );

  const target = continueIssue();
  const open = openMatches()[0];
  if (target) {
    setHtml(
      'target',
      `<b>#${target.number}</b> 이슈에 이어서 기록돼요 · <a href="#" data-action="new">새 이슈로</a>`,
    );
  } else if (open) {
    setHtml(
      'target',
      `새 이슈로 만들어요 · <a href="#" data-action="continue">#${open.number}에 이어서 쓰기</a>`,
    );
  } else {
    setHtml('target', ''); // 이어 쓸 이슈가 없으면 버튼 문구(이슈 만들기)로 충분하다
  }

  const submitButton = document.getElementById('submit');
  submitButton.disabled = state.busy || !has;
  submitButton.textContent = state.busy
    ? '보내는 중…'
    : target
      ? `#${target.number}에 이어서 기록`
      : '이슈 만들기';

  document.getElementById('error').textContent = state.error || '';
  setHtml(
    'done',
    state.result
      ? `<div class="done">✓ ${esc(state.result.text)} · <a href="#" data-url="${esc(state.result.url)}">보기</a></div>`
      : '',
  );

  renderHistory();
  const known = isKnownFile(state.fileKey);
  setHtml(
    'who',
    `@${esc(state.login)}${known ? '' : ' · <span class="warn">테스트 파일(테스트 라벨)</span>'}`,
  );
}

function renderCard() {
  if (!state.targets.length) {
    setHtml(
      'card',
      '<div class="card empty"><div class="frame">캔버스에서 프레임을 골라 주세요</div>' +
        '<div class="muted meta">안쪽 레이어를 골라도 돼요. 여러 개를 고르면 이슈 하나로 묶어요.</div></div>',
    );
    return;
  }
  const frames = state.targets
    .map(
      (t) =>
        `<div class="frame">${esc(t.name)}${
          t.devStatus ? `<span class="badge">${esc(devStatusText(t.devStatus))}</span>` : ''
        }</div>`,
    )
    .join('');
  const sections = state.targets[0].sections;
  const where = [state.fileName, state.pageName].concat(sections).join(' › ');
  setHtml('card', `<div class="card">${frames}<div class="muted meta">${esc(where)}</div></div>`);
}

function renderHistory() {
  const box = document.getElementById('history-box');
  box.hidden = !state.targets.length;
  if (!state.targets.length) return;
  if (state.issuesError) {
    setHtml('history-summary', `<span class="error">이력을 불러오지 못했어요</span>`);
    setHtml('history', `<li class="error">${esc(state.issuesError)}</li>`);
    return;
  }
  if (!state.issuesLoaded) {
    setHtml('history-summary', '이력 불러오는 중…');
    setHtml('history', '');
    return;
  }
  const list = matches();
  const openCount = list.filter((i) => i.state === 'open').length;
  setHtml(
    'history-summary',
    list.length
      ? `이 프레임 이슈 ${list.length}개 (열림 ${openCount}) · <a href="#" data-action="refresh">새로고침</a>`
      : `이 프레임으로 만든 이슈가 없어요 · <a href="#" data-action="refresh">새로고침</a>`,
  );
  setHtml(
    'history',
    list
      .map(
        (i) =>
          `<li><span class="badge ${i.state}">${i.state === 'open' ? '열림' : '닫힘'}</span> ` +
          `<a href="#" data-url="${esc(i.url)}">#${i.number}</a> ${esc(i.title)} ` +
          `<span class="muted">${esc(i.createdAt.slice(0, 10))}</span></li>`,
      )
      .join(''),
  );
}

// ── 이벤트 ──

document.getElementById('open-token-page').onclick = () => openUrl(tokenUrl());
document.getElementById('connect-button').onclick = () => {
  const token = document.getElementById('token').value.trim();
  if (token) connect(token);
};
document.getElementById('disconnect').onclick = disconnect;
document.getElementById('file-save').onclick = () => {
  const key = parseFileKey(document.getElementById('file-link').value);
  if (!key) {
    document.getElementById('file-error').textContent = 'Figma 파일 링크가 아니에요.';
    return;
  }
  state.fileKey = key;
  post({ type: 'save-file-key', fileKey: key });
  render();
};
document.getElementById('submit').onclick = submit;
document.getElementById('description').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
});
document.getElementById('description').addEventListener('input', () => {
  if (state.result || state.error) {
    state.result = null;
    state.error = null;
    render();
  }
});

// UI 안의 링크는 모두 href="#"이다. 기본 동작을 두면 iframe이 부모 주소로 이동해 플러그인 화면이 사라진다
document.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-type]');
  if (chip) {
    state.typeId = chip.dataset.type;
    state.typeTouched = true;
    render();
    return;
  }
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  const action = link.dataset.action;
  if (action === 'new' || action === 'continue') {
    state.forceNew = action === 'new';
    render();
  } else if (action === 'refresh') {
    state.issuesLoaded = false;
    render();
    loadIssues();
  } else if (link.dataset.url) {
    openUrl(link.dataset.url);
  }
});

render();
