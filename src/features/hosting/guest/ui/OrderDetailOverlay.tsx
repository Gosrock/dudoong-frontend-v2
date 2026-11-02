'use client';

import { type ReactNode, useState } from 'react';

import { type HostOrderDetail, REFUSE_REASON_TEXT_MAX } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { copyText } from '@/utils/copy-text';
import { formatSignedWon, formatWon } from '@/utils/money';

import {
  CANCEL_REASON_OPTIONS,
  isDudoongOrder,
  ORDER_ACTION_BLOCK_MESSAGE,
  REFUND_NO_ACCOUNT_MESSAGE,
  refundConfirmCopy,
  refundRowStateOf,
  REFUSE_DEPOSIT_UNCONFIRMED_NOTE,
  REFUSE_DEPOSIT_UNCONFIRMED_SKIPS_REFUND,
  REFUSE_REASON_OPTIONS,
} from '../model/guest-rules';
import type { useOrderDetail } from '../model/useOrderDetail';
import {
  dateText,
  dateTimeText,
  entranceChipOf,
  NOT_ISSUED_CHIP,
  orderStatusChipOf,
  REFUND_STATE_CHIP,
  text,
} from './guest-labels';
import * as s from './OrderDetailOverlay.css';
import { ReasonFields } from './ReasonFields';

type Detail = ReturnType<typeof useOrderDetail>;
type Step = 'detail' | 'refuse' | 'cancel';

/**
 * 주문 상세(`?order=` — 페이지가 선언적으로 연다, patterns §6). 모바일 시트 · PC 모달(`ResponsiveOverlay`).
 * GUI(2026-11-01 Ready): 승인 대기 `1029:6719` · 승인 완료 `1029:7309` · 취소 불가 `1029:7706` · 거절 사유 `1029:6920` ·
 * 승인 거절(환불 요청 `1029:7907` · 계좌 입력 전 `1029:8117` · 입금 미확인 `1029:8322`) · 주문 취소 사유 `1029:7509` ·
 * 주문 취소 환불 요청 `1029:8522` · 환불 완료 `1029:8733`, 모바일 `994:1119` 등(시트).
 * 거절 사유·승인 후 취소 사유는 **같은 오버레이 안의 단계**(GUI도 ‹ 뒤로 + ✕) — 뒤로가기 항목이 하나로 남는다.
 */
// FIGMA-CUSTOM: 주문 상세 모달(gui 1029:6888 "모달_주문 상세" — 흰 바탕 · 안쪽 24) 커스텀 → DS ResponsiveOverlay(Modal · BottomSheet). Figma 코멘트 2026-11-03
export function OrderDetailOverlay({ d, onClose }: { d: Detail; onClose: () => void }) {
  const [step, setStep] = useState<Step>('detail');
  const o = d.detail;

  const back = () => {
    d.dismissActionError();
    setStep('detail');
  };
  const afterAction = (ok: boolean, message: string) => {
    if (!ok) return;
    toast(message);
    setStep('detail');
  };

  const title =
    step === 'refuse' ? (
      <StepTitle onBack={back}>거절 사유를 선택해 주세요.</StepTitle>
    ) : step === 'cancel' ? (
      <StepTitle onBack={back}>주문 취소 사유를 선택해 주세요.</StepTitle>
    ) : (
      <DetailTitle o={o} canSeeRefundAccount={d.canSeeRefundAccount} />
    );

  return (
    <ResponsiveOverlay
      open={d.open}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={step === 'detail' && o?.order.orderNo ? o.order.orderNo : undefined}
      closeOnBack={false}
      footer={
        o ? (
          <Footer d={d} step={step} setStep={setStep} back={back} after={afterAction} />
        ) : undefined
      }
    >
      <div data-testid="order-detail" className={s.body}>
        {d.status === 'pending' && (
          <Txt typography="bodyMd" color={colors.textSecondary}>
            불러오는 중
          </Txt>
        )}
        {d.status === 'error' && (
          <InlineError message="주문을 불러오지 못했어요." onRetry={d.retry} />
        )}
        {o && step === 'detail' && <OrderInfo d={d} o={o} />}
        {o && step === 'refuse' && <RefuseStep d={d} />}
        {o && step === 'cancel' && <CancelStep d={d} />}
        {d.actionError && (
          <p role="alert" className={s.alert}>
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {d.actionError}
            </Txt>
          </p>
        )}
      </div>
    </ResponsiveOverlay>
  );
}

