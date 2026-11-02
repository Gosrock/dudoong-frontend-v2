import type { HostRole } from '@/api/shared/common-schema';

/** 역할 이름. 일반 멤버(`GUEST`)는 "일반"(plan P10b — 서버 표시 이름 "게스트"는 쓰지 않는다) */
export const HOST_ROLE_LABEL: Record<HostRole, string> = {
  MASTER: '마스터',
  MANAGER: '매니저',
  GUEST: '일반',
  UNKNOWN: '알 수 없음',
};
