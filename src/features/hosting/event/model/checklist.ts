import type { EventChecklist } from '@/api/event/schema';

import { eventHref, type EventMenuKey } from './event-scope';

/**
 * 대시보드 등록 체크리스트(GE-7, plan P11). GUI `727:23088`(0/3) · `745:32167`(3/3) — 행 ›는 각 화면으로 간다.
 * ③ 티켓은 "티켓 없음" 공연이면 면제(`ticketRequired=false`)다 — GUI에 면제 표시가 없어 계획대로 행에 `exempt`를 둔다.
 */

export type ChecklistItem = {
  key: 'basic' | 'detail' | 'ticket';
  label: string;
  /** 찼는지(면제면 찬 것으로 센다) */
  done: boolean;
  /** 티켓 없음 공연의 ③ */
  exempt: boolean;
  href: string;
};

const ROWS: { key: ChecklistItem['key']; label: string; menu: EventMenuKey }[] = [
  { key: 'basic', label: '기본 정보 입력', menu: 'info' },
  { key: 'detail', label: '상세 정보 입력', menu: 'detail' },
  { key: 'ticket', label: '티켓 만들기', menu: 'tickets' },
];

export function checklistItemsOf(eventId: string | number, c: EventChecklist): ChecklistItem[] {
  return ROWS.map((row) => {
    const exempt = row.key === 'ticket' && !c.ticketRequired;
    const done =
      row.key === 'basic'
        ? c.isBasicFilled
        : row.key === 'detail'
          ? c.isDetailFilled
          : exempt || c.hasValidTicket;
    return { key: row.key, label: row.label, done, exempt, href: eventHref(eventId, row.menu) };
  });
}

/** "n/3" 진행 — 면제 행은 찬 것으로 센다 */
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
