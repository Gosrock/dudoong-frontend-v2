import type { CheckInTone } from '@/features/shared/checkin-result/model/checkin-result';
import { colors } from '@/ui/theme/colors';

/**
 * QR 체크인 결과 톤 → DS 아이콘 · 색(P13b-GUI). 경고는 노랑 `status/warning 2`(Yellow 300 — `1362:1229` · `1368:4814`),
 * 셀프 체크인(P8c, 와이어)이 쓰는 공용 짝 `CHECKIN_TONE`(경고 = `status/warning` 빨강)과 달라 이 화면만 따로 둔다
 */
export const SCAN_TONE = {
  success: { icon: 'circle-check', color: colors.statusSuccess },
  warning: { icon: 'circle-request', color: colors.statusWarning2 },
  error: { icon: 'circle-reject', color: colors.statusError },
} as const satisfies Record<CheckInTone, { icon: string; color: string }>;
