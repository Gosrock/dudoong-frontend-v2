'use client';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { useEventSections } from './model/useEventSections';

/**
 * `/hosting/events/[eventId]/detail` 상세 정보 — 스타일 없는 최소 마크업(P11-L). 탭·Tiptap 에디터·미리보기·저장 안내 팝업·이탈 확인은
 * P11-V. 본문은 HTML 글자 칸으로, 본문 이미지는 올린 주소를 본문 끝에 `<img>`로 붙이는 것으로 대신한다.
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary
      ignoreError={isSessionLost}
      rejected={HostingAccessRejected}
      resetKeys={[eventId]}
    >
      <EventDetail eventId={eventId} />
    </AsyncBoundary>
  );
}

function EventDetail({ eventId }: { eventId: string }) {
  const f = useEventSections(eventId);
  const readOnly = !f.canEdit;
  return (
    <section aria-labelledby="detail-title">
      <h1 id="detail-title">상세 정보</h1>
      {f.formError && <p role="alert">{f.formError}</p>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.save();
        }}
      >
        <ol>
          {f.sections.map((s, i) => {
            const error = f.errors[s.key];
            return (
              <li key={s.key} data-testid="section">
                <label>
                  탭 이름 {i + 1}
                  <input
                    value={s.title}
                    readOnly={readOnly}
                    onChange={(e) => f.setTitle(s.key, e.target.value)}
                  />
                </label>
                {f.attempted && error?.title && <span role="alert">{error.title}</span>}
                <label>
                  본문 {i + 1}
                  <textarea
                    value={s.content}
                    readOnly={readOnly}
                    onChange={(e) => f.setContent(s.key, e.target.value)}
                  />
                </label>
                {f.attempted && error?.content && <span role="alert">{error.content}</span>}
                {!readOnly && (
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-label={`본문 ${i + 1} 이미지 올리기`}
                    disabled={f.imageUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void f.uploadSectionImage(file).then((url) => {
                        if (url) f.setContent(s.key, `${s.content}<p><img src="${url}"></p>`);
                      });
                    }}
                  />
                )}
                {f.canRemoveSection && (
                  <button type="button" onClick={() => f.removeSection(s.key)}>
                    탭 삭제 {i + 1}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {f.imageError && <p role="alert">{f.imageError}</p>}
        {f.canAddSection && (
          <button type="button" onClick={f.addSection}>
            탭 추가
          </button>
        )}
        {f.canEdit && (
          <button type="submit" disabled={!f.canSave}>
            저장하기
          </button>
        )}
        {f.savedNotice === 'saved' && <p role="status">저장했어요</p>}
        {f.savedNotice === 'registeredChanged' && (
          <p role="status" data-testid="registered-saved-notice">
            저장했어요. 이미 예매한 관객에게는 바뀐 내용이 따로 알려지지 않아요.
          </p>
        )}
      </form>
    </section>
  );
}
