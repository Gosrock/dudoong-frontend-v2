'use client';

import type { HostContactType } from '@/api/host/schema';

import { contactPlaceholder } from './model/host-fields';
import { useCreateHost } from './model/useCreateHost';

/** `/hosting/new/hosts` 호스트 만들기 — 스타일 없는 최소 마크업(P10a-L). 드롭다운·글자 수·하단 버튼 바는 P10a-V */
export function CreateHostView() {
  const f = useCreateHost();
  const show = (error: string | null) =>
    f.attempted && error ? <span role="alert">{error}</span> : null;
  return (
    <main>
      <h1>새 호스트 만들기</h1>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
      >
        <label>
          호스트 이름
          <input value={f.values.name} onChange={(e) => f.setName(e.target.value)} />
        </label>
        {show(f.errors.name)}
        <label>
          소개
          <textarea value={f.values.introduce} onChange={(e) => f.setIntroduce(e.target.value)} />
        </label>
        {show(f.errors.introduce)}
        <fieldset>
          <legend>대표 연락처</legend>
          {f.values.contacts.map((c, i) => (
            <div key={i} data-testid="contact-row">
              <select
                aria-label={`연락처 유형 ${i + 1}`}
                value={c.type ?? ''}
                onChange={(e) => f.setContactType(i, e.target.value as HostContactType)}
              >
                <option value="" disabled>
                  유형 선택
                </option>
                {f.contactOptions.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`연락처 ${i + 1}`}
                value={c.value}
                placeholder={contactPlaceholder(c.type) ?? undefined}
                onChange={(e) => f.setContactValue(i, e.target.value)}
              />
              {f.canRemoveContact && (
                <button type="button" onClick={() => f.removeContact(i)}>
                  삭제
                </button>
              )}
              {show(f.errors.contacts[i] ?? null)}
            </div>
          ))}
          {f.contactsServerError && <p role="alert">{f.contactsServerError}</p>}
          {f.canAddContact && (
            <button type="button" onClick={f.addContact}>
              연락처 추가
            </button>
          )}
        </fieldset>
        <button type="submit" disabled={f.submitting}>
          만들기
        </button>
      </form>
    </main>
  );
}
