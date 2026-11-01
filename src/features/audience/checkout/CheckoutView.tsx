'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';

import { isSessionLost } from '@/api/errors';
import { eventDetailQuery } from '@/api/event/queries';
import type { Checkout, PaymentChannel } from '@/api/order/schema';
import { formatKstDotDateTimeWeekday } from '@/api/shared/date';
import { AudienceSubHeader } from '@/features/audience/shell/AudienceSubHeader';
import { Accordion } from '@/ui/components/Accordion/Accordion';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { button } from '@/ui/components/Button/Button.css';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { CopyButton } from '@/ui/components/InfoRow/CopyButton';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Input } from '@/ui/components/Input/Input';
import { ScreenLoader } from '@/ui/components/Loader/Loader';
import { Popup } from '@/ui/components/Popup/Popup';
import { SelectButton } from '@/ui/components/SelectButton/SelectButton';
import { toast } from '@/ui/components/Toast/Toast';
import { useCloseOnBack } from '@/ui/hooks/useCloseOnBack';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './CheckoutView.css';
import { type CheckoutParams, eventHref } from './model/checkout-params';
import { firstInvalidTicket } from './model/option-form';
import { REFUND_DEADLINE, refundPolicyItems } from './model/refund-policy';
import { type CheckoutState, useCheckout, useCheckoutData } from './model/useCheckout';

/** 결제 방식 버튼 글자 — GUI `564:4156` "토스간편송금"·"계좌이체" */
const CHANNEL_LABEL: Record<'BANK_TRANSFER' | 'TOSS_TRANSFER', string> = {
  TOSS_TRANSFER: '토스간편송금',
  BANK_TRANSFER: '계좌이체',
};

/** 동의 줄 — GUI `564:4156` 글자 그대로 */
const AGREE_LABEL = '주문내용과 환불/취소 규정을 확인하였으며 이에 동의합니다.';

const won = (n: number) => `${n.toLocaleString('ko-KR')} 원`;

/**
 * 체크아웃(`/events/[eventId]/checkout?ticketItemId=&quantity=`) — GUI 근거(plan P7 V, gui-screens §0):
 * 모든 옵션 동일 `564:4156` · 유료옵션 `567:9316` · 무옵션 `567:9159` · 긴제목 `567:10452` · 개별 옵션 `567:8532` ·
 * 입금 확인 `567:9468`. 서버 기준으로 바꾼 것(plan P7 ①~④): 예매번호·티켓번호 줄 없음, 결제정보에 은행 줄, CTA "결제하기"·"신청하기",
 * 무료는 결제 블록(결제정보·결제금액·결제방식) 없이.
 */
export function CheckoutView({
  eventId,
  params,
}: {
  eventId: number;
  params: CheckoutParams | null;
}) {
  // 공연 이름(헤더 제목). 공개 GP-3 — 상세에서 왔으면 캐시가 있다. 실패해도 체크아웃은 그린다
  const event = useQuery(eventDetailQuery(eventId));
  const eventName = event.data?.name ?? '';
  const eventStartAt = event.data?.startAt ?? null;
  return (
    <>
      <AudienceSubHeader title={eventName} fallbackHref={eventHref(eventId)} />
      <main className={s.page}>
        <Txt as="h1" typography="headingMdEmphasized" className={s.title}>
          {eventName ? `${eventName} 결제하기` : '결제하기'}
        </Txt>
        <AsyncBoundary holdOn={isSessionLost}>
          <CheckoutContent
            eventId={eventId}
            params={params}
            eventName={eventName}
            eventStartAt={eventStartAt}
          />
        </AsyncBoundary>
      </main>
    </>
  );
}

