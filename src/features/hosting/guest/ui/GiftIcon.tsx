'use client';

import type { HostGiftState } from '@/api/issued-ticket/schema';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';

import * as s from './GiftIcon.css';
import { GIFT_STATE_LABEL } from './guest-labels';

/**
 * 발급 티켓 선물 상태 아이콘(선물 대기 · 선물 받음, 선물이 없으면 아무것도 안 그림) — GUI #160 `1182:9802` · `1182:9618`(표 티켓 칸,
 * 티켓 이름 옆) · `1182:10514` · `1182:10057` · `1182:10899` · `1182:10284`(상세 제목 칩 뒤). DS 아이콘 `ic_gift_waiting`(회색 · 점 셋)
 * · `ic_gift_done`(진한 색 · 체크) 16.
 * FIGMA-CUSTOM: 두 DS 아이콘이 아직 `src/ui/icons`에 없어 DS `gift` filled(그림 안 기호 없음)를 색으로만 나눠 대신 쓴다 →
 * DS 아이콘 반영 뒤 `<Icon name="gift-waiting" …>`로(Q174). 글자가 없어 `aria-label`로 상태를 읽힌다
 */
export function GiftIcon({ giftState }: { giftState: HostGiftState }) {
  const label = GIFT_STATE_LABEL[giftState];
  if (!label) return null;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="ticket-gift"
      data-gift-state={giftState}
      className={`${s.giftIcon} ${giftState === 'PENDING' ? s.pending : s.accepted}`}
    >
      <Icon name="gift" variant="filled" />
    </span>
  );
}

/** 이름 + 선물 아이콘(표 티켓 칸, 간격 4 — GUI `1182:9777` 티켓 행_선물 대기) */
export function NameWithGift({ name, giftState }: { name: string; giftState: HostGiftState }) {
  return (
    <Flex gap={1} align="center">
      <span>{name}</span>
      <GiftIcon giftState={giftState} />
    </Flex>
  );
}
