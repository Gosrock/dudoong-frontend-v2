/**
 * 공연 리스트(`/events`) 필터 ↔ 주소 쿼리(patterns §13). 적용된 필터는 주소에만 둔다 —
 * `?keyword=&tagIds=1,2&includePast=true`. 새로고침·뒤로가기·공유한 주소에서 같은 목록이 나온다.
 */

/** 검색어 상한(api-contract §4 — 51자는 400). 입력에서 막는다 */
export const KEYWORD_MAX_LENGTH = 50;
/** GP-2 `tagIds` 상한(api-contract §4) */
export const TAG_IDS_MAX = 50;
/** 검색어 입력 뒤 주소에 반영하기까지 기다리는 시간 */
export const KEYWORD_DEBOUNCE_MS = 300;

export type EventListFilter = {
  /** 앞뒤 공백 없는 검색어. 없으면 '' */
  keyword: string;
  /** 정렬·중복 제거된 태그 id */
  tagIds: number[];
  includePast: boolean;
};

export const EMPTY_FILTER: EventListFilter = { keyword: '', tagIds: [], includePast: false };

/** 입력값을 서버 상한에 맞춘다(Java `String.length`와 같은 UTF-16 길이) */
export const clampKeyword = (value: string) => value.slice(0, KEYWORD_MAX_LENGTH);

/** 정렬·중복 제거 — 순서만 다른 필터가 다른 캐시를 만들지 않게 */
export const normalizeTagIds = (ids: readonly number[]) =>
  [...new Set(ids)].sort((a, b) => a - b).slice(0, TAG_IDS_MAX);

type SearchParamsLike = { get(name: string): string | null };

/** 주소 쿼리 → 필터. 틀린 값(숫자 아닌 태그, 0 이하, 50자 넘는 검색어)은 버리거나 자른다 — 서버에 400을 보내지 않게 */
export function parseEventListFilter(params: SearchParamsLike): EventListFilter {
  const keyword = clampKeyword(params.get('keyword')?.trim() ?? '').trim();
  const tagIds = normalizeTagIds(
    (params.get('tagIds') ?? '')
      .split(',')
      .filter((v) => /^\d{1,16}$/.test(v.trim()))
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isSafeInteger(n) && n > 0),
  );
  return { keyword, tagIds, includePast: params.get('includePast') === 'true' };
}

/**
 * 필터 → 주소 쿼리 문자열(`?…` 또는 ''). 기본값은 쓰지 않는다. 필터와 무관한 쿼리(유입 표시 등)는 `base`에서 그대로 남긴다.
 */
export function eventListSearch(filter: EventListFilter, base?: string): string {
  const params = new URLSearchParams(base);
  params.delete('keyword');
  params.delete('tagIds');
  params.delete('includePast');
  const keyword = filter.keyword.trim();
  if (keyword) params.set('keyword', keyword);
  const tagIds = normalizeTagIds(filter.tagIds);
  if (tagIds.length) params.set('tagIds', tagIds.join(','));
  if (filter.includePast) params.set('includePast', 'true');
  // `1,2`의 쉼표를 %2C로 바꾸지 않는다(읽기 쉬운 공유 주소)
  const qs = params.toString().replace(/%2C/g, ',');
  return qs ? `?${qs}` : '';
}

/** 칩 하나를 켜고 끈다 */
export function toggleTagId(tagIds: readonly number[], tagId: number): number[] {
  return tagIds.includes(tagId)
    ? tagIds.filter((id) => id !== tagId)
    : normalizeTagIds([...tagIds, tagId]);
}

export const sameFilter = (a: EventListFilter, b: EventListFilter) =>
  a.keyword === b.keyword &&
  a.includePast === b.includePast &&
  a.tagIds.length === b.tagIds.length &&
  a.tagIds.every((id, i) => id === b.tagIds[i]);