function CheckoutContent({
  eventId,
  params,
  eventName,
  eventStartAt,
}: {
  eventId: number;
  params: CheckoutParams | null;
  eventName: string;
  eventStartAt: string | null;
}) {
  const state = useCheckoutData(eventId, params);
  const router = useRouter();
  const backHref = state.status === 'unavailable' ? state.backHref : null;
  useEffect(() => {
    // 티켓 선택으로 돌려보낸다(patterns §16). 뒤로가기로 다시 오지 않게 replace
    if (backHref) router.replace(backHref);
  }, [backHref, router]);

  if (state.status === 'pending') {
    return <ScreenLoader />;
  }
  if (state.status === 'unavailable') {
    return (
      <Flex direction="column" align="center" gap={3} paddingY={8} paddingX={5}>
        <Txt typography="bodyMd" color={colors.textSecondary} align="center">
          <span role="alert">지금은 이 티켓을 구매할 수 없어요.</span>
        </Txt>
        <Link href={state.backHref} className={button({ variant: 'secondary', size: 'md' })}>
          티켓 다시 고르기
        </Link>
      </Flex>
    );
  }
  return (
    <CheckoutForm
      eventId={eventId}
      checkout={state.checkout}
      depositorName={state.depositorName}
      quantity={params?.quantity ?? 1}
      eventName={eventName}
      eventStartAt={eventStartAt}
    />
  );
}

