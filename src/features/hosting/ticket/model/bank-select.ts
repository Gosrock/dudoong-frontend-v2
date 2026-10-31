import type { Bank } from '@/api/bank/schema';

/**
 * 은행 고르기(티켓 입금 계좌, plan P12 — 목록 선택만, 자유 입력 없음). 목록은 서버 `GET /api/v2/banks`(25개, 코드 순).
 * V에서 Combobox로 그린다 — L은 검색어로 거르는 규칙만 둔다.
 */

/** 비교용 — 공백·가운뎃점 제거, 소문자 */
const key = (s: string) => s.replace(/[\s·.]/g, '').toLowerCase();

/** 이름에 검색어가 들어 있거나(공백·가운뎃점 무시, 대소문자 무시) 코드가 검색어로 시작하는 은행. 빈 검색어면 전부 */
export function filterBanks(banks: readonly Bank[], query: string): Bank[] {
  const q = key(query);
  if (!q) return [...banks];
  return banks.filter((b) => key(b.name).includes(q) || b.code.startsWith(q));
}
