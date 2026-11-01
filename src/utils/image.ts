/**
 * 업로드 이미지 출처(P15 `next/image` 전환). 운영 공개 GET의 `posterImageUrl`이 `https://asset.dudoong.com/<환경>/…`이다
 * (스테이징도 같은 호스트, 경로 첫 칸만 다르다). `next.config.ts` `images.remotePatterns`가 이 값 하나만 허용한다.
 */
export const UPLOAD_IMAGE_ORIGIN = 'https://asset.dudoong.com';

/**
 * `/_next/image`로 최적화할 수 있는 주소인지 — 업로드 출처일 때만. 그 밖(가짜 백엔드 `*.mock.dudoong.test`, 카카오 프로필,
 * `blob:` 미리보기, 깨진 값)은 원본을 그대로 그린다: remotePatterns 밖 주소를 최적화 경로로 보내면 400이라 그림이 깨진다.
 */
export function isOptimizableImage(src: string): boolean {
  try {
    return new URL(src).origin === UPLOAD_IMAGE_ORIGIN;
  } catch {
    return false;
  }
}
