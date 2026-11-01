'use client';

import { debounce } from 'es-toolkit';
import { useEffect, useMemo, useState } from 'react';

/**
 * 값이 `ms` 동안 바뀌지 않으면 따라가는 값 — 검색어 입력 → 조회 키(patterns §9, 코드 패턴 점검 A8).
 * debounce는 직접 짜지 않고 `es-toolkit`을 쓴다. 이 훅은 그것을 React 값에 붙이기만 한다. 언마운트·`ms` 변경 때 대기 중인 갱신을 버린다.
 *
 * ```ts
 * const keyword = useDebouncedValue(keywordInput.trim(), KEYWORD_DEBOUNCE_MS);
 * useInfiniteQuery(eventListQuery({ keyword }));
 * ```
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const update = useMemo(() => debounce((next: T) => setDebounced(() => next), ms), [ms]);

  useEffect(() => {
    update(value);
  }, [update, value]);

  useEffect(() => () => update.cancel(), [update]);

  return debounced;
}
