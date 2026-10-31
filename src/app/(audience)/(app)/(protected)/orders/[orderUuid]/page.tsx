import { isCreatedParam } from '@/features/audience/checkout/model/order-result';
import { OrderCompleteView } from '@/features/audience/checkout/OrderCompleteView';
import { OrderDetailView } from '@/features/audience/mypage/OrderDetailView';

/**
 * 주문상세(P9) · 주문 완료(P7, `?created=1`). G11/O-3은 브라우저에서 읽는다(생성 직후에는 체크아웃이 넣어 둔 캐시).
 * 남의 주문·없는 주문은 두 화면 모두 공용 404 안내다.
 */
export default async function OrderPage({
  params,
  searchParams,
}: PageProps<'/orders/[orderUuid]'>) {
  const { orderUuid } = await params;
  const { created } = await searchParams;
  return isCreatedParam(created) ? (
    <OrderCompleteView orderUuid={orderUuid} created />
  ) : (
    <OrderDetailView orderUuid={orderUuid} />
  );
}
