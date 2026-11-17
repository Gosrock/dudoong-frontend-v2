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
 * 설정의 근거는 **GUI**(Design Sync #260, 모바일 Ready만 — `741:31172` 미입력 · `1452:40541` 저장 가능 · `1452:42653` 저장 없이 이동 ·
 * `1458:4961` · `1476:8399` 이미지 자르기 · `1478:9437` 연락처 여러 줄 — `p5c-gui-host-home`), 2026-11-16 #278 · #292 · #294로 이미지 안내 · 오류
 * (`1524:13269` · `1524:13380` · `1525:13546`) · 커버 2:1 · PC 1440(`1496:12683` — 가운데 960)을 더했다(`design-278-295`).
 * 멤버 관리(HS-5~)는 2026-11-15부터 **GUI**(모바일 Ready, Design Sync #263~#266 · #268 — `p10b-gui-members`). 옛 와이어 근거: 멤버 흐름 `503:30866`
 * (목록 `503:30922` · ⋮ `503:31732` · 권한 변경 `503:31833` · 양도 `503:32075` · 초대 `503:32779` · 권한 가이드 `503:30950`).
 * 고스락(11)의 mock 멤버: 두둥이(나, 마스터) · 김매니저(매니저) · 이드럼(일반) · 이름 없음(일반).
 *
 * 범주 검토
 * - 빈 상태: 해당 없음 — 멤버 목록에는 늘 마스터(나 포함)가 있다. 연락처는 1줄 이상(서버 규칙)
 * - 크롤러: 해당 없음 — 보호 화면(로그인 게이트 안, 서버 조회 없음). 비로그인 → 로그인은 e2e `hosting-host.spec.ts`
 * - 반응형: 모든 시나리오가 mobile · desktop — 설정 PC는 가운데 960 세로 폼(HS-20이 1440을 찍는다), 멤버는 [+ 멤버 초대하기] 위치만 바뀐다
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
      'GUI 1452:40541 순서(← 호스트 홈 설정 · 호스트 이름* · 소개글 · 호스트 대표 연락처* + [문의처 추가] · 프로필 이미지 · 커버 이미지 · [저장]). 바뀐 필드만 PH-4.',
    basis: ['plan P10b V 범위', 'GUI 741:31172 · 1452:40541', 'patterns §23 바뀐 필드만'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step(
      '설정에 들어가면 이름 · 소개글 · 연락처 3줄 · 이미지 두 칸 · [저장](비활성)이 보인다',
      async () => {
        await page.goto(SETTINGS);
        await expect(page.getByRole('heading', { level: 1, name: '호스트 홈 설정' })).toBeVisible();
        await expect(page.getByRole('group', { name: '프로필 이미지' })).toBeVisible();
        await expect(page.getByRole('group', { name: '커버 이미지' })).toBeVisible();
        await expect(page.getByLabel('호스트 이름')).toHaveValue('고스락');
        await expect(page.getByTestId('contact-row')).toHaveCount(3);
        await expect(page.getByRole('button', { name: '문의처 추가' })).toBeVisible();
        await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
      },
    );
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
  '설정 — 프로필 이미지를 고르면 위치 조정 시트 → [적용]하면 미리보기, [저장]하면 다시 열어도 그 이미지',
  {
    kind: '정상',
    summary:
      'GUI 1458:4961 "이미지 위치 조정"(원 가이드 · 확대 막대 · [다시 선택] [적용]) → 자른 결과를 PH-15 발급 → S3 PUT → 폼 값에 key → [저장] 때 PH-4.',
    basis: [
      'plan P10b 완료 기준 V "호스트 이미지가 업로드 뒤 표시됨"',
      'GUI 1452:40541 · 1458:4961',
      'patterns §23',
    ],
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
    await step('[이미지 업로드]로 파일을 고르면 "이미지 위치 조정" 시트', async () => {
      await page.goto(SETTINGS);
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: '프로필 이미지 업로드' }).click();
      await (await chooser).setFiles(PNG);
      const sheet = page.getByRole('dialog', { name: '이미지 위치 조정' });
      await expect(sheet.getByRole('slider', { name: '확대 배율' })).toBeVisible();
      await expect(sheet.getByRole('button', { name: '다시 선택' })).toBeVisible();
    });
    await step('[적용]하면 자른 이미지가 올라가 그 칸에 미리보기', async () => {
      await page
        .getByRole('dialog', { name: '이미지 위치 조정' })
        .getByRole('button', { name: '적용' })
        .click();
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
      await expect(page.getByRole('button', { name: '프로필 이미지 업로드' })).toBeDisabled();
    });
  },
);

