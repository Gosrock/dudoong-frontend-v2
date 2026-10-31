/**
 * 정적 import한 이미지의 주소. Next(webpack·Turbopack)는 `{ src, width, height }`를, Vite(Storybook·Vitest)는
 * 문자열을 돌려준다 — 둘 다 받는다.
 */
export type ImportedAsset = string | { src: string };

export const assetSrc = (asset: ImportedAsset) => (typeof asset === 'string' ? asset : asset.src);
