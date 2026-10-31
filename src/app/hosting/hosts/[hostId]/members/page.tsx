import { HostMembersView } from '@/features/hosting/host/HostMembersView';

/**
 * 멤버 관리(P10b). GH-6 · PH-7 · PH-10 · DH-11 · PH-12는 브라우저에서만 — 레이아웃의 게이트가 세션을 확정한 뒤 그린다(서버 조회 없음).
 * 비멤버는 공용 403(GH-6 403), 없는 호스트·숫자가 아닌 id는 공용 404(클라이언트 판정이라 상태 코드는 200).
 */
export default async function HostMembersPage({
  params,
}: PageProps<'/hosting/hosts/[hostId]/members'>) {
  const { hostId } = await params;
  return <HostMembersView hostId={hostId} />;
}
