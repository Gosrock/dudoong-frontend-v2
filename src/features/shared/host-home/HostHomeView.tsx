'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { LoginRequiredLink } from '@/features/shared/auth/LoginRequiredLink';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { fab, tone as fabTone } from '@/ui/components/Fab/Fab.css';
import { FAB_ATTR } from '@/ui/components/Fab/fab-attrs';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { useActivityMarker } from '@/ui/hooks/useActivityMarker';
import { Icon } from '@/ui/icons/Icon';
import { assetSrc } from '@/ui/illustrations/assetSrc';
import coverDefault from '@/ui/illustrations/host-cover-default.svg';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './HostHomeView.css';
import {
  contactIconsOf,
  hostContactTapOf,
  hostEventsHref,
  type HostManageKey,
} from './model/host-home-rules';
import { useHostHome } from './model/useHostHome';
import {
  HOST_CONTACT_ICON,
  openHostContactPopup,
  openHostContacts,
  openLoginForContacts,
} from './ui/HostContactsOverlay';
import { HostEventCard } from './ui/HostEventCard';
import * as card from './ui/HostEventCard.css';
import { HostCoverButtons, HostHomeTopBar } from './ui/HostHomeTopBar';
import * as bar from './ui/HostHomeTopBar.css';
import { HostIntroduce } from './ui/HostIntroduce';

/** 공연 목록이 비었을 때(GUI `741:30970` "아직 등록한 공연이 없어요.") */
export const HOST_EVENTS_EMPTY = '아직 등록한 공연이 없어요.';

/**
 * 호스트 홈 `/hosts/[hostId]`(plan P5c V) — **GUI 근거**(Design Sync #257 · #261 · #262, 모바일 Ready만):
 * `741:30896` 하트 눌림 · `741:30970` 안눌림 · `741:31027` 스크롤 · `1452:40783` 이미지 없음(호스트 뷰) · `1452:41324` 이미지 없음(관객 뷰) ·
 * `1464:4953` · `1465:5019` 소개글 접힘/펼침 · `1481:7194` 연락처 전체 보기 · `1481:7454` 같은 종류 여러 개 · `1481:7911` 4개 이하 ·
 * `1481:7672` 로그인 전 연락처 · `1484:8106` 로그인 전 연락처 누름.
 * 모바일: 커버(2:1 + 딤 30% — #279 · #280)가 화면 맨 위에서 시작하고 원형 [←] · [⚙]가 떠 있다 — 커버가 지나가면 흰 상단 바(← 이름 ⚙, `HostHomeTopBar`).
 * 가운데 정렬 프로필(100) · 이름(Title) · 소개(3줄 + 더보기) · 연락처 아이콘 · 멤버 수 · 개설일 → [멤버 >] → [공연 리스트 >].
 * PC(1024~, #290 Ready `1495:8685` 마스터 · `1495:9022` 관객 커버 없음 · `1495:9120` 소개 접힘): 셸 상단 바 아래 폭 가득 커버 300 +
 * 오른쪽 위 흰 원 ⚙, 가운데 960 본문 · 프로필 140, [+] 없음.
 * 연락처 아이콘(#281 · #287 · #291): 전화 · 이메일 · 기타(글자)는 연락처 팝업, 링크는 바로 연다, 로그인 전 가린 값은 로그인 필요.
 * 공개 값(GH-3)은 서버에서 받은 것을 바로 그리고, 사용자별 값(♡·관리·멤버)과 공연 목록은 하이드레이션 뒤 브라우저에서 읽는다.
 */
