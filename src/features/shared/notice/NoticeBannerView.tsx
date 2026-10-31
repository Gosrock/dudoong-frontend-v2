'use client';

import Link from 'next/link';

import type { NoticeAudience } from '@/api/notice/schema';
import { HeaderIconButton } from '@/ui/components/Header/Header';
import { useIsClient } from '@/ui/hooks/useIsClient';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Txt } from '@/ui/primitives/Txt';

import { useNoticeBanner } from './model/useNoticeBanner';
import * as s from './NoticeBannerView.css';

/**
 * 셸 상단 배너 한 줄(P9c-V — 관객 셸 · 호스팅 셸이 헤더 바로 아래에 둔다). **디자인 없음**(design-requests Q44 기본안
 * "상단 배너 한 줄 + 닫기"). DS 토큰·컴포넌트로만: 회색 띠 / `update` 아이콘 · 제목 한 줄 말줄임(누르면 상세) · [닫기 ×].
 * 배너가 없거나(조회 중·실패 포함) 모두 닫았으면 아무것도 그리지 않는다.
 * 마운트 뒤에만 그린다 — 훅이 지금 시각(`new Date()`)과 이 브라우저의 닫기 기록을 읽어서, 셸(모든 화면)의 프리렌더에서 부르면
 * Cache Components가 막는다. 서버 HTML에는 배너 자리가 없다(조회 뒤에 끼어드는 것과 같다).
 */
export function NoticeBannerView({ audience }: { audience: NoticeAudience }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <NoticeBanner audience={audience} />;
}

function NoticeBanner({ audience }: { audience: NoticeAudience }) {
  const { banner, dismiss } = useNoticeBanner(audience);
  if (!banner) return null;
  return (
    <aside aria-label="공지 배너" data-testid="notice-banner" className={s.bar}>
      <Container className={s.inner}>
        <Link href={banner.href} className={s.link}>
          <span className={s.icon} aria-hidden>
            <Icon name="update" />
          </span>
          <Txt typography="labelMd" lines={1} className={s.text}>
            {banner.title}
          </Txt>
        </Link>
        <HeaderIconButton
          aria-label="배너 닫기"
          icon={<Icon name="close" />}
          onClick={dismiss}
          className={s.close}
        />
      </Container>
    </aside>
  );
}
