import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { LoadMoreSentinel } from './LoadMoreSentinel';

/**
 * 무한 목록 하단(patterns §12) — 공연준비 홈(P10a)·공연 리스트(P5a). 화면에 들어오면 `loadMore`, 읽는 중엔 스피너,
 * 실패하면 기존 행을 둔 채 [다시 시도]. Figma에 없는 상태다(디자인 없음 — 공연 리스트 Figma 코멘트).
 */
const meta = {
  title: 'Components/LoadMoreSentinel',
  component: LoadMoreSentinel,
  args: {
    list: {
      hasNextPage: true,
      isFetchingNextPage: false,
      nextPageError: false,
      loadMore: fn(),
      retry: fn(),
    },
  },
} satisfies Meta<typeof LoadMoreSentinel>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 다음 페이지가 있고 화면에 들어오면 읽기 시작한다 */
export const Idle: Story = {
  play: async ({ args }) => {
    await waitFor(() => expect(args.list.loadMore).toHaveBeenCalled());
  },
};

/** 읽는 중 — 스피너 */
export const Fetching: Story = {
  args: { list: { ...meta.args.list, isFetchingNextPage: true } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toBeInTheDocument();
  },
};

/** 다음 페이지 실패 — 하단 재시도 */
export const NextPageError: Story = {
  args: { list: { ...meta.args.list, nextPageError: true } },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByText('더 불러오지 못했어요.')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '다시 시도' }));
    await expect(args.list.retry).toHaveBeenCalled();
  },
};

/** 끝 — 아무것도 그리지 않는다 */
export const End: Story = {
  args: { list: { ...meta.args.list, hasNextPage: false } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toBe('');
  },
};
