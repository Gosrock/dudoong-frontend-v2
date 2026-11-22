import type { EventChecklist } from '@/api/event/schema';
import { eventHref, type EventMenuKey } from '@/features/hosting/shared/model/event-scope';

/**
 * 대시보드 등록 체크리스트(GE-7, plan P11). GUI `727:23088`(0/3) · `745:32167`(3/3) — 행 ›는 각 화면으로 간다.
 * ③ 티켓은 "티켓 없음" 공연이면 면제(`ticketRequired=false`)다 — 그때는 ③ 행을 빼고 두 줄만 보인다(GUI `체크리스트_티켓 없는 공연`
 * `1929:6909` · `1913:39649` — Design Sync #333 · #334, 2026-11-21. 전에는 "필요 없어요" 표시를 단 채 찬 행으로 두었다).
 */

export type ChecklistItem = {
  key: 'basic' | 'detail' | 'ticket';
  label: string;
  /** 찼는지 */
  done: boolean;
  href: string;
};

const ROWS: { key: ChecklistItem['key']; label: string; menu: EventMenuKey }[] = [
  { key: 'basic', label: '기본 정보 입력', menu: 'info' },
  { key: 'detail', label: '상세 정보 입력', menu: 'detail' },
  { key: 'ticket', label: '하나 이상의 티켓 생성', menu: 'tickets' },
];

export function checklistItemsOf(eventId: string | number, c: EventChecklist): ChecklistItem[] {
  return ROWS.filter((row) => row.key !== 'ticket' || c.ticketRequired).map((row) => {
    const done =
      row.key === 'basic'
        ? c.isBasicFilled
        : row.key === 'detail'
          ? c.isDetailFilled
          : c.hasValidTicket;
    return { key: row.key, label: row.label, done, href: eventHref(eventId, row.menu) };
  });
}

/** "n/3" 진행(티켓 없는 공연은 "n/2") */
export const checklistProgress = (items: readonly ChecklistItem[]) => ({
  done: items.filter((i) => i.done).length,
  total: items.length,
});

/** PE-8 화면 처리 코드(patterns §24 P11 행 + 소스에서 찾은 `Event_400_15`) */
export const REGISTER_ERROR_MESSAGE = {
  /** 조건 미충족 — GE-7을 다시 읽어 빠진 항목을 보인다 */
  Event_400_7: '아직 채우지 않은 항목이 있어요',
  /** 이미 오픈됨 — GE-3을 다시 읽는다(대시보드가 등록 후 모드로) */
  Event_400_8: '이미 등록된 공연이에요',
  /** 체크리스트는 찼지만 시작 시각이 지났다(`Event.validateStartAt`, 432cce4) — GE-7·GE-3을 다시 읽는다 */
  Event_400_15: '공연 시작 시각이 지나 등록할 수 없어요. 일정을 바꿔 주세요',
} as const;

/**
 * 등록 실패 문구. 서버 `Event.open()`은 시작 시각(`Event_400_15`)을 "이미 오픈"(`Event_400_8`)보다 먼저 본다(fe423ed4) — 다른 멤버가
 * 이미 등록했고 시작도 지난 공연이면 `Event_400_15`가 온다. 다시 읽은 GE-3이 등록 뒤(준비중 아님)면 시작 시각 문구 대신
 * "이미 등록된 공연" 문구를 쓴다
 */
export function registerErrorMessageOf(
  code: keyof typeof REGISTER_ERROR_MESSAGE | null,
  registered: boolean,
): string | null {
  if (code === null) return null;
  if (code === 'Event_400_15' && registered) return REGISTER_ERROR_MESSAGE.Event_400_8;
  return REGISTER_ERROR_MESSAGE[code];
}
