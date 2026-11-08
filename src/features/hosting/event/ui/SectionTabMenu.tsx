'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useRef, useState } from 'react';

import { EVENT_SECTION_TITLE_MAX } from '@/api/event/schema';
import { BottomSheet } from '@/ui/components/BottomSheet/BottomSheet';
import { Input } from '@/ui/components/Input/Input';
import { Popup } from '@/ui/components/Popup/Popup';
import { Icon } from '@/ui/icons/Icon';

import * as s from './SectionTabMenu.css';

export type TabMenuAction = 'rename' | 'remove';

/** 탭 메뉴 항목 — PC 드롭다운(`1318:385`)과 모바일 시트(`1336:1538`)가 같은 순서 · 글자 · 아이콘을 쓴다 */
export const TAB_MENU_LABEL: Record<TabMenuAction, string> = {
  rename: '이름 바꾸기',
  remove: '탭 삭제',
};

export function TabMenuIcon({ action }: { action: TabMenuAction }) {
  return action === 'rename' ? (
    <Icon name="edit-2" variant="filled" className={s.icon} />
  ) : (
    <Icon name="trash" variant="filled" className={s.icon} />
  );
}

/**
 * 모바일 탭 메뉴 — GUI `1336:957`(#191): DS `Bottom sheet`(`surface=flat` · 제목 sm · ✕) 제목 = 탭 이름,
 * 본문은 [이름 바꾸기][탭 삭제](빨강) 두 줄(51h · 아이콘 18 ↔ 글자 12 · `Label/lg`).
 * 고른 것은 시트가 **다 닫힌 뒤** 돌려준다 — 이어서 여는 팝업과 뒤로가기 history 항목이 엇갈리지 않게.
 */
export function openTabMenuSheet({
  title,
  canRemove,
}: {
  title: string;
  canRemove: boolean;
}): Promise<TabMenuAction | null> {
  return new Promise((resolve) => {
    let picked: TabMenuAction | null = null;
    overlay.open(({ isOpen, close, unmount }) => (
      <BottomSheet
        open={isOpen}
        onOpenChange={(o) => !o && close()}
        onExited={() => {
          unmount();
          resolve(picked);
        }}
        title={title}
        variant="flat"
      >
        <ul className={s.sheetList} aria-label="탭 메뉴">
          {(['rename', 'remove'] as const).map((action) => (
            <li key={action}>
              <button
                type="button"
                className={s.sheetItem}
                data-danger={action === 'remove' ? 'true' : undefined}
                disabled={action === 'remove' && !canRemove}
                onClick={() => {
                  picked = action;
                  close();
                }}
              >
                <TabMenuIcon action={action} />
                {TAB_MENU_LABEL[action]}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    ));
  });
}

/**
 * 모바일 탭 이름 바꾸기 — GUI `1336:1015`(#192) "다이얼로그_모바일_탭 이름 변경"(화면이 직접 그린 판 —
 * DS `다이얼로그` 모양에 DS `text input Field` + 글자 수): 제목 "탭 이름 바꾸기" · [취소][저장].
 * 바꾼 이름(앞뒤 공백 뺌)을 돌려준다. 취소 · 닫기 · 그대로면 `null`.
 * FIGMA-CUSTOM: 이름 변경 다이얼로그(gui 1338:1270) → DS `Popup` + `Input`(같은 모양 — 차이 없음)
 */
export function openRenameTabPopup(current: string): Promise<string | null> {
  return overlay.openAsync<string | null>(({ isOpen, close, unmount }) => (
    <RenameTabPopup open={isOpen} current={current} onDone={close} onExited={unmount} />
  ));
}

function RenameTabPopup({
  open,
  current,
  onDone,
  onExited,
}: {
  open: boolean;
  current: string;
  onDone: (value: string | null) => void;
  onExited: () => void;
}) {
  const [value, setValue] = useState(current);
  const next = value.trim();
  const submit = () => {
    if (next) onDone(next === current ? null : next);
  };
  return (
    <Popup
      open={open}
      onOpenChange={(o) => !o && onDone(null)}
      onExited={onExited}
      title="탭 이름 바꾸기"
      confirmLabel="저장"
      confirmDisabled={!next}
      onConfirm={submit}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          aria-label="탭 이름"
          maxLength={EVENT_SECTION_TITLE_MAX}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
      </form>
    </Popup>
  );
}

/**
 * PC 탭 이름 바꾸기 — GUI `1320:383`(#192): 탭 자리가 입력칸이 된다(200×36 · 테두리 2 `brand/primary` · 모서리 8 ·
 * 바깥 빛 · 글자 `Heading/md2` · 오른쪽 글자 수 `Label/sm`). 열리면 글자를 모두 고른다(Figma "선택된 텍스트").
 * Enter · 칸 밖으로 나가면 바꾸고, Esc면 그대로 둔다. 비우고 나가면 그대로 둔다(🤖 — 탭 이름은 비울 수 없다).
 * FIGMA-CUSTOM: 탭 이름 입력(gui 1320:811 "탭 이름 입력") 커스텀 → `SectionTabMenu.css.ts`. DS 후보(design-system §3)
 */
export function TabNameField({
  current,
  onDone,
}: {
  current: string;
  /** 바꾼 이름(앞뒤 공백 뺌) 또는 `null`(그대로) */
  onDone: (value: string | null) => void;
}) {
  const [value, setValue] = useState(current);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const next = value.trim();
    onDone(commit && next && next !== current ? next : null);
  };
  return (
    <span className={s.field}>
      <input
        ref={ref}
        className={s.fieldInput}
        aria-label="탭 이름"
        maxLength={EVENT_SECTION_TITLE_MAX}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          // 탭 목록의 ←→ 이동이 글자 커서를 빼앗지 않게
          e.stopPropagation();
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            finish(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            finish(false);
          }
        }}
      />
      <span className={s.fieldCount} aria-hidden>
        {value.length}/{EVENT_SECTION_TITLE_MAX}
      </span>
    </span>
  );
}
