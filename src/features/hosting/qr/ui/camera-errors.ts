import type { ScannerErrorKind } from '@yudiel/react-qr-scanner';

/**
 * 카메라를 켜지 못한 이유 → 화면 문구. P13b-GUI — Ready 화면 글자 그대로(`1360:23457` 권한 · `1360:23536` 카메라 없음 ·
 * `1360:23614` 다른 앱 · `1360:23692` 브라우저 · `1360:23770` 알 수 없는 오류, Design Sync #226 · #230). `canRetry`면 [다시 켜기] —
 * 다섯 화면 모두 버튼이 있다(브라우저 미지원도 — 다른 브라우저로 옮겨 오지 않아도 권한 설정을 바꾼 뒤 다시 켤 수 있다)
 */
export type CameraProblem = { title: string; description: string; canRetry: boolean };

export function cameraProblemOf(kind: ScannerErrorKind): CameraProblem {
  switch (kind) {
    case 'permission-denied':
    case 'security':
      return {
        title: '카메라 권한이 필요해요',
        description: '브라우저 설정에서 이 사이트의 카메라를 허용한 뒤 다시 켜 주세요.',
        canRetry: true,
      };
    case 'no-camera':
    case 'overconstrained':
      return {
        title: '카메라를 찾을 수 없어요',
        description: '카메라가 있는 기기를 사용하거나 [관객이 QR 스캔]으로 입장을 받아 주세요.',
        canRetry: true,
      };
    case 'in-use':
      return {
        title: '다른 앱이 카메라를 쓰고 있어요',
        description: '사용중인 앱이나 탭을 닫은 후 다시 켜주세요.',
        canRetry: true,
      };
    case 'insecure-context':
    case 'unsupported':
      return {
        title: '이 브라우저에서는 카메라를 쓸 수 없어요',
        description:
          '최신 Chrome이나 Safari를 사용해 주세요. 혹은 [관객이 QR 스캔]으로 입장을 받아 주세요.',
        canRetry: true,
      };
    default:
      return {
        title: '카메라를 켜지 못했어요',
        description: '잠시 후 다시 켜주세요.',
        canRetry: true,
      };
  }
}

/**
 * 카메라를 켜는 동안(영상이 아직 안 나옴) 카메라 자리 안내 — 브라우저가 권한을 묻고 답을 기다리는 동안 라이브러리는
 * 오류 없이 기다리기만 해서 회색 칸만 보였다(이슈 #93 §5). P13b-GUI — Ready 화면 글자 그대로(`1349:713` · `1360:23377`, #225 · #229).
 * `CAMERA_SLOW_MS`가 지나도 안 켜지면 다른 방법을 덧붙인다(권한 창이 안 뜨는 인앱 브라우저 등).
 */
export const CAMERA_SLOW_MS = 6000;

export function cameraWaitHint(slow: boolean): { title: string; description: string } {
  return slow
    ? {
        title: '카메라가 켜지지 않나요?',
        description:
          '주소창의 카메라 권한을 허용했는지 확인해 주세요. 안되면 Chrome 또는 Safari로 열거나 [관객이 QR 스캔]으로 입장을 받아 주세요.',
      }
    : {
        title: '카메라를 켜는 중이에요',
        description: '카메라 권한을 묻는 창이 뜨면 [허용]을 눌러 주세요.',
      };
}
