'use client';

import { useState } from 'react';

import type { HostOrderDetail } from '@/api/order/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Chip } from '@/ui/components/Chip/Chip';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { toast } from '@/ui/components/Toast/Toast';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { REFUSE_REASON_OPTIONS, type RefuseReasonKey } from '../model/guest-rules';
import type { useOrderDetail } from '../model/useOrderDetail';
import {
  dateTimeText,
  entranceTextOf,
  orderStatusChipOf,
  REFUND_STATUS_LABEL,
  text,
  won,
} from './guest-labels';
import * as s from './OrderDetailOverlay.css';

type Detail = ReturnType<typeof useOrderDetail>;
type Step = 'detail' | 'refuse' | 'cancel';

/**
 * 주문 상세(`?order=` — 페이지가 선언적으로 연다, patterns §6). 모바일 시트 · PC 모달(`ResponsiveOverlay`).
 * 와이어 `503:27255`(티켓별 옵션 응답) + 계획의 주문자·환불 계좌(`updatedAt`)·처리 버튼. 제목은 주문자 이름(와이어 코멘트 Nemin 10-03).
 * 거절 사유(와이어 `108:4850`·`108:5023`)와 승인 후 취소는 **같은 오버레이 안의 단계**로 바꿔 그린다 — 오버레이를 겹치지 않아
 * 뒤로가기 항목이 하나로 남는다(Claude 판단). 뒤로가기는 URL 훅이 맡는다(`closeOnBack={false}`).
 */
