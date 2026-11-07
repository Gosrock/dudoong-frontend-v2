'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';

import type { Checkout } from '@/api/order/schema';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Chip, formatOptionAmount } from '@/ui/components/Chip/Chip';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Popup } from '@/ui/components/Popup/Popup';
import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { firstInvalidTicket } from '../model/option-form';
import { type CheckoutState, useCheckout } from '../model/useCheckout';
import { collapseTopLine } from './checkout.css';
import { DudoongNoticeField, HostProvisionField } from './CheckoutAgreements';
import * as s from './CheckoutForm.css';
import { AmountInfo, DepositSummary, PaymentChannelField, PaymentInfo } from './CheckoutPayment';
import { OptionFields } from './OptionFields';
import { RefundPolicy } from './RefundPolicy';

/** 동의 줄 — GUI `564:4156` 글자 그대로 */
const AGREE_LABEL = '주문내용과 환불/취소 규정을 확인하였으며 이에 동의합니다.';

/**
 * 체크아웃 폼 — 순서(GUI `564:4156`): 폼 위 안내 / 옵션적용 / 예매정보(티켓 아코디언) / 결제정보 · 결제금액 · 결제방식(두둥만) /
 * 호스트 제공 동의 / 취소·환불 규정 / 하단 동의 + CTA. 두둥은 CTA 뒤 주문 확인 다이얼로그(요약 + 입금 전 확인)를 거친다.
 */
export function CheckoutForm({
  eventName,
  eventStartAt,
  ...props
}: {
  eventId: number;
  checkout: Checkout;
  depositorName: string | null;
  quantity: number;
  eventName: string;
  eventStartAt: string | null;
}) {
  const c = useCheckout(props);

  // 티켓 아코디언 — 처음에는 1번만 펼친다(GUI)
  const [openTickets, setOpenTickets] = useState<Record<number, boolean>>({ 0: true });
  const setTicketOpen = (i: number, open: boolean) =>
    setOpenTickets((prev) => ({ ...prev, [i]: open }));

  // 주문 확인 다이얼로그(두둥만). 뒤로가기가 닫는다(patterns §6) — 요청 중에는 잡아 둔다
  const [confirming, setConfirming] = useState(false);
  const { release } = useCloseOnBack(confirming, () => setConfirming(false), {
    hold: c.submission.pending,
  });

  const focusFirstError = () => {
    // 첫 오류 티켓의 아코디언을 열고(tech-decisions §18) 다음 프레임에 포커스 — 닫힌 Collapsible 안 칸은 그려져 있지 않다
    const ticket =
      c.options.mode === 'individual' ? firstInvalidTicket(c.form.formState.errors) : null;
    const target = ticket ?? (c.form.formState.errors.options ? 0 : null);
    if (target !== null) setTicketOpen(target, true);
    window.setTimeout(() => void c.form.trigger(undefined, { shouldFocus: true }), 0);
  };

  const onCta = async () => {
    if (c.submission.pending) return;
    if (!(await c.submission.validate())) return focusFirstError();
    if (!c.needsOrderConfirm) return void c.submission.submit();
    setConfirming(true);
  };

  const onConfirmOrder = async () => {
    // 다이얼로그가 넣은 기록을 먼저 소비한다 — 성공하면 훅이 완료 주소로 replace하므로 뒤로가기가 체크아웃으로 돌아오지 않는다
    await release();
    await c.submission.submit();
    // 실패하면 다이얼로그를 닫고 폼 위 안내를 보인다(성공이면 화면이 바뀐다)
    setConfirming(false);
  };

  const isTransfer = c.kind === 'TRANSFER';

  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        void onCta();
      }}
      noValidate
    >
      <SubmitBanners c={c} />
      {c.options.canChooseMode && <OptionModeSection c={c} />}
      <TicketsSection c={c} openTickets={openTickets} setTicketOpen={setTicketOpen} />

      {isTransfer && (
        <>
          <Divider variant="section" />
          <PaymentInfo c={c} />
          <Divider variant="section" />
          <AmountInfo c={c} />
          <Divider variant="section" />
          <PaymentChannelField c={c} />
        </>
      )}

      {c.agreementFields.hostProvision && (
        <>
          <Divider variant="section" />
          <HostProvisionField c={c} eventName={eventName} />
        </>
      )}

      <RefundPolicy c={c} eventId={props.eventId} startAt={eventStartAt} />

      <div className={s.bottomBar}>
        <AgreeRefundPolicyField c={c} />
        <Button type="submit" size="lg" fullWidth disabled={c.submission.pending}>
          {c.ctaLabel}
        </Button>
      </div>

      {isTransfer && (
        <OrderConfirmPopup
          c={c}
          open={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={() => void onConfirmOrder()}
        />
      )}
    </form>
  );
}

