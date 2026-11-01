import { setMockSession } from '../../e2e/support/auth';
import { eventDetailHandlers } from '../../src/api/__mocks__/event-detail.handlers';
import { envelope, expect, scenario } from '../scenario';

/**
 * 공연 상세(plan P5b 완료 기준 V). 근거는 전부 와이어 — 모바일 `121:1216`, 연락처 `500:929`·`121:2026`,
 * PC 두 열 `640:1957`, PC 연락처 모달 `666:14989`(gui-screens §0 — 공연상세 GUI `759:*`는 Ready for dev 아님).
 *
 * 범주 검토
 * - 크롤러: 카카오 UA OG·404·5xx·응답 HTML에 재고 없음은 e2e `event-detail.spec`(P5b-L)이 본다 — 여기서는 화면만
 * - 권한: 연락처만 사용자별(익명 가린 값 / 로그인 원문). 관리 버튼은 이 화면에 없다
 * - 에러: GP-3·GE-5 5xx는 e2e(서버 조회 → error.tsx). 브라우저 쪽 GP-5 실패 · 연락처 viewer 실패는 아래
 * - 실기기(카카오톡 공유창·공유 디버거)는 수동
 */

const EVENT = '/events/101';

scenario(
  'EVT-1',
  '공연 상세가 모바일은 한 열 + 하단 고정 바, PC(1440)는 두 열 + 오른쪽 카드로 그려진다',
  {
    kind: '정상',
    summary:
      '포스터 · 제목 · 해시태그 · 호스트/장소/일시 · 티켓 옵션(GP-5 — 모바일 카드는 표시만, PC 카드는 고르기) · 섹션 탭. 모바일 하단 [문의][티켓 구매하기]는 PC에서 CSS로 숨고, PC는 주간 달력 + 티켓 옵션 + [공유][티켓 구매하기].',
    basis: ['plan P5b V 범위 · PC', '와이어 121:1216 · 640:1957', 'patterns §1 같은 DOM'],
  },
  async ({ page, step, mockApi, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    await step('공연 상세를 열면 제목과 첫 탭 본문이 보인다', async () => {
      await page.goto(EVENT);
      await expect(
        page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연' }),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: '공연 소개', selected: true })).toBeVisible();
      await expect(page.getByText('홍대 롤링홀').locator('visible=true').first()).toBeVisible();
    });
    await step('티켓 옵션에 가격·잔여·매진이 보인다(GP-5는 브라우저만 부른다)', async () => {
      const tickets = page.getByRole('list', { name: '티켓 옵션' }).locator('visible=true');
      await expect(tickets.getByText('15,000원')).toBeVisible();
      await expect(tickets.getByText('잔여 42매')).toBeVisible();
      await expect(tickets.getByText('매진')).toBeVisible();
      const gp5 = mockApi.calls().filter((c) => c.path.endsWith('/events/101/ticket-items'));
      expect(gp5.length).toBeGreaterThan(0);
      expect(gp5.every((c) => c.from === 'browser')).toBe(true);
    });
    if (desktop) {
      await step(
        'PC는 오른쪽 카드에 주간 달력(공연일 강조)과 (고르기 전 잠긴) [티켓 구매하기]가 있고 하단 바는 없다',
        async () => {
          const aside = page.getByRole('complementary', { name: '예매' });
          await expect(aside.getByText('2026년 11월')).toBeVisible();
          // 고르기 전에는 잠겨 있다 — 고르기·구매는 QA ticket-select(P6-V)
          await expect(aside.getByRole('button', { name: '티켓 구매하기' })).toBeDisabled();
          // 하단 바 버튼은 DOM에 있고 CSS로 숨는다(접근성 트리에서도 빠진다)
          const buy = page.locator('button', { hasText: '티켓 구매하기' });
          await expect(buy).toHaveCount(2);
          await expect(buy.nth(1)).toBeHidden();
        },
      );
    } else {
      await step(
        '모바일은 하단 고정 바 [문의][티켓 구매하기]가 보이고 오른쪽 카드는 없다',
        async () => {
          await expect(page.getByRole('button', { name: '문의하기' })).toBeVisible();
          await expect(page.getByRole('complementary', { name: '예매' })).toBeHidden();
          await page.mouse.wheel(0, 600);
        },
      );
    }
  },
);

scenario(
  'EVT-2',
  'v1 실데이터 본문(HTML·MARKDOWN)이 탭마다 정상 렌더된다',
  {
    kind: '정상',
    summary:
      '운영 v1 본문 샘플을 돌려 쓴 섹션 10개(HTML·MARKDOWN 번갈아). 체크리스트·글자색·인용·링크·이미지가 서식대로 보이고 스크립트는 없다.',
    basis: ['plan P5b 완료 기준 V', 'patterns §14 섹션 뷰어', 'fixtures/v1-sections'],
    mocks: [...eventDetailHandlers.tenSections(101)],
  },
  async ({ page, step }) => {
    await page.goto(EVENT);
    await expect(page.getByRole('tab')).toHaveCount(10);
    for (const i of [1, 2, 3, 4]) {
      await step(`섹션 ${i} 탭을 누르면 본문이 보인다`, async () => {
        await page.getByRole('tab', { name: `섹션 ${i}`, exact: true }).click();
        const panel = page.getByRole('tabpanel', { name: `섹션 ${i}`, exact: true });
        await expect(panel).toBeVisible();
        await expect(panel).not.toBeEmpty();
        expect(await panel.innerHTML()).not.toMatch(/<script|onerror=/i);
        await panel.scrollIntoViewIfNeeded();
      });
    }
  },
);

scenario(
  'EVT-3',
  '비로그인이 문의를 열면 가린 값은 링크 없이 보이고 "로그인하면 볼 수 있어요"가 붙는다',
  {
    kind: '권한',
    summary:
      '익명은 요청 없이 공개(가린) 값을 그린다(A안). 모바일은 바텀시트, PC는 모달. 인스타그램은 링크, 가린 전화는 글자.',
    basis: ['plan P5b 연락처 A안', 'design-requests Q41 기본안', '와이어 500:929 · 666:14989'],
  },
  async ({ page, step, mockApi }) => {
    await setMockSession(page, 'anonymous');
    await page.goto(EVENT);
    await step('[문의하기]를 누르면 문의하기 창에 호스트와 연락처가 보인다', async () => {
      await page.getByRole('button', { name: '문의하기' }).locator('visible=true').click();
      const dialog = page.getByRole('dialog', { name: '문의하기' });
      await expect(dialog.getByText('고스락')).toBeVisible();
      await expect(dialog.getByRole('link', { name: /gosrock_official/ })).toBeVisible();
      await expect(dialog.getByText('010-****-5678')).toBeVisible();
      await expect(dialog.getByRole('link', { name: '로그인하면 볼 수 있어요' })).toHaveAttribute(
        'href',
        /\/login\?redirect=%2Fevents%2F101/,
      );
      await page.waitForTimeout(600);
    });
    await step(
      '익명은 연락처를 위해 다시 조회하지 않는다',
      async () => {
        const gp3 = mockApi.calls().filter((c) => c.path === '/api/v2/events/101');
        expect(gp3.every((c) => c.from === 'server')).toBe(true);
      },
      { capture: false },
    );
  },
);

scenario(
  'EVT-4',
  '로그인 사용자가 문의를 열면 그때 원문을 읽어 전화가 링크로 보인다',
  {
    kind: '권한',
    summary: '시트를 열 때만 GP-3을 쿠키와 함께 한 번 더 읽는다(viewer). 원문 전화는 tel: 링크.',
    basis: ['plan P5b 연락처 A안', 'implementation-log 연락처 마스킹 대응'],
  },
  async ({ page, step, mockApi }) => {
    await setMockSession(page, 'loggedIn');
    await page.goto(EVENT);
    await step(
      '열기 전에는 viewer 조회가 없다',
      async () => {
        await expect(
          page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연' }),
        ).toBeVisible();
        const browserGp3 = mockApi
          .calls()
          .filter((c) => c.path === '/api/v2/events/101' && c.from === 'browser');
        expect(browserGp3).toHaveLength(0);
      },
      { capture: false },
    );
    await step('[문의하기]를 누르면 원문 전화번호가 링크로 보인다', async () => {
      await page.getByRole('button', { name: '문의하기' }).locator('visible=true').click();
      const dialog = page.getByRole('dialog', { name: '문의하기' });
      await expect(dialog.getByRole('link', { name: /010-1234-5678/ })).toHaveAttribute(
        'href',
        'tel:01012345678',
      );
      await expect(dialog.getByText('로그인하면 볼 수 있어요')).toHaveCount(0);
      await page.waitForTimeout(600);
    });
  },
);

scenario(
  'EVT-5',
  '연락처를 다시 읽다 실패하면 [다시 시도]가 보이고 누르면 원문이 보인다',
  {
    kind: '에러',
    summary: 'viewer 조회 5xx → "연락처를 불러오지 못했어요." + [다시 시도].',
    basis: ['patterns §24 P5b', 'useEventContacts retry'],
  },
  async ({ page, step, testInfo }) => {
    // viewer 5xx는 재시도(백오프) 뒤에 실패가 된다
    testInfo.setTimeout(90_000);
    await setMockSession(page, 'loggedIn');
    let fail = true;
    await page.route('**/api/v2/events/101', async (route) => {
      if (fail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify(envelope.error(500, 'SERVER_500')),
        });
      } else await route.fallback();
    });
    await page.goto(EVENT);
    await step('[문의하기]를 누르면 실패 안내와 [다시 시도]가 보인다', async () => {
      await page.getByRole('button', { name: '문의하기' }).locator('visible=true').click();
      const dialog = page.getByRole('dialog', { name: '문의하기' });
      await expect(dialog.getByText('연락처를 불러오지 못했어요.')).toBeVisible({
        timeout: 45_000,
      });
      await page.waitForTimeout(600);
    });
    await step('[다시 시도]를 누르면 연락처가 보인다', async () => {
      fail = false;
      const dialog = page.getByRole('dialog', { name: '문의하기' });
      // 데스크탑은 캡처(전체 페이지) 뒤 포커스 재조회로 먼저 풀릴 수 있다 — 버튼이 남아 있을 때만 누른다
      const retry = dialog.getByRole('button', { name: '다시 시도' });
      if (await retry.isVisible()) await retry.click();
      await expect(dialog.getByRole('link', { name: /010-1234-5678/ })).toBeVisible();
    });
  },
);

