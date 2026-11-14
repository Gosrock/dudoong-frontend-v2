import type { Page } from '@playwright/test';

import { setMockSession } from '../../e2e/support/auth';
import { setStoredStatus } from '../../src/api/__mocks__/event-store';
import {
  markTicketCanceled,
  resetTicketStore as resetMyTicketStore,
  TICKET_UUID,
} from '../../src/api/__mocks__/fixtures/my-ticket';
import { resetHostMockState } from '../../src/api/__mocks__/host.handlers';
import { resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { ZXING_WASM_PATH } from '../../src/features/hosting/qr/ui/zxing-wasm';
import { expect, scenario } from '../scenario';

/**
 * P13b QR 체크인(`/hosting/events/[eventId]/qr`, plan P13b 완료 기준 V) — **GUI 근거**(P13b-GUI, Design Sync #215~#234).
 * - 기본 모바일 `1360:13479` · 데스크탑1440 `1352:30715` · 전체화면 `1359:398` · `1352:30986` · 관객 `1360:25912` · `1360:27107`
 * - 결과 카드 10종(`1362:1295`, 매핑 가이드 `1411:7760` — 13 → 10) · 카메라 켜는 중 · 실패 5종(`1349:713` · `1360:23457` 등)
 * - 공연 상태 막힘(`1360:25576` · `1360:25745`) · 티켓 번호 결과 카드 · 입장 취소(`1368:4838` · `1372:18887` · `1372:19151`)
 * - 카메라: 브라우저 `getUserMedia`를 캔버스 영상으로 바꿔 스캐너가 켜진 모양을 찍고, 판독 값은 주입 어댑터(`dd:qr-scan`)로 넣는다.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 호스팅 센터(로그인 게이트 안, 서버 조회 없음)
 * - 권한: 일반 멤버도 GQ-1·PQ-2를 쓴다(L 훅 테스트). 공연 접근 403·404는 공연 스코프 레이아웃이 맡는다(P11 QA)
 * - 빈 상태: 발급 0장 공연은 통계 0/0 — 공연 상태 안내(QR-7)와 같은 칸이라 따로 두지 않았다
 * - 반응형: 모든 시나리오 mobile(390) · desktop — 데스크탑은 GUI 프레임 폭 1440으로 바꿔 찍는다(`setUp`)
 */

const reset = () => {
  resetHostMockState();
  resetHostingStore();
  resetMyTicketStore();
};

type Camera = 'fake' | 'denied' | 'none';

/** 카메라 바꾸기 — fake: 회색 캔버스 영상 · denied: 권한 거부 · none: 카메라 없음 */
async function stubCamera(page: Page, camera: Camera) {
  await page.addInitScript((mode: Camera) => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia = async () => {
      if (mode === 'denied') throw new DOMException('denied', 'NotAllowedError');
      if (mode === 'none') throw new DOMException('no camera', 'NotFoundError');
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 480;
      const ctx = c.getContext('2d')!;
      setInterval(() => {
        ctx.fillStyle = '#55556a';
        ctx.fillRect(0, 0, 640, 480);
      }, 100);
      return c.captureStream(10);
    };
  }, camera);
}

async function setUp(page: Page, camera: Camera = 'fake') {
  reset();
  // GUI 데스크탑 프레임이 1440 — desktop 프로젝트만 폭을 바꾼다(모바일은 390 그대로)
  if ((page.viewportSize()?.width ?? 0) >= 1024)
    await page.setViewportSize({ width: 1440, height: 1024 });
  await stubCamera(page, camera);
  await setMockSession(page, 'loggedIn');
}

const QR = '/hosting/events/101/qr';
const result = (page: Page) => page.getByRole('region', { name: '스캔 결과' });

/** 판독 값 주입(카메라에 QR을 비춘 것과 같은 길) */
async function scan(page: Page, value: string) {
  await expect(page.getByTestId('host-scan')).toBeVisible();
  await page.evaluate(
    (v) => window.dispatchEvent(new CustomEvent('dd:qr-scan', { detail: v })),
    value,
  );
}

