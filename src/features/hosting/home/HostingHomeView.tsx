'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { meQuery } from '@/api/me/queries';
import { NEW_EVENT_PATH } from '@/features/hosting/event/model/create-event-form';
import { useDeleteEvent } from '@/features/hosting/event/model/useDeleteEvent';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import {
  LoadMoreSentinel,
  type LoadMoreState,
} from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { SearchField } from '@/ui/components/SearchField/SearchField';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './HostingHomeView.css';
import {
  EVENTS_EMPTY_TITLE,
  EVENTS_SEARCH_EMPTY_TITLE,
  HOSTS_SEARCH_EMPTY_TITLE,
} from './model/home-cards';
import {
  type HostingEmptyKind,
  type HostingHomeTab,
  HOSTS_EMPTY_TITLE,
  NEW_HOST_HREF,
} from './model/hosting-home';
import { useHostingHome } from './model/useHostingHome';
import { MyEventCard, MyHostCard } from './ui/HomeCards';
import * as cards from './ui/HomeCards.css';

type ListLike = LoadMoreState & {
  status: 'pending' | 'error' | 'empty' | 'success';
  emptyKind: HostingEmptyKind | null;
};

const CREATE = {
  events: { href: NEW_EVENT_PATH, label: '새 공연 만들기' },
  hosts: { href: NEW_HOST_HREF, label: '새 호스트 만들기' },
} as const;

/**
 * `/hosting` 공연준비 홈(plan P10a V) — **와이어 근거**(`424:11664` 공연 탭 · `424:9715` 호스트 탭 · `487:15070`·`487:15360` 빈 상태 ·
 * `529:35358`~`531:12470` 검색). GUI 모바일·PC 프레임은 Ready for dev가 아니라 모양을 가져오지 않는다(design-workflow §3).
 * - 모바일: 셸 로고 헤더 아래 탭 [공연][호스트] + 검색 + 오른쪽 아래 고정 [+ 새 … 만들기]
 * - PC(1024~): 제목 "{닉네임}님의 공연 준비 홈" + 같은 탭 줄 오른쪽에 같은 [+ 새 … 만들기](같은 DOM, CSS로 자리만 바꾼다)
 */
export function HostingHomeView() {
  const h = useHostingHome();
  const me = useQuery(meQuery());
  const del = useDeleteEvent();
  const [searchOpen, setSearchOpen] = useState(false);
  const list: ListLike = h.tab === 'hosts' ? h.hosts : h.events;
  const create = CREATE[h.tab];

  const closeSearch = () => {
    h.setKeywordInput('');
    setSearchOpen(false);
  };

  const confirmDelete = (event: Parameters<typeof del.deleteEvent>[0] & { name: string | null }) =>
    void openConfirm({
      title: '공연을 삭제할까요?',
      description: event.name
        ? `'${event.name}'을(를) 삭제하면 되돌릴 수 없어요.`
        : '삭제하면 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      onConfirm: () => del.deleteEvent(event),
    });

  return (
    <main className={s.page}>
      <div className={s.desktopTitle}>
        <Txt as="h1" typography="headingLgEmphasized" color={colors.textPrimaryLabel}>
          {me.data?.name ? `${me.data.name}님의 공연 준비 홈` : '공연 준비 홈'}
        </Txt>
      </div>

      {searchOpen && (
        <form
          role="search"
          className={s.searchRow}
          onSubmit={(e) => {
            e.preventDefault();
            h.submitKeyword();
          }}
        >
          <button
            type="button"
            className={s.iconButton}
            aria-label="검색 닫기"
            onClick={closeSearch}
          >
            <Icon name="backward" />
          </button>
          <SearchField
            className={s.searchField}
            aria-label="검색"
            placeholder={h.tab === 'hosts' ? '내 호스트 검색' : '내 공연 검색'}
            autoFocus
            value={h.keywordInput}
            onChange={(e) => h.setKeywordInput(e.target.value)}
          />
        </form>
      )}

      <Tabs value={h.tab} onValueChange={(v) => h.setTab(v as HostingHomeTab)}>
        <div className={s.tabRow}>
          <TabList aria-label="공연준비 홈 탭" className={s.tabList}>
            {h.tabs.map((t) => (
              <Tab key={t.key} value={t.key}>
                {t.label}
              </Tab>
            ))}
          </TabList>
          {!searchOpen && (
            <button
              type="button"
              className={s.iconButton}
              aria-label="검색 열기"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" />
            </button>
          )}
          {list.emptyKind !== 'none' && (
            <Link
              href={create.href}
              className={`${button({ variant: 'dark', size: 'md' })} ${s.createAction}`}
            >
              <Icon name="add" />
              {create.label}
            </Link>
          )}
        </div>

        <TabPanel value="events" className={s.panel}>
          <ListArea
            list={h.events}
            empty={
              h.events.emptyKind === 'search' ? (
                <Empty description={EVENTS_SEARCH_EMPTY_TITLE} />
              ) : (
                <Empty
                  description={EVENTS_EMPTY_TITLE}
                  action={{ href: NEW_EVENT_PATH, label: CREATE.events.label }}
                />
              )
            }
          >
            <ul className={cards.list} aria-label="내 공연">
              {h.events.items.map((event) => (
                <MyEventCard
                  key={event.eventId}
                  event={event}
                  deleting={del.deletingId === event.eventId}
                  onDelete={confirmDelete}
                />
              ))}
            </ul>
            {del.error && (
              <div role="alert">
                <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
                  {del.error}
                </Txt>
              </div>
            )}
          </ListArea>
        </TabPanel>

        <TabPanel value="hosts" className={s.panel}>
          <ListArea
            list={h.hosts}
            empty={
              h.hosts.emptyKind === 'search' ? (
                <Empty description={HOSTS_SEARCH_EMPTY_TITLE} />
              ) : (
                <Empty
                  description={HOSTS_EMPTY_TITLE}
                  action={{ href: NEW_HOST_HREF, label: CREATE.hosts.label }}
                />
              )
            }
          >
            <ul className={cards.list} aria-label="내 호스트">
              {h.hosts.items.map((host) => (
                <MyHostCard key={host.hostId} host={host} />
              ))}
            </ul>
          </ListArea>
        </TabPanel>
      </Tabs>
    </main>
  );
}

/** 목록 하나의 상태 — 읽는 중 · 실패(다시 시도) · 빈 상태 · 카드 + 하단 sentinel */
function ListArea({
  list,
  empty,
  children,
}: {
  list: ListLike;
  empty: ReactNode;
  children: ReactNode;
}) {
  if (list.status === 'pending') {
    return (
      <div className={s.listArea} role="status" aria-label="불러오는 중">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={165} />
        ))}
      </div>
    );
  }
  if (list.status === 'error') {
    return (
      <div role="alert" className={s.centered}>
        <Flex direction="column" align="center" gap={3}>
          <Txt as="p" typography="bodyLg" color={colors.textSecondary}>
            불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={list.retry}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (list.status === 'empty') {
    return (
      <div data-testid="hosting-empty" className={s.centered}>
        {empty}
      </div>
    );
  }
  return (
    <div className={s.listArea}>
      {children}
      <LoadMoreSentinel list={list} />
    </div>
  );
}

function Empty({
  description,
  action,
}: {
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <EmptyState
      illustration={<Illustration name="no-search-result" />}
      description={description}
      action={
        action && (
          <EmptyStateAction href={action.href} icon={<Icon name="add" />}>
            {action.label}
          </EmptyStateAction>
        )
      }
    />
  );
}
