'use client';

import Link from 'next/link';

import { useFollowingHosts } from './model/useFollowingHosts';

/** `/mypage/following` 관심 호스트 — 스타일 없는 최소 마크업(P9-L). 카드 모양·무한 스크롤 sentinel은 P9-V */
export function FollowingHostsView() {
  const f = useFollowingHosts();
  return (
    <main>
      <h1>관심 호스트</h1>
      <div role="tablist" aria-label="관심 호스트 필터">
        {f.tabs.map((t) => (
          <button
            key={t.status}
            type="button"
            role="tab"
            aria-selected={f.status === t.status}
            onClick={() => f.setStatus(t.status)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {f.listStatus === 'pending' && <p>불러오는 중</p>}
      {f.listStatus === 'error' && (
        <p role="alert">
          불러오지 못했어요.{' '}
          <button type="button" onClick={f.retry}>
            다시 시도
          </button>
        </p>
      )}
      {f.empty && <p>관심 호스트가 없어요</p>}
      <ul>
        {f.hosts.map((h) => (
          <li key={h.hostId} data-testid="following-host">
            <Link href={h.href}>{h.name ?? '이름 없는 호스트'}</Link>
            {h.representativeEvent && h.eventHref && (
              <>
                {' '}
                <Link href={h.eventHref}>{h.representativeEvent.name}</Link>
              </>
            )}
            {h.badge && <span> {h.badge}</span>}{' '}
            <button
              type="button"
              onClick={() => f.unfollow(h.hostId)}
              disabled={f.isUnfollowing(h.hostId)}
            >
              관심 해제
            </button>
          </li>
        ))}
      </ul>
      {f.nextPageError ? (
        <p role="alert">
          더 불러오지 못했어요.{' '}
          <button type="button" onClick={f.retry}>
            다시 시도
          </button>
        </p>
      ) : (
        f.hasNextPage && (
          <button type="button" onClick={f.loadMore} disabled={f.isFetchingNextPage}>
            더 보기
          </button>
        )
      )}
    </main>
  );
}
