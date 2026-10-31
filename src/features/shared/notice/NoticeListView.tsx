'use client';

import Link from 'next/link';

import type { NoticeAudience } from '@/api/notice/schema';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Chip } from '@/ui/components/Chip/Chip';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { LoadMoreSentinel } from '@/ui/components/LoadMoreSentinel/LoadMoreSentinel';
import { Icon } from '@/ui/icons/Icon';
import { Container } from '@/ui/primitives/Container';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { NoticeRow } from './model/notice-rules';
import { useNoticeList } from './model/useNoticeList';
import { noticeDateText } from './notice-format';
import * as s from './NoticeListView.css';

/**
 * 공지 목록(`/notices` · `/hosting/notices`, P9c-V) — **디자인 없음**(GUI·와이어 모두 없음, design-requests Q44 기본안).
 * DS 토큰·컴포넌트로만(design-workflow §3): 제목 "공지사항" / 행(고정 칩 · 제목 한 줄 말줄임 · 날짜 · ›) / 하단 자동 다음 페이지.
 * 관객 모바일은 셸 하위 헤더(`AudienceSubHeader` "공지사항")가 제목을 보여 주므로 h1 글자를 숨긴다(문서 구조에는 남김).
 */
export function NoticeListView({ audience }: { audience: NoticeAudience }) {
  return (
    <main>
      <Container className={s.page}>
        <Txt
          as="h1"
          typography="headingMdEmphasized"
          className={audience === 'USER' ? s.titleDesktopOnly : s.title}
        >
          공지사항
        </Txt>
        <AsyncBoundary>
          <NoticeListContent audience={audience} />
        </AsyncBoundary>
      </Container>
    </main>
  );
}

function NoticeListContent({ audience }: { audience: NoticeAudience }) {
  const list = useNoticeList(audience);
  return (
    <>
      {list.empty ? (
        <EmptyState className={s.empty} description="아직 공지사항이 없어요" />
      ) : (
        <ul aria-label="공지 목록" className={s.list}>
          {list.items.map((item) => (
            <NoticeListRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <LoadMoreSentinel
        list={{
          hasNextPage: list.hasNext,
          isFetchingNextPage: list.isFetchingNext,
          nextPageError: list.nextPageFailed,
          loadMore: list.fetchNext,
          retry: list.fetchNext,
        }}
      />
    </>
  );
}

function NoticeListRow({ item }: { item: NoticeRow }) {
  const date = noticeDateText(item.createdAt, 'date');
  return (
    <li
      className={s.item}
      data-testid="notice"
      data-pinned={item.pinned ? 'true' : 'false'}
      data-host-only={item.hostOnly ? 'true' : 'false'}
    >
      <Link href={item.href} className={s.row}>
        <span className={s.content}>
          {(item.pinned || item.hostOnly) && (
            <span className={s.chips}>
              {item.pinned && (
                <Chip color="violet" theme="weak">
                  고정
                </Chip>
              )}
              {item.hostOnly && <Chip>공연준비</Chip>}
            </span>
          )}
          {/* 긴 제목은 한 줄 말줄임(plan P9c 완료 기준 V). 전체 제목은 상세에서 */}
          <Txt
            typography={item.pinned ? 'labelLgEmphasized' : 'labelLg'}
            lines={1}
            className={s.rowTitle}
          >
            {item.title}
          </Txt>
          {date && (
            <Txt as="time" typography="labelSm" color={colors.textTertiaryLabel}>
              {date}
            </Txt>
          )}
        </span>
        <span className={s.chevron} aria-hidden>
          <Icon name="chevron-right" />
        </span>
      </Link>
    </li>
  );
}
