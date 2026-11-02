'use client';

import { useEffect } from 'react';

import { Popup } from '@/ui/components/Popup/Popup';
import { toast } from '@/ui/components/Toast/Toast';

import type { SavedNotice as SavedNoticeKind } from '../model/useEventBasicInfo';

/** 등록된 공연을 저장했을 때 안내(서버는 예매자에게 알리지 않는다 — plan P11). 디자인 없음 → DS `Popup` */
export const REGISTERED_SAVED_TITLE = '저장했어요';
export const REGISTERED_SAVED_DESCRIPTION =
  '이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요. 꼭 알려야 하는 변경이면 직접 안내해 주세요.';

/**
 * 저장 결과 안내 — 기본 정보 · 상세 정보가 같이 쓴다. 준비중 공연은 토스트 "저장했어요"(디자인 없음), 등록된 공연은 안내 팝업
 */
export function SavedNotice({
  notice,
}: {
  notice: { kind: SavedNoticeKind | null; dismiss: () => void };
}) {
  const { kind, dismiss } = notice;
  useEffect(() => {
    if (kind !== 'saved') return;
    toast('저장했어요', { id: 'event-saved' });
    dismiss();
  }, [kind, dismiss]);
  return (
    <Popup
      open={kind === 'registeredChanged'}
      onOpenChange={(o) => !o && dismiss()}
      title={REGISTERED_SAVED_TITLE}
      description={REGISTERED_SAVED_DESCRIPTION}
      cancelLabel={null}
      onConfirm={dismiss}
    />
  );
}
