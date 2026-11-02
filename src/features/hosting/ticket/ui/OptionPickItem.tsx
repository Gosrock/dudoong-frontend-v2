'use client';

import type { TicketOptionType } from '@/api/ticket-item/schema';
import { Checkbox } from '@/ui/components/Checkbox/Checkbox';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './OptionSheets.css';
import { OptionChips } from './TicketParts';

// FIGMA-CUSTOM: 옵션 고르기 항목(gui 931:1323 "옵션 선택 항목" 로컬 컴포넌트) 커스텀 → 커스텀 OptionSheets.css.ts. DS 후보(design-system §3)
export function OptionPickItem({
  name,
  type,
  yesAdditionalPrice,
  checked,
  attached,
  disabled,
  onToggle,
}: {
  name: string;
  type: TicketOptionType | null;
  yesAdditionalPrice: number | null;
  checked: boolean;
  attached?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <li>
      <label
        className={s.pickItem}
        data-selected={checked ? 'true' : undefined}
        data-attached={attached ? 'true' : undefined}
        data-disabled={attached || disabled ? 'true' : undefined}
      >
        <Checkbox
          shape="square"
          aria-label={attached ? `${name}(이미 추가됨)` : name}
          checked={checked}
          disabled={attached || disabled}
          onCheckedChange={() => onToggle?.()}
        />
        <span className={s.pickText}>
          <Txt typography="bodyMd">{name}</Txt>
          <OptionChips type={type} yesAdditionalPrice={yesAdditionalPrice} />
        </span>
      </label>
    </li>
  );
}
