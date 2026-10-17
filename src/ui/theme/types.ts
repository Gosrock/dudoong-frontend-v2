/**
 * `src/ui` 공개 API가 쓰는 타입. vanilla-extract 타입(Sprinkles, RecipeVariants)을 밖으로 내보내지 않으려고 따로 둔다(P1 완료 기준).
 */
export type SpaceKey = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 반응형 값. 그냥 값이면 모든 화면, 객체면 화면별(데스크탑 ≥ 1024px). */
export type Responsive<T> = T | { mobile?: T; desktop?: T };

export type FlexAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
export type FlexJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
