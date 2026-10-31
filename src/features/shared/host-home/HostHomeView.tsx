'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { LoginRequiredLink } from '@/features/shared/auth/LoginRequiredLink';
import { CONTACT_ICON } from '@/features/shared/contact/ui/ContactList';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { ListHeader } from '@/ui/components/ListHeader/ListHeader';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './HostHomeView.css';
import type { HostManageKey } from './model/host-home-rules';
import { useHostHome } from './model/useHostHome';
import { openHostContacts } from './ui/HostContactsOverlay';
import { HostEventCard } from './ui/HostEventCard';
import * as card from './ui/HostEventCard.css';

/** 공연 목록이 비었을 때(L 문구 그대로) */
export const HOST_EVENTS_EMPTY = '두둥! 등록한 공연이 없습니다.';

/**
 * 호스트 홈 `/hosts/[hostId]`(plan P5c V) — **와이어 근거**: `503:30867` 마스터·매니저(⚙ · [+ 새 공연 만들기]) ·
 * `529:34027` 멤버(⚙·FAB 없음, 멤버 줄 있음) · `503:30477` 관객(멤버 줄 없음). 한 화면이 `myRole`로 나뉜다(`can` — 훅).
 * 위에서부터 배너(+⚙) · 원형 로고 · 이름 + ♡ · 멤버 수·개설일 · 소개 · 연락처 아이콘 · [멤버 >] 아바타 줄 · 공연 리스트(가로).
 * 공개 값(GH-3)은 서버에서 받은 것을 바로 그리고, 사용자별 값(♡·관리·멤버)과 공연 목록은 하이드레이션 뒤 브라우저에서 읽는다.
 */
