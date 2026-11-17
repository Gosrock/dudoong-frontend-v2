'use client';

import Link from 'next/link';

import { hostHref } from '@/features/shared/routes';
import { button } from '@/ui/components/Button/Button.css';
import { fab, tone as fabTone } from '@/ui/components/Fab/Fab.css';
import { FAB_ATTR } from '@/ui/components/Fab/fab-attrs';
import { Header } from '@/ui/components/Header/Header';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { useActivityMarker } from '@/ui/hooks/useActivityMarker';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './HostEventsListView.css';
import { HOST_EVENTS_EMPTY } from './HostHomeView';
import { hostManageActions } from './model/host-home-rules';
import { useHostEvents, useHostViewer } from './model/useHostEvents';
import { HostEventCard } from './ui/HostEventCard';

/**
 * 호스트 공연 리스트 `/hosts/[hostId]/events`(Design Sync #262) — GUI `1423:2651` 마스터·매니저 뷰(준비중 포함 + [+]) ·
 * `1478:8878` 일반 멤버 · 관객 뷰(공개 공연만). 호스트 홈 [공연 리스트 >]에서 온다.
 * 2열 DS `ConcertCard`(사이 16 · 줄 사이 24), 준비중은 오른쪽 위 칩. 끝에 닿으면 다음 페이지(patterns §12).
 * PC(1024~, GUI `1496:12596` 마스터 · 매니저 뷰 — #295): 가운데 960, DS Top app bar(← 공연 리스트) + 오른쪽 [+ 공연 추가하기]
 * (Primary medium 아이콘 + 글자), 카드 163 · 사이 16 · 줄 사이 24. [+] 원 버튼은 모바일만.
 * 목록·역할은 호스트 홈과 같은 훅(같은 캐시) — 브라우저에서만 읽는다(GH-14, patterns §4-2).
 */
export function HostEventsListView({ hostId }: { hostId: string }) {
  const viewer = useHostViewer(hostId);
  const events = useHostEvents(hostId, viewer);
  const newEventHref =
    viewer.status === 'pending' || viewer.status === 'error'
      ? undefined
      : hostManageActions(hostId, viewer.myRole).find((a) => a.key === 'newEvent')?.href;

  return (
    <Container as="main" className={s.page}>
      {/* PC 제목 줄 — 모바일은 셸의 하위 화면 헤더(← 공연 리스트)가 제목이다 */}
      <div className={s.desktopTitle}>
        <Header
          className={s.desktopHeader}
          title="공연 리스트"
          backHref={hostHref(hostId)}
          linkAs={Link}
          trailing={
            newEventHref && (
              // GUI 로컬 "멤버 초대 버튼_데스크탑"(`1554:105204`) 안의 DS Button Primary medium + ic add
              <Link
                href={newEventHref}
                className={`${button({ variant: 'primary', size: 'md', iconText: true })} ${s.addLink}`}
              >
                <Icon name="add" className={s.addIcon} />
                공연 추가하기
              </Link>
            )
          }
        />
      </div>
      {events.status === 'pending' ? (
        <div className={s.grid} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Flex key={i} direction="column" gap={2}>
              <Skeleton className={s.skeletonPoster} />
              <Skeleton shape="text" width="80%" />
            </Flex>
          ))}
        </div>
      ) : events.status === 'error' ? (
        <InlineError message="공연을 불러오지 못했어요." onRetry={events.retry} />
      ) : events.status === 'empty' ? (
        <Txt as="p" typography="bodyMd">
          {HOST_EVENTS_EMPTY}
        </Txt>
      ) : (
        <>
          <ul className={s.grid} aria-label="공연">
            {events.items.map((item) => (
              <HostEventCard key={item.event.eventId} item={item} />
            ))}
          </ul>
          <LoadMoreSentinel list={events} />
        </>
      )}
      {newEventHref && <NewEventFab href={newEventHref} />}
    </Container>
  );
}

/** 오른쪽 아래 [+](GUI `1423:2693` DS Button round Primary) — 새 공연 만들기 링크 */
function NewEventFab({ href }: { href: string }) {
  const ref = useActivityMarker<HTMLAnchorElement>();
  return (
    <Link
      ref={ref}
      href={href}
      aria-label="새 공연 만들기"
      className={`${fab} ${fabTone.dark} ${s.fab}`}
      {...{ [FAB_ATTR]: '' }}
    >
      <Icon name="add" />
    </Link>
  );
}
