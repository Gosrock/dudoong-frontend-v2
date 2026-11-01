import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authHandlers, refreshed } from '@/api/__mocks__/auth.handlers';
import { kakaoProfiles } from '@/api/__mocks__/fixtures/kakao';
import { errors, EXPIRED_ACCESS_TOKEN, fail, FORGED_ACCESS_TOKEN } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { readSessionFlag, resetSessionFlagStateForTest, startSession } from '@/api/session-flag';
import { renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { browserLocation } from '../browser-location';
import { KakaoCallbackView } from '../KakaoCallbackView';
import { readLoginRedirect, saveLoginRedirect } from './login-redirect';
import { resetKakaoCallbackForTest, useKakaoCallback } from './useKakaoCallback';

const search = { value: new URLSearchParams() };
vi.mock('next/navigation', () => ({ useSearchParams: () => search.value }));

let replace: ReturnType<typeof vi.spyOn>;
let assign: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetSessionFlagStateForTest();
  resetKakaoCallbackForTest();
  window.history.replaceState(null, '', '/kakao/callback');
  replace = vi.spyOn(browserLocation, 'replace').mockImplementation(() => {});
  assign = vi.spyOn(browserLocation, 'assign').mockImplementation(() => {});
  // Given: 보호 화면(/gate-check)에서 로그인으로 왔다
  saveLoginRedirect('/gate-check');
});
afterEach(() => {
  vi.restoreAllMocks();
});

const callback = (query: string) => renderHook(() => useKakaoCallback(query));

/** 가입 폼 단계까지 진행하고 폼을 읽는 함수를 돌려준다 */
async function untilRegister(query: string) {
  const view = callback(query);
  await waitFor(() => expect(view.result.current.status).toBe('register'));
  return () => {
    const state = view.result.current;
    if (state.status !== 'register') throw new Error(`not register: ${state.status}`);
    return state.form;
  };
}

