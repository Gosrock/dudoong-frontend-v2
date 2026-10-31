'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { homeQuery } from '@/api/event/queries';

/**
 * 공연홈(GP-1) — L 단계의 최소 마크업. 라우트가 `<Prefetch>`로 넘긴 캐시를 읽는다(`(public)`이라 Suspense 없음).
 * 배너·캐러셀·"두둥을 알아보기" 모양은 P5a-V에서 바꾼다.
 */
export function HomeView() {
  const { data } = useSuspenseQuery(homeQuery());
  return (
    <main>
      <h1>두둥</h1>
      <section aria-label="다가오는 공연">
        {data.events.length === 0 ? (
          <p>예정된 공연이 없어요.</p>
        ) : (
          <ul>
            {data.events.map((e) => (
              <li key={e.eventId}>
                <Link href={`/events/${e.eventId}`}>{e.name ?? '이름 없는 공연'}</Link>
                <span>{[e.startAt, e.placeName, e.hostName].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href="/events">공연 둘러보기</Link>
    </main>
  );
}