/** 제목 행 — 주문자 이름(`Heading/md2 - emphasized`) + 상태 칩(+ 환불 칩) */
function DetailTitle({
  o,
  canSeeRefundAccount,
}: {
  o: HostOrderDetail | null;
  canSeeRefundAccount: boolean;
}) {
  if (!o) return <>주문 상세</>;
  const chip = orderStatusChipOf(o.order.status);
  const refund = refundRowStateOf(
    { refundStatus: o.order.refundStatus, refundAccount: o.refundAccount },
    canSeeRefundAccount,
  );
  // GUI 제목 칩은 환불 요청(보라) · 환불 완료(초록)만 — 계좌 입력 전도 칩은 '환불 요청'(`1029:8117`)
  const refundChip = refund
    ? REFUND_STATE_CHIP[refund === 'NO_ACCOUNT' ? 'REQUESTED' : refund]
    : null;
  return (
    <span className={s.titleRow}>
      <span>{text(o.order.buyerName)}</span>
      <Chip shape="round" color={chip.color} theme={chip.theme}>
        <span data-testid="detail-status">{chip.label}</span>
      </Chip>
      {refundChip && (
        <Chip shape="round" color={refundChip.color} theme={refundChip.theme}>
          <span data-testid="detail-refund-status">{refundChip.label}</span>
        </Chip>
      )}
    </span>
  );
}

/** 사유 단계 제목 — ‹ 뒤로 + 문구(GUI `1029:6920` "거절 사유를 선택해 주세요.") */
function StepTitle({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <span className={s.titleRow}>
      <button
        type="button"
        className={s.backButton}
        aria-label="주문 상세로 돌아가기"
        onClick={onBack}
      >
        <Icon name="chevron-left" />
      </button>
      <span>{children}</span>
    </span>
  );
}

// FIGMA-CUSTOM: 정보 줄(gui 1029:6899 "정보 줄" 로컬 컴포넌트 — 라벨 80 + 값) 커스텀 → 커스텀 OrderDetailOverlay.css.ts. DS 후보(design-system §3)
/** 라벨 + 값 한 줄(GUI 로컬 `정보 줄` — 형태=가로, 간격 12, `Body/md`) */
export function Line({
  label,
  children,
  end,
}: {
  label: string;
  children: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className={s.line}>
      <dt className={s.lineLabel}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {label}
        </Txt>
      </dt>
      <dd className={s.lineValue}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {children}
        </Txt>
        {end}
      </dd>
    </div>
  );
}

/** 섹션(제목 `Heading/sm - emphasized` + 줄들, 간격 8) */
export function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section aria-label={title} className={s.section} data-testid={testId}>
      <Txt as="h3" typography="headingSmEmphasized" className={s.sectionTitle}>
        {title}
      </Txt>
      {children}
    </section>
  );
}

function OrderInfo({ d, o }: { d: Detail; o: HostOrderDetail }) {
  const refundAccount = d.canSeeRefundAccount ? o.refundAccount : null;
  const showRefund = d.canSeeRefundAccount && o.order.refundStatus !== 'NONE';
  const dudoong = isDudoongOrder(o.order);
  const issued = o.issuedTickets.length > 0;
  return (
    <>
      <Section title="주문 정보">
        <dl className={s.lines}>
          <Line label="주문 일시">{dateTimeText(o.order.orderedAt)}</Line>
          <Line label="결제 금액">{formatWon(o.order.totalAmount)}</Line>
          {o.order.refuseReason && <Line label="거절 사유">{o.order.refuseReason}</Line>}
          {o.order.cancelReason && <Line label="취소 사유">{o.order.cancelReason}</Line>}
        </dl>
      </Section>
      <Section title="주문자">
        <dl className={s.lines}>
          <Line label="이름">{text(o.order.buyerName)}</Line>
          <Line label="연락처">
            <span data-testid="detail-phone">{text(o.order.buyerPhone)}</span>
          </Line>
          <Line label="이메일">
            <span data-testid="detail-email">{text(o.buyerEmail)}</span>
          </Line>
          {o.order.depositorName && <Line label="입금자명">{o.order.depositorName}</Line>}
        </dl>
      </Section>
      {issued ? (
        <Section title="발급 티켓">
          <ul className={s.cards}>
            {o.issuedTickets.map((t, i) => {
              const chip = entranceChipOf(t.entrance, 'border');
              return (
                <TicketCard
                  key={t.ticketUuid ?? t.issuedTicketNo ?? i}
                  name={text(t.ticketName)}
                  dudoong={dudoong}
                  end={
                    <Chip shape="round" color={chip.color} theme={chip.theme}>
                      {chip.label}
                    </Chip>
                  }
                  answers={t.optionAnswers}
                />
              );
            })}
          </ul>
        </Section>
      ) : (
        <Section title="주문한 티켓">
          <ul className={s.cards}>
            {o.lines.map((line, i) => (
              <TicketCard
                key={i}
                name={`${text(line.ticketName)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}`}
                dudoong={dudoong}
                end={
                  <Chip shape="round" color={NOT_ISSUED_CHIP.color} theme={NOT_ISSUED_CHIP.theme}>
                    {NOT_ISSUED_CHIP.label}
                  </Chip>
                }
                answers={line.optionAnswers}
              />
            ))}
          </ul>
        </Section>
      )}
      {showRefund && (
        <Section title="환불 정보" testId="refund-account">
          {refundAccount ? (
            <dl className={s.lines}>
              <Line label="은행">{refundAccount.bankName}</Line>
              <Line
                label="계좌번호"
                end={
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="계좌번호 복사"
                    onClick={async () => {
                      if (await copyText(refundAccount.accountNumber))
                        toast('계좌번호를 복사했어요');
                    }}
                  >
                    복사
                  </Button>
                }
              >
                {refundAccount.accountNumber}
              </Line>
              <Line label="예금주">{refundAccount.accountHolder}</Line>
              <Line label="수정일">
                <span data-testid="refund-account-updated">
                  {dateText(refundAccount.updatedAt)}
                </span>
              </Line>
              {o.order.refundStatus === 'COMPLETED' && (
                <Line label="환불 완료일">
                  <span data-testid="refund-completed-at">{dateText(o.refundStatusChangedAt)}</span>
                </Line>
              )}
            </dl>
          ) : (
            <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.plain}>
              <span data-testid="refund-no-account">{REFUND_NO_ACCOUNT_MESSAGE}</span>
            </Txt>
          )}
        </Section>
      )}
    </>
  );
}

