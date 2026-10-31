import type { MyEvent } from '@/api/event/schema';
import type { HostRole } from '@/api/shared/common-schema';
import { formatKstKoreanDate, formatKstTime } from '@/api/shared/date';
import { HOST_ROLE_LABEL } from '@/features/hosting/host/model/member-rules';
import { type ChipColor, type ChipTheme, formatDday } from '@/ui/components/Chip/Chip';

/**
 * 공연준비 홈 카드의 표시값(plan P10a V). 칩 색은 design-system §3 "옛 Tag → tag_v2" 표 그대로 —
 * role chip 마스터 purple · 매니저 cyan(weak, lg, round), Concert state chip 준비중 green · D-day red · 공연중 red fill · 지난 공연 grey.
 */

export type ChipLook = { label: string; color: ChipColor; theme: ChipTheme };

/**
 * 호스트 카드의 내 역할 배지. 일반 멤버(`GUEST`)는 DS role chip에 없어 grey로 "일반"을 단다(🤖 판단 — 역할을 모든 카드에 보이려고).
 * 모르는 역할(`UNKNOWN`)은 배지 없음.
 */
export function roleChipOf(role: HostRole): ChipLook | null {
  if (role === 'MASTER') return { label: HOST_ROLE_LABEL.MASTER, color: 'purple', theme: 'weak' };
  if (role === 'MANAGER') return { label: HOST_ROLE_LABEL.MANAGER, color: 'cyan', theme: 'weak' };
  if (role === 'GUEST') return { label: HOST_ROLE_LABEL.GUEST, color: 'grey', theme: 'weak' };
  return null;
}

/** 공연 카드 상태 칩. 모르는 표시 상태는 칩 없음 */
export function eventChipOf(event: Pick<MyEvent, 'displayStatus' | 'dDay'>): ChipLook | null {
  switch (event.displayStatus) {
    case 'PREPARING':
      return { label: '준비중', color: 'green', theme: 'weak' };
    case 'UPCOMING':
      return {
        label: event.dDay === null ? '예정' : formatDday(event.dDay),
        color: 'red',
        theme: 'weak',
      };
    case 'ONGOING':
      return { label: '공연중', color: 'red', theme: 'fill' };
    case 'PAST':
      return { label: '지난 공연', color: 'grey', theme: 'weak' };
    default:
      return null;
  }
}

/**
 * 공연 카드 정보 줄 — 접두어 없이 호스트명 / 날짜 / 시작~종료 시각 / 장소(plan P10a GUI 문구). 값이 없는 줄은 뺀다(준비중 공연은 대부분 비어 있다).
 * 종료가 다른 날이면 시각 줄에 종료 날짜를 붙인다. 장소는 공연장 이름, 없으면 주소.
 */
export function eventLinesOf(
  event: Pick<MyEvent, 'hostName' | 'startAt' | 'endAt' | 'placeName' | 'placeAddress'>,
): string[] {
  const lines: string[] = [];
  if (event.hostName) lines.push(event.hostName);
  if (event.startAt) {
    lines.push(formatKstKoreanDate(event.startAt));
    const start = formatKstTime(event.startAt);
    if (event.endAt) {
      const sameDay = event.endAt.slice(0, 10) === event.startAt.slice(0, 10);
      const end = sameDay
        ? formatKstTime(event.endAt)
        : `${formatKstKoreanDate(event.endAt)} ${formatKstTime(event.endAt)}`;
      lines.push(`${start}~${end}`);
    } else {
      lines.push(start);
    }
  }
  const place = event.placeName ?? event.placeAddress;
  if (place) lines.push(place);
  return lines;
}

/** 이름을 아직 안 정한 준비중 공연·호스트 */
export const UNNAMED_EVENT = '이름 없는 공연';
export const UNNAMED_HOST = '이름 없는 호스트';

/** 공연 탭 빈 상태(와이어 `487:15070`) · 검색 결과 없음(와이어 `531:12320`·`531:12470`) */
export const EVENTS_EMPTY_TITLE = '두둥! 등록한 공연이 없어요';
export const EVENTS_SEARCH_EMPTY_TITLE = '두둥! 해당하는 공연이 없어요.';
export const HOSTS_SEARCH_EMPTY_TITLE = '두둥! 해당하는 호스트가 없어요.';
