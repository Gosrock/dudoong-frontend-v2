'use client';

import type { ReactNode } from 'react';

import { Illustration, type IllustrationName } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './GiftResult.css';

/**
 * 선물 결과·상태 화면(일러스트 170 + 제목 `Heading/lg-emphasized` + 설명 `Label/md` + 아래 칸).
 * GUI 링크 생성 완료 `908:13105`(아래 칸: 메모 · 공유 버튼) · 취소 완료 `908:21359` · 반송 완료 `908:23165` ·
 * 거절 완료 `939:26992` · 취소된 선물 `939:27058` · 비로그인 `939:26412`이 같은 틀이다(간격 24 · 제목/설명 8).
 * 디자인이 없는 랜딩 상태(이미 받음 등)도 이 틀에 문구만 바꿔 그린다(design-requests §1 기본안).
 */
export function GiftResult({
  illustration,
  title,
  description,
  children,
  actions,
  as = 'main',
  tall = false,
  ...rest
}: {
  illustration: IllustrationName;
  /** 없으면 설명만(비로그인 `939:26412`) */
  title?: ReactNode;
  description?: ReactNode;
  /** 버튼 위 칸(메모 · 공유 버튼, 에러 안내) */
  children?: ReactNode;
  /** 버튼 줄. 둘이면 같은 폭 */
  actions?: ReactNode;
  as?: 'main' | 'section' | 'div';
  /** 내용이 긴 화면(링크 생성 완료) — 위 여백을 줄인다 */
  tall?: boolean;
  'aria-label'?: string;
  'data-view-state'?: string;
  'data-testid'?: string;
}) {
  const Root = as;
  return (
    <Root className={tall ? `${s.page} ${s.pageTall}` : s.page} {...rest}>
      <Flex direction="column" align="center" gap={5} className={s.content}>
        <Illustration name={illustration} width={illustration === 'login' ? 170 : undefined} />
        {(title || description) && (
          <Flex direction="column" align="center" gap={2} fullWidth>
            {title && (
              <Txt
                as="h1"
                typography="headingLgEmphasized"
                color={colors.textPrimaryLabel}
                align="center"
              >
                {title}
              </Txt>
            )}
            {description && (
              <Txt as="p" typography="labelMd" color={colors.textSecondaryLabel} align="center">
                {description}
              </Txt>
            )}
          </Flex>
        )}
        {(children || actions) && (
          <Flex direction="column" gap={3} fullWidth>
            {children}
            {actions && <div className={s.actions}>{actions}</div>}
          </Flex>
        )}
      </Flex>
    </Root>
  );
}
