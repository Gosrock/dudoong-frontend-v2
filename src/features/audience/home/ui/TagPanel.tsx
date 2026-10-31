'use client';

import { Fragment } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { useEventList } from '../model/useEventList';
import * as s from './TagPanel.css';

type EventListState = ReturnType<typeof useEventList>;

/**
 * 태그 패널 내용(GUI `759:11869` "예매하기 - 태그선택" — 분류 4개 · 분류 사이 구분선 · 첫 분류 머리 오른쪽 "초기화").
 * 분류·태그는 GE-11 응답 순서대로 그린다(화면 값 아님, plan P5a). 칩을 누르면 바로 주소에 반영된다(L `toggleTag`).
 */
export function TagPanel({
  tags,
  onToggle,
  onReset,
}: {
  tags: EventListState['tags'];
  onToggle: (tagId: number) => void;
  onReset: () => void;
}) {
  if (tags.status === 'pending') {
    return (
      <div className={s.root}>
        <Flex justify="center" paddingY={4}>
          <Spinner label="태그를 불러오는 중" />
        </Flex>
      </div>
    );
  }
  if (tags.status === 'error') {
    return (
      <div className={s.root} role="alert">
        <Flex direction="column" align="center" gap={2} paddingY={2}>
          <Txt typography="bodySm" color={colors.textSecondary}>
            태그를 불러오지 못했어요.
          </Txt>
          <Button variant="secondary" size="sm" onClick={tags.retry}>
            다시 시도
          </Button>
        </Flex>
      </div>
    );
  }
  if (tags.groups.length === 0) {
    return (
      <div className={s.root}>
        <Txt typography="bodySm" color={colors.textSecondary}>
          고를 수 있는 태그가 없어요.
        </Txt>
      </div>
    );
  }
  return (
    <div className={s.root}>
      {tags.groups.map((g, i) => (
        <Fragment key={`${g.category}-${g.index}`}>
          {i > 0 && <Divider />}
          <div className={s.group} role="group" aria-label={g.label}>
            <div className={s.groupHead}>
              <Txt typography="labelSm" color={colors.textPrimary}>
                {g.label}
              </Txt>
              {i === 0 && (
                <button
                  type="button"
                  className={s.reset}
                  onClick={onReset}
                  disabled={tags.selectedCount === 0}
                  aria-label="태그 선택 초기화"
                >
                  <Txt typography="labelXs">초기화</Txt>
                </button>
              )}
            </div>
            <div className={s.tags}>
              {g.tags.map((t) => (
                <button
                  key={t.tagId}
                  type="button"
                  className={s.tag}
                  aria-pressed={t.selected}
                  onClick={() => onToggle(t.tagId)}
                >
                  <Txt typography="labelSm">{t.name}</Txt>
                </button>
              ))}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
