'use client';

import Link from 'next/link';

import { useEventDetail } from '../model/useEventDetail';

/**
 * 공연 상세 — P5b-L 최소 시맨틱 마크업. 스타일·탭 UI·문의 시트·공유 버튼·포스터는 V에서 바꾼다(plan §0).
 * 재고(GP-5)는 읽지 않는다 — 응답 HTML에 재고 값이 없어야 한다.
 */
export function EventDetailView({ eventId }: { eventId: string }) {
  const { event, title, schedule, hashtags, contacts, tabs } = useEventDetail(eventId);
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

        {contacts.length > 0 && (
          <section aria-labelledby="event-contacts">
            <h2 id="event-contacts">문의</h2>
            <ul>
              {contacts.map((c, i) => (
                <li key={`${c.type}-${i}`}>
                  {c.label}:{' '}
                  {c.href ? (
                    <a
                      href={c.href}
                      {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {c.value}
                    </a>
                  ) : (
                    c.value
                  )}
                </li>
              ))}
            </ul>
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
