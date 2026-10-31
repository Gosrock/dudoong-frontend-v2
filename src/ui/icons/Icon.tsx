import type { SVGProps } from 'react';

import { icons, type IconSpec } from './registry';

type SvgAttrs = Omit<
  SVGProps<SVGSVGElement>,
  'name' | 'children' | 'dangerouslySetInnerHTML' | 'viewBox' | 'width' | 'height' | 'ref'
>;

export type IconProps = IconSpec &
  SvgAttrs & {
    /** 주면 의미 있는 이미지(role="img" + aria-label), 없으면 장식(aria-hidden) */
    title?: string;
  };

/**
 * Figma `ic` 세트 아이콘. 색은 `currentColor`(글자색)를 따른다.
 * 다색 아이콘(chat·instagram·lightbulb·notification-on·settings filled·ticket-alert)은 강조색이 고정이다.
 * 훅이 없어 서버·클라이언트 어디서나 쓸 수 있다.
 */
export function Icon({ name, variant = 'outline', size = 24, title, ...rest }: IconProps) {
  const entry = icons[`${name}/${variant}/${size}`];
  if (!entry) return null;
  const a11y = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={entry.viewBox}
      width={size}
      height={size}
      fill="none"
      focusable="false"
      overflow={entry.overflow ? 'visible' : undefined}
      {...a11y}
      {...rest}
      // 본문은 svg/*.svg에서 생성한 고정 문자열이다(사용자 입력 아님)
      dangerouslySetInnerHTML={{ __html: entry.body }}
    />
  );
}
