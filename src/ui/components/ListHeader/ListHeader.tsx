import type { ElementType, ReactNode } from 'react';

import { Flex } from '../../primitives/Flex';
import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import type { SpaceKey } from '../../theme/types';

export type ListHeaderProps = {
  title: ReactNode;
  /** 제목 태그(문서 구조용). 기본 h2 */
  as?: ElementType;
  /** 제목 아래 보조 글 */
  description?: ReactNode;
  /** 오른쪽 액션 — "더보기" 링크·버튼 등 */
  action?: ReactNode;
  /** 좌우 여백 토큰. 기본 0(부모 Container가 여백을 준다) */
  paddingX?: SpaceKey;
};

/**
 * 섹션 제목 + 오른쪽 액션. Figma에 컴포넌트가 없어(design-system §3 "없는 컴포넌트") GUI의 섹션 제목 모양
 * (Heading/sm emphasized)으로 프리미티브만 조합했다. 훅이 없어 서버 컴포넌트에서도 쓴다.
 */
export function ListHeader({
  title,
  as = 'h2',
  description,
  action,
  paddingX = 0,
}: ListHeaderProps) {
  return (
    <Flex justify="space-between" align="center" gap={3} paddingX={paddingX} fullWidth>
      <Flex direction="column" gap={1}>
        <Txt as={as} typography="headingSmEmphasized">
          {title}
        </Txt>
        {description ? (
          <Txt typography="bodySm" color={colors.textSecondary}>
            {description}
          </Txt>
        ) : null}
      </Flex>
      {action}
    </Flex>
  );
}
