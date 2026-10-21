import { LoginView } from '@/features/shared/auth/LoginView';

/** 세션 만료 안내(P4b-L 최소 마크업). 세션 상실(`onSessionLost`)이 보호 화면에서 `/login/expired?redirect=…`로 보낸다 */
export default function LoginExpiredPage() {
  return <LoginView expired />;
}
