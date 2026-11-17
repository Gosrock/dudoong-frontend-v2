import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { hostSets, resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { editHostProfile } from '../../src/api/__mocks__/host-store';
import { expect, scenario } from '../scenario';

/**
 * 호스트 홈 `/hosts/[hostId]` · 공연 리스트 `/hosts/[hostId]/events`(plan P5c 완료 기준 V — 비로그인·관객·일반 멤버·매니저·마스터).
 * 근거는 **GUI**(Design Sync #257 · #261 · #262 · #279 · #280 · #281 · #287 · #288 · #290 · #291 · #295) — 하트 눌림/안눌림 `741:30896` · `741:30970` ·
 * 스크롤 `741:31027` · 이미지 없음 `1452:40783`(호스트 뷰) · `1452:41324`(관객 뷰) · 소개글 `1464:4953` · `1465:5019` · 연락처 `1481:7194` ·
 * `1481:7454` · `1481:7672` · `1481:7911` · 로그인 필요 `1484:8106` · 연락처 팝업 `1529:13696` · `1529:13846` · `1529:14462` · 복사 `1522:35609` ·
 * 공연 리스트 `1423:2651` · `1478:8878`. PC 1440 — 마스터 `1495:8685` · 관객 `1495:9022` · 연락처 `1495:9257` · `1529:13773` · 로그인 필요
 * `1495:9888` · 공연 리스트 `1496:12596`.
 * 로그인 mock 사용자는 고스락(11)의 마스터라, 다른 시점은 `hostSets.viewAs`로 역할을 바꾼다.
 *
 * 범주 검토
 * - 크롤러: 상태 코드(200·404·500)·제목·서버 조회 토큰 없음은 e2e `host-home.spec`(P5c-L)이 본다 — 여기서는 화면만
 * - 에러: GH-3 5xx(서버 조회 → error.tsx)는 e2e. 브라우저 쪽 viewer 실패만 아래(HH-7). ♡ 실패 토스트는 공용 handleError(e2e·훅 테스트)
 * - 반응형: 시점마다 mobile·desktop(1280)으로 돌고, 마스터는 PC 1440도 찍는다
 */

const HOST = '/hosts/11';
const PREPARING = '고스락 신입 환영 공연(준비중)';
const PUBLIC_EVENT = '고스락 제37회 정기공연';

const LONG_INTRO =
  '나이스 투 Meet you! 안녕하세요! 인천 미추홀구 마스코트 미추입니다. 나 보니까 꼽냐? 미추겠냐?? 나이스 투 Meet you! 삼국시대에 구축했던 문학산성이 터로 남아있는 유서 깊은 역사의 장소인 문학산에는 둘레길이 조성되어 있어 트래킹 하기 좋다. 인천에서 가장 활성화된 재래시장인 주안 석바위시장은 저렴한 가격과 다양한 먹거리로 유명하다.';
/** 연락처 6개(GUI `1481:7194` 연락처 전체 보기와 같은 유형 순서) */
const SIX_CONTACTS = [
  { type: 'EMAIL', value: 'kumdoriz@example.com' },
  { type: 'PHONE', value: '010-1234-5678' },
  { type: 'INSTAGRAM', value: 'example' },
  { type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/example' },
  { type: 'YOUTUBE', value: 'https://www.youtube.com/@example' },
  { type: 'ETC', value: 'example' },
] as const;

const richProfile = () => {
  resetHostMockState();
  editHostProfile(11, { introduce: LONG_INTRO, contacts: [...SIX_CONTACTS] });
};

/** 모바일에서만 보이는 커버 위 [⚙] · PC 커버 오른쪽 위 [⚙] — 화면 폭마다 하나만 보인다 */
const settingsLink = (page: Page) => page.getByRole('link', { name: '설정' });

scenario(
  'HH-1',
  '비로그인: ♡는 로그인 링크, ⚙·[+]·멤버 줄 없음, 연락처는 가린 값 + 로그인 안내',
  {
    kind: '권한',
    summary:
      '관객 뷰(GUI 1452:41324)처럼 멤버 줄이 없고 공개 공연만 공개 상세로 간다. ♡는 요청 없이 /login?redirect=로 가는 링크. 인스타그램 아이콘은 바로 열리는 링크(#281). [⋯] 연락처 시트(1481:7672)는 가린 전화·이메일을 회색으로, 아래에 안내 + [카카오 로그인].',
    basis: [
      'plan P5c 완료 기준 V',
      'GUI 1452:41324 · 1481:7672',
      'design-requests Q41',
      'patterns §4-2',
    ],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'anonymous');
    await step('호스트 홈을 열면 이름·멤버 수·개설일·소개가 보이고 ⚙·[+]가 없다', async () => {
      await page.goto(HOST);
      await expect(page.getByRole('heading', { level: 1, name: '고스락' })).toBeVisible();
      await expect(page.getByText('2022.03.02')).toBeVisible();
      await expect(settingsLink(page)).toHaveCount(0);
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toHaveCount(0);
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
    await step('인스타그램 아이콘은 새 탭으로 바로 여는 링크다(#281)', async () => {
      const insta = page.getByRole('link', { name: '인스타그램 열기' });
      await expect(insta).toHaveAttribute('href', 'https://www.instagram.com/gosrock_official/');
      await expect(insta).toHaveAttribute('target', '_blank');
    });
    await step('[⋯]를 누르면 시트에 가린 이메일과 로그인 안내가 보인다', async () => {
      richProfile();
      await page.reload();
      await page.getByRole('button', { name: '연락처 전체 보기' }).click();
      const dialog = page.getByRole('dialog', { name: '연락처' });
      await expect(dialog.getByText('kumdoriz@example.com')).toHaveCount(0);
      await expect(dialog.getByText(/\*\*\*@example\.com/)).toBeVisible();
      await expect(dialog.getByText('로그인하면 전화번호와 이메일을 볼 수 있어요')).toBeVisible();
      await expect(dialog.getByRole('link', { name: '카카오 로그인' })).toHaveAttribute(
        'href',
        '/login?redirect=%2Fhosts%2F11',
      );
      // 로그인으로 가는 버튼은 카카오 로그인 버튼(디자이너 요청 2026-11-15)
      await expect(dialog.getByRole('link', { name: '카카오 로그인' })).toHaveCSS(
        'background-color',
        'rgb(254, 229, 0)',
      );
    });
  },
);

scenario(
  'HH-2',
  '관객(로그인 · 비멤버): ♡를 누를 수 있고, ⚙·[+]·멤버 줄 없음, 연락처 원문',
  {
    kind: '권한',
    summary:
      '로그인했지만 이 호스트의 멤버가 아니다(myRole null). ♡는 viewer 확정 뒤 눌리고 누르면 빨간 채운 하트(GUI 741:30896). 이메일 아이콘은 연락처 팝업(1529:13846) — viewer 원문(A안) · [메일 쓰기] · 복사 → 토스트(1522:35609).',
    basis: [
      'plan P5c 완료 기준 V · L 연락처 A안',
      'GUI 741:30970 · 741:30896 · 1529:13846 · 1522:35609',
      'Design Sync #281 · #287 · #288',
    ],
    mocks: hostSets.viewAs(11, { myRole: null, isFollowing: false }),
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ♡가 비어 있고 누를 수 있다', async () => {
      await page.goto(HOST);
      const follow = page.getByRole('button', { name: '관심 호스트' });
      await expect(follow).toBeEnabled();
      await expect(follow).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsLink(page)).toHaveCount(0);
      await expect(page.getByRole('list', { name: '멤버' })).toHaveCount(0);
      await expect(page.getByText(PREPARING)).toHaveCount(0);
    });
    await step('♡를 누르면 채워진 하트가 된다', async () => {
      const follow = page.getByRole('button', { name: '관심 호스트' });
      await follow.click();
      await expect(follow).toHaveAttribute('aria-pressed', 'true');
    });
    await step('이메일 아이콘을 누르면 연락처 팝업 — 원문과 [메일 쓰기]', async () => {
      await page.getByRole('button', { name: '연락처 보기 — 이메일' }).click();
      const dialog = page.getByRole('dialog', { name: '이메일' });
      await expect(dialog.getByText('gosrock@example.com')).toBeVisible();
      await expect(dialog.getByRole('link', { name: '메일 쓰기' })).toHaveAttribute(
        'href',
        'mailto:gosrock@example.com',
      );
    });
    await step('복사 버튼을 누르면 "클립보드에 복사했어요." 토스트(팝업은 열린 채)', async () => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: '이메일 복사' }).click();
      await expect(page.getByText('클립보드에 복사했어요.')).toBeVisible();
      await expect(page.getByRole('dialog', { name: '이메일' })).toBeVisible();
    });
  },
);

