import type { ScannerErrorKind } from '@yudiel/react-qr-scanner';

/** 카메라를 켜지 못한 이유 → 화면 문구(P13b-V, 디자인 없음 — 잠정). `canRetry`면 [카메라 다시 켜기] */
export type CameraProblem = { title: string; description: string; canRetry: boolean };

export function cameraProblemOf(kind: ScannerErrorKind): CameraProblem {
  switch (kind) {
    case 'permission-denied':
    case 'security':
      return {
        title: '카메라 권한이 필요해요',
        description: '브라우저 설정에서 이 사이트의 카메라를 허용한 뒤 다시 켜 주세요',
        canRetry: true,
      };
    case 'no-camera':
    case 'overconstrained':
      return {
        title: '카메라를 찾을 수 없어요',
        description: '카메라가 있는 기기에서 열거나 [관객이 QR 스캔]으로 입장을 받아 주세요',
        canRetry: true,
      };
    case 'in-use':
      return {
        title: '다른 앱이 카메라를 쓰고 있어요',
        description: '카메라를 쓰는 다른 앱이나 탭을 닫은 뒤 다시 켜 주세요',
        canRetry: true,
      };
    case 'insecure-context':
    case 'unsupported':
      return {
        title: '이 브라우저에서는 카메라를 쓸 수 없어요',
        description: '최신 Chrome이나 Safari로 열거나 [관객이 QR 스캔]으로 입장을 받아 주세요',
        canRetry: false,
      };
    default:
      return {
        title: '카메라를 켜지 못했어요',
        description: '잠시 후 다시 켜 주세요',
        canRetry: true,
      };
  }
}
