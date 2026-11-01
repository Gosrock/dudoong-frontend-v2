import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { MISSING_HOST_ID } from '../../src/api/__mocks__/fixtures/host';
import { hostSets, resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { actAsRole } from '../../src/api/__mocks__/host-store';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { MOCK_S3_ORIGIN } from '../../src/api/__mocks__/upload-handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 호스트 설정 `/hosting/hosts/[hostId]/settings` · 멤버 관리 `/hosting/hosts/[hostId]/members`(plan P10b 완료 기준 V).
 * 근거는 **와이어**(GUI Ready for dev 없음) — 설정 `503:32374`, 멤버 흐름 `503:30866`(목록 `503:30922` · ⋮ `503:31732` ·
 * 권한 변경 `503:31833` · 양도 `503:32075` · 초대 `503:32779` · 권한 가이드 `503:30950`). 캡처는 와이어와 구조·문구·동작만 비교한다.
 * 고스락(11)의 mock 멤버: 두둥이(나, 마스터) · 김매니저(매니저) · 이드럼(일반) · 이름 없음(일반).
 *
 * 범주 검토
 * - 빈 상태: 해당 없음 — 멤버 목록에는 늘 마스터(나 포함)가 있다. 연락처는 1줄 이상(서버 규칙)
 * - 크롤러: 해당 없음 — 보호 화면(로그인 게이트 안, 서버 조회 없음). 비로그인 → 로그인은 e2e `hosting-host.spec.ts`
 * - 반응형: 모든 시나리오가 mobile · desktop — 배치가 바뀌는 곳은 이미지 두 칸(모바일 세로 · PC 가로)과 [+ 멤버 초대하기] 위치뿐
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
};

const SETTINGS = '/hosting/hosts/11/settings';
const MEMBERS = '/hosting/hosts/11/members';

const row = (page: Page, name: string) =>
  page.getByTestId('member-row').filter({ has: page.getByText(name, { exact: true }) });
const openMenu = async (page: Page, name: string) => {
  await row(page, name)
    .getByRole('button', { name: `${name} 메뉴` })
    .click();
  return page.getByRole('menuitem');
};

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};
const PNG = {
  name: 'logo.png',
  mimeType: 'image/png',
  // 1×1 투명 PNG — 미리보기가 깨지지 않게 실제 이미지
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
};

// ─── 호스트 설정 ─────────────────────────────────────────────

scenario(
  'HS-1',
  '설정 — 이름을 바꿔 [저장]하면 토스트, 공연준비 홈 카드에도 반영',
  {
    kind: '정상',
    summary:
      '와이어 503:32374 순서(호스트 이름* · 소개글 · 호스트 대표 연락처* + [문의처 추가] · [저장]). 바뀐 필드만 PH-4. 이미지 칸은 맨 아래(디자인 없음).',
    basis: ['plan P10b V 범위', '와이어 503:32374', 'patterns §23 바뀐 필드만'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('설정에 들어가면 이름 · 소개글 · 연락처 3줄 · [저장](비활성)이 보인다', async () => {
      await page.goto(SETTINGS);
      await expect(page.getByLabel('호스트 이름')).toHaveValue('고스락');
      await expect(page.getByTestId('contact-row')).toHaveCount(3);
      await expect(page.getByRole('button', { name: '문의처 추가' })).toBeVisible();
      await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
    });
    await step('이름을 바꾸고 [저장]하면 "저장했어요" 토스트', async () => {
      await page.getByLabel('호스트 이름').fill('고스락 밴드');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByText('저장했어요')).toBeVisible();
      expect(
        mockApi
          .calls()
          .filter((c) => c.method !== 'GET')
          .map((c) => [c.method, c.path, c.status]),
      ).toEqual([['PATCH', '/api/v2/hosts/11', 200]]);
    });
    await step('공연준비 홈 호스트 탭 카드도 새 이름', async () => {
      await page.goto('/hosting?tab=hosts');
      await expect(page.getByTestId('my-host').getByRole('link')).toHaveText('고스락 밴드');
    });
  },
);

