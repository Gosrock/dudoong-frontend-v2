import { colors } from '@/ui/theme/colors';

import type { CheckInTone } from '../model/checkin-result';

/**
 * 체크인 결과 톤 → DS 아이콘 · 상태 색(코드 패턴 점검 A18, 2026-11-02). 관객 셀프 체크인(`SelfCheckInView`)과
 * 호스트 스캔 결과(`fh/qr/ui/ScanResult`)가 같은 짝을 쓴다.
 */
export const CHECKIN_TONE = {
  success: { icon: 'circle-check', color: colors.statusSuccess },
  warning: { icon: 'circle-request', color: colors.statusWarning },
  error: { icon: 'circle-reject', color: colors.statusError },
} as const satisfies Record<CheckInTone, { icon: string; color: string }>;
