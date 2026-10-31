import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ZXING_WASM_PATH, ZXING_WASM_VERSION, zxingLocateFile } from './zxing-wasm';

/** `from` 패키지 폴더에서 Node 해석 순서대로 `name` 패키지 폴더를 찾는다(`exports`가 `package.json`을 막아도 된다) */
function packageDir(name: string, from: string) {
  const paths = createRequire(path.join(from, 'package.json')).resolve.paths(name) ?? [];
  const found = paths
    .map((p) => path.join(p, name))
    .find((d) => existsSync(path.join(d, 'package.json')));
  if (!found) throw new Error(`${name} 을(를) ${from} 에서 찾지 못했다`);
  return realpathSync(found);
}

/** 스캐너가 실제로 쓰는 zxing-wasm(`@yudiel/react-qr-scanner` → `barcode-detector` → `zxing-wasm`, pnpm은 끌어올리지 않는다) */
function installedZxingDir() {
  const scanner = packageDir('@yudiel/react-qr-scanner', process.cwd());
  return packageDir('zxing-wasm', packageDir('barcode-detector', scanner));
}

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

describe('zxing wasm 자체 호스팅', () => {
  it('wasm 요청만 우리 경로로 바꾸고 나머지는 그대로 둔다', () => {
    expect(zxingLocateFile('zxing_reader.wasm', 'https://fastly.jsdelivr.net/x/')).toBe(
      ZXING_WASM_PATH,
    );
    expect(zxingLocateFile('other.js', '/base/')).toBe('/base/other.js');
  });

  it('public의 wasm이 설치된 zxing-wasm과 버전 · 바이트가 같다(라이브러리를 올리면 복사도 같이)', () => {
    const dir = installedZxingDir();
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(pkg.version).toBe(ZXING_WASM_VERSION);
    const served = path.join(process.cwd(), 'public', ZXING_WASM_PATH);
    expect(sha256(served)).toBe(sha256(path.join(dir, 'dist/reader/zxing_reader.wasm')));
  });
});