scenario(
  'HH-3',
  '일반 멤버: 멤버 줄 + [멤버 >]는 보이고, ⚙·[+]는 없다. 준비중 공연은 호스팅 센터로',
  {
    kind: '권한',
    summary:
      '설정·생성 버튼 없이 멤버 목록은 읽기 전용(GH-6 G+). 멤버 Avatar 60 + 이름(GUI 741:30927). 준비중 공연 카드는 /hosting/events/[id](공개 상세는 404) + 오른쪽 위 "준비중".',
    basis: ['plan P5c 완료 기준 V · L 준비중 링크', 'GUI 741:30896', 'api-contract §2'],
    mocks: hostSets.viewAs(11, { myRole: 'GUEST' }),
  },
  async ({ page, step }) => {
    resetHostMockState();
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
    await step('⚙·[+]는 없다', async () => {
      await expect(settingsLink(page)).toHaveCount(0);
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
  '매니저: ⚙ · 멤버 줄이 보이고, 모바일은 [+]',
  {
    kind: '권한',
    summary:
      '마스터·매니저 — 모바일은 커버 위 흰 원 [⚙](GUI 1452:40991) + 오른쪽 아래 [+](DS Button round, 741:30958). PC는 커버 오른쪽 위 흰 원 [⚙](1495:8784)이고 [+]가 없다(1495:8685).',
    basis: ['plan P5c 완료 기준 V', 'GUI 741:30896 · 1495:8685', 'api-contract §2'],
    mocks: hostSets.viewAs(11, { myRole: 'MANAGER' }),
  },
  async ({ page, step, testInfo }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ⚙와 멤버 줄이 보이고, 모바일은 [+]', async () => {
      await page.goto(HOST);
      await expect(settingsLink(page)).toHaveAttribute('href', '/hosting/hosts/11/settings');
      const fab = page.getByRole('link', { name: '새 공연 만들기', includeHidden: true });
      await expect(fab).toHaveAttribute('href', '/hosting/new/events?hostId=11');
      if (testInfo.project.name === 'desktop') await expect(fab).toBeHidden();
      else await expect(fab).toBeVisible();
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
      '로그인 mock 사용자 기본 시점. 마스터와 매니저 홈은 같다. 공연 리스트는 하이드레이션 뒤 스켈레톤 → 가로 카드 줄(163). 모바일 커버 2:1 + 딤(#279). PC 1440(1495:8685): 폭 가득 커버 300 · 오른쪽 위 흰 원 ⚙ · 가운데 프로필 140 · 본문 960, [+] 없음.',
    basis: [
      'plan P5c 완료 기준 V · V 범위',
      'GUI 741:30896 · 1495:8685',
      'Design Sync #279 · #290',
      'figma-structure 마스터=매니저 홈',
    ],
  },
  async ({ page, step, testInfo }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 관리 버튼·멤버 줄·준비중 공연 카드가 보인다', async () => {
      await page.goto(HOST);
      await expect(settingsLink(page)).toBeVisible();
      await expect(page.getByRole('list', { name: '멤버' }).getByText('두둥이')).toBeVisible();
      await expect(page.getByRole('link', { name: PREPARING })).toBeVisible();
    });
    if (testInfo.project.name === 'desktop') {
      await step('PC 1440 — 커버 300 · 가운데 프로필 140 · [+] 없음(1495:8685)', async () => {
        await page.setViewportSize({ width: 1440, height: 1024 });
        await expect(page.getByRole('heading', { level: 1, name: '고스락' })).toBeVisible();
        await expect(page.getByRole('link', { name: '새 공연 만들기' })).toBeHidden();
        const cover = await page.locator('main > div').nth(1).boundingBox();
        expect(cover?.height).toBe(300);
      });
    } else {
      await step('모바일은 오른쪽 아래 [+] · 커버 2:1(390×195)', async () => {
        await expect(page.getByRole('link', { name: '새 공연 만들기' })).toBeVisible();
      });
    }
  },
);

scenario(
  'HH-6',
  '공연이 하나도 없으면 "아직 등록한 공연이 없어요."이고 [공연 리스트 >]가 없다',
  {
    kind: '빈 상태',
    summary: 'GH-14 빈 페이지. GUI 741:30970 — 제목 "공연 리스트"(> 없음) 아래 본문 한 줄.',
    basis: ['plan P5c V 범위', 'GUI 741:30970'],
    mocks: hostSets.noEvents(11),
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'anonymous');
    await step('호스트 홈을 열면 "아직 등록한 공연이 없어요."가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByText('아직 등록한 공연이 없어요.')).toBeVisible();
      await expect(page.getByRole('link', { name: '공연 리스트' })).toHaveCount(0);
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
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('호스트 홈을 열면 ♡가 잠기고 안내와 [다시 시도]가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByText('내 관심·권한 정보를 불러오지 못했어요.')).toBeVisible();
      await expect(page.getByRole('button', { name: '관심 호스트' })).toBeDisabled();
      await expect(settingsLink(page)).toHaveCount(0);
      await expect(page.getByRole('link', { name: PUBLIC_EVENT })).toBeVisible();
    });
  },
);

