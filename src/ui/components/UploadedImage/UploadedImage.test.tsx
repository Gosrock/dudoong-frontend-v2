import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UploadedImage } from './UploadedImage';

describe('UploadedImage — 불러오지 못하면 fallback(#92-5)', () => {
  it('로드 실패면 fallback을 그린다', () => {
    render(
      <UploadedImage
        src="https://asset.dudoong.com/event/1/poster.png"
        alt="포스터"
        width={94}
        height={133}
        fallback={<span data-testid="placeholder" />}
      />,
    );
    fireEvent.error(screen.getByRole('img', { name: '포스터' }));
    expect(screen.queryByRole('img', { name: '포스터' })).toBeNull();
    expect(screen.getByTestId('placeholder')).toBeInTheDocument();
  });

  it('fallback이 없으면 아무것도 그리지 않는다 — 깨진 이미지 아이콘 대신 빈 자리', () => {
    const { container } = render(
      <UploadedImage src="https://a.example/x.png" alt="커버" width={10} height={10} />,
    );
    fireEvent.error(screen.getByRole('img', { name: '커버' }));
    expect(container).toBeEmptyDOMElement();
  });
});
