'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ReactNode } from 'react';
import { Drawer as Vaul } from 'vaul';

import { useCloseOnBack } from '../../hooks/useCloseOnBack';
import { useOnExited } from '../../hooks/useOnExited';
import { useReturnFocus } from '../../hooks/useReturnFocus';
import { Icon } from '../../icons/Icon';
import * as s from './Drawer.css';

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 접근성 이름(화면에는 그리지 않는다 — 와이어 햄버거에 제목이 없다) */
  title: string;
  children?: ReactNode;
  /** 머리 줄 오른쪽(✕ 반대편). 햄버거는 알림 벨 */
  headerTrailing?: ReactNode;
  /** 뒤로가기로 닫기. 바깥 컴포넌트가 맡으면 false. 기본 true */
  closeOnBack?: boolean;
  /** 닫힘 애니메이션 뒤. overlay-kit의 `unmount`를 넘긴다 */
  onExited?: () => void;
  /**
   * 여백. `default` — 와이어 값(머리 줄 아이콘 쪽 8, 본문 위 8 · 좌우 24). `menu` — GUI 햄버거 `1047:19428` · `1174:15071`
   * (Ready 2026-11-07): ✕ · 벨이 가장자리에서 24(Top app bar 패딩 16 + 슬롯 40), 본문 좌우 24 · 위 0
   */
  variant?: 'default' | 'menu';
};

/**
 * 전체 화면 드로어(햄버거 메뉴) — 와이어 `128:2875`·`128:2931`. 왼쪽에서 들어오고 화면을 다 덮는다(모바일 전용으로 쓴다).
 * 디자인 시스템에 같은 컴포넌트가 없어 와이어 구조(머리 줄 ✕ · 오른쪽 슬롯, 본문 스크롤)만 두고 모양은 토큰으로만 입혔다
 * (design-system §3 "없는 컴포넌트" — 햄버거 드로어).
 * 동작은 BottomSheet와 같은 vaul(Radix Dialog 기반) — 포커스 트랩·Esc·스크롤 잠금(iOS 포함), 왼쪽으로 밀어 닫기, 뒤로가기로 닫기.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  headerTrailing,
  closeOnBack = true,
  onExited,
  variant = 'default',
}: DrawerProps) {
  useCloseOnBack(open, () => onOpenChange(false), { enabled: closeOnBack });
  useOnExited(open, onExited, 550); // vaul 기본 전환 0.5s
  const focus = useReturnFocus();

  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} direction="left" autoFocus>
      <Vaul.Portal>
        <Vaul.Overlay className={s.overlay} />
        <Vaul.Content className={s.content} aria-describedby={undefined} {...focus}>
          <VisuallyHidden asChild>
            <Vaul.Title>{title}</Vaul.Title>
          </VisuallyHidden>
          <div className={s.header[variant]}>
            <Vaul.Close className={s.iconButton} aria-label="닫기">
              <Icon name="close" />
            </Vaul.Close>
            <div className={s.trailing}>{headerTrailing}</div>
          </div>
          <div className={s.body[variant]}>{children}</div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
