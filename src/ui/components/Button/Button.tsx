import type { ButtonHTMLAttributes } from 'react';

import { button, type ButtonVariants } from './Button.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants;

export function Button({ size, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={[button({ size }), className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