scenario(
  'HS-18',
  '설정 — 커버 이미지를 고르면 직사각 가이드 시트, ✕로 닫으면 바뀌지 않는다',
  {
    kind: '정상',
    summary:
      'GUI 1476:8399 커버 이미지 자르기 — 2:1 가이드(340×170, #278). 닫으면 아무것도 올리지 않는다.',
    basis: ['GUI 1476:8399', 'Design Sync #260 · #278'],
  },
  async ({ page, mockApi, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('[커버 이미지 업로드]로 파일을 고르면 시트가 열린다', async () => {
      await page.goto(SETTINGS);
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: '커버 이미지 업로드' }).click();
      await (await chooser).setFiles(PNG);
      await expect(page.getByRole('dialog', { name: '이미지 위치 조정' })).toBeVisible();
    });
    await step('✕로 닫으면 올리지 않고 [저장]도 그대로 비활성', async () => {
      await page
        .getByRole('dialog', { name: '이미지 위치 조정' })
        .getByRole('button', { name: '닫기' })
        .click();
      await expect(page.getByRole('dialog', { name: '이미지 위치 조정' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
      expect(mockApi.calls().filter((c) => c.method !== 'GET')).toEqual([]);
    });
  },
);

scenario(
  'HS-20',
  '설정 — 이미지 칸 안내 문구 · 형식 · 10MB · 업로드 실패는 칸 아래 빨간 글 + 빨간 테두리([다시 올리기] 없음)',
  {
    kind: '에러',
    summary:
      'GUI 1525:13546 안내 · 오류 문구 · 1524:13380 실패(빨간 테두리 · 안내 자리에 빨간 글, 다시 고를 때는 상자 안 [이미지 업로드] — #278 3) · 1525:13517 안내(#292). 10MB는 원본 기준, 자르기 전에 막는다. PC 1440(1496:12683)은 가운데 960 · 커버 칸 960×171.',
    basis: [
      'GUI 1525:13546 · 1524:13380 · 1525:13517 · 1496:12683',
      'Design Sync #278 · #292 · #294',
    ],
  },
  async ({ page, mockApi, step, testInfo }) => {
    reset();
    await page.route(
      (url) => url.href.startsWith(MOCK_S3_ORIGIN),
      (route) => route.fulfill({ status: 500, headers: S3_CORS, body: '' }),
    );
    await setMockSession(page, 'loggedIn');
    await step(
      '칸 아래 회색 안내 — 프로필 "정사각형 권장" · 커버 "중요한 내용은 가운데에 두세요."',
      async () => {
        await page.goto(SETTINGS);
        await expect(
          page.getByTestId('image-PROFILE').getByText('JPG, JPEG, PNG · 최대 10MB · 정사각형 권장'),
        ).toBeVisible();
        await expect(
          page
            .getByTestId('image-COVER')
            .getByText('JPG, JPEG, PNG · 최대 10MB · 중요한 내용은 가운데에 두세요.'),
        ).toBeVisible();
      },
    );
    await step('GIF를 고르면 요청 없이 "JPG, JPEG, PNG 파일만 올릴 수 있어요."', async () => {
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: '프로필 이미지 업로드' }).click();
      await (
        await chooser
      ).setFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
      await expect(page.getByTestId('image-PROFILE').getByRole('alert')).toHaveText(
        'JPG, JPEG, PNG 파일만 올릴 수 있어요.',
      );
      await expect(page.getByRole('dialog', { name: '이미지 위치 조정' })).toHaveCount(0);
    });
    await step('10MB가 넘는 사진은 자르기 전에 "10MB 이하의 사진만 올릴 수 있어요."', async () => {
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: '커버 이미지 업로드' }).click();
      await (
        await chooser
      ).setFiles({
        name: 'big.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
      });
      await expect(page.getByTestId('image-COVER').getByRole('alert')).toHaveText(
        '10MB 이하의 사진만 올릴 수 있어요.',
      );
      await expect(page.getByRole('dialog', { name: '이미지 위치 조정' })).toHaveCount(0);
    });
    await step(
      'S3 업로드가 실패하면 "이미지를 올리지 못했어요. 다시 시도해 주세요." — [다시 올리기] 없음',
      async () => {
        const chooser = page.waitForEvent('filechooser');
        await page.getByRole('button', { name: '커버 이미지 업로드' }).click();
        await (await chooser).setFiles(PNG);
        await page
          .getByRole('dialog', { name: '이미지 위치 조정' })
          .getByRole('button', { name: '적용' })
          .click();
        await expect(page.getByTestId('image-COVER').getByRole('alert')).toHaveText(
          '이미지를 올리지 못했어요. 다시 시도해 주세요.',
        );
        await expect(page.getByRole('button', { name: '다시 올리기' })).toHaveCount(0);
        expect(mockApi.calls().filter((c) => c.method === 'PATCH')).toEqual([]);
      },
    );
    if (testInfo.project.name === 'desktop') {
      await step('PC 1440 — 가운데 960 · 커버 칸 960×171(1496:12683)', async () => {
        await page.setViewportSize({ width: 1440, height: 1502 });
        await page.getByTestId('image-COVER').scrollIntoViewIfNeeded();
        const box = await page.getByTestId('image-COVER').boundingBox();
        expect(box?.x).toBe(240);
        expect(box?.width).toBe(960);
      });
    }
  },
);

