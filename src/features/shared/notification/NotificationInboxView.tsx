'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { isSessionLost } from '@/api/errors';
import { formatKstRelative } from '@/api/shared/date';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { NotificationIcon, NotificationView } from './model/notification-kind';
import { useNotificationInbox } from './model/useNotificationInbox';
import * as s from './NotificationInboxView.css';

/**
 * 카테고리 아이콘(gui-screens §1 `331:11574` — 선물·티켓·시계). 공연 알림의 `alarm-clock`은 디자인 시스템에 없어
 * `clock`으로 둔다(design-requests Q47). 모르는 타입은 벨 아이콘
 */
const CATEGORY_ICON: Record<NotificationIcon, ReactNode> = {
  gift: <Icon name="gift" />,
  ticket: <Icon name="ticket" />,
  'alarm-clock': <Icon name="clock" />,
  // 주문취소·환불(관객)은 티켓, 호스트 주문 알림은 주문 상세, 멤버 추가는 사람 — 🤖 Claude 판단(#106, Q90)
  'order-detail': <Icon name="order-detail" />,
  people: <Icon name="people" />,
  default: <Icon name="notification" />,
};

/**
 * 알림함(`/mypage/notifications`, P9b-V) — 와이어 근거(모바일 `128:2827` · PC `668:4772`, GUI `331:11574`·`336:13684`는 Ready 아님).
 * 관객·호스팅 센터 벨이 모두 여기로 온다. 문구는 서버 `title`·`body` 그대로, 카테고리 이름·아이콘만 타입으로 정한다(plan P9b).
 * 안 읽음은 빨간 점 + 진한 글자, 시간은 상대 시간. 아래 끝에 닿으면 다음 페이지(`LoadMoreSentinel`).
 */
export function NotificationInboxView() {
  return (
    <main>
      <Container className={s.page}>
        <AsyncBoundary holdOn={isSessionLost}>
          <NotificationInboxContent />
        </AsyncBoundary>
      </Container>
    </main>
  );
}

function NotificationInboxContent() {
  const inbox = useNotificationInbox();
  // 데이터는 게이트 뒤 브라우저에서만 읽는다(서버 렌더 없음) — 지금 시각으로 상대 시간을 계산해도 하이드레이션이 어긋나지 않는다
  const now = new Date();
  return (
    <>
      <div className={s.titleRow}>
        <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
          알림함
        </Txt>
        {!inbox.empty && (
          <div className={s.titleAction}>
            {/* 와이어 PC "모두읽음처리" 글자 버튼 → DS Button secondary sm. 모바일 와이어의 "ㅍ ⌄" 자리는 뜻이 없어 같은 버튼(결정) */}
            <Button
              variant="secondary"
              size="sm"
              onClick={inbox.readAll}
              disabled={inbox.isReading || !inbox.hasUnread}
            >
              모두 읽음
            </Button>
          </div>
        )}
      </div>
      {inbox.empty ? (
        <EmptyState className={s.empty} description="아직 받은 알림이 없어요" />
      ) : (
        <ul aria-label="알림 목록" className={s.list}>
          {inbox.items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              now={now}
              onOpen={() => inbox.open(item.id)}
            />
          ))}
        </ul>
      )}
      <LoadMoreSentinel
        list={{
          hasNextPage: inbox.hasNext,
          isFetchingNextPage: inbox.isFetchingNext,
          nextPageError: inbox.nextPageFailed,
          loadMore: inbox.fetchNext,
          retry: inbox.fetchNext,
        }}
      />
    </>
  );
}

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: NotificationView;
  now: Date;
  onOpen: () => void;
}) {
  const unread = !item.isRead;
  const body = (
    <>
      <span className={s.iconCell}>
        {CATEGORY_ICON[item.icon]}
        {unread && <span className={s.unreadDot} aria-hidden />}
      </span>
      <span className={s.content}>
        <span className={s.meta}>
          <Txt
            typography="labelSm"
            color={unread ? colors.textSecondaryLabel : colors.textTertiaryLabel}
          >
            {unread && <span className={s.srOnly}>안 읽음 · </span>}
            {item.categoryLabel ?? '알림'}
          </Txt>
          {item.createdAt && (
            <Txt
              as="time"
              typography="labelSm"
              color={unread ? colors.textSecondaryLabel : colors.textTertiaryLabel}
            >
              {formatKstRelative(item.createdAt, now)}
            </Txt>
          )}
        </span>
        <Txt
          typography={unread ? 'labelLgEmphasized' : 'labelLg'}
          color={unread ? colors.textPrimaryLabel : colors.textSecondaryLabel}
          className={s.text}
        >
          {item.title}
        </Txt>
        {item.body && (
          <Txt
            typography="bodyMd"
            color={unread ? colors.textSecondaryLabel : colors.textTertiaryLabel}
            className={s.text}
          >
            {item.body}
          </Txt>
        )}
      </span>
    </>
  );
  return (
    <li
      className={s.item}
      data-testid="notification"
      data-category={item.category}
      data-read={item.isRead ? 'true' : 'false'}
    >
      {item.href ? (
        <Link href={item.href} onClick={onOpen} className={s.row}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} className={s.row}>
          {body}
        </button>
      )}
    </li>
  );
}
