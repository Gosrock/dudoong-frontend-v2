import type { Contact } from '@/api/shared/common-schema';
import type { SessionState } from '@/features/shared/auth/useSession';

import { type ContactLink, contactLink } from './contact-link';

/**
 * 연락처는 사용자별 값이다(백엔드 #822/#846). GP-3·GH-3은 비로그인 요청이면 전화·이메일을 가려 주고 로그인 요청이면 원문을 준다.
 * 서버 조회(`<Prefetch>`)와 공개 쿼리는 쿠키가 없어 언제나 가린 값이다. 로그인 사용자의 원문은 같은 엔드포인트를 쿠키와 함께
 * 부르는 viewer 쿼리에서 꺼낸다(tech-decisions §4, patterns §4-2).
 *
 * - `idle` — 아직 요청하지 않았다(공연 상세: 연락처를 열기 전). `items`는 공개 값
 * - `pending` — 세션 확정 전이거나 viewer 조회 중. `items`는 공개 값
 * - `ready` — 확정. 익명이면 공개 값(가린 값), 로그인이면 viewer 값(원문)
 * - `error` — 세션 확인 또는 viewer 조회 실패. `items`는 공개 값, `retry`로 다시
 *
 * `masked`는 지금 `items`에 가린 값이 있는지다(값 기준 — 만료 토큰이라 백엔드가 익명으로 답한 viewer 응답도 잡는다).
 * 문구("로그인하면 볼 수 있어요" 등)는 만들지 않는다 — 디자인 질문.
 */
export type ContactsStatus = 'idle' | 'pending' | 'ready' | 'error';

export type ContactsState = {
  status: ContactsStatus;
  items: ContactLink[];
  masked: boolean;
};

export type ResolveContactsInput = {
  /** 공개 쿼리(쿠키 없음) 값 — 비로그인 기준이라 가린 값일 수 있다 */
  publicContacts: readonly Contact[];
  session: SessionState['status'];
  /** viewer 조회를 요청했는지(공연 상세는 연락처를 열 때, 호스트 홈은 세션이 있으면 늘) */
  requested: boolean;
  viewer: { contacts: readonly Contact[] | undefined; isError: boolean };
};

export function resolveContacts(input: ResolveContactsInput): ContactsState {
  const { publicContacts, session, requested, viewer } = input;
  const status: ContactsStatus = (() => {
    if (session === 'anonymous') return 'ready';
    if (session === 'session' && viewer.contacts) return 'ready';
    if (!requested) return 'idle';
    if (session === 'error') return 'error';
    if (session === 'session' && viewer.isError) return 'error';
    return 'pending';
  })();
  const source =
    session === 'session' && viewer.contacts !== undefined ? viewer.contacts : publicContacts;
  const items = source.map(contactLink);
  return { status, items, masked: items.some((c) => c.masked) };
}
