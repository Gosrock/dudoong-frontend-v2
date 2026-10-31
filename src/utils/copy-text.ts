/**
 * 클립보드 복사(patterns §9). `navigator.clipboard`가 없거나(비보안 컨텍스트·오래된 웹뷰) 거부되면
 * 숨긴 textarea + `execCommand('copy')`로 한 번 더 시도한다. 둘 다 실패하면 false.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 아래 폴백으로
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}
