import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AudienceSubHeader } from '@/features/audience/shell/AudienceSubHeader';
import { HostEventsListView } from '@/features/shared/host-home/HostEventsListView';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';

export const metadata: Metadata = { title: '공연 리스트' };

type Props = { params: Promise<{ hostId: string }> };

/**
 * 호스트 공연 리스트(Design Sync #262 — GUI `1423:2651` · `1478:8878`). 게이트 없는 `(app)` 화면 — 무한 목록이라 서버에서
 * 조회하지 않고 브라우저 `useInfiniteQuery`로만 읽는다(GH-14, patterns §12 — 공지사항 목록과 같다). 숫자가 아닌 id는 404.
 */
export default async function HostEventsPage({ params }: Props) {
  const hostId = parseHostIdParam((await params).hostId);
  if (hostId === null) notFound();
  return (
    <>
      <AudienceSubHeader title="공연 리스트" align="start" fallbackHref={`/hosts/${hostId}`} />
      <HostEventsListView hostId={hostId} />
    </>
  );
}