export function HostHomeView({ hostId }: { hostId: string }) {
  const h = useHostHome(hostId);
  const { follow, host } = h;
  const manage = h.manage.status === 'ready' ? h.manage.actions : [];
  const hrefOf = (key: HostManageKey) => manage.find((a) => a.key === key)?.href;
  const settingsHref = hrefOf('settings');
  const newEventHref = hrefOf('newEvent');
  const membersHref = hrefOf('members');
  const hostName = host.name ?? '이름 없는 호스트';

  return (
    <Container as="main" className={s.page}>
      <div className={s.banner}>
        {host.coverImageUrl && (
          // 업로드 배경 이미지를 그대로 그린다(Avatar와 같은 이유 — 이미지 최적화는 정하지 않았다)
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.cover} src={host.coverImageUrl} alt="" decoding="async" />
        )}
        {/* 관리 버튼은 viewer가 확정되고 `can`이 허락할 때만 — 확정 전에는 그리지 않는다(자리는 배너·화면 고정이라 밀리지 않는다) */}
        {(settingsHref || newEventHref) && (
          <nav aria-label="호스트 관리">
            {settingsHref && (
              <Link
                href={settingsHref}
                aria-label="설정"
                className={`${button({ variant: 'secondary', size: 'sm', iconOnly: true })} ${s.settings}`}
              >
                <Icon name="settings" />
              </Link>
            )}
            {newEventHref && (
              <Link
                href={newEventHref}
                className={`${button({ variant: 'dark', size: 'md' })} ${s.fab}`}
              >
                <Icon name="add" />새 공연 만들기
              </Link>
            )}
          </nav>
        )}
      </div>

      <Avatar size={80} src={host.profileImageUrl} className={s.logo} />

      <section className={s.profile} aria-label="호스트 정보">
        <div className={s.nameRow}>
          <Txt as="h1" typography="headingLgEmphasized" lines={2}>
            {hostName}
          </Txt>
          {follow.status === 'login' ? (
            <LoginRequiredLink aria-label="관심 호스트" className={s.follow}>
              <Icon name="favorite" />
            </LoginRequiredLink>
          ) : (
            <button
              type="button"
              className={s.follow}
              aria-label="관심 호스트"
              aria-pressed={follow.isFollowing}
              disabled={follow.status === 'disabled'}
              onClick={follow.status === 'ready' ? follow.toggle : undefined}
            >
              <Icon name="favorite" />
            </button>
          )}
        </div>

        <div className={s.meta}>
          <span className={s.metaItem}>
            <Icon name="people" className={s.metaIcon} />
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              <span className={s.srOnly}>멤버 </span>
              {h.memberCount}
              <span className={s.srOnly}>명</span>
            </Txt>
          </span>
          {h.createdOn && (
            <span className={s.metaItem}>
              <Icon name="calendar" className={s.metaIcon} />
              <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
                <span className={s.srOnly}>개설일 </span>
                {h.createdOn}
              </Txt>
            </span>
          )}
        </div>

        {host.introduce && (
          <Txt as="p" typography="bodyMd" className={s.introduce}>
            {host.introduce}
          </Txt>
        )}

        {h.contacts.items.length > 0 && (
          <ul
            className={s.contacts}
            aria-label="연락처"
            aria-busy={h.contacts.status === 'pending' || undefined}
          >
            {h.contacts.items.map((c, i) => (
              <li key={`${c.type}-${i}`}>
                <button
                  type="button"
                  className={s.contactButton}
                  aria-label={`연락처 보기 — ${c.label}`}
                  onClick={() => openHostContacts(hostId)}
                >
                  <Icon {...CONTACT_ICON[c.type]} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {h.viewerStatus === 'error' && (
          <Flex align="center" gap={2}>
            <Txt typography="labelSm" color={colors.textTertiaryLabel}>
              내 관심·권한 정보를 불러오지 못했어요.
            </Txt>
            <Button variant="secondary" size="sm" onClick={h.retryViewer}>
              다시 시도
            </Button>
          </Flex>
        )}
      </section>

      {h.members && (
        <section className={s.section} aria-labelledby="host-members-title">
          <ListHeader
            title={
              membersHref ? (
                <Link href={membersHref} className={s.sectionLink} id="host-members-title">
                  멤버
                  <Icon name="chevron-right" />
                </Link>
              ) : (
                <span id="host-members-title">멤버</span>
              )
            }
          />
          <ul className={s.scroller} aria-label="멤버">
            {h.members.map((m) => (
              <li key={m.userId} className={s.member}>
                <Avatar size={52} src={m.profileImageUrl} />
                <Txt typography="labelSm" lines={1} align="center">
                  {m.name ?? '이름 없음'}
                </Txt>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className={s.section}
        aria-labelledby="host-events-title"
        aria-busy={h.events.status === 'pending' || undefined}
      >
        <ListHeader title={<span id="host-events-title">공연 리스트</span>} />
        <HostEvents events={h.events} />
      </section>
    </Container>
  );
}

type Events = ReturnType<typeof useHostHome>['events'];

/** 공연 리스트 — 하이드레이션 뒤 스켈레톤 → 가로 카드 줄. 끝에 닿으면 다음 페이지(patterns §12) */
function HostEvents({ events }: { events: Events }) {
  if (events.status === 'pending') {
    return (
      <div className={s.scroller} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Flex key={i} direction="column" gap={2} className={card.item}>
            <Skeleton className={card.skeletonPoster} />
            <Skeleton shape="text" width="80%" />
          </Flex>
        ))}
      </div>
    );
  }
  if (events.status === 'error') {
    return (
      <div role="alert">
        <Flex direction="column" align="center" gap={3} fullWidth>
          <Txt typography="bodyMd" color={colors.textSecondary}>
            공연을 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={events.retry}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (events.status === 'empty') {
    return <EmptyState title={HOST_EVENTS_EMPTY} />;
  }
  return (
    <ul className={s.scroller} aria-label="공연">
      {events.items.map((item) => (
        <HostEventCard key={item.event.eventId} item={item} />
      ))}
      <EventsTail events={events} />
    </ul>
  );
}

/** 가로 줄 끝 — 보이면 다음 페이지를 읽고, 실패하면 기존 카드를 둔 채 재시도 버튼 */
function EventsTail({ events }: { events: Events }) {
  const ref = useRef<HTMLLIElement>(null);
  const { hasNextPage, nextPageError, loadMore } = events;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || nextPageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '0px 200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, nextPageError, loadMore]);

  if (!hasNextPage && !nextPageError) return null;
  return (
    <li ref={ref} className={s.sentinel}>
      {nextPageError ? (
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="update" />}
          aria-label="공연 더 불러오기"
          onClick={events.retry}
        />
      ) : (
        <Spinner />
      )}
    </li>
  );
}
