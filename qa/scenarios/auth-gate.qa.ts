import { type MockSession, readSessionFlag, setMockSession } from '../../e2e/support/auth';
import type { ApiCall } from '../../e2e/support/mock-backend';
import { expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 세션 · 401 처리 · 로그인 게이트(plan P4a). 보호 화면은 임시 라우트 `/gate-check`(실제 보호 화면이 생기면 옮긴다).
 * 근거: plan P4a 완료 기준, tech-decisions §4 인증 표, patterns §5-1, api-contract §1·§9.
 *
 * 범주 검토
 * - 빈 상태: 해당 없음(게이트에는 빈 상태가 없다)
 * - 크롤러: 보호 화면은 (protected)라 서버 조회가 없고, 공개 화면 크롤러 동작은 home.qa.ts가 본다
 * - 익명 사용자별 버튼(♡·선물 수락 → 요청 없이 로그인): 그 버튼을 쓰는 화면이 아직 없어(P5c·P8b) Vitest
 *   (`src/features/shared/auth/session.test.tsx`)로만 확인한다
 * - 로그인·만료 화면 자체: P4b. 지금은 자리표시 화면이라 주소만 본다
 */

const meCalls = (calls: ApiCall[]) => calls.filter((c) => c.path.startsWith('/api/v2/me'));
const refreshCalls = (calls: ApiCall[]) =>
  calls.filter((c) => c.path.startsWith('/api/v1/auth/token/refresh'));
const describeCalls = (calls: ApiCall[]) =>
  calls.map((c) => `${c.from} ${c.method} ${c.path} → ${c.status}`).join(', ') || '(없음)';

scenario(
  'AUTH-1',
  '로그인 상태로 보호 화면에 들어가면 게이트를 지나 화면이 보인다',
  {
    kind: '정상',
    summary:
      '게이트가 GM-1로 세션을 확정한 뒤에 children을 그린다. 서버는 GM-1을 부르지 않고(쿠키로 막지 않는다), 브라우저가 한 번 부른다.',
    basis: ['plan P4a 완료 기준 1·3', 'tech-decisions §4 인증 표 "게이트"', 'tech-decisions §25'],
  },
  async ({ page, mockApi, step, note }) => {
    await setMockSession(page, 'loggedIn');
    await step('보호 화면을 열면 로그인한 사용자 이름이 보인다', async () => {
      await page.goto('/gate-check');
      await expect(page.getByRole('heading', { name: '보호 화면 확인' })).toBeVisible();
      await expect(page.getByText('두둥이님으로 로그인했어요.')).toBeVisible();
      await expect(page).toHaveURL(/\/gate-check$/);
    });
    await step(
      'GM-1은 브라우저에서 한 번만, 서버에서는 0번 불린다',
      async () => {
        const calls = meCalls(mockApi.calls());
        await note(`GM-1 호출: ${describeCalls(calls)}`);
        expect(calls.map((c) => `${c.from} ${c.status}`)).toEqual(['browser 200']);
      },
      { capture: false },
    );
  },
);

scenario(
  'AUTH-2',
  '비로그인으로 보호 화면에 들어가면 재발급 없이 /login?redirect= 로 간다',
  {
    kind: '권한',
    summary:
      '세션 표시(dd:session)가 없으면 401에도 재발급을 시도하지 않는다. 게이트는 /login/expired가 아니라 항상 /login으로 보낸다. redirect 값은 같은 출처 상대 경로라 검증을 통과한다.',
    basis: ['plan P4a 완료 기준 1·2·3', 'tech-decisions §4 인증 표', 'patterns §5-1'],
  },
  async ({ page, mockApi, step, note }) => {
    await setMockSession(page, 'anonymous');
    await step('보호 화면을 열면 로그인 화면(자리표시)으로 바뀐다', async () => {
      await page.goto('/gate-check');
      await expect(page).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
      await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    });
    await step(
      '재발급 요청은 0건, GM-1은 401 한 번뿐이다',
      async () => {
        const calls = mockApi.calls();
        await note(`받은 API 호출: ${describeCalls(calls)}`);
        expect(refreshCalls(calls)).toHaveLength(0);
        expect(meCalls(calls).map((c) => `${c.from} ${c.status}`)).toEqual(['browser 401']);
      },
      { capture: false },
    );
  },
);

scenario(
  'AUTH-3',
  '만료 상태(재발급 성공)로 보호 화면에 들어가면 재발급 뒤 화면이 보인다',
  {
    kind: '정상',
    summary: 'GM-1 401 AUTH_401_1 → 재발급 200(새 쿠키) → GM-1 재시도 200.',
    basis: ['plan P4a 완료 기준 4', 'tech-decisions §4 인증 표', 'api-contract §9 재발급'],
  },
  async ({ page, mockApi, step, note }) => {
    await setMockSession(page, 'expired');
    await step('보호 화면을 열면 잠시 뒤 화면이 보인다(이동 없음)', async () => {
      await page.goto('/gate-check');
      await expect(page.getByText('두둥이님으로 로그인했어요.')).toBeVisible();
      await expect(page).toHaveURL(/\/gate-check$/);
    });
    await step(
      'GM-1 401 → 재발급 1회 → GM-1 200 순서',
      async () => {
        const calls = mockApi
          .calls()
          .filter((c) => c.path.startsWith('/api/v2/me') || c.path.startsWith('/api/v1/auth'));
        await note(`받은 호출: ${describeCalls(calls)}`);
        expect(calls.map((c) => `${c.method} ${c.path.split('?')[0]} ${c.status}`)).toEqual([
          'GET /api/v2/me 401',
          'POST /api/v1/auth/token/refresh 200',
          'GET /api/v2/me 200',
        ]);
      },
      { capture: false },
    );
  },
);

scenario(
  'AUTH-4',
  '만료 상태(재발급 실패)로 보호 화면에 들어가면 /login/expired 로 간다',
  {
    kind: '에러',
    summary:
      '재발급 403 AUTH_403_1 = 세션 상실. 캐시를 비우고 dd:session을 지운 뒤 보호 영역이라 /login/expired?redirect=… 로 하드 이동한다. 토스트·에러 화면은 없다.',
    basis: ['plan P4a 완료 기준 5', 'tech-decisions §4 인증 표 "onSessionLost"', 'patterns §5-1'],
  },
  async ({ page, mockApi, step, note }) => {
    await setMockSession(page, 'expiredRefreshFails');
    await step('보호 화면을 열면 만료 안내(자리표시)로 바뀐다', async () => {
      await page.goto('/gate-check');
      await expect(page).toHaveURL(/\/login\/expired\?redirect=%2Fgate-check$/);
      await expect(page.getByRole('heading', { name: '로그인이 만료됐어요' })).toBeVisible();
    });
    await step(
      '에러 화면·토스트가 없고 세션 표시가 지워졌다',
      async () => {
        // Next 라우트 안내(__next-route-announcer__)도 role=alert라 글자로 거른다
        await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
        await expect(page.getByText('불러오지 못했어요')).toHaveCount(0);
        expect(await readSessionFlag(page)).toBeNull();
        const calls = mockApi.calls();
        await note(`받은 호출: ${describeCalls(calls)}`);
        expect(refreshCalls(calls).map((c) => c.status)).toEqual([403]);
      },
      { capture: false },
    );
  },
);

let meFailures = 0;
scenario(
  'AUTH-5',
  '보호 화면 첫 진입에서 GM-1이 502면 재시도 화면이 뜨고 이동하지 않는다',
  {
    kind: '에러',
    summary:
      'nginx HTML 502(NON_JSON). 5xx는 한 번 재시도한 뒤 게이트가 children 대신 전체 화면 재시도를 그린다. 세션 표시는 그대로이고 주소도 그대로다. [다시 시도]로 복구한다.',
    basis: ['plan P4a 완료 기준 6', 'tech-decisions §4 인증 표 "게이트"', 'patterns §5'],
    mocks: [
      http.get('*/api/v2/me', () => {
        meFailures += 1;
        // 첫 진입의 두 번(쿼리 재시도 포함)만 실패하고 그 뒤로는 기본 핸들러(로그인)로
        if (meFailures <= 2)
          return new HttpResponse('<html>502 Bad Gateway</html>', { status: 502 });
        return undefined;
      }),
    ],
  },
  async ({ page, step }) => {
    meFailures = 0;
    await setMockSession(page, 'loggedIn');
    await step('보호 화면을 열면 "불러오지 못했어요"와 [다시 시도]가 보인다', async () => {
      await page.goto('/gate-check');
      await expect(page.getByRole('alert').filter({ hasText: '불러오지 못했어요' })).toBeVisible();
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
      await expect(page).toHaveURL(/\/gate-check$/);
      expect(await readSessionFlag(page)).not.toBeNull();
    });
    await step('[다시 시도]를 누르면 화면이 보인다', async () => {
      await page.getByRole('button', { name: '다시 시도' }).click();
      await expect(page.getByText('두둥이님으로 로그인했어요.')).toBeVisible();
    });
  },
);

for (const [id, state, label] of [
  ['AUTH-6a', 'loggedIn', '로그인'],
  ['AUTH-6b', 'anonymous', '비로그인'],
  ['AUTH-6c', 'expiredRefreshFails', '만료'],
] as [string, MockSession, string][]) {
  scenario(
    id,
    `${label} 상태에서 공개 화면은 그대로 열리고 인증 요청을 만들지 않는다`,
    {
      kind: '권한',
      summary:
        '공개 화면에는 게이트가 없고 공개 GET은 쿠키 없이 나간다(credentials omit) — 만료된 쿠키가 있어도 401·재발급이 생기지 않는다.',
      basis: [
        'plan P4a 완료 기준 1·9',
        'api-contract §1 인증',
        'tech-decisions §4 인증 표 "공개 GET"',
      ],
      viewports: ['mobile'],
    },
    async ({ page, mockApi, step, note }) => {
      await setMockSession(page, state);
      await step('공연홈을 열면 200으로 열리고 그대로 머문다', async () => {
        const res = await page.goto('/');
        expect(res?.status()).toBe(200);
        await expect(page.getByRole('heading', { name: '장르' })).toBeVisible();
        await page.waitForTimeout(300);
        await expect(page).toHaveURL(/\/$/);
      });
      await step(
        'GM-1·재발급 호출이 없다',
        async () => {
          const calls = mockApi.calls();
          await note(`받은 호출: ${describeCalls(calls)}`);
          expect(meCalls(calls)).toHaveLength(0);
          expect(refreshCalls(calls)).toHaveLength(0);
        },
        { capture: false },
      );
    },
  );
}

scenario(
  'AUTH-7',
  '한 탭에서 로그아웃하면 다른 탭도 캐시를 비우고 로그인으로 간다',
  {
    kind: '정상',
    summary:
      '같은 브라우저의 두 탭(같은 context의 page 둘). 탭 A의 로그아웃이 dd:session을 지우면 탭 B가 storage 이벤트로 캐시를 비우고, 보호 영역이라 /login?redirect=… 로 하드 이동한다.',
    basis: ['plan P4a 완료 기준 7·10', 'tech-decisions §4 인증 표 "다른 탭"', 'patterns §5-1'],
  },
  async ({ page, step, note }) => {
    await setMockSession(page, 'loggedIn');
    const other = await page.context().newPage();
    await step('두 탭에서 보호 화면을 연다', async () => {
      await page.goto('/gate-check');
      await other.goto('/gate-check');
      await expect(page.getByText('두둥이님으로 로그인했어요.')).toBeVisible();
      await expect(other.getByText('두둥이님으로 로그인했어요.')).toBeVisible();
    });
    await step('탭 A에서 로그아웃하면 탭 A는 / 로 간다', async () => {
      await page.getByRole('button', { name: '로그아웃' }).click();
      await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
      expect(await readSessionFlag(page)).toBeNull();
    });
    await step(
      '탭 B는 /login?redirect=%2Fgate-check 로 바뀌고 이전 사용자 이름이 없다',
      async () => {
        await expect(other).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
        await expect(other.getByText('두둥이님으로 로그인했어요.')).toHaveCount(0);
        await note(`탭 B 주소: ${other.url()}`);
      },
    );
    await step(
      '탭 B에서 뒤로 가 보호 화면을 다시 열어도 로그인으로 간다(쿠키가 지워졌다)',
      async () => {
        await other.goto('/gate-check');
        await expect(other).toHaveURL(/\/login\?redirect=%2Fgate-check$/);
      },
    );
    await other.close();
  },
);

scenario.manual('AUTH-8', '카카오톡 인앱 브라우저에서 Web Locks와 dd:session이 유지된다', {
  kind: '반응형',
  basis: ['plan P4b 완료 기준', 'tech-decisions §4 인증 "카카오톡 인앱 브라우저"'],
  how: '스테이징(P4b D2) 배포 뒤 iOS·Android 카카오톡에서 보호 화면을 열고, 원격 디버깅으로 `"locks" in navigator`와 localStorage의 dd:session이 앱 재시작 뒤에도 남는지 본다. Web Locks가 없으면 대체 경로(탭 안 단일 비행)로 동작한다.',
});

scenario.manual('AUTH-9', '두 탭 동시 만료에서 실제 재발급 뒤 로그인이 유지된다', {
  kind: '정상',
  basis: ['plan P4a 완료 기준 4', 'plan P4b 완료 기준', 'backend-questions B1'],
  how: 'P4b에서 스테이징 백엔드로: 액세스 토큰 수명을 짧게 둔 계정으로 두 탭을 열고 만료 뒤 동시에 조작해, 재발급 요청이 1건이고 두 탭 모두 로그인 상태로 남는지 본다. mock 직렬화는 Vitest(src/api/auth-handlers.test.ts)가 본다.',
});
