import fs from 'node:fs';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { CHECK_IN_TOKEN, GIFT_TOKEN } from '@/api/__mocks__/fixtures/my-ticket';
import { PINNED_NOTICE_ID } from '@/api/__mocks__/fixtures/notice';
import { CHECKOUT_TICKET, P9_ORDER } from '@/api/__mocks__/fixtures/order';
import { checkoutHref } from '@/features/audience/checkout/model/checkout-params';

import { type MockSession, setMockSession } from './support/auth';
import { expect, test } from './support/fixtures';

/**
 * P14 접근성 — 주요 화면마다 axe(WCAG 2.1 A·AA + best-practice) 위반 0, 보이는 `main` 하나 · `h1` 하나.
 * 화면이 다 그려진 뒤(네트워크가 멎은 뒤) 한 번 검사한다. 키보드 흐름 · 오버레이 포커스는 a11y-keyboard.spec.ts.
 *
 * `A11Y_REPORT=<폴더>`를 주면 실패시키지 않고 화면별 위반을 JSONL로 모은다(implementation-log "P14 — 접근성"의 전/후 표).
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/**
 * 끄는 best-practice 규칙. `region` — Radix 포털(늘 열린 로그인 말풍선 · 토스트 · 오버레이)은 `body` 끝에 붙어 랜드마크 밖에 있다.
 * 오버레이 자체의 이름 · 포커스는 Radix Dialog가 맡는다.
 */
const DISABLED_RULES = ['region'];

/**
 * 디자인 토큰 대비 — 코드로 못 고쳐 디자인에 넘긴 색 쌍(design-requests "P14 접근성 — 색 대비"). 글자색 → 배경색.
 * 색 쌍 단위로 빼고 규칙을 끄지 않는다 — 새 색 조합의 대비 위반은 잡힌다. 토큰이 바뀌면 이 줄을 지운다.
 */
const CONTRAST_PENDING_DESIGN = new Set([
  // text/tertiary · inactive · disabledText(neutral 300) — 1.98:1 · 1.88:1
  '#b8b7b3 #ffffff',
  '#b8b7b3 #f7f7f6',
  // Chip grey weak · strongBorder(neutral 400) 글자
  '#8e8d89 #eeeeed',
  '#8e8d89 #ffffff',
  // coral-red 400 — Chip red weak · 위험 안내 글자(작은 글자) · 티켓탭 어두운 카드 위 · Chip red fill
  '#e84230 #feedec',
  '#e84230 #ffffff',
  '#e84230 #232220',
  '#feedec #e84230',
  // green 400 — Chip green weak · border
  '#28a82e #edfaee',
  '#28a82e #f7f7f6',
  // teal 400 — Chip cyan weak
  '#37c6cd #e4fbfc',
  // 호스팅 사이드바 어두운 공연 카드의 text/secondary(GUI)
  '#5f5e5a #222221',
]);

type Screen = { name: string; path: string; session: MockSession };

const SCREENS: Screen[] = [
  // 관객
  { name: '공연홈', path: '/', session: 'anonymous' },
  { name: '공연 리스트', path: '/events', session: 'anonymous' },
  { name: '공연 상세', path: '/events/101', session: 'anonymous' },
  { name: '호스트 홈', path: '/hosts/11', session: 'anonymous' },
  { name: '로그인', path: '/login', session: 'anonymous' },
  { name: '세션 만료', path: '/login/expired', session: 'anonymous' },
  { name: '선물 랜딩', path: `/gifts/${GIFT_TOKEN.forMe}`, session: 'loggedIn' },
  {
    name: '체크아웃',
    path: checkoutHref(101, { ticketItemId: CHECKOUT_TICKET.paidWithOptions, quantity: 2 }),
    session: 'loggedIn',
  },
  { name: '주문내역', path: '/orders', session: 'loggedIn' },
  { name: '주문 상세', path: `/orders/${P9_ORDER.approvedPaid}`, session: 'loggedIn' },
  { name: '티켓탭', path: '/tickets', session: 'loggedIn' },
  { name: '셀프 체크인', path: `/check-in?token=${CHECK_IN_TOKEN.multi}`, session: 'loggedIn' },
  { name: '입장 확인', path: '/gate-check', session: 'loggedIn' },
  { name: '마이페이지', path: '/mypage', session: 'loggedIn' },
  { name: '관심 호스트', path: '/mypage/following', session: 'loggedIn' },
  { name: '아카이빙', path: '/mypage/archive', session: 'loggedIn' },
  { name: '알림함', path: '/mypage/notifications', session: 'loggedIn' },
  { name: '공지 목록', path: '/notices', session: 'anonymous' },
  { name: '공지 상세', path: `/notices/${PINNED_NOTICE_ID}`, session: 'anonymous' },
  // 호스팅
  { name: '공연준비 홈', path: '/hosting', session: 'loggedIn' },
  { name: '공연준비 홈 · 호스트', path: '/hosting?tab=hosts', session: 'loggedIn' },
  { name: '호스트 만들기', path: '/hosting/new/hosts', session: 'loggedIn' },
  { name: '공연 만들기', path: '/hosting/new/events?hostId=11', session: 'loggedIn' },
  { name: '대시보드(등록 후)', path: '/hosting/events/101/dashboard', session: 'loggedIn' },
  { name: '대시보드(등록 전)', path: '/hosting/events/140/dashboard', session: 'loggedIn' },
  { name: '기본 정보', path: '/hosting/events/101/info', session: 'loggedIn' },
  { name: '상세 정보', path: '/hosting/events/101/detail', session: 'loggedIn' },
  { name: '티켓 목록', path: '/hosting/events/101/tickets', session: 'loggedIn' },
  { name: '새 티켓', path: '/hosting/events/140/tickets/new', session: 'loggedIn' },
  { name: '티켓 수정', path: '/hosting/events/101/tickets/501', session: 'loggedIn' },
  { name: '예매자 관리', path: '/hosting/events/101/guests', session: 'loggedIn' },
  { name: 'QR 체크인', path: '/hosting/events/101/qr', session: 'loggedIn' },
  { name: '호스트 설정', path: '/hosting/hosts/11/settings', session: 'loggedIn' },
  { name: '멤버', path: '/hosting/hosts/11/members', session: 'loggedIn' },
  { name: '호스팅 공지', path: '/hosting/notices', session: 'loggedIn' },
];

