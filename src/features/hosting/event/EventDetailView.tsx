'use client';

import { overlay } from 'overlay-kit';
import { useId, useState } from 'react';

import { EVENT_SECTION_TITLE_MAX } from '@/api/event/schema';
import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import {
  EditorBottomBar,
  FieldError,
  useLeaveGuard,
} from '@/features/hosting/shared/ui/EditorParts';
import { sanitizeSectionHtml } from '@/features/shared/section-viewer/model/sanitize-section-html';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { NumberingButton } from '@/ui/components/Counter/Counter';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Input } from '@/ui/components/Input/Input';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventDetailView.css';
import { useEventSections } from './model/useEventSections';
import { SavedNotice } from './ui/SavedNotice';
import { SectionEditor } from './ui/SectionEditor';

type Form = ReturnType<typeof useEventSections>;

/**
 * `/hosting/events/[eventId]/detail` 상세 정보 — GUI Ready 모바일 `767:39585` · PC `767:39645`(1440).
 * 제목 + 안내 → 밑줄형 탭(DS `tab item` 모바일/데스크탑 + `numbering` + 탭 추가) → 본문 에디터(Tiptap) → 하단 고정 바 [미리보기][저장하기].
 * 저장은 **전체 교체**(PE-6) — 뺀 탭은 저장하면 공연 상세에서도 사라진다(안내 문구). 탭 이름 편집·삭제·에디터 툴바·10개 제한은 Figma에 없다.
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

  const remove = (key: string, title: string) =>
    void openConfirm({
      title: `'${title || '이름 없는 탭'}' 탭을 뺄까요?`,
      description: '저장하면 공연 상세에서도 이 탭이 사라져요.',
      confirmLabel: '빼기',
    }).then((ok) => {
      if (ok) tabs.remove(key);
    });

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
                    return (
                      <Tab
                        key={sec.key}
                        value={sec.key}
                        data-testid="section"
                        data-invalid={error?.title || error?.content ? 'true' : undefined}
                      >
                        {sec.title || '새 탭'}
                      </Tab>
                    );
                  })}
                </TabList>
                {tabs.canAdd && <NumberingButton icon="plus" aria-label="탭 추가" onClick={add} />}
              </div>
              {form.sections.map((sec, i) => {
                const error = status.attempted ? form.errors[sec.key] : undefined;
                return (
                  <TabPanel key={sec.key} value={sec.key} className={s.panel}>
                    {!readOnly && (
                      <Flex align="flex-start" gap={2}>
                        <Input
                          className={s.titleInput}
                          aria-label={`탭 이름 ${i + 1}`}
                          placeholder="탭 이름"
                          maxLength={EVENT_SECTION_TITLE_MAX}
                          error={error?.title ?? undefined}
                          {...form.form.register(`sections.${i}.title`)}
                        />
                        {tabs.canRemove && (
                          <Button variant="secondary" onClick={() => remove(sec.key, sec.title)}>
                            탭 빼기
                          </Button>
                        )}
                      </Flex>
                    )}
                    <SectionEditor
                      key={sec.key}
                      label={`${sec.title || '새 탭'} 본문`}
                      content={sec.content}
                      readOnly={readOnly}
                      onChange={(html) => tabs.setContent(sec.key, html)}
                      uploadImage={form.image.upload}
                      uploading={form.image.uploading}
                    />
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
