import type { CSSProperties, ElementType, ReactNode } from 'react';

import { sprinkles } from '../theme/sprinkles.css';
import type { FlexAlign, FlexDirection, FlexJustify, Responsive, SpaceKey } from '../theme/types';

export type FlexProps = {
  as?: ElementType;
  direction?: Responsive<FlexDirection>;
  align?: Responsive<FlexAlign>;
  justify?: Responsive<FlexJustify>;
  wrap?: boolean;
  gap?: Responsive<SpaceKey>;
  padding?: Responsive<SpaceKey>;
  paddingX?: Responsive<SpaceKey>;
  paddingY?: Responsive<SpaceKey>;
  /** 컬럼 방향 Flex는 자식을 가로로 늘리지 않는다 — 꽉 차야 하면 true(patterns §3 함정) */
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** `div` + `display: flex` 대신 쓴다(patterns §3). 훅·상태가 없어 서버 컴포넌트에서도 쓴다. */
export function Flex({
  as: Tag = 'div',
  direction,
  align,
  justify,
  wrap,
  gap,
  padding,
  paddingX,
  paddingY,
  fullWidth,
  className,
  style,
  children,
}: FlexProps) {
  const cls = sprinkles({
    display: 'flex',
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : undefined,
    gap,
    padding,
    paddingX,
    paddingY,
    width: fullWidth ? '100%' : undefined,
  });
  return (
    <Tag className={className ? `${cls} ${className}` : cls} style={style}>
      {children}
    </Tag>
  );
}

/** 양축 가운데 */
Flex.Center = function FlexCenter(props: FlexProps) {
  return <Flex align="center" justify="center" {...props} />;
};

/** 교차축 가운데(행이면 세로 가운데) */
Flex.CenterVertical = function FlexCenterVertical(props: FlexProps) {
  return <Flex align="center" {...props} />;
};

/** 주축 가운데(행이면 가로 가운데) */
Flex.CenterHorizontal = function FlexCenterHorizontal(props: FlexProps) {
  return <Flex justify="center" {...props} />;
};