function CheckoutForm({
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
  const errors = c.form.formState.errors;

  // 티켓 아코디언 — 처음에는 1번만 펼친다(GUI)
  const [openTickets, setOpenTickets] = useState<Record<number, boolean>>({ 0: true });
  const setTicketOpen = (i: number, open: boolean) =>
    setOpenTickets((prev) => ({ ...prev, [i]: open }));

  // 입금 확인 다이얼로그(두둥만). 뒤로가기가 닫는다(patterns §6) — 요청 중에는 잡아 둔다
  const [confirming, setConfirming] = useState(false);
  const { release } = useCloseOnBack(confirming, () => setConfirming(false), {
    hold: c.submitting,
  });

  const focusFirstError = () => {
    // 첫 오류 티켓의 아코디언을 열고(tech-decisions §18) 다음 프레임에 포커스 — 닫힌 Collapsible 안 칸은 그려져 있지 않다
    const ticket = c.mode === 'individual' ? firstInvalidTicket(c.form.formState.errors) : null;
    const target = ticket ?? (c.form.formState.errors.options ? 0 : null);
    if (target !== null) setTicketOpen(target, true);
    window.setTimeout(() => void c.form.trigger(undefined, { shouldFocus: true }), 0);
  };

  const onCta = async () => {
    if (c.submitting) return;
    if (!(await c.validate())) return focusFirstError();
    if (!c.needsDepositConfirm) return void c.submit();
    setConfirming(true);
  };

  const onConfirmDeposit = async () => {
    // 다이얼로그가 넣은 기록을 먼저 소비한다 — 성공하면 훅이 완료 주소로 replace하므로 뒤로가기가 체크아웃으로 돌아오지 않는다
    await release();
    await c.submit();
    // 실패하면 다이얼로그를 닫고 폼 위 안내를 보인다(성공이면 화면이 바뀐다)
    setConfirming(false);
  };

  const onToggleSame = async (same: boolean) => {
    if (!same) return void c.setMode('individual');
    if (c.setMode('same') === 'ok') return;
    // 티켓별 답이 서로 다르면 어느 답으로 맞출지 — 1번 티켓 답으로(잠정, 디자인 없음)
    const ok = await openConfirm({
      title: '모든 티켓에 같은 옵션을 적용할까요?',
      description: '1번 티켓에 입력한 옵션으로 나머지 티켓을 맞춰요.',
      confirmLabel: '적용',
    });
    if (ok) c.setMode('same', 0);
  };

  const noticeConfirmed = useWatch({
    control: c.form.control,
    name: 'dudoongTicketNoticeConfirmed',
  });
  const isTransfer = c.kind === 'TRANSFER';
  const approvalLabel = c.kind === 'FREE_FCFS' ? '신청 즉시 확정' : '호스트 승인 후 확정';
  const ticketName = c.ticket.name ?? '티켓';

  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        void onCta();
      }}
      noValidate
    >
      {c.submitError && (
        <div className={s.errorBanner} role="alert">
          <Txt typography="labelMd" color={colors.textDangerLabel}>
            {c.submitError.message}
          </Txt>
          {/* 응답을 못 받은 주문 — 다시 내기 전에 주문내역부터(이슈 #92-4). 새 탭이 아니라 이동: 결과를 보고 돌아온다 */}
          {c.submitError.kind === 'ORDER_UNCERTAIN' && (
            <div className={s.errorBannerAction}>
              <Link href="/orders" className={button({ variant: 'secondary', size: 'sm' })}>
                주문내역 확인
              </Link>
            </div>
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

      {c.canChooseMode && (
        <section aria-label="옵션 적용">
          <InfoRow hierarchy="first" label="옵션적용" />
          <InfoRow
            hierarchy="second"
            className={s.collapseTopLine}
            label={<label htmlFor="checkout-same-options">모든 티켓에 동일 옵션 적용</label>}
            value={
              <Checkbox
                id="checkout-same-options"
                checked={c.mode === 'same'}
                onCheckedChange={(v) => void onToggleSame(v)}
              />
            }
          />
          <div className={s.sectionGap} />
        </section>
      )}

      <section aria-labelledby="checkout-tickets">
        <InfoRow hierarchy="first" label={<span id="checkout-tickets">예매정보</span>} />
        {Array.from({ length: c.quantity }, (_, t) => (
          <Accordion
            key={t}
            label={ticketName}
            meta={`(${t + 1}/${c.quantity})`}
            className={s.collapseTopLine}
            open={openTickets[t] ?? false}
            onOpenChange={(open) => setTicketOpen(t, open)}
          >
            {c.hasOptions && (c.mode === 'individual' || t === 0) && (
              <div className={s.optionBox}>
                <OptionFields
                  c={c}
                  base={c.mode === 'same' ? 'options.same' : `options.tickets.${t}`}
                  errors={c.mode === 'same' ? errors.options?.same : errors.options?.tickets?.[t]}
                  idPrefix={`t${t}`}
                />
              </div>
            )}
            <InfoRow label="예매자명" value={c.depositorName ?? '—'} />
            <InfoRow label="승인방식" value={approvalLabel} />
          </Accordion>
        ))}
      </section>

      {isTransfer && (
        <>
          <div className={s.sectionGap} />
          <PaymentInfo c={c} />
          <div className={s.sectionGap} />
          <AmountInfo c={c} />
          <div className={s.sectionGap} />
          <PaymentChannelField c={c} />
        </>
      )}

      {c.agreementFields.hostProvision && (
        <>
          <div className={s.sectionGap} />
          <HostProvisionField c={c} eventName={eventName} />
        </>
      )}

      <RefundPolicy c={c} eventId={props.eventId} startAt={eventStartAt} />

      <div className={s.bottomBar}>
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
                  <Txt typography="labelSm" color={colors.textSecondaryLabel}>
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
        <Button type="submit" size="lg" fullWidth disabled={c.submitting}>
          {c.ctaLabel}
        </Button>
      </div>

      {isTransfer && (
        <Popup
          open={confirming}
          onOpenChange={(open) => {
            if (!open && !c.submitting) setConfirming(false);
          }}
          closeOnBack={false}
          title="주문 완료하기"
          description={
            <>
              입금 하셨나요?
              <br />
              확인을 누르면 즉시 호스트에게 주문이 전달됩니다.
            </>
          }
          confirmLabel="결제완료"
          onConfirm={() => void onConfirmDeposit()}
          loading={c.submitting}
          confirmDisabled={c.agreementFields.dudoongNotice && !noticeConfirmed}
        >
          <DepositSummary c={c} />
          {c.agreementFields.dudoongNotice && <DudoongNoticeField c={c} />}
        </Popup>
      )}
    </form>
  );
}

// ─── 주문 동의(#840 — 백엔드 #905 1-1 출시 전 필수, 위치는 디자인 Q42 답 전 잠정) ─────────

/**
 * ② 호스트에게 개인정보 제공 동의 — legal-copy B-1 원문(약관 제36조②·처리방침 3장). 빼거나 바꾸지 않는다(바꾸면 `AGREEMENT_VERSION`).
 * 꼬리 ", 입금자명·환불 계좌"는 두둥만. 디자인 없음 — DS Checkbox + DS Accordion([자세히] 펼침)
 */
function hostProvisionItems(eventName: string, dudoong: boolean) {
  const host = eventName ? `${eventName}의 호스트` : '이 공연의 호스트';
  return [
    `제공받는 자: ${host}`,
    '목적: 예매·입장 확인, 공연 변경·취소 안내, 두둥티켓 입금 확인과 환불',
    `항목: 이름, 연락처, 이메일, 예매·결제 내역, 이 공연의 추가 질문 응답${dudoong ? ', 입금자명·환불 계좌' : ''}`,
    '보유기간: 공연 종료 후 6개월 (두둥티켓 입금·환불 내역은 3년)',
    '동의하지 않으면 예매할 수 없습니다.',
  ];
}

/**
 * ③ 두둥티켓 입금 전 확인 — legal-copy A-6 ①~③ 원문(약관 제29조②·제19조③). v1의 ④ "'입금했어요'를 누르면 위 내용에 동의한 것으로
 * 봅니다"는 v2가 체크 칸으로 받으므로 체크 글자로 바꿨다(🤖 Claude 판단 2026-11-01 — 문구 변경 아님: v2 첫 노출)
 */
const DUDOONG_NOTICE_ITEMS = [
  '두둥티켓 대금은 호스트에게 직접 지급되며, 두둥은 대금을 받지 않습니다.',
  '예매를 취소해도 자동으로 환불되지 않으며, 환불은 호스트가 직접 합니다.',
  '호스트가 공연 상세에 별도 환불 기준(예: 공연 당일 환불 불가)을 안내했다면, 직접 취소할 때의 환불은 그 기준이 우선합니다.',
] as const;
const DUDOONG_NOTICE_LABEL = '(필수) 위 내용을 확인했으며 이에 동의합니다';
const HOST_PROVISION_LABEL = '(필수) 호스트에게 개인정보 제공 동의';

function HostProvisionField({ c, eventName }: { c: CheckoutState; eventName: string }) {
  const errorId = useId();
  return (
    <section aria-label="개인정보 제공 동의" className={s.agreement}>
      <Controller
        control={c.form.control}
        name="hostProvisionAgreed"
        render={({ field, fieldState }) => (
          <Flex direction="column" gap={1} className={s.agreementCheck}>
            <Checkbox
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
              label={
                <Txt typography="labelMd" color={colors.textPrimaryLabel}>
                  {HOST_PROVISION_LABEL}
                </Txt>
              }
            />
            {fieldState.error && (
              <Txt typography="labelSm" color={colors.textDangerLabel}>
                <span role="alert" id={errorId}>
                  {fieldState.error.message}
                </span>
              </Txt>
            )}
          </Flex>
        )}
      />
      <Accordion label="자세히">
        <ol className={`${s.agreementList} ${s.agreementDetailBody}`}>
          {hostProvisionItems(eventName, c.ticket.payType === 'DUDOONG').map((item) => (
            <li key={item}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {item}
              </Txt>
            </li>
          ))}
        </ol>
      </Accordion>
    </section>
  );
}

function DudoongNoticeField({ c }: { c: CheckoutState }) {
  return (
    <div className={s.notice}>
      <ol className={`${s.agreementList} ${s.noticeList}`}>
        {DUDOONG_NOTICE_ITEMS.map((item) => (
          <li key={item}>
            <Txt typography="labelSm" color={colors.textSecondaryLabel}>
              {item}
            </Txt>
          </li>
        ))}
      </ol>
      <Controller
        control={c.form.control}
        name="dudoongTicketNoticeConfirmed"
        render={({ field }) => (
          <Checkbox
            ref={field.ref}
            checked={field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            disabled={c.submitting}
            label={
              <Txt typography="labelMd" color={colors.textPrimaryLabel}>
                {DUDOONG_NOTICE_LABEL}
              </Txt>
            }
          />
        )}
      />
    </div>
  );
}

// ─── 취소·환불 규정(이슈 #105) ─────────────────────────────

/**
 * 동의 줄("…환불/취소 규정을 확인하였으며…") 바로 위의 규정 보기 — legal-copy A-7 원문(`refundPolicyItems`) + 취소 기한 + 이용약관 ·
 * 공연 상세(호스트가 쓴 환불 기준) 링크. 보지 못한 규정에 동의하지 않게(이슈 #105 ⭐).
 * FIGMA-CUSTOM: 체크아웃 GUI(564:4156)에는 규정 자리가 없다(동의 줄만) → DS Accordion(접힘)으로 최소안. 요약 박스·크기는 디자인 Q79.
 * 🤖 Claude 판단(2026-11-02): 되돌리려면 이 컴포넌트 한 줄을 빼면 된다. 링크는 새 탭 — 고른 옵션을 잃지 않게
 */
function RefundPolicy({
  c,
  eventId,
  startAt,
}: {
  c: CheckoutState;
  eventId: number;
  startAt: string | null;
}) {
  const items = refundPolicyItems(c.ticket.payType);
  if (!items) return null;
  return (
    <section aria-label="취소·환불 규정" className={s.refundPolicy}>
      <div className={s.sectionGap} />
      <Accordion label="취소·환불 규정 보기" className={s.collapseTopLine}>
        <InfoRow label={REFUND_DEADLINE.label} value={REFUND_DEADLINE.value} />
        {startAt && <InfoRow label="공연 시작" value={formatKstDotDateTimeWeekday(startAt)} />}
        <ol className={`${s.agreementList} ${s.agreementDetailBody}`}>
          {items.map((item) => (
            <li key={item}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {item}
              </Txt>
            </li>
          ))}
        </ol>
        <Flex gap={4} wrap className={s.refundPolicyLinks}>
          <a
            href={eventHref(eventId)}
            target="_blank"
            rel="noopener noreferrer"
            className={s.textLink}
          >
            호스트 환불 기준(공연 상세)
          </a>
          <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.textLink}>
            이용약관
          </a>
        </Flex>
      </Accordion>
    </section>
  );
}

// ─── 결제정보 · 결제금액 · 결제방식 ─────────────────────────────

const copyToast = {
  onCopied: () => toast('계좌번호를 복사했어요', { id: 'checkout:copy' }),
  onCopyError: () =>
    toast('복사하지 못했어요. 계좌번호를 직접 입력해 주세요', { id: 'checkout:copy' }),
};

function PaymentInfo({ c }: { c: CheckoutState }) {
  const account = c.account;
  return (
    <section aria-label="결제정보">
      <InfoRow hierarchy="first" label="결제정보" value="입금자명은 닉네임과 동일하게 해주세요" />
      {/* 서비스 운영자 결정(이슈 #106 §4, 2026-11-01) — 닉네임 = 입금자명은 의도. 다르면 닉네임을 바꾸도록 안내 + 마이페이지 링크.
          마이페이지는 새 탭 — 고른 옵션을 잃지 않게. 바꾼 뒤 이 화면을 새로 고치면 새 닉네임이 입금자명이 된다 */}
      <div className={s.depositorHint}>
        <Txt typography="labelSm" color={colors.textSecondaryLabel}>
          닉네임이 실제 입금자명과 다르면 마이페이지에서 닉네임을 바꿔 주세요.{' '}
          <a href="/mypage" target="_blank" rel="noopener noreferrer" className={s.textLink}>
            마이페이지
          </a>
        </Txt>
      </div>
      <InfoRow label="입금자명" value={c.depositorName ?? '—'} />
      {/* plan P7 ② — GUI는 계좌·예금주만. 토스 송금·입금에 은행이 필요해 은행 줄을 더한다 */}
      <InfoRow label="입금은행" value={account?.bankName ?? '—'} />
      {account?.accountNumber ? (
        <InfoRow label="결제계좌" account={{ number: account.accountNumber, ...copyToast }} />
      ) : (
        <InfoRow label="결제계좌" value="—" />
      )}
      <InfoRow label="예금주" value={account?.accountHolder ?? '—'} />
    </section>
  );
}

function amounts(c: CheckoutState) {
  const ticketAmount = c.ticket.price * c.quantity;
  // 총액은 훅의 `amount`(= 서버 totalAmount 식) 하나 — 옵션 금액은 그 차이로 보인다
  return { ticketAmount, optionAmount: Math.max(0, c.amount - ticketAmount), total: c.amount };
}

function AmountInfo({ c }: { c: CheckoutState }) {
  const { ticketAmount, optionAmount, total } = amounts(c);
  return (
    <section aria-label="결제금액">
      <InfoRow hierarchy="first" label="결제금액" />
      <InfoRow label="티켓금액" value={won(ticketAmount)} />
      <InfoRow label="옵션금액" value={won(optionAmount)} />
      <div className={s.totalDivider} />
      <InfoRow
        label={
          <Txt typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
            총 결제금액
          </Txt>
        }
        value={
          <Txt typography="headingSmEmphasized" color={colors.textBrandLabel}>
            <span data-testid="checkout-amount">{won(total)}</span>
          </Txt>
        }
      />
    </section>
  );
}

function PaymentChannelField({ c }: { c: CheckoutState }) {
  const titleId = useId();
  // 토스 송금은 링크를 만들 수 있고 은행 코드가 있을 때만(plan P7 L — `bankCode`가 null이면 토스 버튼을 숨긴다, B3)
  const tossAvailable = c.tossLink !== null && Boolean(c.account?.bankCode);
  const channels: ('TOSS_TRANSFER' | 'BANK_TRANSFER')[] = tossAvailable
    ? ['TOSS_TRANSFER', 'BANK_TRANSFER']
    : ['BANK_TRANSFER'];
  return (
    <section aria-labelledby={titleId}>
      <InfoRow hierarchy="first" label={<span id={titleId}>결제방식</span>} />
      <div className={s.paymentChannels}>
        <Controller
          control={c.form.control}
          name="paymentChannel"
          render={({ field }) => (
            <SelectButton
              ref={field.ref}
              aria-labelledby={titleId}
              value={field.value}
              onValueChange={(v) => field.onChange(v as PaymentChannel)}
              onBlur={field.onBlur}
              options={channels.map((ch) => ({ value: ch, label: CHANNEL_LABEL[ch] }))}
            />
          )}
        />
        {tossAvailable && c.paymentChannel === 'TOSS_TRANSFER' && c.tossLink && (
          <Flex direction="column" gap={2} style={{ marginTop: 12 }}>
            {/* 디자인 없음 — 토스 앱 열기 버튼(Figma 코멘트 2026-11-01) */}
            <a
              href={c.tossLink}
              data-testid="toss-link"
              className={button({ variant: 'secondary', size: 'md', fullWidth: true })}
            >
              토스 앱에서 송금하기
            </a>
            <Txt typography="labelSm" color={colors.textTertiaryLabel}>
              송금한 뒤 이 화면으로 돌아와 [{c.ctaLabel}]를 눌러 주세요.
            </Txt>
          </Flex>
        )}
      </div>
    </section>
  );
}

// ─── 입금 확인 다이얼로그 요약 ─────────────────────────────────

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.summaryRow}>
      <Txt typography="labelMd" color={colors.textSecondaryLabel}>
        {label}
      </Txt>
      <span className={s.summaryValue}>{children}</span>
    </div>
  );
}

