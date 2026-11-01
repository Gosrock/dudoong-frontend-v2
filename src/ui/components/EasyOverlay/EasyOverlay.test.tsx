import { screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { Button } from '@/ui/components/Button/Button';

import { openConfirm } from './EasyOverlay';

const TITLE = '멤버를 삭제할까요?';

/** onConfirm이 돌려줄 값을 고르고 openConfirm 결과를 글자로 보인다 */
function Harness({ onConfirm }: { onConfirm: () => Promise<unknown> }) {
  const [result, setResult] = useState('없음');
  return (
    <>
      <Button
        onClick={() =>
          void openConfirm({ title: TITLE, onConfirm }).then((ok) => setResult(String(ok)))
        }
      >
        열기
      </Button>
      <p>결과: {result}</p>
    </>
  );
}

async function openAndConfirm(onConfirm: () => Promise<unknown>) {
  const r = renderWithProviders(<Harness onConfirm={onConfirm} />);
  await r.user.click(screen.getByRole('button', { name: '열기' }));
  const dialog = await screen.findByRole('alertdialog', { name: TITLE });
  await r.user.click(within(dialog).getByRole('button', { name: '확인' }));
  return { ...r, dialog };
}

describe('EasyOverlay 확인 창 계약(patterns §6 — 실패하면 열린 채, 성공하면 닫힘)', () => {
  it.each([
    ['true', () => Promise.resolve(true)],
    ['undefined(값 없음 — 기존 호출)', () => Promise.resolve()],
    ['그 밖의 값', () => Promise.resolve({ ok: 1 })],
  ])('%s로 resolve → 닫히고 true', async (_, onConfirm) => {
    await openAndConfirm(onConfirm);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByText('결과: true')).toBeInTheDocument();
  });

  it.each([
    ['false로 resolve(훅 계약)', () => Promise.resolve(false)],
    ['reject(throw — 기존 호출)', () => Promise.reject(new Error('실패'))],
  ])('%s → 열린 채 남고 버튼이 다시 풀린다', async (_, onConfirm) => {
    const { dialog, user } = await openAndConfirm(onConfirm);
    const confirm = within(dialog).getByRole('button', { name: '확인' });
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(screen.getByRole('alertdialog', { name: TITLE })).toBeVisible();
    expect(screen.getByText('결과: 없음')).toBeInTheDocument();

    // 취소하면 false
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.getByText('결과: false')).toBeInTheDocument());
  });

  it('실패 뒤 다시 눌러 성공하면 닫힌다', async () => {
    let attempt = 0;
    const { dialog, user } = await openAndConfirm(() => Promise.resolve(++attempt > 1));
    const confirm = within(dialog).getByRole('button', { name: '확인' });
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByText('결과: true')).toBeInTheDocument();
    expect(attempt).toBe(2);
  });
});
