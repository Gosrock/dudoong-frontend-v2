'use client';

import type { CardChip } from '@/features/audience/ticket/model/ticket-groups';
import { Chip } from '@/ui/components/Chip/Chip';

import { STATE_TONE_COLOR } from './state-tone';
import * as s from './TicketTab.css';

/**
 * 묶음 카드 오른쪽 위 상태 칩 하나(GUI `908:11275` — 2장 이상 주문도 칩 하나 · 개수 없음, 사용자 결정 2026-11-08).
 * 무엇을 보일지는 `cardChip`(지금 페이저로 보는 티켓의 상태). 공연 진행 중이면 승인완료 대신 "공연중 ON AIR"
 * (`939:25755` — `tag_v2` violet fill).
 */
export function TicketStateChip({ chip }: { chip: CardChip | null }) {
  if (!chip) return null;
  return (
    <span
      className={s.chipSlot}
      data-testid="state-chip"
      data-state={chip.kind === 'ON_AIR' ? 'ON_AIR' : chip.state}
    >
      {chip.kind === 'ON_AIR' ? (
        <Chip size="sm" shape="round" color="violet" theme="fill">
          공연중 ON AIR
        </Chip>
      ) : (
        <Chip size="sm" shape="round" color={STATE_TONE_COLOR[chip.tone]} theme="weak">
          {chip.label}
        </Chip>
      )}
    </span>
  );
}
