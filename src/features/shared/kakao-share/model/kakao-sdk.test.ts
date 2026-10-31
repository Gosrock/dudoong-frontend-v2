import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { kakaoFeedTemplate } from './feed-template';
import { type KakaoSdk, resetKakaoSdkForTest, shareKakaoFeed } from './kakao-sdk';

const template = kakaoFeedTemplate({
  title: '공연',
  description: '설명',
  imageUrl: 'https://image.example/p.png',
  url: 'https://dudoong.com/events/1',
  buttonTitle: '공연 보기',
});

function fakeSdk(initialized = false) {
  let ready = initialized;
  const sdk = {
    isInitialized: vi.fn(() => ready),
    init: vi.fn(() => {
      ready = true;
    }),
    Share: { sendDefault: vi.fn() },
  } satisfies KakaoSdk;
  return sdk;
}

const sdkScripts = () =>
  [...document.head.querySelectorAll('script')].filter((s) => s.src.includes('kakao_js_sdk'));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-kakao-key');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete window.Kakao;
  for (const s of sdkScripts()) s.remove();
  resetKakaoSdkForTest();
  vi.restoreAllMocks();
});

describe('카카오 공유 SDK 래퍼', () => {
  it('SDK가 이미 있으면 앱 키로 한 번 초기화하고 피드 템플릿으로 공유창을 연다', async () => {
    const sdk = fakeSdk();
    window.Kakao = sdk;
    expect(await shareKakaoFeed(template)).toBe('shared');
    expect(await shareKakaoFeed(template)).toBe('shared');
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith('test-kakao-key');
    expect(sdk.Share.sendDefault).toHaveBeenCalledWith(template);
    expect(sdkScripts()).toHaveLength(0);
  });

  it('SDK가 없으면 고정 버전 스크립트를 SRI와 함께 한 번만 넣고, 불러온 뒤 공유한다', async () => {
    const first = shareKakaoFeed(template);
    const second = shareKakaoFeed(template);
    const [script] = sdkScripts();
    expect(sdkScripts()).toHaveLength(1);
    expect(script!.src).toBe('https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js');
    expect(script!.integrity).toMatch(/^sha384-/);
    expect(script!.crossOrigin).toBe('anonymous');

    const sdk = fakeSdk();
    window.Kakao = sdk;
    script!.dispatchEvent(new Event('load'));
    expect(await first).toBe('shared');
    expect(await second).toBe('shared');
    expect(sdk.Share.sendDefault).toHaveBeenCalledTimes(2);
  });

  it('스크립트를 못 불러오면 failed(부르는 쪽이 주소 복사로 폴백)이고, 다음에 다시 시도한다', async () => {
    const result = shareKakaoFeed(template);
    sdkScripts()[0]!.dispatchEvent(new Event('error'));
    expect(await result).toBe('failed');
    expect(sdkScripts()).toHaveLength(0);

    void shareKakaoFeed(template);
    expect(sdkScripts()).toHaveLength(1);
  });

  it('SDK 호출이 던지면(도메인 미등록 등) failed', async () => {
    const sdk = fakeSdk(true);
    sdk.Share.sendDefault.mockImplementation(() => {
      throw new Error('KakaoError: domain mismatch');
    });
    window.Kakao = sdk;
    expect(await shareKakaoFeed(template)).toBe('failed');
  });

  it('실패 로그에 SDK 오류 메시지(공유 주소 · 선물 토큰)를 남기지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sdk = fakeSdk(true);
    sdk.Share.sendDefault.mockImplementation(() => {
      throw new Error('Illegal argument for url: https://dudoong.com/gifts/SECRET-TOKEN');
    });
    window.Kakao = sdk;
    expect(await shareKakaoFeed(template)).toBe('failed');
    const lines = warn.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('kakao_share.failed'))).toBe(true);
    expect(lines.join('\n')).not.toContain('SECRET-TOKEN');
    warn.mockRestore();
  });
});
