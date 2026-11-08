import localFont from 'next/font/local';

/**
 * 표시 글꼴 — 넥슨 카트 고딕(Figma `Kartrider Kor`) ExtraBold 한 굵기. 코드에서 이 글꼴을 쓰는 곳은 `title`(800)과
 * ConcertCard 제목(800)뿐이다(design-system §1).
 *
 * - 파일은 넥슨 공식 배포 zip(`brand.nexon.com/resources/NEXON_Kart_Gothic.zip`)의 `OTF/Kor` 파일 그대로다 — 라이선스가
 *   "임의로 수정·편집하여 재배포 금지"라 woff2 변환·서브셋을 하지 않는다(`src/ui/fonts/kartrider/LICENSE.md`).
 * - `preload: false` — 루트 레이아웃에서 부르면 모든 라우트가 1.4MB를 미리 받는다. 미리 받지 않으면 브라우저는 이 글꼴로
 *   그릴 글자가 화면에 나올 때만 받는다(공연 카드 · 제목이 없는 화면은 받지 않음).
 * - `adjustFontFallback: false` — 기본값은 Arial 대체 글꼴을 끼워 넣는데, 한글은 Arial에 없어 시스템 글꼴로 그려진다.
 *   대체는 `tokens.css.ts` 스택의 Pretendard가 맡는다.
 */
export const kartrider = localFont({
  src: '../fonts/kartrider/NEXON Kart Gothic Kor OTF ExtraBold.otf',
  weight: '800',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-kartrider',
});