describe('카카오 콜백 — 기존 사용자', () => {
  it('코드 교환(state 전달) → 신규 판정 → 로그인 순서로 보내고, 세션 표시를 새로 세워 원래 화면으로 replace', async () => {
    const sent = recordRequests();
    const { result } = callback('code=mock-existing&state=s1');
    expect(result.current.status).toBe('pending');

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/gate-check'));

    expect(await sent.list()).toEqual([
      {
        method: 'GET',
        path: '/api/v1/auth/oauth/kakao',
        query: { code: 'mock-existing', state: 's1' },
        body: undefined,
        credentials: 'include',
      },
      {
        method: 'POST',
        path: '/api/v1/auth/oauth/kakao/register/valid',
        query: {},
        body: { idToken: 'kakao-id-existing' },
        credentials: 'include',
      },
      {
        method: 'POST',
        path: '/api/v1/auth/oauth/kakao/login',
        query: {},
        body: { idToken: 'kakao-id-existing' },
        credentials: 'include',
      },
    ]);
    expect(result.current.status).toBe('redirecting');
    expect(readSessionFlag()).not.toBeNull();
    expect(readLoginRedirect()).toBe('/');
    expect(assign).not.toHaveBeenCalled();
  });

  it('state가 없는 콜백도 진행한다(쿼리에 state를 싣지 않는다)', async () => {
    const sent = recordRequests();
    callback('code=mock-existing');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/gate-check'));
    expect((await sent.list())[0]?.query).toEqual({ code: 'mock-existing' });
  });

  it('다른 사람으로 로그인해 있던 브라우저면 세션 표시가 다른 값으로 바뀐다(다른 탭이 계정 전환을 안다)', async () => {
    const before = startSession();
    callback('code=mock-existing&state=s1');
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(readSessionFlag()).not.toBe(before);
  });

  it('돌아올 곳이 없으면 / 로 간다', async () => {
    sessionStorage.clear();
    callback('code=mock-existing&state=s1');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('개발 모드 StrictMode에서 effect가 두 번 돌아도 코드는 한 번만 교환한다', async () => {
    const sent = recordRequests();
    renderHook(() => useKakaoCallback('code=mock-existing&state=s1'), { wrapper: StrictMode });
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(await sent.lines()).toEqual([
      'GET /api/v1/auth/oauth/kakao',
      'POST /api/v1/auth/oauth/kakao/register/valid',
      'POST /api/v1/auth/oauth/kakao/login',
    ]);
  });
});

describe('카카오 콜백 — 신규 사용자(회원가입)', () => {
  it('신규 판정이면 카카오 프로필을 받아 가입 폼을 채운다(로그인·이동은 아직 없다)', async () => {
    const sent = recordRequests();
    const { result } = callback('code=mock-new&state=s1');
    await waitFor(() => expect(result.current.status).toBe('register'));

    expect(await sent.list()).toMatchObject([
      { method: 'GET', path: '/api/v1/auth/oauth/kakao' },
      {
        method: 'POST',
        path: '/api/v1/auth/oauth/kakao/register/valid',
        body: { idToken: 'kakao-id-new' },
      },
      {
        method: 'POST',
        path: '/api/v1/auth/oauth/kakao/info',
        body: { accessToken: 'kakao-access-new' },
      },
    ]);
    if (result.current.status !== 'register') throw new Error('unreachable');
    const { form } = result.current;
    expect(form.values).toEqual({
      name: kakaoProfiles.new.name,
      email: kakaoProfiles.new.email,
      // 카카오 값(+82 10-…)을 010-XXXX-XXXX로 바꿔 채운다(사용자 결정 2026-10-31)
      phoneNumber: '010-9876-5432',
    });
    expect(form.consents).toEqual({
      ageOver14: false,
      terms: false,
      privacy: false,
      marketing: false,
    });
    // 만 14세 칸(2026-11-01 붙임) — 그리고 필수
    expect(form.consentFields).toEqual({ ageOver14: true });
    expect(form.canSubmit).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(readSessionFlag()).toBeNull();
  });

  it('필수 동의 뒤 제출하면 프로필·동의를 본문으로 보내고 로그인처럼 원래 화면으로 간다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');

    act(() => form().setConsent('terms', true));
    expect(form().canSubmit).toBe(false);
    act(() => form().setConsent('privacy', true));
    // 만 14세 칸이 필수(2026-11-01)
    expect(form().canSubmit).toBe(false);
    act(() => form().setConsent('ageOver14', true));
    expect(form().requiredAgreed).toBe(true);
    expect(form().allAgreed).toBe(false);
    expect(form().canSubmit).toBe(true);

    const sent = recordRequests();
    await act(() => form().submit());

    expect(await sent.list()).toEqual([
      {
        method: 'POST',
        path: '/api/v1/auth/oauth/kakao/register',
        query: {},
        body: {
          idToken: 'kakao-id-new',
          email: 'newbie@example.com',
          phoneNumber: '010-9876-5432',
          profileImage: 'http://k.kakaocdn.net/dn/mock/new.jpg',
          name: '새내기',
          marketingAgree: false,
          // 만 14세(#840) · 이용약관(#850) 체크 값
          ageOver14Confirmed: true,
          termsAgreed: true,
          agreementVersion: '2026-11',
        },
        credentials: 'include',
      },
    ]);
    expect(replace).toHaveBeenCalledWith('/gate-check');
    expect(readSessionFlag()).not.toBeNull();
    expect(form().submitting).toBe(true);
  });

  it('전체 동의는 마케팅까지 켜고 marketingAgree=true로 보낸다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    expect(form().allAgreed).toBe(true);
    const sent = recordRequests();
    await act(() => form().submit());
    expect((await sent.list())[0]?.body).toMatchObject({ marketingAgree: true });
  });

  it('전체 동의 → 동의 강제 백엔드도 통과(만 14세·이용약관 모두 실림)', async () => {
    server.use(...authHandlers.registerAgreementEnforced);
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    const sent = recordRequests();
    await act(() => form().submit());
    const [post] = await sent.list();
    expect(post?.body).toMatchObject({
      ageOver14Confirmed: true,
      termsAgreed: true,
      agreementVersion: '2026-11',
    });
    expect(form().error).toBeNull();
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('서버가 동의를 거절(Agreement_400_1)하면 동의를 모두 풀고 agreement 오류 — 이동하지 않고, 다시 체크하면 낼 수 있다', async () => {
    server.use(
      http.post('*/api/v1/auth/oauth/kakao/register', ({ request }) =>
        errors.agreementRequired(request),
      ),
    );
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    await act(() => form().submit());
    expect(form().error).toBe('agreement');
    expect(form().consents).toEqual({
      ageOver14: false,
      terms: false,
      privacy: false,
      marketing: false,
    });
    expect(form().canSubmit).toBe(false);
    expect(form().submitting).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    server.resetHandlers();
    act(() => form().setAllConsents(true));
    await act(() => form().submit());
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('전체 동의는 만 14세까지 켜고 끈다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    expect(form().consents.ageOver14).toBe(true);
    act(() => form().setAllConsents(false));
    expect(form().consents).toEqual({
      ageOver14: false,
      terms: false,
      privacy: false,
      marketing: false,
    });
  });

  it('만 14세를 체크하면 ageOver14Confirmed까지 실려 동의 강제 백엔드도 통과한다(#384)', async () => {
    server.use(...authHandlers.registerAgreementEnforced);
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => {
      form().setConsent('ageOver14', true);
      form().setConsent('terms', true);
      form().setConsent('privacy', true);
    });
    const sent = recordRequests();
    await act(() => form().submit());
    const [post] = await sent.list();
    expect(post?.body).toMatchObject({
      ageOver14Confirmed: true,
      termsAgreed: true,
      agreementVersion: '2026-11',
    });
    expect(form().error).toBeNull();
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('카카오 이메일이 없으면 칸 오류가 있고 제출할 수 없다. 적으면 제출된다', async () => {
    const form = await untilRegister('code=mock-noEmail&state=s1');
    act(() => form().setAllConsents(true));
    expect(form().errors).toEqual({ email: 'required' });
    expect(form().canSubmit).toBe(false);

    const sent = recordRequests();
    await act(() => form().submit());
    expect(await sent.list()).toEqual([]);

    act(() => form().setValue('email', 'typed@example.com'));
    expect(form().canSubmit).toBe(true);
    await act(() => form().submit());
    expect((await sent.list())[0]?.body).toMatchObject({
      email: 'typed@example.com',
      phoneNumber: null,
    });
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('전화번호는 입력하는 대로 하이픈이 들어가고, 모양이 틀리면 칸 오류로 제출할 수 없다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    act(() => form().setValue('phoneNumber', '0101234'));
    expect(form().values.phoneNumber).toBe('010-1234');
    expect(form().errors).toEqual({ phoneNumber: 'phoneFormat' });
    expect(form().canSubmit).toBe(false);
    act(() => form().setValue('phoneNumber', '010-1234-56789'));
    expect(form().values.phoneNumber).toBe('010-1234-5678');
    expect(form().canSubmit).toBe(true);
    act(() => form().setValue('phoneNumber', ''));
    expect(form().errors).toEqual({});
  });

  it('서버가 전화번호를 거절(400 USER_400_2, #896)하면 칸 오류 phoneInvalid — 번호를 고치기 전엔 다시 낼 수 없다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    // 모양은 맞지만 무효인 한국 번호 — 기본 mock이 서버처럼 거절한다
    act(() => form().setValue('phoneNumber', '010-0000-0000'));
    expect(form().canSubmit).toBe(true);
    const sent = recordRequests();
    await act(() => form().submit());
    expect(await sent.list()).toHaveLength(1);
    expect(form().errors).toEqual({ phoneNumber: 'phoneInvalid' });
    // 제출 실패가 아니라 칸 오류다(서버 문구를 쓰지 않는다)
    expect(form().error).toBeNull();
    expect(form().submitting).toBe(false);
    expect(form().canSubmit).toBe(false);
    await act(() => form().submit());
    expect(await sent.list()).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();

    // 번호를 고치면 칸 오류가 풀리고 가입된다
    act(() => form().setValue('phoneNumber', '010-9876-5432'));
    expect(form().errors).toEqual({});
    expect(form().canSubmit).toBe(true);
    await act(() => form().submit());
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('거절된 번호를 지우고 비워 내면(번호 없음) 가입된다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    server.use(
      http.post('*/api/v1/auth/oauth/kakao/register', ({ request }) =>
        fail(request, 400, 'USER_400_2', '유저의 휴대폰 전화번호가 올바르지않습니다.'),
      ),
    );
    await act(() => form().submit());
    expect(form().errors).toEqual({ phoneNumber: 'phoneInvalid' });
    server.resetHandlers();
    act(() => form().setValue('phoneNumber', ''));
    expect(form().canSubmit).toBe(true);
    const sent = recordRequests();
    await act(() => form().submit());
    expect((await sent.list())[0]?.body).toMatchObject({ phoneNumber: null });
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it('가입이 5xx면 일반 실패를 보이고 다시 낼 수 있다', async () => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    server.use(...authHandlers.kakaoRegisterServerError);
    await act(() => form().submit());
    expect(form().error).toBe('failed');
    expect(form().submitting).toBe(false);
    expect(form().canSubmit).toBe(true);
    expect(replace).not.toHaveBeenCalled();

    server.resetHandlers();
    await act(() => form().submit());
    expect(form().error).toBeNull();
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });

  it.each([
    ['BAD_REQUEST', '{"email":"비어 있을 수 없습니다"}'],
    // 백엔드 README가 적은 코드 — 지금은 나지 않지만 같은 분기를 탄다
    ['GLOBAL_400_1', '검증 오류'],
  ])('가입이 400 %s(검증 실패)면 invalid로 폼에 머문다', async (code, reason) => {
    const form = await untilRegister('code=mock-new&state=s1');
    act(() => form().setAllConsents(true));
    server.use(
      http.post('*/api/v1/auth/oauth/kakao/register', ({ request }) =>
        fail(request, 400, code, reason),
      ),
    );
    await act(() => form().submit());
    expect(form().error).toBe('invalid');
    expect(form().submitting).toBe(false);
    expect(form().canSubmit).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it('이미 가입한 사람(USER_400_1, 두 번 누름·다른 탭에서 먼저 가입)이면 같은 id 토큰으로 로그인한다', async () => {
    // 신규 판정 뒤 다른 탭에서 먼저 가입했다 — 가입은 USER_400_1, 로그인은 성공
    const form = await untilRegister('code=mock-new&state=s1');
    server.use(
      http.post('*/api/v1/auth/oauth/kakao/register', ({ request }) =>
        fail(request, 400, 'USER_400_1', '이미 회원가입한 유저입니다.'),
      ),
      http.post('*/api/v1/auth/oauth/kakao/login', () => refreshed()),
    );
    const sent = recordRequests();
    act(() => form().setAllConsents(true));
    await act(() => form().submit());
    expect(await sent.list()).toMatchObject([
      { path: '/api/v1/auth/oauth/kakao/register' },
      { path: '/api/v1/auth/oauth/kakao/login', body: { idToken: 'kakao-id-new' } },
    ]);
    expect(replace).toHaveBeenCalledWith('/gate-check');
  });
});

describe('카카오 콜백 — 실패(에러 코드별)', () => {
  it('정지 계정(로그인 403 USER_403_1) → "이용이 제한된 계정" 상태, 세션 없이 머문다', async () => {
    const { result } = callback('code=mock-suspended&state=s1');
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({
      status: 'error',
      failure: 'suspended',
      loginHref: '/login?redirect=%2Fgate-check',
    });
    expect(readSessionFlag()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('state 불일치(400 AUTH_400_1) → 돌아올 곳을 유지한 채 로그인 화면으로 replace(처음부터 다시)', async () => {
    server.use(...authHandlers.kakaoStateMismatch);
    const { result } = callback('code=mock-existing&state=tampered');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=%2Fgate-check'));
    expect(result.current.status).toBe('restarting');
    expect(readSessionFlag()).toBeNull();
  });

  it('기본 mock — state 쿠키와 다른 state를 보내면 같은 결과', async () => {
    // 쿠키 흉내: oauth_state=s1인데 콜백 state는 tampered
    server.use(
      http.get('*/api/v1/auth/oauth/kakao', ({ request }) =>
        new URL(request.url).searchParams.get('state') !== 's1'
          ? errors.stateMismatch(request)
          : undefined,
      ),
    );
    callback('code=mock-existing&state=tampered');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=%2Fgate-check'));
  });

  it.each([EXPIRED_ACCESS_TOKEN, FORGED_ACCESS_TOKEN])(
    '액세스 쿠키(%s)가 남아 있어도 코드 교환·로그인은 익명으로 통과해 원래 화면으로 간다(#792)',
    async (token) => {
      document.cookie = `accessToken=${token}; path=/`;
      try {
        callback('code=mock-existing&state=s1');
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/gate-check'));
      } finally {
        document.cookie = 'accessToken=; path=/; max-age=0';
      }
    },
  );

  it('혹시 로그인이 401이면 일반 실패(retryLater 분기는 #792로 없앴다)', async () => {
    server.use(
      http.post('*/api/v1/auth/oauth/kakao/login', ({ request }) => errors.expiredToken(request)),
    );
    const { result } = callback('code=mock-existing&state=s1');
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toMatchObject({ failure: 'failed' });
    expect(replace).not.toHaveBeenCalled();
  });

  it('카카오가 코드를 거절(KAKAO_KOE320 — 코드 재사용·만료) → 일반 실패, 다시 로그인 주소', async () => {
    const { result } = callback('code=unknown-code&state=s1');
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({
      status: 'error',
      failure: 'failed',
      loginHref: '/login?redirect=%2Fgate-check',
    });
  });

  it.each([
    ['카카오 동의 취소(error=access_denied)', 'error=access_denied&state=s1'],
    ['코드 없이 직접 들어옴', ''],
  ])('%s → 요청 없이 로그인 화면으로 replace', async (_, query) => {
    const sent = recordRequests();
    const { result } = callback(query);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=%2Fgate-check'));
    expect(result.current.status).toBe('restarting');
    expect(await sent.list()).toEqual([]);
  });
});

describe('콜백 화면 마크업(훅 상태를 그대로 보여 준다)', () => {
  it('정지 계정 안내와 다시 로그인 링크', async () => {
    search.value = new URLSearchParams('code=mock-suspended&state=s1');
    renderWithProviders(<KakaoCallbackView />);
    expect(screen.getByRole('heading', { name: '로그인하는 중' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('이용이 제한된 계정이에요.'),
    );
    expect(screen.getByRole('link', { name: '다시 로그인' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fgate-check',
    );
  });

  it('신규 사용자 가입 폼 — 필수 동의 전에는 제출 버튼이 막혀 있다', async () => {
    search.value = new URLSearchParams('code=mock-new&state=s1');
    const { user } = renderWithProviders(<KakaoCallbackView />);
    const submit = await screen.findByRole('button', { name: '동의하고 시작하기' });
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('새내기');
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: '전체 동의' }));
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/gate-check'));
  });
});
