'use client';

import { REFUSE_REASON_TEXT_MAX } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  CANCEL_REASON_OPTIONS,
  REFUSE_DEPOSIT_UNCONFIRMED_NOTE,
  REFUSE_REASON_OPTIONS,
  type RefuseReasonKey,
  showsDepositUnconfirmedNote,
} from '../model/guest-rules';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './OrderDetailOverlay.css';
import { ReasonFields } from './ReasonFields';

/**
 * 입금 미확인 거절 안내(GUI `1029:7114` — 사유 아래 가운데 한 줄). 그 사유를 고르면 꼭 보인다 — 환불 요청이 생기지 않고 되돌릴 수 없다
 * (백엔드 #929 B35). 주문 상세 거절 단계 · 표에서 거절(`RefuseOverlay`)이 같이 쓴다
 */
export function DepositUnconfirmedNote({ reasonType }: { reasonType: RefuseReasonKey | null }) {
  if (!showsDepositUnconfirmedNote(reasonType)) return null;
  return (
    <Txt as="p" typography="bodyMd" color={colors.textPrimaryLabel} className={s.centerNote}>
      <span data-testid="refuse-deposit-note">{REFUSE_DEPOSIT_UNCONFIRMED_NOTE}</span>
    </Txt>
  );
}

/** 거절 사유(GUI `1029:6920` · `1029:7114`) + 약관 안내 C-3(두둥 — 제29조③, 문구 그대로) */
export function RefuseStep({ state }: { state: OrderDetailState }) {
  const form = state.refuseForm;
  return (
    <Flex direction="column" gap={2}>
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
      <DepositUnconfirmedNote reasonType={form.reasonType} />
      {state.refuseConfirm.dudoongNotice && (
        <NoticeBox icon="important">
          <span data-testid="refuse-dudoong-notice">{state.refuseConfirm.dudoongNotice}</span>
        </NoticeBox>
      )}
    </Flex>
  );
}

/**
 * 승인 후 취소 사유(GUI `1029:7509` — 라디오 4개 + 노란 안내). 안내 문구는 GUI "취소한 주문은 예매자에게 바로 환불해 주세요." 대신
 * 약관 근거 C-4(제29조③ — legal-copy, 바꾸지 않는다)를 두둥 주문에만 둔다
 */
export function CancelStep({ state }: { state: OrderDetailState }) {
  const form = state.cancelForm;
  return (
    <Flex direction="column" gap={2}>
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
    </Flex>
  );
}
