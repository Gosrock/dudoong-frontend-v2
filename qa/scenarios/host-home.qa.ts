import { setMockSession } from '../../e2e/support/auth';
import { hostSets } from '../../src/api/__mocks__/host.handlers';
import { expect, scenario } from '../scenario';

/**
 * 호스트 홈 `/hosts/[hostId]`(plan P5c 완료 기준 V — 비로그인·관객·일반 멤버·매니저·마스터 시점 렌더).
 * 근거는 와이어 — 마스터·매니저 `503:30867` · 멤버 `529:34027` · 관객 `503:30477`(gui-screens §0 — GUI `741:30896`·
 * `741:30970`은 Ready for dev 아님). 로그인 mock 사용자는 고스락(11)의 마스터라, 다른 시점은 `hostSets.viewAs`로 역할을 바꾼다.
 *
 * 범주 검토
 * - 크롤러: 상태 코드(200·404·500)·제목·서버 조회 토큰 없음은 e2e `host-home.spec`(P5c-L)이 본다 — 여기서는 화면만
 * - 에러: GH-3 5xx(서버 조회 → error.tsx)는 e2e. 브라우저 쪽 viewer 실패만 아래(HH-7). ♡ 실패 토스트는 공용 handleError(e2e·훅 테스트)
 * - 반응형: 시점마다 mobile·desktop(1280)으로 돌고, 마스터는 PC 1440도 찍는다(와이어에 PC 없음 — 같은 세로 배치)
 */

const HOST = '/hosts/11';
const PREPARING = '고스락 신입 환영 공연(준비중)';
const PUBLIC_EVENT = '고스락 제37회 정기공연';

scenario(
  'HH-1',
  '비로그인: ♡는 로그인 링크, 관리 버튼·멤버 줄 없음, 연락처는 가린 값 + 로그인 안내',
  {
    kind: '권한',
    summary:
      '관객 와이어(503:30477)와 같이 멤버 줄이 없고 공개 공연만 공개 상세로 간다. ♡는 요청 없이 /login?redirect=로 가는 링크. 연락처 아이콘을 누르면 시트에 아이콘 + 값이 나오고, 가린 이메일에는 "로그인하면 볼 수 있어요"(Q41 기본안).',
    basis: ['plan P5c 완료 기준 V', '와이어 503:30477', 'design-requests Q41', 'patterns §4-2'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await step('호스트 홈을 열면 이름·멤버 수·개설일·소개가 보이고 관리 버튼이 없다', async () => {
      await page.goto(HOST);
      await expect(page.getByRole('heading', { level: 1, name: '고스락' })).toBeVisible();
      await expect(page.getByText('2022.03.02')).toBeVisible();
      await expect(page.getByRole('navigation', { name: '호스트 관리' })).toHaveCount(0);
      await expect(page.getByRole('list', { name: '멤버' })).toHaveCount(0);
    });
    await step('공연 리스트에는 공개 공연만 있고 공개 상세로 링크한다', async () => {
      await expect(page.getByRole('link', { name: PUBLIC_EVENT })).toHaveAttribute(
        'href',
        '/events/101',
      );
      await expect(page.getByText(PREPARING)).toHaveCount(0);
    });
    await step('♡는 로그인 링크다', async () => {
      await expect(page.getByRole('link', { name: '관심 호스트' })).toHaveAttribute(
        'href',
        '/login?redirect=%2Fhosts%2F11',
      );
    });
    await step('연락처 아이콘을 누르면 시트에 가린 이메일과 로그인 안내가 보인다', async () => {
      await page
        .getByRole('button', { name: /연락처 보기/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog', { name: '연락처' });
      await expect(dialog.getByText('@gosrock_official')).toBeVisible();
      await expect(dialog.getByText('gosrock@example.com')).toHaveCount(0);
      await expect(dialog.getByRole('link', { name: '로그인하면 볼 수 있어요' })).toBeVisible();
    });
  },
);

scenario(
  'HH-2',
  '관객(로그인 · 비멤버): ♡를 누를 수 있고, 관리 버튼·멤버 줄 없음, 연락처 원문',
  {
    kind: '권한',
    summary:
      '로그인했지만 이 호스트의 멤버가 아니다(myRole null). ♡는 viewer 확정 뒤 눌리고 누르면 채워진다(PH-13). 연락처 시트는 viewer 원문(A안).',
    basis: ['plan P5c 완료 기준 V · L 연락처 A안', '와이어 503:30477'],
    mocks: hostSets.viewAs(11, { myRole: null, isFollowing: false }),
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ♡가 비어 있고 누를 수 있다', async () => {
      await page.goto(HOST);
      const follow = page.getByRole('button', { name: '관심 호스트' });
      await expect(follow).toBeEnabled();
      await expect(follow).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('navigation', { name: '호스트 관리' })).toHaveCount(0);
      await expect(page.getByRole('list', { name: '멤버' })).toHaveCount(0);
      await expect(page.getByText(PREPARING)).toHaveCount(0);
    });
    await step('♡를 누르면 채워진 하트가 된다', async () => {
      const follow = page.getByRole('button', { name: '관심 호스트' });
      await follow.click();
      await expect(follow).toHaveAttribute('aria-pressed', 'true');
    });
    await step('연락처 시트에는 이메일 원문이 보이고 로그인 안내가 없다', async () => {
      await page
        .getByRole('button', { name: /연락처 보기/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog', { name: '연락처' });
      await expect(dialog.getByText('gosrock@example.com')).toBeVisible();
      await expect(dialog.getByText('로그인하면 볼 수 있어요')).toHaveCount(0);
    });
  },
);

scenario(
  'HH-3',
  '일반 멤버: 멤버 줄 + [멤버 >]는 보이고, ⚙·[새 공연 만들기]는 없다. 준비중 공연은 호스팅 센터로',
  {
    kind: '권한',
    summary:
      '멤버 와이어(529:34027) — 설정·생성 버튼 없이 멤버 목록은 읽기 전용(GH-6 G+). 준비중 공연 카드는 /hosting/events/[id](공개 상세는 404).',
    basis: ['plan P5c 완료 기준 V · L 준비중 링크', '와이어 529:34027', 'api-contract §2'],
    mocks: hostSets.viewAs(11, { myRole: 'GUEST' }),
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 멤버 아바타 줄과 [멤버 >] 링크가 보인다', async () => {
      await page.goto(HOST);
      const members = page.getByRole('list', { name: '멤버' });
      await expect(members.getByText('김매니저')).toBeVisible();
      await expect(page.getByRole('link', { name: '멤버', exact: true })).toHaveAttribute(
        'href',
        '/hosting/hosts/11/members',
      );
    });
    await step('⚙·[새 공연 만들기]는 없다', async () => {
      await expect(page.getByRole('navigation', { name: '호스트 관리' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toHaveCount(0);
    });
    await step('준비중 공연 카드는 호스팅 센터로 링크한다', async () => {
      await expect(page.getByRole('link', { name: PREPARING })).toHaveAttribute(
        'href',
        '/hosting/events/140',
      );
    });
  },
);

scenario(
  'HH-4',
  '매니저: ⚙ · [새 공연 만들기] · 멤버 줄이 모두 보인다',
  {
    kind: '권한',
    summary: '마스터·매니저 와이어(503:30867) — 배너 오른쪽 위 ⚙, 오른쪽 아래 [+ 새 공연 만들기].',
    basis: ['plan P5c 완료 기준 V', '와이어 503:30867', 'api-contract §2'],
    mocks: hostSets.viewAs(11, { myRole: 'MANAGER' }),
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ⚙와 [새 공연 만들기], 멤버 줄이 보인다', async () => {
      await page.goto(HOST);
      const manage = page.getByRole('navigation', { name: '호스트 관리' });
      await expect(manage.getByRole('link', { name: '설정' })).toHaveAttribute(
        'href',
        '/hosting/hosts/11/settings',
      );
      await expect(manage.getByRole('link', { name: '새 공연 만들기' })).toHaveAttribute(
        'href',
        '/hosting/new/events?hostId=11',
      );
      await expect(page.getByRole('list', { name: '멤버' })).toBeVisible();
    });
  },
);

scenario(
  'HH-5',
  '마스터: 매니저와 같은 화면 — 관리 버튼 · 멤버 줄 · 준비중 공연 (PC 1440 포함)',
  {
    kind: '정상',
    summary:
      '로그인 mock 사용자 기본 시점. 와이어상 마스터와 매니저 홈은 같다. 공연 리스트는 하이드레이션 뒤 스켈레톤 → 가로 카드 줄. PC는 같은 세로 배치를 본문 최대 폭 안에(와이어에 PC 없음 🤖).',
    basis: [
      'plan P5c 완료 기준 V · V 범위',
      '와이어 503:30867',
      'figma-structure 마스터=매니저 홈',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 관리 버튼·멤버 줄·준비중 공연 카드가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByRole('link', { name: '설정' })).toBeVisible();
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toBeVisible();
      await expect(page.getByRole('list', { name: '멤버' }).getByText('두둥이')).toBeVisible();
      await expect(page.getByRole('link', { name: PREPARING })).toBeVisible();
    });
    if (testInfo.project.name === 'desktop') {
      await step('PC 1440에서도 같은 배치가 본문 폭 안에 그려진다', async () => {
        await page.setViewportSize({ width: 1440, height: 1024 });
        await expect(page.getByRole('heading', { level: 1, name: '고스락' })).toBeVisible();
      });
    }
  },
);

