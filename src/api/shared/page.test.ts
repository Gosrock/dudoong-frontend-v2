import { infiniteQueryOptions, QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { flattenPages, type Page, pageInfinite, pageSchema } from './page';

const Item = z.object({ id: z.number() });
const ItemPage = pageSchema(Item);

const page = (n: number, ids: number[], hasNext: boolean): Page<{ id: number }> => ({
  content: ids.map((id) => ({ id })),
  page: n,
  size: 2,
  totalElements: 5,
  totalPages: 3,
  hasNext,
});

describe('pageSchema', () => {
  it('Page 응답을 파싱한다', () => {
    const parsed = ItemPage.parse(page(0, [1, 2], true));
    expect(parsed.content).toEqual([{ id: 1 }, { id: 2 }]);
    expect(parsed.totalElements).toBe(5);
  });

  it('Slice 응답(totalElements·totalPages null)도 파싱한다', () => {
    const slice = {
      content: [],
      page: 0,
      size: 20,
      totalElements: null,
      totalPages: null,
      hasNext: false,
    };
    expect(ItemPage.parse(slice)).toEqual(slice);
  });

  it('키가 빠지면 실패한다(없으면 null이지 생략이 아니다)', () => {
    const partial: Partial<Page<{ id: number }>> = page(0, [1], false);
    delete partial.totalElements;
    expect(ItemPage.safeParse(partial).success).toBe(false);
  });

  it('항목 스키마가 틀리면 실패한다', () => {
    expect(ItemPage.safeParse({ ...page(0, [], false), content: [{ id: 'x' }] }).success).toBe(
      false,
    );
  });
});

describe('pageInfinite', () => {
  it('hasNext면 다음 페이지 번호, 아니면 undefined', () => {
    expect(pageInfinite.getNextPageParam(page(0, [1, 2], true))).toBe(1);
    expect(pageInfinite.getNextPageParam(page(2, [5], false))).toBeUndefined();
    expect(pageInfinite.initialPageParam).toBe(0);
  });

  it('infiniteQueryOptions와 같이 써서 끝까지 읽는다', async () => {
    const pages = [page(0, [1, 2], true), page(1, [3, 4], true), page(2, [5], false)];
    const requested: number[] = [];
    const options = infiniteQueryOptions({
      ...pageInfinite,
      queryKey: ['items', 'infinite', {}],
      queryFn: ({ pageParam }) => {
        requested.push(pageParam);
        return Promise.resolve(pages[pageParam]!);
      },
    });
    const client = new QueryClient();
    await client.fetchInfiniteQuery({ ...options, pages: 3 });
    const data = client.getQueryData(options.queryKey);
    expect(requested).toEqual([0, 1, 2]);
    expect(flattenPages(data, (i) => i.id).map((i) => i.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('flattenPages', () => {
  it('앞 페이지에 나온 id는 다시 넣지 않는다', () => {
    const data = { pages: [page(0, [1, 2], true), page(1, [2, 3], false)], pageParams: [0, 1] };
    expect(flattenPages(data, (i) => i.id).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('데이터가 없으면 빈 배열', () => {
    expect(flattenPages(undefined, (i: { id: number }) => i.id)).toEqual([]);
  });
});
