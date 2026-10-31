import type { Page } from '@playwright/test';

import { readSessionFlag, setMockSession } from '../../e2e/support/auth';
import { authHandlers } from '../../src/api/__mocks__/auth.handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 로그인 · 세션 만료 · 카카오 콜백 대기/실패 안내 · 회원가입 오버레이(plan P4b 완료 기준 V).
 * 근거: 로그인은 **와이어** `218:4792`("로그인" — GUI `331:11720`은 Ready for dev가 아니다). 세션 만료·콜백·가입 오버레이는
 * **디자인 없음**(DS 컴포넌트로만, Figma 코멘트로 물음). 캡처는 와이어와 구조·문구·동작만 비교한다.
 * 카카오는 가짜 인증 화면(`/api/__mock/kakao/authorize`)에서 사용자·실패를 고른다.
 *
 * 범주 검토
 * - 빈 상태: 해당 없음(입력 화면뿐 — 카카오 값이 빈 칸은 LOGIN-5가 본다)
 * - 권한: 비로그인 → 로그인 → 원래 화면은 auth-gate.qa.ts·e2e auth.spec.ts가 본다. 여기서는 화면만
 * - 크롤러: 해당 없음 — `(app)` 클라이언트 화면(서버 조회 없음)
 * - 반응형: 모든 시나리오가 mobile(바텀시트)·desktop(모달)에서 돈다
 */

const KAKAO_BUTTON = { name: '카카오 로그인/회원가입' } as const;

async function chooseKakao(page: Page, choice: string) {
  await page.getByRole('button', KAKAO_BUTTON).click();
  await expect(page.getByRole('heading', { name: '가짜 카카오 로그인' })).toBeVisible();
  await page.getByRole('link', { name: choice, exact: true }).click();
}

scenario(
  'LOGIN-1',
  '로그인 화면에 말풍선 · 캐릭터 · 카카오 버튼이 보이고, 누르면 카카오로 간다',
  {
    kind: '정상',
    summary:
      '와이어 218:4792 그대로 — 말풍선(DS 툴팁, 늘 열림) + 캐릭터(DS img_login) + 검정 버튼.',
    basis: ['plan P4b V 범위 · GUI', 'gui-screens §0 로그인 줄', '와이어 218:4792'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await step('/login 을 열면 말풍선 문구와 [카카오 로그인/회원가입]이 보인다', async () => {
      await page.goto('/login?redirect=%2Fevents');
      await expect(page.getByRole('heading', { name: '로그인' })).toBeAttached();
      await expect(
        page.getByText('두둥에 로그인하고 즐거운 공연 라이프를 즐겨보세요!').first(),
      ).toBeVisible();
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeEnabled();
    });
    await step('버튼을 누르면 카카오 인증 화면으로 간다', async () => {
      await page.getByRole('button', KAKAO_BUTTON).click();
      await expect(page.getByRole('heading', { name: '가짜 카카오 로그인' })).toBeVisible();
    });
  },
);

scenario(
  'LOGIN-2',
  '세션 만료 화면은 같은 배치에 만료 문구가 보인다',
  {
    kind: '정상',
    summary:
      '와이어가 없어 로그인 화면 배치에 말풍선 문구만 바꿨다(implementation-log P4b-V 결정).',
    basis: ['plan P4b V 범위', 'gui-screens §0 로그인 · 세션 만료 줄', 'patterns §5-1 세션 상실'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await step('/login/expired 를 열면 "로그인이 만료됐어요" 문구와 버튼이 보인다', async () => {
      await page.goto('/login/expired?redirect=%2Fevents');
      await expect(page.getByRole('heading', { name: '로그인이 만료됐어요' })).toBeAttached();
      await expect(
        page.getByText('로그인이 만료됐어요. 다시 로그인해 주세요.').first(),
      ).toBeVisible();
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeEnabled();
    });
  },
);

scenario(
  'LOGIN-3',
  '카카오 링크 발급이 실패하면 버튼 아래 실패 안내가 보이고 다시 누를 수 있다',
  {
    kind: '에러',
    summary: '1번 링크 발급 5xx → 일반 실패(failed). 버튼은 다시 풀린다.',
    basis: ['plan P4b L 범위 "콜백 실패"', 'patterns §24 P4b', 'tech-decisions §4 P4b-L 구현 기록'],
    mocks: [...authHandlers.kakaoLinkServerError],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await step('버튼을 누르면 "로그인하지 못했어요. 다시 시도해 주세요."가 보인다', async () => {
      await page.goto('/login');
      await page.getByRole('button', KAKAO_BUTTON).click();
      await expect(
        page.getByRole('alert').filter({ hasText: '로그인하지 못했어요. 다시 시도해 주세요.' }),
      ).toBeVisible();
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeEnabled();
    });
  },
);

scenario(
  'LOGIN-4',
  '신규 사용자는 회원가입 오버레이에서 필수 동의 뒤 가입하고 원래 화면으로 돌아간다',
  {
    kind: '정상',
    summary:
      '디자인 없음 — 모바일 바텀시트 · PC 모달. 카카오 값으로 채운 이름·이메일·전화번호, 전체 동의 + 필수 2 · 선택 1(만 14세 칸은 Q42 대기로 없음). 필수 동의 전에는 버튼이 막힌다.',
    basis: ['plan P4b 완료 기준 V', 'design-requests Q25 · Q42', 'legal-copy B-3·B-5'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fevents');
    await step('신규 사용자를 고르면 회원가입 오버레이가 카카오 값으로 열린다', async () => {
      await chooseKakao(page, '신규 사용자(가입)');
      await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: '이름' })).toHaveValue('새내기');
      await expect(page.getByRole('checkbox', { name: '전체 동의' })).toBeVisible();
      await expect(page.getByRole('checkbox', { name: /만 14세/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '동의하고 시작하기' })).toBeDisabled();
    });
    await step('필수 동의 두 개를 체크하면 버튼이 풀린다', async () => {
      await page.getByRole('checkbox', { name: '(필수) 서비스 이용약관 동의' }).check();
      await page.getByRole('checkbox', { name: '(필수) 개인정보 처리방침 동의' }).check();
      await expect(page.getByRole('button', { name: '동의하고 시작하기' })).toBeEnabled();
    });
    await step('[동의하고 시작하기]를 누르면 원래 화면(/events)으로 돌아간다', async () => {
      await page.getByRole('button', { name: '동의하고 시작하기' }).click();
      await expect(page).toHaveURL(/\/events$/);
      expect(await readSessionFlag(page)).not.toBeNull();
    });
  },
);