function DepositSummary({ c }: { c: CheckoutState }) {
  const { ticketAmount, optionAmount, total } = amounts(c);
  const account = c.account;
  const channel = c.paymentChannel === 'TOSS_TRANSFER' ? 'TOSS_TRANSFER' : 'BANK_TRANSFER';
  const value = (v: ReactNode) => (
    <Txt typography="labelMd" color={colors.textSecondary}>
      {v}
    </Txt>
  );
  return (
    // FIGMA-CUSTOM: 입금 확인 결제 요약(gui 567:9756 "Frame 1707480412" 회색 판 + 흰 카드 둘) 커스텀 → DS 다이얼로그 - 결제 요약(772:1195, Popup children). Figma 코멘트 2026-11-01
    <div className={s.summaryBox}>
      <SummaryRow label="입금자명">{value(c.depositorName ?? '—')}</SummaryRow>
      <SummaryRow label="결제방식">{value(CHANNEL_LABEL[channel])}</SummaryRow>
      <SummaryRow label="입금은행">{value(account?.bankName ?? '—')}</SummaryRow>
      <SummaryRow label="결제계좌">
        {account?.accountNumber ? (
          <>
            <CopyButton text={account.accountNumber} aria-label="계좌번호 복사" {...copyToast} />
            {value(account.accountNumber)}
          </>
        ) : (
          value('—')
        )}
      </SummaryRow>
      <SummaryRow label="예금주">{value(account?.accountHolder ?? '—')}</SummaryRow>
      <div className={s.summaryDivider} />
      <SummaryRow label="티켓금액">{value(won(ticketAmount))}</SummaryRow>
      <SummaryRow label="옵션금액">{value(won(optionAmount))}</SummaryRow>
      <div className={s.summaryDivider} />
      <div className={s.summaryRow}>
        <Txt typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
          총 결제금액
        </Txt>
        <Txt typography="headingSmEmphasized" color={colors.textBrandLabel}>
          {won(total)}
        </Txt>
      </div>
    </div>
  );
}

