import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';

/** 옵션 추가·수정 완료 토스트(GUI `940:12677` · `940:12844`) */
export const OPTION_ADDED = '옵션을 추가했어요.';
export const OPTION_EDITED = '옵션을 수정했어요.';

/** 닫기 확인(GUI `940:8060` · `944:2455`, DS 다이얼로그 · PC 520 `956:4063` · `956:6422` — R1f) — `true`면 닫는다 */
export const confirmDiscard = async (kind: 'create' | 'edit') =>
  !(await openConfirm(
    kind === 'create'
      ? {
          popupSize: 'lg',
          title: '옵션 만들기를 그만둘까요?',
          description: '지금 닫으면 입력한 내용은 저장되지 않아요.',
          confirmLabel: '계속 수정하기',
          cancelLabel: '닫기',
        }
      : {
          popupSize: 'lg',
          title: '수정을 그만둘까요?',
          description: '지금 닫으면 수정한 내용이 저장되지 않아요.',
          confirmLabel: '계속 수정하기',
          cancelLabel: '닫기',
        },
  ));
