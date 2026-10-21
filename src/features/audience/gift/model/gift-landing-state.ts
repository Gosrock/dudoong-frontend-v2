import type { GiftViewState } from '@/api/gift/schema';

/**
 * 선물 랜딩 `viewState` 7종 + UNKNOWN → 화면 상태(patterns §18, tech-decisions §20).
 * Figma에는 AVAILABLE(`128:1784`)·CANCELED(`128:1811`)만 있어 나머지 5종은 design-requests §1 기본안
 * "상태마다 안내 문구 한 줄 + 티켓탭으로 가는 버튼, `OWN_LINK`·`EXPIRED`에서 보낸 사람이면 [선물 회수]"를 따른다.
 */

/** 화면이 둘 버튼. `ACCEPT`·`REJECT`는 AVAILABLE에만, `CANCEL_GIFT`는 보낸 사람(`giftId` 있음)에게만 */
export type GiftLandingAction = 'ACCEPT' | 'REJECT' | 'CANCEL_GIFT' | 'GO_TICKETS';

export type GiftLandingScreen = {
  viewState: GiftViewState;
  title: string;
  description: string | null;
  /** 공연·티켓 요약을 그리는지(서버는 대기 중일 때만 요약을 준다) */
  showSummary: boolean;
  actions: GiftLandingAction[];
};

export type GiftLandingViewer = {
  /** ALREADY_ACCEPTED일 때 보는 사람이 받은 본인인지 */
  isReceiver: boolean;
  /** 보는 사람이 보낸 사람이면 선물 id(회수) */
  giftId: number | null;
};

export function giftLandingScreen(
  viewState: GiftViewState,
  { isReceiver, giftId }: GiftLandingViewer,
): GiftLandingScreen {
  const sender = giftId !== null;
  const base = { viewState, showSummary: false, description: null };
  switch (viewState) {
    case 'AVAILABLE':
      return {
        ...base,
        title: '티켓 선물이 도착했어요',
        showSummary: true,
        actions: ['ACCEPT', 'REJECT'],
      };
    case 'ALREADY_ACCEPTED':
      return isReceiver
        ? {
            ...base,
            title: '이미 받은 선물이에요',
            description: '티켓탭에서 티켓을 확인해 주세요',
            actions: ['GO_TICKETS'],
          }
        : { ...base, title: '이미 다른 분이 받은 선물이에요', actions: ['GO_TICKETS'] };
    case 'REJECTED':
      return { ...base, title: '거절한 선물이에요', actions: ['GO_TICKETS'] };
    case 'RETURNED':
      return { ...base, title: '보낸 분에게 돌려준 선물이에요', actions: ['GO_TICKETS'] };
    case 'CANCELED':
      return {
        ...base,
        title: '취소된 선물이에요',
        description: '보낸 분이 선물을 취소했어요',
        actions: ['GO_TICKETS'],
      };
    case 'OWN_LINK':
      return {
        ...base,
        title: '내가 보낸 선물 링크예요',
        description: '받을 분에게 링크를 보내 주세요. 선물을 취소하면 링크를 쓸 수 없어요',
        showSummary: true,
        actions: sender ? ['CANCEL_GIFT', 'GO_TICKETS'] : ['GO_TICKETS'],
      };
    case 'EXPIRED':
      return sender
        ? {
            ...base,
            title: '공연이 끝나 받을 수 없는 선물이에요',
            description: '선물을 회수하면 티켓이 돌아와요',
            showSummary: true,
            actions: ['CANCEL_GIFT', 'GO_TICKETS'],
          }
        : {
            ...base,
            title: '공연이 끝나 받을 수 없는 선물이에요',
            showSummary: true,
            actions: ['GO_TICKETS'],
          };
    default:
      return {
        ...base,
        title: '선물 상태를 확인할 수 없어요',
        description: '잠시 후 다시 열어 주세요',
        actions: ['GO_TICKETS'],
      };
  }
}
