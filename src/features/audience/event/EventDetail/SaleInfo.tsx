'use client';

import { Accordion } from '@/ui/components/Accordion/Accordion';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './SaleInfo.css';

/**
 * 공연 상세 "판매정보" — legal-copy **A-2 원문**(약관 제19조②③ · 제27조 · 제29조). 바꾸거나 빼지 않는다.
 * - v2에 없는 유료(PG) 티켓 항목(티켓 종류 "유료티켓" · 환불 ②)은 넣지 않는다(legal-copy 읽는 법 — v1 "유료" 문구는 v2에서 쓰지 않는다).
 *   다른 문장 안의 "유료티켓"(굵은 문단 끝 "무료티켓과 유료티켓은 …")은 문장을 고치지 않으려고 그대로 둔다
 * - ⑤는 v1 문구 대신 **B18 확정 문구**(백엔드 #897 — 개정 약관 제27조③ 2026-11-07 시행)
 * - ③ "취소 후 호스트에게 연락해 환불받을 계좌를 알려주세요"는 A-2에 확정본이 없어 원문 그대로다(B28은 A-7 · A-8 · A-9 · A-11만
 *   바꿨다 — 같은 문장을 v2 흐름에 맞출지는 backend-questions B60)
 * - 굵게는 원문 `<strong>`, 소제목은 원문 `<h4>`(여기서는 h3). 번호(①…)는 이 문서가 붙인 것이라 화면은 글머리표 없는 목록
 */
const TICKET_KINDS = [
  {
    title: '승인 방식 무료티켓',
    body: '예매 후 호스트가 승인하면 티켓이 발급됩니다. 승인 요청과 승인 결과는 메일로 안내해 드립니다.',
  },
  { title: '선착순 방식 무료티켓', body: '결제 없이 예매하면 바로 티켓이 발급됩니다.' },
  {
    title: '두둥티켓',
    body: '예매할 때 안내되는 호스트 계좌로 입금하면, 호스트가 입금을 확인한 뒤 티켓을 발급합니다. 입금자명이 카카오 닉네임과 다르면 확인이 늦어질 수 있습니다. 티켓 대금은 호스트에게 직접 지급되며, 두둥은 대금을 받지 않습니다. 티켓이 발급되면 안내 메일을 보내 드립니다.',
  },
] as const;

const RECEIPT = [
  '두둥 서비스를 통해 티켓을 예매하면 주문 완료 또는 승인 시, 서비스 안에서 조회할 수 있는 QR코드 형태로 티켓이 발급됩니다.',
  '티켓 QR코드는 마이페이지 > 내 예매내역에서 조회할 수 있습니다.',
  '빠른 입장을 위해 공연 입장 전에 QR코드를 미리 준비해 주세요.',
] as const;

const REFUND_LEAD =
  '공연은 시작과 함께 상품 가치가 소멸하므로, 공연 시작 이후에는 취소와 환불이 어렵습니다. 공연 시작 시간은 공연 상세에서 확인할 수 있습니다. 두둥은 취소 수수료를 받지 않습니다.';

/** 굵은 문단(약관 제19조③) — 첫 문장이 원문 `<strong>` */
const HOST_POLICY_STRONG =
  '두둥티켓은 호스트가 공연 상세에 별도의 취소·환불 기준(예: 공연 당일 환불 불가)을 안내한 경우, 구매자가 예매를 취소할 때의 환불은 그 기준이 아래 내용보다 우선합니다.';
const HOST_POLICY_REST =
  '예매 전에 공연 상세를 꼭 확인해 주세요. 다만 호스트가 주문을 거절·취소하거나 공연 시작까지 승인하지 않은 경우, 공연이 취소되거나 중요한 내용이 바뀐 경우에는 호스트 기준과 관계없이 전액 환불받을 수 있으며, 예매 후에 바뀐 기준이나 관계 법령에 어긋나는 기준은 적용되지 않습니다. 무료티켓과 유료티켓은 아래 기준대로 취소·환불됩니다.';

export function SaleInfo() {
  return (
    <section aria-label="판매정보" className={s.root}>
      {/* FIGMA-CUSTOM: 디자인 없음(와이어 · GUI 공연 상세에 "판매정보"가 없다 — v1은 별도 탭). DS Accordion 접힘(design-requests Q152) */}
      <Accordion label="판매정보">
        <div className={s.body}>
          <Txt as="h3" typography="labelLgEmphasized">
            두둥 서비스 티켓 종류 안내
          </Txt>
          <ul className={s.list}>
            {TICKET_KINDS.map((k) => (
              <li key={k.title}>
                <Flex direction="column" gap={1}>
                  <Txt typography="labelMdEmphasized" color={colors.textSecondaryLabel}>
                    {k.title}
                  </Txt>
                  <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                    {k.body}
                  </Txt>
                </Flex>
              </li>
            ))}
          </ul>

          <Txt as="h3" typography="labelLgEmphasized">
            티켓 수령 안내
          </Txt>
          <Flex direction="column" gap={1}>
            {RECEIPT.map((line) => (
              <Txt key={line} as="p" typography="bodySm" color={colors.textSecondaryLabel}>
                {line}
              </Txt>
            ))}
          </Flex>

          <Txt as="h3" typography="labelLgEmphasized">
            티켓 환불 안내
          </Txt>
          <Txt as="p" typography="bodySm" color={colors.textSecondaryLabel}>
            {REFUND_LEAD}
          </Txt>
          <Txt as="p" typography="bodySm" color={colors.textSecondaryLabel}>
            <strong>{HOST_POLICY_STRONG}</strong> {HOST_POLICY_REST}
          </Txt>
          <ul className={s.list}>
            {[
              '무료티켓 - 공연 시작 전까지 마이페이지 > 예매 상세에서 취소할 수 있습니다.',
              <>
                두둥티켓 - 공연 시작 전까지 마이페이지 &gt; 예매 상세에서 예매를 취소할 수 있습니다.
                대금이 호스트 계좌에 있으므로 <strong>취소해도 자동으로 환불되지 않습니다.</strong>{' '}
                취소 후 호스트에게 연락해 환불받을 계좌를 알려주세요. 호스트 연락처는 공연 상세의
                &apos;호스트&apos;에서 확인할 수 있습니다.
              </>,
              '두둥티켓은 호스트가 주문을 거절·취소하거나 공연이 취소된 경우에도 호스트가 직접 환불하며, 호스트는 지체 없이 환불해야 합니다.',
              // ⑤ B18 확정 문구(백엔드 #897)
              '두둥티켓은 입금한 뒤 호스트가 승인하기 전에도 공연 시작 전까지 예매를 취소할 수 있습니다. 두둥은 입금 여부를 확인하지 않으므로, 이미 입금했다면 취소할 때 입력한 환불 계좌로 호스트가 환불합니다.',
              '호스트와 연락이 되지 않거나 환불이 늦어지면 두둥 카카오톡 채널로 알려주세요. 호스트에게 연락해 해결을 돕겠습니다.',
            ].map((item, i) => (
              <li key={i}>
                <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                  {item}
                </Txt>
              </li>
            ))}
          </ul>
        </div>
      </Accordion>
    </section>
  );
}
