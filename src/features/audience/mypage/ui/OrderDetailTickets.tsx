'use client';

import type { MyOrderDetail } from '@/api/order/schema';
import { STATE_TONE_COLOR } from '@/features/audience/ticket/ui/state-tone';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Chip, formatOptionAmount } from '@/ui/components/Chip/Chip';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Icon } from '@/ui/icons/Icon';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { issuedTicketStateLabel } from '../model/order-card';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as p from './OrderDetail.css';

/** 옵션적용 — 모든 티켓 동일 / 티켓별(옵션이 없는 주문은 그리지 않는다) */
export function OrderOptionMode({ detail }: { detail: OrderDetailState }) {
  if (detail.optionMode === 'none') return null;
  const all = detail.optionMode === 'all';
  return (
    <section aria-label="옵션 적용">
      <InfoRow hierarchy="first" label="옵션적용" />
      <InfoRow
        hierarchy="second"
        label={all ? '모든 티켓에 동일 옵션 적용' : '티켓별로 다른 옵션 적용'}
        value={all ? <Icon name="circle-check" variant="filled" title="적용" /> : undefined}
      />
      <Divider variant="section" />
    </section>
  );
}

/** 예매정보 — 발급 티켓이 있으면 티켓마다, 없으면(승인 대기 · 거절) 주문 줄마다 아코디언 하나. 기본 모두 펼침(와이어 `128:2262` 코멘트) */
export function OrderTickets({ detail }: { detail: OrderDetailState }) {
  const { order } = detail;
  const approval = order.approvalRequired ? '호스트 승인 후 확정' : '신청 즉시 확정';
  const ticketName = order.ticket.name ?? '티켓';
  const common = (
    <>
      <InfoRow label="예매자명" value={order.depositorName ?? '—'} />
      <InfoRow
        label="예매번호"
        value={<span data-testid="order-no">{order.orderNo ?? '—'}</span>}
      />
    </>
  );
  const issued = order.issuedTickets;
  return (
    <section aria-label="예매정보">
      <InfoRow hierarchy="first" label="예매정보" />
      {issued.length > 0
        ? issued.map((t, i) => {
            const state = issuedTicketStateLabel(t, detail.statusView.label);
            return (
              <Accordion
                key={t.ticketUuid ?? `sent-${i}`}
                label={t.ticketName ?? ticketName}
                meta={`(${i + 1}/${issued.length})`}
                trailing={<OptionAmountChip answers={t.optionAnswers} />}
                defaultOpen
              >
                <OptionAnswers answers={t.optionAnswers} />
                {i === 0 ? common : <InfoRow label="예매자명" value={order.depositorName ?? '—'} />}
                <InfoRow label="티켓번호" value={t.issuedTicketNo ?? '—'} />
                <InfoRow label="승인방식" value={approval} />
                <InfoRow
                  label="티켓상태"
                  value={
                    <Chip
                      size="sm"
                      shape="square"
                      color={STATE_TONE_COLOR[state.tone]}
                      theme="weak"
                    >
                      {state.label}
                    </Chip>
                  }
                />
              </Accordion>
            );
          })
        : order.lines.map((line, i) => (
            <Accordion
              key={i}
              label={ticketName}
              meta={
                order.lines.length > 1 ? `(${i + 1}/${order.lines.length})` : `(${line.quantity}매)`
              }
              trailing={<OptionAmountChip answers={line.optionAnswers} />}
              defaultOpen
            >
              <OptionAnswers answers={line.optionAnswers} />
              {i === 0 ? common : <InfoRow label="예매자명" value={order.depositorName ?? '—'} />}
              <InfoRow label="승인방식" value={approval} />
            </Accordion>
          ))}
    </section>
  );
}

type Answer = MyOrderDetail['lines'][number]['optionAnswers'][number];

function OptionAmountChip({ answers }: { answers: readonly Answer[] }) {
  const sum = answers.reduce((acc, a) => acc + a.additionalPrice, 0);
  if (sum <= 0) return null;
  return (
    <Chip size="sm" shape="square" color="violet" theme="fill">
      {formatOptionAmount(sum)}
    </Chip>
  );
}

/** 옵션 답 — 읽기 전용(와이어 `498:703` Tomato 10-24 "수정 불가능한 느낌"). 질문 · 설명 · 답 */
function OptionAnswers({ answers }: { answers: readonly Answer[] }) {
  if (answers.length === 0) return null;
  return (
    <div className={p.optionBox}>
      {answers.map((a, i) => (
        <Flex key={i} direction="column" gap={1}>
          <Txt typography="labelMd">
            {a.optionName ?? '옵션'}
            {a.additionalPrice > 0 && (
              <Txt as="span" typography="labelMd" color={colors.textBrandLabel}>
                {' '}
                ({formatOptionAmount(a.additionalPrice)})
              </Txt>
            )}
          </Txt>
          {a.description && (
            <Txt typography="bodySm" color={colors.textTertiaryLabel}>
              {a.description}
            </Txt>
          )}
          <Txt typography="bodyMd">{a.answer ?? '—'}</Txt>
        </Flex>
      ))}
    </div>
  );
}
