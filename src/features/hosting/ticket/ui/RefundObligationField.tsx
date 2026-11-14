'use client';

import { useId } from 'react';

import { FieldError, FormSection } from '@/features/hosting/shared/ui/EditorParts';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './TicketFormSections.css';

// 환불 의무 동의(legal-copy C-1, 약관 제29조⑨)

/** C-1 원문 — 빼거나 바꾸지 않는다(바꾸면 `AGREEMENT_VERSION`을 올린다) */
const REFUND_OBLIGATION_TITLE = '환불 의무 안내';
const REFUND_OBLIGATION_BODY =
  '두둥티켓 대금은 호스트 계좌로 직접 받으며 두둥은 대금과 수수료를 받지 않습니다. 구매자가 공연 시작 전에 취소하거나, 호스트가 주문을 거절·취소하거나, 공연이 취소되면 호스트는 구매자에게 지체 없이 환불해야 합니다. 환불 의무를 지키지 않으면 두둥티켓 판매가 제한될 수 있습니다.';
const REFUND_OBLIGATION_LABEL = '위 내용을 확인했고 환불 의무를 지키는 데 동의합니다';
export const REFUND_OBLIGATION_ERROR = '환불 의무에 동의해 주세요';

/**
 * 환불 의무 동의 — GUI 모바일 `767:46560`(체크 전) · `1413:10171`(체크 뒤) · PC `821:25116` · `821:25649`(#235~#238, Q42 ④ 답).
 * 제목 `Heading/md2-emphasized`(별표 없음) → 안내 상자 → DS Checkbox(square) + 14/400 문구, 사이 16 · 위 16.
 * 문구는 Figma도 C-1 원문과 같다(2026-11-14 확인)
 */
export function RefundObligationField({
  agreed,
  onAgreedChange,
  disabled,
  error,
}: {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  disabled: boolean;
  error: string | undefined;
}) {
  const bodyId = useId();
  const errorId = useId();
  return (
    <div className={s.agreement} data-testid="refund-obligation">
      <FormSection title={REFUND_OBLIGATION_TITLE} loose>
        {/* FIGMA-CUSTOM: 환불 의무 안내 상자(gui 1413:10166 "안내 상자" 342×152 r12 · 패딩 16 · Yellow/50, 아이콘 없음) — Figma가 직접 그린 대로(R1 2026-11-07). NoticeBox(패딩 8 · r8 · 아이콘)와 모양이 달라 따로 둔다 → 커스텀 TicketFormSections.css.ts. DS 후보(design-system §3) */}
        <div id={bodyId} className={s.refundNotice}>
          <Txt as="p" typography="bodyMd">
            {REFUND_OBLIGATION_BODY}
          </Txt>
        </div>
        <Checkbox
          shape="square"
          checked={agreed}
          onCheckedChange={onAgreedChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${bodyId} ${errorId}` : bodyId}
          label={<Txt typography="bodyMd">{REFUND_OBLIGATION_LABEL}</Txt>}
        />
        {error && (
          <div id={errorId}>
            <FieldError>{error}</FieldError>
          </div>
        )}
      </FormSection>
    </div>
  );
}