scenario(
  'QR-1',
  '대시보드 → QR 체크인 — 통계 · 카메라, 스캔하면 입장 완료 + 통계 갱신',
  {
    kind: '정상',
    summary:
      '통계 3칸(전체 티켓 · 입장 완료 · 미입장) + 막대 + 입장률, [호스트가 QR 스캔] 검정 카메라 · 가이드 · 안내 알약 · [⤢]. 승인 티켓을 찍으면 입장 완료 카드(이름 · 티켓 · 번호)와 1/7.',
    basis: [
      'plan P13b 완료 기준 V(result 화면)',
      'GUI 1360:13479 · 1352:30715 · 결과 1362:2224 · 1362:2054',
      'P13a 대시보드 "QR 체크인 열기"',
    ],
  },
  async ({ page, step }) => {
    await setUp(page);
    // P14 보안 — 판독 엔진 wasm은 우리 출처(`public/vendor/zxing-wasm`)에서, jsdelivr는 부르지 않는다
    const cdn: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('jsdelivr.net')) cdn.push(r.url());
    });
    const wasm = page.waitForResponse((r) => new URL(r.url()).pathname === ZXING_WASM_PATH);
    await step('대시보드에서 "QR 체크인 열기"를 누르면 QR 체크인 화면이 열린다', async () => {
      await page.goto('/hosting/events/101/dashboard');
      await page.getByRole('link', { name: 'QR 체크인 열기' }).click();
      await expect(page).toHaveURL(QR);
      // 카메라가 켜지면 첫 판독에서 wasm을 받는다
      const res = await wasm;
      expect(res.status()).toBe(200);
      expect(new URL(res.url()).origin).toBe(new URL(page.url()).origin);
      expect(cdn).toEqual([]);
      await expect(page.getByTestId('checkin-stat-issued')).toHaveText('7');
      await expect(page.getByTestId('checkin-stats-rate')).toHaveText('0% 입장 완료');
      await expect(page.getByTestId('host-scan')).toHaveAttribute('data-camera', 'live');
      await expect(page.getByTestId('host-scan')).toContainText('티켓 QR을 카메라에 비춰 주세요');
      await expect(page.getByRole('button', { name: '전체화면 전환' })).toBeVisible();
    });
    await step('승인된 티켓을 찍으면 입장 완료 카드와 1/7 · 14.3%가 보인다', async () => {
      await scan(page, TICKET_UUID.approved);
      await expect(result(page)).toHaveAttribute('data-result', 'ENTERED');
      await expect(result(page)).toContainText('입장 완료');
      await expect(page.getByTestId('scan-ticket')).toContainText('두둥이');
      await expect(page.getByTestId('checkin-stat-entered')).toHaveText('1');
      await expect(page.getByTestId('checkin-stats-rate')).toHaveText('14.3% 입장 완료');
    });
    await step('[다음 스캔]을 누르면 결과가 지워지고 기다림 안내로 돌아온다', async () => {
      await result(page).getByRole('button', { name: '다음 스캔' }).click();
      await expect(result(page)).toHaveAttribute('data-status', 'idle');
    });
  },
);