scenario(
  'HS-2',
  '설정 — 프로필 이미지를 올리면 미리보기, [저장]하면 다시 열어도 그 이미지',
  {
    kind: '정상',
    summary:
      'PH-15 발급 → S3 PUT → 폼 값에 key → [저장] 때 PH-4. 이미지 칸 위치·모양은 디자인 없음(🤖 폼 맨 아래 DS DropZone).',
    basis: ['plan P10b 완료 기준 V "호스트 이미지가 업로드 뒤 표시됨"', 'patterns §23'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    // 올린 이미지 주소(가짜 S3)를 그릴 수 있게 GET도 PNG로 답한다
    await page.route(
      (url) =>
        url.href.startsWith(MOCK_S3_ORIGIN) || /\/host\/11\/[0-9a-f-]{36}\.png$/.test(url.href),
      (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ status: 200, contentType: 'image/png', body: PNG.buffer })
          : route.fulfill({ status: 200, headers: S3_CORS, body: '' }),
    );
    await setMockSession(page, 'loggedIn');
    await step('[프로필 이미지 올리기]로 파일을 고르면 그 칸에 미리보기', async () => {
      await page.goto(SETTINGS);
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: '프로필 이미지 올리기' }).click();
      await (await chooser).setFiles(PNG);
      const img = page.getByTestId('image-PROFILE').getByRole('img', { name: '프로필 이미지' });
      await expect(img).toHaveAttribute('src', /\/host\/11\/[0-9a-f-]{36}\.png$/);
      await img.scrollIntoViewIfNeeded();
    });
    await step('[저장]하면 PH-15 → PH-4, 새로 열어도 같은 이미지', async () => {
      const src = await page
        .getByTestId('image-PROFILE')
        .getByRole('img', { name: '프로필 이미지' })
        .getAttribute('src');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByText('저장했어요')).toBeVisible();
      expect(
        mockApi
          .calls()
          .filter((c) => c.method !== 'GET')
          .map((c) => [c.method, c.path]),
      ).toEqual([
        ['POST', '/api/v2/hosts/11/images'],
        ['PATCH', '/api/v2/hosts/11'],
      ]);
      await page.reload();
      const img = page.getByTestId('image-PROFILE').getByRole('img', { name: '프로필 이미지' });
      await expect(img).toHaveAttribute('src', src!);
      await img.scrollIntoViewIfNeeded();
    });
  },
);

