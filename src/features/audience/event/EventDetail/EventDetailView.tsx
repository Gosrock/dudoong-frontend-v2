'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useEventContacts } from '../model/useEventContacts';
import { useEventDetail } from '../model/useEventDetail';

/**
 * 공연 상세 — P5b-L 최소 시맨틱 마크업. 스타일·탭 UI·문의 시트·공유 버튼·포스터는 V에서 바꾼다(plan §0).
 * 재고(GP-5)는 읽지 않는다 — 응답 HTML에 재고 값이 없어야 한다.
 * 문의처는 [연락처 보기]를 열 때만 그린다(V의 연락처 시트 자리). 로그인 사용자는 이때 원문을 쿠키로 다시 읽는다(`useEventContacts`).
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  const { event, title, schedule, hashtags, tabs } = useEventDetail(eventId);
  const [contactsOpen, setContactsOpen] = useState(false);
  const contacts = useEventContacts(eventId, { open: contactsOpen });
  const place = event.place;

  return (
    <main>
      <article>
        <header>
          <h1>{title}</h1>
          {hashtags.length > 0 && (
            <ul aria-label="해시태그">
              {hashtags.map((tag) => (
                <li key={tag.tagId}>{tag.label}</li>
              ))}
            </ul>
          )}
        </header>

        <dl>
          {schedule && (
            <>
              <dt>일시</dt>
              <dd>{schedule.label}</dd>
            </>
          )}
          {place?.name && (
            <>
              <dt>장소</dt>
              <dd>
                {place.name}
                {place.address &&
                  ` (${[place.address, place.detailAddress].filter(Boolean).join(' ')})`}
              </dd>
            </>
          )}
          <dt>호스트</dt>
          <dd>
            <Link href={`/hosts/${event.host.hostId}`}>{event.host.name ?? '호스트'}</Link>
          </dd>
        </dl>

        {contacts.items.length > 0 && (
          <section aria-labelledby="event-contacts">
            <h2 id="event-contacts">문의</h2>
            <button
              type="button"
              aria-expanded={contactsOpen}
              aria-controls="event-contacts-list"
              onClick={() => setContactsOpen((v) => !v)}
            >
              연락처 보기
            </button>
            {contactsOpen && (
              <div id="event-contacts-list" aria-busy={contacts.status === 'pending'}>
                {contacts.status === 'error' && (
                  <button type="button" onClick={contacts.retry}>
                    다시 시도
                  </button>
                )}
                {contacts.status === 'ready' && (
                  <ul aria-label="연락처">
                    {contacts.items.map((c, i) => (
                      <li key={`${c.type}-${i}`}>
                        {c.label}:{' '}
                        {c.href ? (
                          <a
                            href={c.href}
                            {...(c.external
                              ? { target: '_blank', rel: 'noopener noreferrer' }
                              : {})}
                          >
                            {c.value}
                          </a>
                        ) : (
                          c.value
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {tabs.map((tab) => (
          <section key={tab.key} aria-labelledby={tab.key}>
            <h2 id={tab.key}>{tab.title}</h2>
            {tab.html ? (
              // sanitize를 거친 HTML(features/shared/section-viewer)
              <div dangerouslySetInnerHTML={{ __html: tab.html }} />
            ) : (
              <p>아직 등록된 내용이 없어요</p>
            )}
          </section>
        ))}
      </article>
    </main>
  );
}