// FIGMA-CUSTOM: 티켓 카드(gui 1029:6909 "티켓 1" — 테두리 상자 · 모서리 8 · 안쪽 12) 커스텀 → 커스텀 OrderDetailOverlay.css.ts. DS 후보(design-system §3)
/** 티켓 카드 — 이름 + 종류 칩 · 오른쪽 상태 칩, 아래 옵션 응답 */
function TicketCard({
  name,
  dudoong,
  end,
  answers,
}: {
  name: string;
  dudoong: boolean;
  end: ReactNode;
  answers: HostOrderDetail['lines'][number]['optionAnswers'];
}) {
  return (
    <li className={s.card}>
      <div className={s.cardHead}>
        <Txt typography="bodyMd" color={colors.textPrimaryLabel}>
          {name}
        </Txt>
        {dudoong && (
          <Chip shape="round" color="violet" theme="weak">
            두둥 티켓
          </Chip>
        )}
        <span className={s.cardEnd}>{end}</span>
      </div>
      <OptionAnswers answers={answers} />
    </li>
  );
}

/** 옵션 응답 — "옵션 1. 질문" + 응답(GUI 로컬 `옵션 1` — 간격 2, `Body/md`) */
export function OptionAnswers({
  answers,
}: {
  answers: HostOrderDetail['lines'][number]['optionAnswers'];
}) {
  if (answers.length === 0) return null;
  return (
    <dl className={s.answers}>
      {answers.map((a, i) => (
        <div key={i} className={s.answer}>
          <Txt as="dt" typography="bodyMd" color={colors.textPrimaryLabel}>
            옵션 {i + 1}. {text(a.optionName)}
          </Txt>
          <Txt as="dd" typography="bodyMd" color={colors.textPrimaryLabel} className={s.plain}>
            {text(a.answer)}
            {a.additionalPrice > 0 ? ` (${formatSignedWon(a.additionalPrice)})` : ''}
          </Txt>
        </div>
      ))}
    </dl>
  );
}

/** 거절 사유(GUI `1029:6920` · `1029:7114`) + 약관 안내 C-3(두둥 — 제29조③, 문구 그대로) */
function RefuseStep({ d }: { d: Detail }) {
  const f = d.refuseForm;
  return (
    <div className={s.section}>
      <ReasonFields
        label="거절 사유"
        options={REFUSE_REASON_OPTIONS}
        value={f.reasonType}
        onValueChange={f.setReasonType}
        text={f.reasonText}
        onTextChange={f.setReasonText}
        textMax={REFUSE_REASON_TEXT_MAX}
        textLabel="기타 사유"
        textError={f.errors.reasonText}
        typeError={f.errors.reasonType}
      />
      {REFUSE_DEPOSIT_UNCONFIRMED_SKIPS_REFUND && f.reasonType === 'DEPOSIT_UNCONFIRMED' && (
        <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.centerNote}>
          {REFUSE_DEPOSIT_UNCONFIRMED_NOTE}
        </Txt>
      )}
      {d.refuseConfirm.dudoongNotice && (
        <NoticeBox icon="important">
          <span data-testid="refuse-dudoong-notice">{d.refuseConfirm.dudoongNotice}</span>
        </NoticeBox>
      )}
    </div>
  );
}

