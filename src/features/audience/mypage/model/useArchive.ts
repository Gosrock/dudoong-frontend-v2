'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { archiveQuery } from '@/api/me/queries';
import { flattenPages, infiniteListControls } from '@/api/shared/page';
import { eventHref } from '@/features/audience/routes';

import { archiveOrderHref, archiveYearTabs } from './lists';

/**
 * 관람 공연 아카이빙(`/mypage/archive`, GM-5). 연도 탭은 응답 `years`(전체 기준)로 만들고, 탭을 바꾸면 그 연도의 첫 페이지부터
 * 읽는다 — 읽는 동안 앞 연도의 탭·목록을 유지한다(`keepPreviousData`).
 * 공연마다 `orderHref` — `orderUuid`가 null(선물받은 티켓으로만 입장)이면 null이고 주문상세로 가지 않는다.
 */
export function useArchive() {
  const [year, setYear] = useState<number | null>(null);
  const list = useInfiniteQuery({ ...archiveQuery({ year }), placeholderData: keepPreviousData });

  const years = list.data?.pages[0]?.years;
  const tabs = useMemo(() => archiveYearTabs(years ?? []), [years]);
  const events = useMemo(
    () =>
      // GM-5 페이지는 `{ years, events: Page }`라 `events`만 꺼내 공용 `flattenPages`로 편다(코드 패턴 점검 A11)
      flattenPages(
        list.data && { ...list.data, pages: list.data.pages.map((p) => p.events) },
        (e) => e.eventId,
      ).map((e) => ({ ...e, orderHref: archiveOrderHref(e), eventHref: eventHref(e.eventId) })),
    [list.data],
  );

  return {
    year,
    setYear,
    tabs,
    events,
    listStatus: list.status,
    /** 탭을 바꿔 새 연도를 읽는 중(앞 목록을 보이는 중) */
    switching: list.isPlaceholderData,
    empty: list.status === 'success' && !list.isPlaceholderData && events.length === 0,
    ...infiniteListControls(list),
  };
}