scenario(
  'EVT-6',
  '섹션·티켓·연락처가 없는 공연은 기본 4탭 빈 상태, "판매 중인 티켓이 없어요", 비활성 [티켓 구매하기]',
  {
    kind: '빈 상태',
    summary:
      '서버 섹션이 없으면 기본 4탭(공연소개·예매안내·세트리스트·유의사항) + "아직 등록된 내용이 없어요". 연락처가 없으면 [문의하기]가 없다.',
    basis: ['plan P5b 섹션 탭 규칙', 'patterns §14', 'fixtures event 103'],
  },
  async ({ page, step }) => {
    await page.goto('/events/103');
    await step('기본 4탭과 빈 본문 문구가 보인다', async () => {
      await expect(page.getByRole('tab')).toHaveText([
        '공연소개',
        '예매안내',
        '세트리스트',
        '유의사항',
      ]);
      await expect(page.getByRole('tabpanel').getByText('아직 등록된 내용이 없어요')).toBeVisible();
    });
    await step('티켓이 없으면 안내 문구와 비활성 [티켓 구매하기], [문의하기]는 없다', async () => {
      await expect(page.getByText('판매 중인 티켓이 없어요').locator('visible=true')).toBeVisible();
      await expect(
        page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true'),
      ).toBeDisabled();
      await expect(page.getByRole('button', { name: '문의하기' })).toHaveCount(0);
    });
  },
);

