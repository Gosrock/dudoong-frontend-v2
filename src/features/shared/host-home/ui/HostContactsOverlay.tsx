'use client';

import { overlay } from 'overlay-kit';

import { ContactList } from '@/features/shared/contact/ui/ContactList';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import { useHostHome } from '../model/useHostHome';

/**
 * 호스트 연락처 — 모바일 바텀시트 · PC 모달(`ResponsiveOverlay`). 공연 상세 [문의하기](P5b-V)와 같은 모양:
 * 호스트 사진 + 이름 + 아이콘·값 행(`ContactList` — 가린 값에는 "로그인하면 볼 수 있어요", Q41).
 * 와이어 `503:30867`의 연락처 아이콘 줄은 누르는 곳이 정해져 있지 않다 — 아이콘 어느 것을 눌러도 이 시트를 연다(🤖).
 */
export function openHostContacts(hostId: string) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="연락처"
    >
      <HostContactsBody hostId={hostId} />
    </ResponsiveOverlay>
  ));
}

/** 화면과 같은 훅을 읽는다 — 캐시를 같이 써서 요청이 늘지 않고, 시트가 열린 동안 viewer가 확정되면 원문으로 바뀐다 */
function HostContactsBody({ hostId }: { hostId: string }) {
  const h = useHostHome(hostId);
  return (
    <Flex direction="column" align="center" gap={5} fullWidth>
      <Flex direction="column" align="center" gap={3}>
        <Avatar size={80} src={h.host.profileImageUrl} />
        <Txt typography="headingMdEmphasized" align="center">
          {h.host.name ?? '이름 없는 호스트'}
        </Txt>
      </Flex>
      <ContactList state={h.contacts} onRetry={h.retryViewer} />
    </Flex>
  );
}
