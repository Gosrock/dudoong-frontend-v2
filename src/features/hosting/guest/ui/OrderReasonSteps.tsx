'use client';

import { REFUSE_REASON_TEXT_MAX } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  CANCEL_REASON_OPTIONS,
  REFUSE_DEPOSIT_UNCONFIRMED_NOTE,
  REFUSE_DEPOSIT_UNCONFIRMED_SKIPS_REFUND,
  REFUSE_REASON_OPTIONS,
} from '../model/guest-rules';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './OrderDetailOverlay.css';
import { ReasonFields } from './ReasonFields';

/** 거절 사유(GUI `1029:6920` · `1029:7114`) + 약관 안내 C-3(두둥 — 제29조③, 문구 그대로) */
export function RefuseStep({ state }: { state: OrderDetailState }) {
  const form = state.refuseForm;
  return (
    <div className={s.section}>
      <ReasonFields
        label="거절 사유"
        options={REFUSE_REASON_OPTIONS}
        value={form.reasonType}
        onValueChange={form.setReasonType}
        text={form.reasonText}
        onTextChange={form.setReasonText}
        textMax={REFUSE_REASON_TEXT_MAX}
        textLabel="기타 사유"
        textError={form.errors.reasonText}
        typeError={form.errors.reasonType}
      />
      {REFUSE_DEPOSIT_UNCONFIRMED_SKIPS_REFUND && form.reasonType === 'DEPOSIT_UNCONFIRMED' && (
        <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.centerNote}>
          {REFUSE_DEPOSIT_UNCONFIRMED_NOTE}
        </Txt>
      )}
      {state.refuseConfirm.dudoongNotice && (
        <NoticeBox icon="important">
          <span data-testid="refuse-dudoong-notice">{state.refuseConfirm.dudoongNotice}</span>
        </NoticeBox>
      )}
    </div>
  );
}

/**
 * 승인 후 취소 사유(GUI `1029:7509` — 라디오 4개 + 노란 안내). 안내 문구는 GUI "취소한 주문은 예매자에게 바로 환불해 주세요." 대신
 * 약관 근거 C-4(제29조③ — legal-copy, 바꾸지 않는다)를 두둥 주문에만 둔다
 */
export function CancelStep({ state }: { state: OrderDetailState }) {
  const form = state.cancelForm;
  return (
    <div className={s.section}>
      <ReasonFields
        label="취소 사유"
        options={CANCEL_REASON_OPTIONS}
        value={form.reasonType}
        onValueChange={form.setReasonType}
        text={form.reasonText}
        onTextChange={form.setReasonText}
        textMax={form.max}
        textLabel="기타 취소 사유"
        textError={form.error ?? undefined}
      />
      {state.cancelConfirm.dudoongNotice && (
        <NoticeBox icon="important">
          <span data-testid="cancel-dudoong-notice">{state.cancelConfirm.dudoongNotice}</span>
        </NoticeBox>
      )}
    </div>
  );
}
