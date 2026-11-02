'use client';

import { useId } from 'react';
import { Controller } from 'react-hook-form';

import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { CheckoutState } from '../model/useCheckout';
import { agreementDetailBody, agreementList } from './checkout.css';
import * as s from './CheckoutAgreements.css';

// ─── 주문 동의(#840 — 백엔드 #905 1-1 출시 전 필수, 위치는 디자인 Q42 답 전 잠정) ─────────

/**
 * ② 호스트에게 개인정보 제공 동의 — legal-copy B-1 원문(약관 제36조②·처리방침 3장). 빼거나 바꾸지 않는다(바꾸면 `AGREEMENT_VERSION`).
 * 꼬리 ", 입금자명·환불 계좌"는 두둥만. 디자인 없음 — DS Checkbox + DS Accordion([자세히] 펼침)
 */
function hostProvisionItems(eventName: string, dudoong: boolean) {
  const host = eventName ? `${eventName}의 호스트` : '이 공연의 호스트';
  return [
    `제공받는 자: ${host}`,
    '목적: 예매·입장 확인, 공연 변경·취소 안내, 두둥티켓 입금 확인과 환불',
    `항목: 이름, 연락처, 이메일, 예매·결제 내역, 이 공연의 추가 질문 응답${dudoong ? ', 입금자명·환불 계좌' : ''}`,
    '보유기간: 공연 종료 후 6개월 (두둥티켓 입금·환불 내역은 3년)',
    '동의하지 않으면 예매할 수 없습니다.',
  ];
}

/**
 * ③ 두둥티켓 입금 전 확인 — legal-copy A-6 ①~③ 원문(약관 제29조②·제19조③). v1의 ④ "'입금했어요'를 누르면 위 내용에 동의한 것으로
 * 봅니다"는 v2가 체크 칸으로 받으므로 체크 글자로 바꿨다(🤖 Claude 판단 2026-11-01 — 문구 변경 아님: v2 첫 노출)
 */
const DUDOONG_NOTICE_ITEMS = [
  '두둥티켓 대금은 호스트에게 직접 지급되며, 두둥은 대금을 받지 않습니다.',
  '예매를 취소해도 자동으로 환불되지 않으며, 환불은 호스트가 직접 합니다.',
  '호스트가 공연 상세에 별도 환불 기준(예: 공연 당일 환불 불가)을 안내했다면, 직접 취소할 때의 환불은 그 기준이 우선합니다.',
] as const;
const DUDOONG_NOTICE_LABEL = '(필수) 위 내용을 확인했으며 이에 동의합니다';
const HOST_PROVISION_LABEL = '(필수) 호스트에게 개인정보 제공 동의';

export function HostProvisionField({ c, eventName }: { c: CheckoutState; eventName: string }) {
  const errorId = useId();
  return (
    <section aria-label="개인정보 제공 동의" className={s.agreement}>
      <Controller
        control={c.form.control}
        name="hostProvisionAgreed"
        render={({ field, fieldState }) => (
          <Flex direction="column" gap={1} paddingX={5}>
            <Checkbox
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
              label={
                <Txt typography="labelMd" color={colors.textPrimaryLabel}>
                  {HOST_PROVISION_LABEL}
                </Txt>
              }
            />
            {fieldState.error && (
              <Txt typography="labelSm" color={colors.textDangerLabel}>
                <span role="alert" id={errorId}>
                  {fieldState.error.message}
                </span>
              </Txt>
            )}
          </Flex>
        )}
      />
      <Accordion label="자세히">
        <ol className={`${agreementList} ${agreementDetailBody}`}>
          {hostProvisionItems(eventName, c.ticket.payType === 'DUDOONG').map((item) => (
            <li key={item}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {item}
              </Txt>
            </li>
          ))}
        </ol>
      </Accordion>
    </section>
  );
}

/** ③ 두둥 입금 전 확인 — 주문 확인 다이얼로그의 결제 요약 아래 */
export function DudoongNoticeField({ c }: { c: CheckoutState }) {
  return (
    <>
      <Spacing size={4} />
      <Flex direction="column" gap={3}>
        <ol className={`${agreementList} ${s.noticeList}`}>
          {DUDOONG_NOTICE_ITEMS.map((item) => (
            <li key={item}>
              <Txt typography="labelSm" color={colors.textSecondaryLabel}>
                {item}
              </Txt>
            </li>
          ))}
        </ol>
        <Controller
          control={c.form.control}
          name="dudoongTicketNoticeConfirmed"
          render={({ field }) => (
            <Checkbox
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              disabled={c.submission.pending}
              label={
                <Txt typography="labelMd" color={colors.textPrimaryLabel}>
                  {DUDOONG_NOTICE_LABEL}
                </Txt>
              }
            />
          )}
        />
      </Flex>
    </>
  );
}
