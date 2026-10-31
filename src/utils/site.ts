/**
 * 사이트 기본 OG 이미지 — 포스터가 없는 공연·홈·공지·호스트 홈에 쓴다(이슈 #8). `public/` 아래 경로(예: `'/og-default.png'`)를 넣으면
 * `(public)` 레이아웃의 `metadataBase`(요청 origin)로 절대 주소가 된다. **디자인 대기** — 브랜드 이미지가 아직 없어 `null`이고,
 * `null`이면 어디에도 넣지 않는다(지금 동작 그대로). 이미지를 받으면 파일을 `public/`에 두고 이 값만 바꾼다.
 */
export const DEFAULT_OG_IMAGE: string | null = null;
