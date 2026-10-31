'use client';

import Link from 'next/link';

import type { NoticeAudience } from '@/api/notice/schema';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { useNoticeList } from './model/useNoticeList';

/**
 * 공지 목록(`/notices` · `/hosting/notices`) — 스타일 없는 최소 마크업(P9c-L). 고정 표시·날짜 형식·하단 sentinel은 P9c-V(디자인 없음 — Q44).
 * 지금은 [더 보기] 버튼으로 다음 페이지를 읽는다.
 */
export function NoticeListView({ audience }: { audience: NoticeAudience }) {
  return (
    <main>
      <h1>공지사항</h1>
      <AsyncBoundary>
        <NoticeListContent audience={audience} />
      </AsyncBoundary>
    </main>
  );
}

function NoticeListContent({ audience }: { audience: NoticeAudience }) {
  const list = useNoticeList(audience);
  return (
    <>
      {list.empty && <p>아직 공지사항이 없어요</p>}
      <ul aria-label="공지 목록">
        {list.items.map((item) => (
          <li
            key={item.id}
            data-testid="notice"
            data-pinned={item.pinned ? 'true' : 'false'}
            data-host-only={item.hostOnly ? 'true' : 'false'}
          >
            {item.pinned && <span>고정</span>}
            <Link href={item.href}>{item.title}</Link>
            {item.createdAt && <time>{item.createdAt}</time>}
          </li>
        ))}
      </ul>
      {list.nextPageFailed ? (
        <button type="button" onClick={list.fetchNext}>
          다시 시도
        </button>
      ) : (
        list.hasNext && (
          <button type="button" onClick={list.fetchNext} disabled={list.isFetchingNext}>
            더 보기
          </button>
        )
      )}
    </>
  );
}