scenario(
  'HS-3',
  '설정 — 서버가 연락처 형식 오류(HOST_400_16)를 내면 연락처 영역에 오류, 고치면 사라진다',
  {
    kind: '에러',
    summary: '서버가 어느 줄인지 알려 주지 않아 연락처 영역 전체 오류(P10a와 같은 문구).',
    basis: ['patterns §24 P10b HOST_400_16'],
    mocks: [
      http.patch('*/api/v2/hosts/11', () =>
        HttpResponse.json(envelope.error(400, 'HOST_400_16'), { status: 400 }),
      ),
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('연락처를 고쳐 [저장]하면 연락처 묶음 아래에 오류', async () => {
      await page.goto(SETTINGS);
      await page.getByLabel('연락처 1', { exact: true }).fill('@gosrock');
      await page.getByRole('button', { name: '저장' }).click();
      await expect(page.getByRole('alert').filter({ hasText: '연락처' })).toBeVisible();
    });
    await step('연락처를 다시 고치면 오류가 사라진다', async () => {
      await page.getByLabel('연락처 1', { exact: true }).fill('@gosrock_band');
      await expect(page.getByRole('alert').filter({ hasText: '연락처' })).toHaveCount(0);
    });
  },
);

scenario(
  'HS-4',
  '설정 — 일반 멤버는 읽기 전용(칸 잠김, [저장]·[문의처 추가] 없음)',
  {
    kind: '권한',
    summary: 'Q53 기본안 — 일반 멤버가 설정 주소로 오면 읽기 전용(canEdit false), 비멤버만 403.',
    basis: [
      'design-requests Q53',
      'patterns §22 일반 멤버 = 읽기 전용',
      'plan P10b 완료 기준 V 3시점',
    ],
  },
  async ({ page, step }) => {
    reset();
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await step('설정을 열면 "일반 멤버는 볼 수만 있어요"와 잠긴 칸, [저장] 없음', async () => {
      await page.goto(SETTINGS);
      await expect(page.getByTestId('read-only')).toHaveText('일반 멤버는 볼 수만 있어요');
      await expect(page.getByLabel('호스트 이름')).toHaveAttribute('readonly', '');
      await expect(page.getByRole('button', { name: '저장' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '문의처 추가' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '프로필 이미지 올리기' })).toBeDisabled();
    });
  },
);

// ─── 멤버 관리 ───────────────────────────────────────────────

scenario(
  'HS-5',
  '멤버(마스터) — 목록 · ⋮(권한 변경 · 마스터 양도 · 멤버 삭제) · 권한 가이드 · [+ 멤버 초대하기]',
  {
    kind: '정상',
    summary:
      '와이어 503:30922 · 503:31732. 일반 멤버는 역할 글자를 비운다(와이어). 마스터 행·내 행에는 ⋮가 없다. 권한 가이드에 "호스트 삭제" 행 없음.',
    basis: ['plan P10b V 범위', '와이어 503:30922 · 503:31732 · 503:30950', 'patterns §22'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('멤버에 들어가면 4명 — 나(마스터)에는 ⋮가 없고 나머지에는 있다', async () => {
      await page.goto(MEMBERS);
      await expect(page.getByTestId('member-row')).toHaveCount(4);
      await expect(page.getByTestId('member-role')).toHaveText([
        '마스터',
        '매니저',
        '일반',
        '일반',
      ]);
      await expect(row(page, '두둥이').getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '멤버 초대하기' })).toBeVisible();
    });
    await step('이드럼 ⋮를 열면 권한 변경 · 마스터 양도 · 멤버 삭제', async () => {
      await expect(await openMenu(page, '이드럼')).toHaveText([
        '권한 변경',
        '마스터 양도',
        '멤버 삭제',
      ]);
    });
    await step('[멤버 권한이란?]을 누르면 권한 가이드 표 — "호스트 삭제" 행이 없다', async () => {
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '멤버 권한이란?' }).click();
      const guide = page.getByRole('table', { name: '권한 가이드' });
      await expect(guide).toBeVisible();
      await expect(guide).not.toContainText('호스트 삭제');
    });
  },
);

