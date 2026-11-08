import { saveBlob } from '@/utils/download';

/** 확장자를 모르면 */
const FALLBACK_EXT = 'jpg';

/**
 * 저장할 파일 이름 — 공연 이름(파일 이름에 못 쓰는 글자는 뺀다) + 이미지 주소의 확장자. 이름이 없으면 `poster`.
 * 쿼리·해시는 보지 않는다
 */
export function posterFileName(url: string, eventName: string | null): string {
  const path = url.split(/[?#]/)[0] ?? '';
  const ext = /\.([a-z0-9]{2,5})$/i.exec(path)?.[1]?.toLowerCase() ?? FALLBACK_EXT;
  const base = (eventName ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'poster'}.${ext}`;
}

export type PosterSaveResult = 'saved' | 'opened';

/**
 * 포스터 이미지 저장(아카이빙 크게 보기 — 와이어 `503:16328` Tomato 10-24 "이미지 크게 보이고 이미지 다운로드").
 * 서버 이미지는 다른 출처라 `<a download>`가 먹지 않는다 → fetch → Blob → 브라우저 저장(`saveBlob`).
 * 받지 못하면(CORS · 네트워크 · 4xx/5xx) 새 탭으로 이미지를 연다(길게 눌러 저장할 수 있게). 이미지 주소는 로그에 남기지 않는다
 */
export async function savePosterImage(
  url: string,
  eventName: string | null,
  {
    fetcher = fetch,
    open = (href: string) => window.open(href, '_blank', 'noopener'),
  }: { fetcher?: typeof fetch; open?: (href: string) => unknown } = {},
): Promise<PosterSaveResult> {
  try {
    const res = await fetcher(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`poster ${res.status}`);
    saveBlob(await res.blob(), posterFileName(url, eventName), 'poster.jpg');
    return 'saved';
  } catch {
    open(url);
    return 'opened';
  }
}
