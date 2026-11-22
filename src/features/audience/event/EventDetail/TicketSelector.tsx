'use client';

import { Counter } from '@/ui/components/Counter/Counter';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatPrice } from '@/utils/money';

import { canListTickets } from '../model/ticket-list';
import type { TicketSelection } from '../model/useTicketSelection';
import { TicketListFallback, TicketRowContent } from './TicketOptionList';
import * as s from './TicketSelector.css';

/**
 * 티켓 고르는 목록 — 모바일 [티켓 구매하기] 바텀시트(GUI `759:21725` · `759:21918`, Design Sync #343 · #344)와
 * PC 오른쪽 카드(와이어 `640:15617` 배치 그대로, 모양만 GUI)가 이 컴포넌트 하나를 쓴다. 선택 상태는 부모의 `useTicketSelection` 하나.
 *
 * GUI 로컬 "ticket option list"(`1948:39630`): 테두리 상자 · 모서리 20 · 안쪽 8, 줄은 "ticket options"(모서리 16 · 안쪽 16),
 * 고른 줄은 회색 바탕(`1948:26087` `#eeeeed`). 살 수 있는 줄을 누르면 고른다.
 * 1주문 1종류 경고는 부모가 토스트로 띄운다(`759:22129`, #347). `showPicked`면 목록 아래 고른 티켓 줄(PC 카드).
 */
export function TicketSelector({
  selection,
  label,
  showPicked = false,
}: {
  selection: TicketSelection;
  label: string;
  showPicked?: boolean;
}) {
  if (!canListTickets(selection)) {
    return <TicketListFallback selection={selection} />;
  }
  const { selected } = selection;
  return (
    <Flex direction="column" gap={4} fullWidth>
      {/* FIGMA-CUSTOM: 티켓 고르는 목록(gui 1948:39630 "ticket option list" — GUI 로컬 컴포넌트) 커스텀 → 커스텀 TicketSelector.css.ts. DS 후보(design-system §3) */}
      <ul className={s.list} aria-label={label}>
        {selection.tickets.map((view) => {
          const id = view.ticket.ticketItemId;
          const isSelected = selected?.ticket.ticketItemId === id;
          const canPick = view.state === 'PURCHASABLE';
          return (
            <li key={id}>
              <button
                type="button"
                className={s.row}
                aria-pressed={canPick ? isSelected : undefined}
                disabled={!canPick}
                data-selected={isSelected || undefined}
                onClick={() => selection.select(id)}
              >
                <TicketRowContent view={view} />
              </button>
            </li>
          );
        })}
      </ul>

      {showPicked && selected && <PickedTicket selection={selection} />}
    </Flex>
  );
}

/**
 * 고른 티켓 줄(GUI `759:22112` "공연상세 - 티켓 선택"): 왼쪽 이름(`Heading/sm - emphasized`) 아래 수량(DS `numbering` − 1 +),
 * 오른쪽 ✕(선택 취소 — 회색 24) 아래 금액(`Label/lg-emphasized`). 모바일은 하단 바 위, PC는 오른쪽 카드 목록 아래.
 * 두둥 티켓이면 아래에 legal-copy A-4 안내(디자인 없음 — 와이어 P6-V 자리 그대로).
 */
export function PickedTicket({ selection }: { selection: TicketSelection }) {
  const { selected } = selection;
  if (!selected) return null;
  const name = selected.ticket.name ?? '티켓';
  return (
    <Flex direction="column" gap={3} fullWidth>
      <Flex justify="space-between" align="flex-start" gap={3} fullWidth>
        <Flex direction="column" gap={3} className={s.pickedMain}>
          <Txt typography="headingSmEmphasized" color={colors.textPrimaryLabel} lines={1}>
            {name}
          </Txt>
          <Counter
            value={selection.quantity}
            min={1}
            max={selection.maxQuantity}
            onChange={selection.setQuantity}
            label={`${name} 수량`}
          />
        </Flex>
        <Flex direction="column" align="flex-end" gap={1}>
          <button
            type="button"
            className={s.iconButton}
            aria-label="티켓 선택 취소"
            onClick={selection.clear}
          >
            <Icon name="close" />
          </button>
          <Txt typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
            {formatPrice(selection.amount)}
          </Txt>
        </Flex>
      </Flex>
      {selected.ticket.payType === 'DUDOONG' && <DudoongTicketNotice />}
    </Flex>
  );
}

/**
 * 두둥 티켓 안내 — legal-copy A-4 원문 그대로(약관 제29조②). GUI에 자리가 없어 고른 티켓 줄 아래 회색 글로 둔다
 * (P6-V 🤖 판단 유지). 문구를 바꾸거나 빼지 않는다 — 정본은 legal-copy A-4.
 */
const DUDOONG_TICKET_NOTICE = [
  '호스트 계좌로 입금하면, 호스트가 확인한 뒤 티켓이 발급돼요.',
  '예매를 취소해도 자동으로 환불되지 않아요. 호스트에게 연락해 환불받아야 해요.',
  "호스트 연락처는 공연 상세의 '호스트'에서 볼 수 있어요.",
] as const;

function DudoongTicketNotice() {
  return (
    <ul className={s.notice}>
      {DUDOONG_TICKET_NOTICE.map((line) => (
        <li key={line}>
          <Txt typography="bodySm" color={colors.textTertiary}>
            {line}
          </Txt>
        </li>
      ))}
    </ul>
  );
}
