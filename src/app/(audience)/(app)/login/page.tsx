import { LoginView } from '@/features/shared/auth/LoginView';

/** 로그인(P4b-L 최소 마크업). 게이트가 `/login?redirect=…`로 보낸다. 화면은 P4b-V(GUI `331:11720`) */
export default function LoginPage() {
  return <LoginView />;
}
