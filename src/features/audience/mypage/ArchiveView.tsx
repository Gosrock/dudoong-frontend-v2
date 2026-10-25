'use client';

import Link from 'next/link';

import { useArchive } from './model/useArchive';

/** `/mypage/archive` 관람 공연 아카이빙 — 스타일 없는 최소 마크업(P9-L). 포스터 그리드는 P9-V */
export function ArchiveView() {
  const a = useArchive();
  return (
    <main>
      <h1>관람 공연 아카이빙</h1>
      <div role="tablist" aria-label="연도">
        {a.tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={a.year === t.year}
            onClick={() => a.setYear(t.year)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {a.listStatus === 'pending' && <p>불러오는 중</p>}
      {a.listStatus === 'error' && (
        <p role="alert">
          불러오지 못했어요.{' '}
          <button type="button" onClick={a.retry}>
            다시 시도
          </button>
        </p>
      )}
      {a.empty && <p>아직 관람한 공연이 없어요</p>}
      <ul>
        {a.events.map((e) => (
          <li key={e.eventId} data-testid="archive-event">
            {e.orderHref ? <Link href={e.orderHref}>{e.name}</Link> : <span>{e.name}</span>}{' '}
            {e.host.name} {e.startAt}
          </li>
        ))}
      </ul>
      {a.nextPageError ? (
        <p role="alert">
          더 불러오지 못했어요.{' '}
          <button type="button" onClick={a.retry}>
            다시 시도
          </button>
        </p>
      ) : (
        a.hasNextPage && (
          <button type="button" onClick={a.loadMore} disabled={a.isFetchingNextPage}>
            더 보기
          </button>
        )
      )}
    </main>
  );
}
