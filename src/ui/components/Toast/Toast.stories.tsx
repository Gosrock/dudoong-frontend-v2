import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { Button } from '../Button/Button';
import { Fab } from '../Fab/Fab';
import { FAB_HIDDEN_ATTR } from '../Fab/fab-attrs';
import { toast, Toaster } from './Toast';

function Demo() {
  return (
    <Flex gap={2}>
      <Button onClick={() => toast('새로운 공연이 추가되었습니다!')}>토스트</Button>
      <Button
        variant="secondary"
        onClick={() => toast('잠시 후 다시 시도해 주세요', { id: 'dup' })}
      >
        같은 id 토스트
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('링크가 클립보드에 복사되었습니다!', { tone: 'success', position: 'top' })
        }
      >
        성공 토스트
      </Button>
      <Toaster />
    </Flex>
  );
}

const meta = { title: 'Components/Toast', component: Demo } satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Figma Toast popup `303:2665` — 358×54, 가운데 정렬, 성공·에러 구분 없음. 같은 id는 하나만 뜬다 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '토스트' }));
    const first = await screen.findByText('새로운 공연이 추가되었습니다!');
    await waitFor(() => expect(first).toBeVisible());
    await userEvent.click(c.getByRole('button', { name: '같은 id 토스트' }));
    await userEvent.click(c.getByRole('button', { name: '같은 id 토스트' }));
    await screen.findByText('잠시 후 다시 시도해 주세요');
    await expect(screen.getAllByText('잠시 후 다시 시도해 주세요')).toHaveLength(1);
  },
};

function FabDemo({ hidden = false, message }: { hidden?: boolean; message: string }) {
  return (
    <>
      <Button onClick={() => toast(message)}>토스트</Button>
      <Fab
        icon={<Icon name="add" />}
        aria-label="새 티켓 만들기"
        style={{ position: 'fixed', right: 24, bottom: 24 }}
        {...(hidden ? { [FAB_HIDDEN_ATTR]: '' } : {})}
      />
      <Toaster />
    </>
  );
}

const toasterBottom = () =>
  getComputedStyle(document.querySelector('[data-sonner-toaster]') as HTMLElement).bottom;

/**
 * 모바일(~1023)에 FAB가 있으면 토스트가 그 위 16으로(GUI `958:20841` — 아래 24 + FAB 56 + 16 = 96, I-h2).
 * PC는 FAB가 오른쪽 끝이라 그대로
 */
export const AboveFab: Story = {
  render: () => <FabDemo message="티켓 판매를 중단했어요." />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '토스트' }));
    await screen.findByText('티켓 판매를 중단했어요.');
    if (window.innerWidth < 1024) await waitFor(() => expect(toasterBottom()).toBe('96px'));
  },
};

/** 그려 두고 숨긴 FAB(`data-fab-hidden` — 맨 위로 버튼의 스크롤 전)는 토스트를 올리지 않는다 */
export const HiddenFab: Story = {
  render: () => <FabDemo hidden message="티켓 판매를 다시 시작했어요." />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '토스트' }));
    await screen.findByText('티켓 판매를 다시 시작했어요.');
    if (window.innerWidth <= 600) await waitFor(() => expect(toasterBottom()).toBe('16px'));
  },
};

/** 성공 토스트(R1d — GUI `908:21601`): 연두 판 · 초록 Heading/sm · 모서리 16 · 글자 폭 · 머리 아래(위 93) */
export const Success: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '성공 토스트' }));
    const item = await screen.findByText('링크가 클립보드에 복사되었습니다!');
    const el = item.closest('[data-sonner-toast]') as HTMLElement;
    await waitFor(() => expect(el.getAttribute('data-y-position')).toBe('top'));
    const css = getComputedStyle(el);
    await expect(css.backgroundColor).toBe('rgb(237, 250, 238)');
    await expect(css.borderTopLeftRadius).toBe('16px');
  },
};
