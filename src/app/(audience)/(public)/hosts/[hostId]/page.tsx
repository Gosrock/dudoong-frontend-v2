import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { hostDetailQuery } from '@/api/host/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { serverQuery } from '@/api/server/serverQuery';
import { HostHomeView } from '@/features/shared/host-home/HostHomeView';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';

/** 서버 조회 페이지는 페이지마다 instant=false를 둔다(tech-decisions §2). 이 위에 Suspense·loading.tsx를 두지 않는다(404 상태 코드). */
export const instant = false;

type Props = { params: Promise<{ hostId: string }> };

async function readHostId(params: Props['params']) {
  const hostId = parseHostIdParam((await params).hostId);
  if (hostId === null) notFound();
  return hostId;
}

/** 탭 제목만 둔다. 같은 요청 QueryClient라 GH-3 조회는 한 번이다. 없는 호스트는 `notFound()` */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const host = await serverQuery(hostDetailQuery(await readHostId(params)));
  return { title: host.name ?? '호스트' };
}

/**
 * 호스트 홈(GH-3 공개 값만 서버에서, 토큰 없이). 사용자별 값(`myRole`·`isFollowing`)과 공연 목록(GH-14)·멤버(GH-6)는
 * 브라우저에서 읽는다(tech-decisions §4, plan P5c).
 */
export default async function HostHomePage({ params }: Props) {
  const hostId = await readHostId(params);
  return (
    <Prefetch queries={[hostDetailQuery(hostId)]}>
      <HostHomeView hostId={hostId} />
    </Prefetch>
  );
}
