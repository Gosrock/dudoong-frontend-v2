import type { HostImageSlot } from './host-settings-form';

/**
 * 호스트 이미지 자르기(GUI `1458:4961` 프로필 · `1476:8399` 커버 "이미지 위치 조정", Design Sync #260) — 계산만(UI 무관).
 * 자르기 칸(정사각) 안에 가이드(프로필 원 · 커버 직사각)가 있고, 사진은 가이드를 늘 덮는다. 확대는 1~`CROP_ZOOM_MAX`배,
 * 끌면 가이드 밖으로 빈 곳이 생기지 않는 데까지만 움직인다. 결과는 가이드 안의 사진 영역(원본 픽셀)이다.
 */

/** 자르기 칸 폭 대비 가이드 크기(GUI 자르기 칸 342 — 프로필 원 290 · 커버 340) */
export const CROP_GUIDE = {
  PROFILE: { widthRatio: 290 / 342, aspect: 1 },
  // 커버 가이드 2:1(GUI `1476:8505` "커버 비율 가이드" 340×170 — Design Sync #278). 호스트 홈 모바일 커버도 2:1(#279)
  COVER: { widthRatio: 340 / 342, aspect: 2 },
} as const satisfies Record<HostImageSlot, { widthRatio: number; aspect: number }>;

export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 3;

/** 결과 이미지 긴 변 상한(px) — 🤖 프로필 512(홈 100 · 3배 여유), 커버 1440(PC 커버 폭 — `1495:8779`) */
export const CROP_OUTPUT_MAX = { PROFILE: 512, COVER: 1440 } as const satisfies Record<
  HostImageSlot,
  number
>;

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };

/** 자르기 칸 폭 → 가이드 크기(화면 px) */
export function guideSizeOf(slot: HostImageSlot, boxWidth: number): Size {
  const g = CROP_GUIDE[slot];
  const width = boxWidth * g.widthRatio;
  return { width, height: width / g.aspect };
}

export const clampZoom = (zoom: number) => Math.min(CROP_ZOOM_MAX, Math.max(CROP_ZOOM_MIN, zoom));

/** 화면 배율 — 확대 1이면 사진이 가이드를 꼭 덮는 크기 */
export function displayScaleOf(image: Size, guide: Size, zoom: number): number {
  return Math.max(guide.width / image.width, guide.height / image.height) * clampZoom(zoom);
}

/** 사진 가운데의 가이드 가운데로부터 거리 — 가이드 밖으로 빈 곳이 생기지 않게 자른다 */
export function clampOffset(image: Size, guide: Size, zoom: number, offset: Offset): Offset {
  const scale = displayScaleOf(image, guide, zoom);
  const maxX = Math.max(0, (image.width * scale - guide.width) / 2);
  const maxY = Math.max(0, (image.height * scale - guide.height) / 2);
  const clamp = (v: number, max: number) => Math.min(max, Math.max(-max, v)) || 0;
  return { x: clamp(offset.x, maxX), y: clamp(offset.y, maxY) };
}

export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/** 가이드 안에 보이는 원본 영역(원본 픽셀) */
export function cropRectOf(image: Size, guide: Size, zoom: number, offset: Offset): CropRect {
  const scale = displayScaleOf(image, guide, zoom);
  const o = clampOffset(image, guide, zoom, offset);
  const sw = guide.width / scale;
  const sh = guide.height / scale;
  return {
    sx: image.width / 2 - o.x / scale - sw / 2,
    sy: image.height / 2 - o.y / scale - sh / 2,
    sw,
    sh,
  };
}

/** 결과 크기 — 잘라낸 영역 그대로, 긴 변이 상한을 넘으면 줄인다(늘리지 않는다) */
export function outputSizeOf(slot: HostImageSlot, rect: CropRect): Size {
  const max = CROP_OUTPUT_MAX[slot];
  const ratio = Math.min(1, max / Math.max(rect.sw, rect.sh));
  return {
    width: Math.max(1, Math.round(rect.sw * ratio)),
    height: Math.max(1, Math.round(rect.sh * ratio)),
  };
}

/** 결과 형식 — PNG는 PNG(투명 유지), 그 밖은 JPEG. 서버는 JPEG · JPG · PNG만 받는다(api-contract §1 이미지 업로드) */
export function outputTypeOf(file: Pick<File, 'type' | 'name'>): 'image/png' | 'image/jpeg' {
  return file.type === 'image/png' || /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg';
}

/** 결과 파일 이름 — 원래 이름의 확장자를 결과 형식에 맞춘다 */
export function outputNameOf(file: Pick<File, 'name'>, type: 'image/png' | 'image/jpeg'): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.${type === 'image/png' ? 'png' : 'jpeg'}`;
}
