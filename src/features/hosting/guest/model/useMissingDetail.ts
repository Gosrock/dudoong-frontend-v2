'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { getErrorCode } from '@/api/errors';

/**
 * 운영 표 상세(주문 GR-2 · 발급 티켓 GI-2)가 404(`code`)일 때 — 닫고 알리기를 한 방식으로(코드 패턴 점검 A32).
 * 404가 시작될 때마다 한 번:
 * - `onNotFound` — **렌더 중**에 부른다(이전 값 비교 — 이펙트를 쓰지 않는 상태 갱신: 안내 문구, 이 훅 안의 선택 지우기)
 * - `afterNotFound` — 이펙트에서 부른다(목록 다시 읽기 · 부모의 닫기처럼 바깥에 닿는 일)
 *
 * 돌려주는 값은 지금 404인지(`status: 'missing'` 등).
 */
export function useMissingDetail({
  id,
  error,
  code,
  onNotFound,
  afterNotFound,
}: {
  /** 열린 상세의 id(닫혔으면 `null`) */
  id: string | null;
  /** 상세 조회의 에러 */
  error: unknown;
  /** 없음을 뜻하는 서버 코드(`Order_404_1` · `IssuedTicket_404_1`) */
  code: string;
  onNotFound: () => void;
  afterNotFound: () => void;
}) {
  const notFound = id !== null && getErrorCode(error) === code;
  // 지금 처리한 404(같은 상세가 다시 404여도 닫혔다 열린 것이면 새로 처리한다)와 처리 횟수(이펙트 트리거)
  const [handled, setHandled] = useState<{ id: string | null; count: number }>({
    id: null,
    count: 0,
  });
  if (notFound && handled.id !== id) {
    setHandled({ id, count: handled.count + 1 });
    onNotFound();
  } else if (!notFound && handled.id !== null) {
    setHandled({ id: null, count: handled.count });
  }

  const after = useEffectEvent(afterNotFound);
  useEffect(() => {
    if (handled.count > 0) after();
  }, [handled.count]);

  return notFound;
}
