import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../__mocks__/server';
import { withHosts } from './sitemap-source';

describe('withHosts — 사이트맵 호스트 조회(작업 풀)', () => {
  it('공연 순서를 지키고, 404 공연은 빼고, 그 밖의 실패는 호스트만 비운다', async () => {
    server.use(
      http.get('*/api/v2/events/:eventId', ({ params }) => {
        if (params.eventId === '777') {
          return HttpResponse.json(
            { success: false, status: 500, code: 'GLOBAL_500_1', reason: 'boom' },
            { status: 500 },
          );
        }
        return undefined;
      }),
    );
    const result = await withHosts([101, 999_999, 777, 102]);
    expect(result.map((r) => r.eventId)).toEqual([101, 777, 102]);
    expect(result[0]!.hostId).not.toBeNull();
    expect(result[1]).toEqual({ eventId: 777, hostId: null });
    expect(result[2]!.hostId).not.toBeNull();
  });

  it('동시에 5개까지만 부르고, 하나가 끝나면 바로 다음을 시작한다', async () => {
    let inFlight = 0;
    let peak = 0;
    server.use(
      http.get('*/api/v2/events/:eventId', async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await delay(5);
        inFlight--;
        return undefined;
      }),
    );
    // 서로 다른 id(같은 id는 QueryClient가 한 요청으로 합친다). 픽스처에 없어 모두 404 → 결과에서 빠진다
    const ids = Array.from({ length: 12 }, (_, i) => 900_000 + i);
    const result = await withHosts(ids);
    expect(result).toEqual([]);
    expect(peak).toBe(5);
  });

  it('느린 요청 하나가 나머지를 붙잡지 않는다(묶음 대기 없음)', async () => {
    let slowDone = false;
    let startedWhileSlow = 0;
    server.use(
      http.get('*/api/v2/events/:eventId', async ({ params }) => {
        if (params.eventId === '900000') {
          await delay(80);
          slowDone = true;
        } else {
          if (!slowDone) startedWhileSlow++;
          await delay(2);
        }
        return undefined;
      }),
    );
    await withHosts(Array.from({ length: 12 }, (_, i) => 900_000 + i));
    // 묶음(5개씩) 방식이면 첫 묶음의 4개만 느린 요청 동안 시작한다. 작업 풀이면 나머지 11개가 모두 시작한다
    expect(startedWhileSlow).toBe(11);
  });

  it('빈 목록이면 부르지 않는다', async () => {
    expect(await withHosts([])).toEqual([]);
  });
});
