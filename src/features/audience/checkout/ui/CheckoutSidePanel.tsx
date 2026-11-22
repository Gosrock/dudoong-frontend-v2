'use client';

import * as Collapsible from '@radix-ui/react-collapsible';
import type { ReactNode } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';

import { refundPolicyItems } from '../model/refund-policy';
import type { CheckoutState } from '../model/useCheckout';
import { HostProvisionCheck } from './CheckoutAgreements';
import { AmountInfo } from './CheckoutPayment';
import * as s from './CheckoutSidePanel.css';
import { RefundPolicyBody } from './RefundPolicy';

/**
 * PC 오른쪽 열(GUI `[WEB] 공연결제` `1999:3012` — Design Sync #363): "최종 결제정보" 패널(금액 + CTA) · "판매정보" 패널.
 * 모바일은 같은 내용이 본문(결제금액 · 판매정보)과 하단 고정 바(동의 + CTA)에 있다.
 */

/**
 * 최종 결제정보 패널(GUI `1999:3013` — 테두리 · 모서리 16 · 안쪽 24 · 사이 24): 제목 + 결제금액 줄들 + [결제하기].
 * FIGMA-CUSTOM: 직접 그린 패널(gui 1999:3013) → Figma대로 커스텀 CheckoutSidePanel.css.ts. 무료(결제 없음)는 금액 없이 CTA만(🤖 GUI 없음)
 */
export function CheckoutAmountPanel({ c, isTransfer }: { c: CheckoutState; isTransfer: boolean }) {
  return (
    <section className={s.amountPanel} aria-labelledby={isTransfer ? 'checkout-final' : undefined}>
      {isTransfer && (
        <div>
          <Txt as="h2" typography="headingMdEmphasized" className={s.panelTitle}>
            <span id="checkout-final">최종 결제정보</span>
          </Txt>
          <AmountInfo c={c} divider={false} />
        </div>
      )}
      <Button type="submit" size="lg" fullWidth disabled={c.submission.pending}>
        {c.ctaLabel}
      </Button>
    </section>
  );
}

/**
 * 판매정보 패널(GUI `1999:3030` — 회색 판 `surface/container` · 모서리 16 · 안쪽 24 · 사이 16, 머리 ⌃로 접힘 — 처음 펼침):
 * 호스트 제공 동의 + 항목 → 선 → 환불/취소 규정 동의 → "환불/취소 규정" + 규정(A-7 · A-5 · 링크).
 * FIGMA-CUSTOM: 직접 그린 패널(gui 1999:3030) → Figma대로 커스텀 CheckoutSidePanel.css.ts
 */
export function CheckoutSaleInfoPanel({
  c,
  eventId,
  eventName,
  eventStartAt,
  agreeField,
}: {
  c: CheckoutState;
  eventId: number;
  eventName: string;
  eventStartAt: string | null;
  /** 환불/취소 규정 동의 칸(폼이 그린다 — 모바일은 하단 바) */
  agreeField: ReactNode;
}) {
  const items = refundPolicyItems(c.ticket.payType);
  return (
    <Collapsible.Root defaultOpen className={s.salePanel} asChild>
      <section aria-labelledby="checkout-sale-info">
        <Collapsible.Trigger className={s.saleHead}>
          <Txt typography="headingMdEmphasized">
            <span id="checkout-sale-info">판매정보</span>
          </Txt>
          <span className={s.chevron} aria-hidden>
            <Icon name="chevron-down" />
          </span>
        </Collapsible.Trigger>
        {/* 접어도 동의 칸은 그려 둔다 — 체크하지 않고 내면 포커스가 가야 한다(forceMount + 숨김) */}
        <Collapsible.Content forceMount className={s.saleBody}>
          {c.agreementFields.hostProvision && (
            <>
              <HostProvisionCheck c={c} eventName={eventName} />
              <hr className={s.rule} />
            </>
          )}
          {agreeField}
          {items && (
            <div className={s.policy}>
              <Txt as="h3" typography="labelMd" className={s.policyTitle}>
                환불/취소 규정
              </Txt>
              <RefundPolicyBody eventId={eventId} startAt={eventStartAt} items={items} />
            </div>
          )}
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
