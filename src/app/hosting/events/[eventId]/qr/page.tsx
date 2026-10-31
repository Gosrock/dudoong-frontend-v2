import { QrCheckInView } from '@/features/hosting/qr/QrCheckInView';

/** QR 체크인(P13b — GQ-1 · PQ-2 · GQ-4). 조회는 브라우저에서만 — 공연 스코프 레이아웃이 GE-3·접근을 먼저 판정한다 */
export default async function EventQrCheckInPage({
  params,
}: PageProps<'/hosting/events/[eventId]/qr'>) {
  const { eventId } = await params;
  return <QrCheckInView eventId={eventId} />;
}