scenario(
  'HS-19',
  '설정 — 바꾼 채로 [←]를 누르면 "저장하지 않고 이동할까요?"',
  {
    kind: '정상',
    summary:
      'GUI 1452:42653 저장 없이 이동 — [계속 작성] [이동하기](Warning). 호스팅 편집 화면 공통 창(useLeaveGuard).',
    basis: ['GUI 1452:42653', 'Design Sync #260'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('이름을 바꾸고 [←]를 누르면 확인 창', async () => {
      await page.goto(SETTINGS);
      await page.getByLabel('호스트 이름').fill('고스락 밴드');
      await page.getByRole('link', { name: '뒤로 가기' }).click();
      const popup = page.getByRole('alertdialog', { name: '저장하지 않고 이동할까요?' });
      await expect(popup.getByRole('button', { name: '계속 작성' })).toBeVisible();
      await expect(popup.getByRole('button', { name: '이동하기' })).toBeVisible();
    });
    await step('[이동하기]를 누르면 호스트 홈으로', async () => {
      await page.getByRole('button', { name: '이동하기' }).click();
      await expect(page).toHaveURL(/\/hosts\/11$/);
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
      'GUI 1421:755 · 1422:918. 역할 글자는 모두 보인다(마스터 보라 · 매니저 청록 · 일반 회색). 마스터 행·내 행에는 ⋮가 없다. 권한 안내 시트(1452:54461)에 "호스트 삭제" 행 없음.',
    basis: [
      'plan P10b V 범위',
      'GUI 1421:755 · 1422:918 · 1452:54461(#263 · #265)',
      'patterns §22',
    ],
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
    await step('[멤버 권한에 대해서]를 누르면 권한 안내 표 — "호스트 삭제" 행이 없다', async () => {
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '멤버 권한에 대해서' }).click();
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
      'GUI 초대 시트 1422:1911(이메일 1칸 + 역할(기본 "일반") + [초대하기]). 설명 첫 줄 "카카오톡에 가입한 이메일로 적어주세요."(#283), 둘째 줄은 "가입한 이메일은 바로 멤버로 추가돼요."(서버는 즉시 멤버 — Figma "상대방 승인 후"와 다름 🤖 Q229). 실패 사유는 HOST_400_13 → 줄 아래 사유(1427:4143).',
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
        // 설명 두 줄(#283 · #284 — 카카오톡 안내는 설명 첫 줄로 옮겨짐), 팝업의 설명으로 읽힌다
        await expect(dialog).toHaveAccessibleDescription(
          /카카오톡에 가입한 이메일로 적어주세요\.\s*가입한 이메일은 바로 멤버로 추가돼요\./,
        );
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
          '가입되지 않은 이메일이에요. 초대 링크를 만들어 보낼 수 있어요',
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
      'GUI 1422:1121 "멤버 권한 변경" — [지금 권한(비활성)] → [바꿀 권한 ▾](기본은 다른 역할), 완료 토스트 1422:1164.',
    basis: ['GUI 1422:1121 · 1452:42791 · 1422:1164(#263)', 'api-contract PH-10'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const popup = page.getByRole('alertdialog', { name: '멤버 권한 변경' });
    await step('⋮ → 권한 변경을 누르면 "일반 → 매니저" 팝업', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '이드럼')).filter({ hasText: '권한 변경' }).click();
      await expect(popup.getByLabel('지금 권한')).toHaveValue('일반');
      await expect(popup.getByLabel('바꿀 권한')).toHaveText('매니저');
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
      'GUI 1422:1395 문구(받는 멤버 줄 없음, [양도하기] 빨강). 양도 뒤 myRole 쿼리를 다시 읽어 버튼이 바뀐다.',
    basis: ['와이어 503:32075 · 503:32266', 'plan P10b 완료 기준 L myRole 무효화'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const popup = page.getByRole('alertdialog', { name: '마스터 권한을 양도하시겠어요?' });
    await step('김매니저 ⋮ → 마스터 양도를 누르면 확인 팝업', async () => {
      await page.goto(MEMBERS);
      await (await openMenu(page, '김매니저')).filter({ hasText: '마스터 양도' }).click();
      await expect(popup).toContainText('현재 마스터는 매니저 권한으로 변경돼요.');
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
      await expect(page.getByRole('button', { name: '멤버 권한에 대해서' })).toBeVisible();
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

// ─── 미가입자 초대 링크(H-16~H-18, B33② · 백엔드 #933 — Api 2.5.7). GUI 1427:4143 · 1427:4357 · 1452:57010(#263 · #266) ───

scenario(
  'HS-15',
  '초대 — 가입되지 않은 이메일이면 [초대 링크 만들기] → 링크 · 만료일 · [링크 복사하기], 닫으면 "초대 대기"에 생긴다',
  {
    kind: '정상',
    summary:
      'PH-7이 HOST_400_13이면 같은 이메일 · 역할로 H-16. 링크는 지금 출처 + 서버 경로(/host-invitations/{token}). 메일이 안 갈 수 있어 링크를 직접 전한다(백엔드 #928). GUI 시트 1427:4357(회색 상자에 링크 한 줄 · 만료일 + [링크 복사하기], ✕로 닫음).',
    basis: [
      '이슈 #136 §8',
      'backend-questions B33②',
      'api-contract H-16 · H-17',
      'patterns §9 copyText',
    ],
  },
  async ({ page, step }) => {
    reset();
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await setMockSession(page, 'loggedIn');
    const dialog = page.getByRole('dialog', { name: '멤버 초대하기' });
    await step('미가입 이메일로 [초대하기] → 칸 아래 안내 + [초대 링크 만들기]', async () => {
      await page.goto(MEMBERS);
      await page.getByRole('button', { name: '멤버 초대하기' }).click();
      await dialog.getByLabel('초대할 이메일').fill('nobody@example.com');
      await dialog.getByRole('button', { name: '초대하기' }).click();
      await expect(dialog.getByRole('alert')).toHaveText(
        '가입되지 않은 이메일이에요. 초대 링크를 만들어 보낼 수 있어요',
      );
      await expect(dialog.getByRole('button', { name: '초대 링크 만들기' })).toBeVisible();
    });
    const done = page.getByRole('dialog', { name: '초대 링크를 만들었어요' });
    await step('[초대 링크 만들기] → 링크(지금 출처) · 만료 안내', async () => {
      await dialog.getByRole('button', { name: '초대 링크 만들기' }).click();
      await expect(done.getByTestId('invite-link').locator('p')).toHaveText(
        new RegExp(`^${new URL(page.url()).origin}/host-invitations/`),
      );
      await expect(done.getByTestId('invite-link')).toContainText(
        /만료일: \d{4}년 \d{1,2}월 \d{1,2}일/,
      );
    });
    await step('[링크 복사하기] → 토스트', async () => {
      await done.getByRole('button', { name: '링크 복사하기' }).click();
      await expect(page.getByText('링크를 클립보드에 복사했어요.')).toBeVisible();
    });
    await step('✕로 닫으면 "초대 대기"에 그 이메일', async () => {
      await done.getByRole('button', { name: '닫기' }).first().click();
      await expect(
        page.getByTestId('invitation-row').filter({ hasText: 'nobody@example.com' }),
      ).toHaveCount(1);
    });
  },
);

scenario(
  'HS-16',
  '초대 대기 — [취소] 확인 뒤 줄이 사라진다. 매니저는 매니저 초대를 취소할 수 없다',
  {
    kind: '권한',
    summary:
      'H-17 대기 초대(이메일 · 역할 · 만료). H-18 취소는 확인 창(openConfirm). 매니저는 일반 초대만 취소(can — 서버 HOST_400_11과 같은 기준). 일반 멤버에게는 목록이 없다.',
    basis: ['api-contract H-17 · H-18', 'patterns §6 확인 창 계약 · §22 can()'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const rows = page.getByTestId('invitation-row');
    await step('마스터 — 대기 3줄, 모두 [취소]', async () => {
      await page.goto(MEMBERS);
      await expect(rows).toHaveCount(3);
      await expect(rows.getByRole('button', { name: /초대 취소$/ })).toHaveCount(3);
    });
    await step('[취소] → "초대를 취소할까요?" → [초대 취소] → 토스트 · 2줄', async () => {
      await page.getByRole('button', { name: 'pending-guest@example.com 초대 취소' }).click();
      await expect(page.getByRole('alertdialog', { name: '초대를 취소할까요?' })).toBeVisible();
      await page.getByRole('button', { name: '초대 취소', exact: true }).click();
      await expect(page.getByText('초대를 취소했어요')).toBeVisible();
      await expect(rows).toHaveCount(2);
    });
    await step('매니저 — 매니저 초대 줄에는 [취소]가 없다', async () => {
      actAsRole(11, 'MANAGER');
      await page.reload();
      await expect(rows.filter({ hasText: 'pending-manager@' }).getByRole('button')).toHaveCount(0);
    });
    await step('일반 멤버 — "초대 대기"가 없다', async () => {
      actAsRole(11, 'GUEST');
      await page.reload();
      await expect(page.getByTestId('member-row')).toHaveCount(4);
      await expect(page.getByTestId('pending-invitations')).toHaveCount(0);
    });
  },
);

scenario(
  'HS-17',
  '초대 대기 목록이 5xx(스테이징 DDL 전)면 그 자리만 다시 시도 — 멤버 화면은 그대로',
  {
    kind: '에러',
    summary:
      'H-16~H-20은 스테이징 DDL V024 뒤에만 동작(그 전 500), 운영 2.5.3에는 없다(404 — 목록을 숨긴다). 멤버 목록 · 초대는 그대로 쓴다.',
    basis: ['이슈 #136 버전', 'api-contract H-17'],
    mocks: [
      http.get('*/api/v2/hosts/11/invitations', () =>
        HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 }),
      ),
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await step('멤버 4명 + "초대 대기 목록을 불러오지 못했어요" [다시 시도]', async () => {
      await page.goto(MEMBERS);
      await expect(page.getByTestId('member-row')).toHaveCount(4);
      await expect(page.getByText('초대 대기 목록을 불러오지 못했어요')).toBeVisible();
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    });
  },
);

scenario(
  'HS-20',
  '초대 시트 오류별 — 이미 멤버 · 같은 이메일 계정 여러 개 · 다시 초대 안내 · 링크 한도',
  {
    kind: '에러',
    summary:
      'GUI 1476:6806(HOST_400_15) · 1476:7024(HOST_400_18 두 줄) · 1476:7459(미가입인데 같은 이메일 대기 초대가 있으면 회색 상자 안 분홍 안내 — H-16이 옛 링크를 무효로 만든다) · 1476:7242(H-16 HOST_400_21 — 사유만, 상자 없음). 모두 칸 아래 사유(간격 8) · [초대하기] 비활성.',
    basis: [
      'Design Sync #286 · #289',
      'api-contract H-16(같은 이메일 대기 초대는 새 링크로 바꾼다 · 발급 한도)',
      'error-codes HOST_400_15 · 18 · 21',
    ],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    const dialog = page.getByRole('dialog', { name: '멤버 초대하기' });
    const email = dialog.getByLabel('초대할 이메일');
    const submit = async (value: string) => {
      await email.fill(value);
      await dialog.getByRole('button', { name: '초대하기' }).click();
    };
    await step('이미 멤버(drum@) — "이미 이 호스트의 멤버예요."', async () => {
      await page.goto(MEMBERS);
      await expect(page.getByTestId('invitation-row')).toHaveCount(3);
      await page.getByRole('button', { name: '멤버 초대하기' }).click();
      await submit('drum@example.com');
      await expect(dialog.getByRole('alert')).toHaveText('이미 이 호스트의 멤버예요.');
      await expect(dialog.getByRole('button', { name: '초대하기' })).toBeDisabled();
    });
    await step('같은 이메일 계정 여러 개(twin@) — 두 줄 사유', async () => {
      await submit('twin@example.com');
      await expect(dialog.getByRole('alert')).toHaveText(
        '같은 이메일로 가입한 계정이 여러 개라 초대할 수 없어요.\n다른 이메일로 초대해 주세요.',
      );
    });
    await step('대기 초대가 있는 미가입 이메일 — 상자 안 "이미 보낸 초대가 있어요"', async () => {
      await submit('pending-guest@example.com');
      await expect(dialog.getByTestId('invite-reinvite-notice')).toHaveText(
        '이미 보낸 초대가 있어요. 다시 초대하면 이전 링크는 쓸 수 없게 돼요.',
      );
    });
    await step('링크 한도(limit@) — [초대 링크 만들기] 뒤 사유만, 상자 없음', async () => {
      await submit('limit@example.com');
      await expect(dialog.getByTestId('invite-reinvite-notice')).toHaveCount(0);
      await dialog.getByRole('button', { name: '초대 링크 만들기' }).click();
      await expect(dialog.getByRole('alert')).toHaveText(
        '가입되지 않은 이메일이에요. 초대 링크를 보내야 하는데, 오늘은 더 만들 수 없어요 (최대 하루 20건). 나중에 다시 시도해 주세요.',
      );
      await expect(dialog.getByTestId('invite-link-offer')).toHaveCount(0);
    });
  },
);

scenario(
  'HS-21',
  '멤버 PC 1440 — 본문 960 가운데 · 머리 줄 [+ 멤버 초대하기] · 아바타 40 · 초대 모달 480',
  {
    kind: '반응형',
    summary:
      'GUI 1496:9302(마스터뷰) · 1496:12051(초대 대기) · 1496:11298(초대 모달). FAB 대신 머리 줄 오른쪽 Primary 버튼, 행 56(아바타 40), 매니저 글자 Teal 500(#282).',
    basis: ['Design Sync #282 · #296 · #297 · #298', 'patterns §1 반응형(1024부터 PC)'],
    viewports: ['desktop'],
  },
  async ({ page, step }) => {
    reset();
    await setMockSession(page, 'loggedIn');
    await page.setViewportSize({ width: 1440, height: 1024 });
    await step('목록 — 960 가운데, 버튼은 머리 줄 오른쪽 끝', async () => {
      await page.goto(MEMBERS);
      await expect(page.getByTestId('member-row')).toHaveCount(4);
      const list = await page.getByRole('list', { name: '멤버 목록' }).boundingBox();
      expect(list).toMatchObject({ x: 240, width: 960 });
      const invite = await page.getByRole('button', { name: '멤버 초대하기' }).boundingBox();
      expect(Math.round(invite!.x + invite!.width)).toBe(1200);
      const avatar = await page
        .getByTestId('member-row')
        .first()
        .locator('img, svg')
        .first()
        .boundingBox();
      expect(avatar).toMatchObject({ width: 40, height: 40 });
      await expect(
        page.getByTestId('member-role').filter({ hasText: '매니저' }).locator('*').first(),
      ).toHaveCSS('color', 'rgb(45, 163, 169)');
    });
    await step('[+ 멤버 초대하기] → 모달 480', async () => {
      await page.getByRole('button', { name: '멤버 초대하기' }).click();
      const dialog = page.getByRole('dialog', { name: '멤버 초대하기' });
      await expect(dialog).toBeVisible();
      // 열림 애니메이션(크기 변화)이 끝난 뒤의 폭
      await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(480);
    });
  },
);
