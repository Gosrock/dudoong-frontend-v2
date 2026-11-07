'use client';

import type { HostGiftState } from '@/api/issued-ticket/schema';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';

import * as s from './GiftIcon.css';
import { GIFT_STATE_LABEL } from './guest-labels';

/**
 * 발급 티켓 선물 상태 아이콘(선물 대기 · 선물 받음, 선물이 없으면 아무것도 안 그림) — GUI #160 `1182:9802` · `1182:9618`(표 티켓 칸,
 * 티켓 이름 옆) · `1182:10514` · `1182:10057` · `1182:10899` · `1182:10284`(상세 제목 칩 뒤). DS 아이콘 `ic_gift_waiting`(회색 · 점 셋)
 * · `ic_gift_done`(진한 색 · 체크) — 디자인 시스템 11-07 판(Q174 닫음). DS 원본은 24이고 GUI 인스턴스가 16으로 줄여 쓴다.
 * 글자가 없어 `aria-label`로 상태를 읽힌다
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
      <Icon name={giftState === 'PENDING' ? 'gift-waiting' : 'gift-done'} variant="filled" />
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
