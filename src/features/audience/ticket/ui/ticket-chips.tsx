import type { EventDisplayStatus } from '@/api/event/schema';
import { Chip, type ChipColor } from '@/ui/components/Chip/Chip';

import type { TicketTone } from '../model/my-ticket-state';
import type { StateCount } from '../model/ticket-groups';
import * as s from './TicketTab.css';

/**
 * 티켓 상태 칩 색(GUI `908:3276` — `tag_v2` small · round · weak). 승인완료 green(`908:22655`), 승인대기 cyan(`939:25698`),
 * 승인거절 red(`939:25571`)는 Figma 그대로. 나머지 상태는 GUI에 칩이 없어 같은 tone끼리 같은 색으로 묶었다(implementation-log P8-V 결정).
 */
const TONE_COLOR: Record<TicketTone, ChipColor> = {
  positive: 'green',
  waiting: 'cyan',
  negative: 'red',
  gift: 'purple',
  muted: 'grey',
};

/**
 * 묶음 카드 오른쪽 위 상태별 개수 칩. 한 상태만 있고 1장이면 라벨만("승인완료"), 아니면 "승인완료 2"처럼 개수를 붙인다.
 * 공연 진행 중이면 맨 위에 "공연중 ON AIR"(`939:25755` — `tag_v2` violet fill)를 두고 승인완료 칩을 대신한다.
 */
export function TicketStateChips({
  counts,
  displayStatus,
}: {
  counts: readonly StateCount[];
  displayStatus: EventDisplayStatus | null;
}) {
  const ongoing = displayStatus === 'ONGOING';
  const showCount = counts.length > 1 || counts.some((c) => c.count > 1);
  const rest = ongoing ? counts.filter((c) => c.state !== 'APPROVED') : counts;
  return (
    <span role="list" aria-label="상태별 개수" data-testid="state-counts" className={s.chipList}>
      {ongoing && (
        <span role="listitem">
          <Chip size="sm" shape="round" color="violet" theme="fill">
            공연중 ON AIR
          </Chip>
        </span>
      )}
      {rest.map((c) => (
        <span role="listitem" key={c.state} data-state={c.state}>
          <Chip size="sm" shape="round" color={TONE_COLOR[c.tone]} theme="weak">
            {showCount ? `${c.label} ${c.count}` : c.label}
          </Chip>
        </span>
      ))}
    </span>
  );
}
