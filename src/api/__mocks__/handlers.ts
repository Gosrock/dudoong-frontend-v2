import { authHandlers } from './auth.handlers';
import { bankHandlers } from './bank.handlers';
import { checkInHandlers } from './check-in.handlers';
import { eventHandlers } from './event.handlers';
import { giftHandlers } from './gift.handlers';
import { hostHandlers } from './host.handlers';
import { meHandlers } from './me.handlers';
import { myTicketHandlers } from './my-ticket.handlers';
import { orderHandlers } from './order.handlers';
import { uploadHandlers } from './upload-handlers';

/**
 * 백엔드 mock 기본 목록. 경로는 브라우저 기준(`/api/v2/...`)과 서버 기준(`http://localhost:8080/...`)을 모두 받는다.
 * Vitest(`server.ts`), e2e·QA 가짜 백엔드(`e2e/support/mock-backend.ts`), `pnpm dev:mock`이 같이 쓴다.
 * 테스트별 응답은 `server.use(...)` / `mockApi.use(...)`로 앞에 끼운다. 데이터는 `fixtures/`, 응답 모양은 `respond.ts`.
 */
export const handlers = [
  ...eventHandlers,
  ...hostHandlers,
  ...giftHandlers.default,
  ...meHandlers.byCookie,
  ...authHandlers.byCookie,
  ...authHandlers.kakao,
  ...uploadHandlers,
  ...orderHandlers.default,
  ...myTicketHandlers.default,
  ...checkInHandlers.default,
  ...bankHandlers.default,
];
