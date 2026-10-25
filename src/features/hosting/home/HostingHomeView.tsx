'use client';

import Link from 'next/link';

import { NEW_EVENT_PATH } from '@/features/hosting/event/model/create-event-form';
import { useDeleteEvent } from '@/features/hosting/event/model/useDeleteEvent';

import { HOSTS_EMPTY_TITLE, NEW_HOST_HREF } from './model/hosting-home';
import { useHostingHome } from './model/useHostingHome';

type ListLike = {
  status: 'pending' | 'error' | 'empty' | 'success';
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: boolean;
  loadMore: () => void;
  retry: () => void;
};

/** `/hosting` 공연준비 홈 — 스타일 없는 최소 마크업(P10a-L). 카드·배지·무한 스크롤 sentinel·FAB은 P10a-V */
export function HostingHomeView() {
  const h = useHostingHome();
  const del = useDeleteEvent();
  const list = h.tab === 'hosts' ? h.hosts : h.events;
  return (
    <main>
      <h1>공연 준비 홈</h1>
      <div role="tablist" aria-label="공연준비 홈 탭">
        {h.tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={h.tab === t.key}
            onClick={() => h.setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          h.submitKeyword();
        }}
      >
        <input
          type="search"
          aria-label="검색"
          value={h.keywordInput}
          onChange={(e) => h.setKeywordInput(e.target.value)}
        />
      </form>
      <Link href={NEW_HOST_HREF}>새 호스트 만들기</Link>{' '}
      <Link href={NEW_EVENT_PATH}>새 공연 만들기</Link>
      {list.status === 'pending' && <p>불러오는 중</p>}
      {list.status === 'error' && (
        <p role="alert">
          불러오지 못했어요.{' '}
          <button type="button" onClick={list.retry}>
            다시 시도
          </button>
        </p>
      )}
      {h.tab === 'hosts' ? (
        <>
          {h.hosts.emptyKind === 'none' && (
            <p data-testid="hosting-empty">
              {HOSTS_EMPTY_TITLE} <Link href={NEW_HOST_HREF}>새 호스트 만들기</Link>
            </p>
          )}
          {h.hosts.emptyKind === 'search' && <p data-testid="hosting-empty">검색 결과가 없어요</p>}
          <ul aria-label="내 호스트">
            {h.hosts.items.map((host) => (
              <li key={host.hostId} data-testid="my-host">
                <Link href={host.href}>{host.name ?? '이름 없는 호스트'}</Link>{' '}
                <span data-testid="my-role">{host.myRole}</span>{' '}
                <span>공연 {host.eventCount}개</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {h.events.emptyKind === 'none' && <p data-testid="hosting-empty">등록한 공연이 없어요</p>}
          {h.events.emptyKind === 'search' && <p data-testid="hosting-empty">검색 결과가 없어요</p>}
          <ul aria-label="내 공연">
            {h.events.items.map((event) => (
              <li key={event.eventId} data-testid="my-event">
                <Link href={event.href}>{event.name ?? '이름 없는 공연'}</Link>{' '}
                <span>{event.hostName}</span> <span data-testid="my-role">{event.myRole}</span>{' '}
                <span>{event.displayStatus}</span>{' '}
                {event.canDelete && (
                  <button
                    type="button"
                    disabled={del.deletingId === event.eventId}
                    onClick={() => void del.deleteEvent(event)}
                  >
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {del.error && <p role="alert">{del.error}</p>}
      <MoreButton list={list} />
    </main>
  );
}

function MoreButton({ list }: { list: ListLike }) {
  if (list.nextPageError) {
    return (
      <p role="alert">
        더 불러오지 못했어요.{' '}
        <button type="button" onClick={list.retry}>
          다시 시도
        </button>
      </p>
    );
  }
  if (!list.hasNextPage) return null;
  return (
    <button type="button" onClick={list.loadMore} disabled={list.isFetchingNextPage}>
      더 보기
    </button>
  );
}
