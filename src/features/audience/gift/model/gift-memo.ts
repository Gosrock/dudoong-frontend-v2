import { GIFT_MEMO_MAX, type GiftMemoRequest } from '@/api/gift/schema';

/** 메모 칸 오류(앞뒤 공백 제외 50자 — 서버 `Gift_400_9`와 같은 기준). 통과하면 null */
export function giftMemoError(memo: string | null | undefined): string | null {
  return (memo ?? '').trim().length > GIFT_MEMO_MAX
    ? `메모는 ${GIFT_MEMO_MAX}자까지 쓸 수 있어요`
    : null;
}

/** PG-1 본문. 메모가 비면 `{}`(메모 없음) */
export function createGiftBody(memo: string | null | undefined): GiftMemoRequest {
  const trimmed = (memo ?? '').trim();
  return trimmed ? { memo: trimmed } : {};
}

/** PG-8 본문. 빈 문자열 = 메모 삭제 */
export const changeMemoBody = (memo: string | null | undefined): Required<GiftMemoRequest> => ({
  memo: (memo ?? '').trim(),
});
