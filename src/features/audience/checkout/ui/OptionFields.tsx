'use client';

import { Controller } from 'react-hook-form';

import { Input } from '@/ui/components/Input/Input';
import { SelectButton } from '@/ui/components/SelectButton/SelectButton';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatWon } from '@/utils/money';

import type { CheckoutState } from '../model/useCheckout';

// ─── 옵션 응답 ────────────────────────────────────────────────

type AnswerErrors = ({ answer?: { message?: string } } | undefined)[] | undefined;

/** 티켓 하나(또는 "모든 티켓 동일")의 옵션 응답 칸 — 예/아니오는 DS SelectButton, 주관식은 DS Input */
export function OptionFields({
  c,
  base,
  errors,
  idPrefix,
}: {
  c: CheckoutState;
  base: 'options.same' | `options.tickets.${number}`;
  errors: unknown;
  idPrefix: string;
}) {
  const fieldErrors = errors as AnswerErrors;
  return (
    <>
      {c.ticket.options.map((option, i) => {
        const name = `${base}.${i}.answer` as `options.same.${number}.answer`;
        const error = fieldErrors?.[i]?.answer?.message;
        const titleId = `${idPrefix}-option-${option.optionId}`;
        const optionName = option.name ?? '옵션';
        return (
          <Flex key={option.optionId} direction="column" gap={3} fullWidth>
            {i > 0 && <Divider />}
            <Flex direction="column" gap={1}>
              <Txt typography="labelMdEmphasized" color={colors.textSecondaryLabel}>
                <span id={titleId}>{optionName}</span>
                {option.type === 'YES_NO' && option.yesAdditionalPrice ? (
                  <Txt typography="labelMdEmphasized" color={colors.textBrandLabel}>
                    {` (+${formatWon(option.yesAdditionalPrice)})`}
                  </Txt>
                ) : null}
              </Txt>
              {option.description && (
                <Txt typography="labelMd" color={colors.textTertiaryLabel}>
                  {option.description}
                </Txt>
              )}
            </Flex>
            {option.type === 'YES_NO' ? (
              <Controller
                control={c.form.control}
                name={name}
                render={({ field }) => (
                  <SelectButton
                    ref={field.ref}
                    aria-labelledby={titleId}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      { value: 'YES', label: '예' },
                      { value: 'NO', label: '아니오' },
                    ]}
                  />
                )}
              />
            ) : (
              <Input
                aria-labelledby={titleId}
                placeholder="답변을 입력해 주세요"
                error={error}
                {...c.form.register(name)}
              />
            )}
            {option.type === 'YES_NO' && error && (
              <Txt typography="labelSm" color={colors.textDangerLabel}>
                <span role="alert">{error}</span>
              </Txt>
            )}
          </Flex>
        );
      })}
    </>
  );
}
