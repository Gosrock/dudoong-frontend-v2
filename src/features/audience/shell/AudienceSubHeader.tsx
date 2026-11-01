'use client';

import { useRouter } from 'next/navigation';

import { useActivityMarker } from '@/features/shared/shell/useActivityMarker';
import { Header } from '@/ui/components/Header/Header';

import * as s from './AudienceShell.css';

/**
 * 하위 화면의 모바일 헤더 — 뒤로가기 + 제목(와이어 `128:2772` 등. 햄버거 안에서 들어가는 화면은 전부 이 모양 — Tomato 09-27, 10-24 해결).
 * 페이지 맨 위에 둔다. 셸(`AudienceShell`)이 이 표시를 보고 로고 헤더를 숨긴다. PC(1024 이상)에서는 그리지 않는다(상단 바가 있다).
 * 뒤로가기는 기록이 있으면 history, 새 탭으로 바로 열었으면 `fallbackHref`.
 */
export function AudienceSubHeader({
  title,
  fallbackHref = '/',
}: {
  title: string;
  fallbackHref?: string;
}) {
  const router = useRouter();
  // 이동 뒤 숨은 Activity로 남아도 셸 로고 헤더를 숨기지 않게(fix-qa-1101)
  const ref = useActivityMarker<HTMLDivElement>();
  return (
    <div ref={ref} className={s.subHeader} {...{ [s.SUBHEADER_ATTR]: '' }}>
      <Header
        title={title}
        // 화면 제목(h1)은 페이지 본문이 갖는다 — 헤더 제목은 글자만(제목 중복 방지)
        titleAs="div"
        align="center"
        onBack={() => {
          // 기록이 있으면 뒤로, 새 탭으로 바로 열었으면(기록 1개) 정해 둔 곳으로
          if (window.history.length > 1) {
            router.back();
          } else {
            router.replace(fallbackHref);
          }
        }}
      />
    </div>
  );
}
