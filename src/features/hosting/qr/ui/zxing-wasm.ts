import { setZXingModuleOverrides } from '@yudiel/react-qr-scanner';

/**
 * 판독 엔진(zxing wasm)을 우리 출처에서 받는다(P14 보안 — CSP 허용 목록에서 jsdelivr를 뺀다).
 *
 * `@yudiel/react-qr-scanner`는 언제나 `barcode-detector/ponyfill`(zxing-wasm)로 판독하고, 기본값은 wasm(약 0.9MB)을
 * `fastly.jsdelivr.net`에서 받는다. 같은 파일을 `public/vendor/zxing-wasm/<버전>/`에 두고 `locateFile`로 그 주소를 준다.
 * 버전이 경로에 있어 캐시가 섞이지 않는다.
 *
 * **올릴 때**: `@yudiel/react-qr-scanner` → `barcode-detector` → `zxing-wasm` 버전이 바뀌면 `zxing-wasm.test.ts`가 실패한다.
 * `node_modules`의 `zxing-wasm/dist/reader/zxing_reader.wasm`을 새 버전 폴더로 복사하고 아래 버전을 바꾼다(옛 폴더는 지운다).
 */
export const ZXING_WASM_VERSION = '3.1.6';
export const ZXING_WASM_PATH = `/vendor/zxing-wasm/${ZXING_WASM_VERSION}/zxing_reader.wasm`;

export function zxingLocateFile(path: string, prefix: string): string {
  return path.endsWith('.wasm') ? ZXING_WASM_PATH : prefix + path;
}

/** 스캐너 모듈을 불러올 때 한 번(`CameraScanner.tsx` 맨 위). 인스턴스화는 첫 판독 때 한다(라이브러리 기본 — `fireImmediately: false`) */
export function applySelfHostedZxing() {
  setZXingModuleOverrides({ locateFile: zxingLocateFile });
}
