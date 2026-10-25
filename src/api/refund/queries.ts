import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { BanksSchema } from './schema';

/** 은행 목록은 서버 enum이라 배포 사이에 바뀌지 않는다 */
const BANKS_STALE_MS = 60 * 60_000;

/**
 * 은행 목록(공개 GET, 쿠키 없이). 환불 계좌 폼이 열릴 때 브라우저에서 읽는다(프리페치 없음).
 * Swagger summary는 "(로그인)"이지만 실제는 공개다(#813, api-contract §5).
 */
export const banksQuery = () =>
  queryOptions({
    queryKey: ['banks'],
    staleTime: BANKS_STALE_MS,
    queryFn: ({ signal }) => api.get('banks', BanksSchema, { public: true, signal }),
  });
