import { http, HttpResponse } from 'msw';

const ok = <T>(data: T) => HttpResponse.json({ success: true, status: 200, data, timeStamp: '' });

/** 백엔드 mock. 경로는 브라우저 기준(`/api/v2/...`)과 서버 기준(`http://localhost:8080/...`)을 모두 받는다. */
export const handlers = [
  http.get('*/api/v2/tags', () =>
    ok([
      { category: 'EVENT_TYPE', tags: [{ tagId: 1, name: '정기공연' }] },
      { category: 'GENRE', tags: [{ tagId: 2, name: '락밴드' }] },
    ]),
  ),
];
