import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { type ReactElement, type ReactNode, Suspense } from 'react';

/**
 * 테스트마다 새 QueryClient. 재시도를 끄고(에러 분기를 바로 본다) 캐시를 테스트 사이에 넘기지 않는다.
 * 앱의 기본 옵션(`src/api/query-client.ts`)과 다른 점은 retry뿐이다.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
}

type Options = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
  /** useSuspenseQuery를 쓰는 화면용 대기 표시. 기본은 `불러오는 중` 글자. */
  suspenseFallback?: ReactNode;
};

/**
 * 컴포넌트 + 쿼리 + MSW 통합 테스트용 렌더. 루트 `Providers`(src/app/providers.tsx)와 같은 두 가지
 * (QueryClientProvider, OverlayProvider)를 감싼다. 백엔드 응답은 MSW(`server.use`)로 바꾼다.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const {
    queryClient = createTestQueryClient(),
    suspenseFallback = '불러오는 중',
    ...rest
  } = options;
  const user = userEvent.setup();
  const result = render(ui, {
    ...rest,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <OverlayProvider>
          <Suspense fallback={suspenseFallback}>{children}</Suspense>
        </OverlayProvider>
      </QueryClientProvider>
    ),
  });
  return { ...result, queryClient, user };
}
