'use client';

import { overlay } from 'overlay-kit';
import { type MouseEvent, useId, useRef, useState } from 'react';

import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import {
  EditorBottomBar,
  FieldError,
  useLeaveGuard,
} from '@/features/hosting/shared/ui/EditorParts';
import { sanitizeSectionHtml } from '@/features/shared/section-viewer/model/sanitize-section-html';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { NumberingButton } from '@/ui/components/Counter/Counter';
import { DropdownMenu } from '@/ui/components/DropdownMenu/DropdownMenu';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { toast } from '@/ui/components/Toast/Toast';
import { useMediaQueries } from '@/ui/hooks/useMediaQueries';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventDetailView.css';
import { useEventSections } from './model/useEventSections';
import { SavedNotice } from './ui/SavedNotice';
import { SectionEditor } from './ui/SectionEditor';
import {
  openRenameTabPopup,
  openTabMenuSheet,
  TAB_MENU_LABEL,
  type TabMenuAction,
  TabMenuIcon,
  TabNameField,
} from './ui/SectionTabMenu';

type Form = ReturnType<typeof useEventSections>;

/**
 * `/hosting/events/[eventId]/detail` 상세 정보 — GUI Ready 모바일 `767:39585` · PC `767:39645`(1440, #190).
 * 제목 + 안내 → 밑줄형 탭(DS `tab item` + `numbering` 탭 추가) → 에디터 카드(툴바 + 본문, Tiptap) → 하단 고정 바 [미리보기][저장하기].
 *
 * 탭 고치기(#191~#193): **고른 탭을 한 번 더 누르면** 탭 메뉴 — PC 드롭다운(`1316:383`) · 모바일 바텀시트(`1336:957`) —
 * [이름 바꾸기] → PC는 탭이 입력칸(`1320:383`), 모바일은 이름 변경 창(`1336:1015`) /
 * [탭 삭제] → 확인 창(`1325:14881` · `1336:1073`, Warning) → 토스트 "탭을 삭제했어요."(`1325:15101` · `1336:1131`). 모든 탭을 고칠 수 있다.
 * 저장은 **전체 교체**(PE-6) — 지운 탭은 저장해야 공연 상세에서도 사라진다. 저장하지 않고 다른 화면으로 가면
 * "저장하지 않고 이동할까요?"(#194 · #195 — `useLeaveGuard`).
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  return (
    <HostingBoundary resetKeys={[eventId]}>
      <EventDetail eventId={eventId} />
    </HostingBoundary>
  );
}

function EventDetail({ eventId }: { eventId: string }) {
  const form = useEventSections(eventId);
  const formId = useId();
  const readOnly = !form.canEdit;
  const viewport = useMediaQueries();
  const [active, setActive] = useState(form.sections[0]?.key ?? '');
  // 지운 탭이 고른 탭이었으면 첫 탭으로
  const current = form.sections.find((x) => x.key === active) ?? form.sections[0];
  const { tabs, status } = form;
  useLeaveGuard(form.canEdit && status.dirty);

  const [pendingSelect, setPendingSelect] = useState<Set<string> | null>(null);
  const add = () => {
    const before = new Set(form.sections.map((x) => x.key));
    tabs.add();
    // 새 탭은 다음 렌더에 생긴다 — 그 키를 고른다
    setPendingSelect(before);
  };
  if (pendingSelect) {
    const added = form.sections.find((x) => !pendingSelect.has(x.key));
    if (added) {
      setPendingSelect(null);
      setActive(added.key);
    }
  }

  // ─── 탭 메뉴(#191) ───
  /** 누르기 시작할 때 이미 고른 탭이었는지 — Radix Tabs는 mousedown에 고르므로 click 때는 늘 고른 탭이다 */
  const pressedSelected = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const tabEl = (key: string) =>
    document.querySelector<HTMLElement>(`[data-section-key="${CSS.escape(key)}"]`);
  /** 탭으로 포커스를 돌린다 — 입력칸이 탭으로 돌아온 다음 프레임에 */
  const focusTab = (key: string) => requestAnimationFrame(() => tabEl(key)?.focus());

  /** PC 입력칸이 끝나면 — 바꾼 이름을 넣고 탭으로 포커스를 돌린다 */
  const finishRename = (key: string, value: string | null) => {
    if (value) tabs.setTitle(key, value);
    setRenaming(null);
    focusTab(key);
  };

  const remove = (key: string, title: string) =>
    void openConfirm({
      title: `‘${title}’ 탭을 삭제할까요?`,
      description: '탭에 작성한 내용이 모두 삭제돼요. 삭제한 내용은 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      intent: 'delete',
    }).then((ok) => {
      if (!ok) return;
      tabs.remove(key);
      toast('탭을 삭제했어요.');
    });

  const runMenuAction = (action: TabMenuAction, key: string, title: string) => {
    if (action === 'remove') {
      remove(key, title);
    } else if (viewport === 'desktop') {
      setRenaming(key);
    } else {
      void openRenameTabPopup(title).then((value) => {
        if (value) tabs.setTitle(key, value);
      });
    }
  };

  const openMenu = (key: string, title: string) => {
    if (readOnly) return;
    // 열린 동안 탭에 배경(`1316:497` · `1336:1013`) — PC는 드롭다운도 이 값으로 연다
    setMenuOpen(true);
    if (viewport === 'desktop') return;
    void openTabMenuSheet({ title, canRemove: tabs.canRemove }).then((action) => {
      setMenuOpen(false);
      if (action) runMenuAction(action, key, title);
    });
  };

  const onTabPointerDown = (selected: boolean) => {
    // 메뉴가 열린 채 고른 탭을 누르면 닫기만 한다(바깥 누르기로 닫히고 다시 열리지 않게)
    pressedSelected.current = selected && !menuOpen;
  };

  /** PC 메뉴가 닫히면 포커스는 탭으로(트리거는 크기 0 자리표시라). 이어서 여는 확인 창은 닫힐 때 이 탭으로 돌아온다 */
  const onMenuClosed = (e: Event, key: string) => {
    e.preventDefault();
    tabEl(key)?.focus();
  };

  const onTabClick = (e: MouseEvent<HTMLButtonElement>, key: string, title: string) => {
    // 키보드(Enter · Space)로 누르면 포커스된 탭이 곧 고른 탭이다(automatic activation)
    const wasSelected = e.detail === 0 ? key === current?.key : pressedSelected.current;
    pressedSelected.current = false;
    if (wasSelected) openMenu(key, title);
  };

  return (
    <section aria-labelledby="detail-title" className={s.page}>
      <div className={s.body}>
        <Flex direction="column" gap={1}>
          <h1 id="detail-title" className={s.desktopTitle}>
            <Txt typography="headingLgEmphasized">상세 정보</Txt>
          </h1>
          <Txt as="p" typography="bodyMd" className={s.description}>
            {'공연 상세 내용을 적어주세요.\n이미지는 드래그 앤 드롭으로도 첨부 가능해요.'}
          </Txt>
        </Flex>
        {form.formError && (
          <p role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {form.formError}
            </Txt>
          </p>
        )}
        <form
          id={formId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void form.save();
          }}
        >
          {current && (
            <Tabs value={current.key} onValueChange={setActive}>
              <div className={s.tabRow}>
                <TabList size="responsive" aria-label="상세 정보 탭" className={s.tabList}>
                  {form.sections.map((sec) => {
                    const error = status.attempted ? form.errors[sec.key] : undefined;
                    const title = sec.title || '새 탭';
                    if (renaming === sec.key) {
                      return (
                        <TabNameField
                          key={sec.key}
                          current={sec.title}
                          onDone={(value) => finishRename(sec.key, value)}
                        />
                      );
                    }
                    const selected = sec.key === current.key;
                    const tab = (
                      <Tab
                        key={sec.key}
                        value={sec.key}
                        data-section-key={sec.key}
                        data-testid="section"
                        data-invalid={error?.title || error?.content ? 'true' : undefined}
                        data-menu-open={selected && menuOpen ? 'true' : undefined}
                        aria-haspopup={!readOnly && selected ? 'menu' : undefined}
                        className={s.tab}
                        onPointerDown={() => onTabPointerDown(selected)}
                        onClick={(e) => onTabClick(e, sec.key, title)}
                      >
                        {title}
                      </Tab>
                    );
                    if (!selected || readOnly) return tab;
                    // PC 드롭다운(`1318:385`) — 탭 아래 왼쪽에 붙는다. 여는 것은 탭 누르기가 맡고, 메뉴 트리거는 자리만 잡는다
                    return (
                      <span key={sec.key} className={s.tabAnchor}>
                        {tab}
                        <DropdownMenu
                          variant="card"
                          align="start"
                          open={menuOpen && viewport === 'desktop'}
                          onOpenChange={(o) => !o && setMenuOpen(false)}
                          onCloseAutoFocus={(e) => onMenuClosed(e, sec.key)}
                          trigger={<span aria-hidden className={s.menuTrigger} />}
                          items={(['rename', 'remove'] as const).map((action) => ({
                            label: TAB_MENU_LABEL[action],
                            icon: <TabMenuIcon action={action} />,
                            danger: action === 'remove',
                            disabled: action === 'remove' && !tabs.canRemove,
                            // 메뉴가 닫히고 포커스가 정리된 뒤에 연다(확인 창 · 입력칸이 포커스를 가져가게)
                            onSelect: () =>
                              void setTimeout(() => runMenuAction(action, sec.key, title)),
                          }))}
                        />
                      </span>
                    );
                  })}
                </TabList>
                {tabs.canAdd && <NumberingButton icon="plus" aria-label="탭 추가" onClick={add} />}
              </div>
              {form.sections.map((sec) => {
                const error = status.attempted ? form.errors[sec.key] : undefined;
                return (
                  <TabPanel key={sec.key} value={sec.key} className={s.panel}>
                    <SectionEditor
                      key={sec.key}
                      label={`${sec.title || '새 탭'} 본문`}
                      content={sec.content}
                      readOnly={readOnly}
                      onChange={(html) => tabs.setContent(sec.key, html)}
                      uploadImage={form.image.upload}
                      uploading={form.image.uploading}
                    />
                    <FieldError>{error?.title}</FieldError>
                    <FieldError>{error?.content}</FieldError>
                  </TabPanel>
                );
              })}
            </Tabs>
          )}
          <FieldError>{form.image.error}</FieldError>
        </form>
      </div>
      {form.canEdit && (
        <EditorBottomBar
          formId={formId}
          canPreview={status.canPreview}
          onPreview={() => openSectionsPreview(form.sections)}
          canSave={status.canSave}
          saving={status.saving}
        />
      )}
      <SavedNotice notice={form.savedNotice} />
    </section>
  );
}

/** [미리보기] — 관객 공연 상세의 섹션 뷰어(P5b `SectionViewer`)로 지금 탭들(저장 전)을 보여 준다. 저장할 수 있을 때만 열린다 */
function openSectionsPreview(sections: Form['sections']) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="미리보기"
    >
      <div data-testid="sections-preview" className={s.preview}>
        <Tabs defaultValue={sections[0]?.key}>
          <TabList size="responsive" aria-label="미리보기 탭" className={s.tabList}>
            {sections.map((sec) => (
              <Tab key={sec.key} value={sec.key}>
                {sec.title}
              </Tab>
            ))}
          </TabList>
          {sections.map((sec) => (
            <TabPanel key={sec.key} value={sec.key} className={s.panel}>
              <SectionViewer html={sec.content ? sanitizeSectionHtml(sec.content) : null} />
            </TabPanel>
          ))}
        </Tabs>
      </div>
    </ResponsiveOverlay>
  ));
}
