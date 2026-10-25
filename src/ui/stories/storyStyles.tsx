import type { Decorator } from '@storybook/react-vite';
import { useLayoutEffect } from 'react';

/**
 * 요소에 붙은 클래스의 `:hover`·`:active` 규칙에서 속성 값을 읽는다(스토리 play 전용).
 * 합성 이벤트(userEvent.hover)로는 CSS 의사 클래스가 켜지지 않아 규칙을 직접 본다.
 * vanilla-extract는 `vars.*`를 `var(--…)`로 쓰므로 토큰 문자열과 바로 비교한다.
 */
export function pseudoStyle(
  el: Element,
  pseudo: ':hover' | ':active',
  property: 'background' | 'color' | 'border-color',
) {
  const prefixes = [...el.classList].map((c) => `.${CSS.escape(c)}${pseudo}`);
  let value = '';
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const selectors = rule.selectorText.split(',').map((s) => s.trim());
      if (!selectors.some((s) => prefixes.some((p) => s.startsWith(p)))) continue;
      const v = rule.style.getPropertyValue(property);
      if (v) value = v;
    }
  }
  return value;
}

function DarkTheme({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    return () => {
      if (prev === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prev);
    };
  }, []);
  return children;
}

/** `<html data-theme="dark">`로 다크 토큰을 켠다(출시는 라이트만 — design-system §1 "다크 모드") */
export const withDarkTheme: Decorator = (Story) => (
  <DarkTheme>
    <Story />
  </DarkTheme>
);
