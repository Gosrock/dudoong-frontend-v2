'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { myTicketsQuery, newApprovedTicketsQuery } from '@/api/my-ticket/queries';
import type { MyTicketElement } from '@/api/my-ticket/schema';

import { cardTarget, type TicketTarget } from './my-ticket-state';
import {
  clampIndex,
  noticeBar,
  pagerLabel,
  sortTicketGroups,
  toTicketGroupView,
} from './ticket-groups';

/**
 * 티켓탭(`/tickets`, plan P8). 보호 화면이라 `<AsyncBoundary>` 안에서 T-1을 `useSuspenseQuery`로 읽는다.
 * T-3(공지 바)은 목록을 막지 않게 `useQuery`. **T-2는 여기서 부르지 않는다** — 카드를 눌러 연 상세(`useTicketDetail`)만 부른다.
 *
 * - 묶음 안 선택은 `ticketUuid`가 아니라 **인덱스**로 기억한다(선물 수락·반환 때 uuid가 바뀐다). 목록이 다시 와서 장수가 줄면 범위 안으로 맞춘다
 * - 상세를 여는 것(시트·전체화면)은 V가 한다. 이 훅은 카드 → 열 대상(`targetOf`)만 준다
 * - 정렬은 서버의 공연 임박순 하나(고정 라벨 "공연임박순"). 지난 공연 · 삭제된 공연 묶음만 뒤로 모은다(`sortTicketGroups`)
 */
export function useTicketTab() {
  const { data } = useSuspenseQuery(myTicketsQuery());
  const notice = useQuery(newApprovedTicketsQuery());
  const groups = useMemo(() => sortTicketGroups(data.groups).map(toTicketGroupView), [data]);
  const [selected, setSelected] = useState<Record<string, number>>({});

  const selectedIndex = useCallback(
    (groupKey: string) => {
      const total = groups.find((g) => g.key === groupKey)?.total ?? 0;
      return clampIndex(selected[groupKey] ?? 0, total);
    },
    [groups, selected],
  );

  const select = useCallback(
    (groupKey: string, index: number) => {
      const total = groups.find((g) => g.key === groupKey)?.total ?? 0;
      if (total === 0) return;
      setSelected((prev) => ({ ...prev, [groupKey]: clampIndex(index, total) }));
    },
    [groups],
  );

  /** 묶음에서 지금 보이는 티켓(인덱스 기준) */
  const selectedTicket = useCallback(
    (groupKey: string): MyTicketElement | null => {
      const group = groups.find((g) => g.key === groupKey);
      return group?.group.tickets[selectedIndex(groupKey)] ?? null;
    },
    [groups, selectedIndex],
  );

  return {
    groups,
    empty: groups.length === 0,
    /** 정렬 라벨(서버 정렬이 하나) */
    sortLabel: '공연임박순' as const,
    /** T-3 공지 바. 진입만으로는 풀리지 않는다 */
    notice: noticeBar(notice.data, data.groups),
    selectedIndex,
    select,
    selectedTicket,
    pager: (groupKey: string) =>
      pagerLabel(selectedIndex(groupKey), groups.find((g) => g.key === groupKey)?.total ?? 0),
    /** 카드를 누르면 열 상세(T-2 또는 GG-7a). 열 수 없으면 null */
    targetOf: (ticket: MyTicketElement): TicketTarget | null => cardTarget(ticket),
  };
}
