'use client';

import { Fragment } from 'react';

import type { MyOrderDetail } from '@/api/order/schema';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Chip, formatOptionAmount } from '@/ui/components/Chip/Chip';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Input } from '@/ui/components/Input/Input';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { issuedTicketStateLabel } from '../model/order-card';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as p from './OrderDetail.css';

/**
 * 옵션 적용(gui `1175:19380` First · `1175:19381` second-radio) — 모든 티켓 동일 / 티켓별(옵션이 없는 주문은 그리지 않는다).
 * second-radio의 체크(`Box` round · checked)는 읽기 전용이라 눌리지 않는 체크박스로(회색 — Figma 그림과 같은 색)
 */
export function OrderOptionMode({ detail }: { detail: OrderDetailState }) {
  if (detail.optionMode === 'none') return null;
  const all = detail.optionMode === 'all';
  const label = all ? '모든 티켓에 동일 옵션 적용' : '티켓별로 다른 옵션 적용';
  return (
    <section aria-label="옵션 적용">
      <InfoRow hierarchy="first" label="옵션 적용" />
      <InfoRow
        hierarchy="second"
        label={label}
        value={all ? <Checkbox checked disabled aria-label={label} /> : undefined}
      />
      <Divider variant="section" />
    </section>
  );
}

/**
 * 예매정보(gui `1175:19383`~) — 발급 티켓이 있으면 티켓마다, 없으면(승인 대기 · 거절) 주문 줄마다 아코디언 하나(DS `list`
 * second-open/closed). GUI대로 **첫 아코디언만 펼친다**(와이어 때는 모두 펼침). 티켓상태는 칩이 아니라 글자(third · text) —
 * 선물 중이면 "승인완료(선물중)"(gui `1175:19404`).
 */
export function OrderTickets({ detail }: { detail: OrderDetailState }) {
  const { order } = detail;
  const approval = order.approvalRequired ? '호스트 승인 후 확정' : '신청 즉시 확정';
  const ticketName = order.ticket.name ?? '티켓';
  const common = (
    <>
      <InfoRow label="예매자명" value={order.depositorName ?? '—'} />
      <InfoRow
        label="예매번호"
        value={
          <Txt typography="labelMd" color={colors.textSecondary}>
            <span data-testid="order-no">{order.orderNo ?? '—'}</span>
          </Txt>
        }
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
                defaultOpen={i === 0}
              >
                <OptionAnswers answers={t.optionAnswers} />
                {i === 0 ? common : <InfoRow label="예매자명" value={order.depositorName ?? '—'} />}
                <InfoRow label="티켓번호" value={t.issuedTicketNo ?? '—'} />
                <InfoRow label="승인방식" value={approval} />
                <InfoRow
                  label="티켓상태"
                  value={
                    state.tone === 'gift'
                      ? `${detail.statusView.label}(${state.label})`
                      : state.label
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
              defaultOpen={i === 0}
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

/**
 * 옵션 답 — 회색 판(gui `1175:19385` `list` 채움 `surface/container` · 안쪽 12/24 · 간격 16). 질문(Label/md-emphasized
 * `text/secondary-label`) + 추가금(브랜드 색) · 설명(Label/md `text/tertiary-label`) · 답.
 * 답은 GUI에서 객관식이 [예][아니오](로컬 `Check Button`), 주관식이 채워진 `input Field`다. O-3 응답에는 옵션 종류와 선택지가 없어
 * (서버 B61) 모든 답을 읽기 전용 `input Field`(Filled)로 그린다(🤖 디자인 Q177). 답 사이는 가는 선(gui `Line 49`).
 */
function OptionAnswers({ answers }: { answers: readonly Answer[] }) {
  if (answers.length === 0) return null;
  return (
    <div className={p.optionBox}>
      {answers.map((a, i) => (
        <Fragment key={i}>
          {i > 0 && <Divider />}
          <Flex direction="column" gap={4}>
            <Flex direction="column" gap={2}>
              <Txt typography="labelMdEmphasized" color={colors.textSecondaryLabel}>
                {a.optionName ?? '옵션'}
                {a.additionalPrice > 0 && (
                  <Txt as="span" typography="labelMdEmphasized" color={colors.textBrandLabel}>
                    {' '}
                    ({formatOptionAmount(a.additionalPrice).replace(/\s/g, '')})
                  </Txt>
                )}
              </Txt>
              {a.description && (
                <Txt typography="labelMd" color={colors.textTertiaryLabel}>
                  {a.description}
                </Txt>
              )}
            </Flex>
            <Input
              readOnly
              value={a.answer ?? '—'}
              aria-label={`${a.optionName ?? '옵션'} 답`}
              showCount={false}
            />
          </Flex>
        </Fragment>
      ))}
    </div>
  );
}
