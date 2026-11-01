import type { Locator, Page } from '@playwright/test';

import { setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P14 접근성 — 마우스 없이 핵심 흐름(plan P14 "키보드만으로"): 상세 → 티켓 선택 → 체크아웃 → 주문 완료,
 * 호스팅 간편 공연 만들기 → 대시보드. Tab · Shift+Tab · Enter · Space · Esc만 쓴다.
 * 오버레이(Radix)는 열면 포커스가 안으로 들어가 갇히고, 닫으면 연 버튼으로 돌아온다.
 *
 * 날짜 · 시각 칸은 브라우저 기본 입력(`<input type="date|time">`)이라 Tab으로 닿는 것까지만 보고 값은 `fill`로 넣는다 —
 * 칸 안 키 입력은 브라우저 몫이다.
 */

const MAX_TABS = 120;

/** 포커스가 `target`에 올 때까지 Tab(뒤로면 Shift+Tab). 닿을 때마다 포커스 링이 보이는지도 본다 */
async function tabTo(page: Page, target: Locator, { back = false } = {}) {
  await expect(target).toBeVisible();
  for (let i = 0; i < MAX_TABS; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      await expectFocusRing(target);
      return;
    }
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`Tab ${MAX_TABS}번 안에 닿지 않음: ${target}`);
}

/** 키보드로 온 포커스는 보여야 한다 — outline, 아니면 테두리 · 그림자 · 배경으로 바뀜(WCAG 2.4.7) */
async function expectFocusRing(target: Locator) {
  const ring = await target.evaluate((el) => {
    const focused = getComputedStyle(el);
    const visible = el.matches(':focus-visible');
    const outline = focused.outlineStyle !== 'none' && parseFloat(focused.outlineWidth) > 0;
    return { visible, outline, shadow: focused.boxShadow !== 'none' };
  });
  expect(ring.visible, ':focus-visible').toBe(true);
  // 입력칸은 감싼 상자가 :focus-within으로 테두리 색을 바꾼다 — 칸 자체 outline이 없어도 된다
  const isField = await target.evaluate((el) => el.matches('input, textarea, [role="combobox"]'));
  if (!isField) expect(ring.outline || ring.shadow, 'focus ring').toBe(true);
}

const focusIsInside = (container: Locator) =>
  container.evaluate((el) => el.contains(document.activeElement));

