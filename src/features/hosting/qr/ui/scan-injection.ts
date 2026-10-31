/**
 * 판독 값 주입 어댑터 — 카메라가 없는 곳(Playwright·CI·스토리)에서 판독 결과를 넣는 경계(P13b-V).
 * 카메라(`@yudiel/react-qr-scanner`)와 같은 길로 `submitScan(value)`에 닿는다. 화면 동작은 없다.
 *
 * `window`에 `dd:qr-scan` 이벤트(`detail` = 판독 값 문자열)를 보내면 열린 [호스트가 스캔]이 받는다.
 * 운영에서도 열려 있지만 QR을 카메라에 비추는 것과 같은 일만 한다(PQ-2 권한·검사는 서버가 한다).
 */
export const QR_SCAN_EVENT = 'dd:qr-scan';

export function subscribeInjectedScan(onValue: (value: string) => void): () => void {
  const handler = (e: Event) => {
    const value = (e as CustomEvent<unknown>).detail;
    if (typeof value === 'string') onValue(value);
  };
  window.addEventListener(QR_SCAN_EVENT, handler);
  return () => window.removeEventListener(QR_SCAN_EVENT, handler);
}

/** 테스트·스토리에서 판독 값을 넣는다 */
export function injectScan(value: string) {
  window.dispatchEvent(new CustomEvent(QR_SCAN_EVENT, { detail: value }));
}