scenario(
  'EVT-7',
  '판매 중단 티켓은 흐리게 "판매 중단", 티켓을 불러오지 못하면 [다시 시도]',
  {
    kind: '에러',
    summary:
      'GP-5는 브라우저에서만 읽는다 — 실패하면 카드 안에 [다시 시도]. 판매 중단은 딤드(Q33).',
    basis: ['patterns §15', 'ticket-state SUSPENDED', 'design-requests Q33'],
  },
  async ({ page, step }) => {
    let mode: 'suspended' | 'fail' = 'suspended';
    await page.route('**/api/v2/events/101/ticket-items', async (route) => {
      if (mode === 'fail') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify(envelope.error(500, 'SERVER_500')),
        });
        return;
      }
      const res = await route.fetch();
      const json = await res.json();
      json.data[0] = { ...json.data[0], isSuspended: true, isPurchasable: false };
      await route.fulfill({ response: res, json });
    });
    await step('판매 중단 티켓에 "판매 중단" 칩이 보인다', async () => {
      await page.goto(EVENT);
      await expect(page.getByText('판매 중단').locator('visible=true')).toBeVisible();
    });
    await step('GP-5가 실패하면 안내와 [다시 시도]가 보인다', async () => {
      mode = 'fail';
      await page.reload();
      await expect(
        page.getByText('티켓 정보를 불러오지 못했어요.').locator('visible=true'),
      ).toBeVisible({ timeout: 15_000 });
    });
  },
);

