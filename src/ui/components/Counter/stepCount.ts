/** 수량 스테퍼의 순수 계산. min/max 밖의 값은 가장자리로 붙인다 */
export function clampCount(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** 현재 값에서 버튼을 누를 수 있는지 */
export function counterBounds(value: number, min: number, max: number, step: number) {
  return { canDecrease: value - step >= min, canIncrease: value + step <= max };
}
