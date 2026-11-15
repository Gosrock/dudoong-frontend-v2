'use client';

import { formatKstDotDateWeekday, formatKstTime } from '@/api/shared/date';
import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { Chip } from '@/ui/components/Chip/Chip';
import { ConcertCard } from '@/ui/components/ConcertCard/ConcertCard';

import type { HostEventCard as HostEventCardItem } from '../model/useHostHome';

/** ConcertCard 날짜 줄 — `2026.01.01 수요일 (18:00)`(GUI `741:30947` · 공연홈과 같은 꼴). 시작 일시가 없으면 null */
export function hostEventCardDate(startAt: string | null): string | null {
  if (startAt === null) return null;
  return `${formatKstDotDateWeekday(startAt)} (${formatKstTime(startAt)})`;
}

/**
 * 호스트 공연 카드 — DS `ConcertCard`(GUI `741:30947` 홈 가로 줄 · `1423:2673` 공연 리스트 2열). 카드 전체가 링크다
 * (준비중은 `/hosting/events/[id]`, 그 밖은 `/events/[id]` — `hostEventHref`).
 * 칩은 준비중만 — 포스터 오른쪽 위 DS `Concert state chip` ready small(`1478:15867` → `Chip` green weak, design-system §3 옛 Tag 대응).
 * GUI 카드에 D-day · 지난 공연 칩이 없어 와이어 때 붙인 칩을 뺐다(공개 공연 카드는 공연홈과 같은 모양).
 */
export function HostEventCard({
  item,
  className,
}: {
  item: HostEventCardItem;
  className?: string;
}) {
  const { event, href } = item;
  return (
    <li className={className}>
      <ConcertCard
        href={href}
        title={event.name ?? UNNAMED_EVENT}
        date={hostEventCardDate(event.startAt)}
        posterUrl={event.posterImageUrl}
        badgePlacement="end"
        badge={
          item.isPreparing && (
            <Chip color="green" theme="weak">
              준비중
            </Chip>
          )
        }
      />
    </li>
  );
}
