// 공개 env를 빌드 때 검증한다. 누락이면 여기서 빌드가 실패한다(tech-decisions §12).
import './src/env/client';

import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
import type { NextConfig } from 'next';

const withVanillaExtract = createVanillaExtractPlugin({
  unstable_turbopack: { mode: 'auto' },
});

// 로컬 개발에서만 /api 를 dev API로 넘긴다. 운영은 nginx가 같은 경로를 백엔드로 보낸다(tech-decisions §25).
const devApiOrigin = process.env.DEV_API_ORIGIN;

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // 배포 사이 버전 불일치를 감지해 하드 내비게이션으로 넘긴다(deploy-plan §3).
  deploymentId: process.env.GIT_SHA,
  async redirects() {
    // `/admin/*` 경로별 리다이렉트(tech-decisions §22 표)는 P10a에서 넣는다.
    return [
      {
        source: '/hosting/events/:eventId',
        destination: '/hosting/events/:eventId/dashboard',
        permanent: false,
      },
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