scenario(
  'QR-2',
  'result 5종 + 티켓 QR 아님 — 결과 카드(매핑 가이드 대로)',
  {
    kind: '정상',
    summary:
      '입장 완료(초록) → 같은 티켓 다시: 이미 입장(노랑, "{입장 시각} 입장") · 선물 대기(노랑) · 다른 공연(빨강, 티켓 정보 없음) · 취소된 티켓(빨강) · 64자 넘는 값은 다른 공연과 같은 "이 공연 티켓이 아니에요"(가이드 5 · 7 묶음).',
    basis: [
      'plan P13b 완료 기준 V(result 5종 화면)',
      'GUI 결과 카드 1362:1295 · 매핑 가이드 1411:7760(#234)',
      '결과 프레임 1365:2251 · 1365:2573 · 1365:2895 · 1365:3202',
    ],
  },
  async ({ page, step }) => {
    await setUp(page);
    markTicketCanceled(TICKET_UUID.received);
    await page.goto(QR);
    const cases: [string, string, string, string][] = [
      ['승인된 티켓', TICKET_UUID.approved, 'ENTERED', '입장 완료'],
      [
        '같은 티켓을 쿨다운 뒤 다시',
        TICKET_UUID.approved,
        'ALREADY_ENTERED',
        '이미 입장한 티켓이에요',
      ],
      ['선물 대기 티켓', TICKET_UUID.giftPending, 'GIFT_PENDING', '선물 대기 중인 티켓이에요'],
      ['다른 공연 티켓', TICKET_UUID.entered, 'OTHER_EVENT', '이 공연 티켓이 아니에요'],
      ['취소된 티켓', TICKET_UUID.received, 'CANCELED', '취소된 티켓이에요'],
    ];
    for (const [what, value, code, title] of cases) {
      await step(`${what}을 찍으면 "${title}"`, async () => {
        await page
          .getByRole('button', { name: '다음 스캔' })
          .click({ timeout: 1000 })
          .catch(() => {});
        // 같은 값은 끝난 뒤 3초 동안 무시한다(연속 스캔 스로틀)
        if (code === 'ALREADY_ENTERED') await page.waitForTimeout(3200);
        await scan(page, value);
        await expect(result(page)).toHaveAttribute('data-result', code);
        await expect(result(page)).toContainText(title);
        if (code === 'OTHER_EVENT') await expect(page.getByTestId('scan-ticket')).toHaveCount(0);
      });
    }
    await step(
      '티켓 QR이 아닌 값(64자 넘음)도 "이 공연 티켓이 아니에요"(가이드 7 → 5와 같은 카드)',
      async () => {
        await scan(page, 'https://example.com/'.padEnd(80, 'x'));
        await expect(result(page)).toHaveAttribute('data-status', 'invalidQr');
        await expect(result(page)).toHaveAttribute('data-card', 'notThisEvent');
        await expect(result(page)).toContainText('이 공연 티켓이 아니에요');
      },
    );
  },
);

scenario(
  'QR-3',
  '네트워크 차단 → 실패 카드 · [다시 시도]로 입장',
  {
    kind: '에러',
    summary:
      '입장 처리 요청이 끊기면 빨간 실패 카드 "입장 처리를 하지 못했어요 / 잠시 후 다시 시도해 주세요" + [다시 시도](가이드 6 · 9 · 10 묶음). 연결 뒤 다시 시도하면 입장 완료.',
    basis: [
      'plan P13b 완료 기준 V(네트워크 차단 시 명확한 실패 UI)',
      'GUI 1365:4662 · 1365:4488 · 매핑 가이드 1411:7760',
    ],
  },
  async ({ page, step }) => {
    await setUp(page);
    await page.goto(QR);
    await expect(page.getByTestId('checkin-stats-rate')).toContainText('입장 완료');
    await step('네트워크가 끊긴 채 찍으면 실패 카드가 보인다', async () => {
      await page.route('**/api/v2/events/101/check-ins', (r) => r.abort('internetdisconnected'));
      await scan(page, TICKET_UUID.approved);
      await expect(result(page)).toHaveAttribute('data-status', 'failed');
      await expect(result(page)).toHaveAttribute('data-card', 'failed');
      await expect(result(page).getByRole('alert')).toContainText('입장 처리를 하지 못했어요');
      await expect(result(page).getByRole('button', { name: '다음 스캔' })).toHaveCount(0);
    });
    await step('연결된 뒤 [다시 시도]를 누르면 입장 완료', async () => {
      await page.unroute('**/api/v2/events/101/check-ins');
      await result(page).getByRole('button', { name: '다시 시도' }).click();
      await expect(result(page)).toHaveAttribute('data-result', 'ENTERED');
    });
  },
);

scenario(
  'QR-4',
  '카메라 권한 거부 — 회색 자리에 카메라 금지 아이콘 · 이유 · [다시 켜기]',
  {
    kind: '에러',
    summary: '권한을 거부하면 "카메라 권한이 필요해요" + [다시 켜기]. 안내 알약 · [⤢]는 숨긴다.',
    basis: ['plan P13b V 범위(카메라 권한 거부 UI)', 'GUI 1360:23457 · 1349:16(#226 · #230)'],
  },
  async ({ page, step }) => {
    await setUp(page, 'denied');
    await step('권한을 거부하면 "카메라 권한이 필요해요"와 [다시 켜기]', async () => {
      await page.goto(QR);
      const problem = page.getByTestId('camera-problem');
      await expect(problem).toContainText('카메라 권한이 필요해요');
      await expect(problem.getByRole('button', { name: '다시 켜기' })).toBeVisible();
      await expect(page.getByTestId('host-scan')).not.toContainText('카메라에 비춰');
      await expect(page.getByRole('button', { name: '전체화면 전환' })).toHaveCount(0);
    });
  },
);

