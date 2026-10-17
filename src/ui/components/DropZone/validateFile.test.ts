import { describe, expect, it } from 'vitest';

import { validateFile } from './validateFile';

const png = { name: 'poster.PNG', type: 'image/png', size: 1000 };

describe('validateFile', () => {
  it('조건이 없으면 통과', () => expect(validateFile(png, {})).toBeNull());
  it('MIME 목록', () => {
    expect(validateFile(png, { accept: 'image/jpeg, image/png' })).toBeNull();
    expect(validateFile(png, { accept: 'image/jpeg' })).toBe('type');
  });
  it('와일드카드', () => {
    expect(validateFile(png, { accept: 'image/*' })).toBeNull();
    expect(validateFile({ ...png, type: 'application/pdf' }, { accept: 'image/*' })).toBe('type');
  });
  it('확장자(대소문자 무시)', () => expect(validateFile(png, { accept: '.png' })).toBeNull());
  it('크기 초과', () => {
    expect(validateFile(png, { maxSize: 1000 })).toBeNull();
    expect(validateFile(png, { maxSize: 999 })).toBe('size');
  });
  it('형식을 먼저 본다', () =>
    expect(validateFile(png, { accept: 'image/jpeg', maxSize: 1 })).toBe('type'));
});
