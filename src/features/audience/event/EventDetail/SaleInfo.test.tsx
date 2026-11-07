import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { SaleInfo } from './SaleInfo';

/** legal-copy A-2 — B60 확정 문구(백엔드 #942, 운영 승인 2026-11-07). 문구를 바꾸면 legal-copy와 같이 고친다. */
describe('SaleInfo — 판매정보 문구(A-2 · B60)', () => {
  it('펼치면 B60 확정 문구 세 곳이 보이고, v1 원문은 없다', async () => {
    const { user } = renderWithProviders(<SaleInfo />);
    await user.click(screen.getByRole('button', { name: '판매정보' }));
    const region = screen.getByRole('region', { name: '판매정보' });

    expect(region).toHaveTextContent('무료티켓과 두둥티켓은 아래 기준대로 취소·환불됩니다.');
    expect(region).toHaveTextContent(
      '취소할 때 입력한 환불 계좌로 호스트가 환불합니다. 환불이 늦어지면 호스트에게 연락해 주세요.',
    );
    expect(region).toHaveTextContent('티켓 QR코드는 티켓탭에서 조회할 수 있습니다.');
    expect(screen.getByRole('link', { name: '티켓탭' })).toHaveAttribute('href', '/tickets');

    expect(region).not.toHaveTextContent('유료티켓');
    expect(region).not.toHaveTextContent('환불받을 계좌를 알려주세요');
    expect(region).not.toHaveTextContent('내 예매내역');
  });
});
