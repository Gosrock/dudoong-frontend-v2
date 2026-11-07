/**
 * 금액·개수 표시(patterns §9, directory-structure `utils/money.ts`). 화면마다 `toLocaleString('ko-KR')` + "원"을 직접 쓰지 않는다.
 * 숫자와 "원" 사이는 붙여 쓴다(`1,000원`) — 화면 대부분이 이렇다(코드 패턴 점검 A3, 2026-11-02). 체크아웃의 `1,000 원`은
 * Figma 근거 확인 전까지 그 화면이 따로 둔다.
 */

/** `1234` → `'1,234'` — 매수·건수처럼 단위를 화면이 붙이는 숫자 */
export const formatCount = (n: number) => n.toLocaleString('ko-KR');

/** `1000` → `'1,000원'`, `0` → `'0원'` */
export const formatWon = (amount: number) => `${formatCount(amount)}원`;

/** 가격 — 0원은 `'무료'`(티켓 가격·주문 총액) */
export const formatPrice = (amount: number) => (amount === 0 ? '무료' : formatWon(amount));

/** 추가금·증감 — `1000` → `'+1,000원'`, `-500` → `'-500원'`, `0` → `'+0원'` */
export const formatSignedWon = (amount: number) =>
  `${amount < 0 ? '-' : '+'}${formatWon(Math.abs(amount))}`;

/**
 * 금액 입력 칸 — 사람이 친 글자 → 숫자 글자만(`'1,0a00'` → `'1000'`). 폼 값·서버 본문은 이 숫자 글자 그대로 둔다.
 * 앞의 0은 지운다(`'0050'` → `'50'`, `'0'`은 `'0'`).
 */
export const parseAmountInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? '' : digits.replace(/^0+(?=\d)/, '');
};

/** 금액 입력 칸 표시 — 숫자 글자 → 천 단위 쉼표(`'10000'` → `'10,000'`, `''` → `''`). 큰 수도 글자로 다룬다 */
export const formatAmountInput = (digits: string) =>
  parseAmountInput(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
