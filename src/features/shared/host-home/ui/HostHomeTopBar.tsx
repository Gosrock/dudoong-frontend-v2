'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type RefObject, useEffect, useState } from 'react';

import { SHELL_IMMERSIVE_ATTR } from '@/features/shared/shell/shell.css';
import { Header } from '@/ui/components/Header/Header';
import { iconButton } from '@/ui/components/Header/Header.css';
import { useActivityMarker } from '@/ui/hooks/useActivityMarker';
import { Icon } from '@/ui/icons/Icon';
import { HEADER_HEIGHT } from '@/ui/theme/bars';

import * as s from './HostHomeTopBar.css';

/** 뒤로가기 — 기록이 있으면 history, 새 탭으로 바로 열었으면 `/` */
function useBack() {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.replace('/');
  };
}

/**
 * 커버 위 흰 원 44 [←] · [⚙](GUI 직접 그림 `1452:40993` · `1452:40991`, 모바일만). 커버 안에 있어 커버와 같이 스크롤된다 —
 * 셸 공지 배너가 있어도 겹치지 않는다. [⚙]는 `settingsHref`가 있을 때만(매니저 이상, `can` — 훅).
 */
export function HostCoverButtons({ settingsHref }: { settingsHref?: string }) {
  const back = useBack();
  return (
    <div className={s.floating}>
      <button type="button" className={s.circle} aria-label="뒤로 가기" onClick={back}>
        <Icon name="backward" />
      </button>
      {settingsHref && (
        <Link href={settingsHref} aria-label="설정" className={s.circle}>
          <Icon name="settings" />
        </Link>
      )}
    </div>
  );
}

/**
 * 호스트 홈 모바일 상단 바(1024 미만만 — PC는 셸 상단 바). 셸 로고 헤더와 그 자리를 숨기고(`SHELL_IMMERSIVE_ATTR`) 커버가 화면 맨 위에서
 * 시작한다. 커버(`watchRef`)가 바 높이(64) 밑으로 다 지나가면 흰 DS Top app bar `Title+Backward` — ← 이름 ⚙(GUI `741:31030`
 * "스크롤 올리면")가 위에 고정된다. 하이드레이션 뒤 관찰한다(서버 HTML은 바 없음 — 커버 상태).
 */
export function HostHomeTopBar({
  title,
  settingsHref,
  watchRef,
}: {
  title: string;
  settingsHref?: string;
  watchRef: RefObject<HTMLElement | null>;
}) {
  const ref = useActivityMarker<HTMLDivElement>();
  const back = useBack();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const el = watchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSolid(entry ? !entry.isIntersecting : false),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [watchRef]);

  return (
    <div
      ref={ref}
      className={s.bar}
      data-solid={solid || undefined}
      {...{ [SHELL_IMMERSIVE_ATTR]: '' }}
    >
      {solid && (
        <Header
          title={title}
          // 화면 제목(h1)은 본문 이름이 갖는다 — 바의 이름은 글자만
          titleAs="div"
          align="center"
          onBack={back}
          trailing={
            settingsHref && (
              <Link href={settingsHref} aria-label="설정" className={iconButton}>
                <Icon name="settings" />
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
