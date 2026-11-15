import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { RefundObligationField } from './RefundObligationField';

describe('RefundObligationField', () => {
  it('별표는 없어도 필수 동의 체크박스로 읽힌다(aria-required · 안내 본문 연결) — 리뷰 #240', () => {
    renderWithProviders(
      <RefundObligationField
        agreed={false}
        onAgreedChange={vi.fn()}
        disabled={false}
        error={undefined}
      />,
    );
    const box = screen.getByRole('checkbox', { name: /환불 의무를 지키는 데 동의합니다/ });
    expect(box).toHaveAttribute('aria-required', 'true');
    expect(box).toHaveAccessibleDescription(/.+/);
  });
});
