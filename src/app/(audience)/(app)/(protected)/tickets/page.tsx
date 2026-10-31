import { TicketTabView } from '@/features/audience/ticket/TicketTabView';

/** 티켓탭(P8, 보호). 조회(G11/T-1 · T-3)는 브라우저에서 — 게이트가 세션을 확정한 뒤. 카드·QR·전체화면은 화면 안 상태 */
export default function TicketsPage() {
  return <TicketTabView />;
}
