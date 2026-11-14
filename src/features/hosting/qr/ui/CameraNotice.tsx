import type { ReactNode } from 'react';

import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './QrCheckIn.css';

/** 카메라 자리 안내 — 아이콘 48(회색) · 제목 `Heading/md2 - emphasized` · 설명 `Body/md` 회색(`1360:23233` 로컬 컴포넌트) */
export function CameraNotice({
  icon,
  title,
  description,
  muted,
}: {
  icon: 'camera' | 'camera-disable';
  title: ReactNode;
  description?: string | null;
  /** 공연 상태로 막힘(`1360:25870`) — 제목도 회색, 설명 없음 */
  muted?: boolean;
}) {
  return (
    <>
      <span className={s.noticeIcon} aria-hidden>
        <Icon name={icon} />
      </span>
      <Txt
        as="p"
        typography="headingMd2Emphasized"
        align="center"
        color={muted ? colors.textTertiary : colors.textPrimary}
        className={muted ? `${s.noticeText} ${s.noticeTitleMuted}` : s.noticeText}
      >
        {title}
      </Txt>
      {description && (
        <Txt
          as="p"
          typography="bodyMd"
          align="center"
          color={colors.textSecondary}
          className={s.noticeText}
        >
          {description}
        </Txt>
      )}
    </>
  );
}
