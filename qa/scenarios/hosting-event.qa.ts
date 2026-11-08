import type { Page, TestInfo } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { goEventMenu, pickFakeAddress, routeEventSdks } from '../../e2e/support/event-scope';
import { setEventCancelScenario } from '../../src/api/__mocks__/event-store';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { actAsRole } from '../../src/api/__mocks__/host-store';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { MOCK_S3_ORIGIN } from '../../src/api/__mocks__/upload-handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * P11-V 공연 사이드바 · 대시보드(등록 전) · 기본 정보 · 상세 정보 · 간편 만들기(plan P11 완료 기준 V).
 * GUI 근거(Ready for dev): 대시보드 등록 전 `727:23088`·`745:32167`·`727:23210`, 기본 정보 `748:33351`·`748:33451`·`748:34006`,
 * 상세 정보 `767:39585`·`767:39645` — PC 캡처는 Figma 프레임과 같은 1440으로 찍는다. 간편 만들기는 와이어 `108:2136`·`108:2200`.
 * 팝업·토스트·우편번호 창·지도 빈 칸은 디자인 없음(DS `Popup`·`toast`).
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 호스팅 센터(로그인 게이트 안, 서버 조회 없음)
 * - 에러: 화면 코드(patterns §24 P11)는 L 훅 테스트·e2e `hosting-event.spec`이 본다. 여기서는 체크리스트 조회 실패(재시도)만
 * - 반응형: 모든 시나리오 mobile · desktop. PC는 1440(Figma 폭), 모바일은 ☰ 드로어 · 제목 ▾ 공연 전환
 */

const S3_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'PUT',
  'access-control-allow-headers': 'content-type',
};
const PNG = { name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e]) };

const reset = () => {
  resetHostMockState();
  resetHostingStore();
};

/** PC는 Figma 프레임 폭(1440)으로 */
async function setUp(page: Page, testInfo: TestInfo) {
  reset();
  if (testInfo.project.name === 'desktop')
    await page.setViewportSize({ width: 1440, height: 1024 });
  await page.route(`${MOCK_S3_ORIGIN}/**`, (r) =>
    r.fulfill({ status: 200, headers: S3_CORS, body: '' }),
  );
  await routeEventSdks(page);
  await setMockSession(page, 'loggedIn');
}

const isDesktop = (testInfo: TestInfo) => testInfo.project.name === 'desktop';

/** 상세 정보 탭 메뉴 — 고른 탭을 한 번 더 누르면 PC 드롭다운 · 모바일 시트(#191) */
async function openTabMenu(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await tab.click();
}
const tabMenuItem = (page: Page, testInfo: TestInfo, label: string) =>
  isDesktop(testInfo)
    ? page.getByRole('menuitem', { name: label })
    : page.getByRole('dialog').getByRole('button', { name: label });

