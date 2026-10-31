import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { giftLandingQuery } from '@/api/gift/queries';
import { Prefetch } from '@/api/server/Prefetch';
import { serverQuery } from '@/api/server/serverQuery';
import { GiftLandingView } from '@/features/audience/gift/GiftLandingView';
import { giftMetadata, parseGiftToken } from '@/features/audience/gift/model/gift-metadata';

/** 서버 조회 페이지는 페이지마다 instant=false(tech-decisions §2). 이 위에 Suspense·loading.tsx를 두지 않는다(404 상태 코드). */
export const instant = false;

type Props = { params: Promise<{ giftToken: string }> };

async function readToken(params: Props['params']) {
  const token = parseGiftToken((await params).giftToken);
  if (token === null) notFound();
  return token;
}

/**
 * OG — 공연·티켓 요약만(보낸 사람 닉네임 없음), noindex. 없는 토큰은 GG-3 404(`Gift_404_1`) → `notFound()`.
 * 서버 조회는 토큰(쿠키) 없이 익명 값을 받는다. 사용자별 판정은 브라우저의 viewer 쿼리가 한다.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const token = await readToken(params);
  return giftMetadata(await serverQuery(giftLandingQuery(token)));
}

/** 선물 랜딩(plan P8b) — GG-3 공개 값 프리페치 + viewer는 브라우저 */
export default async function GiftLandingPage({ params }: Props) {
  const token = await readToken(params);
  return (
    <Prefetch queries={[giftLandingQuery(token)]}>
      <GiftLandingView giftToken={token} />
    </Prefetch>
  );
}
