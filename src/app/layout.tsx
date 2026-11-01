import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/ui/theme/global.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: '두둥', template: '%s | 두둥' },
  description: '공연 예매와 호스팅을 한 곳에서',
};

/**
 * 화면 키보드(Android Chrome): `resizes-content` — 키보드가 올라오면 레이아웃 뷰포트가 줄어 하단 고정·sticky 버튼(체크아웃 ·
 * 편집 하단 바)이 키보드 위에 선다. 기본값(`resizes-visual`)은 버튼이 키보드 뒤에 숨는다. iOS Safari는 이 값을 읽지 않는다
 * (이슈 #95 전수조사, tech-decisions §33).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
