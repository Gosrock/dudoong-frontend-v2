'use client';

import { useId } from 'react';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { InfoRow } from '@/ui/components/InfoRow/InfoRow';
import { Flex } from '@/ui/primitives/Flex';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { CheckoutState } from '../model/useCheckout';
import { agreementList, bodyList, collapseTopLine, grayBox } from './checkout.css';
import * as s from './CheckoutAgreements.css';

// ─── 주문 동의(#840 — 백엔드 #905 1-1 출시 전 필수. 위치는 2026-11-22 GUI 판매정보 — Design Sync #349) ─────────

/**
 * ② 호스트에게 개인정보 제공 동의 — legal-copy B-1 원문(약관 제36조②·처리방침 3장). 빼거나 바꾸지 않는다(바꾸면 `AGREEMENT_VERSION`).
 * 꼬리 ", 입금자명·환불 계좌"는 두둥만(GUI `1952:49362` 글자에는 꼬리가 없다 — 약관 문구라 바꾸지 않음, Figma 코멘트 2026-11-22)
 */
export function hostProvisionItems(eventName: string, dudoong: boolean) {
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

/**
 * 판매정보 안 ② 호스트 제공 동의(GUI `1952:49359` list second-radio + `1952:49360` 회색 상자 — Design Sync #349 · 2026-11-22).
 * 줄 왼쪽 글자 · 오른쪽 체크(DS `Box` round), 아래 회색 상자에 항목을 늘 펼쳐 둔다(옛 [자세히] 접힘 대신 — 더 잘 보이게 바뀜).
 * 글자 앞 빨간 `*`는 필수 표시 장식이라 읽지 않는다(`aria-hidden`) — 동의 문구(`HOST_PROVISION_LABEL`)는 그대로
 */
export function HostProvisionField({ c, eventName }: { c: CheckoutState; eventName: string }) {
  const errorId = useId();
  const inputId = useId();
  return (
    <div className={s.agreement}>
      <Controller
        control={c.form.control}
        name="hostProvisionAgreed"
        render={({ field, fieldState }) => (
          <>
            <InfoRow
              hierarchy="second"
              className={collapseTopLine}
              label={
                <label htmlFor={inputId} className={s.requiredLabel}>
                  <span aria-hidden className={s.requiredMark}>
                    *
                  </span>
                  {HOST_PROVISION_LABEL}
                </label>
              }
              value={
                <Checkbox
                  id={inputId}
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={fieldState.error ? errorId : undefined}
                />
              }
            />
            {fieldState.error && (
              <div className={s.errorRow}>
                <Txt typography="labelSm" color={colors.textDangerLabel}>
                  <span role="alert" id={errorId}>
                    {fieldState.error.message}
                  </span>
                </Txt>
              </div>
            )}
          </>
        )}
      />
      <div className={grayBox}>
        <ol className={bodyList}>
          {hostProvisionItems(eventName, c.ticket.payType === 'DUDOONG').map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * PC 판매정보 카드 안 ② 호스트 제공 동의(GUI `1989:32209` 동의 행 + `1989:32213` 항목 — Design Sync #363): 체크 왼쪽 + `Body/sm` 글자,
 * 아래 항목 목록. 문구는 모바일과 같다(`HOST_PROVISION_LABEL` — GUI 글자는 "(필수)"가 없지만 동의 문구라 그대로, Figma 코멘트 2026-11-22)
 */
export function HostProvisionCheck({ c, eventName }: { c: CheckoutState; eventName: string }) {
  const errorId = useId();
  return (
    <Flex direction="column" gap={3}>
      <Controller
        control={c.form.control}
        name="hostProvisionAgreed"
        render={({ field, fieldState }) => (
          <Flex direction="column" gap={1}>
            <Checkbox
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
              label={
                <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                  <span aria-hidden className={s.requiredMark}>
                    *
                  </span>
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
      <ol className={bodyList}>
        {hostProvisionItems(eventName, c.ticket.payType === 'DUDOONG').map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </Flex>
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
