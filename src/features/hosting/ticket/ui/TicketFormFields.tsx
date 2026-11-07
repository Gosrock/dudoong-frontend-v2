'use client';

import { TICKET_DESCRIPTION_MAX, TICKET_NAME_MAX } from '@/api/ticket-item/schema';
import { FieldError, FormSection } from '@/features/hosting/shared/ui/EditorParts';
import { Button } from '@/ui/components/Button/Button';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { Flex } from '@/ui/primitives/Flex';

import { PAY_TYPE_LABEL } from '../model/ticket-rules';
import type { useTicketForm } from '../model/useTicketForm';
import { MoneyInput } from './MoneyInput';
import type { TicketSectionProps } from './ticket-form-props';
import * as s from './TicketFormSections.css';

/** 티켓 종류(두둥 · 무료) — 잠긴 티켓은 바꿀 수 없다 */
export function PayTypeSection({ form, readOnly, err }: TicketSectionProps) {
  return (
    <FormSection
      title="티켓 종류"
      description="계좌 송금 옵션을 통해 수수료 없이 티켓값을 받을 수 있어요."
    >
      <RadioGroup
        aria-label="티켓 종류"
        className={s.radios}
        value={form.values.payType}
        disabled={readOnly || form.locks.locked}
        onValueChange={(p) => form.set.payType(p as typeof form.values.payType)}
      >
        <Radio value="DUDOONG" label={PAY_TYPE_LABEL.DUDOONG} />
        <Radio value="FREE" label={PAY_TYPE_LABEL.FREE} />
      </RadioGroup>
      <FieldError>{err('payType')}</FieldError>
    </FormSection>
  );
}

/** 티켓 이름 · 설명 */
export function NameSections({ form, readOnly, err }: TicketSectionProps) {
  return (
    <>
      <FormSection
        title="티켓 이름"
        required
        description="티켓의 성격이 잘 드러나는 이름을 써주세요."
      >
        <Input
          aria-label="티켓 이름"
          placeholder="예) 후원티켓"
          maxLength={TICKET_NAME_MAX}
          value={form.values.name}
          readOnly={readOnly || form.locks.locked}
          onChange={(e) => form.set.name(e.target.value)}
          error={err('name')}
        />
      </FormSection>

      <FormSection
        title="티켓 설명"
        description="티켓에 대한 추가 정보가 필요한 경우 작성해 주세요."
      >
        <Input
          aria-label="티켓 설명"
          placeholder="예) 해당 티켓은 후원 티켓으로 입장이 불가합니다."
          maxLength={TICKET_DESCRIPTION_MAX}
          value={form.values.description}
          readOnly={readOnly}
          onChange={(e) => form.set.description(e.target.value)}
          error={err('description')}
        />
      </FormSection>
    </>
  );
}

/** 가격(두둥만) | 판매 수량 — 1280~ 한 줄 */
export function PriceSupplySection({ form, readOnly, err }: TicketSectionProps) {
  const v = form.values;
  return (
    <div className={s.priceSupply}>
      {v.payType === 'DUDOONG' && (
        <FormSection title="티켓 가격" required>
          <MoneyInput
            aria-label="가격"
            className={s.narrow}
            placeholder="0"
            trailing="원"
            value={v.price}
            readOnly={readOnly || form.locks.locked}
            onValueChange={form.set.price}
            error={err('price')}
          />
        </FormSection>
      )}
      <FormSection title="판매 수량" required>
        <RadioGroup
          aria-label="판매 수량 방식"
          className={s.supplyRow}
          value={v.unlimited ? 'unlimited' : 'limited'}
          disabled={readOnly || (v.unlimited && form.locks.limitedSupply)}
          onValueChange={(next) => form.set.unlimited(next === 'unlimited')}
        >
          <Radio value="unlimited" label="무제한" />
          <span className={s.supplyCount}>
            <Radio value="limited" label="수량 지정" />
            <Input
              aria-label="판매 수량"
              className={s.count}
              inputMode="numeric"
              placeholder="0"
              trailing="장"
              value={v.unlimited ? '' : v.supplyCount}
              disabled={v.unlimited}
              readOnly={readOnly}
              onChange={(e) => form.set.supplyCount(e.target.value)}
            />
          </span>
        </RadioGroup>
        <FieldError>{err('supplyCount')}</FieldError>
      </FormSection>
    </div>
  );
}

/** 입금 계좌(두둥만) — 은행은 서버 목록에서 고른다(GUI는 자유 입력, 사용자 결정 2026-10-31) */
export function AccountSection({
  form,
  bank,
  readOnly,
  err,
}: TicketSectionProps & { bank: ReturnType<typeof useTicketForm>['bank'] }) {
  const v = form.values;
  const locked = form.locks.locked;
  return (
    <FormSection title="계좌번호 입력" required description="입금 받을 계좌 정보를 적어 주세요.">
      <Flex direction="column" gap={2} fullWidth>
        <div className={s.accountRow}>
          {/* GUI는 은행명 자유 입력 — 서버 은행 목록 선택(사용자 결정 2026-10-31, 디자이너에게 전달됨) */}
          <Dropdown
            aria-label="은행"
            placeholder={bank.status === 'error' ? '은행 목록을 못 불러왔어요' : '은행명'}
            options={bank.banks.map((b) => ({ value: b.code, label: b.name }))}
            value={bank.selected?.code ?? ''}
            disabled={readOnly || locked || bank.status !== 'success'}
            onValueChange={bank.select}
            error={err('bankCode')}
          />
          <Input
            aria-label="예금주"
            placeholder="예금주"
            value={v.accountHolder}
            readOnly={readOnly || locked}
            onChange={(e) => form.set.accountHolder(e.target.value)}
            error={err('accountHolder')}
          />
        </div>
        <Input
          aria-label="계좌번호"
          placeholder="계좌번호"
          inputMode="numeric"
          value={v.accountNumber}
          readOnly={readOnly || locked}
          onChange={(e) => form.set.accountNumber(e.target.value)}
          error={err('accountNumber')}
        />
        {bank.status === 'error' && (
          <Button variant="secondary" size="sm" onClick={bank.retry}>
            은행 목록 다시 불러오기
          </Button>
        )}
      </Flex>
    </FormSection>
  );
}
