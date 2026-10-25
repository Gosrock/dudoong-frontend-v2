'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { eventDetailQuery, eventSectionsQuery } from '@/api/event/queries';
import { toSectionTabs } from '@/features/shared/section-viewer/model/section-tabs';

import { eventSchedule } from './event-schedule';
import { eventTitle } from './event-summary';
import { toHashtags } from './hashtags';

/**
 * 공연 상세 화면 상태(UI 무관). 라우트가 `<Prefetch>`로 GP-3 + GE-5를 넘겨 주므로 `useSuspenseQuery`로 읽는다
 * — `(public)`에는 Suspense가 없지만 캐시가 차 있어 멈추지 않는다(patterns §14).
 * 재고(GP-5)는 여기서 읽지 않는다(티켓 선택 P6이 브라우저에서 따로 읽는다).
 *
 * 돌려주는 값: 원본 `event`, 제목, 일시 표시값, 해시태그, 섹션 탭(sanitize된 HTML).
 * 문의처는 사용자별 값이라(로그인하면 원문, 아니면 가린 값) 여기서 돌려주지 않는다 — `useEventContacts`.
 */
export function useEventDetail(eventId: string) {
  const { data: event } = useSuspenseQuery(eventDetailQuery(eventId));
  const { data: sections } = useSuspenseQuery(eventSectionsQuery(eventId));

  const derived = useMemo(
    () => ({
      title: eventTitle(event),
      schedule: eventSchedule(event),
      hashtags: toHashtags(event.tags),
    }),
    [event],
  );
  const tabs = useMemo(() => toSectionTabs(sections), [sections]);

  return { event, ...derived, tabs };
}
