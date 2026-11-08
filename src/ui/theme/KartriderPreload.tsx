'use client';

// 같은 파일을 asset으로 가져오면 next/font(`fonts.ts`)가 내보낸 것과 같은 URL(`/_next/static/media/…<해시>.otf`)이 나온다 —
// Turbopack이 한 모듈로 묶어 파일은 한 벌이다(`next.config.ts` `turbopack.rules`). 빌드 해시를 손으로 적지 않는다.
import kartriderUrl from '../fonts/kartrider/NEXON Kart Gothic Kor OTF ExtraBold.otf';

/**
 * 카트라이더체(1.4MB)를 이 라우트에서만 미리 받는다 — 공연 카드(`ConcertCard`)가 첫 화면에 있는 라우트의 page가 그린다
 * (`/` · `/events` · `/hosts/[hostId]`, design-system §1). React가 `<head>`로 올린다.
 *
 * - `fonts.ts`의 `preload: true`를 쓰지 않는 이유: next/font는 "폰트 함수를 부른 파일" 범위로 미리 받는데(설치본 `font.md`
 *   Preloading), `--font-kartrider`는 모든 화면(`title` 프리셋)에 있어야 해 루트 레이아웃이 부른다 → 모든 라우트가 미리 받는다.
 *   라우트마다 `localFont`를 따로 부르면 @font-face와 파일(`.p.otf`)이 두 벌 생긴다. 그래서 정의는 하나(`preload: false`)로 둔다.
 * - `ReactDOM.preload()`나 서버 컴포넌트의 `<link>`를 쓰지 않는 이유: 둘 다 RSC 응답에 힌트(`HL`)로 실려, 셸 링크가
 *   `/events`를 prefetch하기만 해도 지금 화면(공지 등)에서 1.4MB를 받는다. 클라이언트 컴포넌트면 RSC에는 참조만 실리고,
 *   `<link>`는 SSR HTML과 실제로 그 페이지를 그릴 때만 들어간다.
 * - `crossOrigin=""` — 글꼴은 CORS 모드로 받으므로 preload도 같아야 같은 요청을 다시 쓴다(next/font가 거는 것과 같다).
 * - `useSearchParams`로 CSR로 넘어가는 Suspense 경계 안에 두면 HTML에 실리지 않는다 — 경계 바깥에 둔다.
 */
export function KartriderPreload() {
  return (
    <link
      rel="preload"
      href={kartriderUrl.replaceAll(' ', '%20')}
      as="font"
      type="font/otf"
      crossOrigin=""
    />
  );
}
