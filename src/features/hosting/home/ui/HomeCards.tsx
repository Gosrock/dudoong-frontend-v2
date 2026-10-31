'use client';

import Link from 'next/link';

import type { MyEvent } from '@/api/event/schema';
import type { MyHost } from '@/api/host/schema';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Chip } from '@/ui/components/Chip/Chip';
import { DropdownMenu } from '@/ui/components/DropdownMenu/DropdownMenu';
import { Icon } from '@/ui/icons/Icon';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  eventChipOf,
  eventLinesOf,
  roleChipOf,
  UNNAMED_EVENT,
  UNNAMED_HOST,
} from '../model/home-cards';
import * as s from './HomeCards.css';

type EventItem = MyEvent & { href: string; canDelete: boolean };
type HostItem = MyHost & { href: string };

/**
 * 공연 카드(와이어 `424:11664` · `529:35358`). 포스터 + 상태 칩 + 공연명 + 호스트 · 날짜 · 시각 · 장소(plan P10a 문구 — 접두어 없음).
 * ⋮는 준비중 + 매니저 이상(`canDelete`)일 때만 — 삭제(DE-9)는 확인 뒤 `onDelete`.
 */
// FIGMA-CUSTOM: 공연 카드(wire 424:11664 "등록 후_공연준비 홈_ 공연리스트" 안 카드) 커스텀 → 커스텀 HomeCards.css.ts. DS 후보(design-system §3 Card list)
export function MyEventCard({
  event,
  deleting,
  onDelete,
}: {
  event: EventItem;
  deleting: boolean;
  onDelete: (event: EventItem) => void;
}) {
  const chip = eventChipOf(event);
  return (
    <li className={s.card} data-testid="my-event" aria-busy={deleting || undefined}>
      {event.posterImageUrl ? (
        // 업로드 포스터를 그대로 그린다(Avatar와 같은 이유 — 이미지 최적화는 정하지 않았다)
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.poster} src={event.posterImageUrl} alt="" decoding="async" />
      ) : (
        <Illustration name="poster-placeholder" width={94} className={s.poster} />
      )}
      <div className={s.body}>
        <div className={s.chipRow}>
          {chip ? (
            <Chip size="lg" color={chip.color} theme={chip.theme}>
              {chip.label}
            </Chip>
          ) : (
            <span />
          )}
          {event.canDelete && (
            <DropdownMenu
              trigger={
                <button type="button" className={s.menuButton} aria-label="공연 메뉴">
                  <Icon name="more" size={20} />
                </button>
              }
              items={[
                {
                  label: '삭제',
                  danger: true,
                  disabled: deleting,
                  onSelect: () => onDelete(event),
                },
              ]}
            />
          )}
        </div>
        <Link href={event.href} className={s.titleLink}>
          <Txt as="span" typography="headingSmEmphasized" color={colors.textPrimaryLabel} lines={2}>
            {event.name ?? UNNAMED_EVENT}
          </Txt>
        </Link>
        {eventLinesOf(event).map((line, i) => (
          <Txt key={i} as="p" typography="bodyMd" color={colors.textSecondaryLabel} lines={1}>
            {line}
          </Txt>
        ))}
      </div>
    </li>
  );
}

/** 호스트 카드(와이어 `424:9715`). 아바타 + 이름 + "등록된 공연 n" + 내 역할 배지(호스트마다 다르다) */
// FIGMA-CUSTOM: 호스트 카드(wire 424:9715 "공연준비홈_호스트list" 안 카드) 커스텀 → 커스텀 HomeCards.css.ts. DS 후보(design-system §3 List 호스트 행)
export function MyHostCard({ host }: { host: HostItem }) {
  const role = roleChipOf(host.myRole);
  return (
    <li className={s.hostCard} data-testid="my-host">
      <Avatar size={40} src={host.profileImageUrl} />
      <div className={s.body}>
        <Link href={host.href} className={s.titleLink}>
          <Txt as="span" typography="headingSmEmphasized" color={colors.textPrimaryLabel} lines={1}>
            {host.name ?? UNNAMED_HOST}
          </Txt>
        </Link>
        <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
          등록된 공연 {host.eventCount}
        </Txt>
      </div>
      {role && (
        <span className={s.role} data-testid="my-role">
          <Chip size="lg" shape="round" color={role.color} theme={role.theme}>
            {role.label}
          </Chip>
        </span>
      )}
    </li>
  );
}
