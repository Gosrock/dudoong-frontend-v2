'use client';

import { Counter } from '@/ui/components/Counter/Counter';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { ONE_TICKET_KIND_WARNING, type TicketSelection } from '../model/useTicketSelection';
import {
  canListTickets,
  formatTicketPrice,
  TicketListFallback,
  TicketRowContent,
} from './TicketOptionList';
import * as s from './TicketSelector.css';

/**
 * 티켓 선택(plan P6-V) — 모바일 [티켓 구매하기] 바텀시트(와이어 `528:2484`·`121:1406`·`121:1517`)와
 * PC 오른쪽 카드(와이어 `640:15617`)가 이 컴포넌트 하나를 쓴다. 선택 상태는 부모의 `useTicketSelection` 하나라
 * 시트를 닫거나 1024 경계를 넘어도 선택이 남는다.
 *
 * 티켓 목록(살 수 있는 줄은 눌러 고름, 고른 줄 강조) → 1주문 1종류 경고 → 고른 티켓 줄(이름 · × / − 1 + · 금액).
 * [티켓 구매하기]는 부모가 둔다(시트 footer · PC 카드 아래).
 */
export function TicketSelector({
  selection,
  headingId,
}: {
  selection: TicketSelection;
  headingId: string;
}) {
  if (!canListTickets(selection)) {
    return <TicketListFallback selection={selection} />;
  }
  const { selected } = selection;
  return (
    <Flex direction="column" gap={3} fullWidth>
      <ul className={s.list} aria-labelledby={headingId}>
        {selection.tickets.map((view) => {
          const id = view.ticket.ticketItemId;
          const isSelected = selected?.ticket.ticketItemId === id;
          const canPick = view.state === 'PURCHASABLE';
          return (
            <li key={id}>
              {/* FIGMA-CUSTOM: 고를 수 있는 티켓 줄(wire 640:15672 "Frame 1707480408") 커스텀 → 커스텀 TicketSelector.css.ts. DS 후보(design-system §3) */}
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

      {selection.warning && (
        // 1주문 1종류 경고(와이어 `121:1517` 위 배너) — DS에 배너가 없어 목록 아래 글 상자로
        <div role="alert" className={s.warning}>
          <Flex justify="space-between" align="flex-start" gap={2}>
            <Flex direction="column" gap={1}>
              <Txt typography="labelMdEmphasized">{ONE_TICKET_KIND_WARNING[0]}</Txt>
              <Txt typography="bodySm" color={colors.textSecondary}>
                {ONE_TICKET_KIND_WARNING[1]}
              </Txt>
            </Flex>
            <button
              type="button"
              className={s.iconButton}
              aria-label="경고 닫기"
              onClick={selection.dismissWarning}
            >
              <Icon name="close" />
            </button>
          </Flex>
        </div>
      )}

      {selected && (
        <div className={s.picked}>
          <Flex justify="space-between" align="center" gap={2}>
            <Txt typography="headingSmEmphasized" lines={1}>
              {selected.ticket.name ?? '티켓'}
            </Txt>
            <button
              type="button"
              className={s.iconButton}
              aria-label="티켓 선택 취소"
              onClick={selection.clear}
            >
              <Icon name="close" />
            </button>
          </Flex>
          <Flex justify="space-between" align="center" gap={2}>
            <Counter
              value={selection.quantity}
              min={1}
              max={selection.maxQuantity}
              onChange={selection.setQuantity}
              label={`${selected.ticket.name ?? '티켓'} 수량`}
            />
            <Txt typography="headingSmEmphasized">{formatTicketPrice(selection.amount)}</Txt>
          </Flex>
          {selected.ticket.payType === 'DUDOONG' && <DudoongTicketNotice />}
        </div>
      )}
    </Flex>
  );
}

/**
 * 두둥 티켓 안내 — legal-copy A-4 원문 그대로(약관 제29조②). 계획에 자리가 없어 v1 운영처럼 고른 티켓 아래 회색 글로 둔다
 * (P6-V 🤖 판단). 문구를 바꾸거나 빼지 않는다 — 정본은 legal-copy A-4.
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
