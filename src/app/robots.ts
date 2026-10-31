import type { MetadataRoute } from 'next';

import { requestOrigin } from '@/api/server/request-origin';

/**
 * `/robots.txt`(이슈 #8). 공개 화면(공연홈·공연·호스트 홈·공지)은 허용하고 로그인 뒤 화면은 막는다.
 * AI 크롤러도 같은 규칙으로 허용한다 — 이름이 맞는 그룹이 있으면 크롤러는 `*` 그룹을 보지 않으므로 같은 규칙을 한 번 더 쓴다.
 * 공연 하위의 주문서(`/events/{id}/checkout`)와 API(`/api/`)도 막는다(Claude 판단 — implementation-log 이슈 #8).
 * sitemap 주소는 요청 origin(tech-decisions §12)이라 요청마다 만든다.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'PerplexityBot',
  'ClaudeBot',
  'Google-Extended',
] as const;

const DISALLOWED_PATHS = [
  '/hosting',
  '/mypage',
  '/orders',
  '/tickets',
  '/check-in',
  '/gate-check',
  '/kakao',
  '/login',
  '/gifts',
  '/events/*/checkout',
  '/api/',
] as const;

const ALLOWED_PATHS = ['/', '/events/', '/hosts/', '/notices/'];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestOrigin();
  const rule = { allow: ALLOWED_PATHS, disallow: [...DISALLOWED_PATHS] };
  return {
    rules: [
      { userAgent: '*', ...rule },
      { userAgent: [...AI_CRAWLERS], ...rule },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
