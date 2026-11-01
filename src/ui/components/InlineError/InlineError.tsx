import type { ReactNode } from 'react';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { Button } from '../Button/Button';

export type InlineErrorProps = {
  /** 안내 문구. 기본 "불러오지 못했어요." — 무엇인지 밝히려면 `'주문 목록을 불러오지 못했어요.'` */
  message?: ReactNode;
  /** [다시 시도]. 없으면 버튼 없이 문구만 */
  onRetry?: () => void;
  retryLabel?: string;
  /**
   * column(기본) — 문구 위, 버튼 아래, 가운데 정렬(목록·카드 자리 전체가 실패했을 때).
   * row — 한 줄(문구 + 버튼, 좁으면 줄바꿈)로 표·섹션 머리 아래에 둘 때
   */
  layout?: 'column' | 'row';
  className?: string;
};

/**
 * "불러오지 못했어요 + 다시 시도" 한 덩어리(코드 패턴 점검 A7, 2026-11-02). 화면마다 손으로 그리지 않는다.
 * 모양은 지역 fallback `DefaultErrorFallback`(`ErrorBoundary`)과 맞춘다 — 보조 글자색 `bodyMd` + secondary 버튼.
 * 경계로 잡히지 않는 실패(무한 목록 첫 페이지 `status: 'error'`, 보조 조회 실패, 상세 오버레이 안)에 쓴다.
 * 디자인이 없어 DS로만 그린다(EmptyState 문구 규칙).
 */
export function InlineError({
  message = '불러오지 못했어요.',
  onRetry,
  retryLabel = '다시 시도',
  layout = 'column',
  className,
}: InlineErrorProps) {
  const row = layout === 'row';
  return (
    <div role="alert" className={className}>
      <Flex
        direction={row ? 'row' : 'column'}
        align="center"
        justify={row ? 'flex-start' : 'center'}
        gap={row ? 2 : 3}
        wrap={row}
        paddingY={row ? undefined : 6}
      >
        <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
          {message}
        </Txt>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </Flex>
    </div>
  );
}
