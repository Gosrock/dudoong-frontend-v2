'use client';

import type { MyOrderDetail } from '@/api/order/schema';
import { button } from '@/ui/components/Button/Button.css';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { toast } from '@/ui/components/Toast/Toast';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatWon } from '@/utils/money';

import { tossTransferLink } from '../model/payment';
import * as s from './DepositGuide.css';

const copyToast = {
  onCopied: () => toast('계좌번호를 복사했어요', { id: 'deposit:copy' }),
  onCopyError: () =>
    toast('복사하지 못했어요. 계좌번호를 직접 입력해 주세요', { id: 'deposit:copy' }),
};

/**
 * 주문 하나의 토스 송금 링크(B23 — 주문을 만든 뒤 송금). 토스로 송금을 고른 주문이고, 링크를 만들 수 있고 은행 코드가 있을 때만
 * (`bankCode`가 null이면 토스 버튼을 숨긴다 — plan P7 L, B3). 금액은 서버 `totalAmount` 그대로
 */
export function orderTossLink(order: Pick<MyOrderDetail, 'paymentChannel' | 'payment'>) {
  if (order.paymentChannel !== 'TOSS_TRANSFER' || !order.payment?.account?.bankCode) return null;
  return tossTransferLink(order.payment.account, order.payment.totalAmount);
}

/** [토스 앱에서 송금하기] — 디자인 없음(Figma 코멘트 2026-11-01). 주문 완료 화면 · 주문상세(승인 대기)에서 같이 쓴다 */
export function TossTransferButton({ order }: { order: MyOrderDetail }) {
  const link = orderTossLink(order);
  if (!link) return null;
  return (
    <a
      href={link}
      data-testid="toss-link"
      className={button({ variant: 'primary', size: 'md', fullWidth: true })}
    >
      토스 앱에서 송금하기
    </a>
  );
}

/**
 * 입금 안내(B23 — 사용자 결정 2026-11-02: 주문을 입금 전에 먼저 만들고, 완료 화면에서 계좌·금액을 보인다).
 * FIGMA-CUSTOM: 주문 완료 GUI `939:27829`에는 계좌 자리가 없다(Q16 기본안은 "주문상세에서") — 흐름이 바뀌어 DS InfoRow 묶음으로
 * 최소안. 🤖 Claude 판단(2026-11-02), design-requests Q97. Figma 코멘트 2026-11-02. 입금 기한·자동 취소는 서버에 없다(출시 뒤 — Backend #914 답 2)
 */
export function DepositGuide({ order }: { order: MyOrderDetail }) {
  const account = order.payment?.account ?? null;
  const total = order.payment?.totalAmount ?? 0;
  return (
    <section aria-label="입금 안내" className={s.box} data-testid="deposit-guide">
      <InfoRow label="입금자명" value={order.depositorName ?? '—'} />
      <InfoRow label="입금은행" value={account?.bankName ?? '—'} />
      {account?.accountNumber ? (
        <InfoRow label="결제계좌" account={{ number: account.accountNumber, ...copyToast }} />
      ) : (
        <InfoRow label="결제계좌" value="—" />
      )}
      <InfoRow label="예금주" value={account?.accountHolder ?? '—'} />
      <InfoRow
        label={
          <Txt typography="labelLgEmphasized" color={colors.textPrimaryLabel}>
            입금할 금액
          </Txt>
        }
        value={
          <Txt typography="headingSmEmphasized" color={colors.textBrandLabel}>
            <span data-testid="deposit-amount">{formatWon(total)}</span>
          </Txt>
        }
      />
      <Flex direction="column" gap={2} className={s.footer}>
        <TossTransferButton order={order} />
        <Txt typography="labelSm" color={colors.textTertiaryLabel}>
          입금자명과 금액이 맞아야 호스트가 입금을 확인할 수 있어요. 계좌는 주문내역에서 다시 볼 수
          있어요.
        </Txt>
      </Flex>
    </section>
  );
}