scenario(
  'HH-8',
  '소개글이 3줄을 넘으면 [더보기 ⌄] → 펼치면 [접기 ⌃]',
  {
    kind: '정상',
    summary:
      'GUI 1464:4953(접힘 — 3줄 말줄임 + 더보기) · 1465:5019(펼침 — 전체 + 접기). 넘치는지는 실제 높이로 잰다.',
    basis: ['GUI 1464:4953 · 1465:5019', 'Design Sync #257'],
    // PC는 폭이 넓어 같은 글이 3줄을 넘지 않는다
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    richProfile();
    await setMockSession(page, 'loggedIn');
    await step('긴 소개글은 3줄로 접히고 [더보기]가 보인다', async () => {
      await page.goto(HOST);
      await expect(page.getByRole('button', { name: '더보기' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
    await step('[더보기]를 누르면 전체가 보이고 [접기]로 바뀐다', async () => {
      await page.getByRole('button', { name: '더보기' }).click();
      await expect(page.getByRole('button', { name: '접기' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
    await step('[접기]를 누르면 다시 3줄', async () => {
      await page.getByRole('button', { name: '접기' }).click();
      await expect(page.getByRole('button', { name: '더보기' })).toBeVisible();
    });
  },
);

scenario(
  'HH-9',
  '연락처 5개 이상: 앞의 3개 + [⋯] → 연락처 전체 보기(로그인)',
  {
    kind: '정상',
    summary:
      'GUI 741:30896(3개 + ⋯) · 1481:7194 전체 보기 — 유형 · 값 · 열 수 있으면 >(기타 글자는 > 없음). 아이콘은 GUI "호스트홈_연락처"(유튜브 DS ic_youtube · 기타 ic_link).',
    basis: ['GUI 741:30896 · 1481:7194 · 1478:7210 · 1481:7193', 'Design Sync #257 · #269'],
  },
  async ({ page, step }) => {
    richProfile();
    await setMockSession(page, 'loggedIn');
    await step('아이콘은 3개 + [연락처 전체 보기]', async () => {
      await page.goto(HOST);
      const list = page.getByRole('list', { name: '연락처' });
      await expect(list.getByRole('listitem')).toHaveCount(4);
      await expect(list.getByRole('button', { name: '연락처 전체 보기' })).toBeVisible();
    });
    await step('[⋯]를 누르면 6줄 — 열 수 있는 값은 링크, 기타 글자는 글자만', async () => {
      await page.getByRole('button', { name: '연락처 전체 보기' }).click();
      const dialog = page.getByRole('dialog', { name: '연락처' });
      await expect(dialog.getByRole('listitem')).toHaveCount(6);
      await expect(dialog.getByRole('link')).toHaveCount(5);
      await expect(dialog.getByRole('link', { name: /010-1234-5678/ })).toHaveAttribute(
        'href',
        'tel:01012345678',
      );
    });
  },
);

scenario(
  'HH-10',
  '로그인 전: 가린 전화·이메일 아이콘을 누르면 "로그인이 필요해요"',
  {
    kind: '권한',
    summary:
      'GUI 1484:8106 — DS 다이얼로그 "로그인이 필요해요" · [취소] [카카오 로그인](카카오 로그인 버튼 — 디자이너 요청 2026-11-15). [카카오 로그인]는 창이 닫힌 뒤 지금 주소로 돌아오는 로그인.',
    basis: ['GUI 1484:8106', 'patterns §6 확인 창 계약'],
  },
  async ({ page, step }) => {
    richProfile();
    await setMockSession(page, 'anonymous');
    await step('이메일 아이콘을 누르면 로그인 필요 팝업', async () => {
      await page.goto(HOST);
      await page.getByRole('button', { name: '연락처 보기 — 이메일' }).click();
      const popup = page.getByRole('alertdialog', { name: '로그인이 필요해요' });
      await expect(
        popup.getByText('로그인하면 호스트의 전화번호와 이메일을 볼 수 있어요.'),
      ).toBeVisible();
      // [카카오 로그인]는 카카오 로그인 버튼(디자이너 요청 GUI 코멘트 2008666517, 2026-11-15)
      await expect(popup.getByRole('button', { name: '카카오 로그인' })).toHaveCSS(
        'background-color',
        'rgb(254, 229, 0)',
      );
    });
    await step('[카카오 로그인]를 누르면 로그인으로', async () => {
      await page.getByRole('button', { name: '카카오 로그인' }).click();
      await expect(page).toHaveURL(/\/login\?redirect=%2Fhosts%2F11$/);
    });
  },
);

scenario(
  'HH-11',
  '모바일: 커버가 지나가면 흰 상단 바(← 이름 ⚙)',
  {
    kind: '반응형',
    summary:
      'GUI 741:31027 "스크롤 올리면" — 셸 로고 헤더 없이 커버가 맨 위에서 시작하고(흰 원 [←] · [⚙]), 커버가 지나가면 DS Top app bar Title+Backward.',
    basis: ['GUI 741:30896 · 741:31027'],
    viewports: ['mobile'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('처음에는 커버 위 흰 원 [←] · [⚙]만 있다', async () => {
      await page.goto(HOST);
      await expect(page.getByRole('button', { name: '뒤로 가기' })).toHaveCount(1);
      await expect(page.getByText('고스락', { exact: true })).toHaveCount(1);
    });
    await step(
      '아래로 내리면 위에 흰 바 — 이름이 가운데',
      async () => {
        await page.mouse.wheel(0, 500);
        await expect(page.getByText('고스락', { exact: true })).toHaveCount(2);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'HH-12',
  '공연 리스트 화면: 2열 카드, 준비중은 오른쪽 위 칩, 마스터·매니저만 [+]',
  {
    kind: '정상',
    summary:
      'GUI 1423:2651(마스터·매니저 — 준비중 포함 + [+]) · 1478:8878(일반 · 관객 — 공개 공연만). [공연 리스트 >]에서 온다. PC 1440(1496:12596)은 ← 공연 리스트 + [+ 공연 추가하기] · 카드 163.',
    basis: ['GUI 1423:2651 · 1478:8878 · 1496:12596', 'Design Sync #262 · #295'],
  },
  async ({ page, step, testInfo }) => {
    resetHostMockState();
    await setMockSession(page, 'loggedIn');
    await step('[공연 리스트 >]를 누르면 2열 목록 — 준비중 칩 · [+]', async () => {
      await page.goto(HOST);
      await page.getByRole('link', { name: '공연 리스트' }).click();
      await expect(page).toHaveURL(/\/hosts\/11\/events$/);
      const list = page.getByRole('list', { name: '공연' });
      await expect(list.getByRole('link', { name: PREPARING })).toBeVisible();
      await expect(list.getByText('준비중', { exact: true })).toBeVisible();
      if (testInfo.project.name === 'desktop') {
        await expect(page.getByRole('link', { name: '공연 추가하기' })).toBeVisible();
        await expect(page.getByRole('link', { name: '새 공연 만들기' })).toBeHidden();
      } else {
        await expect(page.getByRole('link', { name: '새 공연 만들기' })).toBeVisible();
      }
    });
    if (testInfo.project.name === 'desktop') {
      await step('PC 1440 — 카드 163 · 가운데 960(1496:12596)', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const card = await page
          .getByRole('list', { name: '공연' })
          .getByRole('listitem')
          .first()
          .boundingBox();
        expect(card?.width).toBe(163);
      });
    }
  },
);

scenario(
  'HH-13',
  '공연 리스트 화면(비로그인): 공개 공연만, [+] 없음',
  {
    kind: '권한',
    summary: 'GUI 1478:8878 일반 · 관객 뷰 — 준비중 공연 · [+]가 없다.',
    basis: ['GUI 1478:8878'],
  },
  async ({ page, step }) => {
    resetHostMockState();
    await setMockSession(page, 'anonymous');
    await step('공개 공연만 보이고 [+]가 없다', async () => {
      await page.goto('/hosts/11/events');
      await expect(page.getByRole('link', { name: PUBLIC_EVENT })).toBeVisible();
      await expect(page.getByText(PREPARING)).toHaveCount(0);
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: '공연 추가하기' })).toHaveCount(0);
    });
  },
);

scenario(
  'HH-14',
  '연락처 팝업: 전화 [전화 걸기] · 기타(글자) [닫기] · 링크는 바로 열기 · PC만 ✕',
  {
    kind: '정상',
    summary:
      'GUI 연락처 팝업 1529:13695 — 전화 1529:13696 · 기타 1529:14462(모바일) · PC 1529:13773 · 1529:14540(오른쪽 위 ✕). 인스타그램 · 유튜브 · 오픈채팅 · 기타(링크)는 새 탭 링크(#281).',
    basis: [
      'GUI 1529:13695 · 1529:13696 · 1529:14462 · 1529:13773 · 1529:14540',
      'Design Sync #281 · #287 · #291',
    ],
  },
  async ({ page, step, testInfo }) => {
    resetHostMockState();
    editHostProfile(11, {
      contacts: [
        { type: 'PHONE', value: '010-1234-5678' },
        { type: 'ETC', value: '기분이 태도가 되지 않게' },
        { type: 'OPEN_CHAT', value: 'https://open.kakao.com/o/example' },
      ],
    });
    await setMockSession(page, 'loggedIn');
    const desktop = testInfo.project.name === 'desktop';
    await step('전화 아이콘 → [전화 걸기](tel:)', async () => {
      await page.goto(HOST);
      if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole('button', { name: '연락처 보기 — 전화' }).click();
      const dialog = page.getByRole('dialog', { name: '전화번호' });
      await expect(dialog.getByText('010-1234-5678')).toBeVisible();
      await expect(dialog.getByRole('link', { name: '전화 걸기' })).toHaveAttribute(
        'href',
        'tel:01012345678',
      );
      // PC만 오른쪽 위 ✕(#291)
      if (desktop) await expect(dialog.getByRole('button', { name: '닫기' })).toBeVisible();
      else await expect(dialog.getByRole('button', { name: '닫기' })).toBeHidden();
    });
    await step('기타(글자) 아이콘 → 글자 + [닫기]', async () => {
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '연락처 보기 — 기타' }).click();
      const dialog = page.getByRole('dialog', { name: '기타' });
      await expect(dialog.getByText('기분이 태도가 되지 않게')).toBeVisible();
      await dialog.getByRole('button', { name: '닫기' }).last().click();
      await expect(dialog).toHaveCount(0);
    });
    await step('오픈채팅 아이콘은 새 탭 링크', async () => {
      await expect(page.getByRole('link', { name: '오픈채팅 열기' })).toHaveAttribute(
        'href',
        'https://open.kakao.com/o/example',
      );
    });
  },
);
