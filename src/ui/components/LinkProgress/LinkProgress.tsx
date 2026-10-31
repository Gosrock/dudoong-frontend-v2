'use client';

import { useLinkStatus } from 'next/link';

import { Spinner } from '../Loader/Loader';
import * as s from './LinkProgress.css';

export type LinkProgressProps = {
  /** sm 16 · md 24. 자리를 늘 차지한다 */
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * 카드 `<Link>` 안에 두는 이동 표시(tech-decisions §3). `useLinkStatus`는 `<Link>`의 하위에서만 동작하고,
 * 프리페치가 끝난 경로는 pending을 건너뛴다 — 그래서 전역 진행 막대가 아니라 링크마다 둔다.
 *
 * ```tsx
 * <Link href={`/events/${id}`}>
 *   <Poster /> <Title /> <LinkProgress />
 * </Link>
 * ```
 */
export function LinkProgress(props: LinkProgressProps) {
  const { pending } = useLinkStatus();
  return <LinkProgressIndicator pending={pending} {...props} />;
}

/** 표시만(스토리·테스트용). 화면은 LinkProgress를 쓴다 */
export function LinkProgressIndicator({
  pending,
  size = 'sm',
  className,
}: LinkProgressProps & { pending: boolean }) {
  return (
    <span
      aria-hidden
      data-pending={pending ? 'true' : undefined}
      className={[s.root, s.size[size], className].filter(Boolean).join(' ')}
    >
      {/* 대기 중일 때만 그린다 — 카드마다 도는 애니메이션을 두지 않는다. 자리는 바깥 span이 지킨다 */}
      {pending && <Spinner size={size} />}
    </span>
  );
}
