'use client';

import { Input } from '@/ui/components/Input/Input';
import { Radio, RadioGroup } from '@/ui/components/Radio/Radio';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './OrderDetailOverlay.css';

/**
 * 사유 고르기 — 거절(GUI `1029:6920` · `996:1410`)과 승인 후 취소(`1029:7509` · `1000:1695`)가 같은 모양: DS Radio 4개(세로) →
 * "기타 - 직접 입력"을 고르면 DS input Field(들여쓰기 28) + 글자 수 "0/100"(오른쪽 — DS Input이 `maxLength`로 그린다).
 */
export function ReasonFields<K extends string>({
  label,
  options,
  value,
  onValueChange,
  text,
  onTextChange,
  textMax,
  textLabel,
  textPlaceholder,
  textError,
  typeError,
}: {
  /** 라디오 묶음 이름(예: "거절 사유") */
  label: string;
  options: readonly { key: K; label: string }[];
  value: K | null;
  onValueChange: (key: K) => void;
  text: string;
  onTextChange: (text: string) => void;
  textMax: number;
  textLabel: string;
  textPlaceholder?: string;
  textError?: string;
  typeError?: string;
}) {
  return (
    <Flex direction="column" gap={3}>
      <RadioGroup
        aria-label={label}
        className={s.reasons}
        value={value ?? ''}
        onValueChange={(v) => onValueChange(v as K)}
      >
        {options.map((r) => (
          <Radio key={r.key} value={r.key} label={r.key === 'ETC' ? '기타 - 직접 입력' : r.label} />
        ))}
      </RadioGroup>
      {value === 'ETC' && (
        <div className={s.reasonText}>
          <Input
            aria-label={textLabel}
            placeholder={textPlaceholder ?? `최대 ${textMax}자 입력 가능`}
            maxLength={textMax}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            error={textError}
          />
        </div>
      )}
      {typeError && (
        <Txt as="p" typography="bodySm" color={colors.textDangerLabel}>
          {typeError}
        </Txt>
      )}
    </Flex>
  );
}
