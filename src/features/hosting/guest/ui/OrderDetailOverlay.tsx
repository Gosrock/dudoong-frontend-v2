'use client';

import { type ReactNode, useState } from 'react';

import type { HostOrderDetail } from '@/api/order/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Chip } from '@/ui/components/Chip/Chip';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { refundRowStateOf } from '../model/guest-rules';
import type { OrderDetailState } from '../model/useOrderDetail';
import { orderStatusChipOf, REFUND_STATE_CHIP, text } from './guest-labels';
import { OrderDetailFooter, type OrderDetailStep } from './OrderDetailFooter';
import * as s from './OrderDetailOverlay.css';
import { OrderInfo } from './OrderInfo';
import { CancelStep, RefuseStep } from './OrderReasonSteps';

/**
 * 주문 상세(`?order=` — 페이지가 선언적으로 연다, patterns §6). 모바일 시트 · PC 모달(`ResponsiveOverlay`).
 * GUI(2026-11-01 Ready): 승인 대기 `1029:6719` · 승인 완료 `1029:7309` · 취소 불가 `1029:7706` · 거절 사유 `1029:6920` ·
 * 승인 거절(환불 요청 `1029:7907` · 계좌 입력 전 `1029:8117` · 입금 미확인 `1029:8322`) · 주문 취소 사유 `1029:7509` ·
 * 주문 취소 환불 요청 `1029:8522` · 환불 완료 `1029:8733`, 모바일 `994:1119` 등(시트).
 * 거절 사유·승인 후 취소 사유는 **같은 오버레이 안의 단계**(GUI도 ‹ 뒤로 + ✕) — 뒤로가기 항목이 하나로 남는다.
 */
// FIGMA-CUSTOM: 주문 상세 모달 · 시트(gui 1029:6888 "모달_주문 상세" · 994:1154 "바텀시트_주문 상세") Figma대로 — ResponsiveOverlay(Modal md 흰 판 · 24,
// 시트 flat 위 모서리 16 · 막대 · ✕), 제목 18 · 설명 Body/md(2026-11-08 fm-ds-overlays O1~O3 · O6~O11 · O13). Figma 코멘트 2026-11-03 · 고침 2026-11-08
export function OrderDetailOverlay({
  state,
  onClose,
}: {
  state: OrderDetailState;
  onClose: () => void;
}) {
  const [step, setStep] = useState<OrderDetailStep>('detail');
  const detail = state.detail;

  const back = () => {
    state.dismissActionError();
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
      <DetailTitle detail={detail} canSeeRefundAccount={state.canSeeRefundAccount} />
    );

  return (
    <ResponsiveOverlay
      open={state.open}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={step === 'detail' && detail?.order.orderNo ? detail.order.orderNo : undefined}
      // 이름 제목 18(`Heading/md2 - emphasized`), 사유 단계 제목 16(`1029:7093`) · 주문 번호 `Body/md` 진한색 · 제목 아래 4
      titleSize={step === 'detail' ? 'md2' : 'sm'}
      descriptionStyle="body"
      sheetVariant="flat"
      closeOnBack={false}
      footer={
        detail ? (
          <OrderDetailFooter
            state={state}
            step={step}
            setStep={setStep}
            back={back}
            after={afterAction}
          />
        ) : undefined
      }
    >
      <Flex direction="column" gap={5} data-testid="order-detail">
        {state.status === 'pending' && (
          <Txt typography="bodyMd" color={colors.textSecondary}>
            불러오는 중
          </Txt>
        )}
        {state.status === 'error' && (
          <InlineError message="주문을 불러오지 못했어요." onRetry={state.retry} />
        )}
        {detail && step === 'detail' && <OrderInfo state={state} detail={detail} />}
        {detail && step === 'refuse' && <RefuseStep state={state} />}
        {detail && step === 'cancel' && <CancelStep state={state} />}
        {state.actionError && (
          <p role="alert" className={s.alert}>
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {state.actionError}
            </Txt>
          </p>
        )}
      </Flex>
    </ResponsiveOverlay>
  );
}

/** 제목 행 — 주문자 이름(`Heading/md2 - emphasized`) + 상태 칩(+ 환불 칩) */
function DetailTitle({
  detail,
  canSeeRefundAccount,
}: {
  detail: HostOrderDetail | null;
  canSeeRefundAccount: boolean;
}) {
  if (!detail) return <>주문 상세</>;
  const chip = orderStatusChipOf(detail.order.status);
  const refund = refundRowStateOf(
    { refundStatus: detail.order.refundStatus, refundAccount: detail.refundAccount },
    canSeeRefundAccount,
  );
  // GUI 제목 칩은 환불 요청(보라) · 환불 완료(초록)만 — 계좌 입력 전도 칩은 '환불 요청'(`1029:8117`)
  const refundChip = refund
    ? REFUND_STATE_CHIP[refund === 'NO_ACCOUNT' ? 'REQUESTED' : refund]
    : null;
  return (
    <span className={s.titleRow}>
      <span>{text(detail.order.buyerName)}</span>
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
