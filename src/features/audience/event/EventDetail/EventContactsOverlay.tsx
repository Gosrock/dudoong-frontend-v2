'use client';

import { overlay } from 'overlay-kit';

import type { EventDetail } from '@/api/event/schema';
import { ContactList } from '@/features/shared/contact/ui/ContactList';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import { useEventContacts } from '../model/useEventContacts';

/**
 * 호스트 연락처(문의) — 모바일 바텀시트 · PC 모달(`ResponsiveOverlay`). 문의 = 호스트 연락처(Q20 해결, 공연 Q&A 아님).
 * 와이어 `500:929`(모바일 공연상세 위 팝업)·`666:14989`(PC 모달): 호스트 사진 + 이름 + 연락처. 연락처는 값이 보여야 해
 * (가린 값 안내 — Q41) 아이콘만 나열하지 않고 와이어 `121:2026`처럼 아이콘 + 값 행으로 둔다.
 * 연 동안만 `useEventContacts`가 로그인 사용자의 원문을 읽는다(A안 — 익명은 요청 없이 가린 값).
 */
export function openEventContacts(eventId: string, host: EventDetail['host']) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="문의하기"
    >
      <EventContactsBody eventId={eventId} host={host} open={isOpen} />
    </ResponsiveOverlay>
  ));
}

function EventContactsBody({
  eventId,
  host,
  open,
}: {
  eventId: string;
  host: EventDetail['host'];
  open: boolean;
}) {
  const contacts = useEventContacts(eventId, { open });
  return (
    <Flex direction="column" align="center" gap={5} fullWidth>
      <Flex direction="column" align="center" gap={3}>
        <Avatar size={80} src={host.profileImageUrl} />
        <Txt typography="headingMdEmphasized" align="center">
          {host.name ?? '호스트'}
        </Txt>
      </Flex>
      <ContactList state={contacts} onRetry={contacts.retry} />
    </Flex>
  );
}
