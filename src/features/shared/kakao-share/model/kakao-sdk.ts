import { log } from '@/utils/log';

import type { KakaoFeedTemplate } from './feed-template';

/**
 * Kakao JS SDK를 처음 공유할 때 불러와 공유창을 연다(얇은 래퍼 — 실제 SDK 동작 확인은 V, 공유 디버거는 D2 뒤).
 * 실패(스크립트 차단·네트워크·초기화 오류)는 `'failed'`로 돌려준다. 부르는 쪽이 `copyText(url)` 폴백을 한다(patterns §14).
 *
 * 버전은 고정하고 SRI를 붙인다(2.8.3, 2026-09-03 배포). 올릴 때는 integrity도 같이 바꾼다.
 */
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
const SDK_INTEGRITY = 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy';

/** 이 앱이 쓰는 SDK 표면만 */
export type KakaoSdk = {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Share: { sendDefault: (template: KakaoFeedTemplate) => void };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let loading: Promise<KakaoSdk> | null = null;

/** SDK 스크립트를 한 번만 넣는다. 실패하면 다음 호출에서 다시 시도한다 */
export function loadKakaoSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  loading ??= new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () =>
      window.Kakao ? resolve(window.Kakao) : reject(new Error('Kakao SDK loaded without Kakao'));
    script.onerror = () => {
      script.remove();
      reject(new Error('Kakao SDK load failed'));
    };
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

export type KakaoShareResult = 'shared' | 'failed';

export async function shareKakaoFeed(template: KakaoFeedTemplate): Promise<KakaoShareResult> {
  try {
    const kakao = await loadKakaoSdk();
    if (!kakao.isInitialized()) {
      // 빌드 때 인라인된다(빌드가 next.config에서 값을 검증한다 — tech-decisions §12). 모듈 최상위에서 읽지 않는다
      const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!appKey) throw new Error('NEXT_PUBLIC_KAKAO_JS_KEY is empty');
      kakao.init(appKey);
    }
    kakao.Share.sendDefault(template);
    return 'shared';
  } catch (e) {
    log('warn', 'kakao_share.failed', { error: e instanceof Error ? e.message : 'unknown' });
    return 'failed';
  }
}

/** 테스트 전용 — 불러오는 중 상태를 비운다 */
export function resetKakaoSdkForTest() {
  loading = null;
}