scenario(
  'QR-4b',
  '카메라 없음 — "카메라를 찾을 수 없어요"',
  {
    kind: '에러',
    summary: '카메라가 없는 기기(PC 등)에서는 [관객이 QR 스캔]을 권한다.',
    basis: ['plan P13b V 범위(스캔 실패 UI)', 'GUI 1360:23536 · 1352:31657'],
  },
  async ({ page, step }) => {
    await setUp(page, 'none');
    await step('카메라가 없으면 "카메라를 찾을 수 없어요"', async () => {
      await page.goto(QR);
      await expect(page.getByTestId('camera-problem')).toContainText('카메라를 찾을 수 없어요');
      await expect(page.getByTestId('camera-problem')).toContainText('[관객이 QR 스캔]');
    });
  },
);

scenario(
  'QR-5',
  '[호스트가 QR 스캔] 전체화면 — 결과 카드도 보이고, 뒤로가기로 닫힌다',
  {
    kind: '정상',
    summary:
      '[⤢]를 누르면 카메라가 화면을 덮고 오른쪽 위 [✕]가 생긴다. 전체화면에서 찍어도 결과 카드가 아래에 보이고, 뒤로가기는 화면을 떠나지 않고 전체화면만 닫는다.',
    basis: [
      'plan P13b V 범위(전체화면)',
      'GUI 1359:398 · 1352:30986 · 결과 1367:4189 · 1367:4147',
      'patterns §6 뒤로가기',
    ],
  },
  async ({ page, step }) => {
    await setUp(page);
    await page.goto(QR);
    await step('[전체화면 전환]을 누르면 카메라가 화면을 덮는다', async () => {
      await page.getByRole('button', { name: '전체화면 전환' }).click();
      await expect(page.getByTestId('host-scan')).toHaveAttribute('data-fullscreen', 'true');
      await expect(page.getByRole('button', { name: '전체화면 닫기' })).toBeVisible();
    });
    await step('전체화면에서 찍으면 결과 카드가 보인다', async () => {
      await scan(page, TICKET_UUID.approved);
      await expect(result(page)).toHaveAttribute('data-result', 'ENTERED');
    });
    await step('뒤로가기를 누르면 전체화면만 닫히고 QR 체크인에 남는다', async () => {
      await page.goBack();
      await expect(page).toHaveURL(QR);
      await expect(page.getByTestId('host-scan')).not.toHaveAttribute('data-fullscreen', 'true');
    });
  },
);

scenario(
  'QR-6',
  '[관객이 QR 스캔] — 셀프 체크인 QR · 전체화면 · [✕]로 닫기',
  {
    kind: '정상',
    summary:
      'QR 주소 = 이 사이트 origin + qrPath(GQ-4). 회색 자리 · 흰 판 위 QR + "QR 코드를 스캔하면 입장이 완료됩니다". 전체화면은 로고 · 공연 이름 · 큰 QR · 안내.',
    basis: ['plan P13b V 범위([관객이 스캔] QR 표시 · 전체화면)', 'GUI 1360:25912 · 1360:27107'],
  },
  async ({ page, step }) => {
    await setUp(page);
    await page.goto(QR);
    await step('[관객이 QR 스캔]을 누르면 셀프 체크인 QR이 보인다', async () => {
      await page.getByRole('tab', { name: '관객이 QR 스캔' }).click();
      const qr = page.getByTestId('self-check-in-qr');
      await expect(qr).toHaveAttribute(
        'data-value',
        `${new URL(page.url()).origin}/check-in?token=mock-checkin-101`,
      );
      await expect(qr.locator('svg')).toBeVisible();
      await expect(page.getByText('QR 코드를 스캔하면 입장이 완료됩니다')).toBeVisible();
    });
    await step('[⤢]를 누르면 로고 · 공연 이름 · 큰 QR', async () => {
      await page.getByRole('button', { name: '전체화면 전환' }).click();
      const region = page.getByRole('region', { name: '셀프 체크인 QR' });
      await expect(region).toHaveAttribute('data-fullscreen', 'true');
      await expect(region.getByRole('heading', { name: '고스락 제37회 정기공연' })).toBeVisible();
    });
    await step('[✕]를 누르면 전체화면이 닫힌다', async () => {
      await page.getByRole('button', { name: '전체화면 닫기' }).click();
      await expect(page.getByRole('region', { name: '셀프 체크인 QR' })).not.toHaveAttribute(
        'data-fullscreen',
        'true',
      );
    });
  },
);

