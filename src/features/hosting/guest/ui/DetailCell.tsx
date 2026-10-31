import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';

import * as s from './GuestParts.css';

/** 와이어 표 맨 끝 "상세보기 ›" — 행 전체가 버튼(`DataTable onRowClick`)이라 여기는 표시만 */
export function DetailCell() {
  return (
    <span className={s.detailCell} aria-hidden>
      <Txt typography="labelSm">상세보기</Txt>
      <Icon name="chevron-right" size={12} />
    </span>
  );
}
