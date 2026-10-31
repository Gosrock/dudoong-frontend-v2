'use client';

import { type DragEvent, useId, useRef, useState } from 'react';

import { Icon } from '../../icons/Icon';
import { Button } from '../Button/Button';
import * as f from '../Input/Input.css';
import * as s from './DropZone.css';
import { type FileRejection, validateFile } from './validateFile';

export type { FileRejection };

export type DropZoneProps = {
  /** 검사를 통과한 파일 하나. 업로드는 부모가 한다(P3 upload) */
  onFile: (file: File) => void;
  /** 형식·크기 검사에 걸린 파일. 문구는 부모가 정해 `error`로 다시 넘긴다 */
  onReject?: (reason: FileRejection, file: File) => void;
  /** input accept 형식. 기본은 포스터 안내 문구의 JPG·JPEG·PNG */
  accept?: string;
  /** 바이트 */
  maxSize?: number;
  /** 미리보기 URL(업로드 결과나 `URL.createObjectURL`). 부모가 만들고 정리한다 */
  previewUrl?: string;
  previewAlt?: string;
  disabled?: boolean;
  error?: string;
  buttonLabel?: string;
  className?: string;
};

/**
 * 이미지 업로드 칸. 버튼을 눌러 파일을 고르거나 칸에 끌어다 놓는다. 라이브러리 없이 네이티브 input + 드래그 이벤트.
 * 키보드는 가운데 버튼으로 들어온다.
 */
export function DropZone({
  onFile,
  onReject,
  accept = 'image/png,image/jpeg',
  maxSize,
  previewUrl,
  previewAlt = '',
  disabled,
  error,
  buttonLabel = '이미지 업로드',
  className,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [dragging, setDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    const rejection = validateFile(file, { accept, maxSize });
    if (rejection) onReject?.(rejection, file);
    else onFile(file);
  };

  const onDragOver = (e: DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };

  return (
    <div className={className}>
      <div
        className={s.zone}
        data-dragging={dragging ? 'true' : undefined}
        data-invalid={error ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files[0]);
        }}
      >
        {previewUrl && (
          // 미리보기는 blob: 또는 업로드 도메인 URL이라 next/image 최적화를 거치지 않는다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={previewAlt} className={s.preview} />
        )}
        <span className={s.action}>
          <Button
            variant="secondary"
            icon={<Icon name="image-add" className={s.buttonIcon} />}
            disabled={disabled}
            aria-describedby={error ? errorId : undefined}
            onClick={() => inputRef.current?.click()}
          >
            {buttonLabel}
          </Button>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className={s.hiddenInput}
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onChange={(e) => {
            handle(e.currentTarget.files?.[0]);
            // 같은 파일을 다시 골라도 change가 나도록 비운다
            e.currentTarget.value = '';
          }}
        />
      </div>
      {error && (
        <div className={f.footer}>
          <span id={errorId} role="alert" className={f.errorText}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
