import { style } from '@vanilla-extract/css';

/**
 * 결과 화면이 떠 있는 동안 티켓탭 본문을 언마운트하지 않고 숨긴다 — 캐러셀(`useSnapCarousel`)의 스크롤 감시가
 * 같은 요소에 남아야 돌아왔을 때 넘기기가 동작한다. 보일 때는 감싼 div가 배치에 끼지 않게 `contents`.
 */
export const tabBody = style({
  display: 'contents',
  selectors: { '&[hidden]': { display: 'none' } },
});
