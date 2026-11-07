import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { MoneyInput } from './MoneyInput';

function Harness({ initial = '', onDigits }: { initial?: string; onDigits?: (d: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <MoneyInput
        aria-label="가격"
        value={v}
        onValueChange={(d) => {
          setV(d);
          onDigits?.(d);
        }}
      />
      <output aria-label="값">{v}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('칸에는 쉼표, 값은 숫자 글자만', async () => {
    const onDigits = vi.fn();
    const { user } = renderWithProviders(<Harness onDigits={onDigits} />);
    const input = screen.getByLabelText('가격');
    await user.type(input, '15000');
    expect(input).toHaveValue('15,000');
    expect(screen.getByLabelText('값')).toHaveTextContent(/^15000$/);
    expect(onDigits).toHaveBeenLastCalledWith('15000');
  });

  it('처음 값도 쉼표로 보인다 — 글자는 걸러진다', async () => {
    const { user } = renderWithProviders(<Harness initial="1000" />);
    const input = screen.getByLabelText('가격');
    expect(input).toHaveValue('1,000');
    await user.type(input, 'a0');
    expect(input).toHaveValue('10,000');
    expect(screen.getByLabelText('값')).toHaveTextContent(/^10000$/);
  });

  it('지우면 빈 칸', async () => {
    const { user } = renderWithProviders(<Harness initial="1000" />);
    const input = screen.getByLabelText('가격');
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByLabelText('값')).toBeEmptyDOMElement();
  });

  it('중간에 숫자를 넣어도 커서는 그 숫자 뒤', async () => {
    const { user } = renderWithProviders(<Harness initial="1000" />);
    const input = screen.getByLabelText<HTMLInputElement>('가격');
    // "1,000"에서 "1" 뒤(자리 1)에 "5" → "15,000", 커서는 "5" 뒤(자리 2)
    await user.click(input);
    input.setSelectionRange(1, 1);
    await user.keyboard('5');
    expect(input).toHaveValue('15,000');
    expect(input.selectionStart).toBe(2);
  });
});
