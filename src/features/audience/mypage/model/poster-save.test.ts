import { afterEach, describe, expect, it, vi } from 'vitest';

import { posterFileName, savePosterImage } from './poster-save';

afterEach(() => vi.restoreAllMocks());

describe('아카이빙 포스터 저장', () => {
  it.each([
    ['https://img.x/event/90/poster.jpeg', '고스락 제36회 정기공연', '고스락 제36회 정기공연.jpeg'],
    ['https://img.x/a/b.PNG?v=1#x', '이름/에:는*못?쓰는"글자<>|', '이름에는못쓰는글자.png'],
    ['https://img.x/a/noext', null, 'poster.jpg'],
    ['https://img.x/a/b.webp', '   ', 'poster.webp'],
  ])('%s · %s → %s', (url, name, expected) => {
    expect(posterFileName(url, name)).toBe(expected);
  });

  it('받으면 Blob으로 저장하고, 받지 못하면(403 · CORS) 새 탭으로 연다', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const open = vi.fn();

    const ok = vi.fn(async () => new Response(new Blob(['x']), { status: 200 }));
    await expect(
      savePosterImage('https://img.x/p.jpeg', '공연', { fetcher: ok, open }),
    ).resolves.toBe('saved');
    expect(ok).toHaveBeenCalledWith('https://img.x/p.jpeg', { mode: 'cors', credentials: 'omit' });
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();

    const forbidden = vi.fn(async () => new Response('', { status: 403 }));
    await expect(
      savePosterImage('https://img.x/p.jpeg', '공연', { fetcher: forbidden, open }),
    ).resolves.toBe('opened');
    const cors = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      savePosterImage('https://img.x/p.jpeg', '공연', { fetcher: cors, open }),
    ).resolves.toBe('opened');
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith('https://img.x/p.jpeg');
  });
});
