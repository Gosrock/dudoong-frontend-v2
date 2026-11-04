import { setMockSession } from '../../e2e/support/auth';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { MOCK_INVITE_TOKEN } from '../../src/api/__mocks__/host-store';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 호스트 초대 수락 `/host-invitations/{token}`(H-19 · H-20 — 이슈 #136 §8, B33② · 백엔드 #933, Api 2.5.7).
 * 근거: **디자인 · 와이어 없음** — DS `Avatar` · `InfoRow` · `Button` · `EmptyState`로 단순하게(design-requests Q121 🤖).
 * 토큰 보호: 진입 직후 주소에서 지운다(`/host-invitations`), 로그인으로 갈 때만 탭 저장소에, Referer 없음(메타).
 *
 * 범주 검토
 * - 권한: 로그인 필요 — 익명은 토큰 없는 주소로 로그인에 간다(HI-4). 호스트 역할과 상관없는 화면
 * - 크롤러: 해당 없음 — 로그인 화면이고 robots Disallow · noindex
 * - 반응형: 모든 시나리오가 mobile · desktop — 한 칸짜리 화면이라 배치가 바뀌지 않는다
 */

const TOKEN = MOCK_INVITE_TOKEN.valid;

scenario(
  'HI-1',
  '초대 화면 — 호스트 · 역할 · 가린 이메일 · 만료, [수락하기] → 합류 결과(응답 역할)',
  {
    kind: '정상',
    summary:
      'H-19로 "소음공작소에서 일반 멤버로 초대했어요" + 초대받은 이메일(가림) · 링크 만료. 수락(H-20)하면 "소음공작소에 합류했어요 · 내 역할: 일반 멤버" + [공연준비로 가기]. 주소에는 토큰이 없다.',
    basis: ['이슈 #136 §8', 'api-contract H-19 · H-20', 'backend-questions B33②'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('링크로 들어오면 주소에서 토큰이 사라지고 초대 내용이 보인다', async () => {
      await page.goto(`/host-invitations/${TOKEN}`);
      await expect(page).toHaveURL(/\/host-invitations$/);
      await expect(
        page.getByRole('heading', { name: '소음공작소에서 일반 멤버로 초대했어요' }),
      ).toBeVisible();
      await expect(page.getByText('ne***@example.com')).toBeVisible();
    });
    await step('[수락하기] → "소음공작소에 합류했어요" · 내 역할', async () => {
      await page.getByRole('button', { name: '수락하기' }).click();
      await expect(page.getByText('소음공작소에 합류했어요')).toBeVisible();
      await expect(page.getByText('내 역할: 일반 멤버')).toBeVisible();
      await expect(page.getByRole('link', { name: '공연준비로 가기' })).toBeVisible();
    });
  },
);

scenario(
  'HI-2',
  '이미 멤버 — 안내, 수락 결과는 기존 역할(초대한 역할과 다를 수 있다)',
  {
    kind: '정상',
    summary:
      '고스락(11) 매니저 초대인데 나는 이미 마스터 → H-19 alreadyMember 안내, H-20 200 + alreadyMember · role=MASTER → "이미 고스락의 멤버예요 · 내 역할: 마스터".',
    basis: ['백엔드 #928 답 — 수락 응답 role은 기존 역할', 'api-contract H-20'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('"고스락에서 매니저로 초대했어요" + 이미 멤버 안내', async () => {
      await page.goto(`/host-invitations/${MOCK_INVITE_TOKEN.member}`);
      await expect(
        page.getByRole('heading', { name: '고스락에서 매니저로 초대했어요' }),
      ).toBeVisible();
      await expect(page.getByText('이미 이 호스트의 멤버예요', { exact: false })).toBeVisible();
    });
    await step('[수락하기] → "이미 고스락의 멤버예요 · 내 역할: 마스터"', async () => {
      await page.getByRole('button', { name: '수락하기' }).click();
      await expect(page.getByText('이미 고스락의 멤버예요')).toBeVisible();
      await expect(page.getByText('내 역할: 마스터')).toBeVisible();
    });
  },
);

for (const [id, token, code, title] of [
  ['HI-3a', MOCK_INVITE_TOKEN.expired, 'HOST_400_19', '만료된 초대 링크예요'],
  ['HI-3b', MOCK_INVITE_TOKEN.used, 'HOST_400_20', '이미 사용된 초대 링크예요'],
  ['HI-3c', MOCK_INVITE_TOKEN.missing, 'HOST_404_3', '초대를 찾을 수 없어요'],
] as const) {
  scenario(
    id,
    `쓸 수 없는 초대(${code}) → "${title}"`,
    {
      kind: '에러',
      summary: `H-19가 ${code}면 안내 + [홈으로]. [수락하기]는 없다.`,
      basis: ['이슈 #136 §8 에러', 'error-codes HOST_400_19 · 20 · HOST_404_3'],
    },
    async ({ page, step }) => {
      resetHostMockState();
      await setMockSession(page, 'loggedIn');
      await step(title, async () => {
        await page.goto(`/host-invitations/${token}`);
        await expect(page.getByText(title)).toBeVisible();
        await expect(page.getByRole('button', { name: '수락하기' })).toHaveCount(0);
      });
    },
  );
}

scenario(
  'HI-4',
  '익명 — 토큰 없는 주소로 로그인, 돌아오면 초대가 이어진다. 새로고침하면 "링크를 다시 열어 주세요"',
  {
    kind: '권한',
    summary:
      '로그인 redirect는 /host-invitations(토큰 없음). 토큰은 탭 저장소에 잠깐 — 돌아와서 꺼내며 지운다. 그 뒤 새로고침하면 토큰이 없다(메모리에만).',
    basis: ['이슈 #136 §8 토큰 보호', 'tech-decisions §4 로그인 redirect'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'anonymous');
    await step('익명으로 링크를 열면 /login?redirect=%2Fhost-invitations', async () => {
      await page.goto(`/host-invitations/${TOKEN}`);
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent('/host-invitations')}`);
    });
    await step('로그인 뒤 /host-invitations로 돌아오면 초대 화면', async () => {
      await setMockSession(page, 'loggedIn');
      await page.goto('/host-invitations');
      await expect(
        page.getByRole('heading', { name: '소음공작소에서 일반 멤버로 초대했어요' }),
      ).toBeVisible();
    });
    await step('새로고침하면 "초대 링크를 다시 열어 주세요"', async () => {
      await page.reload();
      await expect(page.getByText('초대 링크를 다시 열어 주세요')).toBeVisible();
    });
  },
);

scenario(
  'HI-5',
  '서버에 API가 없거나(운영 2.5.3 404) DDL 전(500)이면 다시 시도 — 화면이 죽지 않는다',
  {
    kind: '에러',
    summary: 'H-19가 HOST 코드가 아닌 404 · 5xx면 "초대를 불러오지 못했어요" + [다시 시도].',
    basis: ['이슈 #136 버전(2.5.7 · DDL V024)'],
    mocks: [
      http.get('*/api/v2/host-invitations/:token', () =>
        HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 }),
      ),
    ],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('"초대를 불러오지 못했어요" [다시 시도]', async () => {
      await page.goto(`/host-invitations/${TOKEN}`);
      await expect(page.getByText('초대를 불러오지 못했어요', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
  },
);