/** 폼 위 안내 — 제출 실패(+ 결과를 모르면 [다시 시도] · [주문내역 확인]) · 수량을 줄였다는 알림 */
function SubmitBanners({ c }: { c: CheckoutState }) {
  const error = c.submission.error;
  return (
    <>
      {error && (
        <div className={s.errorBanner} role="alert">
          <Txt typography="labelMd" color={colors.textDangerLabel}>
            {error.message}
          </Txt>
          {/* 주문이 생겼는지 모르는 실패(이슈 #92-4 · #914) — [다시 시도]는 같은 Idempotency-Key로 보내 서버가 앞 주문을 돌려준다(#923).
              FIGMA-CUSTOM: 디자인 없음 — DS Button 둘(다시 시도 · 주문내역 확인). 🤖 Claude 판단(2026-11-02), design-requests Q98. Figma 코멘트 2026-11-02 */}
          {error.retrySameKey && (
            <>
              <Spacing size={2} />
              <Flex gap={2}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={c.submission.pending}
                  onClick={() => void c.submission.submit()}
                >
                  다시 시도
                </Button>
                <Link href="/orders" className={button({ variant: 'secondary', size: 'sm' })}>
                  주문내역 확인
                </Link>
              </Flex>
            </>
          )}
        </div>
      )}
      {c.quantityAdjusted && (
        <div className={s.errorBanner} role="status">
          <Txt typography="labelMd" color={colors.textSecondaryLabel}>
            남은 수량에 맞춰 {c.quantity}매로 줄였어요.
          </Txt>
        </div>
      )}
    </>
  );
}

/** 옵션적용 — "모든 티켓에 동일 옵션 적용"(수량 2 이상 + 옵션이 있을 때) */
function OptionModeSection({ c }: { c: CheckoutState }) {
  const onToggleSame = async (same: boolean) => {
    if (!same) return void c.options.setMode('individual');
    if (c.options.setMode('same') === 'ok') return;
    // 티켓별 답이 서로 다르면 어느 답으로 맞출지 — 1번 티켓 답으로(잠정, 디자인 없음)
    const ok = await openConfirm({
      title: '모든 티켓에 같은 옵션을 적용할까요?',
      description: '1번 티켓에 입력한 옵션으로 나머지 티켓을 맞춰요.',
      confirmLabel: '적용',
    });
    if (ok) c.options.setMode('same', 0);
  };
  return (
    <section aria-label="옵션 적용">
      <InfoRow hierarchy="first" label="옵션적용" />
      <InfoRow
        hierarchy="second"
        className={collapseTopLine}
        label={<label htmlFor="checkout-same-options">모든 티켓에 동일 옵션 적용</label>}
        value={
          <Checkbox
            id="checkout-same-options"
            checked={c.options.mode === 'same'}
            onCheckedChange={(v) => void onToggleSame(v)}
          />
        }
      />
      <Divider variant="section" />
    </section>
  );
}

