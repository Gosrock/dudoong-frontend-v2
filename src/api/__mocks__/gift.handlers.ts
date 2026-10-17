import { http } from 'msw';

import { gifts, viewerGifts } from './fixtures/gift';
import { fail, hasAccessToken, ok } from './respond';

/** 선물 랜딩(공개) — GG-3. 쿠키가 실린 요청은 로그인 사용자 값(`viewerGifts`) */
export const giftHandlers = [
  http.get('*/api/v2/gifts/:giftToken', ({ request, params, cookies }) => {
    const gift = gifts[String(params.giftToken)];
    if (!gift) return fail(request, 404, 'Gift_404_1', '선물을 찾을 수 없습니다.');
    if (!hasAccessToken(cookies)) return ok(gift);
    return ok({ ...gift, isLoggedIn: true, ...viewerGifts[String(params.giftToken)] });
  }),
];