scenario(
  'LOGIN-5',
  '가입 칸 오류 — 빈 이메일 · 전화번호 모양 · 서버가 거절한 번호',
  {
    kind: '에러',
    summary:
      '칸 오류는 칸을 떠난 뒤부터 보인다. 전화번호는 입력하는 대로 하이픈이 들어간다. 서버 400 USER_400_2는 칸 오류 "전화번호를 확인해 주세요"이고 번호를 고칠 때까지 막는다.',
    basis: ['plan P4b 완료 기준 L 전화번호(사용자 결정 2026-10-31)', 'patterns §24 P4b USER_400_2'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login');
    await step('이메일 동의를 안 한 신규 사용자는 빈 이메일 칸 오류가 보인다', async () => {
      await chooseKakao(page, '신규 사용자 — 이메일 동의 안 함');
      const email = page.getByRole('textbox', { name: '이메일' });
      await expect(email).toHaveValue('');
      await email.focus();
      await page.getByRole('textbox', { name: '이름' }).focus();
      await expect(page.getByText('이메일을 입력해 주세요')).toBeVisible();
    });
    await step('전화번호를 짧게 적고 떠나면 모양 오류가 보인다', async () => {
      await page.getByRole('textbox', { name: '이메일' }).fill('fix@example.com');
      const phone = page.getByRole('textbox', { name: '전화번호' });
      await phone.fill('0101');
      await expect(phone).toHaveValue('010-1');
      await page.getByRole('textbox', { name: '이름' }).focus();
      await expect(
        page.getByText('휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요'),
      ).toBeVisible();
    });
    await step(
      '모양은 맞지만 서버가 거절한 번호면 "전화번호를 확인해 주세요"로 막힌다',
      async () => {
        await page.getByRole('textbox', { name: '전화번호' }).fill('01001234567');
        await page.getByRole('checkbox', { name: '전체 동의' }).check();
        await page.getByRole('button', { name: '동의하고 시작하기' }).click();
        await expect(page.getByText('전화번호를 확인해 주세요')).toBeVisible();
        await expect(page.getByRole('button', { name: '동의하고 시작하기' })).toBeDisabled();
      },
    );
  },
);

scenario(
  'LOGIN-6',
  '가입 오버레이를 닫으면(Esc · 뒤로가기) 로그인 화면으로 돌아간다',
  {
    kind: '정상',
    summary:
      '가입을 그만두면 쓴 인가 코드가 든 콜백 주소를 기록에 남기지 않고 로그인 화면으로 replace(돌아올 곳 유지). 뒤로가기가 오버레이를 닫는다(patterns §6).',
    basis: ['patterns §6 오버레이', 'tech-decisions §4 P4b-L 구현 기록(성공 이동 replace)'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fevents');
    await step('가입 오버레이에서 Esc를 누르면 로그인 화면(redirect 유지)으로 간다', async () => {
      await chooseKakao(page, '신규 사용자(가입)');
      await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/\/login\?redirect=%2Fevents$/);
    });
    await step('다시 들어와 뒤로가기를 누르면 오버레이가 닫히고 로그인 화면으로 간다', async () => {
      await chooseKakao(page, '신규 사용자(가입)');
      await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/login\?redirect=%2Fevents$/);
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeVisible();
    });
  },
);