test('상세 → 티켓 선택 → 체크아웃 → 주문 완료를 키보드로만', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  await setMockSession(page, 'loggedIn');
  await page.goto('/events/101');
  await expect(
    page.getByRole('heading', { level: 1, name: '고스락 제37회 정기공연' }),
  ).toBeVisible();

  let area: Locator;
  if (desktop) {
    area = page.getByRole('complementary', { name: '예매' });
  } else {
    const trigger = page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true');
    await tabTo(page, trigger);
    await page.keyboard.press('Enter');
    area = page.getByRole('dialog', { name: '티켓 종류' });
    await expect(area).toBeVisible();
    await expect.poll(() => focusIsInside(area)).toBe(true);

    // Esc로 닫으면 연 버튼으로 포커스가 돌아온다
    await page.keyboard.press('Escape');
    await expect(area).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(area).toBeVisible();
    // 포커스 가두기 — 시트 안에서 Tab을 여러 번 눌러도 밖으로 나가지 않는다
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      expect(await focusIsInside(area)).toBe(true);
    }
  }

  const row = area.getByRole('listitem').getByRole('button', { name: /일반 예매/ });
  await tabTo(page, row);
  await page.keyboard.press('Enter');
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  const plus = area.getByRole('button', { name: '일반 예매 수량 늘리기' });
  await tabTo(page, plus);
  await page.keyboard.press('Enter');
  await expect(area.getByRole('group', { name: '일반 예매 수량' })).toContainText('2');
  await tabTo(page, area.getByRole('button', { name: '티켓 구매하기' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/events\/101\/checkout\?ticketItemId=501&quantity=2/);

  // 체크아웃 — 옵션(라디오 · 글 칸) · 동의 체크 · 결제하기 · 확인 창
  // 라디오 묶음은 Tab으로 한 번 들어가고(아무것도 안 골랐으면 첫 칸) 방향키로 고른다(WAI-ARIA radio group)
  const yes = page
    .getByRole('radiogroup', { name: /뒤풀이 참석/ })
    .getByRole('radio', { name: '예' });
  await tabTo(page, yes);
  await page.keyboard.press('Space');
  await expect(yes).toBeChecked();
  const memo = page.getByRole('textbox', { name: '응원하는 멤버' });
  await tabTo(page, memo);
  await page.keyboard.type('보컬');
  const agree = page.getByRole('checkbox', { name: /환불\/취소 규정/ });
  await tabTo(page, agree);
  await page.keyboard.press('Space');
  await expect(agree).toBeChecked();
  const pay = page.getByRole('button', { name: '결제하기' });
  await tabTo(page, pay);
  await page.keyboard.press('Enter');

  const confirm = page.getByRole('alertdialog', { name: '주문 완료하기' });
  await expect(confirm).toBeVisible();
  await expect.poll(() => focusIsInside(confirm)).toBe(true);
  await tabTo(page, confirm.getByRole('button', { name: '결제완료' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/orders\/mock-order-[^/?]+\?created=1$/);
  await expect(page.getByRole('heading', { name: '주문 완료!' })).toBeVisible();
});

test('호스팅 간편 공연 만들기 → 대시보드를 키보드로만', async ({ page }) => {
  await setMockSession(page, 'loggedIn');
  await page.goto('/hosting/new/events');
  await expect(page.getByTestId('wizard-step')).toHaveAttribute('data-step', '1');

  const host = page.getByRole('radio', { name: /고스락/ });
  await tabTo(page, host);
  await page.keyboard.press('Space');
  await expect(host).toHaveAttribute('aria-checked', 'true');
  await tabTo(page, page.getByRole('button', { name: '다음' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/hosting\/new\/events\?step=2&hostId=\d+$/);

  const name = page.getByLabel('공연 이름');
  await tabTo(page, name);
  await page.keyboard.type('여름 버스킹');
  for (const [label, value] of [
    ['날짜', '2030-05-01'],
    ['시작 시각', '19:00'],
    ['종료 시각', '21:00'],
  ] as const) {
    const field = page.getByLabel(label);
    await tabTo(page, field);
    await field.fill(value);
  }
  // 라디오 묶음 — Tab으로 첫 칸에 들어가 방향키로 "티켓 없음"까지
  const noTicket = page.getByRole('radio', { name: '티켓 없음' });
  const first = noTicket
    .locator('xpath=ancestor::*[@role="radiogroup"][1]')
    .getByRole('radio')
    .first();
  await tabTo(page, first);
  await page.keyboard.press('ArrowDown');
  await expect(noTicket).toBeFocused();
  // Radix: 아무것도 안 고른 묶음에서 첫 방향키는 포커스만 옮긴다(다음 방향키부터 고름) — Space로 고른다(implementation-log 남김)
  await page.keyboard.press('Space');
  await expect(noTicket).toBeChecked();
  await tabTo(page, page.getByRole('button', { name: '완료' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/hosting/events/7001/dashboard');
});

test('모달 확인 창 — 열면 안으로, Esc로 닫으면 연 버튼으로 포커스', async ({ page }, testInfo) => {
  // 모바일은 메뉴 링크가 드로어 안에 있다 — 시트 열기 · 닫기 · 가두기는 위 모바일 흐름이 본다
  test.skip(testInfo.project.name === 'mobile', 'PC 사이드바 링크로 연다');
  await setMockSession(page, 'loggedIn');
  await page.goto('/hosting/events/101/info');
  // 이탈 경고(alertdialog): 바꾼 칸이 있으면 메뉴 링크가 확인 창을 연다
  const name = page.getByLabel('공연 이름');
  await tabTo(page, name);
  await page.keyboard.type(' 바꿈');
  const link = page.getByRole('link', { name: '대시보드' }).locator('visible=true').first();
  await tabTo(page, link, { back: true });
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: '저장하지 않고 나갈까요?' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => focusIsInside(dialog)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(link).toBeFocused();
  await expect(page).toHaveURL('/hosting/events/101/info');
});

test('축소 모션이면 전환이 꺼지고 시트가 바로 열린다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '바텀시트는 모바일');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setMockSession(page, 'loggedIn');
  await page.goto('/hosting/new/events');
  const fill = page.getByTestId('wizard-step').locator('span').first();
  const duration = await fill.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThan(0.001);

  await page.goto('/events/101');
  await page.getByRole('button', { name: '티켓 구매하기' }).locator('visible=true').click();
  const sheet = page.getByRole('dialog', { name: '티켓 종류' });
  await expect(sheet).toBeVisible();
  const animation = await sheet.evaluate((el) => {
    const st = getComputedStyle(el);
    return { name: st.animationName, duration: parseFloat(st.animationDuration) };
  });
  expect(animation.name === 'none' || animation.duration < 0.001, JSON.stringify(animation)).toBe(
    true,
  );
});