scenario(
  'EVT-8',
  '공유 고르기 — [카카오톡] · [링크 복사], 카카오 SDK를 못 불러오면 주소 복사',
  {
    kind: '에러',
    summary:
      '공유(모바일 포스터 위 · PC 정사각 버튼 — Q22 기본안)는 고르는 시트(이슈 #106 §7): [카카오톡](실패하면 주소 복사 + 토스트) · [링크 복사] · [다른 앱으로 공유](`navigator.share`가 있을 때만).',
    basis: ['patterns §14 카카오 공유', 'design-requests Q22 · Q83', '이슈 #106 §7'],
  },
  async ({ page, step }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('https://t1.kakaocdn.net/**', (route) => route.abort());
    await page.goto(EVENT);
    const sheet = page.getByRole('dialog', { name: '공유하기' });
    await step('[공유하기]를 누르면 공유 방법을 고르는 시트가 뜬다', async () => {
      await page.getByRole('button', { name: '공유하기' }).locator('visible=true').click();
      await expect(sheet.getByRole('button', { name: '카카오톡' })).toBeVisible();
      await expect(sheet.getByRole('button', { name: '링크 복사' })).toBeVisible();
    });
    await step('[링크 복사]는 공연 주소를 복사하고 시트를 닫는다', async () => {
      await sheet.getByRole('button', { name: '링크 복사' }).click();
      await expect(page.getByText('공연 주소를 복사했어요')).toBeVisible();
      await expect(sheet).toHaveCount(0);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/events\/\d+$/);
    });
    await step('[카카오톡] — SDK를 못 불러오면 "공연 주소를 복사했어요" 토스트', async () => {
      await page.getByRole('button', { name: '공유하기' }).locator('visible=true').click();
      await sheet.getByRole('button', { name: '카카오톡' }).click();
      await expect(page.getByText('공연 주소를 복사했어요').first()).toBeVisible();
    });
  },
);

scenario(
  'EVT-9',
  '정보만 공개하는 공연(티켓 없음)은 티켓 카드와 [티켓 구매하기]가 없다',
  {
    kind: '빈 상태',
    summary: 'GP-3 `hasTicket: false` — 이름 없는 공연은 "두둥 공연", 호스트 이름 없음은 "호스트".',
    basis: ['api-contract GP-3 hasTicket', 'event-summary UNTITLED_EVENT', 'fixtures event 104'],
  },
  async ({ page, step }) => {
    await step('티켓 영역이 없다', async () => {
      await page.goto('/events/104');
      await expect(page.getByRole('heading', { level: 1, name: '두둥 공연' })).toBeVisible();
      await expect(page.getByRole('button', { name: '티켓 구매하기' })).toHaveCount(0);
      await expect(page.getByText('티켓 옵션')).toHaveCount(0);
    });
  },
);

scenario.manual('EVT-10', '실기기에서 카카오톡 공유창이 열리고 미리보기가 맞다', {
  kind: '크롤러',
  basis: ['plan P5b 완료 기준 L 카카오 공유 디버거(D2 뒤)', 'patterns §14'],
  how: 'D2 스테이징에서 공연 상세 [공유하기] → [카카오톡]을 눌러 카카오톡 공유창이 뜨는지, [다른 앱으로 공유]가 기본 공유 시트를 여는지, 카카오 공유 디버거에 공개 URL을 넣어 제목·이미지를 본다.',
});
