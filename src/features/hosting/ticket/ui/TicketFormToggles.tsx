'use client';

import { FieldError } from '@/features/hosting/shared/ui/EditorParts';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { DatePicker } from '@/ui/components/DatePicker/DatePicker';
import { Input } from '@/ui/components/Input/Input';
import { TimePicker } from '@/ui/components/TimePicker/TimePicker';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import type { TicketSectionProps } from './ticket-form-props';
import * as s from './TicketFormSections.css';
import { openApprovalGuide } from './TicketGuides';
import { ToggleSection } from './TicketParts';

/** 오른쪽 판 토글 넷 — 관리자 승인 · 재고 공개 · 구매 매수 제한 · 판매 기간(GUI `767:46664` · PC `821:25116`) */
export function TicketFormToggles({ form, readOnly, err }: TicketSectionProps) {
  const v = form.values;
  return (
    <>
      <ToggleSection
        title="관리자 승인 여부"
        description="관리자가 승인해야 티켓이 발급돼요."
        checked={v.approvalRequired}
        disabled={readOnly || form.locks.approval}
        onCheckedChange={form.set.approvalRequired}
        onInfo={() => void openApprovalGuide()}
        infoLabel="관리자 승인이란?"
      />
      <ToggleSection
        title="재고 정보 공개"
        description="남은 티켓의 수량을 공개해요."
        checked={v.isQuantityPublic}
        disabled={readOnly || form.locks.quantityPublic}
        onCheckedChange={form.set.quantityPublic}
      />
      <ToggleSection
        title="구매 가능 매수 제한"
        description="한 명이 구매 가능한 티켓 매수를 제한해요."
        checked={v.limitPurchase}
        disabled={readOnly}
        onCheckedChange={form.set.limitPurchase}
      >
        {v.limitPurchase && (
          <Input
            aria-label="1인 최대 매수"
            className={s.narrow}
            inputMode="numeric"
            placeholder="0"
            trailing="장"
            value={v.purchaseLimit}
            readOnly={readOnly}
            onChange={(e) => form.set.purchaseLimit(e.target.value)}
            error={err('purchaseLimit')}
          />
        )}
      </ToggleSection>
      <ToggleSection
        title="판매 기간 설정"
        description={'티켓을 구매할 수 있는 기간을 설정해요.\n판매는 공연 시작 전까지만 가능해요.'}
        checked={v.salePeriod}
        disabled={readOnly}
        onCheckedChange={form.set.salePeriod}
      >
        {v.salePeriod && <SalePeriodBox form={form} readOnly={readOnly} err={err} />}
      </ToggleSection>
    </>
  );
}

/** 판매 시작(즉시 체크 · 날짜 · 시각) · 판매 종료(날짜 · 시각) */
function SalePeriodBox({ form, readOnly, err }: TicketSectionProps) {
  const v = form.values;
  return (
    // FIGMA-CUSTOM: 판매 기간 상자(gui 767:46768 "Frame 1707480415") 커스텀 → 커스텀 ui/TicketFormSections.css.ts. DS 후보(design-system §3)
    <div className={s.period} data-testid="sale-period">
      <Flex direction="column" gap={2} fullWidth>
        <div className={s.periodHead}>
          <Txt typography="labelLgEmphasized">판매 시작</Txt>
          <Checkbox
            label={<Txt typography="labelMd">공연 등록 즉시 판매 시작</Txt>}
            checked={v.saleStartNow}
            disabled={readOnly}
            onCheckedChange={form.set.saleStartNow}
          />
        </div>
        {!v.saleStartNow && (
          <div className={s.dateTime}>
            <DatePicker
              aria-label="판매 시작 날짜"
              placeholder="날짜 선택"
              value={v.saleStartDate}
              readOnly={readOnly}
              onChange={(e) => form.set.saleStart(e.target.value, v.saleStartTime)}
            />
            <TimePicker
              aria-label="판매 시작 시각"
              placeholder="시간 선택"
              value={v.saleStartTime}
              readOnly={readOnly}
              onChange={(e) => form.set.saleStart(v.saleStartDate, e.target.value)}
            />
          </div>
        )}
        <FieldError>{err('saleStart')}</FieldError>
      </Flex>
      <Flex direction="column" gap={2} fullWidth>
        <div className={s.periodHead}>
          <Txt typography="labelLgEmphasized">판매 종료</Txt>
        </div>
        <div className={s.dateTime}>
          <DatePicker
            aria-label="판매 종료 날짜"
            placeholder="날짜 선택"
            value={v.saleEndDate}
            readOnly={readOnly}
            onChange={(e) => form.set.saleEnd(e.target.value, v.saleEndTime)}
          />
          <TimePicker
            aria-label="판매 종료 시각"
            placeholder="시간 선택"
            value={v.saleEndTime}
            readOnly={readOnly}
            onChange={(e) => form.set.saleEnd(v.saleEndDate, e.target.value)}
          />
        </div>
        <FieldError>{err('saleEnd')}</FieldError>
      </Flex>
    </div>
  );
}
