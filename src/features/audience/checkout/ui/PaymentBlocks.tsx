'use client';

import type { ReactNode } from 'react';

import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { toast } from '@/ui/components/Toast/Toast';
import { Divider } from '@/ui/primitives/Divider';

/**
 * 체크아웃과 주문상세가 같이 쓰는 결제정보 · 결제금액 행(코드 패턴 점검 A17, 2026-11-02).
 * 화면마다 머리 줄 위치·조건(체크아웃은 늘, 주문상세는 승인 대기만)과 금액 글자(체크아웃 GUI는 `18,000 원`)가 달라 그 부분은 화면이 정한다.
 */

/**
 * 결제정보 머리 줄 안내 — 체크아웃 GUI `564:4156`(Ready for dev) 원문. 주문상세(와이어)의 "…동일하게 입력해주세요"도 이것으로 맞춘다.
 * 약관 근거 문구가 아니다(legal-copy A-12는 v1 참고 문구).
 */
export const DEPOSITOR_NOTICE = '입금자명은 닉네임과 동일하게 해주세요';

type DepositAccount = {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
};

const copyToast = (id: string) => ({
  onCopied: () => toast('계좌번호를 복사했어요', { id }),
  onCopyError: () => toast('복사하지 못했어요. 계좌번호를 직접 입력해 주세요', { id }),
});

/**
 * 입금 계좌 세 줄 — 입금은행 · 결제계좌[복사] · 예금주. 값이 없으면 "—".
 * 은행 줄은 GUI에 없지만 토스 송금·입금에 은행이 필요해 더했다(plan P7 ②).
 */
export function DepositAccountRows({
  account,
  toastId,
}: {
  account: DepositAccount | null;
  /** 복사 토스트 id(`checkout:copy` · `order:copy`) */
  toastId: string;
}) {
  return (
    <>
      <InfoRow label="입금은행" value={account?.bankName ?? '—'} />
      {account?.accountNumber ? (
        <InfoRow
          label="결제계좌"
          account={{ number: account.accountNumber, ...copyToast(toastId) }}
        />
      ) : (
        <InfoRow label="결제계좌" value="—" />
      )}
      <InfoRow label="예금주" value={account?.accountHolder ?? '—'} />
    </>
  );
}

/** 결제금액 블록 — 머리 줄 · 티켓금액 · 옵션금액 · 선 · 총 결제금액 */
export function AmountRows({
  ticketAmount,
  optionAmount,
  total,
  format,
  totalTestId,
}: {
  ticketAmount: number;
  optionAmount: number;
  total: number;
  /** 금액 글자 — 체크아웃은 GUI대로 띄어 쓰고(`1,000 원`), 주문상세는 공용 `formatPrice`/`formatWon` */
  format: {
    ticket: (n: number) => ReactNode;
    option: (n: number) => ReactNode;
    total: (n: number) => ReactNode;
  };
  totalTestId: string;
}) {
  return (
    <section aria-label="결제금액">
      <InfoRow hierarchy="first" label="결제금액" />
      <InfoRow label="티켓금액" value={format.ticket(ticketAmount)} />
      <InfoRow label="옵션금액" value={format.option(optionAmount)} />
      <Divider inset={5} />
      {/* 총액 값 Label/lg-emphasized 보라(GUI `567:7913` — R1c) */}
      <InfoRow
        total
        label="총 결제금액"
        value={<span data-testid={totalTestId}>{format.total(total)}</span>}
      />
    </section>
  );
}