scenario(
  'HS-6',
  '초대 — 가입되지 않은 이메일이면 그 줄에 사유, 고쳐서 다시 내면 추가되고 닫힌다',
  {
    kind: '에러',
    summary:
      '와이어 503:32779(이메일 1칸 + 역할(기본 "일반") + [초대하기]). 문구는 "바로 멤버로 추가됩니다"(서버는 즉시 멤버). 실패 사유는 HOST_400_13 → 줄 오류.',
    basis: [
      'plan P10b V 범위 · 완료 기준 V "초대 실패 줄 표시"',
      'patterns §24 P10b HOST_400_13~15 · 18',
      '와이어 503:32779',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const dialog = page.getByRole('dialog', { name: '멤버 초대하기' });
    await step(
      '[+ 멤버 초대하기]를 누르면 초대 팝업 — 이메일이 비면 [초대하기] 비활성',
      async () => {
        await page.goto(MEMBERS);
        await page.getByRole('button', { name: '멤버 초대하기' }).click();
        await expect(dialog).toContainText('초대하면 바로 멤버로 추가됩니다.');
        await expect(dialog.getByLabel('역할')).toHaveText('일반');
        await expect(dialog.getByRole('button', { name: '초대하기' })).toBeDisabled();
      },
    );
    await step(
      '가입되지 않은 이메일로 초대하면 칸 아래 미가입 안내와 다음 행동(#106)',
      async () => {
        await dialog.getByLabel('초대할 이메일').fill('nobody@example.com');
        await dialog.getByRole('button', { name: '초대하기' }).click();
        await expect(dialog.getByRole('alert')).toHaveText(
          '가입되지 않은 이메일이에요. 상대가 두둥에 가입한 뒤 그 카카오 계정 이메일로 다시 초대해 주세요',
        );
      },
    );
    await step('가입한 이메일로 고쳐 다시 내면 팝업이 닫히고 목록에 5명 + 토스트', async () => {
      await dialog.getByLabel('초대할 이메일').fill('guitar@example.com');
      await dialog.getByRole('button', { name: '초대하기' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByTestId('member-row')).toHaveCount(5);
      await expect(page.getByText('멤버를 초대했어요')).toBeVisible();
    });
  },
);

scenario(
  'HS-7',
  '권한 변경 — 이드럼(일반 → 매니저) 확인 팝업 뒤 바로 바뀌고 토스트',
  {
    kind: '정상',
    summary:
      '와이어 503:31833 "멤버 권한 변경"(바꿀 역할은 늘 하나라 드롭다운 대신 글자 — 🤖), 완료 토스트 503:31972.',
    basis: ['와이어 503:31833 · 503:31972', 'api-contract PH-10'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const popup = page.getByRole('alertdialog', { name: '멤버 권한 변경' });
    await step('⋮ → 권한 변경을 누르면 "일반 → 매니저" 팝업', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '이드럼')).filter({ hasText: '권한 변경' }).click();
      await expect(popup.getByTestId('role-change')).toHaveText(/일반.*매니저/);
    });
    await step(
      '[변경하기]를 누르면 이드럼이 매니저 + "멤버의 권한을 변경하였습니다."',
      async () => {
        await popup.getByRole('button', { name: '변경하기' }).click();
        await expect(popup).toHaveCount(0);
        await expect(row(page, '이드럼').getByTestId('member-role')).toHaveText('매니저');
        await expect(page.getByText('멤버의 권한을 변경하였습니다.')).toBeVisible();
      },
    );
  },
);

scenario(
  'HS-8',
  '마스터 양도 — 확인 뒤 내가 매니저가 되고 메뉴가 매니저 기준으로 바뀐다',
  {
    kind: '정상',
    summary:
      '와이어 503:32075 문구 그대로 + "받는 멤버: ○○"(🤖). 양도 뒤 myRole 쿼리를 다시 읽어 버튼이 바뀐다.',
    basis: ['와이어 503:32075 · 503:32266', 'plan P10b 완료 기준 L myRole 무효화'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const popup = page.getByRole('alertdialog', { name: '마스터 권한을 양도하시겠어요?' });
    await step('김매니저 ⋮ → 마스터 양도를 누르면 확인 팝업(받는 멤버: 김매니저)', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '김매니저')).filter({ hasText: '마스터 양도' }).click();
      await expect(popup).toContainText('현재 마스터는 매니저 권한으로 변경됩니다');
      await expect(popup).toContainText('받는 멤버: 김매니저');
    });
    await step('[양도하기]를 누르면 김매니저가 마스터, 나는 매니저 + 토스트', async () => {
      await popup.getByRole('button', { name: '양도하기' }).click();
      await expect(page.getByText('마스터 권한을 양도하였습니다.')).toBeVisible();
      await expect(row(page, '김매니저').getByTestId('member-role')).toHaveText('마스터');
      await expect(row(page, '두둥이').getByTestId('member-role')).toHaveText('매니저');
      await expect(row(page, '김매니저').getByRole('button')).toHaveCount(0);
    });
    await step('이제 이드럼 ⋮에는 "멤버 삭제"만', async () => {
      await expect(await openMenu(page, '이드럼')).toHaveText(['멤버 삭제']);
    });
  },
);

