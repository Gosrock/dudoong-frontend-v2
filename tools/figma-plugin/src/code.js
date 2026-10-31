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
  figma.showUI(__html__, { width: 400, height: 640, themeColors: true });
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
