import type { Page, TestInfo } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { goEventMenu, pickFakeAddress, routeEventSdks } from '../../e2e/support/event-scope';
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
      '빈 폼은 [미리보기][저장하기] 비활성. 포스터를 올리면 그 자리에 미리보기, 주소를 고르면 좌표를 얻고 지도 칸이 그 좌표로 그려진다. 바꾸면 [미리보기]가 열린다. 저장하면 토스트.',
    basis: [
      'plan P11 완료 기준 V(포스터 미리보기 · 미리보기 조건 · 지도 미리보기)',
      'GUI 748:33351 · 748:33451 · 748:34006',
      'gui-screens §2 기본 정보',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('기본 정보를 열면 [미리보기]·[저장하기]가 비활성, 지도 칸은 안내 문구', async () => {
      await page.goto('/hosting/events/140/info');
      await expect(page.getByRole('button', { name: '미리보기' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '저장하기' })).toBeDisabled();
      await expect(page.getByTestId('place-map')).toContainText('주소를 검색하면 지도가 보여요');
    });
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
  '상세 정보 — 밑줄 탭 · 에디터, 미리보기는 섹션 뷰어, 탭을 빼고 저장하면 전체 교체',
  {
    kind: '정상',
    summary:
      '기본 4탭 + 탭 추가(+). 본문을 쓰면 [미리보기]가 열리고 관객 상세와 같은 뷰어로 보인다. 탭을 빼고 저장하면 PE-6 본문에서 빠진다(전체 교체).',
    basis: [
      'plan P11 완료 기준 V "섹션 저장이 전체 교체임을 UI가 반영"',
      'GUI 767:39585 · 767:39645',
      'P5b SectionViewer 재사용',
    ],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('상세 정보를 열면 탭 4개(공연 소개 선택)와 에디터가 보인다', async () => {
      await page.goto('/hosting/events/101/detail');
      await expect(page.getByTestId('section')).toHaveCount(4);
      await expect(page.getByRole('toolbar', { name: '본문 서식' })).toBeVisible();
    });
    await step('본문을 쓰면 [미리보기]가 열리고 섹션 뷰어로 보인다', async () => {
      const editor = page.getByRole('textbox', { name: /본문$/ });
      await editor.click();
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.type(' 앵콜 공연이 추가되었어요');
      await page.getByRole('button', { name: '미리보기' }).click();
      await expect(page.getByTestId('sections-preview')).toContainText('앵콜 공연이 추가되었어요');
      await page.keyboard.press('Escape');
    });
    await step('세트리스트 탭을 빼면(확인) 탭이 3개가 된다', async () => {
      await page.getByRole('tab', { name: '세트리스트' }).click();
      await page.getByRole('button', { name: '탭 빼기' }).click();
      await expect(page.getByRole('alertdialog')).toContainText(
        '저장하면 공연 상세에서도 이 탭이 사라져요',
      );
      await page.getByRole('alertdialog').getByRole('button', { name: '빼기' }).click();
      await expect(page.getByTestId('section')).toHaveCount(3);
    });
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
    await step('상세 정보 — 툴바·탭 이름 칸 없이 본문만', async () => {
      await goEventMenu(page, '상세 정보');
      await expect(page.getByRole('tab', { name: '공연소개' })).toBeVisible();
      await expect(page.getByRole('toolbar', { name: '본문 서식' })).toHaveCount(0);
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
      await expect(page).toHaveURL('/hosting/new/events?step=2');
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
      '바꾼 칸이 있으면 메뉴 링크를 눌러도 바로 가지 않고 팝업으로 묻는다. [취소]면 머문다, [나가기]면 간다.',
    basis: ['plan P11 V 범위 "이탈 경고"', 'patterns §6 오버레이'],
  },
  async ({ page, step, testInfo }) => {
    await setUp(page, testInfo);
    await step('기본 정보에서 이름을 바꾸고 대시보드로 가려 하면 팝업', async () => {
      await page.goto('/hosting/events/140/info');
      await page.getByLabel('공연 이름').fill('이름 바꿈');
      await goEventMenu(page, '대시보드');
      await expect(
        page.getByRole('alertdialog', { name: '저장하지 않고 나갈까요?' }),
      ).toBeVisible();
    });
    await step('[나가기]를 누르면 대시보드로 간다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '나가기' }).click();
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

scenario.manual('HE-11', '실제 카카오맵 · 우편번호 SDK로 주소 검색 → 지도 마커', {
  kind: '정상',
  basis: [
    'plan P11-L 완료 기준 "실제 SDK 동작은 V"',
    'tech-decisions §12 NEXT_PUBLIC_KAKAO_JS_KEY',
  ],
  how: '스테이징(카카오 앱에 도메인 등록 + 실제 키)에서 기본 정보 → 주소 칸 → 우편번호 창에서 주소 선택 → 지도에 마커가 그 위치로 나오는지, 저장 뒤 다시 열어도 지도가 보이는지 본다. 모바일 Safari·카카오톡 인앱에서 우편번호 창이 시트 안에서 스크롤되는지도.',
});
