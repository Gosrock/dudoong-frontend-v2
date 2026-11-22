'use client';

import { Chip } from '@/ui/components/Chip/Chip';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Skeleton } from '@/ui/components/Skeleton/Skeleton';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatPrice } from '@/utils/money';

import { canListTickets, ticketConditions, type TicketListStatus } from '../model/ticket-list';
import type { TicketView } from '../model/ticket-state';
import * as s from './TicketOptionList.css';

const STATE_CHIP: Partial<Record<TicketView['state'], string>> = {
  SUSPENDED: '판매 중단',
  SOLD_OUT: '매진',
  NOT_ON_SALE: '판매 종료',
};

/**
 * 목록을 그리기 전 상태(조회 중 · 실패 · 티켓 없음 · 지난 공연). 목록을 그릴 수 있으면 `null`.
 * 화면 카드(`TicketOptionList`)와 선택 목록(`TicketSelector`)이 같이 쓴다.
 */
export function TicketListFallback({ selection }: { selection: TicketListStatus }) {
  if (selection.status === 'pending') {
    return (
      <Flex direction="column" gap={2} fullWidth>
        <Skeleton height={93} />
        <Skeleton height={93} />
      </Flex>
    );
  }
  if (selection.status === 'error') {
    return (
      <InlineError
        message="티켓 정보를 불러오지 못했어요."
        onRetry={() => void selection.refetch()}
      />
    );
  }
  if (!canListTickets(selection)) {
    return (
      <Txt as="p" typography="bodyMd" color={colors.textTertiary}>
        {selection.listState === 'EVENT_ENDED' ? '지난 공연이에요' : '판매 중인 티켓이 없어요'}
      </Txt>
    );
  }
  return null;
}

/**
 * 티켓 한 줄의 내용(GUI 로컬 "ticket options" — 공연상세 `759:13040` · 시트 `1948:26087`):
 * 위 줄 이름(`Heading/sm - emphasized`) ↔ 가격(`Label/lg-emphasized`), 아래 줄 설명(`Label/sm`) · 조건(`Label/xs`) ↔ 칩 "잔여 N매".
 * - `tone="card"`(화면 카드) — 조건 글자 보라 · 잔여 칩 보라 채움(`759:13048` · `808:36120`)
 * - `tone="sheet"`(시트 · PC 카드) — 조건 글자 회색 · 잔여 칩 보라 옅음(`1948:26050` · `1948:26051`)
 * 매진 · 판매 중단 · 판매 종료는 잔여 자리에 회색 칩(디자인 없음 — 와이어 P6-V 그대로). 판매 중단은 딤드(Q33): 글자를 비활성 색으로.
 */
export function TicketRowContent({
  view,
  tone = 'sheet',
}: {
  view: TicketView;
  tone?: 'card' | 'sheet';
}) {
  const t = view.ticket;
  const chip = STATE_CHIP[view.state];
  const dim = view.state === 'SUSPENDED' ? colors.textDisabledLabel : undefined;
  return (
    <Flex direction="column" gap={2} fullWidth>
      <Flex justify="space-between" align="flex-start" gap={3} fullWidth>
        <Txt
          typography="headingSmEmphasized"
          color={dim ?? colors.textPrimaryLabel}
          className={s.main}
        >
          {t.name ?? '티켓'}
        </Txt>
        <Txt
          typography="labelLgEmphasized"
          color={dim ?? colors.textPrimaryLabel}
          className={s.side}
        >
          {formatPrice(t.price)}
        </Txt>
      </Flex>
      <Flex justify="space-between" align="center" gap={3} fullWidth>
        <Flex direction="column" gap={1} className={s.main}>
          {t.description && (
            <Txt typography="labelSm" color={dim ?? colors.textPrimaryLabel}>
              {t.description}
            </Txt>
          )}
          <Txt
            typography="labelXs"
            color={dim ?? (tone === 'card' ? colors.textBrandLabel : colors.textSecondary)}
          >
            {ticketConditions(t)}
          </Txt>
        </Flex>
        <span className={s.side}>
          {chip ? (
            <Chip size="lg" shape="round">
              {chip}
            </Chip>
          ) : view.remaining !== null && view.state === 'PURCHASABLE' ? (
            <Chip size="lg" shape="round" color="violet" theme={tone === 'card' ? 'fill' : 'weak'}>
              잔여 {view.remaining}매
            </Chip>
          ) : null}
        </span>
      </Flex>
    </Flex>
  );
}

/**
 * 공연 상세 모바일 티켓 카드(GUI `759:13039` — 보라 옅은 카드 342 · 모서리 16 · 안쪽 16 · 사이 8). 누르면 그 티켓을 고른다 —
 * 고르면 화면 아래 고른 티켓 줄이 뜨고(`759:22015`), 이미 고른 채 다른 카드를 누르면 1주문 1종류 토스트(`759:22129`, Design Sync #347).
 * GP-5는 브라우저에서 읽는다(응답 HTML에 재고 값이 없어야 한다).
 */
export function TicketOptionList({
  selection,
  label,
  onPick,
}: {
  selection: TicketListStatus;
  label: string;
  onPick: (ticketItemId: number) => void;
}) {
  if (!canListTickets(selection)) return <TicketListFallback selection={selection} />;
  return (
    <ul className={s.list} aria-label={label}>
      {selection.tickets.map((view) => (
        <li key={view.ticket.ticketItemId}>
          {/* FIGMA-CUSTOM: 티켓 카드(gui 759:13040 "Frame 1707480356" — 직접 그린 보라 옅은 상자) 커스텀 → 커스텀 TicketOptionList.css.ts. DS 후보(design-system §3) */}
          <button
            type="button"
            className={s.card}
            disabled={view.state !== 'PURCHASABLE'}
            onClick={() => onPick(view.ticket.ticketItemId)}
          >
            <TicketRowContent view={view} tone="card" />
          </button>
        </li>
      ))}
    </ul>
  );
}
