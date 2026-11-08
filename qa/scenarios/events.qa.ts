import type { Page } from '@playwright/test';

import { eventBrowseSets } from '../../src/api/__mocks__/event.handlers';
import { expect, scenario } from '../scenario';

/**
 * 공연 리스트 `/events`(P5a-V) — GUI `759:7895` 예매하기 · `759:11869` 태그선택(모바일 390), PC는 와이어 `640:1032`·`640:1425`(1440).
 * 근거: plan P5a(V 범위 · 완료 기준 V), gui-screens §0·§1, patterns §12·§13, api-contract GP-2·GE-11.
 * 권한: 공개 화면이라 로그인 여부로 다른 것이 없다(헤더 오른쪽만 셸 몫 — shell 시나리오). 크롤러: `(app)` 화면이라 서버 조회가 없다(e2e `event-list.spec`).
 */

const tagPanel = (page: Page) => page.getByRole('dialog', { name: '태그 고르기' });
const tagChip = (page: Page, name: string) =>
  tagPanel(page).getByRole('button', { name, exact: true });
const here = (page: Page) => decodeURIComponent(new URL(page.url()).search);
const cards = (page: Page) => page.getByRole('region', { name: '공연 목록' }).getByRole('link');

/** 하이드레이션 경고를 모은다(완료 기준 V "하이드레이션 경고 0") */
function watchHydration(page: Page) {
  const messages: string[] = [];
  page.on('console', (m) => {
    if (/hydrat/i.test(m.text())) messages.push(m.text());
  });
  return messages;
}

scenario(
  'EVL-1',
  '공연 리스트가 Figma 배치대로 보인다(하이드레이션 경고 없음)',
  {
    kind: '정상',
    summary:
      '검색칸 → [태그 ▾] · 지난공연보기 · 공연임박순 → 카드 격자(모바일 2열 · PC 4열). 헤더에는 검색 아이콘이 없다(GUI basic title (no search)). PC는 1440에서 와이어처럼 위 일러스트 + 가운데 검색칸.',
    basis: ['plan P5a 완료 기준 V', 'GUI 759:7895', '와이어 640:1032', 'gui-screens §3'],
  },
  async ({ page, step, note, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    const hydration = watchHydration(page);
    await step(
      '공연 리스트에 들어가면 카드가 보인다',
      async () => {
        await page.goto('/events');
        await expect(cards(page).first()).toBeVisible();
        await expect(
          page.getByRole('searchbox', { name: '공연명, 호스트, 공연장으로 검색' }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: /^태그/ })).toBeVisible();
        await expect(page.getByRole('switch', { name: '지난공연보기' })).not.toBeChecked();
        await expect(page.getByText('공연임박순', { exact: true })).toBeVisible();
      },
      { fullPage: false },
    );
    await step(
      '헤더에 검색 아이콘이 없고, 카드가 한 줄에 모바일 2장 · PC 4장',
      async () => {
        await expect(page.getByRole('link', { name: '공연 검색' })).toBeHidden();
        const tops = await cards(page).evaluateAll((els) =>
          els.slice(0, 5).map((e) => Math.round(e.getBoundingClientRect().top)),
        );
        const perRow = tops.filter((t) => t === tops[0]).length;
        await note(`첫 줄 카드 수 ${perRow}`);
        expect(perRow).toBe(desktop ? 4 : 2);
      },
      { capture: false },
    );
    await step(
      '하이드레이션 경고가 없다',
      async () => {
        await note(`하이드레이션 메시지 ${hydration.length}건`);
        expect(hydration).toEqual([]);
      },
      { capture: false },
    );
  },
);

