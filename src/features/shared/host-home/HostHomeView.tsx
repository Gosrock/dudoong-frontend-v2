'use client';

import Link from 'next/link';

import { LoginRequiredLink } from '@/features/shared/auth/LoginRequiredLink';

import { useHostHome } from './model/useHostHome';

const MANAGE_LABEL = { settings: '설정', members: '멤버', newEvent: '새 공연 만들기' } as const;

/**
 * 호스트 홈(GH-3 + GH-14) — L 단계의 최소 마크업. 배너·로고·연락처 아이콘·아바타 줄·카드 모양은 P5c-V.
 */
export function HostHomeView({ hostId }: { hostId: string }) {
  const s = useHostHome(hostId);
  const { follow } = s;
  return (
    <main>
      <h1>{s.host.name ?? '이름 없는 호스트'}</h1>
      {s.host.introduce && <p>{s.host.introduce}</p>}
      <p>
        멤버 {s.memberCount}명{s.createdOn && ` · ${s.createdOn} 개설`}
      </p>
      <ul aria-label="연락처">
        {s.contacts.map((c, i) => (
          <li key={i}>{c.href ? <a href={c.href}>{c.label}</a> : `${c.label} ${c.value}`}</li>
        ))}
      </ul>
      {follow.status === 'login' ? (
        <LoginRequiredLink aria-label="관심 호스트">♡</LoginRequiredLink>
      ) : (
        <button
          type="button"
          aria-label="관심 호스트"
          aria-pressed={follow.isFollowing}
          disabled={follow.status === 'disabled'}
          onClick={follow.status === 'ready' ? follow.toggle : undefined}
        >
          {follow.isFollowing ? '♥' : '♡'}
        </button>
      )}
      {s.manage.status === 'ready' && s.manage.actions.length > 0 && (
        <nav aria-label="호스트 관리">
          {s.manage.actions.map((a) => (
            <Link key={a.key} href={a.href}>
              {MANAGE_LABEL[a.key]}
            </Link>
          ))}
        </nav>
      )}
      {s.members && (
        <ul aria-label="멤버">
          {s.members.map((m) => (
            <li key={m.userId}>{m.name ?? '이름 없음'}</li>
          ))}
        </ul>
      )}
      <section aria-label="공연" aria-busy={s.events.status === 'pending'}>
        {s.events.status === 'empty' && <p>두둥! 등록한 공연이 없습니다.</p>}
        {s.events.status === 'error' && (
          <button type="button" onClick={s.events.retry}>
            다시 시도
          </button>
        )}
        <ul>
          {s.events.items.map(({ event, href, isPreparing }) => (
            <li key={event.eventId}>
              <Link href={href}>{event.name ?? '이름 없는 공연'}</Link>
              {isPreparing && <span> 준비중</span>}
            </li>
          ))}
        </ul>
        {s.events.nextPageError ? (
          <button type="button" onClick={s.events.retry}>
            다시 시도
          </button>
        ) : (
          s.events.hasNextPage && (
            <button type="button" onClick={s.events.loadMore}>
              더 보기
            </button>
          )
        )}
      </section>
    </main>
  );
}
