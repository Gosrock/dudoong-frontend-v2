import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

/**
 * 오버레이 스토리 공통 play 검사(P2 완료 기준).
 * 1. 트리거로 열기 → 접근성 이름이 있는 dialog(또는 alertdialog)
 * 2. Esc → 닫힘 → 포커스가 트리거로 돌아옴
 * 3. 다시 열기 → history.back()(뒤로가기) → 닫힘
 */
export async function playOverlayBasics({
  canvasElement,
  trigger,
  name,
  role = 'dialog',
}: {
  canvasElement: HTMLElement;
  trigger: string;
  name: string;
  role?: 'dialog' | 'alertdialog';
}) {
  const c = within(canvasElement);
  // 앞 스토리가 열린 채 언마운트되면(경로 이동과 같은 경우) 그 항목이 남아 있다 — 시작 값과 비교한다
  const base = readMark();
  const button = c.getByRole('button', { name: trigger });

  await userEvent.click(button);
  const dialog = await screen.findByRole(role, { name });
  // 등장 애니메이션이 opacity 0에서 시작한다
  await waitFor(() => expect(dialog).toBeVisible());
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole(role, { name })).toBeNull());
  await waitFor(() => expect(button).toHaveFocus());

  // 닫힐 때 history.back()으로 소비한 항목의 popstate가 끝나길 기다린다
  await waitFor(() => expect(readMark()).toBe(base));

  await userEvent.click(button);
  await screen.findByRole(role, { name });
  await waitFor(() => expect(readMark()).not.toBe(base));
  window.history.back();
  await waitFor(() => expect(screen.queryByRole(role, { name })).toBeNull());
}

const readMark = () => (window.history.state as { ddOverlay?: string } | null)?.ddOverlay;
