import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { requestOrigin } from '@/api/server/request-origin';
import { DEFAULT_OG_IMAGE } from '@/utils/site';

/**
 * 서버 조회 그룹. 캐시하지 않는 데이터를 기다리므로 빈 정적 셸·즉시 이동 검증에서 뺀다(tech-decisions §2).
 * 레이아웃의 false는 밖에서 이 그룹으로 들어오는 이동만 허용한다. 그룹 안 페이지끼리의 이동은
 * 각 page.tsx의 `instant = false`가 맡는다(P0 스파이크에서 확인).
 * 이 그룹에는 Suspense·loading.tsx를 두지 않는다(404 상태 코드 유지).
 */
export const instant = false;

/**
 * 공유·검색되는 공개 화면의 공통 메타(이슈 #8).
 * - `metadataBase`: 요청 origin(`requestOrigin` — 사이트 origin은 값으로 두지 않는다, tech-decisions §12). 요청 시점 값이라
 *   루트 레이아웃이 아니라 여기에 둔다 — 루트에서 `headers()`를 읽으면 정적으로 프리렌더되는 화면(호스팅 센터 등)의
 *   메타데이터까지 요청 시점으로 미뤄져 Cache Components가 빌드를 막는다. 이 그룹은 페이지마다 이미 요청 시점 조회다.
 * - 기본 OG 이미지(`DEFAULT_OG_IMAGE`, 디자인 대기 — `null`이면 넣지 않는다). 공연 상세는 `openGraph`를 통째로 덮어써서
 *   `eventMetadata`가 포스터가 없을 때 같은 값을 넣는다.
 * - 검색엔진 소유 확인 메타(서치 콘솔·네이버 서치어드바이저). 런타임 환경변수 — 비어 있으면 넣지 않는다.
 *   스테이징과 운영이 같은 이미지를 쓰므로 빌드 때 굽지 않는다(deploy-plan §4).
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = await requestOrigin();
  const google = process.env.GOOGLE_SITE_VERIFICATION;
  const naver = process.env.NAVER_SITE_VERIFICATION;
  return {
    metadataBase: new URL(origin),
    ...(DEFAULT_OG_IMAGE && {
      openGraph: { images: [{ url: DEFAULT_OG_IMAGE }] },
      twitter: { card: 'summary_large_image' },
    }),
    ...((google || naver) && {
      verification: {
        ...(google && { google }),
        ...(naver && { other: { 'naver-site-verification': naver } }),
      },
    }),
  };
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
