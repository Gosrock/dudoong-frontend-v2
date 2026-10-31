import { divider } from './layout.css';

/** 구분선. 색은 `surface.defaultBorder`. */
export function Divider({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) {
  return <hr className={divider} data-direction={direction} aria-orientation={direction} />;
}
