'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { banksQuery } from '@/api/bank/queries';

import { filterBanks } from './bank-select';

/**
 * 은행 고르기(티켓 입금 계좌, plan P12). 목록은 공개 `GET /api/v2/banks`(브라우저에서, 1시간 신선). 자유 입력은 없다 —
 * 고른 코드만 계좌 `bankCode`로 보낸다(토스 송금 링크에 쓸 수 있는 값, #804). V에서 Combobox로 그린다.
 *
 * `value`는 폼의 `bankCode`, `onSelect`는 폼 setter. 목록에 없는 코드는 고를 수 없다
 */
export function useBankSelect(value: string, onSelect: (code: string) => void) {
  const query = useQuery(banksQuery());
  const [keyword, setKeyword] = useState('');
  const banks = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => filterBanks(banks, keyword), [banks, keyword]);
  return {
    status: query.status,
    retry: () => void query.refetch(),
    /** 은행 목록(코드 순) */
    banks,
    /** 검색어와 거른 목록 */
    keyword,
    setKeyword,
    filtered,
    /** 고른 은행(목록에 없으면 null — 옛 자유 입력 은행명은 다시 고르게 한다) */
    selected: banks.find((b) => b.code === value) ?? null,
    select: (code: string) => {
      if (!banks.some((b) => b.code === code)) return;
      setKeyword('');
      onSelect(code);
    },
    /** 칸 검사용 — 받은 목록의 코드 */
    codes: query.data?.map((b) => b.code),
  };
}
