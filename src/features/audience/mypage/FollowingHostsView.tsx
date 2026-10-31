'use client';

import Link from 'next/link';

import type { FollowingHostFilter } from '@/api/me/schema';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { Chip, type ChipColor } from '@/ui/components/Chip/Chip';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { EmptyState, EmptyStateAction } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useFollowingHosts } from './model/useFollowingHosts';
import * as s from './ui/mypage.css';

/** 대표 공연 배지 색 — 와이어 `249:554`: 예정 D-n 분홍(→ red weak), 공연 종료 회색. 공연 중은 와이어에 없어 violet(🤖, 티켓탭 ON AIR와 같은 색) */
const BADGE_COLOR: Record<string, ChipColor> = { UPCOMING: 'red', ONGOING: 'violet', PAST: 'grey' };

/**
 * `/mypage/following` 관심 호스트(P9-V, 와이어 근거 — 모바일 `249:554` · PC `667:4078`).
 * 와이어 "전체 상태 ⌄"를 DS `Dropdown`으로 — 선택지는 서버 `status` 3값(전체 / 공연 예정 / 지난 공연만, design-requests 기본안).
 * 행: 아바타 · 호스트 이름(→ 호스트 홈) · 대표 공연 제목(→ 공연 상세) · D-n/공연 종료 배지 · ♡(누르면 관심 해제 — 목록에서 빠진다).
 * 와이어의 아바타 위 하트는 P5c 호스트 홈과 같은 ♡ 버튼으로 옮겼다(누를 수 있는 크기, 🤖).
 */
export function FollowingHostsView() {
  const f = useFollowingHosts();
  return (
    <main className={s.page}>
      <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
        관심 호스트
      </Txt>
      <div className={s.filterBar}>
        <Dropdown
          aria-label="관심 호스트 필터"
          className={s.filterDropdown}
          options={f.tabs.map((t) => ({ value: t.status, label: t.label }))}
          value={f.status}
          onValueChange={(v) => f.setStatus(v as FollowingHostFilter)}
        />
      </div>

      {f.listStatus === 'pending' && (
        <div aria-busy="true">
          <Flex direction="column" gap={3} padding={5}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} />
            ))}
          </Flex>
        </div>
      )}
      {f.listStatus === 'error' && (
        <div role="alert" className={s.stateBox}>
          <Flex direction="column" align="center" gap={3}>
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              불러오지 못했어요.
            </Txt>
            <Button variant="secondary" size="sm" onClick={f.retry}>
              다시 시도
            </Button>
          </Flex>
        </div>
      )}
      {f.empty && (
        <div className={s.stateBox}>
          {/* 빈 상태는 와이어에 없다(Tomato 10-24 "빈 상태 만들기" 미해결) — DS EmptyState로(Figma 코멘트 — 디자인 없음) */}
          <EmptyState
            title={
              f.status === 'ALL' ? '아직 관심 호스트가 없어요' : '이 조건의 관심 호스트가 없어요'
            }
            description="호스트 홈에서 ♡를 누르면 여기에 모여요."
            action={<EmptyStateAction href="/events">공연 둘러보기</EmptyStateAction>}
          />
        </div>
      )}

      <ul className={s.list} aria-label="관심 호스트 목록">
        {f.hosts.map((h) => (
          <li key={h.hostId} className={s.hostRow} data-testid="following-host">
            <Link href={h.href} className={s.plainLink} aria-hidden tabIndex={-1}>
              <Avatar size={56} src={h.profileImageUrl} />
            </Link>
            <Flex direction="column" gap={1} className={s.grow}>
              <Link href={h.href} className={s.plainLink}>
                <Txt typography="headingSmEmphasized" lines={1}>
                  {h.name ?? '이름 없는 호스트'}
                </Txt>
              </Link>
              {h.representativeEvent && h.eventHref && (
                <Flex align="center" gap={2}>
                  <Link href={h.eventHref} className={`${s.plainLink} ${s.grow}`}>
                    <Txt typography="bodyMd" color={colors.textSecondaryLabel} lines={1}>
                      {h.representativeEvent.name ?? '이름 없는 공연'}
                    </Txt>
                  </Link>
                  {h.badge && (
                    <Chip
                      size="sm"
                      shape="square"
                      theme="weak"
                      color={BADGE_COLOR[h.representativeEvent.displayStatus] ?? 'grey'}
                    >
                      {h.badge}
                    </Chip>
                  )}
                </Flex>
              )}
            </Flex>
            <button
              type="button"
              className={s.heart}
              aria-label={`${h.name ?? '호스트'} 관심 해제`}
              aria-pressed
              onClick={() => f.unfollow(h.hostId)}
              disabled={f.isUnfollowing(h.hostId)}
            >
              <Icon name="favorite" />
            </button>
          </li>
        ))}
      </ul>
      {f.listStatus === 'success' && <LoadMoreSentinel list={f} />}
    </main>
  );
}