scenario(
  'QR-7',
  '공연 상태 안내 — 정산중이면 셀프 체크인 안내만, 지난 공연이면 두 탭 모두 막힘',
  {
    kind: '빈 상태',
    summary:
      '정산중: [호스트가 QR 스캔]은 되고 [관객이 QR 스캔]은 QR 대신 안내 두 줄(화면 없음 🤖). 지난 공연: 두 탭 모두 회색 자리에 카메라 금지 아이콘 + "지난 공연은 입장 처리를 할 수 없어요", 티켓 번호 칸 없음.',
    basis: [
      'plan P13b 완료 기준 L(끝난 공연 안내 · Event_400_27)',
      'GUI 1360:25576 · 1360:25654 · 1360:24537 · 1360:25202(#227 · #231)',
    ],
  },
  async ({ page, step }) => {
    await setUp(page);
    setStoredStatus(101, 'CALCULATING');
    await step('정산중 공연의 [관객이 QR 스캔]은 QR 대신 안내', async () => {
      await page.goto(QR);
      await expect(page.getByTestId('host-scan')).toBeVisible();
      await page.getByRole('tab', { name: '관객이 QR 스캔' }).click();
      await expect(page.getByTestId('self-check-in-guidance')).toHaveText(
        '공연이 끝나면(정산중·지난 공연) 셀프 체크인이 안 돼요',
      );
      await expect(page.getByTestId('self-check-in-qr')).toHaveCount(0);
    });
    await step('지난 공연은 카메라 대신 "지난 공연은 입장 처리를 할 수 없어요"', async () => {
      await page.goto('/hosting/events/90/qr');
      await expect(page.getByTestId('host-scan-blocked')).toHaveText(
        '지난 공연은 입장 처리를 할 수 없어요',
      );
      await expect(page.getByTestId('ticket-no-check-in')).toHaveCount(0);
      await page.getByRole('tab', { name: '관객이 QR 스캔' }).click();
      await expect(page.getByTestId('self-check-in-guidance')).toHaveText(
        '지난 공연은 입장 처리를 할 수 없어요',
      );
    });
  },
);