export function OrderDetailOverlay({ d, onClose }: { d: Detail; onClose: () => void }) {
  const [step, setStep] = useState<Step>('detail');
  const o = d.detail;
  const title =
    step === 'refuse'
      ? '거절 사유를 선택해 주세요'
      : step === 'cancel'
        ? '주문을 취소할까요?'
        : (o?.order.buyerName ?? '주문 상세');

  const back = () => {
    d.dismissActionError();
    setStep('detail');
  };
  const afterAction = (ok: boolean, message: string) => {
    if (!ok) return;
    toast(message);
    setStep('detail');
  };

  return (
    <ResponsiveOverlay
      open={d.open}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={
        step === 'detail' && o?.order.orderNo ? `주문 번호 ${o.order.orderNo}` : undefined
      }
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
          <div role="alert">
            <Flex align="center" gap={2} wrap>
              <Txt typography="bodyMd">주문을 불러오지 못했어요.</Txt>
              <Button variant="secondary" size="sm" onClick={d.retry}>
                다시 시도
              </Button>
            </Flex>
          </div>
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

/** InfoRow 값 글자(문자열 값과 같은 모양) + 테스트 표시 */
export function V({ testId, children }: { testId: string; children: string }) {
  return (
    <Txt typography="labelMd" color={colors.textSecondary}>
      <span data-testid={testId}>{children}</span>
    </Txt>
  );
}

function OrderInfo({ d, o }: { d: Detail; o: HostOrderDetail }) {
  const chip = orderStatusChipOf(o.order.status);
  const refund = REFUND_STATUS_LABEL[o.order.refundStatus];
  return (
    <>
      <section aria-label="주문 정보" className={s.section}>
        <InfoRow
          className={s.infoRow}
          label="상태"
          value={
            <Flex gap={1} align="center" wrap>
              <Chip color={chip.color} theme={chip.theme}>
                <span data-testid="detail-status">{chip.label}</span>
              </Chip>
              {refund && (
                <Chip color="red" theme="border">
                  <span data-testid="detail-refund-status">{refund}</span>
                </Chip>
              )}
            </Flex>
          }
        />
        <InfoRow className={s.infoRow} label="주문 일시" value={dateTimeText(o.order.orderedAt)} />
        {o.approvedAt && (
          <InfoRow className={s.infoRow} label="승인 일시" value={dateTimeText(o.approvedAt)} />
        )}
        {o.withdrawnAt && (
          <InfoRow
            className={s.infoRow}
            label="거절·취소 일시"
            value={dateTimeText(o.withdrawnAt)}
          />
        )}
        {o.order.refuseReason && (
          <InfoRow className={s.infoRow} label="거절 사유" value={o.order.refuseReason} />
        )}
        {o.order.cancelReason && (
          <InfoRow className={s.infoRow} label="취소 사유" value={o.order.cancelReason} />
        )}
        <InfoRow className={s.infoRow} label="결제 금액" value={won(o.order.totalAmount)} />
      </section>
      <Divider />
      <section aria-label="주문자" className={s.section}>
        <InfoRow className={s.infoRow} label="주문자" value={text(o.order.buyerName)} />
        <InfoRow
          className={s.infoRow}
          label="연락처"
          value={<V testId="detail-phone">{text(o.order.buyerPhone)}</V>}
        />
        <InfoRow
          className={s.infoRow}
          label="이메일"
          value={<V testId="detail-email">{text(o.buyerEmail)}</V>}
        />
        {o.order.depositorName && (
          <InfoRow className={s.infoRow} label="입금자명" value={o.order.depositorName} />
        )}
      </section>
      {d.canSeeRefundAccount && o.refundAccount && (
        <>
          <Divider />
          <section aria-label="환불 계좌" className={s.section} data-testid="refund-account">
            <InfoRow
              className={s.infoRow}
              label="환불 계좌"
              value={`${o.refundAccount.bankName} ${o.refundAccount.accountHolder}`}
            />
            <InfoRow
              className={s.infoRow}
              label="계좌번호"
              account={{ number: o.refundAccount.accountNumber }}
            />
            <InfoRow
              className={s.infoRow}
              label="계좌 수정일"
              value={
                <V testId="refund-account-updated">{dateTimeText(o.refundAccount.updatedAt)}</V>
              }
            />
          </section>
        </>
      )}
      <Divider />
      <section aria-label="주문한 티켓" className={s.section}>
        <Txt as="h3" typography="labelMdEmphasized">
          주문한 티켓
        </Txt>
        <ul className={s.lines}>
          {o.lines.map((line, i) => (
            <li key={i} className={s.line}>
              <Flex justify="space-between" gap={2}>
                <Txt typography="labelMd">
                  {text(line.ticketName)} × {line.quantity}
                </Txt>
                <Txt typography="labelMd">{won(line.linePrice)}</Txt>
              </Flex>
              <OptionAnswers answers={line.optionAnswers} />
            </li>
          ))}
        </ul>
      </section>
      {o.issuedTickets.length > 0 && (
        <>
          <Divider />
          <section aria-label="발급 티켓" className={s.section}>
            <Txt as="h3" typography="labelMdEmphasized">
              발급 티켓
            </Txt>
            <ul className={s.lines}>
              {o.issuedTickets.map((t) => (
                <li key={t.ticketUuid ?? t.issuedTicketNo} className={s.line}>
                  <Flex justify="space-between" gap={2}>
                    <Txt typography="labelMd">티켓 번호 - {text(t.issuedTicketNo)}</Txt>
                    <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                      {entranceTextOf(t.entrance, t.enteredAt)}
                    </Txt>
                  </Flex>
                  <OptionAnswers answers={t.optionAnswers} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {d.blockedMessage && (
        <p data-testid="blocked" className={s.alert}>
          <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
            {d.blockedMessage}
          </Txt>
        </p>
      )}
    </>
  );
}

/** 옵션 응답 — 와이어는 입력칸·예/아니오 버튼 모양이지만 읽기 전용이라 "옵션 이름 : 응답" 줄로(Claude 판단) */
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
          <Txt as="dt" typography="bodySm" color={colors.textSecondaryLabel}>
            옵션 {i + 1}. {text(a.optionName)}
            {a.additionalPrice > 0 ? ` (+${a.additionalPrice.toLocaleString('ko-KR')}원)` : ''}
          </Txt>
          <Txt as="dd" typography="bodyMd" style={{ margin: 0 }}>
            {text(a.answer)}
          </Txt>
        </div>
      ))}
    </dl>
  );
}

/** 거절 사유 — 와이어 `108:4850`(라디오 4개) · `108:5023`(기타 - 직접 입력, 최대 20자) + 약관 근거 안내(C-2·C-3) */
function RefuseStep({ d }: { d: Detail }) {
  const f = d.refuseForm;
  return (
    <div className={s.section}>
      <RadioGroup
        aria-label="거절 사유"
        className={s.reasons}
        value={f.reasonType ?? ''}
        onValueChange={(v) => f.setReasonType(v as RefuseReasonKey)}
      >
        {REFUSE_REASON_OPTIONS.map((r) => (
          <Radio key={r.key} value={r.key} label={r.key === 'ETC' ? '기타 - 직접 입력' : r.label} />
        ))}
      </RadioGroup>
      {f.reasonType === 'ETC' && (
        <Input
          aria-label="기타 사유"
          placeholder="최대 20자 입력 가능"
          maxLength={20}
          value={f.reasonText}
          onChange={(e) => f.setReasonText(e.target.value)}
          error={f.errors.reasonText}
        />
      )}
      {f.errors.reasonType && (
        <Txt as="p" typography="bodySm" color={colors.textDangerLabel}>
          {f.errors.reasonType}
        </Txt>
      )}
      <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
        {d.refuseConfirm.body}
      </Txt>
      {d.refuseConfirm.dudoongNotice && (
        <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
          <span data-testid="refuse-dudoong-notice">{d.refuseConfirm.dudoongNotice}</span>
        </Txt>
      )}
    </div>
  );
}

/** 승인 후 취소 — 사유(선택, 100자) + 확인 문구(두둥이면 C-4 줄). 디자인 없음 */
function CancelStep({ d }: { d: Detail }) {
  return (
    <div className={s.section}>
      <Input
        label="취소 사유(선택)"
        placeholder={`최대 ${d.cancelReasonMax}자`}
        value={d.cancelReason}
        onChange={(e) => d.setCancelReason(e.target.value)}
        error={d.cancelReasonError ?? undefined}
      />
      <Txt as="p" typography="bodyMd" color={colors.textSecondaryLabel}>
        {d.cancelConfirm.body}
      </Txt>
      {d.cancelConfirm.dudoongNotice && (
        <Txt as="p" typography="bodyMd" color={colors.textDangerLabel}>
          <span data-testid="cancel-dudoong-notice">{d.cancelConfirm.dudoongNotice}</span>
        </Txt>
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
          취소
        </Button>
        <Button
          size="lg"
          fullWidth
          loading={d.pending === 'refuse'}
          disabled={busy || d.refuseForm.reasonType === null}
          onClick={async () => after(await d.refuse(), '주문을 거절했어요')}
        >
          거절하기
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
          disabled={busy || d.cancelReasonError !== null}
          onClick={async () => after(await d.cancel(), '주문을 취소했어요')}
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
  return (
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
          onClick={async () => after(await d.approve(), '주문을 승인했어요')}
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
          disabled={busy}
          onClick={async () => after(await d.completeRefund(), '환불 완료로 바꿨어요')}
        >
          환불 완료
        </Button>
      )}
    </div>
  );
}
