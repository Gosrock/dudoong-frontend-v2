import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/api/__mocks__/server';
import { renderWithProviders } from '@/test/render';

import { TagList } from './TagList';

describe('TagList', () => {
  it('GE-11 응답을 카테고리별 제목과 태그 버튼으로 그린다', async () => {
    renderWithProviders(<TagList />);
    expect(await screen.findByRole('heading', { name: '공연구분' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '장르' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '락밴드' })).toBeInTheDocument();
  });

  it('모르는 카테고리는 기타로 보인다', async () => {
    server.use(
      http.get('*/api/v2/tags', () =>
        HttpResponse.json({
          success: true,
          status: 200,
          data: [{ category: 'NEW_ONE', tags: [{ tagId: 9, name: '새 태그' }] }],
          timeStamp: '',
        }),
      ),
    );
    renderWithProviders(<TagList />);
    expect(await screen.findByRole('heading', { name: '기타' })).toBeInTheDocument();
  });

  it('태그가 없으면 아무 카테고리도 그리지 않는다', async () => {
    server.use(
      http.get('*/api/v2/tags', () =>
        HttpResponse.json({ success: true, status: 200, data: [], timeStamp: '' }),
      ),
    );
    const { container } = renderWithProviders(<TagList />);
    await waitFor(() => expect(screen.queryByText('불러오는 중')).not.toBeInTheDocument());
    expect(container.querySelector('section')).toBeEmptyDOMElement();
  });
});
