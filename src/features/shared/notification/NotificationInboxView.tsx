'use client';

import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { useNotificationInbox } from './model/useNotificationInbox';

/**
 * 알림함(`/mypage/notifications`) — 스타일 없는 최소 마크업(P9b-L). 카테고리 아이콘·빨간 점·상대 시간·하단 sentinel은 P9b-V에서 이 훅에 붙인다.
 * 지금은 [더 보기] 버튼으로 다음 페이지를 읽는다.
 */
export function NotificationInboxView() {
  return (
    <main>
      <h1>알림</h1>
      <AsyncBoundary holdOn={isSessionLost}>
        <NotificationInboxContent />
      </AsyncBoundary>
    </main>
  );
}

function NotificationInboxContent() {
  const inbox = useNotificationInbox();
  return (
    <>
      <button type="button" onClick={inbox.readAll} disabled={inbox.isReading}>
        모두 읽음
      </button>
      {inbox.empty && <p>아직 받은 알림이 없어요</p>}
      <ul aria-label="알림 목록">
        {inbox.items.map((item) => (
          <li
            key={item.id}
            data-testid="notification"
            data-category={item.category}
            data-read={item.isRead ? 'true' : 'false'}
          >
            {item.href ? (
              <Link href={item.href} onClick={() => inbox.open(item.id)}>
                {item.title}
              </Link>
            ) : (
              <button type="button" onClick={() => inbox.open(item.id)}>
                {item.title}
              </button>
            )}
            {!item.isRead && <span>안 읽음</span>}
            {item.categoryLabel && <span>{item.categoryLabel}</span>}
            <p>{item.body}</p>
            {item.createdAt && <time>{item.createdAt}</time>}
          </li>
        ))}
      </ul>
      {inbox.nextPageFailed ? (
        <button type="button" onClick={inbox.fetchNext}>
          다시 시도
        </button>
      ) : (
        inbox.hasNext && (
          <button type="button" onClick={inbox.fetchNext} disabled={inbox.isFetchingNext}>
            더 보기
          </button>
        )
      )}
    </>
  );
}
