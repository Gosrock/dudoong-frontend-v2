// 플러그인 UI(iframe). build.mjs가 core.mjs와 함께 plugin/ui.html에 넣는다.
// iframe origin이 null이라 Access-Control-Allow-Origin: * 인 api.github.com만 부른다.
/* global REPO, CHANGE_TYPES, SYNC_LABEL, buildIssue, buildComment, matchIssues, devStatusText, isKnownFile, parseFileKey, suggestType, tokenUrl */

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
  mode: 'new', // 'new' | 이슈 번호
  busy: false,
  result: null, // { url, number, kind }
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
  if (!state.typeTouched) state.typeId = suggestType(targets) || 'update';
  // 고른 프레임이 바뀌면 댓글 대상이 그 프레임의 열린 이슈가 아닐 수 있다
  if (state.mode !== 'new' && !openMatches().some((i) => i.number === state.mode))
    state.mode = 'new';
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

function context() {
  return {
    fileKey: state.fileKey,
    fileName: state.fileName,
    pageName: state.pageName,
    targets: state.targets,
    typeId: state.typeId,
    summary: document.getElementById('summary').value,
    description: document.getElementById('description').value,
    author: state.author,
  };
}

async function submit() {
  const ctx = context();
  if (!ctx.targets.length) return fail('캔버스에서 프레임을 먼저 골라 주세요.');
  if (!ctx.description.trim()) return fail('변경 내용을 적어 주세요.');
  state.busy = true;
  state.error = null;
  render();
  try {
    if (state.mode === 'new') {
      const issue = buildIssue(ctx);
      const created = await gh(`${repoPath}/issues`, { method: 'POST', body: issue });
      state.result = { url: created.html_url, number: created.number, kind: '이슈를 만들었어요' };
    } else {
      const number = state.mode;
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
      state.result = { url: created.html_url, number, kind: '댓글을 달았어요' };
    }
    document.getElementById('summary').value = '';
    document.getElementById('description').value = '';
    state.typeTouched = false;
    post({ type: 'notify', text: `#${state.result.number} ${state.result.kind}` });
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

function render() {
  const connected = Boolean(state.token && state.login);
  show('view-connect', !connected);
  show('view-file', connected && !state.fileKey);
  show('view-main', connected && Boolean(state.fileKey));
  document.getElementById('connect-error').textContent = connected ? '' : state.error || '';
  document.getElementById('connect-button').disabled = state.busy;

  if (!connected || !state.fileKey) return;

  const known = isKnownFile(state.fileKey);
  document.getElementById('header').innerHTML =
    `<div><strong>${esc(state.fileName)}</strong> · ${esc(state.pageName)}</div>` +
    `<div class="muted">@${esc(state.login)}${known ? '' : ' · <span class="warn">테스트 파일 — 이슈에 테스트 라벨이 붙어요</span>'}</div>`;

  document.getElementById('targets').innerHTML = state.targets.length
    ? state.targets
        .map(
          (t) =>
            `<li><span class="name">${esc(t.name)}</span> <span class="muted">${esc(t.type)}${
              t.sections.length ? ` · ${esc(t.sections.join(' › '))}` : ''
            }</span>${t.devStatus ? ` <span class="chip">${esc(devStatusText(t.devStatus))}</span>` : ''}</li>`,
        )
        .join('')
    : '<li class="muted">캔버스에서 프레임이나 컴포넌트를 골라 주세요. 여러 개를 고르면 이슈 하나로 묶어요.</li>';

  renderHistory();

  document.getElementById('types').innerHTML = CHANGE_TYPES.map(
    (t) =>
      `<label class="type"><input type="radio" name="type" value="${t.id}"${
        state.typeId === t.id ? ' checked' : ''
      }> ${esc(t.label)}</label>`,
  ).join('');

  const open = openMatches();
  document.getElementById('modes').innerHTML = [
    `<label><input type="radio" name="mode" value="new"${state.mode === 'new' ? ' checked' : ''}> 새 이슈</label>`,
  ]
    .concat(
      open.map(
        (i) =>
          `<label><input type="radio" name="mode" value="${i.number}"${
            state.mode === i.number ? ' checked' : ''
          }> #${i.number}에 댓글 <span class="muted">${esc(i.title)}</span></label>`,
      ),
    )
    .join('');

  const submitButton = document.getElementById('submit');
  submitButton.disabled = state.busy || !state.targets.length;
  submitButton.textContent = state.busy ? '보내는 중…' : '확인';

  document.getElementById('error').textContent = state.error || '';
  document.getElementById('result').innerHTML = state.result
    ? `#${state.result.number} ${esc(state.result.kind)} — <a href="#" data-url="${esc(state.result.url)}">GitHub에서 보기</a>`
    : '';
}

function renderHistory() {
  const el = document.getElementById('history');
  if (state.issuesError) {
    el.innerHTML = `<li class="error">이력을 불러오지 못했어요: ${esc(state.issuesError)}</li>`;
    return;
  }
  if (!state.issuesLoaded) {
    el.innerHTML = '<li class="muted">불러오는 중…</li>';
    return;
  }
  if (!state.targets.length) {
    el.innerHTML = '';
    return;
  }
  const list = matches();
  el.innerHTML = list.length
    ? list
        .map(
          (i) =>
            `<li><span class="state ${i.state}">${i.state === 'open' ? '열림' : '닫힘'}</span> ` +
            `<a href="#" data-url="${esc(i.url)}">#${i.number}</a> ${esc(i.title)} ` +
            `<span class="muted">${esc(i.createdAt.slice(0, 10))} · @${esc(i.author)}</span></li>`,
        )
        .join('')
    : '<li class="muted">이 프레임으로 만든 이슈가 없어요.</li>';
}

// ── 이벤트 ──

document.getElementById('open-token-page').onclick = () => openUrl(tokenUrl());
document.getElementById('connect-button').onclick = () => {
  const token = document.getElementById('token').value.trim();
  if (token) connect(token);
};
document.getElementById('disconnect').onclick = disconnect;
document.getElementById('refresh').onclick = () => {
  state.issuesLoaded = false;
  render();
  loadIssues();
};
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

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.name === 'type') {
    state.typeId = input.value;
    state.typeTouched = true;
  } else if (input.name === 'mode') {
    state.mode = input.value === 'new' ? 'new' : Number(input.value);
  }
  render();
});

// UI 안의 링크는 모두 href="#"이다. 기본 동작을 두면 iframe이 부모 주소로 이동해 플러그인 화면이 사라진다
document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  if (link.dataset.url) openUrl(link.dataset.url);
});

render();
