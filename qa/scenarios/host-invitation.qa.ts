import { setMockSession } from '../../e2e/support/auth';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { MOCK_INVITE_TOKEN } from '../../src/api/__mocks__/host-store';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 호스트 초대 수락 `/host-invitations/{token}`(H-19 · H-20 — 이슈 #136 §8, B33② · 백엔드 #933, Api 2.5.7).
 * 근거: **GUI**(모바일 Ready, Design Sync #267 — 초대 `1427:4596` · 수락 완료 `1427:4638` · 만료 `1427:4701` · 사용됨 `1427:4746` ·
 * 없음 `1427:4791` · 이미 멤버 `1427:4836`). 결과 화면은 DS `Empty state` medium + `img_초대장`(#239). 거절은 서버 없음 — 화면에 없다.
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
  '초대 화면 — 호스트 · 역할 · 가린 이메일 · 만료일, [수락하기] → 멤버가 됐어요 · [호스트 홈으로 가기]',
  {
    kind: '정상',
    summary:
      'H-19로 "‘소음공작소’에서 일반 멤버로 초대했어요" + 이메일(가림) · 만료일. [거절하기]는 없다(서버 없음). 수락(H-20)하면 "‘소음공작소’의 멤버가 됐어요!" + [호스트 홈으로 가기]. 주소에는 토큰이 없다.',
    basis: ['GUI 1427:4596 · 1427:4638(#267)', '이슈 #136 §8', 'api-contract H-19 · H-20'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('링크로 들어오면 주소에서 토큰이 사라지고 초대 내용이 보인다', async () => {
      await page.goto(`/host-invitations/${TOKEN}`);
      await expect(page).toHaveURL(/\/host-invitations$/);
      await expect(
        page.getByRole('heading', { name: '‘소음공작소’에서 일반 멤버로 초대했어요' }),
      ).toBeVisible();
      await expect(page.getByText('ne***@example.com')).toBeVisible();
      await expect(page.getByText('2099년 1월 1일')).toBeVisible();
      await expect(page.getByRole('button', { name: '거절하기' })).toHaveCount(0);
    });
    await step('[수락하기] → "‘소음공작소’의 멤버가 됐어요!" + [호스트 홈으로 가기]', async () => {
      await page.getByRole('button', { name: '수락하기' }).click();
      await expect(
        page.getByRole('heading', { name: '‘소음공작소’의 멤버가 됐어요!' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: '호스트 홈으로 가기' })).toHaveAttribute(
        'href',
        /^\/hosts\/\d+$/,
      );
    });
  },
);

scenario(
  'HI-2',
  '이미 멤버 — 수락할 것 없이 바로 "이미 ‘고스락’의 멤버예요" + [호스트 홈으로 가기]',
  {
    kind: '정상',
    summary:
      '고스락(11) 매니저 초대인데 나는 이미 마스터 → H-19 alreadyMember면 초대 화면 대신 이미 멤버 결과(GUI 1427:4836). [수락하기]는 없고, 수락(H-20)은 스스로 한 번 불러 초대를 소비한다(역할은 그대로 — 백엔드 #928).',
    basis: ['GUI 1427:4836(#267)', '백엔드 #928 답 — 수락해도 기존 역할', 'api-contract H-19'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('"이미 ‘고스락’의 멤버예요" · [호스트 홈으로 가기] · [수락하기] 없음', async () => {
      await page.goto(`/host-invitations/${MOCK_INVITE_TOKEN.member}`);
      await expect(page.getByRole('heading', { name: '이미 ‘고스락’의 멤버예요' })).toBeVisible();
      await expect(page.getByText('같은 호스트에는 한 번만 참여할 수 있어요.')).toBeVisible();
      await expect(page.getByRole('link', { name: '호스트 홈으로 가기' })).toHaveAttribute(
        'href',
        '/hosts/11',
      );
      await expect(page.getByRole('button', { name: '수락하기' })).toHaveCount(0);
    });
  },
);

for (const [id, token, code, title] of [
  ['HI-3a', MOCK_INVITE_TOKEN.expired, 'HOST_400_19', '만료된 초대장이에요'],
  ['HI-3b', MOCK_INVITE_TOKEN.used, 'HOST_400_20', '이미 사용된 초대장이에요'],
  ['HI-3c', MOCK_INVITE_TOKEN.missing, 'HOST_404_3', '초대장을 찾을 수 없어요'],
] as const) {
  scenario(
    id,
    `쓸 수 없는 초대(${code}) → "${title}"`,
    {
      kind: '에러',
      summary: `H-19가 ${code}면 img_초대장_error + 안내 + [두둥 홈으로 가기]. [수락하기]는 없다.`,
      basis: ['GUI 1427:4701 · 4746 · 4791(#267)', 'error-codes HOST_400_19 · 20 · HOST_404_3'],
    },
    async ({ page, step }) => {
      resetHostMockState();
      await setMockSession(page, 'loggedIn');
      await step(title, async () => {
        await page.goto(`/host-invitations/${token}`);
        await expect(page.getByRole('heading', { name: title })).toBeVisible();
        await expect(page.getByRole('link', { name: '두둥 홈으로 가기' })).toHaveAttribute(
          'href',
          '/',
        );
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
        page.getByRole('heading', { name: '‘소음공작소’에서 일반 멤버로 초대했어요' }),
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

scenario(
  'HI-6',
  '초대 수락 PC 1440 — 묶음과 [수락하기]가 한 덩어리로 가운데(폭 345)',
  {
    kind: '반응형',
    summary:
      'GUI 1496:13112 — 초대 내용(아바타 · 문구 · 정보 상자 345)과 버튼 줄이 사이 32로 붙어 화면 가운데. 만료(1496:13198)는 모바일과 같은 Empty state 가운데. [거절하기]는 서버가 없어 그리지 않는다(Q233).',
    basis: ['Design Sync #299', 'patterns §1 반응형(1024부터 PC)'],
    viewports: ['desktop'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await page.setViewportSize({ width: 1440, height: 1024 });
    await step('정보 상자 345 가운데 · [수락하기]는 상자 바로 아래(68)', async () => {
      await page.goto(`/host-invitations/${TOKEN}`);
      const info = page.getByRole('definition').first().locator('xpath=ancestor::dl');
      const box = (await info.boundingBox())!;
      expect(box.width).toBe(345);
      expect(Math.round(box.x + box.width / 2)).toBe(720);
      const accept = (await page.getByRole('button', { name: '수락하기' }).boundingBox())!;
      expect(accept.width).toBe(345);
      expect(Math.round(accept.y - (box.y + box.height))).toBe(68);
    });
    await step('만료된 초대 — 가운데 결과 화면', async () => {
      await page.goto(`/host-invitations/${MOCK_INVITE_TOKEN.expired}`);
      await expect(page.getByRole('heading', { name: '만료된 초대장이에요' })).toBeVisible();
      await expect(page.getByRole('link', { name: '두둥 홈으로 가기' })).toBeVisible();
    });
  },
);
