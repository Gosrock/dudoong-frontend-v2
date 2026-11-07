'use client';

import Link from 'next/link';

import type { RepresentativeEvent } from '@/api/me/schema';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Chip, type ChipColor } from '@/ui/components/Chip/Chip';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as p from './FollowingHostsView.css';
import { useFollowingHosts } from './model/useFollowingHosts';
import * as s from './ui/mypage.css';

/**
 * 대표 공연 배지(gui `1175:21264` 등 — `tag_v2` small · round): 예정 D-n violet weak · 당일 D-day violet fill · 공연종료 grey weak.
 * 공연 중은 GUI에 없어 D-day와 같은 violet fill(🤖 디자인 Q180). 글자는 GUI대로 "공연종료"(공연 리스트 #162와 같게)
 */
function badgeChip(
  event: RepresentativeEvent,
  label: string,
): { color: ChipColor; theme: 'weak' | 'fill'; text: string } {
  switch (event.displayStatus) {
    case 'PAST':
      return { color: 'grey', theme: 'weak', text: '공연종료' };
    case 'ONGOING':
      return { color: 'violet', theme: 'fill', text: label };
    default:
      return { color: 'violet', theme: event.dDay === 0 ? 'fill' : 'weak', text: label };
  }
}

/**
 * `/mypage/following` 관심 호스트 — GUI `1175:20346` 관심호스트(2026-11-07 Ready, 모바일 390). PC 프레임은 없어 PC는 와이어 때 가운데 열.
 * 위 오른쪽 정렬 라벨 "최신공연순"(DS SortButton — 서버 정렬이 하나라 고정 라벨, 누를 수 없다). 와이어 때의 상태 필터
 * 드롭다운(서버 `status` 3값)은 GUI에 없어 뺐다(GUI가 이긴다 — 디자인 Q180, 서버 정렬 기준 B61).
 * 행: 아바타 60 + 오른쪽 아래 ♥(누르면 관심 해제 — 목록에서 빠진다) · 호스트 이름(→ 호스트 홈) · 대표 공연 제목(→ 공연 상세) · 배지.
 */
export function FollowingHostsView() {
  const f = useFollowingHosts();
  return (
    <main className={s.page}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        관심 호스트
      </Txt>
      <div className={p.sortBar}>
        {/* DS SortButton(gui `1175:20350`) — 고정 라벨. Figma의 ▾는 누를 수 있어 보이지 않게 그리지 않는다(주문내역 · 공연 리스트와 같게) */}
        <Txt typography="labelMd" color={colors.textPrimaryLabel}>
          최신공연순
        </Txt>
      </div>

      {f.listStatus === 'pending' && (
        <div aria-busy="true">
          <Flex direction="column" gap={3} padding={5}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={60} />
            ))}
          </Flex>
        </div>
      )}
      {f.listStatus === 'error' && <InlineError className={s.stateBox} onRetry={f.retry} />}
      {f.empty && (
        <div className={s.stateBox}>
          {/* 빈 상태는 GUI에 없다 — 개발 공용 컴포넌트 EmptyState로(Figma 코멘트 — 디자인 없음) */}
          <EmptyState
            title="아직 관심 호스트가 없어요"
            description="호스트 홈에서 ♡를 누르면 여기에 모여요."
            action={<EmptyStateAction href="/events">공연 둘러보기</EmptyStateAction>}
          />
        </div>
      )}

      <ul className={`${s.list} ${p.hostList}`} aria-label="관심 호스트 목록">
        {f.hosts.map((h) => {
          const badge =
            h.representativeEvent && h.badge ? badgeChip(h.representativeEvent, h.badge) : null;
          return (
            <li key={h.hostId} className={p.hostRow} data-testid="following-host">
              <span className={p.avatarBox}>
                <Link href={h.href} className={s.plainLink} aria-hidden tabIndex={-1}>
                  <Avatar size={60} src={h.profileImageUrl} />
                </Link>
                {/* ♥(gui `1175:21260` DS ic_favorite filled 24 · 채움 `brand/accent`) — 아바타 오른쪽 아래에 겹친다. 누르는 칸은 44 */}
                <button
                  type="button"
                  className={p.heart}
                  aria-label={`${h.name ?? '호스트'} 관심 해제`}
                  aria-pressed
                  onClick={() => f.unfollow(h.hostId)}
                  disabled={f.isUnfollowing(h.hostId)}
                >
                  <Icon name="favorite" />
                </button>
              </span>
              <Flex direction="column" gap={1} className={s.grow}>
                <Link href={h.href} className={s.plainLink}>
                  <Txt typography="headingMd2Emphasized" lines={1}>
                    {h.name ?? '이름 없는 호스트'}
                  </Txt>
                </Link>
                {h.representativeEvent && h.eventHref && (
                  <Link href={h.eventHref} className={s.plainLink}>
                    <Txt typography="headingSm" lines={1}>
                      {h.representativeEvent.name ?? UNNAMED_EVENT}
                    </Txt>
                  </Link>
                )}
              </Flex>
              {badge && (
                <Chip size="sm" shape="round" color={badge.color} theme={badge.theme}>
                  {badge.text}
                </Chip>
              )}
            </li>
          );
        })}
      </ul>
      {f.listStatus === 'success' && <LoadMoreSentinel list={f} />}
    </main>
  );
}
