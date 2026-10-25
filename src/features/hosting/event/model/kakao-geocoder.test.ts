import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { kakaoGeocoder, resetKakaoMapsForTest } from './kakao-geocoder';

/** 카카오맵 SDK(`window.kakao.maps`)의 이 앱이 쓰는 표면만 흉내 낸다 — 실제 SDK 동작은 V에서 확인 */
function fakeMaps(results: Record<string, { x: string; y: string }[]>) {
  return {
    load: (cb: () => void) => cb(),
    services: {
      Status: { OK: 'OK' },
      Geocoder: class {
        addressSearch(address: string, cb: (r: { x: string; y: string }[], s: string) => void) {
          const found = results[address];
          cb(found ?? [], found ? 'OK' : 'ZERO_RESULT');
        }
      },
    },
  };
}

beforeEach(() => resetKakaoMapsForTest());
afterEach(() => {
  delete window.kakao;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const s of document.head.querySelectorAll('script')) s.remove();
});

describe('카카오 Geocoder 어댑터', () => {
  it('첫 결과의 y → 위도, x → 경도', async () => {
    window.kakao = {
      maps: fakeMaps({ '서울 마포구 어울마당로 35': [{ x: '126.9219', y: '37.5509' }] }),
    };
    expect(await kakaoGeocoder('서울 마포구 어울마당로 35')).toEqual({
      latitude: 37.5509,
      longitude: 126.9219,
    });
  });

  it('결과가 없으면 null', async () => {
    window.kakao = { maps: fakeMaps({}) };
    expect(await kakaoGeocoder('없는 주소')).toBeNull();
  });

  it('SDK 스크립트를 불러오지 못하면 null(다른 주소를 고르게) — 다음 호출에서 다시 시도한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pending = kakaoGeocoder('주소');
    const script = document.head.querySelector('script')!;
    expect(script.src).toMatch(
      /^https:\/\/dapi\.kakao\.com\/v2\/maps\/sdk\.js\?appkey=.+&libraries=services&autoload=false$/,
    );
    script.dispatchEvent(new Event('error'));
    expect(await pending).toBeNull();
    void kakaoGeocoder('주소');
    expect(document.head.querySelectorAll('script')).toHaveLength(1);
  });
});
