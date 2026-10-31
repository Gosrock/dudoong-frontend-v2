// 의존성 없이 저장소의 TS 모듈(MSW 핸들러, 스키마)을 node로 불러오는 훅.
// Node 22의 타입 제거(strip types)에 기대고, 번들러식 해석 두 가지만 더한다.
// - `@/…` → `src/…`(tsconfig paths)
// - 확장자 없는 상대 경로 → `.ts` · `.tsx` · `/index.ts`
// 타입 제거만 하므로 `enum`·매개변수 프로퍼티 같은 문법과, `type` 없이 가져오는 타입 import는 실행되지 않는다.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

/** TS 파일로 풀릴 때만 바꾼다. 그 밖(.js, node_modules의 CJS require)은 기본 해석에 맡긴다 */
function resolveFile(base) {
  if (/\.tsx?$/.test(base)) return existsSync(base) ? base : null;
  for (const ext of EXTENSIONS) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith('@/')) {
      base = path.join(root, 'src', specifier.slice(2));
    } else if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:') &&
      !context.parentURL.includes('/node_modules/')
    ) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const file = base && resolveFile(base);
    if (!file) return nextResolve(specifier, context);
    // 저장소 TS는 모두 ESM이다 — 형식을 알려 CJS로 먼저 파싱해 보는 경고를 없앤다
    return { ...nextResolve(pathToFileURL(file).href, context), format: 'module-typescript' };
  },
});