scenario(
  'HE-1',
  '등록 전 대시보드 — 사이드바 메뉴 4개 · 공연 카드, 체크리스트 0/3 · [공연 등록하기] 비활성',
  {
    kind: '정상',
    summary:
      'PC: 검정 사이드바(‹ 내 공연 · 포스터 + 공연명 + 호스트 · 메뉴 4 · "공연 페이지 보기" 없음) + 머리(포스터 · 일자 · 시간) + 체크리스트. 모바일: "대시보드 ▾ / 공연명" 헤더.',
    basis: [
      'plan P11 완료 기준 V(사이드바 등록 전 4개 · 모바일 헤더)',
      'GUI 727:23210 · 727:23088',
      'gui-screens §3 셸',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('준비중 공연의 대시보드를 열면 체크리스트 0/3이 보인다', async () => {
      await page.goto('/hosting/events/140/dashboard');
      await expect(page.getByRole('heading', { name: '필수 체크리스트' })).toBeVisible();
      await expect(page.getByTestId('checklist-progress')).toHaveText('0/3');
      await expect(page.getByRole('button', { name: '공연 등록하기' })).toBeDisabled();
    });
    await step(
      isDesktop(testInfo)
        ? '사이드바에 메뉴 4개 · 대시보드 선택, "공연 페이지 보기"가 없다'
        : '모바일 헤더에 "대시보드" 제목과 공연명이 보인다',
      async () => {
        if (isDesktop(testInfo)) {
          const side = page.getByTestId('event-sidebar');
          await expect(side.locator('li')).toHaveText([
            '대시보드',
            '기본 정보',
            '상세 정보',
            '티켓 관리',
          ]);
          await expect(side.getByRole('link', { name: '대시보드' })).toHaveAttribute(
            'aria-current',
            'page',
          );
          await expect(side.getByText('공연 페이지 보기')).toHaveCount(0);
        } else {
          await expect(
            page.getByRole('button', { name: /^대시보드 — 고스락 신입 환영 공연/ }),
          ).toBeVisible();
        }
      },
    );
  },
);

scenario(
  'HE-2',
  '체크리스트 3/3 — [공연 등록하기] → 확인 팝업(와이어 문구), 취소하면 그대로',
  {
    kind: '정상',
    summary:
      '세 항목이 모두 찬 상태(GE-7)면 검정 체크 3개 + 보라 버튼. 누르면 DS 팝업으로 한 번 묻는다.',
    basis: ['GUI 745:32167', '와이어 424:9837 등록 확인 팝업', 'plan P11 V'],
    mocks: [
      http.get('*/api/v2/events/140/checklist', () =>
        HttpResponse.json(
          envelope.ok({
            isBasicFilled: true,
            isDetailFilled: true,
            hasValidTicket: true,
            ticketRequired: true,
            canOpen: true,
          }),
        ),
      ),
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('3/3이면 체크 3개와 활성 [공연 등록하기]', async () => {
      await page.goto('/hosting/events/140/dashboard');
      await expect(page.getByTestId('checklist-progress')).toHaveText('3/3');
      await expect(page.getByRole('button', { name: '공연 등록하기' })).toBeEnabled();
    });
    await step('누르면 등록 확인 팝업이 뜬다', async () => {
      await page.getByRole('button', { name: '공연 등록하기' }).click();
      const dialog = page.getByRole('alertdialog', { name: '공연을 등록할까요?' });
      await expect(dialog).toContainText('모든 사용자에게 공개되며 삭제할 수 없어요');
    });
    await step('[취소]하면 닫히고 등록 요청은 없다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '취소' }).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
    });
  },
);

scenario(
  'HE-3',
  '등록된 공연 — 메뉴 6개 · 예매자 관리 배지 · "공연 페이지 보기", 모바일 ☰ 드로어 · 제목 ▾ 공연 바꾸기',
  {
    kind: '반응형',
    summary:
      'PC 사이드바는 등록 후 6개 + 승인 대기 수 배지 + 맨 아래 "공연 페이지 보기"(새 탭). 모바일은 ☰ → 같은 내용의 드로어, 제목 ▾ → 내 공연 목록 시트(Q37 기본안).',
    basis: [
      'plan P11 완료 기준 V(등록 후 6개 · 공연 페이지 보기 · 모바일 헤더)',
      'GUI 748:34006 사이드바',
      'design-requests Q37 · Q39 8번',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await page.goto('/hosting/events/101/info');
    if (isDesktop(testInfo)) {
      await step('사이드바에 메뉴 6개 · 기본 정보 선택 · "공연 페이지 보기"', async () => {
        const side = page.getByTestId('event-sidebar');
        await expect(side.locator('li')).toHaveCount(6);
        await expect(side.getByRole('link', { name: '기본 정보' })).toHaveAttribute(
          'aria-current',
          'page',
        );
        await expect(side.getByRole('link', { name: '공연 페이지 보기' })).toHaveAttribute(
          'href',
          '/events/101',
        );
      });
    } else {
      await step('☰를 누르면 공연 메뉴 드로어(메뉴 6개)가 열린다', async () => {
        await page.getByRole('button', { name: '공연 메뉴 열기' }).click();
        await expect(page.getByRole('dialog').locator('li')).toHaveCount(6);
      });
      await step(
        '드로어를 닫고 제목 ▾를 누르면 "공연 바꾸기" 시트에 내 공연이 보인다',
        async () => {
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await page.getByRole('button', { name: /다른 공연으로 바꾸기/ }).click();
          const sheet = page.getByRole('dialog', { name: '공연 바꾸기' });
          await expect(
            sheet.getByRole('list', { name: '내 공연' }).locator('li').first(),
          ).toBeVisible();
        },
      );
    }
  },
);

scenario(
  'HE-4',
  '기본 정보 — 포스터 미리보기, 주소 검색 → 지도 마커 좌표, 저장할 수 있을 때만 [미리보기]',
  {
    kind: '정상',
    summary:
      '빈 폼은 [미리보기][저장하기] 비활성, 지도 칸은 글자 없는 회색 칸. 포스터를 올리면 그 자리에 미리보기, 주소를 고르면 좌표를 얻고 지도 칸이 그 좌표로 그려진다. 바꾸면 [미리보기]가 열린다. 저장하면 토스트.',
    basis: [
      'plan P11 완료 기준 V(포스터 미리보기 · 미리보기 조건 · 지도 미리보기)',
      'GUI 748:33351 · 748:33451 · 748:34006',
      'gui-screens §2 기본 정보',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step(
      '기본 정보를 열면 [미리보기]·[저장하기]가 비활성, 지도 칸은 빈 회색 칸(GUI 748:33351)',
      async () => {
        await page.goto('/hosting/events/140/info');
        await expect(page.getByRole('button', { name: '미리보기' })).toBeDisabled();
        await expect(page.getByRole('button', { name: '저장하기' })).toBeDisabled();
        const map = page.getByTestId('place-map');
        await expect(map).toHaveText('');
        expect((await map.boundingBox())?.height).toBe(147);
      },
    );
    await step('포스터를 올리면 포스터 미리보기와 [이미지 수정]', async () => {
      await page.getByLabel('포스터 올리기').setInputFiles(PNG);
      await expect(page.getByRole('img', { name: '포스터 미리보기' })).toBeVisible();
      await expect(page.getByRole('button', { name: '이미지 수정' })).toBeVisible();
    });
    await step('주소를 고르면 지도 칸이 그 좌표로 그려진다', async () => {
      await pickFakeAddress(page);
      await expect(page.getByRole('textbox', { name: '주소 검색' })).toHaveValue(
        '서울 마포구 어울마당로 35',
      );
      await expect(page.getByTestId('place-map')).toHaveAttribute('data-lat', '37.5509');
      await expect(page.getByTestId('place-map')).toHaveAttribute('data-lng', '126.9219');
      await page.getByLabel('공연장 이름').fill('롤링홀');
    });
    await step('바꿨으니 [미리보기]가 열리고 포스터 · 공연명 · 장소가 보인다', async () => {
      await page.getByRole('button', { name: '미리보기' }).click();
      const preview = page.getByTestId('info-preview');
      await expect(preview).toContainText('고스락 신입 환영 공연(준비중)');
      await expect(preview).toContainText('롤링홀 · 서울 마포구 어울마당로 35');
      await page.keyboard.press('Escape');
    });
    await step('[저장하기]를 누르면 "저장했어요" 토스트', async () => {
      await page.getByRole('button', { name: '저장하기' }).click();
      await expect(page.getByText('저장했어요')).toBeVisible();
    });
  },
);

scenario(
  'HE-5',
  '등록된 공연의 기본 정보를 저장하면 안내 팝업, 티켓 여부는 잠겨 있다',
  {
    kind: '정상',
    summary:
      '서버는 예매자에게 알리지 않는다 — 저장 뒤 DS 팝업으로 알린다. 등록 후 티켓 여부 라디오는 비활성 + 안내.',
    basis: [
      'plan P11 완료 기준 V "등록된 공연을 저장하면 안내 팝업"',
      'api-contract §6 Event_400_18',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('등록된 공연(101) 기본 정보 — 티켓 여부가 잠겨 있다', async () => {
      await page.goto('/hosting/events/101/info');
      await expect(page.getByRole('radio', { name: '티켓 없음' })).toBeDisabled();
      await expect(page.getByTestId('has-ticket-locked')).toBeVisible();
    });
    await step('이름을 바꿔 저장하면 "이미 예매한 관객에게는…" 안내 팝업', async () => {
      await page.getByLabel('공연 이름').fill('고스락 제37회 정기공연 (앵콜)');
      await page.getByRole('button', { name: '저장하기' }).click();
      await expect(page.getByRole('alertdialog', { name: '저장했어요' })).toContainText(
        '이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요',
      );
    });
  },
);

scenario(
  'HE-6',
  '상세 정보 — 탭 · 에디터 카드, 탭 메뉴로 이름 바꾸기 · 삭제, 저장하면 전체 교체',
  {
    kind: '정상',
    summary:
      '기본 4탭 + 탭 추가(+) + 툴바 있는 에디터 카드. 본문을 쓰면 [미리보기]가 섹션 뷰어로 열린다. 고른 탭을 한 번 더 누르면 탭 메뉴(PC 드롭다운 · 모바일 시트) — [이름 바꾸기]는 PC 탭 입력칸 · 모바일 창, [탭 삭제]는 확인 뒤 토스트. 저장하면 PE-6 본문이 남은 탭으로 바뀐다(전체 교체).',
    basis: [
      'GUI 767:39585 · 767:39645(#190)',
      'GUI 탭 메뉴 1316:383 · 1336:957(#191) · 이름 변경 1320:383 · 1336:1015(#192) · 삭제 1325:14881 · 1325:15101 · 1336:1073 · 1336:1131(#193)',
      'plan P11 완료 기준 V "섹션 저장이 전체 교체임을 UI가 반영"',
      'P5b SectionViewer 재사용',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step(
      '상세 정보를 열면 탭 4개(공연 소개 선택)와 툴바 있는 에디터 카드가 보인다',
      async () => {
        await page.goto('/hosting/events/101/detail');
        await expect(page.getByTestId('section')).toHaveCount(4);
        const toolbar = page.getByRole('toolbar', { name: '본문 서식' });
        await expect(toolbar.getByRole('button')).toHaveText(['B', 'H', '', '이미지']);
      },
    );
    await step('본문을 쓰면 [미리보기]가 열리고 섹션 뷰어로 보인다', async () => {
      const editor = page.getByRole('textbox', { name: /본문$/ });
      await editor.click();
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.type(' 앵콜 공연이 추가되었어요');
      await page.getByRole('button', { name: '미리보기' }).click();
      await expect(page.getByTestId('sections-preview')).toContainText('앵콜 공연이 추가되었어요');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('sections-preview')).toHaveCount(0);
    });
    await step('다른 탭을 누르면 고르기만, 고른 탭을 한 번 더 누르면 탭 메뉴', async () => {
      await page.getByRole('tab', { name: '세트리스트' }).click();
      await expect(tabMenuItem(page, testInfo, '이름 바꾸기')).toHaveCount(0);
      await openTabMenu(page, '세트리스트');
      await expect(tabMenuItem(page, testInfo, '이름 바꾸기')).toBeVisible();
      await expect(tabMenuItem(page, testInfo, '탭 삭제')).toBeVisible();
    });
    await step(
      '[이름 바꾸기] — PC는 탭이 입력칸, 모바일은 창. 바꾸면 탭 이름이 바뀐다',
      async () => {
        await tabMenuItem(page, testInfo, '이름 바꾸기').click();
        const field = page.getByRole('textbox', { name: '탭 이름' });
        await expect(field).toBeFocused();
        await expect(field).toHaveValue('세트리스트');
        await field.fill('곡 목록');
        if (isDesktop(testInfo)) {
          await expect(page.getByText('4/20')).toBeVisible();
          await page.keyboard.press('Enter');
        } else {
          await expect(page.getByRole('alertdialog', { name: '탭 이름 바꾸기' })).toContainText(
            '4/20',
          );
          await page.getByRole('alertdialog').getByRole('button', { name: '저장' }).click();
        }
        await expect(page.getByRole('tab', { name: '곡 목록' })).toBeVisible();
      },
    );
    await step(
      '[탭 삭제] — 확인 창(빨강 [삭제]) 뒤 탭이 3개가 되고 "탭을 삭제했어요."',
      async () => {
        await openTabMenu(page, '곡 목록');
        await tabMenuItem(page, testInfo, '탭 삭제').click();
        const confirm = page.getByRole('alertdialog', { name: '‘곡 목록’ 탭을 삭제할까요?' });
        await expect(confirm).toContainText(
          '탭에 작성한 내용이 모두 삭제돼요. 삭제한 내용은 되돌릴 수 없어요.',
        );
        await confirm.getByRole('button', { name: '삭제' }).click();
        await expect(page.getByTestId('section')).toHaveCount(3);
        await expect(page.getByText('탭을 삭제했어요.')).toBeVisible();
      },
    );
    await step('저장하면 PE-6 본문에 남은 탭 3개만 간다', async () => {
      const put = page.waitForRequest(
        (r) => r.method() === 'PUT' && r.url().endsWith('/api/v2/events/101/sections'),
      );
      await page.getByRole('button', { name: '저장하기' }).click();
      const body = (await put).postDataJSON() as { sections: { title: string }[] };
      expect(body.sections.map((s) => s.title)).toEqual(['공연 소개', '예매안내', '유의사항']);
      await expect(page.getByRole('alertdialog', { name: '저장했어요' })).toBeVisible();
    });
  },
);

scenario(
  'HE-16',
  '상세 정보 — 새 탭은 "새 탭", 저장하지 않고 다른 메뉴로 가면 확인',
  {
    kind: '정상',
    summary:
      '(+)로 더한 탭은 이름 "새 탭"으로 시작한다. 고친 채 메뉴로 가면 "저장하지 않고 이동할까요?" — [계속 작성]이면 머문다.',
    basis: [
      'GUI 탭 이름 변경 1320:383(새 탭 3/20 — #192)',
      'GUI 저장 없이 이동시 확인 1331:838 · 1336:1168(#194 · #195)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('(+)를 누르면 "새 탭"이 생기고 골라진다', async () => {
      await page.goto('/hosting/events/101/detail');
      await expect(page.getByTestId('section')).toHaveCount(4);
      await page.getByRole('button', { name: '탭 추가' }).click();
      await expect(page.getByRole('tab', { name: '새 탭' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
    await step(
      '메뉴로 가려 하면 "저장하지 않고 이동할까요?" — [계속 작성]이면 머문다',
      async () => {
        await goEventMenu(page, '대시보드');
        const dialog = page.getByRole('alertdialog', { name: '저장하지 않고 이동할까요?' });
        await expect(dialog).toContainText('저장하지 않은 변경 사항은 사라져요.');
        await expect(dialog.getByRole('button', { name: '이동하기' })).toBeVisible();
        await dialog.getByRole('button', { name: '계속 작성' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL('/hosting/events/101/detail');
        await expect(page.getByTestId('section')).toHaveCount(5);
      },
    );
  },
);

scenario(
  'HE-7',
  '일반 멤버는 읽기 전용 — 안내 줄, 저장 바 · 등록 버튼 없음',
  {
    kind: '권한',
    summary: '일반 멤버(GUEST)는 볼 수만 있다. 칸은 읽기 전용, 하단 바와 [공연 등록하기]가 없다.',
    basis: ['plan P11 완료 기준 V "일반 멤버는 읽기 전용 화면"', 'patterns §22'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    actAsRole(11, 'GUEST');
    await step('기본 정보 — 안내 줄과 읽기 전용 칸, [저장하기] 없음', async () => {
      await page.goto('/hosting/events/140/info');
      await expect(page.getByTestId('read-only')).toHaveText(
        '일반 멤버는 공연 정보를 볼 수만 있어요',
      );
      await expect(page.getByLabel('공연 이름')).toHaveAttribute('readonly', '');
      await expect(page.getByRole('button', { name: '저장하기' })).toHaveCount(0);
    });
    await step('상세 정보 — 툴바 없이 본문만, 고른 탭을 눌러도 탭 메뉴가 없다', async () => {
      await goEventMenu(page, '상세 정보');
      await expect(page.getByRole('tab', { name: '공연소개' })).toBeVisible();
      await expect(page.getByRole('toolbar', { name: '본문 서식' })).toHaveCount(0);
      await page.getByRole('tab', { name: '공연소개' }).click();
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '저장하기' })).toHaveCount(0);
    });
    await step('대시보드 — [공연 등록하기]가 없다', async () => {
      await goEventMenu(page, '대시보드');
      await expect(page.getByRole('heading', { name: '필수 체크리스트' })).toBeVisible();
      await expect(page.getByRole('button', { name: '공연 등록하기' })).toHaveCount(0);
    });
  },
);

scenario(
  'HE-8',
  '간편 공연 만들기 — 호스트 고르기 → 공연 만들기 → 대시보드 + 토스트',
  {
    kind: '정상',
    summary:
      '진행 막대 2단. 호스트 줄을 고르면 [다음], Step2에서 이름 · 날짜 · 시각 · 티켓 여부를 넣고 [완료] → 대시보드 + "새로운 공연이 추가되었습니다!".',
    basis: ['plan P11 V 간편 만들기', '와이어 108:2136 · 108:2200', 'design-requests Q7'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('Step1 — 진행 막대 절반, 호스트 줄과 "새 호스트 만들기"', async () => {
      await page.goto('/hosting/new/events');
      await expect(page.getByTestId('wizard-step')).toHaveAttribute('data-step', '1');
      await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '새 호스트 만들기' })).toBeVisible();
    });
    await step('호스트를 고르고 [다음]을 누르면 Step2', async () => {
      await page.getByRole('radio', { name: /고스락/ }).click();
      await page.getByRole('button', { name: '다음' }).click();
      await expect(page).toHaveURL(/\/hosting\/new\/events\?step=2&hostId=\d+$/);
      await expect(page.getByRole('heading', { name: '공연을 새로 만들어볼까요?' })).toBeVisible();
    });
    await step('종료가 시작보다 빠르면 다음 날 안내가 보인다', async () => {
      await page.getByLabel('공연 이름').fill('여름 버스킹');
      await page.getByLabel('날짜').fill('2030-05-01');
      await page.getByLabel('시작 시각').fill('23:00');
      await page.getByLabel('종료 시각').fill('01:00');
      await page.getByRole('radio', { name: '티켓 없음' }).click();
      await expect(page.getByTestId('overnight')).toBeVisible();
    });
    await step('[완료]를 누르면 대시보드로 가고 토스트가 뜬다', async () => {
      await page.getByRole('button', { name: '완료' }).click();
      await expect(page).toHaveURL('/hosting/events/7001/dashboard');
      await expect(page.getByText('새로운 공연이 추가되었습니다!')).toBeVisible();
    });
  },
);

scenario(
  'HE-9',
  '저장하지 않고 다른 메뉴로 가면 이탈 경고',
  {
    kind: '정상',
    summary:
      '바꾼 칸이 있으면 메뉴 링크를 눌러도 바로 가지 않고 "저장하지 않고 이동할까요?"로 묻는다. [계속 작성]이면 머문다, [이동하기]면 간다.',
    basis: ['GUI 저장 없이 이동시 확인 1331:838 · 1336:1168(#194 · #195)', 'patterns §6 오버레이'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('기본 정보에서 이름을 바꾸고 대시보드로 가려 하면 팝업', async () => {
      await page.goto('/hosting/events/140/info');
      await page.getByLabel('공연 이름').fill('이름 바꿈');
      await goEventMenu(page, '대시보드');
      await expect(
        page.getByRole('alertdialog', { name: '저장하지 않고 이동할까요?' }),
      ).toBeVisible();
    });
    await step('[이동하기]를 누르면 대시보드로 간다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '이동하기' }).click();
      await expect(page).toHaveURL('/hosting/events/140/dashboard');
    });
  },
);

scenario(
  'HE-10',
  '체크리스트를 불러오지 못하면 안내 + [다시 시도]',
  {
    kind: '에러',
    summary: 'GE-7 실패 — 카드 안에 실패 문구와 재시도. 머리·사이드바는 그대로.',
    basis: ['patterns §11', '디자인 없음(Figma 코멘트 727:26249)'],
    mocks: [
      http.get('*/api/v2/events/140/checklist', () =>
        HttpResponse.json(envelope.error(500, 'INTERNAL_SERVER_ERROR'), { status: 500 }),
      ),
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('대시보드를 열면 체크리스트 실패 안내와 [다시 시도]', async () => {
      await page.goto('/hosting/events/140/dashboard');
      const alert = page.getByRole('alert').filter({ hasText: '체크리스트를 불러오지 못했어요' });
      await expect(alert.getByRole('button', { name: '다시 시도' })).toBeVisible({
        timeout: 15_000,
      });
    });
  },
);

scenario(
  'HE-15',
  '지도 서비스를 불러오지 못하면 지도 칸에 일러스트 + "지도 서비스를 불러오지 못했어요."',
  {
    kind: '에러',
    summary:
      '카카오맵 SDK를 불러오지 못하면 지도 칸(높이 147)이 GUI대로 일러스트와 안내 문구를 보인다. 저장된 좌표가 있는 공연도, 주소를 새로 고른 공연(좌표 찾기 실패)도 같은 칸이고, 주소 칸 아래 따로 안내 줄을 띄우지 않는다.',
    basis: [
      'GUI 1269:29502 · 1277:29907(Design Sync #181)',
      'GUI 748:33351 · 748:33451 지도 높이 147(Design Sync #180)',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    // setUp의 가짜 SDK보다 나중에 건 route가 먼저 잡는다
    await page.route('https://dapi.kakao.com/**', (route) => route.abort());
    await step('좌표가 저장된 공연(101) — 지도 칸에 일러스트 + 문구, 높이 147', async () => {
      await page.goto('/hosting/events/101/info');
      const map = page.getByTestId('place-map');
      await expect(map.getByRole('status')).toHaveText('지도 서비스를 불러오지 못했어요.');
      expect((await map.boundingBox())?.height).toBe(147);
      await map.scrollIntoViewIfNeeded();
    });
    await step('주소를 새로 고른 공연(140) — 좌표를 못 찾아도 안내는 지도 칸 한 곳', async () => {
      await page.goto('/hosting/events/140/info');
      await expect(page.getByTestId('place-map')).toHaveText('');
      await pickFakeAddress(page);
      const map = page.getByTestId('place-map');
      await expect(map.getByRole('status')).toHaveText('지도 서비스를 불러오지 못했어요.');
      await expect(page.getByText('위치를 확인할 수 없어요', { exact: false })).toHaveCount(0);
      await map.scrollIntoViewIfNeeded();
    });
  },
);

scenario.manual('HE-11', '실제 카카오맵 · 우편번호 SDK로 주소 검색 → 지도 마커', {
  kind: '정상',
  basis: [
    'plan P11-L 완료 기준 "실제 SDK 동작은 V"',
    'tech-decisions §12 NEXT_PUBLIC_KAKAO_JS_KEY',
  ],
  how: '스테이징(카카오 앱에 도메인 등록 + 실제 키)에서 기본 정보 → 주소 칸 → 우편번호 창에서 주소 선택 → 지도에 마커가 그 위치로 나오는지, 저장 뒤 다시 열어도 지도가 보이는지 본다. 모바일 Safari·카카오톡 인앱에서 우편번호 창이 시트 안에서 스크롤되는지도.',
});

scenario(
  'HE-12',
  '공연 취소(E-11) — 마스터: 사유 입력 → 취소, 남은 주문이 있으면 [남은 주문 다시 처리]',
  {
    kind: '정상',
    summary:
      '대시보드(등록 후) 맨 아래 "공연 취소" + [공연 취소하기](마스터 · 시작 전 OPEN). 오버레이(PC 모달 · 모바일 시트)에 되돌릴 수 없다는 안내 + 사유(1~100자). 취소하면 머리 아래 "취소된 공연이에요" · 사유 · 처리 결과, 포스터 칩 "취소됨". 한 번에 다 처리하지 못하면 [남은 주문 다시 처리](같은 API — 멱등). 디자인 · 와이어 없음 — design-requests Q122 · Q123 · Q124.',
    basis: [
      '이슈 #136 §7',
      '백엔드 #932(E-11 응답 remaining · failed)',
      'design-requests Q122~Q124',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    // 한 번에 1건만 처리하게 해 남은 주문을 만든다(서버 상한 100건 흉내)
    setEventCancelScenario({ limit: 1 });
    const dialog = page.getByRole('dialog', { name: '공연을 취소할까요?' });
    await step('등록된 공연(101) 대시보드 맨 아래 [공연 취소하기]', async () => {
      await page.goto('/hosting/events/101/dashboard');
      await expect(page.getByTestId('event-cancel')).toContainText('되돌릴 수 없어요');
    });
    await step('누르면 안내 + 취소 사유 칸 — 비우고 누르면 칸 오류', async () => {
      await page.getByRole('button', { name: '공연 취소하기' }).click();
      await dialog.getByRole('button', { name: '공연 취소', exact: true }).click();
      await expect(dialog).toContainText('취소 사유를 입력해 주세요.');
    });
    await step('사유를 넣고 취소하면 "취소된 공연" 안내 · 결과 · 남은 주문 안내', async () => {
      await dialog
        .getByRole('textbox', { name: '취소 사유' })
        .fill('공연장 사정으로 공연을 취소합니다');
      await dialog.getByRole('button', { name: '공연 취소', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByTestId('event-canceled')).toContainText('취소된 공연이에요.');
      await expect(page.getByTestId('event-cancel-result')).toContainText(
        '아직 처리하지 못한 주문이',
      );
      await expect(page.getByRole('button', { name: '남은 주문 다시 처리' })).toBeVisible();
    });
    await step('[남은 주문 다시 처리]를 다 끝날 때까지 누르면 버튼이 사라진다', async () => {
      setEventCancelScenario({ limit: 100 });
      await page.getByRole('button', { name: '남은 주문 다시 처리' }).click();
      await expect(page.getByRole('button', { name: '남은 주문 다시 처리' })).toHaveCount(0);
      await expect(page.getByTestId('event-cancel-result')).not.toContainText('아직 처리하지 못한');
    });
  },
);

scenario(
  'HE-13',
  '공연 취소 — 매니저에게는 버튼이 없고, 시작한 공연(Event_400_29)이면 오버레이 안 안내',
  {
    kind: '권한',
    summary:
      '[공연 취소하기]는 마스터만(`can(role, "cancelEvent")`). 그사이 시작했으면 서버 `Event_400_29` → 오버레이에 "이미 시작했거나 끝난 공연은 취소할 수 없어요." + GE-3 다시 읽기.',
    basis: ['이슈 #136 §7', 'patterns §22 · §11', 'error-codes Event_400_29'],
    mocks: [
      http.post('*/api/v2/events/101/cancel', () =>
        HttpResponse.json(envelope.error(400, 'Event_400_29'), { status: 400 }),
      ),
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('마스터: 시작한 공연 응답이면 오버레이에 안내가 남는다', async () => {
      await page.goto('/hosting/events/101/dashboard');
      await page.getByRole('button', { name: '공연 취소하기' }).click();
      const dialog = page.getByRole('dialog', { name: '공연을 취소할까요?' });
      await dialog.getByRole('textbox', { name: '취소 사유' }).fill('사유');
      await dialog.getByRole('button', { name: '공연 취소', exact: true }).click();
      await expect(dialog.getByRole('alert')).toHaveText(
        '이미 시작했거나 끝난 공연은 취소할 수 없어요.',
      );
    });
    await step('매니저: [공연 취소하기]가 없다', async () => {
      actAsRole(11, 'MANAGER');
      await page.goto('/hosting/events/101/dashboard');
      await expect(page.getByTestId('dashboard-registered')).toBeVisible();
      await expect(page.getByTestId('event-cancel')).toHaveCount(0);
    });
  },
);

scenario(
  'HE-14',
  '취소된 공연을 다시 열면 GE-3 남은 수로 — [남은 주문 다시 처리] 또는 고객센터 안내(Api 2.5.9)',
  {
    kind: '정상',
    summary:
      '취소된 공연을 새로 열면 이 화면의 처리 결과가 없다. GE-3 `cancelRemainingCount > 0` · `cancelRetryable true`면 마스터에게 [남은 주문 다시 처리], `cancelRetryable false`(지난 공연 · 정산 기록)면 버튼 대신 "처리하지 못한 주문 n건이 있어요. 두둥 고객센터로 문의해 주세요.", 0이면 둘 다 없다. 디자인 없음 — design-requests Q165 · Q166.',
    basis: [
      '이슈 #150 · 백엔드 #940(B44)',
      'api-contract GE-3 cancelRemainingCount · cancelRetryable(2.5.9)',
      'design-requests Q165 · Q166',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    setEventCancelScenario({ limit: 1 });
    await step('공연(101)을 취소하되 남은 주문을 남긴다', async () => {
      await page.goto('/hosting/events/101/dashboard');
      await page.getByRole('button', { name: '공연 취소하기' }).click();
      const dialog = page.getByRole('dialog', { name: '공연을 취소할까요?' });
      await dialog.getByRole('textbox', { name: '취소 사유' }).fill('공연장 사정');
      await dialog.getByRole('button', { name: '공연 취소', exact: true }).click();
      await expect(page.getByTestId('event-canceled')).toContainText('취소된 공연이에요.');
    });
    await step('새로고침 — 결과 줄은 없고 GE-3 남은 수로 [남은 주문 다시 처리]', async () => {
      await page.reload();
      await expect(page.getByTestId('event-canceled')).toContainText('취소된 공연이에요.');
      await expect(page.getByTestId('event-cancel-result')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '남은 주문 다시 처리' })).toBeVisible();
    });
    await step(
      '정산 기록이 생긴 공연(cancelRetryable false) — 버튼 대신 고객센터 안내',
      async () => {
        setEventCancelScenario({ settled: [101] });
        await page.reload();
        await expect(page.getByTestId('event-cancel-contact')).toContainText(
          '두둥 고객센터로 문의해 주세요.',
        );
        await expect(page.getByRole('button', { name: '남은 주문 다시 처리' })).toHaveCount(0);
      },
    );
  },
);