scenario(
  'HS-9',
  '멤버 삭제 — 확인 팝업 뒤 행이 사라진다',
  {
    kind: '정상',
    summary:
      '와이어는 ⋮ "멤버 삭제" 항목만 있고 확인 화면이 없다 — DS 확인 팝업 + 토스트(🤖, Figma 코멘트).',
    basis: ['와이어 503:31732', 'api-contract DH-11'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const popup = page.getByRole('alertdialog', { name: '이드럼님을 멤버에서 삭제할까요?' });
    await step('이드럼 ⋮ → 멤버 삭제를 누르면 확인 팝업', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '이드럼')).filter({ hasText: '멤버 삭제' }).click();
      await expect(popup).toBeVisible();
    });
    await step('[삭제하기]를 누르면 3명 + "멤버를 삭제했어요"', async () => {
      await popup.getByRole('button', { name: '삭제하기' }).click();
      await expect(page.getByTestId('member-row')).toHaveCount(3);
      await expect(row(page, '이드럼')).toHaveCount(0);
      await expect(page.getByText('멤버를 삭제했어요')).toBeVisible();
    });
  },
);

scenario(
  'HS-10',
  '멤버(매니저) — 일반 멤버 행에만 ⋮(멤버 삭제), 초대 역할은 "일반" 고정',
  {
    kind: '권한',
    summary:
      '매니저는 역할 변경·양도·매니저 삭제를 못 한다(can). 초대 역할 드롭다운은 잠긴 "일반".',
    basis: ['plan P10b 완료 기준 L 매니저 "일반" 고정', 'api-contract §2', 'patterns §22'],
  },
  async ({ page, step }) => {
    reset();
    actAsRole(11, 'MANAGER');
    await setMockSession(page, 'loggedIn');
    await step('매니저로 열면 마스터·매니저 행에 ⋮가 없고, 일반 행 ⋮는 "멤버 삭제"만', async () => {
      await page.goto(MEMBERS);
      await expect(row(page, '김매니저').getByRole('button')).toHaveCount(0);
      await expect(row(page, '두둥이').getByRole('button')).toHaveCount(0);
      await expect(await openMenu(page, '이드럼')).toHaveText(['멤버 삭제']);
    });
    await step('초대 팝업의 역할은 "일반"으로 잠겨 있다', async () => {
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '멤버 초대하기' }).click();
      const role = page.getByRole('dialog', { name: '멤버 초대하기' }).getByLabel('역할');
      await expect(role).toHaveText('일반');
      await expect(role).toBeDisabled();
    });
  },
);

scenario(
  'HS-11',
  '멤버(일반) — 목록만, ⋮ · [+ 멤버 초대하기] 없음',
  {
    kind: '권한',
    summary: '일반 멤버는 볼 수만 있다. 권한 가이드는 볼 수 있다.',
    basis: ['plan P10b 완료 기준 V 3시점', 'patterns §22'],
  },
  async ({ page, step }) => {
    reset();
    actAsRole(11, 'GUEST');
    await setMockSession(page, 'loggedIn');
    await step('일반으로 열면 4명 목록만 — ⋮와 초대 버튼이 없다', async () => {
      await page.goto(MEMBERS);
      await expect(page.getByTestId('member-row')).toHaveCount(4);
      await expect(page.getByTestId('member-row').getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '멤버 초대하기' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '멤버 권한이란?' })).toBeVisible();
    });
  },
);

