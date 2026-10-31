'use client';

import Link from 'next/link';

import type { HostEvent } from '@/api/host/schema';
import { Chip, type ChipColor, type ChipTheme, formatDday } from '@/ui/components/Chip/Chip';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

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
 * 호스트 홈 공연 카드(와이어 `503:30867`·`503:30477`) — 포스터 + 상태 칩 + 공연명 + 날짜. 카드 전체가 링크다
 * (준비중은 `/hosting/events/[id]`, 그 밖은 `/events/[id]` — `hostEventHref`).
 */
// FIGMA-CUSTOM: 호스트 홈 공연 카드(wire 503:30867 "공연 리스트" 카드) 커스텀 → 커스텀 HostEventCard.css.ts. DS 후보(design-system §3 Card list)
export function HostEventCard({ item }: { item: HostEventCardItem }) {
  const { event, href } = item;
  const chip = hostEventChipOf(event);
  return (
    <li className={s.item}>
      <Link href={href} className={s.card}>
        <span className={s.posterWrap}>
          {event.posterImageUrl ? (
            // 업로드 포스터를 그대로 그린다(공연준비 홈 카드와 같은 이유 — 이미지 최적화는 정하지 않았다)
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.poster} src={event.posterImageUrl} alt="" decoding="async" />
          ) : (
            <Illustration name="poster-placeholder" className={s.poster} />
          )}
          {chip && (
            <Chip className={s.chip} color={chip.color} theme={chip.theme}>
              {chip.label}
            </Chip>
          )}
        </span>
        <Txt as="span" typography="labelLgEmphasized" lines={2}>
          {event.name ?? '이름 없는 공연'}
        </Txt>
        {event.startAt && (
          <Txt as="span" typography="labelSm" color={colors.textTertiaryLabel}>
            {event.startAt.slice(0, 10)}
          </Txt>
        )}
      </Link>
    </li>
  );
}
