// 플러그인 빌드 — 의존성 없이 src/를 이어 붙여 plugin/code.js · plugin/ui.html을 만든다.
// Figma는 main·ui를 파일 하나씩만 받는다. 결과물은 커밋한다(디자이너가 Node 없이 manifest를 가져온다).
//   node tools/figma-plugin/build.mjs          → plugin/에 쓴다
//   node tools/figma-plugin/build.mjs --check  → plugin/이 src/와 맞는지만 본다(CI·테스트)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

const HEADER = '// 생성 파일 — tools/figma-plugin/src/를 고치고 build.mjs를 돌린다.\n';

/** ESM 모듈을 전역 스크립트로: 줄 앞 `export `만 지운다(core.mjs는 import가 없다) */
function stripExports(source) {
  if (/^import\s/m.test(source)) throw new Error('core.mjs는 import를 쓰지 않는다');
  return source.replace(/^export\s+/gm, '');
}

export function build() {
  const core = stripExports(read('src/core.mjs'));
  const code = `${HEADER}(function () {\n${core}\n${read('src/code.js')}\n})();\n`;

  // <script> 안의 `<!--`·`</script`는 HTML 파서를 흔든다. 문자열·정규식 안에만 있으므로 \x3C로 바꾼다
  const script = `${core}\n${read('src/ui.js')}`.replace(/<(!--|\/script)/gi, '\\x3C$1');
  const template = read('src/ui.html');
  if (!template.includes('/* build:script */'))
    throw new Error('ui.html에 /* build:script */ 자리가 없다');
  const ui = template
    .replace('<!doctype html>', `<!doctype html>\n<!-- ${HEADER.slice(3).trim()} -->`)
    .replace('/* build:script */', () => `(function () {\n${script}\n})();`);

  return { 'plugin/code.js': code, 'plugin/ui.html': ui };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  if (process.argv.includes('--check')) {
    const stale = Object.keys(out).filter((p) => {
      try {
        return read(p) !== out[p];
      } catch {
        return true;
      }
    });
    if (stale.length) {
      console.error(`오래된 빌드: ${stale.join(', ')} — node tools/figma-plugin/build.mjs`);
      process.exit(1);
    }
  } else {
    mkdirSync(join(root, 'plugin'), { recursive: true });
    for (const [p, content] of Object.entries(out)) writeFileSync(join(root, p), content);
    console.log(`썼다: ${Object.keys(out).join(', ')}`);
  }
}
