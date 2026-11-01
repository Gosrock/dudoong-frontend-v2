import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../Button/Button';
import { UploadedImage } from './UploadedImage';

/** 스토리용 포스터(세로 단색 SVG) — 서버 이미지 자리 */
const poster = (fill: string, label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="326" height="462"><rect width="100%" height="100%" fill="${fill}"/><text x="50%" y="50%" fill="#fff" font-size="40" text-anchor="middle">${label}</text></svg>`,
  );
const POSTER = poster('#2d2a6e', 'POSTER');
const BROKEN = 'data:image/png;base64,broken';

/** 실패 자리표시 — 화면은 보통 `<Illustration name="poster-placeholder">`를 넘긴다 */
const Fallback = () => (
  <div
    data-testid="fallback"
    style={{ width: 163, height: 231, background: '#eeeeed', borderRadius: 8 }}
  />
);

/**
 * 서버 이미지(포스터 · 커버) — 업로드 출처면 `next/image` 최적화, 아니면 원본. 불러오지 못하면 `fallback`, 주소가 바뀌면 다시 시도한다.
 * 실패 처리는 이 컴포넌트가 한다 — 호출 쪽에서 `onError`·`failed` 상태를 또 두지 않는다(코드 패턴 점검 A6).
 */
const meta = {
  title: 'Components/UploadedImage',
  component: UploadedImage,
  args: {
    src: POSTER,
    alt: '공연 포스터',
    width: 163,
    height: 231,
    fallback: <Fallback />,
    style: { width: 163, height: 231, objectFit: 'cover', borderRadius: 8 },
  },
} satisfies Meta<typeof UploadedImage>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 정상 — 원본 그대로(업로드 출처가 아니라 `unoptimized`) */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole('img', { name: '공연 포스터' });
    await expect(img).toHaveAttribute('src', POSTER);
  },
};

/** 불러오지 못하면 fallback으로 바뀐다(깨진 이미지 아이콘을 보이지 않는다 — #92-5) */
export const Broken: Story = {
  args: { src: BROKEN },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.queryByRole('img')).toBeNull());
    await expect(c.getByTestId('fallback')).toBeInTheDocument();
  },
};

/** fallback이 없으면 아무것도 그리지 않는다 */
export const BrokenWithoutFallback: Story = {
  args: { src: BROKEN, fallback: undefined },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('img')).toBeNull());
    await expect(canvasElement.textContent).toBe('');
  },
};

function Switcher() {
  const [src, setSrc] = useState(BROKEN);
  return (
    <div>
      <UploadedImage
        src={src}
        alt="공연 포스터"
        width={163}
        height={231}
        fallback={<Fallback />}
        style={{ width: 163, height: 231, objectFit: 'cover' }}
      />
      <Button size="sm" onClick={() => setSrc(poster('#7a2d6e', 'NEW'))}>
        새 주소
      </Button>
    </div>
  );
}

/** 실패한 뒤 주소가 바뀌면 다시 시도한다(실패는 주소별로 기억) */
export const RetryOnNewSrc: Story = {
  render: () => <Switcher />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByTestId('fallback')).toBeInTheDocument());
    await userEvent.click(c.getByRole('button', { name: '새 주소' }));
    await expect(await c.findByRole('img', { name: '공연 포스터' })).toBeVisible();
  },
};
