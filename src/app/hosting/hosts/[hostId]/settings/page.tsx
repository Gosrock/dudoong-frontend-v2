import { HostSettingsView } from '@/features/hosting/host/HostSettingsView';

/**
 * 호스트 설정(P10b). GH-3 viewer · PH-15 · PH-4는 브라우저에서만 — 레이아웃의 게이트가 세션을 확정한 뒤 그린다(서버 조회 없음).
 * 비멤버는 공용 403, 없는 호스트·숫자가 아닌 id는 공용 404(클라이언트 판정이라 상태 코드는 200).
 */
export default async function HostSettingsPage({
  params,
}: PageProps<'/hosting/hosts/[hostId]/settings'>) {
  const { hostId } = await params;
  return <HostSettingsView hostId={hostId} />;
}
