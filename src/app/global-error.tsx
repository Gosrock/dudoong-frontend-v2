'use client';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/ui/theme/global.css';

import { RouteErrorView } from '@/ui/components/RouteErrorView/RouteErrorView';
import { Container } from '@/ui/primitives/Container';

/**
 * 루트 레이아웃·`Providers`에서 난 오류(tech-decisions §13, 코드 패턴 점검 A5). 활성이면 루트 레이아웃을 **대신**하므로 `<html>`·`<body>`와
 * 전역 스타일·글꼴을 스스로 둔다(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` "Global Error").
 * `metadata`를 쓸 수 없어 React `<title>`로. 셸·쿼리·오버레이가 없는 맨 화면이다 — [다시 시도]만.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <title>오류 | 두둥</title>
        <Container as="main">
          <RouteErrorView retry={retry} />
        </Container>
      </body>
    </html>
  );
}
