'use client';

import { useId } from 'react';

import { FieldError, FormSection } from '@/features/hosting/shared/ui/EditorParts';
import { NoticeBox } from '@/features/hosting/shared/ui/NoticeBox';
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

/** 디자인 없음(Q42 ④) — 기존 FormSection + NoticeBox + DS Checkbox로만 */
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
      <FormSection title={REFUND_OBLIGATION_TITLE} required>
        <div id={bodyId}>
          <NoticeBox icon="important">{REFUND_OBLIGATION_BODY}</NoticeBox>
        </div>
        <Checkbox
          checked={agreed}
          onCheckedChange={onAgreedChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${bodyId} ${errorId}` : bodyId}
          label={<Txt typography="labelMd">{REFUND_OBLIGATION_LABEL}</Txt>}
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
