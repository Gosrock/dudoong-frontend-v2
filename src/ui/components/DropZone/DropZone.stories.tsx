import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DropZone, type FileRejection } from './DropZone';

const meta = {
  title: 'Components/DropZone',
  component: DropZone,
  args: { onFile: fn(), onReject: fn(), maxSize: 1024 * 1024 },
} satisfies Meta<typeof DropZone>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 끌어다 놓기. testing-library fireEvent는 DataTransfer를 빈 것으로 바꿔 넣어서 직접 보낸다 */
function drag(target: Element, type: 'dragenter' | 'drop', file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
}

/** 1×1 PNG */
const pngFile = () =>
  new File(
    [
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ),
        (ch) => ch.charCodeAt(0),
      ),
    ],
    'poster.png',
    { type: 'image/png' },
  );

/** GUI 이미지 업로드 칸 */
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const WithError: Story = { args: { error: 'JPG, JPEG, PNG만 올릴 수 있어요.' } };

const MESSAGES: Record<FileRejection, string> = {
  type: 'JPG, JPEG, PNG만 올릴 수 있어요.',
  size: '1MB 이하 이미지만 올릴 수 있어요.',
};

/** 부모가 미리보기 URL을 만들고 정리하는 예 */
function WithPreview() {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  return (
    <DropZone
      maxSize={1024 * 1024}
      previewUrl={url}
      previewAlt="포스터 미리보기"
      error={error}
      onFile={(f) => {
        setError(undefined);
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(f));
      }}
      onReject={(r) => setError(MESSAGES[r])}
    />
  );
}

export const Preview: Story = {
  render: () => <WithPreview />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, pngFile());
    await expect(await c.findByRole('img', { name: '포스터 미리보기' })).toBeInTheDocument();
  },
};

/** 버튼 → 파일 선택 / 끌어다 놓기 / 형식·크기 검사 */
export const SelectAndDrop: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const button = c.getByRole('button', { name: '이미지 업로드' });
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    const clicked = fn();
    // 파일 창이 뜨지 않게 이번 한 번만 막는다
    input.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        clicked();
      },
      { once: true },
    );
    await userEvent.click(button);
    await expect(clicked).toHaveBeenCalledOnce();

    const png = pngFile();
    await userEvent.upload(input, png);
    await expect(args.onFile).toHaveBeenLastCalledWith(png);

    const zone = button.closest('div')!;
    const pdf = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    drag(zone, 'dragenter', pdf);
    await waitFor(() => expect(zone).toHaveAttribute('data-dragging', 'true'));
    drag(zone, 'drop', pdf);
    await waitFor(() => expect(zone).not.toHaveAttribute('data-dragging'));
    await expect(args.onReject).toHaveBeenLastCalledWith('type', pdf);

    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    drag(zone, 'drop', big);
    await expect(args.onReject).toHaveBeenLastCalledWith('size', big);
  },
};
