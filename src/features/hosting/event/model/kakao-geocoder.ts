import { log } from '@/utils/log';

import type { Coordinates, Geocoder } from './place';

/**
 * 카카오맵 JS SDK의 주소 → 좌표 변환(`kakao.maps.services.Geocoder.addressSearch`)을 `Geocoder` 어댑터로 감싼다(plan P11 "장소").
 * 지도 미리보기(V)도 같은 SDK(`kakao.maps.Map`)라 의존성이 늘지 않는다. 앱 키는 공유 SDK와 같은 `NEXT_PUBLIC_KAKAO_JS_KEY`
 * (도메인이 카카오 앱 설정에 있어야 한다 — 실제 동작 확인은 V). 공유 SDK(`window.Kakao`)와는 다른 스크립트·전역(`window.kakao`)이다.
 *
 * 스크립트는 처음 변환할 때 한 번만 넣는다(`autoload=false` → `kakao.maps.load`). 실패하면 다음 호출에서 다시 시도한다.
 */
const SDK_ORIGIN = 'https://dapi.kakao.com/v2/maps/sdk.js';

type AddressResult = { x: string; y: string };
type KakaoMaps = {
  load: (callback: () => void) => void;
  services: {
    Status: { OK: string };
    Geocoder: new () => {
      addressSearch: (
        address: string,
        callback: (result: AddressResult[], status: string) => void,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let loading: Promise<KakaoMaps> | null = null;

function loadKakaoMaps(): Promise<KakaoMaps> {
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao.maps);
  loading ??= new Promise<KakaoMaps>((resolve, reject) => {
    // 빌드 때 인라인된다(tech-decisions §12). 모듈 최상위에서 읽지 않는다
    const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!appKey) {
      reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY is empty'));
      return;
    }
    const script = document.createElement('script');
    script.src = `${SDK_ORIGIN}?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error('Kakao Maps SDK loaded without kakao.maps'));
        return;
      }
      maps.load(() => resolve(maps));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Kakao Maps SDK load failed'));
    };
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** 기본 `Geocoder` — 첫 결과의 좌표(`y` 위도, `x` 경도). 결과 없음·SDK 실패는 `null`(호출부가 "다른 주소를 골라 주세요") */
export const kakaoGeocoder: Geocoder = async (address) => {
  try {
    const maps = await loadKakaoMaps();
    return await new Promise<Coordinates | null>((resolve) => {
      new maps.services.Geocoder().addressSearch(address, (result, status) => {
        const first = result[0];
        if (status !== maps.services.Status.OK || !first) {
          resolve(null);
          return;
        }
        const latitude = Number(first.y);
        const longitude = Number(first.x);
        resolve(
          Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
        );
      });
    });
  } catch (e) {
    log('warn', 'kakao_geocoder.failed', { error: e instanceof Error ? e.message : 'unknown' });
    return null;
  }
};

/** 테스트 전용 — 불러오는 중 상태를 비운다 */
export function resetKakaoMapsForTest() {
  loading = null;
}