/**
 * 승인 후 취소 사유(GUI `1029:7509` — 라디오 4개 + 노란 안내). 안내 문구는 GUI "취소한 주문은 예매자에게 바로 환불해 주세요." 대신
 * 약관 근거 C-4(제29조③ — legal-copy, 바꾸지 않는다)를 두둥 주문에만 둔다
 */
function CancelStep({ d }: { d: Detail }) {
  return (
    <div className={s.section}>
      <ReasonFields
        label="취소 사유"
        options={CANCEL_REASON_OPTIONS}
        value={d.cancelReasonType}
        onValueChange={d.setCancelReasonType}
        text={d.cancelReason}
        onTextChange={d.setCancelReason}
        textMax={d.cancelReasonMax}
        textLabel="기타 취소 사유"
        textError={d.cancelReasonError ?? undefined}
      />
      {d.cancelConfirm.dudoongNotice && (
        <NoticeBox icon="important">
          <span data-testid="cancel-dudoong-notice">{d.cancelConfirm.dudoongNotice}</span>
        </NoticeBox>
      )}
    </div>
  );
}

function Footer({
  d,
  step,
  setStep,
  back,
  after,
}: {
  d: Detail;
  step: Step;
  setStep: (s: Step) => void;
  back: () => void;
  after: (ok: boolean, message: string) => void;
}) {
  const busy = d.pending !== null;
  const has = (key: string) => d.actions.find((a) => a.key === key);
  if (step === 'refuse') {
    return (
      <div className={s.footer}>
        <Button variant="secondary" size="lg" fullWidth onClick={back}>
          돌아가기
        </Button>
        <Button
          size="lg"
          fullWidth
          loading={d.pending === 'refuse'}
          disabled={busy || d.refuseForm.reasonType === null}
          onClick={async () => after(await d.refuse(), '주문을 거절했어요.')}
        >
          거절
        </Button>
      </div>
    );
  }
  if (step === 'cancel') {
    return (
      <div className={s.footer}>
        <Button variant="secondary" size="lg" fullWidth onClick={back}>
          돌아가기
        </Button>
        <Button
          size="lg"
          fullWidth
          loading={d.pending === 'cancel'}
          disabled={busy || d.cancelReasonType === null || d.cancelReasonError !== null}
          onClick={async () => after(await d.cancel(), '주문을 취소했어요.')}
        >
          주문 취소
        </Button>
      </div>
    );
  }
  const approve = has('approve');
  const refuse = has('refuse');
  const cancel = has('cancel');
  const refund = has('completeRefund');
  if (!approve && !refuse && !cancel && !refund) return null;
  // 계좌 없음은 "환불 정보" 칸이 이미 말한다(GUI `1029:8117`) — 버튼 위 안내는 그 밖의 이유만
  const blockedBy = d.actions.find((a) => a.blockedBy && a.blockedBy !== 'noAccount')?.blockedBy;
  return (
    <div className={s.footerStack}>
      {blockedBy && (
        <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.centerNote}>
          <span data-testid="blocked">{ORDER_ACTION_BLOCK_MESSAGE[blockedBy]}</span>
        </Txt>
      )}
      <div className={s.footer} role="group" aria-label="주문 처리">
        {refuse && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!refuse.enabled || busy}
            onClick={() => setStep('refuse')}
          >
            거절
          </Button>
        )}
        {approve && (
          <Button
            size="lg"
            fullWidth
            loading={d.pending === 'approve'}
            disabled={!approve.enabled || busy}
            onClick={async () => after(await d.approve(), '주문을 승인했어요.')}
          >
            승인
          </Button>
        )}
        {cancel && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!cancel.enabled || busy}
            onClick={() => setStep('cancel')}
          >
            주문 취소
          </Button>
        )}
        {refund && (
          <Button
            size="lg"
            fullWidth
            loading={d.pending === 'completeRefund'}
            disabled={!refund.enabled || busy}
            onClick={async () => {
              // 되돌릴 수 없는 처리 — 확인 팝업(#106 §5, GUI에 없음 — 🤖 유지). 계좌가 없으면 버튼이 비활성(GUI `1029:8117`)
              const ok = await openConfirm({
                ...refundConfirmCopy({
                  buyerName: d.detail?.order.buyerName ?? null,
                  hasAccount: true,
                }),
                onConfirm: () => d.completeRefund(),
              });
              after(ok, '환불 완료로 표시했어요.');
            }}
          >
            환불 완료
          </Button>
        )}
      </div>
    </div>
  );
}
