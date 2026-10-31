import { GateCheckView } from '@/features/shared/auth/GateCheckView';

/**
 * 임시 보호 라우트(P4a) — 로그인 게이트·세션 상실·다른 탭 로그아웃을 확인하는 QA 시나리오(qa/scenarios/auth-gate.qa.ts)가 쓴다.
 * 실제 보호 화면(/tickets 등, P8~)이 생기면 시나리오를 그쪽으로 옮기고 이 파일과 GateCheckView를 지운다.
 */
export default function GateCheckPage() {
  return <GateCheckView />;
}
