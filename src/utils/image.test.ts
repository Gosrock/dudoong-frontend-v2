import { describe, expect, it } from 'vitest';

import { isOptimizableImage } from './image';

describe('isOptimizableImage', () => {
  it('업로드 출처(asset.dudoong.com)만 최적화한다', () => {
    expect(isOptimizableImage('https://asset.dudoong.com/production/event/1818/eb91fbe4.png')).toBe(
      true,
    );
    expect(isOptimizableImage('https://asset.dudoong.com/staging/event/1/a.png')).toBe(true);
  });

  it('그 밖은 원본 그대로 — 가짜 백엔드 · 다른 호스트 · http · blob · 깨진 값', () => {
    expect(isOptimizableImage('https://image.mock.dudoong.test/event/101/poster.jpeg')).toBe(false);
    expect(isOptimizableImage('http://k.kakaocdn.net/dn/mock/new.jpg')).toBe(false);
    expect(isOptimizableImage('http://asset.dudoong.com/production/a.png')).toBe(false);
    expect(isOptimizableImage('https://asset.dudoong.com.evil.test/a.png')).toBe(false);
    expect(isOptimizableImage('blob:https://dudoong.com/1234')).toBe(false);
    expect(isOptimizableImage('not a url')).toBe(false);
  });
});
