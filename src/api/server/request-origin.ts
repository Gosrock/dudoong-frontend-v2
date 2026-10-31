import 'server-only';

import { headers } from 'next/headers';

const HOST = /^[A-Za-z0-9.-]+(:\d{1,5})?$|^\[[0-9A-Fa-f:.]+\](:\d{1,5})?$/;
const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?$/;

/**
 * 이 요청의 사이트 origin(OG `og:url`·canonical용). 값으로 두지 않고 요청의 `Host`로 만든다(tech-decisions §12).
 * 운영 nginx는 TLS를 끝내고 `X-Forwarded-Host`를 지운다(§25) — 그래서 `Host`를 쓰고, 스킴은 `X-Forwarded-Proto`가 있으면
 * 그 값, 없으면 루프백은 http·그 밖은 https로 본다.
 * 주의: nginx가 `proxy_set_header Host $host`를 하지 않으면 `127.0.0.1:3000`이 온다 — 스테이징(D2)에서 확인한다.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const rawHost = h.get('host') ?? '';
  const host = HOST.test(rawHost) ? rawHost : 'localhost';
  const forwarded = h.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto =
    forwarded === 'http' || forwarded === 'https'
      ? forwarded
      : LOOPBACK.test(host)
        ? 'http'
        : 'https';
  return `${proto}://${host}`;
}
