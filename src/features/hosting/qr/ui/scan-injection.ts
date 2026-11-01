/**
 * 판독 값 주입 어댑터 — 카메라가 없는 곳(Playwright·CI·스토리)에서 판독 결과를 넣는 경계(P13b-V).
 * 카메라(`@yudiel/react-qr-scanner`)와 같은 길로 `submitScan(value)`에 닿는다. 화면 동작은 없다.
 *
 * `window`에 `dd:qr-scan` 이벤트(`detail` = 판독 값 문자열)를 보내면 열린 [호스트가 스캔]이 받는다.
 *
 * **빌드 플래그 `NEXT_PUBLIC_QR_SCAN_INJECTION=1`일 때만 듣는다**(사용자 결정 2026-11-01, P14 회귀). 켜는 곳은 e2e·QA
 * (`playwright.config.ts` webServer — 그 빌드에만)와 `pnpm dev:mock`. 운영·스테이징 이미지(Dockerfile)·PR 게이트 빌드는 꺼져
 * 있고, 꺼진 빌드에서는 상수가 인라인돼 듣는 코드가 빠진다. 켜 둬도 카메라에 QR을 비추는 것과 같은 일만 하지만(PQ-2 권한·검사는
 * 서버), 콘솔에서 판독 없이 체크인을 넣는 길을 운영에 남기지 않는다.
 */
export const QR_SCAN_EVENT = 'dd:qr-scan';

/** 주입을 듣는 빌드인지. `NEXT_PUBLIC_*`는 리터럴로 참조해야 빌드 때 인라인된다(tech-decisions §12) */
export const QR_SCAN_INJECTION_ENABLED = process.env.NEXT_PUBLIC_QR_SCAN_INJECTION === '1';

export function subscribeInjectedScan(onValue: (value: string) => void): () => void {
  if (!QR_SCAN_INJECTION_ENABLED) return () => {};
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
