import { isCreatedParam } from '@/features/audience/checkout/model/order-result';
import { OrderCompleteView } from '@/features/audience/checkout/OrderCompleteView';

/**
 * 주문 상세(P9) · 주문 완료(P7, `?created=1`). 지금은 주문 완료에 필요한 만큼만 그린다.
 * G11/O-3은 브라우저에서 읽는다(생성 직후에는 체크아웃이 넣어 둔 캐시).
 */
export default async function OrderPage({
  params,
  searchParams,
}: PageProps<'/orders/[orderUuid]'>) {
  const { orderUuid } = await params;
  const { created } = await searchParams;
  return <OrderCompleteView orderUuid={orderUuid} created={isCreatedParam(created)} />;
}
