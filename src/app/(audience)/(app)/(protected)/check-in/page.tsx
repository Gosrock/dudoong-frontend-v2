import { parseCheckInToken } from '@/features/audience/checkin/model/check-in-params';
import { SelfCheckInView } from '@/features/audience/checkin/SelfCheckInView';

/**
 * 관객 셀프 체크인(P8c, 보호). 공연장 QR(GQ-4 `qrPath`)이 이 주소다. 비로그인이면 게이트가 `/login?redirect=/check-in?token=…`로
 * 보내고, 로그인 뒤 같은 주소로 돌아와 PQ-5를 보낸다.
 */
export default async function CheckInPage({ searchParams }: PageProps<'/check-in'>) {
  const { token } = await searchParams;
  return <SelfCheckInView token={parseCheckInToken(token)} />;
}
