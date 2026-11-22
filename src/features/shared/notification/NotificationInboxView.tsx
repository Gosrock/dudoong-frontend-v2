'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';

import { isSessionLost } from '@/api/errors';
import { formatKstRelative } from '@/api/shared/date';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Badge } from '@/ui/components/Badge/Badge';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { NotificationIcon, NotificationTab } from './model/notification-kind';
import { type InboxItem, useNotificationInbox } from './model/useNotificationInbox';
import * as s from './NotificationInboxView.css';

/**
 * 행 머리 아이콘(GUI — 관객 창 `ic_*` filled · 호스트 창 outline). 관객 창: 선물 `ic_gift` · 주문 `ic_ticket` · 공연 `ic_clock`.
 * 호스트 창: 주문 `ic_order-detail` · 멤버 `ic_people`. 모르는 타입은 벨(`ic_notification` — Figma에 없음, 🤖)
 */
function RowIcon({ icon, tab }: { icon: NotificationIcon; tab: NotificationTab }) {
  const filled = tab === 'audience';
  switch (icon) {
    case 'gift':
      return filled ? <Icon name="gift" variant="filled" /> : <Icon name="gift" />;
    case 'ticket':
      return filled ? <Icon name="ticket" variant="filled" /> : <Icon name="ticket" />;
    case 'clock':
      return filled ? <Icon name="clock" variant="filled" /> : <Icon name="clock" />;
    case 'order-detail':
      return <Icon name="order-detail" />;
    case 'people':
      return <Icon name="people" />;
    case 'default':
      return <Icon name="notification" />;
  }
}

/**
 * 알림함(`/mypage/notifications`) — GUI 관객 창 `1047:4070` · 호스트 창 `2025:1471`(2026-11-22 Ready, 모바일 390 — #375 · #376).
 * 모바일: ← 알림함(셸 `AudienceSubHeader` = DS Top app bar) / [관객 | 호스트](DS tab, 다른 창에 새 알림이 있으면 DS Badge small) … 최신순 ▾
 * (DS SortButton) / 행: 아이콘 · 알림 이름 … 상대 시간 / 본문. 읽은 행은 흐리게. PC 프레임은 없어 가운데 한 열(🤖).
 * 관객·호스팅 센터 벨이 모두 여기로 온다. 창을 열면 그 창의 새 알림을 읽음 처리한다(`useNotificationInbox`).
 */
export function NotificationInboxView() {
  return (
    <main className={s.page}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        알림함
      </Txt>
      <AsyncBoundary holdOn={isSessionLost}>
        <NotificationInboxContent />
      </AsyncBoundary>
    </main>
  );
}

function NotificationInboxContent() {
  const inbox = useNotificationInbox();
  // 데이터는 게이트 뒤 브라우저에서만 읽는다(서버 렌더 없음) — 지금 시각으로 상대 시간을 계산해도 하이드레이션이 어긋나지 않는다
  const now = new Date();
  return (
    <Tabs value={inbox.tab} onValueChange={(v) => inbox.setTab(v as NotificationTab)}>
      <div className={s.toolbar}>
        {/* DS tab(gui `1184:33745` · `2025:1475`, 모바일 — 채움 덮어쓰기는 흰 바탕 그대로라 변형 없음).
            다른 창 새 알림 점은 DS Badge small(`2009:35590` · `2025:1477`)을 탭 글자 오른쪽 위에 */}
        <TabList aria-label="알림 창">
          {inbox.tabs.map((t) => (
            <Tab key={t.key} value={t.key} className={s.tab}>
              {t.label}
              {t.hasUnread && (
                <>
                  <Badge size="small" className={s.tabDot} />
                  <VisuallyHidden> · 새 알림</VisuallyHidden>
                </>
              )}
            </Tab>
          ))}
        </TabList>
        {/* DS SortButton(gui `1047:4204` · `2025:1476` — "최신순" + chevron-down 12). GN-1에 정렬이 없어(B75) 최신순 하나 — 고정 라벨,
            누를 수 없다(주문내역 · 공연 리스트와 같게, design-system §3 SortButton). "오래된순"은 서버 답 뒤 — Figma 코멘트 */}
        <span className={s.sort}>
          <Txt typography="labelMd" color={colors.textPrimaryLabel}>
            {inbox.sortLabel}
          </Txt>
          <Icon name="chevron-down" size={12} />
        </span>
      </div>
      {inbox.tabs.map((t) => (
        <TabPanel key={t.key} value={t.key}>
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
        </TabPanel>
      ))}
    </Tabs>
  );
}

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: InboxItem;
  now: Date;
  onOpen: () => void;
}) {
  const body = (
    <>
      <span className={s.head}>
        <span className={s.name}>
          <span className={s.icon}>
            <RowIcon icon={item.icon} tab={item.tab} />
          </span>
          <Txt typography="headingSmEmphasized" className={s.label}>
            {item.isNew && <VisuallyHidden>새 알림 · </VisuallyHidden>}
            {item.label}
          </Txt>
        </span>
        {item.createdAt && (
          <Txt
            as="time"
            typography="headingSm"
            color={colors.interactionInactive}
            className={s.time}
          >
            {formatKstRelative(item.createdAt, now)}
          </Txt>
        )}
      </span>
      <Txt typography="bodyLg" className={s.text}>
        {item.text}
      </Txt>
    </>
  );
  return (
    <li
      className={s.item}
      data-testid="notification"
      data-tab={item.tab}
      data-type={item.type}
      data-read={item.isRead ? 'true' : 'false'}
      data-new={item.isNew ? 'true' : 'false'}
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
