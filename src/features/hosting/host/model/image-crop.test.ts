import { describe, expect, it } from 'vitest';

import {
  clampOffset,
  clampZoom,
  cropRectOf,
  guideSizeOf,
  outputNameOf,
  outputSizeOf,
  outputTypeOf,
} from './image-crop';

const box = 342;

describe('이미지 자르기 계산(GUI 1458:4961 · 1476:8399)', () => {
  it('가이드 — 프로필 원 290, 커버는 340 폭 · 2:1(GUI 1476:8505 340×170)', () => {
    expect(guideSizeOf('PROFILE', box)).toEqual({ width: 290, height: 290 });
    const cover = guideSizeOf('COVER', box);
    expect(cover.width).toBe(340);
    expect(cover.height).toBe(170);
  });

  it('확대는 1~3배로 묶는다', () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(5)).toBe(3);
    expect(clampZoom(1.7)).toBe(1.7);
  });

  it('확대 1 · 가운데면 가이드를 꼭 덮는 가운데 정사각을 자른다', () => {
    const image = { width: 1000, height: 500 };
    const guide = guideSizeOf('PROFILE', box);
    const rect = cropRectOf(image, guide, 1, { x: 0, y: 0 });
    expect(rect.sw).toBeCloseTo(500);
    expect(rect.sh).toBeCloseTo(500);
    expect(rect.sx).toBeCloseTo(250);
    expect(rect.sy).toBeCloseTo(0);
  });

  it('끌기는 가이드 밖으로 빈 곳이 생기지 않는 데까지만', () => {
    const image = { width: 1000, height: 500 };
    const guide = guideSizeOf('PROFILE', box);
    // 확대 1: 사진 높이 = 가이드 높이 → 위아래로는 못 움직이고, 좌우로는 (580 - 290) / 2 = 145
    expect(clampOffset(image, guide, 1, { x: 999, y: 999 })).toEqual({ x: 145, y: 0 });
    const rect = cropRectOf(image, guide, 1, { x: 999, y: 0 });
    // 사진을 오른쪽 끝까지 밀면 원본 왼쪽 끝부터 자른다
    expect(rect.sx).toBeCloseTo(0);
  });

  it('확대하면 더 좁은 영역을 자른다', () => {
    const image = { width: 1000, height: 1000 };
    const guide = guideSizeOf('PROFILE', box);
    const rect = cropRectOf(image, guide, 2, { x: 0, y: 0 });
    expect(rect.sw).toBeCloseTo(500);
    expect(rect.sx).toBeCloseTo(250);
  });

  it('결과 크기는 긴 변 상한(프로필 512 · 커버 1440)까지만 줄이고 늘리지 않는다', () => {
    expect(outputSizeOf('PROFILE', { sx: 0, sy: 0, sw: 2000, sh: 2000 })).toEqual({
      width: 512,
      height: 512,
    });
    expect(outputSizeOf('PROFILE', { sx: 0, sy: 0, sw: 300, sh: 300 })).toEqual({
      width: 300,
      height: 300,
    });
    expect(outputSizeOf('COVER', { sx: 0, sy: 0, sw: 3900, sh: 1950 })).toEqual({
      width: 1440,
      height: 720,
    });
  });

  it('형식 — PNG는 PNG, 그 밖은 JPEG · 이름 확장자를 맞춘다', () => {
    expect(outputTypeOf({ type: 'image/png', name: 'a.png' })).toBe('image/png');
    expect(outputTypeOf({ type: 'image/jpeg', name: 'a.jpg' })).toBe('image/jpeg');
    expect(outputTypeOf({ type: '', name: 'b.PNG' })).toBe('image/png');
    expect(outputNameOf({ name: 'photo.jpg' }, 'image/jpeg')).toBe('photo.jpeg');
    expect(outputNameOf({ name: 'logo.png' }, 'image/png')).toBe('logo.png');
  });
});
