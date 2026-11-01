import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

describe('Avatar — 사진을 불러오지 못하면 캐릭터(#92-5)', () => {
  it('사진이 있으면 사진, 로드 실패면 캐릭터로 바꾼다', () => {
    render(<Avatar src="https://asset.dudoong.com/host/1/missing.png" alt="호스트" />);
    const img = screen.getByRole('img', { name: '호스트' });
    expect(img).toHaveAttribute('data-kind', 'photo');
    fireEvent.error(img);
    expect(img).toHaveAttribute('data-kind', 'character');
    expect(img.getAttribute('src')).not.toContain('missing.png');
  });

  it('주소가 바뀌면 새 사진을 다시 시도한다', () => {
    const { rerender } = render(<Avatar src="https://a.example/1.png" alt="호스트" />);
    fireEvent.error(screen.getByRole('img', { name: '호스트' }));
    rerender(<Avatar src="https://a.example/2.png" alt="호스트" />);
    expect(screen.getByRole('img', { name: '호스트' })).toHaveAttribute('data-kind', 'photo');
  });
});
