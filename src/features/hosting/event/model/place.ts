import type { EventPlaceRequest } from '@/api/event/schema';
import { EVENT_PLACE_TEXT_MAX } from '@/api/event/schema';
import type { Place } from '@/api/shared/common-schema';

/**
 * 공연 장소 칸(plan P11 "장소", patterns §23). 주소 검색(Daum 우편번호) 결과 주소 → 카카오 Geocoder로 `latitude`·`longitude` →
 * 공연장 이름 · 상세주소. 서버는 `{name, address, latitude, longitude}`가 모두 있어야 받고(상세주소는 선택),
 * 체크리스트 ①도 이 4필드가 다 있어야 찬다(`EventPlace.isUpdated`, 432cce4). 좌표를 못 얻으면 저장하지 않고 다른 주소를 고르게 한다.
 *
 * 우편번호 창·Geocoder는 브라우저 SDK라 L은 **주소 문자열을 받는 함수**와 **좌표를 돌려주는 어댑터**(`Geocoder`)로만 다룬다 —
 * 테스트는 가짜 어댑터로 돈다. 실제 어댑터는 `kakao-geocoder.ts`.
 */

export type Coordinates = { latitude: number; longitude: number };

/**
 * 주소 → 좌표. 찾지 못하면 `null`. 지도 SDK를 쓸 수 없으면(키·도메인·네트워크) `GeocoderUnavailableError`를 던진다 —
 * 호출부는 "주소 좌표 없음"과 "지도 서비스 오류"를 다른 문구로 안내한다(#92-1). 그 밖의 예외도 서비스 오류로 본다
 */
export type Geocoder = (address: string) => Promise<Coordinates | null>;

/** 지도 SDK를 불러오지 못했다(키 도메인 미등록 401·네트워크·키 없음) — 주소 탓이 아니다 */
export class GeocoderUnavailableError extends Error {
  constructor(message = 'Kakao Maps SDK unavailable') {
    super(message);
    this.name = 'GeocoderUnavailableError';
  }
}

/** 좌표 찾기 실패의 종류 — 문구가 다르다 */
export type PlaceLookupFailure = 'notFound' | 'unavailable';

export type PlaceInput = {
  /** 우편번호 창에서 고른 주소(도로명 우선). 직접 입력하지 않는다 */
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** 공연장 이름 */
  name: string;
  /** 상세주소(선택) */
  detailAddress: string;
};

export const emptyPlace = (): PlaceInput => ({
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  detailAddress: '',
});

/** 서버 장소(GE-3) → 칸 값. 미입력(`null`)이면 빈 칸 */
export function placeInputOf(place: Place | null): PlaceInput {
  if (!place) return emptyPlace();
  return {
    address: place.address ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name ?? '',
    detailAddress: place.detailAddress ?? '',
  };
}

/** 칸을 하나도 채우지 않았는지 — 비어 있으면 장소를 보내지 않는다(서버는 장소를 비우는 수정을 받지 않는다) */
export const isPlaceEmpty = (p: PlaceInput) =>
  !p.address.trim() && !p.name.trim() && !p.detailAddress.trim();

/** 4필드(이름·주소·위도·경도)가 모두 있는지 — 체크리스트 ① 조건 */
export const isPlaceComplete = (p: PlaceInput) =>
  !!p.address.trim() && !!p.name.trim() && p.latitude !== null && p.longitude !== null;

export const PLACE_ERROR = {
  address: '주소를 검색해 골라 주세요',
  geocode: '이 주소의 위치를 찾지 못했어요. 다른 주소를 골라 주세요',
  /**
   * 지도 SDK 실패(#92-1). 서버가 좌표를 필수로 받아(`V2EventPlaceRequest` latitude·longitude) 좌표 없이 저장할 수 없다 —
   * 주소를 잘못 고른 것처럼 읽히지 않게 서비스 쪽 문제임을 말한다
   */
  mapUnavailable:
    '지도 서비스를 불러오지 못해 위치를 확인할 수 없어요. 잠시 뒤 주소를 다시 골라 주세요',
  name: '공연장 이름을 입력해 주세요',
  nameTooLong: `공연장 이름은 ${EVENT_PLACE_TEXT_MAX}자까지 입력할 수 있어요`,
  detailTooLong: `상세주소는 ${EVENT_PLACE_TEXT_MAX}자까지 입력할 수 있어요`,
} as const;

/** 장소 칸 오류. 아무것도 채우지 않았으면 오류 없음(선택 저장 — 체크리스트 ①만 비어 있다) */
export function placeError(p: PlaceInput): string | null {
  if (isPlaceEmpty(p)) return null;
  if (!p.address.trim()) return PLACE_ERROR.address;
  if (p.latitude === null || p.longitude === null) return PLACE_ERROR.geocode;
  if (!p.name.trim()) return PLACE_ERROR.name;
  if (p.name.trim().length > EVENT_PLACE_TEXT_MAX) return PLACE_ERROR.nameTooLong;
  if (p.detailAddress.trim().length > EVENT_PLACE_TEXT_MAX) return PLACE_ERROR.detailTooLong;
  return null;
}

/**
 * 보내는 장소(PE-4 `place`). 통째로 교체되므로 **상세주소를 늘 함께** 보낸다 — 빼면 서버가 지운다(plan P11, patterns §23).
 * 빈 상세주소는 `null`. 4필드가 없으면 던진다(칸 오류를 먼저 본다)
 */
export function toPlaceRequest(p: PlaceInput): EventPlaceRequest {
  if (!isPlaceComplete(p)) throw new Error('장소 4필드가 없다 — 칸 오류를 먼저 본다');
  return {
    name: p.name.trim(),
    address: p.address.trim(),
    latitude: p.latitude!,
    longitude: p.longitude!,
    detailAddress: p.detailAddress.trim() || null,
  };
}

export const isSamePlace = (a: PlaceInput, b: PlaceInput) =>
  a.address === b.address &&
  a.latitude === b.latitude &&
  a.longitude === b.longitude &&
  a.name === b.name &&
  a.detailAddress === b.detailAddress;