const reportDir = process.env.A11Y_REPORT;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.locator('body').waitFor();
}

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .disableRules(DISABLED_RULES)
    .analyze();
  return violations
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes
        .filter((n) => {
          if (v.id !== 'color-contrast') return true;
          const data = n.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
          return !CONTRAST_PENDING_DESIGN.has(`${data?.fgColor} ${data?.bgColor}`);
        })
        .map((n) => ({ target: n.target.join(' '), html: n.html, summary: n.failureSummary })),
    }))
    .filter((v) => v.nodes.length > 0);
}

/**
 * axe가 보지 않는 문서 구조(P5b-V가 남긴 "상세 화면에 h1 둘"): 보이는 `main` 하나, 보이는 `h1` 하나.
 * 위반을 axe 결과와 같은 모양으로 돌려준다.
 */
async function outline(page: Page) {
  const { mains, h1s } = await page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const all = (sel: string) => [...document.querySelectorAll(sel)].filter(visible);
    return {
      mains: all('main, [role="main"]').length,
      h1s: all('h1').map((h) => h.textContent?.trim() ?? ''),
    };
  });
  const found: { rule: string; impact: string; help: string; nodes: { target: string }[] }[] = [];
  if (mains !== 1)
    found.push({ rule: 'dd-one-main', impact: 'moderate', help: `main ${mains}개`, nodes: [] });
  if (h1s.length !== 1)
    found.push({
      rule: 'dd-one-h1',
      impact: 'moderate',
      help: `h1 ${h1s.length}개`,
      nodes: h1s.map((t) => ({ target: t })),
    });
  return found;
}

for (const screen of SCREENS) {
  test(`axe — ${screen.name} (${screen.path})`, async ({ page }, testInfo) => {
    await setMockSession(page, screen.session);
    await page.goto(screen.path);
    await settle(page);
    const violations = [...(await scan(page)), ...(await outline(page))];
    if (reportDir) {
      fs.mkdirSync(reportDir, { recursive: true });
      const file = path.join(reportDir, `${testInfo.project.name}.jsonl`);
      fs.appendFileSync(file, `${JSON.stringify({ screen: screen.name, violations })}\n`);
      return;
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

/**
 * 확대 · 리플로(WCAG 1.4.10): 1280 폭을 400%로 키운 것과 같은 320 CSS px에서 가로 스크롤이 생기지 않는다.
 * 200%(640)는 모바일 배치 안이라 이것으로 같이 덮는다. 모바일 프로젝트에서만 돈다(폭을 바꿔 다시 그린다).
 */
for (const screen of SCREENS) {
  test(`리플로 320 — ${screen.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', '폭을 바꿔 보는 검사 — 한 번만');
    await page.setViewportSize({ width: 320, height: 640 });
    await setMockSession(page, screen.session);
    await page.goto(screen.path);
    await settle(page);
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= root.clientWidth + 1) return false;
          // 가로로 넘기는 영역(캐러셀 · 표) 안에 있으면 그 영역이 스크롤한다 — 화면 전체는 넘치지 않는다
          for (let p = el.parentElement; p; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return false;
          }
          return true;
        })
        .slice(0, 5)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}.${el.className} → ${Math.round(el.getBoundingClientRect().right)}`,
        );
      return { scroll: root.scrollWidth - root.clientWidth, wide };
    });
    if (reportDir) {
      fs.mkdirSync(reportDir, { recursive: true });
      fs.appendFileSync(
        path.join(reportDir, 'reflow.jsonl'),
        `${JSON.stringify({ screen: screen.name, ...overflow })}\n`,
      );
      return;
    }
    expect(overflow.scroll, JSON.stringify(overflow.wide)).toBeLessThanOrEqual(0);
  });
}
