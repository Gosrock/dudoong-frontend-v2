'use client';

import type { HostEvent } from '@/api/host/schema';
import { Chip, type ChipColor, type ChipTheme, formatDday } from '@/ui/components/Chip/Chip';
import { ConcertCard } from '@/ui/components/ConcertCard/ConcertCard';

import type { HostEventCard as HostEventCardItem } from '../model/useHostHome';
import * as s from './HostEventCard.css';

type ChipLook = { label: string; color: ChipColor; theme: ChipTheme };

/**
 * 공연 상태 칩 — 와이어 `503:30867` 카드 왼쪽 위 "준비중"·"D-15"·"지난공연". 색은 design-system §3 "옛 Tag → tag_v2"
 * (공연준비 홈 카드와 같은 대응 — 그쪽은 `features/hosting`이라 가져오지 않는다). 모르는 상태는 칩 없음.
 */
export function hostEventChipOf(event: Pick<HostEvent, 'displayStatus' | 'dDay'>): ChipLook | null {
  switch (event.displayStatus) {
    case 'PREPARING':
      return { label: '준비중', color: 'green', theme: 'weak' };
    case 'UPCOMING':
      return {
        label: event.dDay === null ? '예정' : formatDday(event.dDay),
        color: 'red',
        theme: 'weak',
      };
    case 'ONGOING':
      return { label: '공연중', color: 'red', theme: 'fill' };
    case 'PAST':
      return { label: '지난 공연', color: 'grey', theme: 'weak' };
    default:
      return null;
  }
}

/**
 * 호스트 홈 공연 카드(와이어 `503:30867`·`503:30477` — 포스터 + 상태 칩 + 제목 + 날짜) → DS `ConcertCard` + `badge`.
 * 카드 전체가 링크다(준비중은 `/hosting/events/[id]`, 그 밖은 `/events/[id]` — `hostEventHref`).
 * 날짜·제목 순서는 DS 컴포넌트대로(와이어는 제목 → 날짜).
 */
export function HostEventCard({ item }: { item: HostEventCardItem }) {
  const { event, href } = item;
  const chip = hostEventChipOf(event);
  return (
    <li className={s.item}>
      <ConcertCard
        href={href}
        title={event.name ?? '이름 없는 공연'}
        date={event.startAt?.slice(0, 10) ?? null}
        posterUrl={event.posterImageUrl}
        badge={
          chip && (
            <Chip color={chip.color} theme={chip.theme}>
              {chip.label}
            </Chip>
          )
        }
      />
    </li>
  );
}
