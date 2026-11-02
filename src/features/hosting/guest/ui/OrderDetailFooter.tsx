'use client';

import { Button } from '@/ui/components/Button/Button';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { ORDER_ACTION_BLOCK_MESSAGE, refundConfirmCopy } from '../model/guest-rules';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './OrderDetailOverlay.css';

export type OrderDetailStep = 'detail' | 'refuse' | 'cancel';

type After = (ok: boolean, message: string) => void;

/** 오버레이 하단 — 사유 단계는 [돌아가기] + 보내기, 상세 단계는 처리 버튼(승인 · 거절 · 주문 취소 · 환불 완료) */
export function OrderDetailFooter({
  state,
  step,
  setStep,
  back,
  after,
}: {
  state: OrderDetailState;
  step: OrderDetailStep;
  setStep: (step: OrderDetailStep) => void;
  back: () => void;
  after: After;
}) {
  if (step === 'refuse') {
    return (
      <ReasonFooter
        onBack={back}
        label="거절"
        loading={state.pending === 'refuse'}
        disabled={state.pending !== null || state.refuseForm.reasonType === null}
        onSubmit={async () => after(await state.refuse(), '주문을 거절했어요.')}
      />
    );
  }
  if (step === 'cancel') {
    return (
      <ReasonFooter
        onBack={back}
        label="주문 취소"
        loading={state.pending === 'cancel'}
        disabled={
          state.pending !== null ||
          state.cancelForm.reasonType === null ||
          state.cancelForm.error !== null
        }
        onSubmit={async () => after(await state.cancel(), '주문을 취소했어요.')}
      />
    );
  }
  return <ActionFooter state={state} setStep={setStep} after={after} />;
}

function ReasonFooter({
  onBack,
  label,
  loading,
  disabled,
  onSubmit,
}: {
  onBack: () => void;
  label: string;
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className={s.footer}>
      <Button variant="secondary" size="lg" fullWidth onClick={onBack}>
        돌아가기
      </Button>
      <Button size="lg" fullWidth loading={loading} disabled={disabled} onClick={onSubmit}>
        {label}
      </Button>
    </div>
  );
}

function ActionFooter({
  state,
  setStep,
  after,
}: {
  state: OrderDetailState;
  setStep: (step: OrderDetailStep) => void;
  after: After;
}) {
  const busy = state.pending !== null;
  const has = (key: string) => state.actions.find((a) => a.key === key);
  const approve = has('approve');
  const refuse = has('refuse');
  const cancel = has('cancel');
  const refund = has('completeRefund');
  if (!approve && !refuse && !cancel && !refund) return null;
  // 계좌 없음은 "환불 정보" 칸이 이미 말한다(GUI `1029:8117`) — 버튼 위 안내는 그 밖의 이유만
  const blockedBy = state.actions.find(
    (a) => a.blockedBy && a.blockedBy !== 'noAccount',
  )?.blockedBy;
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
            loading={state.pending === 'approve'}
            disabled={!approve.enabled || busy}
            onClick={async () => after(await state.approve(), '주문을 승인했어요.')}
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
            loading={state.pending === 'completeRefund'}
            disabled={!refund.enabled || busy}
            onClick={async () => {
              // 되돌릴 수 없는 처리 — 확인 팝업(#106 §5, GUI에 없음 — 🤖 유지). 계좌가 없으면 버튼이 비활성(GUI `1029:8117`)
              const ok = await openConfirm({
                ...refundConfirmCopy({
                  buyerName: state.detail?.order.buyerName ?? null,
                  hasAccount: true,
                }),
                onConfirm: () => state.completeRefund(),
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
