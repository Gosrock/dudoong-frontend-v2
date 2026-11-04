'use client';

import { useState } from 'react';

import { REFUSE_REASON_TEXT_MAX, type RefuseOrderRequest } from '@/api/order/schema';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import {
  REFUSE_CONFIRM,
  REFUSE_REASON_OPTIONS,
  type RefuseForm,
  toRefuseBody,
  validateRefuse,
} from '../model/guest-rules';
import * as s from './OrderBulk.css';
import { DepositUnconfirmedNote } from './OrderReasonSteps';
import { ReasonFields } from './ReasonFields';

// FIGMA-CUSTOM: 일괄 처리 바(gui 1029:5714 "일괄 처리 바" PC 640×62 · 989:910 모바일 하단) 커스텀 → 커스텀 OrderBulk.css.ts. DS 후보(design-system §3)
/**
 * 여러 개 선택 바(GUI `1029:5422` PC 가운데 아래 떠 있는 상자 · `989:693` 모바일 하단 고정) — "n개 선택 됨" + [거절] [승인].
 * PC 버튼은 medium(46), 모바일도 같다(`989:912` 57×46)
 */
export function SelectionBar({
  count,
  pending,
  onRefuse,
  onApprove,
}: {
  count: number;
  pending: 'approve' | 'refuse' | null;
  onRefuse: () => void;
  onApprove: () => void;
}) {
  if (count === 0) return null;
  return (
    <div role="region" aria-label="선택한 주문 처리" className={s.bar} data-testid="selection-bar">
      <Txt typography="bodyMd" color={colors.textPrimaryLabel} className={s.count}>
        {count}개 선택 됨
      </Txt>
      <Button variant="secondary" size="md" disabled={pending !== null} onClick={onRefuse}>
        거절
      </Button>
      <Button
        size="md"
        loading={pending === 'approve'}
        disabled={pending !== null}
        onClick={onApprove}
      >
        승인
      </Button>
    </div>
  );
}

const INITIAL: RefuseForm = { reasonType: null, reasonText: '' };

/**
 * 표에서 바로 거절(행 [거절] · 선택 바 [거절]) — 주문 상세의 거절 단계와 같은 사유 고르기(GUI `1029:6920`).
 * GUI에 여러 건 거절 화면은 없다 — 사유 하나를 고른 주문 모두에 쓴다(🤖 Claude 판단, Figma 코멘트 `1029:5714`).
 * 약관 안내 C-3은 고른 주문 중 두둥 주문이 있으면(`dudoong`)
 */
export function RefuseOverlay({
  open,
  count,
  dudoong,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  /** 거절할 주문 수(1이면 제목에 숫자 없음) */
  count: number;
  dudoong: boolean;
  pending: boolean;
  onClose: () => void;
  /** 보냈으면 true(닫는다) */
  onSubmit: (body: RefuseOrderRequest) => Promise<boolean>;
}) {
  const [form, setForm] = useState<RefuseForm>(INITIAL);
  const [attempted, setAttempted] = useState(false);
  const errors = attempted ? validateRefuse(form) : {};
  const close = () => {
    setForm(INITIAL);
    setAttempted(false);
    onClose();
  };
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(v) => !v && close()}
      title={count > 1 ? `${count}건의 거절 사유를 선택해 주세요.` : '거절 사유를 선택해 주세요.'}
      footer={
        <Flex gap={2} fullWidth>
          <Button variant="secondary" size="lg" fullWidth onClick={close}>
            돌아가기
          </Button>
          <Button
            size="lg"
            fullWidth
            loading={pending}
            disabled={pending || form.reasonType === null}
            onClick={async () => {
              setAttempted(true);
              if (form.reasonType === null || Object.keys(validateRefuse(form)).length > 0) return;
              if (await onSubmit(toRefuseBody({ ...form, reasonType: form.reasonType }))) close();
            }}
          >
            거절
          </Button>
        </Flex>
      }
    >
      <Flex direction="column" gap={2} data-testid="refuse-overlay">
        <ReasonFields
          label="거절 사유"
          options={REFUSE_REASON_OPTIONS}
          value={form.reasonType}
          onValueChange={(reasonType) => setForm((f) => ({ ...f, reasonType }))}
          text={form.reasonText}
          onTextChange={(reasonText) => setForm((f) => ({ ...f, reasonText }))}
          textMax={REFUSE_REASON_TEXT_MAX}
          textLabel="기타 사유"
          textError={errors.reasonText}
        />
        <DepositUnconfirmedNote reasonType={form.reasonType} />
        {dudoong && (
          <NoticeBox icon="important">
            <span data-testid="refuse-dudoong-notice">{REFUSE_CONFIRM.dudoongNotice}</span>
          </NoticeBox>
        )}
      </Flex>
    </ResponsiveOverlay>
  );
}
