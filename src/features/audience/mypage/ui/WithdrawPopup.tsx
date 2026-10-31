'use client';

import { overlay } from 'overlay-kit';

import { Popup } from '@/ui/components/Popup/Popup';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useWithdraw } from '../model/useWithdraw';

/** 탈퇴 확인 문구(plan P9 V 범위 — "보낸 선물 중 대기 중인 것은 취소된다"). 화면 디자인이 없어 문구는 🤖 잠정 */
export const WITHDRAW_TITLE = '두둥을 탈퇴할까요?';
export const WITHDRAW_DESCRIPTION =
  '탈퇴하면 계정 정보를 되돌릴 수 없어요. 보낸 선물 중 아직 받지 않은 선물은 취소돼요.';

/**
 * 회원 탈퇴 확인 — DS 확인 팝업(`Popup`). GUI·와이어에 탈퇴 화면이 없어 DS로만 만들었다(Figma 코멘트 — 디자인 없음).
 * 훅을 팝업 안에서 읽어 `USER_400_6`(마스터 양도 필요) 안내를 팝업에 그대로 보인다. 성공하면 훅이 홈으로 하드 이동한다.
 */
export function openWithdraw() {
  overlay.open(({ isOpen, close, unmount }) => (
    <WithdrawBody open={isOpen} onClose={close} onExited={unmount} />
  ));
}

function WithdrawBody({
  open,
  onClose,
  onExited,
}: {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  const w = useWithdraw();
  return (
    <Popup
      open={open}
      onOpenChange={(o) => !o && !w.pending && onClose()}
      onExited={onExited}
      title={WITHDRAW_TITLE}
      description={WITHDRAW_DESCRIPTION}
      confirmLabel="탈퇴하기"
      cancelLabel="취소"
      loading={w.pending}
      onConfirm={() => void w.withdraw()}
    >
      {w.error && (
        <div role="alert">
          <Txt typography="labelMd" color={colors.textDangerLabel}>
            {w.error}
          </Txt>
        </div>
      )}
    </Popup>
  );
}