/** 예매정보 — 티켓마다 아코디언(옵션 응답 · 예매자명 · 승인방식) */
function TicketsSection({
  c,
  openTickets,
  setTicketOpen,
}: {
  c: CheckoutState;
  openTickets: Record<number, boolean>;
  setTicketOpen: (i: number, open: boolean) => void;
}) {
  const errors = c.form.formState.errors;
  const approvalLabel = c.kind === 'FREE_FCFS' ? '신청 즉시 확정' : '호스트 승인 후 확정';
  const ticketName = c.ticket.name ?? '티켓';
  const same = c.options.mode === 'same';
  return (
    <section aria-labelledby="checkout-tickets">
      <InfoRow hierarchy="first" label={<span id="checkout-tickets">예매정보</span>} />
      {Array.from({ length: c.quantity }, (_, t) => (
        <Accordion
          key={t}
          label={ticketName}
          meta={`(${t + 1}/${c.quantity})`}
          trailing={
            c.ticketOptionAmounts[t] ? (
              // GUI 567:9316 — 유료 옵션을 고른 티켓 줄의 금액 칩(DS tag_v2 small · square · violet · fill)
              <Chip color="violet" theme="fill">
                {formatOptionAmount(c.ticketOptionAmounts[t])}
              </Chip>
            ) : undefined
          }
          className={collapseTopLine}
          open={openTickets[t] ?? false}
          onOpenChange={(open) => setTicketOpen(t, open)}
        >
          {c.options.has && (!same || t === 0) && (
            <div className={s.optionBox}>
              <OptionFields
                c={c}
                base={same ? 'options.same' : `options.tickets.${t}`}
                errors={same ? errors.options?.same : errors.options?.tickets?.[t]}
                idPrefix={`t${t}`}
              />
            </div>
          )}
          <InfoRow label="예매자명" value={c.depositorName ?? '—'} />
          <InfoRow label="승인방식" value={approvalLabel} />
        </Accordion>
      ))}
    </section>
  );
}

/** 하단 동의 줄(환불/취소 규정) */
function AgreeRefundPolicyField({ c }: { c: CheckoutState }) {
  return (
    <Controller
      control={c.form.control}
      name="agreeRefundPolicy"
      render={({ field, fieldState }) => (
        <Flex direction="column" align="center" gap={1}>
          <Checkbox
            ref={field.ref}
            checked={field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            aria-invalid={fieldState.error ? true : undefined}
            label={
              <Txt typography="labelSm" color={colors.textPrimaryLabel}>
                {AGREE_LABEL}
              </Txt>
            }
          />
          {fieldState.error && (
            <Txt typography="labelSm" color={colors.textDangerLabel}>
              <span role="alert">{fieldState.error.message}</span>
            </Txt>
          )}
        </Flex>
      )}
    />
  );
}

/** 주문 확인 다이얼로그(두둥) — 결제 요약 + 입금 전 확인(③) → [주문 완료하기] */
function OrderConfirmPopup({
  c,
  open,
  onClose,
  onConfirm,
}: {
  c: CheckoutState;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const noticeConfirmed = useWatch({
    control: c.form.control,
    name: 'dudoongTicketNoticeConfirmed',
  });
  return (
    <Popup
      open={open}
      onOpenChange={(next) => {
        if (!next && !c.submission.pending) onClose();
      }}
      closeOnBack={false}
      title="주문 완료하기"
      // FIGMA-CUSTOM: GUI 567:9468은 "입금 하셨나요?" + [결제완료](입금 뒤 주문). B23(사용자 결정 2026-11-02)으로 주문을 입금 전에
      // 먼저 만든다 — 같은 DS Popup에 문구·버튼만 바꿨다. 계좌·금액 안내는 주문 완료 화면. 🤖 Claude 판단, design-requests Q97. Figma 코멘트 2026-11-02
      description={
        <>
          확인을 누르면 주문이 호스트에게 전달되고 티켓이 잡혀요.
          <br />
          다음 화면에서 안내하는 계좌로 입금해 주세요.
        </>
      }
      confirmLabel="주문 완료하기"
      onConfirm={onConfirm}
      loading={c.submission.pending}
      confirmDisabled={c.agreementFields.dudoongNotice && !noticeConfirmed}
    >
      <DepositSummary c={c} />
      {c.agreementFields.dudoongNotice && <DudoongNoticeField c={c} />}
    </Popup>
  );
}
