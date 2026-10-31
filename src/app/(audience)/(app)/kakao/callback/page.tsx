import { KakaoCallbackView } from '@/features/shared/auth/KakaoCallbackView';

/**
 * 카카오 로그인 콜백. 경로는 백엔드 `KakaoRedirectPolicy`가 정한다(`{출처}/kakao/callback` — 카카오 콘솔 등록값과 같아야 한다).
 * 게이트 밖(`(app)`)이고 서버에서 조회하지 않는다. 처리는 브라우저에서 한다(api-contract §9).
 */
export default function KakaoCallbackPage() {
  return <KakaoCallbackView />;
}
