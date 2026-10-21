/**
 * 선물 랜딩 fixture(GG-3). 값은 티켓 저장소(`fixtures/my-ticket.ts`)에서 만든다 — 보내기·수락·거절·회수가 랜딩에 그대로 보인다.
 * 토큰 이름은 `GIFT_TOKEN`. 대기 중(PENDING)이 아니면 `senderName`·`event`·`ticket`이 null이다.
 */
export { GIFT_TOKEN, giftLanding, MISSING_GIFT_TOKEN } from './my-ticket';
