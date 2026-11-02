import { Icon } from '@/ui/icons/Icon';

import * as s from './GuestParts.css';

/** 행 끝 ›(GUI `1026:4562` ic chevron-right 16) — 행 전체가 버튼(`DataTable onRowClick`)이라 여기는 표시만 */
export function DetailCell() {
  return (
    <span className={s.chevronCell} aria-hidden>
      <Icon name="chevron-right" size={16} />
    </span>
  );
}