scenario(
  'HH-6',
  '공연이 하나도 없으면 빈 상태 문구가 보인다',
  {
    kind: '빈 상태',
    summary:
      'GH-14 빈 페이지. 와이어·GUI(741:30970, Ready 아님)에 빈 상태가 없어 L 문구를 EmptyState로(Figma 코멘트 2026-11-01).',
    basis: ['plan P5c V 범위', 'GUI 741:30970(근거 아님 — 참고)'],
    mocks: hostSets.noEvents(11),
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await step('호스트 홈을 열면 "두둥! 등록한 공연이 없습니다."가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByText('두둥! 등록한 공연이 없습니다.')).toBeVisible();
    });
  },
);

scenario(
  'HH-7',
  '내 관심·권한 정보(viewer)를 못 읽으면 ♡가 잠기고 [다시 시도]가 보인다',
  {
    kind: '에러',
    summary:
      'GH-3 viewer(쿠키 요청)만 5xx. 공개 값은 그대로 그리고 ♡·관리 버튼은 확정 전처럼 잠근다. 공연은 공개 목록(안전한 쪽).',
    basis: ['plan P5c L 확정 전 비활성', 'patterns §11'],
    mocks: hostSets.viewerServerError(11),
  },
  async ({ page, step }) => {
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ♡가 잠기고 안내와 [다시 시도]가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByText('내 관심·권한 정보를 불러오지 못했어요.')).toBeVisible();
      await expect(page.getByRole('button', { name: '관심 호스트' })).toBeDisabled();
      await expect(page.getByRole('navigation', { name: '호스트 관리' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: PUBLIC_EVENT })).toBeVisible();
    });
  },
);