export function HostHomeView({ hostId }: { hostId: string }) {
  const home = useHostHome(hostId);
  const router = useRouter();
  const { follow, host } = home;
  const manage = home.manage.status === 'ready' ? home.manage.actions : [];
  const hrefOf = (key: HostManageKey) => manage.find((a) => a.key === key)?.href;
  const settingsHref = hrefOf('settings');
  const newEventHref = hrefOf('newEvent');
  const membersHref = hrefOf('members');
  const hostName = host.name ?? '이름 없는 호스트';
  const bannerRef = useRef<HTMLDivElement>(null);
  const contacts = contactIconsOf(home.contacts.items);

  return (
    <main className={s.page}>
      <HostHomeTopBar title={hostName} settingsHref={settingsHref} watchRef={bannerRef} />

      <div ref={bannerRef} className={s.banner}>
        {/* 커버가 없거나 못 불러오면 GUI 로컬 컴포넌트 "커버 이미지 기본"(`1452:40910`, 관객·호스트 뷰 `1452:41324` · `1452:40783`) */}
        {host.coverImageUrl ? (
          // 업로드 배경(업로드 출처면 `/_next/image` 최적화 — P15). 화면 폭 · PC 높이 300(HostHomeView.css `banner`)
          <UploadedImage
            className={s.cover}
            src={host.coverImageUrl}
            alt=""
            width={1440}
            height={720}
            sizes="100vw"
            decoding="async"
            fallback={<DefaultCover />}
          />
        ) : (
          <DefaultCover />
        )}
        <div className={s.coverDim} aria-hidden="true" />
        <HostCoverButtons settingsHref={settingsHref} />
        {/* PC의 ⚙ — 커버 오른쪽 위 흰 원(`1495:8784`). 모바일은 커버 위 흰 원(`HostCoverButtons`). viewer가 확정되고 `can`이 허락할 때만 */}
        {settingsHref && (
          <span className={s.desktopSettings}>
            <Link href={settingsHref} aria-label="설정" className={bar.circle}>
              <Icon name="settings" />
            </Link>
          </span>
        )}
      </div>

      <div className={s.body}>
        <section className={s.profile} aria-label="호스트 정보">
          {/* FIGMA-CUSTOM: 프로필 원(gui 1452:40959 흰 원 100 + 이미지) — Figma대로 Avatar 100, 사진이 없으면 "프로필 이미지 기본"(1452:40909) */}
          <Avatar size={100} src={host.profileImageUrl} fallback="host" className={s.logo} />
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

          <Flex direction="column" gap={1} fullWidth className={s.nameBlock}>
            <Txt as="h1" typography="title" lines={2} className={s.name}>
              {hostName}
            </Txt>
            {host.introduce && <HostIntroduce text={host.introduce} />}
          </Flex>

          {contacts.shown.length > 0 && (
            <ul
              className={s.contacts}
              aria-label="연락처"
              aria-busy={home.contacts.status === 'pending' || undefined}
            >
              {contacts.shown.map((c, i) => {
                const tap = hostContactTapOf(c, home.viewerStatus === 'anonymous');
                return (
                  <li key={`${c.type}-${i}`}>
                    {tap === 'link' && c.href ? (
                      // 인스타그램 · 유튜브 · 오픈채팅 · 기타(링크)는 바로 연다(#281)
                      <a
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.contactButton}
                        aria-label={`${c.label} 열기`}
                      >
                        <Icon {...HOST_CONTACT_ICON[c.type]} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={s.contactButton}
                        aria-label={`연락처 보기 — ${c.label}`}
                        onClick={() => {
                          // 로그인 전 가린 값(전화 · 이메일) → "로그인이 필요해요"(GUI `1484:8106`), 확인 중인 가린 값 → 전체 보기,
                          // 전화 · 이메일 · 기타(글자) → 연락처 팝업(`1529:13695`)
                          if (tap === 'login') void openLoginForContacts(router.push);
                          else if (tap === 'sheet') openHostContacts(hostId);
                          else openHostContactPopup(c);
                        }}
                      >
                        <Icon {...HOST_CONTACT_ICON[c.type]} />
                      </button>
                    )}
                  </li>
                );
              })}
              {contacts.more && (
                <li>
                  <button
                    type="button"
                    className={s.contactButton}
                    aria-label="연락처 전체 보기"
                    onClick={() => openHostContacts(hostId)}
                  >
                    <Icon name="etc" variant="filled" />
                  </button>
                </li>
              )}
            </ul>
          )}

          <div className={s.meta}>
            <span className={s.metaItem}>
              <Icon name="people" className={s.metaIcon} />
              <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                <VisuallyHidden>멤버 </VisuallyHidden>
                {home.memberCount}
                <VisuallyHidden>명</VisuallyHidden>
              </Txt>
            </span>
            {home.createdOn && (
              <span className={s.metaItem}>
                <Icon name="calendar" className={s.metaIcon} />
                <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                  <VisuallyHidden>개설일 </VisuallyHidden>
                  {home.createdOn}
                </Txt>
              </span>
            )}
          </div>

          {home.viewerStatus === 'error' && (
            <InlineError
              layout="row"
              message="내 관심·권한 정보를 불러오지 못했어요."
              onRetry={home.retryViewer}
            />
          )}
        </section>

        <div className={s.sections}>
          {home.members && (
            <section className={s.section} aria-labelledby="host-members-title">
              <SectionTitle id="host-members-title" href={membersHref}>
                멤버
              </SectionTitle>
              <ul className={s.scroller} aria-label="멤버">
                {home.members.map((m) => (
                  <li key={m.userId} className={s.member}>
                    <Avatar size={60} src={m.profileImageUrl} />
                    <Txt typography="labelSm" lines={1} align="center" className={s.memberName}>
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
            aria-busy={home.events.status === 'pending' || undefined}
          >
            <SectionTitle
              id="host-events-title"
              // 공연이 있을 때만 [>] — 비었으면 제목만(GUI `741:30970`)
              href={home.events.status === 'success' ? hostEventsHref(hostId) : undefined}
            >
              공연 리스트
            </SectionTitle>
            <HostEvents events={home.events} />
          </section>
        </div>
      </div>

      {newEventHref && <NewEventFab href={newEventHref} />}
    </main>
  );
}

function DefaultCover() {
  // 정적 SVG — next/image 최적화가 필요 없다
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={s.cover} src={assetSrc(coverDefault)} alt="" decoding="async" />;
}

/** 섹션 제목(Heading/md - emphasized 20) — 목적지가 있으면 [제목 >] 링크 */
function SectionTitle({ id, href, children }: { id: string; href?: string; children: string }) {
  const title = (
    <Txt as="h2" typography="headingMdEmphasized">
      {children}
    </Txt>
  );
  if (!href) {
    return (
      <div className={s.sectionTitle} id={id}>
        {title}
      </div>
    );
  }
  return (
    <div className={s.sectionTitle}>
      <Link href={href} className={s.sectionLink} id={id}>
        {title}
        <Icon name="chevron-right" className={s.sectionChevron} />
      </Link>
    </div>
  );
}

/** 오른쪽 아래 [+](GUI DS Button round Primary — `741:30958`). 새 공연 만들기로 가는 링크라 `Fab` 모양만 빌린다 */
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
    return <InlineError message="공연을 불러오지 못했어요." onRetry={events.retry} />;
  }
  if (events.status === 'empty') {
    return (
      <Txt as="p" typography="bodyMd">
        {HOST_EVENTS_EMPTY}
      </Txt>
    );
  }
  return (
    <ul className={s.scroller} aria-label="공연">
      {events.items.map((item) => (
        <HostEventCard key={item.event.eventId} item={item} className={card.item} />
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
