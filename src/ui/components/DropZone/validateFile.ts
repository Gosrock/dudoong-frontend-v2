export type FileRejection = 'type' | 'size';

/**
 * `accept`(input accept 형식: "image/png,image/jpeg", "image/*", ".png")와 `maxSize`(바이트)로 파일을 검사한다.
 * 드래그앤드롭은 브라우저가 accept를 걸러 주지 않아서 직접 검사한다.
 */
export function validateFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  { accept, maxSize }: { accept?: string; maxSize?: number },
): FileRejection | null {
  if (accept && !matchesAccept(file, accept)) return 'type';
  if (maxSize != null && file.size > maxSize) return 'size';
  return null;
}

function matchesAccept(file: Pick<File, 'name' | 'type'>, accept: string) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
}
