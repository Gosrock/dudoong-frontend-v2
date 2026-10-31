// 공개 env를 빌드 때 검증한다. 누락이면 여기서 빌드가 실패한다(tech-decisions §12).
import './src/env/client';

import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
import type { NextConfig } from 'next';

import { contentSecurityPolicy, cspHeaderName } from './src/utils/csp';

const withVanillaExtract = createVanillaExtractPlugin({
  unstable_turbopack: { mode: 'auto' },
});

// 로컬 개발에서만 /api 를 dev API로 넘긴다. 운영은 nginx가 같은 경로를 백엔드로 보낸다(tech-decisions §25).
const devApiOrigin = process.env.DEV_API_ORIGIN;

/**
 * v1 호스트 앱(`/admin/*`) → v2 호스팅 센터(tech-decisions §22 "v1 라우트와 리다이렉트" 표, plan P10a).
 * 표에 있는 경로만 받는다 — 표에 없는 `/admin/*`은 404다. `/admin/kakao/callback`은 받지 않는다(표 — 카카오 `redirect_uri`를
 * `/kakao/callback` 하나로 정리). 307(`permanent: false`): 브라우저가 영구 캐시하지 않게 해 표를 고칠 여지를 둔다.
 * 쿼리는 Next가 그대로 넘긴다.
 */
const adminRedirects = [
  { source: '/admin', destination: '/hosting' },
  { source: '/admin/new/hosts', destination: '/hosting/new/hosts' },
  // v1은 단계가 경로(`/admin/new/events/1`), v2는 `?step=` — 첫 단계로 보낸다
  { source: '/admin/new/events/:step*', destination: '/hosting/new/events' },
  // 호스트 대시보드·공연 목록은 호스트 홈으로, 슬랙·제휴 화면은 없어진다
  {
    source: '/admin/hosts/:hostId/:menu(dashboard|events|slack|alliance)',
    destination: '/hosts/:hostId',
  },
  { source: '/admin/hosts/:hostId/info', destination: '/hosting/hosts/:hostId/settings' },
  { source: '/admin/hosts/:hostId/member', destination: '/hosting/hosts/:hostId/members' },
  {
    source: '/admin/events/:eventId/:menu(dashboard|info|detail|guests|qr)',
    destination: '/hosting/events/:eventId/:menu',
  },
  // 옵션 화면은 티켓 관리 안으로
  {
    source: '/admin/events/:eventId/:menu(tickets|options)/:rest*',
    destination: '/hosting/events/:eventId/tickets',
  },
  { source: '/admin/login', destination: '/login' },
].map((r) => ({ ...r, permanent: false }));

/**
 * CSP(P14 보안, `src/utils/csp.ts`). 기본은 Report-Only — `CSP_ENFORCE=1`로 빌드하면 강제.
 * 다른 보안 헤더(`X-Frame-Options`·HSTS·`Referrer-Policy`)는 nginx가 붙인다(tech-decisions §25 — 앱에서 중복으로 넣지 않는다).
 */
const cspHeader = {
  key: cspHeaderName(process.env.CSP_ENFORCE === '1'),
  value: contentSecurityPolicy({ dev: process.env.NODE_ENV === 'development' }),
};

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // 배포 사이 버전 불일치를 감지해 하드 내비게이션으로 넘긴다(deploy-plan §3).
  deploymentId: process.env.GIT_SHA,
  async headers() {
    return [{ source: '/:path*', headers: [cspHeader] }];
  },
  async redirects() {
    return [
      // 공연 관리 주소는 대시보드로(tech-decisions §3 — 페이지 파일을 두지 않는다)
      {
        source: '/hosting/events/:eventId',
        destination: '/hosting/events/:eventId/dashboard',
        permanent: false,
      },
      ...adminRedirects,
    ];
  },
  async rewrites() {
    // v1과 같은 약관 경로(tech-decisions §22 "그대로")
    const legal = [
      { source: '/meta/term', destination: '/term.html' },
      { source: '/meta/privacy', destination: '/privacy.html' },
    ];
    if (process.env.NODE_ENV !== 'development' || !devApiOrigin) return legal;
    return [...legal, { source: '/api/:path*', destination: `${devApiOrigin}/api/:path*` }];
  },
};

export default withVanillaExtract(nextConfig);
