import { CHECK_IN_TOKEN_MAX } from '@/api/check-in/schema';

/** 셀프 체크인 토큰 모양(base64url, 백엔드 43자 · 상한 64자) */
const TOKEN = new RegExp(`^[A-Za-z0-9_-]{1,${CHECK_IN_TOKEN_MAX}}$`);

/**
 * `/check-in?token=…`의 토큰. 없거나 여러 개거나 모양이 틀리면 null — 요청 없이 "잘못된 QR" 안내(`Event_400_26`과 같은 화면).
 * 토큰 값은 로그·외부로 내보내지 않는다(QR이 노출되면 현장 밖 체크인이 가능하다 — 백엔드 DEC-011).
 */
export function parseCheckInToken(raw: string | string[] | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const token = raw.trim();
  return TOKEN.test(token) ? token : null;
}
