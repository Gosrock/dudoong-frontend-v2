import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InlineError } from './InlineError';

describe('InlineError', () => {
  it('기본 문구 + [다시 시도]가 onRetry를 부른다', async () => {
    const onRetry = vi.fn();
    render(<InlineError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했어요.');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('문구·버튼 글자를 바꿀 수 있고, onRetry가 없으면 버튼이 없다', () => {
    const { rerender } = render(
      <InlineError
        message="주문을 불러오지 못했어요."
        onRetry={() => {}}
        retryLabel="다시 불러오기"
      />,
    );
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
    rerender(<InlineError message="주문을 불러오지 못했어요." />);
    expect(screen.getByRole('alert')).toHaveTextContent('주문을 불러오지 못했어요.');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
