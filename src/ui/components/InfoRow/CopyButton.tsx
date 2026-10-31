'use client';

import { copyButton } from './InfoRow.css';

export type CopyButtonProps = {
  /** 복사할 글 */
  text: string;
  /** 접근성 이름. 기본 "복사" — 무엇을 복사하는지 붙이면 좋다(예: "계좌번호 복사") */
  'aria-label'?: string;
  onCopied?: () => void;
  /** 권한 거부·비보안 컨텍스트 등으로 실패했을 때 */
  onCopyError?: (error: unknown) => void;
};

/** InfoRow account의 "복사" 버튼. `navigator.clipboard`로 복사하고 결과를 콜백으로 알린다(토스트는 부르는 쪽이 띄운다). */
export function CopyButton({ text, onCopied, onCopyError, ...rest }: CopyButtonProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied?.();
    } catch (error) {
      onCopyError?.(error);
    }
  };
  return (
    <button type="button" className={copyButton} onClick={copy} {...rest}>
      복사
    </button>
  );
}