scenario(
  'QR-10',
  '카메라를 쓸 수 없으면 티켓 번호로 입장 — 결과 카드 · 관객 이름 크게 · [입장 취소]',
  {
    kind: '정상',
    summary:
      'PQ-2b(백엔드 #926). 구분선 아래 "티켓 번호로 입장"(PC는 오른쪽에 결과 카드). 숫자만 넣어도 서버가 T를 붙인다. 입장 완료 카드는 "본인이 맞는지 확인해 주세요" + 번호 · 이름 크게 · 티켓 + [입장 취소](확인 창 → 토스트 "입장 처리를 취소했어요."). 이미 입장 · 없는 번호(이 공연 티켓이 아니에요) · 빈 값 · 번호 모양이 아닌 값(abc — 서버로 보내지 않음, 칸 아래 빨간 문구 `1368:6774`).',
    basis: [
      'Backend #914 답 6(B27)',
      'GUI 1368:5238 · 1368:5083 · 1368:5494 · 1368:6268 · 1368:6774 · 1372:18887 · 1372:19151(#221~#224)',
    ],
  },
  async ({ page, step }) => {
    await setUp(page, 'denied');
    await page.goto(QR);
    const box = page.getByTestId('ticket-no-check-in');
    const field = box.getByRole('textbox', { name: '티켓 번호로 입장' });
    await step('카메라를 못 켜도 번호 입력 칸이 있다', async () => {
      await expect(box).toBeVisible();
      await expect(field).toHaveAttribute('placeholder', '예: T1000118');
    });
    await step('숫자만(1000001) 넣고 [입장 처리] → 입장 완료 + 관객 이름 "두둥이"', async () => {
      await field.fill('1000001');
      await box.getByRole('button', { name: '입장 처리' }).click();
      const res = page.getByTestId('ticket-no-result');
      await expect(res).toHaveAttribute('data-result', 'ENTERED');
      await expect(page.getByTestId('ticket-no-owner')).toHaveText('두둥이');
      await expect(field).toHaveValue('');
      await expect(page.getByTestId('checkin-stat-entered')).toHaveText('1');
    });
    await step('같은 번호를 다시 넣으면 이미 입장', async () => {
      await field.fill('T1000001');
      await box.getByRole('button', { name: '입장 처리' }).click();
      await expect(page.getByTestId('ticket-no-result')).toHaveAttribute(
        'data-result',
        'ALREADY_ENTERED',
      );
    });
    await step(
      '예매자 티켓(T2000002)을 넣고 [입장 취소] → 확인 창 → 토스트, 카드가 지워진다',
      async () => {
        await field.fill('T2000002');
        await box.getByRole('button', { name: '입장 처리' }).click();
        const res = page.getByTestId('ticket-no-result');
        await expect(res).toHaveAttribute('data-result', 'ENTERED');
        await expect(res).toContainText('본인이 맞는지 확인해 주세요');
        await res.getByRole('button', { name: '입장 취소' }).click();
        const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
        await expect(dialog).toContainText('입장 처리를 취소할까요?');
        await dialog.getByRole('button', { name: '입장 취소' }).click();
        await expect(page.getByText('입장 처리를 취소했어요.')).toBeVisible();
        await expect(page.getByTestId('ticket-no-result')).toHaveCount(0);
      },
    );
    await step('없는 번호는 티켓 정보 없음(OTHER_EVENT), 빈 값은 칸 오류', async () => {
      await field.fill('T9999999');
      await box.getByRole('button', { name: '입장 처리' }).click();
      await expect(page.getByTestId('ticket-no-result')).toHaveAttribute(
        'data-result',
        'OTHER_EVENT',
      );
      await expect(page.getByTestId('ticket-no-result')).toContainText('이 공연 티켓이 아니에요');
      await field.fill('');
      await box.getByRole('button', { name: '입장 처리' }).click();
      await expect(box.getByText('티켓 번호를 확인해 주세요 (예: T1000118)')).toBeVisible();
    });
    await step(
      '번호 모양이 아닌 값(abc)은 서버로 보내지 않고 칸 아래 "티켓 번호를 확인해 주세요"',
      async () => {
        const sent: string[] = [];
        page.on('request', (r) => {
          if (r.url().includes('/by-ticket-no')) sent.push(r.url());
        });
        await field.fill('abc');
        await box.getByRole('button', { name: '입장 처리' }).click();
        await expect(box.getByText('티켓 번호를 확인해 주세요 (예: T1000118)')).toBeVisible();
        await expect(page.getByTestId('ticket-no-result')).toHaveCount(0);
        expect(sent).toEqual([]);
      },
    );
  },
);

scenario.manual('QR-8', '실기기 3종 이상에서 티켓 QR 판독', {
  kind: '정상',
  basis: ['plan P13b 완료 기준 V(실기기 3종 이상에서 판독)'],
  how: 'D2 스테이징(HTTPS — 카메라는 보안 출처에서만 켜진다)에서 iPhone Safari · Android Chrome · 태블릿(또는 노트북 Chrome)으로 QR 체크인 → [호스트가 QR 스캔]을 열고, 다른 폰 티켓탭의 입장 QR을 비춘다. 입장 완료 · 같은 티켓 다시(이미 입장) · 카메라 권한 거부 화면을 기기마다 본다. iPhone은 BarcodeDetector가 없어 판독 엔진(wasm)을 jsdelivr에서 받는다 — 처음 판독이 늦지 않은지도 본다.',
});

scenario.manual('QR-9', '[관객이 스캔] QR을 실제 폰으로 찍어 /check-in 입장', {
  kind: '정상',
  basis: ['plan P13b 완료 기준 V([관객이 스캔] — GQ-4 QR을 실제 폰으로, D2 스테이징 주소로)'],
  how: 'D2 스테이징에서 호스트 계정으로 [관객이 QR 스캔] 전체화면을 띄우고, 티켓이 있는 관객 폰의 기본 카메라로 찍는다 → 스테이징 /check-in이 열리고 로그인 뒤 입장이 완료되는지, 호스트 화면 통계가 늘어나는지 본다.',
});
