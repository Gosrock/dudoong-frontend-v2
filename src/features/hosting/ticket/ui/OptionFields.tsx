'use client';

import { useState } from 'react';

import { OPTION_DESCRIPTION_MAX, OPTION_NAME_MAX } from '@/api/option/schema';
import type { TicketOptionType } from '@/api/ticket-item/schema';
import { FieldError, FormSection } from '@/features/hosting/shared/ui/EditorParts';
import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { Txt } from '@/ui/primitives/Txt';

import type { OptionFormErrors, OptionFormValues } from '../model/option-form';
import { MoneyInput } from './MoneyInput';
import * as s from './OptionSheets.css';
import { ToggleSection } from './TicketParts';
import { dimmed as partsDimmed } from './TicketParts.css';

/**
 * 옵션 칸(새 옵션 `932:1544` · 수정 `933:1822` · 상세 `943:2200`) — 이름 20 · 설명 50 · 응답 형식 · '네' 가격 토글 + 금액.
 * `readOnly`면 상세 보기(칸 비활성). 형식은 만들 때만 고른다(`setType` 없으면 비활성).
 */
export function OptionFields({
  values,
  errors,
  setName,
  setDescription,
  setType,
  setPrice,
  readOnly = false,
  priceDisabled = false,
  typeOverride,
  dimLocked = false,
}: {
  values: OptionFormValues;
  errors: OptionFormErrors;
  setName?: (v: string) => void;
  setDescription?: (v: string) => void;
  setType?: (v: OptionFormValues['type']) => void;
  setPrice?: (v: string) => void;
  readOnly?: boolean;
  priceDisabled?: boolean;
  /** 서버 형식(객관식 v1 옵션 등) — 상세·수정에서 보여 주기만 */
  typeOverride?: TicketOptionType | null;
  /** 수정 중 잠긴 칸(형식·가격)을 흐리게(GUI `933:2015`) */
  dimLocked?: boolean;
}) {
  const dimmedPrice = dimLocked;
  const type = typeOverride ?? values.type;
  const [priceOn, setPriceOn] = useState(
    () => values.yesAdditionalPrice.trim() !== '' && values.yesAdditionalPrice !== '0',
  );
  const showPriceInput =
    priceOn || (readOnly && values.yesAdditionalPrice !== '' && values.yesAdditionalPrice !== '0');
  const priceLocked = readOnly || priceDisabled || !setPrice;
  return (
    <div>
      <FormSection
        title="옵션 이름"
        required={!readOnly}
        description={readOnly ? undefined : '관객에게 보여줄 질문이나 항목 이름을 써 주세요.'}
      >
        <Input
          aria-label="옵션 이름"
          placeholder="예) 좋은 자리 선점"
          maxLength={OPTION_NAME_MAX}
          showCount={!readOnly}
          value={values.name}
          disabled={readOnly || !setName}
          onChange={(e) => setName?.(e.target.value)}
          error={errors.name}
        />
      </FormSection>
      <FormSection
        title="옵션 설명"
        required={!readOnly}
        description={readOnly ? undefined : '옵션에 대한 추가 정보를 써 주세요.'}
      >
        <Input
          aria-label="옵션 설명"
          placeholder="예) 무대와 가까운 자리를 먼저 배정해 드려요."
          maxLength={OPTION_DESCRIPTION_MAX}
          showCount={!readOnly}
          value={values.description}
          disabled={readOnly || !setDescription}
          onChange={(e) => setDescription?.(e.target.value)}
          error={errors.description}
        />
      </FormSection>
      <div className={dimLocked ? partsDimmed : undefined}>
        <FormSection title="옵션 응답 형식">
          {type === 'MULTIPLE_CHOICE' ? (
            <Txt as="p" typography="bodyLg">
              객관식(이전 버전 옵션)
            </Txt>
          ) : (
            <RadioGroup
              aria-label="옵션 응답 형식"
              className={s.radios}
              value={type ?? 'SUBJECTIVE'}
              disabled={readOnly || !setType}
              onValueChange={(v) => setType?.(v as OptionFormValues['type'])}
            >
              <Radio value="SUBJECTIVE" label="주관식" />
              <Radio value="YES_NO" label="네/아니오" />
            </RadioGroup>
          )}
        </FormSection>
      </div>
      {type === 'YES_NO' && (
        <ToggleSection
          title="'네' 선택 시 가격 추가하기"
          description="'네'를 고른 관객에게 금액이 더해져요."
          checked={showPriceInput}
          disabled={priceLocked}
          dimmed={dimmedPrice}
          onCheckedChange={(on) => {
            setPriceOn(on);
            if (!on) setPrice?.('');
          }}
        >
          {showPriceInput && (
            <MoneyInput
              aria-label="'네' 추가 금액"
              className={s.price}
              placeholder="1,000"
              trailing="원"
              value={values.yesAdditionalPrice}
              disabled={priceLocked}
              onValueChange={setPrice}
              error={errors.yesAdditionalPrice}
            />
          )}
          {!showPriceInput && <FieldError>{errors.yesAdditionalPrice}</FieldError>}
        </ToggleSection>
      )}
    </div>
  );
}
