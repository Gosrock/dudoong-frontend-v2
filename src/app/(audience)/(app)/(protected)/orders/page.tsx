import { OrdersView } from '@/features/audience/mypage/OrdersView';
import { AudienceSubHeader } from '@/features/audience/shell/AudienceSubHeader';

/** 주문내역(P9, 보호 — v1 `/history`에서 바꿨다). G11/O-2 무한 목록. 조회는 브라우저에서 */
export default function OrdersPage() {
  return (
    <>
      <AudienceSubHeader title="주문내역" />
      <OrdersView />
    </>
  );
}
