'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { eventManageQuery } from '@/api/event/queries';
import { can } from '@/features/shared/permission/model/can';

import {
  eventMenuOf,
  eventPublicHref,
  isHasTicketLocked,
  isRegistered,
  READ_ONLY_MESSAGE,
  readOnlyReasonOf,
} from './event-scope';

/**
 * 공연 스코프(`/hosting/events/[eventId]/layout.tsx`, GE-3, plan P11). 메뉴·읽기 전용 판정·공연 카드 값을 돌려준다. UI 동작은 없다.
 * `<AsyncBoundary rejected={HostingAccessRejected}>` 안에서 쓴다 — 비멤버 403(`HOST_400_2`) → 공용 403, 없는·지운 공연 404 → 공용 404(P10a).
 * 하위 화면(대시보드·기본 정보·상세 정보)도 같은 키를 읽으므로 요청은 한 번이다.
 */
export function useEventScope(eventId: string) {
  const { data: event } = useSuspenseQuery(eventManageQuery(eventId));
  const readOnlyReason = readOnlyReasonOf(event);
  return {
    /** GE-3 응답 */
    event,
    /** 등록(OPEN) 뒤인지 — 메뉴 6개, 대시보드는 등록 후 모드(P13a) */
    registered: isRegistered(event.status),
    /** 등록 전 4개 / 등록 후 6개 */
    menu: eventMenuOf(eventId, event.status),
    /** "공연 페이지 보기"(등록 후만) */
    publicHref: eventPublicHref(eventId, event.status),
    /** 공연·티켓 쓰기를 할 수 있는지(매니저 이상 + 준비중·등록된 공연) */
    canEdit: readOnlyReason === null,
    /** 읽기 전용인 이유(`role` 일반 멤버 · `ended` 정산중·지난 공연)와 안내 문구 */
    readOnlyReason,
    readOnlyMessage: readOnlyReason ? READ_ONLY_MESSAGE[readOnlyReason] : null,
    /** 티켓 여부 잠금(등록 후) */
    hasTicketLocked: isHasTicketLocked(event.status),
    /** 매니저 이상 — 등록(PE-8)·삭제 버튼 */
    isManager: can(event.myRole, 'editEvent'),
  };
}
