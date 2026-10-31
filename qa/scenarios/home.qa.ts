import { KAKAO_SCRAP_UA } from '../../e2e/support/env';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 공연홈 `/` — P5a-L에서 GP-1(최소 마크업)로 바꿨다. 화면 캡처 시나리오는 P5a-V에서 다시 쓴다.
 * 근거: plan P0 산출물 A·B·P5a, tech-decisions §2·§31(상태 코드 표), api-contract GP-1.
 */

scenario(
  'HOME-1',
  '다가오는 공연이 보인다',
  {
    kind: '정상',
    summary:
      '서버가 <Prefetch>로 GP-1을 조회해 HTML에 넣고, 브라우저는 같은 쿼리를 캐시에서 읽어 다시 부르지 않는다.',
    basis: ['plan P5a', 'tech-decisions §31', 'api-contract GP-1'],
  },
  async ({ page, mockApi, step, note }) => {
    await step('공연홈에 들어가면 200으로 열린다', async () => {
      const res = await page.goto('/');
      expect(res?.status()).toBe(200);
    });
    await step('공연 카드 링크와 공연 둘러보기 링크가 보인다', async () => {
      await expect(page.getByRole('link', { name: '고스락 제37회 정기공연' })).toBeVisible();
      await expect(page.getByRole('link', { name: '공연 둘러보기' })).toBeVisible();
    });
    await step(
      'GP-1은 서버에서 한 번만 불리고 브라우저는 다시 부르지 않는다',
      async () => {
        const calls = mockApi.calls().filter((c) => c.path.startsWith('/api/v2/home'));
        await note(`받은 GP-1 호출: ${calls.map((c) => `${c.from} ${c.status}`).join(', ')}`);
        expect(calls.map((c) => c.from)).toEqual(['server']);
      },
      { capture: false },
    );
  },
);

scenario(
  'HOME-2',
  '공연이 하나도 없으면 빈 문구가 보인다',
  {
    kind: '빈 상태',
    summary: '빈 배열 응답에서도 200으로 열리고 깨지지 않는다. 빈 상태 모양은 P5a-V에서 정한다.',
    basis: ['api-contract GP-1', 'plan P5a'],
    mocks: [http.get('*/api/v2/home', () => HttpResponse.json(envelope.ok({ events: [] })))],
  },
  async ({ page, step }) => {
    await step('공연홈에 들어가면 200으로 열린다', async () => {
      const res = await page.goto('/');
      expect(res?.status()).toBe(200);
    });
    await step('빈 문구가 보인다', async () => {
      await expect(page.getByText('예정된 공연이 없어요.')).toBeVisible();
    });
  },
);

scenario(
  'HOME-3',
  '백엔드가 500이면 크롤러는 500, 브라우저는 200 + 에러 화면',
  {
    kind: '에러',
    summary:
      '(public)에는 Suspense가 없어 카카오 크롤러가 상태 코드를 그대로 받는다(잘못된 미리보기를 캐시하지 않게). 브라우저는 스트리밍이라 200이고 에러 화면이 그려진다. error.tsx는 P5a 범위라 지금은 Next 기본 화면이다.',
    basis: ['tech-decisions §31 상태 코드 표', 'plan P0 산출물 B-3', 'patterns §11'],
    mocks: [
      http.get('*/api/v2/home', () =>
        HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 }),
      ),
    ],
  },
  async ({ page, request, step, note }) => {
    await step(
      '카카오 스크랩 UA로 요청하면 500을 받는다',
      async () => {
        const res = await request.get('/', { headers: { 'User-Agent': KAKAO_SCRAP_UA } });
        await note(`카카오 UA 응답: ${res.status()}`);
        expect(res.status()).toBe(500);
      },
      { capture: false },
    );
    await step('브라우저로 들어가면 200이다', async () => {
      const res = await page.goto('/');
      await note(`브라우저 응답: ${res?.status()}`);
      expect(res?.status()).toBe(200);
    });
    await step('공연 목록 대신 에러 화면이 보인다', async () => {
      await expect(page.getByRole('link', { name: '공연 둘러보기' })).toHaveCount(0);
      // Next 기본 에러 화면. P5a에서 error.tsx가 생기면 그 문구로 바꾼다
      await expect(page.getByText(/couldn.t load/)).toBeVisible();
    });
  },
);

scenario.manual('HOME-4', '카카오톡 인앱 브라우저에서 공연홈이 열린다', {
  kind: '반응형',
  basis: ['README 실제 환경에서 확인할 것', 'plan P4b'],
  how: '스테이징 배포 뒤(P4b) 실기기 카카오톡에서 링크를 연다. 가짜 백엔드로는 인앱 WebView를 재현할 수 없다.',
});
