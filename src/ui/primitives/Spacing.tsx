import { sprinkles } from '../theme/sprinkles.css';
import type { Responsive, SpaceKey } from '../theme/types';

/** 자식을 받지 않는 순수 간격. margin 대신 쓴다(patterns §3). 간격은 Figma 노드에서 읽고, 추측하지 않는다. */
export function Spacing({
  size,
  direction = 'vertical',
}: {
  size: Responsive<SpaceKey>;
  direction?: 'vertical' | 'horizontal';
}) {
  const cls =
    direction === 'vertical'
      ? sprinkles({ display: 'block', paddingTop: size })
      : sprinkles({ display: 'inline-block', paddingLeft: size });
  return <div aria-hidden className={cls} style={{ flexShrink: 0 }} />;
}
