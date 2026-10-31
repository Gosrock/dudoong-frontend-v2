'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useId, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { EVENT_SECTION_TITLE_MAX } from '@/api/event/schema';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { sanitizeSectionHtml } from '@/features/shared/section-viewer/model/sanitize-section-html';
import { SectionViewer } from '@/features/shared/section-viewer/ui/SectionViewer';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { NumberingButton } from '@/ui/components/Counter/Counter';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Input } from '@/ui/components/Input/Input';
import { Popup } from '@/ui/components/Popup/Popup';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { toast } from '@/ui/components/Toast/Toast';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EventDetailView.css';
import { REGISTERED_SAVED_DESCRIPTION, REGISTERED_SAVED_TITLE } from './EventInfoView';
import { useEventSections } from './model/useEventSections';
import { EditorBottomBar, FieldError, useLeaveGuard } from './ui/EditorParts';
import { SectionEditor } from './ui/SectionEditor';

type Form = ReturnType<typeof useEventSections>;

/**
 * `/hosting/events/[eventId]/detail` 상세 정보 — GUI Ready 모바일 `767:39585` · PC `767:39645`(1440).
 * 제목 + 안내 → 밑줄형 탭(DS `tab item` 모바일/데스크탑 + `numbering` + 탭 추가) → 본문 에디터(Tiptap) → 하단 고정 바 [미리보기][저장하기].
 * 저장은 **전체 교체**(PE-6) — 뺀 탭은 저장하면 공연 상세에서도 사라진다(안내 문구). 탭 이름 편집·삭제·에디터 툴바·10개 제한은 Figma에 없다.
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <EventDetail eventId={eventId} />
    </AsyncBoundary>
  );
}

function EventDetail({ eventId }: { eventId: string }) {
  const f = useEventSections(eventId);
  const formId = useId();
  const readOnly = !f.canEdit;
  const [active, setActive] = useState(f.sections[0]?.key ?? '');
  // 지운 탭이 고른 탭이었으면 첫 탭으로
  const current = f.sections.find((x) => x.key === active) ?? f.sections[0];
  useLeaveGuard(f.canEdit && f.dirty);
  useSavedToast(f);

  const [pendingSelect, setPendingSelect] = useState<Set<string> | null>(null);
  const add = () => {
    const before = new Set(f.sections.map((x) => x.key));
    f.addSection();
    // 새 탭은 다음 렌더에 생긴다 — 그 키를 고른다
    setPendingSelect(before);
  };
  if (pendingSelect) {
    const added = f.sections.find((x) => !pendingSelect.has(x.key));
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
      if (ok) f.removeSection(key);
    });

  return (
    <section aria-labelledby="detail-title" className={s.page}>
      <div className={s.body}>
        <div className={s.head}>
          <h1 id="detail-title" className={s.desktopTitle}>
            <Txt typography="headingLgEmphasized">상세 정보</Txt>
          </h1>
          <Txt as="p" typography="bodyMd" className={s.description}>
            {'공연 상세 내용을 적어주세요.\n이미지는 드래그 앤 드롭으로도 첨부 가능해요.'}
          </Txt>
        </div>
        {f.formError && (
          <p role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              {f.formError}
            </Txt>
          </p>
        )}
        <form
          id={formId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void f.save();
          }}
        >
          {current && (
            <Tabs value={current.key} onValueChange={setActive}>
              <div className={s.tabRow}>
                <TabList size="responsive" aria-label="상세 정보 탭" className={s.tabList}>
                  {f.sections.map((sec) => {
                    const error = f.attempted ? f.errors[sec.key] : undefined;
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
                {f.canAddSection && (
                  <NumberingButton icon="plus" aria-label="탭 추가" onClick={add} />
                )}
              </div>
              {f.sections.map((sec, i) => {
                const error = f.attempted ? f.errors[sec.key] : undefined;
                return (
                  <TabPanel key={sec.key} value={sec.key} className={s.panel}>
                    {!readOnly && (
                      <div className={s.titleRow}>
                        <Input
                          className={s.titleInput}
                          aria-label={`탭 이름 ${i + 1}`}
                          placeholder="탭 이름"
                          maxLength={EVENT_SECTION_TITLE_MAX}
                          value={sec.title}
                          onChange={(e) => f.setTitle(sec.key, e.target.value)}
                          error={error?.title ?? undefined}
                        />
                        {f.canRemoveSection && (
                          <Button variant="secondary" onClick={() => remove(sec.key, sec.title)}>
                            탭 빼기
                          </Button>
                        )}
                      </div>
                    )}
                    <SectionEditor
                      key={sec.key}
                      label={`${sec.title || '새 탭'} 본문`}
                      content={sec.content}
                      readOnly={readOnly}
                      onChange={(html) => f.setContent(sec.key, html)}
                      uploadImage={f.uploadSectionImage}
                      uploading={f.imageUploading}
                    />
                    <FieldError>{error?.content}</FieldError>
                  </TabPanel>
                );
              })}
            </Tabs>
          )}
          <FieldError>{f.imageError}</FieldError>
        </form>
      </div>
      {f.canEdit && (
        <EditorBottomBar
          formId={formId}
          canPreview={f.canPreview}
          onPreview={() => openSectionsPreview(f.sections)}
          canSave={f.canSave}
          saving={f.saving}
        />
      )}
      <Popup
        open={f.savedNotice === 'registeredChanged'}
        onOpenChange={(o) => !o && f.dismissSavedNotice()}
        title={REGISTERED_SAVED_TITLE}
        description={REGISTERED_SAVED_DESCRIPTION}
        cancelLabel={null}
        onConfirm={f.dismissSavedNotice}
      />
    </section>
  );
}

function useSavedToast(f: Form) {
  const { savedNotice, dismissSavedNotice } = f;
  useEffect(() => {
    if (savedNotice !== 'saved') return;
    toast('저장했어요', { id: 'event-saved' });
    dismissSavedNotice();
  }, [savedNotice, dismissSavedNotice]);
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
