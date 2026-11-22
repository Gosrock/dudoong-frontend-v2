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
 * 등록된 공연 저장 전 확인 — 기본 정보 GUI `기본정보_저장 확인_등록된 공연_데스크탑1440`(`1595:2407` · DS `다이얼로그_데스크탑`
 * `1597:54751`, Design Sync #319). 서버는 예매자에게 알리지 않는다(plan P11) — 확인 창은 그 사실을 저장 전에 알린다
 */
export const REGISTERED_SAVE_TITLE = '변경 내용을 저장할까요?';
export const REGISTERED_SAVE_DESCRIPTION =
  '이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요. 필요하면 공지로 알려 주세요.';

/**
 * 저장 결과 안내 — 기본 정보 · 상세 정보가 같이 쓴다. 준비중 공연은 토스트 "저장했어요"(디자인 없음), 등록된 공연은 안내 팝업.
 * `confirmedBeforeSave`(기본 정보 — 저장 전에 이미 물었다, #319)면 등록된 공연도 토스트만
 */
export function SavedNotice({
  notice,
  confirmedBeforeSave = false,
}: {
  notice: { kind: SavedNoticeKind | null; dismiss: () => void };
  confirmedBeforeSave?: boolean;
}) {
  const { kind, dismiss } = notice;
  const toastOnly = kind === 'saved' || (kind === 'registeredChanged' && confirmedBeforeSave);
  useEffect(() => {
    if (!toastOnly) return;
    toast('저장했어요', { id: 'event-saved' });
    dismiss();
  }, [toastOnly, dismiss]);
  return (
    <Popup
      open={kind === 'registeredChanged' && !confirmedBeforeSave}
      onOpenChange={(o) => !o && dismiss()}
      title={REGISTERED_SAVED_TITLE}
      description={REGISTERED_SAVED_DESCRIPTION}
      cancelLabel={null}
      onConfirm={dismiss}
    />
  );
}
