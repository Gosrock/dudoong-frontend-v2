/**
 * Daum(카카오) 우편번호 서비스(plan P11 "장소" — 주소 검색 결과 → 카카오 Geocoder로 좌표). 키가 필요 없는 공개 스크립트다.
 * 화면은 `embed`로 오버레이 안에 띄운다(새 창 `open()`은 모바일 웹뷰에서 막힐 수 있다). 처음 쓸 때 한 번만 넣고, 실패하면 다음에 다시 시도한다.
 * e2e·QA는 이 스크립트 주소를 가짜로 바꾼다(`window.daum.Postcode`가 같은 모양이면 된다).
 */
export const DAUM_POSTCODE_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/** 우편번호 창이 넘기는 값 중 쓰는 것. 도로명 주소를 먼저, 없으면 지번 */
export type PostcodeResult = { address: string; roadAddress?: string; jibunAddress?: string };

type PostcodeCtor = new (options: {
  oncomplete: (data: PostcodeResult) => void;
  width?: string | number;
  height?: string | number;
}) => { embed: (element: HTMLElement, options?: { autoClose?: boolean }) => void };

declare global {
  interface Window {
    daum?: { Postcode?: PostcodeCtor };
  }
}

let loading: Promise<PostcodeCtor> | null = null;

export function loadDaumPostcode(): Promise<PostcodeCtor> {
  if (window.daum?.Postcode) return Promise.resolve(window.daum.Postcode);
  loading ??= new Promise<PostcodeCtor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = DAUM_POSTCODE_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = window.daum?.Postcode;
      if (ctor) resolve(ctor);
      else reject(new Error('Daum Postcode loaded without daum.Postcode'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Daum Postcode load failed'));
    };
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** 고른 결과 → 저장할 주소 한 줄(도로명 우선) */
export const addressOf = (r: PostcodeResult) => r.roadAddress || r.address || r.jibunAddress || '';