// ─── 옵션 응답 ────────────────────────────────────────────────

type AnswerErrors = ({ answer?: { message?: string } } | undefined)[] | undefined;

function OptionFields({
  c,
  base,
  errors,
  idPrefix,
}: {
  c: CheckoutState;
  base: 'options.same' | `options.tickets.${number}`;
  errors: unknown;
  idPrefix: string;
}) {
  const fieldErrors = errors as AnswerErrors;
  return (
    <>
      {c.ticket.options.map((option, i) => {
        const name = `${base}.${i}.answer` as `options.same.${number}.answer`;
        const error = fieldErrors?.[i]?.answer?.message;
        const titleId = `${idPrefix}-option-${option.optionId}`;
        const optionName = option.name ?? '옵션';
        return (
          <Flex key={option.optionId} direction="column" gap={3} fullWidth>
            {i > 0 && <div className={s.optionDivider} />}
            <Flex direction="column" gap={1}>
              <Txt typography="labelLgEmphasized" color={colors.textSecondaryLabel}>
                <span id={titleId}>{optionName}</span>
                {option.type === 'YES_NO' && option.yesAdditionalPrice ? (
                  <Txt typography="labelLgEmphasized" color={colors.textBrandLabel}>
                    {` (+${option.yesAdditionalPrice.toLocaleString('ko-KR')}원)`}
                  </Txt>
                ) : null}
              </Txt>
              {option.description && (
                <Txt typography="labelMd" color={colors.textTertiaryLabel}>
                  {option.description}
                </Txt>
              )}
            </Flex>
            {option.type === 'YES_NO' ? (
              <Controller
                control={c.form.control}
                name={name}
                render={({ field }) => (
                  <SelectButton
                    ref={field.ref}
                    aria-labelledby={titleId}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      { value: 'YES', label: '예' },
                      { value: 'NO', label: '아니오' },
                    ]}
                  />
                )}
              />
            ) : (
              <Input
                aria-labelledby={titleId}
                placeholder="답변을 입력해 주세요"
                error={error}
                {...c.form.register(name)}
              />
            )}
            {option.type === 'YES_NO' && error && (
              <Txt typography="labelSm" color={colors.textDangerLabel}>
                <span role="alert">{error}</span>
              </Txt>
            )}
          </Flex>
        );
      })}
    </>
  );
}