scenario(
  'LOGIN-7',
  '정지 계정이면 "이용이 제한된 계정이에요"와 [다시 로그인]이 보인다',
  {
    kind: '에러',
    summary:
      '로그인 403 USER_403_1. 디자인 없음 — 빈 화면 배치(문구 + 검정 버튼). 세션은 세우지 않는다.',
    basis: ['plan P4b 완료 기준 L 정지 계정', 'patterns §24 P4b USER_403_1'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fevents');
    await step('정지 계정을 고르면 안내와 [다시 로그인]이 보인다', async () => {
      await chooseKakao(page, '정지 계정');
      await expect(
        page.getByRole('alert').filter({ hasText: '이용이 제한된 계정이에요.' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: '다시 로그인' })).toHaveAttribute(
        'href',
        '/login?redirect=%2Fevents',
      );
      expect(await readSessionFlag(page)).toBeNull();
    });
  },
);

scenario(
  'LOGIN-8',
  '코드 교환이 실패하면 일반 실패 안내와 [다시 로그인]이 보인다',
  {
    kind: '에러',
    summary: '3번 코드 교환 5xx → 일반 실패(failed). [다시 로그인]으로 로그인 화면에 돌아간다.',
    basis: ['patterns §24 P4b', 'tech-decisions §4 P4b-L 구현 기록 실패 판정'],
    mocks: [
      http.get('*/api/v1/auth/oauth/kakao', () =>
        HttpResponse.json(envelope.error(500, 'GLOBAL_500_1'), { status: 500 }),
      ),
    ],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fevents');
    await step('기존 사용자를 골라도 교환이 실패하면 일반 실패 안내가 보인다', async () => {
      await chooseKakao(page, '기존 사용자로 로그인');
      await expect(
        page.getByRole('alert').filter({ hasText: '로그인하지 못했어요. 다시 시도해 주세요.' }),
      ).toBeVisible();
    });
    await step('[다시 로그인]을 누르면 로그인 화면으로 간다', async () => {
      await page.getByRole('link', { name: '다시 로그인' }).click();
      await expect(page).toHaveURL(/\/login\?redirect=%2Fevents$/);
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeVisible();
    });
  },
);

scenario(
  'LOGIN-9',
  'state 불일치(AUTH_400_1)면 안내 없이 로그인 화면으로 돌아가 처음부터 시작한다',
  {
    kind: '에러',
    summary:
      '코드 교환 400 AUTH_400_1 → restarting(대기 표시) → 로그인 화면으로 replace, 돌아올 곳 유지.',
    basis: ['plan P4b 완료 기준 L AUTH_400_1', 'patterns §24 P4b AUTH_400_1'],
  },
  async ({ page, step }) => {
    await setMockSession(page, 'anonymous');
    await page.goto('/login?redirect=%2Fevents');
    await step('state 불일치를 고르면 로그인 화면(redirect 유지)으로 돌아온다', async () => {
      await chooseKakao(page, 'state 불일치');
      await expect(page).toHaveURL(/\/login\?redirect=%2Fevents$/);
      await expect(page.getByRole('button', KAKAO_BUTTON)).toBeEnabled();
    });
  },
);

scenario.manual('LOGIN-10', '실제 카카오 로그인 왕복 화면(대기 표시 포함)이 자연스럽다', {
  kind: '정상',
  basis: ['plan P4b 완료 기준 L D2 스테이징', 'deploy-plan D2'],
  how: 'D2 스테이징 배포 뒤 실제 카카오 계정으로 로그인 → 콜백 대기 표시("로그인하는 중")가 잠깐 보이고 원래 화면으로 돌아오는지, 신규 계정이면 가입 오버레이가 뜨는지 본다(실기기 모바일 포함).',
});
