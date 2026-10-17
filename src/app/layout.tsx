import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/ui/theme/global.css';

import type { Metadata } from 'next';
import { Saira_Condensed } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from './providers';

// 숫자 전용 폰트(Figma Title_number). Pretendard는 동적 서브셋 CSS로 필요한 글자 조각만 받는다.
const saira = Saira_Condensed({ weight: '700', subsets: ['latin'], variable: '--font-saira' });

export const metadata: Metadata = {
  title: { default: '두둥', template: '%s | 두둥' },
  description: '공연 예매와 호스팅을 한 곳에서',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={saira.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
