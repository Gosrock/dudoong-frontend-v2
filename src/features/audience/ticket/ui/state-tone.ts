import type { ChipColor } from '@/ui/components/Chip/Chip';

import type { TicketTone } from '../model/my-ticket-state';

/**
 * 관객 상태 톤 → 칩 색(코드 패턴 점검 A18, 2026-11-02) — 티켓탭 칩 · 주문 카드 칩 · 주문상세 티켓상태 칩이 같이 쓴다.
 * 상태 → 톤 표(`my-ticket-state` · `order-status` · `issuedTicketStateLabel`)는 합치지 않는다(점검 §4 — 보는 상태가 다르다).
 *
 * 티켓탭 GUI `908:3276`(`tag_v2` small · weak): 승인완료 green(`908:22655`), 승인대기 cyan(`939:25698`), 승인거절 red(`939:25571`)는
 * Figma 그대로. 나머지 상태는 GUI에 칩이 없어 같은 tone끼리 같은 색으로 묶었다(implementation-log P8-V 결정). 주문 카드(와이어 `128:2772`)는
 * 와이어 색을 가져오지 않고 같은 상태를 티켓탭 GUI와 같은 색으로 그린다(design-workflow §3).
 */
export const STATE_TONE_COLOR: Record<TicketTone, ChipColor> = {
  positive: 'green',
  waiting: 'cyan',
  negative: 'red',
  gift: 'purple',
  muted: 'grey',
};
