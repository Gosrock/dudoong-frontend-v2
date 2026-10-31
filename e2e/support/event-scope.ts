import { expect, type Page } from '@playwright/test';

/**
 * 공연 스코프 화면(P11-V)의 e2e 도우미 — 메뉴 이동(PC 사이드바 / 모바일 ☰ 드로어), Radix 드롭다운 고르기,
 * 외부 SDK 가짜(카카오맵 — 주소 → 좌표, 지도·마커는 빈 동작 / Daum 우편번호 — 고르면 주소 하나). 실제 SDK 동작은 실환경 확인
 */

/** PC 사이드바 메뉴 줄(모바일에서는 숨어 있어 글자만 본다) */
export const eventMenu = (page: Page) => page.getByTestId('event-sidebar').locator('li');

/** 공연 메뉴로 이동 — PC는 사이드바, 모바일은 ☰ 드로어(Q37 기본안) */
export async function goEventMenu(page: Page, label: string) {
  const sidebar = page.getByTestId('event-sidebar');
  const opener = page.getByRole('button', { name: '공연 메뉴 열기' });
  // 공연 스코프가 그려질 때까지 — PC·모바일 둘 다 DOM에 있고 CSS로 하나만 보인다(역할 셀렉터는 숨은 것을 못 찾아 CSS로 기다린다)
  await page.locator('[data-event-scope]').waitFor({ state: 'attached' });
  if (await sidebar.isVisible()) {
    await sidebar.getByRole('link', { name: label }).click();
    return;
  }
  await opener.click();
  await page.getByRole('dialog').getByRole('link', { name: label }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Radix 드롭다운(`Dropdown`)에서 고르기 */
export async function pickOption(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}

/** 우편번호 창(가짜)이 내주는 주소 · 가짜 Geocoder 좌표 */
export const FAKE_ADDRESS = '서울 마포구 어울마당로 35';
export const FAKE_COORDS = { latitude: '37.5509', longitude: '126.9219' };

export async function routeEventSdks(page: Page) {
  await page.route('https://dapi.kakao.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.kakao = { maps: { load: (cb) => cb(), LatLng: class {}, Map: class {}, Marker: class {},
        services: { Status: { OK: 'OK' },
        Geocoder: class { addressSearch(a, cb) { cb([{ x: '${FAKE_COORDS.longitude}', y: '${FAKE_COORDS.latitude}' }], 'OK'); } } } } };`,
    }),
  );
  await page.route('https://t1.daumcdn.net/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.daum = { Postcode: class { constructor(o) { this.o = o; }
        embed(el) { const b = document.createElement('button'); b.type = 'button'; b.textContent = '${FAKE_ADDRESS}';
          b.onclick = () => this.o.oncomplete({ address: '서울 마포구 서교동 407-8', roadAddress: '${FAKE_ADDRESS}' });
          el.appendChild(b); } } };`,
    }),
  );
}

/** 기본 정보의 주소 칸 → 우편번호 창(가짜)에서 고르기 */
export async function pickFakeAddress(page: Page) {
  await page.getByRole('button', { name: '주소 검색 열기' }).click();
  await page.getByRole('button', { name: FAKE_ADDRESS }).click();
}
