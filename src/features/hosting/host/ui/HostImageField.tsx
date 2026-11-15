'use client';

import { useId, useRef, useState } from 'react';

import { imageExtensionOf } from '@/api/upload';
import { Button } from '@/ui/components/Button/Button';
import * as field from '@/ui/components/Input/Input.css';
import { LoadingLabel } from '@/ui/components/Loader/Loader';
import { Icon } from '@/ui/icons/Icon';

import type { HostImageSlot } from '../model/host-settings-form';
import type { useHostSettings } from '../model/useHostSettings';
import * as s from './HostImageField.css';
import { IMAGE_ACCEPT, openImageCrop } from './ImageCropSheet';

const LABEL: Record<HostImageSlot, string> = { PROFILE: '프로필 이미지', COVER: '커버 이미지' };

type Image = ReturnType<typeof useHostSettings>['images'][HostImageSlot];

/**
 * 호스트 이미지 한 칸(GUI `741:31172` 미입력 · `1452:40541` 저장 가능, Design Sync #260) — 제목(Heading/md2 - emphasized) +
 * 미리보기 상자(채움 `surface/container` · 테두리 · 모서리 12, 프로필 160 정사각 · 커버 폭 가득 × 180) 가운데 [이미지 업로드]
 * (DS Button Secondary medium + `image-add`) + 이미지가 있으면 아래 [기본 이미지로](Secondary small).
 * 파일을 고르면 "이미지 위치 조정"(`openImageCrop`)으로 자른 결과를 올린다(PH-15 → S3, 저장은 PH-4 — 훅). JPG · PNG가 아니면
 * 자르지 않고 그대로 넘겨 훅이 그 자리 오류를 정한다(`UPLOAD_INVALID_EXTENSION`).
 */
export function HostImageField({
  slot,
  image,
  readOnly,
}: {
  slot: HostImageSlot;
  image: Image;
  readOnly: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const label = LABEL[slot];
  const disabled = readOnly || image.uploading;
  // 못 불러온 주소는 그리지 않는다(깨진 이미지 아이콘 대신 빈 상자 — #92-5와 같은 처리). 주소가 바뀌면 다시 시도
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = image.url && image.url !== failedUrl ? image.url : null;

  const pick = async (file: File) => {
    if (!imageExtensionOf(file)) {
      void image.change(file);
      return;
    }
    const cropped = await openImageCrop(file, slot);
    if (cropped) void image.change(cropped);
  };

  return (
    <div className={s.root} role="group" aria-labelledby={titleId} data-testid={`image-${slot}`}>
      <span id={titleId} className={field.label}>
        {label}
      </span>
      <div className={s.preview[slot]}>
        {photo && (
          // 미리보기(업로드 출처 · 고른 파일) — 작은 칸이라 원본 그대로
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={s.photo}
            src={photo}
            alt={label}
            decoding="async"
            onError={() => setFailedUrl(photo)}
          />
        )}
        {/* 일반 멤버(읽기 전용)는 누를 수 없게 둔다(Q53 — 모양은 같고 비활성) */}
        <Button
          variant="secondary"
          size="md"
          icon={<Icon name="image-add" />}
          className={s.upload}
          disabled={disabled}
          aria-label={`${label} 업로드`}
          onClick={() => input.current?.click()}
        >
          <LoadingLabel loading={image.uploading} size="sm">
            이미지 업로드
          </LoadingLabel>
        </Button>
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void pick(file);
          }}
        />
      </div>
      {image.error && (
        <span role="alert" className={field.errorText}>
          {image.error}
        </span>
      )}
      {!readOnly && (image.url || image.error) && (
        <div className={s.actions}>
          {image.url && (
            <Button variant="secondary" size="sm" disabled={disabled} onClick={image.reset}>
              기본 이미지로
            </Button>
          )}
          {image.error && (
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => void image.retry()}
            >
              다시 올리기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