scenario(
  'HS-12',
  'SUPER_ADMIN(멤버 아님, myRole null) — 설정은 편집, 멤버는 매니저 범위 + 권한 변경',
  {
    kind: '권한',
    summary:
      'G+ 조회(GH-6) 성공 + myRole null = SUPER_ADMIN(superAdminOrRole). 403이 아니다. 역할 변경·매니저 삭제·양도는 서버 도메인 규칙이 막아 숨긴다.',
    basis: ['사용자 결정 2026-10-31 SUPER_ADMIN 허용', 'features/shared/permission can'],
    // GH-3 viewer만 myRole null로 — GH-6(G+)은 기본 핸들러가 성공시킨다(SUPER_ADMIN은 G+ 조회를 통과한다)
    mocks: hostSets
      .viewAs(11, { myRole: null })
      .filter((h) => h.info.method === 'GET' && h.info.path === '*/api/v2/hosts/:hostId'),
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('설정은 편집할 수 있다([저장] 있음, 읽기 전용 아님)', async () => {
      await page.goto(SETTINGS);
      await expect(page.getByLabel('호스트 이름')).toHaveValue('고스락');
      await expect(page.getByTestId('read-only')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
    });
    await step(
      '멤버는 권한 변경 · 일반 멤버 삭제만(양도 없음), 초대 역할 "일반" 고정',
      async () => {
        await page.goto(MEMBERS);
        await expect(page.getByText('권한이 없어요')).toHaveCount(0);
        // 역할 변경은 도메인 규칙이 요청자를 다시 보지 않아 된다(can SUPER_ADMIN_BLOCKED 밖). 매니저 삭제·양도는 숨김
        await expect(await openMenu(page, '김매니저')).toHaveText(['권한 변경']);
        await page.keyboard.press('Escape');
        await expect(await openMenu(page, '이드럼')).toHaveText(['권한 변경', '멤버 삭제']);
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: '멤버 초대하기' }).click();
        await expect(
          page.getByRole('dialog', { name: '멤버 초대하기' }).getByLabel('역할'),
        ).toBeDisabled();
      },
    );
  },
);

scenario(
  'HS-13',
  '비멤버는 공용 403, 없는 호스트는 공용 404',
  {
    kind: '에러',
    summary: '호스팅 센터는 클라이언트 조회라 공용 안내 화면(상태 코드 200).',
    basis: ['plan P10b 완료 기준 L 비멤버 403', 'patterns §11'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('비멤버(소음공작소 12) 멤버 화면은 "권한이 없어요"', async () => {
      await page.goto('/hosting/hosts/12/members');
      await expect(page.getByText('권한이 없어요')).toBeVisible();
    });
    await step('없는 호스트 설정은 "찾을 수 없어요"', async () => {
      await page.goto(`/hosting/hosts/${MISSING_HOST_ID}/settings`);
      await expect(page.getByText('찾을 수 없어요')).toBeVisible();
    });
  },
);

scenario(
  'HS-14',
  '권한 변경 중 상대가 이미 나갔으면(HOST_404_2) 목록 위 안내 + 목록 다시 읽기',
  {
    kind: '에러',
    summary: '팝업은 닫히고 토스트 대신 목록 위에 안내. GH-6을 다시 읽는다.',
    basis: ['patterns §24 P10b HOST_404_2'],
    mocks: [
      http.patch('*/api/v2/hosts/11/members/:userId/role', () =>
        HttpResponse.json(envelope.error(404, 'HOST_404_2'), { status: 404 }),
      ),
    ],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('권한 변경을 확인하면 "이미 멤버가 아니에요" 안내', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '이드럼')).filter({ hasText: '권한 변경' }).click();
      await page
        .getByRole('alertdialog', { name: '멤버 권한 변경' })
        .getByRole('button', { name: '변경하기' })
        .click();
      await expect(page.getByRole('main').getByRole('alert')).toHaveText(
        '이미 멤버가 아니에요. 목록을 새로 불러왔어요',
      );
      await expect(page.getByText('멤버의 권한을 변경하였습니다.')).toHaveCount(0);
      await expect
        .poll(
          () =>
            mockApi
              .calls()
              .filter((c) => c.method === 'GET' && c.path === '/api/v2/hosts/11/members').length,
        )
        .toBe(2);
    });
  },
);
