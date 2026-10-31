import { notFound } from 'next/navigation';

import { CheckoutView } from '@/features/audience/checkout/CheckoutView';
import { parseCheckoutParams } from '@/features/audience/checkout/model/checkout-params';

/**
 * 체크아웃(P7, 보호). 상세에서 고른 티켓은 `?ticketItemId=&quantity=`로 온다(tech-decisions §3).
 * 조회(G11/O-0)는 브라우저에서 한다 — 게이트가 세션을 확정한 뒤에 화면이 그려진다.
 * 주소의 선택이 틀리면 화면이 공연 상세로 돌려보낸다.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<'/events/[eventId]/checkout'>) {
  const { eventId } = await params;
  if (!/^[1-9]\d*$/.test(eventId)) notFound();
  return (
    <CheckoutView eventId={Number(eventId)} params={parseCheckoutParams(await searchParams)} />
  );
}
