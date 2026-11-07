'use client';

import { useId } from 'react';
import { Controller } from 'react-hook-form';

import type { PaymentChannel } from '@/api/order/schema';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { SelectButton } from '@/ui/components/SelectButton/SelectButton';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatCount } from '@/utils/money';

import { tossTransferLink } from '../model/payment';
import type { CheckoutState } from '../model/useCheckout';
import { textLink } from './checkout.css';
import * as s from './CheckoutPayment.css';
import { AmountRows, DepositAccountRows, DEPOSITOR_NOTICE } from './PaymentBlocks';

// ─── 결제정보 · 결제금액 · 결제방식 · 주문 확인 요약 ─────────────────────────────

/** 결제 방식 버튼 글자 — GUI `564:4156` "토스간편송금"·"계좌이체" */
const CHANNEL_LABEL: Record<'BANK_TRANSFER' | 'TOSS_TRANSFER', string> = {
  TOSS_TRANSFER: '토스간편송금',
  BANK_TRANSFER: '계좌이체',
};

/** 금액 — GUI `564:4156`·`567:9468`(Ready for dev) 글자 그대로 숫자와 "원"을 띄어 쓴다(`18,000 원`). 다른 화면은 `formatWon`(붙여 씀) */
const won = (n: number) => `${formatCount(n)} 원`;

export function PaymentInfo({ c }: { c: CheckoutState }) {
  return (
    <section aria-label="결제정보">
      {/* 안내 값은 굵게(GUI `564:4156` Label/md-emphasized — R1c) */}
      <InfoRow hierarchy="first" label="결제정보" value={DEPOSITOR_NOTICE} valueEmphasized />
      {/* 서비스 운영자 결정(이슈 #106 §4, 2026-11-01) — 닉네임 = 입금자명은 의도. 다르면 닉네임을 바꾸도록 안내 + 마이페이지 링크.
          마이페이지는 새 탭 — 고른 옵션을 잃지 않게. 바꾼 뒤 이 화면을 새로 고치면 새 닉네임이 입금자명이 된다 */}
      <div className={s.depositorHint}>
        <Txt typography="labelSm" color={colors.textSecondaryLabel}>
          닉네임이 실제 입금자명과 다르면 마이페이지에서 닉네임을 바꿔 주세요.{' '}
          <a href="/mypage" target="_blank" rel="noopener noreferrer" className={textLink}>
            마이페이지
          </a>
        </Txt>
      </div>
      <InfoRow label="입금자명" value={c.depositorName ?? '—'} />
      <DepositAccountRows account={c.account} toastId="checkout:copy" />
    </section>
  );
}

function amounts(c: CheckoutState) {
  const ticketAmount = c.ticket.price * c.quantity;
  // 총액은 훅의 `amount`(= 서버 totalAmount 식) 하나 — 옵션 금액은 그 차이로 보인다
  return { ticketAmount, optionAmount: Math.max(0, c.amount - ticketAmount), total: c.amount };
}

const WON_FORMAT = { ticket: won, option: won, total: won };

export function AmountInfo({ c }: { c: CheckoutState }) {
  const { ticketAmount, optionAmount, total } = amounts(c);
  return (
    <AmountRows
      ticketAmount={ticketAmount}
      optionAmount={optionAmount}
      total={total}
      format={WON_FORMAT}
      totalTestId="checkout-amount"
    />
  );
}

export function PaymentChannelField({ c }: { c: CheckoutState }) {
  const titleId = useId();
  // 토스 송금은 링크를 만들 수 있고 은행 코드가 있을 때만(plan P7 L — `bankCode`가 null이면 토스 버튼을 숨긴다, B3).
  // 토스 앱 열기 버튼은 주문을 만든 뒤 완료 화면에 있다(B23)
  const tossAvailable =
    tossTransferLink(c.account, c.amount) !== null && Boolean(c.account?.bankCode);
  const channels: ('TOSS_TRANSFER' | 'BANK_TRANSFER')[] = tossAvailable
    ? ['TOSS_TRANSFER', 'BANK_TRANSFER']
    : ['BANK_TRANSFER'];
  return (
    <section aria-labelledby={titleId}>
      <InfoRow hierarchy="first" label={<span id={titleId}>결제방식</span>} />
      <Flex direction="column" paddingX={5} paddingY={4}>
        <Controller
          control={c.form.control}
          name="paymentChannel"
          render={({ field }) => (
            <SelectButton
              ref={field.ref}
              aria-labelledby={titleId}
              value={field.value}
              onValueChange={(v) => field.onChange(v as PaymentChannel)}
              onBlur={field.onBlur}
              options={channels.map((ch) => ({ value: ch, label: CHANNEL_LABEL[ch] }))}
            />
          )}
        />
      </Flex>
    </section>
  );
}

/**
 * 입금 확인 창 본문 — 흰 카드 둘(R1e — GUI `567:9756`, Ready `567:9468`): 결제정보(입금자명 · 결제방식 · 입금은행 · 결제계좌[복사] · 예금주) ·
 * 결제금액(티켓금액 · 옵션금액 · 선 · 총 결제금액). 카드 = 흰 판 · 테두리 `surface/default-border` · 모서리 12 · 사이 16, 줄은 DS `list`(InfoRow).
 * 입금은행 줄은 유지(U7 — 토스 송금 · 입금에 은행이 필요). A19 · A21(옛 DS `다이얼로그 - 결제 요약` 판)은 이 카드로 흡수.
 */
export function DepositSummary({ c }: { c: CheckoutState }) {
  const { ticketAmount, optionAmount, total } = amounts(c);
  const channel = c.paymentChannel === 'TOSS_TRANSFER' ? 'TOSS_TRANSFER' : 'BANK_TRANSFER';
  return (
    // FIGMA-CUSTOM: 입금 확인 결제 요약(gui 567:9756 "Frame 1707480412" 회색 판 + 흰 카드 둘) Figma대로 — Popup summary + 흰 카드 둘(InfoRow).
    // 옛 DS 다이얼로그 - 결제 요약(772:1195)에서 바꿈(2026-11-08 fm-ds-overlays R1e). Figma 코멘트 2026-11-01 · 고침 2026-11-08
    <div className={s.summaryCards}>
      <section aria-label="결제정보" className={s.summaryCard}>
        <InfoRow
          hierarchy="first"
          label="결제정보"
          value={
            // 카드 안 안내는 12(`567:9756` value 12/600 — 600 프리셋이 없어 `Label/sm` 500)
            <Txt typography="labelSm" color={colors.textBrandLabel}>
              {DEPOSITOR_NOTICE}
            </Txt>
          }
        />
        <InfoRow label="입금자명" value={c.depositorName ?? '—'} />
        <InfoRow label="결제방식" value={CHANNEL_LABEL[channel]} />
        <DepositAccountRows account={c.account} toastId="checkout:copy" />
      </section>
      <section aria-label="결제금액" className={s.summaryCard}>
        <InfoRow hierarchy="first" label="결제금액" />
        <InfoRow label="티켓금액" value={won(ticketAmount)} />
        <InfoRow label="옵션금액" value={won(optionAmount)} />
        <Divider />
        <InfoRow total label="총 결제금액" value={won(total)} />
      </section>
    </div>
  );
}
