// 공개 env를 빌드 때 검증한다. 누락이면 여기서 빌드가 실패한다(tech-decisions §12).
import './src/env/client';

import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
import type { NextConfig } from 'next';

import { contentSecurityPolicy, cspHeaderName } from './src/utils/csp';
import { HTML_LIMITED_BOTS } from './src/utils/html-limited-bots';
import { UPLOAD_IMAGE_ORIGIN } from './src/utils/image';

const withVanillaExtract = createVanillaExtractPlugin({
  unstable_turbopack: { mode: 'auto' },
});

// 로컬 개발에서만 /api 를 dev API로 넘긴다. 운영은 nginx가 같은 경로를 백엔드로 보낸다(tech-decisions §25).
const devApiOrigin = process.env.DEV_API_ORIGIN;

/**
 * v1 호스트 앱(`/admin/*`) → v2 호스팅 센터(tech-decisions §22 "v1 라우트와 리다이렉트" 표, plan P10a).
 * 표에 있는 경로만 받는다 — 표에 없는 `/admin/*`은 404다. `/admin/kakao/callback`은 받지 않는다(표 — 카카오 `redirect_uri`를
 * `/kakao/callback` 하나로 정리). 영구(`permanent: true` → **308**, P15 URL 연속성): 검색엔진이 옛 주소를 새 주소로 옮기고
 * 브라우저가 기억한다. 301이 아니라 308인 이유는 implementation-log "P15 — 컷오버 준비"(설치본 redirects.md — 308은 메서드를
 * 지키고, 검색엔진은 301과 같게 다룬다). 표를 고치면 이미 기억한 브라우저는 옛 목적지로 간다 — 목적지는 지우지 말고 v2 안에서 다시 보낸다.
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
].map((r) => ({ ...r, permanent: true }));

/**
 * v1 관객 앱 주소 → v2(tech-decisions §22 표 — P14 레거시 URL). 표의 "그대로"인 주소(`/events/:id`·`/mypage`·`/login`·
 * `/login/expired`·`/kakao/callback`·`/meta/*`)는 v2 라우트·rewrite가 그대로 받는다. 308(영구)은 `/admin/*`과 같은 이유(P15).
 * PG 결과 주소(`/pay/*`)는 v1의 결제 복귀에서만 생겼고 v2에는 PG가 없다 — 주문내역으로 보낸다(쿼리는 Next가 넘기지만 읽지 않는다).
 */
const audienceRedirects = [
  { source: '/home', destination: '/' },
  { source: '/events/:eventId/book/:step(option|order)', destination: '/events/:eventId' },
  { source: '/pay/:result(confirm|success|fail)', destination: '/orders' },
  { source: '/history', destination: '/orders' },
  // 쿠폰 화면은 없어졌다 — `/history/:orderId`보다 먼저 맞아야 한다
  { source: '/history/mycoupon', destination: '/mypage' },
  // v1 `orderId`도 주문 uuid라 값을 그대로 넘긴다
  { source: '/history/:orderUuid', destination: '/orders/:orderUuid' },
  // v1 `/ticket/:id`의 `id`는 주문 uuid라 티켓탭 하나로 받는다(묶음 카드가 주문 단위)
  { source: '/ticket/:rest*', destination: '/tickets' },
].map((r) => ({ ...r, permanent: true }));

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
  // 크롤러는 셸 없이 끝까지 렌더해 없는 공연이 404 상태 코드를 받는다(이슈 #90, src/utils/html-limited-bots.ts). 브라우저는 셸(200 + noindex)
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // 배포 사이 버전 불일치를 감지해 하드 내비게이션으로 넘긴다(deploy-plan §3).
  deploymentId: process.env.GIT_SHA,
  /**
   * 포스터 · 커버 최적화(P15, `src/ui/components/UploadedImage`). 업로드 출처 하나만 받는다(deploy-plan §3 — `/_next/image` 차단을
   * 푸는 조건). SVG는 받지 않는다(`dangerouslyAllowSVG` 기본 false), 형식은 기본 webp만(AVIF 끔 — 기본값).
   * 운영 nginx의 `/_next/image` 차단은 컷오버 때 지운다(deploy-plan §6 9번, cutover-runbook).
   */
  images: {
    remotePatterns: [new URL(`${UPLOAD_IMAGE_ORIGIN}/**`)],
    qualities: [75],
    // 업로드 키에 uuid가 들어 있어 같은 주소의 그림이 바뀌지 않는다 — 오래 둔다(배포하면 컨테이너 캐시는 어차피 비워진다)
    minimumCacheTTL: 2678400,
    // 업로드 출처는 리다이렉트하지 않는다 — 리다이렉트 목적지는 remotePatterns 검사를 받지 않으므로 따라가지 않는다(설치본 image.md)
    maximumRedirects: 0,
  },
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
      // 알림함은 마이페이지 아래(`/mypage/notifications`) — 짐작으로 치는 `/notifications`는 404였다(스테이징 QA #106 §2).
      // 임시(307): v1에 없던 주소라 검색엔진·브라우저에 기억시킬 이유가 없고, 나중에 알림함 자리를 옮겨도 되돌리기 쉽다
      { source: '/notifications', destination: '/mypage/notifications', permanent: false },
      ...adminRedirects,
      ...audienceRedirects,
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
