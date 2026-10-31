/**
 * 받은 파일(Blob)을 브라우저 저장으로 넘긴다(엑셀 GR-6·GI-3 — `api.download`의 결과). 이름이 없으면 `fallbackName`.
 * 화면 동작이 아니라 브라우저 저장이라 훅에서 부른다. 저장 창을 띄운 뒤 객체 URL을 바로 놓는다.
 */
export function saveBlob(blob: Blob, filename: string | null, fallbackName: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? fallbackName;
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    // 클릭이 저장을 시작한 뒤에 놓는다(동기로 놓으면 일부 브라우저가 받지 못한다)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
