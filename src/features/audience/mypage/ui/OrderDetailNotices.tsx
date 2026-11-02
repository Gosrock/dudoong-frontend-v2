'use client';

import { Button } from '@/ui/components/Button/Button';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Icon } from '@/ui/icons/Icon';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { REFUSE_REASON_DESCRIPTION } from '../model/order-card';
import type { OrderDetailState } from '../model/useOrderDetail';
import * as s from './mypage.css';
import { openHostInquiry, openRefundAccountSheet } from './OrderOverlays';

/** 거절 사유 박스(와이어 `128:2583` — "승인거절사유 <사유>" + 설명 + 말풍선 버튼 = 호스트 문의) */
export function RefuseReason({ detail }: { detail: OrderDetailState }) {
  const type = detail.order.refuseReasonType ?? '';
  const description = REFUSE_REASON_DESCRIPTION[type];
  const { contactsEventId } = detail;
  return (
    <>
      <Divider variant="section" />
      <section aria-label="승인거절 사유">
        <Flex gap={3} align="center" paddingX={5} paddingY={4}>
          <Flex direction="column" gap={2} className={s.grow}>
            <Flex gap={2} align="center" wrap>
              <Txt typography="headingSmEmphasized">승인거절사유</Txt>
              <span data-testid="refuse-reason">
                <Txt typography="headingSmEmphasized" color={colors.textDangerLabel}>
                  {detail.refuseReason}
                </Txt>
              </span>
            </Flex>
            {description && (
              <Txt
                as="p"
                typography="bodySm"
                color={colors.textSecondaryLabel}
                className={s.preLine}
              >
                {description}
              </Txt>
            )}
          </Flex>
          {contactsEventId !== null && (
            <Button
              variant="dark"
              size="md"
              icon={<Icon name="chat" />}
              aria-label="호스트에게 문의"
              onClick={() => openHostInquiry(contactsEventId)}
            />
          )}
        </Flex>
      </section>
    </>
  );
}

/** 취소 사유(호스트가 취소한 주문) */
export function CancelReason({ reason }: { reason: string }) {
  return (
    <div className={s.notice}>
      <Txt typography="labelMd">취소 사유</Txt>
      <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
        {reason}
      </Txt>
    </div>
  );
}

/**
 * 환불 계좌(P11/O-5) — 입력·수정 입구는 `canEditRefundAccount`, 입력 유도 문구는 `refundAccountRequired`(입금 미확인 거절은 유도 없음).
 * GUI·와이어에 화면이 없어 DS로만(Figma 코멘트 — 디자인 없음). 계좌번호는 서버가 가린 값만 온다.
 */
export function RefundAccount({
  detail,
  orderUuid,
}: {
  detail: OrderDetailState;
  orderUuid: string;
}) {
  const current = detail.order.refundAccount;
  const entry = detail.refundAccount;
  if (!current && entry.kind === 'none') return null;
  return (
    <>
      <Divider variant="section" />
      <section aria-label="환불 계좌">
        <InfoRow
          hierarchy="first"
          label="환불 계좌"
          value={
            entry.kind === 'open' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openRefundAccountSheet(orderUuid, entry.mode)}
              >
                {entry.mode === 'input' ? '계좌 입력' : '계좌 수정'}
              </Button>
            ) : undefined
          }
        />
        {entry.kind === 'open' && entry.prompt && (
          <div className={s.warningNotice} role="status">
            <Txt typography="labelMd">환불받을 계좌를 입력해 주세요</Txt>
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              입력하신 계좌로 호스트가 환불해요.
            </Txt>
          </div>
        )}
        {/* 입금 미확인 거절 — 서버가 입력 유도를 끈다(`refundAccountRequired=false`, api-contract). 입구는 열려 있어
            "왜 계좌를 넣으라는지" 헷갈리지 않게 입금한 경우에만 넣으면 된다고 알린다(이슈 #106 §5, 🤖 문구) */}
        {entry.kind === 'open' && !entry.prompt && !current && detail.depositUnconfirmed && (
          <div className={s.notice} role="status" data-testid="refund-account-optional">
            <Txt typography="labelMd">입금하셨다면 환불받을 계좌를 입력해 주세요</Txt>
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              호스트가 입금을 확인하지 못해 거절한 주문이에요. 입금하지 않으셨다면 입력하지 않아도
              돼요.
            </Txt>
          </div>
        )}
        {current && (
          <span data-testid="refund-account">
            <InfoRow label="은행" value={current.bankName} />
            <InfoRow label="계좌번호" value={current.maskedAccountNumber} />
            <InfoRow label="예금주" value={current.accountHolder} />
          </span>
        )}
      </section>
    </>
  );
}
