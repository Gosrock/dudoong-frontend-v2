'use client';

import { copyText } from '@/utils/copy-text';

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

/**
 * InfoRow account의 "복사" 버튼. 클립보드 유틸(`copyText` — patterns §9, 비보안 컨텍스트·웹뷰 폴백 포함)로 복사하고
 * 결과를 콜백으로 알린다(토스트는 부르는 쪽이 띄운다). 복사한 값은 로그에 남기지 않는다(계좌번호).
 */
export function CopyButton({ text, onCopied, onCopyError, ...rest }: CopyButtonProps) {
  const copy = async () => {
    if (await copyText(text)) onCopied?.();
    else onCopyError?.(new Error('copy failed'));
  };
  return (
    <button type="button" className={copyButton} onClick={copy} {...rest}>
      복사
    </button>
  );
}