scenario(
  'EVL-2',
  '[태그 ▾]로 패널을 열고 태그를 고르면 숫자 배지 · 주소 · 목록이 바뀐다',
  {
    kind: '정상',
    summary:
      '패널은 GE-11 응답 순서대로 분류(공연구분 · 장르 · 장소 · 팀)와 태그를 그린다. 고른 태그는 진한 글자, 칩에는 고른 수 배지. 주소에 바로 반영되고 기록은 쌓이지 않는다.',
    basis: ['plan P5a', 'GUI 759:11869', 'patterns §13'],
  },
  async ({ page, step, mockApi }) => {
    await step(
      '[태그 ▾]를 누르면 분류 4개가 있는 패널이 열린다',
      async () => {
        await page.goto('/events');
        await page.getByRole('button', { name: /^태그/ }).click();
        await expect(tagPanel(page)).toBeVisible();
        for (const g of ['공연구분', '장르', '장소', '팀']) {
          await expect(tagPanel(page).getByRole('group', { name: g })).toBeVisible();
        }
      },
      { fullPage: false },
    );
    await step(
      '정기공연 · 락밴드를 고르면 배지 2 · 주소 ?tagIds=1,2 · 그 조건으로 다시 읽는다',
      async () => {
        await tagChip(page, '정기공연').click();
        await tagChip(page, '락밴드').click();
        await expect.poll(() => here(page)).toBe('?tagIds=1,2');
        await expect(tagChip(page, '정기공연')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('button', { name: /^태그.*2개 선택됨/ })).toBeVisible();
        expect(mockApi.calls().some((c) => decodeURIComponent(c.path).includes('tagIds=1,2'))).toBe(
          true,
        );
      },
      { fullPage: false },
    );
    await step(
      '초기화를 누르면 태그가 모두 풀리고 주소에서 빠진다',
      async () => {
        await tagPanel(page).getByRole('button', { name: '태그 선택 초기화' }).click();
        await expect.poll(() => here(page)).toBe('');
        await expect(tagChip(page, '정기공연')).toHaveAttribute('aria-pressed', 'false');
        await expect(
          tagPanel(page).getByRole('button', { name: '태그 선택 초기화' }),
        ).toBeDisabled();
      },
      { fullPage: false },
    );
    await step(
      'Esc를 누르면 패널이 닫힌다',
      async () => {
        await page.keyboard.press('Escape');
        await expect(tagPanel(page)).toBeHidden();
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-3',
  '지난공연보기를 켜고 검색어를 넣으면 주소와 조회 조건이 바뀐다',
  {
    kind: '정상',
    summary:
      '토글은 바로, 검색어는 입력 뒤 잠시 기다렸다 주소에 반영된다(L 300ms). 지우기 버튼으로 바로 비운다.',
    basis: ['plan P5a', 'patterns §13', 'api-contract §4 검색어 50자'],
  },
  async ({ page, step }) => {
    await step(
      '지난공연보기를 켜면 ?includePast=true',
      async () => {
        await page.goto('/events');
        await page.getByRole('switch', { name: '지난공연보기' }).click();
        await expect.poll(() => here(page)).toBe('?includePast=true');
      },
      { fullPage: false },
    );
    await step(
      '"고스락"을 입력하면 그 공연만 남는다',
      async () => {
        await page.getByRole('searchbox').fill('고스락');
        await expect.poll(() => here(page)).toBe('?keyword=고스락&includePast=true');
        await expect(page.getByRole('link', { name: /고스락 제37회 정기공연/ })).toBeVisible();
        await expect(page.getByRole('link', { name: /어쿠스틱 나이트/ })).toHaveCount(0);
      },
      { fullPage: false },
    );
    await step(
      '지우기 버튼을 누르면 검색어가 바로 빠진다',
      async () => {
        await page.getByRole('button', { name: '검색어 지우기' }).click();
        await expect.poll(() => here(page)).toBe('?includePast=true');
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-4',
  '아래로 내리면 다음 페이지를 읽고, 맨 위로 버튼으로 돌아간다',
  {
    kind: '정상',
    summary: '무한 스크롤(GP-2 10개씩). ↑(GUI 759:12102)를 누르면 맨 위로.',
    basis: ['plan P5a', 'patterns §12', 'GUI 759:12102'],
  },
  async ({ page, step, mockApi }) => {
    await step(
      '첫 페이지 10장이 보인다',
      async () => {
        await page.goto('/events');
        await expect(cards(page)).toHaveCount(10);
      },
      { fullPage: false },
    );
    await step(
      '끝까지 내리면 두 번째 페이지까지 14장',
      async () => {
        await page.mouse.wheel(0, 20000);
        await expect(cards(page)).toHaveCount(14);
        expect(mockApi.calls().some((c) => c.path.includes('page=1'))).toBe(true);
      },
      { fullPage: false },
    );
    await step(
      '↑를 누르면 맨 위로 돌아간다',
      async () => {
        await page.getByRole('button', { name: '맨 위로' }).click();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-5',
  '검색 결과가 없으면 "검색된 공연이 없습니다.", 조건 없이 0건이면 잠정 빈 화면',
  {
    kind: '빈 상태',
    summary:
      '검색어가 있는데 0건 → GUI `1184:33829`(#158) 그림 + "검색된 공연이 없습니다." + "다른 검색어를 입력해보세요."([검색 조건 지우기] 없음). 태그를 고른 채 0건 → GUI `1270:36348`(#200) 문구 하나 + [필터 초기화](태그만 지움). 추천도 0건이면 "이런 공연은 어때요?"를 숨긴다. 조건 없이 0건은 디자인이 없어 잠정(Figma 코멘트 759:7993) "조건에 맞는 공연이 없어요."',
    basis: ['GUI 1184:33829', 'GUI 1270:36348', 'design-requests Q91', 'Figma 코멘트 1184:33998'],
    mocks: eventBrowseSets.listEmpty,
  },
  async ({ page, step }) => {
    await step(
      '검색어로 0건이면 "검색된 공연이 없습니다."',
      async () => {
        await page.goto('/events?keyword=없는공연');
        await expect(page.getByText('검색된 공연이 없습니다.')).toBeVisible();
        await expect(page.getByText('다른 검색어를 입력해보세요.')).toBeVisible();
        await expect(page.getByRole('button', { name: '검색 조건 지우기' })).toHaveCount(0);
        await expect(page.getByText('이런 공연은 어때요?')).toHaveCount(0);
      },
      { fullPage: false },
    );
    await step(
      '태그를 고른 채 0건이면 GUI `1270:36348`(#200) — 문구 하나 + [필터 초기화]',
      async () => {
        await page.goto('/events?tagIds=1');
        await expect(page.getByText('검색된 공연이 없습니다.')).toBeVisible();
        await expect(page.getByText('다른 검색어를 입력해보세요.')).toHaveCount(0);
        await expect(page.getByRole('button', { name: '필터 초기화' })).toBeVisible();
      },
      { fullPage: false },
    );
    await step(
      '[필터 초기화]를 누르면 태그만 지운다(주소 ?tagIds 없어짐)',
      async () => {
        await page.getByRole('button', { name: '필터 초기화' }).click();
        await expect.poll(() => new URL(page.url()).search).toBe('');
        await expect(page.getByRole('button', { name: '필터 초기화' })).toHaveCount(0);
      },
      { fullPage: false },
    );
    await step(
      '조건 없이 0건이면 "조건에 맞는 공연이 없어요."',
      async () => {
        await page.goto('/events');
        await expect(page.getByText('조건에 맞는 공연이 없어요.')).toBeVisible();
        await expect(page.getByText('검색된 공연이 없습니다.')).toHaveCount(0);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-6',
  '목록을 못 읽으면 다시 시도, 다음 페이지 실패는 기존 카드를 두고 하단 재시도',
  {
    kind: '에러',
    summary:
      'GP-2 첫 페이지 5xx → "공연 목록을 불러오지 못했어요." + [다시 시도]. 다음 페이지 5xx → 기존 카드 유지 + 하단 재시도(patterns §12).',
    basis: ['patterns §11·§12', 'api-contract GP-2'],
    mocks: eventBrowseSets.listNextPageError,
  },
  async ({ page, step }) => {
    await step(
      '다음 페이지가 실패하면 10장은 그대로, 아래에 [다시 시도]',
      async () => {
        await page.goto('/events');
        await expect(cards(page)).toHaveCount(10);
        await page.mouse.wheel(0, 20000);
        await expect(page.getByText('더 불러오지 못했어요.')).toBeVisible();
        await expect(cards(page)).toHaveCount(10);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-7',
  '첫 페이지가 5xx면 목록 자리에 다시 시도',
  {
    kind: '에러',
    summary: '빈 화면이 아니라 실패 안내 + [다시 시도]. 검색·태그는 그대로 쓸 수 있다.',
    basis: ['patterns §11', 'api-contract GP-2'],
    mocks: eventBrowseSets.listServerError,
  },
  async ({ page, step }) => {
    await step(
      '실패 안내와 [다시 시도]가 보인다',
      async () => {
        await page.goto('/events');
        await expect(page.getByText('공연 목록을 불러오지 못했어요.')).toBeVisible();
        await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-8',
  '태그 목록(GE-11)을 못 읽으면 패널 안에서 다시 시도',
  {
    kind: '에러',
    summary:
      '목록은 그대로 보이고, 태그 패널만 실패 안내 + [다시 시도](디자인 없음 — Figma 코멘트 759:12054).',
    basis: ['plan P5a', 'api-contract GE-11'],
    mocks: eventBrowseSets.tagsServerError,
  },
  async ({ page, step }) => {
    await step(
      '패널을 열면 "태그를 불러오지 못했어요." + [다시 시도]',
      async () => {
        await page.goto('/events');
        await expect(cards(page).first()).toBeVisible();
        await page.getByRole('button', { name: /^태그/ }).click();
        await expect(tagPanel(page).getByText('태그를 불러오지 못했어요.')).toBeVisible();
        await expect(tagPanel(page).getByRole('button', { name: '다시 시도' })).toBeVisible();
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-9',
  '600~1023 폭에서는 3열',
  {
    kind: '반응형',
    summary: 'plan P5a "모바일 2열, 600 이상 3열, PC 4열". 1024 미만이라 모바일 헤더다.',
    basis: ['plan P5a PC', 'gui-screens §3'],
    viewports: ['desktop'],
  },
  async ({ page, step, note }) => {
    await step(
      '700 폭에서 첫 줄 카드 3장',
      async () => {
        await page.setViewportSize({ width: 700, height: 1000 });
        await page.goto('/events');
        await expect(cards(page).first()).toBeVisible();
        const tops = await cards(page).evaluateAll((els) =>
          els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().top)),
        );
        const perRow = tops.filter((t) => t === tops[0]).length;
        await note(`첫 줄 카드 수 ${perRow}`);
        expect(perRow).toBe(3);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-10',
  '카드를 누르면 공연 상세로 간다',
  {
    kind: '정상',
    summary:
      '카드 전체가 링크다. 이동을 기다리는 동안 날짜 줄 끝에 작은 스피너(LinkProgress — (public)에 loading.tsx 없음).',
    basis: ['plan P5a V 범위(링크 이동 진행 표시)', 'patterns §6'],
  },
  async ({ page, step }) => {
    await step(
      '고스락 카드를 누르면 /events/101',
      async () => {
        await page.goto('/events');
        await page.getByRole('link', { name: /고스락 제37회 정기공연/ }).click();
        await expect(page).toHaveURL(/\/events\/101$/);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-11',
  '검색 결과가 없으면 아래에 "이런 공연은 어때요?" 추천 카드',
  {
    kind: '빈 상태',
    summary:
      'GUI `1184:33829`(#158). 추천은 조건 없는 공연임박순 앞 6개(서버 추천 API 없음 — Q91 🤖), 모바일 2열 3줄 · PC는 한 줄 4장. 카드를 누르면 공연 상세.',
    basis: ['GUI 1184:33829', 'GUI 1270:36348', 'design-requests Q91', 'Figma 코멘트 1184:33998'],
  },
  async ({ page, step, testInfo }) => {
    const desktop = testInfo.project.name === 'desktop';
    if (desktop) await page.setViewportSize({ width: 1440, height: 1024 });
    const recommended = page.getByRole('region', { name: '이런 공연은 어때요?' });
    await step('없는 검색어면 결과 없음 + 추천', async () => {
      await page.goto('/events?keyword=zzzz');
      await expect(page.getByText('검색된 공연이 없습니다.')).toBeVisible();
      // 6장을 받고 PC는 앞 4장만 보인다(숨긴 칸은 접근성 트리에서도 빠진다)
      await expect(recommended.getByRole('listitem', { includeHidden: true })).toHaveCount(6);
      await expect(recommended.getByRole('link')).toHaveCount(desktop ? 4 : 6);
      await expect(cards(page)).toHaveCount(0);
    });
    await step(
      '추천 카드를 누르면 공연 상세',
      async () => {
        await recommended.getByRole('link').first().click();
        await expect(page).toHaveURL(/\/events\/\d+$/);
      },
      { fullPage: false },
    );
  },
);

scenario(
  'EVL-12',
  '지난공연보기를 켜면 지난 공연 카드는 흐리고 "공연종료" 칩',
  {
    kind: '정상',
    summary:
      'GUI `939:34039` 예매하기(2줄)(#159): 지난 공연(displayStatus PAST)은 포스터 흐림 + 왼쪽 위 DS tag_v2 grey round "공연종료", 날짜 tertiary · 제목 secondary, 가격 줄 없음(Figma 코멘트 939:34059). 다가오는 공연 카드는 그대로. 제목은 2줄 말줄임.',
    basis: ['GUI 939:34039', 'design-requests Q93', 'api-contract GP-2 displayStatus'],
  },
  async ({ page, step }) => {
    await step('지난공연을 켜고 끝까지 내리면 "공연종료" 카드', async () => {
      await page.goto('/events?includePast=true');
      await expect(cards(page).first()).toBeVisible();
      const ended = cards(page).filter({ hasText: '공연종료' });
      // 다가오는 공연 뒤에 붙는다 — 다음 페이지가 붙을 때까지 내린다
      await expect(async () => {
        await page.mouse.wheel(0, 20000);
        await expect(ended.first()).toBeAttached({ timeout: 1000 });
      }).toPass();
      await expect(ended.first()).toHaveAttribute('data-ended', 'true');
      await expect(ended.first().getByTestId('card-price')).toHaveCount(0);
      await ended.first().scrollIntoViewIfNeeded();
    });
    await step(
      '지난공연을 끄면 "공연종료" 카드가 없다',
      async () => {
        await page.goto('/events');
        await expect(cards(page).first()).toBeVisible();
        await expect(async () => {
          await page.mouse.wheel(0, 20000);
          await expect(page.getByText('더 불러오지 못했어요.')).toHaveCount(0);
          await expect(cards(page)).toHaveCount(14, { timeout: 1000 });
        }).toPass();
        await expect(cards(page).filter({ hasText: '공연종료' })).toHaveCount(0);
      },
      { fullPage: false },
    );
  },
);
