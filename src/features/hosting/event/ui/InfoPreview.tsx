'use client';

import { overlay } from 'overlay-kit';

import type { TagGroup } from '@/api/event/schema';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';

import type { BasicInfoValues } from '../model/basic-info-form';
import * as s from './InfoPreview.css';

/**
 * [미리보기] — 디자인 없음. 지금 칸 값(저장 전)으로 관객 공연 상세의 머리 정보(포스터 · 이름 · 일시 · 장소 · 태그)를 보여 준다.
 * 저장할 수 있을 때만 열린다(`canPreview`)
 */
export function openInfoPreview(v: BasicInfoValues, tagGroups: readonly TagGroup[]) {
  const tagNames = tagGroups
    .flatMap((g) => g.tags)
    .filter((t) => v.tagIds.includes(t.tagId))
    .map((t) => `#${t.name}`)
    .join(' ');
  const rows: [string, string][] = [
    ['일자', v.schedule.date],
    ['시간', v.schedule.startTime ? `${v.schedule.startTime} ~ ${v.schedule.endTime}` : ''],
    ['장소', [v.place.name, v.place.address, v.place.detailAddress].filter(Boolean).join(' · ')],
    ['태그', tagNames],
  ];
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="미리보기"
    >
      <div className={s.preview} data-testid="info-preview">
        {v.poster.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.previewPoster} src={v.poster.url} alt="포스터" />
        ) : (
          <Illustration name="poster-placeholder" width={180} className={s.previewPoster} />
        )}
        <Txt as="p" typography="title">
          {v.name}
        </Txt>
        <dl className={s.previewFacts}>
          {rows
            .filter(([, value]) => value)
            .map(([k, value]) => (
              <Flex key={k} gap={3}>
                <Txt as="dt" typography="headingSmEmphasized">
                  {k}
                </Txt>
                <Txt as="dd" typography="headingSm" className={s.previewValue}>
                  {value}
                </Txt>
              </Flex>
            ))}
        </dl>
      </div>
    </ResponsiveOverlay>
  ));
}
