'use client';

import type { HostGiftState } from '@/api/issued-ticket/schema';
import { Chip } from '@/ui/components/Chip/Chip';
import { Flex } from '@/ui/primitives/Flex';

import { GIFT_STATE_LABEL } from './guest-labels';

/**
 * 발급 티켓 선물 상태 칩(선물 대기 · 선물 받음, 선물이 없으면 아무것도 안 그림).
 * FIGMA-CUSTOM: GUI 발급된 티켓 표(`1030:8054` · `1003:3143`) · 티켓 상세(`1030:8955`)에 선물 상태 자리가 없다 — #129가 지운
 * 소유자 칸 칩을 DS `Chip`(violet border, 결제 칩 violet weak와 구분)으로 표 "티켓" 칸 · 상세 소유자 줄에 되살림. 🤖 Claude 판단(design-requests Q110, Figma 코멘트 2026-11-03 `1030:8098` · `1030:9120`)
 */
export function GiftChip({ giftState }: { giftState: HostGiftState }) {
  const label = GIFT_STATE_LABEL[giftState];
  if (!label) return null;
  return (
    <Chip shape="round" color="violet" theme="border">
      <span data-testid="ticket-gift">{label}</span>
    </Chip>
  );
}

/** 이름 + 선물 칩(표 티켓 칸 · 상세 소유자 줄) */
export function NameWithGift({ name, giftState }: { name: string; giftState: HostGiftState }) {
  return (
    <Flex gap={1} align="center">
      <span>{name}</span>
      <GiftChip giftState={giftState} />
    </Flex>
  );
}
